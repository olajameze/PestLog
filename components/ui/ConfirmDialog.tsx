import { useEffect, useMemo, useRef } from 'react';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useMemo(() => `confirm-title-${title.replace(/\s+/g, '-').toLowerCase()}`, [title]);
  const descriptionId = useMemo(() => `confirm-description-${title.replace(/\s+/g, '-').toLowerCase()}`, [title]);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-lift"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId} className="text-xl font-semibold text-navy">{title}</h3>
        <p id={descriptionId} className="mt-2 text-sm text-zinc-600">{description}</p>
        <div className="mt-6 flex gap-3">
          <Button ref={cancelRef} variant="secondary" className="flex-1" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
