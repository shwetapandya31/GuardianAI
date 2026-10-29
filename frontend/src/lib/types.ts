export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  department?: string;
  city?: string;
  emergencyContact?: string;
  profileImage: string;
  role: "user" | "admin";
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type Alert = {
  id: string;
  image?: string;
  message: string;
  cameraId: string;
  confidence: number;
  status: string;
  timestamp?: Date | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type Camera = {
  id: string;
  cameraId: string;
  name: string;
  location: string;
  streamUrl: string;
  status: string;
  enabled?: boolean;
  lastSeen?: Date | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type Severity = "critical" | "warning" | "info";

export function severityOf(confidence: number): Severity {
  if (confidence > 0.9) return "critical";
  if (confidence >= 0.75) return "warning";
  return "info";
}
