import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import useAuthStore from '../store/authStore';
import { useEffect } from 'react';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/chat');
    }
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoText}>Z</Text>
        </View>

        <Text style={styles.title}>Welcome to Zippi</Text>
        <Text style={styles.subtitle}>Real-time group chat and collaborative study spaces, built for mobile.</Text>

        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={() => router.push('/register')}
        >
          <Text style={styles.secondaryText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 16,
    padding: 22,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logoText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    marginBottom: 28,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingVertical: 15,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryText: {
    color: '#D1D5DB',
    fontSize: 16,
    fontWeight: '700',
  }
});
