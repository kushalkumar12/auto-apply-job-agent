import React, { useState } from 'react';
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  MapPin, 
  Laptop, 
  Tag, 
  X, 
  Check, 
  AlertCircle 
} from 'lucide-react';

export default function Page4WorkExperience(props) {
  const profileData = props.profileData || props.profile || {};
  const onChange = props.onChange || ((up) => {
    if (typeof props.updateField === 'function') {
      Object.entries(up).forEach(([k, v]) => props.updateField(k, v));
    }
  });
  const showToast = props.showToast;
  const experiences = profileData.experiences || profileData.experienceList || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  // Form State for modal
  const [form, setForm] = useState({
    company: '',
    title: '',
    startDate: '',
    endDate: '',
    currentlyWorking: false,
    location: '',
    workMode: 'Onsite',
    responsibilities: '',
    primarySkills: [],
    additionalSkills: []
  });

  const [primarySkillInput, setPrimarySkillInput] = useState('');
  const [additionalSkillInput, setAdditionalSkillInput] = useState('');
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingIndex(null);
    setForm({
      company: '',
      title: '',
      startDate: '',
      endDate: '',
      currentlyWorking: false,
      location: '',
      workMode: 'Onsite',
      responsibilities: '',
      primarySkills: [],
      additionalSkills: []
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (idx) => {
    const item = experiences[idx];
    setEditingIndex(idx);
    setForm({
      company: item.company || '',
      title: item.title || '',
      startDate: item.startDate || (item.period ? item.period.split('–')[0]?.trim() : ''),
      endDate: item.currentlyWorking ? '' : (item.endDate || (item.period ? item.period.split('–')[1]?.trim() : '')),
      currentlyWorking: Boolean(item.currentlyWorking || (item.period && item.period.toLowerCase().includes('present'))),
      location: item.location || '',
      workMode: item.workMode || 'Onsite',
      responsibilities: item.responsibilities || item.description || '',
      primarySkills: item.primarySkills || [],
      additionalSkills: item.additionalSkills || []
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteEntry = (idx) => {
    const nextList = experiences.filter((_, i) => i !== idx);
    onChange({
      ...profileData,
      experiences: nextList,
      experienceList: nextList
    });
    if (showToast) showToast('Experience entry removed.', 'info');
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!form.company.trim() || !form.title.trim()) {
      setFormError('Company Name and Job Title are required.');
      return;
    }

    const periodStr = form.currentlyWorking
      ? `${form.startDate || 'Started'} – Present`
      : `${form.startDate || ''} – ${form.endDate || ''}`.trim();

    const entry = {
      id: editingIndex !== null ? experiences[editingIndex].id || `exp_${Date.now()}` : `exp_${Date.now()}`,
      company: form.company.trim(),
      title: form.title.trim(),
      startDate: form.startDate.trim(),
      endDate: form.currentlyWorking ? 'Present' : form.endDate.trim(),
      currentlyWorking: form.currentlyWorking,
      location: form.location.trim(),
      workMode: form.workMode,
      responsibilities: form.responsibilities.trim(),
      description: form.responsibilities.trim(),
      period: periodStr,
      primarySkills: form.primarySkills.slice(0, 5),
      additionalSkills: form.additionalSkills
    };

    let nextList;
    if (editingIndex !== null) {
      nextList = [...experiences];
      nextList[editingIndex] = entry;
    } else {
      nextList = [entry, ...experiences];
    }

    onChange({
      ...profileData,
      experiences: nextList,
      experienceList: nextList
    });

    setIsModalOpen(false);
    if (showToast) showToast(`Experience at ${entry.company} saved!`, 'success');
  };

  const handleAddModalSkill = (isPrimary) => {
    if (isPrimary) {
      const trimmed = primarySkillInput.trim();
      if (!trimmed) return;
      if (form.primarySkills.length >= 5) {
        if (showToast) showToast('Maximum 5 primary skills per experience entry.', 'warning');
        return;
      }
      if (!form.primarySkills.includes(trimmed)) {
        setForm(prev => ({ ...prev, primarySkills: [...prev.primarySkills, trimmed] }));
      }
      setPrimarySkillInput('');
    } else {
      const trimmed = additionalSkillInput.trim();
      if (!trimmed) return;
      if (!form.additionalSkills.includes(trimmed)) {
        setForm(prev => ({ ...prev, additionalSkills: [...prev.additionalSkills, trimmed] }));
      }
      setAdditionalSkillInput('');
    }
  };

  return (
    <div className="jp-page-content" role="region" aria-label="Work Experience Section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Work History</h3>
        </div>
        <button
          type="button"
          className="jp-btn jp-btn-primary jp-btn-sm"
          onClick={openAddModal}
        >
          <Plus size={15} />
          <span>Add Position</span>
        </button>
      </div>

      {experiences.length === 0 ? (
        <div className="jp-empty-state-card">
          <Briefcase size={36} color="var(--rp-text-muted, #6b7570)" />
          <h4 className="jp-empty-state-title">No Work Experience Added Yet</h4>
          <p className="jp-empty-state-desc">
            Highlight your career path, technical achievements, and responsibilities to ground your ATS resume applications.
          </p>
          <button
            type="button"
            className="jp-btn jp-btn-secondary"
            onClick={openAddModal}
            style={{ marginTop: 6 }}
          >
            <Plus size={15} />
            <span>Add First Position</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {experiences.map((exp, idx) => (
            <div key={exp.id || idx} className="jp-entry-card">
              <div className="jp-entry-card-header">
                <div>
                  <h4 className="jp-entry-card-title">{exp.title}</h4>
                  <p className="jp-entry-card-subtitle">{exp.company}</p>
                  <div className="jp-entry-card-meta">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={13} />
                      <span>{exp.period || `${exp.startDate || ''} – ${exp.endDate || ''}`}</span>
                    </span>
                    {exp.location && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={13} />
                        <span>{exp.location}</span>
                      </span>
                    )}
                    {exp.workMode && (
                      <span className="jp-opt-badge">{exp.workMode}</span>
                    )}
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
                    aria-label={`Delete experience at ${exp.company}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {exp.responsibilities && (
                <div className="jp-entry-card-body">
                  {exp.responsibilities}
                </div>
              )}

              {/* Skills tagged to this role */}
              {((exp.primarySkills && exp.primarySkills.length > 0) || (exp.additionalSkills && exp.additionalSkills.length > 0)) && (
                <div className="jp-chips-wrap">
                  {(exp.primarySkills || []).map((sk, sidx) => (
                    <span key={`p_${sidx}`} className="jp-chip is-primary" style={{ fontSize: 11.5 }}>
                      {sk}
                    </span>
                  ))}
                  {(exp.additionalSkills || []).map((sk, sidx) => (
                    <span key={`a_${sidx}`} className="jp-chip" style={{ fontSize: 11.5 }}>
                      {sk}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Experience Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exp-modal-title"
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
              maxWidth: 620,
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--rp-secondary-surface, #ffffff)',
              borderRadius: 12,
              padding: '24px 28px',
              boxShadow: 'var(--rp-shadow-modal)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid var(--rp-secondary-divider, #e6e9e6)', paddingBottom: 12 }}>
              <h3 id="exp-modal-title" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                {editingIndex !== null ? 'Edit Work Experience' : 'Add Work Experience'}
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
              <div className="jp-form-grid-2">
                <div className="jp-field-group">
                  <label className="jp-field-label">Company Name *</label>
                  <input
                    type="text"
                    className="jp-input"
                    placeholder="Enter organization name"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    required
                  />
                </div>
                <div className="jp-field-group">
                  <label className="jp-field-label">Job Title *</label>
                  <input
                    type="text"
                    className="jp-input"
                    placeholder="Enter job title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="jp-form-grid-2">
                <div className="jp-field-group">
                  <label className="jp-field-label">Start Date</label>
                  <input
                    type="text"
                    className="jp-input"
                    placeholder="Start date (e.g. MM/YYYY)"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="jp-field-group">
                  <label className="jp-field-label">End Date</label>
                  <input
                    type="text"
                    className="jp-input"
                    placeholder={form.currentlyWorking ? 'Present' : 'End date (e.g. MM/YYYY)'}
                    value={form.currentlyWorking ? 'Present' : form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    disabled={form.currentlyWorking}
                  />
                  <label style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginTop: 4, color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={form.currentlyWorking}
                      onChange={(e) => setForm({ ...form, currentlyWorking: e.target.checked })}
                      style={{ accentColor: '#2563eb' }}
                    />
                    <span>Currently Working Here</span>
                  </label>
                </div>
              </div>

              <div className="jp-form-grid-2">
                <div className="jp-field-group">
                  <label className="jp-field-label">Work Location</label>
                  <input
                    type="text"
                    className="jp-input"
                    placeholder="Enter work location"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                <div className="jp-field-group">
                  <label className="jp-field-label">Work Mode</label>
                  <select
                    className="jp-select"
                    value={form.workMode}
                    onChange={(e) => setForm({ ...form, workMode: e.target.value })}
                  >
                    <option value="Onsite">Onsite</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              <div className="jp-field-group">
                <label className="jp-field-label">Responsibilities & Key Achievements</label>
                <textarea
                  className="jp-textarea"
                  rows={4}
                  placeholder="Detail high-impact projects, scaling achievements, and engineering metrics..."
                  value={form.responsibilities}
                  onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
                />
              </div>

              {/* Primary skills for this position */}
              <div className="jp-field-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="jp-field-label">Primary Skills Used (Max 5)</label>
                  <span style={{ fontSize: 11, color: 'var(--rp-text-muted, #6b7570)' }}>
                    {form.primarySkills.length}/5
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    className="jp-input"
                    placeholder="Add primary skill..."
                    value={primarySkillInput}
                    onChange={(e) => setPrimarySkillInput(e.target.value)}
                    disabled={form.primarySkills.length >= 5}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddModalSkill(true);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="jp-btn jp-btn-secondary"
                    onClick={() => handleAddModalSkill(true)}
                    disabled={!primarySkillInput.trim() || form.primarySkills.length >= 5}
                  >
                    Add
                  </button>
                </div>
                {form.primarySkills.length > 0 && (
                  <div className="jp-chips-wrap">
                    {form.primarySkills.map((sk, idx) => (
                      <span key={idx} className="jp-chip is-primary">
                        <span>{sk}</span>
                        <button
                          type="button"
                          className="jp-chip-remove"
                          onClick={() => setForm(prev => ({ ...prev, primarySkills: prev.primarySkills.filter((_, i) => i !== idx) }))}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                  {editingIndex !== null ? 'Update Position' : 'Save Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
