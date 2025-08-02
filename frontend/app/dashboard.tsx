import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import {SERVER_URL} from '../constants/config'; // Adjust the import path as necessary
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

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recommendations, setRecommendations] = useState<RecipeRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

      // Fetch user data
      const userRes = await fetch(`${SERVER_URL}/api/me`, { method: 'GET', headers });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      } else {
        throw new Error('Authentication failed');
      }

      // Fetch dashboard stats
      const statsRes = await fetch(`${SERVER_URL}/api/items/dashboard-stats`, { method: 'GET', headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch recipe recommendations
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

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('token');
    router.replace('/');
  };

  const handleRecipePress = (recipe: RecipeRecommendation) => {
    router.push(`./recipe-chat?recipeName=${encodeURIComponent(recipe.name)}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return '#28a745';
      case 'medium': return '#ffc107';
      case 'hard': return '#dc3545';
      default: return '#6c757d';
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
        <Text style={styles.recipeName} numberOfLines={2}>{recipe.name}</Text>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(recipe.difficulty) }]}>
          <Text style={styles.difficultyText}>{recipe.difficulty}</Text>
        </View>
      </View>
      
      <Text style={styles.recipeDescription} numberOfLines={3}>
        {recipe.description}
      </Text>
      
      <View style={styles.recipeDetails}>
        <Text style={styles.recipeTime}>⏱️ {recipe.cookingTime}</Text>
        <Text style={styles.recipeCuisine}>🍽️ {recipe.cuisine}</Text>
      </View>
      
      <View style={styles.ingredientsSection}>
        <Text style={styles.ingredientsTitle}>Available: {recipe.availableIngredients.length}/{recipe.mainIngredients.length}</Text>
        <Text style={styles.ingredientsList} numberOfLines={2}>
          {recipe.availableIngredients.slice(0, 3).join(', ')}
          {recipe.availableIngredients.length > 3 && '...'}
        </Text>
      </View>
      
      <View style={styles.recipeFooter}>
        <Text style={styles.healthScore}>Health Score: {recipe.healthScore}/10</Text>
        <Text style={styles.servings}>Serves {recipe.servings}</Text>
      </View>
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
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'User'} 👋</Text>
          <Text style={styles.subGreeting}>Welcome to SnackSage</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('./add-item')}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionText}>Add Items</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('./inventory')}>
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionText}>View Inventory</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recipe Recommendations Carousel */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI Recipe Suggestions</Text>
          {recommendationsLoading && <ActivityIndicator size="small" color="#111" />}
        </View>
        
        {recommendations.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContainer}
          >
            {recommendations.map((recipe, index) => renderRecipeCard(recipe, index))}
          </ScrollView>
        ) : (
          <View style={styles.noRecommendations}>
            <Text style={styles.noRecommendationsText}>
              {recommendationsLoading 
                ? 'Generating personalized recipes...' 
                : 'Add items to your inventory to get recipe suggestions!'
              }
            </Text>
            {!recommendationsLoading && (
              <TouchableOpacity 
                style={styles.addItemsButton} 
                onPress={() => router.push('./add-item')}
              >
                <Text style={styles.addItemsButtonText}>Add Items</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Inventory Overview */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventory Overview</Text>
          <View style={styles.statsContainer}>
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
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.recentItemsCount}</Text>
              <Text style={styles.statLabel}>Added This Week</Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 20 }} />
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
    fontFamily: 'LexendDeca-Regular',
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    fontFamily: 'LexendDeca-Regular',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'LexendDeca-Regular',
  },
  logoutButton: {
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 14,
    color: 'white',
    fontFamily: 'LexendDeca-Regular',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    fontFamily: 'LexendDeca-Regular',
    marginBottom:10
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    fontFamily: 'LexendDeca-Regular',
    textAlign: 'center',
  },
  carouselContainer: {
    paddingLeft: 0,
    paddingRight: 24,
  },
  recipeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: screenWidth * 0.75,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    fontFamily: 'LexendDeca-Regular',
    flex: 1,
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'LexendDeca-Regular',
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'LexendDeca-Regular',
    marginBottom: 12,
    lineHeight: 20,
  },
  recipeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recipeTime: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'LexendDeca-Regular',
  },
  recipeCuisine: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'LexendDeca-Regular',
  },
  ingredientsSection: {
    marginBottom: 12,
  },
  ingredientsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
    fontFamily: 'LexendDeca-Regular',
    marginBottom: 4,
  },
  ingredientsList: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'LexendDeca-Regular',
  },
  recipeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthScore: {
    fontSize: 11,
    color: '#28a745',
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
  servings: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'LexendDeca-Regular',
  },
  noRecommendations: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  noRecommendationsText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'LexendDeca-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  addItemsButton: {
    backgroundColor: '#111',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addItemsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
  },
  dangerCard: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    fontFamily: 'LexendDeca-Regular',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'LexendDeca-Regular',
    textAlign: 'center',
  },
});