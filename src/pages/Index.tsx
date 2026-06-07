import Navbar from "@/components/careers/Navbar";
import Hero from "@/components/careers/Hero";
import HiringProcess from "@/components/careers/HiringProcess";
import FAQ from "@/components/careers/FAQ";
import JoinCTA from "@/components/careers/JoinCTA";
import Footer from "@/components/careers/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main">
        <Hero />
        <HiringProcess />
        <FAQ />
        <JoinCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
