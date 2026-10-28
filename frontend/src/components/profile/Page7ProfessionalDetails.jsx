import React from 'react';
import { 
  Briefcase, 
  Clock, 
  Calendar, 
  DollarSign, 
  MapPin, 
  FileText, 
  Award,
  Sparkles 
} from 'lucide-react';

const EMPLOYMENT_STATUS_OPTIONS = [
  'Full-time Employed',
  'Serving Notice Period',
  'Actively Looking / Available Immediately',
  'Freelancer / Consultant',
  'Student / Recent Graduate',
  'Career Break'
];

const NOTICE_PERIOD_OPTIONS = [
  'Immediate (0 days)',
  '15 Days or less',
  '30 Days (1 Month)',
  '45 Days',
  '60 Days (2 Months)',
  '90 Days (3 Months)'
];

const EMPLOYMENT_TYPES = [
  'Full-time',
  'Contract / C2H',
  'Part-time',
  'Internship',
  'Freelance'
];

const RELOCATION_OPTIONS = [
  { value: 'yes', label: 'Yes, willing to relocate' },
  { value: 'no', label: 'No, prefer current location / remote only' },
  { value: 'conditional', label: 'Open to discussion / Relocation assistance required' }
];

export default function Page7ProfessionalDetails(props) {
  const profile = props.profile || props.profileData || {};
  const updateField = props.updateField || ((k, v) => {
    if (typeof props.onChange === 'function') props.onChange({ ...profile, [k]: v });
  });
  const employmentTypes = profile.employmentTypes || ['Full-time'];

  const [expError, setExpError] = React.useState('');

  const handleTotalExpChange = (raw) => {
    if (raw === '' || raw === null || raw === undefined) {
      setExpError('');
      updateField('totalExperienceYears', '');
      updateField('experienceYears', '');
      return;
    }
    const str = String(raw).trim();
    if (!/^\d*(\.\d{0,2})?$/.test(str)) return;
    if (str.includes('.')) {
      const parts = str.split('.');
      if (parts[1].length === 2 && parseInt(parts[1], 10) >= 12) {
        setExpError('Months cannot be .12 or higher (.12 = 1 additional year).');
        return;
      }
    }
    setExpError('');
    const val = str === '' ? '' : (parseFloat(str) >= 0 ? str : 0);
    updateField('totalExperienceYears', val);
    updateField('experienceYears', val);
  };

  const handleRelevantExpChange = (raw) => {
    if (raw === '' || raw === null || raw === undefined) {
      updateField('relevantExperienceYears', '');
      return;
    }
    const str = String(raw).trim();
    if (!/^\d*(\.\d{0,2})?$/.test(str)) return;
    const val = str === '' ? '' : (parseFloat(str) >= 0 ? str : 0);
    updateField('relevantExperienceYears', val);
  };

  const toggleEmploymentType = (type) => {
    let next;
    if (employmentTypes.includes(type)) {
      next = employmentTypes.filter(t => t !== type);
      if (next.length === 0) next = [type]; // Keep at least one
    } else {
      next = [...employmentTypes, type];
    }
    updateField('employmentTypes', next);
  };

  const expValue = profile.totalExperienceYears !== undefined && profile.totalExperienceYears !== null && profile.totalExperienceYears !== ''
    ? profile.totalExperienceYears
    : (profile.experienceYears !== undefined && profile.experienceYears !== null && profile.experienceYears !== ''
        ? profile.experienceYears
        : '');

  return (
    <div className="jp-page-content" role="region" aria-label="Professional Details">

      {/* Professional Summary */}
      <div className="jp-card">
        <div className="jp-card-header">
          <FileText className="jp-card-icon" />
          <h3 className="jp-card-title">Professional Summary</h3>
        </div>

        <div className="jp-field-group">
          <textarea
            className="jp-textarea"
            rows={4}
            value={profile.summary || profile.professionalSummary || ''}
            onChange={(e) => {
              updateField('summary', e.target.value);
              updateField('professionalSummary', e.target.value);
            }}
            placeholder="Summarize your domain expertise, technical accomplishments, and key strengths..."
          />
        </div>
      </div>

      {/* Experience Metrics */}
      <div className="jp-card">
        <div className="jp-card-header">
          <Clock className="jp-card-icon" />
          <h3 className="jp-card-title">Experience & Availability</h3>
        </div>

        <div className="jp-form-grid-2">
          <div className="jp-field-group">
            <label className="jp-field-label">Total Experience (Years)</label>
            <input
              type="text"
              inputMode="decimal"
              className={`jp-input ${expError ? 'is-error' : ''}`}
              value={expValue}
              onChange={(e) => handleTotalExpChange(e.target.value)}
              placeholder="0"
            />
            {expError && (
              <span className="jp-error-text" role="alert" style={{ fontSize: 11.5, marginTop: 4 }}>
                {expError}
              </span>
            )}
          </div>

          <div className="jp-field-group">
            <label className="jp-field-label">Relevant Experience (Years)</label>
            <input
              type="text"
              inputMode="decimal"
              className="jp-input"
              value={profile.relevantExperienceYears ?? ''}
              onChange={(e) => handleRelevantExpChange(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="jp-form-grid-2">
          <div className="jp-field-group">
            <label className="jp-field-label">Current Employment Status</label>
            <select
              className="jp-select"
              value={profile.employmentStatus || ''}
              onChange={(e) => updateField('employmentStatus', e.target.value)}
            >
              <option value="">Select current status...</option>
              {EMPLOYMENT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="jp-field-group">
            <label className="jp-field-label">Notice Period</label>
            <select
              className="jp-select"
              value={profile.noticePeriod || ''}
              onChange={(e) => updateField('noticePeriod', e.target.value)}
            >
              <option value="">Select notice period...</option>
              {NOTICE_PERIOD_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="jp-form-grid-2">
          <div className="jp-field-group">
            <label className="jp-field-label">Earliest Joining Date</label>
            <input
              type="date"
              className="jp-input"
              value={profile.earliestJoiningDate || ''}
              onChange={(e) => updateField('earliestJoiningDate', e.target.value)}
            />
          </div>

          <div className="jp-field-group">
            <label className="jp-field-label">Willingness to Relocate</label>
            <select
              className="jp-select"
              value={profile.willingnessToRelocate || 'conditional'}
              onChange={(e) => updateField('willingnessToRelocate', e.target.value)}
            >
              {RELOCATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Compensation & Contract Types */}
      <div className="jp-card">
        <div className="jp-card-header">
          <DollarSign className="jp-card-icon" />
          <h3 className="jp-card-title">Compensation & Engagement Type</h3>
        </div>

        <div className="jp-form-grid-2">
          <div className="jp-field-group">
            <label className="jp-field-label">Current CTC / Salary</label>
            <input
              type="text"
              className="jp-input"
              value={profile.currentCtc || ''}
              onChange={(e) => updateField('currentCtc', e.target.value)}
              placeholder="Enter current CTC"
            />
          </div>

          <div className="jp-field-group">
            <label className="jp-field-label">Expected CTC / Salary</label>
            <input
              type="text"
              className="jp-input"
              value={profile.expectedCtc || ''}
              onChange={(e) => updateField('expectedCtc', e.target.value)}
              placeholder="Enter expected CTC"
            />
          </div>
        </div>

        <div className="jp-field-group">
          <label className="jp-field-label">Target Employment Types</label>
          <div className="jp-chips-wrap" style={{ marginTop: 4 }}>
            {EMPLOYMENT_TYPES.map((type) => {
              const selected = employmentTypes.includes(type);
              return (
                <button
                  type="button"
                  key={type}
                  className={`jp-chip jp-selectable-chip ${selected ? 'is-selected' : ''}`}
                  onClick={() => toggleEmploymentType(type)}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
