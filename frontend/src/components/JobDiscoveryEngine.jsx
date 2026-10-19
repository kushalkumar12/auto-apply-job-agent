import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { 
  Radio, 
  Earth, 
  Pause, 
  Play, 
  AudioLines, 
  ArrowDownLeft
} from 'lucide-react';
import { CompanyLogo } from './BrandIcons';
import { apiService } from '../services/api';
import './JobDiscoveryEngine.css';

const DEFAULT_STREAM_SOURCES = [];

function SourceMark({ source }) {
  const compName = source.name || source.company || '';
  return (
    <span className="source-mark-icon-wrap" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <CompanyLogo name={compName} />
    </span>
  );
}

const AttractionCanvas = memo(function AttractionCanvas({ running, speed, onCapture }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ running, speed, onCapture });

  useEffect(() => {
    stateRef.current = { running, speed, onCapture };
  }, [running, speed, onCapture]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const computedStyle = getComputedStyle(canvas);
    const fieldInk = computedStyle.getPropertyValue('--field-ink').trim() || '#d6d9d7';
    const fieldGlow = computedStyle.getPropertyValue('--field-glow').trim() || '#f2f4f2';

    let width = 0;
    let height = 0;
    let animTime = 0;
    let lastTime = performance.now();
    let lastCapture = 0;
    let animId = 0;

    // Pre-calculated cache for 60-120 FPS silky performance (zero DOM layout thrashing)
    let cachedSources = [];
    let cachedDots = [];
    let centerX = 0;
    let centerY = 0;
    let centerRadius = 60; // 120px collector diameter / 2
    let outerRadius = 200;
    let waveAmplitude = 7.5;

    const measureAndRebuild = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      centerX = width / 2;
      centerY = height * 0.48; // Centered with 120px collector at 48%
      centerRadius = width < 600 ? 50 : 60;
      outerRadius = Math.max(width * 0.52, height * 0.85);
      waveAmplitude = width < 600 ? 6 : 8.5;

      // Initialize floating source elements with guaranteed visibility and cached origin coordinates
      const elements = Array.from(canvas.parentElement?.querySelectorAll('.floating-source') ?? []);
      cachedSources = elements.map((el) => {
        el.style.visibility = 'visible';
        el.style.opacity = '1';
        return {
          el,
          originX: el.offsetLeft + el.offsetWidth / 2,
          originY: el.offsetTop + el.offsetHeight / 2,
          lastCycle: -1
        };
      });

      // Pre-compute mesh dot coordinates for 60FPS batched fill
      cachedDots = [];
      const step = width < 600 ? 16 : 18;
      for (let y = 10; y < height; y += step) {
        for (let x = 10; x < width; x += step) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.hypot(dx, dy);
          if (dist < centerRadius + 10) continue;
          cachedDots.push({
            x,
            y,
            normX: dx / dist,
            decay: Math.exp(-dist / (outerRadius * 0.55))
          });
        }
      }
    };

    const ro = new ResizeObserver(measureAndRebuild);
    ro.observe(canvas);
    measureAndRebuild();

    const wavePhase = (x, y) => Math.hypot(x - centerX, (y - centerY) / 0.79) * 0.025 + animTime * 1.9;
    const waveDisplacement = (x, y) => prefersReducedMotion ? 0 : Math.sin(wavePhase(x, y)) * waveAmplitude;

    const render = (currentTime) => {
      const isHidden = typeof document !== 'undefined' && document.hidden;
      const delta = isHidden ? 0 : Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      if (!isHidden && stateRef.current.running && !prefersReducedMotion) {
        animTime += delta * stateRef.current.speed;
      }

      if (stateRef.current.running && animTime - lastCapture > 2.4) {
        lastCapture = animTime;
        stateRef.current.onCapture();
      }

      ctx.clearRect(0, 0, width, height);

      // --- 1. Batched Background Mesh Dots ---
      ctx.fillStyle = fieldInk;
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      for (let i = 0; i < cachedDots.length; i++) {
        const d = cachedDots[i];
        const sinVal = Math.sin(wavePhase(d.x, d.y));
        const push = sinVal * 6 * d.decay;
        const px = d.x + d.normX * push;
        const py = d.y + (prefersReducedMotion ? 0 : sinVal * waveAmplitude);
        ctx.moveTo(px + 1.1, py);
        ctx.arc(px, py, 1.1, 0, Math.PI * 2);
      }
      ctx.fill();

      // --- 2. Concentric Inward Wavefield Loops (Exact wavefrontend 7 ripples with multi-layer luminous glow) ---
      ctx.strokeStyle = fieldGlow;
      for (let w = 0; w < 7; w++) {
        const norm = ((w / 7) + animTime * 0.085) % 1;
        const currentRadius = centerRadius + 12 + ((1 - norm) ** 1.8) * outerRadius;
        const alpha = Math.sin(norm * Math.PI) * 0.22;

        for (let layer = 0; layer < 3; layer++) {
          ctx.globalAlpha = alpha / (layer + 1);
          ctx.lineWidth = layer === 0 ? 1.2 : 5 + layer * 6; // Layer 0: 1.2px core, Layer 1: 11px glow conduit, Layer 2: 17px luminous halo
          ctx.beginPath();
          for (let stepIdx = 0; stepIdx <= 160; stepIdx++) {
            const angle = (stepIdx / 160) * Math.PI * 2;
            const radiusPerturb = currentRadius + (Math.sin(angle * 3 + animTime * 0.35 + w) * 8 + Math.cos(angle * 5 - animTime * 0.2) * 4) * Math.sin(norm * Math.PI);
            const px = centerX + Math.cos(angle) * radiusPerturb;
            const pyBase = centerY + Math.sin(angle) * radiusPerturb * 0.79;
            const py = pyBase + waveDisplacement(px, pyBase);

            if (stepIdx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }

      // --- 3. Inward Stream Particles (65 Particles with velocity tails & sinusoidal fade) ---
      for (let p = 0; p < 65; p++) {
        const norm = (p * 0.618033 + animTime * (0.05 + (p % 4) * 0.007)) % 1;
        const angle = p * 2.39996 + norm * 0.65;
        const radius = centerRadius + 10 + ((1 - norm) ** 1.65) * outerRadius;
        const px = centerX + Math.cos(angle) * radius;
        const pyBase = centerY + Math.sin(angle) * radius * 0.79;
        const py = pyBase + waveDisplacement(px, pyBase);

        ctx.globalAlpha = Math.sin(norm * Math.PI) * (p % 4 === 0 ? 0.92 : 0.45);
        ctx.fillStyle = fieldGlow;
        ctx.beginPath();
        ctx.arc(px, py, p % 5 === 0 ? 2.2 : 1.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = fieldGlow;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(angle - 0.15) * 12, py + Math.sin(angle - 0.15) * 9);
        ctx.stroke();
      }

      // --- 4. Authentic Inward Gravitational Attraction towards Center Orbit ---
      const CYCLE_DURATION = 6.5; // Smooth 6.5s inward attraction journey
      const STAGGER = CYCLE_DURATION / Math.max(cachedSources.length, 1);

      for (let index = 0; index < cachedSources.length; index++) {
        const src = cachedSources[index];
        if (!src.el) continue;

        // Hover pause: if user hovers over a badge, pause attraction so they can easily click it
        if (src.el.matches(':hover')) {
          continue;
        }

        const localTime = (animTime + index * STAGGER) % CYCLE_DURATION;
        const progress = localTime / CYCLE_DURATION; // 0.0 at launch anchor, 1.0 at center orbit
        const currentCycle = Math.floor((animTime + index * STAGGER) / CYCLE_DURATION);

        // Accelerating gravitational pull towards center orbit
        const attraction = prefersReducedMotion ? 0 : Math.pow(progress, 1.32);

        // Vector translation from launch origin towards center orbit
        const transX = (centerX - src.originX) * attraction;
        const transY = (centerY - src.originY) * attraction;

        // Fluid sinusoidal ripple from wavefield
        const currX = src.originX + transX;
        const currY = src.originY + transY;
        const wave = prefersReducedMotion ? 0 : Math.sin(wavePhase(currX, currY)) * waveAmplitude * (1 - attraction * 0.65);
        const waveTilt = prefersReducedMotion ? 0 : Math.sin(wavePhase(currX, currY)) * 2.2 * (1 - attraction);

        // Graceful scaling down as it compresses into the 120px collector
        const scale = 1.0 - attraction * 0.45; // 1.0 at perimeter down to 0.55 at center

        // Smooth Opacity:
        // - Launch (0 to 0.12): fade in smoothly
        // - Mid-flight (0.12 to 0.82): 100% visible
        // - Entering orbit core (0.82 to 1.0): dissolve seamlessly into the center core
        let opacity = 1;
        if (progress < 0.12) {
          opacity = progress / 0.12;
        } else if (progress > 0.82) {
          opacity = Math.max(0, (1 - progress) / 0.18);
        }

        // Z-Index: slips behind collector (collector is z-index 2) when nearing center
        const zIndex = progress > 0.72 ? 1 : 4;

        src.el.style.transform = `translate3d(${transX.toFixed(1)}px, ${(transY + wave).toFixed(1)}px, 0) scale(${scale.toFixed(2)}) rotate(${waveTilt.toFixed(1)}deg)`;
        src.el.style.opacity = opacity.toFixed(2);
        src.el.style.visibility = opacity > 0.02 ? 'visible' : 'hidden';
        src.el.style.zIndex = String(zIndex);
        src.el.style.pointerEvents = (progress > 0.85 || !stateRef.current.running) ? 'none' : 'auto';

        // Trigger onCapture callback when badge arrives at orbit center
        if (currentCycle !== src.lastCycle && progress > 0.85) {
          src.lastCycle = currentCycle;
          stateRef.current.onCapture();
        }
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      cachedSources.forEach(s => {
        s.el.style.transform = '';
        s.el.style.visibility = '';
        s.el.style.pointerEvents = '';
      });
    };
  }, []);

  return <canvas ref={canvasRef} className="attraction-canvas" aria-hidden="true" />;
});

export default function JobDiscoveryEngine({
  totalJobs = 0,
  status = 'scanning',
  onSelectCompany,
  selectedSource: externalSelectedSource,
  stats,
  searchQuery = '',
  activeOrigin = 'all',
  selectedDay = null,
  onJobDiscovered,
  onHarvestActivity,
  isProfileComplete = false,
  onOpenProfileGate
}) {
  const isArchived = selectedDay && selectedDay.dayOffset > 0;
  // Strictly manual discovery stream: starts paused, only runs when user clicks Resume Stream
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(totalJobs !== undefined ? totalJobs : 0);
  const [speed, setSpeed] = useState(1);
  const [selectedSource, setSelectedSource] = useState(externalSelectedSource || null);

  const handleToggleStream = async () => {
    if (!running) {
      // Validate mandatory profile before starting Explorer
      if (!isProfileComplete) {
        if (onOpenProfileGate) onOpenProfileGate();
        return;
      }
      try {
        await apiService.startDiscovery();
        setRunning(true);
      } catch (err) {
        if (err.message && (err.message.includes('Mandatory profile') || err.message.includes('403'))) {
          if (onOpenProfileGate) onOpenProfileGate();
        } else {
          setRunning(true);
        }
      }
    } else {
      try {
        await apiService.stopDiscovery();
      } catch (e) {}
      setRunning(false);
    }
  };
  const [streamSources, setStreamSources] = useState(() => {
    if (stats?.sources && stats.sources.length > 0) {
      return stats.sources.map(s => ({
        name: s.name,
        role: 'Live Search',
        ats: null,
        count: s.count || 0,
        detail: `${s.name} Portal`
      }));
    }
    return DEFAULT_STREAM_SOURCES;
  });
  const [latestJob, setLatestJob] = useState(null);
  const slotIndexRef = useRef(0);
  const bufferTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef([]);

  const onJobDiscoveredRef = useRef(onJobDiscovered);
  useEffect(() => {
    onJobDiscoveredRef.current = onJobDiscovered;
  }, [onJobDiscovered]);

  // Synchronize count directly with backend search/filter total
  useEffect(() => {
    if (totalJobs !== undefined) {
      setCount(totalJobs);
    }
  }, [totalJobs]);

  useEffect(() => {
    if (externalSelectedSource !== undefined) {
      setSelectedSource(externalSelectedSource === 'All' ? null : externalSelectedSource);
    }
  }, [externalSelectedSource]);

  // Synchronize sources if stats update
  useEffect(() => {
    if (stats?.sources && stats.sources.length > 0) {
      setStreamSources(stats.sources.map(s => ({
        name: s.name,
        role: 'Live Search',
        ats: null,
        count: s.count || 0,
        detail: `${s.name} Portal`
      })));
    }
  }, [stats]);

  // Connect to Real-time SSE Discovery Stream with Smooth Throttled Batching
  useEffect(() => {
    if (!running) return;

    const stream = apiService.createDiscoveryStream((job) => {
      pendingUpdatesRef.current.push(job);

      if (!bufferTimeoutRef.current) {
        bufferTimeoutRef.current = setTimeout(() => {
          bufferTimeoutRef.current = null;
          const pending = pendingUpdatesRef.current;
          if (pending.length === 0) return;
          const mostRecent = pending[pending.length - 1];
          const newJobsCount = pending.length;
          pendingUpdatesRef.current = [];

          setLatestJob(mostRecent);

          // Real-time dispatch into Activity Feed
          if (onJobDiscoveredRef.current && mostRecent) {
            onJobDiscoveredRef.current(mostRecent);
          }

          setStreamSources(prev => {
            const next = [...prev];
            const idx = slotIndexRef.current % next.length;
            slotIndexRef.current += 1;
            next[idx] = {
              name: mostRecent.company,
              role: mostRecent.role,
              ats: mostRecent.atsScore,
              detail: `${mostRecent.company} · ${mostRecent.source}`,
              count: (next[idx]?.count || 0) + newJobsCount,
              isLive: true
            };
            return next;
          });
        }, 1200);
      }
    }, (act) => {
      if (onHarvestActivity) {
        onHarvestActivity(act);
      }
    });

    return () => {
      if (stream && stream.close) {
        stream.close();
      }
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
        bufferTimeoutRef.current = null;
      }
    };
  }, [running]);

  const handleCapture = useCallback(() => {
    // Pulse
  }, []);

  const handleSourceClick = (source) => {
    const isSame = selectedSource === source.name;
    const newSelected = isSame ? null : source.name;
    setSelectedSource(newSelected);
    if (onSelectCompany) {
      onSelectCompany(newSelected || 'All');
    }
  };

  const activeSource = streamSources.find(s => s.name === selectedSource);

  return (
    <div className={`radar-scene ${running ? 'is-running' : 'is-paused'}`}>
      {/* Dynamic Animated Canvas Attractor (100% Cloned from wavefrontend) */}
      <AttractionCanvas 
        running={running} 
        speed={speed} 
        onCapture={handleCapture} 
      />

      {/* Inward Floating Platform Nodes (Seamless Influx from 360-degree perimeter into Center Orbit) */}
      {streamSources.slice(0, 8).map((source, index) => (
        <button
          key={`slot-${index}`}
          className={`floating-source source-${index} ${selectedSource === source.name ? 'source-selected' : ''}`}
          onClick={() => handleSourceClick(source)}
          aria-label={`View ${source.name} live jobs`}
        >
          <SourceMark source={source} />
          <span>{source.name}</span>
          {source.ats && <span className="source-ats-badge">{source.ats}%</span>}
          <span className="source-live-dot" title="Streaming live from DB"></span>
        </button>
      ))}

      {/* Central Collector Core (Maintained exact 120px x 120px) with Rotating Gradient Shadow */}
      <div className="collector">
        <div className="orbit-gradient-shadow" aria-hidden="true"></div>
        <div className="collector-outer">
          <div className="collector-inner">
            <span className="collector-caption">
              {searchQuery ? 'SEARCH' : (selectedDay && selectedDay.dayOffset > 0) ? `ARCHIVE: ${selectedDay.label.toUpperCase()}` : selectedSource ? selectedSource.toUpperCase() : 'ORBIT'}
            </span>
            <span className="found-count">{(totalJobs !== undefined ? totalJobs : count).toLocaleString()}</span>
            <span className={`collector-status ${(selectedDay && selectedDay.dayOffset > 0) ? 'is-paused' : (running ? 'is-running' : 'is-paused')}`}>
              {(selectedDay && selectedDay.dayOffset > 0) ? (
                'Archived Snapshot'
              ) : running ? (
                <>
                  Collecting<span className="loading-dots"><span className="dot dot-1">.</span><span className="dot dot-2">.</span><span className="dot dot-3">.</span></span>
                </>
              ) : !isProfileComplete ? (
                'Profile Incomplete'
              ) : (
                'Paused'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Command Action Pill */}
      <div className="collector-command">
        <button 
          className="scan-button" 
          onClick={handleToggleStream}
        >
          {running ? <Pause size={10} /> : <Play size={10} />}
          <span>{running ? 'Pause stream' : 'Resume stream'}</span>
        </button>
      </div>

      {/* Bottomline Info */}
      <div className="scene-bottomline">
        <span>
          <span className="tiny-cross">+</span>{' '}
          {latestJob ? (
            <span>
              <strong>LIVE:</strong> {latestJob.company} · {latestJob.role} ({latestJob.atsScore}% ATS)
            </span>
          ) : activeSource ? (
            `${activeSource.detail} · ${activeSource.count} matches in DB`
          ) : (
            `${count.toLocaleString()} JOBS INDEXED`
          )}
        </span>
      </div>

      {/* Bottom Right Corner Indicator */}
      <span className="scene-corner">
        <ArrowDownLeft size={16} />
      </span>
    </div>
  );
}
