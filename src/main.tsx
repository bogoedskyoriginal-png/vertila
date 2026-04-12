import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./styles.css";

function configureDynamicManifest() {
  const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  if (!manifestLink) return;
  const start = `${window.location.pathname}${window.location.search}${window.location.hash || ""}`;
  manifestLink.href = `/manifest.webmanifest?start=${encodeURIComponent(start)}&v=2`;
}

configureDynamicManifest();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
