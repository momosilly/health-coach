import { NativeModules } from "react-native";
const { AuthModule } = NativeModules;

export async function login(scopes: string[] = ["openid", "profile", "offline_access", "User.Read"]) {
  if (!AuthModule) throw new Error("AuthModule native module not linked");
  return await AuthModule.authorize(scopes);
}
