import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, Pressable, View, Image, ScrollView, Keyboard, KeyboardEvent, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { waitForServer, fetchHealthInsight } from '../../src/HealthClient';
import { getPreference } from '../../src/storage/keys';
import { savePersonalization } from '../../src/HealthClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GradientText } from '../(components)/GradientText';

export default function App() {
  const [serverReady, setServerReady] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  // Wait for the Kotlin server on mount
  useEffect(() => {
    waitForServer().then(ready => {
      setServerReady(ready);
      if (!ready) setError('Could not connect to health server.');
    });

    // Get personalization message from asyncstorage
    const syncServer = async () => {
      try {
        const key = getPreference('personalization');
        if (!key) return;
        const stored = await AsyncStorage.getItem(key);
        if (!stored) return;
        await savePersonalization(stored);
      } catch (err) {
        console.warn("Personalization sync failed", err);
        setTimeout(syncServer, 5000);
      }
    };

    syncServer();

    // Check whether the keyboard is on-screen. If yes, animate the input with the keyboard
    const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height, // Move input to the same height as keyboard
        duration: e.duration - 140 || 250,
        useNativeDriver: false
      }).start();
    });

    // Check whether the keyboard is hid. If yes, animate the input to fall with the keyboard
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false
      }).start();
    });
    
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Handle Gemini insight
  const handleSend = async () => {
    setLoading(true);
    setInsight('');
    setError('');
    try {
      const result = await fetchHealthInsight(userNote);
      setInsight(result.insight);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!serverReady && !error) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.sub}>Connecting to health server…</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{flex: 1}}>
      <SafeAreaView style={styles.container}>
        <Pressable
          onPress={() => router.push('settings')}
        >
        <Image 
          source={require('../../assets/setting.png')}
          style={{ height: 24, width: 24 }}
        />
        </Pressable>

        <View style={{marginVertical: 'auto'}}>
          <GradientText 
            text= {`Hello there,${"\n"}What can I help you with today?`}
            colors={['#2AB8A2', '#135248']}
            style={{fontSize: 24, fontWeight: 'condensedBold', paddingBottom: 100}}
          />
        </View>
          <Animated.View style={[styles.inputRow, {bottom: Animated.add(new Animated.Value(35), keyboardHeight)}]}>
            <TextInput 
              style={styles.input}
              placeholder='Ask your health coach'
              value={userNote}
              onChangeText={setUserNote}
              multiline
            />

            <Pressable
              onPress={handleSend}
              disabled={loading || !serverReady || !userNote}
              style={({ pressed }) => [
              styles.sendButton,
              (!userNote || loading || !serverReady) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed
              ]}
              >
              <Image 
                source={require('../../assets/up-arrow.png')}
                style={{ height: 20, width: 20 }}
              />
            </Pressable>
          </Animated.View>
    
          {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
          {error  !== '' && <Text style={styles.error}>{error}</Text>}
          {insight !== '' && <ScrollView><Text style={styles.insight}>{insight}</Text></ScrollView>}
      </SafeAreaView>
     </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 24 
  },
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  insight: { 
    marginTop: 24, 
    fontSize: 15, 
    lineHeight: 22, 
    color: '#333' 
  },
  error: { 
    marginTop: 16, 
    color: 'red' 
  },
  sub: { 
    marginTop: 12, 
    color: '#888' 
  },
  settings: {
    alignItems: 'flex-end'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#2ab8a2',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 35,
    left: 24,
    right: 24
  },
  input: {
    flex: 1, 
    maxHeight: 120,
    paddingVertical: 6,
    color: '#111',
    fontSize: 15
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2ab8a2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 2
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc'
  },
  sendButtonPressed: {
    opacity: 0.8
  },
});