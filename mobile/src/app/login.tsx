import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import { API_URL } from '../constants/Config';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  const handleLogin = async () => {
    const trimmedIdentifier = identifier.trim();
    setError('');

    if (!trimmedIdentifier || !password) {
      setError('Please enter your email/username and password.');
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
          setError('Invalid email/username or password.');
        } else if (res.status === 429) {
          setError('Too many attempts. Please wait a few minutes and try again.');
        } else {
          setError(data.error || 'Sign in failed. Please try again.');
        }
      }
    } catch (e) {
      setError('Cannot connect to server. Check internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>Z</Text>
          </View>

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to sync your study updates.</Text>

          {error ? (
            <View style={styles.errorBox}>
              <View style={styles.errorDot} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

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
            <View style={styles.passwordHeader}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={() => alert('Forgot Password flow would go here')}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.passwordContainer}>
              <TextInput 
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#6B7280"
                placeholder="••••••••"
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name={showPassword ? "eye" : "eye-off"} size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => router.push('/register')} style={styles.link}>
            <Text style={styles.linkText}>Don&apos;t have an account? <Text style={styles.linkAccent}>Join Zippi</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  formContainer: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 16,
    padding: 22,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: { color: 'white', fontSize: 26, fontWeight: '800' },
  title: { fontSize: 34, fontWeight: '800', color: 'white', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#9CA3AF', marginBottom: 24 },
  errorBox: {
    marginBottom: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F87171' },
  errorText: { color: '#FCA5A5', fontSize: 13.5, fontWeight: '600', flex: 1 },
  inputGroup: { marginBottom: 20 },
  label: { color: '#D1D5DB', marginBottom: 8, fontSize: 13, fontWeight: '600' },
  passwordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgotPasswordText: { color: '#6366F1', fontSize: 13, fontWeight: '600' },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    color: 'white',
    padding: 16,
    fontSize: 16,
  },
  eyeIcon: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    backgroundColor: '#4F46E5',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  link: { marginTop: 18, alignItems: 'center' },
  linkText: { color: '#9CA3AF', fontSize: 14 },
  linkAccent: { color: '#E5E7EB', fontWeight: '800' },
});
