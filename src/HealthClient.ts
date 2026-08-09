import { fetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';
import { AUTH_TOKEN_KEY } from '../app/login';

const BASE_URL = 'http://127.0.0.1:8765';

// ─── Types ──────────

export interface PermissionsResult {
  granted: number;
  total: number;
  all_granted: boolean;
  status_text: string;
  android_14_plus: boolean;
}

// ─── Token helper ──────────

async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ─── ping ──────────

export async function ping(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/ping`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── waitForServer ──────────

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

export async function getPermissions(): Promise<PermissionsResult> {
  const res = await fetch(`${BASE_URL}/permissions`, { method: 'GET' });
  if (!res.ok) throw new Error(`HealthServer error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<PermissionsResult>;
}

// ─── openHealthConnect ──────────

export async function openHealthConnect(): Promise<void> {
  const res = await fetch(`${BASE_URL}/permissions/open`, { method: 'POST' });
  if (!res.ok) throw new Error(`HealthServer error ${res.status}: ${await res.text()}`);
}

// ─── registerUser ──────────

/**
 * Called on every app launch after auth check.
 * Creates or refreshes the user's record in Firestore via the backend.
 * Never throws — a registration failure should never block the user.
 */
export async function registerUser(): Promise<void> {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader['Authorization']) return;
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: authHeader,
    });
    if (!res.ok) {
      console.warn('[registerUser] failed:', res.status);
    }
  } catch (e) {
    console.warn('[registerUser] error:', e);
  }
}

// ─── deleteAccount ──────────

/**
 * Called when the user taps 'Delete my account'.
 * Removes the user from Firestore so they stop being counted in billing.
 */
export async function deleteAccount(): Promise<void> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${BASE_URL}/delete-account`, {
    method: 'DELETE',
    headers: authHeader,
  });
  if (!res.ok) throw new Error(`Delete account failed: ${await res.text()}`);
}

// ─── streamHealthInsight ──────────

export async function streamHealthInsight(
  userNote: string,
  onChunk: (chunk: string) => void,
  onError?: (error: string) => void,
): Promise<void> {
  if (!userNote) {
    throw new Error('Please enter a note before getting insight.');
  }

  const authHeader = await getAuthHeader();

  const res = await fetch(`${BASE_URL}/healthdata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...authHeader,
    },
    body: JSON.stringify({ user_note: userNote }),
  });

  if (!res.ok) {
    const text = await res.text();
    onError ? onError(text) : onChunk(text);
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) onChunk(chunk);
  }
}