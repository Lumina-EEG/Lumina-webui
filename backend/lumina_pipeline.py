"""
=============================================================================
LUMINA — UNIFIED CLINICAL PIPELINE (V2 ARCHITECTURE)
=============================================================================
Matches lumina_final_best.pth exactly.
- LSTM Hidden: 256
- Freq Input: 95
- Device: CPU Locked
=============================================================================
"""
from dotenv import load_dotenv
import os

# Add this line immediately after the imports
load_dotenv()
import os
import sys
import argparse
import json
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from datetime import datetime
from scipy.signal import butter, filtfilt, resample
from captum.attr import IntegratedGradients
import os
try:
    import google.generativeai as genai
except ImportError:
    genai = None
# =============================================================================
# CONFIGURATION
# =============================================================================

CFG = {
    "model_path":          "lumina_final_best.pth",  
    "n_classes":           4,
    "n_channels":          19,
    "sample_rate":         256,
    "target_len":          1250,          
    "epoch_len_s":         4.88,
    "step_len_s":          1.0,
    "lstm_hidden":         256,           # Locked to V2 to match your weights
    "lstm_layers":         2,
    "dropout":             0.4,
    "high_risk_threshold": 0.70,          
    "min_confidence":      0.50,          
    "disease_alert_pct":   0.20,          
    "channel_order": [
        "Fp1","Fp2","F7","F3","Fz","F4","F8",
        "T3","C3","Cz","C4","T4",
        "P3","P4","Pz","T5","T6",
        "O1","O2",
    ],
}

CLASS_NAMES = ["Healthy", "Alzheimers", "Epilepsy", "MDD"]
DISEASE_NAMES = CLASS_NAMES[1:]

BANDS = {
    "delta": (0.5,  4.0),
    "theta": (4.0,  8.0),
    "alpha": (8.0, 13.0),
    "beta":  (13.0,30.0),
    "gamma": (30.0,45.0),
}

# CRITICAL: Locked to CPU to bypass Apple Silicon MPS FFT corruption
DEVICE = torch.device("cpu")

# =============================================================================
# STAGE 1 — CLINICAL SIGNAL PROCESSING
# =============================================================================

def resample_signal(data, orig_fs, target_fs):
    """Safely converts high-frequency data down to the AI's native 256Hz"""
    if orig_fs == target_fs: return data
    print(f"  [SIGNAL] Resampling from {orig_fs}Hz to {target_fs}Hz...")
    num_samples = int(data.shape[-1] * target_fs / orig_fs)
    return resample(data, num_samples, axis=-1)

def bandpass_filter(data, lo=0.5, hi=45.0, fs=None, order=4):
    """Zero-phase Butterworth bandpass. data: [C, T]"""
    fs  = fs or CFG["sample_rate"]
    nyq = fs / 2.0
    b, a = butter(order, [lo / nyq, hi / nyq], btype="band")
    out  = np.zeros_like(data)
    for c in range(data.shape[0]):
        out[c] = filtfilt(b, a, data[c])
    return out

def zscore_global(data):
    """Patient-Specific Calibration: Z-score across the entire recording."""
    mean = data.mean()
    std  = data.std()
    if std == 0: std = 1e-10
    return (data - mean) / std

def trim_or_pad(epoch, target_len=None):
    n = target_len or CFG["target_len"]
    T = epoch.shape[-1]
    if T > n: return epoch[:, :n]
    if T < n: return np.pad(epoch, ((0, 0), (0, n - T)))
    return epoch

def epochs_from_continuous(signal, fs, epoch_len_s, step_len_s):
    epoch_s, step_s = int(epoch_len_s * fs), int(step_len_s * fs)
    epochs, start = [], 0
    while start + epoch_s <= signal.shape[-1]:
        epochs.append(signal[:, start:start + epoch_s])
        start += step_s
    return np.array(epochs, dtype=np.float32) if epochs else None

# =============================================================================
# STAGE 2 — LUMINA V2 ARCHITECTURE
# =============================================================================

class DepthwiseSeparableConv(nn.Module):
    def __init__(self, in_ch, out_ch, kernel_size, stride=1, padding=0):
        super().__init__()
        self.dw = nn.Conv1d(in_ch, in_ch, kernel_size, stride=stride, padding=padding, groups=in_ch, bias=False)
        self.pw = nn.Conv1d(in_ch, out_ch, 1, bias=False)
    def forward(self, x): return self.pw(self.dw(x))

class TimeDomainBranch(nn.Module):
    def __init__(self):
        super().__init__()
        C = CFG["n_channels"]
        self.cnn = nn.Sequential(
            DepthwiseSeparableConv(C, 64, kernel_size=25, stride=2, padding=12),
            nn.BatchNorm1d(64),  nn.ELU(), nn.MaxPool1d(4), nn.Dropout(0.25),
            nn.Conv1d(64, 128, kernel_size=11, padding=5, bias=False),
            nn.BatchNorm1d(128), nn.ELU(), nn.MaxPool1d(4), nn.Dropout(0.25),
            nn.Conv1d(128, 256, kernel_size=5, padding=2, bias=False),
            nn.BatchNorm1d(256), nn.ELU(), nn.MaxPool1d(2),
        )
        self.lstm = nn.LSTM(
            input_size  = 256,
            hidden_size = CFG["lstm_hidden"],
            num_layers  = CFG["lstm_layers"],
            batch_first = True,
            dropout     = CFG["dropout"] if CFG["lstm_layers"] > 1 else 0.0,
        )
        self.out_size = CFG["lstm_hidden"]

    def forward(self, x):
        out, _ = self.lstm(self.cnn(x).permute(0, 2, 1))
        return out[:, -1, :]

class FrequencyDomainBranch(nn.Module):
    def __init__(self):
        super().__init__()
        C       = CFG["n_channels"]
        self.fs = CFG["sample_rate"]
        n_bands = len(BANDS)
        
        # Matches the [256, 95] requirement from your checkpoint
        self.mlp = nn.Sequential(
            nn.Linear(C * n_bands, 256), nn.ELU(), nn.Dropout(0.3),
            nn.Linear(256, 128), nn.ELU(),
        )
        self.out_size = 128

    def forward(self, x):
        T        = x.shape[-1]
        freq_res = self.fs / T
        fft_pow  = torch.fft.rfft(x, dim=-1).abs() ** 2
        feats = []
        for lo, hi in BANDS.values():
            lo_bin = max(1, int(lo / freq_res))
            hi_bin = min(fft_pow.shape[-1], int(hi / freq_res) + 1)
            feats.append(torch.log(fft_pow[:, :, lo_bin:hi_bin].mean(dim=-1) + 1e-10))
        return self.mlp(torch.stack(feats, dim=-1).flatten(1))

class LuminaModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.time_branch = TimeDomainBranch()
        self.freq_branch = FrequencyDomainBranch()
        fused = self.time_branch.out_size + self.freq_branch.out_size
        self.head = nn.Sequential(
            nn.Linear(fused, 128), nn.ELU(), nn.Dropout(CFG["dropout"]),
            nn.Linear(128, 64),    nn.ELU(), nn.Dropout(0.2),
            nn.Linear(64, CFG["n_classes"]),
        )
    def forward(self, x): return self.head(torch.cat([self.time_branch(x), self.freq_branch(x)], dim=1))

import os
import torch

# CRITICAL: If LuminaFinal is written in a different Python file, 
# you must import it here (e.g., from model_definitions import LuminaFinal).
# If the class is already written somewhere inside this same file, you can skip the import!

def load_model(path=None):
    # 1. The Bulletproof Path Finder
    if path is None or path == "lumina_final_best.pth":
        base_dir = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(base_dir, "lumina_final_best.pth")
        
    if not os.path.exists(path): 
        raise FileNotFoundError(f"Model not found at absolute path: '{path}'")
    
    # 2. Build the empty brain 
    model = LuminaModel() 
    
    # 3. Pour the dictionary of memories (.pth) into the empty brain
    model.load_state_dict(torch.load(path, map_location=torch.device('cpu')))
    
    # 4. Lock the model for inference
    model.eval()
    
    return model
# =============================================================================
# STAGE 3 — INFERENCE & AGGREGATION
# =============================================================================

@torch.no_grad()
def run_inference(model, epochs_ready):
    x      = torch.tensor(epochs_ready, dtype=torch.float32).to(DEVICE)
    logits = model(x)
    probs  = F.softmax(logits, dim=1).cpu().numpy()
    results = []
    for i, prob in enumerate(probs):
        pred_idx   = int(np.argmax(prob))
        confidence = float(prob[pred_idx])
        r = {
            "epoch_idx":     i,
            "prediction":    CLASS_NAMES[pred_idx],
            "confidence":    round(confidence, 4),
            "probabilities": {n: round(float(p), 4) for n, p in zip(CLASS_NAMES, prob)},
            "flags": [],
        }
        if pred_idx != 0 and confidence >= CFG["high_risk_threshold"]: r["flags"].append(f"HIGH_RISK_{CLASS_NAMES[pred_idx].upper()}")
        if confidence < CFG["min_confidence"]: r["flags"].append("LOW_CONFIDENCE")
        results.append(r)
    return results

def aggregate(epoch_results):
    all_probs   = np.array([list(r["probabilities"].values()) for r in epoch_results])
    mean_probs  = all_probs.mean(axis=0)
    vote_counts = np.bincount([CLASS_NAMES.index(r["prediction"]) for r in epoch_results], minlength=4)
    top_idx = int(np.argmax(mean_probs))
    disease_alerts = [CLASS_NAMES[i] for i in range(1, 4) if mean_probs[i] >= CFG["disease_alert_pct"]]

    return {
        "session_prediction": CLASS_NAMES[top_idx],
        "session_confidence": round(float(mean_probs[top_idx]), 4),
        "n_epochs_analyzed":  len(epoch_results),
        "vote_distribution":  {n: int(v) for n, v in zip(CLASS_NAMES, vote_counts)},
        "mean_probabilities": {n: round(float(p), 4) for n, p in zip(CLASS_NAMES, mean_probs)},
        "high_risk_flags":    [n for i, n in enumerate(CLASS_NAMES) if i != 0 and mean_probs[i] >= CFG["high_risk_threshold"]],
        "disease_alerts":     disease_alerts,
        "timestamp":          datetime.now().isoformat(),
    }
def generate_clinical_explanation(model, peak_epoch_tensor, predicted_idx):
    """
    Runs Captum on the single most confident pathological epoch,
    extracts the heatmap array for Flutter, and builds the LLM prompt.
    """
    print(f"\n  [EXPLAINER] Reverse-engineering peak epoch for {CLASS_NAMES[predicted_idx]}...")
    
    # 1. GENERATE HEATMAP
    ig = IntegratedGradients(model)
    baseline = torch.zeros_like(peak_epoch_tensor)
    
    attributions, _ = ig.attribute(
        inputs=peak_epoch_tensor,
        baselines=baseline,
        target=predicted_idx,
        return_convergence_delta=True
    )
    
    heatmap_tensor = attributions[0].detach()
    
    # 2. EXTRACT TOP CHANNEL
    channel_importance = torch.sum(torch.abs(heatmap_tensor), dim=1)
    top_channel_idx = int(torch.argmax(channel_importance).item())
    top_channel_name = CFG["channel_order"][top_channel_idx]
    
    total_signal = torch.sum(channel_importance).item()
    top_channel_pct = (channel_importance[top_channel_idx].item() / (total_signal + 1e-10)) * 100

    # 3. BUILD LLM PROMPT
    disease_name = CLASS_NAMES[predicted_idx]
    
    llm_prompt = (
        f"You are the Chief Neurologist evaluating an AI EEG analysis. "
        f"The Lumina neural network diagnosed the patient with {disease_name}. "
        f"A mathematical heatmap reveals that {top_channel_pct:.1f}% of the pathological signal "
        f"originated primarily in channel {top_channel_name}. "
        f"Write a concise, 2-sentence clinical rationale explaining why {disease_name} "
        f"would present with intense focal electrical activity in the {top_channel_name} region. "
        f"Do not mention the AI or the heatmap; write as a doctor interpreting the findings."
    )
    
    print(f"  [EXPLAINER] Complete. Primary signal located at {top_channel_name} ({top_channel_pct:.1f}% of gradient weight).")
    
    return {
        "top_channel": top_channel_name,
        "signal_weight_pct": round(top_channel_pct, 1),
        "llm_prompt": llm_prompt,
        "heatmap_matrix": heatmap_tensor.numpy().tolist() # Ready to be sent to Flutter as JSON
    }
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Force the environment to load right now
load_dotenv()

def call_gemini_api(prompt): # The input is named 'prompt'
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return "ERROR: API Key not found."
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # --- THE FIX ---
        # Ensure you use 'prompt' (the function argument) here:
        response = model.generate_content(prompt)
        
        return response.text
    except Exception as e:
        return f"LLM API Error: {str(e)}"
    # ... rest of your model.generate_content code
    
    try:
        response = model.generate_content(prompt_text)
        return response.text.strip()
    except Exception as e:
        return f"LLM API Error: {str(e)}"
def print_result(summary):
    ALERT = CFG["disease_alert_pct"]
    probs = summary["mean_probabilities"]
    pred  = summary["session_prediction"]
    conf  = summary["session_confidence"]
    alerts = summary["disease_alerts"]

    def bar(p, width=32):
        filled = int(p * width)
        return "█" * filled + "░" * (width - filled)

    severity = "HIGH RISK" if pred != "Healthy" and conf >= CFG["high_risk_threshold"] else "DISEASE SIGNAL DETECTED" if alerts else "RESULT"
    border   = "!" if severity == "HIGH RISK" else "*" if alerts else "="
    sep  = border * 62
    sep2 = "-" * 62

    print(f"\n{sep}\n  LUMINA — {severity}\n{sep}")
    print(f"  Prediction  : {pred}\n  Confidence  : {conf * 100:.1f}%\n  Epochs      : {summary['n_epochs_analyzed']}\n{sep2}")
    print("  Probability breakdown:")
    for name, prob in probs.items():
        marker = " ◄ TOP" if name == pred else ""
        alert  = f"  ▲ ALERT (>{ALERT*100:.0f}%)" if (name != "Healthy" and prob >= ALERT and name != pred) else ""
        print(f"    {name:<14} {bar(prob)}  {prob*100:5.1f}%{marker}{alert}")

    print(f"\n  Epoch votes:")
    total = summary["n_epochs_analyzed"]
    for name, count in summary["vote_distribution"].items():
        print(f"    {name:<14}: {count:>5} epochs  ({(count / total * 100 if total else 0):4.1f}%)")
    print(f"{sep2}")

    if alerts or pred != "Healthy":
        print()
        if pred != "Healthy":
            print(f"  ┌{'─'*58}┐\n  │  {'⚠  PATHOLOGICAL SIGNAL — ' + pred + ' DETECTED':<56}│\n  │  {'Confidence: ' + f'{conf*100:.1f}%':<56}│")
            if alerts and pred not in alerts: print(f"  │  {'Additional signals above 20%: ' + ', '.join(alerts):<56}│")
            elif len(alerts) > 1:
                extra = ", ".join(a for a in alerts if a != pred)
                if extra: print(f"  │  {'Co-occurring signals > 20%: ' + extra:<56}│")
            print(f"  └{'─'*58}┘")
        else:
            print(f"  ┌{'─'*58}┐\n  │  {'⚠  SECONDARY DISEASE SIGNAL(S) DETECTED':<56}│")
            for a in alerts: print(f"  │    {('• ' + a + ':  ' + f'{probs[a]*100:.1f}%'):<54}│")
            print(f"  │  {'Recommend further clinical evaluation.':<56}│\n  └{'─'*58}┘")
    else:
        print(f"\n  ✓  No disease signals above {ALERT*100:.0f}%  —  Healthy")
    print(f"\n{sep}\n")

# =============================================================================
# STAGE 4 — EXECUTION MODES
# =============================================================================

def infer_npy(filepath, is_raw, orig_fs):
    print(f"\nMode: NPY file ({'raw µV' if is_raw else 'pre-normalized'})\nFile: {filepath}")
    data = np.load(filepath).astype(np.float32)
    if data.ndim == 2: data = data[np.newaxis]
    
    # Trim excess channels blindly if it's over 19 (prevents crash, though mapping is better)
    if data.shape[1] > CFG["n_channels"]:
        print(f"  [WARNING] File has {data.shape[1]} channels. Truncating to 19.")
        data = data[:, :CFG["n_channels"], :]

    if is_raw:
        print("  Applying Patient-Specific Global Z-Scoring...")
        filtered = np.zeros_like(data)
        for i in range(len(data)): 
            # Resample IF needed before filtering
            ep = resample_signal(data[i], orig_fs, CFG["sample_rate"])
            filtered[i] = bandpass_filter(ep)
        data = zscore_global(filtered)
    else:
        # Just resample if it's not raw but has wrong fs
        resampled = []
        for i in range(len(data)): resampled.append(resample_signal(data[i], orig_fs, CFG["sample_rate"]))
        data = np.array(resampled)

    ready = np.array([trim_or_pad(e) for e in data], dtype=np.float32)
    model = load_model()
    results = run_inference(model, ready)
    summary = aggregate(results)

    # --- TRIGGER EXPLAINER IF DISEASE DETECTED ---
    if summary["session_prediction"] != "Healthy":
        dis_name = summary["session_prediction"]
        peak_result = max(
            [r for r in results if r["prediction"] == dis_name], 
            key=lambda x: x["probabilities"][dis_name]
        )
        
        peak_idx = peak_result["epoch_idx"]
        peak_tensor = torch.tensor(ready[peak_idx], dtype=torch.float32).unsqueeze(0).to(DEVICE)
        
        pred_idx = CLASS_NAMES.index(dis_name)
        explanation_data = generate_clinical_explanation(model, peak_tensor, pred_idx)
        
        # Call the LLM
        print("\n  [TRANSLATING MATH TO ENGLISH VIA GEMINI...]")
        clinical_note = call_gemini_api(explanation_data["llm_prompt"])
        
        explanation_data["clinical_note"] = clinical_note
        summary["explanation"] = explanation_data
        
        print(f"\n  [FINAL CLINICAL CHART NOTE]")
        print(f"  {clinical_note}")

    print_result(summary)
    return summary, results

def infer_edf(filepath):
    try:
        import mne
        mne.set_log_level("WARNING")
    except ImportError:
        print("MNE not installed. Run: pip install mne")
        sys.exit(1)
        
    print(f"\nMode: EDF recording\nFile: {filepath}")
    raw = mne.io.read_raw_edf(filepath, preload=True, verbose=False)
    fs  = raw.info["sfreq"]
    target_fs = CFG["sample_rate"]
    
    if int(fs) != target_fs: 
        print(f"  [SIGNAL] Resampling {fs}Hz → {target_fs}Hz...")
        raw.resample(target_fs, verbose=False)
    
    raw.filter(0.5, 45.0, verbose=False)
    raw.notch_filter([50.0, 60.0], verbose=False)
    raw.set_eeg_reference("average", verbose=False)
    data_np, _ = raw[:]

    ch_upper     = [ch.upper().strip() for ch in raw.ch_names]
    target_upper = [ch.upper() for ch in CFG["channel_order"]]
    aligned      = np.zeros((CFG["n_channels"], data_np.shape[-1]), dtype=np.float32)
    for i, tch in enumerate(target_upper):
        if tch in ch_upper: aligned[i] = data_np[ch_upper.index(tch)]
        else: print(f"  [WARNING] Missing critical channel (zeroed): {tch}")

    print("  Applying Patient-Specific Global Z-Scoring...")
    aligned = zscore_global(aligned)

    epochs_np = epochs_from_continuous(aligned, target_fs, CFG["epoch_len_s"], CFG["step_len_s"])
    if epochs_np is None:
        print(f"ERROR: recording too short.")
        sys.exit(1)

    ready = np.array([trim_or_pad(e) for e in epochs_np], dtype=np.float32)
    model = load_model()
    results = run_inference(model, ready)
    summary = aggregate(results)

    # --- TRIGGER EXPLAINER IF DISEASE DETECTED ---
    if summary["session_prediction"] != "Healthy":
        dis_name = summary["session_prediction"]
        peak_result = max(
            [r for r in results if r["prediction"] == dis_name], 
            key=lambda x: x["probabilities"][dis_name]
        )
        
        peak_idx = peak_result["epoch_idx"]
        peak_tensor = torch.tensor(ready[peak_idx], dtype=torch.float32).unsqueeze(0).to(DEVICE)
        
        pred_idx = CLASS_NAMES.index(dis_name)
        explanation_data = generate_clinical_explanation(model, peak_tensor, pred_idx)
        
        # Call the LLM
        print("\n  [TRANSLATING MATH TO ENGLISH VIA GEMINI...]")
        clinical_note = call_gemini_api(explanation_data["llm_prompt"])
        
        explanation_data["clinical_note"] = clinical_note
        summary["explanation"] = explanation_data
        
        print(f"\n  [FINAL CLINICAL CHART NOTE]")
        print(f"  {clinical_note}")

    print_result(summary)
    return summary, results

def infer_live():
    from pylsl import StreamInlet, resolve_stream
    print("\nMode: Live LSL stream\nSearching for EEG stream...")
    streams = resolve_stream("type", "EEG")
    if not streams: sys.exit(1)

    inlet = StreamInlet(streams[0])
    info  = inlet.info()
    fs, n_ch = int(info.nominal_srate()), info.channel_count()
    target_ch, target_len, step_len = CFG["n_channels"], CFG["target_len"], int(CFG["step_len_s"] * fs)

    model = load_model()
    buffer = np.zeros((target_ch, target_len), dtype=np.float32)
    n_collected, warmup = 0, target_len
    session_results = []
    ALERT = CFG["disease_alert_pct"]

    print(f"\nWarming up...\n{'Time':>8}  {'Prediction':<14} {'Conf':>6}  H%   A%   E%   M%  Alerts\n" + "─" * 70)

    try:
        while True:
            chunk, _ = inlet.pull_chunk(timeout=1.0, max_samples=step_len)
            if not chunk: continue

            chunk_np = np.array(chunk, dtype=np.float32).T
            n_new, usable = chunk_np.shape[-1], min(n_ch, target_ch)
            mapped = np.zeros((target_ch, n_new), dtype=np.float32)
            mapped[:usable] = chunk_np[:usable]

            buffer = np.roll(buffer, -n_new, axis=-1)
            buffer[:, -n_new:] = mapped
            n_collected += n_new

            if n_collected < warmup or n_collected % step_len > n_new: continue

            ep = bandpass_filter(buffer.copy())
            ep = zscore_global(ep)
            ready = trim_or_pad(ep)[np.newaxis]

            result  = run_inference(model, ready)[0]
            session_results.append(result)

            p, ts, alrt = result["probabilities"], datetime.now().strftime("%H:%M:%S"), ""
            for name in DISEASE_NAMES:
                if p[name] >= ALERT: alrt += f" ▲{name[:3].upper()}"

            print(f"{ts:>8}  {result['prediction']:<14} {result['confidence']*100:>5.1f}%  {p['Healthy']*100:>3.0f}% {p['Alzheimers']*100:>3.0f}% {p['Epilepsy']*100:>3.0f}% {p['MDD']*100:>3.0f}%{alrt}")
    except KeyboardInterrupt:
        if session_results:
            summary = aggregate(session_results)
            print_result(summary)

# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--file", type=str)
    mode.add_argument("--edf",  type=str)
    mode.add_argument("--live", action="store_true")
    
    parser.add_argument("--raw", action="store_true", help="Input is raw microvolts")
    parser.add_argument("--fs",  type=float, default=256.0, help="Original sampling rate for NPY files (default: 256)")
    args = parser.parse_args()

    if args.file: infer_npy(args.file, is_raw=args.raw, orig_fs=args.fs)
    elif args.edf: infer_edf(args.edf)
    elif args.live: infer_live()