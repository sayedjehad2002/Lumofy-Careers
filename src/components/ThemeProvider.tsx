import { createContext, useContext, useEffect, useState } from "react";

// Lumofy careers ships LIGHT-first to match the lumofy.ai master brand (light
// corporate canvas with dark-canvas hero/footer bookends). Dark remains an
// option for the HR dashboard; the choice persists per-browser in localStorage.
type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const STORAGE_KEY = "lumofy-theme";

const ThemeContext = createContext<ThemeContextType>({ theme: "light", toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    try {
      return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  // NOTE: the <html> class is applied by ThemeRouteSync (App.tsx), which forces
  // the public careers pages to the light master-brand look and applies the
  // stored preference only inside the HR dashboard. This provider just owns the
  // state + persistence.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable (private mode) — theme still applies for the session */
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
