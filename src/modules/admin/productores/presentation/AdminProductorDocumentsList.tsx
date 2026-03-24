"use client";

import { FileText } from "lucide-react";
import { AdminProductorDocumentCard } from "./AdminProductorDocumentCard";
import { DetailEmptyState } from "@/shared/ui/detail";
import type { AdminProductorDocument } from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";

interface AdminProductorDocumentsListProps {
  documents: AdminProductorDocument[];
  loading?: boolean;
}

export function AdminProductorDocumentsList({
  documents,
  loading = false,
}: Readonly<AdminProductorDocumentsListProps>) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {["a", "b", "c", "d"].map((k) => (
          <div key={k} className="h-24 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <DetailEmptyState
        icon={FileText}
        message="No hay documentos registrados."
        description="Los documentos del productor aparecerán aquí una vez que sean cargados."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {documents.map((doc) => (
        <AdminProductorDocumentCard key={doc.id} doc={doc} />
      ))}
    </div>
  );
}
