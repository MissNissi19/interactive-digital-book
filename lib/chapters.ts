/** Chapters of the book, in reading order. Index 0 is the cover. */
export const BOOK_CHAPTERS = [
  { id: 'cover', label: 'Cover' },
  { id: 'nato', label: '01 · The radio' },
  { id: 'signal', label: '02 · Signal & silence' },
  { id: 'exercises', label: '03 · Exercises' },
  { id: 'radio', label: '04 · Radio procedures' },
  { id: 'gfa', label: '05 · General Flying Area' },
  { id: 'planner', label: '06 · Flight planner' },
  { id: 'tests', label: '07 · Tests' },
] as const

export const LAST_CHAPTER_INDEX = BOOK_CHAPTERS.length - 1

export function chapterLabel(index: number | null | undefined): string {
  if (index == null || index < 0 || index >= BOOK_CHAPTERS.length) return 'Not started'
  return BOOK_CHAPTERS[index].label
}
