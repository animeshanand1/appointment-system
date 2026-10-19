import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { upcomingOpdDays } from './landingData'

const STEPS = [
  {
    title: 'Choose the department — and the doctor',
    text: 'Every consultant is listed by name with their experience. You pick who you see, not whoever happens to be free.',
  },
  {
    title: 'Take a time that’s actually open',
    text: 'Times come straight from each doctor’s own calendar, in 30-minute slots. If it’s on screen, it’s free — two people can’t book the same one.',
  },
  {
    title: 'Walk in and be seen',
    text: 'Your confirmation has the room and the time. Add a note about what’s wrong and your doctor reads it before you arrive.',
  },
]

const TIMES = ['9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '2:00', '2:30']

// Deterministic "already booked" pattern so the preview looks lived-in.
const isTaken = (dayIdx, timeIdx) => (dayIdx * 3 + timeIdx) % 5 === 0 || (dayIdx + timeIdx) % 7 === 2

export default function HowItWorksSection({ onBook }) {
  const days = useMemo(() => upcomingOpdDays(5), [])
  const [dayIdx, setDayIdx] = useState(1)
  const [timeIdx, setTimeIdx] = useState(3)

  const selectDay = (idx) => {
    setDayIdx(idx)
    if (timeIdx !== null && isTaken(idx, timeIdx)) setTimeIdx(null)
  }

  return (
    <section className="lp-section lp-how" id="how-it-works">
      <div className="lp-container lp-how__inner">
        <div className="lp-how__copy">
          <div data-reveal>
            <p className="lp-eyebrow">
              <span>02</span>Booking
            </p>
            <h2 className="lp-heading lp-display">
              Three steps. <em>About a minute.</em>
            </h2>
          </div>

          <ol className="lp-how__steps">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="lp-step"
                data-reveal
                style={{ '--reveal-delay': `${i * 90}ms` }}
              >
                <span className="lp-step__num lp-display">{i + 1}</span>
                <div>
                  <h3 className="lp-step__title">{step.title}</h3>
                  <p className="lp-step__text">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="lp-how__demo" data-reveal style={{ '--reveal-delay': '150ms' }}>
          <div className="lp-picker">
            <div className="lp-picker__head">
              <div className="lp-picker__avatar" aria-hidden="true">
                SJ
              </div>
              <div>
                <div className="lp-picker__name">Dr. Sarah Jenkins</div>
                <div className="lp-picker__role">Cardiology · 18 years’ experience</div>
              </div>
            </div>

            <p className="lp-picker__label" id="picker-days">
              Day
            </p>
            <div className="lp-picker__days" role="group" aria-labelledby="picker-days">
              {days.map((day, i) => (
                <button
                  key={day.toISOString()}
                  type="button"
                  className="lp-picker__day"
                  aria-pressed={i === dayIdx}
                  onClick={() => selectDay(i)}
                >
                  <span>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <strong>{day.getDate()}</strong>
                </button>
              ))}
            </div>

            <p className="lp-picker__label" id="picker-times">
              Time
            </p>
            <div className="lp-picker__times" role="group" aria-labelledby="picker-times">
              {TIMES.map((time, i) => {
                const taken = isTaken(dayIdx, i)
                return (
                  <button
                    key={time}
                    type="button"
                    className="lp-picker__time"
                    disabled={taken}
                    aria-pressed={i === timeIdx}
                    aria-label={taken ? `${time} ${i < 6 ? 'am' : 'pm'}, already booked` : undefined}
                    onClick={() => setTimeIdx(i)}
                  >
                    {time}
                    <small>{i < 6 ? 'am' : 'pm'}</small>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="lp-btn lp-btn--primary lp-picker__confirm"
              onClick={() => onBook('cardiology')}
            >
              <span>Book with Cardiology</span>
              <ArrowRight size={16} />
            </button>
          </div>
          <p className="lp-how__caption">
            A preview. Live availability loads when you start a booking.
          </p>
        </div>
      </div>
    </section>
  )
}
