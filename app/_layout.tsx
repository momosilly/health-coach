import { Slot, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import * as SecureStore from 'expo-secure-store';
import { AUTH_TOKEN_KEY } from "./login";
import { getPreference } from "../src/storage/keys";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerUser, waitForServer } from "../src/HealthClient";

export default function RootLayout() {
    const router = useRouter();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
            const onboardingDone = await AsyncStorage.getItem(getPreference('onboarding_done'));
            console.log('[layout] token:', !!token, 'onboardingDone:', onboardingDone);
            
            if (!token) {
                router.replace('/login');
            } else if (!onboardingDone) {
                router.replace('/onboarding');
            } else {
                waitForServer().then(() => {
                    console.log('[layout] server ready, calling registerUser');
                    registerUser();
                });
                router.replace('/(tabs)');
            }
            setChecked(true);
        };

        checkAuth();
    }, []);

    if (!checked) return null;

    return <Slot />;
}