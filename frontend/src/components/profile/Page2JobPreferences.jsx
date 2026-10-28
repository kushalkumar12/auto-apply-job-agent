import React, { useState } from 'react';
import { 
  Tag, 
  MapPin, 
  Briefcase, 
  Globe, 
  Laptop, 
  Plus, 
  X, 
  AlertCircle, 
  Info,
  Check,
  Clock
} from 'lucide-react';

const COMMON_SKILLS = [
  'Java', 'Spring Boot', 'Python', 'React', 'Node.js', 'TypeScript', 'JavaScript',
  'Microservices', 'Kafka', 'Redis', 'PostgreSQL', 'SQL', 'MongoDB', 'Docker',
  'Kubernetes', 'AWS', 'GCP', 'Azure', 'Git', 'CI/CD', 'GraphQL', 'REST APIs',
  'Linux', 'System Design', 'FastAPI', 'Golang', 'Next.js', 'TailwindCSS'
];

const COMMON_ROLES = [
  'Software Engineer', 'Backend Developer', 'Full-Stack Developer', 'Frontend Developer',
  'DevOps Engineer', 'Cloud Architect', 'Data Engineer', 'Machine Learning Engineer',
  'Site Reliability Engineer (SRE)', 'Solutions Architect', 'QA Engineer', 'Mobile Developer',
  'Security Engineer', 'Engineering Manager'
];

const COMMON_INDIAN_CITIES = [
  'Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR', 'Noida', 'Gurugram',
  'Chennai', 'Kolkata', 'Ahmedabad', 'Kochi', 'Remote', 'India'
];

const COMMON_GLOBAL_REGIONS = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'Netherlands', 'Singapore',
  'Australia', 'European Union', 'Worldwide Remote'
];

export default function Page2JobPreferences(props) {
  const profileData = props.profileData || props.profile || {};
  const onChange = props.onChange || ((up) => {
    if (typeof props.updateField === 'function') {
      Object.entries(up).forEach(([k, v]) => props.updateField(k, v));
    }
  });
  const updateField = props.updateField;
  const errors = props.errors || {};
  const showToast = props.showToast;

  const [skillInput, setSkillInput] = useState('');
  const [additionalSkillInput, setAdditionalSkillInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [countryInput, setCountryInput] = useState('');

  const primarySkills = profileData.primarySkills || [];
  const additionalSkills = profileData.additionalSkills || [];
  const preferredRoles = profileData.preferredRoles || profileData.selectedRoles || [];
  const preferredLocations = profileData.preferredLocations || profileData.desiredLocations || [];
  
  // Safe default for work modes: pre-select Hybrid and Remote if empty
  const rawWorkModes = profileData.preferredWorkModes || profileData.workFormats;
  const preferredWorkModes = Array.isArray(rawWorkModes) && rawWorkModes.length > 0
    ? rawWorkModes
    : (typeof rawWorkModes === 'object' && rawWorkModes !== null && Object.keys(rawWorkModes).length > 0
        ? Object.keys(rawWorkModes).filter(k => rawWorkModes[k]).map(k => k.charAt(0).toUpperCase() + k.slice(1))
        : ['Hybrid', 'Remote']);

  // Ensure initial default work modes are committed to parent state if not already set
  React.useEffect(() => {
    if (!profileData.preferredWorkModes || !Array.isArray(profileData.preferredWorkModes) || profileData.preferredWorkModes.length === 0) {
      const defaultModes = ['Hybrid', 'Remote'];
      const defaultFormats = { remote: true, hybrid: true, onsite: false };
      onChange({
        ...profileData,
        preferredWorkModes: defaultModes,
        workFormats: defaultFormats
      });
      if (typeof updateField === 'function') {
        updateField('preferredWorkModes', defaultModes);
        updateField('workFormats', defaultFormats);
      }
    }
  }, []);

  const globalOpportunities = Boolean(profileData.globalOpportunities);
  const preferredCountries = profileData.preferredCountries || [];

  // Years of Experience value
  const expYearsValue = profileData.experienceYears !== undefined && profileData.experienceYears !== null
    ? profileData.experienceYears
    : (profileData.totalExperienceYears !== undefined && profileData.totalExperienceYears !== null
        ? profileData.totalExperienceYears
        : (profileData.general?.experienceYears !== undefined && profileData.general?.experienceYears !== null ? profileData.general.experienceYears : ''));

  const [expInputError, setExpInputError] = useState('');

  const handleExperienceChange = (raw) => {
    if (raw === '' || raw === null || raw === undefined) {
      setExpInputError('');
      const updated = {
        ...profileData,
        experienceYears: '',
        totalExperienceYears: ''
      };
      onChange(updated);
      if (typeof updateField === 'function') {
        updateField('experienceYears', '');
        updateField('totalExperienceYears', '');
      }
      return;
    }

    const str = String(raw).trim();
    // Validate format: positive number with at most 2 decimal places
    if (!/^\d*(\.\d{0,2})?$/.test(str)) {
      return; // reject invalid characters or >2 decimal places
    }

    // Check months constraint:
    // in experience notation (Years.Months), months cannot be >= 12 because 1.12 = 2 years
    if (str.includes('.')) {
      const parts = str.split('.');
      const decimalPart = parts[1];
      if (decimalPart.length === 2 && parseInt(decimalPart, 10) >= 12) {
        setExpInputError('Invalid experience: months cannot be .12 or higher (.12 = 1 additional year). Use next full year or .00 to .11 months.');
        return;
      }
    }

    setExpInputError('');
    const num = str === '' ? '' : (parseFloat(str) >= 0 ? str : 0);
    const updated = {
      ...profileData,
      experienceYears: num,
      totalExperienceYears: num
    };
    onChange(updated);
    if (typeof updateField === 'function') {
      updateField('experienceYears', num);
      updateField('totalExperienceYears', num);
    }
  };

  // 1. Primary Skills Handlers (Max 5 enforced)
  const handleAddPrimarySkill = (skill) => {
    const trimmed = (skill || skillInput).trim();
    if (!trimmed) return;
    if (primarySkills.length >= 5) {
      if (showToast) showToast('Maximum 5 Primary Skills allowed. Remove one to add another.', 'warning');
      return;
    }
    const exists = primarySkills.some(s => s.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      if (showToast) showToast(`'${trimmed}' is already in your Primary Skills.`, 'info');
      setSkillInput('');
      return;
    }

    const nextSkills = [...primarySkills, trimmed];
    onChange({
      ...profileData,
      primarySkills: nextSkills,
      primarySkill: nextSkills[0] || ''
    });
    setSkillInput('');
  };

  const handleRemovePrimarySkill = (indexToRemove) => {
    const nextSkills = primarySkills.filter((_, idx) => idx !== indexToRemove);
    onChange({
      ...profileData,
      primarySkills: nextSkills,
      primarySkill: nextSkills[0] || ''
    });
  };

  // 2. Additional Skills Handlers
  const handleAddAdditionalSkill = (skill) => {
    const trimmed = (skill || additionalSkillInput).trim();
    if (!trimmed) return;
    const inPrimary = primarySkills.some(s => s.toLowerCase() === trimmed.toLowerCase());
    const inAdditional = additionalSkills.some(s => s.toLowerCase() === trimmed.toLowerCase());
    if (inPrimary || inAdditional) {
      if (showToast) showToast(`'${trimmed}' is already listed in your skills.`, 'info');
      setAdditionalSkillInput('');
      return;
    }

    const nextAdditional = [...additionalSkills, trimmed];
    onChange({
      ...profileData,
      additionalSkills: nextAdditional,
      skillsList: [...primarySkills, ...nextAdditional].map(s => ({ name: s }))
    });
    setAdditionalSkillInput('');
  };

  const handleRemoveAdditionalSkill = (indexToRemove) => {
    const nextAdditional = additionalSkills.filter((_, idx) => idx !== indexToRemove);
    onChange({
      ...profileData,
      additionalSkills: nextAdditional,
      skillsList: [...primarySkills, ...nextAdditional].map(s => ({ name: s }))
    });
  };

  // 3. Preferred Role Handlers
  const handleAddRole = (role) => {
    const trimmed = (role || roleInput).trim();
    if (!trimmed) return;
    const exists = preferredRoles.some(r => r.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setRoleInput('');
      return;
    }
    const nextRoles = [...preferredRoles, trimmed];
    onChange({
      ...profileData,
      preferredRoles: nextRoles,
      selectedRoles: nextRoles
    });
    setRoleInput('');
  };

  const handleRemoveRole = (roleToRemove) => {
    const nextRoles = preferredRoles.filter(r => r !== roleToRemove);
    onChange({
      ...profileData,
      preferredRoles: nextRoles,
      selectedRoles: nextRoles
    });
  };

  // 4. Preferred Locations Handlers
  const handleAddLocation = (loc) => {
    const trimmed = (loc || locationInput).trim();
    if (!trimmed) return;
    const exists = preferredLocations.some(l => l.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setLocationInput('');
      return;
    }
    const nextLocs = [...preferredLocations, trimmed];
    onChange({
      ...profileData,
      preferredLocations: nextLocs,
      desiredLocations: nextLocs,
      userLocation: nextLocs[0] || ''
    });
    setLocationInput('');
  };

  const handleRemoveLocation = (locToRemove) => {
    const nextLocs = preferredLocations.filter(l => l !== locToRemove);
    onChange({
      ...profileData,
      preferredLocations: nextLocs,
      desiredLocations: nextLocs,
      userLocation: nextLocs[0] || ''
    });
  };

  // 5. Work Mode Toggle
  const handleToggleWorkMode = (mode) => {
    let nextModes;
    if (preferredWorkModes.includes(mode)) {
      nextModes = preferredWorkModes.filter(m => m !== mode);
    } else {
      nextModes = [...preferredWorkModes, mode];
    }
    const formatsObj = {
      onsite: nextModes.includes('Onsite'),
      hybrid: nextModes.includes('Hybrid'),
      remote: nextModes.includes('Remote')
    };
    onChange({
      ...profileData,
      preferredWorkModes: nextModes,
      workFormats: formatsObj
    });
    if (typeof updateField === 'function') {
      updateField('preferredWorkModes', nextModes);
      updateField('workFormats', formatsObj);
    }
  };

  // 6. Global Opportunities Toggle & Countries
  const handleToggleGlobal = (e) => {
    const checked = e.target.checked;
    onChange({
      ...profileData,
      globalOpportunities: checked,
      preferredCountries: checked ? preferredCountries : []
    });
  };

  const handleAddCountry = (c) => {
    const trimmed = (c || countryInput).trim();
    if (!trimmed) return;
    if (preferredCountries.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
      setCountryInput('');
      return;
    }
    onChange({
      ...profileData,
      preferredCountries: [...preferredCountries, trimmed]
    });
    setCountryInput('');
  };

  const handleRemoveCountry = (c) => {
    onChange({
      ...profileData,
      preferredCountries: preferredCountries.filter(item => item !== c)
    });
  };

  return (
    <div className="jp-page-content" role="region" aria-label="Job Search Preferences Form">
      {/* 1. Primary Skills (Mandatory, Max 5) */}
      <div className="jp-field-group">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="jp-field-label" htmlFor="jp-primary-skill-input">
            <span>Primary Skills</span>
            <span className="jp-req-star" aria-hidden="true">*</span>
          </label>
          <span style={{ 
            fontSize: 12, 
            fontWeight: 700, 
            color: primarySkills.length === 5 ? 'var(--rp-semantic-warning, #d97706)' : 'var(--rp-accent-primary, #2563eb)' 
          }}>
            {primarySkills.length} / 5 Selected (Max 5)
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="jp-primary-skill-input"
            type="text"
            className={`jp-input ${errors.primarySkills ? 'is-error' : ''}`}
            placeholder="Add skills (e.g. Java, Python, React)..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onBlur={() => {
              if (skillInput.trim() && primarySkills.length < 5) {
                handleAddPrimarySkill();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddPrimarySkill();
              }
            }}
            disabled={primarySkills.length >= 5}
            aria-label="Add Primary Skill"
          />
          <button
            type="button"
            className="jp-btn jp-btn-secondary"
            onClick={() => handleAddPrimarySkill()}
            disabled={!skillInput.trim() || primarySkills.length >= 5}
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>

        {errors.primarySkills && (
          <span className="jp-error-text" role="alert">
            <AlertCircle size={13} />
            <span>{errors.primarySkills}</span>
          </span>
        )}

        {/* Selected Primary Skills Chips */}
        {primarySkills.length > 0 && (
          <div className="jp-chips-wrap">
            {primarySkills.map((sk, idx) => (
              <span key={idx} className="jp-chip is-primary">
                <span>{sk}</span>
                <button
                  type="button"
                  className="jp-chip-remove"
                  onClick={() => handleRemovePrimarySkill(idx)}
                  aria-label={`Remove primary skill ${sk}`}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Quick Suggestions */}
        {primarySkills.length < 5 && (
          <div style={{ marginTop: 8 }}>
            <div className="jp-chips-wrap" style={{ marginTop: 4 }}>
              {COMMON_SKILLS.filter(s => !primarySkills.some(ps => ps.toLowerCase() === s.toLowerCase())).slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="jp-chip jp-selectable-chip"
                  onClick={() => handleAddPrimarySkill(s)}
                >
                  <Plus size={12} />
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Total Years of Experience (Mandatory, critical for Job Explorer matching) */}
      <div className="jp-field-group">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label className="jp-field-label" htmlFor="jp-exp-years" style={{ margin: 0 }}>
            <span>Total Years of Experience</span>
            <span className="jp-req-star" aria-hidden="true">*</span>
          </label>
          <span style={{ 
            fontSize: 13, 
            fontWeight: 700, 
            color: '#0f172a' 
          }}>
            {expYearsValue !== '' ? `${expYearsValue} Year${Number(expYearsValue) === 1 ? '' : 's'}` : '0 Years'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            id="jp-exp-years"
            type="text"
            inputMode="decimal"
            className={`jp-input ${errors.experienceYears || expInputError ? 'is-error' : ''}`}
            style={{ width: 140, flexShrink: 0 }}
            placeholder="0"
            value={expYearsValue}
            onChange={(e) => handleExperienceChange(e.target.value)}
            aria-label="Years of Experience"
            aria-required="true"
          />
          <div className="jp-chips-wrap" style={{ marginTop: 0, gap: 8, alignItems: 'center' }}>
            {[
              { label: 'Fresher (0 yr)', val: 0 },
              { label: '1 yr', val: 1 },
              { label: '2 yrs', val: 2 },
              { label: '3 yrs', val: 3 },
              { label: '5 yrs', val: 5 },
              { label: '8 yrs', val: 8 },
              { label: '10+ yrs', val: 10 }
            ].map(opt => (
              <button
                key={opt.val}
                type="button"
                className={`jp-chip jp-selectable-chip ${Number(expYearsValue) === opt.val && expYearsValue !== '' ? 'is-selected' : ''}`}
                onClick={() => handleExperienceChange(String(opt.val))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {(errors.experienceYears || expInputError) && (
          <span className="jp-error-text" role="alert" style={{ marginTop: 6 }}>
            <AlertCircle size={13} />
            <span>{expInputError || errors.experienceYears}</span>
          </span>
        )}
      </div>

      {/* 3. Preferred Role (Mandatory) */}
      <div className="jp-field-group">
        <label className="jp-field-label" htmlFor="jp-role-input">
          <span>Preferred Role(s)</span>
          <span className="jp-req-star" aria-hidden="true">*</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="jp-role-input"
            type="text"
            className={`jp-input ${errors.preferredRoles ? 'is-error' : ''}`}
            placeholder="Add target roles (e.g. Backend Developer)..."
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            onBlur={() => {
              if (roleInput.trim()) {
                handleAddRole();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddRole();
              }
            }}
          />
          <button
            type="button"
            className="jp-btn jp-btn-secondary"
            onClick={() => handleAddRole()}
            disabled={!roleInput.trim()}
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>

        {errors.preferredRoles && (
          <span className="jp-error-text" role="alert">
            <AlertCircle size={13} />
            <span>{errors.preferredRoles}</span>
          </span>
        )}

        {/* Selected Roles Chips */}
        {preferredRoles.length > 0 && (
          <div className="jp-chips-wrap">
            {preferredRoles.map((r, idx) => (
              <span key={idx} className="jp-chip is-primary">
                <Briefcase size={13} />
                <span>{r}</span>
                <button
                  type="button"
                  className="jp-chip-remove"
                  onClick={() => handleRemoveRole(r)}
                  aria-label={`Remove role ${r}`}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Common Role Suggestions */}
        <div className="jp-chips-wrap" style={{ marginTop: 4 }}>
          {COMMON_ROLES.filter(r => !preferredRoles.includes(r)).slice(0, 7).map((r) => (
            <button
              key={r}
              type="button"
              className="jp-chip jp-selectable-chip"
              onClick={() => handleAddRole(r)}
            >
              <Plus size={12} />
              <span>{r}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Preferred Locations (Mandatory, Multiple allowed) */}
      <div className="jp-field-group">
        <label className="jp-field-label" htmlFor="jp-loc-input">
          <span>Preferred Locations</span>
          <span className="jp-req-star" aria-hidden="true">*</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="jp-loc-input"
            type="text"
            className={`jp-input ${errors.preferredLocations ? 'is-error' : ''}`}
            placeholder="Add locations (e.g. Bengaluru, Remote)..."
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onBlur={() => {
              if (locationInput.trim()) {
                handleAddLocation();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddLocation();
              }
            }}
          />
          <button
            type="button"
            className="jp-btn jp-btn-secondary"
            onClick={() => handleAddLocation()}
            disabled={!locationInput.trim()}
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>

        {errors.preferredLocations && (
          <span className="jp-error-text" role="alert">
            <AlertCircle size={13} />
            <span>{errors.preferredLocations}</span>
          </span>
        )}

        {/* Selected Location Chips */}
        {preferredLocations.length > 0 && (
          <div className="jp-chips-wrap">
            {preferredLocations.map((loc, idx) => (
              <span key={idx} className="jp-chip is-primary">
                <MapPin size={13} />
                <span>{loc}</span>
                <button
                  type="button"
                  className="jp-chip-remove"
                  onClick={() => handleRemoveLocation(loc)}
                  aria-label={`Remove location ${loc}`}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Quick Indian Cities */}
        <div className="jp-chips-wrap" style={{ marginTop: 4 }}>
          {COMMON_INDIAN_CITIES.filter(c => !preferredLocations.includes(c)).map((c) => (
            <button
              key={c}
              type="button"
              className="jp-chip jp-selectable-chip"
              onClick={() => handleAddLocation(c)}
            >
              <Plus size={12} />
              <span>{c}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Preferred Work Mode (Mandatory, Multi-select: Onsite, Hybrid, Remote) */}
      <div className="jp-field-group">
        <label className="jp-field-label">
          <span>Preferred Work Mode</span>
          <span className="jp-req-star" aria-hidden="true">*</span>
        </label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          {[
            { id: 'Remote', label: 'Remote' },
            { id: 'Hybrid', label: 'Hybrid' },
            { id: 'Onsite', label: 'Onsite' }
          ].map((mode) => {
            const isSelected = preferredWorkModes.includes(mode.id);
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleToggleWorkMode(mode.id)}
                className={`jp-chip jp-selectable-chip ${isSelected ? 'is-selected' : ''}`}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: isSelected ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#ffffff' : '#ffffff',
                  color: '#0f172a'
                }}
                aria-pressed={isSelected}
              >
                <span style={{ 
                  width: 17, 
                  height: 17, 
                  borderRadius: 4, 
                  border: isSelected ? 'none' : '1px solid #cbd5e1',
                  backgroundColor: isSelected ? '#0f172a' : '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  {isSelected && <Check size={12} strokeWidth={3.5} />}
                </span>
                <span style={{ fontWeight: isSelected ? 700 : 500 }}>{mode.label}</span>
              </button>
            );
          })}
        </div>

        {errors.preferredWorkModes && (
          <span className="jp-error-text" role="alert">
            <AlertCircle size={13} />
            <span>{errors.preferredWorkModes}</span>
          </span>
        )}
      </div>

      {/* 5. Additional Skills (Optional) */}
      <div className="jp-field-group">
        <label className="jp-field-label" htmlFor="jp-add-skill-input">
          <span>Additional Technical Skills</span>
          <span className="jp-opt-badge">Optional</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="jp-add-skill-input"
            type="text"
            className="jp-input"
            placeholder="Add tools, databases, or libraries (e.g. Docker, Redis)..."
            value={additionalSkillInput}
            onChange={(e) => setAdditionalSkillInput(e.target.value)}
            onBlur={() => {
              if (additionalSkillInput.trim()) {
                handleAddAdditionalSkill();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddAdditionalSkill();
              }
            }}
          />
          <button
            type="button"
            className="jp-btn jp-btn-secondary"
            onClick={() => handleAddAdditionalSkill()}
            disabled={!additionalSkillInput.trim()}
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>

        {additionalSkills.length > 0 && (
          <div className="jp-chips-wrap">
            {additionalSkills.map((sk, idx) => (
              <span key={idx} className="jp-chip">
                <span>{sk}</span>
                <button
                  type="button"
                  className="jp-chip-remove"
                  onClick={() => handleRemoveAdditionalSkill(idx)}
                  aria-label={`Remove additional skill ${sk}`}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 6. Global Opportunities (Optional) */}
      <div className="jp-field-group" style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '16px 20px',
        marginTop: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
              background: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}>
              <Globe size={20} strokeWidth={1.8} />
            </div>
            <div>
              <label htmlFor="jp-global-toggle" style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
                Look for Global opportunities
              </label>
            </div>
          </div>
          <input
            id="jp-global-toggle"
            type="checkbox"
            checked={globalOpportunities}
            onChange={handleToggleGlobal}
            style={{ width: 19, height: 19, cursor: 'pointer', accentColor: '#2563eb' }}
          />
        </div>
      </div>
    </div>
  );
}
