import React from "react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  User
} from "lucide-react";

export type NavTab = "dashboard" | "academics" | "students" | "exams" | "evaluation" | "profile";

interface BottomDockProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  activeTab,
  onTabChange
}) => {
  const dockItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={19} />
    },
    {
      id: "academics",
      label: "Subjects",
      icon: <BookOpen size={19} />
    },
    {
      id: "students",
      label: "Students",
      icon: <Users size={19} />
    },
    {
      id: "exams",
      label: "Exams",
      icon: <FileSpreadsheet size={19} />
    },
    {
      id: "evaluation",
      label: "Evaluation",
      icon: <CheckCircle2 size={19} />
    },
    {
      id: "profile",
      label: "Profile",
      icon: <User size={19} />
    }
  ];

  return (
    <div className="fixed-bottom-dock-container">
      <nav className="bottom-dock-pill" aria-label="Main Navigation Dock">
        {dockItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`dock-btn ${isActive ? "active" : ""}`}
              title={item.label}
              type="button"
            >
              <div className="dock-icon-wrapper">
                {item.icon}
              </div>
              <span className="dock-label">{item.label}</span>
              {isActive && <div className="dock-active-dot" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
