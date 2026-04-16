import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View, TextInput, Pressable, ToastAndroid, BackHandler, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPreference } from "../../../src/storage/keys";
import { Host, Row, Switch } from "@expo/ui/jetpack-compose";
import { savePersonalization } from "../../../src/HealthClient";
import { useRouter } from "expo-router";
import { globalStyles } from "../../../src/styles";
import Dropdown from "../../(components)/DropdownMenu";

export default function personalization() {
    const router = useRouter();
    const [checked, setChecked] = useState(false);
    const [personalization, setPersonalization] = useState("");
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [goal, setGoal] = useState('');
    const [length, setLength] = useState('');

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
            setPersonalization(JSON.parse(stored));
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
                    <Text style={[styles.text, {marginLeft: 20}]}>Enable customization</Text>
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
                <Text style={[styles.text, {marginBottom: 8, marginLeft: 20}]}>Custom instructions</Text>
                <TextInput 
                    value={personalization}
                    onChangeText={setPersonalization}
                    style={[styles.textInput, {alignSelf: 'center', marginTop: 0, width: 370, height: 80}]}
                    editable={checked}
                    multiline
                />
                <View style={{flexDirection: 'row', justifyContent: 'space-around'}}>
                    <View style={{flex: 1, alignItems: 'center'}}>
                        <Text style={styles.text}>Age</Text>
                        <TextInput 
                            value={age}
                            onChangeText={setAge}
                            style={styles.textInput}
                            editable={checked}
                            keyboardType="numeric"
                        />
                    </View>
                    
                    <View style={{flex: 1, alignItems: 'center'}}>
                        <Text style={styles.text}>Weight (kg)</Text>
                        <TextInput 
                            value={weight}
                            onChangeText={setWeight}
                            style={styles.textInput}
                            editable={checked}
                            keyboardType="numeric"
                        />
                    </View>
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'space-around'}}>
                    <View style={{flex: 1, alignItems: 'center'}}>
                        <Text style={styles.text}>Length (cm)</Text>
                        <TextInput 
                            value={length}
                            onChangeText={setLength}
                            style={styles.textInput}
                            editable={checked}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={{flex: 1, alignItems: "center"}}>
                        <Text style={styles.text}>Sex</Text>
                        <Dropdown disabled={!checked} />
                    </View>
                </View>
                <View>
                    <Text style={[styles.text, {marginBottom: 8, marginLeft: 20}]}>Goals</Text>
                    <TextInput 
                        value={goal}
                        onChangeText={setGoal}
                        editable={checked}
                        style={[styles.textInput, {alignSelf: 'center', marginTop: 0, width: 370, height: 80}]}
                    />
                </View>
                
                <Pressable
                    onPress={async () => {
                        await savePersonalization(personalization)
                        await AsyncStorage.setItem(getPreference('personalization'), JSON.stringify(personalization))
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
        marginTop: 18
    },
    textInput: {
        borderColor: '#D9D9D9', 
        borderWidth: 1, 
        borderStyle: 'solid',
        width: 70,
        height: 40,
        borderRadius: 8,
        textAlignVertical: 'top',
        paddingVertical: 10,
        paddingHorizontal: 8,
        marginTop: 5
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