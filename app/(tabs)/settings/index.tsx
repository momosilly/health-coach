import React from "react";
import { Text, Pressable, View, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Color, useRouter } from "expo-router";
import { globalStyles } from "../../../src/styles";
import { deleteAccount } from "../../../src/HealthClient";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "../../login";

export default function settings() { 
    const router = useRouter();

    const handleDeletAccount = async () => {
        try{
            await deleteAccount();
            await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
            router.replace('/login');
        } catch (e) {
            console.warn('Delete account failed:', e);
        }
    };

    return (
        <SafeAreaView>
            <Text style={globalStyles.title}>Settings</Text>
            <View style={{ marginTop: 17 }}>
                <Pressable
                    onPress={() => {router.push('settings/permissions')}}
                    style={styles.pressable}
                >
                    <Image source={require('../../../assets/database.png')} style={styles.image}/>
                    <Text style={styles.pressableText}>Permissions</Text>
                </Pressable>

                <Pressable
                    onPress={() => {router.push('settings/personalization')}}
                    style={styles.pressable}
                >
                    <Image source={require('../../../assets/personalization.png')} style={styles.image}/>
                    <Text style={styles.pressableText}>Personalization</Text>
                </Pressable>

                <Pressable
                    onPress={() => {router.push('settings/about')}}
                    style={styles.pressable}
                >
                    <Image source={require('../../../assets/info.png')} style={{ height: 23, width: 23 }}/>
                    <Text style={styles.pressableText}>About</Text>
                </Pressable>

                <Pressable
                    onPress={handleDeletAccount}
                    style={styles.pressable}
                >
                    <Text style={[styles.pressableText, {color: 'red'}]}>Sign out</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    pressable: {
        flexDirection: 'row',
        marginTop: 10,
        marginLeft: 16,
        gap: 12
    },
    image: {
        height: 26,
        width: 26
    },
    pressableText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500'
    }
})