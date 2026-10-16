import React, { useState, useEffect } from 'react';
import { 
  User, 
  Contact, 
  MapPin, 
  Tag, 
  Ban, 
  Briefcase, 
  GraduationCap, 
  FileText, 
  Settings, 
  Check, 
  X, 
  Trash2, 
  Edit3, 
  Camera, 
  ArrowRight, 
  Search,
  Plus,
  GitBranch,
  Database,
  Layers,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { apiService } from '../services/api';
import './ProfileView.css';

// Initial specializations available for selection
const ALL_ROLES = [
  'Software Engineering', 'Backend', 'Full-Stack', 'Frontend', 'Mobile', 
  'DevOps', 'SRE', 'Network Engineering', 'Data Engineering', 'Data Science', 
  'Data Analytics', 'ML / AI', 'AI Engineering', 'QA', 'Security', 
  'Hardware', 'Embedded', 'Blockchain', 'Architecture', 'Design', 
  'Creative & Media', 'Engineering Design', 'Industrial Engineering', 
  'Health & Safety (HSE)', 'Product', 'Project Management', 'Management', 
  'Healthcare', 'Skilled Trades', 'Retail', 'Hospitality', 'Logistics', 
  'Education', 'Personal Services', 'Administration', 'Marketing', 'Sales', 
  'Support', 'Business Analysis', 'Solutions Engineering', 'Developer Relations', 
  'Technical Writing', 'Recruiting', 'HR', 'Finance', 'Legal'
];

const SENIORITY_LEVELS = [
  'Intern', 'Junior', 'Middle', 'Senior', 'Lead', 'Staff', 'Principal', 'C-level'
];

const INITIAL_SKILLS = [
  { name: 'java', icon: 'java' },
  { name: 'spring', icon: 'spring' },
  { name: 'microservices', icon: null },
  { name: 'api-design', icon: null },
  { name: 'API', icon: null },
  { name: 'hibernate', icon: null },
  { name: 'jpa', icon: null },
  { name: 'SQL', icon: 'database' },
  { name: 'postgresql', icon: 'database' },
  { name: 'kafka', icon: null },
  { name: 'redis', icon: 'redis' },
  { name: 'aws', icon: 'cloud' },
  { name: 'docker', icon: 'docker' },
  { name: 'kubernetes', icon: 'k8s' },
  { name: 'git', icon: 'git' },
  { name: 'junit', icon: null },
  { name: 'mockito', icon: null },
  { name: 'jwt', icon: null },
  { name: 'oauth', icon: null },
  { name: 'graphql', icon: null },
  { name: 'rest', icon: null },
  { name: 'react', icon: 'react' },
  { name: 'distributed-systems', icon: null }
];

const REGIONS = [
  'Worldwide', 'North America', 'LATAM', 'Europe', 'UK', 'MENA', 'Africa', 'APAC', 'CIS'
];

const SAMPLE_COUNTRIES = [
  { code: 'AF', flag: '🇦🇫', name: 'Afghanistan' },
  { code: 'AX', flag: '🇦🇽', name: 'Åland Islands' },
  { code: 'AL', flag: '🇦🇱', name: 'Albania' },
  { code: 'DZ', flag: '🇩🇿', name: 'Algeria' },
  { code: 'AS', flag: '🇦🇸', name: 'American Samoa' },
  { code: 'AD', flag: '🇦🇩', name: 'Andorra' },
  { code: 'AO', flag: '🇦🇴', name: 'Angola' },
  { code: 'AI', flag: '🇦🇮', name: 'Anguilla' }
];

const SUB_TABS = [
  { id: 'profile', label: 'Profile', icon: User, title: 'Profile', tagline: 'Your CV, skills and role — measured against live market demand.' },
  { id: 'contacts', label: 'Contacts', icon: Contact, title: 'Contacts', tagline: 'Edit without re-uploading. A new CV parse only fills empty fields — it will not overwrite what you typed.' },
  { id: 'location', label: 'Location', icon: MapPin, title: 'Location', tagline: 'Set where and how you want to work — remote, hybrid, or on-site.' },
  { id: 'skills', label: 'Skills', icon: Tag, title: 'Skills', tagline: 'List your skills to compare your profile against live market demand.' },
  { id: 'avoid', label: 'Avoid', icon: Ban, title: 'Avoid', tagline: 'Filter out specific technologies, job portals, or companies you do not want to see.' },
  { id: 'experience', label: 'Experience', icon: Briefcase, title: 'Experience', tagline: 'Your professional work history and previous positions.' },
  { id: 'education', label: 'Education', icon: GraduationCap, title: 'Education', tagline: 'Degrees, certifications, and educational background.' },
  { id: 'screening', label: 'Screening answers', icon: FileText, title: 'Screening answers', tagline: 'Pre-filled answers for quick job application questionnaires.' },
  { id: 'settings', label: 'Settings', icon: Settings, title: 'Settings', tagline: 'Manage your profile visibility, notification, and parsing preferences.' }
];

export default function ProfileView() {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [setupDismissed, setSetupDismissed] = useState(false);

  // Profile data state
  const [selectedRoles, setSelectedRoles] = useState(['Software Engineering', 'Backend', 'Full-Stack']);
  const [roleSearch, setRoleSearch] = useState('');
  const [selectedLevels, setSelectedLevels] = useState(['Middle', 'Senior']);
  const [summary, setSummary] = useState('');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');

  // Skills state
  const [skillsList, setSkillsList] = useState(INITIAL_SKILLS);
  const [skillSearch, setSkillSearch] = useState('');

  // Location state
  const [workFormats, setWorkFormats] = useState({ remote: true, hybrid: true, onsite: true });
  const [userLocation, setUserLocation] = useState('Hyderabad, India');
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState(SAMPLE_COUNTRIES);
  const [openToRelocation, setOpenToRelocation] = useState(false);

  // Contacts state
  const [contacts, setContacts] = useState({
    fullName: 'Kushal Kumar Pulakanti',
    email: 'kushalkumar.pulakanti@gmail.com',
    phone: '+91 9949632198',
    location: 'Hyderabad, India',
    links: `https://www.linkedin.com/in/kushalkumarpulakanti/\nhttps://github.com/kushalkumar12`
  });
  const [savedContactsToast, setSavedContactsToast] = useState(false);

  // Avoid state
  const [avoidSkills, setAvoidSkills] = useState([]);
  const [avoidSources, setAvoidSources] = useState([]);
  const [avoidCompanies, setAvoidCompanies] = useState([]);
  const [avoidSkillInput, setAvoidSkillInput] = useState('');
  const [avoidSourceInput, setAvoidSourceInput] = useState('');
  const [avoidCompanyInput, setAvoidCompanyInput] = useState('');

  // Experience & Education (Mock states for tabs)
  const [experiences, setExperiences] = useState([
    {
      title: 'Senior Java Backend Engineer',
      company: 'Enterprise Solutions Inc.',
      location: 'Hyderabad, India (Hybrid)',
      period: 'Jan 2023 – Present',
      description: 'Architecting high-throughput microservices using Spring Boot 3, Kafka message brokers, and AWS infrastructure handling 120M+ API requests/day.'
    },
    {
      title: 'Java Software Engineer',
      company: 'TechFlow Systems',
      location: 'Hyderabad, India',
      period: 'Jul 2021 – Dec 2022',
      description: 'Engineered RESTful services, optimized PostgreSQL database queries, and implemented Redis caching layer.'
    }
  ]);

  const [educationList, setEducationList] = useState([
    {
      degree: 'Bachelor of Technology in Computer Science',
      institution: 'Jawaharlal Nehru Technological University',
      period: '2017 – 2021',
      grade: 'First Class with Distinction'
    }
  ]);

  // Load profile from API on mount
  useEffect(() => {
    async function fetchProfileData() {
      try {
        const data = await apiService.getProfile();
        if (data && data.general) {
          if (data.general.firstName) {
            setContacts(prev => ({
              ...prev,
              fullName: `${data.general.firstName} ${data.general.lastName || ''}`.trim(),
              email: data.general.email || prev.email,
              phone: data.general.phone || prev.phone,
              location: `${data.general.city || 'Hyderabad'}, ${data.general.country || 'India'}`
            }));
          }
          if (data.general.bio) {
            setSummary(data.general.bio);
          }
        }
      } catch (err) {
        console.warn('Profile sync fallback:', err);
      }
    }
    fetchProfileData();
  }, []);

  // Handlers for Roles
  const toggleRole = (role) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(prev => prev.filter(r => r !== role));
    } else {
      if (selectedRoles.length < 10) {
        setSelectedRoles(prev => [...prev, role]);
      }
    }
  };

  // Handlers for Levels
  const toggleLevel = (lvl) => {
    if (selectedLevels.includes(lvl)) {
      setSelectedLevels(prev => prev.filter(l => l !== lvl));
    } else {
      setSelectedLevels(prev => [...prev, lvl]);
    }
  };

  // Handlers for Skills
  const removeSkill = (skillToRemove) => {
    setSkillsList(prev => prev.filter(s => s.name !== skillToRemove));
  };

  const handleAddSkill = (e) => {
    if (e.key === 'Enter' && skillSearch.trim()) {
      e.preventDefault();
      const trimmed = skillSearch.trim().toLowerCase();
      if (!skillsList.some(s => s.name.toLowerCase() === trimmed)) {
        setSkillsList(prev => [...prev, { name: trimmed, icon: null }]);
      }
      setSkillSearch('');
    }
  };

  // Handlers for Contacts
  const handleSaveContacts = async () => {
    setSavedContactsToast(true);
    setTimeout(() => setSavedContactsToast(false), 3000);
    try {
      await apiService.updateProfile({
        general: {
          fullName: contacts.fullName,
          email: contacts.email,
          phone: contacts.phone,
          city: contacts.location,
          links: contacts.links
        }
      });
    } catch (err) {
      console.warn('Contacts saved locally:', err);
    }
  };

  // Handlers for Avoid
  const handleAddAvoid = (type, val, setter, clear) => {
    if (val.trim()) {
      setter(prev => [...prev, val.trim()]);
      clear('');
    }
  };

  const removeAvoid = (type, item, setter) => {
    setter(prev => prev.filter(i => i !== item));
  };

  // Filtered Roles
  const filteredRoles = ALL_ROLES.filter(r => 
    r.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const currentTab = SUB_TABS.find(t => t.id === activeSubTab) || SUB_TABS[0];

  return (
    <div className="profile-container">
      {/* 1. Left Vertical Navigation Sidebar (Exact Match to User Reference) */}
      <aside className="profile-sidebar-nav" aria-label="Profile Sections">
        <div className="profile-nav-list">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button 
                key={tab.id}
                type="button"
                className={`profile-nav-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => setActiveSubTab(tab.id)}
              >
                <Icon size={16} className="profile-nav-icon" />
                <span className="profile-nav-text">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* 2. Right Main Scrollable Content Area */}
      <div className="profile-main-panel">
        {/* Header Section */}
        <header className="profile-header">
          <h1 className="profile-title">{currentTab.title}</h1>
          <p className="profile-tagline">{currentTab.tagline}</p>
        </header>

        {/* Onboarding Setup Progress Card (Shown on Profile tab) */}
        {activeSubTab === 'profile' && !setupDismissed && (
          <div className="setup-banner-card">
            <div className="setup-banner-header">
              <span className="setup-banner-title">Finish setting up your account</span>
              <span className="setup-banner-progress">4 of 5 done</span>
            </div>

            <div className="setup-checklist">
              <div className="setup-item is-completed">
                <span className="setup-check-icon"><Check size={14} strokeWidth={2.5} /></span>
                <span>Add your CV</span>
              </div>
              <div className="setup-item is-completed">
                <span className="setup-check-icon"><Check size={14} strokeWidth={2.5} /></span>
                <span>Say what you do, and at what level</span>
              </div>
              <div className="setup-item is-completed">
                <span className="setup-check-icon"><Check size={14} strokeWidth={2.5} /></span>
                <span>List your skills</span>
              </div>
              <div className="setup-item is-completed">
                <span className="setup-check-icon"><Check size={14} strokeWidth={2.5} /></span>
                <span>Set where and how you want to work</span>
              </div>
              <div className="setup-item is-pending">
                <span className="setup-pending-icon"></span>
                <span>Get new matches sent to you</span>
                <div className="setup-item-actions">
                  <button className="setup-action-btn" title="Setup alert matches">
                    <ArrowRight size={13} />
                  </button>
                  <button 
                    className="setup-action-btn" 
                    onClick={() => setSetupDismissed(true)} 
                    title="Dismiss checklist"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 1: PROFILE ===================== */}
        {activeSubTab === 'profile' && (
          <section className="profile-section-content">
          {/* Your Photo */}
          <div className="section-block">
            <h2 className="block-title">Your photo</h2>
            <div className="photo-row">
              <div className="avatar-wrapper">
                <div className="avatar-placeholder">
                  <User size={34} className="avatar-svg" />
                </div>
                <button className="avatar-camera-badge" title="Change photo">
                  <Camera size={11} />
                </button>
              </div>
              <p className="block-help-text">
                JPEG, PNG, or WebP up to 6 MB · cropped to a square. Printed only by the CV templates that show a photo.
              </p>
            </div>
          </div>

          {/* Your CV */}
          <div className="section-block">
            <h2 className="block-title">Your CV</h2>
            <div className="cv-upload-box">
              <div className="cv-badge-row">
                <div className="cv-check-circle">
                  <Check size={18} strokeWidth={3} />
                </div>
                <span className="cv-upload-text">Uploaded 13 Oct 2026</span>
              </div>
              <div className="cv-actions-row">
                <button className="btn-cv-replace">Replace</button>
                <button className="btn-cv-delete">
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
            <p className="block-help-text">
              PDF with selectable text, up to 8 MB · adds new skills to your profile; the file is stored to score its readiness.
            </p>
          </div>

          {/* Summary */}
          <div className="section-block">
            <div className="block-header-flex">
              <h2 className="block-title">Summary</h2>
              <button 
                className="btn-text-action" 
                onClick={() => {
                  if (isEditingSummary) {
                    setSummary(summaryDraft);
                    setIsEditingSummary(false);
                  } else {
                    setSummaryDraft(summary);
                    setIsEditingSummary(true);
                  }
                }}
              >
                <Edit3 size={12} />
                <span>{isEditingSummary ? 'Save' : 'Edit'}</span>
              </button>
            </div>

            {isEditingSummary ? (
              <div className="summary-edit-wrap">
                <textarea 
                  className="summary-textarea"
                  rows={3}
                  value={summaryDraft}
                  onChange={(e) => setSummaryDraft(e.target.value)}
                  placeholder="Java Backend Engineer specializing in Distributed Systems, Microservices, and Cloud Architectures..."
                  autoFocus
                />
              </div>
            ) : (
              <p className="summary-empty-text">
                {summary ? summary : 'Nothing here yet — add a headline or summary.'}
              </p>
            )}
          </div>

          {/* Roles */}
          <div className="section-block">
            <div className="block-header-flex">
              <h2 className="block-title">Roles</h2>
              <span className="role-counter">{selectedRoles.length}/10</span>
            </div>

            <div className="search-input-wrap">
              <input 
                type="text" 
                className="field-input-box" 
                placeholder="Search specializations"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
              />
            </div>

            <div className="chips-flex-wrap">
              {filteredRoles.map(role => {
                const isSelected = selectedRoles.includes(role);
                return (
                  <button 
                    key={role} 
                    className={`pill-chip ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => toggleRole(role)}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level */}
          <div className="section-block">
            <div className="block-header-flex">
              <h2 className="block-title">Level</h2>
              <span className="level-help-text">Pick every level you'd take</span>
            </div>

            <div className="chips-flex-wrap">
              {SENIORITY_LEVELS.map(lvl => {
                const isSelected = selectedLevels.includes(lvl);
                return (
                  <button 
                    key={lvl} 
                    className={`pill-chip ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => toggleLevel(lvl)}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===================== TAB 2: CONTACTS ===================== */}
      {activeSubTab === 'contacts' && (
        <section className="profile-section-content">
          <div className="section-block">
            <h2 className="block-title">Your contacts</h2>
            <p className="block-help-text" style={{ marginBottom: 16 }}>
              Edit without re-uploading. A new CV parse only fills empty fields — it will not overwrite what you typed.
            </p>

            <div className="contacts-two-col-grid">
              <div className="form-item">
                <label className="field-meta-label">Full name</label>
                <input 
                  type="text" 
                  className="field-input-box" 
                  placeholder="Full name"
                  value={contacts.fullName}
                  onChange={(e) => setContacts({ ...contacts, fullName: e.target.value })}
                />
              </div>

              <div className="form-item">
                <label className="field-meta-label">Email</label>
                <input 
                  type="email" 
                  className="field-input-box" 
                  placeholder="Email"
                  value={contacts.email}
                  onChange={(e) => setContacts({ ...contacts, email: e.target.value })}
                />
              </div>

              <div className="form-item">
                <label className="field-meta-label">Phone</label>
                <input 
                  type="text" 
                  className="field-input-box" 
                  placeholder="Phone"
                  value={contacts.phone}
                  onChange={(e) => setContacts({ ...contacts, phone: e.target.value })}
                />
              </div>

              <div className="form-item">
                <label className="field-meta-label">Location</label>
                <input 
                  type="text" 
                  className="field-input-box" 
                  placeholder="Location"
                  value={contacts.location}
                  onChange={(e) => setContacts({ ...contacts, location: e.target.value })}
                />
              </div>
            </div>

            <div className="form-item" style={{ marginTop: 18 }}>
              <label className="field-meta-label">Links (one per line)</label>
              <textarea 
                className="field-textarea-box" 
                rows={4}
                value={contacts.links}
                onChange={(e) => setContacts({ ...contacts, links: e.target.value })}
                placeholder="https://www.linkedin.com/in/...&#10;https://github.com/..."
              />
            </div>

            <div style={{ marginTop: 20 }}>
              <button className="btn-primary-olive" onClick={handleSaveContacts}>
                Save contacts
              </button>
            </div>

            {savedContactsToast && (
              <div className="contacts-toast-banner">
                <CheckCircle2 size={15} />
                <span>Contacts saved successfully!</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===================== TAB 3: LOCATION ===================== */}
      {activeSubTab === 'location' && (
        <section className="profile-section-content">
          <p className="block-help-text" style={{ marginBottom: 20 }}>
            All optional — used to tailor your job filters.
          </p>

          {/* Work format */}
          <div className="section-block">
            <h2 className="block-title">Work format</h2>
            <div className="chips-flex-wrap">
              <button 
                className={`pill-chip ${workFormats.remote ? 'is-selected' : ''}`}
                onClick={() => setWorkFormats(p => ({ ...p, remote: !p.remote }))}
              >
                Remote
              </button>
              <button 
                className={`pill-chip ${workFormats.hybrid ? 'is-selected' : ''}`}
                onClick={() => setWorkFormats(p => ({ ...p, hybrid: !p.hybrid }))}
              >
                Hybrid
              </button>
              <button 
                className={`pill-chip ${workFormats.onsite ? 'is-selected' : ''}`}
                onClick={() => setWorkFormats(p => ({ ...p, onsite: !p.onsite }))}
              >
                On-site
              </button>
            </div>
          </div>

          {/* Where you're based */}
          <div className="section-block">
            <h2 className="block-title">Where you're based</h2>
            <input 
              type="text" 
              className="field-input-box" 
              value={userLocation}
              onChange={(e) => setUserLocation(e.target.value)}
              placeholder="City, Country"
            />
          </div>

          {/* Remote Regions */}
          <div className="section-block">
            <h2 className="block-title">Remote — regions you can work for (empty = worldwide)</h2>
            <div className="chips-flex-wrap">
              {REGIONS.map(reg => {
                const isSelected = selectedRegions.includes(reg);
                return (
                  <button 
                    key={reg}
                    className={`pill-chip ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedRegions(prev => prev.filter(r => r !== reg));
                      } else {
                        setSelectedRegions(prev => [...prev, reg]);
                      }
                    }}
                  >
                    {reg}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Specific Countries */}
          <div className="section-block">
            <h2 className="block-title">Add specific countries</h2>
            <div className="countries-input-container">
              {selectedCountries.map(c => (
                <span key={c.code} className="country-chip">
                  <span className="flag-emoji">{c.flag}</span>
                  <span>{c.name}</span>
                  <button 
                    className="chip-remove-btn"
                    onClick={() => setSelectedCountries(prev => prev.filter(x => x.code !== c.code))}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <p className="block-help-text" style={{ marginTop: 6 }}>
              +241 more — type to search
            </p>
          </div>

          {/* Open to Relocation */}
          <div className="section-block">
            <label className="checkbox-label-row">
              <input 
                type="checkbox" 
                className="custom-checkbox"
                checked={openToRelocation}
                onChange={(e) => setOpenToRelocation(e.target.checked)}
              />
              <span className="checkbox-text">Open to relocation</span>
            </label>
          </div>
        </section>
      )}

      {/* ===================== TAB 4: SKILLS ===================== */}
      {activeSubTab === 'skills' && (
        <section className="profile-section-content">
          <div className="section-block">
            <div className="block-header-flex">
              <h2 className="block-title">Skills</h2>
              <span className="role-counter">{skillsList.length}</span>
            </div>

            <div className="search-input-wrap">
              <input 
                type="text" 
                className="field-input-box" 
                placeholder="Search skills"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                onKeyDown={handleAddSkill}
              />
            </div>

            <div className="chips-flex-wrap" style={{ marginTop: 14 }}>
              {skillsList.map(skill => (
                <div key={skill.name} className="skill-pill-tag">
                  {skill.icon === 'spring' && <span className="skill-icon-leaf">🍃</span>}
                  {skill.icon === 'git' && <GitBranch size={12} className="skill-svg-icon" />}
                  {skill.icon === 'database' && <Database size={12} className="skill-svg-icon" />}
                  {skill.icon === 'redis' && <span className="skill-icon-red">🗄️</span>}
                  {skill.icon === 'docker' && <span className="skill-icon-whale">🐳</span>}
                  {skill.icon === 'k8s' && <span className="skill-icon-helm">☸️</span>}
                  {skill.icon === 'react' && <span className="skill-icon-atom">⚛️</span>}
                  <span className="skill-name">{skill.name}</span>
                  <button 
                    className="skill-remove-btn" 
                    onClick={() => removeSkill(skill.name)}
                    title={`Remove ${skill.name}`}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== TAB 5: AVOID ===================== */}
      {activeSubTab === 'avoid' && (
        <section className="profile-section-content">
          {/* Skills to Avoid */}
          <div className="section-block">
            <div className="block-header-flex">
              <h2 className="block-title">Skills to avoid</h2>
              <span className="role-counter">{avoidSkills.length}</span>
            </div>
            <input 
              type="text" 
              className="field-input-box" 
              placeholder="Search skills to exclude"
              value={avoidSkillInput}
              onChange={(e) => setAvoidSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddAvoid('skills', avoidSkillInput, setAvoidSkills, setAvoidSkillInput);
              }}
            />
            {avoidSkills.length > 0 && (
              <div className="chips-flex-wrap" style={{ marginTop: 10 }}>
                {avoidSkills.map(item => (
                  <span key={item} className="avoid-chip">
                    {item}
                    <button onClick={() => removeAvoid('skills', item, setAvoidSkills)}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sources to Avoid */}
          <div className="section-block">
            <div className="block-header-flex">
              <h2 className="block-title">Sources to avoid</h2>
              <span className="role-counter">{avoidSources.length}</span>
            </div>
            <input 
              type="text" 
              className="field-input-box" 
              placeholder="Search sources to exclude"
              value={avoidSourceInput}
              onChange={(e) => setAvoidSourceInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddAvoid('sources', avoidSourceInput, setAvoidSources, setAvoidSourceInput);
              }}
            />
            {avoidSources.length > 0 && (
              <div className="chips-flex-wrap" style={{ marginTop: 10 }}>
                {avoidSources.map(item => (
                  <span key={item} className="avoid-chip">
                    {item}
                    <button onClick={() => removeAvoid('sources', item, setAvoidSources)}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Companies to Avoid */}
          <div className="section-block">
            <div className="block-header-flex">
              <h2 className="block-title">Companies to avoid</h2>
              <span className="role-counter">{avoidCompanies.length}</span>
            </div>
            <input 
              type="text" 
              className="field-input-box" 
              placeholder="Search companies to exclude"
              value={avoidCompanyInput}
              onChange={(e) => setAvoidCompanyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddAvoid('companies', avoidCompanyInput, setAvoidCompanies, setAvoidCompanyInput);
              }}
            />
            {avoidCompanies.length > 0 && (
              <div className="chips-flex-wrap" style={{ marginTop: 10 }}>
                {avoidCompanies.map(item => (
                  <span key={item} className="avoid-chip">
                    {item}
                    <button onClick={() => removeAvoid('companies', item, setAvoidCompanies)}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===================== TAB 6: EXPERIENCE ===================== */}
      {activeSubTab === 'experience' && (
        <section className="profile-section-content">
          <div className="section-block">
            <div className="block-header-flex">
              <h2 className="block-title">Experience</h2>
              <button className="btn-text-action">
                <Plus size={12} />
                <span>Add position</span>
              </button>
            </div>
            <p className="block-help-text" style={{ marginBottom: 16 }}>
              Parsed from your CV. Highlight key technical milestones, system impact, and architecture ownership.
            </p>

            <div className="timeline-list">
              {experiences.map((exp, idx) => (
                <div key={idx} className="timeline-item-card">
                  <div className="timeline-item-header">
                    <div>
                      <h3 className="timeline-role">{exp.title}</h3>
                      <p className="timeline-company">{exp.company} · {exp.location}</p>
                    </div>
                    <span className="timeline-period">{exp.period}</span>
                  </div>
                  <p className="timeline-desc">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== TAB 7: EDUCATION ===================== */}
      {activeSubTab === 'education' && (
        <section className="profile-section-content">
          <div className="section-block">
            <div className="block-header-flex">
              <h2 className="block-title">Education</h2>
              <button className="btn-text-action">
                <Plus size={12} />
                <span>Add education</span>
              </button>
            </div>

            <div className="timeline-list">
              {educationList.map((edu, idx) => (
                <div key={idx} className="timeline-item-card">
                  <div className="timeline-item-header">
                    <div>
                      <h3 className="timeline-role">{edu.degree}</h3>
                      <p className="timeline-company">{edu.institution}</p>
                    </div>
                    <span className="timeline-period">{edu.period}</span>
                  </div>
                  <p className="timeline-desc">{edu.grade}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== TAB 8: SCREENING ANSWERS ===================== */}
      {activeSubTab === 'screening' && (
        <section className="profile-section-content">
          <div className="section-block">
            <h2 className="block-title">Automated screening answers</h2>
            <p className="block-help-text" style={{ marginBottom: 16 }}>
              Pre-filled in job applications across Easy Apply and company ATS portals.
            </p>

            <div className="screening-form-grid">
              <div className="form-item">
                <label className="field-meta-label">Are you legally authorized to work in India / target country?</label>
                <select className="field-select-box">
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="form-item">
                <label className="field-meta-label">Will you now or in the future require visa sponsorship?</label>
                <select className="field-select-box">
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              <div className="form-item">
                <label className="field-meta-label">What is your official notice period?</label>
                <input type="text" className="field-input-box" defaultValue="30 Days / Immediate" />
              </div>

              <div className="form-item">
                <label className="field-meta-label">Expected Annual Compensation (CTC)</label>
                <input type="text" className="field-input-box" defaultValue="₹ 24,00,000 - ₹ 32,00,000 INR" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===================== TAB 9: SETTINGS ===================== */}
      {activeSubTab === 'settings' && (
        <section className="profile-section-content">
          <div className="section-block">
            <h2 className="block-title">Account & Application Settings</h2>
            <div className="settings-options-list">
              <label className="checkbox-label-row">
                <input type="checkbox" className="custom-checkbox" defaultChecked />
                <div>
                  <span className="checkbox-text font-medium">Automatic daily opportunity indexing</span>
                  <p className="block-help-text">Receive real-time notifications when high-match jobs appear in Orbit.</p>
                </div>
              </label>

              <label className="checkbox-label-row">
                <input type="checkbox" className="custom-checkbox" defaultChecked />
                <div>
                  <span className="checkbox-text font-medium">Instant ATS Keyword Optimization</span>
                  <p className="block-help-text">Adapt resume keywords dynamically to job description requirements.</p>
                </div>
              </label>
            </div>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
