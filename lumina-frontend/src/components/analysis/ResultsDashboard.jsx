import { motion } from 'framer-motion';
import PredictionCard from './PredictionCard';
import ClinicalNote from './ClinicalNote';
import HeatmapView from './HeatmapView';
import SectionHeader from '../ui/SectionHeader';

export default function ResultsDashboard({ results, heatmapData }) {
  if (!results) return null;

  const metrics = results.mean_probabilities || [];
  const classNames = results.class_names || ['Healthy', 'Alzheimer', 'Epilepsy', 'MDD'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <SectionHeader title="Analysis Results" subtitle="AI-powered EEG diagnostic output" />

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
        <HeatmapView data={heatmapData} />
      </div>

      <div>
        <ClinicalNote note={results.explanation?.clinical_note || results.clinical_note} />
      </div>
    </motion.div>
  );
}
