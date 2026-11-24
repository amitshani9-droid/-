import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(<App />);

// PWA: offline + installable on the deployed site. Sandboxed previews refuse service workers; ignore that.
if ("serviceWorker" in navigator && location.protocol === "https:" && window.top === window) {
  addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
