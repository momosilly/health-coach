import { fetch } from 'expo/fetch';

const BASE_URL = 'http://127.0.0.1:8765';

// ─── Types ──────────

export interface PermissionsResult {
  granted: number;
  total: number;
  all_granted: boolean;
  status_text: string;
  android_14_plus: boolean;
}

// ─── ping ──────────

/**
 * Check whether the Kotlin health server is up.
 * Resolves `true` if reachable, `false` otherwise.
 */
export async function ping(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/ping`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── waitForServer ──────────

/**
 * Poll until the Kotlin server is reachable, then resolve.
 * @param maxAttempts  How many times to ping before giving up (default 20 = ~10 s)
 * @param intervalMs   Delay between attempts in ms (default 500)
 */
export async function waitForServer(
  maxAttempts = 20,
  intervalMs = 500,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const ok = await ping();
    if (ok) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  console.warn('[healthClient] Server did not respond after', maxAttempts, 'attempts');
  return false;
}

// ─── getPermissions ──────────

/**
 * Get the current Health Connect permission status.
 */
export async function getPermissions(): Promise<PermissionsResult> {
  const res = await fetch(`${BASE_URL}/permissions`, { method: 'GET' });
  if (!res.ok) throw new Error(`HealthServer error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<PermissionsResult>;
}


// ─── openHealthConnect ──────────

/**
 * Tell the Kotlin server to open Health Connect so the user can manage permissions.
 */
export async function openHealthConnect(): Promise<void> {
  const res = await fetch(`${BASE_URL}/permissions/open`, { method: 'POST' });
  if (!res.ok) throw new Error(`HealthServer error ${res.status}: ${await res.text()}`);
}

// ─── streamHealthInsight ──────────

/**
 * Stream a Gemini coaching insight from the Flask/FastAPI backend.
 * Calls onChunk with each piece of text as it arrives.
 *
 * @param userNote     The user's question.
 * @param onChunk      Called with each text chunk as it streams in.
 */
export async function streamHealthInsight(
  userNote: string,
  onChunk: (chunk: string) => void,
  onError?: (error: string) => void,
): Promise<void> {
  if (!userNote) {
    throw new Error('Please enter a note before getting insight.');
  }

  const res = await fetch(`${BASE_URL}/healthdata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({ user_note: userNote }),
  });

  if (!res.ok) {
      const text = await res.text();
      onError ? onError(text) : onChunk(text);
      return;
  }

  // Read the response body as a stream
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) onChunk(chunk);
  }
}