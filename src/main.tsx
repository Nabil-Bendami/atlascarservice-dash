import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./index.css";
import { App } from "./App";
import { applyOwnerAppearance } from "./lib/theme";
import { OwnerSettingsProvider } from "./providers/OwnerSettingsProvider";
import { settingsService } from "./services/settingsService";

applyOwnerAppearance(settingsService.getCachedSettingsSnapshot());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <OwnerSettingsProvider>
        <App />
      </OwnerSettingsProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
