"""
=============================================================================
LUMINA — UNIFIED CLINICAL PIPELINE (V2 ARCHITECTURE)
=============================================================================
Matches lumina_final_best.pth exactly.
- LSTM Hidden:  256
- Freq Input:   95
- Device:       CPU locked (bypasses Apple Silicon MPS FFT corruption)

FIXES applied (cumulative):
  Bug 1 — Dead code after return in call_gemini_api removed.
  Bug 2 — Epoch length corrected to 4.8828125 s (exactly 1250 / 256 samples).
           Previous value of 4.88 s produced 1249 samples, zero-padding every
           epoch by 1 sample and corrupting FFT spike bins used for Epilepsy.
  Bug 3 — NPY mode now z-scores the continuous signal BEFORE epoching, matching
           EDF mode. Previous code z-scored the stacked epoch array, diluting
           ictal spikes across inter-ictal epochs.
  Bug 4 — Per-class high-risk thresholds introduced. Epilepsy threshold lowered
           to 0.55 (inter-ictal epochs naturally look healthy; global 0.70 caused
           Epilepsy to never flag).
  Bug 5 — Live mode z-scores only after the warm-up buffer is filled, avoiding
           near-zero std on a mostly-zero buffer producing Inf / NaN features.
  Bug 7 — ROOT CAUSE of false-positive Epilepsy on healthy files AND
           false-negative Epilepsy on ictal files:
           infer_edf() matched channels by exact uppercase name only.
           Modern EEG amplifiers export T7/T8/P7/P8 (10-10 standard)
           instead of the old 10-20 names T3/T4/T5/T6 the model was
           trained on. All four temporal channels were silently zeroed.
           Zero-filled bilateral temporal channels look to the model like
           focal suppression surrounding active frontal channels, which
           is the canonical Epilepsy pattern → 100% Epilepsy on healthy.
           When the real seizure was in T3/T4/T5/T6 territory it was
           zeroed out entirely → missed Epilepsy.

           Fix: CHANNEL_ALIASES table maps every training-set name to all
           known modern equivalents (T3→T7/M1, T4→T8/M2, T5→P7, T6→P8).
           _clean_ch_name() strips EDF prefixes ('EEG Fp1-Ref' → 'FP1')
           and reference suffixes ('-LE', '-A1', '-Ref') before matching.
           resolve_channel_index() tries every alias in order and logs
           exactly which EDF channel filled each model slot.
           aggregate() used argmax(mean_probs) which is mathematically
           guaranteed to predict Healthy whenever ictal epochs are <50% of
           the recording — regardless of model accuracy. A 50-second EEG
           with a 5-second seizure has only ~10% ictal epochs; averaging
           their probabilities with 90% healthy-looking inter-ictal epochs
           always produces a Healthy-dominant mean.

           Fix: dual-path aggregation.
           - Diffuse diseases (Alzheimers, MDD): argmax(mean_probs) — correct
             because pathology is present in every epoch.
           - Episodic disease  (Epilepsy):       peak-epoch strategy — the
             session is positive if ANY epoch exceeds the per-class threshold,
             because a seizure only has to happen once to be clinically real.
           The two strategies are unified in aggregate() via AGGREGATION_MODE.
=============================================================================
"""

from dotenv import load_dotenv
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

try:
    from captum.attr import IntegratedGradients
    CAPTUM_AVAILABLE = True
except ImportError:
    CAPTUM_AVAILABLE = False
    print("[WARNING] captum not installed — explainer disabled. pip install captum")

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    genai = None
    GENAI_AVAILABLE = False
    print("[WARNING] google-generativeai not installed — Gemini disabled.")


# =============================================================================
# CONFIGURATION
# =============================================================================

CFG = {
    "model_path":    "lumina_final_best.pth",
    "n_classes":     4,
    "n_channels":    19,
    "sample_rate":   256,
    "target_len":    1250,
    # FIX Bug 2: 1250 / 256 = 4.8828125 exactly — no zero-padding artefacts
    "epoch_len_s":   4.8828125,
    "step_len_s":    1.0,
    "lstm_hidden":   256,
    "lstm_layers":   2,
    "dropout":       0.4,
    # FIX Bug 4: per-class thresholds (Epilepsy has sparse ictal activity)
    "high_risk_thresholds": {
        "Alzheimers": 0.70,
        "Epilepsy":   0.55,
        "MDD":        0.65,
    },
    # FIX Bug 6: aggregation strategy per disease.
    #   "mean"  — argmax of mean epoch probabilities. Correct for diffuse
    #             pathology that is present in every epoch (Alzheimers, MDD).
    #   "peak"  — session is positive if ANY single epoch exceeds the
    #             high_risk_threshold. Correct for episodic/sparse pathology
    #             (Epilepsy) where most epochs look inter-ictal / healthy.
    "aggregation_mode": {
        "Alzheimers": "mean",
        "Epilepsy":   "peak",
        "MDD":        "mean",
    },
    "min_confidence":    0.50,
    "disease_alert_pct": 0.20,
    "channel_order": [
        "Fp1", "Fp2", "F7",  "F3",  "Fz",
        "F4",  "F8",  "T3",  "C3",  "Cz",
        "C4",  "T4",  "P3",  "P4",  "Pz",
        "T5",  "T6",  "O1",  "O2",
    ],
}

CLASS_NAMES  = ["Healthy", "Alzheimers", "Epilepsy", "MDD"]
DISEASE_NAMES = CLASS_NAMES[1:]
BANDS = {
    "delta": (0.5,  4.0),
    "theta": (4.0,  8.0),
    "alpha": (8.0, 13.0),
    "beta":  (13.0, 30.0),
    "gamma": (30.0, 45.0),
}

# CRITICAL: Locked to CPU — bypasses Apple Silicon MPS FFT corruption
DEVICE = torch.device("cpu")

# =============================================================================
# CHANNEL ALIAS TABLE
# =============================================================================
# The model was trained on old 10-20 names (T3/T4/T5/T6).
# Modern EEG amplifiers (Nihon Kohden, Natus, BrainProducts, g.tec) export
# the newer 10-10 names (T7/T8/P7/P8) or add prefixes like "EEG Fp1-Ref".
# Zeroing any of these 4 temporal channels instead of resolving them causes:
#   - False-positive Epilepsy on healthy files (flat temporal = focal suppression)
#   - False-negative Epilepsy on ictal files (seizure signal zeroed out)
#
# Each entry: canonical training name → ordered list of aliases to try.
CHANNEL_ALIASES: dict[str, list[str]] = {
    "T3":  ["T7",  "T3",  "M1"],
    "T4":  ["T8",  "T4",  "M2"],
    "T5":  ["P7",  "T5"],
    "T6":  ["P8",  "T6"],
    "Fp1": ["FP1", "Fp1", "FP-1"],
    "Fp2": ["FP2", "Fp2", "FP-2"],
    "F7":  ["F7"],
    "F3":  ["F3"],
    "Fz":  ["FZ",  "Fz"],
    "F4":  ["F4"],
    "F8":  ["F8"],
    "C3":  ["C3"],
    "Cz":  ["CZ",  "Cz"],
    "C4":  ["C4"],
    "P3":  ["P3"],
    "P4":  ["P4"],
    "Pz":  ["PZ",  "Pz"],
    "O1":  ["O1"],
    "O2":  ["O2"],
}


def _clean_ch_name(raw_name: str) -> str:
    """
    Strip common EDF prefixes/suffixes for robust alias matching.
    'EEG Fp1-Ref' -> 'FP1',  'T7-LE' -> 'T7',  'BIP T3' -> 'T3'
    """
    name = raw_name.upper().strip()
    for prefix in ("EEG ", "BIP ", "EOG ", "ECG ", "EMG "):
        if name.startswith(prefix):
            name = name[len(prefix):]
    for sep in ("-", "_"):
        if sep in name:
            name = name.split(sep)[0]
    return name.strip()


def resolve_channel_index(target_name: str, clean_edf_names: list[str]) -> int | None:
    """
    Return the index of target_name (or any alias) in clean_edf_names.
    Returns None if not found after exhausting all aliases.
    """
    aliases = CHANNEL_ALIASES.get(target_name, [target_name])
    for alias in aliases:
        if alias.upper() in clean_edf_names:
            return clean_edf_names.index(alias.upper())
    return None


# =============================================================================
# STAGE 1 — CLINICAL SIGNAL PROCESSING
# =============================================================================

def resample_signal(data: np.ndarray, orig_fs: float, target_fs: float) -> np.ndarray:
    """Resample data [C, T] from orig_fs to target_fs."""
    if orig_fs == target_fs:
        return data
    print(f"  [SIGNAL] Resampling {orig_fs}Hz → {target_fs}Hz...")
    num_samples = int(data.shape[-1] * target_fs / orig_fs)
    return resample(data, num_samples, axis=-1)


def bandpass_filter(data: np.ndarray, lo: float = 0.5, hi: float = 45.0,
                    fs: float = None, order: int = 4) -> np.ndarray:
    """Zero-phase Butterworth bandpass. data: [C, T]"""
    fs  = fs or CFG["sample_rate"]
    nyq = fs / 2.0
    b, a = butter(order, [lo / nyq, hi / nyq], btype="band")
    out  = np.zeros_like(data)
    for c in range(data.shape[0]):
        out[c] = filtfilt(b, a, data[c])
    return out


def zscore_global(data: np.ndarray) -> np.ndarray:
    """
    Patient-specific calibration: z-score across the entire continuous signal.
    Must be applied to the FULL continuous recording before epoching so that
    ictal spikes are not diluted by inter-ictal normalization.
    """
    mean = data.mean()
    std  = data.std()
    if std < 1e-10:
        std = 1e-10
    return (data - mean) / std


def trim_or_pad(epoch: np.ndarray, target_len: int = None) -> np.ndarray:
    """Trim or zero-pad a single epoch [C, T] to target_len samples."""
    n = target_len or CFG["target_len"]
    T = epoch.shape[-1]
    if T > n:
        return epoch[:, :n]
    if T < n:
        return np.pad(epoch, ((0, 0), (0, n - T)))
    return epoch


def epochs_from_continuous(signal: np.ndarray, fs: float,
                            epoch_len_s: float, step_len_s: float) -> np.ndarray | None:
    """Slice a continuous signal [C, T] into overlapping epochs [N, C, T]."""
    epoch_samples = int(epoch_len_s * fs)
    step_samples  = int(step_len_s  * fs)
    epochs, start = [], 0
    while start + epoch_samples <= signal.shape[-1]:
        epochs.append(signal[:, start : start + epoch_samples])
        start += step_samples
    if not epochs:
        return None
    return np.array(epochs, dtype=np.float32)


# =============================================================================
# STAGE 2 — LUMINA V2 ARCHITECTURE
# =============================================================================

class DepthwiseSeparableConv(nn.Module):
    def __init__(self, in_ch: int, out_ch: int, kernel_size: int,
                 stride: int = 1, padding: int = 0):
        super().__init__()
        self.dw = nn.Conv1d(in_ch, in_ch, kernel_size,
                            stride=stride, padding=padding,
                            groups=in_ch, bias=False)
        self.pw = nn.Conv1d(in_ch, out_ch, 1, bias=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.pw(self.dw(x))


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

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(self.cnn(x).permute(0, 2, 1))
        return out[:, -1, :]


class FrequencyDomainBranch(nn.Module):
    def __init__(self):
        super().__init__()
        C      = CFG["n_channels"]
        n_bands = len(BANDS)
        self.fs = CFG["sample_rate"]
        # Input dim: C * n_bands = 19 * 5 = 95  ← matches checkpoint
        self.mlp = nn.Sequential(
            nn.Linear(C * n_bands, 256), nn.ELU(), nn.Dropout(0.3),
            nn.Linear(256, 128),         nn.ELU(),
        )
        self.out_size = 128

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        T        = x.shape[-1]
        freq_res = self.fs / T
        fft_pow  = torch.fft.rfft(x, dim=-1).abs() ** 2
        feats    = []
        for lo, hi in BANDS.values():
            lo_bin = max(1, int(lo / freq_res))
            hi_bin = min(fft_pow.shape[-1], int(hi / freq_res) + 1)
            feats.append(
                torch.log(fft_pow[:, :, lo_bin:hi_bin].mean(dim=-1) + 1e-10)
            )
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

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        t = self.time_branch(x)
        f = self.freq_branch(x)
        return self.head(torch.cat([t, f], dim=1))


def load_model(path: str = None) -> LuminaModel:
    """Load weights from disk into a fresh LuminaModel and set eval mode."""
    if path is None or path == "lumina_final_best.pth":
        base_dir = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(base_dir, "lumina_final_best.pth")

    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found: '{path}'")

    model = LuminaModel()
    model.load_state_dict(torch.load(path, map_location=DEVICE))
    model.eval()
    return model


# =============================================================================
# STAGE 3 — INFERENCE & AGGREGATION
# =============================================================================

@torch.no_grad()
def run_inference(model: LuminaModel, epochs_ready: np.ndarray) -> list[dict]:
    """Run the model over a batch of pre-processed epochs and return per-epoch results."""
    x      = torch.tensor(epochs_ready, dtype=torch.float32).to(DEVICE)
    logits = model(x)
    probs  = F.softmax(logits, dim=1).cpu().numpy()

    # FIX Bug 4: use per-class thresholds
    hr_thresholds = CFG["high_risk_thresholds"]

    results = []
    for i, prob in enumerate(probs):
        pred_idx   = int(np.argmax(prob))
        confidence = float(prob[pred_idx])
        pred_name  = CLASS_NAMES[pred_idx]

        flags = []
        if pred_idx != 0:
            threshold = hr_thresholds.get(pred_name, 0.70)
            if confidence >= threshold:
                flags.append(f"HIGH_RISK_{pred_name.upper()}")
        if confidence < CFG["min_confidence"]:
            flags.append("LOW_CONFIDENCE")

        results.append({
            "epoch_idx":     i,
            "prediction":    pred_name,
            "confidence":    round(confidence, 4),
            "probabilities": {n: round(float(p), 4) for n, p in zip(CLASS_NAMES, prob)},
            "flags":         flags,
        })
    return results


def aggregate(epoch_results: list[dict]) -> dict:
    """
    Aggregate per-epoch results into a session-level summary.

    FIX Bug 6 — dual-path aggregation:

    DIFFUSE diseases (Alzheimers, MDD) use mean_probs + argmax.
      Pathology appears in every epoch, so averaging is meaningful.

    EPISODIC disease (Epilepsy) uses peak-epoch detection.
      A seizure may occupy <5% of the recording; averaging with 95%
      inter-ictal (healthy-looking) epochs mathematically guarantees
      a Healthy prediction even when the model fires correctly on every
      ictal epoch.  Instead, the session is positive if ANY epoch's
      P(Epilepsy) exceeds the per-class threshold — because a seizure
      only needs to happen once to be clinically real.

    Final prediction priority (highest to lowest):
      1. Any peak-mode disease that fired  → that disease
      2. argmax(mean_probs) among mean-mode diseases
      3. Healthy
    """
    all_probs   = np.array([list(r["probabilities"].values()) for r in epoch_results])
    mean_probs  = all_probs.mean(axis=0)   # shape [4]
    peak_probs  = all_probs.max(axis=0)    # shape [4]  — max over epochs
    vote_counts = np.bincount(
        [CLASS_NAMES.index(r["prediction"]) for r in epoch_results],
        minlength=4,
    )

    hr_thresh  = CFG["high_risk_thresholds"]
    agg_mode   = CFG["aggregation_mode"]

    # ── Evaluate each disease independently ──────────────────────────────
    disease_detected: str | None = None
    detection_confidence: float  = 0.0
    high_risk_flags: list[str]   = []
    disease_alerts:  list[str]   = []

    # Check peak-mode diseases first (higher clinical priority)
    for name in DISEASE_NAMES:
        if agg_mode.get(name, "mean") != "peak":
            continue
        idx       = CLASS_NAMES.index(name)
        threshold = hr_thresh.get(name, 0.55)
        p_peak    = float(peak_probs[idx])
        p_mean    = float(mean_probs[idx])

        if p_peak >= threshold:
            high_risk_flags.append(name)
            if disease_detected is None:
                disease_detected      = name
                detection_confidence  = p_peak   # report peak, not diluted mean
        if p_mean >= CFG["disease_alert_pct"]:
            disease_alerts.append(name)

    # Check mean-mode diseases
    mean_mode_probs = {
        i: float(mean_probs[i])
        for i, n in enumerate(CLASS_NAMES)
        if n in DISEASE_NAMES and agg_mode.get(n, "mean") == "mean"
    }
    for idx, p_mean in mean_mode_probs.items():
        name      = CLASS_NAMES[idx]
        threshold = hr_thresh.get(name, 0.70)
        if p_mean >= threshold:
            high_risk_flags.append(name)
            if disease_detected is None:
                disease_detected     = name
                detection_confidence = p_mean
        if p_mean >= CFG["disease_alert_pct"]:
            if name not in disease_alerts:
                disease_alerts.append(name)

    # ── Final session prediction ─────────────────────────────────────────
    if disease_detected is not None:
        session_pred = disease_detected
        session_conf = round(detection_confidence, 4)
    else:
        # FIX: No disease cleared its clinical threshold — patient is Healthy.
        # Do NOT use argmax here, otherwise sub-threshold noise becomes a diagnosis.
        session_pred = "Healthy"
        
        # We report the model's confidence in the Healthy class (index 0)
        session_conf = round(float(mean_probs[0]), 4) 

    

    return {
        "session_prediction": session_pred,
        "session_confidence": session_conf,
        "n_epochs_analyzed":  len(epoch_results),
        "vote_distribution":  {n: int(v) for n, v in zip(CLASS_NAMES, vote_counts)},
        "mean_probabilities": {n: round(float(p), 4) for n, p in zip(CLASS_NAMES, mean_probs)},
        "peak_probabilities": {n: round(float(p), 4) for n, p in zip(CLASS_NAMES, peak_probs)},
        "high_risk_flags":    high_risk_flags,
        "disease_alerts":     disease_alerts,
        "timestamp":          datetime.now().isoformat(),
    }


# =============================================================================
# STAGE 4 — EXPLAINABILITY (CAPTUM + GEMINI)
# =============================================================================

def generate_clinical_explanation(model: LuminaModel,
                                  peak_epoch_tensor: torch.Tensor,
                                  predicted_idx: int) -> dict:
    """
    Run Integrated Gradients on the peak pathological epoch to identify
    which EEG channel drove the prediction, then build a Gemini prompt.
    Returns a dict suitable for JSON serialisation and forwarding to Flutter.
    """
    if not CAPTUM_AVAILABLE:
        return {"error": "captum not installed"}

    disease_name = CLASS_NAMES[predicted_idx]
    print(f"\n  [EXPLAINER] Reverse-engineering peak epoch for {disease_name}...")

    ig       = IntegratedGradients(model)
    baseline = torch.zeros_like(peak_epoch_tensor)

    attributions, _ = ig.attribute(
        inputs=peak_epoch_tensor,
        baselines=baseline,
        target=predicted_idx,
        return_convergence_delta=True,
    )

    heatmap_tensor     = attributions[0].detach()
    channel_importance = torch.sum(torch.abs(heatmap_tensor), dim=1)
    top_ch_idx         = int(torch.argmax(channel_importance).item())
    top_ch_name        = CFG["channel_order"][top_ch_idx]
    total_signal       = torch.sum(channel_importance).item()
    top_ch_pct         = (channel_importance[top_ch_idx].item() / (total_signal + 1e-10)) * 100

    # llm_prompt = (
    #     f"You are the Chief Neurologist evaluating an AI EEG analysis. "
    #     f"The Lumina neural network diagnosed the patient with {disease_name}. "
    #     f"A mathematical heatmap reveals that {top_ch_pct:.1f}% of the pathological "
    #     f"signal originated primarily in channel {top_ch_name}. "
    #     f"Write a concise, 2-sentence clinical rationale explaining why {disease_name} "
    #     f"would present with intense focal electrical activity in the {top_ch_name} region. "
    #     f"Do not mention the AI or the heatmap; write as a doctor interpreting the findings."
    # )

    llm_prompt = f"""You are a Board-Certified Neurologist preparing a formal Clinical Interpretation Report for an EEG analysis that detected {disease_name}.
 
    **Clinical Context:**
    - Diagnosis: {disease_name}
    - Primary Signal Location: {top_ch_name} electrode (contributing {top_ch_pct:.1f}% of pathological activity)
    - Analysis Method: Quantitative EEG with multi-domain neural network classification
    
    **Task:** Write a comprehensive clinical interpretation report using the following structure. Use markdown formatting for visual clarity.
    
    ---
    
    ## 📋 CLINICAL INTERPRETATION REPORT
    
    ### 🎯 Primary Findings
    [Write 2-3 sentences describing the key electrophysiological findings. Explain what abnormal patterns were detected and their clinical significance.]
    
    ### 🧠 Neuroanatomical Correlation
    [Explain in 2-3 sentences why {disease_name} characteristically presents with abnormal electrical activity in the {top_ch_name} region. Reference the underlying brain structures (e.g., cortical areas, networks) and their known involvement in this condition.]
    
    ### ⚡ Pathophysiological Mechanism
    [In 2-3 sentences, describe the biological mechanism: What happens at the cellular/network level in {disease_name} that produces these specific EEG signatures? Mention relevant neurotransmitter systems, neural oscillations, or synaptic dysfunction as appropriate.]
    
    ### 🔍 Clinical Significance
    [Provide 2-3 sentences on what these findings mean for the patient. Include:
    - Diagnostic confidence and any differential considerations
    - Typical disease progression or prognosis context
    - Any monitoring or follow-up implications]
    
    ### 💊 Recommended Actions
    [List 3-5 specific, actionable clinical recommendations using bullet points:]
    - [Recommendation 1]
    - [Recommendation 2]
    - [Recommendation 3]
    
    ---
    
    **Guidelines:**
    - Write as a neurologist interpreting clinical EEG findings, NOT as an AI system
    - Do NOT mention "AI", "neural network", "algorithm", "model", or "heatmap"
    - Use professional medical terminology, but keep explanations clear
    - Use emojis sparingly (only in section headers) for visual organization
    - Reference specific neuroanatomical structures and physiological mechanisms
    - Maintain an authoritative yet compassionate clinical tone
    - Total length: 250-350 words
    """


    print(f"  [EXPLAINER] Done. Primary signal: {top_ch_name} ({top_ch_pct:.1f}% gradient weight).")

    return {
        "top_channel":       top_ch_name,
        "signal_weight_pct": round(top_ch_pct, 1),
        "llm_prompt":        llm_prompt,
        "heatmap_matrix":    heatmap_tensor.numpy().tolist(),
    }


def call_gemini_api(prompt: str) -> str:
    """
    Send a prompt to Gemini 2.5 Flash and return the text response.
    FIX Bug 1: removed dead code that appeared after the return statement.
    """
    if not GENAI_AVAILABLE:
        return "ERROR: google-generativeai not installed."

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "ERROR: GEMINI_API_KEY not set in environment."

    try:
        genai.configure(api_key=api_key)
        model    = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"LLM API Error: {e}"


def _maybe_explain(model: LuminaModel, ready: np.ndarray,
                   results: list[dict], summary: dict) -> dict:
    """
    If a disease was detected, run the explainer on the most confident epoch
    and attach the Gemini clinical note to the summary dict in-place.
    Returns the (possibly mutated) summary.
    """
    if summary["session_prediction"] == "Healthy":
        return summary

    dis_name = summary["session_prediction"]
    disease_results = [r for r in results if r["prediction"] == dis_name]
    if not disease_results:
        return summary

    peak_result = max(disease_results, key=lambda r: r["probabilities"][dis_name])
    peak_idx    = peak_result["epoch_idx"]
    peak_tensor = torch.tensor(ready[peak_idx], dtype=torch.float32).unsqueeze(0).to(DEVICE)
    pred_idx    = CLASS_NAMES.index(dis_name)

    explanation_data = generate_clinical_explanation(model, peak_tensor, pred_idx)

    print("\n  [TRANSLATING MATH TO ENGLISH VIA GEMINI...]")
    clinical_note                  = call_gemini_api(explanation_data["llm_prompt"])
    explanation_data["clinical_note"] = clinical_note
    summary["explanation"]         = explanation_data

    print(f"\n  [FINAL CLINICAL CHART NOTE]\n  {clinical_note}")
    return summary


# =============================================================================
# STAGE 5 — REPORTING
# =============================================================================

def print_result(summary: dict) -> None:
    ALERT       = CFG["disease_alert_pct"]
    probs       = summary["mean_probabilities"]
    peak_probs  = summary.get("peak_probabilities", {})
    pred        = summary["session_prediction"]
    conf        = summary["session_confidence"]
    alerts      = summary["disease_alerts"]
    agg_mode    = CFG["aggregation_mode"]

    def bar(p: float, width: int = 28) -> str:
        filled = int(p * width)
        return "█" * filled + "░" * (width - filled)

    hr_threshold = CFG["high_risk_thresholds"].get(pred, 0.70)
    is_high_risk = pred != "Healthy" and conf >= hr_threshold
    severity = (
        "HIGH RISK"               if is_high_risk else
        "DISEASE SIGNAL DETECTED" if alerts        else
        "RESULT"
    )
    border = "!" if is_high_risk else "*" if alerts else "="
    sep    = border * 62
    sep2   = "-" * 62

    print(f"\n{sep}\n  LUMINA — {severity}\n{sep}")
    print(f"  Prediction  : {pred}")
    print(f"  Confidence  : {conf * 100:.1f}%")
    print(f"  Epochs      : {summary['n_epochs_analyzed']}")
    print(sep2)
    print(f"  {'Class':<14} {'Mean prob':>10}  {'Peak prob':>10}  {'Bar (mean)':>4}  {'Mode'}")

    for name, mean_p in probs.items():
        peak_p  = peak_probs.get(name, mean_p)
        mode    = agg_mode.get(name, "mean") if name != "Healthy" else "—"
        marker  = " ◄" if name == pred else ""
        alert_m = (
            f" ▲ALERT"
            if name != "Healthy" and mean_p >= ALERT and name != pred
            else ""
        )
        print(
            f"    {name:<14} {mean_p*100:>8.1f}%  {peak_p*100:>8.1f}%  "
            f"{bar(mean_p)}  {mode}{marker}{alert_m}"
        )

    total = summary["n_epochs_analyzed"]
    print(f"\n  Epoch votes:")
    for name, count in summary["vote_distribution"].items():
        pct = count / total * 100 if total else 0
        print(f"    {name:<14}: {count:>5} epochs  ({pct:4.1f}%)")
    print(sep2)

    if alerts or pred != "Healthy":
        print()
        w = 56
        if pred != "Healthy":
            mode_used = agg_mode.get(pred, "mean")
            print(f"  ┌{'─'*58}┐")
            print(f"  │  {'⚠  PATHOLOGICAL SIGNAL — ' + pred + ' DETECTED':<{w}}│")
            print(f"  │  {'Confidence: ' + f'{conf*100:.1f}%' + '  (via ' + mode_used + '-epoch strategy)':<{w}}│")
            extra = ", ".join(a for a in alerts if a != pred)
            if extra:
                print(f"  │  {'Co-occurring signals > 20%: ' + extra:<{w}}│")
            print(f"  └{'─'*58}┘")
        else:
            print(f"  ┌{'─'*58}┐")
            print(f"  │  {'⚠  SECONDARY DISEASE SIGNAL(S) DETECTED':<{w}}│")
            for a in alerts:
                print(f"  │    {'• ' + a + ':  ' + f'{probs[a]*100:.1f}%':<54}│")
            print(f"  │  {'Recommend further clinical evaluation.':<{w}}│")
            print(f"  └{'─'*58}┘")
    else:
        print(f"\n  ✓  No disease signals above {ALERT*100:.0f}%  —  Healthy")
    print(f"\n{sep}\n")


# =============================================================================
# STAGE 6 — EXECUTION MODES
# =============================================================================

def infer_npy(filepath: str, is_raw: bool, orig_fs: float) -> tuple[dict, list]:
    """
    Infer from a pre-saved .npy file.

    FIX Bug 3: z-score is now applied to the CONTINUOUS signal before epoching,
    not to the stacked epoch array. This prevents ictal amplitude dilution.
    
    ADDED: Waveform viewer support — captures filtered signal before z-scoring
    and attaches it to the summary for visualization in Flutter/frontend.
    """
    print(f"\nMode: NPY file ({'raw µV' if is_raw else 'pre-normalised'})")
    print(f"File: {filepath}")

    data = np.load(filepath).astype(np.float32)
    if data.ndim == 1:
        raise ValueError("Expected [C, T] or [N, C, T] array.")
    if data.ndim == 2:
        # Single recording [C, T] → treat as continuous
        continuous = data
    else:
        # [N, C, T] stacked: flatten to continuous along time axis
        continuous = np.concatenate(list(data), axis=-1)

    if continuous.shape[0] > CFG["n_channels"]:
        print(f"  [WARNING] {continuous.shape[0]} channels found — truncating to {CFG['n_channels']}.")
        continuous = continuous[: CFG["n_channels"], :]

    if is_raw:
        print("  Resampling + bandpass filtering...")
        continuous = resample_signal(continuous, orig_fs, CFG["sample_rate"])
        continuous = bandpass_filter(continuous)
        raw_for_viewer = continuous.copy()  # Capture filtered signal before z-score
    else:
        raw_for_viewer = continuous.copy()  # Capture pre-normalized signal

    # FIX Bug 3: z-score continuous signal BEFORE epoching
    print("  Applying patient-specific global Z-scoring (continuous signal)...")
    continuous = zscore_global(continuous)

    epochs_np = epochs_from_continuous(
        continuous, CFG["sample_rate"], CFG["epoch_len_s"], CFG["step_len_s"]
    )
    if epochs_np is None or len(epochs_np) == 0:
        print("ERROR: Recording too short to produce any epochs.")
        sys.exit(1)

    ready   = np.array([trim_or_pad(e) for e in epochs_np], dtype=np.float32)
    model   = load_model()
    results = run_inference(model, ready)
    summary = aggregate(results)
    
    # Add waveform data for viewer
    preview_len = min(2560, raw_for_viewer.shape[-1])
    summary["waveforms"] = {
        "signal": raw_for_viewer[:CFG["n_channels"], :preview_len].tolist(),
        "channels": CFG["channel_order"],
        "sample_rate": CFG["sample_rate"],
        "n_samples_total": raw_for_viewer.shape[-1],
    }
    
    summary = _maybe_explain(model, ready, results, summary)

    print_result(summary)
    return summary, results


def infer_edf(filepath: str) -> tuple[dict, list]:
    """
    Infer from a European Data Format (.edf) recording.
    Z-score is applied to the continuous aligned signal before epoching.
    
    ADDED: Waveform viewer support — captures filtered/aligned signal before 
    z-scoring and attaches it to the summary for visualization.
    """
    try:
        import mne
        mne.set_log_level("WARNING")
    except ImportError:
        print("MNE not installed. Run: pip install mne")
        sys.exit(1)

    print(f"\nMode: EDF recording\nFile: {filepath}")
    raw = mne.io.read_raw_edf(filepath, preload=True, verbose=False)
    fs  = raw.info["sfreq"]

    if int(fs) != CFG["sample_rate"]:
        print(f"  [SIGNAL] Resampling {fs}Hz → {CFG['sample_rate']}Hz...")
        raw.resample(CFG["sample_rate"], verbose=False)

    raw.filter(0.5, 45.0, verbose=False)
    raw.notch_filter([50.0, 60.0], verbose=False)
    raw.set_eeg_reference("average", verbose=False)
    data_np, _ = raw[:]

    # Build a cleaned name list once — strips prefixes/suffixes from every
    # channel in the EDF file so alias matching works regardless of system.
    clean_edf_names = [_clean_ch_name(ch) for ch in raw.ch_names]

    aligned = np.zeros((CFG["n_channels"], data_np.shape[-1]), dtype=np.float32)
    mapped, zeroed = [], []
    for i, target in enumerate(CFG["channel_order"]):
        idx = resolve_channel_index(target, clean_edf_names)
        if idx is not None:
            aligned[i] = data_np[idx]
            mapped.append(f"{target}←{raw.ch_names[idx]}")
        else:
            zeroed.append(target)

    if mapped:
        print(f"  [CHANNELS] Mapped {len(mapped)}/{CFG['n_channels']}: {', '.join(mapped)}")
    if zeroed:
        print(f"  [WARNING]  {len(zeroed)} channel(s) not found even after alias resolution")
        print(f"             and will be zeroed: {', '.join(zeroed)}")
        print(f"             EDF channels available: {', '.join(raw.ch_names)}")
        if len(zeroed) > 4:
            print("  [ERROR]    >4 channels missing — results will be unreliable.")

    if len(zeroed) > 0:
        # Confirm which aliases were tried so the user can add new ones
        for z in zeroed:
            tried = CHANNEL_ALIASES.get(z, [z])
            print(f"             {z}: tried {tried}")

    # Capture signal before z-scoring for viewer
    raw_signal_for_viewer = aligned.copy()
    
    print("  Applying patient-specific global Z-scoring (continuous signal)...")
    aligned = zscore_global(aligned)

    epochs_np = epochs_from_continuous(
        aligned, CFG["sample_rate"], CFG["epoch_len_s"], CFG["step_len_s"]
    )
    if epochs_np is None or len(epochs_np) == 0:
        print("ERROR: Recording too short to produce any epochs.")
        sys.exit(1)

    ready   = np.array([trim_or_pad(e) for e in epochs_np], dtype=np.float32)
    model   = load_model()
    results = run_inference(model, ready)
    summary = aggregate(results)
    
    # Add waveform data for viewer
    preview_len = min(2560, raw_signal_for_viewer.shape[1])
    n_ch_actual = min(CFG["n_channels"], raw_signal_for_viewer.shape[0])
    summary["waveforms"] = {
        "signal": raw_signal_for_viewer[:n_ch_actual, :preview_len].tolist(),
        "channels": CFG["channel_order"][:n_ch_actual],
        "sample_rate": CFG["sample_rate"],
        "n_samples_total": raw_signal_for_viewer.shape[1],
    }
    
    summary = _maybe_explain(model, ready, results, summary)

    print_result(summary)
    return summary, results


def infer_live() -> None:
    """
    Real-time inference from a Lab Streaming Layer (LSL) EEG stream.

    FIX Bug 5: Z-score is skipped during warm-up when the buffer is mostly
    zeros. Normalisation only runs once the rolling buffer is fully populated,
    preventing near-zero std → Inf / NaN artefacts.
    """
    try:
        from pylsl import StreamInlet, resolve_stream
    except ImportError:
        print("pylsl not installed. Run: pip install pylsl")
        sys.exit(1)

    print("\nMode: Live LSL stream\nSearching for EEG stream...")
    streams = resolve_stream("type", "EEG")
    if not streams:
        print("No EEG stream found.")
        sys.exit(1)

    inlet = StreamInlet(streams[0])
    info  = inlet.info()
    fs, n_ch = int(info.nominal_srate()), info.channel_count()

    target_ch   = CFG["n_channels"]
    target_len  = CFG["target_len"]
    step_len    = int(CFG["step_len_s"] * fs)
    warmup      = target_len                  # samples needed before first inference

    model           = load_model()
    buffer          = np.zeros((target_ch, target_len), dtype=np.float32)
    n_collected     = 0
    session_results = []
    ALERT           = CFG["disease_alert_pct"]

    header = f"\n{'Time':>8}  {'Prediction':<14} {'Conf':>6}  H%   A%   E%   M%  Alerts"
    print(f"Warmed up after {warmup} samples ({warmup/fs:.1f}s).\n{header}\n{'─'*70}")

    try:
        while True:
            chunk, _ = inlet.pull_chunk(timeout=1.0, max_samples=step_len)
            if not chunk:
                continue

            chunk_np = np.array(chunk, dtype=np.float32).T   # [ch, samples]
            n_new    = chunk_np.shape[-1]
            usable   = min(n_ch, target_ch)

            mapped = np.zeros((target_ch, n_new), dtype=np.float32)
            mapped[:usable] = chunk_np[:usable]

            buffer = np.roll(buffer, -n_new, axis=-1)
            buffer[:, -n_new:] = mapped
            n_collected += n_new

            # FIX Bug 5: only infer once the buffer is fully populated
            if n_collected < warmup:
                continue
            if n_collected % step_len > n_new:
                continue

            ep = bandpass_filter(buffer.copy())

            # Safe z-score: buffer is fully populated so std is meaningful
            std = ep.std()
            if std < 1e-10:
                continue          # silence or disconnected — skip epoch
            ep = zscore_global(ep)

            ready  = trim_or_pad(ep)[np.newaxis]
            result = run_inference(model, ready)[0]
            session_results.append(result)

            p    = result["probabilities"]
            ts   = datetime.now().strftime("%H:%M:%S")
            alrt = "".join(
                f" ▲{name[:3].upper()}"
                for name in DISEASE_NAMES
                if p[name] >= ALERT
            )
            print(
                f"{ts:>8}  {result['prediction']:<14} "
                f"{result['confidence']*100:>5.1f}%  "
                f"{p['Healthy']*100:>3.0f}% "
                f"{p['Alzheimers']*100:>3.0f}% "
                f"{p['Epilepsy']*100:>3.0f}% "
                f"{p['MDD']*100:>3.0f}%"
                f"{alrt}"
            )

    except KeyboardInterrupt:
        print("\n[LIVE] Session ended by user.")
        if session_results:
            summary = aggregate(session_results)
            print_result(summary)


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Lumina V2 — EEG neurological disease classifier"
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--file", type=str,         help="Path to .npy EEG file")
    mode.add_argument("--edf",  type=str,         help="Path to .edf EEG recording")
    mode.add_argument("--live", action="store_true", help="Stream from LSL device")

    parser.add_argument(
        "--raw",
        action="store_true",
        help="NPY input is raw µV (applies resample + bandpass + z-score)",
    )
    parser.add_argument(
        "--fs",
        type=float,
        default=256.0,
        help="Original sampling rate of the NPY file (default: 256 Hz)",
    )
    args = parser.parse_args()

    if   args.file: infer_npy(args.file, is_raw=args.raw, orig_fs=args.fs)
    elif args.edf:  infer_edf(args.edf)
    elif args.live: infer_live()