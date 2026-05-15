/**
 * Simple confirmation dialog (replaces window.confirm for destructive / important actions).
 */
export default function ConfirmModal({
  title,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  onCancel,
  onConfirm,
  loading = false,
}) {
  return (
    <div className="modal-overlay z-[60]" onClick={onCancel}>
      <div className="modal-content max-w-sm space-y-4 z-[70]" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-text">{title}</h3>
        <div className="text-sm text-muted leading-relaxed">{children}</div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel} disabled={loading} className="btn-ghost flex-1 justify-center">
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 justify-center py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50"
            style={danger ? { background: '#DC2626' } : { background: 'var(--color-primary)' }}
          >
            {loading ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
