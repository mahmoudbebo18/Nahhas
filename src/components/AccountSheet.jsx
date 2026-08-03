import { LogOut, KeyRound, Building2, Mail, FolderCheck } from 'lucide-react'
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
        <div className="flex items-center gap-3 rounded-2xl bg-primary-soft p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-fg">
            {String(identity?.name ?? '?').trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">
              <Bidi>{identity?.name}</Bidi>
              {!identity?.name && '—'}
            </p>
            {identity?.employee_id && (
              <p className="text-[13px] text-muted">
                {t('employeeRef')} {identity.employee_id}
              </p>
            )}
          </div>
        </div>

        {rows.length > 0 && (
          <dl className="mt-3 space-y-2">
            {rows.map(({ icon: Icon, value }) => (
              <div key={value} className="flex items-center gap-2.5 px-1 text-sm text-muted">
                <Icon className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
                <span className="truncate">{value}</span>
              </div>
            ))}
          </dl>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-[13px] leading-relaxed text-muted">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t('keyStoredNote')}
        </p>

        <button
          type="button"
          onClick={() => {
            onClose()
            signOut()
          }}
          className="btn mt-4 w-full border border-danger/30 bg-danger/10 text-danger hover:bg-danger/15"
        >
          <LogOut className="rtl-flip h-4 w-4" aria-hidden />
          {t('signOut')}
        </button>
      </div>
    </Sheet>
  )
}
