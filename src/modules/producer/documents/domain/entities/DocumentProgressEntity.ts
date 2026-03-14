export interface DocumentProgress {
  totalRequired: number;
  completed: number;
  uploaded: number; // subido pero pendiente de validación
  pending: number;
  rejected: number;
  expired: number;
  percentComplete: number;
  items: DocumentProgressItem[];
}

export interface DocumentProgressItem {
  documentKey: string;
  documentName: string;
  level: "personal" | "upp";
  status: "completed" | "uploaded" | "pending" | "expired" | "rejected";
  uppId?: string;
  uppName?: string;
}
