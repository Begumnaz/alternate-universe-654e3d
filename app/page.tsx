"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ParallelLife, ChatMessage, MeetingCatalyst } from "@/lib/types";

type Tab = "ledger" | "interview" | "roleplay" | "simulation" | "catalyst";

export default function Home() {
  // Core state
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("deepseek-chat");
  const [basePersonality, setBasePersonality] = useState("");
  const [life, setLife] = useState<ParallelLife | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("ledger");

  // Interview state
  const [interviewMessages, setInterviewMessages] = useState<ChatMessage[]>([]);
  const [interviewInput, setInterviewInput] = useState("");
  const [interviewLoading, setInterviewLoading] = useState(false);

  // Roleplay state
  const [rpMessages, setRpMessages] = useState<ChatMessage[]>([]);
  const [rpInput, setRpInput] = useState("");
  const [rpLoading, setRpLoading] = useState(false);
  const [rpStarted, setRpStarted] = useState(false);

  // Simulation state
  const [allLives, setAllLives] = useState<Array<{ id: string; createdAt: string; basePersonality: string; demographics: any }>>([]);
  const [simLifeA, setSimLifeA] = useState("");
  const [simLifeB, setSimLifeB] = useState("");
  const [simScenario, setSimScenario] = useState("");
  const [simStory, setSimStory] = useState("");
  const [simLoading, setSimLoading] = useState(false);

  // Catalyst state
  const [catalyst, setCatalyst] = useState<MeetingCatalyst | null>(null);
  const [catalystLoading, setCatalystLoading] = useState(false);

  const interviewEndRef = useRef<HTMLDivElement>(null);
  const rpEndRef = useRef<HTMLDivElement>(null);

  // Load API key + model from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("au_deepseek_key");
    if (savedKey) setApiKey(savedKey);
    const savedModel = localStorage.getItem("au_deepseek_model");
    if (savedModel) setModel(savedModel);
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("au_deepseek_key", key);
  };

  const saveModel = (m: string) => {
    setModel(m);
    localStorage.setItem("au_deepseek_model", m);
  };

  // Auto-scroll chat
  useEffect(() => { interviewEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [interviewMessages]);
  useEffect(() => { rpEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [rpMessages]);

  // Load all lives for simulation
  const fetchLives = useCallback(async () => {
    try {
      const res = await fetch("/api/lives");
      const data = await res.json();
      setAllLives(data.lives || []);
    } catch {}
  }, []);

  useEffect(() => { fetchLives(); }, [life, fetchLives]);

  // ── Generate Life ──
  const generateLife = async () => {
    if (basePersonality.trim().length < 10) {
      setError("Please describe your base personality in at least 10 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/generate-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePersonality, apiKey, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate life.");
      setLife(data.life);
      setInterviewMessages([]);
      setRpMessages([]);
      setRpStarted(false);
      setSimStory("");
      setCatalyst(null);
      setActiveTab("ledger");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Interview ──
  const sendInterview = async () => {
    if (!interviewInput.trim() || !life) return;
    const msg = interviewInput;
    setInterviewInput("");
    setInterviewLoading(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifeId: life.id, message: msg, apiKey, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Interview failed.");
      setInterviewMessages(prev => [...prev, ...(data.messages || [])]);
    } catch (e: any) {
      setInterviewMessages(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setInterviewLoading(false);
    }
  };

  // ── Roleplay ──
  const startRoleplay = async () => {
    if (!life) return;
    setRpLoading(true);
    setRpMessages([]);
    try {
      const res = await fetch("/api/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifeId: life.id, action: "start", apiKey, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Roleplay start failed.");
      setRpMessages(data.messages || []);
      setRpStarted(true);
    } catch (e: any) {
      setRpMessages([{ role: "gm", content: `Error: ${e.message}` }]);
    } finally {
      setRpLoading(false);
    }
  };

  const actRoleplay = async () => {
    if (!rpInput.trim() || !life) return;
    const msg = rpInput;
    setRpInput("");
    setRpLoading(true);
    try {
      const res = await fetch("/api/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifeId: life.id, action: "act", message: msg, apiKey, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed.");
      setRpMessages(prev => [...prev, ...(data.messages || [])]);
    } catch (e: any) {
      setRpMessages(prev => [...prev, { role: "gm", content: `Error: ${e.message}` }]);
    } finally {
      setRpLoading(false);
    }
  };

  // ── Simulation ──
  const runSimulation = async () => {
    if (!simLifeA || !simLifeB) {
      setError("Select both profiles for the simulation.");
      return;
    }
    setError("");
    setSimLoading(true);
    setSimStory("");
    try {
      const res = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifeIdA: simLifeA, lifeIdB: simLifeB, scenario: simScenario, apiKey, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Simulation failed.");
      setSimStory(data.story);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSimLoading(false);
    }
  };

  // ── Meeting Catalyst ──
  const generateCatalyst = async () => {
    if (!life) return;
    setCatalystLoading(true);
    setCatalyst(null);
    try {
      const res = await fetch("/api/meeting-catalyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifeId: life.id, apiKey, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Catalyst generation failed.");
      setCatalyst(data.catalyst);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCatalystLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, fn: () => void) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); fn(); }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 className="gradient-text" style={{ fontSize: "2.8rem", marginBottom: "0.5rem" }}>
          Alternate Universe
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", maxWidth: 500, margin: "0 auto" }}>
          Explore who you could have been. Generate a parallel life, interview your alternate self, and step into the role.
        </p>
      </header>

      {/* API Key + Model */}
      <div className="api-key-section">
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>🔑 DeepSeek Key</span>
        <input
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={e => saveApiKey(e.target.value)}
        />
        <select
          value={model}
          onChange={e => saveModel(e.target.value)}
          style={{ width: "auto", minWidth: 180, flexShrink: 0 }}
        >
          <option value="deepseek-chat">DeepSeek V3</option>
          <option value="deepseek-reasoner">DeepSeek R1</option>
        </select>
      </div>

      {/* Identity Seed */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>🧬 The Identity Seed</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem", fontSize: "0.9rem" }}>
          Describe your core personality. Be honest — quirks, flaws, values, fears. The AI uses this as the seed to generate a parallel version of you.
        </p>
        <textarea
          placeholder="E.g., I'm an anxious overthinker who craves stability but secretly fantasizes about burning it all down. I'm fiercely loyal to a fault, avoid confrontation, and have a restless curiosity I never act on..."
          value={basePersonality}
          onChange={e => setBasePersonality(e.target.value)}
          style={{ minHeight: 110 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {basePersonality.length} characters
          </span>
          <button className="btn btn-primary" onClick={generateLife} disabled={loading}>
            {loading ? (
              <><span className="animate-spin" style={{ display: "inline-block" }}>⏳</span> Generating...</>
            ) : (
              <>✨ Generate Parallel Life</>
            )}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "rgba(248,113,113,0.1)", borderRadius: 10, color: "var(--red)", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}
      </div>

      {/* Life Ledger + Tabs (only if life exists) */}
      {life && (
        <div className="animate-fade-in">
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: "1.5rem" }}>
            {(["ledger", "interview", "roleplay", "simulation", "catalyst"] as Tab[]).map(tab => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "ledger" && "📋 Life Ledger"}
                {tab === "interview" && "💬 Interview"}
                {tab === "roleplay" && "🎭 Roleplay"}
                {tab === "simulation" && "🔮 Simulation"}
                {tab === "catalyst" && "🌍 Real World"}
              </button>
            ))}
          </div>

          {/* ── TAB: Life Ledger ── */}
          {activeTab === "ledger" && (
            <div>
              {/* Demographics */}
              <div className="card" style={{ marginBottom: "1rem" }}>
                <h3 style={{ marginBottom: "0.75rem" }}>📊 Demographics</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                  <div><span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Age</span><p style={{ fontWeight: 600 }}>{life.demographics.age}</p></div>
                  <div><span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Occupation</span><p style={{ fontWeight: 600 }}>{life.demographics.occupation}</p></div>
                  <div><span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Status</span><p style={{ fontWeight: 600 }}>{life.demographics.socioeconomicStatus}</p></div>
                  <div><span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Location</span><p style={{ fontWeight: 600 }}>{life.demographics.location}</p></div>
                </div>
              </div>

              {/* Narrative Arc */}
              <div className="card" style={{ marginBottom: "1rem" }}>
                <h3 style={{ marginBottom: "0.75rem" }}>📖 Narrative Arc</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Education</span>
                    <p style={{ fontSize: "0.9rem" }}>{life.narrativeArc.education}</p>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Career Path</span>
                    <p style={{ fontSize: "0.9rem" }}>{life.narrativeArc.careerPath}</p>
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Backstory</span>
                  <p style={{ fontSize: "0.9rem", lineHeight: 1.7, marginTop: "0.25rem" }}>{life.narrativeArc.backstory}</p>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Turning Points</span>
                  <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem" }}>
                    {life.narrativeArc.turningPoints.map((tp, i) => (
                      <li key={i} style={{ marginBottom: "0.35rem", fontSize: "0.9rem" }}>{tp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Social Web */}
              <div className="card">
                <h3 style={{ marginBottom: "0.75rem" }}>🕸️ Social Web</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
                  {life.socialWeb.map(npc => (
                    <div key={npc.id} className="npc-card">
                      <p style={{ fontWeight: 700, marginBottom: "0.15rem" }}>{npc.name}</p>
                      <p style={{ color: "var(--accent3)", fontSize: "0.85rem", marginBottom: "0.25rem" }}>{npc.occupation}</p>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>{npc.relationship}</p>
                      <p style={{ fontSize: "0.8rem" }}>{npc.traits}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Interview ── */}
          {activeTab === "interview" && (
            <div className="card" style={{ display: "flex", flexDirection: "column", height: "auto" }}>
              <h3 style={{ marginBottom: "0.5rem" }}>💬 Character Reflection</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Ask your parallel self anything. The AI stays in character using your Life Ledger.
              </p>
              <div className="chat-container" style={{ minHeight: 300, maxHeight: 420 }}>
                {interviewMessages.length === 0 && (
                  <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem 0", fontSize: "0.9rem" }}>
                    Ask something like: <em>"What does your living room look like?"</em> or <em>"How do you feel about your sister?"</em>
                  </p>
                )}
                {interviewMessages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.role}`}>
                    <div className="label">{m.role === "user" ? "You" : "Character"}</div>
                    {m.content}
                  </div>
                ))}
                {interviewLoading && (
                  <div className="chat-bubble assistant">
                    <div className="label">Character</div>
                    <span className="loading-dots">Thinking</span>
                  </div>
                )}
                <div ref={interviewEndRef} />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <input
                  placeholder="Ask about your parallel life..."
                  value={interviewInput}
                  onChange={e => setInterviewInput(e.target.value)}
                  onKeyDown={e => handleKeyDown(e, sendInterview)}
                  disabled={interviewLoading}
                />
                <button className="btn btn-primary" onClick={sendInterview} disabled={interviewLoading || !interviewInput.trim()}>
                  Send
                </button>
              </div>
            </div>
          )}

          {/* ── TAB: Roleplay ── */}
          {activeTab === "roleplay" && (
            <div className="card" style={{ display: "flex", flexDirection: "column" }}>
              <h3 style={{ marginBottom: "0.5rem" }}>🎭 Roleplay Mode</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                The AI acts as Game Master. It sets the scene — you act out your character in real time.
              </p>

              {!rpStarted ? (
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                  <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
                    Ready to step into your parallel life? The GM will drop you into a scene from your character's daily life.
                  </p>
                  <button className="btn btn-accent3" onClick={startRoleplay} disabled={rpLoading}>
                    {rpLoading ? "Setting the scene..." : "🎬 Begin Roleplay"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="chat-container" style={{ minHeight: 250, maxHeight: 400 }}>
                    {rpMessages.map((m, i) => (
                      <div key={i} className={`chat-bubble ${m.role === "gm" ? "gm" : "user"}`}>
                        <div className="label">{m.role === "gm" ? "GM" : "You"}</div>
                        {m.content}
                      </div>
                    ))}
                    {rpLoading && (
                      <div className="chat-bubble gm">
                        <div className="label">GM</div>
                        <span className="loading-dots">Narrating</span>
                      </div>
                    )}
                    <div ref={rpEndRef} />
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                    <input
                      placeholder="What do you do or say?"
                      value={rpInput}
                      onChange={e => setRpInput(e.target.value)}
                      onKeyDown={e => handleKeyDown(e, actRoleplay)}
                      disabled={rpLoading}
                    />
                    <button className="btn btn-accent3" onClick={actRoleplay} disabled={rpLoading || !rpInput.trim()}>
                      Act
                    </button>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={startRoleplay}
                    disabled={rpLoading}
                    style={{ marginTop: "0.75rem", alignSelf: "center", fontSize: "0.8rem" }}
                  >
                    🔄 New Scene
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── TAB: Simulation ── */}
          {activeTab === "simulation" && (
            <div className="card">
              <h3 style={{ marginBottom: "0.5rem" }}>🔮 Simulation Mode</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                See how two parallel lives intersect. The AI writes a literary scene predicting how these characters meet and interact.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>Profile A {life && "(you)"}</label>
                  <select value={simLifeA} onChange={e => setSimLifeA(e.target.value)}>
                    <option value="">Select profile...</option>
                    {allLives.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.demographics.occupation}, {l.demographics.location} {l.id === life?.id ? "← you" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>Profile B</label>
                  <select value={simLifeB} onChange={e => setSimLifeB(e.target.value)}>
                    <option value="">Select profile...</option>
                    {allLives.filter(l => l.id !== simLifeA).map(l => (
                      <option key={l.id} value={l.id}>
                        {l.demographics.occupation}, {l.demographics.location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <input
                placeholder="Optional: suggest a meeting context (e.g., 'at a medical conference')"
                value={simScenario}
                onChange={e => setSimScenario(e.target.value)}
                style={{ marginBottom: "1rem" }}
              />
              <button className="btn btn-accent2" onClick={runSimulation} disabled={simLoading || !simLifeA || !simLifeB}>
                {simLoading ? "Writing scene..." : "💫 Simulate Meeting"}
              </button>
              {simStory && (
                <div className="animate-fade-in" style={{ marginTop: "1.5rem", padding: "1.5rem", background: "var(--surface2)", borderRadius: 12, border: "1px solid var(--border)", lineHeight: 1.75, fontSize: "0.9rem", fontStyle: "italic" }}>
                  {simStory.split("\n").map((p, i) => (
                    <p key={i} style={{ marginBottom: "0.75rem" }}>{p}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Meeting Catalyst ── */}
          {activeTab === "catalyst" && (
            <div className="card">
              <h3 style={{ marginBottom: "0.5rem" }}>🌍 Generate Meeting Catalyst</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                A specific, actionable scenario to embody your parallel self in the real world. Not a story — a concrete plan.
              </p>
              <button className="btn btn-accent2" onClick={generateCatalyst} disabled={catalystLoading}>
                {catalystLoading ? "Generating..." : "🎯 Generate Catalyst"}
              </button>
              {catalyst && (
                <div className="animate-fade-in" style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ padding: "1rem", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase" }}>The Scenario</span>
                    <p style={{ marginTop: "0.25rem", lineHeight: 1.7 }}>{catalyst.scenario}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div style={{ padding: "1rem", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--accent3)", fontWeight: 600, textTransform: "uppercase" }}>Location</span>
                      <p style={{ marginTop: "0.25rem", fontWeight: 600 }}>{catalyst.location}</p>
                    </div>
                    <div style={{ padding: "1rem", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--accent2)", fontWeight: 600, textTransform: "uppercase" }}>Dialogue Prompt</span>
                      <p style={{ marginTop: "0.25rem", fontWeight: 500, fontStyle: "italic" }}>"{catalyst.dialoguePrompt}"</p>
                    </div>
                  </div>
                  <div style={{ padding: "1rem", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--green)", fontWeight: 600, textTransform: "uppercase" }}>How to Approach</span>
                    <p style={{ marginTop: "0.25rem", lineHeight: 1.65 }}>{catalyst.approach}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!life && !loading && (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>🌀</p>
          <p style={{ fontSize: "1.1rem" }}>Describe your base personality above and generate your parallel life.</p>
          <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>The AI will create a complete character sheet with demographics, backstory, and social connections.</p>
        </div>
      )}
    </div>
  );
}
