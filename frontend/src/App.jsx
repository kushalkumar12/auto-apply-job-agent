import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import JobDiscoveryEngine from './components/JobDiscoveryEngine';
import JobList from './components/JobList';
import ActivityFeed from './components/ActivityFeed';
import JobModal from './components/JobModal';
import ToolsView from './components/ToolsView';
import GenerationView from './components/GenerationView';
import ProfileView from './components/ProfileView';
import AnalyticsView from './components/AnalyticsView';
import AutomationView from './components/AutomationView';
import ThemesModal from './components/ThemesModal';
import SettingsModal from './components/SettingsModal';
import HelpPrivacyModal from './components/HelpPrivacyModal';
import AuthModal from './components/AuthModal';
import { INITIAL_JOBS, INITIAL_ACTIVITIES } from './data/mockData';
import { apiService } from './services/api';
import { Play, CheckCircle2 } from 'lucide-react';
import './components/UniversalModal.css';
import './App.css';

const VALID_TABS = ['explore', 'generation', 'automation', 'profile', 'analytics', 'tools'];

export default function App() {
  // 1. Persistent Routing on Refresh (Item 11)
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (VALID_TABS.includes(hash)) return hash;
    const stored = localStorage.getItem('rp_active_tab');
    if (VALID_TABS.includes(stored)) return stored;
    return 'explore';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // 2. Application Dataset & Pagination
  const [jobs, setJobs] = useState(() => INITIAL_JOBS.slice(0, 10));
  const [totalJobsCount, setTotalJobsCount] = useState(15500);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1550);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [workMode, setWorkMode] = useState('All');
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [discoveryStats, setDiscoveryStats] = useState({ totalOpportunities: 15500, networkStatus: 'ACTIVE' });
  const [selectedJob, setSelectedJob] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 3. User & Auth State (Item 5 & 13)
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('rp_user');
    return stored ? JSON.parse(stored) : {
      id: 'usr_kushal_101',
      name: 'Kushal Kumar',
      email: 'kushalkumar.pulakanti@gmail.com',
      avatar: 'avatar_1',
      authProvider: 'google'
    };
  });

  // 4. Modals & Popups State (Unified Design System - Item 14)
  const [isThemesModalOpen, setIsThemesModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [authModal, setAuthModal] = useState({ isOpen: false, view: 'login' });

  // 5. Theme State (Item 6, 7, 8, 15)
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('rp_theme') || 'default';
  });
  const [mouseCursorAnimation, setMouseCursorAnimation] = useState(() => {
    return localStorage.getItem('rp_anim_cursor') === 'true';
  });
  const [dataFlowAnimation, setDataFlowAnimation] = useState(() => {
    return localStorage.getItem('rp_anim_data') === 'true';
  });

  // Apply Theme on Root Element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('rp_theme', currentTheme);
  }, [currentTheme]);

  // Sync Animation Settings
  useEffect(() => {
    localStorage.setItem('rp_anim_cursor', String(mouseCursorAnimation));
  }, [mouseCursorAnimation]);

  useEffect(() => {
    localStorage.setItem('rp_anim_data', String(dataFlowAnimation));
  }, [dataFlowAnimation]);

  // Global Viewport Lock across all tabs (no window-level scrollbar anywhere)
  useEffect(() => {
    if (VALID_TABS.includes(activeTab)) {
      document.body.classList.add('viewport-locked');
      document.documentElement.classList.add('viewport-locked');
    } else {
      document.body.classList.remove('viewport-locked');
      document.documentElement.classList.remove('viewport-locked');
    }
    return () => {
      document.body.classList.remove('viewport-locked');
      document.documentElement.classList.remove('viewport-locked');
    };
  }, [activeTab]);

  // Sync Hash on Browser Back/Forward & Refresh
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (VALID_TABS.includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
    localStorage.setItem('rp_active_tab', tabId);
  };

  // Helper to fetch jobs page from SQLite backend
  const loadJobsPage = async (page = 1, search = '', comp = null, mode = 'All') => {
    try {
      const res = await apiService.getJobs({
        page,
        limit: 10,
        search,
        company: comp && comp !== 'All' ? comp : undefined,
        workMode: mode && mode !== 'All' ? mode : undefined
      });
      if (res && res.jobs) {
        setJobs(res.jobs);
        setTotalJobsCount(res.total || 15500);
        setCurrentPage(res.page || 1);
        setTotalPages(res.totalPages || 1550);
      }
    } catch (err) {
      console.warn('Jobs load notice, fallback:', err);
    }
  };

  // Load initial backend data & verify current session
  useEffect(() => {
    let isMounted = true;
    async function loadBackendData() {
      try {
        const [jobsRes, fetchedActivities, fetchedStats, userSession] = await Promise.all([
          apiService.getJobs({ page: 1, limit: 10 }),
          apiService.getActivities(),
          apiService.getDiscoveryStats(),
          apiService.getMe()
        ]);
        if (isMounted) {
          if (jobsRes && jobsRes.jobs) {
            setJobs(jobsRes.jobs);
            setTotalJobsCount(jobsRes.total || 15500);
            setCurrentPage(jobsRes.page || 1);
            setTotalPages(jobsRes.totalPages || 1550);
          }
          if (fetchedActivities && fetchedActivities.length > 0) setActivities(fetchedActivities);
          if (fetchedStats) setDiscoveryStats(fetchedStats);
          if (userSession && userSession.user) {
            setCurrentUser(userSession.user);
            localStorage.setItem('rp_user', JSON.stringify(userSession.user));
          }
        }
      } catch (err) {
        console.warn('Backend load notice, falling back to local dataset:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadBackendData();
    return () => { isMounted = false; };
  }, []);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleApply = async (id, company, role) => {
    setJobs(prev => prev.map(job => {
      if (job.id === id) {
        return { ...job, applied: !job.applied };
      }
      return job;
    }));

    const targetJob = jobs.find(j => j.id === id);
    const isNowApplied = !targetJob?.applied;

    if (isNowApplied) {
      showToast(`Applied successfully to ${role} at ${company}!`);
      try {
        await apiService.applyJob(id);
      } catch (e) {
        console.warn('Applied offline fallback', e);
      }

      const newAct = {
        id: `act_${Date.now()}`,
        time: 'Just now',
        platform: company,
        iconType: 'user',
        text: `Application submitted for ${role} (${targetJob?.atsScore || 85}% ATS)`,
        countBadge: 'Applied'
      };

      setActivities(prev => [newAct, ...prev]);
      try {
        await apiService.addActivity(newAct);
      } catch (e) {
        console.warn('Activity logged locally', e);
      }
    } else {
      showToast(`Application withdrawn for ${role} at ${company}`);
    }
  };

  const handleSelectCompanyFromRadar = (companyName) => {
    setSelectedCompany(companyName);
    loadJobsPage(1, searchQuery, companyName, workMode);
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    loadJobsPage(1, query, selectedCompany, workMode);
  };

  const handleWorkModeChange = (mode) => {
    setWorkMode(mode);
    loadJobsPage(1, searchQuery, selectedCompany, mode);
  };

  const handlePageChange = (newPage) => {
    loadJobsPage(newPage, searchQuery, selectedCompany, workMode);
  };

  const handleClearActivities = async () => {
    setActivities([]);
    try {
      await apiService.clearActivities();
    } catch (e) {
      console.warn('Activities cleared locally', e);
    }
  };

  const handleResetActivities = () => {
    setActivities(INITIAL_ACTIVITIES);
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Role,Company,Source,WorkMode,ATS Score,Salary,Location,DateTime,Status"].join(",") + "\n"
      + jobs.map(j => `"${j.role}","${j.company}","${j.source}","${j.workMode}",${j.atsScore},"${j.salary}","${j.location}","${j.dateTime}","${j.applied ? 'Applied' : 'Pending'}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `resume_porter_opportunities_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${jobs.length} jobs to CSV`);
  };

  // Avatar Selection Handler (5 Static Avatars - Item 13)
  const handleUpdateAvatar = async (avatarId) => {
    const updated = { ...currentUser, avatar: avatarId };
    setCurrentUser(updated);
    localStorage.setItem('rp_user', JSON.stringify(updated));
    showToast(`Profile avatar updated.`);
    try {
      await apiService.updateAvatar(avatarId);
    } catch (e) {
      console.warn('Avatar saved locally', e);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('rp_auth_token');
    localStorage.removeItem('rp_user');
    setCurrentUser(null);
    showToast('You have been logged out.');
  };

  return (
    <div className={`app-shell viewport-locked ${activeTab === 'explore' ? 'explore-view' : ''} ${activeTab === 'generation' ? 'generation-view-screen' : ''}`} style={{ position: 'relative' }}>
      {/* Universal Top Navigation Bar with Embedded Profile Menu */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange}
        currentUser={currentUser}
        onOpenAuthModal={(v = 'login') => setAuthModal({ isOpen: true, view: v })}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenThemes={() => setIsThemesModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* 1. Explore Tab */}
      {activeTab === 'explore' && (
        <main className="content-container explore-content-container">
          {/* Hardware Accelerated Radar Engine */}
          <JobDiscoveryEngine 
            onSelectCompany={handleSelectCompanyFromRadar}
            selectedSource={selectedCompany}
            stats={discoveryStats}
          />

          {/* Lower Two-Column Grid: Job List & Activity Feed */}
          <div className="main-two-column-layout">
            <JobList 
              jobs={jobs}
              totalCount={totalJobsCount}
              page={currentPage}
              pageSize={10}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              companyFilter={selectedCompany}
              onClearCompanyFilter={() => handleSelectCompanyFromRadar('All')}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              activeWorkMode={workMode}
              onWorkModeChange={handleWorkModeChange}
              onApply={handleApply}
              onSelectJob={setSelectedJob}
              onExport={handleExport}
            />

            <ActivityFeed 
              activities={activities}
              onClear={handleClearActivities}
              onReset={handleResetActivities}
            />
          </div>
        </main>
      )}

      {/* 2. Generation View */}
      {activeTab === 'generation' && (
        <main className="content-container generation-content-container">
          <GenerationView />
        </main>
      )}

      {/* 3. Automated Application Pipelines View */}
      {activeTab === 'automation' && (
        <main className="content-container automation-content-container">
          <AutomationView onNavigateTab={handleTabChange} />
        </main>
      )}

      {/* 4. Profile & Preferences View */}
      {activeTab === 'profile' && (
        <main className="content-container profile-content-container">
          <ProfileView />
        </main>
      )}

      {/* 5. Application Analytics View */}
      {activeTab === 'analytics' && (
        <main className="content-container analytics-content-container">
          <AnalyticsView />
        </main>
      )}

      {/* 6. Tools Menu Tab */}
      {activeTab === 'tools' && (
        <main className="content-container tools-content-container">
          <ToolsView onBackToExplore={() => handleTabChange('explore')} />
        </main>
      )}

      {/* ======================================================================
          UNIVERSAL POPUP & MODAL SYSTEM (Item 14)
          ====================================================================== */}

      {/* 1. Themes Modal (Exact Replica of User Sketch) */}
      <ThemesModal 
        isOpen={isThemesModalOpen}
        onClose={() => setIsThemesModalOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
        mouseCursorAnimation={mouseCursorAnimation}
        setMouseCursorAnimation={setMouseCursorAnimation}
        dataFlowAnimation={dataFlowAnimation}
        setDataFlowAnimation={setDataFlowAnimation}
      />

      {/* 2. Settings Modal with MCP & AI API Integrations (Item 9 & 13) */}
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
        onUpdateAvatar={handleUpdateAvatar}
      />

      {/* 3. Help, Privacy Guidelines & Issue Resolution Tickets (Item 12) */}
      <HelpPrivacyModal 
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        currentUser={currentUser}
      />

      {/* 4. Authentication Suite Modal (Login, Register, Forgot Password, Google Auth - Item 5) */}
      <AuthModal 
        isOpen={authModal.isOpen}
        initialView={authModal.view}
        onClose={() => setAuthModal({ isOpen: false, view: 'login' })}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome, ${user.name}!`);
        }}
      />

      {/* 5. Detail Modal */}
      {selectedJob && (
        <JobModal 
          job={selectedJob} 
          onClose={() => setSelectedJob(null)}
          onApply={handleApply}
        />
      )}

      {/* Floating Action Feedback Toast */}
      {toastMessage && (
        <div className="toast-floating-container" role="status">
          <CheckCircle2 size={18} className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
