import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'jobs.db');

export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency & performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    company TEXT NOT NULL,
    logo TEXT NOT NULL,
    source TEXT NOT NULL,
    workMode TEXT NOT NULL,
    atsScore INTEGER NOT NULL,
    dateTime TEXT NOT NULL,
    location TEXT NOT NULL,
    salary TEXT NOT NULL,
    description TEXT NOT NULL,
    skills TEXT NOT NULL,
    applied INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
  CREATE INDEX IF NOT EXISTS idx_jobs_role ON jobs(role);
  CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
  CREATE INDEX IF NOT EXISTS idx_jobs_workMode ON jobs(workMode);
  CREATE INDEX IF NOT EXISTS idx_jobs_atsScore ON jobs(atsScore);
  CREATE INDEX IF NOT EXISTS idx_jobs_applied ON jobs(applied);

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    time TEXT NOT NULL,
    platform TEXT NOT NULL,
    iconType TEXT NOT NULL,
    text TEXT NOT NULL,
    countBadge TEXT,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profile (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    auth_provider TEXT DEFAULT 'google',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings_ai (
    id TEXT PRIMARY KEY,
    openai_key TEXT,
    openai_model TEXT DEFAULT 'gpt-4o',
    gemini_key TEXT,
    gemini_model TEXT DEFAULT 'gemini-1.5-pro',
    claude_key TEXT,
    claude_model TEXT DEFAULT 'claude-3-5-sonnet',
    mcp_servers TEXT,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings_menu (
    id TEXT PRIMARY KEY,
    items TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS feedback_tickets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    message TEXT NOT NULL,
    user_email TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pipelines (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    targetRoles TEXT NOT NULL,
    platforms TEXT NOT NULL,
    schedule TEXT NOT NULL,
    frequencyLabel TEXT NOT NULL,
    matchThreshold INTEGER DEFAULT 85,
    appliedCount INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    lastRun TEXT DEFAULT 'Just created',
    status TEXT DEFAULT 'ACTIVE',
    mode TEXT DEFAULT 'Auto-Apply',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS search_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT,
    company TEXT,
    source TEXT,
    results_count INTEGER,
    created_at INTEGER NOT NULL
  );
`);

// Ensure default empty AI settings exist
const existingSettings = db.prepare('SELECT id FROM settings_ai WHERE id = ?').get('default');
if (!existingSettings) {
  db.prepare(`
    INSERT INTO settings_ai (id, openai_key, openai_model, gemini_key, gemini_model, claude_key, claude_model, mcp_servers, updated_at)
    VALUES ('default', '', 'gpt-4o', '', 'gemini-1.5-pro', '', 'claude-3-5-sonnet', '[]', ?)
  `).run(Date.now());
}

// Ensure default clean blank profile exists
const existingProfile = db.prepare('SELECT id FROM profile WHERE id = ?').get('default');
if (!existingProfile) {
  const blankProfile = {
    general: {
      firstName: "",
      lastName: "",
      fullName: "",
      email: "",
      countryCode: "+91",
      phone: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India",
      bio: "",
      linkedinUrl: "",
      portfolioUrl: ""
    },
    contacts: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      links: ""
    },
    contactLinks: [],
    skillsList: [],
    primarySkill: "",
    experiences: [],
    educationList: [],
    screeningAnswers: [],
    languages: [],
    selectedRoles: [],
    selectedLevels: [],
    userLocation: "",
    desiredLocations: [],
    avoidCompanies: [],
    avoidSkills: [],
    avoidSources: [],
    summary: "",
    resume: null,
    avatar: "avatar_1"
  };
  db.prepare('INSERT INTO profile (id, data, updated_at) VALUES (?, ?, ?)')
    .run('default', JSON.stringify(blankProfile), Date.now());
}

// Ensure default menu navigation layout exists
const existingMenu = db.prepare('SELECT id FROM settings_menu WHERE id = ?').get('default');
if (!existingMenu) {
  const defaultMenu = [
    { id: "explore", label: "Explore", description: "Job Discovery Radar & Live ATS Feed", enabled: true },
    { id: "generation", label: "Generation", description: "AI Resume & Cover Letter Studio", enabled: true },
    { id: "automation", label: "Automation", description: "Autonomous Application Pipelines", enabled: true },
    { id: "profile", label: "Job Profile", description: "Candidate Identity & ATS Resume Data", enabled: true },
    { id: "analytics", label: "Analytics", description: "Application Metrics & Conversion Rates", enabled: true },
    { id: "tools", label: "Tools", description: "MCP Integrations & ATS Diagnostic Utilities", enabled: true }
  ];
  db.prepare('INSERT INTO settings_menu (id, items, updated_at) VALUES (?, ?, ?)')
    .run('default', JSON.stringify(defaultMenu), Date.now());
}
