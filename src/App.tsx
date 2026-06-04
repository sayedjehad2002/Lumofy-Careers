import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CareersProvider } from "@/contexts/CareersContext";
import { AnimatePresence, motion } from "framer-motion";
import MobileBottomNav from "@/components/careers/MobileBottomNav";
import Index from "./pages/Index";
import JobsPage from "./pages/JobsPage";
import JobDetails from "./pages/JobDetails";
import ApplyPage from "./pages/ApplyPage";
import Dashboard from "./pages/Dashboard";
import AboutPage from "./pages/AboutPage";
import BenefitsPage from "./pages/BenefitsPage";
import LifeAtLumofy from "./pages/LifeAtLumofy";
import SurveyRespondPage from "./pages/SurveyRespondPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  type: "tween" as const,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  duration: 0.3,
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
        >
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/life" element={<LifeAtLumofy />} />
            <Route path="/benefits" element={<BenefitsPage />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/jobs/:id/apply" element={<ApplyPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/survey/:id/respond" element={<SurveyRespondPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      <MobileBottomNav />
    </>
  );
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CareersProvider>
            <AnimatedRoutes />
          </CareersProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
