// packages/shared/src/types/support.ts
export type FeedbackType = "general" | "bug" | "feature" | "usability";
export type SafetyCategory = "harassment" | "exploit" | "privacy" | "other";

export interface CreateFeedbackInput {
  type: FeedbackType;
  content: string;
}

export interface CreateSafetyReportInput {
  category: SafetyCategory;
  description: string;
}

export interface FeedbackSubmission {
  id: string;
  type: FeedbackType;
  content: string;
  createdAt: string;
}

export interface SafetyReport {
  id: string;
  category: SafetyCategory;
  description: string;
  status: string;
  createdAt: string;
}