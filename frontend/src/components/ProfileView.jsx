import React from 'react';
import JobProfileModule from './profile/JobProfileModule';
import './ProfileView.css';

/**
 * Production-grade Job Profile Master Data Module (Single Source of Truth)
 * Wraps the 10-page master profile workstation and mandatory onboarding flow.
 */
export default function ProfileView({ 
  activeCandidateProfile, 
  onNavigateTab, 
  onProfileUpdated 
}) {
  return (
    <JobProfileModule
      activeCandidateProfile={activeCandidateProfile}
      onNavigateTab={onNavigateTab}
      onProfileUpdated={onProfileUpdated}
    />
  );
}
