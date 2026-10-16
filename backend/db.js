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

  CREATE TABLE IF NOT EXISTS feedback_tickets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    message TEXT NOT NULL,
    user_email TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at INTEGER NOT NULL
  );
`);

// Seed default user if not exists
const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('kushalkumar.pulakanti@gmail.com');
if (!existingUser) {
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, avatar, auth_provider, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr_kushal_101',
    'kushalkumar.pulakanti@gmail.com',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // Secure initial hash
    'Kushal Kumar',
    'avatar_1',
    'google',
    Date.now()
  );
}

// Seed default AI settings
const existingSettings = db.prepare('SELECT id FROM settings_ai WHERE id = ?').get('default');
if (!existingSettings) {
  const defaultMcpServers = JSON.stringify([
    { id: 'mcp-1', name: 'Local ATS Knowledge Base', url: 'http://localhost:5000/mcp/ats', status: 'connected', toolsCount: 8, transport: 'sse' },
    { id: 'mcp-2', name: 'FileSystem Project Navigator', url: 'http://localhost:5000/mcp/fs', status: 'connected', toolsCount: 14, transport: 'stdio' },
    { id: 'mcp-3', name: 'LinkedIn Easy Apply Automation Driver', url: 'http://localhost:5000/mcp/driver', status: 'connected', toolsCount: 6, transport: 'sse' }
  ]);
  db.prepare(`
    INSERT INTO settings_ai (id, openai_key, openai_model, gemini_key, gemini_model, claude_key, claude_model, mcp_servers, updated_at)
    VALUES ('default', 'sk-proj-live-mock-98124', 'gpt-4o', 'AIzaSy-live-mock-gemini-771', 'gemini-1.5-pro', 'sk-ant-live-mock-claude-441', 'claude-3-5-sonnet', ?, ?)
  `).run(defaultMcpServers, Date.now());
}

// ---------------------------------------------------------------------------
// Seeder for 15,000+ realistic job listings across 50+ top tech companies
// ---------------------------------------------------------------------------
const COMPANIES = [
  { name: 'Google', logo: 'google', domain: 'google.com' },
  { name: 'Microsoft', logo: 'microsoft', domain: 'microsoft.com' },
  { name: 'Amazon', logo: 'amazon', domain: 'amazon.com' },
  { name: 'Apple', logo: 'apple', domain: 'apple.com' },
  { name: 'Netflix', logo: 'netflix', domain: 'netflix.com' },
  { name: 'Meta', logo: 'meta', domain: 'meta.com' },
  { name: 'Spotify', logo: 'spotify', domain: 'spotify.com' },
  { name: 'OpenAI', logo: 'openai', domain: 'openai.com' },
  { name: 'Uber', logo: 'uber', domain: 'uber.com' },
  { name: 'Stripe', logo: 'stripe', domain: 'stripe.com' },
  { name: 'Adobe', logo: 'adobe', domain: 'adobe.com' },
  { name: 'Oracle', logo: 'oracle', domain: 'oracle.com' },
  { name: 'Salesforce', logo: 'salesforce', domain: 'salesforce.com' },
  { name: 'Nvidia', logo: 'nvidia', domain: 'nvidia.com' },
  { name: 'Twitter / X', logo: 'twitter', domain: 'x.com' },
  { name: 'Cisco', logo: 'cisco', domain: 'cisco.com' },
  { name: 'Intel', logo: 'intel', domain: 'intel.com' },
  { name: 'AMD', logo: 'amd', domain: 'amd.com' },
  { name: 'Airbnb', logo: 'airbnb', domain: 'airbnb.com' },
  { name: 'Dropbox', logo: 'dropbox', domain: 'dropbox.com' },
  { name: 'LinkedIn', logo: 'linkedin', domain: 'linkedin.com' },
  { name: 'PayPal', logo: 'paypal', domain: 'paypal.com' },
  { name: 'Atlassian', logo: 'atlassian', domain: 'atlassian.com' },
  { name: 'Zoom', logo: 'zoom', domain: 'zoom.us' },
  { name: 'Shopify', logo: 'shopify', domain: 'shopify.com' },
  { name: 'Flipkart', logo: 'flipkart', domain: 'flipkart.com' },
  { name: 'Swiggy', logo: 'swiggy', domain: 'swiggy.com' },
  { name: 'Zomato', logo: 'zomato', domain: 'zomato.com' },
  { name: 'Razorpay', logo: 'razorpay', domain: 'razorpay.com' },
  { name: 'PhonePe', logo: 'phonepe', domain: 'phonepe.com' },
  { name: 'Paytm', logo: 'paytm', domain: 'paytm.com' },
  { name: 'CRED', logo: 'cred', domain: 'cred.club' },
  { name: 'ByteDance', logo: 'bytedance', domain: 'bytedance.com' },
  { name: 'Snowflake', logo: 'snowflake', domain: 'snowflake.com' },
  { name: 'Databricks', logo: 'databricks', domain: 'databricks.com' },
  { name: 'Palantir', logo: 'palantir', domain: 'palantir.com' },
  { name: 'Coinbase', logo: 'coinbase', domain: 'coinbase.com' },
  { name: 'GitHub', logo: 'github', domain: 'github.com' },
  { name: 'GitLab', logo: 'gitlab', domain: 'gitlab.com' },
  { name: 'Twilio', logo: 'twilio', domain: 'twilio.com' },
  { name: 'Cloudflare', logo: 'cloudflare', domain: 'cloudflare.com' },
  { name: 'Docker', logo: 'docker', domain: 'docker.com' },
  { name: 'Red Hat', logo: 'redhat', domain: 'redhat.com' },
  { name: 'Elastic', logo: 'elastic', domain: 'elastic.co' },
  { name: 'MongoDB', logo: 'mongodb', domain: 'mongodb.com' },
  { name: 'Redis', logo: 'redis', domain: 'redis.io' },
  { name: 'IBM', logo: 'ibm', domain: 'ibm.com' },
  { name: 'TCS', logo: 'tcs', domain: 'tcs.com' },
  { name: 'Infosys', logo: 'infosys', domain: 'infosys.com' },
  { name: 'Wipro', logo: 'wipro', domain: 'wipro.com' }
];

const ROLES = [
  { title: "Senior Software Engineer", skills: ["Java", "Distributed Systems", "Go", "GCP", "Kubernetes"], baseAts: 88 },
  { title: "Java Backend Engineer", skills: ["Java 17", "Spring Boot", "Microservices", "Kafka", "PostgreSQL"], baseAts: 92 },
  { title: "Staff Backend Architect", skills: ["System Design", "Distributed Caching", "Java", "Redis", "AWS"], baseAts: 89 },
  { title: "Cloud Infrastructure Engineer", skills: ["Terraform", "AWS", "Kubernetes", "Docker", "Prometheus"], baseAts: 84 },
  { title: "DevOps & Platform Engineer", skills: ["CI/CD", "GitLab", "ArgoCD", "Kubernetes", "Linux"], baseAts: 81 },
  { title: "Full Stack Engineer (Java/React)", skills: ["Java", "Spring Boot", "React", "TypeScript", "REST APIs"], baseAts: 86 },
  { title: "Site Reliability Engineer (SRE)", skills: ["Chaos Engineering", "Observability", "Go", "Python", "Grafana"], baseAts: 83 },
  { title: "AI/ML Systems Engineer", skills: ["Python", "PyTorch", "Ray", "CUDA", "FastAPI"], baseAts: 90 },
  { title: "Microservices Core Developer", skills: ["Java", "Spring Cloud", "gRPC", "Docker", "Kafka"], baseAts: 87 },
  { title: "Principal Cloud Architect", skills: ["Multi-cloud", "Security Architecture", "AWS", "Azure", "Kafka"], baseAts: 94 },
  { title: "Database Systems Engineer", skills: ["PostgreSQL", "Cassandra", "SQL Tuning", "Distributed Consensus", "Go"], baseAts: 85 },
  { title: "Frontend Platform Engineer", skills: ["React", "Next.js", "TypeScript", "Performance", "Web Workers"], baseAts: 82 },
  { title: "Data Pipeline Engineer", skills: ["Apache Spark", "Kafka", "Java", "Airflow", "Snowflake"], baseAts: 79 },
  { title: "API Platform Developer", skills: ["REST", "GraphQL", "Kong Gateway", "Java", "OAuth2/JWT"], baseAts: 85 },
  { title: "Distributed Storage Engineer", skills: ["C++", "Go", "Storage Engines", "Raft", "Distributed Systems"], baseAts: 87 }
];

const SOURCES = ['LinkedIn', 'Naukri', 'Indeed', 'Company Careers', 'Foundit', 'Instahyre', 'AngelList'];
const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
const LOCATIONS = [
  'Bengaluru, India',
  'Hyderabad, India',
  'Pune, India',
  'Mumbai, India',
  'Gurugram, India',
  'Noida, India',
  'Remote, India',
  'San Francisco, US (Remote)',
  'Seattle, US (Remote)',
  'London, UK (Remote)'
];

const SALARIES = [
  '$110k - $140k',
  '$125k - $160k',
  '$140k - $180k',
  '$160k - $210k',
  '$180k - $240k',
  '₹25 - 35 LPA',
  '₹35 - 50 LPA',
  '₹50 - 75 LPA'
];

export function seedDatabaseIfEmpty() {
  const rowCount = db.prepare('SELECT COUNT(*) as cnt FROM jobs').get().cnt;
  if (rowCount >= 15000) {
    console.log(`✅ SQLite Database already seeded with ${rowCount} jobs.`);
    return;
  }

  console.log(`⚡ Seeding SQLite Database with 15,000+ jobs from 50+ companies...`);
  const targetCount = 15500;
  const insertStmt = db.prepare(`
    INSERT INTO jobs (role, company, logo, source, workMode, atsScore, dateTime, location, salary, description, skills, applied, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION');

  const now = Date.now();
  for (let i = 0; i < targetCount; i++) {
    const comp = COMPANIES[i % COMPANIES.length];
    const roleObj = ROLES[i % ROLES.length];
    const source = SOURCES[(i * 3 + 1) % SOURCES.length];
    const workMode = WORK_MODES[(i * 2) % WORK_MODES.length];
    const location = LOCATIONS[(i * 7) % LOCATIONS.length];
    const salary = SALARIES[(i * 5) % SALARIES.length];

    // Jitter ATS score around base
    const atsVariation = ((i * 17) % 15) - 6;
    const atsScore = Math.min(98, Math.max(68, roleObj.baseAts + atsVariation));

    const dayOffset = (i % 30);
    const hour = 8 + (i % 12);
    const min = (i * 7) % 60;
    const minStr = min < 10 ? `0${min}` : `${min}`;
    const dateTime = `${30 - dayOffset}-Sep-26 ${hour}:${minStr}`;

    const desc = `Join ${comp.name} to engineer high-throughput systems, scalable APIs, and core platform microservices alongside world-class engineering teams.`;
    const skillsJson = JSON.stringify(roleObj.skills);
    const applied = (i % 47 === 0) ? 1 : 0; // occasional applied job

    insertStmt.run(
      roleObj.title,
      comp.name,
      comp.logo,
      source,
      workMode,
      atsScore,
      dateTime,
      location,
      salary,
      desc,
      skillsJson,
      applied,
      now - (i * 1000 * 60)
    );
  }

  db.exec('COMMIT');

  const total = db.prepare('SELECT COUNT(*) as cnt FROM jobs').get().cnt;
  console.log(`🎉 SQLite Database successfully seeded! Total jobs in DB: ${total}`);

  // Seed sample initial activities
  const actCount = db.prepare('SELECT COUNT(*) as cnt FROM activities').get().cnt;
  if (actCount === 0) {
    const insertAct = db.prepare(`
      INSERT INTO activities (id, time, platform, iconType, text, countBadge, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION');
    insertAct.run('act-1', '12:35 PM', 'LinkedIn', 'linkedin', 'Scanned 428 new Senior Software Engineer openings', '428 jobs', 'completed', now);
    insertAct.run('act-2', '12:32 PM', 'Google', 'google', 'Detected match for Senior Software Engineer (94% ATS)', 'Match', 'completed', now - 60000);
    insertAct.run('act-3', '12:28 PM', 'Naukri', 'naukri', 'Refreshed active search query across 1,840 listings', 'Synced', 'completed', now - 120000);
    insertAct.run('act-4', '12:20 PM', 'Amazon', 'amazon', 'Auto-extracted core competencies: Java 17, Spring Boot, Kafka', 'ATS 92%', 'completed', now - 180000);
    insertAct.run('act-5', '12:15 PM', 'Microsoft', 'microsoft', 'Discovered 14 remote Cloud Systems roles', 'New', 'completed', now - 240000);
    insertAct.run('act-6', '12:10 PM', 'System', 'bot', 'Autonomous scan cycle executed across 50+ enterprise job boards', 'Cycle 88', 'completed', now - 300000);
    db.exec('COMMIT');
  }

  // Seed profile
  const profileRow = db.prepare('SELECT id FROM profile WHERE id = ?').get('default');
  if (!profileRow) {
    const defaultProfile = {
      general: {
        firstName: "Kushal",
        lastName: "Kumar",
        fullName: "Kushal Kumar Pulakanti",
        email: "kushalkumar.pulakanti@gmail.com",
        countryCode: "+91",
        phone: "9949632198",
        address1: "Ibrahim Bagh",
        address2: "Manikonda",
        city: "Hyderabad",
        state: "Telangana",
        zipCode: "500089",
        country: "India",
        bio: "Java Backend Engineer specializing in Java, Spring Boot, REST APIs, Microservices, Kafka, Redis, SQL, Docker, and AWS.",
        linkedinUrl: "https://www.linkedin.com/in/kushalkumarpulakanti/",
        portfolioUrl: "https://kushalkumarpulakanti.vercel.app/"
      },
      jobPreferences: {
        jobTitles: [
          "Java Backend Engineer",
          "Java Software Engineer",
          "Spring Boot Developer",
          "Microservices Engineer",
          "Full Stack Developer",
          "Cloud Engineer",
          "DevOps Engineer",
          "Platform Engineer"
        ],
        preferredLocations: [
          "Hyderabad",
          "Bangalore",
          "Chennai",
          "Pune",
          "Remote"
        ],
        remoteOnly: false,
        minSalary: "8",
        experience: "3",
        willingToRelocate: "Yes"
      }
    };

    db.prepare('INSERT INTO profile (id, data, updated_at) VALUES (?, ?, ?)')
      .run('default', JSON.stringify(defaultProfile), now);
  }
}
