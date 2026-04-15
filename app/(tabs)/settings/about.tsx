import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { globalStyles } from '../../../src/styles';

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
            <Text style={globalStyles.title}>About</Text>
            <View style={{ alignItems: 'center', justifyContent: 'center', height: 150 }}>
                <Text style={{ fontSize: 17 }}>App version:</Text>
                <Text style={styles.text}>v{Application.nativeApplicationVersion}</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    text: {
        fontSize: 14,
        color: '#353535'
    }
})