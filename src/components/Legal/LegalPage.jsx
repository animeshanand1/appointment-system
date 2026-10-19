import { ArrowLeft } from 'lucide-react'
import { EMAIL } from '../Landing/landingData'
import '../AboutUs/AboutUs.css'
import './Legal.css'

// These pages describe what the software actually does with data. Before
// launch, have the hospital's legal or compliance team review and extend them
// for the jurisdictions you operate in.
const UPDATED = '19 October 2026'

const PRIVACY = {
  title: 'Privacy policy',
  intro:
    'This page explains what Dr Sahayak stores when you use this website to book appointments, why, and what you can ask us to do with it.',
  sections: [
    {
      heading: 'What we collect',
      items: [
        'Account details: your name, email address, password (stored only as a one-way hash), phone number and time zone.',
        'Optional profile details you choose to add, such as date of birth and gender.',
        'Appointments: the doctor, date and time, status, and the reason for the visit you type when booking.',
        'For doctors: clinic details, qualifications, working hours and time off.',
        'Basic security logs (time, request type and outcome) used to detect abuse. Passwords and session tokens are never written to logs.',
      ],
    },
    {
      heading: 'How we use it',
      items: [
        'To book, move and cancel appointments, and show your doctor who is coming and why.',
        'To send emails about your account and appointments: confirmations, changes, reminders the day before, and password-reset links.',
        'To keep the service secure, for example by limiting repeated sign-in attempts.',
      ],
    },
    {
      heading: 'Cookies',
      items: [
        'We use one cookie, which keeps you signed in. It can’t be read by scripts on the page, it expires after 12 hours, and it’s removed when you sign out.',
        'We don’t use advertising or tracking cookies. The site loads its fonts from Google Fonts.',
      ],
    },
    {
      heading: 'Who can see your information',
      items: [
        'The doctor you book with sees your name, phone number, appointment and the reason you gave.',
        'Authorised hospital administrators can see account and appointment details to run the service.',
        'We don’t sell your data or share it with advertisers.',
      ],
    },
    {
      heading: 'Your choices',
      items: [
        'You can update your profile and password from Account settings at any time.',
        `To get a copy of your data, correct something you can’t edit yourself, or close your account, email ${EMAIL}.`,
      ],
    },
  ],
}

const TERMS = {
  title: 'Terms of use',
  intro: 'By creating an account or booking through this website you agree to the following.',
  sections: [
    {
      heading: 'Not for emergencies',
      items: [
        'Online booking is for outpatient appointments only. In an emergency, call the emergency number or come straight to the hospital.',
      ],
    },
    {
      heading: 'Your account',
      items: [
        'Give accurate details and keep your password to yourself. You’re responsible for what happens under your account.',
        'Patients can hold up to five upcoming appointments, and up to two with the same doctor.',
        'Doctor accounts need an invite code from the hospital. Don’t share it.',
      ],
    },
    {
      heading: 'Bookings, changes and cancellations',
      items: [
        'A booking is confirmed when you see it in your account and receive the confirmation email.',
        'You can cancel any time before the appointment starts, and ask to move it; the doctor approves or declines the request.',
        'Doctors may occasionally need to move or cancel an appointment. If so, we’ll email you, and you can rebook online.',
      ],
    },
    {
      heading: 'Fair use',
      items: [
        'Don’t book slots you don’t intend to use, try to access other people’s information, or overload the service. We may limit or close accounts that do.',
      ],
    },
    {
      heading: 'Contact',
      items: [`Questions about these terms or your account: ${EMAIL}.`],
    },
  ],
}

export default function LegalPage({ kind, onBack }) {
  const page = kind === 'terms' ? TERMS : PRIVACY
  return (
    <div className="about-us legal">
      <div className="about-us__container">
        <button type="button" className="about-us__back" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to home</span>
        </button>
        <article className="legal__article">
          <h1 className="legal__title">{page.title}</h1>
          <p className="legal__updated">Last updated {UPDATED}</p>
          <p className="legal__intro">{page.intro}</p>
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </article>
      </div>
    </div>
  )
}
