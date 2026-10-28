import React, { useState } from 'react';
import { 
  FolderGit2, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Tag, 
  X, 
  AlertCircle 
} from 'lucide-react';

export default function Page5Projects(props) {
  const profileData = props.profileData || props.profile || {};
  const onChange = props.onChange || ((up) => {
    if (typeof props.updateField === 'function') {
      Object.entries(up).forEach(([k, v]) => props.updateField(k, v));
    }
  });
  const showToast = props.showToast;
  const projects = profileData.projects || profileData.projectsList || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    technologies: [],
    url: ''
  });

  const [techInput, setTechInput] = useState('');
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingIndex(null);
    setForm({
      name: '',
      description: '',
      technologies: [],
      url: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (idx) => {
    const item = projects[idx];
    setEditingIndex(idx);
    setForm({
      name: item.name || '',
      description: item.description || '',
      technologies: item.technologies || [],
      url: item.url || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteProject = (idx) => {
    const nextList = projects.filter((_, i) => i !== idx);
    onChange({
      ...profileData,
      projects: nextList,
      projectsList: nextList
    });
    if (showToast) showToast('Project entry removed.', 'info');
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Project Name is required.');
      return;
    }

    const entry = {
      id: editingIndex !== null ? projects[editingIndex].id || `proj_${Date.now()}` : `proj_${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim(),
      technologies: form.technologies,
      url: form.url.trim()
    };

    let nextList;
    if (editingIndex !== null) {
      nextList = [...projects];
      nextList[editingIndex] = entry;
    } else {
      nextList = [entry, ...projects];
    }

    onChange({
      ...profileData,
      projects: nextList,
      projectsList: nextList
    });

    setIsModalOpen(false);
    if (showToast) showToast(`Project '${entry.name}' saved!`, 'success');
  };

  const handleAddTech = () => {
    const trimmed = techInput.trim();
    if (!trimmed) return;
    if (!form.technologies.includes(trimmed)) {
      setForm(prev => ({ ...prev, technologies: [...prev.technologies, trimmed] }));
    }
    setTechInput('');
  };

  return (
    <div className="jp-page-content" role="region" aria-label="Projects Section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Projects & Open Source</h3>
        </div>
        <button
          type="button"
          className="jp-btn jp-btn-primary jp-btn-sm"
          onClick={openAddModal}
        >
          <Plus size={15} />
          <span>Add Project</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="jp-empty-state-card">
          <FolderGit2 size={36} color="var(--rp-text-muted, #6b7570)" />
          <h4 className="jp-empty-state-title">No Projects Added Yet</h4>
          <p className="jp-empty-state-desc">
            Showcase key applications, tools, or distributed systems you engineered to stand out during ATS resume tailoring.
          </p>
          <button
            type="button"
            className="jp-btn jp-btn-secondary"
            onClick={openAddModal}
            style={{ marginTop: 6 }}
          >
            <Plus size={15} />
            <span>Add First Project</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {projects.map((proj, idx) => (
            <div key={proj.id || idx} className="jp-entry-card">
              <div className="jp-entry-card-header">
                <div>
                  <h4 className="jp-entry-card-title">{proj.name}</h4>
                  {proj.url && (
                    <a
                      href={proj.url}
                      target="_blank"
                      rel="noreferrer"
                      className="jp-entry-card-meta"
                      style={{ color: 'var(--rp-accent-primary, #2563eb)', textDecoration: 'none' }}
                    >
                      <span>{proj.url}</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div className="jp-entry-card-actions">
                  <button
                    type="button"
                    className="jp-btn-edit-link"
                    onClick={() => openEditModal(idx)}
                    title="Edit project"
                  >
                    <Edit3 size={15} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    className="jp-btn-danger-ghost"
                    onClick={() => handleDeleteProject(idx)}
                    title="Delete project"
                    aria-label={`Delete project ${proj.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {proj.description && (
                <div className="jp-entry-card-body">
                  {proj.description}
                </div>
              )}

              {proj.technologies && proj.technologies.length > 0 && (
                <div className="jp-chips-wrap">
                  {proj.technologies.map((tech, tidx) => (
                    <span key={tidx} className="jp-chip is-primary" style={{ fontSize: 11.5 }}>
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Project Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="proj-modal-title"
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
              <h3 id="proj-modal-title" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                {editingIndex !== null ? 'Edit Project' : 'Add Project'}
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
                <label className="jp-field-label">Project Name *</label>
                <input
                  type="text"
                  className="jp-input"
                  placeholder="Enter project title"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="jp-field-group">
                <label className="jp-field-label">Project / Repository URL</label>
                <input
                  type="url"
                  className="jp-input"
                  placeholder="https://..."
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
              </div>

              <div className="jp-field-group">
                <label className="jp-field-label">Project Description</label>
                <textarea
                  className="jp-textarea"
                  rows={3}
                  placeholder="Describe architectural challenges, scale, design choices, and impact..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="jp-field-group">
                <label className="jp-field-label">Technologies Used</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    className="jp-input"
                    placeholder="Add technology used..."
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTech();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="jp-btn jp-btn-secondary"
                    onClick={handleAddTech}
                    disabled={!techInput.trim()}
                  >
                    Add
                  </button>
                </div>
                {form.technologies.length > 0 && (
                  <div className="jp-chips-wrap">
                    {form.technologies.map((t, tidx) => (
                      <span key={tidx} className="jp-chip is-primary">
                        <span>{t}</span>
                        <button
                          type="button"
                          className="jp-chip-remove"
                          onClick={() => setForm(prev => ({ ...prev, technologies: prev.technologies.filter((_, i) => i !== tidx) }))}
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
                  {editingIndex !== null ? 'Update Project' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
