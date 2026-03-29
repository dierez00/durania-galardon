"use client";

import { useState, useCallback, useEffect } from "react";
import { listProducerOptions } from "@/modules/admin/productores/application/services";
import { createAdminCollar } from "@/modules/collars/application/services";
import type { ProducerListItem } from "../types";

interface UseCreateCollarReturn {
  collar_id: string;
  setCollarId: (id: string) => void;
  producer_id: string;
  setProducerId: (id: string) => void;
  firmware_version: string;
  setFirmwareVersion: (version: string) => void;
  creating: boolean;
  error: string | null;
  producers: ProducerListItem[];
  loadingProducers: boolean;
  handleCreate: () => Promise<void>;
  resetForm: () => void;
}

export function useCreateCollar(): UseCreateCollarReturn {
  const [collarId, setCollarId] = useState("");
  const [producerId, setProducerId] = useState("");
  const [firmwareVersion, setFirmwareVersion] = useState("1.0.0");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [producers, setProducers] = useState<ProducerListItem[]>([]);
  const [loadingProducers, setLoadingProducers] = useState(false);

  // Fetch productores (para el select)
  useEffect(() => {
    const fetchProducers = async () => {
      try {
        setLoadingProducers(true);

        const body = await listProducerOptions();
        setProducers(body);
      } catch (err) {
        console.error("Error fetching producers", err);
      } finally {
        setLoadingProducers(false);
      }
    };

    fetchProducers();
  }, []);

  // Validación simple
  const validateForm = useCallback((): boolean => {
    if (!collarId.trim()) {
      setError("Collar ID es requerido");
      return false;
    }
    if (!firmwareVersion.trim()) {
      setError("Firmware Version es requerido");
      return false;
    }
    return true;
  }, [collarId, firmwareVersion]);

  const resetForm = useCallback(() => {
    setCollarId("");
    setProducerId("");
    setFirmwareVersion("1.0.0");
    setError(null);
  }, []);

  // Create collar
  const handleCreate = useCallback(async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setCreating(true);

      const payload: Record<string, unknown> = {
        collar_id: collarId.trim(),
        firmware_version: firmwareVersion.trim(),
      };

      if (producerId) {
        payload.producer_id = producerId;
      }

      await createAdminCollar(payload as {
        collar_id: string;
        firmware_version?: string;
        producer_id?: string;
      });

      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating collar");
    } finally {
      setCreating(false);
    }
  }, [collarId, firmwareVersion, producerId, validateForm, resetForm]);

  return {
    collar_id: collarId,
    setCollarId,
    producer_id: producerId,
    setProducerId,
    firmware_version: firmwareVersion,
    setFirmwareVersion,
    creating,
    error,
    producers,
    loadingProducers,
    handleCreate,
    resetForm,
  };
}
