// inventory.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, RefreshControl, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import HeaderWithBack from './components/HeaderWithBack';
import {SERVER_URL} from '../constants/config';

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
  const [filteredInventory, setFilteredInventory] = useState<{ [category: string]: Item[] }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'expiring' | 'expired'>('all');

  const fetchInventory = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${SERVER_URL}/api/items/inventory`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setInventory(data.inventory);
        setFilteredInventory(data.inventory);
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

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedFilter, inventory]);

  const applyFilters = () => {
    let filtered = { ...inventory };

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = Object.keys(filtered).reduce((acc, category) => {
        const filteredItems = filtered[category].filter(item =>
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.notes.toLowerCase().includes(query)
        );
        if (filteredItems.length > 0) {
          acc[category] = filteredItems;
        }
        return acc;
      }, {} as { [category: string]: Item[] });
    }

    // Apply status filter
    if (selectedFilter !== 'all') {
      filtered = Object.keys(filtered).reduce((acc, category) => {
        const filteredItems = filtered[category].filter(item => {
          if (selectedFilter === 'expired') {
            return isExpired(item.expirationDate);
          } else if (selectedFilter === 'expiring') {
            return !isExpired(item.expirationDate) && isExpiringSoon(item.expirationDate);
          }
          return true;
        });
        if (filteredItems.length > 0) {
          acc[category] = filteredItems;
        }
        return acc;
      }, {} as { [category: string]: Item[] });
    }

    setFilteredInventory(filtered);
  };

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
              const response = await fetch(`${SERVER_URL}/api/items/${itemId}`, {
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

  const getStatusColor = (expirationDate: string) => {
    if (isExpired(expirationDate)) return '#ef4444';
    if (isExpiringSoon(expirationDate)) return '#f59e0b';
    return '#10b981';
  };

  const getStatusText = (expirationDate: string) => {
    if (isExpired(expirationDate)) return 'EXPIRED';
    if (isExpiringSoon(expirationDate)) return 'EXPIRING SOON';
    return 'FRESH';
  };

  const getTotalItems = () => {
    return Object.values(filteredInventory).reduce((total, items) => total + items.length, 0);
  };

  const CategoryIcon = ({ category }: { category: string }) => {
    const icons: { [key: string]: string } = {
      vegetables: '🥬',
      fruits: '🍎',
      dairy: '🥛',
      meat: '🥩',
      grains: '🌾',
      pantry: '🥫',
      spices: '🧂',
      beverages: '🥤',
      frozen: '❄️',
      canned: '🥫',
      other: '📦'
    };
    return <Text style={styles.categoryIcon}>{icons[category] || icons.other}</Text>;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderWithBack/>

      {/* Header Stats */}
      <View style={styles.headerStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{getTotalItems()}</Text>
          <Text style={styles.statLabel}>Items</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{Object.keys(filteredInventory).length}</Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchAndFilters}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search items, categories, notes..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'all' && styles.activeFilter]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterText, selectedFilter === 'all' && styles.activeFilterText]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'expiring' && styles.activeFilter]}
            onPress={() => setSelectedFilter('expiring')}
          >
            <Text style={[styles.filterText, selectedFilter === 'expiring' && styles.activeFilterText]}>
              Expiring Soon
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'expired' && styles.activeFilter]}
            onPress={() => setSelectedFilter('expired')}
          >
            <Text style={[styles.filterText, selectedFilter === 'expired' && styles.activeFilterText]}>
              Expired
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {Object.keys(filteredInventory).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedFilter !== 'all' 
                ? 'No items match your search'
                : 'No items in your inventory'
              }
            </Text>
            <Text style={styles.emptySubText}>
              {searchQuery || selectedFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add some items to get started'
              }
            </Text>
            {!searchQuery && selectedFilter === 'all' && (
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => router.push('./add-item')}
              >
                <Text style={styles.addButtonText}>Add Your First Item</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          Object.entries(filteredInventory).map(([category, items]) => (
            <View key={category} style={styles.categoryContainer}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleContainer}>
                  <CategoryIcon category={category} />
                  <Text style={styles.categoryTitle}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </View>
                <View style={styles.categoryCount}>
                  <Text style={styles.categoryCountText}>{items.length}</Text>
                </View>
              </View>
              
              <View style={styles.itemsGrid}>
                {items.map((item) => {
                  const expired = isExpired(item.expirationDate);
                  const expiringSoon = !expired && isExpiringSoon(item.expirationDate);
                  
                  return (
                    <View key={item._id} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.expirationDate) }]} />
                      </View>
                      
                      <Text style={styles.itemQuantity}>
                        {item.quantity.amount} {item.quantity.unit}
                      </Text>
                      
                      <Text style={styles.itemExpiry}>
                        Exp: {new Date(item.expirationDate).toLocaleDateString()}
                      </Text>

                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.expirationDate) }]}>
                        <Text style={styles.statusText}>{getStatusText(item.expirationDate)}</Text>
                      </View>
                      
                      {item.notes && (
                        <Text style={styles.itemNotes} numberOfLines={2}>{item.notes}</Text>
                      )}

                      <View style={styles.itemActions}>
                        <TouchableOpacity 
                          onPress={() => handleEditItem(item._id)} 
                          style={styles.editButton}
                        >
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          onPress={() => handleDeleteItem(item._id)} 
                          style={styles.deleteButton}
                        >
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity 
        style={styles.floatingAddButton}
        onPress={() => router.push('./add-item')}
      >
        <Text style={styles.floatingAddButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    fontFamily: 'LexendDeca-Regular',
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingBottom: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    fontFamily: 'LexendDeca-Regular',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    fontFamily: 'LexendDeca-Regular',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 20,
  },
  searchAndFilters: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    fontFamily: 'LexendDeca-Regular',
  },
  clearSearch: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 16,
    color: '#64748b',
  },
  filtersContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    marginRight: 12,
  },
  activeFilter: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  filterText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    fontFamily: 'LexendDeca-Regular',
  },
  activeFilterText: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'LexendDeca-Regular',
  },
  emptySubText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontFamily: 'LexendDeca-Regular',
  },
  addButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
  categoryContainer: {
    marginTop: 16,
    paddingHorizontal: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    fontFamily: 'LexendDeca-Regular',
  },
  categoryCount: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'LexendDeca-Regular',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
    fontFamily: 'LexendDeca-Regular',
  },
  itemExpiry: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    fontFamily: 'LexendDeca-Regular',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
  itemNotes: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 16,
    fontFamily: 'LexendDeca-Regular',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    backgroundColor: '#111827',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingAddButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },
});