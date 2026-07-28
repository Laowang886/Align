"use client";

import { useEffect, useState } from "react";
import styles from "../page.module.css";
import DashboardView from "./DashboardView";
import Header from "./Header";
import Icon from "./Icon";
import KanbanBoardView from "./KanbanBoardView";
import Sidebar from "./Sidebar";

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState("Dashboard");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 720px)");
    if (mobile.matches) setSidebarOpen(false);
  }, []);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function navigate(view: string) {
    if (view === "Dashboard" || view === "Kanban Board") setActiveView(view);
    else notify(`${view} view is coming next.`);
    if (window.matchMedia("(max-width: 720px)").matches) setSidebarOpen(false);
  }

  return (
    <div className={styles.app}>
      {sidebarOpen && <Sidebar activeView={activeView} onNavigate={navigate} />}
      {sidebarOpen && (
        <button
          type="button"
          className={styles.sidebarBackdrop}
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={styles.shell}>
        <Header onToggleSidebar={() => setSidebarOpen((open) => !open)} />
        <div className={styles.mainContent}>
          {activeView === "Dashboard" ? (
            <DashboardView />
          ) : (
            <KanbanBoardView onNotify={notify} />
          )}
        </div>
      </div>
      {toast && (
        <div className={styles.toast}>
          <Icon name="check" size={19} />
          {toast}
        </div>
      )}
    </div>
  );
}
