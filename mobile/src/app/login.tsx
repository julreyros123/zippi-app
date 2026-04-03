import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import { API_URL } from '../constants/Config';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  const handleLogin = async () => {
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      Alert.alert('Missing fields', 'Please enter your email/username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedIdentifier, password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.token);
        router.replace('/chat');
      } else {
        if (res.status === 401) {
          Alert.alert('Sign in failed', 'Invalid email/username or password.');
        } else if (res.status === 429) {
          Alert.alert('Too many attempts', 'Please wait a few minutes and try again.');
        } else {
          Alert.alert('Sign in failed', data.error || 'Please try again.');
        }
      }
    } catch (e) {
      Alert.alert('Connection issue', 'Could not connect to server. Check internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue to Zippi.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email or Username</Text>
          <TextInput 
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            placeholderTextColor="#6B7280"
            placeholder="you@example.com or username"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#6B7280"
            placeholder="••••••••"
          />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.push('/register')} style={styles.link}>
          <Text style={styles.linkText}>Don't have an account? <Text style={{color: '#60A5FA'}}>Register</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712', justifyContent: 'center' },
  formContainer: { padding: 24, width: '100%' },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#9CA3AF', marginBottom: 32 },
  inputGroup: { marginBottom: 20 },
  label: { color: '#D1D5DB', marginBottom: 8, fontSize: 14, fontWeight: '500' },
  input: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    color: 'white',
    padding: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#9CA3AF', fontSize: 14 }
});
