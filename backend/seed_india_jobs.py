import sqlite3
import json
import time
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "jobs.db"

INDIAN_TECH_JOBS = [
    {
        "role": "Software Development Engineer II - Backend (Java / Spring Boot)",
        "company": "Swiggy",
        "logo": "swiggy",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 92,
        "location": "Bengaluru, Karnataka, India",
        "salary": "₹28 - 42 LPA",
        "description": "Swiggy's consumer tech org is seeking an SDE-II with 3-6 years of experience building high-throughput microservices. Requirements: 3+ years experience with Java, Spring Boot, MySQL, Redis, Kafka, Distributed Systems, Microservices, and AWS.",
        "skills": ["Java", "Spring Boot", "Microservices", "Kafka", "MySQL", "Redis", "AWS"],
        "url": "https://careers.swiggy.com/job/sde2-backend-bangalore"
    },
    {
        "role": "Senior Software Engineer - Full Stack (React + Java)",
        "company": "Razorpay",
        "logo": "razorpay",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 95,
        "location": "Bengaluru, Karnataka, India",
        "salary": "₹32 - 48 LPA",
        "description": "Razorpay Banking Suite is hiring Senior Full Stack Engineers with 4-7 years of total experience. Must have 4+ years of solid experience in React, JavaScript, Java, Spring Boot, PostgreSQL, and Docker.",
        "skills": ["Java", "React", "JavaScript", "Spring Boot", "PostgreSQL", "Docker"],
        "url": "https://razorpay.com/jobs/senior-fullstack-engineer"
    },
    {
        "role": "Backend Engineer - Platform & Payments",
        "company": "PhonePe",
        "logo": "phonepe",
        "source": "Direct ATS",
        "workMode": "On-site",
        "atsScore": 90,
        "location": "Bengaluru, Karnataka, India",
        "salary": "₹26 - 38 LPA",
        "description": "Looking for passionate Backend Engineers with 2-5 years of industry experience. You will design scalable transaction processing pipelines. Requirements: 2+ years of hands-on Java, Spring Boot, SQL, NoSQL, and high-concurrency systems.",
        "skills": ["Java", "Spring Boot", "SQL", "Redis", "Kafka", "Microservices"],
        "url": "https://phonepe.com/careers/backend-engineer-bengaluru"
    },
    {
        "role": "Frontend Engineer - UI/UX Core (React / TypeScript)",
        "company": "CRED",
        "logo": "cred",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 91,
        "location": "Bengaluru, Karnataka, India",
        "salary": "₹25 - 40 LPA",
        "description": "CRED Design & Experience team is seeking a Frontend Engineer with 2-4 years of experience crafting ultra-responsive web applications. Requires 2+ years working with React, TypeScript, TailwindCSS, Next.js, and State Management.",
        "skills": ["React", "TypeScript", "JavaScript", "HTML5", "CSS3", "Next.js"],
        "url": "https://cred.club/careers/frontend-engineer"
    },
    {
        "role": "Associate Software Engineer - Java / Cloud (Fresher / 0-2 yrs)",
        "company": "Flipkart",
        "logo": "flipkart",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 88,
        "location": "Bengaluru, Karnataka, India",
        "salary": "₹16 - 22 LPA",
        "description": "Flipkart Supply Chain tech is welcoming early-career engineers with 0-2 years of experience or 2024/2025/2026 graduates. Core foundations in Data Structures, Algorithms, Java, Object-Oriented Programming, and SQL required.",
        "skills": ["Java", "SQL", "Data Structures", "Algorithms", "Git"],
        "url": "https://flipkartcareers.com/jobs/associate-engineer"
    },
    {
        "role": "Lead Architect - Cloud Infrastructure & Java Services",
        "company": "Flipkart",
        "logo": "flipkart",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 96,
        "location": "Bengaluru, Karnataka, India",
        "salary": "₹60 - 85 LPA",
        "description": "Seeking a Principal / Lead Architect with 8+ years of distributed systems engineering. Deep expertise in Java, Kubernetes, Kafka, Cloud Architecture (GCP / AWS), and low-latency databases.",
        "skills": ["Java", "Kubernetes", "AWS", "Kafka", "System Design", "Architecture"],
        "url": "https://flipkartcareers.com/jobs/lead-architect-bengaluru"
    },
    {
        "role": "Senior Backend Developer (Python / Django / FastAPI)",
        "company": "Zerodha",
        "logo": "zerodha",
        "source": "Direct ATS",
        "workMode": "Remote",
        "atsScore": 94,
        "location": "Remote, India",
        "salary": "₹28 - 45 LPA",
        "description": "Zerodha tech is hiring experienced Python backend developers with 3-6 years of experience to work on trading gateways. Strong background in Python, FastAPI, PostgreSQL, Redis, and WebSocket connections.",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "Git"],
        "url": "https://zerodha.com/careers/python-backend-engineer"
    },
    {
        "role": "Full Stack Engineer (React + Node.js)",
        "company": "Postman",
        "logo": "postman",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 93,
        "location": "Bengaluru, Karnataka, India",
        "salary": "₹30 - 46 LPA",
        "description": "Postman API Platform is looking for Full Stack Engineers with 3-5 years of experience. Must have 3+ years experience with React, Node.js, TypeScript, REST APIs, and Cloud Deployments.",
        "skills": ["React", "Node.js", "TypeScript", "JavaScript", "AWS", "REST APIs"],
        "url": "https://postman.com/careers/full-stack-engineer"
    },
    {
        "role": "Cloud DevOps & Platform Engineer (AWS / Terraform / Kubernetes)",
        "company": "BrowserStack",
        "logo": "browserstack",
        "source": "Direct ATS",
        "workMode": "Remote",
        "atsScore": 92,
        "location": "Mumbai, Maharashtra, India",
        "salary": "₹25 - 40 LPA",
        "description": "Seeking DevOps Engineer with 3-7 years experience managing multi-region cloud infrastructures. Strong skills in AWS, Kubernetes, Terraform, Docker, CI/CD, and Linux administration.",
        "skills": ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux"],
        "url": "https://browserstack.com/careers/devops-engineer"
    },
    {
        "role": "Senior Java Developer - Enterprise Banking Services",
        "company": "Oracle India IDC",
        "logo": "oracle",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 91,
        "location": "Hyderabad, Telangana, India",
        "salary": "₹24 - 38 LPA",
        "description": "Oracle Financial Services is hiring Senior Java Developers with 4-8 years of experience. Requirements: 4+ years of Java SE/EE, Spring Boot, Microservices, Oracle DB, SQL, and Docker.",
        "skills": ["Java", "Spring Boot", "SQL", "Oracle DB", "Microservices", "REST APIs"],
        "url": "https://oracle.com/careers/senior-java-hyderabad"
    },
    {
        "role": "Software Engineer II - Cloud Applications (Java / Spring / AWS)",
        "company": "Salesforce India",
        "logo": "salesforce",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 93,
        "location": "Hyderabad, Telangana, India",
        "salary": "₹26 - 42 LPA",
        "description": "Salesforce Hyderabad Center of Excellence is hiring SDE-II with 2-5 years experience. Strong background in Java, Spring Boot, AWS, Distributed Caching, and Object-Oriented Design.",
        "skills": ["Java", "Spring Boot", "AWS", "SQL", "Git", "Microservices"],
        "url": "https://salesforce.com/careers/sde2-hyderabad"
    },
    {
        "role": "Backend Engineer - Payments & Fraud Detection (Python / Java)",
        "company": "Microsoft IDC",
        "logo": "microsoft",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 95,
        "location": "Hyderabad, Telangana, India",
        "salary": "₹35 - 55 LPA",
        "description": "Microsoft India Development Center (Hyderabad) is hiring Engineers with 3-7 years experience. Requires 3+ years experience with Java or Python, Azure/AWS Cloud, Distributed Systems, and REST APIs.",
        "skills": ["Java", "Python", "Azure", "Cloud", "Microservices", "System Design"],
        "url": "https://careers.microsoft.com/jobs/backend-hyderabad"
    },
    {
        "role": "Senior Software Engineer - React & Web Technologies",
        "company": "Atlassian",
        "logo": "atlassian",
        "source": "Direct ATS",
        "workMode": "Remote",
        "atsScore": 95,
        "location": "Bengaluru, Karnataka, India",
        "salary": "₹38 - 58 LPA",
        "description": "Atlassian is hiring Senior Frontend Engineers with 4-8 years experience in building Jira and Confluence UI. Expertise in React, TypeScript, JavaScript, Webpack, State Management, and CI/CD.",
        "skills": ["React", "TypeScript", "JavaScript", "HTML5", "CSS3", "CI/CD"],
        "url": "https://atlassian.com/careers/senior-frontend-bengaluru"
    },
    {
        "role": "Java Microservices Backend Developer (Spring Boot / Kafka)",
        "company": "Thoughtworks",
        "logo": "thoughtworks",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 92,
        "location": "Pune, Maharashtra, India",
        "salary": "₹22 - 36 LPA",
        "description": "Thoughtworks Pune is hiring Lead & Senior Developers with 3-6 years of experience in modern Java, Spring Boot, TDD, Clean Architecture, Kafka, and Docker.",
        "skills": ["Java", "Spring Boot", "Kafka", "Docker", "TDD", "Microservices"],
        "url": "https://thoughtworks.com/careers/java-developer-pune"
    },
    {
        "role": "Full Stack Java Developer (React + Spring Boot)",
        "company": "Persistent Systems",
        "logo": "persistentsystems",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 90,
        "location": "Pune, Maharashtra, India",
        "salary": "₹18 - 28 LPA",
        "description": "Persistent Systems is hiring Full Stack Engineers with 2-5 years of experience. Must have 2+ years with Java, Spring Boot, React, JavaScript, SQL, and Git.",
        "skills": ["Java", "React", "Spring Boot", "JavaScript", "SQL", "Git"],
        "url": "https://persistent.com/careers/fullstack-java-pune"
    },
    {
        "role": "Data Engineer - Spark, Python & Cloud Lakehouse",
        "company": "Zomato",
        "logo": "zomato",
        "source": "Direct ATS",
        "workMode": "On-site",
        "atsScore": 91,
        "location": "Gurugram, Haryana, India",
        "salary": "₹24 - 38 LPA",
        "description": "Zomato Data Intelligence team is seeking Data Engineers with 2-5 years of experience in building petabyte-scale data pipelines. Requires 2+ years with Python, Apache Spark, SQL, Airflow, and AWS.",
        "skills": ["Python", "SQL", "Spark", "AWS", "Airflow", "Kafka"],
        "url": "https://zomato.com/careers/data-engineer-gurugram"
    },
    {
        "role": "Senior Java Developer - Real-time Order Engine",
        "company": "Zomato",
        "logo": "zomato",
        "source": "Direct ATS",
        "workMode": "On-site",
        "atsScore": 93,
        "location": "Gurugram, Haryana, India",
        "salary": "₹32 - 48 LPA",
        "description": "Hiring Senior Java Developers with 4-7 years of experience. Must have 4+ years of Java, Spring Boot, Redis, Distributed Locking, Kafka, and MySQL.",
        "skills": ["Java", "Spring Boot", "Redis", "Kafka", "MySQL", "System Design"],
        "url": "https://zomato.com/careers/senior-java-order-engine"
    },
    {
        "role": "Python Backend & AI Integration Engineer (FastAPI / LLMs)",
        "company": "Groww",
        "logo": "groww",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 94,
        "location": "Bengaluru, Karnataka, India",
        "salary": "₹28 - 44 LPA",
        "description": "Groww tech is hiring Python Engineers with 3-6 years of experience. You will build AI advisory services and transactional backend APIs using Python, FastAPI, Docker, PostgreSQL, and AWS.",
        "skills": ["Python", "FastAPI", "Docker", "PostgreSQL", "AWS", "AI/ML"],
        "url": "https://groww.in/careers/python-ai-engineer"
    },
    {
        "role": "Senior Cloud Infrastructure Engineer (Kubernetes, AWS, Terraform)",
        "company": "Meesho",
        "logo": "meesho",
        "source": "Direct ATS",
        "workMode": "Remote",
        "atsScore": 93,
        "location": "Remote, India",
        "salary": "₹32 - 50 LPA",
        "description": "Meesho Platform Engineering is hiring Cloud Engineers with 4-8 years experience. You will manage massive Kubernetes clusters on AWS using Terraform, Prometheus, Helm, and GitOps.",
        "skills": ["AWS", "Kubernetes", "Terraform", "Docker", "Linux", "CI/CD"],
        "url": "https://meesho.io/careers/cloud-infra-engineer"
    },
    {
        "role": "Junior Java Developer (0-2 years experience)",
        "company": "TCS Digital",
        "logo": "tcs",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 87,
        "location": "Hyderabad, Telangana, India",
        "salary": "₹8 - 14 LPA",
        "description": "TCS Digital is hiring early-career Java developers with 0-2 years of experience. Good grasp of Java 17+, Object-Oriented Programming, Spring Boot fundamentals, and SQL database queries.",
        "skills": ["Java", "Spring Boot", "SQL", "Git", "OOP"],
        "url": "https://tcs.com/careers/digital-java-hyderabad"
    },
    {
        "role": "Software Engineer - React Frontend (1-3 yrs experience)",
        "company": "Infosys",
        "logo": "infosys",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 88,
        "location": "Pune, Maharashtra, India",
        "salary": "₹10 - 16 LPA",
        "description": "Infosys Innovation Hub Pune is hiring Frontend Engineers with 1-3 years experience. Hands-on proficiency with React, JavaScript, CSS3, HTML5, REST APIs, and modern responsive layouts.",
        "skills": ["React", "JavaScript", "HTML5", "CSS3", "Git"],
        "url": "https://infosys.com/careers/react-engineer-pune"
    },
    {
        "role": "Staff Software Engineer - Distributed Java Systems (8+ yrs)",
        "company": "Swiggy",
        "logo": "swiggy",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 97,
        "location": "Bengaluru, Karnataka, India",
        "salary": "₹65 - 90 LPA",
        "description": "Swiggy is seeking a Staff Software Engineer with 8+ years of experience leading engineering on multi-million RPS architectures. Mastery of Java, Microservices, Kafka, Redis, and high availability systems.",
        "skills": ["Java", "Microservices", "System Design", "Kafka", "AWS", "Architecture"],
        "url": "https://careers.swiggy.com/job/staff-engineer-java"
    },
    {
        "role": "Lead Frontend Engineer - Design Systems & Web Apps (7+ yrs)",
        "company": "Razorpay",
        "logo": "razorpay",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 95,
        "location": "Bengaluru, Karnataka, India",
        "salary": "₹50 - 75 LPA",
        "description": "Razorpay is looking for a Lead Frontend Engineer with 7+ years of experience to lead Blade Design System and payment checkout web SDKs. Mastery of React, TypeScript, Webpack, Performance, and Architecture.",
        "skills": ["React", "TypeScript", "JavaScript", "Next.js", "Architecture", "Design Systems"],
        "url": "https://razorpay.com/jobs/lead-frontend-architect"
    },
    {
        "role": "Backend Developer - Java & Cloud (Fresher / Entry Level)",
        "company": "Wipro Technologies",
        "logo": "wipro",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 86,
        "location": "Bengaluru, Karnataka, India",
        "salary": "₹7 - 12 LPA",
        "description": "Wipro Enterprise Engineering is hiring fresh graduates or engineers with 0-1 year experience in Java. Core Java, OOP principles, basic Spring Boot, and relational database concepts required.",
        "skills": ["Java", "SQL", "OOP", "Git"],
        "url": "https://wipro.com/careers/entry-level-java"
    },
    {
        "role": "Senior DevOps Engineer (AWS, Kubernetes, CI/CD)",
        "company": "Cisco Systems",
        "logo": "cisco",
        "source": "Direct ATS",
        "workMode": "Hybrid",
        "atsScore": 93,
        "location": "Bengaluru, Karnataka, India",
        "salary": "₹30 - 45 LPA",
        "description": "Cisco Bangalore is hiring Senior DevOps Engineers with 4-8 years experience. Strong proficiency with AWS Cloud, Kubernetes (EKS), Terraform, Docker, Python scripting, and Jenkins/GitHub Actions.",
        "skills": ["AWS", "Kubernetes", "Docker", "Terraform", "CI/CD", "Python"],
        "url": "https://cisco.com/careers/devops-bangalore"
    }
]

def seed(target_db_path: Path = None):
    if target_db_path is None:
        try:
            from database import get_db_path
            target_db_path = get_db_path()
        except ImportError:
            target_db_path = DB_PATH
    conn = sqlite3.connect(str(target_db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    inserted = 0
    now_ts = int(time.time() * 1000)
    current_date_str = datetime.now().strftime("%d-%b-%y %I:%M %p")
    
    for job in INDIAN_TECH_JOBS:
        existing = cur.execute(
            "SELECT id FROM jobs WHERE LOWER(role) = LOWER(?) AND LOWER(company) = LOWER(?)",
            (job["role"], job["company"])
        ).fetchone()
        
        skills_json = json.dumps(job["skills"])
        if not existing:
            cur.execute("""
                INSERT INTO jobs (
                    role, company, logo, source, workMode, atsScore,
                    dateTime, location, salary, description, skills, applied, created_at, url, profile_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'default')
            """, (
                job["role"], job["company"], job["logo"], job["source"], job["workMode"],
                job["atsScore"], current_date_str, job["location"], job["salary"],
                job["description"], skills_json, now_ts, job["url"]
            ))
            inserted += 1
            
    conn.commit()
    conn.close()
    print(f"[OK] Seeded {inserted} high-quality Indian tech jobs into jobs.db")

if __name__ == "__main__":
    seed()
