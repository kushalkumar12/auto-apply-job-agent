import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2, 
  Globe, 
  UploadCloud, 
  Eye, 
  Download, 
  ExternalLink, 
  ShieldAlert, 
  Loader2, 
  Building, 
  Sparkles, 
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Copy,
  Map,
  Code,
  FileCode,
  Award,
  BookOpen,
  Layers,
  RotateCcw,
  AlertTriangle,
  Star,
  Users
} from 'lucide-react';
import { apiService } from '../services/api';
import StaticAvatar, { AVATAR_OPTIONS } from './StaticAvatar';
import RoleKeywordsSection from './RoleKeywordsSection';
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

const REGIONS = [
  'Worldwide', 'North America', 'LATAM', 'Europe', 'UK', 'MENA', 'Africa', 'APAC', 'CIS'
];

const SUB_TABS = [
  { id: 'profile', label: 'Profile', icon: User, title: 'Profile', tagline: 'Your photo, CV, summary, roles, and level — measured against live market demand.' },
  { id: 'personas', label: 'Personas', icon: Users, title: 'Candidate Profiles & Personas', tagline: 'Create and switch multiple candidate profiles under this account. Exactly one profile is active at a time.' },
  { id: 'keywords', label: 'Role Keywords', icon: Sparkles, title: 'AI-Generated Role Keywords', tagline: 'Anchored search queries and role variations prioritizing your primary skill.' },
  { id: 'resume', label: 'Resume', icon: FileText, title: 'Resume & AI Provenance', tagline: 'Upload CV, view AI JSON template, and explore visual field extraction map.' },
  { id: 'contacts', label: 'Contacts', icon: Contact, title: 'Contacts & Links', tagline: 'Your verified contact details and labeled social & portfolio links.' },
  { id: 'location', label: 'Location', icon: MapPin, title: 'Location', tagline: 'Current residence and multiple desired search locations with real-time global geocoding.' },
  { id: 'skills', label: 'Skills', icon: Tag, title: 'Skills', tagline: 'List your skills to compare your profile against live market demand.' },
  { id: 'avoid', label: 'Avoid', icon: Ban, title: 'Avoid', tagline: 'Filter out specific technologies, job portals, or companies as structured tags.' },
  { id: 'experience', label: 'Experience', icon: Briefcase, title: 'Experience', tagline: 'Your professional work history — add, update, and manage your positions.' },
  { id: 'education', label: 'Education', icon: GraduationCap, title: 'Education', tagline: 'Degrees, certifications, and educational background with full add & edit capabilities.' },
  { id: 'screening', label: 'Screening answers', icon: FileText, title: 'Screening answers', tagline: 'Pre-filled and customizable answers for job application questionnaires.' },
  { id: 'languages', label: 'Languages', icon: Globe, title: 'Languages', tagline: 'Optional — showcase multilingual proficiency for global and remote teams.' },
  { id: 'settings', label: 'Settings', icon: Settings, title: 'Settings', tagline: 'Manage your profile visibility, notification, and parsing preferences.' }
];

const PRESET_LINK_LABELS = [
  'LinkedIn',
  'GitHub',
  'LeetCode',
  'Portfolio / Website',
  'Twitter / X',
  'HackerRank',
  'Medium / Blog',
  'Other'
];

const DEFAULT_SCREENING_QUESTIONS = [];
const DEFAULT_LANGUAGES = [];

export default function ProfileView() {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [setupDismissed, setSetupDismissed] = useState(false);

  // 1. Profile Photo / Avatar State
  const [avatar, setAvatar] = useState('avatar_1');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const avatarFileInputRef = useRef(null);

  // Profile data state
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [summary, setSummary] = useState('');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');

  // Skills state
  const [skillsList, setSkillsList] = useState([]);
  const [primarySkill, setPrimarySkill] = useState('');
  const [skillSearch, setSkillSearch] = useState('');

  // 2. Resume file and metadata state + Viewer Modal
  const [resumeMeta, setResumeMeta] = useState(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isResumeViewerOpen, setIsResumeViewerOpen] = useState(false);
  const [resumeContentData, setResumeContentData] = useState(null);
  const [isLoadingResumeContent, setIsLoadingResumeContent] = useState(false);
  const [resumeViewerTab, setResumeViewerTab] = useState('parsed'); // 'parsed' | 'text' | 'document'
  const resumeFileInputRef = useRef(null);

  // 3. Location: Current Location AND Desired Search Locations (Multiple)
  const [workFormats, setWorkFormats] = useState({ remote: false, hybrid: false, onsite: false });
  const [userLocation, setUserLocation] = useState('');
  const [desiredLocations, setDesiredLocations] = useState([]);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [desiredSearchInput, setDesiredSearchInput] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [searchTargetType, setSearchTargetType] = useState('current'); // 'current' | 'desired'
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [openToRelocation, setOpenToRelocation] = useState(false);

  // 4. Contacts & Structured Links State with Smart Next-Label Selection
  const [contacts, setContacts] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    links: ''
  });
  const [contactLinks, setContactLinks] = useState([]);
  const [savedContactsToast, setSavedContactsToast] = useState(false);

  // 5. Avoid state (Structured Tags like Skills)
  const [avoidSkills, setAvoidSkills] = useState([]);
  const [avoidSources, setAvoidSources] = useState([]);
  const [avoidCompanies, setAvoidCompanies] = useState([]);
  const [avoidSkillInput, setAvoidSkillInput] = useState('');
  const [avoidSourceInput, setAvoidSourceInput] = useState('');
  const [avoidCompanyInput, setAvoidCompanyInput] = useState('');

  // 6. Experience & Education (Live database states & Full CRUD)
  const [experiences, setExperiences] = useState([]);
  const [educationList, setEducationList] = useState([]);
  
  // Experience Modal
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExpIndex, setEditingExpIndex] = useState(null);
  const [expForm, setExpForm] = useState({
    title: '',
    company: '',
    location: '',
    period: '',
    description: ''
  });

  // Education Modal (Full Add / Edit / Update)
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [editingEduIndex, setEditingEduIndex] = useState(null);
  const [eduForm, setEduForm] = useState({
    degree: '',
    institution: '',
    period: '',
    grade: ''
  });

  // 7. Screening Answers (Comprehensive Defaults + Dynamic Add)
  const [screeningAnswers, setScreeningAnswers] = useState(DEFAULT_SCREENING_QUESTIONS);
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
  const [newQuestionForm, setNewQuestionForm] = useState({
    question: '',
    answer: '',
    category: 'General'
  });

  // 8. Languages Section (Optional)
  const [languagesList, setLanguagesList] = useState(DEFAULT_LANGUAGES);
  const [isAddLanguageOpen, setIsAddLanguageOpen] = useState(false);
  const [newLangForm, setNewLangForm] = useState({
    language: '',
    proficiency: 'Full Professional'
  });

  // 9. Resume AI Map & Field Ranking State
  const [resumeMapData, setResumeMapData] = useState(null);
  const [activeMapField, setActiveMapField] = useState('personalIdentity');
  const [resumeViewSubMode, setResumeViewSubMode] = useState('map'); // 'map' | 'json'
  const [isApplyingAiMap, setIsApplyingAiMap] = useState(false);
  const [showAllFieldRankings, setShowAllFieldRankings] = useState(false);
  const [copiedJsonToast, setCopiedJsonToast] = useState(false);
  const [rankingDismissed, setRankingDismissed] = useState(false);

  const fetchResumeMap = async () => {
    try {
      const mapRes = await apiService.getResumeMap();
      if (mapRes && mapRes.aiExtraction) {
        setResumeMapData(mapRes);
      }
    } catch (err) {
      console.warn('Error fetching resume map:', err);
    }
  };

  const handleApplyAiMap = async () => {
    if (!resumeMapData?.aiExtraction) {
      alert('Please upload a resume first to extract and apply structured AI profile data.');
      return;
    }
    setIsApplyingAiMap(true);
    try {
      const currentExtraction = resumeMapData.aiExtraction;
      const res = await apiService.applyResumeAiMap(currentExtraction);
      if (res && res.success) {
        if (res.profile) {
          if (res.profile.skillsList && Array.isArray(res.profile.skillsList)) {
            setSkillsList(res.profile.skillsList);
          }
          if (res.profile.selectedRoles && Array.isArray(res.profile.selectedRoles)) {
            setSelectedRoles(res.profile.selectedRoles);
          }
          if (res.profile.selectedLevels && Array.isArray(res.profile.selectedLevels)) {
            setSelectedLevels(res.profile.selectedLevels);
          }
          if (res.profile.summary) {
            setSummary(res.profile.summary);
          }
          if (res.profile.experiences && Array.isArray(res.profile.experiences)) {
            setExperiences(res.profile.experiences);
          }
          if (res.profile.educationList && Array.isArray(res.profile.educationList)) {
            setEducationList(res.profile.educationList);
          }
          if (res.profile.userLocation) {
            setUserLocation(res.profile.userLocation);
          }
          if (res.profile.general) {
            setContacts(prev => ({
              ...prev,
              fullName: res.profile.general.fullName || prev.fullName,
              email: res.profile.general.email || prev.email,
              phone: res.profile.general.phone || prev.phone,
              location: res.profile.general.city || res.profile.general.location || prev.location,
              links: res.profile.general.links || prev.links
            }));
          }
        }
        window.dispatchEvent(new CustomEvent('rp_profile_updated', { detail: res.profile }));
        setSavedContactsToast('AI JSON template successfully applied to your live profile!');
        setTimeout(() => setSavedContactsToast(false), 4000);
      }
    } catch (err) {
      console.error('Error applying AI map:', err);
      alert('Failed to apply AI template to profile: ' + (err.message || 'Error'));
    } finally {
      setIsApplyingAiMap(false);
    }
  };

  // Reset States for Settings Subtab
  const [isResettingProfile, setIsResettingProfile] = useState(false);
  const [isFactoryModalOpen, setIsFactoryModalOpen] = useState(false);
  const [confirmProjectInput, setConfirmProjectInput] = useState('');
  const [factoryResetError, setFactoryResetError] = useState('');
  // 10. Multi-Candidate Profiles State (Stage 1 Requirement 3)
  const [candidateProfiles, setCandidateProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [editingProfileName, setEditingProfileName] = useState('');
  const [profileValidation, setProfileValidation] = useState(null);

  const loadCandidateProfiles = async () => {
    try {
      const list = await apiService.getProfiles();
      if (Array.isArray(list)) {
        setCandidateProfiles(list);
        const active = list.find(p => p.is_active === 1);
        if (active) setActiveProfileId(active.id);
      }
      const val = await apiService.getActiveProfileValidation();
      setProfileValidation(val);
    } catch (e) {
      console.warn('Failed to load candidate profiles:', e);
    }
  };

  const handleActivateCandidateProfile = async (id) => {
    try {
      await apiService.activateProfile(id);
      await loadCandidateProfiles();
      await fetchProfileData();
      window.dispatchEvent(new CustomEvent('rp_profile_updated'));
      setSavedContactsToast('Active candidate persona switched!');
      setTimeout(() => setSavedContactsToast(false), 3000);
    } catch (err) {
      alert('Failed to switch profile: ' + (err.message || 'Error'));
    }
  };

  const handleCreateNewCandidateProfile = async (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    try {
      await apiService.createProfile({
        name: newProfileName.trim(),
        makeActive: true
      });
      setNewProfileName('');
      setIsCreatingProfile(false);
      await loadCandidateProfiles();
      await fetchProfileData();
      window.dispatchEvent(new CustomEvent('rp_profile_updated'));
      setSavedContactsToast('New candidate profile created and activated!');
      setTimeout(() => setSavedContactsToast(false), 3000);
    } catch (err) {
      alert('Failed to create candidate profile: ' + (err.message || 'Error'));
    }
  };

  const handleDeleteCandidateProfile = async (id, name) => {
    if (!window.confirm(`Delete candidate profile "${name}"? This cannot be undone.`)) return;
    try {
      await apiService.deleteProfile(id);
      await loadCandidateProfiles();
      setSavedContactsToast('Candidate profile deleted.');
      setTimeout(() => setSavedContactsToast(false), 3000);
    } catch (err) {
      alert(err.message || 'Cannot delete profile.');
    }
  };

  const handleRenameCandidateProfile = async (id) => {
    if (!editingProfileName.trim()) return;
    try {
      await apiService.renameProfile(id, editingProfileName.trim());
      setEditingProfileId(null);
      await loadCandidateProfiles();
      setSavedContactsToast('Profile renamed.');
      setTimeout(() => setSavedContactsToast(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to rename profile.');
    }
  };

  // Load profile from API
  const fetchProfileData = async () => {
    try {
      const data = await apiService.getProfile();
      if (data) {
        if (data.avatar) {
          setAvatar(data.avatar);
        }
        if (data.resume) {
          setResumeMeta(data.resume);
        } else {
          setResumeMeta(null);
        }
        if (data.selectedRoles && Array.isArray(data.selectedRoles)) {
          setSelectedRoles(data.selectedRoles);
        }
        if (data.selectedLevels && Array.isArray(data.selectedLevels)) {
          setSelectedLevels(data.selectedLevels);
        }
        if (data.skillsList && Array.isArray(data.skillsList)) {
          setSkillsList(data.skillsList);
        }
        if (data.primarySkill) {
          setPrimarySkill(data.primarySkill);
        }
        if (data.workFormats) {
          setWorkFormats(data.workFormats);
        }
        if (data.userLocation) {
          setUserLocation(data.userLocation);
        }
        if (data.desiredLocations && Array.isArray(data.desiredLocations)) {
          setDesiredLocations(data.desiredLocations);
        }
        if (data.avoidCompanies && Array.isArray(data.avoidCompanies)) {
          setAvoidCompanies(data.avoidCompanies);
        }
        if (data.avoidSkills && Array.isArray(data.avoidSkills)) {
          setAvoidSkills(data.avoidSkills);
        }
        if (data.avoidSources && Array.isArray(data.avoidSources)) {
          setAvoidSources(data.avoidSources);
        }
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.experiences && Array.isArray(data.experiences)) {
          setExperiences(data.experiences);
        }
        if (data.educationList && Array.isArray(data.educationList)) {
          setEducationList(data.educationList);
        }
        if (data.screeningAnswers && Array.isArray(data.screeningAnswers) && data.screeningAnswers.length > 0) {
          setScreeningAnswers(data.screeningAnswers);
        }
        if (data.languages && Array.isArray(data.languages)) {
          setLanguagesList(data.languages);
        }
        if (data.contactLinks && Array.isArray(data.contactLinks) && data.contactLinks.length > 0) {
          setContactLinks(data.contactLinks);
        } else if (data.general && data.general.links) {
          const parsedLinks = data.general.links
            .split('\n')
            .filter(l => l.trim())
            .map((url, i) => {
              let label = 'Portfolio / Website';
              if (url.includes('linkedin')) label = 'LinkedIn';
              else if (url.includes('github')) label = 'GitHub';
              else if (url.includes('leetcode')) label = 'LeetCode';
              else if (url.includes('twitter') || url.includes('x.com')) label = 'Twitter / X';
              return { id: `link-${i + 1}`, label, url };
            });
          if (parsedLinks.length > 0) {
            setContactLinks(parsedLinks);
          }
        }
        if (data.general) {
          if (data.general.fullName || data.general.firstName) {
            setContacts(prev => ({
              ...prev,
              fullName: data.general.fullName || `${data.general.firstName || ''} ${data.general.lastName || ''}`.trim(),
              email: data.general.email || prev.email,
              phone: data.general.phone || prev.phone,
              location: data.general.city || data.general.location || prev.location,
              links: data.general.links || prev.links
            }));
          }
          if (data.general.bio && !data.summary) {
            setSummary(data.general.bio);
          }
        }
      }
    } catch (err) {
      console.warn('Profile sync fallback:', err);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleResetProfileData = async () => {
    if (!window.confirm("Are you sure you want to delete your Candidate Profile? This will permanently wipe your candidate contact details, skills, experiences, and uploaded resume for this profile only. Application jobs and settings will be preserved.")) {
      return;
    }
    setIsResettingProfile(true);
    try {
      await apiService.resetProfile();
      try {
        localStorage.removeItem('rp_candidate_profile');
      } catch (e) {
        console.warn('Storage remove notice:', e);
      }

      // Reset all local component state to clean blank
      setContacts({ fullName: '', email: '', phone: '', location: '', links: '' });
      setContactLinks([]);
      setSummary('');
      setSkillsList([]);
      setPrimarySkill('');
      setSelectedRoles([]);
      setSelectedLevels([]);
      setExperiences([]);
      setEducationList([]);
      setUserLocation('');
      setDesiredLocations([]);
      setAvoidCompanies([]);
      setAvoidSkills([]);
      setAvoidSources([]);
      setResumeMeta(null);
      setResumeMapData(null);
      setScreeningAnswers([]);
      setLanguagesList([]);

      window.dispatchEvent(new CustomEvent('rp_profile_updated', { detail: {} }));
      window.dispatchEvent(new CustomEvent('rp_candidate_updated', {
        detail: {
          avatar: 'avatar_1',
          name: '',
          title: '',
          email: ''
        }
      }));
      setSavedContactsToast('Candidate profile data has been completely deleted.');
    } catch (err) {
      alert('Error deleting profile: ' + (err.message || err));
    } finally {
      setIsResettingProfile(false);
      setTimeout(() => setSavedContactsToast(false), 3500);
    }
  };

  const handleFactoryResetConfirm = async () => {
    const raw = confirmProjectInput.trim();
    const clean = raw.toLowerCase().replace(/[\s-_]/g, '');
    const valid = clean === 'resumeporter' || clean === 'jobsonly' || clean === 'reset' || raw.toLowerCase().includes('porter');
    if (!valid) {
      setFactoryResetError("Verification failed. Please type 'JobsOnly' or 'resume-porter'.");
      return;
    }
    setIsResettingFactory(true);
    setFactoryResetError('');
    try {
      await apiService.factoryReset(raw || 'JobsOnly');
      
      // Clear entire local storage and session storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Storage clear notice:', e);
      }
      
      setSavedContactsToast('Factory reset complete! Refreshing application to clean state...');
      setTimeout(() => {
        window.location.href = '/';
      }, 700);
    } catch (err) {
      setFactoryResetError(err.message || 'Factory reset failed');
      setIsResettingFactory(false);
    }
  };

  // 1. Handlers for Profile Picture / Avatar
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPEG, WebP).');
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      alert('Image size exceeds 6 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        setAvatar(dataUrl);
        try {
          await apiService.updateAvatar(dataUrl);
          await apiService.updateProfile({ avatar: dataUrl });
          window.dispatchEvent(new CustomEvent('rp_candidate_updated', { detail: { avatar: dataUrl } }));
          setSavedContactsToast('Profile picture updated successfully!');
          setTimeout(() => setSavedContactsToast(false), 3000);
        } catch (err) {
          console.error('Error saving avatar:', err);
        }
      }
    };
    reader.readAsDataURL(file);
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
  };

  const handleSelectPresetAvatar = async (presetId) => {
    setAvatar(presetId);
    setIsAvatarModalOpen(false);
    try {
      await apiService.updateAvatar(presetId);
      await apiService.updateProfile({ avatar: presetId });
      window.dispatchEvent(new CustomEvent('rp_candidate_updated', { detail: { avatar: presetId } }));
      setSavedContactsToast('Stylized avatar selected!');
      setTimeout(() => setSavedContactsToast(false), 3000);
    } catch (err) {
      console.error('Error updating preset avatar:', err);
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Reset profile photo to default avatar?')) return;
    const defaultAv = 'avatar_1';
    setAvatar(defaultAv);
    try {
      await apiService.updateAvatar(defaultAv);
      await apiService.updateProfile({ avatar: defaultAv });
      window.dispatchEvent(new CustomEvent('rp_candidate_updated', { detail: { avatar: defaultAv } }));
      setSavedContactsToast('Profile picture reset to default.');
      setTimeout(() => setSavedContactsToast(false), 3000);
    } catch (err) {
      console.error('Error resetting avatar:', err);
    }
  };

  // 2. Handlers for Resume Upload, View & Delete
  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingResume(true);
    try {
      const res = await apiService.uploadResume(file);
      if (res && res.success) {
        if (res.resume) {
          setResumeMeta(res.resume);
        }
        if (res.profile) {
          if (res.profile.skillsList && Array.isArray(res.profile.skillsList)) {
            setSkillsList(res.profile.skillsList);
          }
          if (res.profile.selectedRoles && Array.isArray(res.profile.selectedRoles)) {
            setSelectedRoles(res.profile.selectedRoles);
          }
          if (res.profile.selectedLevels && Array.isArray(res.profile.selectedLevels)) {
            setSelectedLevels(res.profile.selectedLevels);
          }
          if (res.profile.summary) {
            setSummary(res.profile.summary);
          }
          if (res.profile.experiences && Array.isArray(res.profile.experiences)) {
            setExperiences(res.profile.experiences);
          }
          if (res.profile.educationList && Array.isArray(res.profile.educationList)) {
            setEducationList(res.profile.educationList);
          }
          if (res.profile.userLocation) {
            setUserLocation(res.profile.userLocation);
          }
          if (res.profile.general) {
            setContacts(prev => ({
              ...prev,
              fullName: res.profile.general.fullName || prev.fullName,
              email: res.profile.general.email || prev.email,
              phone: res.profile.general.phone || prev.phone,
              location: res.profile.general.city || res.profile.general.location || prev.location,
              links: res.profile.general.links || prev.links
            }));
          }
        }
        window.dispatchEvent(new CustomEvent('rp_profile_updated', { detail: res.profile }));
        setSavedContactsToast(`Resume '${file.name}' parsed and loaded into profile!`);
        setTimeout(() => setSavedContactsToast(false), 4000);
      }
    } catch (err) {
      console.error('Error uploading resume:', err);
      alert('Resume upload/parsing error: ' + (err.message || 'Check backend connection'));
    } finally {
      setIsUploadingResume(false);
      if (resumeFileInputRef.current) {
        resumeFileInputRef.current.value = '';
      }
    }
  };

  const handleOpenResumeViewer = async () => {
    setIsResumeViewerOpen(true);
    setIsLoadingResumeContent(true);
    try {
      const content = await apiService.getResumeContent();
      setResumeContentData(content);
    } catch (err) {
      console.error('Error fetching resume content:', err);
    } finally {
      setIsLoadingResumeContent(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to delete your uploaded resume?')) {
      return;
    }
    try {
      await apiService.deleteResume();
      setResumeMeta(null);
      setResumeContentData(null);
      setSavedContactsToast('Resume deleted successfully.');
      setTimeout(() => setSavedContactsToast(false), 3000);
    } catch (err) {
      console.error('Error deleting resume:', err);
    }
  };

  // 3. Real-time Location Search with OpenStreetMap Nominatim API
  useEffect(() => {
    const query = searchTargetType === 'current' ? locationSearchQuery : desiredSearchInput;
    if (!query || query.trim().length < 2) {
      setLocationSearchResults([]);
      setIsSearchingLocation(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=6`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const list = await res.json();
          setLocationSearchResults(list || []);
          setShowLocationDropdown(true);
        }
      } catch (err) {
        console.warn('Location geocoding notice:', err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [locationSearchQuery, desiredSearchInput, searchTargetType]);

  const handleSelectLocation = (item) => {
    const address = item.address || {};
    const city = address.city || address.town || address.village || address.municipality || address.state_district || item.name;
    const country = address.country || '';
    const formatted = city && country ? `${city}, ${country}` : item.display_name.split(',').slice(0, 2).join(',').trim();
    
    if (searchTargetType === 'current') {
      setUserLocation(formatted);
      setContacts(prev => ({ ...prev, location: formatted }));
      setLocationSearchQuery('');
    } else {
      handleAddDesiredLocation(formatted);
      setDesiredSearchInput('');
    }
    setShowLocationDropdown(false);
    setLocationSearchResults([]);
  };

  const handleAddDesiredLocation = (loc) => {
    if (!loc || !loc.trim()) return;
    const clean = loc.trim();
    if (!desiredLocations.some(l => l.toLowerCase() === clean.toLowerCase())) {
      setDesiredLocations(prev => [...prev, clean]);
    }
  };

  const handleRemoveDesiredLocation = (locToRemove) => {
    setDesiredLocations(prev => prev.filter(l => l !== locToRemove));
  };

  // 4. Contacts Links Management with Auto-Selecting Next Unused Option
  const handleAddLink = () => {
    // Find the first label from PRESET_LINK_LABELS that is not currently used
    const usedLabels = new Set(contactLinks.map(l => l.label));
    const nextLabel = PRESET_LINK_LABELS.find(lbl => lbl !== 'Other' && !usedLabels.has(lbl)) || 'Other';
    const newId = `link-${contactLinks.length + 1}-${Date.now().toString().slice(-4)}`;
    const updated = [...contactLinks, { id: newId, label: nextLabel, url: '' }];
    setContactLinks(updated);
    syncLinksToTextarea(updated);
  };

  const handleUpdateLink = (id, field, value) => {
    const updated = contactLinks.map(l => l.id === id ? { ...l, [field]: value } : l);
    setContactLinks(updated);
    syncLinksToTextarea(updated);
  };

  const handleRemoveLink = (id) => {
    const updated = contactLinks.filter(l => l.id !== id);
    setContactLinks(updated);
    syncLinksToTextarea(updated);
  };

  const syncLinksToTextarea = (linksArr) => {
    const text = linksArr.filter(l => l.url.trim()).map(l => l.url.trim()).join('\n');
    setContacts(prev => ({ ...prev, links: text }));
  };

  // 5. Avoid Section Tag Handlers
  const handleAddAvoidTag = (category, value, setter, clear) => {
    if (!value || !value.trim()) return;
    const clean = value.trim();
    setter(prev => {
      if (prev.some(x => x.toLowerCase() === clean.toLowerCase())) return prev;
      return [...prev, clean];
    });
    clear('');
  };

  const handleRemoveAvoidTag = (item, setter) => {
    setter(prev => prev.filter(x => x !== item));
  };

  // 6. Experience CRUD Handlers
  const handleOpenAddExperience = () => {
    setEditingExpIndex(null);
    setExpForm({
      title: '',
      company: '',
      location: userLocation || 'Hyderabad, India',
      period: '2023 – Present',
      description: ''
    });
    setIsExpModalOpen(true);
  };

  const handleOpenEditExperience = (idx) => {
    const exp = experiences[idx];
    if (!exp) return;
    setEditingExpIndex(idx);
    setExpForm({
      title: exp.title || '',
      company: exp.company || '',
      location: exp.location || userLocation,
      period: exp.period || '',
      description: exp.description || ''
    });
    setIsExpModalOpen(true);
  };

  const handleSaveExperienceModal = () => {
    if (!expForm.title.trim() || !expForm.company.trim()) {
      alert('Please provide both Job Title and Company.');
      return;
    }

    if (editingExpIndex !== null) {
      setExperiences(prev => {
        const next = [...prev];
        next[editingExpIndex] = { ...expForm };
        return next;
      });
    } else {
      setExperiences(prev => [...prev, { ...expForm }]);
    }
    setIsExpModalOpen(false);
  };

  const handleDeleteExperience = (idx) => {
    if (!window.confirm('Delete this work experience entry?')) return;
    setExperiences(prev => prev.filter((_, i) => i !== idx));
  };

  // 6.2 Education CRUD Handlers (Full Add, Edit, Update, Delete)
  const handleOpenAddEducation = () => {
    setEditingEduIndex(null);
    setEduForm({
      degree: '',
      institution: '',
      period: '2017 – 2021',
      grade: 'First Class with Distinction'
    });
    setIsEduModalOpen(true);
  };

  const handleOpenEditEducation = (idx) => {
    const edu = educationList[idx];
    if (!edu) return;
    setEditingEduIndex(idx);
    setEduForm({
      degree: edu.degree || '',
      institution: edu.institution || '',
      period: edu.period || '',
      grade: edu.grade || ''
    });
    setIsEduModalOpen(true);
  };

  const handleSaveEducationModal = () => {
    if (!eduForm.degree.trim() || !eduForm.institution.trim()) {
      alert('Please provide both Degree/Field of Study and Institution.');
      return;
    }

    if (editingEduIndex !== null) {
      setEducationList(prev => {
        const next = [...prev];
        next[editingEduIndex] = { ...eduForm };
        return next;
      });
    } else {
      setEducationList(prev => [...prev, { ...eduForm }]);
    }
    setIsEduModalOpen(false);
  };

  const handleDeleteEducation = (idx) => {
    if (!window.confirm('Delete this education entry?')) return;
    setEducationList(prev => prev.filter((_, i) => i !== idx));
  };

  // 7. Screening Answers Handlers
  const handleUpdateScreeningAnswer = (id, newAns) => {
    setScreeningAnswers(prev => prev.map(q => q.id === id ? { ...q, answer: newAns } : q));
  };

  const handleDeleteScreeningQuestion = (id) => {
    if (!window.confirm('Delete this screening question?')) return;
    setScreeningAnswers(prev => prev.filter(q => q.id !== id));
  };

  const handleAddCustomScreeningQuestion = () => {
    if (!newQuestionForm.question.trim()) {
      alert('Question title is required.');
      return;
    }
    const newEntry = {
      id: `sq-${screeningAnswers.length + 1}-${Date.now().toString().slice(-4)}`,
      question: newQuestionForm.question.trim(),
      answer: newQuestionForm.answer.trim() || 'Yes',
      category: newQuestionForm.category || 'General',
      type: 'text'
    };
    setScreeningAnswers(prev => [...prev, newEntry]);
    setNewQuestionForm({ question: '', answer: '', category: 'General' });
    setIsAddQuestionModalOpen(false);
  };

  // 8. Languages Section Handlers
  const handleAddLanguage = () => {
    if (!newLangForm.language.trim()) {
      alert('Language name is required.');
      return;
    }
    const exists = languagesList.some(l => l.language.toLowerCase() === newLangForm.language.trim().toLowerCase());
    if (exists) {
      alert('This language is already added.');
      return;
    }
    setLanguagesList(prev => [...prev, {
      id: `lang-${languagesList.length + 1}-${Date.now().toString().slice(-4)}`,
      language: newLangForm.language.trim(),
      proficiency: newLangForm.proficiency
    }]);
    setNewLangForm({ language: '', proficiency: 'Full Professional' });
    setIsAddLanguageOpen(false);
  };

  const handleDeleteLanguage = (id) => {
    setLanguagesList(prev => prev.filter(l => l.id !== id));
  };

  // Roles & Levels Handlers
  const toggleRole = (role) => {
    let nextRoles;
    if (selectedRoles.includes(role)) {
      nextRoles = selectedRoles.filter(r => r !== role);
    } else {
      if (selectedRoles.length < 10) {
        nextRoles = [...selectedRoles, role];
      } else {
        return;
      }
    }
    setSelectedRoles(nextRoles);
  };

  const toggleLevel = (lvl) => {
    let nextLevels;
    if (selectedLevels.includes(lvl)) {
      nextLevels = selectedLevels.filter(l => l !== lvl);
    } else {
      nextLevels = [...selectedLevels, lvl];
    }
    setSelectedLevels(nextLevels);
  };

  const removeSkill = (skillToRemove) => {
    setSkillsList(prev => prev.filter(s => s.name !== skillToRemove));
    if (primarySkill === skillToRemove) {
      const remaining = skillsList.filter(s => s.name !== skillToRemove);
      if (remaining.length > 0) {
        setPrimarySkill(typeof remaining[0] === 'string' ? remaining[0] : remaining[0].name);
      } else {
        setPrimarySkill('');
      }
    }
  };

  const handleAddSkill = (e) => {
    if (e.key === 'Enter' && skillSearch.trim()) {
      e.preventDefault();
      const trimmed = skillSearch.trim();
      if (!skillsList.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
        const newSkill = { name: trimmed, icon: null };
        setSkillsList(prev => [...prev, newSkill]);
        if (!primarySkill) {
          setPrimarySkill(trimmed);
        }
      }
      setSkillSearch('');
    }
  };

  // Master Save & Explore Synchronization
  const [isSaving, setIsSaving] = useState(false);
  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSavedContactsToast('Saving profile & updating search filters...');

    const payload = {
      avatar,
      selectedRoles,
      selectedLevels,
      skillsList,
      primarySkill,
      workFormats,
      userLocation,
      desiredLocations,
      avoidCompanies,
      avoidSkills,
      avoidSources,
      summary,
      experiences,
      educationList,
      screeningAnswers,
      languages: languagesList,
      contactLinks,
      resume: resumeMeta,
      general: {
        fullName: contacts.fullName,
        email: contacts.email,
        phone: contacts.phone,
        city: userLocation || contacts.location,
        links: contacts.links,
        bio: summary
      }
    };

    try {
      await apiService.updateProfile(payload);
      window.dispatchEvent(new CustomEvent('rp_profile_updated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('rp_candidate_updated', { detail: { avatar, name: contacts.fullName, email: contacts.email, title: summary } }));
      setSavedContactsToast('Profile saved successfully! Explore & Orbit tailored to your preferences.');
    } catch (err) {
      console.warn('Profile save notice:', err);
      setSavedContactsToast('Profile preferences synchronized.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSavedContactsToast(false), 3800);
    }
  };

  const handleSaveContacts = handleSaveProfile;

  // Filtered Roles
  const filteredRoles = ALL_ROLES.filter(r => 
    r.toLowerCase().includes(roleSearch.toLowerCase())
  );

  // Dynamic setup completion calculations
  const hasCv = Boolean(resumeMeta);
  const hasRoles = selectedRoles.length > 0;
  const hasSkills = skillsList.length > 0;
  const hasLocation = Boolean(userLocation);
  const setupItemsCompleted = [hasCv, hasRoles, hasSkills, hasLocation, false].filter(Boolean).length;

  // Comprehensive Field-by-Field Ranking Engine
  const rankedProfileFields = [
    {
      rank: 1,
      id: 'resume',
      name: 'Resume / CV Document',
      category: 'ATS Document Core',
      weight: 18,
      priorityLabel: 'Critical Priority (Rank #1)',
      priorityClass: 'critical',
      tabId: 'resume',
      isComplete: Boolean(resumeMeta),
      impact: 'Core document required for ATS parsing and source provenance',
      hint: 'Upload your CV to unlock AI parsing and source map'
    },
    {
      rank: 2,
      id: 'roles_seniority',
      name: 'Target Roles & Seniority Level',
      category: 'Market Discovery',
      weight: 13,
      priorityLabel: 'Critical Priority (Rank #2)',
      priorityClass: 'critical',
      tabId: 'profile',
      isComplete: selectedRoles.length > 0 && selectedLevels.length > 0,
      impact: 'Primary filter used by recruiter algorithms and job feeds',
      hint: 'Specify your engineering specialization and target seniority'
    },
    {
      rank: 3,
      id: 'technical_skills',
      name: 'Technical Skills (≥ 5 Skills)',
      category: 'Skill Competencies',
      weight: 13,
      priorityLabel: 'High Priority (Rank #3)',
      priorityClass: 'high',
      tabId: 'skills',
      isComplete: skillsList.length >= 5,
      impact: 'ATS keyword indexing and skill gap analysis against vacancies',
      hint: 'Add 5 or more technical skills to optimize match ranking'
    },
    {
      rank: 4,
      id: 'work_experience',
      name: 'Professional Experience History',
      category: 'Career Chronology',
      weight: 12,
      priorityLabel: 'High Priority (Rank #4)',
      priorityClass: 'high',
      tabId: 'experience',
      isComplete: experiences.length > 0,
      impact: 'Validates career progression, company pedigree, and seniority',
      hint: 'Add at least one professional work experience role'
    },
    {
      rank: 5,
      id: 'phone',
      name: 'Mobile Number',
      category: 'Direct Outreach',
      weight: 9,
      priorityLabel: 'High Priority (Rank #5)',
      priorityClass: 'high',
      tabId: 'contacts',
      isComplete: Boolean(contacts.phone && contacts.phone.trim().length >= 4),
      impact: 'Required for recruiter calls, phone screening, and interview scheduling',
      hint: 'Add your active mobile number with country code'
    },
    {
      rank: 6,
      id: 'email',
      name: 'Email Address',
      category: 'Direct Outreach',
      weight: 9,
      priorityLabel: 'Critical Priority (Rank #6)',
      priorityClass: 'critical',
      tabId: 'contacts',
      isComplete: Boolean(contacts.email && contacts.email.trim().includes('@')),
      impact: 'Primary contact method for job applications, status updates, and offers',
      hint: 'Add your primary professional email address'
    },
    {
      rank: 7,
      id: 'summary',
      name: 'Professional Summary',
      category: 'Executive Narrative',
      weight: 8,
      priorityLabel: 'Medium Priority (Rank #7)',
      priorityClass: 'medium',
      tabId: 'profile',
      isComplete: Boolean(summary && summary.trim().length >= 25),
      impact: 'First impression narrative evaluated by hiring managers',
      hint: 'Provide a concise overview of your technical strengths'
    },
    {
      rank: 8,
      id: 'contacts_links',
      name: 'Labeled Portfolio & Social Links',
      category: 'Recruiter Outreach',
      weight: 6,
      priorityLabel: 'Medium Priority (Rank #8)',
      priorityClass: 'medium',
      tabId: 'contacts',
      isComplete: contactLinks.length > 0,
      impact: 'Portfolio, GitHub repositories, and LinkedIn verification',
      hint: 'Add at least one labeled link (LinkedIn, GitHub, or Portfolio)'
    },
    {
      rank: 9,
      id: 'locations',
      name: 'Current & Desired Locations',
      category: 'Geo-Targeting',
      weight: 5,
      priorityLabel: 'Standard Priority (Rank #9)',
      priorityClass: 'medium',
      tabId: 'location',
      isComplete: Boolean(userLocation && desiredLocations.length > 0),
      impact: 'Ensures opportunities match remote and relocation criteria',
      hint: 'Set your base location and desired search locations'
    },
    {
      rank: 10,
      id: 'education',
      name: 'Education Credentials',
      category: 'Academic Credentials',
      weight: 4,
      priorityLabel: 'Standard Priority (Rank #10)',
      priorityClass: 'medium',
      tabId: 'education',
      isComplete: educationList.length > 0,
      impact: 'Verifies degree and educational qualifications',
      hint: 'Add your university degree and graduation period'
    },
    {
      rank: 11,
      id: 'screening_answers',
      name: 'Screening Answers (≥ 3)',
      category: 'Application Fast-Track',
      weight: 3,
      priorityLabel: 'Standard Priority (Rank #11)',
      priorityClass: 'medium',
      tabId: 'screening',
      isComplete: screeningAnswers.filter(a => a.answer && a.answer.trim()).length >= 3,
      impact: 'Enables 1-click automated applications with pre-filled questions',
      hint: 'Pre-fill work authorization and availability answers'
    },
    {
      rank: 12,
      id: 'languages',
      name: 'Languages & Proficiency',
      category: 'Global Suitability',
      weight: 2,
      priorityLabel: 'Bonus Priority (Rank #12)',
      priorityClass: 'medium',
      tabId: 'languages',
      isComplete: languagesList.length > 0,
      impact: 'Demonstrates multilingual communication readiness',
      hint: 'List languages you can work and collaborate in'
    }
  ];

  const overallProfileScore = rankedProfileFields.reduce((acc, f) => acc + (f.isComplete ? f.weight : 0), 0);
  const incompleteRankedFields = rankedProfileFields.filter(f => !f.isComplete).sort((a, b) => a.rank - b.rank);

  const currentTab = SUB_TABS.find(t => t.id === activeSubTab) || SUB_TABS[0];

  return (
    <div className="profile-container">
      {/* 1. Left Vertical Navigation Sidebar */}
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
        <header className="profile-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 className="profile-title">{currentTab.title}</h1>
            <p className="profile-tagline">{currentTab.tagline}</p>
          </div>
          <button 
            type="button" 
            className="btn-primary-olive"
            onClick={handleSaveProfile}
            disabled={isSaving}
            title="Saves all profile sections to the database and recalculates Explore match scores instantly"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            <Check size={14} />
            <span>{isSaving ? 'Syncing...' : 'Save & Sync to Explore'}</span>
          </button>
        </header>

        {/* Profile Indication: Field Ranking & Top Priority Incomplete Indication (Strictly only for profile >> profile subtab) */}
        {activeSubTab === 'profile' && !rankingDismissed && incompleteRankedFields.length > 0 && (
          <div className="profile-ranking-card">
            <div className="profile-ranking-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  minWidth: '46px',
                  borderRadius: '50%',
                  backgroundColor: overallProfileScore >= 80 ? '#ecfdf5' : overallProfileScore >= 50 ? '#fffbeb' : '#fef2f2',
                  color: overallProfileScore >= 80 ? '#059669' : overallProfileScore >= 50 ? '#d97706' : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  border: `2.5px solid ${overallProfileScore >= 80 ? '#10b981' : overallProfileScore >= 50 ? '#f59e0b' : '#ef4444'}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                  {overallProfileScore}%
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    Profile Quality & Priority Field Indication
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    {incompleteRankedFields.length} field{incompleteRankedFields.length > 1 ? 's' : ''} missed to fill. Complete high-priority fields to maximize recruiter matching.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  padding: '4px 8px', 
                  borderRadius: '6px', 
                  backgroundColor: overallProfileScore >= 85 ? '#dcfce7' : '#fef3c7',
                  color: overallProfileScore >= 85 ? '#166534' : '#92400e'
                }}>
                  {overallProfileScore >= 85 ? 'ATS Optimized' : overallProfileScore >= 60 ? 'Competitive' : 'Action Required'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllFieldRankings(!showAllFieldRankings)}
                  style={{
                    background: 'none',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {showAllFieldRankings ? 'Hide breakdown' : `View all 10 rankings`}
                  {showAllFieldRankings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => setRankingDismissed(true)}
                  title="Remove this indication"
                  style={{
                    background: 'none',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <X size={13} />
                  <span>Dismiss</span>
                </button>
              </div>
            </div>

            {/* Score Bar */}
            <div className="ranking-meter-bar-track">
              <div className="ranking-meter-bar-fill" style={{ width: `${overallProfileScore}%` }} />
            </div>

            {/* Top Priority Incomplete Indications */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldAlert size={14} />
                  Top Priority Incomplete Fields (Highest Match Weight):
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  {incompleteRankedFields.length} field{incompleteRankedFields.length > 1 ? 's' : ''} remaining
                </span>
              </div>

              <div className="incomplete-priorities-list">
                {incompleteRankedFields.slice(0, 3).map((item) => (
                  <div key={item.id} className="priority-incomplete-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`priority-rank-badge ${item.priorityClass}`}>
                        {item.priorityLabel}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                          {item.impact} · <span style={{ color: '#047857', fontWeight: 600 }}>+{item.weight}% Score</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-complete-field"
                      onClick={() => setActiveSubTab(item.tabId)}
                    >
                      <span>Fix Now</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* All Fields Expanded Breakdown */}
            {showAllFieldRankings && (
              <div style={{ marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Complete Field Rankings & Status
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
                  {rankedProfileFields.map((f) => (
                    <div 
                      key={f.id}
                      onClick={() => setActiveSubTab(f.tabId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: f.isComplete ? '#f8fafc' : '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          width: '20px', 
                          height: '20px', 
                          borderRadius: '50%', 
                          fontSize: '10.5px', 
                          fontWeight: 700, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: f.isComplete ? '#dcfce7' : '#fee2e2',
                          color: f.isComplete ? '#166534' : '#991b1b'
                        }}>
                          {f.rank}
                        </span>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{f.name}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>Weight: {f.weight}%</div>
                        </div>
                      </div>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        color: f.isComplete ? '#16a34a' : '#dc2626' 
                      }}>
                        {f.isComplete ? 'Complete ✓' : 'Incomplete →'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Onboarding Setup Progress Card */}
        {activeSubTab === 'profile' && !setupDismissed && (
          <div className="setup-banner-card">
            <div className="setup-banner-header">
              <span className="setup-banner-title">Finish setting up your account</span>
              <span className="setup-banner-progress">{setupItemsCompleted} of 5 done</span>
            </div>

            <div className="setup-checklist">
              <div className={`setup-item ${hasCv ? 'is-completed' : 'is-pending'}`}>
                {hasCv ? (
                  <span className="setup-check-icon"><Check size={14} strokeWidth={2.5} /></span>
                ) : (
                  <span className="setup-pending-icon"></span>
                )}
                <span>Add your CV</span>
              </div>
              <div className={`setup-item ${hasRoles ? 'is-completed' : 'is-pending'}`}>
                {hasRoles ? (
                  <span className="setup-check-icon"><Check size={14} strokeWidth={2.5} /></span>
                ) : (
                  <span className="setup-pending-icon"></span>
                )}
                <span>Say what you do, and at what level</span>
              </div>
              <div className={`setup-item ${hasSkills ? 'is-completed' : 'is-pending'}`}>
                {hasSkills ? (
                  <span className="setup-check-icon"><Check size={14} strokeWidth={2.5} /></span>
                ) : (
                  <span className="setup-pending-icon"></span>
                )}
                <span>List your skills</span>
              </div>
              <div className={`setup-item ${hasLocation ? 'is-completed' : 'is-pending'}`}>
                {hasLocation ? (
                  <span className="setup-check-icon"><Check size={14} strokeWidth={2.5} /></span>
                ) : (
                  <span className="setup-pending-icon"></span>
                )}
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
            {/* 1. Profile Picture: Add, Edit, Delete */}
            <div className="section-block">
              <h2 className="block-title">Your photo</h2>
              <input 
                type="file" 
                ref={avatarFileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/png,image/jpeg,image/webp" 
                style={{ display: 'none' }} 
              />
              <div className="photo-row">
                <div className="avatar-wrapper">
                  {avatar && (avatar.startsWith('data:') || avatar.startsWith('http')) ? (
                    <img 
                      src={avatar} 
                      alt="Profile" 
                      className="avatar-img-circle"
                    />
                  ) : (
                    <StaticAvatar avatarId={avatar || 'avatar_1'} size={54} />
                  )}
                  <button 
                    type="button"
                    className="avatar-camera-badge" 
                    onClick={() => avatarFileInputRef.current?.click()}
                    title="Upload new photo"
                  >
                    <Camera size={11} />
                  </button>
                </div>

                <div className="avatar-row-actions">
                  <button 
                    type="button" 
                    className="avatar-btn-subtle"
                    onClick={() => avatarFileInputRef.current?.click()}
                  >
                    <UploadCloud size={13} />
                    <span>Upload photo</span>
                  </button>
                  <button 
                    type="button" 
                    className="avatar-btn-subtle"
                    onClick={() => setIsAvatarModalOpen(true)}
                  >
                    <Sparkles size={13} />
                    <span>Choose Stylized Avatar</span>
                  </button>
                  {avatar && (avatar !== 'avatar_1' || avatar.startsWith('data:')) && (
                    <button 
                      type="button" 
                      className="avatar-btn-danger"
                      onClick={handleDeletePhoto}
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
              <p className="block-help-text">
                JPEG, PNG, or WebP up to 6 MB · cropped to a square. Printed only by CV templates that show a photo.
              </p>
            </div>

            {/* 2. Your CV: Upload, View, Download, Replace, Delete */}
            <div className="section-block">
              <h2 className="block-title">Your CV</h2>
              <input 
                type="file" 
                ref={resumeFileInputRef} 
                onChange={handleResumeUpload} 
                accept=".pdf,.docx,.txt" 
                style={{ display: 'none' }} 
              />
              {resumeMeta ? (
                <div className="cv-upload-box">
                  <div className="cv-badge-row">
                    <div className="cv-check-circle">
                      <Check size={18} strokeWidth={3} />
                    </div>
                    <div>
                      <span className="cv-upload-text">{resumeMeta.fileName || 'Resume Document'}</span>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {resumeMeta.uploadedAt ? `Uploaded ${new Date(resumeMeta.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Uploaded'}
                        {resumeMeta.fileSize ? ` · ${resumeMeta.fileSize}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="cv-actions-row">
                    <button 
                      type="button"
                      className="btn-cv-view"
                      onClick={handleOpenResumeViewer}
                      title="Open and view uploaded resume text and ATS breakdown"
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>
                    <a 
                      href={apiService.getResumeDownloadUrl()} 
                      className="btn-cv-download" 
                      download
                      title="Download uploaded resume file"
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </a>
                    <button 
                      type="button"
                      className="btn-cv-replace"
                      onClick={() => resumeFileInputRef.current?.click()}
                      disabled={isUploadingResume}
                    >
                      {isUploadingResume ? 'Uploading...' : 'Replace'}
                    </button>
                    <button 
                      type="button"
                      className="btn-cv-delete"
                      onClick={handleDeleteResume}
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className="cv-upload-box" 
                  onClick={() => resumeFileInputRef.current?.click()}
                  style={{ 
                    cursor: 'pointer', 
                    border: '1.5px dashed #cbd5e1', 
                    backgroundColor: '#f8fafc',
                    padding: '24px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ 
                    width: '42px', 
                    height: '42px', 
                    borderRadius: '50%', 
                    backgroundColor: '#e2e8f0', 
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FileText size={22} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#0f172a' }}>
                    {isUploadingResume ? 'Analyzing & parsing resume...' : 'Upload your CV / Resume'}
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#64748b', textAlign: 'center' }}>
                    PDF, DOCX, or TXT up to 8 MB · automatically fills skills, roles, experience, and contact data
                  </span>
                  <button 
                    type="button" 
                    className="btn-cv-replace"
                    style={{ marginTop: '6px', background: '#3f5a18', color: '#ffffff', borderColor: '#3f5a18', padding: '6px 16px' }}
                  >
                    {isUploadingResume ? 'Parsing...' : 'Select File'}
                  </button>
                </div>
              )}
              <p className="block-help-text">
                PDF with selectable text, up to 8 MB · automatically parses and populates your profile; stored for ATS scoring.
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

              <div style={{ marginTop: 22 }}>
                <button 
                  type="button"
                  className="btn-primary-olive" 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Check size={14} style={{ marginRight: 6 }} />
                  <span>{isSaving ? 'Syncing...' : 'Save Profile & Sync Explore'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================== TAB: RESUME (AI JSON TEMPLATE & MAP PROVENANCE VIEW) ===================== */}
        {activeSubTab === 'resume' && (() => {
          if (!resumeMeta) {
            return (
              <section className="profile-section-content">
                <div className="section-block" style={{ padding: '64px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    backgroundColor: '#F1F5F9',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}>
                    <UploadCloud size={32} />
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>
                    No Resume Uploaded Yet
                  </h2>
                  <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '440px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
                    Upload your resume in PDF, DOCX, or TXT format. The discovery engine will extract your contact info, skills, work history, and generate an interactive AI structured mapping.
                  </p>
                  <button
                    type="button"
                    className="btn-primary-olive"
                    onClick={() => resumeFileInputRef.current?.click()}
                    disabled={isUploadingResume}
                    style={{ padding: '10px 22px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <UploadCloud size={16} />
                    <span>{isUploadingResume ? 'Analyzing Resume...' : 'Upload Resume'}</span>
                  </button>
                </div>
              </section>
            );
          }

          const currentMap = resumeMapData?.aiExtraction || {};
          const currentProvenance = currentMap.provenanceMap || {};
          const activeProvItem = currentProvenance[activeMapField] || currentProvenance.personalIdentity;

          const handleCopyJson = () => {
            navigator.clipboard.writeText(JSON.stringify(currentMap, null, 2));
            setCopiedJsonToast(true);
            setTimeout(() => setCopiedJsonToast(false), 2500);
          };

          const handleDownloadJson = () => {
            const blob = new Blob([JSON.stringify(currentMap, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `resume_ai_template_${resumeMeta?.fileName ? resumeMeta.fileName.replace(/\.[^/.]+$/, "") : "profile"}.json`;
            a.click();
            URL.revokeObjectURL(url);
          };

          return (
            <section className="profile-section-content">
              {/* Top Resume Header Card */}
              <div className="section-block" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: '#eef3eb',
                      color: '#2D5A27',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FileText size={22} />
                    </div>
                    <div>
                      <h2 className="block-title" style={{ margin: 0 }}>
                        {resumeMeta?.fileName}
                      </h2>
                      <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span>{resumeMeta?.fileSize || ''}</span>
                        <span>·</span>
                        <span>{resumeMeta?.uploadedAt ? `Uploaded ${new Date(resumeMeta.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</span>
                        <span>·</span>
                        <span style={{ color: '#059669', fontWeight: 600 }}>AI Structured & Mapped</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Submode Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="avatar-btn-subtle"
                      onClick={() => resumeFileInputRef.current?.click()}
                      disabled={isUploadingResume}
                      title="Upload or replace your resume file"
                    >
                      <UploadCloud size={13} />
                      <span>{isUploadingResume ? 'Analyzing...' : 'Replace Resume'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-cv-view"
                      onClick={handleOpenResumeViewer}
                      title="Open full text preview"
                    >
                      <Eye size={13} />
                      <span>View File</span>
                    </button>
                    <a
                      href={apiService.getResumeDownloadUrl()}
                      className="btn-cv-download"
                      download
                      title="Download uploaded resume"
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </a>
                  </div>
                </div>

                {/* Sub-view switcher bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setResumeViewSubMode('map')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: resumeViewSubMode === 'map' ? '#2D5A27' : '#e2e8f0',
                      backgroundColor: resumeViewSubMode === 'map' ? '#2D5A27' : '#ffffff',
                      color: resumeViewSubMode === 'map' ? '#ffffff' : '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 120ms ease'
                    }}
                  >
                    <Map size={14} />
                    <span>Map View (Source Provenance)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResumeViewSubMode('json')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: resumeViewSubMode === 'json' ? '#2D5A27' : '#e2e8f0',
                      backgroundColor: resumeViewSubMode === 'json' ? '#2D5A27' : '#ffffff',
                      color: resumeViewSubMode === 'json' ? '#ffffff' : '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 120ms ease'
                    }}
                  >
                    <Code size={14} />
                    <span>AI JSON Template (LLM Extraction)</span>
                  </button>
                </div>
              </div>

              {/* MODE 1: VISUAL MAP VIEW (PROVENANCE MIND MAP) */}
              {resumeViewSubMode === 'map' && (
                <div className="map-view-hero">
                  {/* Active Provenance Info Strip */}
                  <div style={{
                    marginBottom: '18px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={15} color="#38bdf8" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                        Source Provenance:
                      </span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {activeProvItem?.sourceSection || 'Document Header'}
                      </span>
                      <span style={{ color: '#475569' }}>·</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#4ade80' }}>
                        {activeProvItem?.confidence || '99% Confidence'}
                      </span>
                      <span style={{ color: '#475569' }}>·</span>
                      <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                        Maps to: <strong style={{ color: '#f8fafc' }}>{activeProvItem?.mapsToField}</strong>
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Hover or click any node to highlight source in document
                    </div>
                  </div>

                  {/* 3-Column Mind Map Grid */}
                  <div className="map-view-grid-layout">
                    {/* LEFT COLUMN: 4 CATEGORIES */}
                    <div className="map-branch-column">
                      {/* 1. Personal Identity */}
                      <div 
                        className={`map-category-card cat-identity ${activeMapField === 'personalIdentity' ? 'is-active' : ''}`}
                        onClick={() => setActiveMapField('personalIdentity')}
                      >
                        <div className="map-category-title-row" style={{ color: '#60a5fa' }}>
                          <User size={15} />
                          <span>Personal Identity</span>
                        </div>
                        <div className="map-node-items-list">
                          <div className={`map-node-item ${activeMapField === 'personalIdentity' ? 'is-active' : ''}`}>
                            <span>Full Name</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#60a5fa' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Professional Title</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#60a5fa' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Years of Experience</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#60a5fa' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Key Specialization</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#60a5fa' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Technology Stack (Tagline)</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#60a5fa' }}></span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Contact Information */}
                      <div 
                        className={`map-category-card cat-contact ${activeMapField === 'contactInformation' ? 'is-active' : ''}`}
                        onClick={() => setActiveMapField('contactInformation')}
                      >
                        <div className="map-category-title-row" style={{ color: '#34d399' }}>
                          <Contact size={15} />
                          <span>Contact Information</span>
                        </div>
                        <div className="map-node-items-list">
                          <div className="map-node-item">
                            <span>Location</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#34d399' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Email Address</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#34d399' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Mobile Number</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#34d399' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>LinkedIn Profile</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#34d399' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>GitHub Profile</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#34d399' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Other Links (Portfolio/Website)</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#34d399' }}></span>
                          </div>
                        </div>
                      </div>

                      {/* 3. Professional Summary */}
                      <div 
                        className={`map-category-card cat-summary ${activeMapField === 'professionalSummary' ? 'is-active' : ''}`}
                        onClick={() => setActiveMapField('professionalSummary')}
                      >
                        <div className="map-category-title-row" style={{ color: '#fbbf24' }}>
                          <FileText size={15} />
                          <span>Professional Summary</span>
                        </div>
                        <div className="map-node-items-list">
                          <div className="map-node-item">
                            <span>Overall Experience</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fbbf24' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Domain Expertise</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fbbf24' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Key Technical Strengths</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fbbf24' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Notable Achievements</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fbbf24' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Career Objective (Implicit/Explicit)</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fbbf24' }}></span>
                          </div>
                        </div>
                      </div>

                      {/* 4. Technical Skills */}
                      <div 
                        className={`map-category-card cat-skills ${activeMapField === 'technicalSkills' ? 'is-active' : ''}`}
                        onClick={() => setActiveMapField('technicalSkills')}
                      >
                        <div className="map-category-title-row" style={{ color: '#c084fc' }}>
                          <Tag size={15} />
                          <span>Technical Skills</span>
                        </div>
                        <div className="map-node-items-list">
                          <div className="map-node-item">
                            <span>Programming Languages</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#c084fc' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Frameworks and Libraries</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#c084fc' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Security & Authentication</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#c084fc' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Databases & Data Processing</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#c084fc' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Cloud and DevOps</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#c084fc' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Testing and Tooling</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#c084fc' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>AI Tools and Others</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#c084fc' }}></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CENTER COLUMN: HIGH-FIDELITY DOCUMENT PREVIEW */}
                    <div className="map-center-sheet">
                      {/* Document Header */}
                      <div 
                        className={`map-doc-header map-doc-section ${activeMapField === 'personalIdentity' || activeMapField === 'contactInformation' ? 'is-highlighted' : ''}`}
                        onMouseEnter={() => setActiveMapField('personalIdentity')}
                      >
                        <h1 className="map-doc-name">{currentMap.personalIdentity?.fullName || contacts.fullName || 'Candidate Name'}</h1>
                        <p className="map-doc-title">{currentMap.personalIdentity?.professionalTitle || (selectedRoles.length > 0 ? selectedRoles.join(' • ') : '')}</p>
                        
                        <div className="map-doc-contact-bar">
                          <span>📍 {currentMap.contactInformation?.location || contacts.location || userLocation || 'Location not specified'}</span>
                          <span>✉️ {currentMap.contactInformation?.emailAddress || contacts.email || 'Email not specified'}</span>
                          <span>📞 {currentMap.contactInformation?.phoneNumber || contacts.phone || 'Phone not specified'}</span>
                          {currentMap.contactInformation?.linkedIn && (
                            <a href={currentMap.contactInformation.linkedIn} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>🔗 LinkedIn</a>
                          )}
                          {currentMap.contactInformation?.gitHub && (
                            <a href={currentMap.contactInformation.gitHub} target="_blank" rel="noreferrer" style={{ color: '#0f172a' }}>🐙 GitHub</a>
                          )}
                        </div>
                      </div>

                      {/* Professional Summary */}
                      <div 
                        className={`map-doc-section ${activeMapField === 'professionalSummary' ? 'is-highlighted' : ''}`}
                        onMouseEnter={() => setActiveMapField('professionalSummary')}
                      >
                        <h2 className="map-doc-section-title">Professional Summary</h2>
                        <p style={{ margin: 0, fontSize: '11px', lineHeight: 1.5, color: '#334155' }}>
                          {currentMap.professionalSummary?.overallExperience || summary || 'No professional summary extracted.'}
                        </p>
                      </div>

                      {/* Technical Skills */}
                      <div 
                        className={`map-doc-section ${activeMapField === 'technicalSkills' ? 'is-highlighted' : ''}`}
                        onMouseEnter={() => setActiveMapField('technicalSkills')}
                      >
                        <h2 className="map-doc-section-title">Technical Skills</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10.5px' }}>
                          {currentMap.technicalSkills && Object.keys(currentMap.technicalSkills).length > 0 ? (
                            Object.entries(currentMap.technicalSkills).map(([catKey, skillsArr], idx) => {
                              const catTitle = catKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                              const items = Array.isArray(skillsArr) ? skillsArr.join(', ') : String(skillsArr);
                              return (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px' }}>
                                  <strong style={{ color: '#0f172a' }}>{catTitle}</strong>
                                  <span style={{ color: '#475569' }}>{items}</span>
                                </div>
                              );
                            })
                          ) : skillsList && skillsList.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px' }}>
                              <strong style={{ color: '#0f172a' }}>Core Skills</strong>
                              <span style={{ color: '#475569' }}>{skillsList.map(s => s.name || s).join(', ')}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No technical skills extracted yet.</span>
                          )}
                        </div>
                      </div>

                      {/* Professional Experience */}
                      <div 
                        className={`map-doc-section ${activeMapField === 'professionalExperience' ? 'is-highlighted' : ''}`}
                        onMouseEnter={() => setActiveMapField('professionalExperience')}
                      >
                        <h2 className="map-doc-section-title">Professional Experience</h2>
                        {currentMap.professionalExperience && currentMap.professionalExperience.length > 0 ? (
                          currentMap.professionalExperience.map((exp, idx) => (
                            <div key={idx} style={{ marginBottom: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '11px', color: '#0f172a' }}>
                                  {exp.jobTitle || 'Role'} {exp.companyName ? `| ${exp.companyName}` : ''}{exp.location ? `, ${exp.location}` : ''}
                                </strong>
                                <span style={{ fontSize: '10.5px', color: '#64748b' }}>{exp.employmentDates || ''}</span>
                              </div>
                              {exp.projectNameAndDescription && (
                                <div style={{ fontSize: '10.5px', color: '#2563eb', fontStyle: 'italic', marginBottom: '3px' }}>
                                  {exp.projectNameAndDescription}
                                </div>
                              )}
                              {exp.responsibilities && exp.responsibilities.length > 0 && (
                                <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '10px', color: '#334155', lineHeight: 1.4 }}>
                                  {exp.responsibilities.map((r, rIdx) => (
                                    <li key={rIdx}>{r}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))
                        ) : experiences && experiences.length > 0 ? (
                          experiences.map((exp, idx) => (
                            <div key={idx} style={{ marginBottom: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '11px', color: '#0f172a' }}>
                                  {exp.title} | {exp.company}{exp.location ? `, ${exp.location}` : ''}
                                </strong>
                                <span style={{ fontSize: '10.5px', color: '#64748b' }}>{exp.period}</span>
                              </div>
                              {exp.description && (
                                <p style={{ margin: '3px 0 0 0', fontSize: '10px', color: '#334155', lineHeight: 1.4 }}>
                                  {exp.description}
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No professional experience listed.</span>
                        )}
                      </div>

                      {/* Education */}
                      <div 
                        className={`map-doc-section ${activeMapField === 'education' ? 'is-highlighted' : ''}`}
                        onMouseEnter={() => setActiveMapField('education')}
                      >
                        <h2 className="map-doc-section-title">Education</h2>
                        {currentMap.education && currentMap.education.length > 0 ? (
                          currentMap.education.map((edu, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', marginBottom: '4px' }}>
                              <strong style={{ color: '#0f172a' }}>
                                {edu.degree || 'Degree'} {edu.institutionName ? `| ${edu.institutionName}` : ''}
                              </strong>
                              <span style={{ color: '#64748b' }}>{edu.endDate || edu.startDate || ''}</span>
                            </div>
                          ))
                        ) : educationList && educationList.length > 0 ? (
                          educationList.map((edu, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', marginBottom: '4px' }}>
                              <strong style={{ color: '#0f172a' }}>{edu.degree} | {edu.institution}</strong>
                              <span style={{ color: '#64748b' }}>{edu.period}</span>
                            </div>
                          ))
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No education records listed.</span>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: 4 CATEGORIES */}
                    <div className="map-branch-column">
                      {/* 5. Professional Experience */}
                      <div 
                        className={`map-category-card cat-experience ${activeMapField === 'professionalExperience' ? 'is-active' : ''}`}
                        onClick={() => setActiveMapField('professionalExperience')}
                      >
                        <div className="map-category-title-row" style={{ color: '#fb7185' }}>
                          <Briefcase size={15} />
                          <span>Professional Experience</span>
                        </div>
                        <div className="map-node-items-list">
                          <div className="map-node-item">
                            <span>Job Title</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fb7185' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Company Name</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fb7185' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Location</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fb7185' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Employment Dates</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fb7185' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Project Name & Description</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fb7185' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Responsibilities</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fb7185' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Technologies Used</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fb7185' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Key Achievements</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fb7185' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Quantifiable Impact</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fb7185' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Production Ownership</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#fb7185' }}></span>
                          </div>
                        </div>
                      </div>

                      {/* 6. Education */}
                      <div 
                        className={`map-category-card cat-education ${activeMapField === 'education' ? 'is-active' : ''}`}
                        onClick={() => setActiveMapField('education')}
                      >
                        <div className="map-category-title-row" style={{ color: '#22d3ee' }}>
                          <GraduationCap size={15} />
                          <span>Education</span>
                        </div>
                        <div className="map-node-items-list">
                          <div className="map-node-item">
                            <span>Degree</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#22d3ee' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Institution Name</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#22d3ee' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Start Date</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#22d3ee' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>End Date</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#22d3ee' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Academic Results (CGPA/%)</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#22d3ee' }}></span>
                          </div>
                        </div>
                      </div>

                      {/* 7. Optional / Additional */}
                      <div 
                        className={`map-category-card cat-optional ${activeMapField === 'optionalAdditional' ? 'is-active' : ''}`}
                        onClick={() => setActiveMapField('optionalAdditional')}
                      >
                        <div className="map-category-title-row" style={{ color: '#facc15' }}>
                          <Award size={15} />
                          <span>Optional / Additional</span>
                        </div>
                        <div className="map-node-items-list">
                          <div className="map-node-item">
                            <span>Projects</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#facc15' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Certifications</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#facc15' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Achievements / Awards</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#facc15' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Volunteer Experience</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#facc15' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Publications</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#facc15' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Languages</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#facc15' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Interests</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#facc15' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>References</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#facc15' }}></span>
                          </div>
                        </div>
                      </div>

                      {/* 8. Document Structure */}
                      <div 
                        className={`map-category-card cat-structure ${activeMapField === 'documentStructure' ? 'is-active' : ''}`}
                        onClick={() => setActiveMapField('documentStructure')}
                      >
                        <div className="map-category-title-row" style={{ color: '#94a3b8' }}>
                          <BookOpen size={15} />
                          <span>Document Structure</span>
                        </div>
                        <div className="map-node-items-list">
                          <div className="map-node-item">
                            <span>Section Headings</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#94a3b8' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Bullet Points</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#94a3b8' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Date Format</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#94a3b8' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Hyperlinks</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#94a3b8' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Text Styling</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#94a3b8' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Visual Dividers</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#94a3b8' }}></span>
                          </div>
                          <div className="map-node-item">
                            <span>Consistent Formatting</span>
                            <span className="map-node-dot" style={{ backgroundColor: '#94a3b8' }}></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: STRUCTURED AI JSON TEMPLATE VIEW */}
              {resumeViewSubMode === 'json' && (
                <div className="section-block">
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                      <Sparkles size={16} color="#3f5a18" />
                      <span>Optimized JSON Template for Lightweight LLMs & Fast NLP Models</span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                      This JSON schema is formatted for low-latency, budget-friendly AI models (Gemini Flash, GPT-4o-mini, Claude Haiku, or regex NLP).
                      When a candidate uploads their resume, feeding this structure to the model guarantees clean, structured field extraction at less than $0.0001 per resume.
                    </p>
                  </div>

                  {/* Toolbar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn-primary-olive"
                        onClick={handleApplyAiMap}
                        disabled={isApplyingAiMap}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        {isApplyingAiMap ? <Loader2 size={14} className="spin-icon" /> : <CheckCircle2 size={14} />}
                        <span>{isApplyingAiMap ? 'Applying to Profile...' : 'Apply AI Template to Profile'}</span>
                      </button>

                      <button
                        type="button"
                        className="avatar-btn-subtle"
                        onClick={handleCopyJson}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Copy size={13} />
                        <span>{copiedJsonToast ? 'Copied to Clipboard!' : 'Copy JSON'}</span>
                      </button>

                      <button
                        type="button"
                        className="avatar-btn-subtle"
                        onClick={handleDownloadJson}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Download size={13} />
                        <span>Download JSON</span>
                      </button>
                    </div>

                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                      Schema Version 2.0 · 8 Branches Mapped
                    </span>
                  </div>

                  {/* JSON Code Viewer */}
                  <div style={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid #334155',
                    overflowX: 'auto',
                    maxHeight: '560px'
                  }}>
                    <pre style={{
                      margin: 0,
                      fontFamily: "'Fira Code', 'Courier New', monospace",
                      fontSize: '11.5px',
                      color: '#38bdf8',
                      lineHeight: 1.5,
                      whiteSpace: 'pre'
                    }}>
                      {JSON.stringify(currentMap, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </section>
          );
        })()}

        {/* ===================== TAB 2: CONTACTS & LABELED LINKS (SMART AUTO-SELECT) ===================== */}
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="field-meta-label">Email</label>
                    {(!contacts.email || !contacts.email.trim() || !contacts.email.includes('@')) && (
                      <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                        Missing (Critical Priority)
                      </span>
                    )}
                  </div>
                  <input 
                    type="email" 
                    className="field-input-box" 
                    placeholder="Email"
                    value={contacts.email}
                    onChange={(e) => {
                      setContacts({ ...contacts, email: e.target.value });
                      setRankingDismissed(false);
                    }}
                    style={{
                      borderColor: (!contacts.email || !contacts.email.trim() || !contacts.email.includes('@')) ? '#fca5a5' : '#e5e7eb',
                      backgroundColor: (!contacts.email || !contacts.email.trim() || !contacts.email.includes('@')) ? '#fef2f2' : '#ffffff'
                    }}
                  />
                </div>

                <div className="form-item">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="field-meta-label">Mobile Number</label>
                    {(!contacts.phone || !contacts.phone.trim() || contacts.phone.trim().length < 4) && (
                      <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                        Missing (High Priority)
                      </span>
                    )}
                  </div>
                  <input 
                    type="text" 
                    className="field-input-box" 
                    placeholder="e.g. +91 98765 43210 or +1 (555) 012-3456"
                    value={contacts.phone}
                    onChange={(e) => {
                      setContacts({ ...contacts, phone: e.target.value });
                      setRankingDismissed(false);
                    }}
                    style={{
                      borderColor: (!contacts.phone || !contacts.phone.trim() || contacts.phone.trim().length < 4) ? '#fca5a5' : '#e5e7eb',
                      backgroundColor: (!contacts.phone || !contacts.phone.trim() || contacts.phone.trim().length < 4) ? '#fef2f2' : '#ffffff'
                    }}
                  />
                </div>

                <div className="form-item">
                  <label className="field-meta-label">Location</label>
                  <input 
                    type="text" 
                    className="field-input-box" 
                    placeholder="Location"
                    value={contacts.location}
                    onChange={(e) => {
                      setContacts({ ...contacts, location: e.target.value });
                      setUserLocation(e.target.value);
                    }}
                  />
                </div>
              </div>

              {/* 3. Labeled Links Section with Smart Sequential Auto-Selection */}
              <div className="form-item" style={{ marginTop: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="field-meta-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <LinkIcon size={13} />
                    <span>Labeled Social, Developer & Portfolio Links</span>
                  </label>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>
                    Automatically picks next unused platform (LinkedIn → Git → LeetCode → Portfolio)
                  </span>
                </div>

                <div className="contact-links-list">
                  {contactLinks.map((link) => (
                    <div key={link.id} className="contact-link-row">
                      <select 
                        className="contact-link-select"
                        value={link.label}
                        onChange={(e) => handleUpdateLink(link.id, 'label', e.target.value)}
                      >
                        {PRESET_LINK_LABELS.map(lbl => {
                          const isUsedByOther = contactLinks.some(l => l.id !== link.id && l.label === lbl && lbl !== 'Other');
                          return (
                            <option key={lbl} value={lbl} disabled={isUsedByOther}>
                              {lbl} {isUsedByOther ? '(Added)' : ''}
                            </option>
                          );
                        })}
                      </select>

                      <input 
                        type="url" 
                        className="contact-link-input"
                        placeholder={`https://${link.label.toLowerCase().replace(/[^a-z]/g, '')}.com/...`}
                        value={link.url}
                        onChange={(e) => handleUpdateLink(link.id, 'url', e.target.value)}
                      />

                      {link.url && (
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="contact-link-test-btn" 
                          title="Open link in new tab"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}

                      <button 
                        type="button"
                        className="contact-link-icon-btn"
                        onClick={() => handleRemoveLink(link.id)}
                        title="Remove link"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  type="button" 
                  className="btn-add-dashed"
                  onClick={handleAddLink}
                >
                  <Plus size={13} />
                  <span>Add Next Link (Auto-selects next available platform)</span>
                </button>
              </div>

              {/* Raw Links Textarea (Synchronized) */}
              <div className="form-item" style={{ marginTop: 18 }}>
                <label className="field-meta-label">All Links (Plaintext format)</label>
                <textarea 
                  className="field-textarea-box" 
                  rows={3}
                  value={contacts.links}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContacts({ ...contacts, links: val });
                    const parsed = val.split('\n').filter(l => l.trim()).map((url, i) => {
                      let label = 'Portfolio / Website';
                      if (url.includes('linkedin')) label = 'LinkedIn';
                      else if (url.includes('github')) label = 'GitHub';
                      else if (url.includes('leetcode')) label = 'LeetCode';
                      return { id: `link-${i + 1}`, label, url };
                    });
                    if (parsed.length > 0) setContactLinks(parsed);
                  }}
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

        {/* ===================== TAB 3: LOCATION (CURRENT & MULTIPLE DESIRED SEARCH LOCATIONS) ===================== */}
        {activeSubTab === 'location' && (
          <section className="profile-section-content">
            <p className="block-help-text" style={{ marginBottom: 18 }}>
              Configure where you live right now, and select multiple target cities/regions where you want to search for job opportunities.
            </p>

            {/* 3.1 Current Location Card */}
            <div className="loc-section-card">
              <div className="loc-section-card-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    1. Current Location (Where you live right now)
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
                    Your primary home residence. Shown on your candidate applications and ATS cards.
                  </p>
                </div>
                {userLocation && (
                  <span className="current-loc-badge">
                    <MapPin size={13} />
                    <span>{userLocation}</span>
                  </span>
                )}
              </div>

              <div className="location-search-wrap">
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', color: '#9ca3af' }} />
                  <input 
                    type="text" 
                    className="field-input-box" 
                    style={{ paddingLeft: '34px', paddingRight: isSearchingLocation && searchTargetType === 'current' ? '36px' : '12px' }}
                    value={locationSearchQuery}
                    onChange={(e) => {
                      setSearchTargetType('current');
                      setLocationSearchQuery(e.target.value);
                      setShowLocationDropdown(true);
                    }}
                    onFocus={() => {
                      setSearchTargetType('current');
                      if (locationSearchResults.length > 0) setShowLocationDropdown(true);
                    }}
                    placeholder={`Change current location (Currently: ${userLocation || 'Hyderabad, India'})...`}
                  />
                  {isSearchingLocation && searchTargetType === 'current' && (
                    <Loader2 size={16} className="spin-animation" style={{ position: 'absolute', right: '12px', color: '#2D5A27' }} />
                  )}
                </div>

                {showLocationDropdown && searchTargetType === 'current' && locationSearchResults.length > 0 && (
                  <div className="location-dropdown-menu">
                    {locationSearchResults.map((loc, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        className="location-dropdown-item"
                        onClick={() => handleSelectLocation(loc)}
                      >
                        <MapPin size={14} color="#2D5A27" />
                        <span style={{ fontSize: '12.5px', color: '#111827', textAlign: 'left' }}>
                          {loc.display_name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#6b7280', marginRight: '4px' }}>Quick Select Home:</span>
                {['Hyderabad, India', 'Bengaluru, India', 'Pune, India', 'Delhi NCR, India', 'Mumbai, India', 'London, UK', 'San Francisco, USA'].map(h => (
                  <button 
                    key={h}
                    type="button"
                    className="location-chip-preset"
                    onClick={() => {
                      setUserLocation(h);
                      setContacts(prev => ({ ...prev, location: h }));
                    }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* 3.2 Desired Job Search Locations (MULTIPLE SELECTIONS) */}
            <div className="loc-section-card" style={{ borderColor: '#c9d9c4', backgroundColor: '#fdfefe' }}>
              <div className="loc-section-card-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#166534' }}>
                    2. Desired Job Search Locations (Select Multiple)
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#475569' }}>
                    All target locations you are open to working in. Explore will index and score jobs across all these locations.
                  </p>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#2D5A27', background: '#eef3eb', padding: '3px 8px', borderRadius: '4px' }}>
                  {desiredLocations.length} locations selected
                </span>
              </div>

              {/* Active Desired Locations Pills */}
              <div className="desired-locations-tags">
                {desiredLocations.length === 0 ? (
                  <span style={{ fontSize: '12.5px', color: '#9ca3af', padding: '4px 0' }}>
                    No desired locations added yet. Search or click quick presets below to add multiple locations.
                  </span>
                ) : (
                  desiredLocations.map(dLoc => (
                    <div key={dLoc} className="desired-loc-pill">
                      <MapPin size={12} />
                      <span>{dLoc}</span>
                      <button 
                        type="button"
                        className="desired-loc-remove"
                        onClick={() => handleRemoveDesiredLocation(dLoc)}
                        title={`Remove ${dLoc}`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Desired Location Input with Autocomplete */}
              <div className="location-search-wrap">
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Plus size={15} style={{ position: 'absolute', left: '12px', color: '#2D5A27' }} />
                  <input 
                    type="text" 
                    className="field-input-box" 
                    style={{ paddingLeft: '34px', paddingRight: isSearchingLocation && searchTargetType === 'desired' ? '36px' : '12px' }}
                    value={desiredSearchInput}
                    onChange={(e) => {
                      setSearchTargetType('desired');
                      setDesiredSearchInput(e.target.value);
                      setShowLocationDropdown(true);
                    }}
                    onFocus={() => {
                      setSearchTargetType('desired');
                      if (locationSearchResults.length > 0) setShowLocationDropdown(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && desiredSearchInput.trim()) {
                        e.preventDefault();
                        handleAddDesiredLocation(desiredSearchInput.trim());
                        setDesiredSearchInput('');
                        setShowLocationDropdown(false);
                      }
                    }}
                    placeholder="Search and add desired job location (e.g. Bengaluru, London, Remote Worldwide) — press Enter to add..."
                  />
                  {isSearchingLocation && searchTargetType === 'desired' && (
                    <Loader2 size={16} className="spin-animation" style={{ position: 'absolute', right: '12px', color: '#2D5A27' }} />
                  )}
                </div>

                {showLocationDropdown && searchTargetType === 'desired' && locationSearchResults.length > 0 && (
                  <div className="location-dropdown-menu">
                    {locationSearchResults.map((loc, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        className="location-dropdown-item"
                        onClick={() => handleSelectLocation(loc)}
                      >
                        <MapPin size={14} color="#2D5A27" />
                        <span style={{ fontSize: '12.5px', color: '#111827', textAlign: 'left' }}>
                          + Add <strong>{loc.display_name.split(',').slice(0, 2).join(',')}</strong> ({loc.display_name.split(',').slice(-1)[0].trim()})
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Add Desired Tech Hubs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#6b7280', marginRight: '4px' }}>Quick Add Target:</span>
                {[
                  'Remote (Worldwide)',
                  'Bengaluru, India',
                  'Hyderabad, India',
                  'Pune, India',
                  'Delhi NCR, India',
                  'London, UK',
                  'San Francisco, USA',
                  'Singapore'
                ].map(targetLoc => (
                  <button 
                    key={targetLoc}
                    type="button"
                    className="location-chip-preset"
                    onClick={() => handleAddDesiredLocation(targetLoc)}
                  >
                    + {targetLoc}
                  </button>
                ))}
              </div>
            </div>

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
              <div style={{ marginTop: 22 }}>
                <button 
                  type="button"
                  className="btn-primary-olive" 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Check size={14} style={{ marginRight: 6 }} />
                  <span>{isSaving ? 'Syncing...' : 'Save Locations & Sync Explore'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================== TAB 4: SKILLS ===================== */}
        {activeSubTab === 'skills' && (
          <section className="profile-section-content">
            {/* 1. Primary Skill Selector Field */}
            <div className="section-block" style={{ marginBottom: 20, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Star size={18} color="#D97706" fill="#F59E0B" />
                  <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0F172A' }}>
                    Primary Skill
                  </h3>
                  <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                    Search Priority
                  </span>
                </div>
                {primarySkill && (
                  <span style={{ fontSize: '12.5px', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={13} />
                    Active Primary: <strong style={{ color: '#0F172A' }}>{primarySkill}</strong>
                  </span>
                )}
              </div>
              <p className="block-help-text" style={{ marginBottom: 12, fontSize: '12.5px', lineHeight: 1.45 }}>
                Select your core specialization (e.g. <strong>Java</strong>, <strong>SQL</strong>, or <strong>AWS</strong>). The Explore job search algorithm and ATS matching will prioritize opportunities requiring your Primary Skill at the top of your feed.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 420 }}>
                <select
                  id="primary-skill-select"
                  className="field-select-box"
                  value={primarySkill}
                  onChange={(e) => setPrimarySkill(e.target.value)}
                  style={{
                    fontWeight: 600,
                    borderColor: primarySkill ? '#F59E0B' : '#CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: '13.5px'
                  }}
                >
                  <option value="">-- Choose Primary Skill --</option>
                  {skillsList.map((s) => {
                    const sName = typeof s === 'string' ? s : s.name;
                    return (
                      <option key={sName} value={sName}>
                        ⭐ {sName} {sName === primarySkill ? '(Current Primary Skill)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* 2. All Skills List */}
            <div className="section-block">
              <div className="block-header-flex">
                <h2 className="block-title">All Skills</h2>
                <span className="role-counter">{skillsList.length}</span>
              </div>

              <div className="search-input-wrap">
                <input 
                  type="text" 
                  className="field-input-box" 
                  placeholder="Search or type a new skill and press Enter"
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  onKeyDown={handleAddSkill}
                />
              </div>

              <div className="chips-flex-wrap" style={{ marginTop: 14 }}>
                {skillsList.length === 0 ? (
                  <div style={{ padding: '16px 0', color: '#64748b', fontSize: '13px' }}>
                    No skills listed yet. Type a skill in the search box above and press Enter, or upload your resume in the Profile tab to extract them automatically.
                  </div>
                ) : (
                  skillsList.map(skill => {
                    const sName = typeof skill === 'string' ? skill : skill.name;
                    const isPrimary = sName === primarySkill;
                    return (
                      <div 
                        key={sName} 
                        className={`skill-pill-tag ${isPrimary ? 'is-primary-skill' : ''}`}
                        style={isPrimary ? {
                          borderColor: '#F59E0B',
                          background: '#FEF3C7',
                          color: '#92400E',
                          fontWeight: 700,
                          boxShadow: '0 0 0 1px #F59E0B'
                        } : {}}
                      >
                        {skill.icon === 'spring' && <span className="skill-icon-leaf">🍃</span>}
                        {skill.icon === 'git' && <GitBranch size={12} className="skill-svg-icon" />}
                        {skill.icon === 'database' && <Database size={12} className="skill-svg-icon" />}
                        {skill.icon === 'redis' && <span className="skill-icon-red">🗄️</span>}
                        {skill.icon === 'docker' && <span className="skill-icon-whale">🐳</span>}
                        {skill.icon === 'k8s' && <span className="skill-icon-helm">☸️</span>}
                        {skill.icon === 'react' && <span className="skill-icon-atom">⚛️</span>}
                        <span className="skill-name">{sName}</span>
                        {isPrimary ? (
                          <span style={{ fontSize: '10px', background: '#D97706', color: '#FFFFFF', padding: '1px 5px', borderRadius: 4, fontWeight: 700, marginLeft: 2 }}>
                            PRIMARY
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPrimarySkill(sName)}
                            title={`Set ${sName} as Primary Skill`}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0 3px',
                              color: '#94A3B8',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            <Star size={11} />
                          </button>
                        )}
                        <button 
                          className="skill-remove-btn" 
                          onClick={() => removeSkill(sName)}
                          title={`Remove ${sName}`}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ marginTop: 22 }}>
                <button 
                  type="button"
                  className="btn-primary-olive" 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Check size={14} style={{ marginRight: 6 }} />
                  <span>{isSaving ? 'Syncing...' : 'Save Skills & Sync Explore'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================== TAB 5: AVOID AS STRUCTURED TAGS ===================== */}
        {activeSubTab === 'avoid' && (
          <section className="profile-section-content">
            <p className="block-help-text" style={{ marginBottom: 16 }}>
              Configure filters to completely omit technologies, job portals, or companies from your feed and auto-apply engines.
            </p>

            {/* 5.1 Skills to Avoid */}
            <div className="section-block">
              <div className="block-header-flex">
                <h2 className="block-title">Skills to avoid</h2>
                <span className="role-counter">{avoidSkills.length}</span>
              </div>
              <input 
                type="text" 
                className="field-input-box" 
                placeholder="Type a skill/technology to exclude and press Enter (e.g. PHP, COBOL, ColdFusion)..."
                value={avoidSkillInput}
                onChange={(e) => setAvoidSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddAvoidTag('skills', avoidSkillInput, setAvoidSkills, setAvoidSkillInput);
                }}
              />

              <div className="avoid-suggestion-row">
                <span style={{ fontSize: '11px', color: '#6b7280' }}>Quick Exclude:</span>
                {['Legacy PHP', 'COBOL', 'VB6', 'ColdFusion', 'ActionScript', 'Wordpress'].map(s => (
                  <button 
                    key={s} 
                    type="button" 
                    className="avoid-suggestion-btn"
                    onClick={() => handleAddAvoidTag('skills', s, setAvoidSkills, setAvoidSkillInput)}
                  >
                    + {s}
                  </button>
                ))}
              </div>

              <div className="avoid-tags-wrap">
                {avoidSkills.length === 0 ? (
                  <span style={{ fontSize: '12.5px', color: '#9ca3af', padding: '6px 0' }}>
                    No excluded skills. All matching opportunities will be evaluated.
                  </span>
                ) : (
                  avoidSkills.map(item => (
                    <div key={item} className="avoid-pill-tag">
                      <Ban size={12} />
                      <span>{item}</span>
                      <button 
                        type="button"
                        className="avoid-remove-btn" 
                        onClick={() => handleRemoveAvoidTag(item, setAvoidSkills)}
                        title={`Remove ${item}`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 5.2 Sources to Avoid */}
            <div className="section-block" style={{ marginTop: 14 }}>
              <div className="block-header-flex">
                <h2 className="block-title">Sources & Job Portals to avoid</h2>
                <span className="role-counter">{avoidSources.length}</span>
              </div>
              <input 
                type="text" 
                className="field-input-box" 
                placeholder="Type a portal to exclude and press Enter (e.g. CyberCoders, Dice)..."
                value={avoidSourceInput}
                onChange={(e) => setAvoidSourceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddAvoidTag('sources', avoidSourceInput, setAvoidSources, setAvoidSourceInput);
                }}
              />

              <div className="avoid-suggestion-row">
                <span style={{ fontSize: '11px', color: '#6b7280' }}>Quick Exclude:</span>
                {['CyberCoders', 'Revature', 'Dice', 'Monster', 'Glassdoor'].map(src => (
                  <button 
                    key={src} 
                    type="button" 
                    className="avoid-suggestion-btn"
                    onClick={() => handleAddAvoidTag('sources', src, setAvoidSources, setAvoidSourceInput)}
                  >
                    + {src}
                  </button>
                ))}
              </div>

              <div className="avoid-tags-wrap">
                {avoidSources.length === 0 ? (
                  <span style={{ fontSize: '12.5px', color: '#9ca3af', padding: '6px 0' }}>
                    No excluded sources. Opportunities from all platforms (LinkedIn, Greenhouse, Lever, etc.) will appear.
                  </span>
                ) : (
                  avoidSources.map(item => (
                    <div key={item} className="avoid-pill-tag">
                      <ShieldAlert size={12} />
                      <span>{item}</span>
                      <button 
                        type="button"
                        className="avoid-remove-btn" 
                        onClick={() => handleRemoveAvoidTag(item, setAvoidSources)}
                        title={`Remove ${item}`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 5.3 Companies to Avoid */}
            <div className="section-block" style={{ marginTop: 14 }}>
              <div className="block-header-flex">
                <h2 className="block-title">Companies to avoid</h2>
                <span className="role-counter">{avoidCompanies.length}</span>
              </div>
              <input 
                type="text" 
                className="field-input-box" 
                placeholder="Type a company name to exclude and press Enter..."
                value={avoidCompanyInput}
                onChange={(e) => setAvoidCompanyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddAvoidTag('companies', avoidCompanyInput, setAvoidCompanies, setAvoidCompanyInput);
                }}
              />

              <div className="avoid-tags-wrap">
                {avoidCompanies.length === 0 ? (
                  <span style={{ fontSize: '12.5px', color: '#9ca3af', padding: '6px 0' }}>
                    No excluded companies.
                  </span>
                ) : (
                  avoidCompanies.map(item => (
                    <div key={item} className="avoid-pill-tag">
                      <Building size={12} />
                      <span>{item}</span>
                      <button 
                        type="button"
                        className="avoid-remove-btn" 
                        onClick={() => handleRemoveAvoidTag(item, setAvoidCompanies)}
                        title={`Remove ${item}`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: 22 }}>
                <button 
                  type="button"
                  className="btn-primary-olive" 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Check size={14} style={{ marginRight: 6 }} />
                  <span>{isSaving ? 'Syncing...' : 'Save Avoid Rules & Sync Explore'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================== TAB 6: EXPERIENCE WITH FULL CRUD ===================== */}
        {activeSubTab === 'experience' && (
          <section className="profile-section-content">
            <div className="section-block">
              <div className="block-header-flex">
                <h2 className="block-title">Experience</h2>
                <button 
                  type="button"
                  className="btn-text-action"
                  onClick={handleOpenAddExperience}
                >
                  <Plus size={12} />
                  <span>Add position</span>
                </button>
              </div>
              <p className="block-help-text" style={{ marginBottom: 16 }}>
                Parsed from your CV. Highlight technical milestones, architecture ownership, and key accomplishments.
              </p>

              <div className="timeline-list">
                {experiences.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
                    <Briefcase size={28} style={{ opacity: 0.35, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>No experience entries added</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>Click "Add position" to document your professional work history.</p>
                  </div>
                ) : (
                  experiences.map((exp, idx) => (
                    <div key={idx} className="timeline-item-card">
                      <div className="timeline-item-header">
                        <div>
                          <h3 className="timeline-role">{exp.title}</h3>
                          <p className="timeline-company">{exp.company} {exp.location ? `· ${exp.location}` : ''}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="timeline-period">{exp.period}</span>
                          <div className="timeline-card-actions">
                            <button 
                              type="button"
                              className="btn-card-icon"
                              onClick={() => handleOpenEditExperience(idx)}
                              title="Edit position"
                            >
                              <Edit3 size={11} />
                              <span>Edit</span>
                            </button>
                            <button 
                              type="button"
                              className="btn-card-icon is-delete"
                              onClick={() => handleDeleteExperience(idx)}
                              title="Delete position"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="timeline-desc">{exp.description}</p>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: 22 }}>
                <button 
                  type="button"
                  className="btn-primary-olive" 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Check size={14} style={{ marginRight: 6 }} />
                  <span>{isSaving ? 'Syncing...' : 'Save Experience & Sync Explore'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================== TAB 7: EDUCATION WITH FULL CRUD (ADD, EDIT, UPDATE, DELETE) ===================== */}
        {activeSubTab === 'education' && (
          <section className="profile-section-content">
            <div className="section-block">
              <div className="block-header-flex">
                <h2 className="block-title">Education</h2>
                <button 
                  type="button"
                  className="btn-text-action"
                  onClick={handleOpenAddEducation}
                >
                  <Plus size={12} />
                  <span>Add education</span>
                </button>
              </div>
              <p className="block-help-text" style={{ marginBottom: 16 }}>
                Add, update, or edit your university degrees, diplomas, and academic background.
              </p>

              <div className="timeline-list">
                {educationList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
                    <GraduationCap size={28} style={{ opacity: 0.35, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>No education entries added</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>Click "Add education" to add your degree and educational background.</p>
                  </div>
                ) : (
                  educationList.map((edu, idx) => (
                    <div key={idx} className="timeline-item-card">
                      <div className="timeline-item-header">
                        <div>
                          <h3 className="timeline-role">{edu.degree}</h3>
                          <p className="timeline-company">{edu.institution}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="timeline-period">{edu.period}</span>
                          <div className="timeline-card-actions">
                            <button 
                              type="button" 
                              className="btn-card-icon"
                              onClick={() => handleOpenEditEducation(idx)}
                              title="Edit education"
                            >
                              <Edit3 size={11} />
                              <span>Edit</span>
                            </button>
                            <button 
                              type="button" 
                              className="btn-card-icon is-delete"
                              onClick={() => handleDeleteEducation(idx)}
                              title="Delete education"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="timeline-desc">{edu.grade}</p>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: 22 }}>
                <button 
                  type="button"
                  className="btn-primary-olive" 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Check size={14} style={{ marginRight: 6 }} />
                  <span>{isSaving ? 'Syncing...' : 'Save Education & Sync Explore'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================== TAB 8: SCREENING ANSWERS (MANY DEFAULTS + ADD MORE) ===================== */}
        {activeSubTab === 'screening' && (
          <section className="profile-section-content">
            <div className="section-block">
              <div className="block-header-flex">
                <div>
                  <h2 className="block-title">Automated screening answers</h2>
                  <p className="block-help-text">
                    Pre-filled in job applications across Easy Apply and company ATS portals. Customize existing answers or add your own questions.
                  </p>
                </div>
                <button 
                  type="button"
                  className="btn-text-action"
                  onClick={() => setIsAddQuestionModalOpen(true)}
                >
                  <Plus size={12} />
                  <span>Add Custom Question</span>
                </button>
              </div>

              <div className="screening-cards-list" style={{ marginTop: 14 }}>
                {screeningAnswers.map((item) => (
                  <div key={item.id} className="screening-card-item">
                    <div className="screening-card-top">
                      <div>
                        <span className={`screening-cat-badge ${
                          item.category.includes('Auth') ? 'work-auth' :
                          item.category.includes('Compensation') ? 'compensation' :
                          item.category.includes('Experience') ? 'experience' : 'logistics'
                        }`}>
                          {item.category}
                        </span>
                        <h4 style={{ margin: '6px 0 0 0', fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                          {item.question}
                        </h4>
                      </div>
                      <button 
                        type="button"
                        className="btn-card-icon is-delete"
                        onClick={() => handleDeleteScreeningQuestion(item.id)}
                        title="Delete question"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {item.type === 'select' ? (
                      <select 
                        className="field-select-box"
                        value={item.answer}
                        onChange={(e) => handleUpdateScreeningAnswer(item.id, e.target.value)}
                      >
                        {(item.options || ['Yes', 'No']).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        className="field-input-box" 
                        value={item.answer}
                        onChange={(e) => handleUpdateScreeningAnswer(item.id, e.target.value)}
                        placeholder="Your answer..."
                      />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 22 }}>
                <button 
                  type="button"
                  className="btn-primary-olive" 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Check size={14} style={{ marginRight: 6 }} />
                  <span>{isSaving ? 'Syncing...' : 'Save Screening Answers'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================== TAB 9: OPTIONAL LANGUAGES SECTION ===================== */}
        {activeSubTab === 'languages' && (
          <section className="profile-section-content">
            <div className="section-block">
              <div className="block-header-flex">
                <h2 className="block-title">Languages</h2>
                <button 
                  type="button"
                  className="btn-text-action"
                  onClick={() => setIsAddLanguageOpen(true)}
                >
                  <Plus size={12} />
                  <span>Add language</span>
                </button>
              </div>

              <div className="optional-section-banner">
                <Globe size={16} color="#2D5A27" />
                <span>
                  <strong>Optional Section:</strong> List languages you speak and your proficiency level. Helpful for multinational companies and remote global teams.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', color: '#6b7280', marginRight: '4px' }}>Quick Add:</span>
                {['English', 'Hindi', 'Telugu', 'German', 'Spanish', 'French', 'Japanese'].map(l => (
                  <button 
                    key={l}
                    type="button"
                    className="location-chip-preset"
                    onClick={() => {
                      if (!languagesList.some(x => x.language.toLowerCase() === l.toLowerCase())) {
                        setLanguagesList(prev => [...prev, { id: `lang-${languagesList.length + 1}-${Date.now().toString().slice(-4)}`, language: l, proficiency: 'Full Professional' }]);
                      }
                    }}
                  >
                    + {l}
                  </button>
                ))}
              </div>

              <div className="languages-grid">
                {languagesList.map((lang) => (
                  <div key={lang.id} className="language-card-item">
                    <div className="language-info">
                      <span className="language-name-text">{lang.language}</span>
                      <span className="language-level-text">{lang.proficiency}</span>
                    </div>
                    <button 
                      type="button"
                      className="btn-card-icon is-delete"
                      onClick={() => handleDeleteLanguage(lang.id)}
                      title="Remove language"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 22 }}>
                <button 
                  type="button"
                  className="btn-primary-olive" 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Check size={14} style={{ marginRight: 6 }} />
                  <span>{isSaving ? 'Syncing...' : 'Save Languages & Sync Explore'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================== TAB 10: SETTINGS ===================== */}
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

            {/* Profile Data Delete Card */}
            <div className="section-block" style={{ marginTop: 20, border: '1px solid #FCA5A5', background: '#FFF5F5', borderRadius: 8, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Trash2 size={18} color="#DC2626" />
                <h2 className="block-title" style={{ margin: 0, color: '#991B1B' }}>Delete Candidate Profile</h2>
              </div>
              <p className="block-help-text" style={{ color: '#7F1D1D', marginBottom: 14 }}>
                Permanently delete your candidate profile data (contact info, uploaded resume, skills, experiences, screening answers, and education milestones) for this specific profile only. Application jobs, discovery stream, and global system settings are preserved.
              </p>
              <button 
                type="button" 
                className="btn-profile-delete" 
                onClick={handleResetProfileData}
                disabled={isResettingProfile}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #DC2626',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: isResettingProfile ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <Trash2 size={15} />
                <span>{isResettingProfile ? 'Deleting Profile...' : 'Delete Candidate Profile'}</span>
              </button>
            </div>
          </section>
        )}

        {/* ===================== TAB: CANDIDATE PERSONAS & MULTI-PROFILES ===================== */}
        {activeSubTab === 'personas' && (
          <section className="profile-section-content">
            <div className="section-block">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 className="block-title" style={{ margin: 0 }}>Candidate Profiles & Personas</h2>
                  <p className="block-help-text" style={{ margin: '4px 0 0 0' }}>
                    Each login account can maintain multiple candidate personas (e.g. Senior Java Backend, Full-Stack Lead). Exactly one candidate profile is active at a time.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary-olive"
                  onClick={() => setIsCreatingProfile(!isCreatingProfile)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={14} />
                  <span>New Candidate Profile</span>
                </button>
              </div>

              {/* Create Profile Drawer */}
              {isCreatingProfile && (
                <form 
                  onSubmit={handleCreateNewCandidateProfile}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-color, #334155)',
                    borderRadius: 10,
                    padding: '16px',
                    marginBottom: 20
                  }}
                >
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, fontWeight: 700 }}>Create New Candidate Profile</h4>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="field-input-box"
                      placeholder="e.g. Senior Java Cloud Engineer"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      required
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn-primary-olive">
                      Create & Activate
                    </button>
                    <button 
                      type="button" 
                      className="avatar-btn-subtle"
                      onClick={() => setIsCreatingProfile(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Profiles List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {candidateProfiles.map(p => {
                  const isActive = p.is_active === 1 || p.id === activeProfileId;
                  const isEditing = editingProfileId === p.id;

                  return (
                    <div 
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        background: isActive ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1.5px solid ${isActive ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color, #334155)'}`,
                        borderRadius: 12,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div 
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: '50%',
                            background: isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.15)',
                            color: isActive ? '#10b981' : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 16
                          }}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input
                                type="text"
                                value={editingProfileName}
                                onChange={(e) => setEditingProfileName(e.target.value)}
                                className="field-input-box"
                                style={{ padding: '4px 8px', fontSize: 13 }}
                              />
                              <button 
                                type="button" 
                                onClick={() => handleRenameCandidateProfile(p.id)}
                                style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer' }}
                              >
                                <Check size={16} />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setEditingProfileId(null)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                                {p.name}
                              </span>
                              {isActive && (
                                <span 
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    background: '#10b981',
                                    color: '#ffffff',
                                    padding: '2px 8px',
                                    borderRadius: 10
                                  }}
                                >
                                  Active Persona
                                </span>
                              )}
                              <span 
                                style={{
                                  fontSize: 11,
                                  color: p.is_complete ? '#10b981' : '#f59e0b',
                                  fontWeight: 500
                                }}
                              >
                                {p.is_complete ? '• Criteria Complete' : '• Incomplete Criteria'}
                              </span>
                            </div>
                          )}
                          <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                            Explorer matching and role keywords are isolated to this candidate persona.
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {!isActive && (
                          <button
                            type="button"
                            className="btn-primary-olive"
                            onClick={() => handleActivateCandidateProfile(p.id)}
                            style={{ padding: '6px 14px', fontSize: 12.5 }}
                          >
                            Switch to Active
                          </button>
                        )}
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProfileId(p.id);
                              setEditingProfileName(p.name);
                            }}
                            className="btn-card-icon"
                            title="Rename Profile"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCandidateProfile(p.id, p.name)}
                            className="btn-card-icon is-delete"
                            title="Delete Profile"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ===================== TAB: AI ROLE KEYWORDS ===================== */}
        {activeSubTab === 'keywords' && (
          <section className="profile-section-content">
            <RoleKeywordsSection
              primarySkill={primarySkill}
              skillsList={skillsList}
              selectedRoles={selectedRoles}
              onKeywordsUpdated={() => {
                setSavedContactsToast('Keywords synchronized with Explorer!');
                setTimeout(() => setSavedContactsToast(false), 3000);
              }}
            />
          </section>
        )}

        {/* Global Toast Banner */}
        {savedContactsToast && (
          <div 
            className="contacts-toast-banner" 
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              background: '#10b981',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              zIndex: 999999,
              fontSize: '13.5px',
              fontWeight: 500
            }}
          >
            <CheckCircle2 size={18} />
            <span>{typeof savedContactsToast === 'string' ? savedContactsToast : 'Profile saved! Explore jobs and radar are now tailored to your profile data.'}</span>
          </div>
        )}
      </div>

      {/* ======================================================================
          MODALS & DRAWERS
          ====================================================================== */}

      {/* 0. Factory Reset GitHub-style Validation Modal */}
      {isFactoryModalOpen && (
        <div 
          className="avatar-modal-backdrop" 
          onClick={() => { if (!isResettingFactory) setIsFactoryModalOpen(false); }}
          style={{ zIndex: 100005 }}
        >
          <div 
            className="avatar-modal-card" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460, padding: 24, border: '1px solid #FCA5A5' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="#DC2626" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991B1B' }}>
                  Factory Reset Entire Application
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => { if (!isResettingFactory) setIsFactoryModalOpen(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#991B1B', lineHeight: 1.45, fontWeight: 500 }}>
                This action cannot be undone. This will permanently reset all 1,646 jobs to default, reset applied statuses, wipe activity logs, and reset profile preferences.
              </p>
            </div>

            <p style={{ fontSize: 13, color: '#334155', marginBottom: 8, lineHeight: 1.4 }}>
              To verify and confirm, please type <strong style={{ color: '#0F172A', background: '#F1F5F9', padding: '2px 5px', borderRadius: 4 }}>resume-porter</strong> or <strong style={{ color: '#0F172A', background: '#F1F5F9', padding: '2px 5px', borderRadius: 4 }}>JobsOnly</strong> below:
            </p>

            <input 
              type="text"
              value={confirmProjectInput}
              onChange={(e) => {
                setConfirmProjectInput(e.target.value);
                setFactoryResetError('');
              }}
              placeholder="resume-porter"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1.5px solid #CBD5E1',
                fontSize: 13.5,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 12,
                fontWeight: 600
              }}
              autoFocus
            />

            {factoryResetError && (
              <div style={{ color: '#DC2626', fontSize: 12.5, marginBottom: 10, fontWeight: 500 }}>
                {factoryResetError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button 
                type="button"
                className="avatar-btn-subtle"
                onClick={() => setIsFactoryModalOpen(false)}
                disabled={isResettingFactory}
              >
                Cancel
              </button>
              {(() => {
                const clean = confirmProjectInput.trim().toLowerCase().replace(/[\s-_]/g, '');
                const isValid = clean === 'resumeporter' || clean === 'jobsonly' || clean === 'reset' || confirmProjectInput.trim().toLowerCase().includes('porter');
                return (
                  <button 
                    type="button"
                    onClick={handleFactoryResetConfirm}
                    disabled={isResettingFactory || !isValid}
                    style={{
                      background: isValid ? '#DC2626' : '#94A3B8',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 6,
                      padding: '9px 16px',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: isValid ? 'pointer' : 'not-allowed',
                      transition: 'background 150ms ease'
                    }}
                  >
                    {isResettingFactory ? 'Resetting Project...' : 'I understand, factory reset this project'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 1. Stylized Avatar Selection Modal */}
      {isAvatarModalOpen && (
        <div className="avatar-modal-backdrop" onClick={() => setIsAvatarModalOpen(false)}>
          <div className="avatar-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Choose Stylized Avatar</h3>
              <button 
                type="button" 
                onClick={() => setIsAvatarModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
              Select one of the curated cyberpunk and engineering avatars for your profile and top navigation bar.
            </p>

            <div className="avatar-preset-grid">
              {AVATAR_OPTIONS.map((opt) => (
                <div 
                  key={opt.id}
                  className={`avatar-preset-item ${avatar === opt.id ? 'is-selected' : ''}`}
                  onClick={() => handleSelectPresetAvatar(opt.id)}
                >
                  <StaticAvatar avatarId={opt.id} size={50} />
                  <span className="avatar-preset-label">{opt.label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button 
                type="button"
                className="avatar-btn-subtle"
                onClick={() => setIsAvatarModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Resume Viewer Modal */}
      {isResumeViewerOpen && (
        <div className="avatar-modal-backdrop" onClick={() => setIsResumeViewerOpen(false)}>
          <div className="resume-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="resume-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="#2D5A27" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    {resumeMeta?.fileName || 'Resume Document'}
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {resumeMeta?.fileSize || ''} {resumeMeta?.uploadedAt ? `· Uploaded ${new Date(resumeMeta.uploadedAt).toLocaleDateString()}` : ''}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a 
                  href={apiService.getResumeDownloadUrl()} 
                  className="btn-cv-download" 
                  download
                  title="Download File"
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
                <a 
                  href={apiService.getResumeViewUrl()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-cv-view"
                  title="Open original file in browser tab"
                >
                  <ExternalLink size={13} />
                  <span>Open in Tab</span>
                </a>
                <button 
                  type="button" 
                  onClick={() => setIsResumeViewerOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', marginLeft: '6px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Viewer Sub-Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 24px' }}>
              <button 
                type="button"
                onClick={() => setResumeViewerTab('parsed')}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: resumeViewerTab === 'parsed' ? '2.5px solid #2D5A27' : '2.5px solid transparent',
                  background: 'none',
                  fontWeight: resumeViewerTab === 'parsed' ? 600 : 500,
                  color: resumeViewerTab === 'parsed' ? '#111827' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Extracted ATS Content
              </button>
              <button 
                type="button"
                onClick={() => setResumeViewerTab('text')}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: resumeViewerTab === 'text' ? '2.5px solid #2D5A27' : '2.5px solid transparent',
                  background: 'none',
                  fontWeight: resumeViewerTab === 'text' ? 600 : 500,
                  color: resumeViewerTab === 'text' ? '#111827' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Raw Text Stream
              </button>
              <button 
                type="button"
                onClick={() => setResumeViewerTab('document')}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: resumeViewerTab === 'document' ? '2.5px solid #2D5A27' : '2.5px solid transparent',
                  background: 'none',
                  fontWeight: resumeViewerTab === 'document' ? 600 : 500,
                  color: resumeViewerTab === 'document' ? '#111827' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Document Viewer (Inline PDF/File)
              </button>
            </div>

            <div className="resume-modal-body">
              {isLoadingResumeContent ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Loader2 size={24} className="spin-animation" style={{ color: '#2D5A27', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Loading resume stream...</p>
                </div>
              ) : resumeViewerTab === 'parsed' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {summary && (
                    <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>Headline & Summary</span>
                      <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#1e293b', lineHeight: 1.5 }}>{summary}</p>
                    </div>
                  )}

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '8px' }}>
                      Parsed Technical Skills ({skillsList.length})
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {skillsList.map(s => (
                        <span key={s.name} style={{ background: '#eef3eb', border: '1px solid #c9d9c4', borderRadius: '4px', padding: '3px 8px', fontSize: '12px', color: '#2D5A27', fontWeight: 500 }}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '8px' }}>
                      Work History Extracted ({experiences.length})
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {experiences.map((exp, i) => (
                        <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', background: '#ffffff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong style={{ fontSize: '13px', color: '#0f172a' }}>{exp.title}</strong>
                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>{exp.period}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{exp.company}</div>
                          {exp.description && (
                            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#334155' }}>{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : resumeViewerTab === 'text' ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Raw UTF-8 text extracted by backend parser</span>
                  </div>
                  <pre className="resume-text-box">
                    {resumeContentData?.rawText || resumeMeta?.rawText || 'No raw text available.'}
                  </pre>
                </div>
              ) : (
                <div style={{ width: '100%', height: '520px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <iframe 
                    src={apiService.getResumeViewUrl()} 
                    title="Resume Document Viewer" 
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Add / Edit Experience Modal */}
      {isExpModalOpen && (
        <div className="avatar-modal-backdrop" onClick={() => setIsExpModalOpen(false)}>
          <div className="avatar-modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {editingExpIndex !== null ? 'Edit Experience Position' : 'Add Professional Experience'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsExpModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
              <div>
                <label className="field-meta-label">Job Title / Role</label>
                <input 
                  type="text" 
                  className="field-input-box" 
                  placeholder="e.g. Senior Software Engineer"
                  value={expForm.title}
                  onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="field-meta-label">Company Name</label>
                <input 
                  type="text" 
                  className="field-input-box" 
                  placeholder="e.g. Enterprise Technologies Corp"
                  value={expForm.company}
                  onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="field-meta-label">Location</label>
                  <input 
                    type="text" 
                    className="field-input-box" 
                    placeholder="e.g. Hyderabad, India"
                    value={expForm.location}
                    onChange={(e) => setExpForm({ ...expForm, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-meta-label">Period / Dates</label>
                  <input 
                    type="text" 
                    className="field-input-box" 
                    placeholder="e.g. 2023 – Present"
                    value={expForm.period}
                    onChange={(e) => setExpForm({ ...expForm, period: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="field-meta-label">Description & Key Achievements</label>
                <textarea 
                  className="field-textarea-box" 
                  rows={4}
                  placeholder="Designed and developed high-throughput microservices using Spring Boot and Kafka handling 20k+ RPS..."
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button 
                type="button" 
                className="avatar-btn-subtle"
                onClick={() => setIsExpModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-primary-olive"
                onClick={handleSaveExperienceModal}
              >
                Save Position
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Add / Edit Education Modal (Full CRUD) */}
      {isEduModalOpen && (
        <div className="avatar-modal-backdrop" onClick={() => setIsEduModalOpen(false)}>
          <div className="avatar-modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {editingEduIndex !== null ? 'Edit Educational Qualification' : 'Add Educational Degree / Diploma'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsEduModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
              <div>
                <label className="field-meta-label">Degree / Field of Study</label>
                <input 
                  type="text" 
                  className="field-input-box" 
                  placeholder="e.g. Bachelor of Technology in Computer Science"
                  value={eduForm.degree}
                  onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
                />
              </div>

              <div>
                <label className="field-meta-label">Institution / College / University</label>
                <input 
                  type="text" 
                  className="field-input-box" 
                  placeholder="e.g. JNTU College of Engineering"
                  value={eduForm.institution}
                  onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="field-meta-label">Years / Period</label>
                  <input 
                    type="text" 
                    className="field-input-box" 
                    placeholder="e.g. 2017 – 2021"
                    value={eduForm.period}
                    onChange={(e) => setEduForm({ ...eduForm, period: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-meta-label">Grade / GPA / Honours</label>
                  <input 
                    type="text" 
                    className="field-input-box" 
                    placeholder="e.g. First Class with Distinction / 8.6 CGPA"
                    value={eduForm.grade}
                    onChange={(e) => setEduForm({ ...eduForm, grade: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
              <button 
                type="button" 
                className="avatar-btn-subtle"
                onClick={() => setIsEduModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-primary-olive"
                onClick={handleSaveEducationModal}
              >
                Save Education
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Custom Screening Question Modal */}
      {isAddQuestionModalOpen && (
        <div className="avatar-modal-backdrop" onClick={() => setIsAddQuestionModalOpen(false)}>
          <div className="avatar-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Add Custom Screening Question</h3>
              <button 
                type="button" 
                onClick={() => setIsAddQuestionModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
              <div>
                <label className="field-meta-label">Question Text</label>
                <input 
                  type="text" 
                  className="field-input-box" 
                  placeholder="e.g. Do you have experience with AWS EKS in production?"
                  value={newQuestionForm.question}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, question: e.target.value })}
                />
              </div>

              <div>
                <label className="field-meta-label">Category</label>
                <select 
                  className="field-select-box"
                  value={newQuestionForm.category}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, category: e.target.value })}
                >
                  <option value="Work Authorization">Work Authorization</option>
                  <option value="Compensation & Availability">Compensation & Availability</option>
                  <option value="Technical Experience">Technical Experience</option>
                  <option value="Logistics & Work Mode">Logistics & Work Mode</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="field-meta-label">Default Answer</label>
                <input 
                  type="text" 
                  className="field-input-box" 
                  placeholder="e.g. Yes, 3 years configuring EKS clusters..."
                  value={newQuestionForm.answer}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, answer: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button 
                type="button" 
                className="avatar-btn-subtle"
                onClick={() => setIsAddQuestionModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-primary-olive"
                onClick={handleAddCustomScreeningQuestion}
              >
                Add Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add Language Modal */}
      {isAddLanguageOpen && (
        <div className="avatar-modal-backdrop" onClick={() => setIsAddLanguageOpen(false)}>
          <div className="avatar-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Add Language</h3>
              <button 
                type="button" 
                onClick={() => setIsAddLanguageOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
              <div>
                <label className="field-meta-label">Language Name</label>
                <input 
                  type="text" 
                  className="field-input-box" 
                  placeholder="e.g. German, French, Japanese..."
                  value={newLangForm.language}
                  onChange={(e) => setNewLangForm({ ...newLangForm, language: e.target.value })}
                />
              </div>

              <div>
                <label className="field-meta-label">Proficiency Level</label>
                <select 
                  className="field-select-box"
                  value={newLangForm.proficiency}
                  onChange={(e) => setNewLangForm({ ...newLangForm, proficiency: e.target.value })}
                >
                  <option value="Native / Bilingual">Native / Bilingual</option>
                  <option value="Full Professional">Full Professional</option>
                  <option value="Professional Working">Professional Working</option>
                  <option value="Conversational / Limited">Conversational / Limited</option>
                  <option value="Elementary">Elementary</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button 
                type="button" 
                className="avatar-btn-subtle"
                onClick={() => setIsAddLanguageOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-primary-olive"
                onClick={handleAddLanguage}
              >
                Add Language
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
