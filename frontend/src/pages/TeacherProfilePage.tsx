import React, { useState, useEffect } from "react";
import { academicApi } from "../api/academicApi";
import type { UserProfile } from "../types/academic";
import {
  Key,
  Save,
  GraduationCap
} from "lucide-react";

interface TeacherProfilePageProps {
  onLogout?: () => void;
}

export const TeacherProfilePage: React.FC<TeacherProfilePageProps> = ({ onLogout }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Professor");
  const [department, setDepartment] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    academicApi.getProfile().then((data) => {
      setProfile(data);
      setFullName(data.full_name || "");
      setEmail(data.email || "");
      setRole(data.role || "Professor");
      setDepartment(data.department || "");
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedMessage(null);

    try {
      const payload: any = {
        full_name: fullName.trim(),
        email: email.trim(),
        role: role.trim(),
        department: department.trim()
      };
      if (customApiKey.trim()) {
        payload.gemini_api_key = customApiKey.trim();
      }

      await academicApi.updateProfile(payload);
      const updated = await academicApi.getProfile();
      setProfile(updated);
      setCustomApiKey("");
      setSavedMessage("Profile updated successfully!");
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err) {
      alert("Error updating profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="teacher-profile-page pb-24" style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
          Faculty Profile
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
          Faculty details and academic credentials
        </p>
      </div>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "2rem",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)"
        }}
      >
        {/* Profile Card Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", paddingBottom: "1.5rem", borderBottom: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "#0f172a",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              fontWeight: 800
            }}
          >
            <GraduationCap size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a" }}>
              {profile?.full_name || "Faculty Profile"}
            </h2>
            <div style={{ fontSize: "0.85rem", color: "#475569" }}>
              {profile?.role || "Faculty"} • {profile?.department || "Academic Department"}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                Official Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                Academic Role
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                Department
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              />
            </div>
          </div>

          {/* Optional Gemini API Key Override */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.35rem" }}>
              <Key size={16} style={{ color: "#2563eb" }} />
              <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>Gemini API Key (Optional)</strong>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.75rem" }}>
              Status: <strong>{profile?.has_custom_api_key ? `Configured (${profile.masked_api_key})` : "Using server environment key"}</strong>.
            </p>
            <input
              type="password"
              placeholder="Paste custom GEMINI_API_KEY if desired..."
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  padding: "0.55rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Sign Out
              </button>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginLeft: "auto" }}>
              {savedMessage && (
                <span style={{ color: "#16a34a", fontSize: "0.85rem", fontWeight: 600 }}>
                  {savedMessage}
                </span>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <Save size={15} />
                {isSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
