// ─────────────────────────────────────────────────────────────────────────────
// Shared controlled vocabulary. Both the student profile and every opportunity's
// tags are normalised into THIS namespace, so skill-matching is a clean set
// overlap instead of fuzzy string soup. The synonym map collapses the messy
// real-world variants ("ML", "machine learning", "ai/ml") onto one slug.
// ─────────────────────────────────────────────────────────────────────────────

export interface Branch {
  slug: string;
  label: string;
  /** Skill slugs commonly associated — used to seed cold-start matching. */
  affinity: string[];
}

export const BRANCHES: Branch[] = [
  { slug: "cse", label: "Computer Science / IT", affinity: ["programming", "web-development", "data-structures", "dsa"] },
  { slug: "ece", label: "Electronics & Communication", affinity: ["embedded", "iot", "vlsi", "signal-processing"] },
  { slug: "eee", label: "Electrical Engineering", affinity: ["embedded", "power-systems", "iot"] },
  { slug: "mechanical", label: "Mechanical Engineering", affinity: ["cad", "robotics", "manufacturing"] },
  { slug: "civil", label: "Civil Engineering", affinity: ["autocad", "structures", "gis"] },
  { slug: "chemical", label: "Chemical Engineering", affinity: ["process-engineering", "research"] },
  { slug: "biotech", label: "Biotech / Bioengineering", affinity: ["research", "biology", "data-analysis"] },
  { slug: "aiml", label: "AI / Data Science", affinity: ["machine-learning", "data-science", "python", "deep-learning"] },
  { slug: "commerce", label: "Commerce / BCom", affinity: ["finance", "accounting", "marketing", "business"] },
  { slug: "management", label: "Management / BBA / MBA", affinity: ["marketing", "business", "consulting", "finance"] },
  { slug: "design", label: "Design / Fine Arts", affinity: ["ui-ux", "graphic-design", "figma", "content"] },
  { slug: "arts", label: "Arts / Humanities", affinity: ["content", "research", "writing", "social-impact"] },
  { slug: "science", label: "Pure Sciences", affinity: ["research", "data-analysis", "mathematics"] },
  { slug: "law", label: "Law", affinity: ["legal-research", "policy", "writing"] },
  { slug: "other", label: "Other", affinity: [] },
];

export const BRANCH_SLUGS = BRANCHES.map((b) => b.slug);

export const YEARS = [
  { value: 1, label: "1st year" },
  { value: 2, label: "2nd year" },
  { value: 3, label: "3rd year" },
  { value: 4, label: "4th year" },
  { value: 5, label: "5th year / PG" },
];

export const SOCIAL_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "obc", label: "OBC" },
  { value: "sc", label: "SC" },
  { value: "st", label: "ST" },
  { value: "ews", label: "EWS" },
] as const;

export const INDIAN_STATES = [
  "andhra-pradesh", "arunachal-pradesh", "assam", "bihar", "chhattisgarh", "goa",
  "gujarat", "haryana", "himachal-pradesh", "jharkhand", "karnataka", "kerala",
  "madhya-pradesh", "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland",
  "odisha", "punjab", "rajasthan", "sikkim", "tamil-nadu", "telangana", "tripura",
  "uttar-pradesh", "uttarakhand", "west-bengal", "delhi", "jammu-kashmir",
  "ladakh", "puducherry", "chandigarh",
];

export const STATE_LABELS: Record<string, string> = Object.fromEntries(
  INDIAN_STATES.map((s) => [s, s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")]),
);

// ─── Controlled skill / theme vocabulary (~150 terms) ────────────────────────

export const SKILLS: { slug: string; label: string; group: string }[] = [
  // Programming languages
  { slug: "python", label: "Python", group: "Languages" },
  { slug: "javascript", label: "JavaScript", group: "Languages" },
  { slug: "typescript", label: "TypeScript", group: "Languages" },
  { slug: "java", label: "Java", group: "Languages" },
  { slug: "c-cpp", label: "C / C++", group: "Languages" },
  { slug: "go", label: "Go", group: "Languages" },
  { slug: "rust", label: "Rust", group: "Languages" },
  { slug: "kotlin", label: "Kotlin", group: "Languages" },
  { slug: "swift", label: "Swift", group: "Languages" },
  { slug: "sql", label: "SQL", group: "Languages" },
  { slug: "r-lang", label: "R", group: "Languages" },
  { slug: "solidity", label: "Solidity", group: "Languages" },
  // Web / app
  { slug: "web-development", label: "Web Development", group: "Engineering" },
  { slug: "frontend", label: "Frontend", group: "Engineering" },
  { slug: "backend", label: "Backend", group: "Engineering" },
  { slug: "fullstack", label: "Full-stack", group: "Engineering" },
  { slug: "react", label: "React", group: "Engineering" },
  { slug: "nextjs", label: "Next.js", group: "Engineering" },
  { slug: "nodejs", label: "Node.js", group: "Engineering" },
  { slug: "android", label: "Android", group: "Engineering" },
  { slug: "ios", label: "iOS", group: "Engineering" },
  { slug: "flutter", label: "Flutter", group: "Engineering" },
  { slug: "mobile", label: "Mobile Dev", group: "Engineering" },
  { slug: "devops", label: "DevOps", group: "Engineering" },
  { slug: "cloud", label: "Cloud", group: "Engineering" },
  { slug: "aws", label: "AWS", group: "Engineering" },
  { slug: "docker", label: "Docker", group: "Engineering" },
  { slug: "kubernetes", label: "Kubernetes", group: "Engineering" },
  { slug: "api-development", label: "APIs", group: "Engineering" },
  { slug: "database", label: "Databases", group: "Engineering" },
  { slug: "testing", label: "Testing / QA", group: "Engineering" },
  { slug: "game-dev", label: "Game Dev", group: "Engineering" },
  // Data / AI
  { slug: "machine-learning", label: "Machine Learning", group: "Data & AI" },
  { slug: "deep-learning", label: "Deep Learning", group: "Data & AI" },
  { slug: "data-science", label: "Data Science", group: "Data & AI" },
  { slug: "data-analysis", label: "Data Analysis", group: "Data & AI" },
  { slug: "nlp", label: "NLP", group: "Data & AI" },
  { slug: "computer-vision", label: "Computer Vision", group: "Data & AI" },
  { slug: "generative-ai", label: "Generative AI", group: "Data & AI" },
  { slug: "data-engineering", label: "Data Engineering", group: "Data & AI" },
  { slug: "analytics", label: "Analytics", group: "Data & AI" },
  { slug: "statistics", label: "Statistics", group: "Data & AI" },
  // Emerging
  { slug: "blockchain", label: "Blockchain / Web3", group: "Emerging Tech" },
  { slug: "iot", label: "IoT", group: "Emerging Tech" },
  { slug: "ar-vr", label: "AR / VR", group: "Emerging Tech" },
  { slug: "robotics", label: "Robotics", group: "Emerging Tech" },
  { slug: "embedded", label: "Embedded Systems", group: "Emerging Tech" },
  { slug: "cybersecurity", label: "Cybersecurity", group: "Emerging Tech" },
  { slug: "quantum", label: "Quantum Computing", group: "Emerging Tech" },
  // Core engineering
  { slug: "cad", label: "CAD", group: "Core Engineering" },
  { slug: "autocad", label: "AutoCAD", group: "Core Engineering" },
  { slug: "vlsi", label: "VLSI", group: "Core Engineering" },
  { slug: "signal-processing", label: "Signal Processing", group: "Core Engineering" },
  { slug: "power-systems", label: "Power Systems", group: "Core Engineering" },
  { slug: "manufacturing", label: "Manufacturing", group: "Core Engineering" },
  { slug: "structures", label: "Structural Engg", group: "Core Engineering" },
  { slug: "process-engineering", label: "Process Engg", group: "Core Engineering" },
  { slug: "gis", label: "GIS", group: "Core Engineering" },
  // Design / product
  { slug: "ui-ux", label: "UI / UX Design", group: "Design & Product" },
  { slug: "figma", label: "Figma", group: "Design & Product" },
  { slug: "graphic-design", label: "Graphic Design", group: "Design & Product" },
  { slug: "product-management", label: "Product Mgmt", group: "Design & Product" },
  { slug: "video-editing", label: "Video Editing", group: "Design & Product" },
  { slug: "animation", label: "Animation", group: "Design & Product" },
  // Business / non-tech
  { slug: "finance", label: "Finance", group: "Business" },
  { slug: "accounting", label: "Accounting", group: "Business" },
  { slug: "marketing", label: "Marketing", group: "Business" },
  { slug: "digital-marketing", label: "Digital Marketing", group: "Business" },
  { slug: "sales", label: "Sales / BD", group: "Business" },
  { slug: "business", label: "Business Strategy", group: "Business" },
  { slug: "consulting", label: "Consulting", group: "Business" },
  { slug: "operations", label: "Operations", group: "Business" },
  { slug: "hr", label: "Human Resources", group: "Business" },
  { slug: "economics", label: "Economics", group: "Business" },
  { slug: "entrepreneurship", label: "Entrepreneurship", group: "Business" },
  // Content / comms
  { slug: "content", label: "Content Writing", group: "Content & Media" },
  { slug: "copywriting", label: "Copywriting", group: "Content & Media" },
  { slug: "social-media", label: "Social Media", group: "Content & Media" },
  { slug: "journalism", label: "Journalism", group: "Content & Media" },
  { slug: "photography", label: "Photography", group: "Content & Media" },
  // Research / impact / misc
  { slug: "research", label: "Research", group: "Research & Impact" },
  { slug: "policy", label: "Public Policy", group: "Research & Impact" },
  { slug: "social-impact", label: "Social Impact", group: "Research & Impact" },
  { slug: "sustainability", label: "Sustainability / Climate", group: "Research & Impact" },
  { slug: "healthcare", label: "Healthcare / Med", group: "Research & Impact" },
  { slug: "biology", label: "Biology", group: "Research & Impact" },
  { slug: "mathematics", label: "Mathematics", group: "Research & Impact" },
  { slug: "physics", label: "Physics", group: "Research & Impact" },
  { slug: "legal-research", label: "Legal Research", group: "Research & Impact" },
  { slug: "writing", label: "Writing", group: "Research & Impact" },
  { slug: "fintech", label: "Fintech", group: "Domains" },
  { slug: "edtech", label: "EdTech", group: "Domains" },
  { slug: "agritech", label: "AgriTech", group: "Domains" },
  { slug: "gaming", label: "Gaming", group: "Domains" },
  { slug: "open-source", label: "Open Source", group: "Domains" },
  { slug: "competitive-programming", label: "Competitive Programming", group: "Domains" },
];

export const SKILL_SLUGS = new Set(SKILLS.map((s) => s.slug));
export const SKILL_LABELS: Record<string, string> = Object.fromEntries(
  SKILLS.map((s) => [s.slug, s.label]),
);

/**
 * Synonym map: many raw spellings → one canonical slug. Lower-cased keys.
 * This is what lets a Devpost theme "ai/ml" and a profile skill "Machine
 * Learning" land on the same `machine-learning` slug.
 */
export const SYNONYMS: Record<string, string> = {
  // languages
  "py": "python", "python3": "python",
  "js": "javascript", "ecmascript": "javascript", "node": "nodejs", "node.js": "nodejs",
  "ts": "typescript",
  "c": "c-cpp", "c++": "c-cpp", "cpp": "c-cpp", "c/c++": "c-cpp",
  "golang": "go",
  "postgres": "sql", "postgresql": "sql", "mysql": "sql", "mongodb": "database", "nosql": "database",
  // web
  "reactjs": "react", "react.js": "react", "react native": "mobile", "react-native": "mobile",
  "next": "nextjs", "next.js": "nextjs",
  "web dev": "web-development", "webdev": "web-development", "web": "web-development",
  "front-end": "frontend", "front end": "frontend",
  "back-end": "backend", "back end": "backend",
  "full stack": "fullstack", "full-stack": "fullstack", "mern": "fullstack", "mean": "fullstack",
  "android dev": "android", "ios dev": "ios", "app dev": "mobile", "app development": "mobile",
  "k8s": "kubernetes",
  "rest": "api-development", "rest api": "api-development", "graphql": "api-development",
  // data / ai
  "ml": "machine-learning", "machine learning": "machine-learning",
  "ai": "machine-learning", "artificial intelligence": "machine-learning", "ai/ml": "machine-learning",
  "dl": "deep-learning", "neural networks": "deep-learning",
  "ds": "data-science", "data sci": "data-science",
  "genai": "generative-ai", "llm": "generative-ai", "llms": "generative-ai", "gen ai": "generative-ai",
  "natural language processing": "nlp",
  "cv": "computer-vision", "image processing": "computer-vision",
  "data viz": "data-analysis", "data visualization": "data-analysis",
  // emerging
  "web3": "blockchain", "crypto": "blockchain", "defi": "blockchain", "ethereum": "blockchain", "solana": "blockchain",
  "internet of things": "iot",
  "ar": "ar-vr", "vr": "ar-vr", "xr": "ar-vr", "metaverse": "ar-vr",
  "security": "cybersecurity", "infosec": "cybersecurity", "ctf": "cybersecurity",
  // core
  "auto cad": "autocad", "solidworks": "cad", "catia": "cad",
  // design
  "ux": "ui-ux", "ui": "ui-ux", "ui/ux": "ui-ux", "product design": "ui-ux", "design": "ui-ux",
  "pm": "product-management", "product": "product-management",
  // business
  "fin": "finance", "financial": "finance", "investment": "finance",
  "digital marketing ": "digital-marketing", "seo": "digital-marketing", "growth": "marketing",
  "bd": "sales", "business development": "sales",
  "strategy": "business", "biz": "business",
  "ops": "operations",
  "human resource": "hr", "human resources": "hr",
  // content
  "content writing": "content", "blogging": "content",
  "social media marketing": "social-media", "smm": "social-media",
  // misc / domains
  "competitive coding": "competitive-programming", "cp": "competitive-programming", "dsa": "competitive-programming",
  "oss": "open-source", "opensource": "open-source",
  "climate": "sustainability", "climate tech": "sustainability", "cleantech": "sustainability",
  "med": "healthcare", "medicine": "healthcare", "medical": "healthcare", "biotech": "biology",
  "maths": "mathematics", "math": "mathematics",
  "ed tech": "edtech", "fin tech": "fintech", "agri tech": "agritech",
};

/** Interest categories the feed can include (mirrors Category). */
export const INTEREST_OPTIONS: { value: import("./types").Category; label: string; blurb: string }[] = [
  { value: "internship", label: "Internships", blurb: "Paid & WFH roles, ATS + India boards" },
  { value: "scholarship", label: "Scholarships", blurb: "Govt + private financial aid" },
  { value: "competition", label: "Competitions", blurb: "Coding contests, case comps, quizzes" },
  { value: "hackathon", label: "Hackathons", blurb: "Devpost, Devfolio, ETHIndia & more" },
  { value: "event", label: "Events", blurb: "Meetups, workshops & talks near you (Luma)" },
];
