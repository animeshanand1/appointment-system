const FEATURED = {
  quote:
    'I booked at nine in the morning and was sitting with Dr. Chen by half past eleven. No phone queue, no crowded waiting room — just a time, a room number, and a doctor who was expecting me.',
  author: 'Marcus Sterling',
  detail: 'Cardiology patient',
  initials: 'MS',
}

const MORE = [
  {
    quote:
      'My son had a fever that wouldn’t break. I could see which pediatricians still had time that afternoon and pick one in under a minute.',
    author: 'Elena Gomez-Perez',
    detail: 'Parent, Pediatrics',
  },
  {
    quote:
      'The consult started at four — not “around four”. Dr. King had already read my note about the injury, so we got straight to it.',
    author: 'Jonathan Hayes',
    detail: 'Orthopedics patient',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="lp-section lp-voices" id="testimonials">
      <div className="lp-container">
        <p className="lp-eyebrow" data-reveal>
          <span>04</span>Patients
        </p>

        <figure className="lp-voices__feature" data-reveal style={{ '--reveal-delay': '80ms' }}>
          <blockquote className="lp-voices__quote lp-display">“{FEATURED.quote}”</blockquote>
          <figcaption className="lp-voices__cite">
            <span className="lp-voices__avatar" aria-hidden="true">
              {FEATURED.initials}
            </span>
            <span>
              <strong>{FEATURED.author}</strong>
              {FEATURED.detail}
            </span>
          </figcaption>
        </figure>

        <div className="lp-voices__row">
          {MORE.map((item, i) => (
            <figure
              key={item.author}
              className="lp-voices__small"
              data-reveal
              style={{ '--reveal-delay': `${i * 100}ms` }}
            >
              <blockquote>“{item.quote}”</blockquote>
              <figcaption>
                <strong>{item.author}</strong> — {item.detail}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
