import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RefreshCw } from 'lucide-react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import UploadZone from './components/upload/UploadZone';
import PatientInfo from './components/analysis/PatientInfo';
import ResultsDashboard from './components/analysis/ResultsDashboard';
import Card from './components/ui/Card';
import SectionHeader from './components/ui/SectionHeader';
import { SkeletonCard, SkeletonHeatmap, SkeletonText } from './components/ui/LoadingSkeleton';
import useAnalysis from './hooks/useAnalysis';
import './App.css';

const defaultPatient = {
  name: '',
  id: '',
  age: '',
  gender: '',
  notes: '',
};

function UploadPage({ file, onFileSelect, onClear, patient, onPatientChange, onRun, status }) {
  const isBusy = status === 'uploading' || status === 'processing';

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PatientInfo patient={patient} onChange={onPatientChange} />
        <UploadZone
          file={file}
          onFileSelect={onFileSelect}
          onClear={onClear}
          disabled={isBusy}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          {status === 'processing' || status === 'uploading' ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--info-dim)',
                border: '1px solid rgba(59,164,255,0.15)',
                color: 'var(--accent)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <RefreshCw size={16} className="spin-animation" />
              {status === 'uploading' ? 'Uploading...' : 'Analyzing EEG...'}
            </div>
          ) : (
            <motion.button
              whileHover={file ? { scale: 1.02 } : {}}
              whileTap={file ? { scale: 0.98 } : {}}
              onClick={onRun}
              disabled={!file}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 28px',
                borderRadius: 'var(--radius-md)',
                background: file
                  ? 'linear-gradient(135deg, var(--accent), #2563EB)'
                  : 'var(--bg-surface-secondary)',
                border: 'none',
                color: file ? '#fff' : 'var(--text-muted)',
                cursor: file ? 'pointer' : 'not-allowed',
                fontSize: 14,
                fontWeight: 600,
                transition: 'opacity 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {file && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                  }}
                />
              )}
              <Play size={16} fill={file ? 'currentColor' : 'none'} />
              Run Analysis
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DashboardPage({ results, status, errorMsg, heatmapData, onNavigate }) {
  if (status === 'complete' && results) {
    return <ResultsDashboard results={results} heatmapData={heatmapData} />;
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

      {status === 'idle' && (
        <Card variant="glass" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <img
            src="/lumina-logo.jpeg"
            alt="Lumina"
            style={{ height: 48, width: 48, borderRadius: 12, marginBottom: 16, opacity: 0.7 }}
          />
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 8,
            }}
          >
            Ready for Analysis
          </h2>
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              maxWidth: 400,
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}
          >
            Upload an EEG recording to begin AI-powered diagnostics. Lumina analyzes
            brain activity patterns with high precision.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('upload')}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent), #2563EB)',
              border: 'none',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go to Upload
          </motion.button>
        </Card>
      )}

      {status === 'uploading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SkeletonCard lines={2} height={100} />
          <SkeletonCard lines={1} height={80} />
        </div>
      )}

      {status === 'processing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <SkeletonCard lines={3} height={200} />
            <SkeletonCard lines={4} height={200} />
          </div>
          <SkeletonHeatmap />
          <SkeletonText height={80} />
        </div>
      )}

      {status === 'error' && (
        <Card variant="glass" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: 'var(--error)', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Analysis Error
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{errorMsg}</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('upload')}
              style={{
                marginTop: 16,
                padding: '8px 20px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-dim)',
                border: '1px solid rgba(59,164,255,0.2)',
                color: 'var(--accent)',
                cursor: 'pointer',
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

function ReportsPage() {
  return (
    <motion.div
      key="reports"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <SectionHeader title="Reports" subtitle="Past analysis reports and history" />
      <Card variant="glass" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Analysis history will appear here after running your first session.
        </p>
      </Card>
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
      <Card variant="glass" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Configuration options coming soon.
        </p>
      </Card>
    </motion.div>
  );
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [patient, setPatient] = useState(defaultPatient);

  const {
    file,
    setFile,
    status,
    results,
    errorMsg,
    runAnalysis,
    reset,
    getHeatmapData,
  } = useAnalysis();

  const handleRun = useCallback(() => {
    runAnalysis();
    setActivePage('dashboard');
  }, [runAnalysis]);

  const handleFileSelect = useCallback((f) => {
    setFile(f);
    setActivePage('upload');
  }, [setFile]);

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  const handleNavigate = useCallback((page) => {
    setActivePage(page);
  }, []);

  const heatmapData = getHeatmapData();

  const renderPage = () => {
    switch (activePage) {
      case 'upload':
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
      case 'analysis':
        if (status === 'complete' && results) {
          return <ResultsDashboard results={results} heatmapData={heatmapData} />;
        }
        return (
          <DashboardPage
            results={results}
            status={status}
            errorMsg={errorMsg}
            heatmapData={heatmapData}
            onNavigate={handleNavigate}
          />
        );
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'dashboard':
      default:
        return (
          <DashboardPage
            results={results}
            status={status}
            errorMsg={errorMsg}
            heatmapData={heatmapData}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  const pageTitles = {
    dashboard: 'Dashboard',
    upload: 'Upload EEG',
    analysis: 'Analysis',
    reports: 'Reports',
    settings: 'Settings',
  };

  return (
    <div className="app-root">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <div className={`main-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          title={pageTitles[activePage] || 'Lumina'}
          status={status}
          patientName={patient.name || null}
        />

        <main className="content-area">
          <AnimatePresence mode="wait">
            {renderPage()}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
