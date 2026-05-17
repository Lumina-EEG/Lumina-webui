import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Loader2 } from 'lucide-react';
import PredictionCard from './PredictionCard';
import ClinicalNote from './ClinicalNote';
import HeatmapView from './HeatmapView';
import SectionHeader from '../ui/SectionHeader';
import EEGViewer from '../eeg/EEGViewer';
import { generateClinicalReport } from '../../utils/ReportGenerator';

export default function ResultsDashboard({ results, heatmapData, patient }) {
  const [generating, setGenerating] = useState(false);
  const eegRef = useRef(null);
  const heatRef = useRef(null);

  const handleDownloadReport = useCallback(async () => {
    if (!results) return;
    setGenerating(true);
    try {
      let waveformImage = null;
      let heatmapImage = null;

      if (eegRef.current) {
        try {
          waveformImage = await eegRef.current.captureImage({
            width: 1600,
            height: 700,
            scale: 2,
          });
        } catch { /* waveform capture failed */ }
      }

      if (heatRef.current && heatmapData) {
        try {
          heatmapImage = await heatRef.current.captureImage({
            width: 800,
            height: 400,
            scale: 2,
          });
        } catch { /* heatmap capture failed */ }
      }

      const doc = await generateClinicalReport({
        patient,
        results,
        waveformImage,
        heatmapImage,
        clinicalNote: results.explanation?.clinical_note || results.clinical_note,
      });

      doc.save(`lumina-eeg-report-${Date.now()}.pdf`);
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setGenerating(false);
    }
  }, [patient, results, heatmapData]);

  if (!results) return null;

  const metrics = results.mean_probabilities || [];
  const classNames = results.class_names || ['Healthy', 'Alzheimer', 'Epilepsy', 'MDD'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {generating && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(2, 11, 28, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <Loader2 size={36} className="spin-animation" style={{ color: 'var(--accent)' }} />
          <span style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600 }}>
            Generating Report...
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Building your clinical PDF with visual analytics
          </span>
        </div>
      )}

      {results.waveforms && (
        <>
          <SectionHeader
            title="EEG Waveform Preview"
            subtitle="Raw multichannel EEG signal"
          />
          <EEGViewer
            ref={eegRef}
            signal={results.waveforms.signal}
            channels={results.waveforms.channels}
            sampleRate={results.waveforms.sample_rate}
          />
        </>
      )}

      <SectionHeader
        title="Analysis Results"
        subtitle="AI-powered EEG diagnostic output"
        action={
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDownloadReport}
            disabled={generating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
              background: generating ? 'var(--bg-surface-secondary)' : 'var(--accent-dim)',
              border: `1px solid ${generating ? 'var(--border)' : 'rgba(59,164,255,0.2)'}`,
              color: generating ? 'var(--text-muted)' : 'var(--accent)',
              cursor: generating ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            {generating ? (
              <Loader2 size={14} className="spin-animation" />
            ) : (
              <Download size={14} />
            )}
            {generating ? 'Generating...' : 'Download PDF Report'}
          </motion.button>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) 1fr',
          gap: 20,
          marginBottom: 20,
        }}
        className="results-grid"
      >
        <PredictionCard
          prediction={results.session_prediction}
          confidence={results.session_confidence}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {metrics.length > 0 && classNames.map((name, i) => {
            const prob = metrics[i] != null ? (metrics[i] * 100).toFixed(1) : 0;
            const isTop = results.session_prediction === name;
            return (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: isTop ? 'var(--accent-dim)' : 'var(--bg-primary)',
                  border: `1px solid ${isTop ? 'rgba(59,164,255,0.2)' : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isTop ? 600 : 400,
                    color: isTop ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 80,
                      height: 4,
                      borderRadius: 2,
                      background: 'var(--bg-surface)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(prob, 100)}%`,
                        height: '100%',
                        borderRadius: 2,
                        background: isTop
                          ? 'linear-gradient(90deg, var(--accent), var(--success))'
                          : 'var(--bg-surface-secondary)',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isTop ? 'var(--accent)' : 'var(--text-muted)',
                      minWidth: 40,
                      textAlign: 'right',
                    }}
                  >
                    {prob}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <SectionHeader
          title="Model Attention Heatmap"
          subtitle="Spatial attribution from Captum Integrated Gradients (not a power spectrogram)"
        />
        <HeatmapView ref={heatRef} data={heatmapData} />
      </div>

      <div>
        <ClinicalNote
          note={results.explanation?.clinical_note || results.clinical_note}
          onDownloadPDF={handleDownloadReport}
          generating={generating}
        />
      </div>
    </motion.div>
  );
}
