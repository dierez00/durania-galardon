import type {
  AdminMvzDetallado,
  AdminMvzUpp,
  AdminMvzAvailableUpp,
  AdminMvzTest,
  AdminMvzVisitsPaginated,
} from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

export interface IAdminMvzDetailRepository {
  getById(id: string): Promise<AdminMvzDetallado | null>;
  getUpps(id: string): Promise<AdminMvzUpp[]>;
  /** Returns all UPPs that have no active assignment to ANY MVZ */
  getAvailableUpps(mvzId: string): Promise<AdminMvzAvailableUpp[]>;
  /** UPSERT: creates or re-activates the assignment row */
  assignUpp(mvzId: string, uppId: string): Promise<void>;
  /** Soft-delete: sets status='inactive' + unassigned_at=now() */
  unassignUpp(mvzId: string, uppId: string): Promise<void>;
  getTests(id: string): Promise<AdminMvzTest[]>;
  getVisits(id: string, page: number): Promise<AdminMvzVisitsPaginated>;
  updateStatus(id: string, status: "active" | "inactive"): Promise<void>;
  updateProfile(
    id: string,
    payload: { fullName?: string; licenseNumber?: string }
  ): Promise<void>;
  updateEmail(id: string, email: string): Promise<void>;
  deleteMvz(id: string): Promise<void>;
}
