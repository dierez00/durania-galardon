'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from '@/shared/ui';
import { DocumentChangeEvent } from '@/modules/producer/documents/domain/types/DocumentEvents';
import { CheckCircle, AlertTriangle, Clock, AlertCircle } from 'lucide-react';

interface Props {
  event: DocumentChangeEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentStatusNotification({ event, open, onOpenChange }: Props) {
  const getContent = () => {
    switch (event.type) {
      case 'status-changed': {
        const { newStatus, documentType } = event.data;
        const isApproved = newStatus === 'validated';

        return {
          icon: isApproved ? (
            <CheckCircle className="w-8 h-8 text-green-500" />
          ) : (
            <AlertCircle className="w-8 h-8 text-red-500" />
          ),
          title: isApproved ? '✓ Documento Aprobado' : '✗ Documento Rechazado',
          description: isApproved
            ? `Tu documento "${documentType}" ha sido validado exitosamente.`
            : `Tu documento "${documentType}" ha sido rechazado. Por favor, revisa y vuelve a cargar.`,
          color: isApproved ? 'bg-green-50' : 'bg-red-50',
        };
      }

      case 'expiring-soon': {
        const { documentType, daysUntilExpiry } = event.data;
        return {
          icon: <Clock className="w-8 h-8 text-orange-500" />,
          title: '⚠ Documento por Vencer',
          description: `Tu documento "${documentType}" vence en ${daysUntilExpiry} días. Te recomendamos renovarlo pronto.`,
          color: 'bg-orange-50',
        };
      }

      case 'expired': {
        const { documentType } = event.data;
        return {
          icon: <AlertTriangle className="w-8 h-8 text-red-600" />,
          title: '⚠ Documento Vencido',
          description: `Tu documento "${documentType}" ha vencido. Por favor, carga una nueva versión.`,
          color: 'bg-red-50',
        };
      }

      case 'newly-uploaded':
      default: {
        return {
          icon: <Clock className="w-8 h-8 text-blue-500" />,
          title: '📄 Documento Cargado',
          description: `Tu documento ha sido cargado exitosamente y está en revisión.`,
          color: 'bg-blue-50',
        };
      }
    }
  };

  const content = getContent();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={`${content.color} border-none`}>
        <div className="flex gap-4 items-start">
          {content.icon}
          <div className="flex-1">
            <AlertDialogHeader>
              <AlertDialogTitle>{content.title}</AlertDialogTitle>
              <AlertDialogDescription>{content.description}</AlertDialogDescription>
            </AlertDialogHeader>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Entendido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
