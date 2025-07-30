import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';
import HeaderWithBack from './components/HeaderWithBack'; // 👈 Import the reusable header

interface ItemData {
  name: string;
  category: string;
  quantity: {
    amount: number;
    unit: string;
  };
  expirationDate: Date;
  notes: string;
}

export default function AddItem() {
  const [itemData, setItemData] = useState<ItemData>({
    name: '',
    category: 'other',
    quantity: {
      amount: 1,
      unit: 'pieces'
    },
    expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    notes: ''
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { label: 'Vegetables', value: 'vegetables' },
    { label: 'Fruits', value: 'fruits' },
    { label: 'Dairy', value: 'dairy' },
    { label: 'Meat', value: 'meat' },
    { label: 'Grains', value: 'grains' },
    { label: 'Pantry', value: 'pantry' },
    { label: 'Spices', value: 'spices' },
    { label: 'Beverages', value: 'beverages' },
    { label: 'Frozen', value: 'frozen' },
    { label: 'Canned', value: 'canned' },
    { label: 'Other', value: 'other' }
  ];

  const units = [
    'pieces', 'kg', 'g', 'lb', 'oz', 'l', 'ml',
    'cups', 'tbsp', 'tsp', 'packets', 'cans', 'bottles'
  ];

  const handleSubmit = async () => {
    if (!itemData.name.trim()) {
      Alert.alert('Error', 'Please enter item name');
      return;
    }

    if (itemData.quantity.amount <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch('http://192.168.80.179:5000/api/items/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(itemData)
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Item added successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to add item');
      }
    } catch (error) {
      console.error('Add item error:', error);
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setItemData({ ...itemData, expirationDate: selectedDate });
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <HeaderWithBack title="Add New Item" /> {/* 👈 Reusable header used here */}

      <View style={styles.form}>
        {/* Item Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter item name"
            placeholderTextColor="#888"
            value={itemData.name}
            onChangeText={(text) => setItemData({ ...itemData, name: text })}
          />
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryButton,
                    itemData.category === cat.value && styles.selectedCategory
                  ]}
                  onPress={() => setItemData({ ...itemData, category: cat.value })}
                >
                  <Text style={[
                    styles.categoryText,
                    itemData.category === cat.value && styles.selectedCategoryText
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Quantity */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quantity *</Text>
          <View style={styles.quantityContainer}>
            <View style={styles.amountContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() =>
                  setItemData({
                    ...itemData,
                    quantity: {
                      ...itemData.quantity,
                      amount: Math.max(0.1, itemData.quantity.amount - 1)
                    }
                  })}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.quantityInput}
                value={itemData.quantity.amount.toString()}
                onChangeText={(text) => {
                  const amount = parseFloat(text) || 0;
                  setItemData({
                    ...itemData,
                    quantity: { ...itemData.quantity, amount }
                  });
                }}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() =>
                  setItemData({
                    ...itemData,
                    quantity: {
                      ...itemData.quantity,
                      amount: itemData.quantity.amount + 1
                    }
                  })}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.unitContainer}>
                {units.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitButton,
                      itemData.quantity.unit === unit && styles.selectedUnit
                    ]}
                    onPress={() =>
                      setItemData({
                        ...itemData,
                        quantity: { ...itemData.quantity, unit }
                      })}
                  >
                    <Text style={[
                      styles.unitText,
                      itemData.quantity.unit === unit && styles.selectedUnitText
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Expiration Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expiration Date *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {itemData.expirationDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={itemData.expirationDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            placeholder="Add any notes about this item..."
            placeholderTextColor="#888"
            value={itemData.notes}
            onChangeText={(text) => setItemData({ ...itemData, notes: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Adding...' : 'Add Item'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
    fontFamily: 'LexendDeca-Regular',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
    fontFamily: 'LexendDeca-Regular',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  selectedCategory: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  categoryText: {
    fontSize: 14,
    color: '#111',
    fontFamily: 'LexendDeca-Regular',
  },
  selectedCategoryText: {
    color: 'white',
  },
  quantityContainer: {
    gap: 16,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    minWidth: 80,
    backgroundColor: '#fafafa',
    fontFamily: 'LexendDeca-Regular',
  },
  unitContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  selectedUnit: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  unitText: {
    fontSize: 12,
    color: '#111',
    fontFamily: 'LexendDeca-Regular',
  },
  selectedUnitText: {
    color: 'white',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fafafa',
  },
  dateText: {
    fontSize: 16,
    color: '#111',
    fontFamily: 'LexendDeca-Regular',
  },
  submitButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
});
