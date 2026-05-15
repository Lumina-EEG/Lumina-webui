import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File as FileIcon, X } from 'lucide-react';

const ACCEPTED_TYPES = ['.edf', '.npy'];

export default function UploadZone({ file, onFileSelect, onClear, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const validateAndSet = (f) => {
    if (disabled) return;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) return;
    onFileSelect(f);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) validateAndSet(dropped);
  };

  const handleInputChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSet(selected);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            onClick={() => !disabled && inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-xl)',
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              background: dragOver
                ? 'var(--accent-dim)'
                : 'var(--bg-surface)',
              padding: '48px 24px',
              textAlign: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
              overflow: 'hidden',
            }}
            whileHover={!disabled ? { scale: 1.005 } : {}}
            whileTap={!disabled ? { scale: 0.995 } : {}}
          >
            {dragOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  position: 'absolute',
                  inset: -1,
                  borderRadius: 'inherit',
                  boxShadow: 'inset 0 0 30px var(--accent-glow), 0 0 30px var(--accent-glow)',
                  pointerEvents: 'none',
                }}
              />
            )}

            <motion.div
              animate={dragOver ? { y: -4 } : { y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--accent-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Upload size={24} color="var(--accent)" />
              </div>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 8,
                }}
              >
                {dragOver ? 'Drop your EEG file here' : 'Drag & drop EEG file'}
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  marginBottom: 16,
                }}
              >
                or click to browse · EDF or NPY format
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                {ACCEPTED_TYPES.map((ext) => (
                  <span
                    key={ext}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-secondary)',
                      border: '1px solid var(--border)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--accent)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {ext.toUpperCase()}
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="file-preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            style={{
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-hover)',
              background: 'var(--bg-surface)',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileIcon size={20} color="var(--accent)" />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 2,
                  }}
                >
                  {file.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatSize(file.size)}
                </p>
              </div>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-dim)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--accent)',
                  marginLeft: 4,
                }}
              >
                {file.name.split('.').pop().toUpperCase()}
              </span>
            </div>

            {!disabled && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--error-dim)',
                  border: 'none',
                  color: 'var(--error)',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
