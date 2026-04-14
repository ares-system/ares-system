"use client";

import { useState, useEffect } from "react";

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
);
const SystemIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
);
const ActionIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);
const AgentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
);

export default function AgentConsole() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: "msg_1", type: "system", text: "ASST SecOps Agent initialized v0.1.0" },
    { id: "msg_2", type: "system", text: "Loaded 11 tools: solana_rpc, git_diff, write_manifest, merge_findings, account_snapshot, cpi_mapper, secret_scanner, env_hygiene, posture_report, program_analyzer, upgrade_monitor" },
    { id: "msg_3", type: "agent", text: "I am ready to perform a full assurance run or answer security questions about your repository." }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [toolModel, setToolModel] = useState("gemini-2.5-flash");

  const thinkingStates = [
    "Triggering LangChain backend...",
    "Analyzing repository context...",
    "Selecting appropriate SEC-OPS tools...",
    "Executing local security analysis...",
    "Synthesizing findings..."
  ];

  // Cycle through thinking states while loading
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setThinkingIndex((prev) => (prev + 1) % thinkingStates.length);
      }, 2500); // Change text every 2.5 seconds
    } else {
      setThinkingIndex(0);
    }
    return () => clearInterval(interval);
  }, [isLoading, thinkingStates.length]);

  const handleCommand = async (cmd: string) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), type: "user", text: cmd }]);
    setInput("");
    setIsLoading(true);
    setThinkingIndex(0);
    
    const actionId = crypto.randomUUID();
    // Optimistic action (will be dynamically overridden during render but we store a placeholder)
    setMessages(prev => [
      ...prev, 
      { id: actionId, type: "action", text: "THINKING_PLACEHOLDER" }
    ]);
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cmd, toolModel })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.details || data.error || "Unknown Error");
      }
      
      setMessages(prev => {
        // Remove the thinking placeholder and add the final response
        const filtered = prev.filter(m => m.id !== actionId);
        return [...filtered, { id: crypto.randomUUID(), type: "agent", text: data.response }];
      });
    } catch (e: any) {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== actionId);
        return [...filtered, { id: crypto.randomUUID(), type: "system", text: `API Error: ${e.message}` }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    handleCommand(input);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 128px)" }}>
      <h1 style={{ fontSize: "36px", marginBottom: "32px", fontFamily: "var(--font-serif)" }}>Agent Console</h1>
      
      <div className="whisper-shadow bg-surface" style={{ 
        flex: 1, 
        borderRadius: "var(--radius-xl)", 
        display: "flex", 
        flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* Chat area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ 
              display: "flex", 
              gap: "16px",
              fontFamily: msg.type === "action" || msg.type === "system" ? "var(--font-mono)" : "var(--font-sans)",
              fontSize: msg.type === "action" || msg.type === "system" ? "13px" : "15px",
              color: msg.type === "system" ? "var(--text-tertiary)" :
                     msg.type === "action" ? "var(--brand-coral)" :
                     msg.type === "user" ? "var(--text-primary)" : "var(--text-secondary)",
              lineHeight: "1.6"
            }}>
              <div style={{ 
                width: "28px", 
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: msg.type === "agent" ? "var(--brand-terracotta)" : "var(--text-tertiary)",
                marginTop: msg.type === "agent" || msg.type === "user" ? "2px" : "0px",
                background: msg.type === "agent" ? "var(--bg-parchment)" : "transparent",
                borderRadius: "6px",
                flexShrink: 0
              }}>
                {msg.type === "user" ? <UserIcon /> : msg.type === "agent" ? <AgentIcon /> : msg.type === "action" ? <ActionIcon /> : <SystemIcon />}
              </div>
              <div style={{ flex: 1, whiteSpace: "pre-wrap" }}>
                {msg.text === "THINKING_PLACEHOLDER" ? (
                  <span className="animate-pulse">{thinkingStates[thinkingIndex]}</span>
                ) : (
                  msg.text.split(/(\*\*.*?\*\*|\n|\[REPORT:.*?\])/g).map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={i} style={{ color: "var(--text-primary)", fontWeight: "600" }}>{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith('[REPORT:') && part.endsWith(']')) {
                      const repoName = part.slice(8, -1);
                      return (
                        <div key={i} style={{ marginTop: "12px" }}>
                          <button 
                            onClick={() => window.open(`/api/report?repo=${repoName}`, "_blank")} 
                            style={{ 
                              background: "var(--brand-terracotta)", 
                              border: "none", 
                              padding: "8px 16px", 
                              borderRadius: "var(--radius-md)", 
                              color: "white", 
                              fontSize: "14px", 
                              cursor: "pointer",
                              fontWeight: "600",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              boxShadow: "0 4px 12px rgba(181, 76, 56, 0.25)"
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            View Finalized {repoName} Report (PDF)
                          </button>
                        </div>
                      );
                    }
                    if (part === '\n') {
                      return <br key={i} />;
                    }
                    return <span key={i}>{part}</span>;
                  })
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-light)", display: "flex", gap: "12px", flexWrap: "wrap", background: "var(--bg-elevated)" }}>
          <span style={{ fontSize: "12px", color: "var(--text-tertiary)", alignSelf: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>Actions</span>
          <button onClick={() => handleCommand("Run full assurance lane")} style={{ 
            background: "var(--bg-surface)", border: "1px solid var(--border-light)", padding: "6px 12px", borderRadius: "100px", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" 
          }}>▶ Full Assurance</button>
          <button onClick={() => handleCommand("Scan uncommitted changes")} style={{ 
            background: "var(--bg-surface)", border: "1px solid var(--border-light)", padding: "6px 12px", borderRadius: "100px", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" 
          }}>🔍 Scan Diff</button>
          <button onClick={() => handleCommand("Analyze program accounts for specific PDA issues")} style={{ 
            background: "var(--bg-surface)", border: "1px solid var(--border-light)", padding: "6px 12px", borderRadius: "100px", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" 
          }}>🏦 Account Analysis</button>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tooling Model:</span>
            <select 
              value={toolModel} 
              onChange={(e) => setToolModel(e.target.value)}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-light)",
                borderRadius: "4px",
                color: "var(--text-secondary)",
                padding: "4px 8px",
                fontSize: "13px",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="gemini-2.5-flash">⭐ Google Gemini 2.5 Flash (Recommended)</option>
              <option value="gemini-2.0-flash-001">Google Gemini 2.0 Flash (Stable)</option>
              <option value="meta-llama/llama-3.3-70b-instruct:free">Meta Llama 3.3 70B (OpenRouter)</option>
              <option value="qwen/qwen3-coder:free">Qwen3 Coder (OpenRouter)</option>
              <option value="qwen/qwen3-next-80b-a3b-instruct:free">Qwen3 Next 80B (OpenRouter)</option>
            </select>
          </div>
        </div>

        {/* Input area */}
        <form onSubmit={handleSubmit} style={{ padding: "16px 24px", borderTop: "1px solid var(--border-strong)", display: "flex", gap: "16px", background: "var(--bg-parchment)" }}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the security agent to perform a task..." 
            style={{ 
              flex: 1,
              background: "transparent", 
              border: "none",
              color: "var(--text-primary)",
              fontSize: "16px",
              outline: "none"
            }} 
          />
          <button type="submit" disabled={!input.trim()} style={{ 
            background: input.trim() ? "var(--brand-terracotta)" : "var(--bg-elevated)", 
            border: "none",
            padding: "8px 24px",
            borderRadius: "var(--radius-lg)",
            color: input.trim() ? "#faf9f5" : "var(--text-tertiary)",
            fontWeight: "500",
            cursor: input.trim() ? "pointer" : "not-allowed",
            transition: "all 0.2s"
          }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
