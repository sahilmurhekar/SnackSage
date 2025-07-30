// frontend/app/inventory.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import HeaderWithBack from './components/HeaderWithBack';

interface Item {
  _id: string;
  name: string;
  category: string;
  quantity: {
    amount: number;
    unit: string;
  };
  expirationDate: string;
  isUsed: boolean;
  notes: string;
}

export default function Inventory() {
  const [inventory, setInventory] = useState<{ [category: string]: Item[] }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInventory = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        router.replace('/');
        return;
      }
      const response = await fetch('http://192.168.80.179:5000/api/items/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setInventory(data.inventory);
      } else {
        throw new Error(data.message || 'Failed to fetch inventory');
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      Alert.alert('Error', 'Could not fetch inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInventory();
  };

  const handleDeleteItem = async (itemId: string) => {
    const token = await SecureStore.getItemAsync('token');
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      const response = await fetch(`http://192.168.80.179:5000/api/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Item deleted successfully');
        fetchInventory();
      } else {
        throw new Error(data.message || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Could not delete item');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <HeaderWithBack title="Your Inventory" />

      {Object.entries(inventory).map(([category, items]) => (
        <View key={category} style={styles.categoryContainer}>
          <Text style={styles.categoryTitle}>{category}</Text>

          {items.map((item) => (
            <View key={item._id} style={styles.itemCard}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDetails}>
                {item.quantity.amount} {item.quantity.unit} | Exp: {new Date(item.expirationDate).toLocaleDateString()}
              </Text>
              <Text style={styles.itemNotes}>{item.notes}</Text>

              <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => handleDeleteItem(item._id)} style={styles.actionButton}>
                  <Text style={styles.actionText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  categoryContainer: {
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  itemCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  itemNotes: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  itemActions: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
  },
  title: {
    display: 'none', // removed for HeaderWithBack
  },
});
