import React, { useEffect } from "react";
import { Text, Pressable, BackHandler, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePermissions } from "../../../src/PermissionsControl";
import { useRouter } from "expo-router";
import { globalStyles } from "../../../src/styles";
import { ToastAndroid } from "react-native";

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

    const handleOpenHealthConnect = async () => {
        if (permissions?.all_granted) {
            ToastAndroid.show('All permissions are already granted', ToastAndroid.SHORT);
            return;
        }
        openHealthConnect();
        };

    return (
        <SafeAreaView>
            <Text style={globalStyles.title}>Permissions</Text>
            <View style={{ alignSelf: 'center' }}>
                <Text style={styles.statusText}>{permissions?.status_text}</Text>
            </View>
            <Pressable
                onPress={handleOpenHealthConnect}
                style={({pressed}) => [
                    styles.pressable,
                    pressed && globalStyles.pressablePressed
                ]}
            >
                <Text style={{ fontSize: 16, color: '#fff' }}>Grant permissions</Text>
            </Pressable>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    statusText: {
        marginTop: 30,
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 20,
        width: 275,
        paddingHorizontal: 17,
        paddingVertical: 14,
        textAlign: 'center',
        fontSize: 16,
        color: '#333',
        fontWeight: '500'
    },
    pressable: {
        width: 202,
        height: 47,
        marginTop: 14,
        backgroundColor: '#2AB8A2',
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center'
    }
})