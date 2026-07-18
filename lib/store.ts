// ── Persistent Life Ledger store ──
// All data is stored in SQLite via lib/db.ts. Survives server restarts.

import db from "./db";
import {
  ParallelLife,
  InterviewSession,
  RoleplaySession,
  ChatMessage,
  MeetingCatalyst,
} from "./types";

// ── Character Sheets ──

export function saveLife(life: ParallelLife): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO character_sheets
      (id, created_at, base_personality, demographics_json, narrative_arc_json, social_web_json, additional_details_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    life.id,
    life.createdAt,
    life.basePersonality,
    JSON.stringify(life.demographics),
    JSON.stringify(life.narrativeArc),
    JSON.stringify(life.socialWeb),
    JSON.stringify(life.additionalDetails || {})
  );
}

export function getLife(id: string): ParallelLife | undefined {
  const row = db.prepare("SELECT * FROM character_sheets WHERE id = ?").get(id) as any;
  if (!row) return undefined;
  return rowToLife(row);
}

export function getAllLives(): ParallelLife[] {
  const rows = db.prepare("SELECT * FROM character_sheets ORDER BY created_at DESC").all() as any[];
  return rows.map(rowToLife);
}

export function updateLifeDetails(id: string, details: Record<string, string>): ParallelLife | undefined {
  const life = getLife(id);
  if (!life) return undefined;
  life.additionalDetails = { ...life.additionalDetails, ...details };
  saveLife(life);
  return life;
}

function rowToLife(row: any): ParallelLife {
  return {
    id: row.id,
    createdAt: row.created_at,
    basePersonality: row.base_personality,
    demographics: JSON.parse(row.demographics_json),
    narrativeArc: JSON.parse(row.narrative_arc_json),
    socialWeb: JSON.parse(row.social_web_json),
    additionalDetails: JSON.parse(row.additional_details_json || "{}"),
  };
}

// ── Interview Messages ──

export function getInterviewSession(lifeId: string): InterviewSession {
  const rows = db
    .prepare("SELECT role, content FROM interview_messages WHERE life_id = ? ORDER BY id ASC")
    .all(lifeId) as ChatMessage[];
  return { lifeId, messages: rows };
}

export function appendInterviewMessage(lifeId: string, msg: ChatMessage): void {
  db.prepare(
    "INSERT INTO interview_messages (life_id, role, content) VALUES (?, ?, ?)"
  ).run(lifeId, msg.role, msg.content);
}

// ── Roleplay Messages ──

export function getRoleplaySession(lifeId: string): RoleplaySession | undefined {
  const rows = db
    .prepare("SELECT role, content, scene_context FROM roleplay_messages WHERE life_id = ? ORDER BY id ASC")
    .all(lifeId) as any[];

  if (rows.length === 0) return undefined;

  const messages: ChatMessage[] = rows.map(r => ({ role: r.role, content: r.content }));
  const sceneContext = rows.find(r => r.scene_context)?.scene_context || "";

  return { lifeId, sceneContext, messages };
}

export function createRoleplaySession(lifeId: string, sceneContext: string): RoleplaySession {
  // Clear previous session for this life
  db.prepare("DELETE FROM roleplay_messages WHERE life_id = ?").run(lifeId);
  // Insert the opening GM narration with scene_context
  db.prepare(
    "INSERT INTO roleplay_messages (life_id, role, content, scene_context) VALUES (?, ?, ?, ?)"
  ).run(lifeId, "gm", sceneContext, sceneContext);
  const gmMsg: ChatMessage = { role: "gm", content: sceneContext };
  return { lifeId, sceneContext, messages: [gmMsg] };
}

export function appendRoleplayMessage(lifeId: string, msg: ChatMessage): void {
  db.prepare(
    "INSERT INTO roleplay_messages (life_id, role, content) VALUES (?, ?, ?)"
  ).run(lifeId, msg.role, msg.content);
}

export function clearRoleplaySession(lifeId: string): void {
  db.prepare("DELETE FROM roleplay_messages WHERE life_id = ?").run(lifeId);
}

// ── Simulation Logs ──

export function saveSimulationLog(id: string, lifeIdA: string, lifeIdB: string, story: string, scenario?: string): void {
  db.prepare(
    "INSERT OR REPLACE INTO simulation_logs (id, life_id_a, life_id_b, story, scenario, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, lifeIdA, lifeIdB, story, scenario || null, new Date().toISOString());
}

export function getSimulationLogs(): any[] {
  return db.prepare("SELECT * FROM simulation_logs ORDER BY created_at DESC").all();
}

// ── Meeting Catalysts ──

export function saveMeetingCatalyst(id: string, lifeId: string, catalyst: MeetingCatalyst): void {
  db.prepare(
    "INSERT OR REPLACE INTO meeting_catalysts (id, life_id, scenario, location, approach, dialogue_prompt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, lifeId, catalyst.scenario, catalyst.location, catalyst.approach, catalyst.dialoguePrompt, new Date().toISOString());
}

export function getMeetingCatalysts(lifeId?: string): any[] {
  if (lifeId) {
    return db.prepare("SELECT * FROM meeting_catalysts WHERE life_id = ? ORDER BY created_at DESC").all(lifeId);
  }
  return db.prepare("SELECT * FROM meeting_catalysts ORDER BY created_at DESC").all();
}
