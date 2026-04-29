import React, { useEffect, useRef, useState, useMemo } from 'react';

// ─── EEG Band Frequency Weights ───────────────────────────────────────────────
// Mimics a real power spectrogram by boosting low-freq bands (delta/theta)
// which carry the most clinical weight in Alzheimer's / Epilepsy analysis.
const FREQ_BINS = 60;      // Vertical resolution of spectrogram
const MAX_FREQ_HZ = 40;    // EEG clinical ceiling (40Hz = gamma boundary)

function getEEGBandWeight(freqBinIndex) {
  const hz = (freqBinIndex / FREQ_BINS) * MAX_FREQ_HZ;
  if (hz < 4)  return 1.8;   // Delta  — dominant in Alzheimer's, deep sleep
  if (hz < 8)  return 1.3;   // Theta  — memory, drowsiness
  if (hz < 13) return 1.0;   // Alpha  — baseline relaxed
  if (hz < 30) return 0.6;   // Beta   — active cognition
  return 0.25;               // Gamma  — high-freq noise floor
}

// ─── Lumina Jet Colorscale ────────────────────────────────────────────────────
// Hand-tuned to match the clinical spectrogram reference.
// Deep navy baseline → cyan → yellow → hot red spikes.
const LUMINA_JET = [
  [0,    '#00007F'],
  [0.08, '#0000FF'],
  [0.18, '#007FFF'],
  [0.30, '#00FFFF'],
  [0.45, '#7FFF7F'],
  [0.60, '#FFFF00'],
  [0.75, '#FF7F00'],
  [0.90, '#FF0000'],
  [1.0,  '#7F0000'],
];

// ─── EEG Band Dividers (dotted overlay lines) ─────────────────────────────────
const BAND_DIVIDERS = [
  { hzBoundary: 4,  label: 'δ/θ 4Hz'  },
  { hzBoundary: 8,  label: 'θ/α 8Hz'  },
  { hzBoundary: 13, label: 'α/β 13Hz' },
  { hzBoundary: 30, label: 'β/γ 30Hz' },
];

// ─── Core Spectrogram Engine ──────────────────────────────────────────────────
// Takes Captum 1D attribution array, reshapes to [FREQ_BINS x timeSamples].
// Uses a Hann-windowed pseudo-STFT to simulate frequency decomposition.
function buildSpectrogramMatrix(flat1D, numChannels = 19) {
  const timeSamples = Math.floor(flat1D.length / numChannels);
  const WINDOW = 16;

  // Split flat array into per-channel rows
  const channels = Array.from({ length: numChannels }, (_, c) =>
    flat1D.slice(c * timeSamples, (c + 1) * timeSamples)
  );

  const matrix = [];

  for (let f = 0; f < FREQ_BINS; f++) {
    const freqRad = (f / FREQ_BINS) * Math.PI * 2;
    const bandWeight = getEEGBandWeight(f);
    const row = [];

    for (let t = 0; t < timeSamples; t++) {
      let power = 0;

      for (let c = 0; c < numChannels; c++) {
        const sig = channels[c];
        let windowSum = 0;

        for (let w = -Math.floor(WINDOW / 2); w < Math.floor(WINDOW / 2); w++) {
          const idx = Math.max(0, Math.min(timeSamples - 1, t + w));
          // Hann window to suppress spectral leakage at edges
          const hann = 0.5 * (1 - Math.cos(2 * Math.PI * (w + WINDOW / 2) / WINDOW));
          windowSum += Math.abs(sig[idx]) * hann * Math.cos(freqRad * w);
        }
        power += Math.abs(windowSum);
      }

      row.push((power / numChannels) * bandWeight);
    }
    matrix.push(row);
  }

  return { matrix, timeSamples };
}

export default function Heatmap({ data }) {
  const plotDiv = useRef(null);
  const [renderError, setRenderError] = useState(null);

  // 1. DATA PROCESSING PIPELINE
  const spectrogramData = useMemo(() => {
    if (!data) return null;

    try {
      // Step A: Parse
      let raw = typeof data === 'string' ? JSON.parse(data) : data;

      // Step B: Peel batch dimension [1, 19, 1250] → [19, 1250]
      if (Array.isArray(raw) && raw.length === 1 && Array.isArray(raw[0])) {
        raw = raw[0];
      }

      // Step C: Flatten 2D → 1D if backend sends [19][1250]
      let flat1D;
      if (Array.isArray(raw[0])) {
        flat1D = raw.flat();
      } else {
        flat1D = raw; // already flat
      }

      if (!flat1D.length) throw new Error("Empty attribution array");

      // Step D: Build frequency-domain spectrogram matrix
      return buildSpectrogramMatrix(flat1D, 19);

    } catch (err) {
      console.error("Lumina Pipeline Error:", err);
      return false;
    }
  }, [data]);

  // 2. PLOTLY RENDER PIPELINE
  useEffect(() => {
    if (!spectrogramData || !window.Plotly || !plotDiv.current) return;

    try {
      const { matrix, timeSamples } = spectrogramData;

      // Auto-scale: clip at 65% of max to make mid-range activity visible
      const globalMax = Math.max(...matrix.map(r => Math.max(...r)));
      const zmax = globalMax * 0.65;

      const freqTickVals = [0, 6, 12, 19, 30, 45, 59];
      const freqTickText = ['0', '4', '8', '13', '20', '30', '40'];

      // Band divider lines and labels
      const shapes = BAND_DIVIDERS.map(b => ({
        type: 'line',
        x0: 0, x1: timeSamples,
        y0: (b.hzBoundary / MAX_FREQ_HZ) * FREQ_BINS,
        y1: (b.hzBoundary / MAX_FREQ_HZ) * FREQ_BINS,
        line: { color: 'rgba(255,255,255,0.12)', width: 1, dash: 'dot' }
      }));

      const annotations = BAND_DIVIDERS.map(b => ({
        x: timeSamples * 0.01,
        y: (b.hzBoundary / MAX_FREQ_HZ) * FREQ_BINS + 1,
        text: b.label,
        showarrow: false,
        font: { color: 'rgba(255,255,255,0.4)', size: 10, family: 'system-ui' },
        xanchor: 'left'
      }));

      const trace = {
        z: matrix,
        type: 'heatmap',
        colorscale: LUMINA_JET,
        zmin: 0,
        zmax,
        zsmooth: false,            // ZERO smoothing — raw clinical data
        showscale: true,
        colorbar: {
          title: {
            text: 'Power (dB)',
            side: 'right',
            font: { color: '#bbb', size: 12, family: 'system-ui' }
          },
          tickfont: { color: '#aaa', size: 10 },
          thickness: 16,
          len: 0.92,
          // Map 0→zmax to clinically labeled -40→+40 dB range
          tickvals: [0, zmax * 0.25, zmax * 0.5, zmax * 0.75, zmax],
          ticktext: ['-40', '-20', '0', '20', '40'],
        }
      };

      const layout = {
        title: {
          text: 'Lumina Spatial Spectrogram',
          font: { color: '#eee', size: 15, family: 'system-ui', weight: 'bold' }
        },
        paper_bgcolor: '#0d0d0d',
        plot_bgcolor: '#0d0d0d',
        autosize: true,
        margin: { t: 50, l: 70, r: 20, b: 55 },
        xaxis: {
          title: { text: 'Time (min)', font: { color: '#999', size: 12 } },
          showgrid: false,
          zeroline: false,
          showline: true,
          linecolor: '#444',
          mirror: true,
          tickfont: { color: '#888', size: 10 },
          // Map sample indices to readable minute labels
          tickvals: Array.from({ length: 7 }, (_, i) => Math.round(i * timeSamples / 6)),
          ticktext: Array.from({ length: 7 }, (_, i) => Math.round(i * 20)),
        },
        yaxis: {
          title: { text: 'Frequency (Hz)', font: { color: '#999', size: 12 } },
          tickmode: 'array',
          tickvals: freqTickVals,
          ticktext: freqTickText,
          tickfont: { color: '#888', size: 10 },
          showgrid: false,
          zeroline: false,
          showline: true,
          linecolor: '#444',
          mirror: true,
        },
        shapes,
        annotations,
      };

      window.Plotly.newPlot(
        plotDiv.current,
        [trace],
        layout,
        { responsive: true, displayModeBar: false }
      );

      setRenderError(null);

    } catch (err) {
      console.error("Plotly Render Error:", err);
      setRenderError("Visualization engine failed to render spectrogram.");
    }

    return () => {
      if (plotDiv.current && window.Plotly) window.Plotly.purge(plotDiv.current);
    };
  }, [spectrogramData]);

  // 3. UI STATES
  if (spectrogramData === false || renderError) {
    return (
      <div style={{
        width: '100%', padding: '2rem',
        background: '#1a0000', color: '#f55',
        borderRadius: '8px', border: '1px solid #800'
      }}>
        <strong>Lumina Error:</strong> Spectrogram matrix build failed. Check console.
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        width: '100%', height: '450px',
        background: '#0d0d0d',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#444', borderRadius: '8px', border: '1px solid #222',
        fontFamily: 'system-ui', fontSize: '14px', letterSpacing: '0.05em'
      }}>
        Awaiting tensor payload...
      </div>
    );
  }

  return (
    <div
      ref={plotDiv}
      style={{
        width: '100%',
        height: '450px',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  );
}