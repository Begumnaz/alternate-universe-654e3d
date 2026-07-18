// ── Type definitions for the Alternate Universe app ──

export interface NPC {
  id: string;
  name: string;
  occupation: string;
  relationship: string;
  traits: string;
}

export interface Demographics {
  age: number;
  occupation: string;
  socioeconomicStatus: string;
  location: string;
}

export interface NarrativeArc {
  backstory: string;
  turningPoints: string[];
  education: string;
  careerPath: string;
}

export interface ParallelLife {
  id: string;
  createdAt: string;
  basePersonality: string;
  demographics: Demographics;
  narrativeArc: NarrativeArc;
  socialWeb: NPC[];
  additionalDetails: Record<string, string>;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "gm";
  content: string;
}

export interface InterviewSession {
  lifeId: string;
  messages: ChatMessage[];
}

export interface RoleplaySession {
  lifeId: string;
  sceneContext: string;
  messages: ChatMessage[];
}

export interface SimulationRequest {
  profileA: ParallelLife;
  profileB: ParallelLife;
  scenario?: string;
}

export interface MeetingCatalyst {
  scenario: string;
  location: string;
  approach: string;
  dialoguePrompt: string;
}
