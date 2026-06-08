// Single source of truth for the careers flagship page copy + people data.
// Real, verifiable content is used as-is. Net-new claims are marked PLACEHOLDER
// and must be confirmed before launch (see spec §13).
import { SITE } from "@/data/site";
import type { BrandHue } from "@/lib/deptColor";

export const hero = {
  kicker: "CAREERS AT LUMOFY · MENA",
  // PLACEHOLDER: confirm headline wording.
  headline: "Workforce intelligence for the next era of work.",
  subdeck:
    "We build the AI platform helping enterprises across MENA understand, develop, and grow their people. Join the team turning workforce data into human potential.",
  ctaPrimary: { label: "View open roles", to: "/jobs" },
  ctaSecondary: { label: "See what we're building", to: "#building" },
};

export const stakes = {
  lead: "The way organizations build talent is being rewritten. We intend to write it.",
  points: [
    {
      title: "The skills gap is the defining business problem of the decade.",
      body: "Companies can't see the capabilities they have, or the ones they'll need. We make them visible.",
    },
    {
      title: "AI is reshaping every role.",
      body: "Workforce intelligence is how organizations adapt without leaving their people behind.",
    },
    {
      title: "MENA is transforming how it grows talent, and we're at its center.",
      body: `100+ organizations across ${SITE.stats.countries} countries already build with Lumofy.`, // 100+ clients: real
    },
  ],
};

export type Pillar = { name: string; hue: BrandHue; line: string };
// PLACEHOLDER: pillar names drafted from known Lumofy platform context — confirm.
export const pillars: Pillar[] = [
  { name: "Competency frameworks", hue: "sirius", line: "Define the skills that matter, role by role." },
  { name: "Performance management", hue: "eclipse", line: "Turn goals and feedback into measurable growth." },
  { name: "Assessments & learning", hue: "aurora", line: "Diagnose capability and close gaps with targeted learning." },
  { name: "Engagement", hue: "nova", line: "Understand and lift how people feel about work." },
];

export type Principle = { n: string; title: string; body: string; hue: BrandHue };
// PLACEHOLDER: principle wording drafted — confirm with the team.
export const principles: Principle[] = [
  { n: "01", title: "Think in systems", body: "We solve root causes, not symptoms. Every fix should make the next ten easier.", hue: "sirius" },
  { n: "02", title: "Build with urgency", body: "Speed compounds. We ship, learn, and iterate faster than companies many times our size.", hue: "eclipse" },
  { n: "03", title: "Earn trust through ownership", body: "From day one you own real decisions. Trust is the default, not the reward.", hue: "aurora" },
  { n: "04", title: "Learn relentlessly", body: "We're a learning company. Curiosity and growth aren't perks here, they're the work.", hue: "stellar" },
  { n: "05", title: "Obsess over customer impact", body: "Real results for real organizations. Outcomes over output, always.", hue: "nova" },
];

export type GrowthTheme = { title: string; body: string };
export const growth: GrowthTheme[] = [
  { title: "Career acceleration", body: "Clear paths, senior mentorship, and the room to outgrow your title." },
  { title: "Learning", body: "Annual budget for courses, conferences, and professional certifications." }, // real (/life)
  { title: "Well-being", body: "Flexible time off you're trusted to manage, and a team that means it." }, // real (/life)
  { title: "Flexibility", body: "Hybrid and remote-friendly arrangements across the MENA region." }, // real (/life)
  { title: "Rewards", body: "Competitive compensation, health insurance, and benefits." }, // PLACEHOLDER: confirm specifics
  { title: "Ownership", body: "Your ideas shape the product, the team, and the company from day one." },
];

export type TeamMember = {
  name: string; role: string; department: string; location: string;
  avatar: string; photo: string; bio: string;
};
// Real team — moved verbatim from the retiring LifeAtLumofy.tsx.
export const teamMembers: TeamMember[] = [
  { name: "Ahmed Faraj", role: "Founder & CEO", department: "Leadership", location: "Bahrain", avatar: "AF", photo: "/lovable-uploads/ecf0ce79-94a1-485b-8b6b-3bb501b26321.jpg", bio: "15+ years in EdTech and HRTech. Drives Lumofy's vision to reshape how the region develops talent." },
  { name: "Mahmood Malik", role: "Cofounder & COO", department: "Leadership", location: "Bahrain", avatar: "MM", photo: "/lovable-uploads/a881206e-7d4e-443b-9591-07fbd427a0be.jpg", bio: "Operational strategist scaling Lumofy's processes, partnerships, and go-to-market across MENA." },
  { name: "Suzan Alkhriesat", role: "Senior Finance Manager", department: "Finance", location: "Bahrain", avatar: "SA", photo: "/lovable-uploads/0aa8eb0b-531f-4d4c-b360-7e6d1bf82d31.jpg", bio: "Keeps the financial engine running, from budgeting and forecasting to ensuring sustainable growth." },
  { name: "Hasan Alhashimi", role: "Employee Engagement & HR Ops Lead", department: "People & Culture", location: "Bahrain", avatar: "HA", photo: "/lovable-uploads/a82f5de3-82d3-4b03-9f19-85a62252e6d8.jpg", bio: "Champions employee wellbeing and streamlines HR operations to keep the team thriving." },
  { name: "Mahmoud Elrweny", role: "Customer Success & Professional Service Director", department: "Customer Success", location: "Bahrain", avatar: "ME", photo: "/lovable-uploads/a4a73021-bfc4-4bde-8bb2-1338418a13e2.jpg", bio: "Ensures every client achieves measurable talent outcomes with hands-on strategic support." },
  { name: "Shehab Beram", role: "Senior Product Manager", department: "Product", location: "Remote", avatar: "SB", photo: "/lovable-uploads/72097222-3975-48f3-b226-c02d3e10ad53.jpg", bio: "Translates customer needs into product roadmaps that ship fast and delight users." },
  { name: "Husain Alsayyad", role: "Acting Revenue Director", department: "Revenue", location: "Bahrain", avatar: "HA", photo: "/lovable-uploads/43c6c44e-9e97-4d4d-b00f-74541f108978.jpg", bio: "Drives revenue growth and commercial strategy across enterprise and mid-market segments." },
  { name: "Safa AlFulaij", role: "Tech Lead", department: "Engineering", location: "Bahrain", avatar: "TM", photo: "/lovable-uploads/94c2428a-fa7d-41b7-a57e-2b8c3b2c5ac1.jpg", bio: "Architects scalable systems and leads the engineering team building Lumofy's core platform." },
];

export type Story = { name: string; role: string; photo: string; quote: string; tenure: string };
// Real testimonials — moved verbatim from the retiring LifeAtLumofy.tsx.
export const stories: Story[] = [
  { name: "Suzan Alkhriesat", role: "Senior Finance Manager", photo: "/lovable-uploads/0aa8eb0b-531f-4d4c-b360-7e6d1bf82d31.jpg", quote: "What sets Lumofy apart is the trust. From day one, I had ownership of real decisions, not busywork. That's rare.", tenure: "2 years" },
  { name: "Hasan Alhashimi", role: "Employee Engagement & HR Ops Lead", photo: "/lovable-uploads/a82f5de3-82d3-4b03-9f19-85a62252e6d8.jpg", quote: "I get to practice what we preach, building an employee experience that actually works. The culture here isn't a poster on a wall.", tenure: "1.5 years" },
  { name: "Mahmoud Elrweny", role: "CS & Professional Service Director", photo: "/lovable-uploads/a4a73021-bfc4-4bde-8bb2-1338418a13e2.jpg", quote: "Our clients don't just use the platform, they see real results. Being part of those transformations keeps me motivated every day.", tenure: "3 years" },
  { name: "Shehab Beram", role: "Senior Product Manager", photo: "/lovable-uploads/72097222-3975-48f3-b226-c02d3e10ad53.jpg", quote: "The speed here is unreal. We ideate, ship, and iterate faster than teams three times our size. And the team actually listens.", tenure: "1 year" },
];

// Recruiter for the closing human handoff (real — from site.ts + team photo).
export const recruiter = {
  name: SITE.recruiter.name, // Hasan Alhashimi
  title: SITE.recruiter.title,
  email: SITE.careersEmail,
  photo: "/lovable-uploads/a82f5de3-82d3-4b03-9f19-85a62252e6d8.jpg",
};

// Hiring steps — real, moved verbatim from HiringProcess.tsx.
export const hiringSteps = [
  { n: "01", title: "Apply", desc: "Send your application in a few minutes. No endless forms." },
  { n: "02", title: "Intro call", desc: "A friendly conversation with our talent team to get to know you." },
  { n: "03", title: "Meet the team", desc: "Interviews with the people you'll actually work alongside." },
  { n: "04", title: "Offer", desc: "We move fast, keep you informed, and welcome you aboard." },
];

// FAQs — real, moved verbatim from FAQ.tsx.
export const faqs = [
  { q: "How long does the hiring process take?", a: "Most processes wrap up in two to three weeks, and you'll hear back from us within five business days of applying." },
  { q: "Do you support remote work?", a: "Yes. We support flexible, hybrid working (many roles can be fully remote) with team members across 10+ countries and offices in Bahrain and Saudi Arabia." },
  { q: "What is your interview process like?", a: "A short intro call with our talent team, then interviews with the people you'll actually work with. We focus on real problems, not trick questions." },
  { q: "What growth and learning opportunities will I have?", a: "Plenty. Lumofy is built around capability-building, so you'll get real ownership early, continuous learning, and clear paths to grow your skills and your career as we scale." },
  { q: "What do you look for in candidates?", a: "Curiosity, ownership, and a genuine drive to build. We care more about how you think and what you've built than about a perfect CV." },
  { q: "I don't see a role that fits. Can I still apply?", a: "Absolutely. Browse our open roles and apply to the closest match, and tell us where you'd add the most value." },
];
