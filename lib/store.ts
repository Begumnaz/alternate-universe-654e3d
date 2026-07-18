// ── In-memory Life Ledger store ──
// Each generated life is keyed by its ID and persists for the server session.

import { ParallelLife, InterviewSession, RoleplaySession, ChatMessage } from "./types";

const lifeLedger = new Map<string, ParallelLife>();
const interviewSessions = new Map<string, InterviewSession>();
const roleplaySessions = new Map<string, RoleplaySession>();

export function saveLife(life: ParallelLife): void {
  lifeLedger.set(life.id, life);
}

export function getLife(id: string): ParallelLife | undefined {
  return lifeLedger.get(id);
}

export function getAllLives(): ParallelLife[] {
  return Array.from(lifeLedger.values());
}

export function updateLifeDetails(id: string, details: Record<string, string>): ParallelLife | undefined {
  const life = lifeLedger.get(id);
  if (!life) return undefined;
  life.additionalDetails = { ...life.additionalDetails, ...details };
  lifeLedger.set(id, life);
  return life;
}

// Interview sessions
export function getInterviewSession(lifeId: string): InterviewSession {
  if (!interviewSessions.has(lifeId)) {
    interviewSessions.set(lifeId, { lifeId, messages: [] });
  }
  return interviewSessions.get(lifeId)!;
}

export function appendInterviewMessage(lifeId: string, msg: ChatMessage): void {
  const session = getInterviewSession(lifeId);
  session.messages.push(msg);
  interviewSessions.set(lifeId, session);
}

// Roleplay sessions
export function getRoleplaySession(lifeId: string): RoleplaySession | undefined {
  return roleplaySessions.get(lifeId);
}

export function createRoleplaySession(lifeId: string, sceneContext: string): RoleplaySession {
  const session: RoleplaySession = { lifeId, sceneContext, messages: [] };
  roleplaySessions.set(lifeId, session);
  return session;
}

export function appendRoleplayMessage(lifeId: string, msg: ChatMessage): void {
  const session = roleplaySessions.get(lifeId);
  if (session) {
    session.messages.push(msg);
  }
}

export function clearRoleplaySession(lifeId: string): void {
  roleplaySessions.delete(lifeId);
}
