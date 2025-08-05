import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import PushNotification, { Importance } from 'react-native-push-notification';

import { SERVER_URL } from '../constants/config';

const { width: screenWidth } = Dimensions.get('window');

interface User {
  name: string;
  userId: string;
}

interface DashboardStats {
  totalItems: number;
  expiringSoonCount: number;
  expiredCount: number;
  categoryStats: Array<{ _id: string; count: number }>;
  recentItemsCount: number;
}

interface RecipeRecommendation {
  name: string;
  description: string;
  mainIngredients: string[];
  cookingTime: string;
  difficulty: string;
  cuisine: string;
  healthScore: number;
  servings: number;
  availableIngredients: string[];
  missingIngredients: string[];
}

interface ExpiringItem {
  _id: string;
  name: string;
  expirationDate: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recommendations, setRecommendations] = useState<RecipeRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const notifiedItems = useRef<Set<string>>(new Set());
  const notificationInterval = useRef<number | null>(null);

  // Initialize Push Notifications
  useEffect(() => {
    configurePushNotifications();
  }, []);

  // Start notification checking on mount
  useEffect(() => {
    fetchData();
    startPeriodicNotificationCheck();

    return () => {
      if (notificationInterval.current) {
        clearInterval(notificationInterval.current);
      }
    };
  }, []);

  const configurePushNotifications = () => {
    // Configure the notification settings
    PushNotification.configure({
      // Called when token is generated (iOS and Android)
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },

      // Called when a remote is received or opened, or local notification is opened
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },

      // Should the initial notification be popped automatically
      popInitialNotification: true,

      // (Optional) Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called (Android)
      onAction: function (notification) {
        console.log('ACTION:', notification.action);
        console.log('NOTIFICATION:', notification);
      },

      // (optional) Called when the user fails to register for remote notifications
      onRegistrationError: function(err) {
        console.error(err.message, err);
      },

      // IOS ONLY (optional): default: all - Permissions to register
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'expiring-items-channel',
          channelName: 'Expiring Items',
          channelDescription: 'Notifications for items that are expiring soon',
          playSound: true,
          soundName: 'default',
          importance: Importance.HIGH,
          vibrate: true,
        },
        (created) => console.log(`Channel created: ${created}`)
      );
    }
  };

  const startPeriodicNotificationCheck = () => {
    checkExpiringItemsAndNotify();
    
    notificationInterval.current = setInterval(() => {
      checkExpiringItemsAndNotify();
    }, 5000);
  };

  const checkExpiringItemsAndNotify = async () => {
    const token = await SecureStore.getItemAsync('token');
    if (!token) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/items/expiring-soon`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.expiringSoon && data.expiringSoon.length > 0) {
        const newExpiringItems = data.expiringSoon.filter(
          (item: ExpiringItem) => !notifiedItems.current.has(item._id)
        );

        if (newExpiringItems.length > 0) {
          console.log(`Found ${newExpiringItems.length} new expiring items to notify about`);
          
          newExpiringItems.forEach((item: ExpiringItem, index: number) => {
            setTimeout(() => {
              PushNotification.localNotification({
                channelId: 'expiring-items-channel', // Android only
                title: '⏰ Item Expiring Soon',
                message: `${item.name} is expiring on ${new Date(item.expirationDate).toLocaleDateString()}`,
                playSound: true,
                soundName: 'default',
                actions: ['View Item'],
                userInfo: { itemId: item._id, itemName: item.name },
              });
              
              notifiedItems.current.add(item._id);
              console.log(`Notification sent for: ${item.name}`);
            }, index * 1000);
          });
        } else {
          console.log('No new expiring items to notify about');
        }
      }
    } catch (err) {
      console.error('Notification fetch error:', err);
    }
  };

  const sendTestNotification = () => {
    PushNotification.localNotification({
      channelId: 'expiring-items-channel',
      title: '🔔 Test Notification',
      message: 'This is a manual test notification using react-native-push-notification.',
      playSound: true,
      soundName: 'default',
    });
  };

  const clearNotificationHistory = () => {
    notifiedItems.current.clear();
    // Clear all scheduled notifications
    PushNotification.cancelAllLocalNotifications();
    console.log('Notification history cleared');
    Alert.alert('Success', 'Notification history cleared. You will receive notifications for expiring items again.');
  };

  const fetchData = async () => {
    try {
      let token = await SecureStore.getItemAsync('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const userRes = await fetch(`${SERVER_URL}/api/me`, { method: 'GET', headers });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      } else {
        throw new Error('Authentication failed');
      }

      const statsRes = await fetch(`${SERVER_URL}/api/items/dashboard-stats`, { method: 'GET', headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      fetchRecommendations(headers);
    } catch (err: any) {
      if (err.message.includes('Authentication failed')) {
        await SecureStore.deleteItemAsync('token');
        router.replace('/');
      } else {
        Alert.alert('Error', 'Could not load data.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRecommendations = async (headers?: any) => {
    try {
      setRecommendationsLoading(true);
      if (!headers) {
        const token = await SecureStore.getItemAsync('token');
        headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
      }

      const recRes = await fetch(`${SERVER_URL}/api/recipes/recommendations`, {
        method: 'GET',
        headers
      });

      if (recRes.ok) {
        const recData = await recRes.json();
        setRecommendations(recData.recommendations || []);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = async () => {
    if (notificationInterval.current) {
      clearInterval(notificationInterval.current);
    }
    // Cancel all notifications on logout
    PushNotification.cancelAllLocalNotifications();
    await SecureStore.deleteItemAsync('token');
    router.replace('/');
  };

  const handleRecipePress = (recipe: RecipeRecommendation) => {
    router.push(`./recipe-chat?recipeName=${encodeURIComponent(recipe.name)}`);
  };

  const renderRecipeCard = (recipe: RecipeRecommendation, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.recipeCard}
      onPress={() => handleRecipePress(recipe)}
      activeOpacity={0.8}
    >
      <Text style={{ fontWeight: 'bold' }}>{recipe.name}</Text>
      <Text>{recipe.description}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerContent}>
        <Text style={styles.greeting}>Hello, {user?.name || 'User'} 👋</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>AI Recipe Suggestions</Text>
      {recommendationsLoading ? (
        <ActivityIndicator size="small" color="#111" />
      ) : (
        recommendations.map((recipe, index) => renderRecipeCard(recipe, index))
      )}

      <TouchableOpacity
        onPress={sendTestNotification}
        style={styles.testButton}
      >
        <Text style={styles.testButtonText}>Send Test Notification (RN Push)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={clearNotificationHistory}
        style={[styles.testButton, { backgroundColor: '#dc3545' }]}
      >
        <Text style={styles.testButtonText}>Clear Notification History</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 80,
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  headerContent: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  logoutText: {
    fontSize: 14,
    color: 'red',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  recipeCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  testButton: {
    backgroundColor: '#111',
    margin: 20,
    padding: 12,
    borderRadius: 10,
  },
  testButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});