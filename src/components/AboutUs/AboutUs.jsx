import { useEffect, useRef } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  CalendarCheck,
  FileText,
  MapPin,
  Mail,
  PhoneCall,
  Receipt,
} from 'lucide-react'
import { ADDRESS, EMAIL, EMERGENCY_PHONE, opdStatus } from '../Landing/landingData'
import './AboutUs.css'

// Names and years of experience match backend/scripts/seed.js.
const HEADS = [
  { name: 'Dr. Asha Verma', role: 'Internal Medicine', note: 'Medical Director', years: 15, tone: 'teal' },
  { name: 'Dr. Sarah Jenkins', role: 'Cardiology', note: 'Head of department', years: 18, tone: 'rust' },
  { name: 'Dr. Robert King', role: 'Orthopedics', note: 'Head of department', years: 20, tone: 'ochre' },
  { name: 'Dr. Chloe Bennett', role: 'Pediatrics', note: 'Head of department', years: 12, tone: 'plum' },
]

const AFTER_BOOKING = [
  {
    icon: CalendarCheck,
    title: 'It’s in your account',
    text: 'See, move or cancel the appointment yourself, any time before it starts.',
  },
  {
    icon: BellRing,
    title: 'If the day changes, we call',
    text: 'Doctor running late or off sick? The front desk phones you, so you don’t find out in the waiting room.',
  },
  {
    icon: Receipt,
    title: 'Ask about cost first',
    text: 'If a scan or blood test is ordered, the desk tells you what it costs before you agree to it.',
  },
  {
    icon: FileText,
    title: 'Reports come to you',
    text: 'Results are shared with you as soon as your doctor has looked at them.',
  },
]

// Illustrative only: a morning on one doctor's calendar.
const SAMPLE_SLOTS = [
  { time: '9:00', state: 'taken' },
  { time: '9:20', state: 'taken' },
  { time: '9:40', state: 'open' },
  { time: '10:00', state: 'picked' },
  { time: '10:20', state: 'taken' },
  { time: '10:40', state: 'open' },
  { time: '11:00', state: 'open' },
  { time: '11:20', state: 'taken' },
]

const initials = (name) =>
  name
    .replace('Dr. ', '')
    .split(' ')
    .map((part) => part[0])
    .join('')

// Same pattern as the landing page: [data-reveal] blocks fade up as they
// enter the viewport. Without IntersectionObserver, or with reduced motion,
// everything simply stays visible.
function useScrollReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    root.dataset.animate = 'true'
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.dataset.revealed = 'true'
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    )
    root.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
      delete root.dataset.animate
    }
  }, [rootRef])
}

const delay = (ms) => ({ '--reveal-delay': `${ms}ms` })

export default function AboutUs({ onBack, onBookClick, onExploreSpecialties }) {
  const rootRef = useRef(null)
  useScrollReveal(rootRef)
  const status = opdStatus()

  return (
    <div className="about-us" ref={rootRef}>
      {/* ------------------------------------------------------------------ Hero */}
      <header className="about-us__hero">
        <div className="about-us__container">
          <button type="button" className="about-us__back" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Back to home</span>
          </button>

          <div className="about-us__hero-grid">
            <div className="about-us__hero-copy">
              <p className="about-us__status" data-reveal>
                <span
                  className={`about-us__status-dot ${status.open ? 'about-us__status-dot--open' : ''}`}
                  aria-hidden="true"
                />
                {status.label}
              </p>

              <h1 className="about-us__title" data-reveal style={delay(80)}>
                Every hospital visit goes better with <em>someone beside you.</em>
              </h1>

              <div className="about-us__entry" data-reveal style={delay(160)}>
                <span className="about-us__entry-script" lang="hi" aria-hidden="true">
                  सहायक
                </span>
                <p className="about-us__entry-head">
                  <strong>sahayak</strong>
                  <span>Hindi · noun</span>
                </p>
                <ol className="about-us__entry-senses">
                  <li>one who helps; an assistant.</li>
                  <li>the person who stands next to you while you get something done.</li>
                </ol>
              </div>

              <p className="about-us__lede" data-reveal style={delay(240)}>
                We named the hospital after that second meaning. Dr Sahayak has six departments,
                thirteen consultants and an emergency unit that never shuts. Most of what a patient
                needs from us is someone to point at the right door.
              </p>
            </div>

            <figure className="about-us__hero-figure" data-reveal style={delay(200)}>
              <div className="about-us__hero-frame">
                <img
                  src="/images/hero-team.webp"
                  alt="Two cardiologists going over a patient chart together"
                  width="1376"
                  height="768"
                />
              </div>
              <figcaption>Dr. Sarah Jenkins and Dr. Daniel Chen, cardiology.</figcaption>
            </figure>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------- Pick the doctor */}
      <section className="about-us__section">
        <div className="about-us__container about-us__split">
          <div className="about-us__split-copy" data-reveal>
            <p className="about-us__kicker">Booking</p>
            <h2 className="about-us__heading">
              You pick the doctor, <em>not just the department.</em>
            </h2>
            <p>
              Most hospital systems ask for a department and hand you whoever has a gap. That’s fine
              for a one-off rash. It isn’t if you’re managing blood pressure or a bad knee over
              several months and would rather keep seeing the same person.
            </p>
            <p>
              So every consultant has their own page, and the times you see come straight from that
              doctor’s calendar. If a slot is on the screen, it’s free. If it isn’t, nobody has
              quietly double-booked it.
            </p>
            <button type="button" className="about-us__text-link" onClick={onBookClick}>
              Try it: find a free time <ArrowRight size={15} />
            </button>
          </div>

          <div className="about-us__slots-card" data-reveal style={delay(120)} aria-hidden="true">
            <div className="about-us__slots-doctor">
              <span className="about-us__avatar about-us__avatar--teal">AV</span>
              <div>
                <strong>Dr. Asha Verma</strong>
                <span>Internal Medicine · Tuesday morning</span>
              </div>
            </div>
            <ul className="about-us__slots">
              {SAMPLE_SLOTS.map((slot) => (
                <li key={slot.time} className={`about-us__slot about-us__slot--${slot.state}`}>
                  {slot.time}
                </li>
              ))}
            </ul>
            <p className="about-us__slots-legend">
              <span className="about-us__legend about-us__legend--open">Free</span>
              <span className="about-us__legend about-us__legend--taken">Booked</span>
              <span className="about-us__legend about-us__legend--picked">Yours</span>
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- After booking */}
      <section className="about-us__band">
        <div className="about-us__container">
          <div className="about-us__band-head" data-reveal>
            <p className="about-us__kicker about-us__kicker--light">After you book</p>
            <h2 className="about-us__heading about-us__heading--light">
              What you can count on <em>from us.</em>
            </h2>
          </div>

          <ol className="about-us__journey">
            {AFTER_BOOKING.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="about-us__step" data-reveal style={delay(i * 90)}>
                <span className="about-us__step-icon">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------------------------- People */}
      <section className="about-us__section">
        <div className="about-us__container">
          <div className="about-us__people-head" data-reveal>
            <div>
              <p className="about-us__kicker">The people</p>
              <h2 className="about-us__heading">
                Department heads <em>still run clinics.</em>
              </h2>
            </div>
            <p className="about-us__people-lede">
              You can book any of them the same way you’d book anyone else.
            </p>
          </div>

          <ul className="about-us__people">
            {HEADS.map((head, i) => (
              <li key={head.name} className="about-us__person" data-reveal style={delay(i * 80)}>
                <span className={`about-us__avatar about-us__avatar--${head.tone}`} aria-hidden="true">
                  {initials(head.name)}
                </span>
                <h3>{head.name}</h3>
                <p className="about-us__person-role">{head.role}</p>
                <p className="about-us__person-note">{head.note}</p>
                <p className="about-us__person-years">
                  <strong>{head.years}</strong> years in practice
                </p>
              </li>
            ))}
          </ul>

          <button type="button" className="about-us__text-link" onClick={onExploreSpecialties}>
            Meet every department <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* --------------------------------------------------------------- Visit */}
      <section className="about-us__section about-us__section--tight">
        <div className="about-us__container about-us__visit">
          <figure className="about-us__visit-fig about-us__visit-fig--a" data-reveal>
            <img
              src="/images/clinic-lounge.webp"
              alt="Main atrium with reception desk, self check-in kiosks and a seating lounge"
              loading="lazy"
              width="1376"
              height="768"
            />
            <figcaption>The atrium. Check in at the kiosks by the east doors.</figcaption>
          </figure>

          <figure className="about-us__visit-fig about-us__visit-fig--b" data-reveal style={delay(100)}>
            <img
              src="/images/diagnostic-lab.webp"
              alt="Diagnostic laboratory with analysers and a technician at work"
              loading="lazy"
              width="1376"
              height="768"
            />
            <figcaption>Lab and imaging are upstairs, so results reach your doctor the same day.</figcaption>
          </figure>

          <aside className="about-us__visit-card" data-reveal style={delay(180)}>
            <p className="about-us__kicker">Visit us</p>
            <p className="about-us__visit-status">
              <span
                className={`about-us__status-dot ${status.open ? 'about-us__status-dot--open' : ''}`}
                aria-hidden="true"
              />
              {status.label}
            </p>
            <dl className="about-us__hours">
              <div>
                <dt>Outpatient clinics</dt>
                <dd>Mon–Sat, 8 am – 8 pm</dd>
              </div>
              <div>
                <dt>Emergency</dt>
                <dd>Always open, no appointment</dd>
              </div>
            </dl>
            <ul className="about-us__contact">
              <li>
                <MapPin size={16} aria-hidden="true" />
                <span>{ADDRESS}</span>
              </li>
              <li>
                <Mail size={16} aria-hidden="true" />
                <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
              </li>
              <li>
                <PhoneCall size={16} aria-hidden="true" />
                <a href={EMERGENCY_PHONE.href} className="about-us__emergency">
                  Emergency · {EMERGENCY_PHONE.display}
                </a>
              </li>
            </ul>
          </aside>
        </div>
      </section>

      {/* ------------------------------------------------------------- Closing */}
      <section className="about-us__closing">
        <div className="about-us__container about-us__closing-inner" data-reveal>
          <h2>
            Need to see someone? <em>Pick a time.</em>
          </h2>
          <div className="about-us__actions">
            <button type="button" className="about-us__btn about-us__btn--light" onClick={onBookClick}>
              <span>Book an appointment</span>
              <ArrowRight size={16} />
            </button>
            <button type="button" className="about-us__btn about-us__btn--outline" onClick={onExploreSpecialties}>
              See all departments
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
