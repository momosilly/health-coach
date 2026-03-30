import React, { useState } from "react";
import { Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function permissions() {
    const [permissionText, setPermissionText] = useState("No permissions granted. Please grant at least one")

    return (
        <SafeAreaView>
            <Text>{permissionText}</Text>
            <Pressable
                
            >
                <Text>Open Health Connect</Text>
            </Pressable>
        </SafeAreaView>
    )
}