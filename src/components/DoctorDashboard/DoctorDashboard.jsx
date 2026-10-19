import { useEffect, useState } from 'react'
import { AlertCircle, CalendarClock, CalendarDays, Info, List, Pause, Play, UserRound } from 'lucide-react'
import { getMyAvailability, updateMyProfile } from '../../lib/api'
import AgendaTab from './AgendaTab'
import ProfileTab from './ProfileTab'
import ScheduleTab from './ScheduleTab'
import { browserTimeZone, describeLoadError, describeSaveError, readableZone, todayInZone } from './doctorHelpers'
import './DoctorDashboard.css'

const TABS = [
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'schedule', label: 'Schedule & time off', icon: CalendarClock },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

/**
 * The signed-in doctor's workspace.
 * @param currentUser { role: "doctor", identifier, user } as App keeps it
 * @param onViewAppointments () => void: opens the read-only appointments list
 * @param onSessionRefresh () => Promise: re-reads /auth/me, so hasAvailability
 *   and the pause state stay in step with what the doctor just saved
 */
export default function DoctorDashboard({ currentUser, onSessionRefresh, onViewAppointments }) {
  const user = currentUser.user
  const isAccepting = Boolean(user?.doctorProfile?.isAcceptingAppointments)

  // First-time doctors land on schedule setup: nobody can book them before it.
  const [tab, setTab] = useState(user?.hasAvailability === false ? 'schedule' : 'agenda')
  const [reloadKey, setReloadKey] = useState(0)
  const [availability, setAvailability] = useState({ key: null, status: 'loading', data: null, error: null })
  const [agendaDate, setAgendaDate] = useState(null) // null means "today in the clinic's zone"
  const [toggling, setToggling] = useState(false)
  const [toggleError, setToggleError] = useState('')

  const isLoading = availability.key !== reloadKey
  const timezone = availability.data?.timezone ?? user?.timezone ?? browserTimeZone()
  const date = agendaDate ?? todayInZone(timezone)
  const needsSetup = !isLoading && availability.status === 'ready' && availability.data === null

  useEffect(() => {
    let cancelled = false
    getMyAvailability().then(
      (data) => {
        if (!cancelled) setAvailability({ key: reloadKey, status: 'ready', data, error: null })
      },
      (err) => {
        if (!cancelled) setAvailability({ key: reloadKey, status: 'error', data: null, error: describeLoadError(err) })
      }
    )
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = () => setReloadKey((k) => k + 1)

  // Fire and forget: a failed refresh only leaves the header a step behind.
  const refreshSession = () => Promise.resolve(onSessionRefresh?.()).catch(() => {})

  const handleScheduleSaved = (saved) => {
    setAvailability((prev) => ({ ...prev, data: saved }))
    refreshSession()
  }

  const toggleAccepting = async () => {
    setToggling(true)
    setToggleError('')
    try {
      await updateMyProfile({ isAcceptingAppointments: !isAccepting })
      await onSessionRefresh?.()
    } catch (err) {
      setToggleError(describeSaveError(err))
    } finally {
      setToggling(false)
    }
  }

  const reviewDate = (nextDate) => {
    setAgendaDate(nextDate)
    setTab('agenda')
  }

  const renderBody = () => {
    if (isLoading) {
      return (
        <div aria-busy="true" className="doctor-dashboard__skeleton-block">
          <span className="doctor-dashboard__visually-hidden">Loading your workspace…</span>
          <div className="doctor-dashboard__skeleton" aria-hidden="true" />
          <div className="doctor-dashboard__skeleton" aria-hidden="true" />
        </div>
      )
    }
    if (availability.status === 'error') {
      return (
        <div className="doctor-dashboard__panel-message doctor-dashboard__panel-message--error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{availability.error}</span>
          <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--ghost" onClick={reload}>
            Retry
          </button>
        </div>
      )
    }

    if (tab === 'schedule') {
      return (
        <ScheduleTab
          key={reloadKey}
          availability={availability.data}
          fallbackTimezone={user?.timezone}
          isOnboarding={needsSetup}
          onSaved={handleScheduleSaved}
          onReload={reload}
          onReviewDate={reviewDate}
        />
      )
    }
    if (tab === 'profile') return <ProfileTab user={user} onSaved={refreshSession} />

    if (needsSetup) {
      return (
        <div className="doctor-dashboard__empty">
          <Info size={20} aria-hidden="true" />
          <h2>Set up your schedule first</h2>
          <p>Add your weekly hours so patients can start booking you. Your agenda will appear here.</p>
          <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--primary" onClick={() => setTab('schedule')}>
            Set up schedule
          </button>
        </div>
      )
    }
    return <AgendaTab date={date} onDateChange={setAgendaDate} timezone={timezone} doctorId={user?.id} />
  }

  return (
    <div className="doctor-dashboard">
      <main className="doctor-dashboard__main">
        <header className="doctor-dashboard__header">
          <div>
            <div className="doctor-dashboard__tag">Doctor workspace</div>
            <h1 className="doctor-dashboard__title">{user?.fullName ?? currentUser.identifier}</h1>
            <p className="doctor-dashboard__subtitle-line">
              {user?.doctorProfile?.clinicName ? `${user.doctorProfile.clinicName} · ` : ''}
              Clinic time: {readableZone(timezone)}
            </p>
          </div>

          <div className="doctor-dashboard__status">
            {onViewAppointments && (
              <button type="button" className="doctor-dashboard__btn doctor-dashboard__btn--secondary" onClick={onViewAppointments}>
                <List size={14} aria-hidden="true" /> All appointments
              </button>
            )}
            <span className={`doctor-dashboard__pill ${isAccepting ? 'doctor-dashboard__pill--on' : 'doctor-dashboard__pill--off'}`}>
              {isAccepting ? 'Accepting appointments' : 'Bookings paused'}
            </span>
            <button
              type="button"
              className="doctor-dashboard__btn doctor-dashboard__btn--secondary"
              onClick={toggleAccepting}
              disabled={toggling || isLoading || needsSetup}
              title={needsSetup ? 'Save your weekly schedule first' : undefined}
            >
              {isAccepting ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              {isAccepting ? 'Pause bookings' : 'Resume bookings'}
            </button>
          </div>
        </header>

        {toggleError && (
          <p className="doctor-dashboard__inline-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" /> {toggleError}
          </p>
        )}
        {!isAccepting && !needsSetup && !isLoading && (
          <p className="doctor-dashboard__note">
            Patients can’t book you while bookings are paused. Existing appointments stay as they are.
          </p>
        )}

        <div className="doctor-dashboard__tabs" role="tablist" aria-label="Doctor workspace sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`doctor-tab-${id}`}
              aria-selected={tab === id}
              aria-controls="doctor-tabpanel"
              className={`doctor-dashboard__tab ${tab === id ? 'doctor-dashboard__tab--active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={15} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>

        <div id="doctor-tabpanel" role="tabpanel" aria-labelledby={`doctor-tab-${tab}`}>
          {renderBody()}
        </div>
      </main>
    </div>
  )
}
