import { useState, useEffect } from 'react'
import {
  HeartPulse,
  CalendarPlus,
  Stethoscope,
  PhoneCall,
  Menu,
  X,
  Sparkles,
  User,
  LogOut,
  Info,
} from 'lucide-react'
import './Navbar.css'

export default function Navbar({
  currentUser,
  activeTab = 'find-doctors',
  onSelectTab,
  onOpenAuth,
  onOpenBooking,
  onOpenDashboard,
  onLogout,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const isDoctor = currentUser?.role === 'doctor'

  // Track window scroll for glassmorphism elevation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 992) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navItems = [
    { id: 'find-doctors', label: 'Find Doctors', icon: Stethoscope, badge: null },
    { id: 'specialties', label: 'Specialties', icon: Sparkles, badge: '25+' },
    { id: 'appointments', label: 'Appointments', icon: CalendarPlus, badge: 'Instant' },
    { id: 'about-us', label: 'About Us', icon: Info, badge: null },
  ]

  const handleNavClick = (tabId) => {
    if (tabId === 'appointments' && onOpenBooking) {
      onOpenBooking()
    } else if (onSelectTab) {
      onSelectTab(tabId)
    }
    setMobileMenuOpen(false)
  }

  return (
    <header className={`app-navbar ${isScrolled ? 'app-navbar--scrolled' : ''}`}>
      {/* Main Navbar Bar */}
      <div className="app-navbar__container">
        {/* Brand / Logo */}
        <div className="app-navbar__brand" onClick={() => handleNavClick('home')}>
          <div className="app-navbar__logo-wrapper">
            <HeartPulse className="app-navbar__logo-icon" size={22} />
            <span className="app-navbar__logo-pulse"></span>
          </div>
          <div className="app-navbar__brand-copy">
            <span className="app-navbar__brand-name">
              CarePulse<span className="app-navbar__brand-accent">.</span>
            </span>
            <span className="app-navbar__brand-sub">Health Systems</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="app-navbar__nav" aria-label="Main Navigation">
          <ul className="app-navbar__list">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <li key={item.id} className="app-navbar__item">
                  <button
                    type="button"
                    className={`app-navbar__link ${isActive ? 'app-navbar__link--active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <Icon size={15} className="app-navbar__link-icon" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={`app-navbar__link-badge ${
                          item.badge === 'Live' ? 'app-navbar__link-badge--live' : ''
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && <span className="app-navbar__active-indicator" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Right Action Controls */}
        <div className="app-navbar__actions">
          {/* Primary Book Appointment CTA Button (patients and guests; doctors can't book) */}
          {!isDoctor && (
            <button
              type="button"
              className="app-navbar__cta-btn"
              onClick={() => {
                if (onOpenBooking) onOpenBooking()
                else if (onOpenAuth) onOpenAuth()
              }}
            >
              <CalendarPlus size={16} className="app-navbar__cta-icon" />
              <span>Book Appointment</span>
              <span className="app-navbar__cta-glow"></span>
            </button>
          )}

          {/* Guests get a Sign In button */}
          {!currentUser && onOpenAuth && (
            <button type="button" className="app-navbar__signin-btn" onClick={onOpenAuth}>
              <User size={16} />
              <span>Sign In</span>
            </button>
          )}

          {/* User Logged In Profile Chip */}
          {currentUser && (
            <div className="app-navbar__user-profile">
              <button
                type="button"
                className="app-navbar__user-chip"
                onClick={onOpenDashboard}
                disabled={!onOpenDashboard}
                title="Go to my dashboard"
              >
                <span className="app-navbar__user-avatar">
                  <User size={15} />
                </span>
                <span className="app-navbar__user-meta">
                  <span className="app-navbar__user-name">
                    {currentUser.user?.fullName || currentUser.identifier?.split('@')[0] || 'User'}
                  </span>
                  <span className="app-navbar__user-role">
                    {currentUser.role?.toUpperCase()}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="app-navbar__logout-btn"
                onClick={onLogout}
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            className={`app-navbar__hamburger ${mobileMenuOpen ? 'app-navbar__hamburger--active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="app-navbar__mobile-drawer">
          <div className="app-navbar__mobile-backdrop" onClick={() => setMobileMenuOpen(false)}></div>
          
          <div className="app-navbar__mobile-content">
            <div className="app-navbar__mobile-header">
              <div className="app-navbar__brand">
                <HeartPulse className="app-navbar__logo-icon" size={20} />
                <span className="app-navbar__brand-name">CarePulse Health</span>
              </div>
              <button
                type="button"
                className="app-navbar__mobile-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close Menu"
              >
                <X size={20} />
              </button>
            </div>

            <ul className="app-navbar__mobile-list">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <li key={item.id} className="app-navbar__mobile-item">
                    <button
                      type="button"
                      className={`app-navbar__mobile-link ${
                        isActive ? 'app-navbar__mobile-link--active' : ''
                      }`}
                      onClick={() => handleNavClick(item.id)}
                    >
                      <div className="app-navbar__mobile-link-left">
                        <span className="app-navbar__mobile-icon-box">
                          <Icon size={18} />
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="app-navbar__link-badge">{item.badge}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="app-navbar__mobile-footer">
              <a href="tel:18004273785" className="app-navbar__mobile-emergency">
                <PhoneCall size={16} />
                <span>Emergency Dispatch: 1-800-CARE-911</span>
              </a>

              {!isDoctor && (
                <button
                  type="button"
                  className="app-navbar__mobile-cta"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    if (onOpenBooking) onOpenBooking()
                    else if (onOpenAuth) onOpenAuth()
                  }}
                >
                  <CalendarPlus size={18} />
                  <span>Book Appointment</span>
                </button>
              )}

              {!currentUser ? (
                <button
                  type="button"
                  className="app-navbar__mobile-link"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    if (onOpenAuth) onOpenAuth()
                  }}
                >
                  <div className="app-navbar__mobile-link-left">
                    <span className="app-navbar__mobile-icon-box">
                      <User size={18} />
                    </span>
                    <span>Patient Portal Sign In</span>
                  </div>
                </button>
              ) : (
                <>
                  {onOpenDashboard && (
                    <button
                      type="button"
                      className="app-navbar__mobile-link"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        onOpenDashboard()
                      }}
                    >
                      <div className="app-navbar__mobile-link-left">
                        <span className="app-navbar__mobile-icon-box">
                          <User size={18} />
                        </span>
                        <span>My Dashboard</span>
                      </div>
                    </button>
                  )}
                <button
                  type="button"
                  className="app-navbar__mobile-logout"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    if (onLogout) onLogout()
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign Out ({currentUser.identifier})</span>
                </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
