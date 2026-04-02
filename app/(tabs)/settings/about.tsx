import * as Application from 'expo-application';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function About() {
    return (
        <SafeAreaView>
            <Text>Version: v{Application.nativeApplicationVersion}</Text>
            <Text>Build: {Application.nativeBuildVersion}</Text>
        </SafeAreaView>
    );
}