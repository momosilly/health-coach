import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { openHealthConnect } from "../src/HealthClient";
import { getPreference } from "../src/storage/keys";
import { globalStyles } from "../src/styles";

const { width } = Dimensions.get('window');

const STEPS = [
    {
        title: 'Connect your health app',
        body: 'Health Coach reads your data through Health Connect — Android\'s secure health data hub. First, make sure your health app is connected to Health Connect.\n\nPopular apps like Samsung Health, Fitbit, and Garmin all support this. Open your health app, go to its settings, and look for a "Health Connect" or "Connected apps" option.',
        cta: 'Got it',
    },
    {
        title: 'What data we use',
        body: 'Health Coach reads the following data from the last 24 hours to give you personalised insights:\n\n• Steps\n• Heart rate (min & max)\n• Resting heart rate\n• Calories burned\n• Sleep sessions & stages\n• Exercise sessions\n\nAll data stays on your device. Nothing is stored on our servers.',
        cta: 'Got it',
    },
    {
        title: 'You\'re almost there',
        body: 'Nice work! Now that your health app is set up, the last step is to grant Health Coach access to Health Connect.\n\nTap the button below and grant all permissions — this is what lets us read your health data and give you meaningful coaching.',
        cta: 'Connect to Health Connect',
        isFinal: true,
    },
];

export default function Oboarding() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const current = STEPS[step]

    const handleCta = async () => {
        if (!current.isFinal) {
            setStep(s => s + 1);
            return;
        }

        try {
            setLoading(true);
            await openHealthConnect();
            await AsyncStorage.setItem(getPreference('onboarding_done'), JSON.stringify(true))
            router.replace('/(tabs)');
        } catch(e) {
            // If opening Health Connect fails, still mark done and proceed
            await AsyncStorage.setItem(getPreference('onboarding_done'), JSON.stringify(true));
            router.replace('/(tabs)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/*Step indicators*/}
            <View style={styles.indicators}>
                {STEPS.map((_, i) => (
                    <View 
                        key={i}
                        style={[
                            styles.indicator,
                            i === step && styles.indicatorActive,
                            i < step && styles.indicatorDone
                        ]}
                    />
                ))}
            </View>

            {/*Content*/}
            <View style={styles.content}>
                <Text style={styles.title}>{current.title}</Text>
                <Text style={styles.body}>{current.body}</Text>
            </View>

            {/*CTA*/}
            <View style={styles.bottom}>
                <Pressable
                    onPress={handleCta}
                    disabled={loading}
                    style={({pressed}) => [
                        styles.button,
                        current.isFinal && styles.buttonFinal,
                        loading && globalStyles.pressableDisabled,
                        pressed && globalStyles.pressablePressed
                    ]}
                >
                    <Text style={styles.buttonText}>{current.cta}</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    indicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingTop: 24,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D9D9D9',
    },
    indicatorActive: {
        backgroundColor: '#2AB8A2',
        width: 24,
    },
    indicatorDone: {
        backgroundColor: '#2AB8A2',
        opacity: 0.4,
    },
    content: {
        flex: 1,
        paddingHorizontal: 32,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 20,
    },
    body: {
        fontSize: 15,
        color: '#555',
        lineHeight: 26,
    },
    bottom: {
        paddingHorizontal: 32,
        paddingBottom: 24,
    },
    button: {
        backgroundColor: '#2AB8A2',
        borderRadius: 13,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonFinal: {
        backgroundColor: '#135248',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
 