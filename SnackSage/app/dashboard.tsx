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
  Platform,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';

import { SERVER_URL } from '../constants/config';

const { width } = Dimensions.get('window');

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  const schedulerInterval = useRef<number | null>(null);

  // Request notification permissions and configure
  useEffect(() => {
    configureNotifications();
  }, []);

  // Start notification scheduling on mount
  useEffect(() => {
    fetchData();
    startNotificationScheduler();

    return () => {
      if (schedulerInterval.current) {
        clearInterval(schedulerInterval.current);
      }
    };
  }, []);

  const configureNotifications = async () => {
    try {
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please enable notifications to receive expiration alerts.');
        return;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('expiring-items', {
          name: 'Expiring Items',
          description: 'Notifications for items that are expiring soon',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#374151',
        });
      }
    } catch (error) {
      console.error('Error configuring notifications:', error);
    }
  };

  const startNotificationScheduler = () => {
    // Check every minute to see if it's time to send notifications or clear history
    schedulerInterval.current = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Check for notification times (8:00 AM and 7:00 PM)
      if ((hours === 8 || hours === 19) && minutes === 0) {
        checkExpiringItemsAndNotify();
      }

      // Clear notification history at midnight (12:00 AM)
      if (hours === 0 && minutes === 0) {
        clearNotificationHistoryAutomatically();
      }
    }, 60000); // Check every minute
  };

  const clearNotificationHistoryAutomatically = async () => {
    try {
      notifiedItems.current.clear();
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Notification history automatically cleared at midnight');
    } catch (error) {
      console.error('Error automatically clearing notifications:', error);
    }
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

      if (!response.ok) {
        throw new Error('Failed to fetch expiring items');
      }

      const data = await response.json();

      if (data.expiringSoon && data.expiringSoon.length > 0) {
        const newExpiringItems = data.expiringSoon.filter(
          (item: ExpiringItem) => !notifiedItems.current.has(item._id)
        );

        if (newExpiringItems.length > 0) {
          console.log(`Found ${newExpiringItems.length} new expiring items to notify about`);
          
          for (let i = 0; i < newExpiringItems.length; i++) {
            const item = newExpiringItems[i];
            
            setTimeout(async () => {
              try {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: '⏰ Item Expiring Soon',
                    body: `${item.name} is expiring on ${new Date(item.expirationDate).toLocaleDateString()}`,
                    sound: 'default',
                    data: { 
                      itemId: item._id, 
                      itemName: item.name,
                      type: 'expiring_item'
                    },
                  },
                  trigger: null, // Show immediately
                });
                
                notifiedItems.current.add(item._id);
                console.log(`Notification sent for: ${item.name}`);
              } catch (error) {
                console.error('Error sending notification:', error);
              }
            }, i * 1000); // Stagger notifications by 1 second
          }
        }
      }
    } catch (err) {
      console.error('Notification fetch error:', err);
    }
  };

  const sendTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Test Notification',
          body: 'This is a manual test notification.',
          sound: 'default',
          data: { type: 'test' },
        },
        trigger: null, // Show immediately
      });
      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
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

      await fetchRecommendations(headers);
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
    try {
      if (schedulerInterval.current) {
        clearInterval(schedulerInterval.current);
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      await SecureStore.deleteItemAsync('token');
      router.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
      router.replace('/');
    }
  };

  const handleRecipePress = (recipe: RecipeRecommendation) => {
    router.push(`./recipe-chat?recipeName=${encodeURIComponent(recipe.name)}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderRecipeCard = (recipe: RecipeRecommendation, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.recipeCard}
      onPress={() => handleRecipePress(recipe)}
      activeOpacity={0.8}
    >
      <View style={styles.recipeHeader}>
        <Text style={styles.recipeTitle} numberOfLines={2}>{recipe.name}</Text>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(recipe.difficulty) }]}>
          <Text style={styles.difficultyText}>{recipe.difficulty}</Text>
        </View>
      </View>
      
      <Text style={styles.recipeDescription} numberOfLines={2}>
        {recipe.description}
      </Text>
      
      <View style={styles.recipeStats}>
        <View style={styles.statItem}>
          <Text style={styles.statText}>⏱️ {recipe.cookingTime}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statText}>👥 {recipe.servings} servings</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statText}>⭐ {recipe.healthScore}/10</Text>
        </View>
      </View>

      <View style={styles.ingredientsInfo}>
        <Text style={styles.availableText}>
          Available: {recipe.availableIngredients.length}
        </Text>
        {recipe.missingIngredients.length > 0 && (
          <Text style={styles.missingText}>
            Missing: {recipe.missingIngredients.length}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#374151" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name || 'User'}</Text>
            <Text style={styles.subGreeting}>Welcome back</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Section */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.totalItems}</Text>
                <Text style={styles.statLabel}>Total Items</Text>
              </View>
              
              <View style={[styles.statCard, styles.warningCard]}>
                <Text style={styles.statNumber}>{stats.expiringSoonCount}</Text>
                <Text style={styles.statLabel}>Expiring Soon</Text>
              </View>
              
              <View style={[styles.statCard, styles.dangerCard]}>
                <Text style={styles.statNumber}>{stats.expiredCount}</Text>
                <Text style={styles.statLabel}>Expired</Text>
              </View>
            </View>
          </View>
        )}

        {/* Recipe Recommendations */}
        <View style={styles.recipesSection}>
          <Text style={styles.sectionTitle}>Recipe Suggestions</Text>
          {recommendationsLoading ? (
            <View style={styles.loadingRecommendations}>
              <ActivityIndicator size="small" color="#374151" />
              <Text style={styles.loadingRecommendationsText}>Loading recipes...</Text>
            </View>
          ) : recommendations.length > 0 ? (
            <View style={styles.recipesContainer}>
              {recommendations.map((recipe, index) => renderRecipeCard(recipe, index))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recipe recommendations available</Text>
              <Text style={styles.emptyStateSubtext}>Add items to your pantry to get personalized suggestions</Text>
            </View>
          )}
        </View>

        {/* Notifications Section */}
        <View style={styles.notificationsSection}>
          <TouchableOpacity onPress={sendTestNotification} style={styles.testButton}>
            <Text style={styles.testButtonText}>Send Test Notification</Text>
          </TouchableOpacity>
          
          <View style={styles.notificationInfo}>
            <Text style={styles.infoTitle}>Notification Schedule</Text>
            <Text style={styles.infoText}>• Daily notifications at 8:00 AM and 7:00 PM</Text>
            <Text style={styles.infoText}>• History clears automatically at midnight</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: '#6b7280',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  logoutText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsSection: {
    padding: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
  },
  dangerCard: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  recipesSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  recipesContainer: {
    gap: 12,
  },
  recipeCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  recipeDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  recipeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
  },
  ingredientsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  availableText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  missingText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  loadingRecommendations: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingRecommendationsText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationsSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  testButton: {
    backgroundColor: '#374151',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationInfo: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#374151',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
});