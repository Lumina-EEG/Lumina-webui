export function SkeletonLine({ width = '100%', height = 14, mb = 8 }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 'var(--radius-sm)',
        marginBottom: mb,
        background: 'linear-gradient(90deg, var(--bg-surface-secondary) 25%, var(--bg-surface) 50%, var(--bg-surface-secondary) 75%)',
        backgroundSize: '200px 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
}

export function SkeletonCard({ lines = 3, height = 160 }) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={i === 0 ? '60%' : i === lines - 1 ? '40%' : '80%'}
          height={i === 0 ? 18 : 12}
          mb={i < lines - 1 ? 10 : 0}
        />
      ))}
    </div>
  );
}

export function SkeletonHeatmap() {
  return (
    <div
      style={{
        width: '100%',
        height: 400,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 120,
          height: 12,
          borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(90deg, var(--bg-surface-secondary) 25%, var(--bg-surface) 50%, var(--bg-surface-secondary) 75%)',
          backgroundSize: '200px 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          width: '80%',
          height: 300,
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(90deg, var(--bg-surface-secondary) 25%, var(--bg-surface) 50%, var(--bg-surface-secondary) 75%)',
          backgroundSize: '200px 100%',
          animation: 'shimmer 1.5s ease-in-out infinite 0.3s',
        }}
      />
    </div>
  );
}

export function SkeletonText({ width = '100%', height = 60 }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 'var(--radius-sm)',
        background: 'linear-gradient(90deg, var(--bg-surface-secondary) 25%, var(--bg-surface) 50%, var(--bg-surface-secondary) 75%)',
        backgroundSize: '200px 100%',
        animation: 'shimmer 1.5s ease-in-out infinite 0.15s',
      }}
    />
  );
}
