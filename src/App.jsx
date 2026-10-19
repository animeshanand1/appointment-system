import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import LandingPage from './components/Landing/LandingPage'
import Login from './components/Login/Login'
import CardiologyPage from './components/Departments/CardiologyPage'
import BookAppointment from './components/BookAppointment/BookAppointment'
import { isDepartmentId } from './components/BookAppointment/bookingHelpers'
import AboutUs from './components/AboutUs/AboutUs'
import DoctorDashboard from './components/DoctorDashboard/DoctorDashboard'
import MyAppointments from './components/Appointments/MyAppointments'
import DoctorProfile from './components/DoctorProfile/DoctorProfile'
import PatientDashboard from './components/PatientDashboard/PatientDashboard'
import AccountPage from './components/Account/AccountPage'
import { ForgotPasswordPage, ResetPasswordPage } from './components/Account/PasswordRecovery'
import AdminDashboard from './components/Admin/AdminDashboard'
import LegalPage from './components/Legal/LegalPage'
import { logout, me } from './lib/api'
import { safeInternalPath } from './lib/sanitize'
import { browserTimeZone } from './components/DoctorDashboard/doctorHelpers'
import { ArrowLeft } from 'lucide-react'
import './App.css'

// Reads :doctorId from the URL.
function DoctorProfileRoute({ onBack, onBook }) {
  const { doctorId } = useParams()
  return <DoctorProfile doctorId={doctorId} onBack={onBack} onBook={onBook} />
}

function BookAppointmentRoute(props) {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const department = searchParams.get('department')
  // Keyed on the navigation so opening the form again starts it fresh.
  return (
    <BookAppointment
      key={location.key}
      initialDepartment={isDepartmentId(department) ? department : ''}
      {...props}
    />
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentUser, setCurrentUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState('find-doctors')
  const [bookingDraft, setBookingDraft] = useState(null)
  const [returnToBooking, setReturnToBooking] = useState(false)

  // The session lives in a cookie, so a page load or refresh on any URL
  // restores the signed-in user before we decide what that URL shows.
  useEffect(() => {
    let cancelled = false
    me()
      .then((user) => {
        if (!cancelled) setCurrentUser({ role: user.role, identifier: user.email, user })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAuthChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData)
    navigate(userData.role === 'admin' ? '/admin' : returnToBooking ? '/book' : '/dashboard')
    setReturnToBooking(false)
  }

  // Profile edits and password changes return the fresh user record.
  const handleUserUpdated = (user) => {
    setCurrentUser({ role: user.role, identifier: user.email, user })
  }

  const go = (path) => () => {
    navigate(path)
    scrollTop()
  }

  // Re-reads the account after the doctor changes something the session
  // carries (first schedule saved, bookings paused or resumed).
  const handleSessionRefresh = async () => {
    const user = await me()
    setCurrentUser({ role: user.role, identifier: user.email, user })
  }

  const handleLogout = async () => {
    // Clear the cookie too, otherwise the session would come straight back on refresh.
    await logout().catch(() => {})
    setCurrentUser(null)
    setBookingDraft(null)
    navigate('/')
  }

  const handleOpenAuth = () => {
    navigate('/login')
    scrollTop()
  }

  // Guests (or expired sessions) confirming a booking sign in, then come back
  // to the form with their selection restored.
  const handleBookingRequiresAuth = (draft) => {
    setCurrentUser(null)
    setBookingDraft(draft)
    setReturnToBooking(true)
    handleOpenAuth()
  }

  const handleOpenBooking = (departmentId = null) => {
    setBookingDraft(null)
    setActiveTab('appointments')
    navigate(departmentId ? `/book?department=${encodeURIComponent(departmentId)}` : '/book')
    scrollTop()
  }

  // The booking form hands over its current selections so the patient lands
  // back on it exactly as they left it.
  const handleViewDoctor = (doctorId, draft = null, from = '/book') => {
    setBookingDraft(draft)
    navigate(`/doctors/${encodeURIComponent(doctorId)}`, { state: { from } })
    scrollTop()
  }

  const handleBookDoctor = (doctor) => {
    setBookingDraft({ department: doctor.specialization, doctorId: doctor.id })
    navigate('/book')
    scrollTop()
  }

  const handleViewDepartment = (departmentId) => {
    navigate(`/departments/${encodeURIComponent(departmentId)}`)
    scrollTop()
  }

  const goHome = () => {
    setActiveTab('find-doctors')
    navigate('/')
  }

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId)

    if (tabId === 'appointments') {
      handleOpenBooking()
      return
    }

    if (tabId === 'about-us') {
      navigate('/about')
      scrollTop()
      return
    }

    if (location.pathname !== '/') {
      navigate('/')
    }

    // Scroll to relevant section if on landing
    setTimeout(() => {
      if (tabId === 'specialties') {
        const el = document.getElementById('specialties')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      } else if (tabId === 'find-doctors') {
        const el = document.getElementById('home')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      } else if (tabId === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 50)
  }

  const path = location.pathname
  const navActiveTab =
    path.startsWith('/book') || path.startsWith('/doctors')
      ? 'appointments'
      : path.startsWith('/about')
      ? 'about-us'
      : activeTab

  // Hold the first render until we know whether a session exists, so a
  // signed-in user reloading /dashboard isn't bounced to /login.
  if (!authChecked) return <div className="app-root" />

  return (
    <div className="app-root">
      {/* 1. Global Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        activeTab={navActiveTab}
        onSelectTab={handleSelectTab}
        onOpenAuth={handleOpenAuth}
        onOpenBooking={() => handleOpenBooking()}
        onOpenDashboard={go(currentUser?.role === 'admin' ? '/admin' : '/dashboard')}
        onOpenAccount={currentUser ? go('/account') : undefined}
        onLogout={handleLogout}
      />

      {/* 2. Main Body, one route per screen */}
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              onOpenAuth={handleOpenAuth}
              onOpenBooking={(departmentId) => handleOpenBooking(departmentId)}
              onOpenAbout={() => handleSelectTab('about-us')}
              onViewDepartment={handleViewDepartment}
            />
          }
        />

        <Route
          path="/book"
          element={
            <BookAppointmentRoute
              currentUser={currentUser}
              initialDraft={bookingDraft}
              onRequireAuth={handleBookingRequiresAuth}
              onViewDoctor={handleViewDoctor}
              onBack={() => {
                setBookingDraft(null)
                setActiveTab('find-doctors')
                navigate(currentUser ? '/dashboard' : '/')
              }}
            />
          }
        />

        <Route
          path="/doctors/:doctorId"
          element={
            <DoctorProfileRoute
              onBack={() => {
                navigate(safeInternalPath(location.state?.from, '/book'))
                scrollTop()
              }}
              onBook={handleBookDoctor}
            />
          }
        />

        <Route
          path="/about"
          element={
            <AboutUs
              onBack={goHome}
              onBookClick={() => handleOpenBooking()}
              onExploreSpecialties={() => handleSelectTab('specialties')}
            />
          }
        />

        <Route
          path="/departments/cardiology"
          element={
            <CardiologyPage
              onBack={goHome}
              onBookClick={() => handleOpenBooking('cardiology')}
              onViewDoctor={(doctorId) => handleViewDoctor(doctorId, null, '/departments/cardiology')}
            />
          }
        />

        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <div className="app-auth-view">
                {/* Quick Sub-bar to return to Landing Page */}
                <div className="app-auth-nav-bar">
                  <div className="app-auth-nav-container">
                    <button
                      type="button"
                      className="app-auth-back-btn"
                      onClick={() => {
                        setReturnToBooking(false)
                        setBookingDraft(null)
                        goHome()
                      }}
                    >
                      <ArrowLeft size={16} />
                      <span>Return to Hospital Homepage</span>
                    </button>
                  </div>
                </div>

                <Login
                  onLoginSuccess={handleLoginSuccess}
                  onForgotPassword={go('/forgot-password')}
                  hideUtilityBar={true}
                />
              </div>
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            !currentUser ? (
              <Navigate to="/login" replace />
            ) : currentUser.role === 'doctor' ? (
              <DoctorDashboard
                currentUser={currentUser}
                onSessionRefresh={handleSessionRefresh}
                onViewAppointments={() => navigate('/dashboard/appointments')}
              />
            ) : currentUser.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <PatientDashboard
                currentUser={currentUser}
                onBook={() => handleOpenBooking()}
                onBookDoctor={handleBookDoctor}
                onViewAll={go('/dashboard/appointments')}
                onViewDoctor={(doctorId) => handleViewDoctor(doctorId, null, '/dashboard')}
                onAccount={go('/account')}
              />
            )
          }
        />

        <Route
          path="/dashboard/appointments"
          element={
            currentUser ? (
              <MyAppointments
                role={currentUser.role}
                selfId={currentUser.user?.id}
                timezone={currentUser.role === 'doctor' ? currentUser.user?.timezone ?? browserTimeZone() : undefined}
                onBack={() => navigate('/dashboard')}
                onBook={() => handleOpenBooking()}
                onViewDoctor={(doctorId) => handleViewDoctor(doctorId, null, '/dashboard/appointments')}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/account"
          element={
            currentUser ? (
              <AccountPage
                currentUser={currentUser}
                onUserUpdated={handleUserUpdated}
                onBack={go(currentUser.role === 'admin' ? '/admin' : '/dashboard')}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/admin"
          element={
            !currentUser ? (
              <Navigate to="/login" replace />
            ) : currentUser.role === 'admin' ? (
              <AdminDashboard currentUser={currentUser} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        <Route
          path="/forgot-password"
          element={currentUser ? <Navigate to="/account" replace /> : <ForgotPasswordPage onBack={go('/login')} />}
        />
        <Route
          path="/reset-password"
          element={
            <ResetPasswordPage onBack={go('/login')} onForgot={go('/forgot-password')} onReset={() => setCurrentUser(null)} />
          }
        />

        <Route path="/privacy" element={<LegalPage kind="privacy" onBack={goHome} />} />
        <Route path="/terms" element={<LegalPage kind="terms" onBack={goHome} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
