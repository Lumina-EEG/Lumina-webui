import Card from '../ui/Card';

export default function PatientInfo({ patient, onChange }) {
  const handleChange = (field) => (e) => {
    onChange({ ...patient, [field]: e.target.value });
  };

  return (
    <Card variant="glass">
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          Patient Information
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Enter patient details before analysis
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        {[
          { key: 'name', label: 'Patient Name', type: 'text', placeholder: 'e.g. Jane Doe' },
          { key: 'id', label: 'Patient ID', type: 'text', placeholder: 'e.g. P-2026-001' },
          { key: 'age', label: 'Age', type: 'number', placeholder: 'e.g. 72' },
          { key: 'gender', label: 'Gender', type: 'text', placeholder: 'e.g. Female' },
        ].map((field) => (
          <div key={field.key}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 4,
                letterSpacing: '0.02em',
              }}
            >
              {field.label}
            </label>
            <input
              type={field.type}
              value={patient[field.key] || ''}
              onChange={handleChange(field.key)}
              placeholder={field.placeholder}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: 4,
            letterSpacing: '0.02em',
          }}
        >
          Notes
        </label>
        <textarea
          value={patient.notes || ''}
          onChange={handleChange('notes')}
          placeholder="Clinical notes, remarks..."
          rows={2}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
        />
      </div>
    </Card>
  );
}
