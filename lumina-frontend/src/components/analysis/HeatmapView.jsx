import { useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import Card from '../ui/Card';

const FREQ_BINS = 60;
const MAX_FREQ_HZ = 40;

function getEEGBandWeight(freqBinIndex) {
  const hz = (freqBinIndex / FREQ_BINS) * MAX_FREQ_HZ;
  if (hz < 4)  return 1.8;
  if (hz < 8)  return 1.3;
  if (hz < 13) return 1.0;
  if (hz < 30) return 0.6;
  return 0.25;
}

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

const BAND_DIVIDERS = [
  { hzBoundary: 4,  label: '\u03b4/\u03b8 4Hz' },
  { hzBoundary: 8,  label: '\u03b8/\u03b1 8Hz' },
  { hzBoundary: 13, label: '\u03b1/\u03b2 13Hz' },
  { hzBoundary: 30, label: '\u03b2/\u03b3 30Hz' },
];

function buildSpectrogramMatrix(flat1D, numChannels = 19) {
  const timeSamples = Math.floor(flat1D.length / numChannels);
  const WINDOW = 16;

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

const HeatmapView = forwardRef(function HeatmapView({ data }, ref) {
  const plotDiv = useRef(null);

  const spectrogramData = useMemo(() => {
    if (!data) return null;

    try {
      let raw = typeof data === 'string' ? JSON.parse(data) : data;

      if (Array.isArray(raw) && raw.length === 1 && Array.isArray(raw[0])) {
        raw = raw[0];
      }

      let flat1D;
      if (Array.isArray(raw[0])) {
        flat1D = raw.flat();
      } else {
        flat1D = raw;
      }

      if (!flat1D.length) throw new Error("Empty attribution array");
      return buildSpectrogramMatrix(flat1D, 19);
    } catch (err) {
      console.error("Heatmap pipeline error:", err);
      return false;
    }
  }, [data]);

  useImperativeHandle(ref, () => ({
    captureImage: async (opts = {}) => {
      const el = plotDiv.current;
      if (!el || !window.Plotly) return null;
      const { width = 800, height = 400, scale = 2 } = opts;
      const dataUrl = await window.Plotly.toImage(el, {
        format: 'png',
        width,
        height,
        scale,
      });
      return dataUrl;
    },
  }), []);

  useEffect(() => {
    const currentDiv = plotDiv.current;
    if (!spectrogramData || !window.Plotly || !currentDiv) return;

    try {
      const { matrix, timeSamples } = spectrogramData;
      const globalMax = Math.max(...matrix.map(r => Math.max(...r)));
      const zmax = globalMax * 0.65;

      const freqTickVals = [0, 6, 12, 19, 30, 45, 59];
      const freqTickText = ['0', '4', '8', '13', '20', '30', '40'];

      const shapes = BAND_DIVIDERS.map(b => ({
        type: 'line',
        x0: 0, x1: timeSamples,
        y0: (b.hzBoundary / MAX_FREQ_HZ) * FREQ_BINS,
        y1: (b.hzBoundary / MAX_FREQ_HZ) * FREQ_BINS,
        line: { color: 'rgba(255,255,255,0.1)', width: 1, dash: 'dot' }
      }));

      const annotations = BAND_DIVIDERS.map(b => ({
        x: timeSamples * 0.01,
        y: (b.hzBoundary / MAX_FREQ_HZ) * FREQ_BINS + 1,
        text: b.label,
        showarrow: false,
        font: { color: 'rgba(255,255,255,0.3)', size: 9, family: 'system-ui' },
        xanchor: 'left'
      }));

      const trace = {
        z: matrix,
        type: 'heatmap',
        colorscale: LUMINA_JET,
        zmin: 0,
        zmax,
        zsmooth: false,
        showscale: true,
        colorbar: {
          title: {
            text: 'Attribution',
            side: 'right',
            font: { color: '#9FB7D3', size: 11, family: 'system-ui' }
          },
          tickfont: { color: '#6A7E9C', size: 9 },
          thickness: 12,
          len: 0.85,
          tickvals: [0, zmax * 0.25, zmax * 0.5, zmax * 0.75, zmax],
          ticktext: ['0', '0.25', '0.5', '0.75', '1.0'],
        }
      };

      const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        autosize: true,
        margin: { t: 10, l: 60, r: 30, b: 45 },
        font: { family: 'system-ui' },
        xaxis: {
          showgrid: false,
          zeroline: false,
          showline: true,
          linecolor: 'rgba(120,170,255,0.12)',
          mirror: true,
          tickfont: { color: '#6A7E9C', size: 9 },
          tickvals: Array.from({ length: 7 }, (_, i) => Math.round(i * timeSamples / 6)),
          ticktext: Array.from({ length: 7 }, (_, i) => Math.round(i * 20)),
        },
        yaxis: {
          tickmode: 'array',
          tickvals: freqTickVals,
          ticktext: freqTickText,
          tickfont: { color: '#6A7E9C', size: 9 },
          showgrid: false,
          zeroline: false,
          showline: true,
          linecolor: 'rgba(120,170,255,0.12)',
          mirror: true,
        },
        shapes,
        annotations,
      };

      window.Plotly.newPlot(
        currentDiv,
        [trace],
        layout,
        { responsive: true, displayModeBar: false }
      );
    } catch (err) {
      console.error("Plotly render error:", err);
    }

    return () => {
      if (currentDiv && window.Plotly) window.Plotly.purge(currentDiv);
    };
  }, [spectrogramData]);

  if (spectrogramData === false) {
    return (
      <Card variant="elevated">
        <div
          style={{
            textAlign: 'center',
            padding: 40,
          }}
        >
          <p style={{ color: 'var(--error)', fontSize: 13 }}>
            Attention matrix build failed.
          </p>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card variant="elevated">
        <div
          style={{
            textAlign: 'center',
            padding: 40,
          }}
        >
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            No attention data available.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div
      ref={plotDiv}
      style={{
        width: '100%',
        height: 400,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    />
  );
});

export default HeatmapView;
