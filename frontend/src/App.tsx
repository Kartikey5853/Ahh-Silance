/**
 * Root Application Component for Ahh-Silance.
 * 
 * Direct entry point rendering the automated evaluation dashboard on root open.
 * Zero login screens or database gates required.
 */

import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { DashboardPage } from "./pages/DashboardPage";
import { ResultPage } from "./pages/ResultPage";
import type { EvaluationScorecard } from "./types/evaluation";

export const App: React.FC = () => {
  // Active view state: "dashboard" | "result"
  const [activeTab, setActiveTab] = useState<"dashboard" | "result">("dashboard");
  const [activeScorecard, setActiveScorecard] = useState<EvaluationScorecard | null>(null);

  /**
   * Receives computed scorecard from DashboardPage and switches to Result view.
   */
  const handleEvaluationComplete = (scorecard: EvaluationScorecard) => {
    setActiveScorecard(scorecard);
    setActiveTab("result");
  };

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        onSelectTab={() => setActiveTab("dashboard")}
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
      </main>
    </div>
  );
};

export default App;
