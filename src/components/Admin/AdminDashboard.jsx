import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  LayoutDashboard,
  RefreshCw,
  Search,
  Ticket,
  Users,
} from 'lucide-react'
import {
  ApiError,
  createInvite,
  getAdminStats,
  listAdminAppointments,
  listAdminUsers,
  listInvites,
  revokeInvite,
  setUserActive,
} from '../../lib/api'
import { cleanText, isValidEmail, normalizeEmail } from '../../lib/sanitize'
import { formatClock, formatLongDate } from '../BookAppointment/bookingHelpers'
import { STATUS_LABELS, pluralize } from '../DoctorDashboard/doctorHelpers'
import '../DoctorDashboard/DoctorDashboard.css'
import './Admin.css'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'invites', label: 'Doctor invites', icon: Ticket },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
]

const PAGE_SIZE = 25

function describeError(err) {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.'
  if (['NETWORK_ERROR', 'TIMEOUT', 'CLIENT_THROTTLED'].includes(err.code)) return err.message
  if (err.status === 429) return 'Too many requests. Please wait a moment.'
  if (err.code === 'VALIDATION_FAILED') return err.details?.[0]?.message ?? 'Please check the filters.'
  return err.message || 'Something went wrong. Please try again.'
}

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

// Loads a paged list for the given params, ignoring stale responses.
function usePagedList(fetcher, params) {
  const [state, setState] = useState({ key: null, status: 'loading', rows: [], meta: null, error: null })
  const latest = useRef(0)
  const key = JSON.stringify(params)

  const load = useCallback(() => {
    const requestId = ++latest.current
    fetcher(JSON.parse(key)).then(
      ({ rows, meta }) => requestId === latest.current && setState({ key, status: 'ready', rows, meta, error: null }),
      (err) => requestId === latest.current && setState({ key, status: 'error', rows: [], meta: null, error: describeError(err) })
    )
  }, [fetcher, key])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, loading: state.key !== key, load, setRows: (fn) => setState((prev) => ({ ...prev, rows: fn(prev.rows) })) }
}

function Pager({ page, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (pages <= 1) return null
  return (
    <nav className="doctor-dashboard__date-nav" aria-label="Pagination">
      <button type="button" className="doctor-dashboard__icon-btn" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={16} />
      </button>
      <span className="doctor-dashboard__hint">
        Page {page} of {pages}
      </span>
      <button type="button" className="doctor-dashboard__icon-btn" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}

function ListState({ list, empty, children }) {
  if (list.loading) {
    return (
      <div className="doctor-dashboard__skeleton-block" aria-busy="true">
        <div className="doctor-dashboard__skeleton admin__skeleton" />
      </div>
    )
  }
  if (list.status === 'error') {
    return (
      <div className="doctor-dashboard__panel-message doctor-dashboard__panel-message--error" role="alert">
        <AlertCircle size={16} aria-hidden="true" /> <span>{list.error}</span>
        <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--ghost" onClick={list.load}>
          Retry
        </button>
      </div>
    )
  }
  if (list.rows.length === 0) return <p className="doctor-dashboard__panel-message">{empty}</p>
  return children
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function Overview({ onOpenTab }) {
  const [state, setState] = useState({ status: 'loading', stats: null, error: null })
  const load = useCallback(() => {
    getAdminStats().then(
      (stats) => setState({ status: 'ready', stats, error: null }),
      (err) => setState({ status: 'error', stats: null, error: describeError(err) })
    )
  }, [])
  useEffect(() => {
    load()
  }, [load])

  if (state.status === 'loading') {
    return (
      <div className="doctor-dashboard__skeleton-block" aria-busy="true">
        <div className="doctor-dashboard__skeleton admin__skeleton" />
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="doctor-dashboard__panel-message doctor-dashboard__panel-message--error" role="alert">
        <AlertCircle size={16} aria-hidden="true" /> <span>{state.error}</span>
        <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--ghost" onClick={load}>
          Retry
        </button>
      </div>
    )
  }

  const { users, appointments, invites } = state.stats
  const tiles = [
    { label: 'Active patients', value: users.patients, tab: 'users' },
    { label: 'Active doctors', value: users.doctors, hint: `${users.acceptingDoctors} taking bookings`, tab: 'users' },
    { label: 'Upcoming appointments', value: appointments.upcoming, hint: `${appointments.next24h} in the next 24 h`, tab: 'appointments' },
    { label: 'Booked in the last 7 days', value: appointments.bookedLast7Days, tab: 'appointments' },
    { label: 'Open doctor invites', value: invites.active, tab: 'invites' },
    { label: 'Deactivated accounts', value: users.inactive, tab: 'users' },
  ]
  const last30 = appointments.last30Days
  const total30 = Object.values(last30).reduce((sum, n) => sum + n, 0)

  return (
    <div className="doctor-dashboard__stack">
      <div className="admin__tiles">
        {tiles.map((tile) => (
          <button key={tile.label} type="button" className="admin__tile" onClick={() => onOpenTab(tile.tab)}>
            <span className="admin__tile-value">{tile.value}</span>
            <span className="admin__tile-label">{tile.label}</span>
            {tile.hint && <span className="doctor-dashboard__hint">{tile.hint}</span>}
          </button>
        ))}
      </div>

      <section className="doctor-dashboard__card">
        <h2 className="doctor-dashboard__section-title">Appointments in the last 30 days</h2>
        {total30 === 0 ? (
          <p className="doctor-dashboard__note">No appointments in this period yet.</p>
        ) : (
          <>
            <div className="admin__bar" role="img" aria-label={`Of ${total30}: ${Object.entries(last30).map(([k, v]) => `${v} ${STATUS_LABELS[k]}`).join(', ')}`}>
              {Object.entries(last30).map(([status, count]) =>
                count ? <span key={status} className={`admin__bar-part admin__bar-part--${status}`} style={{ flexGrow: count }} /> : null
              )}
            </div>
            <dl className="admin__legend">
              {Object.entries(last30).map(([status, count]) => (
                <div key={status}>
                  <dt>
                    <span className={`admin__dot admin__bar-part--${status}`} aria-hidden="true" /> {STATUS_LABELS[status]}
                  </dt>
                  <dd>{count}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const fetchUsers = (params) => listAdminUsers(params).then(({ users, meta }) => ({ rows: users, meta }))

function UsersTab({ selfId }) {
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pendingId, setPendingId] = useState(null)
  const [message, setMessage] = useState(null)
  const list = usePagedList(fetchUsers, { role, status, q, page, limit: PAGE_SIZE })

  const submitSearch = (e) => {
    e.preventDefault()
    const clean = cleanText(search, { maxLength: 100 })
    if (clean && clean.length < 2) return setMessage({ type: 'error', text: 'Search needs at least 2 characters.' })
    setMessage(null)
    setQ(clean)
    setPage(1)
  }

  const toggle = async (user) => {
    const activate = !user.isActive
    if (!activate && !window.confirm(`Deactivate ${user.fullName}? They'll be signed out and won't be able to sign in.`)) return
    setPendingId(user.id)
    setMessage(null)
    try {
      const updated = await setUserActive(user.id, activate)
      list.setRows((rows) => rows.map((row) => (row.id === updated.id ? updated : row)))
      setMessage({ type: 'success', text: `${updated.fullName} is now ${updated.isActive ? 'active' : 'deactivated'}.` })
    } catch (err) {
      setMessage({ type: 'error', text: describeError(err) })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className="doctor-dashboard__section" aria-label="Users">
      <form className="admin__filters" onSubmit={submitSearch} role="search">
        <div className="admin__search">
          <Search size={15} aria-hidden="true" />
          <label htmlFor="admin-user-search" className="doctor-dashboard__visually-hidden">Search by name or email</label>
          <input
            id="admin-user-search"
            className="doctor-dashboard__input"
            placeholder="Name or email"
            maxLength={100}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label htmlFor="admin-user-role" className="doctor-dashboard__visually-hidden">Role</label>
        <select id="admin-user-role" className="doctor-dashboard__input doctor-dashboard__input--compact" value={role} onChange={(e) => { setRole(e.target.value); setPage(1) }}>
          <option value="">All roles</option>
          <option value="patient">Patients</option>
          <option value="doctor">Doctors</option>
          <option value="admin">Admins</option>
        </select>
        <label htmlFor="admin-user-status" className="doctor-dashboard__visually-hidden">Status</label>
        <select id="admin-user-status" className="doctor-dashboard__input doctor-dashboard__input--compact" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
        <button type="submit" className="doctor-dashboard__btn doctor-dashboard__btn--secondary">Search</button>
      </form>

      {message && (
        <div className={`doctor-dashboard__banner doctor-dashboard__banner--${message.type === 'error' ? 'error' : 'success'}`} role={message.type === 'error' ? 'alert' : 'status'}>
          {message.type === 'error' ? <AlertCircle size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
          <span>{message.text}</span>
        </div>
      )}

      {!list.loading && list.status === 'ready' && (
        <p className="doctor-dashboard__hint" role="status">{pluralize(list.meta.total, 'user')}</p>
      )}

      <ListState list={list} empty="No users match these filters.">
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Joined</th>
                <th scope="col">Last sign-in</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="doctor-dashboard__visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((user) => (
                <tr key={user.id} className={user.isActive ? '' : 'admin__row--muted'}>
                  <td>
                    <strong>{user.fullName}</strong>
                    <span className="admin__sub">{user.email}</span>
                  </td>
                  <td>
                    <span className={`admin__role admin__role--${user.role}`}>{user.role}</span>
                    {user.role === 'doctor' && <span className="admin__sub">{user.specialization}</span>}
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>{formatDate(user.lastLoginAt)}</td>
                  <td>{user.isActive ? 'Active' : 'Deactivated'}</td>
                  <td className="admin__actions-cell">
                    {user.role !== 'admin' && user.id !== selfId && (
                      <button
                        type="button"
                        className={`doctor-dashboard__btn ${user.isActive ? 'doctor-dashboard__btn--danger-outline' : 'doctor-dashboard__btn--secondary'}`}
                        disabled={pendingId === user.id}
                        onClick={() => toggle(user)}
                      >
                        {pendingId === user.id ? 'Saving…' : user.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListState>
      {list.meta && <Pager page={page} total={list.meta.total} onPage={setPage} />}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

const fetchInvites = (params) => listInvites(params).then(({ invites, meta }) => ({ rows: invites, meta }))

function NewInviteForm({ onCreated }) {
  const [label, setLabel] = useState('')
  const [email, setEmail] = useState('')
  const [days, setDays] = useState(7)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const cleanLabel = cleanText(label, { maxLength: 120 })
    const cleanEmail = normalizeEmail(email)
    if (cleanLabel.length < 2) return setError('Add a label so you can recognise this invite later.')
    if (cleanEmail && !isValidEmail(cleanEmail)) return setError('That email address doesn’t look right.')
    setPending(true)
    setError('')
    try {
      const result = await createInvite({ label: cleanLabel, email: cleanEmail || undefined, expiresInDays: Number(days) })
      setCreated(result)
      setCopied(false)
      setLabel('')
      setEmail('')
      onCreated()
    } catch (err) {
      setError(describeError(err))
    } finally {
      setPending(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created.code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <form className="doctor-dashboard__card" onSubmit={submit} noValidate>
      <h2 className="doctor-dashboard__section-title">Invite a doctor</h2>
      <p className="doctor-dashboard__note">
        Each code works once. Lock it to the doctor’s email so nobody else can use it, and share it privately.
      </p>
      <div className="doctor-dashboard__grid doctor-dashboard__grid--3">
        <div className="doctor-dashboard__field">
          <label htmlFor="invite-label" className="doctor-dashboard__label">Label</label>
          <input id="invite-label" className="doctor-dashboard__input" placeholder="e.g. Dr. Rao, neurology" maxLength={120} value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="doctor-dashboard__field">
          <label htmlFor="invite-email" className="doctor-dashboard__label">Doctor’s email (recommended)</label>
          <input id="invite-email" type="email" className="doctor-dashboard__input" maxLength={254} autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="doctor-dashboard__field">
          <label htmlFor="invite-days" className="doctor-dashboard__label">Expires after</label>
          <select id="invite-days" className="doctor-dashboard__input" value={days} onChange={(e) => setDays(e.target.value)}>
            {[1, 3, 7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {d} day{d === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p className="doctor-dashboard__inline-error" role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      )}
      {created && (
        <div className="admin__code" role="status">
          <div>
            <span className="doctor-dashboard__hint">New code for “{created.invite.label}”. It won’t be shown again.</span>
            <code>{created.code}</code>
          </div>
          <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--secondary" onClick={copy}>
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      <div className="doctor-dashboard__savebar">
        <button type="submit" className="doctor-dashboard__btn doctor-dashboard__btn--primary" disabled={pending}>
          {pending ? 'Creating…' : 'Create invite code'}
        </button>
      </div>
    </form>
  )
}

function InvitesTab() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pendingId, setPendingId] = useState(null)
  const [error, setError] = useState('')
  const list = usePagedList(fetchInvites, { status, page, limit: PAGE_SIZE })

  const revoke = async (invite) => {
    if (!window.confirm(`Revoke the invite “${invite.label}”? The code will stop working.`)) return
    setPendingId(invite.id)
    setError('')
    try {
      const updated = await revokeInvite(invite.id)
      list.setRows((rows) => rows.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)))
    } catch (err) {
      setError(describeError(err))
      list.load()
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="doctor-dashboard__stack">
      <NewInviteForm onCreated={list.load} />
      <section className="doctor-dashboard__section" aria-label="Invite codes">
        <div className="admin__filters">
          <h2 className="doctor-dashboard__section-title">Invite codes</h2>
          <label htmlFor="invite-status" className="doctor-dashboard__visually-hidden">Status</label>
          <select id="invite-status" className="doctor-dashboard__input doctor-dashboard__input--compact" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="used">Used</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
        {error && (
          <p className="doctor-dashboard__inline-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" /> {error}
          </p>
        )}
        <ListState list={list} empty="No invite codes yet.">
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th scope="col">Label</th>
                  <th scope="col">Code ends</th>
                  <th scope="col">Status</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Used by</th>
                  <th scope="col"><span className="doctor-dashboard__visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((invite) => (
                  <tr key={invite.id} className={invite.status === 'active' ? '' : 'admin__row--muted'}>
                    <td>
                      <strong>{invite.label}</strong>
                      {invite.email && <span className="admin__sub">Only for {invite.email}</span>}
                    </td>
                    <td><code>…{invite.codeHint}</code></td>
                    <td><span className={`admin__status admin__status--${invite.status}`}>{invite.status}</span></td>
                    <td>{formatDate(invite.expiresAt)}</td>
                    <td>{invite.usedBy ? `${invite.usedBy.fullName}` : '—'}</td>
                    <td className="admin__actions-cell">
                      {invite.status === 'active' && (
                        <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--danger-outline" disabled={pendingId === invite.id} onClick={() => revoke(invite)}>
                          {pendingId === invite.id ? 'Revoking…' : 'Revoke'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListState>
        {list.meta && <Pager page={page} total={list.meta.total} onPage={setPage} />}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

const fetchAppointments = (params) => listAdminAppointments(params).then(({ appointments, meta }) => ({ rows: appointments, meta }))

function AppointmentsTab() {
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const validRange = !from || !to || from <= to
  const list = usePagedList(fetchAppointments, { status, from, to: validRange ? to : '', page, limit: PAGE_SIZE })
  const setFilter = (setter) => (e) => {
    setter(e.target.value)
    setPage(1)
  }

  return (
    <section className="doctor-dashboard__section" aria-label="All appointments">
      <div className="admin__filters">
        <label className="admin__inline-label">
          From <input type="date" className="doctor-dashboard__input doctor-dashboard__input--date" value={from} onChange={setFilter(setFrom)} />
        </label>
        <label className="admin__inline-label">
          To <input type="date" className="doctor-dashboard__input doctor-dashboard__input--date" min={from || undefined} value={to} onChange={setFilter(setTo)} />
        </label>
        <label htmlFor="admin-appt-status" className="doctor-dashboard__visually-hidden">Status</label>
        <select id="admin-appt-status" className="doctor-dashboard__input doctor-dashboard__input--compact" value={status} onChange={setFilter(setStatus)}>
          <option value="">Any status</option>
          {Object.entries(STATUS_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <button type="button" className="doctor-dashboard__icon-btn" aria-label="Refresh" onClick={list.load}>
          <RefreshCw size={15} />
        </button>
      </div>
      {!validRange && <p className="doctor-dashboard__inline-error">The end date is before the start date.</p>}

      <ListState list={list} empty="No appointments match these filters.">
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th scope="col">When (clinic time)</th>
                <th scope="col">Doctor</th>
                <th scope="col">Patient</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{formatLongDate(a.localDate)}</strong>
                    <span className="admin__sub">{formatClock(a.localStartTime)} – {formatClock(a.localEndTime)}</span>
                  </td>
                  <td>
                    {a.doctor?.fullName ?? '—'}
                    {a.doctor?.specialization && <span className="admin__sub">{a.doctor.specialization}</span>}
                  </td>
                  <td>
                    {a.patient?.fullName ?? '—'}
                    {a.patient?.email && <span className="admin__sub">{a.patient.email}</span>}
                  </td>
                  <td>
                    <span className={`doctor-dashboard__badge doctor-dashboard__badge--${a.status}`}>{STATUS_LABELS[a.status]}</span>
                    {a.hasPendingReschedule && <span className="admin__sub">Reschedule pending</span>}
                    {a.cancellation?.reason && <span className="admin__sub">“{a.cancellation.reason}”</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListState>
      {list.meta && <Pager page={page} total={list.meta.total} onPage={setPage} />}
    </section>
  )
}

/**
 * Hospital admin workspace: numbers at a glance, account management, doctor
 * invite codes and a read-only view of every appointment.
 */
export default function AdminDashboard({ currentUser }) {
  const [tab, setTab] = useState('overview')
  return (
    <div className="doctor-dashboard">
      <main className="doctor-dashboard__main">
        <header className="doctor-dashboard__header">
          <div>
            <div className="doctor-dashboard__tag">Administration</div>
            <h1 className="doctor-dashboard__title">Hospital admin</h1>
            <p className="doctor-dashboard__subtitle-line">Signed in as {currentUser.user?.fullName ?? currentUser.identifier}</p>
          </div>
        </header>

        <div className="doctor-dashboard__tabs" role="tablist" aria-label="Admin sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`doctor-dashboard__tab ${tab === id ? 'doctor-dashboard__tab--active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={15} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {tab === 'overview' && <Overview onOpenTab={setTab} />}
          {tab === 'users' && <UsersTab selfId={currentUser.user?.id} />}
          {tab === 'invites' && <InvitesTab />}
          {tab === 'appointments' && <AppointmentsTab />}
        </div>
      </main>
    </div>
  )
}
