// app/index.tsx
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { SERVER_URL } from '../constants/config';
import Loader from './components/Loader';
import Login from './components/Login';

export default function Home() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        const res = await fetch(`${SERVER_URL}/api/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (res.ok) {
          setIsAuthenticated(true);
          router.replace('/dashboard'); // Redirect to dashboard if authenticated
        } else {
          await SecureStore.deleteItemAsync('token');
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        Alert.alert('Error', 'Unable to verify session.');
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkToken();
  }, []);

  // Show loader while checking auth
  if (isCheckingAuth) {
    return <Loader />;
  }

  // If not authenticated, show login screen
  return <Login />;
}
