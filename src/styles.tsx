import { StyleSheet } from "react-native";

export const globalStyles = StyleSheet.create({
    title: {
        fontSize: 25,
        fontWeight: 'bold',
        marginLeft: 20,
        marginTop: 17
    },
    pressableDisabled: {
        backgroundColor: '#ccc'
    },
    pressablePressed: {
        opacity: 0.8
    }
})