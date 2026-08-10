import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureAttribution } from "./lib/attribution";

// Before React renders anything: by the time a candidate reaches the apply form,
// document.referrer is this site and the campaign tags have gone from the URL.
captureAttribution();

createRoot(document.getElementById("root")!).render(<App />);
