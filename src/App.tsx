import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CareersProvider } from "@/contexts/CareersContext";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import MobileBottomNav from "@/components/careers/MobileBottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";

// Route-level code splitting: the public site no longer ships the admin
// dashboard + its heavy libs (recharts/xlsx/jspdf/dnd) in the initial bundle.
const Index = lazy(() => import("./pages/Index"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const JobDetails = lazy(() => import("./pages/JobDetails"));
const ApplyPage = lazy(() => import("./pages/ApplyPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const HrJoin = lazy(() => import("./pages/HrJoin"));

// Sensible production defaults for any React Query usage. (The careers data layer
// currently lives in CareersContext with optimistic updates; this readies the
// already-mounted provider with cache/retry policy suited to a careers site.)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // careers content changes slowly — treat as fresh for 1 min
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Loading" />
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
        >
          <Suspense fallback={<PageLoader />}>
            <Routes location={location}>
              <Route path="/" element={<Index />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/jobs/:id/apply" element={<ApplyPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/hr/join" element={<HrJoin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
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
            <ErrorBoundary>
              {/* reducedMotion="user": every motion.* respects the OS prefers-reduced-motion setting */}
              <MotionConfig reducedMotion="user">
                <AnimatedRoutes />
              </MotionConfig>
            </ErrorBoundary>
          </CareersProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
