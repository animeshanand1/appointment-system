import { useEffect, useRef } from 'react'
import HeroSection from './HeroSection'
import DepartmentsSection from './DepartmentsSection'
import HowItWorksSection from './HowItWorksSection'
import GallerySection from './GallerySection'
import CtaSection from './CtaSection'
import FooterSection from './FooterSection'
import './LandingPage.css'

// Fades [data-reveal] elements in as they scroll into view. Uses data
// attributes rather than classes so React re-renders never clobber them, and
// does nothing (content stays visible) without IntersectionObserver or when
// the visitor prefers reduced motion.
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

export default function LandingPage({ onOpenAuth, onOpenBooking, onOpenAbout, onViewDepartment }) {
  const rootRef = useRef(null)
  useScrollReveal(rootRef)

  // Always called with a department id or null — never a click event.
  const handleBook = (departmentId) => {
    if (onOpenBooking) onOpenBooking(departmentId || null)
    else if (onOpenAuth) onOpenAuth()
  }

  return (
    <div className="landing-page" ref={rootRef}>
      <HeroSection onBook={handleBook} />
      <DepartmentsSection onBook={handleBook} onViewDepartment={onViewDepartment} />
      <HowItWorksSection onBook={handleBook} />
      <GallerySection />
      <CtaSection onBook={handleBook} onOpenAuth={onOpenAuth} />
      <FooterSection
        onBook={handleBook}
        onOpenAuth={onOpenAuth}
        onViewDepartment={onViewDepartment}
        onOpenAbout={onOpenAbout}
      />
    </div>
  )
}
