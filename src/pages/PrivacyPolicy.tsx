import { LegalPage, LegalSection } from "@/components/careers/LegalPage";

const PrivacyPolicy = () => (
  <LegalPage
    title="Privacy Policy"
    updated="June 2026"
    intro="This policy explains what information Lumofy collects when you visit our careers site or apply for a role, how we use and protect it, and the choices you have. It applies to candidates and visitors of careers.lumofy.ai."
  >
    <LegalSection title="Information we collect">
      <p>When you apply for a role, we collect the details you provide: your name, email, phone number, location, nationality, any links you share (such as LinkedIn or a portfolio), your CV or resume, your cover letter, and your answers to any screening questions.</p>
      <p>We also collect basic technical information needed to run the site securely (such as request logs). We do not run advertising trackers.</p>
    </LegalSection>

    <LegalSection title="How we use your information">
      <p>We use your information to review and process your application, to communicate with you about it, and to improve our hiring process. If you ask us to keep your details on file, we may consider you for future roles.</p>
    </LegalSection>

    <LegalSection title="AI-assisted screening">
      <p>To help our team review applications fairly and efficiently, we use AI to analyze CVs and produce a structured summary and a fit score against the role. These outputs assist our recruiters; hiring decisions are made by people, not automatically by the AI.</p>
    </LegalSection>

    <LegalSection title="Legal basis">
      <p>We process your data based on your consent (which you give by submitting an application) and our legitimate interest in recruiting for open roles. You can withdraw your consent at any time by contacting us.</p>
    </LegalSection>

    <LegalSection title="How we store and protect it">
      <p>Applications are stored on Supabase infrastructure hosted in the European Union. Uploaded files are kept in private storage and are only accessible to authorized Lumofy HR users through time-limited, signed links. Access is restricted and protected by authentication.</p>
    </LegalSection>

    <LegalSection title="How long we keep it">
      <p>We keep your application for as long as it is under consideration and for a reasonable period afterwards in case a suitable role opens. You can ask us to delete your data sooner at any time.</p>
    </LegalSection>

    <LegalSection title="Sharing and disclosure">
      <p>We do not sell your personal data. Your application is accessible to authorized members of the Lumofy hiring team. We rely on a small number of service providers (for hosting and AI analysis) who process data on our behalf under confidentiality obligations. We may disclose information if required by law.</p>
    </LegalSection>

    <LegalSection title="Your rights">
      <p>You can ask us to access, correct, or delete your personal data, or to stop processing it. To exercise any of these rights, email <a href="mailto:hr@lumofy.com" className="text-primary hover:underline">hr@lumofy.com</a> and we will respond promptly.</p>
    </LegalSection>

    <LegalSection title="Cookies and local storage">
      <p>We use minimal browser storage to make the site work, for example to remember roles you save. We do not use third-party advertising cookies.</p>
    </LegalSection>

    <LegalSection title="Contact">
      <p>Lumofy, Sanabis, Bahrain. For any privacy question or request, contact <a href="mailto:hr@lumofy.com" className="text-primary hover:underline">hr@lumofy.com</a>.</p>
    </LegalSection>
  </LegalPage>
);

export default PrivacyPolicy;
