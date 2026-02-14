import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink } from "react-router";
import "./index.css";
import App from "./App";
import HeadlessUppy from "./headless-uppy";

function Layout() {
  return (
    <div>
      <nav className="flex gap-4 border-b border-border px-6 py-3">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/headless"
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`
          }
        >
          Headless
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/headless" element={<HeadlessUppy />} />
      </Routes>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  </StrictMode>,
);
