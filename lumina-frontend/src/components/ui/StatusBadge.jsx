import { motion } from 'framer-motion';

const statusConfig = {
  idle: { label: 'Ready', color: 'var(--text-muted)', bg: 'transparent', dot: 'var(--text-muted)' },
  uploading: { label: 'Uploading', color: 'var(--accent)', bg: 'var(--info-dim)', dot: 'var(--accent)' },
  processing: { label: 'Analyzing', color: 'var(--warning)', bg: 'var(--warning-dim)', dot: 'var(--warning)' },
  complete: { label: 'Complete', color: 'var(--success)', bg: 'var(--success-dim)', dot: 'var(--success)' },
  error: { label: 'Error', color: 'var(--error)', bg: 'var(--error-dim)', dot: 'var(--error)' },
};

export default function StatusBadge({ status = 'idle', pulsate = false }) {
  const cfg = statusConfig[status] || statusConfig.idle;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}20`,
      }}
    >
      <motion.span
        animate={pulsate ? { opacity: [1, 0.3, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.dot,
          boxShadow: `0 0 6px ${cfg.dot}`,
        }}
      />
      {cfg.label}
    </span>
  );
}
