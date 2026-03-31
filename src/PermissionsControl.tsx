import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { getPermissions, openHealthConnect, PermissionsResult } from './HealthClient';

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionsResult | null>(null);
  const appState = useRef(AppState.currentState);

  const refresh = async () => {
    try {
      const perms = await getPermissions();
      setPermissions(perms);
    } catch (e) {
      console.warn('Failed to fetch permissions', e);
    }
  };

  useEffect(() => {
    // Load on mount
    refresh();

    // Refresh when user comes back from Health Connect
    const subscription = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        refresh();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  return { permissions, refresh, openHealthConnect };
}