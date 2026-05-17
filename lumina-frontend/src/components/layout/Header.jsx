import { Menu } from "lucide-react";
import StatusBadge from "../ui/StatusBadge";

export default function Header({
  title,
  status,
  patientName,
  onNavigate,
  onToggle,
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "var(--header-height)",
        padding: "0 16px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={onToggle}
          className="mobile-menu-btn"
          style={{
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            padding: 4,
            borderRadius: "var(--radius-sm)",
          }}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <button
          onClick={() => onNavigate("welcome")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            color: "var(--text-primary)",
          }}
        >
          <img
            src="/lumina-logo-only.png"
            alt="Lumina"
            style={{
              height: 24,
              width: 24,
              borderRadius: 4,
              objectFit: "cover",
            }}
          />
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Lumina
          </span>
        </button>
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: 16,
            fontWeight: 300,
            display: "none",
          }}
          className="header-separator"
        >
          /
        </span>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--text-secondary)",
            letterSpacing: "-0.01em",
          }}
          className="header-title"
        >
          {title}
        </h1>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {patientName && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: "var(--radius-sm)",
              background: "var(--accent-dim)",
              fontSize: 13,
              color: "var(--accent)",
            }}
            className="header-patient"
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent)",
              }}
            />
            {patientName}
          </div>
        )}
        <StatusBadge
          status={status}
          pulsate={status === "processing" || status === "uploading"}
        />
      </div>
    </header>
  );
}
