/**
 * Root Application Component for ACE College Faculty Evaluation Console.
 * 
 * Features:
 * - Real JWT authentication gate with LoginPage
 * - Real SQLite database interactions (zero mock data)
 * - Professor workflow at ACE College of Engineering
 * - Subject creation (Natural Language Processing)
 * - One-by-one student enrollment (Ram, Sham, Gyan)
 * - Fixed bottom dock anchored during page scroll
 */

import React, { useState, useEffect } from "react";
import { LoginPage } from "./pages/LoginPage";
import { Navbar } from "./components/Navbar";
import { BottomDock, type NavTab } from "./components/BottomDock";
import { AcademicDashboardPage } from "./pages/AcademicDashboardPage";
import { AcademicsHierarchyPage } from "./pages/AcademicsHierarchyPage";
import { StudentsRosterPage } from "./pages/StudentsRosterPage";
import { ExamManagementPage } from "./pages/ExamManagementPage";
import { StrictEvaluationPage } from "./pages/StrictEvaluationPage";
import { TeacherProfilePage } from "./pages/TeacherProfilePage";
import { authApi } from "./api/authApi";

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [navigationParams, setNavigationParams] = useState<any>({});

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    setIsAuthenticated(Boolean(token));
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    authApi.logout();
    setIsAuthenticated(false);
  };

  const handleNavigate = (tab: NavTab, params?: any) => {
    if (params) {
      setNavigationParams(params);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // If not logged in, show the clean LoginPage
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container" style={{ position: "relative", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleNavigate}
        onLogout={handleLogout}
        userName="Professor"
      />

      <main className="main-content" style={{ paddingBottom: "7rem" }}>
        {activeTab === "dashboard" && (
          <AcademicDashboardPage onNavigate={handleNavigate} />
        )}

        {activeTab === "academics" && (
          <AcademicsHierarchyPage onNavigate={handleNavigate} />
        )}

        {activeTab === "students" && (
          <StudentsRosterPage
            initialSubjectId={navigationParams.subjectId}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === "exams" && (
          <ExamManagementPage
            initialSubjectId={navigationParams.subjectId}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === "evaluation" && (
          <StrictEvaluationPage
            initialExamId={navigationParams.examId}
            initialStudentId={navigationParams.studentId}
            initialEvalId={navigationParams.evalId}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === "profile" && (
          <TeacherProfilePage onLogout={handleLogout} />
        )}
      </main>

      {/* Fixed Bottom Dock (Anchored during page scroll) */}
      <BottomDock
        activeTab={activeTab}
        onTabChange={(tab) => handleNavigate(tab)}
      />
    </div>
  );
};

export default App;
