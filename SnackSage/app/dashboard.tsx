import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  Dimensions,
  Animated,
  Modal,
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
  const [dropdownVisible, setDropdownVisible] = useState(false);
  
  const notifiedItems = useRef<Set<string>>(new Set());
  const schedulerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

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
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please enable notifications to receive expiration alerts.');
        return;
      }

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
    schedulerInterval.current = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      if ((hours === 8 || hours === 19) && minutes === 0) {
        checkExpiringItemsAndNotify();
      }

      if (hours === 0 && minutes === 0) {
        clearNotificationHistoryAutomatically();
      }
    }, 60000);
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
                  trigger: null,
                });
                
                notifiedItems.current.add(item._id);
                console.log(`Notification sent for: ${item.name}`);
              } catch (error) {
                console.error('Error sending notification:', error);
              }
            }, i * 1000);
          }
        }
      }
    } catch (err) {
      console.error('Notification fetch error:', err);
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

  const handleProfile = () => {
    setDropdownVisible(false);
    // Navigate to profile page when you have it
    // router.push('./profile');
    Alert.alert('Profile', 'Profile page coming soon!');
  };

  const handleDropdownLogout = () => {
    setDropdownVisible(false);
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: handleLogout,
        },
      ]
    );
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

  // Enhanced interactive donut chart component
  const DonutChart = ({ categoryStats }: { categoryStats: Array<{ _id: string; count: number }> }) => {
    const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
    
    const total = categoryStats.reduce((sum, cat) => sum + cat.count, 0);
    const colors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6'];
    
    const topCategories = categoryStats.slice(0, 4);
    const centerSize = 80;
    
    const handleSegmentPress = (index: number) => {
      setSelectedSegment(selectedSegment === index ? null : index);
    };
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Pantry Distribution</Text>
        <View style={styles.donutChartWrapper}>
          <View style={styles.donutChart}>
            <View 
              style={[
                styles.donutCenter, 
                { 
                  width: centerSize, 
                  height: centerSize, 
                  borderRadius: centerSize / 2,
                }
              ]}
            >
              <Text style={styles.totalItemsText}>
                {selectedSegment !== null ? topCategories[selectedSegment].count : total}
              </Text>
              <Text style={styles.totalItemsLabel}>
                {selectedSegment !== null ? topCategories[selectedSegment]._id : 'items'}
              </Text>
            </View>
          </View>
          
          {/* Interactive Legend */}
          <View style={styles.chartLegend}>
            {topCategories.map((category, index) => (
              <TouchableOpacity 
                key={category._id} 
                style={[
                  styles.legendItem,
                  selectedSegment === index && styles.selectedLegendItem
                ]}
                onPress={() => handleSegmentPress(index)}
              >
                <View 
                  style={[
                    styles.legendColor, 
                    { 
                      backgroundColor: colors[index % colors.length],
                    }
                  ]} 
                />
                <Text style={[
                  styles.legendText,
                  selectedSegment === index && styles.selectedLegendText
                ]}>
                  {category._id.charAt(0).toUpperCase() + category._id.slice(1)} ({category.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderMediumRecipeCard = (recipe: RecipeRecommendation, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.mediumRecipeCard}
      onPress={() => handleRecipePress(recipe)}
      activeOpacity={0.8}
    >
      <View style={styles.recipeCardHeader}>
        <Text style={styles.mediumRecipeTitle} numberOfLines={2}>{recipe.name}</Text>
        <View style={[styles.mediumDifficultyBadge, { backgroundColor: getDifficultyColor(recipe.difficulty) }]}>
          <Text style={styles.mediumDifficultyText}>{recipe.difficulty}</Text>
        </View>
      </View>
      
      <Text style={styles.mediumRecipeDescription} numberOfLines={3}>
        {recipe.description}
      </Text>
      
      <View style={styles.mediumRecipeInfo}>
        <View style={styles.mediumInfoItem}>
          <Text style={styles.mediumInfoIcon}>⏱️</Text>
          <Text style={styles.mediumInfoText}>{recipe.cookingTime}</Text>
        </View>
        <View style={styles.mediumInfoItem}>
          <Text style={styles.mediumInfoIcon}>👥</Text>
          <Text style={styles.mediumInfoText}>{recipe.servings}</Text>
        </View>
        <View style={styles.mediumInfoItem}>
          <Text style={styles.mediumInfoIcon}>⭐</Text>
          <Text style={styles.mediumInfoText}>{recipe.healthScore}/10</Text>
        </View>
      </View>
      
      <View style={styles.mediumIngredientInfo}>
        <View style={styles.mediumIngredientBadge}>
          <Text style={styles.mediumIngredientBadgeText}>✓ {recipe.availableIngredients.length} available</Text>
        </View>
        {recipe.missingIngredients.length > 0 && (
          <View style={[styles.mediumIngredientBadge, styles.mediumMissingIngredientBadge]}>
            <Text style={[styles.mediumIngredientBadgeText, styles.mediumMissingIngredientText]}>
              × {recipe.missingIngredients.length} missing
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111111" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Compact Header with Dropdown */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hi, {user?.name || 'User'}!</Text>
            <Text style={styles.subGreeting}>Your kitchen at a glance</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setDropdownVisible(true)} 
            style={styles.menuButton}
          >
            <Text style={styles.menuText}>•••</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={handleProfile}
            >
              <Text style={styles.dropdownItemIcon}>👤</Text>
              <Text style={styles.dropdownItemText}>Profile</Text>
            </TouchableOpacity>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={handleDropdownLogout}
            >
              <Text style={styles.dropdownItemIcon}>🚪</Text>
              <Text style={[styles.dropdownItemText, styles.logoutItemText]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >

        {/* Compact Stats & Chart in one row */}
        {stats && (
          <View style={styles.statsChartSection}>
            <Text style={styles.sectionTitle}>Inventory Details</Text>
            {/* Enhanced Chart */}
            {stats.categoryStats && stats.categoryStats.length > 0 && (
              <DonutChart categoryStats={stats.categoryStats} />
            )}
            
            <View style={styles.inventoryStatsGrid}>
              <View style={styles.inventoryStatCard}>
                <Text style={styles.inventoryStatNumber}>{stats.totalItems}</Text>
                <Text style={styles.inventoryStatLabel}>Total Items</Text>
              </View>
              
              <View style={[styles.inventoryStatCard, styles.warningCard]}>
                <Text style={styles.inventoryStatNumber}>{stats.expiringSoonCount}</Text>
                <Text style={styles.inventoryStatLabel}>Expiring Soon</Text>
              </View>
              
              <View style={[styles.inventoryStatCard, styles.dangerCard]}>
                <Text style={styles.inventoryStatNumber}>{stats.expiredCount}</Text>
                <Text style={styles.inventoryStatLabel}>Expired</Text>
              </View>
            </View>
          </View>
        )}


        {/* Recipe Recommendations */}
        <View style={styles.recipesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recipe Suggestions</Text>
            <TouchableOpacity 
              onPress={() => fetchRecommendations()}
              style={styles.reloadButton}
            >
              <Text style={styles.reloadIcon}>↻</Text>
            </TouchableOpacity>
          </View>
          
          {recommendationsLoading ? (
            <View style={styles.loadingRecommendations}>
              <ActivityIndicator size="small" color="#111" />
              <Text style={styles.loadingRecommendationsText}>Loading...</Text>
            </View>
          ) : recommendations.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recipesScrollContainer}
            >
              {recommendations.slice(0, 5).map((recipe: RecipeRecommendation, index: number) => renderMediumRecipeCard(recipe, index))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recipes yet</Text>
              <Text style={styles.emptyStateSubtext}>Add pantry items to get suggestions</Text>
            </View>
          )}
        </View>

        

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={styles.floatingButtonsContainer}>
        <TouchableOpacity 
          style={[styles.floatingButton, styles.secondaryFloatingButton]}
          onPress={() => router.push('./inventory')}
          activeOpacity={0.7}
        >
          <Image 
    source={{ uri: 'https://img.icons8.com/?size=100&id=107714&format=png&color=000000' }} 
    style={styles.iconImage}
  />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.floatingButton, styles.primaryFloatingButton]}
          onPress={() => router.push('./add-item')}
          activeOpacity={0.7}
        >
          <Text style={styles.floatingButtonIcon}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  iconImage: {
  width: 24,
  height: 24,
  tintColor: '#fff', // Optional: Apply color tint if the image supports it (monochrome)
},
  subGreeting: {
    fontSize: 14,
    color: '#64748b',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  
  // Dropdown Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 50,
    paddingRight: 20,
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  logoutItemText: {
    color: '#dc2626',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },

  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },

  // Floating Button Styles
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
    gap: 12,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryFloatingButton: {
    backgroundColor: '#111111',
  },
  secondaryFloatingButton: {
    backgroundColor: '#FF7900',
    borderWidth: 1,
    borderColor: '#FF7900',
  },
  floatingButtonIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  secondaryFloatingButtonIcon: {
    fontSize: 24,
    color: '#1e293b',
  },

  statsChartSection: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 10,
  },
  inventoryStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  inventoryStatCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
  },
  dangerCard: {
    backgroundColor: '#fee2e2',
    borderColor: '#f87171',
  },
  inventoryStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  inventoryStatLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  
  // Enhanced Chart Styles
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 15,
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  donutChartWrapper: {
    alignItems: 'center',
  },
  donutChart: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  donutCenter: {
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  totalItemsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  totalItemsLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  donutSegment: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 15,
    borderColor: 'transparent',
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectedLegendItem: {
    backgroundColor: '#f8fafc',
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    color: '#64748b',
  },
  selectedLegendText: {
    fontWeight: '600',
    color: '#1e293b',
  },

  // Recipe Section Styles
  recipesSection: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  seeAllText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  reloadButton: {
    marginTop: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingBottom: 8,
    borderColor: '#e2e8f0',
  },
  reloadIcon: {
    fontSize: 22,
    color: '#64748b',
    fontWeight: 'bold',
  },
  recipesScrollContainer: {
    paddingRight: 20,
    paddingLeft: 10,
    paddingBottom: 10,
  },
  mediumRecipeCard: {
    backgroundColor: '#ffffff',
    width: width * 0.8,
    padding: 18,
    borderRadius: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 5,
  },
  recipeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mediumRecipeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  mediumDifficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediumDifficultyText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  mediumRecipeDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 14,
  },
  mediumRecipeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  mediumInfoItem: {
    alignItems: 'center',
    flex: 1,
  },
  mediumInfoIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  mediumInfoText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  mediumIngredientInfo: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  mediumIngredientBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  mediumMissingIngredientBadge: {
    backgroundColor: '#fee2e2',
  },
  mediumIngredientBadgeText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  mediumMissingIngredientText: {
    color: '#dc2626',
  },
  loadingRecommendations: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingRecommendationsText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 100, // Increased to accommodate floating buttons
  },
});