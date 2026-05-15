import StatusBadge from '../ui/StatusBadge';

export default function Header({ title, status, patientName }) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 'var(--header-height)',
        padding: '0 32px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {patientName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-dim)',
              fontSize: 13,
              color: 'var(--accent)',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
            {patientName}
          </div>
        )}
        <StatusBadge status={status} pulsate={status === 'processing' || status === 'uploading'} />
      </div>
    </header>
  );
}
