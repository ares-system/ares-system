"use client";

import { useState } from "react";

export default function FindingsPage() {
  const mockFindingsByRepo = [
    {
      repo: "daemon",
      findings: [
        { 
          id: 1, 
          severity: "critical", 
          title: "Hardcoded Helius API Key", 
          layer: "L6 Supply", 
          tool: "secret-scanner",
          description: "A production Helius API key was found hardcoded in `src/config.ts`. This poses a significant security risk as anyone with access to the source code can drain project resources.",
          remediation: "Move the API key to a `.env` file and exclude it from version control. Rotate the key immediately."
        },
        { 
          id: 2, 
          severity: "high", 
          title: "Missing .env.example", 
          layer: "Hygiene", 
          tool: "env-hygiene",
          description: "The repository lacks a `.env.example` template, making it difficult for new contributors to set up their environment correctly.",
          remediation: "Create a `.env.example` file with placeholder values for all required environment variables."
        }
      ]
    },
    {
      repo: "ASST",
      findings: [
        { 
          id: 3, 
          severity: "critical", 
          title: "Missing signer check on withdraw", 
          layer: "L1 On-chain", 
          tool: "semgrep",
          description: "The withdraw instruction does not verify that the authority account signed the transaction.",
          remediation: "Add the `Signer` constraint to the authority account."
        },
        { 
          id: 4, 
          severity: "high", 
          title: "Unchecked CPI return value", 
          layer: "L2 On-chain", 
          tool: "semgrep",
          description: "A Cross-Program Invocation to the token program does not verify the result.",
          remediation: "Use `anchor_lang::solana_program::program::invoke` or enforce checks."
        }
      ]
    }
  ];

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case "critical": return "var(--severity-critical)";
      case "high": return "var(--severity-high)";
      case "medium": return "var(--severity-medium)";
      case "low": return "var(--severity-low)";
      case "info": return "var(--severity-info)";
      default: return "var(--text-secondary)";
    }
  };

  const [selectedFinding, setSelectedFinding] = useState<any>(null);

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedFinding(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: "36px", marginBottom: "32px", fontFamily: "var(--font-serif)" }}>Unified Findings</h1>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        {mockFindingsByRepo.map((repoGroup) => (
          <div key={repoGroup.repo}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ padding: "4px 10px", background: "var(--brand-terracotta)", color: "white", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>Repo</div>
              <h2 style={{ fontSize: "20px", color: "var(--text-primary)", fontFamily: "var(--font-serif)" }}>{repoGroup.repo}</h2>
              <div style={{ flex: 1, height: "1px", background: "var(--border-light)" }}></div>
            </div>

            <div className="whisper-shadow bg-surface" style={{ borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", fontSize: "14px" }}>
                    <th style={{ padding: "12px 24px", fontWeight: "normal" }}>Severity</th>
                    <th style={{ padding: "12px 24px", fontWeight: "normal" }}>Finding</th>
                    <th style={{ padding: "12px 24px", fontWeight: "normal" }}>Layer</th>
                    <th style={{ padding: "12px 24px", fontWeight: "normal" }}>Tool</th>
                    <th style={{ padding: "12px 24px", fontWeight: "normal" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {repoGroup.findings.map((f) => (
                    <tr 
                      key={f.id} 
                      onClick={() => setSelectedFinding(f)}
                      style={{ 
                        borderBottom: "1px solid var(--border-light)", 
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-elevated)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", textTransform: "uppercase", fontSize: "12px", fontWeight: "bold", color: getSeverityColor(f.severity) }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: getSeverityColor(f.severity) }}></span>
                          {f.severity}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", color: "var(--text-primary)", fontWeight: "500" }}>{f.title}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{ background: "var(--bg-elevated)", padding: "4px 8px", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--text-secondary)" }}>
                          {f.layer}
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px", color: "var(--text-secondary)", fontSize: "14px", fontFamily: "var(--font-mono)" }}>{f.tool}</td>
                      <td style={{ padding: "16px 24px", textAlign: "right", color: "var(--brand-coral)" }}>
                        <span>View Details →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {selectedFinding && (
        <div 
          onClick={handleBackdropClick}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(20, 20, 19, 0.7)", /* Matches brand dark theme */
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "24px"
          }}
        >
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-xl)",
            width: "100%",
            maxWidth: "600px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            overflow: "hidden",
            animation: "fadeInUp 0.3s ease-out"
          }}>
            <div style={{ padding: "24px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <span style={{ 
                    color: getSeverityColor(selectedFinding.severity), 
                    textTransform: "uppercase", 
                    fontSize: "12px", 
                    fontWeight: "bold",
                    background: "var(--bg-parchment)",
                    padding: "4px 8px",
                    borderRadius: "4px"
                  }}>
                    {selectedFinding.severity}
                  </span>
                  <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                    Detected by {selectedFinding.tool}
                  </span>
                </div>
                <h2 style={{ fontSize: "20px", color: "var(--text-primary)", fontFamily: "var(--font-serif)" }}>
                  {selectedFinding.title}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedFinding(null)}
                style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: "24px", color: "var(--text-secondary)", lineHeight: "1.6", fontSize: "15px" }}>
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ color: "var(--text-primary)", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Description</h3>
                <p>{selectedFinding.description}</p>
              </div>
              
              <div>
                <h3 style={{ color: "var(--text-primary)", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Remediation</h3>
                <div style={{ background: "var(--bg-parchment)", padding: "16px", borderRadius: "var(--radius-md)", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--brand-coral)" }}>
                  {selectedFinding.remediation}
                </div>
              </div>
            </div>
            
            <div style={{ padding: "16px 24px", background: "var(--bg-elevated)", borderTop: "1px solid var(--border-light)", display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setSelectedFinding(null)}
                style={{ 
                  background: "var(--brand-coral)", 
                  color: "white", 
                  border: "none", 
                  padding: "8px 16px", 
                  borderRadius: "var(--radius-md)", 
                  cursor: "pointer",
                  fontWeight: "500"
                }}
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Basic keyframes for the modal popup to feel snappy and satisfying */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
