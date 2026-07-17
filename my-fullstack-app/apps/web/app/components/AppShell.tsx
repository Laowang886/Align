"use client";

import { useState } from "react";
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

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function navigate(view: string) {
    if (view === "Dashboard" || view === "Kanban Board") setActiveView(view);
    else notify(`${view} view is coming next.`);
  }

  return (
    <div className={styles.app}>
      {sidebarOpen && <Sidebar activeView={activeView} onNavigate={navigate} />}
      <div className={styles.shell}>
        <Header onToggleSidebar={() => setSidebarOpen((open) => !open)} />
        {activeView === "Dashboard" ? (
          <DashboardView />
        ) : (
          <KanbanBoardView onNotify={notify} />
        )}
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
