import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/careers/Navbar";
import ScrollThread from "@/components/careers/ScrollThread";
import HeroSection from "@/components/careers/sections/HeroSection";
import WhyItMattersSection from "@/components/careers/sections/WhyItMattersSection";
import WhatWeBuildSection from "@/components/careers/sections/WhatWeBuildSection";
import GrowthExperienceSection from "@/components/careers/sections/GrowthExperienceSection";
import ClosingSection from "@/components/careers/sections/ClosingSection";
import Footer from "@/components/careers/Footer";
import { prefersReducedMotion } from "@/lib/motion";

const Index = () => {
  // Anchor navigation: React Router doesn't auto-scroll to hashes, so do it here.
  // Works whether arriving from another route or changing hash while on `/`.
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    }
  }, [hash]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ScrollThread />
      <main id="main">
        <HeroSection />
        <WhyItMattersSection />
        <WhatWeBuildSection />
        <GrowthExperienceSection />
        <ClosingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
