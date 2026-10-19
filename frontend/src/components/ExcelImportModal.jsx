import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, X, FileSpreadsheet, AlertCircle, ArrowRight } from 'lucide-react';
import { apiService } from '../services/api';

export default function ExcelImportModal({
  isOpen,
  onClose,
  onImportSuccess
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fname = file.name.toLowerCase();
    if (!fname.endsWith('.csv') && !fname.endsWith('.xlsx') && !fname.endsWith('.txt')) {
      setErrorMessage('Unsupported file format. Please upload a .csv or .xlsx spreadsheet.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 10MB limit.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await apiService.importJobs(selectedFile);
      setResult(res);
      if (onImportSuccess) {
        onImportSuccess(res);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Import failed to process spreadsheet.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div 
      className="modal-overlay" 
      role="dialog" 
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        className="excel-import-modal-card"
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          padding: '24px',
          color: 'var(--text-primary, #f8fafc)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div 
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--accent-color, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                Import Jobs Spreadsheet
              </h3>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted, #94a3b8)' }}>
                CSV or Excel (.csv, .xlsx) with deduplication & formula protection
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        {result ? (
          // Completion State
          <div>
            <div 
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 10,
                padding: '16px',
                textAlign: 'center',
                marginBottom: 16
              }}
            >
              <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>
                Import Complete
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary, #cbd5e1)', marginTop: 4 }}>
                Successfully imported <strong>{result.importedCount}</strong> jobs into database.
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                {result.skippedCount} duplicates skipped · Classified as <em>Excel Import</em>
              </div>
            </div>

            {/* Invalid rows / errors */}
            {result.errors && result.errors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#f59e0b', marginBottom: 6 }}>
                  Skipped / Invalid Rows ({result.errors.length})
                </div>
                <div 
                  style={{
                    maxHeight: 120,
                    overflowY: 'auto',
                    fontSize: 11,
                    color: 'var(--text-muted, #94a3b8)',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '8px 10px',
                    borderRadius: 6
                  }}
                >
                  {result.errors.map((err, i) => (
                    <div key={i} style={{ marginBottom: 2 }}>• {err}</div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color, #334155)',
                  background: 'transparent',
                  color: 'var(--text-secondary, #cbd5e1)',
                  fontSize: 12.5,
                  cursor: 'pointer'
                }}
              >
                Import Another File
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--accent-color, #3b82f6)',
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                View in Job List
              </button>
            </div>
          </div>
        ) : (
          // File Selection / Upload Form
          <div>
            <div 
              style={{
                border: '2px dashed var(--border-color, #334155)',
                borderRadius: 12,
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: selectedFile ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                marginBottom: 16,
                transition: 'border 0.2s ease'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv, .xlsx, .txt"
                style={{ display: 'none' }}
              />
              <UploadCloud size={32} style={{ color: 'var(--accent-color, #3b82f6)', margin: '0 auto 8px auto', display: 'block' }} />
              {selectedFile ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB · Ready to parse
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                    Click to browse or drop spreadsheet
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                    Supports .CSV and .XLSX (up to 10MB)
                  </div>
                </div>
              )}
            </div>

            {/* Error message */}
            {errorMessage && (
              <div 
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontSize: 12,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div style={{ fontSize: 11.5, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.4, marginBottom: 18 }}>
              <strong>Expected Columns:</strong> Role / Title, Company, Location (optional), Work Mode (optional), ATS Score (optional), Application URL (optional), Skills (optional).
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color, #334155)',
                  background: 'transparent',
                  color: 'var(--text-secondary, #cbd5e1)',
                  fontSize: 12.5,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || isProcessing}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--accent-color, #3b82f6)',
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: (!selectedFile || isProcessing) ? 'not-allowed' : 'pointer',
                  opacity: (!selectedFile || isProcessing) ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>{isProcessing ? 'Processing in background...' : 'Import Spreadsheet'}</span>
                {!isProcessing && <ArrowRight size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
