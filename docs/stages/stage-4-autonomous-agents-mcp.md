# Stage 4 Specification: Autonomous Agent Swarms and MCP Ecosystem

**Status:** Future Stage  
**Execution Standard:** Senior Principal Engineering, Senior UI/UX Design, Independent QA  
**Prerequisite:** Stage 1 Foundation + Stage 2 Automation + Stage 3 Tracking

---

## 1. Overview & Business Objectives

Stage 4 elevates Skill2Role into a multi-agent autonomous ecosystem leveraging Anthropic's **Model Context Protocol (MCP)**:
- **MCP Server Integrations:** Standardized JSON-RPC protocol exposing external tools (salary benchmarks, company research, web scraping, email parsing).
- **Autonomous Multi-Agent Swarm:** Specialized cooperating agents handling discovery, tailoring, application submission, and email synchronization.
- **Autonomous Inbox Parser:** Real-time email monitoring (OAuth/IMAP) that automatically classifies incoming employer messages and updates Kanban status without manual data entry.

```mermaid
graph TD
    subgraph Multi-Agent Swarm
        Scout[Scout Agent: 24/7 ATS Radar Crawler]
        Tailor[Tailor Agent: Dynamic Document Synthesizer]
        Apply[Apply Agent: Form Submission Specialist]
        Comms[Comms Agent: Email & Calendar Listener]
    end

    subgraph MCP Tool Layer (JSON-RPC)
        MCP_Search[MCP: ATS & Web Search]
        MCP_Research[MCP: Company Intelligence & Levels.fyi]
        MCP_Email[MCP: Secure Mailbox Integration]
    end

    Scout --> MCP_Search
    Tailor --> MCP_Research
    Comms --> MCP_Email
    Scout -->|Discovered Job| Tailor
    Tailor -->|Tailored CV| Apply
    Apply -->|Submission Proof| Comms
```

---

## 2. Model Context Protocol (MCP) Architecture

### 2.1 Standardized MCP Client & Server Wiring
Skill2Role acts as an **MCP Host** connecting to external MCP servers via stdio or SSE transport:
- **`mcp/company-intel`:** Queries Levels.fyi, Glassdoor, and SEC EDGAR filings for financial stability, salary bands, and engineering culture ratings.
- **`mcp/ats-harvester`:** Directly queries Greenhouse, Ashby, and Lever APIs with rate-limit backoff.
- **`mcp/email-sync`:** Secure email integration for status tracking.

### 2.2 Tool Execution Flow
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "lookup_company_compensation",
    "arguments": {
      "company": "Stripe",
      "role": "Staff Software Engineer",
      "location": "Bengaluru"
    }
  },
  "id": "req-101"
}
```

---

## 3. Specialized Multi-Agent Roles

### 3.1 The 4 Core Autonomous Agents
1. **Scout Agent:**
   - Runs continuous background radar sweeps.
   - Filters out duplicates, low-match scores, and companies on the candidate's "Avoid" blacklist.
2. **Tailor Agent:**
   - Evaluates the keyword gap between candidate resume and posting.
   - Synthesizes tailored bullet points and customized cover letters.
3. **Apply Agent:**
   - Connects to user-authorized browser sessions.
   - Fills multi-step application forms, uploads tailored PDFs, and answers demographic and qualification questions truthfully.
4. **Comms & Follow-up Agent:**
   - Monitors candidate inbox for application confirmations, interview invites, and rejection notices.
   - Drafts professional follow-up emails and thank-you notes post-interview.

---

## 4. Autonomous Inbox Parser & Notification Engine

### 4.1 Automated Email Classification
- **Connection:** Secure local OAuth 2.0 (Google Workspace / Microsoft 365) or IMAP.
- **Classification Categories:**
  - `APPLICATION_RECEIVED`: Confirmation email with tracking ID.
  - `INTERVIEW_INVITATION`: Link to Calendly, GoodTime, or recruiter calendar.
  - `ASSESSMENT_INVITATION`: HackerRank, CodeSignal, or take-home assignment.
  - `REJECTION_NOTICE`: Polite rejection letter.
  - `OFFER_LETTER`: PDF offer or DocuSign document.
- **Auto-Sync:** Updates `application_lifecycle` table and fires a real-time Notification Center toast.

---

## 5. UI/UX Specifications for Stage 4 (`#tools`)

### 5.1 Tools View Enhancements
- **Agent Swarm Mission Control:** Live status indicator showing which subagents are actively running, idle, or awaiting approval.
- **MCP Server Manager:** List of connected MCP tools with latency indicators, health checks, and toggle switches.
- **Activity Stream:** Live audit feed of agent actions (e.g. `Scout found 4 new Staff roles`, `Tailor synthesized CV for Stripe`).
