import React from 'react';
import { 
  User, 
  FileText, 
  Briefcase, 
  Contact, 
  FolderGit2, 
  GraduationCap, 
  Award, 
  Settings2, 
  LogIn, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  MapPin,
  Calendar,
  Building,
  Mail,
  Phone,
  Eye,
  Download
} from 'lucide-react';

export default function Page10ReviewProfile(props) {
  const profile = props.profile || props.profileData || {};
  const onNavigate = props.onNavigate;
  const onSave = props.onSave;
  const saving = props.saving;

  // 1. Personal Info
  const fullName = profile.fullName || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Not specified';
  const hasResume = !!profile.resume;
  const resumeName = profile.resumeFileName || (typeof profile.resume === 'string' ? profile.resume : (profile.resume?.fileName || 'Resume.pdf'));

  // 2. Preferences
  const primarySkills = profile.primarySkills || [];
  const additionalSkills = profile.additionalSkills || profile.skillsList || [];
  const preferredRoles = profile.preferredRoles || profile.selectedRoles || [];
  const preferredLocations = profile.preferredLocations || profile.desiredLocations || (profile.userLocation ? [profile.userLocation] : []);
  const preferredWorkModes = profile.preferredWorkModes || profile.workFormats || [];

  // 3. Contact Info
  const contacts = profile.contacts || {};
  const email = profile.email || contacts.email || profile.general?.email || 'Not specified';
  const phone = profile.phone || contacts.phone || profile.general?.phone || 'Not specified';

  // Normalize professional profiles/links
  const contactLinks = [];
  const addContactLink = (label, url) => {
    if (url && typeof url === 'string' && url.trim()) {
      contactLinks.push({ label, url: url.trim() });
    }
  };
  addContactLink('LinkedIn', profile.linkedin || contacts.linkedin);
  addContactLink('GitHub', profile.github || contacts.github);
  addContactLink('Portfolio', profile.portfolio || contacts.portfolio);
  addContactLink('LeetCode', profile.leetcode || contacts.leetcode);
  addContactLink('HackerRank', profile.hackerrank || contacts.hackerrank);

  const rawOther = profile.otherLinks || contacts.otherLinks || profile.links;
  if (Array.isArray(rawOther)) {
    rawOther.forEach(item => {
      if (typeof item === 'string') addContactLink('Link', item);
      else if (item && item.url) addContactLink(item.label || 'Link', item.url);
    });
  } else if (rawOther && typeof rawOther === 'object') {
    Object.entries(rawOther).forEach(([k, v]) => {
      if (typeof v === 'string') addContactLink(k, v);
      else if (v && v.url) addContactLink(v.label || k, v.url);
    });
  }

  // 4. Experience
  const experienceList = Array.isArray(profile.experienceList) && profile.experienceList.length > 0
    ? profile.experienceList
    : (Array.isArray(profile.experiences) ? profile.experiences : []);

  // 5. Projects
  const projectsList = Array.isArray(profile.projectsList) && profile.projectsList.length > 0
    ? profile.projectsList
    : (Array.isArray(profile.projects) ? profile.projects : []);

  // 6. Education
  const educationList = Array.isArray(profile.educationList) && profile.educationList.length > 0
    ? profile.educationList
    : (Array.isArray(profile.education) ? profile.education : []);
  const certs = profile.certifications || [];

  // 7. Professional Details
  const summary = profile.summary || profile.professionalSummary || '';
  const totalExp = profile.totalExperienceYears ?? profile.experienceYears;
  const currentCtc = profile.currentCtc;
  const expectedCtc = profile.expectedCtc;
  const noticePeriod = profile.noticePeriod;
  const earliestJoining = profile.earliestJoiningDate;

  // 8. Application Preferences & Avoid
  const avoidSkills = profile.avoidSkills || profile.avoidKeywords || [];
  const avoidCompanies = profile.avoidCompanies || [];
  const avoidRoles = profile.avoidRoles || [];
  const avoidLocations = profile.avoidLocations || profile.avoidCities || [];
  const screeningAnswers = Array.isArray(profile.screeningAnswers) ? profile.screeningAnswers : [];

  // Helper Section Card Wrapper
  const ReviewSection = ({ id, title, icon: Icon, isComplete, isOptional, onEdit, children }) => (
    <div className="jp-card" style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--rp-border, rgba(255,255,255,0.06))', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Icon className="jp-card-icon" style={{ margin: 0 }} />
          <h3 className="jp-card-title" style={{ margin: 0 }}>{title}</h3>
          {isComplete ? (
            <span className="jp-badge jp-badge-subtle" style={{ color: 'var(--rp-success, #22c55e)' }}>
              <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Completed
            </span>
          ) : isOptional ? (
            <span className="jp-badge jp-badge-subtle" style={{ color: 'var(--rp-text-muted)' }}>
              Optional
            </span>
          ) : (
            <span className="jp-badge jp-badge-subtle" style={{ color: 'var(--rp-error, #ef4444)' }}>
              <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Required
            </span>
          )}
        </div>
        <button
          type="button"
          className="jp-btn jp-btn-secondary jp-btn-sm"
          onClick={onEdit}
        >
          <Edit3 size={13} />
          Edit
        </button>
      </div>
      <div>{children}</div>
    </div>
  );

  return (
    <div className="jp-page-content" role="region" aria-label="Review Profile Master Data">

      {/* 1. Personal Information */}
      <ReviewSection
        id="personal"
        title="1. Personal Information & Resume"
        icon={User}
        isComplete={!!fullName && fullName !== 'Not specified' && hasResume}
        onEdit={() => onNavigate('personal')}
      >
        <div className="jp-form-row">
          <div>
            <div className="jp-label">Full Name</div>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>{fullName}</div>
          </div>
          <div>
            <div className="jp-label">Master Resume</div>
            {hasResume ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} style={{ color: 'var(--rp-primary)' }} />
                <span style={{ fontWeight: 500 }}>{resumeName}</span>
              </div>
            ) : (
              <span style={{ color: 'var(--rp-error, #ef4444)' }}>No resume uploaded</span>
            )}
          </div>
        </div>
      </ReviewSection>

      {/* 2. Job Search Preferences */}
      <ReviewSection
        id="preferences"
        title="2. Job Search Preferences"
        icon={Briefcase}
        isComplete={primarySkills.length > 0 && preferredRoles.length > 0 && preferredLocations.length > 0 && preferredWorkModes.length > 0}
        onEdit={() => onNavigate('preferences')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <div className="jp-label">Primary Skills (Max 5)</div>
            <div className="jp-chips-container" style={{ marginTop: '0.25rem' }}>
              {primarySkills.map((s, idx) => (
                <span key={idx} className="jp-chip jp-chip-primary">{s}</span>
              ))}
              {primarySkills.length === 0 && <span className="jp-hint">None selected</span>}
            </div>
          </div>

          <div className="jp-form-row">
            <div>
              <div className="jp-label">Preferred Roles</div>
              <div style={{ fontWeight: 500 }}>{preferredRoles.join(', ') || 'None specified'}</div>
            </div>
            <div>
              <div className="jp-label">Work Modes</div>
              <div style={{ fontWeight: 500 }}>{preferredWorkModes.join(', ') || 'None specified'}</div>
            </div>
          </div>

          <div className="jp-form-row">
            <div>
              <div className="jp-label">Target Locations</div>
              <div style={{ fontWeight: 500 }}>{preferredLocations.join(', ') || 'None specified'}</div>
            </div>
            <div>
              <div className="jp-label">Global Opportunities</div>
              <div style={{ fontWeight: 500 }}>{profile.globalOpportunities ? 'Yes (Open to global roles)' : 'Disabled (Local/Domestic only)'}</div>
            </div>
          </div>

          {additionalSkills.length > 0 && (
            <div>
              <div className="jp-label">Additional Skills</div>
              <div className="jp-chips-container" style={{ marginTop: '0.25rem' }}>
                {additionalSkills.map((s, idx) => (
                  <span key={idx} className="jp-chip">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </ReviewSection>

      {/* 3. Contact Information */}
      <ReviewSection
        id="contact"
        title="3. Contact Information"
        icon={Contact}
        isComplete={!!email && email !== 'Not specified'}
        isOptional={true}
        onEdit={() => onNavigate('contact')}
      >
        <div className="jp-form-row">
          <div>
            <div className="jp-label">Email</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
              <Mail size={14} style={{ color: 'var(--rp-text-muted)' }} />
              {email}
            </div>
          </div>
          <div>
            <div className="jp-label">Phone</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
              <Phone size={14} style={{ color: 'var(--rp-text-muted)' }} />
              {phone}
            </div>
          </div>
        </div>

        {contactLinks.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <div className="jp-label">Verified Professional Profiles</div>
            <div className="jp-chips-container" style={{ marginTop: '0.35rem' }}>
              {contactLinks.map((item, idx) => (
                <a
                  key={idx}
                  href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="jp-chip"
                  style={{ textDecoration: 'none', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={item.url}
                >
                  <ExternalLink size={12} style={{ marginRight: '4px', flexShrink: 0 }} />
                  <span>{item.label}: {item.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </ReviewSection>

      {/* 4. Work Experience */}
      <ReviewSection
        id="experience"
        title="4. Work Experience"
        icon={Briefcase}
        isComplete={experienceList.length > 0}
        isOptional={true}
        onEdit={() => onNavigate('experience')}
      >
        {experienceList.length === 0 ? (
          <div className="jp-hint">No work experience entries added.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {experienceList.map((exp, idx) => {
              const roleTitle = exp.title || exp.jobTitle || 'Role';
              const company = exp.company || exp.companyName || 'Company';
              const dateRange = exp.period || (exp.startDate ? `${exp.startDate} — ${exp.currentlyWorking ? 'Present' : (exp.endDate || '')}` : '');
              return (
                <div 
                  key={idx}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--rp-radius-md, 8px)',
                    background: 'var(--rp-card-bg, rgba(255,255,255,0.02))',
                    border: '1px solid var(--rp-border, rgba(255,255,255,0.06))'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>{roleTitle}</strong>
                      <div style={{ color: 'var(--rp-primary)', fontSize: '0.85rem' }}>{company}</div>
                    </div>
                    {dateRange && (
                      <span className="jp-badge jp-badge-subtle" style={{ fontSize: '11px' }}>
                        {dateRange}
                      </span>
                    )}
                  </div>
                  {(exp.responsibilities || exp.description) && (
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--rp-text-muted)', whiteSpace: 'pre-line' }}>
                      {(exp.responsibilities || exp.description).slice(0, 200)}...
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ReviewSection>

      {/* 5. Projects */}
      <ReviewSection
        id="projects"
        title="5. Projects"
        icon={FolderGit2}
        isComplete={projectsList.length > 0}
        isOptional={true}
        onEdit={() => onNavigate('projects')}
      >
        {projectsList.length === 0 ? (
          <div className="jp-hint">No projects added yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {projectsList.map((proj, idx) => {
              const projName = proj.name || proj.projectName || 'Project';
              const projUrl = proj.url || proj.projectUrl;
              const techs = proj.technologies || proj.techStack || [];
              return (
                <div 
                  key={idx}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--rp-radius-md, 8px)',
                    background: 'var(--rp-card-bg, rgba(255,255,255,0.02))',
                    border: '1px solid var(--rp-border, rgba(255,255,255,0.06))'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{projName}</strong>
                    {projUrl && (
                      <a href={projUrl} target="_blank" rel="noopener noreferrer" className="jp-btn-icon">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  {proj.description && (
                    <p style={{ margin: '0.25rem 0 0.5rem', fontSize: '0.85rem', color: 'var(--rp-text-muted)' }}>
                      {proj.description}
                    </p>
                  )}
                  {techs && (
                    <div className="jp-chips-container">
                      {(Array.isArray(techs) ? techs : techs.split(',')).map((t, tidx) => (
                        <span key={tidx} className="jp-chip" style={{ fontSize: '11px', padding: '2px 6px' }}>{typeof t === 'string' ? t.trim() : t.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ReviewSection>

      {/* 6. Education */}
      <ReviewSection
        id="education"
        title="6. Education"
        icon={GraduationCap}
        isComplete={educationList.length > 0}
        isOptional={true}
        onEdit={() => onNavigate('education')}
      >
        {educationList.length === 0 ? (
          <div className="jp-hint">No education records added.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {educationList.map((edu, idx) => {
              const school = edu.institution || edu.institutionName || edu.university || 'Institution';
              const degree = edu.degree || 'Degree';
              const dateRange = edu.period || (edu.startDate ? `${edu.startDate} — ${edu.endDate || 'Present'}` : '');
              return (
                <div 
                  key={idx}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--rp-radius-md, 8px)',
                    background: 'var(--rp-card-bg, rgba(255,255,255,0.02))',
                    border: '1px solid var(--rp-border, rgba(255,255,255,0.06))'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>{degree}</strong>
                      <div style={{ color: 'var(--rp-primary)', fontSize: '0.85rem' }}>{school}</div>
                    </div>
                    {dateRange && (
                      <span className="jp-badge jp-badge-subtle" style={{ fontSize: '11px' }}>
                        {dateRange}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ReviewSection>

      {/* 7. Additional Professional Details */}
      <ReviewSection
        id="professional"
        title="7. Additional Professional Details"
        icon={Award}
        isComplete={!!summary || !!totalExp}
        isOptional={true}
        onEdit={() => onNavigate('professional')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {summary && (
            <div>
              <div className="jp-label">Professional Summary</div>
              <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--rp-text)' }}>
                {summary}
              </p>
            </div>
          )}

          <div className="jp-form-row">
            <div>
              <div className="jp-label">Total Experience</div>
              <div style={{ fontWeight: 500 }}>{totalExp ? `${totalExp} Years` : 'Not specified'}</div>
            </div>
            <div>
              <div className="jp-label">Notice Period</div>
              <div style={{ fontWeight: 500 }}>{noticePeriod || 'Not specified'}</div>
            </div>
          </div>

          <div className="jp-form-row">
            <div>
              <div className="jp-label">Current CTC</div>
              <div style={{ fontWeight: 500 }}>{currentCtc || 'Not specified'}</div>
            </div>
            <div>
              <div className="jp-label">Expected CTC</div>
              <div style={{ fontWeight: 500 }}>{expectedCtc || 'Not specified'}</div>
            </div>
          </div>
        </div>
      </ReviewSection>

      {/* 8. Application Preferences & Avoid */}
      <ReviewSection
        id="application"
        title="8. Application Preferences & Avoid Rules"
        icon={Settings2}
        isComplete={avoidSkills.length > 0 || avoidCompanies.length > 0 || screeningAnswers.length > 0}
        isOptional={true}
        onEdit={() => onNavigate('application')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(avoidSkills.length > 0 || avoidCompanies.length > 0 || avoidRoles.length > 0 || avoidLocations.length > 0) ? (
            <div>
              <div className="jp-label">Active Avoid Filters</div>
              <div className="jp-chips-container" style={{ marginTop: '0.25rem' }}>
                {avoidSkills.map((s, i) => <span key={`s-${i}`} className="jp-chip">Avoid Skill: {s}</span>)}
                {avoidCompanies.map((c, i) => <span key={`c-${i}`} className="jp-chip">Avoid Co: {c}</span>)}
                {avoidRoles.map((r, i) => <span key={`r-${i}`} className="jp-chip">Avoid Role: {r}</span>)}
                {avoidLocations.map((l, i) => <span key={`l-${i}`} className="jp-chip">Avoid Location: {l}</span>)}
              </div>
            </div>
          ) : (
            <div className="jp-hint">No avoid criteria configured.</div>
          )}

          <div>
            <div className="jp-label">Screening Answers Configured</div>
            <div style={{ fontWeight: 500 }}>{screeningAnswers.length} reusable screening responses saved</div>
          </div>
        </div>
      </ReviewSection>

      {/* 9. Integrations */}
      <ReviewSection
        id="integrations"
        title="9. Integrations Status"
        icon={LogIn}
        isComplete={true}
        isOptional={true}
        onEdit={() => onNavigate('integrations')}
      >
        <div className="jp-hint">
          Check live browser session connections for LinkedIn, Indeed, Naukri, Glassdoor, and Wellfound on the Integrations page.
        </div>
      </ReviewSection>
    </div>
  );
}
