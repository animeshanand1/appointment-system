import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RescheduleControls from './RescheduleControls'
import { describeActionError } from './appointmentActions'
import { ApiError } from '../../lib/api'

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    withdrawRescheduleRequest: vi.fn(async (id) => ({ id, status: 'booked', allowedActions: [] })),
    getDoctorSlots: vi.fn(async () => ({ slots: [] })),
  }
})

const base = {
  id: 'a1',
  status: 'booked',
  startAt: '2030-01-07T04:00:00.000Z',
  timezone: 'Asia/Kolkata',
  localDate: '2030-01-07',
  localStartTime: '09:30',
  rescheduleRequest: null,
}

describe('RescheduleControls', () => {
  it('offers only what the server allows', () => {
    render(
      <RescheduleControls
        appointment={{ ...base, allowedActions: ['cancel', 'request_reschedule'] }}
        role="patient"
        doctorId="d1"
        includeCancel
        onChanged={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /Reschedule/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Withdraw/ })).not.toBeInTheDocument()
  })

  it('shows a pending request and lets the patient withdraw it', async () => {
    const onChanged = vi.fn()
    render(
      <RescheduleControls
        appointment={{
          ...base,
          allowedActions: ['withdraw_reschedule', 'request_reschedule'],
          rescheduleRequest: { id: 'r1', status: 'pending', localDate: '2030-01-08', localStartTime: '11:00' },
        }}
        role="patient"
        doctorId="d1"
        onChanged={onChanged}
      />
    )
    expect(screen.getByText(/waiting for the doctor/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Withdraw request/ }))
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }), 'Request withdrawn.')
  })

  it('gives doctors a review button for pending requests', async () => {
    render(
      <RescheduleControls
        appointment={{
          ...base,
          allowedActions: ['approve_reschedule', 'reject_reschedule', 'reschedule'],
          rescheduleRequest: { id: 'r1', status: 'pending', localDate: '2030-01-08', localStartTime: '11:00', reason: 'Exam' },
        }}
        role="doctor"
        doctorId="d1"
        onChanged={() => {}}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Review request' }))
    expect(screen.getByRole('button', { name: /Approve and move/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
    expect(screen.getByText('“Exam”')).toBeInTheDocument()
  })
})

describe('describeActionError', () => {
  it('turns API codes into plain language', () => {
    expect(describeActionError(new ApiError('SLOT_UNAVAILABLE', 'x', 409))).toMatch(/just taken/)
    expect(describeActionError(new ApiError('REASON_REQUIRED', 'x', 422))).toMatch(/at least 5/)
    expect(describeActionError(new Error('boom'))).toMatch(/Something went wrong/)
  })
})
