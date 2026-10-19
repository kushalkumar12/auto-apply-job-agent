import React from 'react';
import { Building2, MoreHorizontal, Check, Globe, Cpu } from 'lucide-react';

export function PlatformIcon({ type, size = 18 }) {
  switch (type) {
    case 'linkedin':
      return (
        <span className="brand-badge brand-linkedin" style={{ width: size, height: size }}>
          in
        </span>
      );
    case 'naukri':
      return (
        <span className="brand-badge brand-naukri" style={{ width: size, height: size }}>
          <svg width={size - 6} height={size - 6} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5h-2v-9h2v9zm6 0h-2v-4.5c0-1.1-.9-2-2-2s-2 .9-2 2v4.5h-2v-9h2v1.2c.7-.8 1.8-1.4 3-1.4 2.2 0 4 1.8 4 4.2v5z"/>
          </svg>
        </span>
      );
    case 'indeed':
      return (
        <span className="brand-badge brand-indeed" style={{ width: size, height: size }}>
          i
        </span>
      );
    case 'instahyre':
      return (
        <span className="brand-badge brand-instahyre" style={{ width: size, height: size }}>
          H
        </span>
      );
    case 'foundit':
      return (
        <span className="brand-badge brand-foundit" style={{ width: size, height: size }}>
          <svg width={size - 4} height={size - 4} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M12 2C6.5 2 2 6.5 2 12c0 3.5 1.8 6.5 4.5 8.2"/>
            <path d="M12 6c3.3 0 6 2.7 6 6 0 2-1 3.7-2.5 4.7"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
          </svg>
        </span>
      );
    case 'building':
    case 'company':
      return (
        <span className="brand-badge brand-company" style={{ width: size, height: size }}>
          <Building2 size={size - 4} strokeWidth={2} />
        </span>
      );
    case 'angellist':
      return (
        <span className="brand-badge brand-angellist" style={{ width: size, height: size }}>
          ✌
        </span>
      );
    case 'wellfound':
      return (
        <span className="brand-badge brand-wellfound" style={{ width: size, height: size }}>
          W
        </span>
      );
    case 'cutshort':
      return (
        <span className="brand-badge brand-cutshort" style={{ width: size, height: size }}>
          C
        </span>
      );
    case 'others':
      return (
        <span className="brand-badge brand-others" style={{ width: size, height: size }}>
          <MoreHorizontal size={size - 4} strokeWidth={2.5} />
        </span>
      );
    case 'check':
      return (
        <span className="brand-badge brand-check" style={{ width: size, height: size }}>
          <Check size={size - 5} strokeWidth={3} />
        </span>
      );
    case 'amazon':
      return (
        <span className="brand-badge brand-amazon-badge" style={{ width: size, height: size }}>
          a
        </span>
      );
    case 'google':
      return (
        <span className="brand-badge" style={{ width: size, height: size, background: '#fff', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontWeight: 800, color: '#4285F4', fontSize: '11px' }}>G</span>
        </span>
      );
    case 'microsoft':
      return (
        <span className="brand-badge" style={{ width: size, height: size, background: '#fff', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontWeight: 800, color: '#00A4EF', fontSize: '11px' }}>M</span>
        </span>
      );
    case 'harvester':
    case 'bot':
    case 'system':
      return (
        <span className="brand-badge" style={{ width: size, height: size, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Cpu size={size - 5} />
        </span>
      );
    case 'greenhouse':
      return (
        <span className="brand-badge" style={{ width: size, height: size, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800, fontSize: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          GH
        </span>
      );
    case 'ashby':
      return (
        <span className="brand-badge" style={{ width: size, height: size, background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', fontWeight: 800, fontSize: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          AS
        </span>
      );
    case 'lever':
      return (
        <span className="brand-badge" style={{ width: size, height: size, background: 'rgba(14, 165, 233, 0.15)', color: '#0284c7', fontWeight: 800, fontSize: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          LV
        </span>
      );
    case 'remoteok':
    case 'remotive':
      return (
        <span className="brand-badge" style={{ width: size, height: size, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', fontWeight: 800, fontSize: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          RO
        </span>
      );
    default:
      return (
        <span className="brand-badge" style={{ width: size, height: size }}>
          <Globe size={size - 4} />
        </span>
      );
  }
}

export function CompanyLogo({ name }) {
  switch (name?.toLowerCase()) {
    case 'figma':
      return (
        <span className="co-logo-circle" title="Figma" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 38 57" fill="none">
            <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
            <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
            <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
            <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
            <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
          </svg>
        </span>
      );
    case 'linear':
      return (
        <span className="co-logo-circle" title="Linear" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#5E6AD2', borderRadius: '4px', width: 18, height: 18 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4" y1="20" x2="20" y2="4" />
            <line x1="10" y1="20" x2="20" y2="10" />
          </svg>
        </span>
      );
    case 'cloudflare':
      return (
        <span className="co-logo-circle" title="Cloudflare" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="#F38020">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
          </svg>
        </span>
      );
    case 'gitlab':
      return (
        <span className="co-logo-circle" title="GitLab" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#FC6D26">
            <path d="m23.6 9.6-1.5-4.6c-.2-.5-.8-.8-1.3-.4l-1.3 1-3.6-11c-.2-.6-.9-.6-1.1 0L12 14.8 7.3.6c-.2-.6-.9-.6-1.1 0L2.6 11.6l-1.3-1c-.5-.4-1.1-.1-1.3.4L-.4 15.6c-.2.5 0 1.1.4 1.4L12 24.2l12-7.2c.4-.3.6-.9.4-1.4z"/>
          </svg>
        </span>
      );
    case 'google':
      return (
        <span className="co-logo-circle" title="Google">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
        </span>
      );
    case 'microsoft':
      return (
        <span className="co-logo-circle" title="Microsoft">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
            <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
            <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
            <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
          </svg>
        </span>
      );
    case 'amazon':
      return (
        <span className="co-logo-circle" title="Amazon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12.9 14.5c-2.4 0-3.6-1.2-3.6-3.2 0-2.3 1.8-3.5 4.5-3.5 1.1 0 2 .2 2.6.5v-.5c0-1.4-.9-2.1-2.5-2.1-1.2 0-2.3.3-3.1.8l-.6-1.5c1.1-.6 2.5-.9 4.1-.9 3 0 4.6 1.4 4.6 4v7.4h-2.1v-1.6c-.8 1.1-2.1 1.6-3.9 1.6zm.5-1.7c1.6 0 2.8-.9 3.2-2.1v-1.4c-.6-.3-1.4-.4-2.3-.4-1.7 0-2.8.7-2.8 2 0 1.2.7 1.9 1.9 1.9z"/>
            <path fill="#FF9900" d="M4 19.5c4.7 2.3 10.9 2.2 15.6-.8.4-.3.2-.8-.3-.6-4.2 2-9.9 2-14.8-.2-.5-.2-.8.3-.5.6z"/>
            <path fill="#FF9900" d="M20.2 17.5c-.3-.4-1.8-.2-2.7 0-.3.1-.2.4.1.4.8.1 1.7.2 2.2.6.2.2.5.1.5-.1.1-.3 0-.6-.1-.9z"/>
          </svg>
        </span>
      );
    case 'apple':
      return (
        <span className="co-logo-circle co-logo-apple" title="Apple" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 170 170" fill="currentColor">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.85-11.97-14.42-6.1-9.35-10.86-20.3-14.28-32.86-3.42-12.55-5.13-24.36-5.13-35.42 0-14.34 3.73-26.31 11.19-35.91 7.46-9.6 16.79-14.48 27.99-14.65 4.57 0 9.77 1.25 15.61 3.75 5.83 2.5 9.77 3.75 11.82 3.75 1.74 0 5.86-1.3 12.37-3.9 6.51-2.6 11.98-3.79 16.4-3.57 12.39.65 22.39 5.38 30 14.19-10.88 6.53-16.19 15.61-15.93 27.24.26 9.14 3.75 16.96 10.47 23.47 6.72 6.51 14.73 10.28 24.03 11.31-2.4 7.4-5.35 14.79-8.86 22.18zM119.22 31.84c0-7.18 2.58-13.97 7.74-20.38 5.16-6.41 11.45-10.44 18.88-12.1-1.09 7.4-3.8 14.07-8.15 20.02-4.35 5.95-10.49 10.14-18.47 12.46z"/>
          </svg>
        </span>
      );
    case 'spotify':
      return (
        <span className="co-logo-circle co-logo-spotify" title="Spotify" style={{ background: '#1DB954', color: '#000000', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </span>
      );
    case 'uber':
      return (
        <span className="co-logo-circle co-logo-uber" title="Uber" style={{ background: '#000000', color: '#FFFFFF', borderRadius: '4px', border: '1px solid #475569', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '9px', letterSpacing: '-0.3px' }}>Uber</span>
        </span>
      );
    case 'stripe':
      return (
        <span className="co-logo-circle co-logo-stripe" title="Stripe" style={{ background: '#635BFF', color: '#FFFFFF', borderRadius: '4px', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '12px' }}>S</span>
        </span>
      );
    case 'meta':
      return (
        <span className="co-logo-circle" title="Meta">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#0668E1">
            <path d="M16.9 3.4c-2.1 0-4 1.1-5.1 2.8-1.1-1.7-3-2.8-5.1-2.8C2.9 3.4 0 6.6 0 11.2c0 5.4 3.7 9.4 6.8 9.4 2.2 0 3.9-1.2 4.9-2.7 1 1.5 2.7 2.7 4.9 2.7 3.1 0 6.8-4 6.8-9.4 0-4.6-2.9-7.8-6.5-7.8zm.2 14.8c-1.8 0-3.3-1.4-4.2-3.4-.6-1.3-.9-2.8-.9-3.6 0-.3 0-.5.1-.7.7-2.3 2.5-4.1 4.7-4.1 2 0 3.7 1.9 3.7 5.4.3 3.9-1.6 6.4-3.4 6.4zm-10.4 0c-1.8 0-3.7-2.5-3.4-6.4 0-3.5 1.7-5.4 3.7-5.4 2.2 0 4 1.8 4.7 4.1.1.2.1.4.1.7 0 .8-.3 2.3-.9 3.6-.9 2-2.4 3.4-4.2 3.4z"/>
          </svg>
        </span>
      );
    case 'netflix':
      return (
        <span className="co-logo-circle" title="Netflix">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#E50914" d="M5.4 0h3.2v24H5.4z"/>
            <path fill="#E50914" d="M15.4 0h3.2v24h-3.2z"/>
            <path fill="#B81D24" d="M5.4 0h3.5l9.7 24h-3.5L5.4 0z"/>
          </svg>
        </span>
      );
    case 'adobe':
      return (
        <span className="co-logo-circle" title="Adobe">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#FA0F00" d="M14.7 2h7.8v20L14.7 2zm-5.4 0H1.5v20L9.3 2zm2.7 8.3L16 22h-3.5l-1.9-5.1h-2.9l3.4-6.6z"/>
          </svg>
        </span>
      );
    case 'openai':
      return (
        <span className="co-logo-circle" title="OpenAI" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.6669zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
          </svg>
        </span>
      );
    case 'ibm':
      return (
        <span className="co-logo-circle" title="IBM" style={{ fontWeight: 800, color: '#0F62FE', letterSpacing: '-0.5px', fontSize: '13px' }}>
          IBM
        </span>
      );
    case 'infosys':
      return (
        <span className="co-logo-circle" title="Infosys" style={{ fontWeight: 600, color: '#0070AD', fontSize: '11px', letterSpacing: '-0.3px' }}>
          Infosys
        </span>
      );
    case 'oracle':
      return (
        <span className="co-logo-circle" title="Oracle">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#F80000" d="M16.5 4.5h-9C3.4 4.5 0 7.9 0 12s3.4 7.5 7.5 7.5h9c4.1 0 7.5-3.4 7.5-7.5s-3.4-7.5-7.5-7.5zm-.4 11.8H7.9C5.5 16.3 3.5 14.4 3.5 12s2-4.3 4.4-4.3h8.2c2.4 0 4.4 1.9 4.4 4.3s-2 4.3-4.4 4.3z"/>
          </svg>
        </span>
      );
    default:
      return (
        <span className="co-logo-circle co-logo-fallback" style={{ background: 'var(--rp-surface-hover, #F0F3F1)', color: 'var(--rp-text-dominant, #171A18)', border: '1px solid var(--rp-secondary-divider, #DDE2DE)', borderRadius: '4px', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {name?.charAt(0) || 'C'}
        </span>
      );
  }
}

