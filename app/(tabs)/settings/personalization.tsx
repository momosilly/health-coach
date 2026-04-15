import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View, TextInput, Pressable, ToastAndroid, BackHandler, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPreference } from "../../../src/storage/keys";
import { Host, Row, Switch } from "@expo/ui/jetpack-compose";
import { savePersonalization } from "../../../src/HealthClient";
import { useRouter } from "expo-router";
import { globalStyles } from "../../../src/styles";

export default function personalization() {
    const router = useRouter();
    const [checked, setChecked] = useState(false);
    const [text, setText] = useState("");

    const showToast = () => {
        ToastAndroid.show('Personalization settings has been saved', ToastAndroid.SHORT);
    }

    // Get the state of the switch
    useEffect(() => {
        const switchState = async () => {
            const stored = await AsyncStorage.getItem(getPreference('switch_state'));
            if (!stored) return;
            const parsed = JSON.parse(stored);
            setChecked(parsed)
        };

        switchState();

        // Get text instruction value
        const textValue = async () => {
            const stored = await AsyncStorage.getItem(getPreference('personalization'));
            if (!stored) return;
            setText(JSON.parse(stored));
        };

        textValue();

        // Hardware back button navigates back to settings instead of home
        const onBackPress = () => {
            router.back();
            return true;
        }

        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            onBackPress
        )

        const removeSubscription = () => {return subscription.remove();}

        removeSubscription();
    }, [])

    return (
        <SafeAreaView>
            <Text style={globalStyles.title}>Personalization</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                <Text style={styles.text}>Enable customization</Text>
                <Text style={{ fontSize: 13, color: '#757575', marginLeft: 20 }}>Customize how Healthcoach AI responds to you</Text>
                </View>

                <View style={{ width: 66 }}>
                    <Host matchContents>
                        <Switch
                        value={checked}
                        onCheckedChange={async (nextChecked: boolean) => {
                            setChecked(nextChecked); // store immediate UI state
                        }}
                        colors={{
                            checkedTrackColor: "#2ab8a2",
                        }}
                    />
                    </Host>
                </View>
            </View>

            <View style={{marginTop: 10}}>
                <Text style={[styles.text, {marginBottom: 8}]}>Custom instructions</Text>
                <TextInput 
                    value={text}
                    onChangeText={setText}
                    style={styles.textInput}
                    editable={checked}
                    multiline
                />
                <Pressable
                    onPress={async () => {
                        await savePersonalization(text)
                        await AsyncStorage.setItem(getPreference('personalization'), JSON.stringify(text))
                        await AsyncStorage.setItem(getPreference("switch_state"), JSON.stringify(checked));
                        showToast();
                    }}
                    style={({pressed}) => [
                        styles.pressable,
                        pressed && globalStyles.pressablePressed
                    ]}
                >
                    <Text style={{ color: '#fff', fontSize: 16 }}>Save</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    text: {
        fontSize: 16,
        color: '#333',
        marginLeft: 20,
        marginTop: 18
    },
    textInput: {
        borderColor: '#D9D9D9', 
        borderWidth: 1, 
        borderStyle: 'solid',
        width: 370,
        height: 80,
        borderRadius: 8,
        alignSelf: 'center',
        textAlignVertical: 'top',
        paddingVertical: 10,
        paddingHorizontal: 8
    },
    pressable: {
        width: 80,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 13,
        backgroundColor: '#2AB8A2',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginLeft: 20
    },
})