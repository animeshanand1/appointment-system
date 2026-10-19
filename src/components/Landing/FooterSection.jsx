import { HeartPulse } from 'lucide-react'
import { ADDRESS, EMAIL, EMERGENCY_PHONE, LANDING_DEPARTMENTS } from './landingData'

export default function FooterSection({ onBook, onOpenAuth, onViewDepartment, onOpenAbout }) {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer__top">
          <div className="lp-footer__col">
            <div className="lp-footer__brand">
              <HeartPulse size={22} aria-hidden="true" />
              <span>Dr Sahayak</span>
            </div>
            <p className="lp-footer__bio">
              A multi-specialty hospital and outpatient clinic in the Metro Medical District,
              run on one simple idea: your time matters as much as ours.
            </p>
          </div>

          <nav className="lp-footer__col" aria-label="Departments">
            <h4 className="lp-footer__heading">Departments</h4>
            <ul className="lp-footer__list">
              {LANDING_DEPARTMENTS.map((dept) => (
                <li key={dept.id}>
                  <button
                    type="button"
                    className="lp-footer__link"
                    onClick={() =>
                      dept.id === 'cardiology' && onViewDepartment
                        ? onViewDepartment('cardiology')
                        : onBook(dept.id)
                    }
                  >
                    {dept.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="lp-footer__col" aria-label="Patients">
            <h4 className="lp-footer__heading">Patients</h4>
            <ul className="lp-footer__list">
              <li>
                <button type="button" className="lp-footer__link" onClick={() => onBook(null)}>
                  Book an appointment
                </button>
              </li>
              {onOpenAuth && (
                <li>
                  <button type="button" className="lp-footer__link" onClick={onOpenAuth}>
                    Patient &amp; doctor sign in
                  </button>
                </li>
              )}
              <li>
                <a href="#how-it-works" className="lp-footer__link">How booking works</a>
              </li>
              <li>
                <a href="#gallery" className="lp-footer__link">Visiting the hospital</a>
              </li>
              {onOpenAbout && (
                <li>
                  <button type="button" className="lp-footer__link" onClick={onOpenAbout}>
                    About Dr Sahayak
                  </button>
                </li>
              )}
            </ul>
          </nav>

          <div className="lp-footer__col">
            <h4 className="lp-footer__heading">Contact</h4>
            <address className="lp-footer__contact">
              <span>{ADDRESS}</span>
              <span>Clinics Mon–Sat, 8 am – 8 pm</span>
              <a href={`mailto:${EMAIL}`} className="lp-footer__link">{EMAIL}</a>
              <a href={EMERGENCY_PHONE.href} className="lp-footer__emergency">
                Emergency 24/7 · {EMERGENCY_PHONE.display}
              </a>
            </address>
          </div>
        </div>

        <div className="lp-footer__word lp-display" aria-hidden="true">
          Dr Sahayak
        </div>

        <div className="lp-footer__legal">
          <p>© {new Date().getFullYear()} Dr Sahayak</p>
          <nav aria-label="Legal">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <a href="#hipaa">HIPAA notice</a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
