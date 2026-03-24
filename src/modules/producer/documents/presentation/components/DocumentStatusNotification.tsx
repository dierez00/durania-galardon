'use client';

import type { LucideIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui';
import { DocumentChangeEvent } from '@/modules/producer/documents/domain/types/DocumentEvents';
import { AlertCircle, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { toneClass, type SemanticTone } from '@/shared/ui/theme';

interface Props {
  event: DocumentChangeEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NotificationContent {
  icon: LucideIcon;
  tone: SemanticTone;
  title: string;
  description: string;
}

export function DocumentStatusNotification({ event, open, onOpenChange }: Props) {
  const getContent = (): NotificationContent => {
    switch (event.type) {
      case 'status-changed': {
        const { newStatus, documentType } = event.data;
        const isApproved = newStatus === 'validated';

        return {
          icon: isApproved ? CheckCircle : AlertCircle,
          tone: isApproved ? 'success' : 'error',
          title: isApproved ? 'Documento aprobado' : 'Documento rechazado',
          description: isApproved
            ? `Tu documento "${documentType}" ha sido validado exitosamente.`
            : `Tu documento "${documentType}" ha sido rechazado. Por favor, revisa y vuelve a cargar.`,
        };
      }

      case 'expiring-soon': {
        const { documentType, daysUntilExpiry } = event.data;
        return {
          icon: Clock,
          tone: 'warning',
          title: 'Documento por vencer',
          description: `Tu documento "${documentType}" vence en ${daysUntilExpiry} dias. Te recomendamos renovarlo pronto.`,
        };
      }

      case 'expired': {
        const { documentType } = event.data;
        return {
          icon: AlertTriangle,
          tone: 'error',
          title: 'Documento vencido',
          description: `Tu documento "${documentType}" ha vencido. Por favor, carga una nueva version.`,
        };
      }

      case 'newly-uploaded':
      default:
        return {
          icon: Clock,
          tone: 'info',
          title: 'Documento cargado',
          description: 'Tu documento ha sido cargado exitosamente y esta en revision.',
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn('border', toneClass(content.tone, 'surface'))}>
        <div className="flex items-start gap-4">
          <Icon className={cn('h-8 w-8 shrink-0', toneClass(content.tone, 'icon'))} />
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
