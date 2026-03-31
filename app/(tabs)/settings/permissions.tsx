import React, { useState } from "react";
import { Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePermissions } from "../../../src/PermissionsControl";

export default function permissions() {
    const { permissions, openHealthConnect } = usePermissions();

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