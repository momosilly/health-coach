import { requireNativeModule } from 'expo-modules-core';

// Loads the native AuthModule (modules/AuthModule) via Expo's module registry
// instead of the legacy NativeModules bridge — required since RN 0.83 removed
// the legacy bridge entirely.
const AuthModule = requireNativeModule('AuthModule');

// Starts the Microsoft auth flow — resolves immediately, token arrives via retrievePendingToken()
export async function login(scopes: string[] = ["openid", "profile"]) {
    return await AuthModule.authorize(scopes);
}

// Call after app resumes from Microsoft login — returns the token or throws NO_TOKEN
export async function retrievePendingToken(): Promise<string> {
    return await AuthModule.retrievePendingToken();
}