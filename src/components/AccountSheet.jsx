import { LogOut, Building2, Mail, FolderCheck } from 'lucide-react'
import Sheet from './Sheet'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import Bidi from './Bidi'

/** Who am I, and how do I get out. Nothing else belongs here. */
export default function AccountSheet({ open, onClose }) {
  const { identity, signOut } = useAuth()
  const { t } = useI18n()

  const rows = [
    identity?.login && { icon: Mail, value: identity.login },
    identity?.company_id && {
      icon: Building2,
      value: `${t('companyRef')} ${identity.company_id}`,
    },
    Array.isArray(identity?.allowed_project_ids) && {
      icon: FolderCheck,
      value: `${identity.allowed_project_ids.length} ${t('projects').toLowerCase()}`,
    },
  ].filter(Boolean)

  return (
    <Sheet open={open} onClose={onClose} title={t('signedInAs')}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-title font-bold text-primary-fg">
            {String(identity?.name ?? '?').trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">
              <Bidi>{identity?.name}</Bidi>
              {!identity?.name && '—'}
            </p>
            {identity?.employee_id && (
              <p className="tnum text-secondary text-muted">
                {t('employeeRef')} {identity.employee_id}
              </p>
            )}
          </div>
        </div>

        {rows.length > 0 && (
          <dl className="mt-4 space-y-2 border-t border-border pt-4">
            {rows.map(({ icon: Icon, value }) => (
              <div key={value} className="flex items-center gap-2 text-secondary text-muted">
                <Icon className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
                <span className="truncate">{value}</span>
              </div>
            ))}
          </dl>
        )}

        <button
          type="button"
          onClick={() => {
            onClose()
            signOut()
          }}
          className="btn-danger mt-6 w-full"
        >
          <LogOut className="rtl-flip h-4 w-4" aria-hidden />
          {t('signOut')}
        </button>
      </div>
    </Sheet>
  )
}
