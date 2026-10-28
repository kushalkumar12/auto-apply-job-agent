import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Eye, 
  Download, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  X,
  Maximize2
} from 'lucide-react';
import { apiService } from '../../services/api';

export default function Page1PersonalInfo(props) {
  const profileData = props.profileData || props.profile || {};
  const profileId = props.profileId || profileData._profileId || profileData.id || 'default';
  const onChange = props.onChange || ((up) => {
    if (typeof props.updateField === 'function') {
      Object.entries(up).forEach(([k, v]) => props.updateField(k, v));
    }
  });
  const onSave = props.onSave;
  const errors = props.errors || {};
  const isSaving = props.isSaving || false;
  const showToast = props.showToast;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef(null);

  const firstName = profileData.firstName !== undefined 
    ? profileData.firstName 
    : (profileData.general?.firstName !== undefined ? profileData.general.firstName : '');
  const lastName = profileData.lastName !== undefined 
    ? profileData.lastName 
    : (profileData.general?.lastName !== undefined ? profileData.general.lastName : '');
  const noLastName = Boolean(profileData.noLastName || profileData.general?.noLastName);
  const resume = profileData.resume || null;

  const formatName = (str) => {
    // Keep only alphabets and spaces
    const clean = str.replace(/[^a-zA-Z\s]/g, '');
    // Capitalize first character of each word, rest lowercase/as-typed
    return clean.replace(/\b([a-zA-Z])/g, (char) => char.toUpperCase());
  };

  const handleFirstNameChange = (e) => {
    const raw = e.target.value;
    const val = formatName(raw);
    const updated = {
      ...profileData,
      firstName: val,
      fullName: noLastName ? val.trim() : [val, lastName].filter(Boolean).join(' ').trim()
    };
    if (updated.general) {
      updated.general = { ...updated.general, firstName: val, fullName: updated.fullName };
    }
    onChange(updated);
    if (typeof props.updateField === 'function') {
      props.updateField('firstName', val);
    }
  };

  const handleLastNameChange = (e) => {
    const raw = e.target.value;
    const val = formatName(raw);
    const updated = {
      ...profileData,
      lastName: val,
      fullName: [firstName, val].filter(Boolean).join(' ').trim()
    };
    if (updated.general) {
      updated.general = { ...updated.general, lastName: val, fullName: updated.fullName };
    }
    onChange(updated);
    if (typeof props.updateField === 'function') {
      props.updateField('lastName', val);
    }
  };

  const handleNoLastNameToggle = (e) => {
    const checked = e.target.checked;
    const updated = {
      ...profileData,
      noLastName: checked,
      lastName: checked ? '' : lastName,
      fullName: checked ? firstName.trim() : `${firstName} ${lastName}`.trim()
    };
    onChange(updated);
  };

  // Resume File Upload Handler
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    // Client-side validations
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) {
      const msg = 'Invalid file format. Please upload a PDF resume (.pdf).';
      setUploadError(msg);
      if (showToast) showToast(msg, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      const msg = 'File size exceeds maximum allowed limit (10MB). Please select a smaller PDF.';
      setUploadError(msg);
      if (showToast) showToast(msg, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const res = await apiService.uploadResume(file, profileId);
      if (res && res.resume) {
        // Auto-extract first and last name if empty
        const updated = {
          ...profileData,
          resume: res.resume,
          resumeAiMap: res.aiExtraction || res.resume?.aiExtraction
        };

        if (!firstName && res.parsed?.fullName) {
          const parts = res.parsed.fullName.split(' ');
          updated.firstName = parts[0] || '';
          updated.lastName = parts.slice(1).join(' ') || '';
          updated.fullName = res.parsed.fullName;
        }

        onChange(updated);
        if (showToast) showToast(`Resume '${file.name}' uploaded and parsed successfully!`, 'success');
      }
    } catch (err) {
      const msg = err.message || 'Failed to upload resume file. Please retry.';
      setUploadError(msg);
      if (showToast) showToast(msg, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Resume Deletion Handler
  const handleDeleteResume = async () => {
    try {
      await apiService.deleteResume(profileId);
      onChange({
        ...profileData,
        resume: null,
        resumeAiMap: null
      });
      setShowDeleteConfirm(false);
      if (showToast) showToast('Resume deleted successfully.', 'info');
    } catch (err) {
      if (showToast) showToast(`Could not delete resume: ${err.message}`, 'error');
    }
  };

  // Programmatic authenticated resume download handler (bypasses cross-origin anchor restrictions)
  const handleDownloadResume = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const blob = await apiService.getResumeBlob(profileId);
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = resume?.fileName || 'resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      if (showToast) showToast('Resume downloaded successfully.', 'success');
    } catch (err) {
      console.error('Failed to download resume:', err);
      if (showToast) showToast(`Download failed: ${err.message}`, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const resumeViewUrl = apiService.getResumeViewUrl(profileId);
  const resumeDownloadUrl = apiService.getResumeDownloadUrl(profileId);

  // Fetch resume blob for same-origin inline PDF preview inside iframe
  useEffect(() => {
    let active = true;
    let createdUrl = null;

    if (isPreviewModalOpen && resume) {
      setPreviewLoading(true);
      setPreviewError(null);
      apiService.getResumeBlob(profileId)
        .then(blob => {
          if (!active) return;
          const pdfBlob = new Blob([blob], { type: 'application/pdf' });
          createdUrl = URL.createObjectURL(pdfBlob);
          setPreviewBlobUrl(createdUrl);
          setPreviewLoading(false);
        })
        .catch(err => {
          if (!active) return;
          console.warn('Could not fetch blob for inline preview:', err);
          setPreviewError(err.message || 'Could not load resume PDF document.');
          setPreviewLoading(false);
        });
    } else {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(null);
      }
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isPreviewModalOpen, profileId]);

  return (
    <div className="jp-page-content" role="region" aria-label="Personal Information Form">
      {/* 1. Name & Identity */}
      <div className="jp-form-grid-2">
        <div className="jp-field-group">
          <label className="jp-field-label" htmlFor="jp-first-name">
            <span>First Name</span>
            <span className="jp-req-star" aria-hidden="true">*</span>
          </label>
          <input
            id="jp-first-name"
            type="text"
            className={`jp-input ${errors.firstName ? 'is-error' : ''}`}
            placeholder="Enter First Name"
            value={firstName}
            onChange={handleFirstNameChange}
            aria-required="true"
            aria-invalid={errors.firstName ? 'true' : 'false'}
          />
          {errors.firstName && (
            <span className="jp-error-text" role="alert">
              <AlertCircle size={13} />
              <span>{errors.firstName}</span>
            </span>
          )}
        </div>

        <div className="jp-field-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="jp-field-label" htmlFor="jp-last-name">
              <span>Last Name</span>
              <span className="jp-req-star" aria-hidden="true">*</span>
            </label>
          </div>
          <input
            id="jp-last-name"
            type="text"
            className={`jp-input ${errors.lastName ? 'is-error' : ''}`}
            placeholder="Enter Last Name"
            value={lastName}
            onChange={handleLastNameChange}
            aria-required="true"
            aria-invalid={errors.lastName ? 'true' : 'false'}
          />
          {errors.lastName && (
            <span className="jp-error-text" role="alert">
              <AlertCircle size={13} />
              <span>{errors.lastName}</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Resume PDF Upload & Preview */}
      <div className="jp-field-group" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <label className="jp-field-label">
            <span>Resume PDF</span>
            <span className="jp-req-star" aria-hidden="true">*</span>
          </label>
          <span style={{ fontSize: 11.5, color: 'var(--rp-text-muted, #6b7570)' }}>
            PDF format only (Max 10MB)
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          aria-label="Upload Resume PDF file"
        />

        {resume ? (
          /* Active Uploaded Resume Card */
          <div className="jp-resume-card">
            <div className="jp-resume-card-icon" aria-hidden="true">
              <FileText size={24} />
            </div>
            <div className="jp-resume-card-info">
              <div className="jp-resume-card-name-row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="jp-resume-card-name" title={resume.fileName || 'Master Resume.pdf'}>
                  {resume.fileName || 'Master Resume.pdf'}
                </span>
                <span className="jp-resume-card-verified-badge" title="Verified">
                  <CheckCircle2 size={14} color="#10b981" />
                </span>
              </div>
              <div className="jp-resume-card-meta">
                <span>{resume.fileSize || 'PDF Document'}</span>
                {resume.uploadedAt && (
                  <span> · Uploaded {new Date(resume.uploadedAt).toLocaleDateString('en-GB')}</span>
                )}
              </div>
            </div>

            <div className="jp-resume-card-actions">
              <button
                type="button"
                className="jp-btn jp-btn-secondary jp-btn-sm"
                onClick={() => setIsPreviewModalOpen(true)}
                title="Preview uploaded PDF"
              >
                <Eye size={14} />
                <span>Preview</span>
              </button>

              <button
                type="button"
                className="jp-btn jp-btn-secondary jp-btn-sm"
                onClick={handleDownloadResume}
                disabled={isDownloading}
                title="Download original PDF"
              >
                <Download size={14} className={isDownloading ? 'anim-spin' : ''} />
                <span>Download</span>
              </button>

              <button
                type="button"
                className="jp-btn jp-btn-secondary jp-btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Replace with another PDF"
              >
                <RefreshCw size={13} className={isUploading ? 'anim-spin' : ''} />
                <span>Replace</span>
              </button>

              <button
                type="button"
                className="jp-btn jp-btn-danger-ghost jp-btn-sm"
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete resume"
                aria-label="Delete resume"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* Empty Drag & Drop Zone */
          <div
            className={`jp-resume-dropzone ${errors.resume ? 'is-error' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer.files?.[0]) {
                const fakeEvent = { target: { files: e.dataTransfer.files } };
                handleFileChange(fakeEvent);
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            aria-label="Upload Resume PDF. Click or drop file here."
          >
            <div className="jp-resume-dropzone-icon">
              {isUploading ? <RefreshCw size={24} className="anim-spin" /> : <UploadCloud size={24} />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--rp-text-dominant, #171a18)' }}>
                {isUploading ? 'Uploading and parsing resume PDF...' : 'Click or drag & drop your Master Resume PDF here'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--rp-text-muted, #6b7570)', marginTop: 4 }}>
                Supports standard .pdf files up to 10MB
              </div>
            </div>
          </div>
        )}

        {uploadError && (
          <span className="jp-error-text" role="alert" style={{ marginTop: 6 }}>
            <AlertCircle size={13} />
            <span>{uploadError}</span>
          </span>
        )}

        {errors.resume && !resume && (
          <span className="jp-error-text" role="alert" style={{ marginTop: 6 }}>
            <AlertCircle size={13} />
            <span>{errors.resume}</span>
          </span>
        )}
      </div>

      {/* Embedded PDF Preview Modal */}
      {isPreviewModalOpen && resume && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-modal-title"
          onClick={() => setIsPreviewModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 880,
              height: '85vh',
              backgroundColor: 'var(--rp-secondary-surface, #ffffff)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: 'var(--rp-shadow-modal, 0 25px 50px -12px rgba(0,0,0,0.35))'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid var(--rp-secondary-divider, #e6e9e6)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={20} color="var(--rp-accent-primary, #2563eb)" />
                <h3 id="pdf-modal-title" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  {resume.fileName || 'Master Resume Preview'}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {previewBlobUrl && (
                  <a
                    href={previewBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="jp-btn jp-btn-secondary jp-btn-sm"
                    style={{ textDecoration: 'none' }}
                    title="Open in new window"
                  >
                    <Maximize2 size={13} />
                    <span>Open in Tab</span>
                  </a>
                )}
                <button
                  type="button"
                  className="jp-btn jp-btn-secondary jp-btn-sm"
                  onClick={handleDownloadResume}
                  disabled={isDownloading}
                  title="Download original PDF"
                >
                  <Download size={14} className={isDownloading ? 'anim-spin' : ''} />
                  <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
                </button>
                <button
                  type="button"
                  className="jp-btn jp-btn-danger-ghost jp-btn-sm"
                  onClick={() => setIsPreviewModalOpen(false)}
                  aria-label="Close PDF preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {previewLoading || (!previewBlobUrl && !previewError) ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#f8fafc' }}>
                <RefreshCw size={28} className="anim-spin" color="var(--rp-accent-primary, #2563eb)" />
                <span style={{ fontSize: 13.5, color: 'var(--rp-text-secondary, #5a615c)' }}>
                  Loading resume document for preview...
                </span>
              </div>
            ) : previewError ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30, textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <AlertCircle size={36} color="var(--rp-semantic-danger, #dc2626)" />
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--rp-text-dominant, #171a18)' }}>
                  Unable to display inline preview
                </div>
                <div style={{ fontSize: 13, color: 'var(--rp-text-secondary, #5a615c)', maxWidth: 440, lineHeight: 1.5 }}>
                  {previewError}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={handleDownloadResume}
                    disabled={isDownloading}
                    className="jp-btn jp-btn-primary"
                  >
                    <Download size={14} className={isDownloading ? 'anim-spin' : ''} />
                    <span>Download File Directly</span>
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                src={previewBlobUrl}
                type="application/pdf"
                title="Resume PDF Inline Preview"
                style={{
                  width: '100%',
                  flex: 1,
                  border: 'none',
                  backgroundColor: '#525659'
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="del-title"
          onClick={() => setShowDeleteConfirm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              backgroundColor: 'var(--rp-secondary-surface, #ffffff)',
              borderRadius: 10,
              padding: 24,
              boxShadow: 'var(--rp-shadow-modal)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="del-title" style={{ margin: '0 0 10px 0', fontSize: 17, fontWeight: 700, color: 'var(--rp-semantic-danger, #dc2626)' }}>
              Delete Uploaded Resume?
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--rp-text-secondary, #5a615c)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Are you sure you want to remove this resume document? If you delete your only required resume, you will need to upload another PDF to keep your job match criteria active.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="jp-btn jp-btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="jp-btn"
                style={{ backgroundColor: 'var(--rp-semantic-danger, #dc2626)', color: '#fff' }}
                onClick={handleDeleteResume}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
