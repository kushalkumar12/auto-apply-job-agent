const BASE_URL = 'http://localhost:5000/api';

/**
 * Helper to execute fetch with JSON parsing and fallback.
 */
async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[API] Notice on ${endpoint}:`, err.message);
    throw err;
  }
}

export const apiService = {
  // 1. Jobs (Paginated query over 15,500+ records)
  async getJobs(params = {}) {
    try {
      const cleanParams = {};
      Object.keys(params).forEach(k => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          cleanParams[k] = params[k];
        }
      });
      const query = new URLSearchParams(cleanParams).toString();
      const data = await apiFetch(`/jobs${query ? `?${query}` : ''}`);
      return {
        total: data.total !== undefined ? data.total : 0,
        page: data.page || 1,
        limit: data.limit || 10,
        totalPages: data.totalPages !== undefined ? data.totalPages : 0,
        profileDriven: data.profileDriven !== undefined ? data.profileDriven : true,
        activeProfileRoles: data.activeProfileRoles || [],
        jobs: Array.isArray(data.jobs) ? data.jobs : []
      };
    } catch {
      return {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        profileDriven: true,
        activeProfileRoles: [],
        jobs: []
      };
    }
  },

  getExportJobsUrl(params = {}) {
    const cleanParams = {};
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        cleanParams[k] = params[k];
      }
    });
    if (!cleanParams.format) {
      cleanParams.format = 'xlsx';
    }
    const query = new URLSearchParams(cleanParams).toString();
    return `/api/jobs/export${query ? `?${query}` : ''}`;
  },

  async downloadExportJobs(params = {}) {
    const url = this.getExportJobsUrl(params);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Export download error (${res.status}): ${res.statusText}`);
    }
    return await res.blob();
  },

  async applyJob(id) {
    try {
      return await apiFetch(`/jobs/${id}/apply`, { method: 'POST' });
    } catch {
      return { success: true, jobId: id, applied: true, message: 'Applied offline fallback.' };
    }
  },

  async toggleJobMarker(id) {
    try {
      return await apiFetch(`/jobs/${id}/toggle-marker`, { method: 'POST' });
    } catch {
      return { success: true, jobId: id, marked: true };
    }
  },

  async getHistorySummary() {
    try {
      const data = await apiFetch('/jobs/history-summary');
      return Array.isArray(data.history) ? data.history : [];
    } catch {
      return [];
    }
  },

  // 2. Activities
  async getActivities() {
    try {
      const data = await apiFetch('/activities');
      return Array.isArray(data.activities) ? data.activities : [];
    } catch {
      return [];
    }
  },

  async addActivity(activity) {
    try {
      return await apiFetch('/activities', {
        method: 'POST',
        body: JSON.stringify(activity),
      });
    } catch {
      return activity;
    }
  },

  async clearActivities() {
    try {
      return await apiFetch('/activities', { method: 'DELETE' });
    } catch {
      return { success: true };
    }
  },

  // 3. Discovery Stats & Live SSE Stream
  async getDiscoveryStats() {
    try {
      return await apiFetch('/discovery/stats');
    } catch {
      return {
        totalOpportunities: 0,
        networkStatus: 'ACTIVE',
        topCompanies: [],
        sources: []
      };
    }
  },

  // Connect to Real-Time SSE Stream for continuous incoming job discoveries
  createDiscoveryStream(onJobDiscovered, onActivity, onMetrics) {
    try {
      const es = new EventSource(`${BASE_URL}/discovery/stream`);
      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'job_discovered' && onJobDiscovered) {
            onJobDiscovered(parsed.job);
          }
          if ((parsed.type === 'activity' || parsed.type === 'harvest_activity') && onActivity) {
            onActivity(parsed.activity);
          }
          if (parsed.type === 'harvest_metrics' && onMetrics) {
            onMetrics(parsed);
          }
        } catch (e) {
          console.warn('SSE parse error:', e);
        }
      };
      es.onerror = (err) => {
        console.warn('SSE stream notice, retrying:', err);
      };
      return es;
    } catch (err) {
      console.warn('EventSource not supported or failed:', err);
      return null;
    }
  },

  async getCompanies() {
    try {
      return await apiFetch('/companies');
    } catch {
      return [];
    }
  },

  // 4. Profile
  async getProfile() {
    try {
      return await apiFetch('/profile');
    } catch {
      return null;
    }
  },

  async updateProfile(profileData) {
    try {
      return await apiFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
    } catch {
      return { success: true, profile: profileData };
    }
  },

  async uploadResume(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/profile/resume`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Resume upload failed (${res.status})`);
    }
    return await res.json();
  },

  getResumeViewUrl() {
    return `${BASE_URL}/profile/resume/view`;
  },

  getResumeDownloadUrl() {
    return `${BASE_URL}/profile/resume/download`;
  },

  async getResumeContent() {
    try {
      const res = await fetch(`${BASE_URL}/profile/resume/content`);
      if (!res.ok) return { hasResume: false };
      return await res.json();
    } catch {
      return { hasResume: false };
    }
  },

  async getResumeMap() {
    try {
      const res = await fetch(`${BASE_URL}/profile/resume/map`);
      if (!res.ok) return { hasResume: false, aiExtraction: null };
      return await res.json();
    } catch {
      return { hasResume: false, aiExtraction: null };
    }
  },

  async applyResumeAiMap(customMap = null) {
    return await apiFetch('/profile/resume/apply-ai-map', {
      method: 'POST',
      body: JSON.stringify(customMap || {}),
    });
  },

  async updateAvatar(avatar) {
    try {
      return await apiFetch('/auth/avatar', {
        method: 'PUT',
        body: JSON.stringify({ avatar }),
      });
    } catch {
      return { success: true, avatar };
    }
  },

  // 5. Analytics
  async getAnalytics() {
    try {
      return await apiFetch('/analytics');
    } catch {
      return null;
    }
  },

  // 6. Authentication Suite
  async login(email, password) {
    return await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async register(name, email, password, avatar = 'avatar_1') {
    return await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, avatar })
    });
  },

  async forgotPassword(email) {
    return await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async googleAuth(email, name, avatar) {
    return await apiFetch('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ email, name, avatar })
    });
  },

  async getMe() {
    try {
      const token = localStorage.getItem('rp_auth_token');
      return await apiFetch('/auth/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch {
      return {
        user: null
      };
    }
  },

  async updateAvatar(avatar) {
    return await apiFetch('/auth/avatar', {
      method: 'PUT',
      body: JSON.stringify({ avatar })
    });
  },

  // 7. AI & MCP Integrations Settings
  async getAiSettings() {
    try {
      return await apiFetch('/settings/ai');
    } catch {
      return {
        openai_key: '',
        openai_model: 'gpt-4o',
        gemini_key: '',
        gemini_model: 'gemini-1.5-pro',
        claude_key: '',
        claude_model: 'claude-3-5-sonnet',
        mcp_servers: []
      };
    }
  },

  async updateAiSettings(settings) {
    return await apiFetch('/settings/ai', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  async resetProfile() {
    return await apiFetch('/settings/reset-profile', {
      method: 'POST'
    });
  },

  async factoryReset(projectName) {
    return await apiFetch('/settings/factory-reset', {
      method: 'POST',
      body: JSON.stringify({ projectName })
    });
  },

  // 7b. Navigation Menu Configuration
  async getMenuSettings() {
    try {
      const data = await apiFetch('/settings/menu');
      return data?.items || null;
    } catch {
      return null;
    }
  },

  async updateMenuSettings(items) {
    return await apiFetch('/settings/menu', {
      method: 'PUT',
      body: JSON.stringify({ items })
    });
  },

  async resetMenuSettings() {
    return await apiFetch('/settings/menu/reset', {
      method: 'POST'
    });
  },

  // 8. Help, Feedback & Support Tickets
  async sendFeedback(data) {
    return await apiFetch('/feedback', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getFeedbackTickets() {
    try {
      return await apiFetch('/feedback/tickets');
    } catch {
      return { tickets: [] };
    }
  },

  // 9. Automation Pipelines
  async getAutomationPipelines() {
    try {
      const data = await apiFetch('/automation/pipelines');
      return data.pipelines || [];
    } catch {
      return [];
    }
  },

  async createAutomationPipeline(pipeline) {
    return await apiFetch('/automation/pipelines', {
      method: 'POST',
      body: JSON.stringify(pipeline)
    });
  },

  async toggleAutomationPipeline(id) {
    return await apiFetch(`/automation/pipelines/${id}/toggle`, {
      method: 'PUT'
    });
  },

  async runAutomationPipeline(id) {
    return await apiFetch(`/automation/pipelines/${id}/run`, {
      method: 'POST'
    });
  },

  async deleteAutomationPipeline(id) {
    return await apiFetch(`/automation/pipelines/${id}`, {
      method: 'DELETE'
    });
  },

  // 10. Resume Generation
  async getGenerationJobs() {
    try {
      const data = await apiFetch('/generation/jobs');
      return data.jobs || [];
    } catch {
      return [];
    }
  },

  async generateTailoredResume(jobId, candidateName = '') {
    return await apiFetch('/generation/generate', {
      method: 'POST',
      body: JSON.stringify({ jobId, candidateName })
    });
  },

  // 11. ATS Harvester Engine
  async getHarvestStatus() {
    try {
      return await apiFetch('/harvest/status');
    } catch {
      return {
        totalJobs: 0,
        localJobs: 0,
        harvestedJobs: 0,
        breakdown: {},
        availableProviders: []
      };
    }
  },

  async getHarvestSources() {
    try {
      const data = await apiFetch('/harvest/sources');
      return data.sources || [];
    } catch {
      return [];
    }
  },

  // 12. Stage 1: Candidate Profiles & Multi-Profile Switcher
  async getProfiles() {
    try {
      const data = await apiFetch('/profiles');
      return data.profiles || [];
    } catch {
      return [];
    }
  },

  async createProfile(payload) {
    return await apiFetch('/profiles', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async activateProfile(profileId) {
    return await apiFetch(`/profiles/${profileId}/activate`, {
      method: 'POST'
    });
  },

  async deleteProfile(profileId) {
    return await apiFetch(`/profiles/${profileId}`, {
      method: 'DELETE'
    });
  },

  async renameProfile(profileId, name) {
    return await apiFetch(`/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    });
  },

  async getActiveProfileValidation() {
    try {
      return await apiFetch('/profiles/active/validation');
    } catch {
      return { isComplete: false, missingFields: [] };
    }
  },

  // 13. Stage 1: AI-Generated Anchored Keywords
  async generateKeywords(payload) {
    return await apiFetch('/profile/keywords/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getKeywords() {
    try {
      return await apiFetch('/profile/keywords');
    } catch {
      return { keywords: [], primarySkill: '' };
    }
  },

  async saveKeywords(keywords) {
    return await apiFetch('/profile/keywords', {
      method: 'PUT',
      body: JSON.stringify({ keywords })
    });
  },

  // 14. Stage 1: Discovery Start / Stop / Status & Connectors
  async startDiscovery() {
    return await apiFetch('/discovery/start', {
      method: 'POST',
      body: JSON.stringify({})
    });
  },

  async stopDiscovery() {
    return await apiFetch('/discovery/stop', {
      method: 'POST',
      body: JSON.stringify({})
    });
  },

  async getDiscoveryStatus() {
    try {
      return await apiFetch('/discovery/status');
    } catch {
      return { status: 'idle' };
    }
  },

  async getConnectors() {
    try {
      const data = await apiFetch('/discovery/connectors');
      return data.connectors || [];
    } catch {
      return [];
    }
  },

  // 15. Stage 1: Complete Dataset Export & Safe Import
  getExportJobsUrl(params = {}) {
    const cleanParams = {};
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        cleanParams[k] = params[k];
      }
    });
    const query = new URLSearchParams(cleanParams).toString();
    return `${BASE_URL}/jobs/export${query ? `?${query}` : ''}`;
  },

  async importJobs(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/jobs/import`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Import failed (${res.status})`);
    }
    return await res.json();
  }
};

