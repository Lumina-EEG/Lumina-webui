import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RefreshCw, Info, FileText } from "lucide-react";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import UploadZone from "./components/upload/UploadZone";
import PatientInfo from "./components/analysis/PatientInfo";
import ResultsDashboard from "./components/analysis/ResultsDashboard";
import Card from "./components/ui/Card";
import SectionHeader from "./components/ui/SectionHeader";
import {
  SkeletonCard,
  SkeletonHeatmap,
  SkeletonText,
} from "./components/ui/LoadingSkeleton";
import useAnalysis from "./hooks/useAnalysis";
import useLocalStorage from "./hooks/useLocalStorage";
import { getWithExpiry, setWithExpiry } from "./utils/storage";
import WelcomePage from "./pages/WelcomePage";
import DeviceIntegration from "./pages/MachineIntegration";
import "./App.css";

const defaultPatient = {
  name: "",
  id: "",
  age: "",
  gender: "",
  notes: "",
};

function UploadPage({
  file,
  onFileSelect,
  onClear,
  patient,
  onPatientChange,
  onRun,
  status,
}) {
  const isBusy = status === "uploading" || status === "processing";

  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <SectionHeader
        title="Upload EEG Data"
        subtitle="Upload an EDF or NPY file for AI-powered analysis"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <PatientInfo patient={patient} onChange={onPatientChange} />
        <UploadZone
          file={file}
          onFileSelect={onFileSelect}
          onClear={onClear}
          disabled={isBusy}
        />

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--accent-dim)",
            border: "1px solid rgba(59,164,255,0.1)",
          }}
        >
          <Info size={15} style={{ color: "var(--accent)", marginTop: 1, flexShrink: 0 }} />
          <p
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            EEG should be recorded in a resting state. Recommended recording duration should not exceed 20 minutes.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          {status === "processing" || status === "uploading" ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                borderRadius: "var(--radius-md)",
                background: "var(--info-dim)",
                border: "1px solid rgba(59,164,255,0.15)",
                color: "var(--accent)",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <RefreshCw size={16} className="spin-animation" />
              {status === "uploading" ? "Uploading..." : "Analyzing EEG..."}
            </div>
          ) : (
            <motion.button
              whileHover={file ? { scale: 1.02 } : {}}
              whileTap={file ? { scale: 0.98 } : {}}
              onClick={onRun}
              disabled={!file}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                borderRadius: "var(--radius-md)",
                background: file
                  ? "linear-gradient(135deg, var(--accent), #2563EB)"
                  : "var(--bg-surface-secondary)",
                border: "none",
                color: file ? "#fff" : "var(--text-muted)",
                cursor: file ? "pointer" : "not-allowed",
                fontSize: 14,
                fontWeight: 600,
                transition: "opacity 0.2s",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {file && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  }}
                />
              )}
              <Play size={16} fill={file ? "currentColor" : "none"} />
              Run Analysis
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DashboardPage({
  results,
  status,
  errorMsg,
  heatmapData,
  onNavigate,
  patient,
}) {
  if (status === "complete" && results) {
    return (
      <ResultsDashboard
        results={results}
        heatmapData={heatmapData}
        patient={patient}
      />
    );
  }

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <SectionHeader
        title="Dashboard"
        subtitle="Welcome to Lumina EEG Analysis Platform"
      />

      {status === "idle" && (
        <Card
          variant="glass"
          style={{ textAlign: "center", padding: "60px 20px" }}
        >
          <img
            src="/lumina-logo-only.png"
            alt="Lumina"
            style={{
              height: 48,
              width: 48,
              borderRadius: 12,
              marginBottom: 16,
              opacity: 0.7,
            }}
          />
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            Ready for Analysis
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              maxWidth: 400,
              margin: "0 auto 24px",
              lineHeight: 1.6,
            }}
          >
            Upload an EEG recording to begin AI-powered diagnostics. Lumina
            analyzes brain activity patterns with high precision.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate("upload")}
            style={{
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
            Go to Upload
          </motion.button>
        </Card>
      )}

      {status === "uploading" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SkeletonCard lines={2} height={100} />
          <SkeletonCard lines={1} height={80} />
        </div>
      )}

      {status === "processing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
          >
            <SkeletonCard lines={3} height={200} />
            <SkeletonCard lines={4} height={200} />
          </div>
          <SkeletonHeatmap />
          <SkeletonText height={80} />
        </div>
      )}

      {status === "error" && (
        <Card
          variant="glass"
          style={{ border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p
              style={{
                color: "var(--error)",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Analysis Error
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              {errorMsg}
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate("upload")}
              style={{
                marginTop: 16,
                padding: "8px 20px",
                borderRadius: "var(--radius-sm)",
                background: "var(--accent-dim)",
                border: "1px solid rgba(59,164,255,0.2)",
                color: "var(--accent)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Try Again
            </motion.button>
          </div>
        </Card>
      )}
    </motion.div>
  );
}

function ReportsPage({ history, onNavigate }) {
  if (!history || history.length === 0) {
    return (
      <motion.div
        key="reports"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
      >
        <SectionHeader
          title="Reports"
          subtitle="Past analysis reports and history"
        />
        <Card
          variant="glass"
          style={{ textAlign: "center", padding: "60px 20px" }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--accent-dim)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <FileText size={22} color="var(--accent)" />
          </div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            No Reports Yet
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>
            Analysis history will appear here after running your first session.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate("upload")}
            style={{
              marginTop: 20,
              padding: "10px 24px",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--accent), #2563EB)",
              border: "none",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Run First Analysis
          </motion.button>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="reports"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <SectionHeader
        title="Reports"
        subtitle="Past analysis reports and history"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {history.map((entry) => {
          const pred = entry.results?.session_prediction || "N/A";
          return (
            <Card key={entry.id} variant="glass" padding="md">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: 2,
                    }}
                  >
                    {entry.patientName || "Unnamed Patient"}
                  </h3>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginBottom: 10,
                    }}
                  >
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--accent-dim)",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--accent)",
                      }}
                    >
                      {pred}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-surface-secondary)",
                        fontSize: 11,
                        color: "var(--text-muted)",
                      }}
                    >
                      {entry.fileName}
                    </span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onNavigate("analysis")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--accent-dim)",
                    border: "1px solid rgba(59,164,255,0.2)",
                    color: "var(--accent)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  View Report
                </motion.button>
              </div>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}

function SettingsPage() {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <SectionHeader title="Settings" subtitle="Application configuration" />
      <Card
        variant="glass"
        style={{ textAlign: "center", padding: "60px 20px" }}
      >
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Configuration options coming soon.
        </p>
      </Card>
    </motion.div>
  );
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('sidebar_collapsed', false);
  const [activePage, setActivePage] = useState(() => {
    const seen = getWithExpiry('welcome_seen');
    const saved = getWithExpiry('active_page');
    if (saved && saved !== 'welcome') return saved;
    if (seen) return 'dashboard';
    return 'welcome';
  });
  const [patient, setPatient] = useLocalStorage('patient_info', defaultPatient);

  const {
    file,
    setFile,
    status,
    results,
    errorMsg,
    history,
    runAnalysis,
    reset,
    getHeatmapData,
  } = useAnalysis();

  const handleRun = useCallback(() => {
    runAnalysis(null, {
      patientName: patient.name,
      patientGender: patient.gender,
      patientAge: patient.age,
    });
    setActivePage("dashboard");
    setWithExpiry('active_page', 'dashboard');
    setWithExpiry('welcome_seen', true);
  }, [runAnalysis, patient]);

  const handleFileSelect = useCallback(
    (f) => {
      setFile(f);
      setActivePage("upload");
      setWithExpiry('active_page', 'upload');
      setWithExpiry('welcome_seen', true);
    },
    [setFile],
  );

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  const handleNavigate = useCallback((page) => {
    setActivePage(page);
    if (page !== 'welcome') {
      setWithExpiry('active_page', page);
      setWithExpiry('welcome_seen', true);
    }
  }, []);

  const heatmapData = getHeatmapData();

  const renderPage = () => {
    switch (activePage) {
      case "upload":
        return (
          <UploadPage
            file={file}
            onFileSelect={handleFileSelect}
            onClear={handleClear}
            patient={patient}
            onPatientChange={setPatient}
            onRun={handleRun}
            status={status}
          />
        );
      case "analysis":
        if (status === "complete" && results) {
          return (
            <ResultsDashboard
              results={results}
              heatmapData={heatmapData}
              patient={patient}
            />
          );
        }
        return (
          <DashboardPage
            results={results}
            status={status}
            errorMsg={errorMsg}
            heatmapData={heatmapData}
            onNavigate={handleNavigate}
            patient={patient}
          />
        );
      case "reports":
        return <ReportsPage history={history} onNavigate={handleNavigate} />;
      case "settings":
        return <SettingsPage />;
      case "device":
        return <DeviceIntegration onNavigate={handleNavigate} />;
      case "dashboard":
      default:
        return (
          <DashboardPage
            results={results}
            status={status}
            errorMsg={errorMsg}
            heatmapData={heatmapData}
            onNavigate={handleNavigate}
            patient={patient}
          />
        );
    }
  };

  const pageTitles = {
    dashboard: "Dashboard",
    upload: "Upload EEG",
    analysis: "Analysis",
    reports: "Reports",
    settings: "Settings",
    device: "Device Integration",
  };

  if (activePage === "welcome") {
    return <WelcomePage onNavigate={handleNavigate} />;
  }

  return (
    <div className="app-root">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <div
        className={`main-area ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      >
        <Header
          onNavigate={handleNavigate}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          title={pageTitles[activePage] || "Lumina"}
          status={status}
          patientName={patient.name || null}
        />

        <main className="content-area">
          <AnimatePresence mode="wait">{renderPage()}</AnimatePresence>
        </main>
      </div>
    </div>
  );
}
