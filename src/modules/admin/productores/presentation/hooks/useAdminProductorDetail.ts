"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getProductorDetailUseCase,
  getProductorUppsUseCase,
  getProductorDocumentsUseCase,
  getProductorVisitsUseCase,
  updateProductorStatusUseCase,
  updateProductorInfoUseCase,
  deleteProductorUseCase,
} from "@/modules/admin/productores/infra/container";
import { UpdateAdminProductorInfoValidationError } from "@/modules/admin/productores/application/dto/UpdateAdminProductorInfoDTO";
import type {
  AdminProductorDetallado,
  AdminProductorDocument,
  AdminProductorUpp,
  AdminProductorVisit,
} from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";

export type ProductorDetailTab = "info" | "upps" | "documentos" | "visitas";

export function useAdminProductorDetail(id: string) {
  const router = useRouter();

  // ── Detail ──────────────────────────────────────────────────────────────────
  const [detail, setDetail] = useState<AdminProductorDetallado | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [errorDetail, setErrorDetail] = useState("");

  // ── UPPs ────────────────────────────────────────────────────────────────────
  const [upps, setUpps] = useState<AdminProductorUpp[]>([]);
  const [loadingUpps, setLoadingUpps] = useState(false);

  // ── Documents ───────────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<AdminProductorDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // ── Visits ──────────────────────────────────────────────────────────────────
  const [visits, setVisits] = useState<AdminProductorVisit[]>([]);
  const [visitsTotal, setVisitsTotal] = useState(0);
  const [visitsPage, setVisitsPage] = useState(1);
  const [loadingVisits, setLoadingVisits] = useState(false);

  // ── Active Tab ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ProductorDetailTab>("info");

  // ── Status actions ──────────────────────────────────────────────────────────
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // ── Inline edit ────────────────────────────────────────────────
  const [editingField, setEditingField] = useState<"fullName" | "email" | "curp" | null>(null);
  const [isSavingField, setIsSavingField] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  // ── Load detail ─────────────────────────────────────────────────────────────
  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    setErrorDetail("");
    try {
      const data = await getProductorDetailUseCase.execute(id);
      if (data) {
        setDetail(data);
      } else {
        setErrorDetail("No se encontró el productor.");
      }
    } catch {
      setErrorDetail("Error al cargar los datos del productor.");
    } finally {
      setLoadingDetail(false);
    }
  }, [id]);

  // ── Load UPPs (lazy, on tab switch) ─────────────────────────────────────────
  const loadUpps = useCallback(async () => {
    if (upps.length > 0) return; // already loaded
    setLoadingUpps(true);
    try {
      const data = await getProductorUppsUseCase.execute(id);
      setUpps(data);
    } catch {
      // silently fail — UI shows empty state
    } finally {
      setLoadingUpps(false);
    }
  }, [id, upps.length]);

  // ── Load Documents (lazy) ────────────────────────────────────────────────────
  const loadDocuments = useCallback(async () => {
    if (documents.length > 0) return;
    setLoadingDocuments(true);
    try {
      const data = await getProductorDocumentsUseCase.execute(id);
      setDocuments(data);
    } catch {
      // silently fail
    } finally {
      setLoadingDocuments(false);
    }
  }, [id, documents.length]);

  // ── Load Visits (lazy + paginable) ───────────────────────────────────────────
  const loadVisits = useCallback(
    async (page: number) => {
      setLoadingVisits(true);
      try {
        const result = await getProductorVisitsUseCase.execute(id, page);
        setVisits(result.visits);
        setVisitsTotal(result.total);
        setVisitsPage(result.page);
      } catch {
        // silently fail
      } finally {
        setLoadingVisits(false);
      }
    },
    [id]
  );

  // ── Tab change handler ───────────────────────────────────────────────────────
  const handleTabChange = useCallback(
    (tab: ProductorDetailTab) => {
      setActiveTab(tab);
      if (tab === "upps") loadUpps();
      else if (tab === "documentos") loadDocuments();
      else if (tab === "visitas") loadVisits(1);
    },
    [loadUpps, loadDocuments, loadVisits]
  );

  // ── Visits pagination ────────────────────────────────────────────────────────
  const handleVisitsPageChange = useCallback(
    (page: number) => {
      loadVisits(page);
    },
    [loadVisits]
  );

  // ── Toggle status ─────────────────────────────────────────────────────────────
  const handleToggleStatus = useCallback(async () => {
    if (!detail) return;
    const newStatus = detail.status === "active" ? "inactive" : "active";
    setIsTogglingStatus(true);
    try {
      await updateProductorStatusUseCase.execute(id, newStatus);
      setDetail((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch {
      // silently fail — user stays on page
    } finally {
      setIsTogglingStatus(false);
    }
  }, [detail, id]);

  // ── Save inline field edit ───────────────────────────────────────────────────
  const handleSaveField = useCallback(
    async (field: "fullName" | "email" | "curp", value: string) => {
      setFieldError(null);
      setIsSavingField(true);
      try {
        const payload: { fullName?: string; curp?: string | null; email?: string } = {};
        if (field === "fullName") payload.fullName = value.trim();
        if (field === "email")    payload.email    = value.trim();
        if (field === "curp")     payload.curp     = value.trim() || null;
        await updateProductorInfoUseCase.execute(id, payload);
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                ...(field === "fullName" ? { fullName: value.trim() } : {}),
                ...(field === "email"    ? { email: value.trim() }    : {}),
                ...(field === "curp"     ? { curp: value.trim() || null } : {}),
              }
            : prev
        );
        setEditingField(null);
      } catch (err) {
        if (err instanceof UpdateAdminProductorInfoValidationError) {
          setFieldError(err.message);
        } else {
          setFieldError("Error al guardar. Intenta de nuevo.");
        }
      } finally {
        setIsSavingField(false);
      }
    },
    [id]
  );

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteProductorUseCase.execute(id);
      setShowDeleteConfirm(false);
      router.push("/admin/producers");
    } catch {
      setIsDeleting(false);
    }
  }, [id, router]);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  return {
    detail,
    loadingDetail,
    errorDetail,

    upps,
    loadingUpps,

    documents,
    loadingDocuments,

    visits,
    visitsTotal,
    visitsPage,
    loadingVisits,
    handleVisitsPageChange,

    activeTab,
    handleTabChange,

    isTogglingStatus,
    handleToggleStatus,

    editingField,
    setEditingField,
    isSavingField,
    fieldError,
    setFieldError,
    handleSaveField,

    isDeleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleConfirmDelete,
  };
}
