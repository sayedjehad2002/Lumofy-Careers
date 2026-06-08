import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 3005,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy, independently-cached libs so route-lazy chunks don't
        // duplicate them and the public site doesn't ship admin-only vendors.
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "motion-vendor": ["framer-motion"],
          charts: ["recharts"],
          xlsx: ["xlsx"],
          pdf: ["jspdf", "jspdf-autotable", "html2canvas", "dompurify"],
          dnd: ["@hello-pangea/dnd"],
        },
      },
    },
  },
}));
