import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import useAuthStore from '../store/authStore';
import { useEffect, useRef, useState, useCallback } from 'react';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const [showSplash, setShowSplash] = useState(true);

  useFocusEffect(
    useCallback(() => {
      // Reset values on focus
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.5);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 5,
          useNativeDriver: true
        })
      ]).start();

      const timer = setTimeout(() => {
        if (isAuthenticated) {
          router.replace('/chat');
        } else {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true
          }).start(() => {
            setShowSplash(false);
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true
            }).start();
          });
        }
      }, 2000);

      return () => clearTimeout(timer);
    }, [isAuthenticated, fadeAnim, scaleAnim, router])
  );

  if (showSplash) {
    return (
      <View style={[styles.container, styles.splashContainer]}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <View style={styles.splashLogoWrap}>
            <Text style={styles.splashLogoText}>Z</Text>
          </View>
          <Text style={styles.splashTitle}>Zippi</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
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
      </Animated.View>
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
  splashContainer: {
    alignItems: 'center',
  },
  splashLogoWrap: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  splashLogoText: {
    color: '#fff',
    fontSize: 50,
    fontWeight: '900',
  },
  splashTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#F9FAFB',
    letterSpacing: 2,
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
