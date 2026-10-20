import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import Navbar from './components/Navbar';
import JobDiscoveryEngine from './components/JobDiscoveryEngine';
import JobList from './components/JobList';
import ActivityFeed from './components/ActivityFeed';
import JobModal from './components/JobModal';
import ThemesModal from './components/ThemesModal';
import SettingsModal from './components/SettingsModal';
import HelpPrivacyModal from './components/HelpPrivacyModal';
import AuthModal from './components/AuthModal';
import NotificationCenter from './components/NotificationCenter';
import ConfirmDialog from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';
import MandatoryProfileGate from './components/MandatoryProfileGate';
import { GenericPageSkeleton } from './components/SkeletonLoader';
import { ToastProvider, useToast } from './components/ToastContext';
import { apiService } from './services/api';
import './components/UniversalModal.css';
import './App.css';

// Code Splitting with React.lazy() for non-initial heavy views (Audit Item 7)
const GenerationView = lazy(() => import('./components/GenerationView'));
const AutomationView = lazy(() => import('./components/AutomationView'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const AnalyticsView = lazy(() => import('./components/AnalyticsView'));
const ToolsView = lazy(() => import('./components/ToolsView'));

const VALID_TABS = ['explore', 'generation', 'automation', 'profile', 'analytics', 'tools'];

const DEFAULT_MENU_ITEMS = [
  { id: 'explore', label: 'Explore', description: 'Job Discovery Radar & Live ATS Feed', enabled: true },
  { id: 'generation', label: 'Generation', description: 'AI Resume & Cover Letter Studio', enabled: true },
  { id: 'automation', label: 'Automation', description: 'Autonomous Application Pipelines', enabled: true },
  { id: 'profile', label: 'Profile', description: 'Candidate Identity & ATS Resume Data', enabled: true },
  { id: 'analytics', label: 'Analytics', description: 'Application Metrics & Conversion Rates', enabled: true },
  { id: 'tools', label: 'Tools', description: 'MCP Integrations & ATS Diagnostic Utilities', enabled: true }
];

function AppContent() {
  const { showToast } = useToast();

  // Navigation Menu Configuration
  const [menuItems, setMenuItems] = useState(() => {
    try {
      const stored = localStorage.getItem('rp_menu_items');
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback to default
    }
    return DEFAULT_MENU_ITEMS;
  });

  // 1. Persistent Routing on Refresh
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (VALID_TABS.includes(hash)) return hash;
    const stored = localStorage.getItem('rp_active_tab');
    if (VALID_TABS.includes(stored)) return stored;
    return 'explore';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // 2. Application Dataset & Pagination
  const [jobs, setJobs] = useState([]);
  const [totalJobsCount, setTotalJobsCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isProfileDriven, setIsProfileDriven] = useState(true);
  const [activeProfileRoles, setActiveProfileRoles] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [workMode, setWorkMode] = useState('All');
  const [activeOrigin, setActiveOrigin] = useState('all');
  const [isMarkedOnly, setIsMarkedOnly] = useState(false);
  const [harvestStatus, setHarvestStatus] = useState(null);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [activities, setActivities] = useState([]);
  const [discoveryStats, setDiscoveryStats] = useState({ totalOpportunities: 0, networkStatus: 'ACTIVE', topCompanies: [], sources: [] });
  const [selectedJob, setSelectedJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHistoryDay, setSelectedHistoryDay] = useState(null);
  const [historyOptions, setHistoryOptions] = useState([]);

  // 3. User & Auth State (Account identity of the logged-in person)
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('rp_user');
    return stored ? JSON.parse(stored) : {
      id: 'usr_guest',
      name: 'Guest User',
      email: '',
      avatar: 'avatar_1',
      authProvider: 'local'
    };
  });

  // Candidate Profile State (Resume profile data, independent from login account)
  const [candidateProfile, setCandidateProfile] = useState(() => {
    const stored = localStorage.getItem('rp_candidate_profile');
    return stored ? JSON.parse(stored) : {
      name: '',
      title: '',
      email: '',
      avatar: 'avatar_1'
    };
  });

  // Stage 1: Active Candidate Profile Identity & Mandatory Completion Gate
  const [activeCandidateProfile, setActiveCandidateProfile] = useState(() => {
    return {
      id: 'default',
      name: 'Primary Profile',
      isComplete: false
    };
  });
  const [profileValidation, setProfileValidation] = useState(null);
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);

  const checkProfileValidation = useCallback(async () => {
    try {
      const val = await apiService.getActiveProfileValidation();
      if (val) {
        setProfileValidation(val);
        setActiveCandidateProfile(prev => {
          const wasComplete = prev.isComplete;
          const nowComplete = Boolean(val.isComplete);
          // If profile just transitioned to 100% complete, show success popup
          if (!wasComplete && nowComplete) {
            setIsGateModalOpen(true);
          }
          return {
            id: val.profileId || prev.id || 'default',
            name: val.profileName || prev.name || 'Primary Profile',
            isComplete: nowComplete
          };
        });
      }
    } catch (e) {
      console.warn('Profile validation check notice:', e);
    }
  }, []);

  // 4. Modals & Popups State
  const [isThemesModalOpen, setIsThemesModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [authModal, setAuthModal] = useState({ isOpen: false, view: 'login' });

  // 5. Theme State
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('rp_theme') || 'default';
  });
  const [colorMode, setColorMode] = useState(() => {
    return localStorage.getItem('rp_color_mode') || 'default';
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

  // Apply Color Mode on Root Element (Default, Light, Dark)
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', colorMode);
    localStorage.setItem('rp_color_mode', colorMode);
  }, [colorMode]);

  // Apply Active Page on Root Element for Per-Page Contextual Theming
  useEffect(() => {
    document.documentElement.setAttribute('data-page', activeTab);
  }, [activeTab]);

  // Sync Animation Settings & Body Classes
  useEffect(() => {
    if (mouseCursorAnimation) {
      document.body.classList.add('anim-cursor-active');
    } else {
      document.body.classList.remove('anim-cursor-active');
    }
    localStorage.setItem('rp_anim_cursor', String(mouseCursorAnimation));
  }, [mouseCursorAnimation]);

  useEffect(() => {
    if (dataFlowAnimation) {
      document.body.classList.add('anim-dataflow-active');
    } else {
      document.body.classList.remove('anim-dataflow-active');
    }
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

  const handleUpdateMenuSettings = (newItems) => {
    setMenuItems(newItems);
    localStorage.setItem('rp_menu_items', JSON.stringify(newItems));
    // If the active tab has been disabled, navigate smoothly to the first enabled tab
    const currentItem = newItems.find(i => i.id === activeTab);
    if (!currentItem || currentItem.enabled === false) {
      const firstEnabled = newItems.find(i => i.enabled !== false);
      if (firstEnabled) {
        handleTabChange(firstEnabled.id);
      }
    }
  };

  // Expose test helper on window for automated multi-theme/mode screenshot capture
  useEffect(() => {
    window.__setTestState = {
      setTab: handleTabChange,
      setTheme: (t) => {
        setCurrentTheme(t);
        localStorage.setItem('rp_theme', t);
        document.documentElement.setAttribute('data-theme', t);
      },
      setMode: (m) => {
        setColorMode(m);
        localStorage.setItem('rp_color_mode', m);
        document.documentElement.setAttribute('data-mode', m);
      },
      openSettings: () => setIsSettingsModalOpen(true),
      closeSettings: () => setIsSettingsModalOpen(false),
      openThemes: () => setIsThemesModalOpen(true),
      closeThemes: () => setIsThemesModalOpen(false),
      openHelp: () => setIsHelpModalOpen(true),
      closeHelp: () => setIsHelpModalOpen(false),
      openNotifications: () => setIsNotifCenterOpen(true),
      closeNotifications: () => setIsNotifCenterOpen(false),
      closeAllModals: () => {
        setIsSettingsModalOpen(false);
        setIsThemesModalOpen(false);
        setIsHelpModalOpen(false);
        setIsNotifCenterOpen(false);
        setShowLogoutConfirm(false);
      }
    };
  }, []);

  // Helper to fetch jobs page from SQLite backend
  const loadJobsPage = async (page = 1, search = searchQuery, comp = selectedCompany, mode = workMode, profileDriven = isProfileDriven, orig = activeOrigin, dayOffset = selectedHistoryDay?.dayOffset, marked = isMarkedOnly) => {
    setIsLoading(true);
    try {
      const res = await apiService.getJobs({
        page,
        limit: 10,
        search,
        company: comp && comp !== 'All' ? comp : undefined,
        workMode: mode && mode !== 'All' ? mode : undefined,
        profileDriven,
        origin: orig && orig !== 'all' ? orig : undefined,
        dayOffset: dayOffset !== undefined && dayOffset !== null ? dayOffset : undefined,
        marked: marked ? true : undefined
      });
      if (res && res.jobs) {
        setJobs(res.jobs);
        setTotalJobsCount(res.total !== undefined ? res.total : 0);
        setCurrentPage(res.page || 1);
        setTotalPages(res.totalPages !== undefined ? res.totalPages : 0);
        if (res.activeProfileRoles && res.activeProfileRoles.length > 0) {
          setActiveProfileRoles(res.activeProfileRoles);
        }
      }
    } catch (err) {
      console.warn('Jobs load notice, fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Live Profile Sync Listener: Whenever Profile is saved, Explore immediately synchronizes
  useEffect(() => {
    const handleProfileSync = () => {
      checkProfileValidation();
      loadJobsPage(1, searchQuery, selectedCompany, workMode, isProfileDriven, activeOrigin);
      apiService.getDiscoveryStats().then(stats => {
        if (stats) setDiscoveryStats(stats);
      });
      apiService.getHarvestStatus().then(status => {
        if (status) setHarvestStatus(status);
      });
    };

    const handleCandidateUpdate = (e) => {
      if (e.detail) {
        setCandidateProfile(prev => {
          const updated = { ...prev, ...e.detail };
          localStorage.setItem('rp_candidate_profile', JSON.stringify(updated));
          return updated;
        });
        checkProfileValidation();
      }
    };

    const handleUserUpdate = (e) => {
      if (e.detail) {
        setCurrentUser(prev => {
          const updated = { ...prev, ...e.detail };
          localStorage.setItem('rp_user', JSON.stringify(updated));
          return updated;
        });
      }
    };
    window.addEventListener('rp_profile_updated', handleProfileSync);
    window.addEventListener('rp_candidate_updated', handleCandidateUpdate);
    window.addEventListener('rp_user_updated', handleUserUpdate);
    return () => {
      window.removeEventListener('rp_profile_updated', handleProfileSync);
      window.removeEventListener('rp_candidate_updated', handleCandidateUpdate);
      window.removeEventListener('rp_user_updated', handleUserUpdate);
    };
  }, [searchQuery, selectedCompany, workMode, isProfileDriven, activeOrigin, checkProfileValidation]);

  // Load initial backend data & verify current session
  useEffect(() => {
    let isMounted = true;
    async function loadBackendData() {
      try {
        const [jobsRes, fetchedActivities, fetchedStats, userSession, hStatus, histRes, profData, menuData] = await Promise.all([
          apiService.getJobs({ page: 1, limit: 10, profileDriven: true }),
          apiService.getActivities(),
          apiService.getDiscoveryStats(),
          apiService.getMe(),
          apiService.getHarvestStatus(),
          apiService.getHistorySummary(),
          apiService.getProfile().catch(() => null),
          apiService.getMenuSettings().catch(() => null)
        ]);
        if (isMounted) {
          if (jobsRes && jobsRes.jobs) {
            setJobs(jobsRes.jobs);
            setTotalJobsCount(jobsRes.total !== undefined ? jobsRes.total : 0);
            setCurrentPage(jobsRes.page || 1);
            setTotalPages(jobsRes.totalPages !== undefined ? jobsRes.totalPages : 0);
            if (jobsRes.activeProfileRoles && jobsRes.activeProfileRoles.length > 0) {
              setActiveProfileRoles(jobsRes.activeProfileRoles);
            }
          }
          if (fetchedActivities && fetchedActivities.length > 0) setActivities(fetchedActivities);
          if (fetchedStats) setDiscoveryStats(fetchedStats);
          if (hStatus) setHarvestStatus(hStatus);
          if (histRes && histRes.length > 0) {
            setHistoryOptions(histRes);
            setSelectedHistoryDay(histRes[0]);
          }
          if (userSession && userSession.user) {
            setCurrentUser(userSession.user);
            localStorage.setItem('rp_user', JSON.stringify(userSession.user));
          }
          if (menuData && Array.isArray(menuData) && menuData.length > 0) {
            setMenuItems(menuData);
            localStorage.setItem('rp_menu_items', JSON.stringify(menuData));
          }
          if (profData && (profData.general?.fullName || profData.contacts?.fullName || profData.summary)) {
            const cObj = {
              name: profData.general?.fullName || profData.contacts?.fullName || '',
              title: profData.summary || profData.general?.bio || '',
              email: profData.general?.email || profData.contacts?.email || '',
              avatar: profData.avatar || 'avatar_1'
            };
            setCandidateProfile(cObj);
            localStorage.setItem('rp_candidate_profile', JSON.stringify(cObj));
          } else {
            setCandidateProfile({ name: '', title: '', email: '', avatar: 'avatar_1' });
            localStorage.removeItem('rp_candidate_profile');
          }
        }
        await checkProfileValidation();
      } catch (err) {
        console.warn('Backend load notice, falling back to local dataset:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadBackendData();
    return () => { isMounted = false; };
  }, [checkProfileValidation]);

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
      showToast(`Applied successfully to ${role} at ${company}!`, 'success');
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
      showToast(`Application withdrawn for ${role} at ${company}`, 'info');
    }
  };

  const handleToggleMarker = async (id) => {
    try {
      const res = await apiService.toggleJobMarker(id);
      const newMarked = res.marked;
      setJobs(prev => prev.map(j => j.id === id ? { ...j, marked: newMarked } : j));
      if (selectedJob && selectedJob.id === id) {
        setSelectedJob(prev => ({ ...prev, marked: newMarked }));
      }
      showToast(newMarked ? 'Job marked / bookmarked!' : 'Marker removed', 'info');
      if (isMarkedOnly && !newMarked) {
        loadJobsPage(currentPage, searchQuery, selectedCompany, workMode, isProfileDriven, activeOrigin, selectedHistoryDay?.dayOffset, true);
      }
    } catch (e) {
      console.warn('Failed to toggle job marker:', e);
    }
  };

  const handleToggleMarkedOnly = () => {
    const nextMarked = !isMarkedOnly;
    setIsMarkedOnly(nextMarked);
    loadJobsPage(1, searchQuery, selectedCompany, workMode, isProfileDriven, activeOrigin, selectedHistoryDay?.dayOffset, nextMarked);
  };

  const handleHarvestActivity = useCallback((act) => {
    if (!act) return;
    setActivities(prev => {
      if (prev.some(a => a.id === act.id || a.text === act.text)) return prev;
      return [act, ...prev.slice(0, 49)];
    });
  }, []);

  const handleJobDiscovered = useCallback((job) => {
    if (!job) return;
    setJobs(prev => {
      if (prev.some(j => j.id === job.id)) return prev;
      return [job, ...prev.slice(0, 9)];
    });
    setTotalJobsCount(prev => prev + 1);
  }, []);

  const handleSelectCompanyFromRadar = (companyName) => {
    setSelectedCompany(companyName);
    loadJobsPage(1, searchQuery, companyName, workMode, isProfileDriven, activeOrigin, selectedHistoryDay?.dayOffset);
  };

  const handleSelectHistoryDay = (day) => {
    setSelectedHistoryDay(day);
    loadJobsPage(1, searchQuery, selectedCompany, workMode, isProfileDriven, activeOrigin, day.dayOffset);
    if (day.dayOffset > 0) {
      showToast(`Viewing historical archive: ${day.label} (${day.formattedDate})`, 'info');
    } else {
      showToast("Returned to Today's live discovery explorer", 'success');
    }
  };

  const handleOriginChange = (orig) => {
    setActiveOrigin(orig);
    loadJobsPage(1, searchQuery, selectedCompany, workMode, isProfileDriven, orig);
  };

  const handleHarvestSync = async (providers = null) => {
    setIsHarvesting(true);
    showToast('Connecting to direct ATS public feeds (Greenhouse, Ashby, Lever, RemoteOK)...', 'info');
    try {
      const res = await apiService.syncHarvest(providers, 15);
      showToast(`Harvest complete! ${res.totalInserted || 0} new opportunities ingested into search (${res.totalHarvested || 0} crawled).`, 'success');
      const updatedStatus = await apiService.getHarvestStatus();
      if (updatedStatus) setHarvestStatus(updatedStatus);
      loadJobsPage(1, searchQuery, selectedCompany, workMode, isProfileDriven, activeOrigin);

      // Log Harvest event into live Activity Feed
      const harvestAct = {
        id: `act_${Date.now()}`,
        time: 'Just now',
        platform: 'Harvester',
        iconType: 'harvester',
        text: `Live crawl finished: ${res.totalHarvested || 0} jobs scanned, ${res.totalInserted || 0} new opportunities ingested`,
        countBadge: 'Harvested'
      };
      setActivities(prev => [harvestAct, ...prev]);
      try {
        await apiService.addActivity(harvestAct);
      } catch (e) {}
    } catch (err) {
      showToast('Harvest failed to reach some boards.', 'error');
    } finally {
      setIsHarvesting(false);
    }
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    loadJobsPage(1, query, selectedCompany, workMode, isProfileDriven, activeOrigin);
  };

  const handleWorkModeChange = (mode) => {
    setWorkMode(mode);
    loadJobsPage(1, searchQuery, selectedCompany, mode, isProfileDriven, activeOrigin);
  };

  const handlePageChange = (newPage) => {
    loadJobsPage(newPage, searchQuery, selectedCompany, workMode, isProfileDriven, activeOrigin);
  };

  const handleClearActivities = async () => {
    setActivities([]);
    try {
      await apiService.clearActivities();
      showToast('Activity log cleared.', 'info');
    } catch (e) {
      console.warn('Activities cleared locally', e);
    }
  };

  const handleResetActivities = async () => {
    try {
      const actRes = await apiService.getActivities();
      setActivities(actRes || []);
      showToast('Activity log refreshed.', 'info');
    } catch {
      setActivities([]);
    }
  };

  // Full Microsoft Excel (.xlsx) & Spreadsheet Export (Stage 1 Requirement 9)
  const handleExport = async (format = 'xlsx') => {
    try {
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      showToast(`Downloading Microsoft Excel (.${ext}) spreadsheet...`, 'info');

      const exportUrl = apiService.getExportJobsUrl({
        search: searchQuery,
        company: selectedCompany && selectedCompany !== 'All' ? selectedCompany : undefined,
        workMode: workMode && workMode !== 'All' ? workMode : undefined,
        profileDriven: isProfileDriven,
        origin: activeOrigin && activeOrigin !== 'all' ? activeOrigin : undefined,
        dayOffset: selectedHistoryDay?.dayOffset,
        format: ext
      });

      const filename = `Skill2Role_Jobs_${new Date().toISOString().slice(0, 10)}.${ext}`;

      // Native browser direct download (bypasses blob GUID issues, preserves true .xlsx extension & Excel icon)
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = exportUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        try {
          if (link.parentNode) link.parentNode.removeChild(link);
        } catch (e) {}
      }, 2000);

      showToast(`Exported ${filename} successfully!`, 'success');

      // Log export action into Activity Feed
      const exportAct = {
        id: `act_${Date.now()}`,
        time: 'Just now',
        platform: 'System',
        iconType: 'check',
        text: `Exported filtered opportunities to Microsoft Excel (.${ext}) spreadsheet`,
        countBadge: 'Exported'
      };
      setActivities(prev => [exportAct, ...prev]);
      try {
        await apiService.addActivity(exportAct);
      } catch (e) {}
    } catch (e) {
      console.error('Export failed:', e);
      showToast('Export failed, please try again.', 'error');
    }
  };

  // Avatar Selection Handler
  const handleUpdateAvatar = async (avatarId) => {
    const updated = { ...currentUser, avatar: avatarId };
    setCurrentUser(updated);
    localStorage.setItem('rp_user', JSON.stringify(updated));
    showToast(`Profile avatar updated.`, 'success');
    try {
      await apiService.updateAvatar(avatarId);
    } catch (e) {
      console.warn('Avatar saved locally', e);
    }
  };

  // Logout Handler with Confirmation
  const handleExecuteLogout = () => {
    localStorage.removeItem('rp_auth_token');
    localStorage.removeItem('rp_user');
    setCurrentUser(null);
    setShowLogoutConfirm(false);
    showToast('You have been logged out.', 'info');
  };

  return (
    <div className={`app-shell viewport-locked ${activeTab === 'explore' ? 'explore-view' : ''} ${activeTab === 'generation' ? 'generation-view-screen' : ''}`} style={{ position: 'relative' }}>
      {/* Liquid Glass Ambient Blurred Color Bubbles (Active for Glass Theme) */}
      <div className="glass-ambient-background" aria-hidden="true">
        <div className="glass-orb glass-orb-1"></div>
        <div className="glass-orb glass-orb-2"></div>
        <div className="glass-orb glass-orb-3"></div>
        <div className="glass-orb glass-orb-4"></div>
        <div className="glass-orb glass-orb-5"></div>
      </div>

      {/* Universal Top Navigation Bar with Embedded Profile Menu & Notifications */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange}
        currentUser={currentUser}
        candidateProfile={candidateProfile}
        activeCandidateProfile={activeCandidateProfile}
        onProfileSwitched={(id) => {
          checkProfileValidation();
          loadJobsPage(1, searchQuery, selectedCompany, workMode, isProfileDriven, activeOrigin, selectedHistoryDay?.dayOffset);
        }}
        onOpenCreateProfile={() => handleTabChange('profile')}
        onOpenProfileGate={() => setIsGateModalOpen(true)}
        onOpenAuthModal={(v = 'login') => setAuthModal({ isOpen: true, view: v })}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenThemes={() => setIsThemesModalOpen(true)}
        onOpenNotifications={() => setIsNotifCenterOpen(true)}
        unreadNotifsCount={0}
        onLogout={() => setShowLogoutConfirm(true)}
        menuItems={menuItems}
      />

      {/* 1. Explore Tab */}
      {activeTab === 'explore' && (
        <ErrorBoundary fallbackTitle="Could not load Job Discovery Radar">
          <main className="content-container explore-content-container explore-view">
            {/* Hardware Accelerated Radar Engine */}
            <JobDiscoveryEngine 
              totalJobs={totalJobsCount}
              onSelectCompany={handleSelectCompanyFromRadar}
              selectedSource={selectedCompany}
              stats={discoveryStats}
              searchQuery={searchQuery}
              activeOrigin={activeOrigin}
              selectedDay={selectedHistoryDay}
              onJobDiscovered={handleJobDiscovered}
              onHarvestActivity={handleHarvestActivity}
              isProfileComplete={activeCandidateProfile?.isComplete}
              onOpenProfileGate={() => setIsGateModalOpen(true)}
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
                isLoading={isLoading}
                profileDriven={isProfileDriven}
                activeProfileRoles={activeProfileRoles}
                onToggleProfileDriven={() => {
                  const nextMode = !isProfileDriven;
                  setIsProfileDriven(nextMode);
                  loadJobsPage(1, searchQuery, selectedCompany, workMode, nextMode, activeOrigin, selectedHistoryDay?.dayOffset);
                }}
                selectedHistoryDay={selectedHistoryDay}
                historyOptions={historyOptions}
                onSelectHistoryDay={handleSelectHistoryDay}
                onHarvestSync={handleHarvestSync}
                isHarvesting={isHarvesting}
                isMarkedOnly={isMarkedOnly}
                onToggleMarkedOnly={handleToggleMarkedOnly}
                onToggleMarker={handleToggleMarker}
                onImportSuccess={(res) => {
                  showToast(`Imported ${res?.inserted || 0} jobs successfully (${res?.skipped || 0} duplicates skipped)`, 'success');
                  loadJobsPage(1, searchQuery, selectedCompany, workMode, isProfileDriven, activeOrigin, selectedHistoryDay?.dayOffset);
                }}
              />

              <ActivityFeed 
                activities={activities}
                onClear={handleClearActivities}
                onReset={handleResetActivities}
              />
            </div>
          </main>
        </ErrorBoundary>
      )}

      {/* 2. Generation View (Lazy Loaded) */}
      {activeTab === 'generation' && (
        <ErrorBoundary fallbackTitle="Could not load Resume Generation Studio">
          <main className="content-container generation-content-container">
            <Suspense fallback={<GenericPageSkeleton />}>
              <GenerationView />
            </Suspense>
          </main>
        </ErrorBoundary>
      )}

      {/* 3. Automated Application Pipelines View (Lazy Loaded) */}
      {activeTab === 'automation' && (
        <ErrorBoundary fallbackTitle="Could not load Automation Pipeline">
          <main className="content-container automation-content-container">
            <Suspense fallback={<GenericPageSkeleton />}>
              <AutomationView onNavigateTab={handleTabChange} />
            </Suspense>
          </main>
        </ErrorBoundary>
      )}

      {/* 4. Profile & Preferences View (Lazy Loaded) */}
      {activeTab === 'profile' && (
        <ErrorBoundary fallbackTitle="Could not load Candidate Profile">
          <main className="content-container profile-content-container">
            <Suspense fallback={<GenericPageSkeleton />}>
              <ProfileView />
            </Suspense>
          </main>
        </ErrorBoundary>
      )}

      {/* 5. Application Analytics View (Lazy Loaded) */}
      {activeTab === 'analytics' && (
        <ErrorBoundary fallbackTitle="Could not load Analytics Dashboard">
          <main className="content-container analytics-content-container">
            <Suspense fallback={<GenericPageSkeleton />}>
              <AnalyticsView />
            </Suspense>
          </main>
        </ErrorBoundary>
      )}

      {/* 6. Tools Menu Tab (Lazy Loaded) */}
      {activeTab === 'tools' && (
        <ErrorBoundary fallbackTitle="Could not load AI Tools">
          <main className="content-container tools-content-container">
            <Suspense fallback={<GenericPageSkeleton />}>
              <ToolsView onBackToExplore={() => handleTabChange('explore')} />
            </Suspense>
          </main>
        </ErrorBoundary>
      )}

      {/* ======================================================================
          UNIVERSAL POPUP & MODAL SYSTEM
          ====================================================================== */}

      {/* 1. Themes Modal */}
      <ThemesModal 
        isOpen={isThemesModalOpen}
        onClose={() => setIsThemesModalOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
        colorMode={colorMode}
        setColorMode={setColorMode}
        mouseCursorAnimation={mouseCursorAnimation}
        setMouseCursorAnimation={setMouseCursorAnimation}
        dataFlowAnimation={dataFlowAnimation}
        setDataFlowAnimation={setDataFlowAnimation}
      />

      {/* 2. Settings Modal with MCP & AI API Integrations */}
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
        onUpdateAvatar={handleUpdateAvatar}
        menuItems={menuItems}
        onUpdateMenu={handleUpdateMenuSettings}
      />

      {/* 3. Help, Privacy Guidelines & Issue Resolution Tickets */}
      <HelpPrivacyModal 
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        currentUser={currentUser}
      />

      {/* 4. Authentication Suite Modal */}
      <AuthModal 
        isOpen={authModal.isOpen}
        initialView={authModal.view}
        onClose={() => setAuthModal({ isOpen: false, view: 'login' })}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome back, ${user.name}!`, 'success');
        }}
      />

      {/* 5. Detail Modal */}
      {selectedJob && (
        <JobModal 
          job={selectedJob} 
          onClose={() => setSelectedJob(null)}
          onApply={handleApply}
          onToggleMarker={handleToggleMarker}
        />
      )}

      {/* 6. Global Notification Center Drawer */}
      <NotificationCenter
        isOpen={isNotifCenterOpen}
        onClose={() => setIsNotifCenterOpen(false)}
        onNavigateTab={handleTabChange}
      />

      {/* 7. Destructive Action Confirmation for Logout */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sign Out of Resume Porter?"
        message="You will need to sign in again to access saved tailored CVs and active automation pipelines."
        confirmLabel="Sign Out"
        cancelLabel="Stay Logged In"
        variant="danger"
        onConfirm={handleExecuteLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* 8. Stage 1 Mandatory Profile Completion Gate Modal */}
      <MandatoryProfileGate
        isOpen={isGateModalOpen}
        onClose={() => setIsGateModalOpen(false)}
        validationData={profileValidation}
        onNavigateToProfile={() => {
          setIsGateModalOpen(false);
          handleTabChange('profile');
        }}
        onStartExplorer={() => {
          setIsGateModalOpen(false);
          handleTabChange('explore');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
