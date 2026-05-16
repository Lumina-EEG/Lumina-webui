import { motion } from "framer-motion";
import {
  Radio, Monitor, Wifi, Database,
  Clock, Shield, ArrowRight, Cpu,
} from "lucide-react";
import Card from "../components/ui/Card";
import SectionHeader from "../components/ui/SectionHeader";

const deviceFeatures = [
  {
    icon: Wifi,
    title: "Real-Time EEG Streaming",
    desc: "Live data ingestion from networked EEG amplifiers with low-latency waveform rendering and AI inference.",
  },
  {
    icon: Database,
    title: "Hospital EMR Integration",
    desc: "Direct connectivity with Epic, Cerner, and Meditech for seamless EHR data exchange and report filing.",
  },
  {
    icon: Clock,
    title: "Live Patient Monitoring",
    desc: "Continuous bedside monitoring with configurable alert thresholds and trend visualization.",
  },
  {
    icon: Shield,
    title: "HIPAA-Compliant Pipeline",
    desc: "End-to-end encryption, audit logging, and role-based access for clinical deployment.",
  },
];

const mockDevices = [
  {
    name: "Natus NeuroWorks",
    type: "Standard EEG",
    status: "Integration Planned",
    protocol: "HL7 / DICOM",
  },
  {
    name: "Compumedics NeuroScan",
    type: "Research EEG",
    status: "Integration Planned",
    protocol: "EDF+ / custom API",
  },
  {
    name: "Bittium Neuromonitor",
    type: "ICU / Long-term",
    status: "Integration Planned",
    protocol: "Real-time API",
  },
  {
    name: "Mitsar EEG",
    type: "Clinical EEG",
    status: "Integration Planned",
    protocol: "EDF / XML",
  },
];

export default function MachineIntegration({ onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <span
          style={{
            padding: "2px 10px",
            borderRadius: 20,
            background: "var(--warning-dim)",
            border: "1px solid rgba(251,191,36,0.15)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--warning)",
            letterSpacing: "0.04em",
          }}
        >
          Coming Soon
        </span>
      </div>
      <SectionHeader
        title="Direct EEG Device Integration"
        subtitle="Connect your EEG hardware for live streaming and real-time AI analysis"
      />

      {/* STATUS BANNER */}
      <Card variant="glass" padding="lg" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-md)",
              background: "var(--accent-dim)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Radio size={22} color="var(--accent)" />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              Future-Ready Architecture
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              Lumina is designed for direct EEG device connectivity. This feature
              is under active development and will be available in a future
              update. The platform already supports the analysis pipeline —
              device streaming will extend it with real-time capabilities.
            </p>
          </div>
        </div>
      </Card>

      {/* FEATURE GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {deviceFeatures.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              style={{
                padding: 20,
                borderRadius: "var(--radius-lg)",
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent-dim)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Icon size={18} color="var(--accent)" />
              </div>
              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 4,
                }}
              >
                {feature.title}
              </h4>
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                {feature.desc}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* MOCK EEG DEVICES */}
      <SectionHeader
        title="Supported Devices (Planned)"
        subtitle="Compatibility roadmap for direct hardware integration"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {mockDevices.map((device, i) => (
          <motion.div
            key={device.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07 }}
            style={{
              padding: 20,
              borderRadius: "var(--radius-lg)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Monitor size={18} color="var(--text-secondary)" />
              </div>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "var(--warning-dim)",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--warning)",
                  letterSpacing: "0.02em",
                }}
              >
                {device.status}
              </span>
            </div>
            <h4
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 2,
              }}
            >
              {device.name}
            </h4>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 10,
              }}
            >
              {device.type}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
              }}
            >
              <Cpu size={12} color="var(--text-muted)" />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {device.protocol}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* DISABLED CONNECT BUTTON */}
      <Card variant="glass" padding="lg" style={{ textAlign: "center" }}>
        <div style={{ padding: "20px 0" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--bg-surface-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Radio size={22} color="var(--text-muted)" />
          </div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            Connect an EEG Device
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              maxWidth: 420,
              margin: "0 auto 20px",
              lineHeight: 1.7,
            }}
          >
            Direct device connectivity will be available in a future release.
            In the meantime, you can analyze EEG recordings by uploading EDF
            or NPY files.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 24px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "not-allowed",
                opacity: 0.5,
              }}
            >
              <Radio size={16} />
              Connect Device
            </span>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate("upload")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 24px",
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, var(--accent), #2563EB)",
                border: "none",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Upload EEG File Instead
              <ArrowRight size={16} />
            </motion.button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
