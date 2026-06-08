import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Briefcase, Home, LayoutDashboard,
  Search, ArrowRight, Sparkles, Moon, Sun,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useCareers } from "@/contexts/CareersContext";

interface CommandPaletteProps {
  onNavigateDashboard?: (tab: string) => void;
  isDashboard?: boolean;
}

const CommandPalette = ({ onNavigateDashboard, isDashboard }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { isHrUser } = useCareers();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runAction = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  const pages = [
    { label: "Home", icon: Home, path: "/" },
    { label: "Browse Jobs", icon: Briefcase, path: "/jobs" },
    { label: "Growth", icon: Sparkles, path: "/#growth" },
    // HR Dashboard only surfaces for authorized HR users.
    ...(isHrUser ? [{ label: "HR Dashboard", icon: LayoutDashboard, path: "/dashboard" }] : []),
  ];

  const dashboardTabs = [
    { label: "Overview", tab: "overview" },
    { label: "Manage Jobs", tab: "jobs" },
    { label: "Applicants", tab: "applicants" },
    { label: "Pipeline", tab: "pipeline" },
    { label: "CV Library", tab: "cv-library" },
    { label: "EOS Calculator", tab: "eos-calculator" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, actions, or shortcuts..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {pages.map((p) => (
            <CommandItem
              key={p.path}
              onSelect={() => runAction(() => navigate(p.path))}
              className="gap-3"
            >
              <p.icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              {p.label}
              <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" aria-hidden="true" />
            </CommandItem>
          ))}
        </CommandGroup>

        {isDashboard && onNavigateDashboard && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Dashboard">
              {dashboardTabs.map((t) => (
                <CommandItem
                  key={t.tab}
                  onSelect={() => runAction(() => onNavigateDashboard(t.tab))}
                  className="gap-3"
                >
                  <LayoutDashboard className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  {t.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => runAction(() => toggleTheme())}
            className="gap-3"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            )}
            Toggle {theme === "dark" ? "light" : "dark"} mode
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground flex items-center gap-4">
        <span>↑↓ Navigate</span>
        <span>↵ Select</span>
        <span>Esc Close</span>
      </div>
    </CommandDialog>
  );
};

export default CommandPalette;
