// Update your /frontend/app/inventory.tsx

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

  const handleEditItem = (itemId: string) => {
    router.push(`./edit-item?itemId=${itemId}`);
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
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
          }
        }
      ]
    );
  };

  const isExpiringSoon = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
    return expDate <= threeDaysFromNow && expDate >= today;
  };

  const isExpired = (expirationDate: string) => {
    return new Date(expirationDate) < new Date();
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

      {Object.keys(inventory).length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No items in your inventory</Text>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => router.push('./add-item')}
          >
            <Text style={styles.addButtonText}>Add Your First Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        Object.entries(inventory).map(([category, items]) => (
          <View key={category} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>
              {category.charAt(0).toUpperCase() + category.slice(1)} ({items.length})
            </Text>
            
            {items.map((item) => {
              const expired = isExpired(item.expirationDate);
              const expiringSoon = !expired && isExpiringSoon(item.expirationDate);
              
              return (
                <View 
                  key={item._id} 
                  style={[
                    styles.itemCard,
                    expired && styles.expiredCard,
                    expiringSoon && styles.expiringSoonCard
                  ]}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {expired && <Text style={styles.statusBadge}>EXPIRED</Text>}
                    {expiringSoon && <Text style={styles.warningBadge}>EXPIRING SOON</Text>}
                  </View>
                  
                  <Text style={styles.itemDetails}>
                    {item.quantity.amount} {item.quantity.unit} | Exp: {new Date(item.expirationDate).toLocaleDateString()}
                  </Text>
                  
                  {item.notes && (
                    <Text style={styles.itemNotes}>{item.notes}</Text>
                  )}

                  <View style={styles.itemActions}>
                    <TouchableOpacity 
                      onPress={() => handleEditItem(item._id)} 
                      style={[styles.actionButton, styles.editButton]}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => handleDeleteItem(item._id)} 
                      style={[styles.actionButton, styles.deleteButton]}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ))
      )}

      <View style={styles.bottomSpacing} />
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'LexendDeca-Regular',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#111',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'LexendDeca-Regular',
    fontWeight: '600',
  },
  categoryContainer: {
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    fontFamily: 'LexendDeca-Regular',
  },
  itemCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  expiredCard: {
    backgroundColor: '#fee',
    borderColor: '#fbb',
  },
  expiringSoonCard: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    fontFamily: 'LexendDeca-Regular',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#dc3545',
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  warningBadge: {
    backgroundColor: '#fd7e14',
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'LexendDeca-Regular',
  },
  itemNotes: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
    fontStyle: 'italic',
    fontFamily: 'LexendDeca-Regular',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007BFF',
    borderWidth: 1,
    borderColor: '#007BFF',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
  deleteButtonText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
  bottomSpacing: {
    height: 20,
  },
});