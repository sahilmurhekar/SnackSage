import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SERVER_URL } from '../constants/config';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // <-- NEW STATE

  const handlePasswordReset = async () => {
    if (!email || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsSubmitting(true); // <-- START LOADING

    try {
      const response = await fetch(`${SERVER_URL}/api/reset-password`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.message || 'Password updated successfully', [
          { text: 'OK', onPress: () => router.replace('/') }
        ]);
      } else {
        Alert.alert('Failed', data.message || 'Something went wrong');
      }
    } catch (err) {
      console.error('Reset error:', err);
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setIsSubmitting(false); // <-- END LOADING
    }
  };

  return (
    <View style={{
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: 'center',
      backgroundColor: 'white'
    }}>
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'LexendDeca-Regular',
        marginBottom: 32,
        textAlign: 'center',
        color: '#111111'
      }}>
        Reset Password
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          fontSize: 16,
          backgroundColor: '#fafafa',
          fontFamily: 'LexendDeca-Regular'
        }}
      />

      {/* New Password */}
      <View style={{ position: 'relative', marginBottom: 16 }}>
        <TextInput
          placeholder="New Password"
          placeholderTextColor="#888"
          secureTextEntry={!showNewPassword}
          value={newPassword}
          onChangeText={setNewPassword}
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 12,
            padding: 16,
            paddingRight: 50,
            fontSize: 16,
            backgroundColor: '#fafafa',
            fontFamily: 'LexendDeca-Regular'
          }}
        />
        <TouchableOpacity
          onPress={() => setShowNewPassword(!showNewPassword)}
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: [{ translateY: -10 }],
            width: 24,
            height: 24,
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Text style={{ fontSize: 16 }}>
            {showNewPassword ? '🙈' : '👁️'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Confirm Password */}
      <View style={{ position: 'relative', marginBottom: 16 }}>
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor="#888"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 12,
            padding: 16,
            paddingRight: 50,
            fontSize: 16,
            backgroundColor: '#fafafa',
            fontFamily: 'LexendDeca-Regular'
          }}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: [{ translateY: -10 }],
            width: 24,
            height: 24,
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Text style={{ fontSize: 16 }}>
            {showConfirmPassword ? '🙈' : '👁️'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handlePasswordReset}
        disabled={isSubmitting}
        style={{
          backgroundColor: '#111111',
          paddingVertical: 16,
          borderRadius: 12,
          alignItems: 'center',
          marginTop: 12,
          opacity: isSubmitting ? 0.6 : 1 // <-- VISUAL DISABLE
        }}
      >
        <Text style={{
          color: 'white',
          fontSize: 16,
          fontFamily: 'LexendDeca-Regular',
          fontWeight: '600'
        }}>
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
