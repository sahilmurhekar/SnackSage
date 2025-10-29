import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import HeaderWithBack from './components/HeaderWithBack';
import { SERVER_URL } from '../constants/config';

interface UserProfile {
  name: string;
  email: string;
  recipesViewed: number;
  preferences: {
    diet: string;
    healthGoals: string[];
    cuisinePreferences: string[];
    skillLevel: string;
    householdSize: number;
    mealFrequency: string;
  };
}

interface Achievement {
  id: number;
  title: string;
  description: string;
  threshold: number;
  icon: string;
  unlocked: boolean;
  progress: number;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);

  const dietOptions = ['non vegeterian', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo'];
  const healthGoalOptions = ['weight loss', 'weight gain', 'muscle building', 'low sodium', 'low sugar', 'heart healthy'];
  const cuisineOptions = ['Indian', 'Mediterranean', 'Italian', 'Chinese', 'Mexican', 'American', 'Thai', 'Japanese'];
  const skillLevelOptions = ['beginner', 'intermediate', 'advanced'];
  const mealFrequencyOptions = ['2 meals/day', '3 meals/day', '4 meals/day', '5 meals/day'];

  useEffect(() => {
    fetchProfile();
    fetchAchievements();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${SERVER_URL}/api/profile/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditedProfile(data);
      } else {
        throw new Error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Could not load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAchievements = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;

      const response = await fetch(`${SERVER_URL}/api/profile/achievements`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const handleSave = async () => {
    if (!editedProfile) return;

    setSaving(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;

      const response = await fetch(`${SERVER_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedProfile.name,
          preferences: editedProfile.preferences,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setEditedProfile(data.user);
        setEditMode(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Could not update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setEditMode(false);
  };

  const toggleSelection = (field: 'healthGoals' | 'cuisinePreferences', value: string) => {
    if (!editedProfile) return;

    const currentArray = editedProfile.preferences[field];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];

    setEditedProfile({
      ...editedProfile,
      preferences: {
        ...editedProfile.preferences,
        [field]: newArray,
      },
    });
  };

  const renderAchievements = () => (
    <View style={styles.achievementsSection}>
      <Text style={styles.sectionTitle}>🏆 Achievements</Text>
      <View style={styles.achievementsHeader}>
        <Text style={styles.achievementsSubtitle}>
          Recipes Viewed: {profile?.recipesViewed || 0}
        </Text>
      </View>

      <View style={styles.achievementsGrid}>
        {achievements.map((achievement) => (
          <View
            key={achievement.id}
            style={[
              styles.achievementCard,
              achievement.unlocked && styles.achievementUnlocked,
            ]}
          >
            <View style={styles.achievementHeader}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              {achievement.unlocked && (
                <View style={styles.unlockedBadge}>
                  <Text style={styles.unlockedText}>✓</Text>
                </View>
              )}
            </View>

            <Text style={[
              styles.achievementTitle,
              !achievement.unlocked && styles.achievementLocked
            ]}>
              {achievement.title}
            </Text>
            <Text style={[
              styles.achievementDescription,
              !achievement.unlocked && styles.achievementLocked
            ]}>
              {achievement.description}
            </Text>

            {!achievement.unlocked && (
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${achievement.progress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round(achievement.progress)}%
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  const renderProfileInfo = () => {
    if (!profile || !editedProfile) return null;

    if (!editMode) {
      return (
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditMode(true)}
            >
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{profile.name}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Diet Preference</Text>
            <View style={styles.infoTagContainer}>
              <View style={styles.infoTag}>
                <Text style={styles.infoTagText}>
                  {profile.preferences.diet.charAt(0).toUpperCase() + profile.preferences.diet.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Health Goals</Text>
            <View style={styles.tagsContainer}>
              {profile.preferences.healthGoals.map((goal, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>
                    {goal.charAt(0).toUpperCase() + goal.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Cuisine Preferences</Text>
            <View style={styles.tagsContainer}>
              {profile.preferences.cuisinePreferences.map((cuisine, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{cuisine}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Skill Level</Text>
            <View style={styles.infoTagContainer}>
              <View style={styles.infoTag}>
                <Text style={styles.infoTagText}>
                  {profile.preferences.skillLevel.charAt(0).toUpperCase() + profile.preferences.skillLevel.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Household Size</Text>
            <Text style={styles.infoValue}>{profile.preferences.householdSize} people</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Meal Frequency</Text>
            <Text style={styles.infoValue}>{profile.preferences.mealFrequency}</Text>
          </View>
        </View>
      );
    }

    // Edit Mode
    return (
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>Edit Profile</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.textInput}
            value={editedProfile.name}
            onChangeText={(text) =>
              setEditedProfile({ ...editedProfile, name: text })
            }
            placeholder="Enter your name"
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Diet Preference</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionsContainer}>
              {dietOptions.map((diet) => (
                <TouchableOpacity
                  key={diet}
                  style={[
                    styles.categoryButton,
                    editedProfile.preferences.diet === diet && styles.selectedCategory,
                  ]}
                  onPress={() =>
                    setEditedProfile({
                      ...editedProfile,
                      preferences: { ...editedProfile.preferences, diet },
                    })
                  }
                >
                  <Text
                    style={[
                      styles.categoryText,
                      editedProfile.preferences.diet === diet && styles.selectedCategoryText,
                    ]}
                  >
                    {diet.charAt(0).toUpperCase() + diet.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Health Goals</Text>
          <View style={styles.optionsWrap}>
            {healthGoalOptions.map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.categoryButton,
                  editedProfile.preferences.healthGoals.includes(goal) &&
                    styles.selectedCategory,
                ]}
                onPress={() => toggleSelection('healthGoals', goal)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    editedProfile.preferences.healthGoals.includes(goal) &&
                      styles.selectedCategoryText,
                  ]}
                >
                  {goal.charAt(0).toUpperCase() + goal.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cuisine Preferences</Text>
          <View style={styles.optionsWrap}>
            {cuisineOptions.map((cuisine) => (
              <TouchableOpacity
                key={cuisine}
                style={[
                  styles.categoryButton,
                  editedProfile.preferences.cuisinePreferences.includes(cuisine) &&
                    styles.selectedCategory,
                ]}
                onPress={() => toggleSelection('cuisinePreferences', cuisine)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    editedProfile.preferences.cuisinePreferences.includes(cuisine) &&
                      styles.selectedCategoryText,
                  ]}
                >
                  {cuisine}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Skill Level</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionsContainer}>
              {skillLevelOptions.map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={[
                    styles.categoryButton,
                    editedProfile.preferences.skillLevel === skill && styles.selectedCategory,
                  ]}
                  onPress={() =>
                    setEditedProfile({
                      ...editedProfile,
                      preferences: { ...editedProfile.preferences, skillLevel: skill },
                    })
                  }
                >
                  <Text
                    style={[
                      styles.categoryText,
                      editedProfile.preferences.skillLevel === skill &&
                        styles.selectedCategoryText,
                    ]}
                  >
                    {skill.charAt(0).toUpperCase() + skill.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Household Size *</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                setEditedProfile({
                  ...editedProfile,
                  preferences: {
                    ...editedProfile.preferences,
                    householdSize: Math.max(1, editedProfile.preferences.householdSize - 1),
                  },
                })
              }
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>

            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityDisplayText}>
                {editedProfile.preferences.householdSize}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                setEditedProfile({
                  ...editedProfile,
                  preferences: {
                    ...editedProfile.preferences,
                    householdSize: editedProfile.preferences.householdSize + 1,
                  },
                })
              }
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Meal Frequency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionsContainer}>
              {mealFrequencyOptions.map((frequency) => (
                <TouchableOpacity
                  key={frequency}
                  style={[
                    styles.categoryButton,
                    editedProfile.preferences.mealFrequency === frequency &&
                      styles.selectedCategory,
                  ]}
                  onPress={() =>
                    setEditedProfile({
                      ...editedProfile,
                      preferences: { ...editedProfile.preferences, mealFrequency: frequency },
                    })
                  }
                >
                  <Text
                    style={[
                      styles.categoryText,
                      editedProfile.preferences.mealFrequency === frequency &&
                        styles.selectedCategoryText,
                    ]}
                  >
                    {frequency}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.cancelButton, saving && styles.disabledButton]}
            onPress={handleCancel}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <HeaderWithBack />
      {renderProfileInfo()}
      {renderAchievements()}
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'LexendDeca-Regular',
  },
  profileSection: {
    padding: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    fontFamily: 'LexendDeca-Regular',
  },
  editButton: {
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
  infoCard: {
    backgroundColor: '#fafafa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'LexendDeca-Regular',
  },
  infoValue: {
    fontSize: 16,
    color: '#111',
    fontWeight: '500',
    fontFamily: 'LexendDeca-Regular',
  },
  infoTagContainer: {
    marginTop: 4,
  },
  infoTag: {
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  infoTagText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
    fontFamily: 'LexendDeca-Regular',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
    fontFamily: 'LexendDeca-Regular',
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
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  quantityDisplay: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minWidth: 80,
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  quantityDisplayText: {
    fontSize: 16,
    color: '#111',
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  cancelButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
  disabledButton: {
    opacity: 0.6,
  },
  achievementsSection: {
    padding: 24,
    paddingTop: 0,
  },
  achievementsHeader: {
    marginBottom: 16,
  },
  achievementsSubtitle: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    fontFamily: 'LexendDeca-Regular',
  },
  achievementsGrid: {
    gap: 12,
  },
  achievementCard: {
    backgroundColor: '#fafafa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    opacity: 0.6,
  },
  achievementUnlocked: {
    borderColor: '#10b981',
    borderWidth: 2,
    opacity: 1,
    backgroundColor: 'white',
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementIcon: {
    fontSize: 32,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
    fontFamily: 'LexendDeca-Regular',
  },
  achievementDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    fontFamily: 'LexendDeca-Regular',
  },
  achievementLocked: {
    color: '#94a3b8',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    minWidth: 40,
    fontFamily: 'LexendDeca-Regular',
  },
  unlockedBadge: {
    backgroundColor: '#10b981',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedText: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 40,
  },
});
