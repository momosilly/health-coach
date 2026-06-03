import React, {useState} from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from 'expo-secure-store';
import { login } from '../src/auth/appauth';
import { globalStyles } from "../src/styles";
import { useRouter } from "expo-router";

export const AUTH_TOKEN_KEY = 'auth_token';

export default function Login() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        try {
            setLoading(true);
            setError('');
            const result = await login();
            await SecureStore.setItemAsync(AUTH_TOKEN_KEY, result.accessToken);
            router.replace('/(tabs)');
        } catch (e: any) {
            setError(e.message || 'Authentication failed. Please try again');
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.welcome}>Welcome</Text>
                <Text style={styles.subtitle}>Sign in with your working account to get started.</Text>
            </View>

            <View style={styles.bottom}>
                {error !== '' && (
                    <Text style={styles.error}>{error}</Text>
                )}
            </View>
            <Pressable 
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [
                    styles.button,
                    loading && globalStyles.pressableDisabled,
                    pressed && globalStyles.pressablePressed
                ]}
            >
                {loading ? (
                    <ActivityIndicator color={'#fff'}/>
                ) : (
                    <Text style={styles.buttonText}>Sign in with Microsoft</Text>
                )}
            </Pressable>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    welcome: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#2AB8A2',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#555',
        lineHeight: 24,
    },
    bottom: {
        paddingHorizontal: 32,
        paddingBottom: 24,
    },
    error: {
        color: 'red',
        marginBottom: 12,
        fontSize: 14,
    },
    button: {
        backgroundColor: '#2AB8A2',
        borderRadius: 13,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});