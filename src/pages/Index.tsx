import Navbar from "@/components/careers/Navbar";
import ScrollThread from "@/components/careers/ScrollThread";
import HeroSection from "@/components/careers/sections/HeroSection";
import WhyItMattersSection from "@/components/careers/sections/WhyItMattersSection";
import WhatWeBuildSection from "@/components/careers/sections/WhatWeBuildSection";
import OperatingPrinciplesSection from "@/components/careers/sections/OperatingPrinciplesSection";
import GrowthExperienceSection from "@/components/careers/sections/GrowthExperienceSection";
import TeamStoriesSection from "@/components/careers/sections/TeamStoriesSection";
import OpenRolesSection from "@/components/careers/sections/OpenRolesSection";
import ClosingSection from "@/components/careers/sections/ClosingSection";
import Footer from "@/components/careers/Footer";

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <ScrollThread />
    <main id="main">
      <HeroSection />
      <WhyItMattersSection />
      <WhatWeBuildSection />
      <OperatingPrinciplesSection />
      <GrowthExperienceSection />
      <TeamStoriesSection />
      <OpenRolesSection />
      <ClosingSection />
    </main>
    <Footer />
  </div>
);

export default Index;
