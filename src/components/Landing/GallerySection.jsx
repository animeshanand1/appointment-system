import { ADDRESS, EMERGENCY_PHONE } from './landingData'

export default function GallerySection() {
  return (
    <section className="lp-section lp-place" id="gallery">
      <div className="lp-container">
        <header className="lp-place__head" data-reveal>
          <div>
            <p className="lp-eyebrow">
              <span>03</span>The building
            </p>
            <h2 className="lp-heading lp-display">
              Built so the wait, when there is one, <em>feels shorter.</em>
            </h2>
          </div>
          <p className="lp-place__lede">
            Daylight, quiet corners and a check-in you can do yourself. The scanners and labs are
            upstairs, so results reach your consultant before you’ve left the building.
          </p>
        </header>

        <div className="lp-place__grid">
          <figure className="lp-place__fig lp-place__fig--main" data-reveal>
            <div className="lp-place__frame">
              <img
                src="/images/clinic-lounge.webp"
                alt="Main atrium with reception desk, self check-in kiosks and a seating lounge"
                loading="lazy"
              />
            </div>
            <figcaption>
              <span>Fig. 1</span>
              Main atrium, ground floor. Check in at the kiosks by the east doors, then take a
              seat in the lounge.
            </figcaption>
          </figure>

          <figure
            className="lp-place__fig lp-place__fig--side"
            data-reveal
            style={{ '--reveal-delay': '100ms' }}
          >
            <div className="lp-place__frame">
              <img
                src="/images/diagnostic-lab.webp"
                alt="MRI suite with a radiographer reviewing scans at a console"
                loading="lazy"
              />
            </div>
            <figcaption>
              <span>Fig. 2</span>
              Imaging suite, level 2 — 3T MRI, CT and ultrasound.
            </figcaption>
          </figure>

          <aside className="lp-place__note" data-reveal style={{ '--reveal-delay': '180ms' }}>
            <h3>Visiting us</h3>
            <dl>
              <dt>Address</dt>
              <dd>{ADDRESS}</dd>
              <dt>Clinics</dt>
              <dd>Monday to Saturday, 8 am – 8 pm</dd>
              <dt>Emergency</dt>
              <dd>
                Always open ·{' '}
                <a href={EMERGENCY_PHONE.href} className="lp-place__phone">
                  {EMERGENCY_PHONE.display}
                </a>
              </dd>
              <dt>Arrive</dt>
              <dd>Ten minutes before your slot, with your confirmation handy.</dd>
            </dl>
          </aside>
        </div>
      </div>
    </section>
  )
}
