import { ArrowLeft } from 'lucide-react'
import { ADDRESS, EMAIL, EMERGENCY_PHONE } from '../Landing/landingData'
import './AboutUs.css'

// Names and years of experience match backend/scripts/seed.js.
const HEADS = [
  { name: 'Dr. Asha Verma', role: 'Internal Medicine, Medical Director', years: 15 },
  { name: 'Dr. Sarah Jenkins', role: 'Cardiology', years: 18 },
  { name: 'Dr. Robert King', role: 'Orthopedics', years: 20 },
  { name: 'Dr. Chloe Bennett', role: 'Pediatrics', years: 12 },
]

export default function AboutUs({ onBack, onBookClick, onExploreSpecialties }) {
  return (
    <div className="about-us">
      <div className="about-us__container">
        <button type="button" className="about-us__back" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to home</span>
        </button>

        <article className="about-us__article">
          <h1 className="about-us__title">About Dr Sahayak</h1>

          <p className="about-us__lede">
            <i>Sahayak</i> (सहायक) is the Hindi word for a helper, the person who stands next to
            you while you get something done. We picked it because most of what a patient needs
            from a hospital is exactly that: someone to point at the right door.
          </p>

          <p>
            Dr Sahayak is a hospital with six departments, thirteen consultants and an emergency
            unit that never shuts. This website is how you book a visit with any of them.
          </p>

          <h2>Why we let you pick the doctor</h2>
          <p>
            Most hospital booking systems ask you for a department and give you whoever has a gap.
            That works for a one-off rash. It doesn’t work if you’re managing blood pressure or a
            bad knee over several months and would rather keep seeing the same person.
          </p>
          <p>
            So every consultant here has their own page with their department and years of
            practice, and the times you see are taken from that doctor’s own calendar. If a slot
            is on the screen, it is free. If it isn’t, nobody has quietly double-booked it.
          </p>

          <figure className="about-us__figure">
            <img
              src="/images/hero-team.webp"
              alt="Two cardiologists going over a patient chart together"
              loading="lazy"
            />
            <figcaption>Dr. Sarah Jenkins and Dr. Daniel Chen, cardiology.</figcaption>
          </figure>

          <h2>What happens after you book</h2>
          <p>
            You can see, move or cancel your appointments from your account. If your doctor is
            running late or has to change the day, the front desk phones you; we’d rather you
            heard it from a person than found out in the waiting room.
          </p>
          <p>
            If a scan or blood test is ordered, ask the desk what it costs before you agree to it.
            They’ll tell you what we know and what we don’t. Reports go to you once the doctor has
            looked at them.
          </p>

          <h2>Some of the people</h2>
          <p>
            Each department head still sees patients in clinic, and you can book them like anyone
            else.
          </p>
          <ul className="about-us__people">
            {HEADS.map((head) => (
              <li key={head.name}>
                <strong>{head.name}</strong>
                <span>
                  {head.role}, {head.years} years
                </span>
              </li>
            ))}
          </ul>

          <h2>Hours and where to find us</h2>
          <p>
            Outpatient clinics run Monday to Saturday, 8 am to 8 pm. Emergency is open at all
            hours and doesn’t need an appointment: call{' '}
            <a href={EMERGENCY_PHONE.href}>{EMERGENCY_PHONE.display}</a> or come straight in.
          </p>
          <p>
            {ADDRESS}
            <br />
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </p>

          <p className="about-us__next">
            Ready to see someone?{' '}
            <button type="button" className="about-us__link" onClick={onBookClick}>
              Book an appointment
            </button>{' '}
            or{' '}
            <button type="button" className="about-us__link" onClick={onExploreSpecialties}>
              look through the departments
            </button>
            .
          </p>
        </article>
      </div>
    </div>
  )
}
