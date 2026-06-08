import { NativeModules } from "react-native";
const { AuthModule } = NativeModules;

// Starts the Microsoft auth flow — resolves immediately, token arrives via retrievePendingToken()
export async function login(scopes: string[] = ["openid", "profile"]) {
    if (!AuthModule) throw new Error("AuthModule native module not linked");
    return await AuthModule.authorize(scopes);
}

// Call after app resumes from Microsoft login — returns the token or throws NO_TOKEN
export async function retrievePendingToken(): Promise<string> {
    if (!AuthModule) throw new Error("AuthModule native module not linked");
    return await AuthModule.retrievePendingToken();
}