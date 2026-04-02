import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  Pressable, 
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { waitForServer, fetchHealthInsight } from '../../src/HealthClient';
import { getPreference } from '../../src/storage/keys';
import { savePersonalization } from '../../src/HealthClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [serverReady, setServerReady] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Health Coach</Text>

      <Pressable
        onPress={() => router.push('settings')}
      >
        <Image 
          source={require('../../assets/setting.png')}
          style={{ height: 24, width: 24 }}
        />
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="Add a note (optional)"
        value={userNote}
        onChangeText={setUserNote}
      />

      <Button title="Get Insight" onPress={handleSend} disabled={loading || !serverReady || !userNote} />

      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
      {error  !== '' && <Text style={styles.error}>{error}</Text>}
      {insight !== '' && <Text style={styles.insight}>{insight}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title:     { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  input:     { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16 },
  insight:   { marginTop: 24, fontSize: 15, lineHeight: 22, color: '#333' },
  error:     { marginTop: 16, color: 'red' },
  sub:       { marginTop: 12, color: '#888' },
});