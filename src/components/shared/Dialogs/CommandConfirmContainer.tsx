/**
 * Container component for Command Confirmation Dialog
 *
 * Renders a confirmation dialog when a command handler calls ctx.confirm().
 * The dialog state is managed via the store, and the promise resolution
 * is handled by the executor's resolveCommandConfirm() function.
 */

import { memo, useEffect, useCallback } from 'react'
import { AlertTriangle, File } from 'lucide-react'
import { usePDMStore } from '@/stores/pdmStore'
import { resolveCommandConfirm } from '@/lib/commands/executor'
import { useTranslation } from '@/lib/i18n'

const MAX_VISIBLE_FILES = 5

export const CommandConfirmContainer = memo(function CommandConfirmContainer() {
  const { t } = useTranslation()
  const pendingConfirm = usePDMStore((s) => s.pendingCommandConfirm)

  const handleConfirm = useCallback(() => {
    resolveCommandConfirm(true)
  }, [])

  const handleCancel = useCallback(() => {
    resolveCommandConfirm(false)
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!pendingConfirm) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleConfirm()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [pendingConfirm, handleConfirm, handleCancel])

  if (!pendingConfirm) return null

  const { title, message, items, pathChanges, confirmText = 'Continue' } = pendingConfirm
  const hasPathChanges = !!pathChanges && pathChanges.length > 0

  return (
    // z-[500]: this is the final, blocking gate in front of a write (`ctx.confirm()` in
    // `executor.ts`), and it can be opened by a command handler from *any* calling context —
    // the terminal, a context-menu dialog, a settings dialog. Several of those dialogs use their
    // own elevated z-index (`ResolveMovedFilesDialog` is `z-[70]`, `DuplicatePartDialog` is
    // `z-[200]`); at the old `z-50` this dialog rendered *behind* them instead of on top of them,
    // so the confirmation a caller like `ResolveMovedFilesDialog` depends on to gate its own
    // "Run" button was invisible and unclickable underneath it — indistinguishable from a hang,
    // recoverable only by force-quitting. `CommandConfirmContainer.zIndex.test.ts` fails the
    // build if any dialog in the app is given a higher z-index than this one.
    <div
      className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center"
      onClick={handleCancel}
    >
      <div
        className={`bg-plm-bg-light border border-plm-border rounded-lg p-6 shadow-2xl ${
          hasPathChanges ? 'max-w-xl w-full' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-plm-warning/20 flex items-center justify-center">
            <AlertTriangle size={20} className="text-plm-warning" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-plm-fg">{title}</h3>
          </div>
        </div>

        <p className="text-sm text-plm-fg-dim mb-4">{message}</p>

        {hasPathChanges && (
          // Full-width, wrapping (`break-all`), and vertically scrollable so even a deep vault
          // path is fully legible instead of truncated to its filename.
          <div className="bg-plm-bg rounded border border-plm-border mb-4 max-h-60 overflow-y-auto">
            {pathChanges!.map((change, i) => (
              <div
                key={i}
                className="p-3 border-b border-plm-border last:border-b-0 space-y-1.5"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-plm-fg-muted w-8 flex-shrink-0 pt-0.5">
                    {t('checkinPathChange.old')}
                  </span>
                  <span className="text-sm font-mono text-plm-fg-dim break-all">{change.from}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-plm-fg-muted w-8 flex-shrink-0 pt-0.5">
                    {t('checkinPathChange.new')}
                  </span>
                  <span className="text-sm font-mono text-plm-fg break-all">{change.to}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasPathChanges && items && items.length > 0 && (
          <div className="bg-plm-bg rounded border border-plm-border p-3 mb-4 max-h-40 overflow-y-auto">
            {items.length === 1 ? (
              <div className="flex items-center gap-2">
                <File size={16} className="text-plm-fg-muted flex-shrink-0" />
                <span className="text-plm-fg font-medium truncate">{items[0]}</span>
              </div>
            ) : (
              <>
                <div className="text-sm text-plm-fg mb-2">
                  {items.length} file{items.length > 1 ? 's' : ''}
                </div>
                <div className="space-y-1">
                  {items.slice(0, MAX_VISIBLE_FILES).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <File size={14} className="text-plm-fg-muted flex-shrink-0" />
                      <span className="text-plm-fg-dim truncate">{item}</span>
                    </div>
                  ))}
                  {items.length > MAX_VISIBLE_FILES && (
                    <div className="text-xs text-plm-fg-muted mt-1">
                      ...and {items.length - MAX_VISIBLE_FILES} more
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={handleCancel} className="btn btn-ghost">
            Cancel
          </button>
          <button onClick={handleConfirm} className="btn btn-primary">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
})
