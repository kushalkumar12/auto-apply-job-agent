import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import Navbar from './components/Navbar';
import JobList from './components/JobList';
import JobModal from './components/JobModal';
import ThemesModal from './components/ThemesModal';
import SettingsModal from './components/SettingsModal';
import HelpPrivacyModal from './components/HelpPrivacyModal';
import AuthModal from './components/AuthModal';
import AuthView from './components/AuthView';
import NotificationCenter from './components/NotificationCenter';
import ConfirmDialog from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';
import MandatoryProfileGate from './components/MandatoryProfileGate';
import { GenericPageSkeleton } from './components/SkeletonLoader';
import { ToastProvider, useToast } from './components/ToastContext';
import { Lock, ArrowRight } from 'lucide-react';
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
  { id: 'explore', label: 'Explore', description: 'Enterprise Opportunities & ATS Matches', enabled: true },
  { id: 'generation', label: 'Generation', description: 'AI Resume & Cover Letter Studio', enabled: true },
  { id: 'automation', label: 'Automation', description: 'Autonomous Application Pipelines', enabled: true },
  { id: 'profile', label: 'Job Profile', description: 'Candidate Identity & ATS Resume Data', enabled: true },
  { id: 'analytics', label: 'Analytics', description: 'Application Metrics & Conversion Rates', enabled: true },
  { id: 'tools', label: 'Tools', description: 'MCP Integrations & ATS Diagnostic Utilities', enabled: true }
];

function AppContent() {
  const { showToast } = useToast();

  // Navigation Menu Configuration
  const [menuItems, setMenuItems] = useState(() => {
    try {
      const stored = localStorage.getItem('rp_menu_items');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map(item => item.id === 'profile' ? { ...item, label: 'Job Profile' } : item);
        }
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_MENU_ITEMS;
  });

  // 1. Persistent Routing on Refresh
  const getInitialTab = () => {
    const rawHash = window.location.hash.replace('#', '').toLowerCase();
    const hash = rawHash.split('/')[0];
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
  const [selectedHistoryDay, setSelectedHistoryDay] = useState({
    dayOffset: 0,
    label: 'Today',
    isLive: true
  });
  const [historyOptions, setHistoryOptions] = useState([]);

  // 3. User & Auth State (Account identity of the logged-in person)
  const [currentUser, setCurrentUser] = useState(() => {
    const token = localStorage.getItem('rp_auth_token');
    const stored = localStorage.getItem('rp_user');
    if (!token || !stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });
  const [authAlert, setAuthAlert] = useState(null);

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
          const nowComplete = Boolean(val.isComplete);
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

  // 5. Theme State - Strictly 'default' or 'minimal'
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('rp_theme');
    if (saved === 'minimal' || saved === 'no-color') return 'minimal';
    return 'default';
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

  // Apply Theme on Root Element (Scoped: Default on Auth/Login, User preference active once logged in)
  useEffect(() => {
    const activeTheme = (currentTheme === 'minimal' || currentTheme === 'no-color') ? 'minimal' : 'default';
    if (currentUser) {
      document.documentElement.setAttribute('data-theme', activeTheme);
      localStorage.setItem('rp_theme', activeTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'default');
    }
  }, [currentTheme, currentUser]);

  // Apply Color Mode on Root Element (Default on Auth/Login, User preference active once logged in)
  useEffect(() => {
    const resolveMode = () => {
      if (!currentUser) return 'default';
      if (colorMode === 'default') {
        // Resolve to browser/system preference
        const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return isSystemDark ? 'dark' : 'light';
      }
      return colorMode; // 'light' or 'dark'
    };

    const applyMode = () => {
      const modeToApply = resolveMode();
      document.documentElement.setAttribute('data-mode', modeToApply);
      if (currentUser) {
        localStorage.setItem('rp_color_mode', colorMode);
      }
    };

    applyMode();

    // If colorMode is 'default', listen for OS/browser theme shifts dynamically
    if (colorMode === 'default' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyMode();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [colorMode, currentUser]);

  // Apply Active Page on Root Element for Per-Page Contextual Theming
  useEffect(() => {
    if (currentUser) {
      document.documentElement.setAttribute('data-page', activeTab);
    } else {
      document.documentElement.setAttribute('data-page', 'auth');
    }
  }, [activeTab, currentUser]);

  // Sync Animation Settings & Body Classes (Active only once logged in)
  useEffect(() => {
    if (currentUser && mouseCursorAnimation) {
      document.body.classList.add('anim-cursor-active');
    } else {
      document.body.classList.remove('anim-cursor-active');
    }
    if (currentUser) {
      localStorage.setItem('rp_anim_cursor', String(mouseCursorAnimation));
    }
  }, [mouseCursorAnimation, currentUser]);

  useEffect(() => {
    if (currentUser && dataFlowAnimation) {
      document.body.classList.add('anim-dataflow-active');
    } else {
      document.body.classList.remove('anim-dataflow-active');
    }
    if (currentUser) {
      localStorage.setItem('rp_anim_data', String(dataFlowAnimation));
    }
  }, [dataFlowAnimation, currentUser]);

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
      const rawHash = window.location.hash.replace('#', '').toLowerCase();
      const hash = rawHash.split('/')[0];
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
  const loadJobsPage = async (page = 1, search = searchQuery, comp = selectedCompany, mode = workMode, profileDriven = isProfileDriven, orig = activeOrigin, dayOffset = (selectedHistoryDay?.dayOffset !== undefined ? selectedHistoryDay.dayOffset : 0), marked = isMarkedOnly, profId = activeCandidateProfile?.id) => {
    setIsLoading(true);
    try {
      const activeDayOffset = (dayOffset !== undefined && dayOffset !== null) ? dayOffset : (selectedHistoryDay?.dayOffset !== undefined ? selectedHistoryDay.dayOffset : 0);
      const res = await apiService.getJobs({
        page,
        limit: 10,
        search,
        company: comp && comp !== 'All' ? comp : undefined,
        workMode: mode && mode !== 'All' ? mode : undefined,
        profileDriven,
        origin: orig && orig !== 'all' ? orig : undefined,
        dayOffset: activeDayOffset,
        marked: marked ? true : undefined,
        profile_id: profId && profId !== 'default' ? profId : undefined
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
    const handleProfileSync = (e) => {
      if (e?.detail?.isComplete !== undefined) {
        setActiveCandidateProfile(prev => ({
          ...prev,
          isComplete: Boolean(e.detail.isComplete)
        }));
      }
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

    const handleSessionExpired = (e) => {
      localStorage.removeItem('rp_candidate_profile');
      setCurrentUser(null);
      setCandidateProfile({ name: '', title: '', email: '', avatar: 'avatar_1' });
      setJobs([]);
      const msg = e?.detail?.message || 'Your session has expired. Please sign in again.';
      setAuthAlert({ type: 'warning', message: msg });
      showToast(msg, 'warning');
      document.documentElement.setAttribute('data-theme', 'default');
      document.documentElement.setAttribute('data-mode', 'default');
      document.documentElement.setAttribute('data-page', 'auth');
    };

    window.addEventListener('rp_profile_updated', handleProfileSync);
    window.addEventListener('rp_candidate_updated', handleCandidateUpdate);
    window.addEventListener('rp_user_updated', handleUserUpdate);
    window.addEventListener('rp_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('rp_profile_updated', handleProfileSync);
      window.removeEventListener('rp_candidate_updated', handleCandidateUpdate);
      window.removeEventListener('rp_user_updated', handleUserUpdate);
      window.removeEventListener('rp_session_expired', handleSessionExpired);
    };
  }, [searchQuery, selectedCompany, workMode, isProfileDriven, activeOrigin, checkProfileValidation, showToast]);

  // Load initial backend data & verify current session
  useEffect(() => {
    let isMounted = true;
    async function loadBackendData() {
      const token = localStorage.getItem('rp_auth_token');
      if (!currentUser || !token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [jobsRes, fetchedActivities, fetchedStats, userSession, hStatus, histRes, profData, menuData] = await Promise.all([
          apiService.getJobs({ page: 1, limit: 10, profileDriven: true, dayOffset: 0 }),
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
            const todayItem = histRes.find(h => h.dayOffset === 0);
            const yesterdayItem = histRes.find(h => h.dayOffset === 1);
            if (todayItem && todayItem.count === 0 && yesterdayItem && yesterdayItem.count > 0) {
              setSelectedHistoryDay(yesterdayItem);
              if (!jobsRes?.jobs || jobsRes.jobs.length === 0) {
                apiService.getJobs({ page: 1, limit: 10, profileDriven: true, dayOffset: 1 }).then(yRes => {
                  if (yRes && yRes.jobs && isMounted) {
                    setJobs(yRes.jobs);
                    setTotalJobsCount(yRes.total !== undefined ? yRes.total : 0);
                    setCurrentPage(yRes.page || 1);
                    setTotalPages(yRes.totalPages !== undefined ? yRes.totalPages : 0);
                  }
                }).catch(() => {});
              }
            } else {
              setSelectedHistoryDay(histRes[0]);
            }
          }
          if (userSession && userSession.user) {
            setCurrentUser(prev => {
              if (prev && prev.id === userSession.user.id && prev.name === userSession.user.name && prev.email === userSession.user.email && prev.avatar === userSession.user.avatar) {
                return prev;
              }
              return userSession.user;
            });
            localStorage.setItem('rp_user', JSON.stringify(userSession.user));
          } else if (localStorage.getItem('rp_auth_token')) {
            // Token is invalid/expired
            setCurrentUser(null);
            localStorage.removeItem('rp_user');
            localStorage.removeItem('rp_auth_token');
          }
          if (menuData && Array.isArray(menuData) && menuData.length > 0) {
            const updatedMenu = menuData.map(item => item.id === 'profile' ? { ...item, label: 'Job Profile' } : item);
            setMenuItems(updatedMenu);
            localStorage.setItem('rp_menu_items', JSON.stringify(updatedMenu));
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
  }, [currentUser?.id, checkProfileValidation]);

  const handleApply = async (id, company, role) => {
    const targetJob = jobs.find(j => j.id === id);
    const isNowApplied = !targetJob?.applied;

    if (!isNowApplied) {
      // Withdrawing application
      try {
        const res = await apiService.applyJob(id);
        if (res && res.applied === false) {
          setJobs(prev => prev.map(job => job.id === id ? { ...job, applied: false } : job));
          showToast(`Application withdrawn for ${role} at ${company}`, 'info');
        }
      } catch (err) {
        const errDetail = err?.data?.detail;
        const msg = (typeof errDetail === 'object' ? errDetail?.message : errDetail) || err.message;
        showToast(`Could not withdraw application: ${msg}`, 'error');
      }
      return;
    }

    // Applying: Must be confirmed by backend submission gate
    try {
      const res = await apiService.applyJob(id, { user_approved: false });
      if (res && res.applied) {
        setJobs(prev => prev.map(job => job.id === id ? { ...job, applied: true } : job));
        showToast(`Applied successfully to ${role} at ${company}!`, 'success');

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
        showToast(`Application was not recorded by the server`, 'error');
      }
    } catch (err) {
      const errDetail = err?.data?.detail;
      const errorCode = (typeof errDetail === 'object' ? errDetail?.error : null) || 'BLOCKED';
      const errorMsg = (typeof errDetail === 'object' ? errDetail?.message : errDetail) || err.message;
      const reasons = Array.isArray(errDetail?.reasons) ? ` (${errDetail.reasons.join('; ')})` : '';
      showToast(`[${errorCode}] ${errorMsg}${reasons}`, 'error');
    }
  };

  const handleToggleMarker = async (id) => {
    if (!id) return;
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
      apiService.getHistorySummary().then(hist => {
        if (hist && hist.length > 0) setHistoryOptions(hist);
      });
      loadJobsPage(1, searchQuery, selectedCompany, workMode, isProfileDriven, activeOrigin, selectedHistoryDay?.dayOffset ?? 0);

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
      const ext = (typeof format === 'string' && format.toLowerCase() === 'csv') ? 'csv' : 'xlsx';
      showToast(`Preparing Microsoft Excel (.${ext}) spreadsheet...`, 'info');

      // Fetch true binary blob from backend (bypasses Vite HTML fallback and cross-origin download limits)
      const blob = await apiService.downloadExportJobs({
        search: searchQuery,
        company: selectedCompany && selectedCompany !== 'All' ? selectedCompany : undefined,
        workMode: workMode && workMode !== 'All' ? workMode : undefined,
        profileDriven: isProfileDriven,
        origin: activeOrigin && activeOrigin !== 'all' ? activeOrigin : undefined,
        dayOffset: selectedHistoryDay?.dayOffset,
        format: ext
      });

      const filename = `Skill2Role_Jobs_${new Date().toISOString().slice(0, 10)}.${ext}`;
      const mimeType = ext === 'csv'
        ? 'text/csv;charset=utf-8;'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const fileBlob = new Blob([blob], { type: mimeType });
      const blobUrl = window.URL.createObjectURL(fileBlob);

      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(blobUrl);
          if (link.parentNode) link.parentNode.removeChild(link);
        } catch (e) {}
      }, 5000);

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


  // Logout Handler with Confirmation
  const handleExecuteLogout = (customAlert = null) => {
    localStorage.removeItem('rp_auth_token');
    localStorage.removeItem('rp_user');
    localStorage.removeItem('rp_candidate_profile');
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('rp_profile_draft_') || k.startsWith('skill2role_draft_'))) {
          localStorage.removeItem(k);
        }
      }
    } catch (_) {}
    setCurrentUser(null);
    setCandidateProfile({ name: '', title: '', email: '', avatar: 'avatar_1' });
    setJobs([]);
    setShowLogoutConfirm(false);
    setAuthAlert(customAlert || { type: 'info', message: 'You have been successfully signed out.' });
    showToast(customAlert?.message || 'You have been logged out.', customAlert?.type || 'info');
    document.documentElement.setAttribute('data-theme', 'default');
    document.documentElement.setAttribute('data-mode', 'default');
    document.documentElement.setAttribute('data-page', 'auth');
  };

  // Strict Full-Stack Authentication Gate: Zero unauthenticated app access
  if (!currentUser) {
    return (
      <AuthView 
        initialAlert={authAlert}
        onAuthSuccess={(user) => {
          setAuthAlert(null);
          setCurrentUser(user);
          showToast(`Welcome back, ${user.name}!`, 'success');
        }} 
      />
    );
  }

  const renderModuleLockedGate = (moduleName, description) => (
    <main className="content-container explore-content-container explore-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '24px' }}>
      <div className="explore-locked-card" style={{ maxWidth: 560, width: '100%', background: 'var(--bg-card, #1e293b)', border: '1px solid var(--border-color, #334155)', borderRadius: 16, padding: '36px 32px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '2px solid rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto', color: '#f59e0b' }}>
          <Lock size={32} />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '3px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 8 }}>
          {moduleName} Locked
        </span>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-primary, #f8fafc)' }}>
          Complete Your Profile to Unlock
        </h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.6, margin: '0 0 24px 0' }}>
          {description}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', background: 'rgba(0,0,0,0.22)', padding: '16px 20px', borderRadius: 10, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '13px' }}>
            <span style={{ color: profileValidation?.fieldStatus?.primarySkills ? '#10b981' : '#f59e0b', fontWeight: 800 }}>
              {profileValidation?.fieldStatus?.primarySkills ? '✓' : '○'}
            </span>
            <span style={{ color: 'var(--text-primary, #f8fafc)', fontWeight: 600 }}>5 Primary Skills</span>
            <span style={{ fontSize: '11px', color: profileValidation?.fieldStatus?.primarySkills ? '#10b981' : '#f59e0b', marginLeft: 'auto', fontWeight: 700 }}>
              {profileValidation?.fieldStatus?.primarySkills ? 'Filled' : 'Required'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '13px' }}>
            <span style={{ color: profileValidation?.fieldStatus?.experienceYears ? '#10b981' : '#f59e0b', fontWeight: 800 }}>
              {profileValidation?.fieldStatus?.experienceYears ? '✓' : '○'}
            </span>
            <span style={{ color: 'var(--text-primary, #f8fafc)', fontWeight: 600 }}>Years of Experience</span>
            <span style={{ fontSize: '11px', color: profileValidation?.fieldStatus?.experienceYears ? '#10b981' : '#f59e0b', marginLeft: 'auto', fontWeight: 700 }}>
              {profileValidation?.fieldStatus?.experienceYears ? 'Filled' : 'Required'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '13px' }}>
            <span style={{ color: profileValidation?.fieldStatus?.userLocation ? '#10b981' : '#f59e0b', fontWeight: 800 }}>
              {profileValidation?.fieldStatus?.userLocation ? '✓' : '○'}
            </span>
            <span style={{ color: 'var(--text-primary, #f8fafc)', fontWeight: 600 }}>Location Preference</span>
            <span style={{ fontSize: '11px', color: profileValidation?.fieldStatus?.userLocation ? '#10b981' : '#f59e0b', marginLeft: 'auto', fontWeight: 700 }}>
              {profileValidation?.fieldStatus?.userLocation ? 'Filled' : 'Required'}
            </span>
          </div>
        </div>

        <button 
          type="button" 
          className="btn-primary-olive"
          onClick={() => handleTabChange('profile')}
          style={{ padding: '12px 28px', fontSize: '14px', fontWeight: 700, borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <span>Fill Details in Job Profile</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </main>
  );

  return (
    <div className={`app-shell viewport-locked ${activeTab === 'explore' ? 'explore-view' : ''} ${activeTab === 'generation' ? 'generation-view-screen' : ''}`} style={{ position: 'relative' }}>

      {/* Universal Top Navigation Bar with Embedded Profile Menu & Notifications */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange}
        currentUser={currentUser}
        candidateProfile={candidateProfile}
        activeCandidateProfile={activeCandidateProfile}
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
        !activeCandidateProfile?.isComplete ? (
          renderModuleLockedGate(
            'Explore',
            'Skill2Role strictly filters and matches job applications using 5 Primary Skills, Years of Experience, and Location. Please fill these details in your profile first.'
          )
        ) : (
        <ErrorBoundary fallbackTitle="Could not load Explorer">
          <main className="content-container explore-content-container explore-view">
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
          </main>
        </ErrorBoundary>
        )
      )}

      {/* 2. Generation View (Gated: Requires Complete Candidate Profile) */}
      {activeTab === 'generation' && (
        !activeCandidateProfile?.isComplete ? (
          renderModuleLockedGate(
            'Resume Generation Studio',
            'AI Resume Tailoring and Cover Letter synthesis strictly require your 5 Primary Skills, Experience, and Location to ground evidence-backed applications.'
          )
        ) : (
          <ErrorBoundary fallbackTitle="Could not load Resume Generation Studio">
            <main className="content-container generation-content-container">
              <Suspense fallback={<GenericPageSkeleton />}>
                <GenerationView 
                  key={activeCandidateProfile?.id || 'default'} 
                  activeCandidateProfile={activeCandidateProfile} 
                />
              </Suspense>
            </main>
          </ErrorBoundary>
        )
      )}

      {/* 3. Automated Application Pipelines View (Gated: Requires Complete Candidate Profile) */}
      {activeTab === 'automation' && (
        !activeCandidateProfile?.isComplete ? (
          renderModuleLockedGate(
            'Automation Pipelines',
            'Autonomous application pipelines and automated portal submission engines require a verified candidate profile to safely apply on your behalf.'
          )
        ) : (
          <ErrorBoundary fallbackTitle="Could not load Automation Pipeline">
            <main className="content-container automation-content-container">
              <Suspense fallback={<GenericPageSkeleton />}>
                <AutomationView 
                  key={activeCandidateProfile?.id || 'default'} 
                  activeCandidateProfile={activeCandidateProfile} 
                  onNavigateTab={handleTabChange} 
                />
              </Suspense>
            </main>
          </ErrorBoundary>
        )
      )}

      {/* 4. Profile & Preferences View (Always Accessible) */}
      {activeTab === 'profile' && (
        <ErrorBoundary fallbackTitle="Could not load Candidate Profile">
          <main className="content-container profile-content-container">
            <Suspense fallback={<GenericPageSkeleton />}>
              <ProfileView 
                key={activeCandidateProfile?.id || 'default'} 
                activeCandidateProfile={activeCandidateProfile} 
                onNavigateTab={handleTabChange}
                onProfileUpdated={checkProfileValidation}
              />
            </Suspense>
          </main>
        </ErrorBoundary>
      )}

      {/* 5. Application Analytics View (Gated: Requires Complete Candidate Profile) */}
      {activeTab === 'analytics' && (
        !activeCandidateProfile?.isComplete ? (
          renderModuleLockedGate(
            'Application Analytics',
            'Live application metrics, ATS match distribution, and portal conversion tracking require an active, complete candidate profile.'
          )
        ) : (
          <ErrorBoundary fallbackTitle="Could not load Analytics Dashboard">
            <main className="content-container analytics-content-container">
              <Suspense fallback={<GenericPageSkeleton />}>
                <AnalyticsView 
                  key={activeCandidateProfile?.id || 'default'} 
                  activeCandidateProfile={activeCandidateProfile} 
                />
              </Suspense>
            </main>
          </ErrorBoundary>
        )
      )}

      {/* 6. Tools Menu Tab (Ungated: Standalone Individual Utilities) */}
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
        menuItems={menuItems}
        onUpdateMenu={handleUpdateMenuSettings}
      />

      {/* 3. Help, Privacy Guidelines & Issue Resolution Tickets */}
      <HelpPrivacyModal 
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        currentUser={currentUser}
        onAccountDeleted={(msg) => {
          setIsHelpModalOpen(false);
          handleExecuteLogout({
            type: 'success',
            message: msg || 'Your account and all associated personal data have been permanently deleted.'
          });
        }}
        onLogout={() => {
          setIsHelpModalOpen(false);
          handleExecuteLogout();
        }}
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
          onTailorResume={async (j) => {
            setSelectedJob(null);
            if (!j.marked) {
              await handleToggleMarker(j.id);
            }
            handleTabChange('generation');
          }}
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
