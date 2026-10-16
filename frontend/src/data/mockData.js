export const PLATFORM_SOURCES_LEFT = [
  { id: 'linkedin', name: 'LinkedIn', count: 62, icon: 'linkedin' },
  { id: 'naukri', name: 'Naukri', count: 38, icon: 'naukri' },
  { id: 'indeed', name: 'Indeed', count: 28, icon: 'indeed' },
  { id: 'instahyre', name: 'Instahyre', count: 12, icon: 'instahyre' },
  { id: 'foundit', name: 'Foundit', count: 14, icon: 'foundit' },
];

export const PLATFORM_SOURCES_RIGHT = [
  { id: 'company', name: 'Company Careers', count: 26, icon: 'building' },
  { id: 'angellist', name: 'AngelList', count: 8, icon: 'angellist' },
  { id: 'wellfound', name: 'Wellfound', count: 10, icon: 'wellfound' },
  { id: 'cutshort', name: 'CutShort', count: 8, icon: 'cutshort' },
  { id: 'others', name: 'Others', count: 14, icon: 'others' },
];

export const INITIAL_JOBS = [
  {
    id: 1,
    role: "Software Engineer",
    company: "Google",
    logo: "google",
    source: "LinkedIn",
    workMode: "Hybrid",
    atsScore: 87,
    dateTime: "30-Sep-26 12:32",
    location: "Bengaluru, India",
    salary: "$135k - $165k",
    description: "Design high-performance distributed systems, core microservices, and modern user experiences.",
    skills: ["Java", "Distributed Systems", "Go", "GCP", "Kubernetes"],
    applied: false
  },
  {
    id: 2,
    role: "Backend Developer",
    company: "Microsoft",
    logo: "microsoft",
    source: "Indeed",
    workMode: "Remote",
    atsScore: 85,
    dateTime: "29-Sep-26 11:20",
    location: "Hyderabad, India",
    salary: "$120k - $145k",
    description: "Architect cloud infrastructure services and APIs using C#, .NET Core, and Azure microservices.",
    skills: ["C#", "Azure", "Distributed Cache", "REST APIs", "SQL"],
    applied: false
  },
  {
    id: 3,
    role: "Java Developer",
    company: "Amazon",
    logo: "amazon",
    source: "Naukri",
    workMode: "On-site",
    atsScore: 78,
    dateTime: "28-Sep-26 10:15",
    location: "Bengaluru, India",
    salary: "$125k - $155k",
    description: "Scale high-throughput fulfillment engines and distributed streaming event architectures.",
    skills: ["Java", "Spring Boot", "AWS DynamoDB", "Kafka", "Microservices"],
    applied: false
  },
  {
    id: 4,
    role: "Cloud Engineer",
    company: "Netflix",
    logo: "netflix",
    source: "LinkedIn",
    workMode: "Hybrid",
    atsScore: 82,
    dateTime: "27-Sep-26 09:45",
    location: "Remote, India",
    salary: "$150k - $185k",
    description: "Automate edge routing, multi-region failover mechanics, and real-time observability telemetry.",
    skills: ["Terraform", "Kubernetes", "AWS", "Prometheus", "Python"],
    applied: false
  },
  {
    id: 5,
    role: "DevOps Engineer",
    company: "Adobe",
    logo: "adobe",
    source: "Company",
    workMode: "Remote",
    atsScore: 80,
    dateTime: "26-Sep-26 08:30",
    location: "Noida, India",
    salary: "$115k - $140k",
    description: "Work on Creative Cloud web infrastructure, automated CI/CD runners, and zero-downtime releases.",
    skills: ["Docker", "GitLab CI", "AWS", "Linux", "Bash"],
    applied: false
  },
  {
    id: 6,
    role: "Full Stack Developer",
    company: "IBM",
    logo: "ibm",
    source: "Indeed",
    workMode: "Hybrid",
    atsScore: 75,
    dateTime: "25-Sep-26 07:10",
    location: "Bengaluru, India",
    salary: "$95k - $120k",
    description: "Develop hybrid cloud management portals with React, Node.js, and Red Hat OpenShift APIs.",
    skills: ["React", "Node.js", "OpenShift", "TypeScript", "GraphQL"],
    applied: false
  },
  {
    id: 7,
    role: "Data Analyst",
    company: "Meta",
    logo: "meta",
    source: "Naukri",
    workMode: "On-site",
    atsScore: 72,
    dateTime: "24-Sep-26 06:50",
    location: "Gurugram, India",
    salary: "$105k - $130k",
    description: "Deliver analytical insights on product growth, user behavior cohorts, and attribution modeling.",
    skills: ["Python", "SQL", "Presto", "Tableau", "A/B Testing"],
    applied: false
  },
  {
    id: 8,
    role: "ML Engineer",
    company: "OpenAI",
    logo: "openai",
    source: "Company",
    workMode: "Remote",
    atsScore: 88,
    dateTime: "23-Sep-26 05:22",
    location: "San Francisco / Remote",
    salary: "$210k - $275k",
    description: "Train, evaluate, and optimize inference latency for multi-modal reasoning models.",
    skills: ["PyTorch", "CUDA", "Python", "Ray", "Distributed Training"],
    applied: false
  }
];

export const INITIAL_ACTIVITIES = [
  {
    id: "act-1",
    time: "12:32 PM",
    platform: "LinkedIn",
    iconType: "linkedin",
    text: "Found 8 new jobs from LinkedIn",
    countBadge: "8 jobs",
    status: "completed"
  },
  {
    id: "act-2",
    time: "12:31 PM",
    platform: "Naukri",
    iconType: "naukri",
    text: "Found 5 new jobs from Naukri",
    countBadge: "5 jobs",
    status: "completed"
  },
  {
    id: "act-3",
    time: "12:30 PM",
    platform: "Indeed",
    iconType: "indeed",
    text: "Found 4 new jobs from Indeed",
    countBadge: "4 jobs",
    status: "completed"
  },
  {
    id: "act-4",
    time: "12:28 PM",
    platform: "Company Careers",
    iconType: "building",
    text: "Found 6 new jobs from Company Careers",
    countBadge: "6 jobs",
    status: "completed"
  },
  {
    id: "act-5",
    time: "12:26 PM",
    platform: "Amazon",
    iconType: "amazon",
    text: "Scanning Amazon career page...",
    countBadge: null,
    status: "scanning"
  },
  {
    id: "act-6",
    time: "12:25 PM",
    platform: "Wellfound",
    iconType: "wellfound",
    text: "Found 3 new jobs from Wellfound",
    countBadge: "3 jobs",
    status: "completed"
  },
  {
    id: "act-7",
    time: "12:24 PM",
    platform: "Foundit",
    iconType: "foundit",
    text: "Found 4 new jobs from Foundit",
    countBadge: "4 jobs",
    status: "completed"
  },
  {
    id: "act-8",
    time: "12:24 PM",
    platform: "CutShort",
    iconType: "cutshort",
    text: "Found 2 new jobs from CutShort",
    countBadge: "2 jobs",
    status: "completed"
  },
  {
    id: "act-9",
    time: "12:20 PM",
    platform: "System",
    iconType: "check",
    text: "Search completed. 210 jobs found.",
    countBadge: "210 jobs",
    status: "success"
  }
];
