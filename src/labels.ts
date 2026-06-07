// Honest-label constants + the §4.4 forbidden-terms canonical list (single source of truth).

/** The ONLY user-facing flag label (§4.4, NON-NEGOTIABLE). */
export const HONEST_LABEL = 'Matches coordinated-posting patterns in this video'

/** Label used when the organic-burst suppressor fires (§4.1). */
export const SUPPRESSED_LABEL = 'mass repetition (likely organic)'

// The §4.4 forbidden-terms canonical list lives in ./forbidden-terms.ts
// (its own file so the forbidden-words scanner can exclude only the definition
// site while still checking every real UI surface). It is re-exported here for
// callers that want a single import point.
export { FORBIDDEN_TERMS } from './forbidden-terms'
