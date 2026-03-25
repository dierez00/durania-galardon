"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getProductorDetailUseCase,
  getProductorUppsUseCase,
  getProductorDocumentsUseCase,
  getProductorDocumentDetailUseCase,
  getProductorDocumentSignedUrlUseCase,
  getProductorVisitsUseCase,
  reviewProductorDocumentUseCase,
  updateProductorStatusUseCase,
  updateProductorInfoUseCase,
  deleteProductorUseCase,
} from "@/modules/admin/productores/infra/container";
import { UpdateAdminProductorInfoValidationError } from "@/modules/admin/productores/application/dto/UpdateAdminProductorInfoDTO";
import type {
  AdminProductorDetallado,
  AdminProductorDocumentDetail,
  AdminProductorDocument,
  AdminProductorUpp,
  AdminProductorVisit,
  AdminDocumentStatus,
} from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";

export type ProductorDetailTab = "info" | "upps" | "documentos" | "visitas";

function nextDocumentCandidate(
  documents: AdminProductorDocument[],
  current: AdminProductorDocument | null
): AdminProductorDocument | null {
  const filtered = documents.filter(
    (doc) => !(doc.id === current?.id && doc.sourceType === current?.sourceType)
  );
  if (filtered.length === 0) return null;

  const sorted = [...filtered].sort((a, b) => {
    const pendingWeightA = a.status === "pending" ? 0 : 1;
    const pendingWeightB = b.status === "pending" ? 0 : 1;
    if (pendingWeightA !== pendingWeightB) return pendingWeightA - pendingWeightB;
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });

  return sorted[0] ?? null;
}

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

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<AdminProductorDocument | null>(null);
  const [selectedDocumentDetail, setSelectedDocumentDetail] = useState<AdminProductorDocumentDetail | null>(null);
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string | null>(null);
  const [loadingSelectedDocument, setLoadingSelectedDocument] = useState(false);
  const [loadingSelectedFile, setLoadingSelectedFile] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<AdminDocumentStatus>("pending");
  const [reviewComments, setReviewComments] = useState("");
  const [reviewExpiryDate, setReviewExpiryDate] = useState("");
  const [reviewInitialState, setReviewInitialState] = useState<{
    status: AdminDocumentStatus;
    comments: string;
    expiryDate: string;
  } | null>(null);
  const [isReviewSaving, setIsReviewSaving] = useState(false);

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
  const loadDocuments = useCallback(async (force = false) => {
    if (!force && documents.length > 0) return documents;
    setLoadingDocuments(true);
    try {
      const data = await getProductorDocumentsUseCase.execute(id);
      setDocuments(data);
      return data;
    } catch {
      return [];
    } finally {
      setLoadingDocuments(false);
    }
  }, [id, documents.length]);

  const handleOpenDocumentReview = useCallback(
    async (document: AdminProductorDocument) => {
      setSelectedDocument(document);
      setReviewDialogOpen(true);
      setReviewError(null);
      setLoadingSelectedDocument(true);
      setLoadingSelectedFile(true);
      setSelectedDocumentDetail(null);
      setSelectedDocumentUrl(null);

      try {
        const [detail, signedUrl] = await Promise.all([
          getProductorDocumentDetailUseCase.execute(id, document.sourceType, document.id),
          getProductorDocumentSignedUrlUseCase.execute(id, document.sourceType, document.id),
        ]);

        if (!detail) {
          setReviewError("No fue posible cargar el detalle del documento.");
          return;
        }

        setSelectedDocumentDetail(detail);
        setSelectedDocumentUrl(signedUrl);

        const nextStatus = detail.status;
        const nextComments = detail.comments ?? "";
        const nextExpiryDate = detail.expiryDate ?? "";

        setReviewStatus(nextStatus);
        setReviewComments(nextComments);
        setReviewExpiryDate(nextExpiryDate);
        setReviewInitialState({
          status: nextStatus,
          comments: nextComments,
          expiryDate: nextExpiryDate,
        });
      } catch {
        setReviewError("No fue posible cargar la revisión del documento.");
      } finally {
        setLoadingSelectedDocument(false);
        setLoadingSelectedFile(false);
      }
    },
    [id]
  );

  const handleCloseReviewDialog = useCallback((open: boolean) => {
    setReviewDialogOpen(open);
    if (!open) {
      setReviewError(null);
      setSelectedDocument(null);
      setSelectedDocumentDetail(null);
      setSelectedDocumentUrl(null);
      setReviewInitialState(null);
      setReviewStatus("pending");
      setReviewComments("");
      setReviewExpiryDate("");
    }
  }, []);

  const handleSaveDocumentReview = useCallback(
    async (saveAndNext: boolean) => {
      if (!selectedDocument) return;

      setReviewError(null);
      setIsReviewSaving(true);
      try {
        await reviewProductorDocumentUseCase.execute(id, {
          documentId: selectedDocument.id,
          sourceType: selectedDocument.sourceType,
          status: reviewStatus,
          comments: reviewComments,
          expiryDate: reviewExpiryDate || null,
        });

        const refreshedDocuments = await loadDocuments(true);

        if (saveAndNext) {
          const next = nextDocumentCandidate(refreshedDocuments, selectedDocument);
          if (next) {
            await handleOpenDocumentReview(next);
            setIsReviewSaving(false);
            return;
          }
        }

        handleCloseReviewDialog(false);
      } catch (error) {
        setReviewError(error instanceof Error ? error.message : "No fue posible guardar la revisión.");
      } finally {
        setIsReviewSaving(false);
      }
    },
    [
      selectedDocument,
      id,
      reviewStatus,
      reviewComments,
      reviewExpiryDate,
      loadDocuments,
      handleOpenDocumentReview,
      handleCloseReviewDialog,
    ]
  );

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
    reviewDialogOpen,
    selectedDocument,
    selectedDocumentDetail,
    selectedDocumentUrl,
    loadingSelectedDocument,
    loadingSelectedFile,
    reviewError,
    reviewStatus,
    reviewComments,
    reviewExpiryDate,
    reviewDirty:
      !!reviewInitialState &&
      (reviewStatus !== reviewInitialState.status ||
        reviewComments !== reviewInitialState.comments ||
        reviewExpiryDate !== reviewInitialState.expiryDate),
    isReviewSaving,
    setReviewStatus,
    setReviewComments,
    setReviewExpiryDate,
    handleOpenDocumentReview,
    handleCloseReviewDialog,
    handleSaveDocumentReview,

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
