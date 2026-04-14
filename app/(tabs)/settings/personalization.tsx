import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View, TextInput, Pressable, ToastAndroid, BackHandler } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPreference } from "../../../src/storage/keys";
import { Host, Switch } from "@expo/ui/jetpack-compose";
import { savePersonalization } from "../../../src/HealthClient";
import { useRouter } from "expo-router";

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
            <View>
                <Text>Enable customization</Text>
                <Text>Customize how Healthcoach AI responds to you</Text>
                <Host matchContents>
                    <Switch
                    value={checked}
                    onCheckedChange={async (nextChecked: boolean) => {
                        setChecked(nextChecked); // store immediate UI state
                        await AsyncStorage.setItem(getPreference("switch_state"), JSON.stringify(nextChecked));
                    }}
                    colors={{
                        checkedTrackColor: "#2ab8a2",
                    }}
                />
                </Host>
            </View>
            <View>
                <Text>Custom instructions</Text>
                <TextInput 
                    value={text}
                    onChangeText={setText}
                    style={{borderColor: '#000', borderWidth: 1, borderStyle: 'solid'}}
                    editable={checked}
                />
                <Pressable
                    onPress={async () => {
                        await savePersonalization(text)
                        await AsyncStorage.setItem(getPreference('personalization'), JSON.stringify(text))
                        showToast();
                    }}
                    disabled={checked == true && text == "" ? true : false}
                >
                    <Text>Save</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    )
}