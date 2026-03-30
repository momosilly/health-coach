import React from "react";
import { Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function settings() { 
    const router = useRouter();

    return (
        <SafeAreaView>
            <Pressable
                onPress={() => {router.push('settings/permissions')}}
            >
                <Text>Permissions</Text>
            </Pressable>
            <Pressable
                
            >
                <Text>Personalization</Text>
            </Pressable>
            <Pressable
                
            >
                <Text>About</Text>
            </Pressable>
        </SafeAreaView>
    )
}