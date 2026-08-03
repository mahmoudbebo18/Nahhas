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
 */
export default function App() {
  const { isAuthed } = useAuth()
  const location = useLocation()

  if (!isAuthed) return <SetupScreen />

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
