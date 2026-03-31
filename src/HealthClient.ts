const BASE_URL = 'http://localhost:8765';

// ─── Types ──────────

export interface HealthInsightResult {
  insight: string;
  raw: Record<string, unknown>;
}

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
 * Use this to display permission count and status text in your RN screen.
 */
export async function getPermissions(): Promise<PermissionsResult> {
  const res = await fetch(`${BASE_URL}/permissions`, { method: 'GET' });
  if (!res.ok) throw new Error(`HealthServer error ${res.status}`);
  return res.json() as Promise<PermissionsResult>;
}

// ─── openHealthConnect ──────────

/**
 * Tell the Kotlin server to open Health Connect so the user can manage permissions.
 * On Android 14+ opens the built-in Health Connect settings.
 * On Android 13 and below opens the Health Connect app (or Play Store if not installed).
 */
export async function openHealthConnect(): Promise<void> {
  const res = await fetch(`${BASE_URL}/permissions/open`, { method: 'POST' });
  if (!res.ok) throw new Error(`HealthServer error ${res.status}`);
}

// ─── fetchHealthInsight ──────

/**
 * @param userNote  Optional free-text note from the user (e.g. "I feel tired today").
 */
export async function fetchHealthInsight(
  userNote: string,
): Promise<HealthInsightResult> {
  if (!userNote) {
    throw new Error('Please enter a note before getting insight.');
  }

  const res = await fetch(`${BASE_URL}/healthdata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_note: userNote }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HealthServer error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as Record<string, unknown>;

  // Unwrap the insight the same way the original MainActivity did:
  //   json.data_received.gemini_insight
  const dataReceived = json.data_received as Record<string, unknown> | undefined;
  const insight = (dataReceived?.gemini_insight as string) ?? '';

  return { insight, raw: json };
}