import { ArrowUpRight, ArrowRight } from 'lucide-react'
import { LANDING_DEPARTMENTS } from './landingData'

export default function DepartmentsSection({ onBook, onViewDepartment }) {
  return (
    <section className="lp-section lp-depts" id="specialties">
      <div className="lp-container lp-depts__inner">
        <header className="lp-depts__intro" data-reveal>
          <p className="lp-eyebrow">
            <span>01</span>Departments
          </p>
          <h2 className="lp-heading lp-display">
            Six departments. <em>One front desk.</em>
          </h2>
          <p className="lp-depts__lede">
            Every clinic books through the same calendar, so you see each consultant’s real
            availability side by side — not a phone number and a promise to call back.
          </p>
          <button type="button" className="lp-link" onClick={() => onBook('internal-medicine')}>
            Not sure which one? Start with Internal Medicine
            <ArrowRight size={15} />
          </button>
        </header>

        <ol className="lp-depts__list">
          {LANDING_DEPARTMENTS.map((dept, i) => (
            <li
              key={dept.id}
              className="lp-dept"
              data-reveal
              style={{ '--reveal-delay': `${i * 60}ms` }}
            >
              <span className="lp-dept__num">{String(i + 1).padStart(2, '0')}</span>

              <div className="lp-dept__body">
                <h3 className="lp-dept__name lp-display">
                  <button
                    type="button"
                    className="lp-dept__hit"
                    onClick={() => onBook(dept.id)}
                    aria-label={`Book an appointment in ${dept.name}`}
                  >
                    {dept.name}
                  </button>
                </h3>
                <p className="lp-dept__blurb">{dept.blurb}</p>
                <p className="lp-dept__people">{dept.consultants.join('  ·  ')}</p>
              </div>

              <div className="lp-dept__side">
                <span className="lp-dept__cta" aria-hidden="true">
                  Book <ArrowUpRight size={14} />
                </span>
                {dept.id === 'cardiology' && onViewDepartment && (
                  <button
                    type="button"
                    className="lp-dept__more"
                    onClick={() => onViewDepartment('cardiology')}
                  >
                    Department page
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
