import { ArrowLeft, ArrowRight } from 'lucide-react'
import './AboutUs.css'

// Names and years of experience match backend/scripts/seed.js.
const FACTS = [
  { value: '2011', label: 'opened as a four-room outpatient clinic' },
  { value: '13', label: 'consultants, each bookable by name' },
  { value: '6', label: 'departments, one building' },
  { value: '24/7', label: 'emergency unit, walk-ins always seen' },
]

const PROMISES = [
  {
    title: 'You choose who you see.',
    text: 'Every consultant is listed with their department and experience. If you saw Dr. Reyes last time, you can book Dr. Reyes again.',
  },
  {
    title: 'The times on screen are real.',
    text: 'Slots come from each doctor’s own calendar. When a clinic runs over, the front desk calls you before you leave home, not after you’ve parked.',
  },
  {
    title: 'You hear the cost before the test.',
    text: 'If your consultant orders a scan or blood work, the front desk tells you what it costs and what your insurance is likely to cover before anything is booked.',
  },
  {
    title: 'Your results go to you as well.',
    text: 'Lab and imaging reports are shared with you as soon as your doctor has reviewed them. You don’t need to call and ask.',
  },
]

const LEADERS = [
  {
    name: 'Dr. Asha Verma',
    role: 'Medical Director · Internal Medicine',
    years: 15,
    bio: 'Still runs a general clinic every Tuesday and Thursday. Most first-time patients who aren’t sure where to go end up in her department.',
  },
  {
    name: 'Dr. Sarah Jenkins',
    role: 'Head of Cardiology',
    years: 18,
    bio: 'Set up the same-floor ECG and echo service, so a heart check-up no longer means three visits on three different days.',
  },
  {
    name: 'Dr. Robert King',
    role: 'Head of Orthopedics',
    years: 20,
    bio: 'Our longest-serving consultant. Sees sports injuries on Saturday mornings, when most of them happen to walk in.',
  },
  {
    name: 'Dr. Chloe Bennett',
    role: 'Head of Pediatrics',
    years: 12,
    bio: 'Keeps two same-day slots open every afternoon for children with a fever that won’t wait until next week.',
  },
]

const CHECKS = [
  { body: 'The Joint Commission', detail: 'Hospital accreditation, last surveyed in 2024' },
  { body: 'College of American Pathologists', detail: 'Laboratory accreditation, inspected every two years' },
  { body: 'New York State Department of Health', detail: 'Licensed general hospital, Article 28' },
]

const initials = (name) =>
  name
    .replace('Dr. ', '')
    .split(' ')
    .map((part) => part[0])
    .join('')

export default function AboutUs({ onBack, onBookClick, onExploreSpecialties }) {
  return (
    <div className="about-us">
      <div className="about-us__container">
        <button type="button" className="about-us__back" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to home</span>
        </button>

        <header className="about-us__hero">
          <p className="about-us__eyebrow">About CarePulse</p>
          <h1 className="about-us__title about-us__display">
            We started as a clinic that was tired of <em>running late.</em>
          </h1>
          <p className="about-us__lede">
            CarePulse began in 2011 with four consulting rooms, two receptionists and a paper
            appointment book that never quite matched what the doctors were doing. Most of what
            we’ve built since has been about fixing that.
          </p>
        </header>

        <ul className="about-us__facts">
          {FACTS.map((fact) => (
            <li key={fact.label} className="about-us__fact">
              <span className="about-us__fact-value about-us__display">{fact.value}</span>
              <span className="about-us__fact-label">{fact.label}</span>
            </li>
          ))}
        </ul>

        <section className="about-us__section about-us__story">
          <div className="about-us__story-copy">
            <p className="about-us__eyebrow">
              <span>01</span>How it started
            </p>
            <h2 className="about-us__heading about-us__display">
              The waiting room was the problem.
            </h2>
            <p>
              In our first year, the average patient waited fifty minutes past their booked time.
              Not because anyone was careless, but because appointments were taken over the phone,
              written down by hand, and overbooked “just in case” someone didn’t turn up.
            </p>
            <p>
              So we stopped overbooking. Doctors started keeping their own calendars, and patients
              could see exactly which times were free. Waits dropped, and so did the number of
              people who gave up and went home.
            </p>
            <p>
              The clinic has grown into a full hospital, with an emergency unit, a lab and imaging
              upstairs, but the booking rule hasn’t changed: one patient, one slot, one doctor who
              knows you’re coming.
            </p>

            <blockquote className="about-us__quote">
              <p>
                “Patients forgive a lot. What they don’t forgive is being told 10:30 and seen at
                11:45 with no explanation.”
              </p>
              <footer>Dr. Asha Verma, Medical Director</footer>
            </blockquote>
          </div>

          <figure className="about-us__figure">
            <img
              src="/images/hero-team.webp"
              alt="Dr. Sarah Jenkins and Dr. Daniel Chen reviewing a patient chart in a consultation room"
              loading="lazy"
            />
            <figcaption>Dr. Sarah Jenkins and Dr. Daniel Chen, cardiology, Level 2.</figcaption>
          </figure>
        </section>

        <section className="about-us__section">
          <p className="about-us__eyebrow">
            <span>02</span>What you can expect
          </p>
          <h2 className="about-us__heading about-us__display">
            Four things we hold ourselves to.
          </h2>

          <ol className="about-us__promises">
            {PROMISES.map((promise, i) => (
              <li key={promise.title} className="about-us__promise">
                <span className="about-us__promise-num about-us__display">{i + 1}</span>
                <div>
                  <h3>{promise.title}</h3>
                  <p>{promise.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-us__section">
          <p className="about-us__eyebrow">
            <span>03</span>Who runs it
          </p>
          <h2 className="about-us__heading about-us__display">
            Doctors who still see patients.
          </h2>
          <p className="about-us__section-lede">
            Every department head keeps a regular clinic. You can book any of them the same way
            you’d book anyone else.
          </p>

          <ul className="about-us__people">
            {LEADERS.map((leader) => (
              <li key={leader.name} className="about-us__person">
                <span className="about-us__initials" aria-hidden="true">
                  {initials(leader.name)}
                </span>
                <div>
                  <h3>{leader.name}</h3>
                  <p className="about-us__person-role">
                    {leader.role} · {leader.years} years
                  </p>
                  <p>{leader.bio}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="about-us__section about-us__checks">
          <div>
            <p className="about-us__eyebrow">
              <span>04</span>Inspections
            </p>
            <h2 className="about-us__heading about-us__display">Checked by people who aren’t us.</h2>
          </div>
          <dl className="about-us__check-list">
            {CHECKS.map((check) => (
              <div key={check.body} className="about-us__check">
                <dt>{check.body}</dt>
                <dd>{check.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="about-us__closing">
        <div className="about-us__container about-us__closing-inner">
          <h2 className="about-us__display">
            Need to see someone? <em>Pick a time.</em>
          </h2>
          <div className="about-us__actions">
            <button type="button" className="about-us__btn about-us__btn--light" onClick={onBookClick}>
              <span>Book an appointment</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="about-us__btn about-us__btn--outline"
              onClick={onExploreSpecialties}
            >
              See all departments
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
