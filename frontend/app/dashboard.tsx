import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export default function Dashboard() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      // Try the standard method first
      let token: string | null = null;
      
      try {
        token = await SecureStore.getItemAsync('token');
      } catch (error) {
        console.warn('getItemAsync failed:', error);
      }

      if (!token) {
        router.replace('/'); // Not logged in
        return;
      }

      const res = await fetch('http://172.16.35.42:5000/api/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        // Clear token and redirect on auth failure
        try {
          await SecureStore.deleteItemAsync('token');
        } catch (error) {
          console.warn('Failed to delete token:', error);
        }
        router.replace('/');
      }
    } catch (err) {
      console.error('Error in fetchUser:', err);
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    } catch (error) {
      console.warn('Error during logout cleanup:', error);
    } finally {
      router.replace('/');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

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
        Hello {user?.name || 'User'} 👋
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