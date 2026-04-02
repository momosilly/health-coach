import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function About() {
    const router = useRouter();

    useEffect(() => {
        // Hardware back button navigates back to settings instead of home
        const onBackPress = () => {
            router.back();
            return true;
        }

        const subscription = BackHandler.addEventListener(
            'hardwareBackPress',
            onBackPress
        )

        return () => subscription.remove();
    })

    return (
        <SafeAreaView>
            <Text>Version: v{Application.nativeApplicationVersion}</Text>
            <Text>Build: {Application.nativeBuildVersion}</Text>
        </SafeAreaView>
    );
}