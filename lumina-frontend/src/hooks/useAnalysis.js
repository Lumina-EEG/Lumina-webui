import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadFile, pollResults } from '../services/api';
import { getWithExpiry, setWithExpiry, removeItem } from '../utils/storage';

export default function useAnalysis() {
  const savedSession = (() => {
    try {
      return getWithExpiry('analysis_session');
    } catch {
      return null;
    }
  })();

  const [file, setFile] = useState(
    savedSession?.fileMeta
      ? { name: savedSession.fileMeta.name, size: savedSession.fileMeta.size, type: savedSession.fileMeta.type, lastModified: savedSession.fileMeta.lastModified }
      : null,
  );
  const [status, setStatus] = useState(
    savedSession && (savedSession.status === 'complete' || savedSession.status === 'error')
      ? savedSession.status
      : 'idle',
  );
  const [results, setResults] = useState(
    savedSession?.status === 'complete' && savedSession?.results
      ? savedSession.results
      : null,
  );
  const [errorMsg, setErrorMsg] = useState(
    savedSession?.status === 'error' ? savedSession.errorMsg || '' : '',
  );
  const [history, setHistory] = useState(() => {
    try {
      return getWithExpiry('analysis_history') || [];
    } catch {
      return [];
    }
  });
  const intervalRef = useRef(null);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setFile(null);
    setStatus('idle');
    setResults(null);
    setErrorMsg('');
    removeItem('analysis_session');
  }, []);

  const cancel = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus('idle');
    removeItem('analysis_session');
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    removeItem('analysis_history');
  }, []);

  useEffect(() => {
    setWithExpiry('analysis_history', history);
  }, [history]);

  useEffect(() => {
    if (status === 'complete') {
      setWithExpiry('analysis_session', {
        status: 'complete',
        results,
        fileMeta: file
          ? { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified }
          : null,
      });
    } else if (status === 'error') {
      setWithExpiry('analysis_session', {
        status: 'error',
        errorMsg,
        fileMeta: file
          ? { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified }
          : null,
      });
    } else if (status === 'idle') {
      removeItem('analysis_session');
    }
  }, [status, results, errorMsg, file]);

  const runAnalysis = useCallback(async (selectedFile, metadata = {}) => {
    const f = selectedFile || file;
    if (!f) return;

    setStatus('uploading');
    setErrorMsg('');

    try {
      const taskId = await uploadFile(f);
      setStatus('processing');

      await new Promise((resolve, reject) => {
        intervalRef.current = setInterval(async () => {
          try {
            const data = await pollResults(taskId);

            if (data.status === 'complete') {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
              const payload = data.data || data;
              setResults(payload);
              setStatus('complete');

              const entry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                fileName: f.name,
                fileSize: f.size,
                patientName: metadata.patientName || '',
                patientGender: metadata.patientGender || '',
                patientAge: metadata.patientAge || '',
                results: payload,
              };
              setHistory((prev) => [entry, ...prev]);

              resolve();
            } else if (data.status === 'failed') {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
              setErrorMsg(data.error || 'The analysis engine crashed during inference.');
              setStatus('error');
              reject(new Error(data.error));
            }
          } catch (err) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setErrorMsg('Lost connection to the analysis server.');
            setStatus('error');
            reject(err);
          }
        }, 3000);
      });
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }, [file]);

  const getHeatmapData = useCallback(() => {
    if (!results) return null;

    let raw = null;
    if (results.explanation?.heatmap) {
      raw = results.explanation.heatmap;
    } else if (results.heatmap) {
      raw = results.heatmap;
    }

    if (!raw || !Array.isArray(raw) || raw.length === 0) return null;
    return raw;
  }, [results]);

  return {
    file,
    setFile,
    status,
    results,
    errorMsg,
    history,
    runAnalysis,
    reset,
    cancel,
    clearHistory,
    getHeatmapData,
  };
}
