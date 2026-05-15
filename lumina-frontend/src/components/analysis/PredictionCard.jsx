import { motion } from 'framer-motion';
import { Brain, AlertTriangle, Activity, Stethoscope } from 'lucide-react';
import Card from '../ui/Card';

const diagnosisIcons = {
  Healthy: Brain,
  Alzheimer: Brain,
  "Alzheimer's": Brain,
  Epilepsy: Activity,
  MDD: Stethoscope,
};

const diagnosisColors = {
  Healthy: { bg: 'var(--success-dim)', color: 'var(--success)', border: 'rgba(52, 211, 153, 0.2)' },
  Alzheimer: { bg: 'var(--warning-dim)', color: 'var(--warning)', border: 'rgba(251, 191, 36, 0.2)' },
  "Alzheimer's": { bg: 'var(--warning-dim)', color: 'var(--warning)', border: 'rgba(251, 191, 36, 0.2)' },
  Epilepsy: { bg: 'var(--error-dim)', color: 'var(--error)', border: 'rgba(239, 68, 68, 0.2)' },
  MDD: { bg: 'var(--info-dim)', color: 'var(--info)', border: 'rgba(59, 164, 255, 0.2)' },
};

export default function PredictionCard({ prediction, confidence }) {
  const label = prediction || 'No Result';
  const score = confidence != null ? (confidence * 100).toFixed(1) : '--';
  const colors = diagnosisColors[prediction] || { bg: 'var(--accent-dim)', color: 'var(--accent)', border: 'rgba(59,164,255,0.2)' };
  const Icon = diagnosisIcons[prediction] || AlertTriangle;

  const getConfidenceColor = () => {
    if (confidence == null) return 'var(--text-muted)';
    if (confidence >= 0.85) return 'var(--success)';
    if (confidence >= 0.65) return 'var(--warning)';
    return 'var(--error)';
  };

  return (
    <Card variant="glass" glow>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={22} color={colors.color} />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Primary Diagnosis
        </p>
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: colors.color,
            letterSpacing: '-0.02em',
          }}
        >
          {label}
        </motion.p>
      </div>

      <div
        style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-primary)',
          border: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            AI Confidence
          </span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: getConfidenceColor(),
            }}
          >
            {score}%
          </motion.span>
        </div>
        <div
          style={{
            width: '100%',
            height: 4,
            borderRadius: 2,
            background: 'var(--bg-surface)',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(score, 100)}%` }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: 2,
              background: `linear-gradient(90deg, ${getConfidenceColor()}, var(--accent))`,
            }}
          />
        </div>
      </div>
    </Card>
  );
}
