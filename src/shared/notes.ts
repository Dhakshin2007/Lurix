/**
 * One note per problem, stored under its own key so reads/writes for a
 * single problem never touch unrelated data — plus a lightweight index
 * (metadata only, no content) so the "All Notes" panel can list everything
 * without loading every note body into memory.
 */

export interface Note {
  problemKey: string
  problemTitle: string
  problemUrl: string
  content: string
  pinned: boolean
  updatedAt: number
}

type NoteIndexEntry = Omit<Note, 'content'>

const NOTE_PREFIX = 'cfp:note:'
const NOTE_INDEX_KEY = 'cfp:notes-index'

function noteKey(problemKey: string) {
  return `${NOTE_PREFIX}${problemKey}`
}

export async function getNote(problemKey: string): Promise<Note | null> {
  const result = await chrome.storage.local.get(noteKey(problemKey))
  return (result[noteKey(problemKey)] as Note | undefined) ?? null
}

export async function saveNote(note: Note): Promise<void> {
  await chrome.storage.local.set({ [noteKey(note.problemKey)]: note })
  await updateIndex(note)
}

export async function deleteNote(problemKey: string): Promise<void> {
  await chrome.storage.local.remove(noteKey(problemKey))
  const index = await getNoteIndex()
  const next = index.filter((n) => n.problemKey !== problemKey)
  await chrome.storage.local.set({ [NOTE_INDEX_KEY]: next })
}

export async function getNoteIndex(): Promise<NoteIndexEntry[]> {
  const result = await chrome.storage.local.get(NOTE_INDEX_KEY)
  return (result[NOTE_INDEX_KEY] as NoteIndexEntry[] | undefined) ?? []
}

async function updateIndex(note: Note) {
  const index = await getNoteIndex()
  const { content, ...meta } = note
  void content
  const without = index.filter((n) => n.problemKey !== note.problemKey)
  await chrome.storage.local.set({
    [NOTE_INDEX_KEY]: [...without, meta].sort(
      (a, b) => b.updatedAt - a.updatedAt
    ),
  })
}
