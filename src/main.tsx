import React from "react";
import ReactDOM from "react-dom/client";
// Pretendard, bundled locally so it loads fully offline (CSP font-src 'self').
import "pretendard/dist/web/variable/pretendardvariable.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
