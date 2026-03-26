const BASE_URL = 'http://localhost:8765';

// ─── Types ────────

export interface HealthInsightResult {
  insight: string;
  raw: Record<string, unknown>;
}

// ─── ping ───────

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

// ─── waitForServer ─────

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

// ─── fetchHealthInsight ────────

/**@param userNote*/

export async function fetchHealthInsight(
  userNote: string = '',
): Promise<HealthInsightResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s

  const res = await fetch(`${BASE_URL}/healthdata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_note: userNote }),
      signal: controller.signal,
  });
  clearTimeout(timeoutId);
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