// Shared types for the CoordCard detection pipeline (V2-V7).

/** A single scraped YouTube comment (top-level or reply). */
export interface Comment {
  /** Stable comment id (the fixture's data-cid). */
  id: string
  /** Derived channel id: "@handle" or "UC..." form. */
  channelId: string
  /** Raw #content-text textContent. */
  text: string
  /** Raw relative-time text, e.g. "2 minutes ago" / "2분 전". */
  relTime: string
  /** Nearest ancestor thread's data-cid, or null if this is a top-level thread. */
  parentId: string | null
}

/** A near-duplicate cluster of distinct-author comments. */
export interface Cluster {
  /** Member comments (each from a distinct author). */
  members: Comment[]
  /** Representative normalized text shared by the cluster. */
  repText: string
}

export type Mode = 'no-api' | 'api'

/** Output of score() for a single cluster. */
export interface ScoreResult {
  /** Composite score in [0,1], rounded to 2 decimals. */
  S: number
  /** Whether the cluster is flagged per the 4-part predicate (§4.3). */
  flagged: boolean
  /** Whether the organic-burst suppressor fired (§4.1 SUPP). */
  suppressed: boolean
  /** Individual signals for transparency / evidence. */
  signals: { T: number; B: number; R: number; A: number }
  /** Distinct-author cluster size. */
  size: number
  /** User-facing honest label. */
  label: string
  /** Auto-composed evidence line. */
  evidence: string
}
