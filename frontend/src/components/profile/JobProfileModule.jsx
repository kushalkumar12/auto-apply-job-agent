import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  User, 
  Briefcase, 
  Contact, 
  Award, 
  FolderGit2, 
  GraduationCap, 
  Sliders, 
  Settings2, 
  LogIn, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  Sparkles, 
  AlertCircle,
  Loader2,
  Check,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  X,
  PieChart
} from 'lucide-react';
import { apiService } from '../../services/api';
import './JobProfile.css';

// Page Components
import Page1PersonalInfo from './Page1PersonalInfo';
import Page2JobPreferences from './Page2JobPreferences';
import Page3ContactInfo from './Page3ContactInfo';
import Page4WorkExperience from './Page4WorkExperience';
import Page5Projects from './Page5Projects';
import Page6Education from './Page6Education';
import Page7ProfessionalDetails from './Page7ProfessionalDetails';
import Page8ApplicationPreferences from './Page8ApplicationPreferences';
import Page9Integrations from './Page9Integrations';

export const PROFILE_PAGES = [
  { id: 'personal', num: 1, label: 'Personal Information', icon: User, mandatory: true, desc: '' },
  { id: 'preferences', num: 2, label: 'Job Search Preferences', icon: Briefcase, mandatory: true, desc: '' },
  { id: 'contact', num: 3, label: 'Contact Information', icon: Contact, mandatory: false, desc: '' },
  { id: 'experience', num: 4, label: 'Work Experience', icon: Award, mandatory: false, desc: '' },
  { id: 'projects', num: 5, label: 'Projects', icon: FolderGit2, mandatory: false, desc: '' },
  { id: 'education', num: 6, label: 'Education', icon: GraduationCap, mandatory: false, desc: '' },
  { id: 'professional', num: 7, label: 'Professional Details', icon: Sliders, mandatory: false, desc: '' },
  { id: 'application', num: 8, label: 'Application Preferences', icon: Settings2, mandatory: false, desc: '' },
  { id: 'integrations', num: 9, label: 'Integrations', icon: LogIn, mandatory: false, desc: '' }
];

export default function JobProfileModule({ activeCandidateProfile, onNavigateTab, onProfileUpdated }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Hash & Active Page Navigation
  const getSubpageFromHash = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('profile/')) {
      const sub = hash.replace('profile/', '').trim();
      if (PROFILE_PAGES.some(p => p.id === sub)) return sub;
    }
    return null;
  };

  const [activePageId, setActivePageId] = useState(() => getSubpageFromHash() || 'personal');
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(() => {
    try {
      return localStorage.getItem('rp_profile_menu_collapsed') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(() => {
    try {
      const savedStep = localStorage.getItem('rp_onboarding_step');
      if (savedStep === '2') return 2;
    } catch (_) {}
    return 1;
  }); // 1: Personal, 2: Preferences

  const profileId = activeCandidateProfile?.id || 'default';

  // Load authoritative profile data from backend
  const loadProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getProfile(profileId);
      let draft = null;
      try {
        const storedDraft = localStorage.getItem(`rp_profile_draft_${profileId}`);
        if (storedDraft) draft = JSON.parse(storedDraft);
      } catch (_) {}

      const effectiveData = (data && Object.keys(data).length > 0)
        ? (draft ? { ...data, ...draft } : data)
        : (draft || null);

      if (effectiveData) {
        // Normalize first & last name if only fullName is present and neither firstName nor lastName was explicitly set
        if (effectiveData.firstName === undefined && effectiveData.lastName === undefined && effectiveData.fullName) {
          const parts = effectiveData.fullName.trim().split(/\s+/);
          effectiveData.firstName = parts[0] || '';
          effectiveData.lastName = parts.slice(1).join(' ') || '';
        }
        // Normalize preferred roles
        if (!effectiveData.preferredRoles && effectiveData.selectedRoles) {
          effectiveData.preferredRoles = [...effectiveData.selectedRoles];
        }
        // Normalize preferred locations
        if (!effectiveData.preferredLocations && effectiveData.desiredLocations) {
          effectiveData.preferredLocations = [...effectiveData.desiredLocations];
        } else if (!effectiveData.preferredLocations && effectiveData.userLocation) {
          effectiveData.preferredLocations = [effectiveData.userLocation];
        }
        // Normalize work modes: always guarantee default ['Hybrid', 'Remote']
        if (!effectiveData.preferredWorkModes || !Array.isArray(effectiveData.preferredWorkModes) || effectiveData.preferredWorkModes.length === 0) {
          if (effectiveData.workFormats && typeof effectiveData.workFormats === 'object') {
            const activeModes = Object.keys(effectiveData.workFormats)
              .filter(k => effectiveData.workFormats[k])
              .map(k => k.charAt(0).toUpperCase() + k.slice(1));
            effectiveData.preferredWorkModes = activeModes.length > 0 ? activeModes : ['Hybrid', 'Remote'];
          } else {
            effectiveData.preferredWorkModes = ['Hybrid', 'Remote'];
          }
        }
        effectiveData.workFormats = {
          remote: effectiveData.preferredWorkModes.includes('Remote'),
          hybrid: effectiveData.preferredWorkModes.includes('Hybrid'),
          onsite: effectiveData.preferredWorkModes.includes('Onsite')
        };
        // Normalize experience
        if (effectiveData.experienceYears === undefined && effectiveData.totalExperienceYears !== undefined) {
          effectiveData.experienceYears = effectiveData.totalExperienceYears;
        } else if (effectiveData.experienceYears === undefined && effectiveData.general?.experienceYears !== undefined) {
          effectiveData.experienceYears = effectiveData.general.experienceYears;
        }

        setProfile(effectiveData);
      } else {
        // Fallback initial candidate profile state
        setProfile({
          firstName: '',
          lastName: '',
          fullName: '',
          avatar: 'avatar_1',
          resume: null,
          resumeFileName: '',
          primarySkills: [],
          experienceYears: '',
          totalExperienceYears: '',
          preferredRoles: [],
          preferredLocations: [],
          preferredWorkModes: ['Hybrid', 'Remote'],
          additionalSkills: [],
          globalOpportunities: false,
          is_complete: false
        });
      }
    } catch (err) {
      console.error('Failed to load profile master data:', err);
      setErrorMsg('Failed to load profile. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Sync Hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const sub = getSubpageFromHash();
      if (sub && sub !== activePageId) {
        setActivePageId(sub);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activePageId]);

  const navigateToPage = (pageId) => {
    setActivePageId(pageId);
    window.location.hash = `profile/${pageId}`;
    setErrorMsg('');
  };

  // Debounced auto-save timer ref
  const autoSaveTimerRef = useRef(null);

  // Trigger silent background autosave to backend API whenever profile changes
  const triggerAutoSave = useCallback((updatedProfile) => {
    if (!updatedProfile) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiService.updateProfile({ ...updatedProfile }, profileId);
        if (res && res.profile) {
          try {
            localStorage.setItem(`rp_profile_draft_${profileId}`, JSON.stringify(res.profile));
          } catch (_) {}
        }
        window.dispatchEvent(new CustomEvent('rp_profile_updated', {
          detail: { isComplete: res?.isComplete, profile: res?.profile }
        }));
        if (onProfileUpdated) {
          await onProfileUpdated();
        }
      } catch (err) {
        console.warn('Silent backend auto-save notice:', err);
      }
    }, 600); // 600ms debounce
  }, [profileId, onProfileUpdated]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Batch updater from page onChange callbacks
  const handlePageChange = useCallback((updates) => {
    setProfile(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };

      // Immediately sync to localStorage
      try {
        localStorage.setItem(`rp_profile_draft_${profileId}`, JSON.stringify(updated));
      } catch (_) {}

      // Trigger debounced auto-save to backend API
      triggerAutoSave(updated);

      return updated;
    });
  }, [profileId, triggerAutoSave]);

  // Field updater
  const updateField = (field, value) => {
    setProfile(prev => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      
      // Auto-sync full name if first or last name changes
      if (field === 'firstName' || field === 'lastName') {
        const fn = field === 'firstName' ? value : (prev.firstName !== undefined ? prev.firstName : '');
        const ln = field === 'lastName' ? value : (prev.lastName !== undefined ? prev.lastName : '');
        updated.firstName = fn;
        updated.lastName = ln;
        updated.fullName = [fn, ln].filter(Boolean).join(' ');
        if (updated.general) {
          updated.general.firstName = fn;
          updated.general.lastName = ln;
          updated.general.fullName = updated.fullName;
        }
        if (updated.contacts) {
          updated.contacts.fullName = updated.fullName;
        }
      }
      // Auto-sync roles
      if (field === 'preferredRoles') {
        updated.selectedRoles = value;
      }
      // Auto-sync locations
      if (field === 'preferredLocations') {
        updated.desiredLocations = value;
        if (value.length > 0) updated.userLocation = value[0];
      }
      // Auto-sync work modes
      if (field === 'preferredWorkModes') {
        const arr = Array.isArray(value) ? value : [];
        updated.preferredWorkModes = arr;
        updated.workFormats = {
          remote: arr.includes('Remote'),
          hybrid: arr.includes('Hybrid'),
          onsite: arr.includes('Onsite')
        };
      }
      // Auto-sync additional skills
      if (field === 'additionalSkills') {
        updated.skillsList = value;
      }
      // Auto-sync experience years
      if (field === 'experienceYears' || field === 'totalExperienceYears') {
        updated.experienceYears = value;
        updated.totalExperienceYears = value;
        if (!updated.general) updated.general = {};
        updated.general.experienceYears = value;
      }

      // 1. Immediately persist draft to localStorage synchronously so refresh never loses data
      try {
        localStorage.setItem(`rp_profile_draft_${profileId}`, JSON.stringify(updated));
      } catch (_) {}

      // 2. Trigger debounced auto-save to backend API
      triggerAutoSave(updated);

      return updated;
    });
  };

  // Listen to legacy and external subtab switch events
  useEffect(() => {
    const handleSwitchSubtab = (e) => {
      const sub = e.detail?.subtab;
      if (!sub) return;
      const subtabMap = {
        profile: 'personal',
        resume: 'personal',
        preferences: 'preferences',
        keywords: 'preferences',
        skills: 'preferences',
        location: 'preferences',
        contacts: 'contact',
        experience: 'experience',
        projects: 'projects',
        education: 'education',
        professional: 'professional',
        avoid: 'application',
        screening: 'application',
        connectors: 'integrations',
        integrations: 'integrations',
        review: 'review'
      };
      const target = subtabMap[sub] || (PROFILE_PAGES.some(p => p.id === sub) ? sub : null);
      if (target && target !== 'review') {
        navigateToPage(target);
      }
    };
    window.addEventListener('rp_switch_profile_subtab', handleSwitchSubtab);
    return () => window.removeEventListener('rp_switch_profile_subtab', handleSwitchSubtab);
  }, []);

  // Save changes to backend (supports silent autosave without user alert/banner)
  const handleSaveProfile = async (markComplete = false, silent = false) => {
    if (!profile) return false;
    setSaving(true);
    if (!silent) {
      setErrorMsg('');
      setSaveSuccess(false);
    }

    try {
      const payload = { ...profile };
      if (markComplete) {
        payload.is_complete = true;
      }

      const res = await apiService.updateProfile(payload, profileId);
      if (res && res.profile) {
        setProfile(res.profile);
        try {
          localStorage.setItem(`rp_profile_draft_${profileId}`, JSON.stringify(res.profile));
        } catch (_) {}
      }

      if (!silent) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }

      // Dispatch global profile sync event for Job Explorer and consumer modules
      window.dispatchEvent(new CustomEvent('rp_profile_updated', {
        detail: { isComplete: res?.isComplete, profile: res?.profile }
      }));
      window.dispatchEvent(new CustomEvent('rp_candidate_updated', {
        detail: {
          name: profile.fullName || profile.firstName,
          email: profile.email || '',
          avatar: profile.avatar || 'avatar_1'
        }
      }));

      if (onProfileUpdated) {
        await onProfileUpdated();
      }

      return res?.isComplete !== undefined ? res.isComplete : true;
    } catch (err) {
      console.error('Failed to save profile:', err);
      if (!silent) {
        setErrorMsg(err.message || 'Error saving profile.');
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Determine if onboarding is active
  // Onboarding (Steps 1 & 2 wizard) is strictly for users who have NOT yet completed initial onboarding.
  // Once a profile is created/onboarded or user is in the 9-page workstation, editing/clearing fields
  // in non-onboarding pages or workstation pages must NEVER kick the user out of their current workstation page.
  const hasMandatoryPage1 = profile && (profile.firstName || profile.fullName) && profile.resume;
  const hasExpYears = profile && (
    (profile.experienceYears !== undefined && profile.experienceYears !== null && profile.experienceYears !== '') ||
    (profile.totalExperienceYears !== undefined && profile.totalExperienceYears !== null && profile.totalExperienceYears !== '') ||
    (profile.general?.experienceYears !== undefined && profile.general?.experienceYears !== null && profile.general?.experienceYears !== '')
  );
  const hasMandatoryPage2 = profile && 
    (profile.primarySkills?.length > 0) && 
    hasExpYears &&
    ((profile.preferredRoles?.length > 0) || (profile.selectedRoles?.length > 0)) && 
    ((profile.preferredLocations?.length > 0) || (profile.desiredLocations?.length > 0) || profile.userLocation) && 
    ((profile.preferredWorkModes?.length > 0) || (profile.workFormats?.length > 0));

  // A user is considered to have completed initial onboarding if profile was marked complete
  // or if they have ever successfully saved/finished onboarding (stored in DB/localStorage).
  const [hasCompletedInitialOnboarding, setHasCompletedInitialOnboarding] = useState(() => {
    try {
      const stored = localStorage.getItem(`rp_onboarding_completed_${profileId}`);
      if (stored === 'true') return true;
      const candidateProfile = localStorage.getItem('rp_candidate_profile');
      if (candidateProfile) return true;
    } catch (_) {}
    return false;
  });

  useEffect(() => {
    if (profile?.is_complete || profile?._isComplete) {
      setHasCompletedInitialOnboarding(true);
      try {
        localStorage.setItem(`rp_onboarding_completed_${profileId}`, 'true');
      } catch (_) {}
    }
  }, [profile?.is_complete, profile?._isComplete, profileId]);

  // Show onboarding wizard ONLY if initial onboarding was never completed.
  const showOnboarding = !hasCompletedInitialOnboarding && !(hasMandatoryPage1 && hasMandatoryPage2);

  // --------------------------------------------------------------------------
  // PROFILE COMPLETION ENGINE (AUDIT BREAKDOWN & WEIGHTED PERCENTAGE)
  // --------------------------------------------------------------------------
  const completionAudit = useMemo(() => {
    if (!profile) return { percentage: 0, completedCount: 0, totalCount: 0, items: [] };

    const items = [
      {
        id: 'personal',
        pageId: 'personal',
        title: 'Identity & Resume',
        mandatory: true,
        weight: 20,
        isComplete: Boolean((profile.firstName || profile.fullName) && profile.resume),
        description: 'First Name, Last Name, and Master Resume document'
      },
      {
        id: 'preferences',
        pageId: 'preferences',
        title: 'Job Search Criteria',
        mandatory: true,
        weight: 25,
        isComplete: Boolean(
          (profile.primarySkills?.length > 0) &&
          hasExpYears &&
          ((profile.preferredRoles?.length > 0) || (profile.selectedRoles?.length > 0)) &&
          ((profile.preferredLocations?.length > 0) || (profile.desiredLocations?.length > 0) || profile.userLocation) &&
          ((profile.preferredWorkModes?.length > 0) || (profile.workFormats?.length > 0))
        ),
        description: 'Primary skills, experience years, target roles, locations, and work modes'
      },
      {
        id: 'contact',
        pageId: 'contact',
        title: 'Contact & Links',
        mandatory: false,
        weight: 10,
        isComplete: Boolean(
          (profile.email || profile.contacts?.email || profile.general?.email) &&
          (profile.phone || profile.contacts?.phone || profile.general?.phone)
        ),
        description: 'Email address, phone number, and professional profiles'
      },
      {
        id: 'experience',
        pageId: 'experience',
        title: 'Work Experience',
        mandatory: false,
        weight: 15,
        isComplete: Boolean((profile.experiences?.length > 0) || (profile.experienceList?.length > 0)),
        description: 'Past engineering roles, companies, and achievements'
      },
      {
        id: 'projects',
        pageId: 'projects',
        title: 'Technical Projects',
        mandatory: false,
        weight: 10,
        isComplete: Boolean((profile.projects?.length > 0) || (profile.projectsList?.length > 0)),
        description: 'Code repositories, architectures, and tech stack showcases'
      },
      {
        id: 'education',
        pageId: 'education',
        title: 'Education & Degrees',
        mandatory: false,
        weight: 10,
        isComplete: Boolean((profile.education?.length > 0) || (profile.educationList?.length > 0)),
        description: 'Academic degrees, university, and certifications'
      },
      {
        id: 'professional',
        pageId: 'professional',
        title: 'Professional Details',
        mandatory: false,
        weight: 5,
        isComplete: Boolean(
          profile.employmentStatus || 
          profile.noticePeriod || 
          profile.currentCtc || 
          profile.expectedCtc || 
          profile.professionalSummary || 
          profile.summary
        ),
        description: 'Compensation expectations, notice period, and summary'
      },
      {
        id: 'application',
        pageId: 'application',
        title: 'Application Preferences',
        mandatory: false,
        weight: 3,
        isComplete: Boolean(
          (profile.screeningAnswers && Object.keys(profile.screeningAnswers).length > 0) ||
          (profile.avoidCompanies?.length > 0) ||
          (profile.avoidKeywords?.length > 0)
        ),
        description: 'Screening question responses and company avoidance filters'
      },
      {
        id: 'integrations',
        pageId: 'integrations',
        title: 'Platform Integrations',
        mandatory: false,
        weight: 2,
        isComplete: Boolean(
          profile.linkedinConnected || 
          profile.indeedConnected || 
          profile.naukriConnected || 
          profile.glassdoorConnected ||
          profile.integrations?.linkedin?.connected ||
          profile.integrations?.indeed?.connected ||
          profile.integrations?.naukri?.connected
        ),
        description: 'Connected job portal sessions and sync status'
      }
    ];

    let totalWeight = 0;
    let earnedWeight = 0;
    let completedCount = 0;

    items.forEach(item => {
      totalWeight += item.weight;
      if (item.isComplete) {
        earnedWeight += item.weight;
        completedCount += 1;
      }
    });

    const percentage = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
    const incompleteItems = items.filter(it => !it.isComplete);

    return {
      percentage,
      earnedWeight,
      totalWeight,
      completedCount,
      totalCount: items.length,
      items,
      incompleteItems
    };
  }, [profile, hasExpYears]);

  // Onboarding Step Navigation with Silent Autosave (No user banner / notification)
  const handleContinueOnboarding = async () => {
    setErrorMsg('');
    const fn = (profile?.firstName || '').trim();
    const ln = (profile?.lastName || '').trim();

    if (!fn) {
      setErrorMsg('Please enter your First Name to continue.');
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(fn)) {
      setErrorMsg('First Name must contain only alphabetic characters.');
      return;
    }

    if (!ln) {
      setErrorMsg('Please enter your Last Name to continue.');
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(ln)) {
      setErrorMsg('Last Name must contain only alphabetic characters.');
      return;
    }

    if (!profile?.resume) {
      setErrorMsg('Please upload your Resume PDF to continue.');
      return;
    }
    // Silent autosave Step 1 data
    try {
      await handleSaveProfile(false, true);
    } catch (e) {
      console.warn('Silent autosave Step 1 notice:', e);
    }
    setOnboardingStep(2);
    try {
      localStorage.setItem('rp_onboarding_step', '2');
    } catch (_) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToPersonalInfo = async () => {
    setErrorMsg('');
    // Silent autosave Step 2 data
    try {
      await handleSaveProfile(false, true);
    } catch (e) {
      console.warn('Silent autosave Step 2 notice:', e);
    }
    setOnboardingStep(1);
    try {
      localStorage.setItem('rp_onboarding_step', '1');
    } catch (_) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Onboarding Step 2 -> Complete & Explore
  const handleCompleteOnboarding = async () => {
    setErrorMsg('');

    // 1. Primary Skills validation (1 to 5)
    const skills = profile?.primarySkills || [];
    if (!skills || skills.length === 0) {
      setErrorMsg('Please select at least 1 Primary Skill (up to 5).');
      return;
    }
    if (skills.length > 5) {
      setErrorMsg('Maximum 5 primary skills allowed.');
      return;
    }

    // 2. Years of Experience validation (>= 0)
    const rawExp = profile?.experienceYears !== undefined && profile?.experienceYears !== null && profile?.experienceYears !== ''
      ? String(profile.experienceYears).trim()
      : (profile?.totalExperienceYears !== undefined && profile?.totalExperienceYears !== null && profile?.totalExperienceYears !== ''
          ? String(profile.totalExperienceYears).trim()
          : (profile?.general?.experienceYears !== undefined && profile?.general?.experienceYears !== null && profile?.general?.experienceYears !== ''
              ? String(profile.general.experienceYears).trim()
              : ''));

    if (rawExp === '') {
      setErrorMsg('Please specify your Total Years of Experience (select 0 for Fresher).');
      return;
    }

    if (rawExp.includes('.')) {
      const parts = rawExp.split('.');
      if (parts[1] && parseInt(parts[1], 10) > 11) {
        setErrorMsg('Months in Total Experience cannot exceed .11 (since .12 months = 1 year).');
        return;
      }
    }

    const expVal = Number(rawExp);
    if (isNaN(expVal) || expVal < 0) {
      setErrorMsg('Please enter a valid numeric value for Total Years of Experience.');
      return;
    }

    // 3. Preferred Roles validation (>= 1)
    const roles = profile?.preferredRoles || profile?.selectedRoles || [];
    if (!roles || roles.length === 0) {
      setErrorMsg('Please select at least 1 Preferred Role.');
      return;
    }

    // 4. Preferred Locations validation (>= 1)
    const locs = profile?.preferredLocations || profile?.desiredLocations || (profile?.userLocation ? [profile.userLocation] : []);
    if (!locs || locs.length === 0) {
      setErrorMsg('Please specify at least 1 Preferred Location.');
      return;
    }

    // 5. Preferred Work Modes validation (>= 1)
    let modes = profile?.preferredWorkModes;
    if (!modes || !Array.isArray(modes) || modes.length === 0) {
      if (profile?.workFormats && typeof profile.workFormats === 'object') {
        modes = Object.keys(profile.workFormats)
          .filter(k => profile.workFormats[k])
          .map(k => k.charAt(0).toUpperCase() + k.slice(1));
      }
    }
    if (!modes || modes.length === 0) {
      modes = ['Hybrid', 'Remote'];
    }

    profile.preferredWorkModes = modes;
    profile.workFormats = {
      remote: modes.includes('Remote'),
      hybrid: modes.includes('Hybrid'),
      onsite: modes.includes('Onsite')
    };

    const isComplete = await handleSaveProfile(true, false);
    if (isComplete) {
      // Mark candidate profile stored & initial onboarding completed
      setHasCompletedInitialOnboarding(true);
      try {
        localStorage.setItem(`rp_onboarding_completed_${profileId}`, 'true');
      } catch (_) {}
      localStorage.removeItem('rp_onboarding_step');
      localStorage.setItem('rp_candidate_profile', JSON.stringify({
        name: profile.fullName || profile.firstName,
        email: profile.email || '',
        avatar: profile.avatar || 'avatar_1'
      }));

      // Direct, responsive transition to Job Explorer
      setTimeout(() => {
        if (onNavigateTab) {
          onNavigateTab('explore');
        } else {
          window.location.hash = 'explore';
        }
      }, 100);
    } else {
      setErrorMsg('Please ensure all mandatory onboarding requirements are met.');
    }
  };

  if (loading) {
    return (
      <div className="jp-module-container" style={{ alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--rp-accent-primary, #2563eb)' }} />
        <span style={{ marginTop: '12px', fontSize: '14px', color: 'var(--rp-text-secondary, #5a615c)' }}>
          Loading Candidate Master Profile...
        </span>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // MANDATORY ONBOARDING FLOW (STEP 1 & STEP 2 ONLY)
  // --------------------------------------------------------------------------
  if (showOnboarding) {
    return (
      <div className="jp-onboarding-shell">
        <div className="jp-onboarding-wrapper">
          <div className="jp-onboarding-card">
            {/* Header & Progress Indicator */}
            <div className="jp-onboarding-header">
              <div className="jp-onboarding-stepper">
                <span className="jp-step-pill">
                  Step {onboardingStep} of 2
                </span>
                <div className="jp-step-indicator-bar">
                  <div 
                    className="jp-step-indicator-fill" 
                    style={{ width: onboardingStep === 1 ? '50%' : '100%' }}
                  />
                </div>
              </div>
              <h1 className="jp-onboarding-title">
                {onboardingStep === 1 ? 'Step 1: Personal Information & Master Resume' : 'Step 2: Job Search Preferences'}
              </h1>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="jp-alert jp-alert-danger">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Personal Information */}
            {onboardingStep === 1 && (
              <Page1PersonalInfo
                profile={profile}
                profileData={profile}
                updateField={updateField}
                onChange={handlePageChange}
                profileId={profileId}
              />
            )}

            {/* Step 2: Job Preferences */}
            {onboardingStep === 2 && (
              <Page2JobPreferences
                profile={profile}
                profileData={profile}
                updateField={updateField}
                onChange={handlePageChange}
              />
            )}

            {/* Bottom Error Notification (Anchor directly above action button) */}
            {errorMsg && (
              <div className="jp-alert jp-alert-danger" style={{ marginTop: '16px' }} role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Footer Navigation */}
            <div className="jp-footer-controls" style={{ marginTop: '20px' }}>
              <div className="jp-footer-left">
                {onboardingStep === 2 && (
                  <button
                    type="button"
                    className="jp-btn jp-btn-secondary"
                    onClick={handleBackToPersonalInfo}
                    disabled={saving}
                  >
                    <ArrowLeft size={14} />
                    Personal Info
                  </button>
                )}
              </div>

              <div className="jp-footer-right">
                {onboardingStep === 1 ? (
                  <button
                    type="button"
                    className="jp-btn jp-btn-primary"
                    onClick={handleContinueOnboarding}
                    disabled={saving}
                  >
                    Continue to Preferences
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="jp-btn jp-btn-primary"
                    onClick={handleCompleteOnboarding}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin" size={15} />
                        Saving & Initializing Explorer...
                      </>
                    ) : (
                      <>
                        Complete Onboarding & Enter Explorer
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RETURNING USER: 10-PAGE SAVED PROFILE WORKSTATION
  // --------------------------------------------------------------------------
  const activePageMeta = PROFILE_PAGES.find(p => p.id === activePageId) || PROFILE_PAGES[0];
  const activeIndex = PROFILE_PAGES.findIndex(p => p.id === activePageId);
  const prevPage = activeIndex > 0 ? PROFILE_PAGES[activeIndex - 1] : null;
  const nextPage = activeIndex < PROFILE_PAGES.length - 1 ? PROFILE_PAGES[activeIndex + 1] : null;

  return (
    <div className={`jp-module-container ${isMenuCollapsed ? 'is-menu-collapsed' : ''}`}>
      {/* 10-Page Left Sidebar Navigation */}
      <aside className={`jp-sidebar-nav ${isMenuCollapsed ? 'is-collapsed' : ''}`}>
        <div className="jp-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {!isMenuCollapsed && (
              <span className="jp-sidebar-profile-tag">CANDIDATE PROFILE</span>
            )}
            <button
              type="button"
              className="jp-menu-toggle-btn"
              onClick={() => {
                setIsMenuCollapsed(prev => {
                  const next = !prev;
                  try {
                    localStorage.setItem('rp_profile_menu_collapsed', String(next));
                  } catch (_) {}
                  return next;
                });
              }}
              title={isMenuCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isMenuCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isMenuCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
          {!isMenuCollapsed && (
            <div className="jp-sidebar-profile-name">
              {profile.fullName || profile.firstName || 'Candidate Profile'}
            </div>
          )}
        </div>

        <ul className="jp-nav-list">
          {PROFILE_PAGES.map((page) => {
            const Icon = page.icon;
            const isActive = page.id === activePageId;
            return (
              <li key={page.id} className="jp-nav-item">
                <button
                  type="button"
                  className={`jp-nav-btn ${isActive ? 'is-active' : ''} ${isMenuCollapsed ? 'is-icon-only' : ''}`}
                  onClick={() => navigateToPage(page.id)}
                  title={page.desc ? `${page.label} - ${page.desc}` : page.label}
                >
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  {!isMenuCollapsed && (
                    <>
                      <span className="jp-nav-label-text">{page.label}</span>
                      {page.mandatory ? (
                        <span className="jp-nav-btn-badge" style={{ color: 'var(--rp-accent-primary, #2563eb)' }}>
                          Req
                        </span>
                      ) : null}
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Interactive Profile Completion Widget at bottom of Integrations */}
        <div 
          className={`jp-completion-widget ${isMenuCollapsed ? 'is-collapsed' : ''}`}
          onClick={() => setShowIncompleteModal(true)}
          title="Click to view incomplete sections"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowIncompleteModal(true); } }}
        >
          <div className="jp-completion-header">
            {!isMenuCollapsed && (
              <span className="jp-completion-label">
                <PieChart size={13} style={{ marginRight: '5px' }} />
                Profile Completion
              </span>
            )}
            <span className={`jp-completion-percent ${completionAudit.percentage === 100 ? 'is-100' : ''}`}>
              {completionAudit.percentage}%
            </span>
          </div>
          <div className="jp-completion-bar-track">
            <div 
              className={`jp-completion-bar-fill ${completionAudit.percentage === 100 ? 'is-complete' : ''}`}
              style={{ width: `${completionAudit.percentage}%` }}
            />
          </div>
          {!isMenuCollapsed && (
            <div className="jp-completion-subtext">
              {completionAudit.percentage === 100 ? (
                <span style={{ color: 'var(--rp-success, #22c55e)' }}>All sections complete</span>
              ) : (
                <span>{completionAudit.incompleteItems.length} section{completionAudit.incompleteItems.length === 1 ? '' : 's'} remaining &bull; <strong style={{ textDecoration: 'underline' }}>View</strong></span>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Page Content Panel */}
      <main className="jp-main-panel">
        <header className="jp-page-header">
          <div className="jp-page-header-text">
            <span className="jp-page-num-badge">Page {activePageMeta.num} of 9</span>
            <h1 className="jp-page-title">
              {activePageMeta.label}
            </h1>
            {activePageMeta.desc ? <p className="jp-page-desc">{activePageMeta.desc}</p> : null}
          </div>

          {saveSuccess && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="jp-badge jp-badge-subtle" style={{ color: 'var(--rp-success, #22c55e)' }}>
                <Check size={13} style={{ marginRight: '4px' }} />
                Changes Saved
              </span>
            </div>
          )}
        </header>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="jp-alert jp-alert-danger" style={{ marginBottom: '16px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Render Selected Page Component */}
        <div className="jp-page-content">
          {activePageId === 'personal' && (
            <Page1PersonalInfo
              profile={profile}
              profileData={profile}
              updateField={updateField}
              onChange={handlePageChange}
              profileId={profileId}
            />
          )}

          {activePageId === 'preferences' && (
            <Page2JobPreferences
              profile={profile}
              profileData={profile}
              updateField={updateField}
              onChange={handlePageChange}
            />
          )}

          {activePageId === 'contact' && (
            <Page3ContactInfo
              profile={profile}
              profileData={profile}
              updateField={updateField}
              onChange={handlePageChange}
            />
          )}

          {activePageId === 'experience' && (
            <Page4WorkExperience
              profile={profile}
              profileData={profile}
              updateField={updateField}
              onChange={handlePageChange}
            />
          )}

          {activePageId === 'projects' && (
            <Page5Projects
              profile={profile}
              profileData={profile}
              updateField={updateField}
              onChange={handlePageChange}
            />
          )}

          {activePageId === 'education' && (
            <Page6Education
              profile={profile}
              profileData={profile}
              updateField={updateField}
              onChange={handlePageChange}
            />
          )}

          {activePageId === 'professional' && (
            <Page7ProfessionalDetails
              profile={profile}
              updateField={updateField}
            />
          )}

          {activePageId === 'application' && (
            <Page8ApplicationPreferences
              profile={profile}
              updateField={updateField}
            />
          )}

          {activePageId === 'integrations' && (
            <Page9Integrations
              profile={profile}
              updateField={updateField}
            />
          )}
        </div>

        {/* Persistent Bottom Footer Controls */}
        <footer className="jp-footer-controls">
          <div className="jp-footer-left">
            {prevPage && (
              <button
                type="button"
                className="jp-btn jp-btn-secondary jp-btn-sm"
                onClick={() => navigateToPage(prevPage.id)}
              >
                <ArrowLeft size={14} />
                Previous: {prevPage.label}
              </button>
            )}
          </div>

          <div className="jp-footer-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Save Changes button at bottom */}
            <button
              type="button"
              className="jp-btn jp-btn-secondary jp-btn-sm"
              onClick={() => handleSaveProfile(false)}
              disabled={saving}
              title="Save current progress"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            {nextPage ? (
              <button
                type="button"
                className="jp-btn jp-btn-primary jp-btn-sm"
                onClick={() => navigateToPage(nextPage.id)}
              >
                Next: {nextPage.label}
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                className="jp-btn jp-btn-primary jp-btn-sm"
                onClick={async () => {
                  const saved = await handleSaveProfile(false);
                  if (saved) {
                    if (onNavigateTab) onNavigateTab('explore');
                    else window.location.hash = 'explore';
                  }
                }}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    Save & Finish
                    <CheckCircle2 size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        </footer>
      </main>

      {/* Modal: Interactive Incomplete Breakdown */}
      {showIncompleteModal && (
        <div 
          className="jp-incomplete-modal-backdrop" 
          onClick={() => setShowIncompleteModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="jp-incomplete-modal-title"
        >
          <div 
            className="jp-incomplete-modal-card" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="jp-incomplete-modal-header">
              <div className="jp-incomplete-modal-header-info">
                <h3 id="jp-incomplete-modal-title" className="jp-incomplete-modal-title">
                  Profile Completion Breakdown
                </h3>
                <p className="jp-incomplete-modal-desc">
                  {completionAudit.percentage === 100
                    ? 'Outstanding! Your candidate master profile is 100% complete across all modules.'
                    : `${completionAudit.percentage}% complete. Complete the remaining sections below to maximize job match scoring.`}
                </p>
              </div>
              <button 
                type="button" 
                className="jp-incomplete-close-btn"
                onClick={() => setShowIncompleteModal(false)}
                title="Close"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="jp-incomplete-progress-card">
              <div className="jp-incomplete-progress-top">
                <span className="jp-incomplete-progress-label">Total Completion</span>
                <span className="jp-incomplete-progress-val">{completionAudit.percentage}%</span>
              </div>
              <div className="jp-incomplete-bar-track">
                <div 
                  className={`jp-incomplete-bar-fill ${completionAudit.percentage === 100 ? 'is-complete' : ''}`}
                  style={{ width: `${completionAudit.percentage}%` }}
                />
              </div>
              <div className="jp-incomplete-progress-stats">
                <span>{completionAudit.completedCount} of {completionAudit.totalCount} sections filled</span>
                <span>{completionAudit.incompleteItems.length} incomplete</span>
              </div>
            </div>

            <div className="jp-incomplete-list-container">
              <div className="jp-incomplete-list-header">
                Section Checklist ({completionAudit.items.length})
              </div>
              <ul className="jp-incomplete-list">
                {completionAudit.items.map((item) => {
                  const pageDef = PROFILE_PAGES.find(p => p.id === item.pageId);
                  const Icon = pageDef?.icon || Briefcase;

                  return (
                    <li 
                      key={item.id} 
                      className={`jp-incomplete-item ${item.isComplete ? 'is-completed' : 'is-pending'}`}
                    >
                      <div className="jp-incomplete-item-icon">
                        <Icon size={16} />
                      </div>
                      <div className="jp-incomplete-item-info">
                        <div className="jp-incomplete-item-topline">
                          <span className="jp-incomplete-item-title">{item.title}</span>
                          {item.mandatory && (
                            <span className="jp-incomplete-pill-req">Required</span>
                          )}
                          <span className="jp-incomplete-item-weight">+{item.weight}%</span>
                        </div>
                        <p className="jp-incomplete-item-desc">{item.description}</p>
                      </div>

                      <div className="jp-incomplete-item-action">
                        {item.isComplete ? (
                          <span className="jp-incomplete-done-badge">
                            <Check size={13} style={{ marginRight: '4px' }} />
                            Completed
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="jp-incomplete-fill-btn"
                            onClick={() => {
                              setShowIncompleteModal(false);
                              navigateToPage(item.pageId);
                            }}
                          >
                            Fill Now
                            <ChevronRight size={13} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="jp-incomplete-modal-footer">
              <button
                type="button"
                className="jp-btn jp-btn-secondary jp-btn-sm"
                onClick={() => setShowIncompleteModal(false)}
              >
                Close
              </button>
              {completionAudit.incompleteItems.length > 0 && (
                <button
                  type="button"
                  className="jp-btn jp-btn-primary jp-btn-sm"
                  onClick={() => {
                    const firstIncomplete = completionAudit.incompleteItems[0];
                    if (firstIncomplete) {
                      setShowIncompleteModal(false);
                      navigateToPage(firstIncomplete.pageId);
                    }
                  }}
                >
                  Fill Next Incomplete Section
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
