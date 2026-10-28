import React, { useState } from 'react';
import { 
  FileCheck, 
  Ban, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Building, 
  Tag, 
  Briefcase, 
  MapPin, 
  HelpCircle 
} from 'lucide-react';

const COMMON_SCREENING_QUESTIONS = [
  {
    id: 'sq-work-auth',
    question: 'Are you legally authorized to work in your country of residence without employer sponsorship?',
    category: 'Work Authorization',
    type: 'select',
    options: ['Yes', 'No', 'Will require sponsorship in future']
  },
  {
    id: 'sq-background-check',
    question: 'Are you willing to undergo a standard pre-employment background verification check?',
    category: 'Compliance',
    type: 'select',
    options: ['Yes', 'No']
  },
  {
    id: 'sq-overtime-weekend',
    question: 'Are you comfortable occasionally participating in on-call rotations or scheduled off-hours releases?',
    category: 'Work Style',
    type: 'select',
    options: ['Yes', 'No', 'Open to discussion']
  },
  {
    id: 'sq-leadership',
    question: 'Do you have direct experience mentoring engineers or leading project squads?',
    category: 'Leadership',
    type: 'select',
    options: ['Yes, 3+ years', 'Yes, 1-2 years', 'Informal mentoring only', 'No']
  }
];

export default function Page8ApplicationPreferences(props) {
  const profile = props.profile || props.profileData || {};
  const updateField = props.updateField || ((k, v) => {
    if (typeof props.onChange === 'function') props.onChange({ ...profile, [k]: v });
  });
  // Screening Answers
  const screeningAnswers = Array.isArray(profile.screeningAnswers) ? profile.screeningAnswers : [];
  
  // Custom Question Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newCategory, setNewCategory] = useState('General');

  // Avoid tags input state
  const [skillInput, setSkillInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  const avoidSkills = profile.avoidSkills || profile.avoidKeywords || [];
  const avoidCompanies = profile.avoidCompanies || [];
  const avoidRoles = profile.avoidRoles || [];
  const avoidLocations = profile.avoidLocations || profile.avoidCities || [];

  // Initialize common screening questions if empty
  const handleLoadCommonQuestions = () => {
    const existingIds = new Set(screeningAnswers.map(q => q.id || q.question));
    const toAdd = COMMON_SCREENING_QUESTIONS.filter(q => !existingIds.has(q.id) && !existingIds.has(q.question)).map(q => ({
      ...q,
      answer: q.options ? q.options[0] : 'Yes'
    }));
    updateField('screeningAnswers', [...screeningAnswers, ...toAdd]);
  };

  const handleUpdateAnswer = (index, value) => {
    const updated = [...screeningAnswers];
    updated[index] = { ...updated[index], answer: value };
    updateField('screeningAnswers', updated);
  };

  const handleDeleteAnswer = (index) => {
    const updated = screeningAnswers.filter((_, i) => i !== index);
    updateField('screeningAnswers', updated);
  };

  const handleAddCustomQuestion = (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    const entry = {
      id: `custom-sq-${Date.now()}`,
      question: newQuestion.trim(),
      answer: newAnswer.trim() || 'Yes',
      category: newCategory.trim() || 'General',
      type: 'text'
    };
    updateField('screeningAnswers', [...screeningAnswers, entry]);
    setNewQuestion('');
    setNewAnswer('');
    setShowAddModal(false);
  };

  // Tag Add / Remove Helpers
  const addTag = (field, currentList, value, clearFn) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (currentList.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
      clearFn('');
      return;
    }
    updateField(field, [...currentList, trimmed]);
    clearFn('');
  };

  const removeTag = (field, currentList, index) => {
    updateField(field, currentList.filter((_, i) => i !== index));
  };

  return (
    <div className="jp-page-content" role="region" aria-label="Application Preferences & Avoid Filters">
      {/* Avoid Preferences Section */}
      <div className="jp-card">
        <div className="jp-card-header">
          <Ban className="jp-card-icon" style={{ color: 'var(--rp-error, #ef4444)' }} />
          <h3 className="jp-card-title">Avoid Preferences</h3>
        </div>

        {/* Avoid Skills */}
        <div className="jp-form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="jp-label">
            <Tag size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Avoid Skills & Technologies
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="jp-input"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag('avoidSkills', avoidSkills, skillInput, setSkillInput);
                }
              }}
              placeholder="Add skill to exclude..."
            />
            <button
              type="button"
              className="jp-btn jp-btn-secondary"
              onClick={() => addTag('avoidSkills', avoidSkills, skillInput, setSkillInput)}
            >
              Add
            </button>
          </div>
          <div className="jp-chips-container" style={{ marginTop: '0.5rem' }}>
            {avoidSkills.map((tag, idx) => (
              <span key={idx} className="jp-chip is-avoid">
                {tag}
                <button
                  type="button"
                  className="jp-chip-remove"
                  onClick={() => removeTag('avoidSkills', avoidSkills, idx)}
                  title={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            {avoidSkills.length === 0 && (
              <span className="jp-hint">No skills excluded. Add any technologies you want to filter out.</span>
            )}
          </div>
        </div>

        {/* Avoid Companies */}
        <div className="jp-form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="jp-label">
            <Building size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Avoid Companies
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="jp-input"
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag('avoidCompanies', avoidCompanies, companyInput, setCompanyInput);
                }
              }}
              placeholder="Add company name to exclude..."
            />
            <button
              type="button"
              className="jp-btn jp-btn-secondary"
              onClick={() => addTag('avoidCompanies', avoidCompanies, companyInput, setCompanyInput)}
            >
              Add
            </button>
          </div>
          <div className="jp-chips-container" style={{ marginTop: '0.5rem' }}>
            {avoidCompanies.map((tag, idx) => (
              <span key={idx} className="jp-chip is-avoid">
                {tag}
                <button
                  type="button"
                  className="jp-chip-remove"
                  onClick={() => removeTag('avoidCompanies', avoidCompanies, idx)}
                  title={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            {avoidCompanies.length === 0 && (
              <span className="jp-hint">No companies excluded. You can add your current employer to protect privacy.</span>
            )}
          </div>
        </div>

        {/* Avoid Roles */}
        <div className="jp-form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="jp-label">
            <Briefcase size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Avoid Roles
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="jp-input"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag('avoidRoles', avoidRoles, roleInput, setRoleInput);
                }
              }}
              placeholder="Add role title to exclude..."
            />
            <button
              type="button"
              className="jp-btn jp-btn-secondary"
              onClick={() => addTag('avoidRoles', avoidRoles, roleInput, setRoleInput)}
            >
              Add
            </button>
          </div>
          <div className="jp-chips-container" style={{ marginTop: '0.5rem' }}>
            {avoidRoles.map((tag, idx) => (
              <span key={idx} className="jp-chip is-avoid">
                {tag}
                <button
                  type="button"
                  className="jp-chip-remove"
                  onClick={() => removeTag('avoidRoles', avoidRoles, idx)}
                  title={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            {avoidRoles.length === 0 && (
              <span className="jp-hint">No roles excluded.</span>
            )}
          </div>
        </div>

        {/* Avoid Cities / Locations */}
        <div className="jp-form-group">
          <label className="jp-label">
            <MapPin size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Avoid Cities or Countries
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="jp-input"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag('avoidLocations', avoidLocations, locationInput, setLocationInput);
                  updateField('avoidCities', [...avoidLocations, locationInput.trim()]);
                }
              }}
              placeholder="Add city or country to exclude..."
            />
            <button
              type="button"
              className="jp-btn jp-btn-secondary"
              onClick={() => {
                addTag('avoidLocations', avoidLocations, locationInput, setLocationInput);
                updateField('avoidCities', [...avoidLocations, locationInput.trim()]);
              }}
            >
              Add
            </button>
          </div>
          <div className="jp-chips-container" style={{ marginTop: '0.5rem' }}>
            {avoidLocations.map((tag, idx) => (
              <span key={idx} className="jp-chip is-avoid">
                {tag}
                <button
                  type="button"
                  className="jp-chip-remove"
                  onClick={() => {
                    removeTag('avoidLocations', avoidLocations, idx);
                    updateField('avoidCities', avoidLocations.filter((_, i) => i !== idx));
                  }}
                  title={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            {avoidLocations.length === 0 && (
              <span className="jp-hint">No locations excluded.</span>
            )}
          </div>
        </div>
      </div>

      {/* Reusable Screening Answers Section */}
      <div className="jp-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div className="jp-card-header" style={{ marginBottom: 0 }}>
            <FileCheck className="jp-card-icon" />
            <h3 className="jp-card-title">Reusable Application Screening Answers</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {screeningAnswers.length === 0 && (
              <button
                type="button"
                className="jp-btn jp-btn-secondary jp-btn-sm"
                onClick={handleLoadCommonQuestions}
              >
                Load Standard Questions
              </button>
            )}
            <button
              type="button"
              className="jp-btn jp-btn-primary jp-btn-sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={14} />
              Add Custom Question
            </button>
          </div>
        </div>

        <div className="jp-alert jp-alert-info" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>Authentic Profile Policy:</strong> Screening answers are strictly verified against your candidate profile. Answers are never fabricated or guessed during automated applications.
          </div>
        </div>

        {screeningAnswers.length === 0 ? (
          <div className="jp-empty-card" style={{ padding: '2rem 1rem' }}>
            <HelpCircle size={32} style={{ color: 'var(--rp-text-muted)', marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 600 }}>No Screening Questions Saved</div>
            <p className="jp-hint" style={{ maxWidth: '400px', margin: '0.25rem auto 1rem' }}>
              Save pre-approved responses to common job application questions (e.g. work authorization, notice period, on-call willingness).
            </p>
            <button
              type="button"
              className="jp-btn jp-btn-secondary"
              onClick={handleLoadCommonQuestions}
            >
              Load Standard Questionnaire
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {screeningAnswers.map((item, idx) => (
              <div 
                key={item.id || idx}
                style={{
                  padding: '1rem',
                  border: '1px solid var(--rp-border, rgba(255,255,255,0.08))',
                  borderRadius: 'var(--rp-radius-md, 8px)',
                  background: 'var(--rp-card-bg, rgba(255,255,255,0.02))'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    {item.category && (
                      <span className="jp-badge jp-badge-subtle" style={{ fontSize: '11px', marginBottom: '0.25rem', display: 'inline-block' }}>
                        {item.category}
                      </span>
                    )}
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.question}</div>
                  </div>
                  <button
                    type="button"
                    className="jp-btn-icon"
                    onClick={() => handleDeleteAnswer(idx)}
                    title="Delete question"
                    style={{ color: 'var(--rp-error, #ef4444)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {item.type === 'select' && item.options ? (
                  <select
                    className="jp-input"
                    value={item.answer || ''}
                    onChange={(e) => handleUpdateAnswer(idx, e.target.value)}
                  >
                    {item.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="jp-input"
                    value={item.answer || ''}
                    onChange={(e) => handleUpdateAnswer(idx, e.target.value)}
                    placeholder="Your verified answer..."
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Custom Question Modal */}
      {showAddModal && (
        <div className="jp-modal-overlay">
          <div className="jp-modal-card">
            <h3 className="jp-modal-title">Add Custom Screening Question</h3>
            <form onSubmit={handleAddCustomQuestion}>
              <div className="jp-form-group">
                <label className="jp-label">Question Text *</label>
                <input
                  type="text"
                  required
                  className="jp-input"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Enter screening question"
                />
              </div>

              <div className="jp-form-group">
                <label className="jp-label">Category</label>
                <input
                  type="text"
                  className="jp-input"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter category (e.g. Technical, Compliance)"
                />
              </div>

              <div className="jp-form-group">
                <label className="jp-label">Your Verified Answer *</label>
                <textarea
                  required
                  rows={2}
                  className="jp-textarea"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Enter your verified answer"
                />
              </div>

              <div className="jp-modal-actions">
                <button
                  type="button"
                  className="jp-btn jp-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="jp-btn jp-btn-primary"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
