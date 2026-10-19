import { ArrowRight, PhoneCall } from 'lucide-react'
import { EMERGENCY_PHONE } from './landingData'

export default function CtaSection({ onBook, onOpenAuth }) {
  return (
    <section className="lp-cta" id="cta-book">
      <div className="lp-container lp-cta__inner">
        <h2 className="lp-cta__title lp-display" data-reveal>
          Book a visit.
          <br />
          <em>We’ll keep the time.</em>
        </h2>

        <div className="lp-cta__side" data-reveal style={{ '--reveal-delay': '120ms' }}>
          <p className="lp-cta__text">
            Pick a department, choose your consultant and confirm a slot. You’ll only need an
            account at the last step.
          </p>
          <div className="lp-cta__actions">
            <button type="button" className="lp-btn lp-btn--primary" onClick={() => onBook(null)}>
              <span>Book an appointment</span>
              <ArrowRight size={16} />
            </button>
            {onOpenAuth && (
              <button type="button" className="lp-btn lp-btn--ghost" onClick={onOpenAuth}>
                Sign in
              </button>
            )}
          </div>
          <p className="lp-cta__emergency">
            <PhoneCall size={16} aria-hidden="true" />
            <span>
              Chest pain, trouble breathing or a serious injury? Don’t book online — call{' '}
              <a href={EMERGENCY_PHONE.href}>{EMERGENCY_PHONE.display}</a> or come straight to the
              emergency entrance.
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
