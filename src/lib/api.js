// Thin fetch wrapper for the backend API. See docs/architecture/04-api-specification.md §4.1
// for the envelope shapes this unwraps.
//
// The dev server proxies /api to the backend (vite.config.js), and in
// production the API serves the SPA from the same origin, so this is always
// a same-origin request: no CORS headers needed, and the session cookie is
// sent automatically.
const API_BASE = "/api";

export class ApiError extends Error {
  constructor(code, message, status, details) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "Unable to reach the server. Check your connection and try again.", 0);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? "Something went wrong. Please try again.",
      response.status,
      body?.error?.details
    );
  }

  return body;
}

export async function login({ email, password }) {
  const body = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  return body.data.user;
}

export async function register(userData) {
  const body = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
  return body.data.user;
}

export async function logout() {
  await request("/auth/logout", { method: "POST" });
}

export async function me() {
  const body = await request("/auth/me");
  return body.data.user;
}

export async function listDoctors({ specialization } = {}) {
  const params = new URLSearchParams({ limit: "50" });
  if (specialization) params.set("specialization", specialization);
  const body = await request(`/doctors?${params}`);
  return body.data;
}

export async function getDoctor(doctorId) {
  const body = await request(`/doctors/${encodeURIComponent(doctorId)}`);
  return body.data;
}

export async function getDoctorSlots(doctorId, date) {
  const params = new URLSearchParams({ date });
  const body = await request(`/doctors/${encodeURIComponent(doctorId)}/slots?${params}`);
  return body.data;
}

export async function bookAppointment({ doctorId, startAt, patientNotes }) {
  const body = await request("/appointments", {
    method: "POST",
    body: JSON.stringify({ doctorId, startAt, ...(patientNotes ? { patientNotes } : {}) }),
  });
  return { appointment: body.data, replayed: Boolean(body.meta?.replayed) };
}

// ---------------------------------------------------------------------------
// Doctor side (docs/architecture/04-api-specification.md §4.5, §4.6)
// ---------------------------------------------------------------------------

export async function listMyAppointments({ scope = "upcoming", status, date, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ scope, page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  if (date) params.set("date", date);
  const body = await request(`/appointments/my-appointments?${params}`);
  return { appointments: body.data, meta: body.meta };
}

export async function updateAppointmentStatus(appointmentId, { status, reason }) {
  const body = await request(`/appointments/${encodeURIComponent(appointmentId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
  return { appointment: body.data, unchanged: Boolean(body.meta?.unchanged) };
}

// null before the doctor's first save.
export async function getMyAvailability() {
  const body = await request("/doctors/me/availability");
  return body.data;
}

export async function saveMyAvailability(availability) {
  const body = await request("/doctors/me/availability", { method: "PUT", body: JSON.stringify(availability) });
  return { availability: body.data, outOfHoursBookings: body.meta?.outOfHoursBookings ?? [] };
}

export async function updateMyProfile(changes) {
  const body = await request("/doctors/me/profile", { method: "PATCH", body: JSON.stringify(changes) });
  return body.data;
}

export async function listMyTimeOff() {
  const body = await request("/doctors/me/time-off");
  return body.data;
}

// With dryRun the block isn't created: `timeOff` is null and `conflicts` is a preview.
export async function createTimeOff({ startLocal, endLocal, reason, dryRun = false, cancelConflictingAppointments = false }) {
  const body = await request("/doctors/me/time-off", {
    method: "POST",
    body: JSON.stringify({
      startLocal,
      endLocal,
      ...(reason ? { reason } : {}),
      dryRun,
      cancelConflictingAppointments,
    }),
  });
  return {
    timeOff: body.data,
    conflicts: body.meta?.conflicts ?? [],
    cancelledAppointmentIds: body.meta?.cancelledAppointmentIds ?? [],
  };
}

export async function deleteTimeOff(timeOffId) {
  await request(`/doctors/me/time-off/${encodeURIComponent(timeOffId)}`, { method: "DELETE" });
}
