import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';


const SERVER_URL = 'http://192.168.80.179:5000';

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

interface ExpiringItem {
  _id: string;
  name: string;
  category: string;
  expirationDate: string;
  quantity: {
    amount: number;
    unit: string;
  };
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expiringSoon, setExpiringSoon] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);
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

      const expiringRes = await fetch(`${SERVER_URL}/api/items/expiring-soon`, { method: 'GET', headers });
      if (expiringRes.ok) {
        const expiringData = await expiringRes.json();
        setExpiringSoon(expiringData.expiringSoon || []);
      }

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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    fontFamily: 'LexendDeca-Regular',
    marginBottom: 16,
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
