import Navbar from "@/components/careers/Navbar";
import Hero from "@/components/careers/Hero";
import Benefits from "@/components/careers/Benefits";
import BrowseTeams from "@/components/careers/BrowseTeams";
import HiringProcess from "@/components/careers/HiringProcess";
import FAQ from "@/components/careers/FAQ";
import JoinCTA from "@/components/careers/JoinCTA";
import Footer from "@/components/careers/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Benefits />
      <BrowseTeams />
      <HiringProcess />
      <FAQ />
      <JoinCTA />
      <Footer />
    </div>
  );
};

export default Index;
