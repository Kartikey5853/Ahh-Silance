/**
 * Root Application Component for Niera Faculty Console.
 * 
 * Features:
 * - Persistent Left Dock Sidebar Navigation
 * - Google Classroom Minimalist Dashboard
 * - Side-by-side Question Paper Split Screen & Magic Ink Evaluation
 * - Comprehensive Marks Register & Settings with Organization
 * - Real JWT authentication and SQLite database interactions
 */

import React, { useState, useEffect } from "react";
import { LoginPage } from "./pages/LoginPage";
import { Navbar } from "./components/Navbar";
import { LeftDock, type NavTab } from "./components/LeftDock";
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
  const [userOrgName, setUserOrgName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [navigationParams, setNavigationParams] = useState<any>({});

  const loadUserData = () => {
    Promise.all([
      academicApi.getProfile().catch(() => null),
      academicApi.listInstitutions().catch(() => [])
    ]).then(([p, insts]) => {
      if (p) {
        setIsAuthenticated(true);
        setUserName(p.full_name || p.username);
        if (p.institution_id && insts?.length > 0) {
          const match = insts.find((i: any) => i.id === p.institution_id);
          if (match) setUserOrgName(match.name);
          else if (insts[0]) setUserOrgName(insts[0].name);
        } else if (insts?.length > 0) {
          setUserOrgName(insts[0].name);
        }
      }
    }).catch(() => {
      authApi.logout();
      setIsAuthenticated(false);
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    loadUserData();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    loadUserData();
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    authApi.logout();
    setIsAuthenticated(false);
  };

  const handleNavigate = (tab: NavTab, params?: any) => {
    if (params) {
      setNavigationParams(params);
    } else {
      setNavigationParams({});
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
      {/* Persistent Left Dock Sidebar Navigation */}
      <LeftDock
        activeTab={activeTab}
        onTabChange={handleNavigate}
        onLogout={handleLogout}
        userName={userName}
        institutionName={userOrgName}
        onOpenQuickCheck={() => handleNavigate("exams", { mode: "create" })}
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
        />

        <main
          className="niera-page-body"
          style={{
            flex: 1,
            padding: "1.5rem 2rem 5rem 2rem",
            maxWidth: "1600px",
            width: "100%",
            margin: "0 auto"
          }}
        >
          {activeTab === "dashboard" && (
            <AcademicDashboardPage
              onNavigate={handleNavigate}
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
              initialMode={navigationParams.mode}
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
    </div>
  );
};

export default App;
