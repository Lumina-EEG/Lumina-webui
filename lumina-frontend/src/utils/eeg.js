const CHANNEL_COLORS = [
  '#4FC3F7', '#81C784', '#FFB74D', '#CE93D8',
  '#E57373', '#4DD0E1', '#AED581', '#FF8A65',
  '#7986CB', '#4DB6AC', '#F06292', '#FFD54F',
  '#90A4AE', '#64B5F6', '#BA68C8', '#A1887F',
  '#80DEEA', '#C5E1A5', '#FFAB91',
];

export function buildEegTraces(signal, channels, sampleRate, gain) {
  const nSamples = signal[0].length;
  const spacing = 4;
  const time = Array.from({ length: nSamples }, (_, i) => i / sampleRate);

  let globalMax = 0;
  const dcCorrected = signal.map((ch) => {
    const mean = ch.reduce((a, b) => a + b, 0) / ch.length;
    return ch.map((v) => {
      const dc = v - mean;
      if (Math.abs(dc) > globalMax) globalMax = Math.abs(dc);
      return dc;
    });
  });

  const scale = globalMax > 0 ? 1 / globalMax : 1;

  return channels.map((name, ch) => ({
    x: time,
    y: dcCorrected[ch].map((v) => v * scale * gain + ch * spacing),
    type: "scattergl",
    mode: "lines",
    name,
    line: { width: 0.6, color: CHANNEL_COLORS[ch % CHANNEL_COLORS.length] },
    hoverinfo: "skip",
    showlegend: false,
  }));
}

export function buildEegLayout(channels, duration) {
  const spacing = 4;
  const tickvals = channels.map((_, i) => i * spacing);

  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(10,22,40,1)",
    autosize: true,
    margin: { t: 5, l: 52, r: 8, b: 30 },
    font: { family: "system-ui" },
    dragmode: "zoom",
    hovermode: false,

    xaxis: {
      title: {
        text: "Time (s)",
        font: { color: "#6A7E9C", size: 10 },
      },
      showgrid: true,
      gridcolor: "rgba(255,255,255,0.04)",
      gridwidth: 0.5,
      zeroline: false,
      showline: true,
      linecolor: "rgba(120,170,255,0.1)",
      mirror: true,
      tickfont: { color: "#6A7E9C", size: 9 },
      tickcolor: "rgba(120,170,255,0.1)",
      range: [0, duration],
    },

    yaxis: {
      tickmode: "array",
      tickvals,
      ticktext: channels,
      tickfont: { color: "#9FB7D3", size: 9 },
      showgrid: true,
      gridcolor: "rgba(255,255,255,0.04)",
      gridwidth: 0.5,
      zeroline: false,
      showline: false,
      fixedrange: false,
      ticklen: 2,
      tickcolor: "rgba(120,170,255,0.15)",
      side: "left",
    },

    shapes: Array.from({ length: channels.length - 1 }, (_, i) => ({
      type: "line",
      x0: 0,
      x1: duration,
      y0: (i + 1) * spacing,
      y1: (i + 1) * spacing,
      line: { color: "rgba(255,255,255,0.03)", width: 0.5 },
    })),
  };
}
