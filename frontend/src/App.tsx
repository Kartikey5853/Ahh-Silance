/**
 * Root Application Component for Ahh-Silance.
 * 
 * Manages user authentication state, view transitions between the login gateway,
 * evaluation submission dashboard, live result scorecards, and historical records.
 */

import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ResultPage } from "./pages/ResultPage";
import { HistoryPage } from "./pages/HistoryPage";
import type { AuthResponse } from "./types/auth";
import type { EvaluationScorecard } from "./types/evaluation";

export const App: React.FC = () => {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<AuthResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Active view state: "dashboard" | "history" | "result"
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "result">("dashboard");
  const [activeScorecard, setActiveScorecard] = useState<EvaluationScorecard | null>(null);

  /**
   * Reads persistent credentials from localStorage on initial render.
   */
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("auth_user");
    if (token && userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }
    setIsInitializing(false);
  }, []);

  /**
   * Handles user login completion and transitions to dashboard.
   */
  const handleLoginSuccess = (authData: AuthResponse) => {
    setCurrentUser(authData);
    setActiveTab("dashboard");
  };

  /**
   * Resets session state on user logout.
   */
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveScorecard(null);
    setActiveTab("dashboard");
  };

  /**
   * Receives computed scorecard from DashboardPage and switches to Result view.
   */
  const handleEvaluationComplete = (scorecard: EvaluationScorecard) => {
    setActiveScorecard(scorecard);
    setActiveTab("result");
  };

  /**
   * Loads an existing historical scorecard and switches to Result view.
   */
  const handleViewHistoricalScorecard = (scorecard: EvaluationScorecard) => {
    setActiveScorecard(scorecard);
    setActiveTab("result");
  };

  if (isInitializing) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading Ahh Silance Console...</p>
      </div>
    );
  }

  // If unauthenticated, present clean white login page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        username={currentUser.username}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeTab === "dashboard" && (
          <DashboardPage onEvaluationComplete={handleEvaluationComplete} />
        )}

        {activeTab === "result" && activeScorecard && (
          <ResultPage
            scorecard={activeScorecard}
            onBackToDashboard={() => setActiveTab("dashboard")}
          />
        )}

        {activeTab === "history" && (
          <HistoryPage onViewScorecard={handleViewHistoricalScorecard} />
        )}
      </main>
    </div>
  );
};

export default App;
