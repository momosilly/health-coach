import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    StyleSheet,
    AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { login, retrievePendingToken } from '../src/auth/appauth';
import { globalStyles } from '../src/styles';
import { waitForServer, registerUser } from '../src/HealthClient';

export const AUTH_TOKEN_KEY = 'auth_token';

export default function Login() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const appState = useRef(AppState.currentState);
    const waitingForToken = useRef(false);

    // When user comes back from Microsoft login, retrieve the pending token
    useEffect(() => {
        const subscription = AppState.addEventListener('change', async nextState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextState === 'active' &&
                waitingForToken.current
            ) {
                waitingForToken.current = false;
                try {
                    const token = await retrievePendingToken();
                    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
                    waitForServer().then(() => registerUser());
                    router.replace('/onboarding');
                } catch (e: any) {
                    setError('Sign in failed. Please try again.');
                    setLoading(false);
                }
            }
            appState.current = nextState;
        });

        return () => subscription.remove();
    }, []);

    const handleLogin = async () => {
        try {
            setLoading(true);
            setError('');
            waitingForToken.current = true;
            await login();
            // login() resolves immediately — token arrives when user comes back via AppState
        } catch (e: any) {
            waitingForToken.current = false;
            setError(e.message || 'Authentication failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.welcome}>Welcome</Text>
                <Text style={styles.subtitle}>
                    Sign in with your work account to get started.
                </Text>
            </View>

            <View style={styles.bottom}>
                {error !== '' && (
                    <Text style={styles.error}>{error}</Text>
                )}
                <Pressable
                    onPress={handleLogin}
                    disabled={loading}
                    style={({ pressed }) => [
                        styles.button,
                        loading && globalStyles.pressableDisabled,
                        pressed && globalStyles.pressablePressed,
                    ]}
                >
                    {loading ? (
                        <ActivityIndicator color='#fff' />
                    ) : (
                        <Text style={styles.buttonText}>Sign in with Microsoft</Text>
                    )}
                </Pressable>
            </View>
        </SafeAreaView>
    );
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