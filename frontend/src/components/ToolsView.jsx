import React, { useState } from 'react';
import { 
  FileCheck, 
  Edit3, 
  Search, 
  FileText, 
  Mail, 
  Layers, 
  FileType, 
  MessageSquare,
  ArrowRight,
  UploadCloud,
  ClipboardPaste,
  BarChart,
  Send,
  Sparkles
} from 'lucide-react';
import './ToolsView.css';

export default function ToolsView() {
  const [activeModal, setActiveModal] = useState(null);

  const toolsList = [
    {
      id: 'ats-check',
      title: 'ATS Resume Checker',
      desc: 'Analyze your resume for ATS compatibility, keyword match and formatting issues.',
      icon: FileCheck,
      actionText: 'Run ATS Check →',
      actionHandler: () => alert('Running ATS Resume Audit on Master Resume...')
    },
    {
      id: 'resume-editor',
      title: 'Resume Editor',
      desc: 'Edit and manage your master resume and tailored versions for different roles.',
      icon: Edit3,
      actionText: 'Open Editor →',
      actionHandler: () => alert('Opening AI Interactive Resume Editor...')
    },
    {
      id: 'keyword-matcher',
      title: 'Resume Keyword Matcher',
      desc: 'Compare your resume with a job description and get missing keywords.',
      icon: Search,
      actionText: 'Match Keywords →',
      actionHandler: () => alert('Opening Keyword Matcher tool...')
    },
    {
      id: 'jd-analyzer',
      title: 'Job Description Analyzer',
      desc: 'Extract key skills, responsibilities and requirements from any job description.',
      icon: FileText,
      actionText: 'Analyze JD →',
      actionHandler: () => alert('Opening Job Description Analyzer...')
    },
    {
      id: 'cover-letter',
      title: 'Cover Letter Generator',
      desc: 'Create a role-specific, personalized cover letter using AI.',
      icon: Mail,
      actionText: 'Generate Cover Letter →',
      actionHandler: () => alert('Launching AI Cover Letter Generator...')
    },
    {
      id: 'version-manager',
      title: 'Resume Version Manager',
      desc: 'Manage, compare and restore different versions of your resumes.',
      icon: Layers,
      actionText: 'Manage Versions →',
      actionHandler: () => alert('Loading version snapshot history...')
    },
    {
      id: 'converter',
      title: 'PDF / DOCX Converter',
      desc: 'Convert your resume to PDF or DOCX with proper formatting.',
      icon: FileType,
      actionText: 'Convert Files →',
      actionHandler: () => alert('Opening PDF/DOCX Export Converter...')
    },
    {
      id: 'answer-lib',
      title: 'Application Answer Library',
      desc: 'Manage reusable answers for common application questions.',
      icon: MessageSquare,
      actionText: 'Open Library →',
      actionHandler: () => alert('Opening Question & Answer Library...')
    }
  ];

  const recentUsage = [
    {
      title: 'ATS Resume Check',
      subtitle: 'Software Engineer - Google',
      time: 'Today, 10:24 AM',
      scoreBadge: 'Score: 92%',
      scoreColor: 'green'
    },
    {
      title: 'Cover Letter Generated',
      subtitle: 'Backend Developer - Microsoft',
      time: 'Today, 09:15 AM'
    },
    {
      title: 'Keyword Match',
      subtitle: 'DevOps Engineer - Amazon',
      time: 'Yesterday, 06:40 PM',
      scoreBadge: '78% Match',
      scoreColor: 'green'
    },
    {
      title: 'JD Analyzed',
      subtitle: 'Data Analyst - Meta',
      time: 'Yesterday, 04:20 PM'
    },
    {
      title: 'Resume Edited',
      subtitle: 'Cloud Engineer - Netflix',
      time: '19 Oct, 11:10 AM'
    }
  ];

  return (
    <div className="resume-tools-wrapper">
      {/* 1. Header */}
      <div className="tools-header-section">
        <h1 className="tools-main-title">Resume Tools</h1>
        <p className="tools-subtitle">
          Improve your resume and application materials with AI-powered tools.
        </p>
      </div>

      {/* 2. Grid of 8 Tool Cards (2 Columns x 4 Rows) */}
      <div className="tools-cards-grid">
        {toolsList.map((tool) => {
          const Icon = tool.icon;
          return (
            <div key={tool.id} className="tool-box-card">
              <div className="tool-box-content">
                <div className="tool-icon-box">
                  <Icon size={20} strokeWidth={2} />
                </div>
                <div className="tool-text-group">
                  <h3 className="tool-box-title">{tool.title}</h3>
                  <p className="tool-box-desc">{tool.desc}</p>
                </div>
              </div>

              <button 
                className="btn-tool-action"
                onClick={tool.actionHandler}
              >
                <span>{tool.actionText}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Bottom Two-Column Section: Recent Tools Usage & Quick Actions */}
      <div className="tools-bottom-grid">
        {/* Left: Recent Tools Usage */}
        <div className="bottom-card-panel">
          <div className="panel-header-row">
            <h2 className="panel-title-text">Recent Tools Usage</h2>
            <button className="btn-view-all-text" onClick={() => alert('View all history')}>
              View All
            </button>
          </div>

          <div className="recent-tools-list">
            {recentUsage.map((item, idx) => (
              <div key={idx} className="recent-tool-row">
                <div className="recent-tool-left">
                  <div className="recent-item-icon">
                    {idx === 0 && <FileCheck size={16} />}
                    {idx === 1 && <FileText size={16} />}
                    {idx === 2 && <Search size={16} />}
                    {idx === 3 && <FileText size={16} />}
                    {idx === 4 && <Send size={16} />}
                  </div>
                  <div>
                    <div className="recent-item-title">{item.title}</div>
                    <div className="recent-item-subtitle">{item.subtitle}</div>
                  </div>
                </div>

                <div className="recent-tool-right">
                  <span className="recent-item-time">{item.time}</span>
                  {item.scoreBadge && (
                    <span className="recent-score-green">{item.scoreBadge}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="bottom-card-panel">
          <h2 className="panel-title-text">Quick Actions</h2>

          <div className="quick-actions-list">
            {/* Action 1: Upload Resume */}
            <div className="quick-action-item">
              <div className="quick-action-left">
                <div className="quick-action-icon">
                  <UploadCloud size={18} />
                </div>
                <div>
                  <div className="quick-title">Upload Resume</div>
                  <div className="quick-desc">Upload your existing resume to get started.</div>
                </div>
              </div>
              <button 
                className="btn-quick-primary"
                onClick={() => alert('Opening file uploader for resume PDF/DOCX...')}
              >
                Upload File
              </button>
            </div>

            {/* Action 2: Paste Job Description */}
            <div className="quick-action-item">
              <div className="quick-action-left">
                <div className="quick-action-icon">
                  <ClipboardPaste size={18} />
                </div>
                <div>
                  <div className="quick-title">Paste Job Description</div>
                  <div className="quick-desc">Paste any job description to analyze or generate.</div>
                </div>
              </div>
              <button 
                className="btn-quick-primary"
                onClick={() => alert('Opening Job Description input modal...')}
              >
                Paste JD
              </button>
            </div>

            {/* Action 3: Run ATS Check */}
            <div className="quick-action-item">
              <div className="quick-action-left">
                <div className="quick-action-icon">
                  <BarChart size={18} />
                </div>
                <div>
                  <div className="quick-title">Run ATS Check</div>
                  <div className="quick-desc">Quickly check your resume's ATS score.</div>
                </div>
              </div>
              <button 
                className="btn-quick-primary"
                onClick={() => alert('Running Instant ATS Check...')}
              >
                Run Check
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
