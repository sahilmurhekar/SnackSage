import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';


export default function Dashboard() {
  const handleLogout = () => {
    // Here you can clear auth token or state if using SecureStore/Context
    router.replace('/'); // 👈 Redirect to Login (Homepage)
  };

  return (
    <View style={{
      flex: 1,
      backgroundColor: 'white',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24
    }}>
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 32,
        fontFamily: 'LexendDeca-Regular',
        color: '#111111'
      }}>
        Welcome to Dashboard
      </Text>

      <TouchableOpacity
        onPress={handleLogout}
        style={{
          backgroundColor: '#111111',
          paddingVertical: 16,
          paddingHorizontal: 32,
          borderRadius: 12,
        }}
      >
        <Text style={{
          color: 'white',
          fontSize: 16,
          fontWeight: '600',
          fontFamily: 'LexendDeca-Regular'
        }}>
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
}
