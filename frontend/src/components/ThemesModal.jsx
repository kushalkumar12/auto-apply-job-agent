import React, { useState } from 'react';
import { X, Check, Palette } from 'lucide-react';

function DashboardPreviewGraphic({ variant = 'default' }) {
  return (
    <div className={`theme-mock-dashboard mock-${variant}`}>
      {/* Left Sidebar */}
      <div className="mock-sidebar">
        <div className="mock-avatar-dot" />
        <div className="mock-nav-pill-active" />
        <div className="mock-nav-item">
          <div className="mock-dot" />
          <div className="mock-line" />
        </div>
        <div className="mock-nav-item">
          <div className="mock-dot" />
          <div className="mock-line" />
        </div>
        <div className="mock-nav-item">
          <div className="mock-dot" />
          <div className="mock-line short" />
        </div>
      </div>

      {/* Right Content */}
      <div className="mock-content">
        {/* Top Header Bar */}
        <div className="mock-topbar">
          <div className="mock-search-pill" />
          <div className="mock-accent-dot" />
        </div>

        {/* Mini Cards Row */}
        <div className="mock-cards-row">
          {/* Card 1: Metrics */}
          <div className="mock-card mock-card-metrics">
            <div className="mock-metric-row">
              <div className="mock-chip chip-purple" />
              <div className="mock-metric-lines">
                <div className="mock-metric-bar w-70" />
                <div className="mock-metric-bar w-40" />
              </div>
            </div>
            <div className="mock-metric-row">
              <div className="mock-chip chip-cyan" />
              <div className="mock-metric-lines">
                <div className="mock-metric-bar w-60" />
                <div className="mock-metric-bar w-30" />
              </div>
            </div>
          </div>

          {/* Card 2: Bar Chart */}
          <div className="mock-card mock-card-chart">
            <div className="mock-chart-bar h-35" />
            <div className="mock-chart-bar h-55" />
            <div className="mock-chart-bar h-85" />
            <div className="mock-chart-bar h-65" />
            <div className="mock-chart-bar h-95" />
          </div>
        </div>
      </div>
    </div>
  );
}

const THEMES_LIST = [
  {
    id: 'default',
    title: 'Default',
    subtitle: 'Clean, modern Swiss design.',
    variant: 'default',
  },
  {
    id: 'minimal',
    title: 'Minimal',
    subtitle: 'Simple, distraction-free monochrome.',
    variant: 'minimal',
  },
];

export default function ThemesModal({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  colorMode = 'default',
  setColorMode,
  mouseCursorAnimation,
  setMouseCursorAnimation,
  dataFlowAnimation,
  setDataFlowAnimation
}) {
  const normalizedTheme = currentTheme === 'no-color' ? 'minimal' : (currentTheme || 'default');
  const [selectedThemeId, setSelectedThemeId] = useState(normalizedTheme);

  // Keep local selection in sync with currentTheme prop
  React.useEffect(() => {
    setSelectedThemeId(currentTheme === 'no-color' ? 'minimal' : (currentTheme || 'default'));
  }, [currentTheme]);

  // Handle Escape key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCardClick = (theme) => {
    setSelectedThemeId(theme.id);
    if (onSelectTheme) {
      onSelectTheme(theme.id);
    }
  };

  return (
    <div className="app-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Theme Selection">
      <div className="app-modal-card themes-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header with Palette Icon, Title, and Red Circular (X) Button - Seamless, No Border Line */}
        <div className="themes-modal-header">
          <div className="themes-modal-title">
            <Palette size={20} strokeWidth={2.2} />
            <span>Themes</span>
          </div>
          <button className="themes-modal-close-btn" onClick={onClose} aria-label="Close Themes Modal">
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="themes-modal-body">
          {/* 2x2 Grid of Theme Cards matching User Mock */}
          <div className="themes-2x2-grid">
            {THEMES_LIST.map((theme) => {
              const isSelected = selectedThemeId === theme.id;
              return (
                <div
                  key={theme.id}
                  className={`theme-screen-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleCardClick(theme)}
                  title={theme.title}
                >
                  {/* Top-Right Indicator: Checkmark Badge or Radio Ring */}
                  {isSelected ? (
                    <div className="theme-card-indicator indicator-check">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="theme-card-indicator indicator-radio" />
                  )}

                  {/* Visual Mockup Dashboard Graphic */}
                  <DashboardPreviewGraphic variant={theme.variant} />

                  {/* Card Info Below Preview */}
                  <div className="theme-card-info">
                    <h3 className="theme-card-name">{theme.title}</h3>
                    <p className="theme-card-desc">{theme.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Color Mode Row matching User Mock */}
          <div className="theme-color-mode-row">
            <span className="color-mode-heading">Color Mode</span>
            <div className="color-mode-options">
              {[
                { id: 'default', label: 'Default' },
                { id: 'light', label: 'Light' },
                { id: 'dark', label: 'Dark' },
              ].map((mode) => {
                const isModeSelected = colorMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    className="color-mode-radio-btn"
                    onClick={() => setColorMode(mode.id)}
                  >
                    <span className={`custom-radio-circle ${isModeSelected ? 'is-selected' : ''}`}>
                      {isModeSelected && <span className="custom-radio-dot" />}
                    </span>
                    <span className="color-mode-label">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
