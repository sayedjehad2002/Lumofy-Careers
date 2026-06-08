import { LegalPage, LegalSection } from "@/components/careers/LegalPage";

const Terms = () => (
  <LegalPage
    title="Terms of Service"
    updated="June 2026"
    intro="These terms govern your use of the Lumofy careers site at careers.lumofy.ai. By using the site or submitting an application, you agree to them."
  >
    <LegalSection title="Using the site">
      <p>You may use this site to learn about Lumofy, browse open roles, and apply for positions. Please use it lawfully and do not attempt to disrupt, scrape at scale, or gain unauthorized access to it.</p>
    </LegalSection>

    <LegalSection title="Your submissions">
      <p>When you apply, you confirm that the information you provide is accurate and that you have the right to share it, including your CV and any links. Please do not submit confidential information that belongs to someone else.</p>
    </LegalSection>

    <LegalSection title="No guarantee of employment">
      <p>Submitting an application does not create an employment relationship or any obligation for Lumofy to interview, hire, or respond beyond our normal process. Any offer of employment is governed by a separate, written agreement.</p>
    </LegalSection>

    <LegalSection title="Intellectual property">
      <p>The Lumofy name, logo, content, and design on this site belong to Lumofy and are protected by applicable laws. You may not reuse them without our permission.</p>
    </LegalSection>

    <LegalSection title="Third-party links and services">
      <p>The site may link to third-party sites or use third-party services (such as LinkedIn). We are not responsible for the content or practices of those third parties; their own terms and policies apply.</p>
    </LegalSection>

    <LegalSection title="Disclaimer and liability">
      <p>The site is provided on an "as is" basis. To the extent permitted by law, Lumofy is not liable for any indirect or consequential loss arising from your use of the site. Nothing in these terms limits any rights you have that cannot be excluded by law.</p>
    </LegalSection>

    <LegalSection title="Changes">
      <p>We may update these terms as the site evolves. The "last updated" date above shows the latest version, and continued use of the site means you accept the current terms.</p>
    </LegalSection>

    <LegalSection title="Governing law">
      <p>These terms are governed by the laws of the Kingdom of Bahrain.</p>
    </LegalSection>

    <LegalSection title="Contact">
      <p>Questions about these terms? Email <a href="mailto:hr@lumofy.com" className="text-primary hover:underline">hr@lumofy.com</a>.</p>
    </LegalSection>
  </LegalPage>
);

export default Terms;
