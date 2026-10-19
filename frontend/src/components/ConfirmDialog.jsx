import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmDialog — Universal confirmation dialog for destructive actions
 * Usage:
 *   <ConfirmDialog
 *     isOpen={showConfirm}
 *     title="Delete CV?"
 *     message="This action cannot be undone."
 *     confirmLabel="Delete"
 *     variant="danger"
 *     onConfirm={() => deleteCV()}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel?.();
    }
  };

  const variantClass = `confirm-btn-${variant}`;

  return (
    <div
      className="confirm-overlay"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon-wrapper">
          <AlertTriangle size={24} className={`confirm-icon confirm-icon-${variant}`} />
        </div>
        <h3 id="confirm-title" className="confirm-title">{title}</h3>
        <p id="confirm-message" className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button
            className="confirm-btn confirm-btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            className={`confirm-btn ${variantClass}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
