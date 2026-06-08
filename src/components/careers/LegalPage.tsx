import { type ReactNode } from "react";
import Navbar from "@/components/careers/Navbar";
import Footer from "@/components/careers/Footer";

export const LegalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-8">
    <h2 className="mb-3 text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

export const LegalPage = ({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main id="main" className="px-4 pb-20 pt-28 sm:pt-32">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">{intro}</p>
        <div className="mt-10">{children}</div>
        <p className="mt-10 border-t border-border/60 pt-6 text-xs leading-relaxed text-muted-foreground">
          Questions about this page? Email{" "}
          <a href="mailto:hr@lumofy.com" className="text-primary hover:underline">hr@lumofy.com</a>. We may update this
          page from time to time; the date above reflects the latest revision.
        </p>
      </div>
    </main>
    <Footer />
  </div>
);
