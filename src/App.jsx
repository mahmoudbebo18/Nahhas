import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import AppShell from '@/components/AppShell'
import OfflineBanner from '@/components/OfflineBanner'
import SetupScreen from '@/screens/SetupScreen'
import ProjectsScreen from '@/screens/ProjectsScreen'
import LevelsScreen from '@/screens/LevelsScreen'
import ItemsScreen from '@/screens/ItemsScreen'
import LegacyTasksScreen from '@/screens/LegacyTasksScreen'
import SubtasksScreen from '@/screens/SubtasksScreen'
import ActionScreen from '@/screens/ActionScreen'
import EntryFormScreen from '@/screens/EntryFormScreen'
import EntriesScreen from '@/screens/EntriesScreen'
import PhotoScreen from '@/screens/PhotoScreen'
import { useAuth } from '@/context/AuthContext'
import { useWhoami } from '@/api/queries'

/**
 * Routes mirror the guided flow one-to-one, so the URL always says where the
 * engineer is and the phone's back button walks the flow in reverse:
 *
 *   /projects
 *   /projects/:projectId/levels
 *   /projects/:projectId/levels/:level/items
 *   /projects/:projectId/tasks            ← legacy, non-level-aware projects
 *   /items/:taskId/subtasks
 *   /subtasks/:taskId                     ← action chooser
 *   /subtasks/:taskId/:type               ← material | expense | equipment | subcontractor
 *   /subtasks/:taskId/photo
 *
 * Plus the review basket, which is not part of the walk — it is reachable
 * from the top bar at any depth:
 *
 *   /entries
 *   /entries/:lineId/edit                 ← correct a draft before sending
 *
 * and sign-in, which is the only route reachable while signed out:
 *
 *   /signin
 */
const SIGN_IN = '/signin'

export default function App() {
  const { isAuthed, expired } = useAuth()
  const location = useLocation()

  // Sign-in has a URL of its own. Rendering it *in place of* the routes left
  // the address bar still reading /projects — naming a page the signed-out
  // engineer cannot actually see, and one the browser would then offer back
  // from history as though the session were live.
  if (!isAuthed) {
    if (location.pathname === SIGN_IN) return <SetupScreen />
    return (
      <Navigate
        to={SIGN_IN}
        replace
        // A session that died mid-task resumes where it left off. An explicit
        // sign-out does not: this is a shared site tablet, and the next
        // engineer must not land inside the previous one's work.
        state={expired ? { from: location.pathname + location.search } : null}
      />
    )
  }

  // Just signed in — leave /signin behind rather than sitting on it.
  if (location.pathname === SIGN_IN) {
    return <Navigate to={location.state?.from || '/projects'} replace />
  }

  return (
    <AppShell>
      <OfflineBanner />
      <IdentityRefresher />
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/projects" element={<ProjectsScreen />} />
          <Route path="/projects/:projectId/levels" element={<LevelsScreen />} />
          <Route path="/projects/:projectId/levels/:level/items" element={<ItemsScreen />} />
          <Route path="/projects/:projectId/tasks" element={<LegacyTasksScreen />} />
          <Route path="/items/:taskId/subtasks" element={<SubtasksScreen />} />
          <Route path="/subtasks/:taskId" element={<ActionScreen />} />
          <Route path="/subtasks/:taskId/photo" element={<PhotoScreen />} />
          <Route path="/subtasks/:taskId/:type" element={<EntryFormScreen />} />
          <Route path="/entries" element={<EntriesScreen />} />
          <Route path="/entries/:lineId/edit" element={<EntryFormScreen />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </AnimatePresence>
    </AppShell>
  )
}

/**
 * Revalidates the stored key in the background on launch. If it was revoked
 * in Odoo overnight, the 401 handler in the API client clears it and the app
 * drops back to sign-in — without the engineer first losing a filled-in form.
 */
function IdentityRefresher() {
  const { refreshIdentity } = useAuth()
  const { data } = useWhoami()

  useEffect(() => {
    if (data) refreshIdentity(data)
  }, [data, refreshIdentity])

  return null
}
