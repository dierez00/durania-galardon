"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMvzDetailUseCase,
  getMvzUppsUseCase,
  getAvailableMvzUppsUseCase,
  assignMvzUppUseCase,
  unassignMvzUppUseCase,
  getMvzTestsUseCase,
  getMvzVisitsUseCase,
  updateMvzStatusUseCase,
  updateMvzInfoUseCase,
  deleteMvzUseCase,
} from "@/modules/admin/mvz/infra/container";
import { UpdateAdminMvzInfoValidationError } from "@/modules/admin/mvz/application/dto/UpdateAdminMvzInfoDTO";
import type {
  AdminMvzDetallado,
  AdminMvzUpp,
  AdminMvzAvailableUpp,
  AdminMvzTest,
  AdminMvzVisit,
} from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

export type MvzDetailTab = "info" | "upps" | "pruebas" | "visitas";
export type UppSubTab = "asignados" | "disponibles";
export type MvzDetailViewTab = "overview" | MvzDetailTab;

interface UseAdminMvzDetailOptions {
  initialTab?: MvzDetailViewTab;
}

export function useAdminMvzDetail(id: string, options: UseAdminMvzDetailOptions = {}) {
  const router = useRouter();

  // ── Detail ──────────────────────────────────────────────────────────────────
  const [detail, setDetail] = useState<AdminMvzDetallado | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [errorDetail, setErrorDetail] = useState("");

  // ── UPPs ────────────────────────────────────────────────────────────────────
  const [upps, setUpps] = useState<AdminMvzUpp[]>([]);
  const [loadingUpps, setLoadingUpps] = useState(false);
  const [uppSubTab, setUppSubTab] = useState<UppSubTab>("asignados");
  const [availableUpps, setAvailableUpps] = useState<AdminMvzAvailableUpp[]>([]);
  const [loadingAvailableUpps, setLoadingAvailableUpps] = useState(false);
  const [uppPendingUnassign, setUppPendingUnassign] = useState<string | null>(null);
  const [uppPendingAssign, setUppPendingAssign] = useState<string | null>(null);
  const [isProcessingUpp, setIsProcessingUpp] = useState(false);
  const [availableUppsLoaded, setAvailableUppsLoaded] = useState(false);

  // ── Tests ────────────────────────────────────────────────────────────────────
  const [tests, setTests] = useState<AdminMvzTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);

  // ── Visits ──────────────────────────────────────────────────────────────────
  const [visits, setVisits] = useState<AdminMvzVisit[]>([]);
  const [visitsTotal, setVisitsTotal] = useState(0);
  const [visitsPage, setVisitsPage] = useState(1);
  const [loadingVisits, setLoadingVisits] = useState(false);

  // ── Active Tab ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<MvzDetailViewTab>(options.initialTab ?? "overview");

  // ── Status actions ──────────────────────────────────────────────────────────
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Inline edit ─────────────────────────────────────────────────────────────
  const [editingField, setEditingField] = useState<"fullName" | "email" | "licenseNumber" | null>(null);
  const [isSavingField, setIsSavingField] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // ── Load detail ─────────────────────────────────────────────────────────────
  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    setErrorDetail("");
    try {
      const data = await getMvzDetailUseCase.execute(id);
      if (data) {
        setDetail(data);
      } else {
        setErrorDetail("No se encontró el MVZ.");
      }
    } catch {
      setErrorDetail("Error al cargar los datos del MVZ.");
    } finally {
      setLoadingDetail(false);
    }
  }, [id]);

  // ── Load UPPs (reloadable — no length guard) ────────────────────────────────
  const loadUpps = useCallback(async () => {
    setLoadingUpps(true);
    try {
      const data = await getMvzUppsUseCase.execute(id);
      setUpps(data);
    } catch {
      // silently fail — UI shows empty state
    } finally {
      setLoadingUpps(false);
    }
  }, [id]);

  // ── Load Available UPPs (lazy) ───────────────────────────────────────────────
  const loadAvailableUpps = useCallback(async () => {
    setLoadingAvailableUpps(true);
    try {
      const data = await getAvailableMvzUppsUseCase.execute(id);
      setAvailableUpps(data);
      setAvailableUppsLoaded(true);
    } catch {
      // silently fail
    } finally {
      setLoadingAvailableUpps(false);
    }
  }, [id]);

  // ── Load Tests (lazy) ────────────────────────────────────────────────────────
  const loadTests = useCallback(async () => {
    if (tests.length > 0) return;
    setLoadingTests(true);
    try {
      const data = await getMvzTestsUseCase.execute(id);
      setTests(data);
    } catch {
      // silently fail
    } finally {
      setLoadingTests(false);
    }
  }, [id, tests.length]);

  // ── Load Visits (lazy + paginable) ───────────────────────────────────────────
  const loadVisits = useCallback(
    async (page: number) => {
      setLoadingVisits(true);
      try {
        const result = await getMvzVisitsUseCase.execute(id, page);
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
    (tab: MvzDetailViewTab) => {
      setActiveTab(tab);
      if (tab === "upps")         loadUpps();
      else if (tab === "pruebas")  loadTests();
      else if (tab === "visitas")  loadVisits(1);
    },
    [loadUpps, loadTests, loadVisits]
  );

  // ── UPP sub-tab change ───────────────────────────────────────────────────────
  const handleUppSubTabChange = useCallback(
    (tab: UppSubTab) => {
      setUppSubTab(tab);
      if (tab === "disponibles" && !availableUppsLoaded) {
        void loadAvailableUpps();
      }
    },
    [availableUppsLoaded, loadAvailableUpps]
  );

  // ── Confirm assign ────────────────────────────────────────────────────────────
  const handleConfirmAssign = useCallback(async () => {
    if (!uppPendingAssign) return;
    setIsProcessingUpp(true);
    try {
      await assignMvzUppUseCase.execute(id, uppPendingAssign);
      // Move from availableUpps → upps (optimistic)
      const target = availableUpps.find((u) => u.id === uppPendingAssign);
      if (target) {
        setUpps((prev) => [
          ...prev,
          {
            id: target.id,
            uppCode: target.uppCode,
            name: target.name,
            addressText: target.addressText,
            status: "active",
            animalCount: target.animalCount,
            producerName: target.producerName,
          },
        ]);
        setAvailableUpps((prev) => prev.filter((u) => u.id !== uppPendingAssign));
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                totalUpps: (prev.totalUpps ?? 0) + 1,
                activeAssignments: (prev.activeAssignments ?? 0) + 1,
              }
            : prev
        );
      }
      setUppPendingAssign(null);
    } catch {
      // silently fail — dialog stays open if needed
    } finally {
      setIsProcessingUpp(false);
    }
  }, [id, uppPendingAssign, availableUpps]);

  // ── Confirm unassign ──────────────────────────────────────────────────────────
  const handleConfirmUnassign = useCallback(async () => {
    if (!uppPendingUnassign) return;
    setIsProcessingUpp(true);
    try {
      await unassignMvzUppUseCase.execute(id, uppPendingUnassign);
      // Move from upps → availableUpps (optimistic)
      const target = upps.find((u) => u.id === uppPendingUnassign);
      if (target) {
        setUpps((prev) => prev.filter((u) => u.id !== uppPendingUnassign));
        if (availableUppsLoaded) {
          setAvailableUpps((prev) => [
            ...prev,
            {
              id: target.id,
              uppCode: target.uppCode,
              name: target.name,
              addressText: target.addressText,
              animalCount: target.animalCount,
              producerName: target.producerName,
            },
          ]);
        }
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                totalUpps: Math.max(0, (prev.totalUpps ?? 1) - 1),
                activeAssignments: Math.max(0, (prev.activeAssignments ?? 1) - 1),
              }
            : prev
        );
      }
      setUppPendingUnassign(null);
    } catch {
      // silently fail
    } finally {
      setIsProcessingUpp(false);
    }
  }, [id, uppPendingUnassign, upps, availableUppsLoaded]);

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
      await updateMvzStatusUseCase.execute(id, newStatus);
      setDetail((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch {
      // silently fail
    } finally {
      setIsTogglingStatus(false);
    }
  }, [detail, id]);

  // ── Save inline field edit ───────────────────────────────────────────────────
  const handleSaveField = useCallback(
    async (field: "fullName" | "email" | "licenseNumber", value: string) => {
      setFieldError(null);
      setIsSavingField(true);
      try {
        const payload: { fullName?: string; licenseNumber?: string; email?: string } = {};
        if (field === "fullName")      payload.fullName      = value.trim();
        if (field === "email")         payload.email         = value.trim();
        if (field === "licenseNumber") payload.licenseNumber = value.trim();
        await updateMvzInfoUseCase.execute(id, payload);
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                ...(field === "fullName"      ? { fullName: value.trim() }                        : {}),
                ...(field === "email"         ? { email: value.trim() }                           : {}),
                ...(field === "licenseNumber" ? { licenseNumber: value.trim().toUpperCase() }     : {}),
              }
            : prev
        );
        setEditingField(null);
      } catch (err) {
        if (err instanceof UpdateAdminMvzInfoValidationError) {
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
      await deleteMvzUseCase.execute(id);
      setShowDeleteConfirm(false);
      router.push("/admin/mvz");
    } catch {
      setIsDeleting(false);
    }
  }, [id, router]);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    handleTabChange(options.initialTab ?? "overview");
  }, [handleTabChange, options.initialTab]);

  return {
    detail,
    loadingDetail,
    errorDetail,

    upps,
    loadingUpps,
    uppSubTab,
    handleUppSubTabChange,
    availableUpps,
    loadingAvailableUpps,
    uppPendingUnassign,
    setUppPendingUnassign,
    uppPendingAssign,
    setUppPendingAssign,
    isProcessingUpp,
    handleConfirmAssign,
    handleConfirmUnassign,

    tests,
    loadingTests,

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
