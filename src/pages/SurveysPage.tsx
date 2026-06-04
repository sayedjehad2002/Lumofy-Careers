import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import lumofyLogo from "@/assets/lumofy-logo.jpg";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import DashboardAuth from "@/components/careers/DashboardAuth";
import SurveysDashboardTab from "@/components/surveys/SurveysDashboardTab";
import { toast } from "sonner";

const SurveysPage = () => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  const handleAuth = (token: string) => {
    setSessionToken(token);
    setAuthenticated(true);
  };

  if (!authenticated) {
    return <DashboardAuth onAuthenticated={handleAuth} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <img src={lumofyLogo} alt="Lumofy" className="w-7 h-7 rounded-md bg-white/90 p-0.5 object-contain" />
            </Link>
            <div className="h-5 w-px bg-border" />
            <h1 className="text-sm font-semibold text-foreground">Surveys</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SurveysDashboardTab sessionToken={sessionToken!} />
      </div>
    </div>
  );
};

export default SurveysPage;
