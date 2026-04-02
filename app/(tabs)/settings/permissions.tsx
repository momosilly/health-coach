import React, { useEffect } from "react";
import { Text, Pressable, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePermissions } from "../../../src/PermissionsControl";
import { useRouter } from "expo-router";

export default function permissions() {
    const router = useRouter();
    const { permissions, openHealthConnect } = usePermissions();

    useEffect(() => {
        // Hardware back button navigates back to settings instead of home
        const onBackPress = () => {
            router.back()
            return true;
        }

        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            onBackPress
        )

        return () => subscription.remove();
    }, [])

    return (
        <SafeAreaView>
            <Text>{permissions?.status_text}</Text>
            <Pressable
                onPress={openHealthConnect}
            >
                <Text>Open Health Connect</Text>
            </Pressable>
        </SafeAreaView>
    )
}