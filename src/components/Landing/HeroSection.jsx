import { useState } from 'react'
import { ArrowRight, ChevronDown, Check } from 'lucide-react'
import { DEPARTMENTS } from '../BookAppointment/bookingHelpers'
import { EMERGENCY_PHONE, formatShortDate, opdStatus, upcomingOpdDays } from './landingData'

const FACTS = [
  { value: '6', label: 'specialist departments under one roof' },
  { value: 'Mon–Sat', label: 'outpatient clinics, 8 am to 8 pm' },
  { value: '24/7', label: 'emergency and trauma unit' },
  { value: '30 min', label: 'consultations with the doctor you chose' },
]

export default function HeroSection({ onBook }) {
  const [department, setDepartment] = useState('')
  const status = opdStatus()
  const [slipDay] = upcomingOpdDays(1)

  const handleSubmit = (e) => {
    e.preventDefault()
    onBook(department || null)
  }

  return (
    <section className="lp-hero" id="home">
      <div className="lp-container">
        <div className="lp-hero__inner">
          <div className="lp-hero__copy">
            <p className="lp-hero__status" data-reveal>
              <span
                className={`lp-hero__status-dot ${status.open ? 'lp-hero__status-dot--open' : ''}`}
                aria-hidden="true"
              />
              {status.label}
            </p>

            <h1 className="lp-hero__title lp-display" data-reveal style={{ '--reveal-delay': '80ms' }}>
              A hospital that <em>keeps its appointments.</em>
            </h1>

            <p className="lp-hero__lede" data-reveal style={{ '--reveal-delay': '160ms' }}>
              Choose a department, pick the consultant you want to see, and take a time that’s
              genuinely free on their calendar. No phone queue, no clipboard, no guessing how long
              the waiting room will take.
            </p>

            <form
              className="lp-hero__book"
              onSubmit={handleSubmit}
              data-reveal
              style={{ '--reveal-delay': '240ms' }}
            >
              <label htmlFor="hero-department" className="lp-hero__book-label">
                What do you need help with?
              </label>
              <div className="lp-hero__book-row">
                <div className="lp-hero__select-wrap">
                  <select
                    id="hero-department"
                    className="lp-hero__select"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="">I’m not sure yet</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="lp-hero__select-icon" aria-hidden="true" />
                </div>
                <button type="submit" className="lp-btn lp-btn--primary">
                  <span>See open times</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>

            <p className="lp-hero__note" data-reveal style={{ '--reveal-delay': '300ms' }}>
              Emergency? Don’t book — call{' '}
              <a href={EMERGENCY_PHONE.href}>{EMERGENCY_PHONE.display}</a>, answered around the clock.
            </p>
          </div>

          <figure className="lp-hero__visual" data-reveal style={{ '--reveal-delay': '200ms' }}>
            <div className="lp-hero__photo">
              <img
                src="/images/hero-team.webp"
                alt="Dr. Sarah Jenkins and Dr. Daniel Chen reviewing a patient chart in a consultation room"
                loading="eager"
              />
            </div>

            <div className="lp-slip" aria-hidden="true">
              <div className="lp-slip__head">
                <span>Appointment</span>
                <span className="lp-slip__ok">
                  <Check size={12} strokeWidth={3} /> Confirmed
                </span>
              </div>
              <div className="lp-slip__doctor">Dr. Sarah Jenkins</div>
              <div className="lp-slip__dept">Cardiology · Room 3B, Level 2</div>
              <div className="lp-slip__tear" />
              <div className="lp-slip__when">
                <div>
                  <span>Date</span>
                  <strong>{formatShortDate(slipDay)}</strong>
                </div>
                <div>
                  <span>Time</span>
                  <strong>2:30 pm</strong>
                </div>
              </div>
            </div>
          </figure>
        </div>

        <ul className="lp-hero__facts">
          {FACTS.map((fact, i) => (
            <li
              key={fact.value}
              className="lp-hero__fact"
              data-reveal
              style={{ '--reveal-delay': `${i * 70}ms` }}
            >
              <span className="lp-hero__fact-value lp-display">{fact.value}</span>
              <span className="lp-hero__fact-label">{fact.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
