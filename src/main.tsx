import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error handler for debugging
if (typeof window !== 'undefined') {
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', { message, source, lineno, colno, error });
    return false;
  };
  
  window.onunhandledrejection = function(event) {
    console.error('Unhandled promise rejection:', event.reason);
  };
}

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

// Performance monitoring
if (typeof window !== "undefined" && "performance" in window) {
  window.addEventListener("load", () => {
    // Log performance metrics in development
    if (IS_DEV) {
      setTimeout(() => {
        const perfData = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        if (perfData) {
          console.log("📊 Performance Metrics:", {
            "DOM Content Loaded": `${Math.round(perfData.domContentLoadedEventEnd)}ms`,
            "Load Complete": `${Math.round(perfData.loadEventEnd)}ms`,
            "First Paint": `${Math.round(performance.getEntriesByName("first-paint")[0]?.startTime || 0)}ms`,
          });
        }
      }, 0);
    }
  });
}

// Register service worker for PWA (production only)
if ("serviceWorker" in navigator && IS_PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("SW registration failed:", error);
    });
  });
}

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
