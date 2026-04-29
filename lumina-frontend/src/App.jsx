import React, { useState } from 'react';
import Heatmap from './Heatmap';
import './App.css';

export default function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, uploading, processing, complete, error
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus("idle");
      setResults(null);
      setErrorMsg("");
    }
  };

  const runAnalysis = async () => {
    if (!file) return;
    
    setStatus("uploading");
    setErrorMsg("");
    setResults(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Send file to FastAPI
      const uploadRes = await fetch("http://127.0.0.1:8000/api/v1/analyze", {
        method: "POST",
        body: formData,
      });
      
      if (!uploadRes.ok) {
        throw new Error(`Server rejected the file. Status: ${uploadRes.status}`);
      }
      
      const { task_id } = await uploadRes.json();
      setStatus("processing");

      // 2. Poll for results every 3 seconds
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`http://127.0.0.1:8000/api/v1/results/${task_id}`);
          const pollData = await pollRes.json();

          if (pollData.status === "complete") {
            clearInterval(pollInterval);
            
            // Unpack the payload safely
            const payload = pollData.data || pollData; 
            setResults(payload);
            setStatus("complete");
            
          } else if (pollData.status === "failed") {
            clearInterval(pollInterval);
            setErrorMsg(pollData.error || "The PyTorch engine crashed during inference.");
            setStatus("error");
          }
        } catch (pollErr) {
          clearInterval(pollInterval);
          setErrorMsg("Lost connection to the backend server.");
          setStatus("error");
        }
      }, 3000);

    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  // STRICT DATA EXTRACTION: Guaranteed to return an array or explicitly false
  const getSafeHeatmapData = () => {
    if (!results) return false;
    
    let rawData = null;
    if (results.explanation && results.explanation.heatmap) {
        rawData = results.explanation.heatmap;
    } else if (results.heatmap) {
        rawData = results.heatmap;
    }

    if (!rawData) return false;
    if (!Array.isArray(rawData)) return false;
    if (rawData.length === 0) return false;
    
    return rawData;
  };

  const heatmapData = getSafeHeatmapData();

  return (
    <div className="app-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui' }}>
      <header style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, color: '#2c3e50' }}>Lumina Clinical Dashboard</h1>
        <p style={{ margin: 0, color: '#7f8c8d' }}>EEG Diagnostic AI Engine</p>
      </header>

      <section className="upload-section" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <input 
          type="file" 
          onChange={handleFileChange} 
          accept=".edf,.npy" 
          style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} 
        />
        <button 
          onClick={runAnalysis} 
          disabled={!file || status === "uploading" || status === "processing"}
          style={{ 
            padding: '0.5rem 1.5rem', 
            cursor: (!file || status === "uploading" || status === "processing") ? 'not-allowed' : 'pointer', 
            background: (!file || status === "uploading" || status === "processing") ? '#95a5a6' : '#3498db', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          {status === "uploading" ? "Uploading..." : status === "processing" ? "Analyzing Brainwaves..." : "Run Analysis"}
        </button>
      </section>

      {status === "error" && (
        <div style={{ padding: '1rem', background: '#fee', borderLeft: '4px solid #e74c3c', color: '#c0392b', marginBottom: '2rem', borderRadius: '4px' }}>
          <strong>System Error:</strong> {errorMsg}
        </div>
      )}

      {status === "complete" && results && (
        <main className="results-board">
          
          {/* DIAGNOSIS HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e9ecef' }}>
            <div>
              <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '2rem' }}>{results.session_prediction || "Unknown"}</h2>
              <span style={{ color: '#7f8c8d', fontWeight: 'bold', fontSize: '0.85rem' }}>PRIMARY DIAGNOSIS</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: 0, color: '#27ae60', fontSize: '2rem' }}>
                {results.session_confidence ? (results.session_confidence * 100).toFixed(1) : "0.0"}%
              </h2>
              <span style={{ color: '#7f8c8d', fontWeight: 'bold', fontSize: '0.85rem' }}>AI CONFIDENCE</span>
            </div>
          </div>

          {/* CLINICAL NOTE */}
          <div style={{ background: '#fff', padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h3 style={{ marginTop: 0, color: '#34495e', borderBottom: '2px solid #3498db', paddingBottom: '0.5rem', display: 'inline-block' }}>Chief Neurologist Note</h3>
            <p style={{ lineHeight: '1.6', color: '#444', fontSize: '1.05rem' }}>
              {results.explanation?.clinical_note || results.clinical_note || "No clinical note generated."}
            </p>
          </div>

          {/* SPATIAL HEATMAP - COMPLETELY ISOLATED AND PROTECTED */}
          <div className="heatmap-container" style={{ marginTop: '2rem', background: '#fff', padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h3 style={{ color: '#34495e', marginTop: 0, marginBottom: '1rem' }}>Spatial Activity Heatmap</h3>
            
            {heatmapData ? (
              <Heatmap data={heatmapData} />
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', background: '#f8f9fa', border: '1px dashed #ccc', borderRadius: '4px', color: '#7f8c8d' }}>
                Visualization data unavailable or still processing...
              </div>
            )}
          </div>

        </main>
      )}
    </div>
  );
}