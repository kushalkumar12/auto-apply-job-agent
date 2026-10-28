import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  AlertCircle 
} from 'lucide-react';

export default function Page3ContactInfo(props) {
  const profileData = props.profileData || props.profile || {};
  const onChange = props.onChange || ((updates) => {
    if (typeof props.updateField === 'function') {
      Object.entries(updates).forEach(([k, v]) => props.updateField(k, v));
    }
  });
  const errors = props.errors || {};

  const contacts = profileData.contacts || {};
  const resolveField = (key, fallbackKey) => {
    if (profileData[key] !== undefined) return profileData[key];
    if (contacts[key] !== undefined) return contacts[key];
    if (fallbackKey && profileData.general?.[fallbackKey] !== undefined) return profileData.general[fallbackKey];
    return '';
  };

  const [email, setEmail] = useState(() => resolveField('email', 'email'));
  const [phone, setPhone] = useState(() => resolveField('phone', 'phone'));
  const [linkedin, setLinkedin] = useState(() => resolveField('linkedin', null));
  const [portfolio, setPortfolio] = useState(() => resolveField('portfolio', null));
  const [github, setGithub] = useState(() => resolveField('github', null));
  const [hackerrank, setHackerrank] = useState(() => resolveField('hackerrank', null));
  const [leetcode, setLeetcode] = useState(() => resolveField('leetcode', null));
  
  const [otherLinks, setOtherLinks] = useState(() => profileData.otherLinks || contacts.otherLinks || []);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Sync state ONLY when profileData receives external updates, respecting explicit empty strings
  useEffect(() => {
    const c = profileData.contacts || {};
    const e = profileData.email !== undefined ? profileData.email : (c.email !== undefined ? c.email : (profileData.general?.email !== undefined ? profileData.general.email : ''));
    const p = profileData.phone !== undefined ? profileData.phone : (c.phone !== undefined ? c.phone : (profileData.general?.phone !== undefined ? profileData.general.phone : ''));
    const li = profileData.linkedin !== undefined ? profileData.linkedin : (c.linkedin !== undefined ? c.linkedin : '');
    const pf = profileData.portfolio !== undefined ? profileData.portfolio : (c.portfolio !== undefined ? c.portfolio : '');
    const gh = profileData.github !== undefined ? profileData.github : (c.github !== undefined ? c.github : '');
    const hr = profileData.hackerrank !== undefined ? profileData.hackerrank : (c.hackerrank !== undefined ? c.hackerrank : '');
    const lc = profileData.leetcode !== undefined ? profileData.leetcode : (c.leetcode !== undefined ? c.leetcode : '');
    
    setEmail(e);
    setPhone(p);
    setLinkedin(li);
    setPortfolio(pf);
    setGithub(gh);
    setHackerrank(hr);
    setLeetcode(lc);
    setOtherLinks(profileData.otherLinks || c.otherLinks || []);
  }, [
    profileData.email,
    profileData.phone,
    profileData.linkedin,
    profileData.portfolio,
    profileData.github,
    profileData.hackerrank,
    profileData.leetcode,
    profileData.contacts,
    profileData.otherLinks
  ]);

  const updateFields = (updates) => {
    const updated = {
      ...profileData,
      ...updates,
      contacts: {
        ...(profileData.contacts || {}),
        ...updates
      }
    };
    if (updated.general && updates.email !== undefined) {
      updated.general = { ...updated.general, email: updates.email };
    }
    if (updated.general && updates.phone !== undefined) {
      updated.general = { ...updated.general, phone: updates.phone };
    }
    onChange(updated);
    if (typeof props.updateField === 'function') {
      Object.entries(updates).forEach(([k, v]) => props.updateField(k, v));
    }
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    updateFields({ email: val });
  };

  const handlePhoneChange = (val) => {
    setPhone(val);
    updateFields({ phone: val });
  };

  const handleLinkedinChange = (val) => {
    setLinkedin(val);
    updateFields({ linkedin: val });
  };

  const handlePortfolioChange = (val) => {
    setPortfolio(val);
    updateFields({ portfolio: val });
  };

  const handleGithubChange = (val) => {
    setGithub(val);
    updateFields({ github: val });
  };

  const handleHackerrankChange = (val) => {
    setHackerrank(val);
    updateFields({ hackerrank: val });
  };

  const handleLeetcodeChange = (val) => {
    setLeetcode(val);
    updateFields({ leetcode: val });
  };

  const handleAddOtherLink = () => {
    if (!newLinkUrl.trim()) return;
    const item = {
      id: `link_${Date.now()}`,
      label: newLinkLabel.trim() || 'Professional Link',
      url: newLinkUrl.trim()
    };
    const nextLinks = [...otherLinks, item];
    setOtherLinks(nextLinks);
    setNewLinkLabel('');
    setNewLinkUrl('');
    updateFields({ otherLinks: nextLinks });
  };

  const handleRemoveOtherLink = (id) => {
    const nextLinks = otherLinks.filter(l => l.id !== id);
    setOtherLinks(nextLinks);
    updateFields({ otherLinks: nextLinks });
  };

  return (
    <div className="jp-page-content" role="region" aria-label="Contact Information Form">
      <div className="jp-form-grid-2">
        {/* Email */}
        <div className="jp-field-group">
          <label className="jp-field-label" htmlFor="jp-email">
            <span>Email Address</span>
            <span className="jp-req-star" aria-hidden="true">*</span>
          </label>
          <input
            id="jp-email"
            type="email"
            className={`jp-input ${errors.email ? 'is-error' : ''}`}
            placeholder="Enter email address"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
          />
          {errors.email && (
            <span className="jp-error-text" role="alert">
              <AlertCircle size={13} />
              <span>{errors.email}</span>
            </span>
          )}
        </div>

        {/* Phone */}
        <div className="jp-field-group">
          <label className="jp-field-label" htmlFor="jp-phone">
            <span>Phone Number</span>
            <span className="jp-opt-badge">Optional</span>
          </label>
          <input
            id="jp-phone"
            type="tel"
            className="jp-input"
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
          />
        </div>
      </div>

      <div className="jp-form-grid-2">
        {/* LinkedIn */}
        <div className="jp-field-group">
          <label className="jp-field-label" htmlFor="jp-linkedin">
            <span>LinkedIn Profile URL</span>
            <span className="jp-opt-badge">Optional</span>
          </label>
          <input
            id="jp-linkedin"
            type="url"
            className="jp-input"
            placeholder="https://linkedin.com/in/..."
            value={linkedin}
            onChange={(e) => handleLinkedinChange(e.target.value)}
          />
        </div>

        {/* Portfolio */}
        <div className="jp-field-group">
          <label className="jp-field-label" htmlFor="jp-portfolio">
            <span>Portfolio / Personal Website</span>
            <span className="jp-opt-badge">Optional</span>
          </label>
          <input
            id="jp-portfolio"
            type="url"
            className="jp-input"
            placeholder="https://..."
            value={portfolio}
            onChange={(e) => handlePortfolioChange(e.target.value)}
          />
        </div>
      </div>

      <div className="jp-form-grid-2">
        {/* GitHub / GitLab / Bitbucket */}
        <div className="jp-field-group">
          <label className="jp-field-label" htmlFor="jp-github">
            <span>GitHub / GitLab Profile</span>
          </label>
          <input
            id="jp-github"
            type="url"
            className="jp-input"
            placeholder="https://github.com/..."
            value={github}
            onChange={(e) => handleGithubChange(e.target.value)}
          />
        </div>

        {/* HackerRank */}
        <div className="jp-field-group">
          <label className="jp-field-label" htmlFor="jp-hackerrank">
            <span>HackerRank Profile</span>
          </label>
          <input
            id="jp-hackerrank"
            type="url"
            className="jp-input"
            placeholder="https://hackerrank.com/..."
            value={hackerrank}
            onChange={(e) => handleHackerrankChange(e.target.value)}
          />
        </div>
      </div>

      <div className="jp-form-grid-2">
        {/* LeetCode */}
        <div className="jp-field-group">
          <label className="jp-field-label" htmlFor="jp-leetcode">
            <span>LeetCode Profile</span>
          </label>
          <input
            id="jp-leetcode"
            type="url"
            className="jp-input"
            placeholder="https://leetcode.com/..."
            value={leetcode}
            onChange={(e) => handleLeetcodeChange(e.target.value)}
          />
        </div>
      </div>

      {/* Other Professional Links */}
      <div className="jp-field-group" style={{ marginTop: 12 }}>
        <label className="jp-field-label">
          <span>Other Professional Links</span>
          <span className="jp-opt-badge">Optional</span>
        </label>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8 }}>
          <input
            type="text"
            className="jp-input"
            placeholder="Label (e.g. Technical Blog)"
            value={newLinkLabel}
            onChange={(e) => setNewLinkLabel(e.target.value)}
          />
          <input
            type="url"
            className="jp-input"
            placeholder="https://..."
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddOtherLink();
              }
            }}
          />
          <button
            type="button"
            className="jp-btn jp-btn-secondary"
            onClick={handleAddOtherLink}
            disabled={!newLinkUrl.trim()}
          >
            <Plus size={15} />
            <span>Add Link</span>
          </button>
        </div>

        {/* List of custom links */}
        {otherLinks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {otherLinks.map((link) => (
              <div 
                key={link.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'var(--rp-dominant-bg, #f7f9f8)',
                  border: '1px solid var(--rp-secondary-border, #dde2de)',
                  borderRadius: 6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <LinkIcon size={14} color="var(--rp-text-muted, #6b7570)" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{link.label}</span>
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ fontSize: 12, color: 'var(--rp-accent-primary, #2563eb)', textDecoration: 'none' }}
                  >
                    {link.url}
                  </a>
                </div>
                <button
                  type="button"
                  className="jp-btn-danger-ghost"
                  onClick={() => handleRemoveOtherLink(link.id)}
                  aria-label={`Remove ${link.label}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
