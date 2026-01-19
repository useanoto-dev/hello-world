import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Environment flags (Vite)
const IS_DEV = import.meta.env.DEV;
const IS_PROD = import.meta.env.PROD;

// DEV SAFETY: if a Service Worker from a previous build is still registered,
// it can serve stale cached chunks and cause React hook runtime errors
// like "Cannot read properties of null (reading 'useEffect')".
if (typeof window !== "undefined" && IS_DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });

  // Clear SW caches (best-effort)
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

// Register service worker for PWA (production only)
if ("serviceWorker" in navigator && IS_PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration failed silently
    });
  });
}

const container = document.getElementById("root");

if (!container) {
  throw new Error('Root element not found');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
