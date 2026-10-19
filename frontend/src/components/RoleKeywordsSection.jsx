import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RotateCw, 
  Edit3, 
  Trash2, 
  Plus, 
  Check, 
  X, 
  ShieldCheck, 
  AlertTriangle,
  Info,
  Search
} from 'lucide-react';
import { apiService } from '../services/api';

export default function RoleKeywordsSection({
  primarySkill = '',
  skillsList = [],
  selectedRoles = [],
  onKeywordsUpdated
}) {
  const [keywords, setKeywords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editRoleTitle, setEditRoleTitle] = useState('');
  const [editSearchQuery, setEditSearchQuery] = useState('');
  const [editPriority, setEditPriority] = useState(1);
  const [newKeywordOpen, setNewKeywordOpen] = useState(false);
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newSearchQuery, setNewSearchQuery] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Load existing keywords on mount
  useEffect(() => {
    loadKeywords();
  }, []);

  const loadKeywords = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getKeywords();
      if (res && Array.isArray(res.keywords)) {
        setKeywords(res.keywords);
      }
    } catch (err) {
      console.warn('Failed to load keywords:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!primarySkill && (!skillsList || skillsList.length === 0)) {
      setFeedbackMsg({ type: 'warning', text: 'Specify at least a Primary Skill before generating keywords.' });
      return;
    }

    setIsGenerating(true);
    setFeedbackMsg(null);
    try {
      const skillNames = skillsList.map(s => typeof s === 'string' ? s : s.name);
      const res = await apiService.generateKeywords({
        primarySkill: primarySkill,
        skills: skillNames,
        selectedRoles: selectedRoles
      });

      if (res && Array.isArray(res.keywords)) {
        setKeywords(res.keywords);
        setFeedbackMsg({ 
          type: 'success', 
          text: `Generated ${res.keywords.length} anchored keywords prioritizing "${res.primarySkill || primarySkill}".` 
        });
        if (onKeywordsUpdated) onKeywordsUpdated(res.keywords);
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Generation error. Fallback keyword engine activated.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartEdit = (kw) => {
    setEditingId(kw.id);
    setEditRoleTitle(kw.roleTitle);
    setEditSearchQuery(kw.searchQuery);
    setEditPriority(kw.priority || 1);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id) => {
    const updated = keywords.map(kw => {
      if (kw.id === id) {
        return {
          ...kw,
          roleTitle: editRoleTitle.trim(),
          searchQuery: editSearchQuery.trim(),
          priority: Number(editPriority) || 1
        };
      }
      return kw;
    });

    setKeywords(updated);
    setEditingId(null);
    try {
      await apiService.saveKeywords(updated);
      setFeedbackMsg({ type: 'success', text: 'Keyword updated.' });
      if (onKeywordsUpdated) onKeywordsUpdated(updated);
    } catch (e) {
      setFeedbackMsg({ type: 'error', text: 'Failed to persist keyword edit.' });
    }
  };

  const handleDelete = async (id) => {
    const updated = keywords.filter(kw => kw.id !== id);
    setKeywords(updated);
    try {
      await apiService.saveKeywords(updated);
      setFeedbackMsg({ type: 'info', text: 'Keyword removed.' });
      if (onKeywordsUpdated) onKeywordsUpdated(updated);
    } catch (e) {
      console.warn('Failed to delete keyword:', e);
    }
  };

  const handleAddKeyword = async (e) => {
    e.preventDefault();
    if (!newRoleTitle.trim() || !newSearchQuery.trim()) return;

    const newKw = {
      id: `kw-${Date.now()}`,
      roleTitle: newRoleTitle.trim(),
      searchQuery: newSearchQuery.trim(),
      priority: 1,
      coreSkill: primarySkill || 'Anchor',
      secondarySkills: [],
      category: 'User Custom Keyword'
    };

    const updated = [newKw, ...keywords];
    setKeywords(updated);
    setNewRoleTitle('');
    setNewSearchQuery('');
    setNewKeywordOpen(false);

    try {
      await apiService.saveKeywords(updated);
      setFeedbackMsg({ type: 'success', text: 'Custom keyword added.' });
      if (onKeywordsUpdated) onKeywordsUpdated(updated);
    } catch (e) {
      console.warn('Failed to save new keyword:', e);
    }
  };

  return (
    <div className="role-keywords-section" style={{ marginTop: 24 }}>
      {/* Header with Title and Generation Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
              AI-Generated Role & Search Keywords
            </h3>
            <span 
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '2px 8px',
                borderRadius: 12,
                background: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--accent-color, #3b82f6)',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}
            >
              Primary Skill Anchor: {primarySkill || 'None specified'}
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted, #94a3b8)', margin: '4px 0 0 0', maxWidth: 640 }}>
            Explorer searches prioritize your primary skill. Secondary skills (e.g. AWS, SQL) are synergized without displacing your core capability.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setNewKeywordOpen(!newKeywordOpen)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-color, #334155)',
              background: 'transparent',
              color: 'var(--text-primary, #f8fafc)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={14} />
            <span>Add Custom</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--accent-color, #3b82f6)',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.75 : 1
            }}
          >
            <Sparkles size={14} />
            <span>{isGenerating ? 'Generating...' : keywords.length > 0 ? 'Regenerate Keywords' : 'Generate Keywords'}</span>
          </button>
        </div>
      </div>

      {/* User Feedback Alerts */}
      {feedbackMsg && (
        <div 
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: feedbackMsg.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : feedbackMsg.type === 'warning' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            color: feedbackMsg.type === 'error' ? '#ef4444' : feedbackMsg.type === 'warning' ? '#f59e0b' : '#10b981',
            border: `1px solid ${feedbackMsg.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : feedbackMsg.type === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
          }}
        >
          <span>{feedbackMsg.text}</span>
          <button 
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Add Custom Form Drawer */}
      {newKeywordOpen && (
        <form 
          onSubmit={handleAddKeyword}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 16,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'flex-end'
          }}
        >
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: 4 }}>
              Target Role Title
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Java Backend Lead"
              value={newRoleTitle}
              onChange={(e) => setNewRoleTitle(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-color, #334155)',
                background: 'var(--bg-input, #0f172a)',
                color: 'var(--text-primary, #f8fafc)',
                fontSize: 12
              }}
            />
          </div>

          <div style={{ flex: '2 1 280px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: 4 }}>
              Search Query String (ATS / Platform query)
            </label>
            <input
              type="text"
              placeholder="e.g. &quot;Java&quot; AND (&quot;AWS&quot; OR &quot;Spring Boot&quot;)"
              value={newSearchQuery}
              onChange={(e) => setNewSearchQuery(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-color, #334155)',
                background: 'var(--bg-input, #0f172a)',
                color: 'var(--text-primary, #f8fafc)',
                fontSize: 12
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setNewKeywordOpen(false)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-color, #334155)',
                background: 'transparent',
                color: 'var(--text-secondary, #cbd5e1)',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: 'var(--accent-color, #3b82f6)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Add Keyword
            </button>
          </div>
        </form>
      )}

      {/* Keywords Table */}
      <div 
        style={{
          border: '1px solid var(--border-color, #334155)',
          borderRadius: 10,
          overflow: 'hidden',
          background: 'var(--bg-card, #1e293b)'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-color, #334155)' }}>
              <th style={{ padding: '10px 12px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600, width: 60 }}>Pri</th>
              <th style={{ padding: '10px 12px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>Target Role Title</th>
              <th style={{ padding: '10px 12px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>Search Query Pattern</th>
              <th style={{ padding: '10px 12px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>Anchor Status</th>
              <th style={{ padding: '10px 12px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600, textAlign: 'right', width: 90 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keywords.length > 0 ? (
              keywords.map((kw, idx) => {
                const isEditing = editingId === kw.id;
                const isAnchored = primarySkill ? (
                  kw.roleTitle.toLowerCase().includes(primarySkill.toLowerCase()) || 
                  kw.searchQuery.toLowerCase().includes(primarySkill.toLowerCase())
                ) : true;

                if (isEditing) {
                  return (
                    <tr key={kw.id} style={{ borderBottom: '1px solid var(--border-color, #334155)', background: 'rgba(59, 130, 246, 0.08)' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <select
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value)}
                          style={{
                            padding: '4px',
                            borderRadius: 4,
                            border: '1px solid var(--border-color, #334155)',
                            background: 'var(--bg-input, #0f172a)',
                            color: 'var(--text-primary, #f8fafc)',
                            fontSize: 12
                          }}
                        >
                          <option value={1}>P1</option>
                          <option value={2}>P2</option>
                          <option value={3}>P3</option>
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="text"
                          value={editRoleTitle}
                          onChange={(e) => setEditRoleTitle(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: '1px solid var(--border-color, #334155)',
                            background: 'var(--bg-input, #0f172a)',
                            color: 'var(--text-primary, #f8fafc)',
                            fontSize: 12
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="text"
                          value={editSearchQuery}
                          onChange={(e) => setEditSearchQuery(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: '1px solid var(--border-color, #334155)',
                            background: 'var(--bg-input, #0f172a)',
                            color: 'var(--text-primary, #f8fafc)',
                            fontSize: 12
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: 11, color: isAnchored ? '#10b981' : '#f59e0b' }}>
                          {isAnchored ? 'Anchored' : 'Unanchored'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(kw.id)}
                          style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', padding: 4 }}
                          title="Save Changes"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4, marginLeft: 4 }}
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr 
                    key={kw.id} 
                    style={{ 
                      borderBottom: idx < keywords.length - 1 ? '1px solid var(--border-color, #334155)' : 'none',
                      transition: 'background 0.1s ease'
                    }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <span 
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: kw.priority === 1 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          color: kw.priority === 1 ? '#10b981' : 'var(--text-secondary, #94a3b8)'
                        }}
                      >
                        P{kw.priority || 1}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                      {kw.roleTitle}
                      {kw.category && (
                        <div style={{ fontSize: 10.5, fontWeight: 400, color: 'var(--text-muted, #94a3b8)' }}>
                          {kw.category}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary, #cbd5e1)', fontFamily: 'monospace', fontSize: 11.5 }}>
                      <span style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '2px 6px', borderRadius: 4 }}>
                        {kw.searchQuery}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {isAnchored ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#10b981', fontWeight: 500 }}>
                          <ShieldCheck size={14} /> Anchored
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#f59e0b', fontWeight: 500 }} title="Does not directly contain primary skill">
                          <AlertTriangle size={14} /> Secondary
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(kw)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', padding: 4 }}
                        title="Edit Keyword"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(kw.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, marginLeft: 4 }}
                        title="Delete Keyword"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                  <Sparkles size={28} style={{ opacity: 0.4, margin: '0 auto 8px auto', display: 'block' }} />
                  <div>No generated search keywords yet for this candidate profile.</div>
                  <div style={{ fontSize: 11.5, marginTop: 4 }}>
                    Click <strong>Generate Keywords</strong> above to extract role variations anchored strictly around your primary skill.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
