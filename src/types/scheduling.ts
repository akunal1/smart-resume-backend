// Server-side types for scheduling functionality
export type Mode = "email" | "meeting";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface AISummaryResponse {
  summary: string;
  suggestedTitle: string;
  suggestedMode?: Mode;
}

export interface MeetingRequest {
  userEmail: string;
  userName?: string;
  dateISO: string;
  endDateISO: string;
  description?: string;
  attendees: string[];
  timezone: string;
  summary: string;
  conversation: string;
}

export interface EmailRequest {
  userEmail: string;
  userName?: string;
  description?: string;
  summary: string;
  conversation: string;
  icsAttachment?: string;
  subject?: string;
}

export interface MeetingResponse {
  eventId: string;
  htmlLink: string;
  hangoutLink: string;
}

export interface EmailResponse {
  messageId: string;
  status: "sent";
}

export interface ContactFormRequest {
  fullName: string;
  email: string;
  company?: string;
  subject: string;
  message: string;
}

export interface ContactFormResponse {
  messageId: string;
  status: "sent";
}
