import React from "react";
import ReactDOM from "react-dom/client";
// Pretendard, bundled locally so it loads fully offline (CSP font-src 'self').
import "pretendard/dist/web/variable/pretendardvariable.css";
import App from "./App";
import { StickyApp } from "./components/StickyApp";

const stickyId = new URLSearchParams(window.location.search).get("sticky");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {stickyId ? <StickyApp pageId={stickyId} /> : <App />}
  </React.StrictMode>,
);
