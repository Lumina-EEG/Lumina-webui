import { jsPDF } from "jspdf";

const ACCENT = [59, 164, 255];
const DARK = [16, 26, 46];
const BODY = [50, 60, 80];
const MUTED = [110, 125, 150];
const LIGHT = [240, 244, 252];
const WHITE = [255, 255, 255];
const BAR_TRACK = [225, 230, 240];

const DIAGNOSIS_COLORS = {
  Healthy: [52, 211, 153],
  Alzheimer: [251, 191, 36],
  "Alzheimer's": [251, 191, 36],
  Epilepsy: [239, 68, 68],
  MDD: [59, 164, 255],
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL("image/jpeg", 0.95));
    };
    img.onerror = reject;
    img.src = src;
  });
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getReportId() {
  return `LMR-${Date.now().toString(36).toUpperCase()}`;
}

function wrapText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line) => {
    if (y + lineHeight > 290) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

export async function generateClinicalReport({
  patient,
  results,
  waveformImage,
  heatmapImage,
  clinicalNote,
}) {
  const doc = new jsPDF("portrait", "mm", "a4");
  const PW = 210;
  const M = 20;
  const CW = PW - 2 * M;
  let y = M;

  let logoData;
  try {
    logoData = await loadImage("/lumina-logo-nobg.png");
  } catch {
    logoData = null;
  }

  doc.setFillColor(...DARK);
  doc.rect(0, 0, PW, 14, "F");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text("LUMINA EEG — CLINICAL DIAGNOSTIC REPORT", M, 9);

  doc.setFillColor(...ACCENT);
  doc.rect(0, 14, PW, 1.2, "F");

  y = 26;

  if (logoData) {
    try {
      doc.addImage(logoData, "JPEG", M, y - 4, 12, 12);
    } catch {
      /* skip */
    }
  }

  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  doc.setFont(undefined, "bold");
  doc.text("Clinical EEG Report", M + 16, y + 2);
  doc.setFont(undefined, "normal");

  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Report ID: ${getReportId()}`, M, y + 10);
  doc.text(`Generated: ${formatDate()}`, M + 70, y + 10);

  y += 20;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.4);
  doc.line(M, y, PW - M, y);
  y += 8;

  doc.setFillColor(...LIGHT);
  doc.roundedRect(M, y, CW, 30, 2, 2, "F");

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.setFont(undefined, "bold");
  doc.text("PATIENT INFORMATION", M + 4, y + 6);

  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.setFont(undefined, "normal");

  const pInfo = [
    ["Name", patient?.name || "—"],
    ["ID", patient?.id || "—"],
    ["Age", patient?.age || "—"],
    ["Gender", patient?.gender || "—"],
  ];
  pInfo.forEach(([label, val], i) => {
    const col = i < 2 ? M + 4 : M + CW / 2 + 4;
    const row = i % 2;
    const py = y + 13 + row * 9;
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(label, col, py);
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(String(val), col + 22, py);
  });

  y += 36;

  if (patient?.notes) {
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setFont(undefined, "bold");
    doc.text("CLINICAL NOTES", M, y);
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BODY);
    y = wrapText(doc, patient.notes, M, y + 5, CW, 4.5) + 4;
  }

  y += 2;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.2);
  doc.line(M, y, PW - M, y);
  y += 8;

  const prediction = results?.session_prediction || "Unknown";
  const confidence =
    results?.session_confidence != null ? results.session_confidence : 0;
  const meanProbs = results?.mean_probabilities || [];
  const classNames = results?.class_names || [
    "Healthy",
    "Alzheimer",
    "Epilepsy",
    "MDD",
  ];
  const dColor = DIAGNOSIS_COLORS[prediction] || ACCENT;

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.setFont(undefined, "bold");
  doc.text("PRIMARY DIAGNOSIS", M, y);

  y += 8;
  doc.setFontSize(22);
  doc.setTextColor(...dColor);
  doc.setFont(undefined, "bold");
  doc.text(prediction, M, y);

  y += 10;
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.setFont(undefined, "normal");
  doc.text(`AI Confidence: ${(confidence * 100).toFixed(1)}%`, M, y);

  y += 4;

  const barX = M;
  const barW = CW;
  const barH = 3;
  const labelW = 28;

  doc.setFillColor(...ACCENT);
  doc.roundedRect(
    barX,
    y,
    Math.min(confidence, 1) * barW - 20,
    barH,
    1.5,
    1.5,
    "F",
  );

  const confPct = (confidence * 100).toFixed(1);
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${confPct}%`, barX + Math.min(confidence, 1) * barW - 16, y + 2.5);

  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.setFont(undefined, "bold");
  doc.text("CLASS PROBABILITY DISTRIBUTION", M, y);
  y += 7;

  const probBarMaxW = CW - labelW - 18;

  classNames.forEach((name, i) => {
    const prob = meanProbs[i] != null ? meanProbs[i] : 0;
    const isTop = name === prediction;
    const color = DIAGNOSIS_COLORS[name] || ACCENT;

    if (y + 10 > 285) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(9);
    doc.setTextColor(...(isTop ? DARK : MUTED));
    doc.setFont(undefined, isTop ? "bold" : "normal");
    doc.text(name, barX, y + 3);

    const pctStr = `${(prob * 100).toFixed(1)}%`;
    const fillW = prob * probBarMaxW;

    doc.setFillColor(...BAR_TRACK);
    doc.roundedRect(barX + labelW, y, probBarMaxW, 4, 1.5, 1.5, "F");

    if (fillW > 1) {
      doc.setFillColor(...color);
      doc.roundedRect(barX + labelW, y, Math.max(fillW, 4), 4, 1.5, 1.5, "F");
    }

    doc.setFontSize(8);
    doc.setTextColor(...(isTop ? color : MUTED));
    doc.setFont(undefined, isTop ? "bold" : "normal");
    doc.text(pctStr, barX + labelW + probBarMaxW + 3, y + 3);

    y += 8;
  });

  y += 6;

  const aggregationMode = results?.aggregation_mode;
  if (aggregationMode) {
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.setFont(undefined, "italic");
    const modeLabel =
      aggregationMode === "peak"
        ? "Peak detection (episodic)"
        : "Mean probability (diffuse)";
    doc.text(`Aggregation: ${modeLabel}`, M, y);
    y += 5;
  }

  if (waveformImage) {
    y += 4;
    if (y + 50 > 275) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.2);
    doc.line(M, y, PW - M, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.setFont(undefined, "bold");
    doc.text("EEG WAVEFORM PREVIEW", M, y);
    y += 3;
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont(undefined, "normal");
    doc.text("Multichannel EEG signal (10-second preview)", M, y);
    y += 5;

    const imgW = CW;
    const imgH = Math.min(imgW * 0.45, 80);
    try {
      doc.addImage(waveformImage, "PNG", M, y, imgW, imgH);
      y += imgH + 4;
    } catch {
      /* skip */
    }
  }

  if (heatmapImage) {
    y += 4;
    if (y + 50 > 275) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.2);
    doc.line(M, y, PW - M, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.setFont(undefined, "bold");
    doc.text("MODEL ATTENTION HEATMAP", M, y);
    y += 3;
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont(undefined, "normal");
    doc.text(
      "Spatial attribution from Captum Integrated Gradients — highlights regions driving the AI decision.",
      M,
      y,
    );
    y += 5;

    const imgW = CW;
    const imgH = Math.min(imgW * 0.5, 70);
    try {
      doc.addImage(heatmapImage, "PNG", M, y, imgW, imgH);
      y += imgH + 4;
    } catch {
      /* skip */
    }
  }

  if (clinicalNote) {
    y += 4;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.2);
    doc.line(M, y, PW - M, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.setFont(undefined, "bold");
    doc.text("CLINICAL INTERPRETATION", M, y);
    y += 4;

    const lines = clinicalNote.split("\n");
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) {
        y += 2;
        continue;
      }

      if (line.startsWith("#")) {
        doc.setFontSize(11);
        doc.setTextColor(...DARK);
        doc.setFont(undefined, "bold");
        line = line.replace(/^#+\s*/, "");
        y += 3;
        if (y + 8 > 290) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, M, y);
        y += 7;
        continue;
      }

      if (line.startsWith("- ") || line.startsWith("* ")) {
        doc.setFontSize(9);
        doc.setTextColor(...BODY);
        doc.setFont(undefined, "normal");
        const text = line.substring(2);
        y = wrapText(doc, `  • ${text}`, M, y, CW - 4, 4.5);
        y += 1;
        continue;
      }

      doc.setFontSize(9);
      doc.setTextColor(...BODY);
      doc.setFont(undefined, "normal");
      const cleaned = line.replace(/\*\*(.*?)\*\*/g, "$1");
      y = wrapText(doc, cleaned, M, y, CW, 4.5);
      y += 1.5;
    }

    y += 6;
  }

  y = Math.max(y, 260);

  doc.setDrawColor(200, 208, 220);
  doc.setLineWidth(0.2);
  doc.line(M, y, PW - M, y);
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.setFont(undefined, "normal");
  doc.text(
    `Report generated by Lumina AI · ${formatDate()} · This report is for clinical reference and should be reviewed by a qualified healthcare professional.`,
    M,
    y + 4,
  );

  return doc;
}
