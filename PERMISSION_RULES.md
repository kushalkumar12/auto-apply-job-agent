# PERMISSION RULES & SOURCE OF TRUTH FOR DEVELOPMENT

> **MANDATORY INSTRUCTION FOR AI AGENTS & DEVELOPERS:**
> 1. Before analyzing or editing ANY existing code in this repository, **ALWAYS read and adhere strictly to this file first**.
> 2. If any element, component, feature, layout, style, or behavior listed below needs modification to support another feature or resolve an issue, **STOP IMMEDIATELY AND REQUEST EXPLICIT USER PERMISSION**.
> 3. **Never assume permission. Never make unauthorized modifications.**
> 4. Whenever starting a new conversation, check this permission file before analyzing or editing existing code.

---

## 1. Core Requirements & Workflow System

### Stage 1: User Authentication vs. Candidate Profile Separation
- **Application Authentication (`usr_...` / Login / Register / Google Auth)**: Purely handles account access and authentication.
- **Candidate Profile (Profile Menu Data)**: Represents the job seeker's career profile (resume, specific skills, primary skill, experience, education, portfolio).
- **Rule**: The application's account profile and the Profile menu data are **separate entities**; the login account does not dictate or restrict the candidate profile.

### Stage 2: Profile-Driven Discovery
- The Explorer and Orbit harvesting engine must **strictly use only the parameters provided in the candidate profile** (skills, primary skill, target roles, avoid companies/skills/sources, work formats).
- Use AI only to refine search prompts when necessary. **Do not introduce unrelated search parameters or arbitrary assumptions** unsupported by the user's profile.

### Stage 3: Orbit - Real-Time Job Harvesting Service
- Orbit functions as an active engine that continuously discovers and collects job opportunities across the internet (direct ATS sources including Greenhouse, Ashby, Lever, RemoteOK, Remotive).
- **Zero Mock / Zero Simulated Data**: Orbit must display the actual, live operations performed by the harvesting service in real time:
  1. **Searching**: Actively querying available public ATS sources using profile parameters.
  2. **Discovering**: Identifying new job listings from sources.
  3. **Extracting**: Parsing full job details (role, company, full description, skills, location, work mode, apply URL).
  4. **Deduplicating**: Detecting and removing duplicate job listings already indexed.
  5. **Validating & Processing**: Normalizing data and calculating candidate ATS compatibility scores.
  6. **Tracking**: Recording real metrics of discovered, processed, and retained jobs.
- **No Mock Placeholders**: Every displayed activity, log line, and table record must reflect actual harvesting operations.

### Stage 4: Explorer Discovery & Excel Export
- The sole purpose of the Explorer is to discover, collect, filter, view, and export internet job opportunities.
- **Application statuses such as "Applied" or "Not Submitted" do NOT belong in the Explorer** and must not be displayed.
- The collected opportunities can be filtered by Search, Work Mode, Company, and Marker, and exported directly to an Excel-compatible CSV file.

---

## 2. Locked Elements & Prohibited Changes (Explicitly Prohibited)

### A. UI/UX & Visual Architecture (LOCKED)
- **Reference Standard**: The established **Wavefrontend** implementation (`wavefrontend/`) is the visual and behavioral baseline.
- **Top Navigation Bar (`frontend/src/components/Navbar.jsx`)**: Layout, brand logo ("skill2role" / "Resume Porter"), tab navigation pills, notifications trigger, and dual profile dropdown.
- **Orbit Radar Scene (`frontend/src/components/JobDiscoveryEngine.jsx` & `JobDiscoveryEngine.css`)**: 210px height, 120px circular central collector core, canvas wave attractor, floating source badges, rotating luminous glow.
- **Theme & Palette Tokens**: Dark mode background (`#0f172a`, `#1e293b`), accent colors (`#3b82f6`, `#10b981`), borders, shadows, and dual-theme tokens (Default & Minimal).
- **Candidate Profile Layout (`frontend/src/components/ProfileView.jsx`)**: Tabbed structure, resume upload area, skills pills, primary skill selector.

### B. Functional & Data Rules (LOCKED)
- **No Synthetic Jobs**: Never generate random or fake tech jobs (e.g., synthetic demo streams). All jobs in the database must come from actual public feeds or user imports.
- **No Truncation of Job Descriptions**: When harvesting, store the **Entire Job Description** without artificial character truncation.
- **Direct Apply Redirection**: The Apply action in the Job Modal must redirect the candidate directly to the external posting URL (`job.url`) for manual application.
- **No Status Pollution in Explorer**: Never display application tracking statuses ("Applied", "Not Submitted") in the Explorer table or its export.

---

## 3. Dedicated Changes & Permissions Log

| 2026-10-19 | User | **AUTHORIZED & IMPLEMENTED** | 1. **Removed Action column** from Explorer `JobList.jsx`.<br>2. On clicking any row in `JobList.jsx`, open popup modal displaying the **Entire JD**.<br>3. Inside Job Modal, `Apply` button redirects directly to the company/platform job post URL (`job.url`) for manual application.<br>4. Added **marker toggle** (`Bookmark`) to mark jobs, persist to backend, and added **Marked Only** filter in Explorer.<br>5. Converted Orbit discovery stream into an **authentic real-time harvesting engine** that performs live ATS crawling, deduplication, validation, and tracking.<br>6. Removed description truncation (`clean_desc[:2500]`) across Greenhouse, Ashby, Lever, RemoteOK, and Remotive harvesters.<br>7. Replaced application status with Marked status in Excel/CSV export. |
| 2026-10-22 | User | **AUTHORIZED & IMPLEMENTED** | User explicitly requested and authorized removing unnecessary labels: 1. Removed redundant `[LOCKED]` badges from tabs in `Navbar.jsx`. 2. Removed `Candidate Profile` over-label from the active profile pill in `CandidateProfileSwitcher.jsx`. |

---

## 4. User-Defined Prohibitions & Custom Locks
*(The user may add specific files, components, or rules below)*

- [LOCKED] `frontend/src/components/Navbar.jsx` - Top navigation bar and profile identity architecture.
- [LOCKED] `frontend/src/components/JobDiscoveryEngine.jsx` - Wavefrontend 120px collector and canvas wave attractor.
- [LOCKED] `frontend/src/components/JobDiscoveryEngine.css` - Orbit radar styles, animations, and typography tokens.
- [LOCKED] `frontend/src/components/ProfileView.jsx` - Candidate profile management and resume upload workflows.
- [LOCKED] `backend/harvest/` - Real-time ATS harvesting connectors (Greenhouse, Ashby, Lever, RemoteOK, Remotive).

