import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import { API_URL } from '../constants/Config';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  const handleRegister = async () => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedUsername || !trimmedEmail || !password) {
      Alert.alert('Missing fields', 'Please fill in username, email, and password.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, email: trimmedEmail, password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.token);
        router.replace('/chat');
      } else {
        if (res.status === 400) {
          Alert.alert('Registration failed', data.error || 'Please check your information and try again.');
        } else if (res.status === 429) {
          Alert.alert('Too many attempts', 'Please wait a few minutes and try again.');
        } else {
          Alert.alert('Registration failed', data.error || 'Please try again later.');
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
        <Text style={styles.title}>Join Zippi</Text>
        <Text style={styles.subtitle}>Create your account to get started.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput 
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholderTextColor="#6B7280"
            placeholder="johndoe"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput 
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#6B7280"
            placeholder="you@example.com"
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
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Register'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.push('/login')} style={styles.link}>
          <Text style={styles.linkText}>Already have an account? <Text style={{color: '#60A5FA'}}>Log in</Text></Text>
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
    backgroundColor: '#34D399',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12
  },
  buttonText: { color: '#064E3B', fontWeight: 'bold', fontSize: 16 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#9CA3AF', fontSize: 14 }
});
