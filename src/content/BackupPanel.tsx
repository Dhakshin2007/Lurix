import { useEffect, useRef, useState } from 'react'
import { getBackupSummary, exportBackup, importBackup, type BackupSummary } from '@/shared/backup'
import { showToast } from './toast'

interface Props {
  open: boolean
  onClose: () => void
}

export default function BackupPanel({ open, onClose }: Props) {
  const [summary, setSummary] = useState<BackupSummary | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) getBackupSummary().then(setSummary)
  }, [open])

  async function handleExport() {
    await exportBackup()
    showToast('Backup downloaded', 'success')
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const result = await importBackup(file)
    if (result.ok) {
      showToast('Backup restored — reload the page to see everything', 'success')
      getBackupSummary().then(setSummary)
    } else {
      showToast(result.error, 'error')
    }
  }

  if (!open) return null

  return (
    <div className="cfp-overlay" onMouseDown={onClose}>
      <div className="cfp-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cfp-panel__tabs">
          <div className="cfp-panel__title-static">Backup & Restore</div>
          <button className="cfp-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="cfp-panel__body">
          <div className="cfp-panel__empty" style={{ padding: '0 0 14px 0' }}>
            Everything lives only in your browser. Export a backup before
            clearing browser data, or to move your notes and bookmarks to
            another computer.
          </div>

          {summary && (
            <div className="cfp-backup-summary">
              <div>
                <strong>{summary.notes}</strong> notes
              </div>
              <div>
                <strong>{summary.bookmarks}</strong> bookmarks
              </div>
              <div>
                <strong>{summary.recent}</strong> recent problems
              </div>
              <div>
                Settings: <strong>{summary.settings ? 'saved' : 'default'}</strong>
              </div>
            </div>
          )}

          <div className="cfp-timer-controls" style={{ marginTop: 16 }}>
            <button className="cfp-timer-btn cfp-timer-btn--primary" onClick={handleExport}>
              Export Backup
            </button>
            <button className="cfp-timer-btn" onClick={() => fileInputRef.current?.click()}>
              Import Backup
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />
        </div>
      </div>
    </div>
  )
}
