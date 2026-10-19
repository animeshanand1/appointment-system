// Thin fetch wrapper for the backend API. See docs/architecture/04-api-specification.md §4.1
// for the envelope shapes this unwraps.
//
// The dev server proxies /api to the backend (vite.config.js), and in
// production the API serves the SPA from the same origin, so this is always
// a same-origin request: no CORS headers needed, and the session cookie is
// never sent anywhere else.
import { pathSegment, sanitizeBody } from "./sanitize";

const API_BASE = "/api";
const TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 2_000_000;

// Auth endpoints get a client-side ceiling as well, so a stuck key or a
// double-click loop can't hammer the server. The real limit is enforced by
// the API (it answers 429); this is only a courtesy throttle.
const CLIENT_LIMITS = {
  "/auth/login": { max: 5, windowMs: 60_000 },
  "/auth/register": { max: 3, windowMs: 60_000 },
  "/auth/forgot-password": { max: 3, windowMs: 60_000 },
};
const recentCalls = new Map();
// After a 429 the endpoint is left alone until the server's Retry-After passes.
const blockedUntil = new Map();

export class ApiError extends Error {
  constructor(code, message, status, details) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const rateLimited = (seconds) =>
  new ApiError(
    "CLIENT_THROTTLED",
    `Too many requests. Please wait ${Math.max(1, Math.ceil(seconds))} seconds and try again.`,
    429
  );

function checkClientLimits(endpoint) {
  const now = Date.now();
  const until = blockedUntil.get(endpoint);
  if (until && until > now) throw rateLimited((until - now) / 1000);

  const limit = CLIENT_LIMITS[endpoint];
  if (!limit) return;
  const calls = (recentCalls.get(endpoint) ?? []).filter((t) => now - t < limit.windowMs);
  if (calls.length >= limit.max) throw rateLimited((calls[0] + limit.windowMs - now) / 1000);
  calls.push(now);
  recentCalls.set(endpoint, calls);
}

function retryAfterMs(response) {
  const header = response.headers.get("Retry-After");
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds, 600) * 1000;
  const date = Date.parse(header ?? "");
  if (!Number.isNaN(date)) return Math.min(Math.max(date - Date.now(), 0), 600_000);
  return 30_000;
}

// undefined for an empty body (e.g. 204), null for anything that isn't a
// reasonably sized JSON document.
async function readJson(response) {
  const length = Number(response.headers.get("Content-Length"));
  if (length > MAX_RESPONSE_BYTES) return null;
  const text = await response.text();
  if (!text) return undefined;
  const type = response.headers.get("Content-Type") ?? "";
  if (!type.includes("application/json") || text.length > MAX_RESPONSE_BYTES) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request(path, { method = "GET", json } = {}) {
  const endpoint = path.split("?")[0];
  checkClientLimits(endpoint);

  const headers = { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" };
  if (method !== "GET") headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: json === undefined ? undefined : sanitizeBody(json),
      credentials: "same-origin",
      // Responses carry patient data; keep them out of the HTTP cache.
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new ApiError("TIMEOUT", "The server took too long to respond. Please try again.", 0);
    }
    throw new ApiError("NETWORK_ERROR", "Unable to reach the server. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) blockedUntil.set(endpoint, Date.now() + retryAfterMs(response));

  const body = await readJson(response);

  if (!response.ok) {
    throw new ApiError(
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? "Something went wrong. Please try again.",
      response.status,
      body?.error?.details
    );
  }

  if (body === null) {
    throw new ApiError("BAD_RESPONSE", "The server sent an unexpected response. Please try again.", response.status);
  }

  return body ?? {};
}

export async function login({ email, password }) {
  const body = await request("/auth/login", { method: "POST", json: { email, password } });
  return body.data.user;
}

export async function register(userData) {
  const body = await request("/auth/register", {
    method: "POST",
    json: userData,
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
  const body = await request(`/doctors/${pathSegment(doctorId)}`);
  return body.data;
}

export async function getDoctorSlots(doctorId, date) {
  const params = new URLSearchParams({ date });
  const body = await request(`/doctors/${pathSegment(doctorId)}/slots?${params}`);
  return body.data;
}

export async function bookAppointment({ doctorId, startAt, patientNotes }) {
  const body = await request("/appointments", {
    method: "POST",
    json: { doctorId, startAt, ...(patientNotes ? { patientNotes } : {}) },
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
  const body = await request(`/appointments/${pathSegment(appointmentId)}/status`, {
    method: "PATCH",
    json: { status, ...(reason ? { reason } : {}) },
  });
  return { appointment: body.data, unchanged: Boolean(body.meta?.unchanged) };
}

// null before the doctor's first save.
export async function getMyAvailability() {
  const body = await request("/doctors/me/availability");
  return body.data;
}

export async function saveMyAvailability(availability) {
  const body = await request("/doctors/me/availability", { method: "PUT", json: availability });
  return { availability: body.data, outOfHoursBookings: body.meta?.outOfHoursBookings ?? [] };
}

export async function updateMyProfile(changes) {
  const body = await request("/doctors/me/profile", { method: "PATCH", json: changes });
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
    json: {
      startLocal,
      endLocal,
      ...(reason ? { reason } : {}),
      dryRun,
      cancelConflictingAppointments,
    },
  });
  return {
    timeOff: body.data,
    conflicts: body.meta?.conflicts ?? [],
    cancelledAppointmentIds: body.meta?.cancelledAppointmentIds ?? [],
  };
}

export async function deleteTimeOff(timeOffId) {
  await request(`/doctors/me/time-off/${pathSegment(timeOffId)}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Rescheduling (docs/architecture/03-core-algorithms.md §3.3.1)
// ---------------------------------------------------------------------------

export async function cancelAppointment(appointmentId, reason) {
  return updateAppointmentStatus(appointmentId, { status: "cancelled", reason });
}

// Doctor moves the appointment directly.
export async function rescheduleAppointment(appointmentId, { startAt, reason }) {
  const body = await request(`/appointments/${pathSegment(appointmentId)}/reschedule`, {
    method: "PATCH",
    json: { startAt, ...(reason ? { reason } : {}) },
  });
  return body.data;
}

// Patient asks the doctor to move it (replaces any pending request).
export async function requestReschedule(appointmentId, { startAt, reason }) {
  const body = await request(`/appointments/${pathSegment(appointmentId)}/reschedule-request`, {
    method: "PUT",
    json: { startAt, ...(reason ? { reason } : {}) },
  });
  return body.data;
}

export async function withdrawRescheduleRequest(appointmentId) {
  const body = await request(`/appointments/${pathSegment(appointmentId)}/reschedule-request`, { method: "DELETE" });
  return body.data;
}

export async function decideRescheduleRequest(appointmentId, { requestId, decision, note }) {
  const body = await request(`/appointments/${pathSegment(appointmentId)}/reschedule-request/decision`, {
    method: "POST",
    json: { requestId, decision, ...(note ? { note } : {}) },
  });
  return body.data;
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export async function updateMe(changes) {
  const body = await request("/auth/me", { method: "PATCH", json: changes });
  return body.data.user;
}

export async function changePassword({ currentPassword, newPassword }) {
  const body = await request("/auth/change-password", { method: "POST", json: { currentPassword, newPassword } });
  return body.data.user;
}

export async function forgotPassword(email) {
  const body = await request("/auth/forgot-password", { method: "POST", json: { email } });
  return body.data.message;
}

export async function resetPassword({ token, password }) {
  const body = await request("/auth/reset-password", { method: "POST", json: { token, password } });
  return body.data.message;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const query = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
};

export async function getAdminStats() {
  const body = await request("/admin/stats");
  return body.data;
}

export async function listAdminUsers({ role, status, q, page = 1, limit = 25 } = {}) {
  const body = await request(`/admin/users${query({ role, status, q, page, limit })}`);
  return { users: body.data, meta: body.meta };
}

export async function setUserActive(userId, isActive) {
  const body = await request(`/admin/users/${pathSegment(userId)}`, { method: "PATCH", json: { isActive } });
  return body.data;
}

export async function listInvites({ status, page = 1, limit = 25 } = {}) {
  const body = await request(`/admin/invites${query({ status, page, limit })}`);
  return { invites: body.data, meta: body.meta };
}

// The plain code is only ever returned here.
export async function createInvite({ label, email, expiresInDays }) {
  const body = await request("/admin/invites", {
    method: "POST",
    json: { label, ...(email ? { email } : {}), expiresInDays },
  });
  return { invite: body.data, code: body.meta.code };
}

export async function revokeInvite(inviteId) {
  const body = await request(`/admin/invites/${pathSegment(inviteId)}`, { method: "DELETE" });
  return body.data;
}

export async function listAdminAppointments({ status, doctorId, from, to, page = 1, limit = 25 } = {}) {
  const body = await request(`/admin/appointments${query({ status, doctorId, from, to, page, limit })}`);
  return { appointments: body.data, meta: body.meta };
}
