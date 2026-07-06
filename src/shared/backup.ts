/**
 * Exports every key this extension owns (anything prefixed `cfp:`) into a
 * single JSON file, and can restore from one. This is intentionally a raw
 * dump rather than a curated schema — it stays correct automatically as new
 * features add new storage keys, instead of needing to be updated by hand
 * every time.
 */

const PREFIX = 'cfp:'
const BACKUP_VERSION = 1

export interface BackupSummary {
  settings: boolean
  notes: number
  bookmarks: number
  recent: number
}

async function getAllOwnedData(): Promise<Record<string, unknown>> {
  const all = await chrome.storage.local.get(null)
  const owned: Record<string, unknown> = {}
  for (const key of Object.keys(all)) {
    if (key.startsWith(PREFIX)) owned[key] = all[key]
  }
  return owned
}

export async function getBackupSummary(): Promise<BackupSummary> {
  const data = await getAllOwnedData()
  const noteKeys = Object.keys(data).filter((k) => k.startsWith('cfp:note:'))
  const bookmarks = (data['cfp:bookmarks'] as unknown[] | undefined) ?? []
  const recent = (data['cfp:recent'] as unknown[] | undefined) ?? []
  return {
    settings: Boolean(data['cfp:settings']),
    notes: noteKeys.length,
    bookmarks: bookmarks.length,
    recent: recent.length,
  }
}

export async function exportBackup(): Promise<void> {
  const data = await getAllOwnedData()
  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `codeforces-premium-backup-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function importBackup(
  file: File
): Promise<{ ok: true } | { ok: false; error: string }> {
  let parsed: unknown
  try {
    const text = await file.text()
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('data' in parsed) ||
    typeof (parsed as { data: unknown }).data !== 'object'
  ) {
    return { ok: false, error: "That doesn't look like a Codeforces Premium backup." }
  }

  const data = (parsed as { data: Record<string, unknown> }).data
  const owned: Record<string, unknown> = {}
  for (const key of Object.keys(data)) {
    if (key.startsWith(PREFIX)) owned[key] = data[key]
  }

  if (Object.keys(owned).length === 0) {
    return { ok: false, error: 'Backup file contained no recognizable data.' }
  }

  await chrome.storage.local.set(owned)
  return { ok: true }
}
