import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AiBootScreen } from "./components/AiBootScreen";
import "dockview/dist/styles/dockview.css";
import "./i18n";
import "./ui/tokens.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AiBootScreen>
      <App />
    </AiBootScreen>
  </React.StrictMode>,
);
