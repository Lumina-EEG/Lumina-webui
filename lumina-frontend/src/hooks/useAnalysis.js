import { useState, useRef, useCallback } from 'react';
import { uploadFile, pollResults } from '../services/api';

export default function useAnalysis() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
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
  }, []);

  const cancel = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus('idle');
  }, []);

  const runAnalysis = useCallback(async (selectedFile) => {
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
    runAnalysis,
    reset,
    cancel,
    getHeatmapData,
  };
}
