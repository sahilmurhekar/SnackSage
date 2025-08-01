import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {SERVER_URL} from '../../constants/config';



export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');


  const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Validation Error', 'Please enter both email and password.');
    return;
  }

  try {
    const response = await fetch(`${SERVER_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

     if (response.ok) {
  await SecureStore.setItemAsync('token', data.token);
  await SecureStore.setItemAsync('user', JSON.stringify(data.user));
  router.replace('./dashboard');
} else {
      Alert.alert('Login Failed', data.message || 'Invalid credentials.');
    }
  } catch (err) {
    console.error('Login error:', err);
    Alert.alert('Network Error', 'Could not connect to the server.');
  }
};


  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor="#888"
              style={styles.textInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#888"
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Link href="./forgot" asChild>
  <TouchableOpacity style={styles.forgotPassword}>
    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
  </TouchableOpacity>
</Link>



          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.registerSection}>
          <Text style={styles.newUserText}>Don't have an account?</Text>
          <Link href="./register" asChild>
            <TouchableOpacity style={styles.registerButton}>
              <Text style={styles.registerButtonText}>Create Account</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  formContainer: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'LexendDeca-Regular',
    color: '#111111',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'LexendDeca-Regular',
    color: '#666',
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'LexendDeca-Regular',
    color: '#111111',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'LexendDeca-Regular',
    color: '#111111',
    backgroundColor: '#fafafa',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    fontFamily: 'LexendDeca-Regular',
    color: '#111111',
    backgroundColor: '#fafafa',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'LexendDeca-Regular',
    color: '#666',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'LexendDeca-Regular',
    color: '#999',
    marginHorizontal: 16,
    fontWeight: '500',
  },
  registerSection: {
    alignItems: 'center',
  },
  newUserText: {
    fontSize: 15,
    fontFamily: 'LexendDeca-Regular',
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  registerButton: {
    borderWidth: 1.5,
    borderColor: '#111111',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    backgroundColor: 'white',
    minWidth: 160,
  },
  registerButtonText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
    letterSpacing: 0.5,
  },
});
