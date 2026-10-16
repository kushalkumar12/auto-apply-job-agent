import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Earth,
  Pause,
  Play,
  AudioLines,
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  RotateCcw,
  CircleHelp,
  Sparkles,
  Scan
} from 'lucide-react';

const SOURCES = [
  {
    name: 'Google',
    mark: 'G',
    className: 'google',
    count: 64,
    detail: 'Google Careers',
    role: 'Product Designer',
    location: 'Mountain View · Hybrid'
  },
  {
    name: 'LinkedIn',
    mark: 'in',
    className: 'linkedin',
    count: 58,
    detail: 'LinkedIn Jobs',
    role: 'Senior UX Designer',
    location: 'Bengaluru · Hybrid'
  },
  {
    name: 'Indeed',
    mark: 'i',
    className: 'indeed',
    count: 42,
    detail: 'Indeed Jobs',
    role: 'Interaction Designer',
    location: 'Remote · Full-time'
  },
  {
    name: 'Apple',
    mark: '●',
    className: 'apple',
    count: 23,
    detail: 'Apple Careers',
    role: 'Human Interface Designer',
    location: 'Cupertino · On-site'
  },
  {
    name: 'Naukri',
    mark: 'n',
    className: 'naukri',
    count: 23,
    detail: 'Naukri Jobs',
    role: 'Visual Designer',
    location: 'Bengaluru · Full-time'
  }
];

function Button({
  variant = 'default',
  size = 'default',
  className = '',
  children,
  onClick,
  ...props
}) {
  const variantClass = {
    default: 'ui-button-default',
    outline: 'ui-button-outline',
    ghost: 'ui-button-ghost',
    secondary: 'ui-button-secondary',
    destructive: 'ui-button-destructive',
    link: 'ui-button-link'
  }[variant] || 'ui-button-default';

  const sizeClass = {
    default: 'ui-button-size-default',
    sm: 'ui-button-size-sm',
    lg: 'ui-button-size-lg',
    icon: 'ui-button-size-icon'
  }[size] || 'ui-button-size-default';

  return (
    <button
      className={`ui-button ${variantClass} ${sizeClass} ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

function SourceMark({ source }) {
  if (source.className === 'apple') {
    return (
      <span className="source-mark apple">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.6 12.8c0-2 1.7-3 1.8-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.2-2.6.8-3.3.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.6 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1 1.6 2.1 2.7 2 1.1 0 1.5-.7 2.9-.7s1.8.7 3 .7c1.2 0 1.9-1 2.6-2 .9-1.2 1.2-2.4 1.2-2.5-.1 0-2.5-1-2.5-3.9ZM15.4 6.7c.6-.8 1.1-1.9 1-3-.9.1-2 .6-2.7 1.4-.6.7-1.2 1.8-1.1 2.8 1 .1 2.1-.5 2.8-1.2Z" />
        </svg>
      </span>
    );
  }

  return (
    <span className={`source-mark ${source.className}`}>
      {source.mark}
    </span>
  );
}

function AttractionCanvas({ running, speed, onCapture }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ running, speed, onCapture });

  useEffect(() => {
    stateRef.current = { running, speed, onCapture };
  }, [running, speed, onCapture]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const computedStyle = getComputedStyle(canvas);
    const fieldInk = computedStyle.getPropertyValue('--field-ink').trim() || '#d6d9d7';
    const fieldGlow = computedStyle.getPropertyValue('--field-glow').trim() || '#f2f4f2';

    let width = 0;
    let height = 0;
    let animTime = 0;
    let lastTime = 0;
    let lastCapture = 0;
    let animId = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const floatingElements = Array.from(canvas.parentElement?.querySelectorAll('.floating-source') ?? []);

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

      const centerX = width / 2;
      const centerY = height * 0.47;
      const centerRadius = width < 600 ? 78 : 106;
      const outerRadius = Math.max(width * 0.52, height * 0.8);
      const waveAmplitude = width < 600 ? 10 : 15;

      const wavePhase = (x, y) => Math.hypot(x - centerX, (y - centerY) / 0.79) * 0.025 + animTime * 1.9;
      const waveDisplacement = (x, y) => prefersReducedMotion ? 0 : Math.sin(wavePhase(x, y)) * waveAmplitude;

      floatingElements.forEach((el, index) => {
        const originX = el.offsetLeft + el.offsetWidth / 2;
        const originY = el.offsetTop + el.offsetHeight / 2;
        const offsetX = originX - centerX;
        const offsetY = originY - centerY;
        const buttonRadius = Math.max(el.offsetWidth, el.offsetHeight) / 2 + waveAmplitude + 24;

        const factorX = Math.abs(offsetX) > 0.001 ? (width / 2 + buttonRadius) / Math.abs(offsetX) : Infinity;
        const factorY = Math.abs(offsetY) > 0.001 ? ((offsetY < 0 ? centerY : height - centerY) + buttonRadius) / Math.abs(offsetY) : Infinity;
        const minFactor = Math.min(factorX, factorY);

        const edgeX = centerX + offsetX * minFactor;
        const edgeY = centerY + offsetY * minFactor;

        const localTime = Math.max(0, animTime - index * 1.8);
        const curveProgress = (prefersReducedMotion ? 0 : (localTime % 14) / 14) ** 1.35;

        const transX = prefersReducedMotion ? 0 : edgeX + (centerX - edgeX) * curveProgress - originX;
        const transY = prefersReducedMotion ? 0 : edgeY + (centerY - edgeY) * curveProgress - originY;

        const phase = wavePhase(originX + transX, originY + transY);
        const waveY = waveDisplacement(originX + transX, originY + transY) * (1 - curveProgress);
        const waveX = prefersReducedMotion ? 0 : Math.cos(phase) * 2;
        const rotation = prefersReducedMotion ? 0 : Math.cos(phase) * 1.4 * (originX < centerX ? -1 : 1);
        const scale = 1 - curveProgress * 0.8;

        el.style.transform = `translate(${transX + waveX}px, ${transY + waveY}px) rotate(${rotation}deg) scale(${scale})`;
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        el.style.zIndex = '1';
        el.style.pointerEvents = (!prefersReducedMotion && Math.hypot(originX + transX - centerX, originY + transY - centerY) < centerRadius) ? 'none' : '';
      });

      // Canvas background dot grid
      ctx.fillStyle = fieldInk;
      const step = width < 600 ? 15 : 17;
      for (let y = 13; y < height; y += step) {
        for (let x = 13; x < width; x += step) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.hypot(dx, dy);
          if (dist < centerRadius + 14) continue;

          const sinVal = Math.sin(wavePhase(x, y));
          const decay = Math.exp(-dist / (outerRadius * 0.55));
          const push = sinVal * 8 * decay;
          const px = x + (dx / dist) * push;
          const py = y + waveDisplacement(x, y);

          ctx.globalAlpha = 0.13 + (sinVal + 1) * 0.075 * decay;
          ctx.beginPath();
          ctx.arc(px, py, 0.85 + decay * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Concentric wave lines (7 wave ripples, 3 layered strokes each)
      ctx.strokeStyle = fieldGlow;
      for (let w = 0; w < 7; w++) {
        const norm = ((w / 7) + animTime * 0.085) % 1;
        const currentRadius = centerRadius + 13 + ((1 - norm) ** 1.8) * outerRadius;
        const alpha = Math.sin(norm * Math.PI) * 0.18;

        for (let layer = 0; layer < 3; layer++) {
          ctx.globalAlpha = alpha / (layer + 1);
          ctx.lineWidth = layer === 0 ? 1.2 : 5 + layer * 6;
          ctx.beginPath();
          for (let stepIdx = 0; stepIdx <= 160; stepIdx++) {
            const angle = (stepIdx / 160) * Math.PI * 2;
            const radiusPerturb = currentRadius + (Math.sin(angle * 3 + animTime * 0.35 + w) * 8 + Math.cos(angle * 5 - animTime * 0.2) * 4) * Math.sin(norm * Math.PI);
            const px = centerX + Math.cos(angle) * radiusPerturb;
            const pyBase = centerY + Math.sin(angle) * radiusPerturb * 0.79;
            const py = pyBase + waveDisplacement(px, pyBase);

            if (stepIdx === 0) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.closePath();
          ctx.stroke();
        }
      }

      // Inward stream particles (65 particles with directional velocity tail)
      for (let p = 0; p < 65; p++) {
        const norm = (p * 0.618033 + animTime * (0.05 + (p % 4) * 0.007)) % 1;
        const angle = p * 2.39996 + norm * 0.65;
        const radius = centerRadius + 10 + ((1 - norm) ** 1.65) * outerRadius;
        const px = centerX + Math.cos(angle) * radius;
        const pyBase = centerY + Math.sin(angle) * radius * 0.79;
        const py = pyBase + waveDisplacement(px, pyBase);

        ctx.globalAlpha = Math.sin(norm * Math.PI) * (p % 4 === 0 ? 0.9 : 0.4);
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

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      floatingElements.forEach(el => {
        el.style.transform = '';
        el.style.opacity = '';
        el.style.visibility = '';
        el.style.pointerEvents = '';
        el.style.zIndex = '';
      });
    };
  }, []);

  return <canvas ref={canvasRef} className="attraction-canvas" aria-hidden="true" />;
}

export default function App() {
  const [running, setRunning] = useState(true);
  const [foundCount, setFoundCount] = useState(210);
  const [speed, setSpeed] = useState(1);
  const [selectedSource, setSelectedSource] = useState(null);
  const [showConceptNote, setShowConceptNote] = useState(false);

  const onCapture = useCallback(() => {
    setFoundCount(c => c + 1);
  }, []);

  const selected = SOURCES.find(s => s.name === selectedSource);

  return (
    <main className="orbit-app">
      {/* App Header */}
      <header className="app-header">
        <a href="/" className="wordmark" aria-label="Orbit home">
          <span className="orbit-symbol">
            <span></span>
          </span>
          orbit
          <span className="brand-dot">.</span>
        </a>

        <div className="header-center">
          <span className="status-dot"></span> JOB DISCOVERY NETWORK
        </div>

        <span className="concept-tag">
          INTERACTIVE CONCEPT <span>01</span>
        </span>
      </header>

      {/* Discovery Section */}
      <section className="discovery-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <span></span> OPPORTUNITIES, IN ORBIT
            </div>
            <h1>
              Your next move.<br />
              <span>Already out there.</span>
            </h1>
          </div>
          <div className="heading-aside">
            <p>One orbit. Every opportunity.</p>
            <span>Across the web, drawn to you.</span>
          </div>
        </div>

        {/* Main Radar / Convergence Scene */}
        <div className={`radar-scene ${running ? 'is-running' : 'is-paused'}`}>
          <AttractionCanvas
            running={running}
            speed={speed}
            onCapture={onCapture}
          />

          <div className="scene-topline">
            <span>
              <Radio size={13} />
              <span className="status-dot"></span>
              {running ? 'NETWORK ACTIVE' : 'NETWORK PAUSED'}
            </span>
            <span>
              GLOBAL SCAN <Earth size={13} />
            </span>
          </div>

          {/* Floating Source Badges (Drawn towards center orbit) */}
          {SOURCES.map((source, index) => (
            <button
              key={source.name}
              className={`ui-button ui-button-outline ui-button-size-default floating-source source-${index} ${selectedSource === source.name ? 'source-selected' : ''}`}
              onClick={() => setSelectedSource(selectedSource === source.name ? null : source.name)}
              aria-label={`View ${source.name} source`}
            >
              <SourceMark source={source} />
              <span>{source.name}</span>
              <span className="source-signal"></span>
            </button>
          ))}

          {/* Center Orbit Collector */}
          <div className="collector">
            <div className="collector-outer">
              <div className="collector-inner">
                <span className="collector-caption">YOUR ORBIT</span>
                <span className="found-count">{foundCount}</span>
                <span className="found-label">opportunities found</span>
                <span className="collector-status">
                  <span className="status-dot"></span>
                  {running ? 'Attracting' : 'Paused'}
                </span>
              </div>
            </div>
          </div>

          {/* Discovery Pause/Resume Control */}
          <div className="collector-command">
            <Button
              className="scan-button"
              variant="outline"
              onClick={() => setRunning(r => !r)}
            >
              {running ? <Pause size={13} /> : <Play size={13} />}
              {running ? 'Pause discovery' : 'Start discovery'}
            </Button>
          </div>

          <div className="scene-bottomline">
            <span>
              <span className="tiny-cross">+</span>{' '}
              {selected ? `${selected.detail} · ${selected.count} sample matches` : '5 SOURCES CONNECTED'}
            </span>
            <span>
              <AudioLines size={14} /> INWARD SIGNAL FLOW
            </span>
          </div>

          <span className="scene-corner">
            <ArrowDownLeft size={22} />
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="radar-toolbar">
          <div className="toolbar-state">
            <span className={`status-dot ${running ? '' : 'inactive'}`}></span>
            <span>{running ? 'Discovery in progress' : 'Discovery paused'}</span>
            <span className="demo-label">DEMO NETWORK</span>
          </div>

          <div className="toolbar-actions">
            <span className="speed-label">SCAN SPEED</span>
            <Button
              variant="ghost"
              className="speed-button"
              onClick={() => setSpeed(s => (s === 1 ? 2 : s === 2 ? 0.5 : 1))}
              title="Change scan speed"
            >
              <Zap size={14} />
              {speed}×
            </Button>
            <span className="toolbar-divider"></span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Reset discovery"
              title="Reset discovery"
              onClick={() => {
                setFoundCount(210);
                setSelectedSource(null);
                setSpeed(1);
              }}
            >
              <RotateCcw size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="About this concept"
              title="About this concept"
              onClick={() => setShowConceptNote(n => !n)}
            >
              <CircleHelp size={16} />
            </Button>
          </div>
        </div>

        {/* Concept Explainer Note */}
        {showConceptNote && (
          <div className="concept-note">
            <Sparkles size={16} />
            <p>This is a visual discovery concept. Counts and opportunities are simulated; no live job platforms are connected.</p>
            <Button variant="ghost" size="sm" onClick={() => setShowConceptNote(false)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Connected Sources List / Detail */}
        <section className="sources-section">
          <div className="sources-heading">
            <h2>{selected ? `${selected.name} in your orbit` : 'Connected to possibility.'}</h2>
            <span>
              {selected ? 'SAMPLE OPPORTUNITY' : 'THE SOURCE NETWORK'}{' '}
              <ArrowUpRight size={14} />
            </span>
          </div>

          {selected ? (
            <div className="source-detail">
              <SourceMark source={selected} />
              <div>
                <h3>{selected.role}</h3>
                <p>{selected.location}</p>
              </div>
              <span className="sample-label">SAMPLE MATCH</span>
              <Button variant="ghost" onClick={() => setSelectedSource(null)}>
                All sources <ArrowUpRight size={14} />
              </Button>
            </div>
          ) : (
            <div className="source-list">
              {SOURCES.map((source) => (
                <Button
                  key={source.name}
                  variant="ghost"
                  className="source-item"
                  onClick={() => setSelectedSource(source.name)}
                >
                  <SourceMark source={source} />
                  <div>
                    <span className="source-item-name">{source.name}</span>
                    <span className="source-item-sub">{source.count} opportunities</span>
                  </div>
                  <span className="source-online"></span>
                  <ArrowUpRight size={14} />
                </Button>
              ))}
            </div>
          )}
        </section>
      </section>

      {/* App Footer */}
      <footer className="app-footer">
        <span>
          <Scan size={13} /> A WIDER WORLD. A CLOSER MATCH.
        </span>
        <span>
          ORBIT / DISCOVERY ENGINE <span className="footer-version">V.01</span>
        </span>
      </footer>
    </main>
  );
}
