import { useEffect, useRef } from 'react';
import Button from './Button.jsx';

/**
 * ConfirmDialog
 *
 * A modal dialog for confirming destructive or important actions.
 *
 * Props:
 *  open           – boolean, controls visibility
 *  title          – string
 *  description    – string | ReactNode
 *  confirmLabel   – string (default "Confirm")
 *  cancelLabel    – string (default "Cancel")
 *  confirmVariant – Button variant (default "danger")
 *  loading        – boolean, shows loading state and disables actions
 *  icon           – ReactNode, custom icon (default: "!" in circle)
 *  onConfirm      – () => void
 *  onCancel       – () => void
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  loading = false,
  icon,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);

  // Focus management & ESC key handler
  useEffect(() => {
    if (!open) return;

    // Trap focus
    const dialog = dialogRef.current;
    const previousActiveElement = document.activeElement;

    // Focus cancel button on open (safer default)
    setTimeout(() => cancelButtonRef.current?.focus(), 0);

    // Prevent body scroll
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Handle ESC key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }

      // Focus trap
      if (e.key === 'Tab' && dialog) {
        const focusableElements = dialog.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      previousActiveElement?.focus();
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={!loading ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Icon + Title + Description */}
        <div className="flex items-start gap-4">
          {/* Icon Container */}
          <div
            className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${confirmVariant === 'danger'
                ? 'bg-danger-bg'
                : confirmVariant === 'warning'
                  ? 'bg-warning/10'
                  : 'bg-black/5'
              }`}
            aria-hidden="true"
          >
            {icon ? (
              icon
            ) : (
              <span
                className={`text-lg font-bold leading-none ${confirmVariant === 'danger'
                    ? 'text-danger'
                    : confirmVariant === 'warning'
                      ? 'text-warning'
                      : 'text-text-muted'
                  }`}
              >
                !
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3
              id="confirm-dialog-title"
              className="text-base sm:text-lg font-semibold text-text-dark leading-snug"
            >
              {title}
            </h3>
            {description && (
              <p
                id="confirm-dialog-description"
                className="mt-2 text-sm text-text-muted leading-relaxed"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-2">
          <Button
            ref={cancelButtonRef}
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
            aria-label={`${cancelLabel}`}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            className="flex-1"
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
            aria-label={`${confirmLabel}`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>{confirmLabel}</span>
              </div>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}