import { useEffect, useRef, useCallback, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import Card from "../ui/Card";
import { buildEegTraces, buildEegLayout } from "../../utils/eeg";

export default function EEGViewer({ signal, channels, sampleRate }) {
  const plotRef = useRef(null);
  const containerRef = useRef(null);
  const [gain, setGain] = useState(1.5);

  const renderPlot = useCallback(() => {
    if (!signal || !channels || !sampleRate || !plotRef.current) return;
    if (!window.Plotly) return;

    const duration = signal[0].length / sampleRate;
    const traces = buildEegTraces(signal, channels, sampleRate, gain);
    const layout = buildEegLayout(channels, duration);
    const config = {
      responsive: true,
      displayModeBar: false,
      scrollZoom: true,
    };

    window.Plotly.newPlot(plotRef.current, traces, layout, config);
  }, [signal, channels, sampleRate, gain]);

  useEffect(() => {
    renderPlot();
  }, [renderPlot]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (plotRef.current && window.Plotly) {
        window.Plotly.Plots.resize(plotRef.current);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = plotRef.current;
    return () => {
      if (el && window.Plotly) {
        window.Plotly.purge(el);
      }
    };
  }, []);

  const zoomIn = useCallback(() => {
    if (!plotRef.current || !window.Plotly) return;
    const factor = 0.6;
    const el = plotRef.current;
    const existingRange = el.layout?.xaxis?.range;
    if (existingRange) {
      const center = (existingRange[0] + existingRange[1]) / 2;
      const halfSpan = ((existingRange[1] - existingRange[0]) * factor) / 2;
      window.Plotly.relayout(el, {
        "xaxis.range[0]": center - halfSpan,
        "xaxis.range[1]": center + halfSpan,
      });
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (!plotRef.current || !window.Plotly) return;
    const factor = 1.5;
    const el = plotRef.current;
    const existingRange = el.layout?.xaxis?.range;
    if (existingRange) {
      const center = (existingRange[0] + existingRange[1]) / 2;
      const halfSpan = ((existingRange[1] - existingRange[0]) * factor) / 2;
      window.Plotly.relayout(el, {
        "xaxis.range[0]": center - halfSpan,
        "xaxis.range[1]": center + halfSpan,
      });
    }
  }, []);

  const resetZoom = useCallback(() => {
    if (!plotRef.current || !window.Plotly) return;
    window.Plotly.relayout(plotRef.current, {
      "xaxis.autorange": true,
      "yaxis.autorange": true,
    });
  }, []);

  const adjustGain = useCallback((delta) => {
    setGain((g) => Math.max(0.25, Math.min(5, g + delta)));
  }, []);

  if (!signal || !channels) {
    return (
      <Card variant="elevated">
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            No EEG waveform data available.
          </p>
        </div>
      </Card>
    );
  }

  const height = Math.max(250, channels.length * 28);

  const btnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "6px 10px",
    borderRadius: 4,
    background: "var(--bg-surface-secondary)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 12,
    lineHeight: 1.2,
    fontFamily: "system-ui",
    transition: "color 0.15s, border-color 0.15s",
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Raw EEG Waveforms
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 2, alignItems: "center", marginRight: 4 }}>
            <button onClick={zoomIn} style={btnStyle} title="Zoom in">
              <ZoomIn size={14} />
            </button>
            <button onClick={zoomOut} style={btnStyle} title="Zoom out">
              <ZoomOut size={14} />
            </button>
            <button onClick={resetZoom} style={btnStyle} title="Reset view">
              <RotateCcw size={14} />
            </button>
          </div>

          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>|</span>

          <button onClick={() => adjustGain(-0.25)} style={btnStyle} title="Reduce amplitude">
            &minus;
          </button>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              minWidth: 40,
              textAlign: "center",
            }}
          >
            {gain.toFixed(2)}x
          </span>
          <button onClick={() => adjustGain(0.25)} style={btnStyle} title="Increase amplitude">
            +
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height,
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          border: "1px solid rgba(120,170,255,0.08)",
        }}
      >
        <div ref={plotRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
