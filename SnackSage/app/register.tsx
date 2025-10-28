// app/register.tsx - COMPLETE VERSION

import React, { useState } from 'react';
import { Text, TextInput, View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {SERVER_URL} from '../constants/config';
interface UserData {
  name: string;
  email: string;
  password: string;
  preferences: {
    diet: string;
    healthGoals: string[];
    cuisinePreferences: string[];
    skillLevel: string;
    householdSize: number;
    mealFrequency: string;
  };
}

export default function Register() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    name: '',
    email: '',
    password: '',
    preferences: {
      diet: '',
      healthGoals: [],
      cuisinePreferences: [],
      skillLevel: '',
      householdSize: 1,
      mealFrequency: ''
    }
  });

  const totalSteps = 5;
  const dietOptions = ['non vegeterian', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo'];
  const healthGoalOptions = ['weight loss', 'weight gain', 'muscle building', 'low sodium', 'low sugar', 'heart healthy'];
  const cuisineOptions = ['Indian', 'Mediterranean', 'Italian', 'Chinese', 'Mexican', 'American', 'Thai', 'Japanese'];
  const skillLevelOptions = ['beginner', 'intermediate', 'advanced'];
  const mealFrequencyOptions = ['2 meals/day', '3 meals/day', '4 meals/day', '5 meals/day'];

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!userData.name.trim()) {
          Alert.alert('Error', 'Please enter your name');
          return false;
        }
        return true;
      case 2:
        if (!userData.email.trim() || !userData.email.includes('@')) {
          Alert.alert('Error', 'Please enter a valid email');
          return false;
        }
        if (!userData.password.trim() || userData.password.length < 6) {
          Alert.alert('Error', 'Password must be at least 6 characters');
          return false;
        }
        return true;
      case 3:
        if (!userData.preferences.diet) {
          Alert.alert('Error', 'Please select your diet preference');
          return false;
        }
        return true;
      case 4:
        if (userData.preferences.healthGoals.length === 0) {
          Alert.alert('Error', 'Please select at least one health goal');
          return false;
        }
        return true;
      case 5:
        if (userData.preferences.cuisinePreferences.length === 0) {
          Alert.alert('Error', 'Please select at least one cuisine preference');
          return false;
        }
        if (!userData.preferences.skillLevel) {
          Alert.alert('Error', 'Please select your skill level');
          return false;
        }
        if (!userData.preferences.mealFrequency) {
          Alert.alert('Error', 'Please select meal frequency');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
  if (isSubmitting) return;
  setIsSubmitting(true);


  try {
    const payload = {
      ...userData,
      authProvider: 'email',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const response = await fetch(`${SERVER_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Server response is not valid JSON.');
    }

    if (response.ok && data.token && data.user) {
      // Store the token securely
      await SecureStore.setItemAsync('token', data.token);

      Alert.alert(
        'Welcome!',
        `Hello ${data.user.name}, your account has been created.`,
        [
          {
            text: 'Go to Dashboard',
            onPress: () => router.replace('/dashboard') // Update this if dashboard route differs
          }
        ]
      );
    } else if (response.status === 400 && data.message?.toLowerCase().includes('exists')) {
      Alert.alert(
        'Account Already Exists',
        'Redirecting to homepage.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/')
          }
        ]
      );
    } else {
      Alert.alert('Registration Failed', data.message || 'Something went wrong. Try again.');
    }

  } catch (error) {
    console.error('Registration error:', error);
    Alert.alert(
      'Network Error',
      'Could not connect to server. Make sure the server is running and accessible.'
    );
  } finally {
    setIsSubmitting(false);
  }
};

  const toggleSelection = (array: string[], item: string, setter: (newArray: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>{currentStep} of {totalSteps}</Text>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your name?</Text>
      <Text style={styles.stepSubtitle}>We'll use this to personalize your experience</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          placeholder="Enter your full name"
          placeholderTextColor="#888"
          style={styles.textInput}
          value={userData.name}
          onChangeText={(text) => setUserData({...userData, name: text})}
          autoCapitalize="words"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Create Account</Text>
      <Text style={styles.stepSubtitle}>Set up your secure login credentials</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="Enter your email"
          placeholderTextColor="#888"
          style={styles.textInput}
          value={userData.email}
          onChangeText={(text) => setUserData({...userData, email: text})}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Create a secure password"
            placeholderTextColor="#888"
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
            value={userData.password}
            onChangeText={(text) => setUserData({...userData, password: text})}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.passwordHint}>Password must be at least 6 characters</Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Diet & Lifestyle</Text>
      <Text style={styles.stepSubtitle}>Tell us about your dietary preferences</Text>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Diet Preference</Text>
        <View style={styles.optionsContainer}>
          {dietOptions.map((diet) => (
            <TouchableOpacity
              key={diet}
              style={[
                styles.optionButton,
                userData.preferences.diet === diet && styles.selectedOption
              ]}
              onPress={() => setUserData({
                ...userData,
                preferences: {...userData.preferences, diet}
              })}
            >
              <Text style={[
                styles.optionText,
                userData.preferences.diet === diet && styles.selectedOptionText
              ]}>
                {diet.charAt(0).toUpperCase() + diet.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Household Size</Text>
        <Text style={styles.inputHint}>How many people will you be cooking for?</Text>
        <View style={styles.numberContainer}>
          <TouchableOpacity
            style={styles.numberButton}
            onPress={() => setUserData({
              ...userData,
              preferences: {
                ...userData.preferences,
                householdSize: Math.max(1, userData.preferences.householdSize - 1)
              }
            })}
          >
            <Text style={styles.numberButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.numberDisplay}>{userData.preferences.householdSize}</Text>
          <TouchableOpacity
            style={styles.numberButton}
            onPress={() => setUserData({
              ...userData,
              preferences: {
                ...userData.preferences,
                householdSize: userData.preferences.householdSize + 1
              }
            })}
          >
            <Text style={styles.numberButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Health Goals</Text>
      <Text style={styles.stepSubtitle}>What are you trying to achieve? (Select all that apply)</Text>
      <View style={styles.optionsContainer}>
        {healthGoalOptions.map((goal) => (
          <TouchableOpacity
            key={goal}
            style={[
              styles.optionButton,
              userData.preferences.healthGoals.includes(goal) && styles.selectedOption
            ]}
            onPress={() => toggleSelection(
              userData.preferences.healthGoals,
              goal,
              (newGoals) => setUserData({
                ...userData,
                preferences: {...userData.preferences, healthGoals: newGoals}
              })
            )}
          >
            <Text style={[
              styles.optionText,
              userData.preferences.healthGoals.includes(goal) && styles.selectedOptionText
            ]}>
              {goal.charAt(0).toUpperCase() + goal.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep5 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Final Setup</Text>
      <Text style={styles.stepSubtitle}>Let's complete your profile</Text>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Cuisine Preferences</Text>
        <Text style={styles.sectionSubtitle}>Select your favorite cuisines</Text>
        <View style={styles.optionsContainer}>
          {cuisineOptions.map((cuisine) => (
            <TouchableOpacity
              key={cuisine}
              style={[
                styles.optionButton,
                userData.preferences.cuisinePreferences.includes(cuisine) && styles.selectedOption
              ]}
              onPress={() => toggleSelection(
                userData.preferences.cuisinePreferences,
                cuisine,
                (newCuisines) => setUserData({
                  ...userData,
                  preferences: {...userData.preferences, cuisinePreferences: newCuisines}
                })
              )}
            >
              <Text style={[
                styles.optionText,
                userData.preferences.cuisinePreferences.includes(cuisine) && styles.selectedOptionText
              ]}>
                {cuisine}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Cooking Skill Level</Text>
        <View style={styles.optionsContainer}>
          {skillLevelOptions.map((skill) => (
            <TouchableOpacity
              key={skill}
              style={[
                styles.optionButton,
                userData.preferences.skillLevel === skill && styles.selectedOption
              ]}
              onPress={() => setUserData({
                ...userData,
                preferences: {...userData.preferences, skillLevel: skill}
              })}
            >
              <Text style={[
                styles.optionText,
                userData.preferences.skillLevel === skill && styles.selectedOptionText
              ]}>
                {skill.charAt(0).toUpperCase() + skill.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Meal Frequency</Text>
        <View style={styles.optionsContainer}>
          {mealFrequencyOptions.map((frequency) => (
            <TouchableOpacity
              key={frequency}
              style={[
                styles.optionButton,
                userData.preferences.mealFrequency === frequency && styles.selectedOption
              ]}
              onPress={() => setUserData({
                ...userData,
                preferences: {...userData.preferences, mealFrequency: frequency}
              })}
            >
              <Text style={[
                styles.optionText,
                userData.preferences.mealFrequency === frequency && styles.selectedOptionText
              ]}>
                {frequency}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <View style={styles.container}>
      {renderProgressBar()}
      <View style={styles.contentContainer}>
        {renderCurrentStep()}
      </View>
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.backButton, isSubmitting && styles.disabledButton]}
          onPress={handleBack}
          disabled={isSubmitting}
        >
          <Text style={styles.backButtonText}>
            {currentStep === 1 ? 'Exit' : 'Back'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, isSubmitting && styles.disabledButton]}
          onPress={handleNext}
          disabled={isSubmitting}
        >
          <Text style={styles.nextButtonText}>
            {isSubmitting ? 'Creating...' : (currentStep === totalSteps ? 'Create Account' : 'Next')}
          </Text>
        </TouchableOpacity>
      </View>
      {currentStep === 1 && (
        <View style={styles.loginLinkContainer}>
          <Text style={styles.loginLinkText}>Already have an account? </Text>
          <Link href="/" asChild>
            <TouchableOpacity>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#111111',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'LexendDeca-Regular',
    color: '#666',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'LexendDeca-Regular',
    color: '#111111',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    fontFamily: 'LexendDeca-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'LexendDeca-Regular',
    color: '#111111',
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  inputHint: {
    fontSize: 12,
    fontFamily: 'LexendDeca-Regular',
    color: '#888',
    marginBottom: 18,
  },
  passwordHint: {
    fontSize: 12,
    fontFamily: 'LexendDeca-Regular',
    color: '#888',
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'LexendDeca-Regular',
    color: '#111111',
    backgroundColor: '#fafafa',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    fontFamily: 'LexendDeca-Regular',
    color: '#111111',
    backgroundColor: '#fafafa',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    fontSize: 16,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
    color: '#111111',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'LexendDeca-Regular',
    color: '#666',
    marginBottom: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  selectedOption: {
    borderColor: '#111111',
    backgroundColor: '#111111',
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'LexendDeca-Regular',
    color: '#111111',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: 'white',
  },
  numberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  numberButton: {
    width: 40,
    height: 40,
    borderWidth: 1.5,
    borderColor: '#111111',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  numberButtonText: {
    fontSize: 18,
    fontFamily: 'LexendDeca-Regular',
    color: '#111111',
    fontWeight: '600',
  },
  numberDisplay: {
    fontSize: 18,
    fontFamily: 'LexendDeca-Regular',
    color: '#111111',
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  backButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#111111',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  backButtonText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
    letterSpacing: 0.5,
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
  },
  loginLinkText: {
    fontSize: 14,
    fontFamily: 'LexendDeca-Regular',
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    fontFamily: 'LexendDeca-Regular',
    color: '#111111',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
