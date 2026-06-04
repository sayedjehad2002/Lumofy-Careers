import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DashboardAuthProps {
  onAuthenticated: (sessionToken: string) => void;
}

const DashboardAuth = ({ onAuthenticated }: DashboardAuthProps) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-password", {
        body: { password },
      });

      if (data?.success && data?.sessionToken) {
        onAuthenticated(data.sessionToken);
        toast.success("Welcome to the HR Dashboard");
      } else if (error?.message?.includes("429")) {
        toast.error("Too many attempts. Please try again later.");
      } else {
        toast.error("Invalid password. Access denied.");
      }
    } catch (err: any) {
      if (err?.message?.includes("429")) {
        toast.error("Too many attempts. Please try again later.");
      } else {
        toast.error("Verification failed. Please try again.");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-card border border-border p-8 glow-blue-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">HR Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter admin password to access
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="bg-secondary border-border mt-1"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? "Verifying..." : "Access Dashboard"}
            </Button>
          </form>
          <p className="text-[11px] text-muted-foreground text-center mt-4">
            Contact Jhasan@lumofy.com for access
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardAuth;
