import { motion } from 'framer-motion';

export default function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'lg',
  glow = false,
  ...props
}) {
  const variants = {
    default: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
    },
    glass: {
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      backdropFilter: 'blur(12px)',
    },
    elevated: {
      background: 'var(--bg-surface-secondary)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-md)',
    },
  };

  const paddings = {
    none: { padding: 0 },
    sm: { padding: '12px' },
    md: { padding: '16px' },
    lg: { padding: '24px' },
    xl: { padding: '32px' },
  };

  const v = variants[variant] || variants.default;
  const p = paddings[padding] || paddings.lg;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`card ${className}`}
      style={{
        borderRadius: 'var(--radius-lg)',
        ...v,
        ...p,
        ...(glow ? { boxShadow: 'var(--shadow-glow)' } : {}),
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
