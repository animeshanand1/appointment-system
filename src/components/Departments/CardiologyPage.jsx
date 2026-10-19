import {
  ArrowLeft,
  ArrowRight,
  HeartPulse,
  Activity,
  Stethoscope,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  Zap,
  Waves,
  Syringe,
  CalendarPlus,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { listDoctors } from '../../lib/api'
import './CardiologyPage.css'

export default function CardiologyPage({ onBack, onBookClick, onViewDoctor }) {
  // Real directory entries when the API has them; otherwise the static cards below.
  const [liveDoctors, setLiveDoctors] = useState([])

  useEffect(() => {
    let cancelled = false
    listDoctors({ specialization: 'cardiology' }).then(
      (list) => {
        if (!cancelled) setLiveDoctors(list)
      },
      () => {}
    )
    return () => {
      cancelled = true
    }
  }, [])

  // Only facts the app itself knows; no marketing numbers.
  const stats = [
    { label: 'Cardiologists to choose from', value: liveDoctors.length > 0 ? String(liveDoctors.length) : '3' },
    { label: 'Outpatient clinic days', value: 'Mon–Sat' },
    { label: 'Clinic hours', value: '8 am – 8 pm' },
    { label: 'Emergency unit', value: '24/7' },
  ]

  const treatments = [
    {
      icon: Activity,
      name: 'ECG & Stress Testing',
      desc: 'Resting and treadmill stress ECGs to evaluate heart rhythm and exertion response.',
    },
    {
      icon: Waves,
      name: '2D Echocardiography',
      desc: 'High-resolution cardiac ultrasound imaging for valve, chamber, and muscle assessment.',
    },
    {
      icon: HeartPulse,
      name: 'Coronary Angiography',
      desc: 'Minimally invasive imaging to detect blockages in the coronary arteries.',
    },
    {
      icon: Zap,
      name: 'Angioplasty & Stenting',
      desc: 'Interventional procedures to restore blood flow through narrowed arteries.',
    },
    {
      icon: Syringe,
      name: 'Pacemaker Implantation',
      desc: 'Device implantation and lifetime monitoring for arrhythmia management.',
    },
    {
      icon: HeartPulse,
      name: 'Cardiac Rehabilitation',
      desc: 'Supervised recovery programs combining exercise, diet, and lifestyle coaching.',
    },
  ]

  const doctors = [
    {
      name: 'Dr. Sarah Jenkins, MD',
      title: 'Head of Clinical Cardiology',
      experience: '18 yrs experience',
    },
    {
      name: 'Dr. Daniel Chen, MD',
      title: 'Interventional Cardiologist',
      experience: '14 yrs experience',
    },
    {
      name: 'Dr. Michael Ortiz, MD',
      title: 'Cardiac Electrophysiologist',
      experience: '11 yrs experience',
    },
  ]

  const trustPoints = [
    'ECG and echo on the same floor as the clinic',
    'Emergency unit open 24/7, no appointment needed',
    'Book the cardiologist you want, by name',
    'Move or cancel online any time before your visit',
  ]

  return (
    <div className="cardiology-page">
      {/* Back Navigation Bar */}
      <div className="cardiology-page__back-bar">
        <div className="cardiology-page__back-bar-container">
          <button type="button" className="cardiology-page__back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Return to Hospital Homepage</span>
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <header className="cardiology-page__hero">
        <div className="cardiology-page__hero-container">
          <div className="cardiology-page__hero-icon-box">
            <HeartPulse size={28} />
          </div>
          <div className="cardiology-page__hero-tag">
            <Activity size={14} /> Clinical Center of Excellence
          </div>
          <h1 className="cardiology-page__hero-title">Cardiology & Heart Center</h1>
          <p className="cardiology-page__hero-desc">
            Comprehensive cardiac evaluations, advanced diagnostics, and interventional management
            delivered by board-certified specialists using state-of-the-art cath lab technology.
          </p>
          <button type="button" className="cardiology-page__hero-cta" onClick={onBookClick}>
            <CalendarPlus size={16} />
            <span>Book a Cardiology Appointment</span>
          </button>
        </div>

        {/* Stats Strip */}
        <div className="cardiology-page__stats-bar">
          <div className="cardiology-page__stats-container">
            {stats.map((stat) => (
              <div key={stat.label} className="cardiology-page__stat-item">
                <div className="cardiology-page__stat-value">{stat.value}</div>
                <div className="cardiology-page__stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Treatments & Procedures */}
      <section className="cardiology-page__treatments">
        <div className="cardiology-page__section-container">
          <div className="cardiology-page__section-header">
            <h2 className="cardiology-page__section-title">Treatments & Procedures</h2>
            <p className="cardiology-page__section-subtitle">
              Full-spectrum cardiac care, from routine screening to advanced interventional cardiology.
            </p>
          </div>

          <div className="cardiology-page__treatments-grid">
            {treatments.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.name} className="cardiology-page__treatment-card">
                  <div className="cardiology-page__treatment-icon-box">
                    <Icon size={20} />
                  </div>
                  <h3 className="cardiology-page__treatment-name">{item.name}</h3>
                  <p className="cardiology-page__treatment-desc">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured Specialists */}
      <section className="cardiology-page__doctors">
        <div className="cardiology-page__section-container">
          <div className="cardiology-page__section-header">
            <h2 className="cardiology-page__section-title">Meet Our Cardiac Specialists</h2>
            <p className="cardiology-page__section-subtitle">
              Consult with our senior, board-certified cardiology consultants.
            </p>
          </div>

          <div className="cardiology-page__doctors-grid">
            {liveDoctors.length > 0
              ? liveDoctors.map((doc) => (
                  <div key={doc.id} className="cardiology-page__doctor-card">
                    <div className="cardiology-page__doctor-avatar">
                      <Stethoscope size={22} />
                    </div>
                    <h3 className="cardiology-page__doctor-name">{doc.fullName}</h3>
                    <p className="cardiology-page__doctor-title">{doc.clinicName ?? 'Cardiology'}</p>
                    <div className="cardiology-page__doctor-meta">
                      {doc.experienceYears != null && (
                        <span className="cardiology-page__doctor-experience">
                          <UserCheck size={13} /> {doc.experienceYears} yrs experience
                        </span>
                      )}
                    </div>
                    <div className="cardiology-page__doctor-actions">
                      <button
                        type="button"
                        className="cardiology-page__doctor-book-btn"
                        onClick={() => onViewDoctor?.(doc.id)}
                      >
                        <span>View Profile</span>
                      </button>
                      <button
                        type="button"
                        className="cardiology-page__doctor-book-btn cardiology-page__doctor-book-btn--solid"
                        onClick={onBookClick}
                      >
                        <span>Book Appointment</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))
              : doctors.map((doc) => (
                  <div key={doc.name} className="cardiology-page__doctor-card">
                    <div className="cardiology-page__doctor-avatar">
                      <Stethoscope size={22} />
                    </div>
                    <h3 className="cardiology-page__doctor-name">{doc.name}</h3>
                    <p className="cardiology-page__doctor-title">{doc.title}</p>
                    <div className="cardiology-page__doctor-meta">
                      <span className="cardiology-page__doctor-experience">
                        <UserCheck size={13} /> {doc.experience}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="cardiology-page__doctor-book-btn"
                      onClick={onBookClick}
                    >
                      <span>Book Appointment</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="cardiology-page__trust">
        <div className="cardiology-page__section-container">
          <div className="cardiology-page__trust-grid">
            {trustPoints.map((point) => (
              <div key={point} className="cardiology-page__trust-item">
                <CheckCircle2 size={18} className="cardiology-page__trust-icon" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="cardiology-page__cta">
        <div className="cardiology-page__cta-container">
          <ShieldCheck size={22} className="cardiology-page__cta-icon" />
          <div className="cardiology-page__cta-copy">
            <h2 className="cardiology-page__cta-title">Ready to take care of your heart?</h2>
            <p className="cardiology-page__cta-desc">
              Same-day slots available with our cardiology consultants.
            </p>
          </div>
          <button type="button" className="cardiology-page__cta-btn" onClick={onBookClick}>
            <CalendarPlus size={16} />
            <span>Book Appointment</span>
          </button>
        </div>
      </section>
    </div>
  )
}
