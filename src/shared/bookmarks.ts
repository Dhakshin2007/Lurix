export interface Bookmark {
  problemKey: string
  problemTitle: string
  problemUrl: string
  createdAt: number
}

const BOOKMARKS_KEY = 'cfp:bookmarks'

export async function getBookmarks(): Promise<Bookmark[]> {
  const result = await chrome.storage.local.get(BOOKMARKS_KEY)
  return (result[BOOKMARKS_KEY] as Bookmark[] | undefined) ?? []
}

export async function isBookmarked(problemKey: string): Promise<boolean> {
  const bookmarks = await getBookmarks()
  return bookmarks.some((b) => b.problemKey === problemKey)
}

export async function addBookmark(
  bookmark: Omit<Bookmark, 'createdAt'>
): Promise<Bookmark[]> {
  const bookmarks = await getBookmarks()
  if (bookmarks.some((b) => b.problemKey === bookmark.problemKey)) {
    return bookmarks
  }
  const next = [{ ...bookmark, createdAt: Date.now() }, ...bookmarks]
  await chrome.storage.local.set({ [BOOKMARKS_KEY]: next })
  return next
}

export async function removeBookmark(problemKey: string): Promise<Bookmark[]> {
  const bookmarks = await getBookmarks()
  const next = bookmarks.filter((b) => b.problemKey !== problemKey)
  await chrome.storage.local.set({ [BOOKMARKS_KEY]: next })
  return next
}

export async function toggleBookmark(
  bookmark: Omit<Bookmark, 'createdAt'>
): Promise<{ bookmarked: boolean; bookmarks: Bookmark[] }> {
  const already = await isBookmarked(bookmark.problemKey)
  const bookmarks = already
    ? await removeBookmark(bookmark.problemKey)
    : await addBookmark(bookmark)
  return { bookmarked: !already, bookmarks }
}
