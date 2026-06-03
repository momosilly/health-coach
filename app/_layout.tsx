import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import * as SecureStore from 'expo-secure-store';
import { AUTH_TOKEN_KEY } from "./login";
import { getPreference } from "../src/storage/keys";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
            const onboardingDone = await AsyncStorage.getItem(getPreference('onboarding_done'));

            if (!token) {
                router.replace('/login');
            } else if (!onboardingDone) {
                router.replace('/onboarding');
            } else {
                router.replace('/(tabs)');
            }

            setChecked(true);
        };

        checkAuth();
    }, []);

    // Render nothing until the auth check has resolved to avoid flash
    if (!checked) return null;

    return <Slot />;
}