/**
 * Session API client — Backend-owned session state (US-03, US-04, US-05)
 *
 * All session state lives on the server (Redis). The frontend hydrates
 * from these endpoints on mount — sessionStorage is no longer used.
 */

interface StandardResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
  meta: { timestamp: string; request_id: string };
}

export interface SessionState {
  room_name: string;
  identity: string;
  status: "active" | "escalated" | "ended";
  multimodal_event: {
    reason: string;
    camera_requested: boolean;
    microphone_requested: boolean;
    pipeline_type: string;
  } | null;
  escalation_data: {
    event: string;
    detail: string | null;
    escalation_message?: string;
    phone_transfer?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * Fetch with retry — handles dev startup race (Next.js boots before FastAPI)
 * and production network transients. Exponential backoff: 1s, 2s, 4s.
 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("fetchWithRetry: unreachable");
}

/**
 * Cookie helpers — the only client-side persistence.
 * Stores just the room_name as a session handle.
 */
function getSessionCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    /(?:^|;\s*)zenith_session_room=([^;]+)/
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setSessionCookie(roomName: string): void {
  if (typeof document === "undefined") return;
  // Session cookie (no Max-Age = expires when browser closes)
  document.cookie = `zenith_session_room=${encodeURIComponent(roomName)}; path=/; SameSite=Lax`;
}

function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie =
    "zenith_session_room=; path=/; Max-Age=0; SameSite=Lax";
}

/**
 * Create a new session or resume an existing one.
 */
export async function createSession(
  identity?: string
): Promise<SessionState> {
  const res = await fetchWithRetry(`${BASE_URL}/api/v1/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: identity ?? null }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create session: ${res.status}`);
  }

  const payload = (await res.json()) as StandardResponse<SessionState>;
  if (payload.error || !payload.data) {
    throw new Error(payload.error?.message || "Unknown session error");
  }

  setSessionCookie(payload.data.room_name);
  return payload.data;
}

/**
 * Hydrate full session state from the backend.
 * Returns null if the session doesn't exist or expired.
 */
export async function hydrateSession(
  roomName: string
): Promise<SessionState | null> {
  const res = await fetchWithRetry(`${BASE_URL}/api/v1/sessions/${roomName}`);

  if (res.status === 404) {
    clearSessionCookie();
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to hydrate session: ${res.status}`);
  }

  const payload = (await res.json()) as StandardResponse<SessionState>;
  return payload.data;
}

/**
 * Fetch the full chat transcript for a session.
 */
export async function fetchTranscript(
  roomName: string
): Promise<TranscriptMessage[]> {
  const res = await fetchWithRetry(
    `${BASE_URL}/api/v1/sessions/${roomName}/transcript`
  );

  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Failed to fetch transcript: ${res.status}`);
  }

  const payload = (await res.json()) as StandardResponse<
    TranscriptMessage[]
  >;
  return payload.data ?? [];
}

/**
 * End a session (cleanup Redis + pipeline).
 */
export async function endSession(roomName: string): Promise<void> {
  clearSessionCookie();
  try {
    await fetch(`${BASE_URL}/api/v1/sessions/${roomName}`, {
      method: "DELETE",
    });
  } catch (e) {
    console.error("Failed to end backend session", e);
  }
}

/**
 * Trigger multimodal handoff to return to text mode.
 */
export async function handoffSession(roomName: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/v1/sessions/${roomName}/handoff`, {
      method: "POST",
    });
  } catch (e) {
    console.error("Failed to handoff backend session", e);
  }
}

/**
 * Inform the backend about a camera state change so the agent's context updates.
 */
export async function updateCameraState(roomName: string, isEnabled: boolean): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/v1/sessions/${roomName}/camera_state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_enabled: isEnabled }),
    });
  } catch (e) {
    console.error("Failed to update backend camera state", e);
  }
}

export { getSessionCookie, setSessionCookie, clearSessionCookie };
