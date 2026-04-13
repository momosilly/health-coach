import React from "react";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { Text, TextStyle, StyleProp } from "react-native";

interface GradientTextProps {
    text: string,
    colors: [string, string, ...string[]],
    style?: StyleProp<TextStyle>;
}

export const GradientText = ({ text, colors, style }: GradientTextProps) => {
    return (
        <MaskedView maskElement={<Text style={style}>{text}</Text>}>
            <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={[style, {opacity: 0}]}>{text}</Text>
            </LinearGradient>
        </MaskedView>
    )
}