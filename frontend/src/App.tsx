/**
 * Root Application Component for Niera Faculty Console.
 * 
 * Features:
 * - Persistent Left Dock Sidebar Navigation
 * - Streamlined 3-Step Quick Check Exam Wizard
 * - Google Classroom Minimalist Dashboard
 * - Side-by-side Magic Ink Evaluation Workspace
 * - Comprehensive Marks Register & Roster with Organization Details
 * - Real JWT authentication and SQLite database interactions
 */

import React, { useState, useEffect } from "react";
import { LoginPage } from "./pages/LoginPage";
import { Navbar } from "./components/Navbar";
import { LeftDock, type NavTab } from "./components/LeftDock";
import { QuickCheckExamWizard } from "./components/QuickCheckExamWizard";
import { AcademicDashboardPage } from "./pages/AcademicDashboardPage";
import { AcademicsHierarchyPage } from "./pages/AcademicsHierarchyPage";
import { StudentsRosterPage } from "./pages/StudentsRosterPage";
import { ExamManagementPage } from "./pages/ExamManagementPage";
import { StrictEvaluationPage } from "./pages/StrictEvaluationPage";
import { TeacherProfilePage } from "./pages/TeacherProfilePage";
import { SubjectDetailPage } from "./pages/SubjectDetailPage";
import { authApi } from "./api/authApi";
import { academicApi } from "./api/academicApi";

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("Faculty");
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [navigationParams, setNavigationParams] = useState<any>({});
  const [showQuickCheck, setShowQuickCheck] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    academicApi
      .getProfile()
      .then((p) => {
        setIsAuthenticated(true);
        setUserName(p.full_name || p.username);
      })
      .catch(() => {
        authApi.logout();
        setIsAuthenticated(false);
      });
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    academicApi
      .getProfile()
      .then((p) => setUserName(p.full_name || p.username))
      .catch(() => {});
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
    <div
      className="niera-app-container"
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        position: "relative"
      }}
    >
      {/* Left Dock Sidebar Navigation */}
      <LeftDock
        activeTab={activeTab}
        onTabChange={handleNavigate}
        onLogout={handleLogout}
        userName={userName}
        onOpenQuickCheck={() => setShowQuickCheck(true)}
      />

      {/* Main Content Workspace Layout */}
      <div
        className="niera-layout-content"
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column"
        }}
      >
        <Navbar
          activeTab={activeTab}
          onSelectTab={handleNavigate}
          onLogout={handleLogout}
          userName={userName}
          onOpenQuickCheck={() => setShowQuickCheck(true)}
        />

        <main
          className="niera-page-body"
          style={{
            flex: 1,
            padding: "1.75rem 2rem 5rem 2rem",
            maxWidth: "1600px",
            width: "100%",
            margin: "0 auto"
          }}
        >
          {activeTab === "dashboard" && (
            <AcademicDashboardPage
              onNavigate={handleNavigate}
              onOpenQuickCheck={() => setShowQuickCheck(true)}
            />
          )}

          {activeTab === "subject-detail" && (
            <SubjectDetailPage
              subjectId={navigationParams.subjectId}
              onNavigate={handleNavigate}
              onBack={() => handleNavigate("dashboard")}
            />
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
      </div>

      {/* Effortless 3-Step Quick Check Exam Wizard Modal */}
      <QuickCheckExamWizard
        isOpen={showQuickCheck}
        onClose={() => setShowQuickCheck(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
};

export default App;
