/** Replanning proposals (ENG-257, API from ENG-256 / T8). Mirrors `ReplanView` on the backend. */

/** "no_change": the agent judged that nothing needs to change; it carries a summary and no items. */
export type ReplanStatus = "generating" | "pending" | "failed" | "no_change";

export type ReplanChange = "retitled" | "extended" | "merged" | "reinforcement";

export interface ReplanBefore {
  topicTitle: string | null;
  outcomeTexts: string[];
}

export interface ReplanAfter {
  topicTitle: string | null;
  description: string | null;
  outcomeTexts: string[];
}

export interface ReplanItem {
  slotId: string;
  date: string;
  sequenceNumber: number;
  change: ReplanChange;
  before: ReplanBefore;
  after: ReplanAfter;
  addition: string | null;
  reason: string | null;
  hasDocuments: boolean;
}

export interface ReplanProposal {
  id: string;
  status: ReplanStatus;
  trigger: string;
  triggerSlotId: string | null;
  summary: string | null;
  createdAt: string | null;
  items: ReplanItem[];
}

export interface ReplanStarted {
  id: string;
  status: "generating";
}

export interface ReplanDecision {
  id: string;
  status: string;
  slotIds: string[];
}
