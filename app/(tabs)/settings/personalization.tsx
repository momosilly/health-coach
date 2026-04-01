import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View, TextInput, Pressable } from "react-native";
import { Host, Switch } from "@expo/ui/jetpack-compose";
import { savePersonalization } from "../../../src/HealthClient";

export default function personalization() {
    const [checked, setChecked] = useState(false);
    const [text, setText] = useState("");

    return (
        <SafeAreaView>
            <View>
                <Text>Enable customization</Text>
                <Text>Customize how Healthcoach AI responds to you</Text>
                <Host matchContents>
                    <Switch 
                        value={checked}
                        onCheckedChange={setChecked}
                        colors={{
                            checkedTrackColor: '#2ab8a2'
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
                    onPress={() => savePersonalization(text)}
                >
                    <Text>Save</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    )
}