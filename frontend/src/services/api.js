const BASE_URL = 'http://localhost:5000/api';

/**
 * Helper to execute fetch with JSON parsing and fallback.
 */
async function apiFetch(endpoint, options = {}) {
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('rp_auth_token') : null;
    const authHeaders = token && !options.headers?.Authorization ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = { detail: res.statusText };
      }
      const message =
        (typeof errorData.detail === 'string' ? errorData.detail : errorData.detail?.message) ||
        errorData.message ||
        `API error ${res.status}: ${res.statusText}`;

      // Handle session expiry on 401 for authenticated endpoints (excluding login/register)
      if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('rp_auth_token');
          localStorage.removeItem('rp_user');
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('rp_session_expired', { detail: { message } }));
        }
      }

      const err = new Error(message);
      err.status = res.status;
      err.statusText = res.statusText;
      err.data = errorData;
      throw err;
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
    return `${BASE_URL}/jobs/export${query ? `?${query}` : ''}`;
  },

  async downloadExportJobs(params = {}) {
    const url = this.getExportJobsUrl(params);
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('rp_auth_token') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Export download error (${res.status}): ${res.statusText}`);
    }
    return await res.blob();
  },

  async applyJob(id, payload = {}) {
    return await apiFetch(`/jobs/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async toggleJobMarker(id, profileId = null) {
    const query = profileId && profileId !== 'default' ? `?profile_id=${encodeURIComponent(profileId)}` : '';
    return await apiFetch(`/jobs/${id}/toggle-marker${query}`, { method: 'POST' });
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
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('rp_auth_token') : null;
      const url = token ? `${BASE_URL}/discovery/stream?token=${encodeURIComponent(token)}` : `${BASE_URL}/discovery/stream`;
      const es = new EventSource(url);
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
  async getProfile(profileId = null) {
    try {
      const query = profileId && profileId !== 'default' ? `?profile_id=${encodeURIComponent(profileId)}` : '';
      return await apiFetch(`/profile${query}`);
    } catch {
      return null;
    }
  },

  async updateProfile(profileData, profileId = null) {
    try {
      const query = profileId && profileId !== 'default' ? `?profile_id=${encodeURIComponent(profileId)}` : '';
      return await apiFetch(`/profile${query}`, {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
    } catch {
      return { success: true, profile: profileData };
    }
  },

  async uploadResume(file, profileId = null) {
    const formData = new FormData();
    formData.append('file', file);
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('rp_auth_token') : null;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const query = profileId && profileId !== 'default' ? `?profile_id=${encodeURIComponent(profileId)}` : '';
    const res = await fetch(`${BASE_URL}/profile/resume${query}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      let errDetail;
      try { errDetail = (await res.json()).detail; } catch {}
      throw new Error(errDetail || `Resume upload failed (${res.status})`);
    }
    return await res.json();
  },

  getResumeViewUrl(profileId = null) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('rp_auth_token') : null;
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (profileId && profileId !== 'default') params.set('profile_id', profileId);
    const qs = params.toString();
    return `${BASE_URL}/profile/resume/view${qs ? `?${qs}` : ''}`;
  },

  async getResumeBlob(profileId = null) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('rp_auth_token') : null;
    const query = profileId && profileId !== 'default' ? `?profile_id=${encodeURIComponent(profileId)}` : '';
    const res = await fetch(`${BASE_URL}/profile/resume/view${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      let detail;
      try { detail = (await res.json()).detail; } catch {}
      throw new Error(detail || `Failed to fetch resume file (${res.status})`);
    }
    return await res.blob();
  },

  getResumeDownloadUrl(profileId = null) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('rp_auth_token') : null;
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (profileId && profileId !== 'default') params.set('profile_id', profileId);
    const qs = params.toString();
    return `${BASE_URL}/profile/resume/download${qs ? `?${qs}` : ''}`;
  },

  async getResumeContent(profileId = null) {
    try {
      const query = profileId && profileId !== 'default' ? `?profile_id=${encodeURIComponent(profileId)}` : '';
      return await apiFetch(`/profile/resume/content${query}`);
    } catch {
      return { hasResume: false };
    }
  },

  async getResumeMap() {
    try {
      return await apiFetch('/profile/resume/map');
    } catch {
      return { hasResume: false, aiExtraction: null };
    }
  },

  async generateKeywords(payload = {}) {
    return await apiFetch('/profile/keywords/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async generateProfileRoles(payload = {}) {
    return await apiFetch('/profile/roles/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteResume(profileId = null) {
    const query = profileId && profileId !== 'default' ? `?profile_id=${encodeURIComponent(profileId)}` : '';
    return await apiFetch(`/profile/resume${query}`, { method: 'DELETE' });
  },

  async applyResumeAiMap(customMap = null) {
    return await apiFetch('/profile/resume/apply-ai-map', {
      method: 'POST',
      body: JSON.stringify(customMap || {}),
    });
  },

  // 5. Analytics
  async getAnalytics(profileId = null) {
    try {
      const query = profileId && profileId !== 'default' ? `?profile_id=${encodeURIComponent(profileId)}` : '';
      return await apiFetch(`/analytics${query}`);
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

  async googleAuth(credential, name, avatar) {
    const payload = typeof credential === 'object' 
      ? credential 
      : { credential, name, avatar };
    return await apiFetch('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload)
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

  async resetUserData(confirmToken = 'reset') {
    return await apiFetch('/settings/reset-user-data', {
      method: 'POST',
      body: JSON.stringify({ confirmToken })
    });
  },

  async deleteAccount() {
    return await apiFetch('/auth/account', {
      method: 'DELETE'
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

  async runAutomationPipeline(id, payload = {}) {
    return await apiFetch(`/automation/pipelines/${id}/run`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteAutomationPipeline(id) {
    return await apiFetch(`/automation/pipelines/${id}`, {
      method: 'DELETE'
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

  // 12. Candidate Profile Validation
  async getProfiles() {
    try {
      const data = await apiFetch('/profiles');
      return data.profiles || [];
    } catch {
      return [];
    }
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
  async importJobs(file) {
    const formData = new FormData();
    formData.append('file', file);
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('rp_auth_token') : null;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/jobs/import`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Import failed (${res.status})`);
    }
    return await res.json();
  },

  // 16. Platform Login & Interactive Session Browser (FR-068 / AutoApply parity)
  async openLoginBrowser(url) {
    return await apiFetch('/login/open', {
      method: 'POST',
      body: JSON.stringify({ url })
    });
  },

  async closeLoginBrowser() {
    return await apiFetch('/login/close', {
      method: 'POST'
    });
  },

  async getLoginStatus() {
    try {
      return await apiFetch('/login/status');
    } catch {
      return { open: false };
    }
  },

  async getLoginSessions() {
    try {
      return await apiFetch('/login/sessions');
    } catch {
      return { linkedin: false, indeed: false, naukri: false };
    }
  },

  // Automation Pipelines (Module 3 - Profile-oriented)
  async getAutomationPipelines(profileId = null) {
    try {
      const query = profileId && profileId !== 'default' ? `?profile_id=${encodeURIComponent(profileId)}` : '';
      const data = await apiFetch(`/automation/pipelines${query}`);
      return Array.isArray(data.pipelines) ? data.pipelines : [];
    } catch {
      return [];
    }
  },

  async createAutomationPipeline(data, profileId = null) {
    const query = profileId && profileId !== 'default' ? `?profile_id=${encodeURIComponent(profileId)}` : '';
    return await apiFetch(`/automation/pipelines${query}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async toggleAutomationPipeline(pipeId) {
    return await apiFetch(`/automation/pipelines/${pipeId}/toggle`, {
      method: 'PUT'
    });
  },

  async runAutomationPipeline(pipeId, profileId = null, userApproved = false) {
    return await apiFetch(`/automation/pipelines/${pipeId}/run`, {
      method: 'POST',
      body: JSON.stringify({ user_approved: userApproved, profile_id: profileId })
    });
  },

  async deleteAutomationPipeline(pipeId) {
    return await apiFetch(`/automation/pipelines/${pipeId}`, {
      method: 'DELETE'
    });
  },

  // 17. Stage 2: RAG AI Generation Studio & ATS Tailoring (Module 2 - Profile-oriented)
  async getGenerationJobs(profileId = null) {
    try {
      const query = profileId && profileId !== 'default' ? `?profile_id=${encodeURIComponent(profileId)}` : '';
      const data = await apiFetch(`/generation/jobs${query}`);
      return data.jobs || [];
    } catch {
      return [];
    }
  },

  async generateTailoredResume(jobId, candidateName = '') {
    return await apiFetch(`/generation/jobs/${jobId}/generate`, {
      method: 'POST'
    });
  },

  async uploadMasterResume(file, profileId = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (profileId && profileId !== 'default') {
      formData.append('profile_id', profileId);
    }
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('rp_auth_token') : null;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/generation/master-resume/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Upload failed (${res.status})`);
    }
    return await res.json();
  },

  async getMasterResumeStatus(profileId = null) {
    try {
      const query = profileId && profileId !== 'default' ? `?profile_id=${encodeURIComponent(profileId)}` : '';
      return await apiFetch(`/generation/master-resume/status${query}`);
    } catch {
      return { indexed: false, facts_count: 0, chunks_count: 0 };
    }
  },

  async getTailoredResume(resumeId) {
    return await apiFetch(`/generation/resumes/${resumeId}`);
  },

  getResumeExportUrl(resumeId, format = 'docx') {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('rp_auth_token') : null;
    return `${BASE_URL}/generation/resumes/${resumeId}/export/${format}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  async downloadResumeExport(resumeId, format = 'docx') {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('rp_auth_token') : null;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = this.getResumeExportUrl(resumeId, format);
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Export download error (${res.status})`);
    }
    return await res.blob();
  }
};

