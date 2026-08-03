/**
 * Every call to the field_portal API, as TanStack Query hooks.
 *
 * Reads are cached with a short stale time: an engineer drills in, backs out
 * and drills again constantly, and re-fetching a project list on every back
 * press wastes site bandwidth. Writes never cache — each one is a live POST,
 * and on success we invalidate nothing except what a new line could change.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_BASE, api, qs } from '@/lib/apiClient'
import { ENTRY_TYPES } from './entryTypes'
import { toPayload } from '@/lib/files'

/* -- cache keys ----------------------------------------------------------- */

export const qk = {
  whoami: ['whoami'],
  projects: ['projects'],
  levels: (projectId) => ['project', projectId, 'levels'],
  items: (projectId, level) => ['project', projectId, 'level', level, 'items'],
  legacyTasks: (projectId) => ['project', projectId, 'tasks'],
  subtasks: (taskId) => ['item', taskId, 'subtasks'],
  products: (taskId, type) => ['subtask', taskId, 'products', type],
  entries: ['entries'],
}

// Site data changes on the hour, not the second. Five minutes keeps the walk
// instant while still picking up a foreman's new sub-task within a coffee break.
const LIST_STALE = 5 * 60 * 1000

/* -- auth ----------------------------------------------------------------- */

/**
 * Exchanges credentials for a bearer token: POST /auth/token.
 *
 * Deliberately a raw fetch rather than the shared `api` client — this is the
 * one call that must NOT carry an Authorization header, since a stale token
 * from a previous engineer could otherwise ride along. Nothing is stored
 * here; the caller decides, so a failed attempt never evicts a working token.
 *
 * Errors carry a `code` so the screen can translate them. 401 is answered
 * with a single generic message that never says which field was wrong.
 */
export async function requestToken({ login, password }) {
  const res = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'omit',
    body: JSON.stringify({ login, password }),
  })

  const body = await res.json().catch(() => null)

  if (res.status === 401) {
    throw Object.assign(new Error('invalid_credentials'), { code: 'invalid_credentials' })
  }

  if (!res.ok || !body?.token || body?.error) {
    // 400 (and anything else) surfaces the server's own message verbatim.
    const message = body?.error || `Sign-in failed (${res.status}).`
    throw Object.assign(new Error(message), { code: 'server' })
  }

  return body
}

export function useWhoami(enabled = true) {
  return useQuery({
    queryKey: qk.whoami,
    queryFn: ({ signal }) => api.get('/auth/whoami', { signal }),
    enabled,
    staleTime: 15 * 60 * 1000,
    retry: (count, err) => !err?.isAuth && count < 2,
  })
}

/* -- the level walk ------------------------------------------------------- */

export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: ({ signal }) => api.get('/projects', { signal }),
    staleTime: LIST_STALE,
    select: (data) => data?.projects ?? [],
  })
}

/**
 * Levels for a project. `level_aware:false` (a legacy project) comes back with
 * an empty `levels` array — callers branch to the flat task tree instead.
 */
export function useLevels(projectId) {
  return useQuery({
    queryKey: qk.levels(projectId),
    queryFn: ({ signal }) => api.get(`/projects/${projectId}/levels`, { signal }),
    enabled: Boolean(projectId),
    staleTime: LIST_STALE,
  })
}

export function useLevelItems(projectId, level) {
  return useQuery({
    queryKey: qk.items(projectId, level),
    queryFn: ({ signal }) => api.get(`/levels/${projectId}/${level}/items`, { signal }),
    enabled: Boolean(projectId && level),
    staleTime: LIST_STALE,
  })
}

export function useSubtasks(taskId) {
  return useQuery({
    queryKey: qk.subtasks(taskId),
    queryFn: ({ signal }) => api.get(`/items/${taskId}/subtasks`, { signal }),
    enabled: Boolean(taskId),
    staleTime: LIST_STALE,
  })
}

/** Legacy (non-level-aware) projects: one flat tree, drilled by parent_id. */
export function useLegacyTasks(projectId, enabled = true) {
  return useQuery({
    queryKey: qk.legacyTasks(projectId),
    queryFn: ({ signal }) => api.get(`/projects/${projectId}/tasks`, { signal }),
    enabled: Boolean(projectId) && enabled,
    staleTime: LIST_STALE,
  })
}

/* -- products for an entry form ------------------------------------------- */

export function useProducts(taskId, entryType) {
  const param = ENTRY_TYPES[entryType]?.productParam
  return useQuery({
    queryKey: qk.products(taskId, param),
    queryFn: ({ signal }) =>
      api.get(`/subtasks/${taskId}/products${qs({ type: param })}`, { signal }),
    enabled: Boolean(taskId && param),
    staleTime: LIST_STALE,
  })
}

/* -- writes --------------------------------------------------------------- */

/**
 * One mutation for all four entry types; the caller passes the already-shaped
 * body. Attachments are normalised here so no form can leak a preview URL.
 *
 * Writes are never retried automatically — a silent duplicate material line is
 * far worse than making the engineer press "Try again".
 */
export function useCreateEntry(taskId, entryType) {
  const queryClient = useQueryClient()
  const path = ENTRY_TYPES[entryType]?.postPath

  return useMutation({
    mutationKey: ['entry', taskId, entryType],
    retry: false,
    mutationFn: ({ attachments, ...body }) => {
      const payload = { ...body }
      if (attachments?.length) payload.attachments = toPayload(attachments)
      return api.post(`/subtasks/${taskId}/${path}`, payload, { timeoutMs: 90000 })
    },
    onSuccess: () => {
      // A new line can flip a sub-task's has_products / stage in the list
      // behind us, so refresh it lazily for the next time we walk past.
      queryClient.invalidateQueries({ queryKey: ['item'], exact: false })
      // …and it just landed in the review basket.
      queryClient.invalidateQueries({ queryKey: qk.entries })
    },
  })
}

/* -- the review basket ---------------------------------------------------- */

/**
 * GET /entries — everything this engineer has logged.
 *
 * Drafts and history are fetched under separate keys on purpose. The top bar
 * badge needs the draft count on every screen, and pulling a hundred rows of
 * confirmed history alongside it on site LTE — over and over — is the kind of
 * waste that makes a portal feel broken. `state` is 'draft' or 'confirmed'.
 *
 * No stale window: the whole point of the screen is that it agrees with what
 * was just submitted.
 */
export function useMyEntries(state) {
  return useQuery({
    queryKey: [...qk.entries, state],
    queryFn: ({ signal }) => api.get(`/entries${qs({ state })}`, { signal }),
    staleTime: 0,
  })
}

/**
 * Number of unconfirmed entries, for the badge in the top bar. Shares its
 * cache entry with the review screen's draft list — one request, not two.
 */
export function useDraftCount() {
  const query = useMyEntries('draft')
  return query.data?.draft_count ?? 0
}

export function useUpdateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: ({ lineId, ...body }) =>
      api.post(`/entries/${lineId}/update`, body, { timeoutMs: 90000 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.entries }),
  })
}

export function useDeleteEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: (lineId) => api.post(`/entries/${lineId}/delete`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.entries }),
  })
}

/**
 * POST /entries/confirm — submit the batch.
 *
 * Omitting `lineIds` confirms every draft the engineer holds, which is what
 * "Confirm all" sends. The server treats already-confirmed ids as `skipped`
 * rather than an error, so a retry after a timeout is safe.
 */
export function useConfirmEntries() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: (lineIds) =>
      api.post('/entries/confirm', lineIds?.length ? { line_ids: lineIds } : {}, {
        timeoutMs: 90000,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.entries })
      queryClient.invalidateQueries({ queryKey: ['item'], exact: false })
    },
  })
}

/**
 * Standalone photo upload. With `line_id` the photo is appended to that
 * entry's attachments; without it, it attaches to the sub-task itself.
 */
export function useUploadPhoto(taskId) {
  return useMutation({
    mutationKey: ['photo', taskId],
    retry: false,
    mutationFn: ({ attachment, lineId }) => {
      const { filename, data, mimetype } = attachment
      const body = { filename, data, mimetype }
      if (lineId) body.line_id = lineId
      return api.post(`/subtasks/${taskId}/photo`, body, { timeoutMs: 90000 })
    },
  })
}
