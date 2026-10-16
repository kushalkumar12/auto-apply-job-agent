import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { 
  Radio, 
  Earth, 
  Pause, 
  Play, 
  AudioLines, 
  ArrowDownLeft
} from 'lucide-react';
import { apiService } from '../services/api';
import './JobDiscoveryEngine.css';

const DEFAULT_STREAM_SOURCES = [
  { name: 'Google', role: 'Staff Software Engineer', ats: 92, count: 480, detail: 'Google Careers' },
  { name: 'Microsoft', role: 'Cloud Systems Architect', ats: 89, count: 420, detail: 'Azure Cloud' },
  { name: 'Amazon', role: 'Java Core Developer', ats: 86, count: 510, detail: 'AWS Fulfillment' },
  { name: 'Apple', role: 'iOS Platform Engineer', ats: 91, count: 320, detail: 'Apple Careers' },
  { name: 'Nvidia', role: 'CUDA Deep Learning Engineer', ats: 95, count: 340, detail: 'AI Computing' }
];

function SourceMark({ source }) {
  const comp = (source.name || source.company || '').toLowerCase();
  if (comp.includes('apple')) {
    return (
      <span className="source-mark apple">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.6 12.8c0-2 1.7-3 1.8-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.2-2.6.8-3.3.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.6 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1 1.6 2.1 2.7 2 1.1 0 1.5-.7 2.9-.7s1.8.7 3 .7c1.2 0 1.9-1 2.6-2 .9-1.2 1.2-2.4 1.2-2.5-.1 0-2.5-1-2.5-3.9ZM15.4 6.7c.6-.8 1.1-1.9 1-3-.9.1-2 .6-2.7 1.4-.6.7-1.2 1.8-1.1 2.8 1 .1 2.1-.5 2.8-1.2Z" />
        </svg>
      </span>
    );
  }
  if (comp.includes('google')) {
    return <span className="source-mark google">G</span>;
  }
  if (comp.includes('linkedin')) {
    return <span className="source-mark linkedin">in</span>;
  }
  if (comp.includes('microsoft')) {
    return (
      <span className="source-mark" style={{ display: 'inline-flex' }}>
        <svg width="12" height="12" viewBox="0 0 24 24">
          <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
          <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
          <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
          <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
        </svg>
      </span>
    );
  }
  if (comp.includes('amazon')) {
    return <span className="source-mark" style={{ fontWeight: 800, color: '#FF9900' }}>a</span>;
  }
  if (comp.includes('netflix')) {
    return <span className="source-mark" style={{ fontWeight: 800, color: '#E50914' }}>N</span>;
  }
  if (comp.includes('meta')) {
    return <span className="source-mark" style={{ fontWeight: 800, color: '#0668E1' }}>M</span>;
  }
  if (comp.includes('nvidia')) {
    return <span className="source-mark" style={{ fontWeight: 800, color: '#76B900' }}>NV</span>;
  }
  if (comp.includes('stripe')) {
    return <span className="source-mark" style={{ fontWeight: 800, color: '#635BFF' }}>S</span>;
  }
  if (comp.includes('openai')) {
    return <span className="source-mark" style={{ fontWeight: 800, color: '#000000' }}>AI</span>;
  }
  if (comp.includes('uber')) {
    return <span className="source-mark" style={{ fontWeight: 800, color: '#000000' }}>U</span>;
  }
  if (comp.includes('spotify')) {
    return <span className="source-mark" style={{ fontWeight: 800, color: '#1DB954' }}>●</span>;
  }
  if (comp.includes('naukri')) {
    return <span className="source-mark naukri">n</span>;
  }
  if (comp.includes('indeed')) {
    return <span className="source-mark indeed">i</span>;
  }

  return (
    <span className="source-mark generic" style={{ fontWeight: 700, color: '#1F2937' }}>
      {source.name?.slice(0, 2).toUpperCase() || 'CO'}
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

      // Exact wavefrontend Boundary-to-Center Ray Projection
      const elements = Array.from(canvas.parentElement?.querySelectorAll('.floating-source') ?? []);
      cachedSources = elements.map((el) => {
        const originX = el.offsetLeft + el.offsetWidth / 2;
        const originY = el.offsetTop + el.offsetHeight / 2;
        const offsetX = originX - centerX;
        const offsetY = originY - centerY;
        const buttonRadius = Math.max(el.offsetWidth, el.offsetHeight) / 2 + waveAmplitude + 24;

        // Exact wavefrontend ray boundary intersection factors
        const factorX = Math.abs(offsetX) > 0.001 ? (width / 2 + buttonRadius) / Math.abs(offsetX) : Infinity;
        const factorY = Math.abs(offsetY) > 0.001 ? ((offsetY < 0 ? centerY : height - centerY) + buttonRadius) / Math.abs(offsetY) : Infinity;
        const minFactor = Math.min(factorX, factorY);

        const edgeX = centerX + offsetX * minFactor;
        const edgeY = centerY + offsetY * minFactor;

        return {
          el,
          originX,
          originY,
          edgeX,
          edgeY,
          deltaX: centerX - edgeX,
          deltaY: centerY - edgeY
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
      const delta = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      if (stateRef.current.running && !prefersReducedMotion) {
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

      // --- 4. Authentic Wave-Riding Floating Badges (Seamless Entrance from Outside Boundaries) ---
      for (let index = 0; index < cachedSources.length; index++) {
        const src = cachedSources[index];
        const localTime = Math.max(0, animTime - index * 1.8);
        const curveProgress = (prefersReducedMotion ? 0 : (localTime % 14) / 14) ** 1.35;

        const transX = prefersReducedMotion ? 0 : src.edgeX + src.deltaX * curveProgress - src.originX;
        const transY = prefersReducedMotion ? 0 : src.edgeY + src.deltaY * curveProgress - src.originY;

        const phase = wavePhase(src.originX + transX, src.originY + transY);
        const waveY = waveDisplacement(src.originX + transX, src.originY + transY) * (1 - curveProgress);
        const waveX = prefersReducedMotion ? 0 : Math.cos(phase) * 2;
        const rotation = prefersReducedMotion ? 0 : Math.cos(phase) * 1.4 * (src.originX < centerX ? -1 : 1);
        const scale = 1 - curveProgress * 0.8;

        const posX = Math.round(transX + waveX);
        const posY = Math.round(transY + waveY);

        // Exact wavefrontend behavior: z-index 1 (goes BEHIND collector z-index 2), scale down to 0.2 as it enters orbit
        src.el.style.transform = `translate3d(${posX}px, ${posY}px, 0) rotate(${rotation.toFixed(1)}deg) scale(${scale.toFixed(2)})`;
        src.el.style.opacity = '1';
        src.el.style.visibility = 'visible';
        src.el.style.zIndex = '1';
        src.el.style.pointerEvents = (!prefersReducedMotion && Math.hypot(src.originX + transX - centerX, src.originY + transY - centerY) < centerRadius) ? 'none' : 'auto';
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
  totalJobs = 15500,
  status = 'scanning',
  onSelectCompany
}) {
  const [running, setRunning] = useState(status !== 'paused');
  const [count, setCount] = useState(totalJobs);
  const [speed, setSpeed] = useState(1);
  const [selectedSource, setSelectedSource] = useState(null);
  const [streamSources, setStreamSources] = useState(DEFAULT_STREAM_SOURCES);
  const [latestJob, setLatestJob] = useState(null);
  const slotIndexRef = useRef(0);
  const bufferTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef([]);

  // Synchronize count with backend total
  useEffect(() => {
    if (totalJobs) setCount(totalJobs);
  }, [totalJobs]);

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
          setCount(prev => prev + newJobsCount);

          setStreamSources(prev => {
            const next = [...prev];
            const idx = slotIndexRef.current % next.length;
            slotIndexRef.current += 1;
            next[idx] = {
              name: mostRecent.company,
              role: mostRecent.role,
              ats: mostRecent.atsScore,
              detail: `${mostRecent.company} · ${mostRecent.source}`,
              count: (next[idx]?.count || 320) + newJobsCount,
              isLive: true
            };
            return next;
          });
        }, 1200);
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

      {/* Inward Floating Platform Nodes (Seamless Influx from Outer Edges into Center Orbit) */}
      {streamSources.map((source, index) => (
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
            <span className="collector-caption">ORBIT</span>
            <span className="found-count">{count.toLocaleString()}</span>
            <span className={`collector-status ${running ? 'is-running' : 'is-paused'}`}>
              {running ? (
                <>
                  Collecting<span className="loading-dots"><span className="dot dot-1">.</span><span className="dot dot-2">.</span><span className="dot dot-3">.</span></span>
                </>
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
          onClick={() => setRunning(r => !r)}
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
