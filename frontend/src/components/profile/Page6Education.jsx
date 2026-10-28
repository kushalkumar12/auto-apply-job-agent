import React, { useState } from 'react';
import { 
  GraduationCap, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  Award, 
  X, 
  AlertCircle 
} from 'lucide-react';

export default function Page6Education(props) {
  const profileData = props.profileData || props.profile || {};
  const onChange = props.onChange || ((up) => {
    if (typeof props.updateField === 'function') {
      Object.entries(up).forEach(([k, v]) => props.updateField(k, v));
    }
  });
  const showToast = props.showToast;
  const educationList = profileData.education || profileData.educationList || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [form, setForm] = useState({
    institution: '',
    degree: '',
    startDate: '',
    endDate: '',
    certifications: ''
  });

  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingIndex(null);
    setForm({
      institution: '',
      degree: '',
      startDate: '',
      endDate: '',
      certifications: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (idx) => {
    const item = educationList[idx];
    setEditingIndex(idx);
    setForm({
      institution: item.institution || item.institutionName || item.school || '',
      degree: item.degree || '',
      startDate: item.startDate || (item.period ? item.period.split('–')[0]?.trim() : ''),
      endDate: item.endDate || (item.period ? item.period.split('–')[1]?.trim() : ''),
      certifications: Array.isArray(item.certifications) ? item.certifications.join(', ') : (item.certifications || '')
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteEntry = (idx) => {
    const nextList = educationList.filter((_, i) => i !== idx);
    onChange({
      ...profileData,
      education: nextList,
      educationList: nextList
    });
    if (showToast) showToast('Education entry removed.', 'info');
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!form.institution.trim() || !form.degree.trim()) {
      setFormError('University/College and Degree are required.');
      return;
    }

    const certsArray = form.certifications
      ? form.certifications.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const periodStr = `${form.startDate || ''} – ${form.endDate || ''}`.trim();

    const entry = {
      id: editingIndex !== null ? educationList[editingIndex].id || `edu_${Date.now()}` : `edu_${Date.now()}`,
      institution: form.institution.trim(),
      degree: form.degree.trim(),
      startDate: form.startDate.trim(),
      endDate: form.endDate.trim(),
      period: periodStr,
      certifications: certsArray
    };

    let nextList;
    if (editingIndex !== null) {
      nextList = [...educationList];
      nextList[editingIndex] = entry;
    } else {
      nextList = [entry, ...educationList];
    }

    onChange({
      ...profileData,
      education: nextList,
      educationList: nextList
    });

    setIsModalOpen(false);
    if (showToast) showToast(`Education at ${entry.institution} saved!`, 'success');
  };

  return (
    <div className="jp-page-content" role="region" aria-label="Education Section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Degrees & Qualifications</h3>
        </div>
        <button
          type="button"
          className="jp-btn jp-btn-primary jp-btn-sm"
          onClick={openAddModal}
        >
          <Plus size={15} />
          <span>Add Education</span>
        </button>
      </div>

      {educationList.length === 0 ? (
        <div className="jp-empty-state-card">
          <GraduationCap size={36} color="var(--rp-text-muted, #6b7570)" />
          <h4 className="jp-empty-state-title">No Education Added Yet</h4>
          <p className="jp-empty-state-desc">
            Add undergraduate, postgraduate degrees or professional certifications to reinforce candidate qualification.
          </p>
          <button
            type="button"
            className="jp-btn jp-btn-secondary"
            onClick={openAddModal}
            style={{ marginTop: 6 }}
          >
            <Plus size={15} />
            <span>Add First Degree</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {educationList.map((edu, idx) => (
            <div key={edu.id || idx} className="jp-entry-card">
              <div className="jp-entry-card-header">
                <div>
                  <h4 className="jp-entry-card-title">{edu.degree}</h4>
                  <p className="jp-entry-card-subtitle">{edu.institution || edu.institutionName}</p>
                  <div className="jp-entry-card-meta">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={13} />
                      <span>{edu.period || `${edu.startDate || ''} – ${edu.endDate || ''}`}</span>
                    </span>
                  </div>
                </div>
                <div className="jp-entry-card-actions">
                  <button
                    type="button"
                    className="jp-btn-edit-link"
                    onClick={() => openEditModal(idx)}
                    title="Edit entry"
                  >
                    <Edit3 size={15} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    className="jp-btn-danger-ghost"
                    onClick={() => handleDeleteEntry(idx)}
                    title="Delete entry"
                    aria-label={`Delete ${edu.degree}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {edu.certifications && (Array.isArray(edu.certifications) ? edu.certifications.length > 0 : Boolean(edu.certifications)) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--rp-text-secondary, #5a615c)', marginTop: 4 }}>
                  <Award size={14} color="var(--rp-accent-primary, #2563eb)" />
                  <span>Certifications: {Array.isArray(edu.certifications) ? edu.certifications.join(', ') : edu.certifications}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Education Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edu-modal-title"
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 580,
              backgroundColor: 'var(--rp-secondary-surface, #ffffff)',
              borderRadius: 12,
              padding: '24px 28px',
              boxShadow: 'var(--rp-shadow-modal)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid var(--rp-secondary-divider, #e6e9e6)', paddingBottom: 12 }}>
              <h3 id="edu-modal-title" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                {editingIndex !== null ? 'Edit Education' : 'Add Education'}
              </h3>
              <button
                type="button"
                className="jp-btn-danger-ghost"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--rp-semantic-danger-bg, #fef2f2)', color: 'var(--rp-semantic-danger-text, #991b1b)', fontSize: 12.5, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="jp-field-group">
                <label className="jp-field-label">University / College *</label>
                <input
                  type="text"
                  className="jp-input"
                  placeholder="Enter university or institution name"
                  value={form.institution}
                  onChange={(e) => setForm({ ...form, institution: e.target.value })}
                  required
                />
              </div>

              <div className="jp-field-group">
                <label className="jp-field-label">Degree & Field of Study *</label>
                <input
                  type="text"
                  className="jp-input"
                  placeholder="Enter degree and major"
                  value={form.degree}
                  onChange={(e) => setForm({ ...form, degree: e.target.value })}
                  required
                />
              </div>

              <div className="jp-form-grid-2">
                <div className="jp-field-group">
                  <label className="jp-field-label">Start Date</label>
                  <input
                    type="text"
                    className="jp-input"
                    placeholder="Start year (e.g. YYYY)"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="jp-field-group">
                  <label className="jp-field-label">End Date</label>
                  <input
                    type="text"
                    className="jp-input"
                    placeholder="End year (e.g. YYYY)"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="jp-field-group">
                <label className="jp-field-label">Certifications (Optional)</label>
                <input
                  type="text"
                  className="jp-input"
                  placeholder="Enter certifications (comma separated)"
                  value={form.certifications}
                  onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  className="jp-btn jp-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="jp-btn jp-btn-primary"
                >
                  {editingIndex !== null ? 'Update Education' : 'Save Education'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
