import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import HeaderWithBack from './components/HeaderWithBack';

import {SERVER_URL} from '../constants/config'; // Adjust the import path as necessary

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function RecipeChat() {
  const { recipeName } = useLocalSearchParams<{ recipeName: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (recipeName) {
      const initialMessage = `Can you provide me with a detailed recipe for ${recipeName}? Please include ingredients, step-by-step instructions, cooking time, and any helpful tips.`;
      setInputText(initialMessage);

      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: `Hello! I'm your AI cooking assistant. I see you're interested in making ${recipeName}. Let me help you with that recipe!`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [recipeName]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        Alert.alert("Authentication Error", "Please log in again.");
        router.replace('/');
        return;
      }

      const response = await fetch(`${SERVER_URL}/api/recipes/chat/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.text, recipeName })
      });

      const raw = await response.text();

      try {
        const data = JSON.parse(raw);

        if (response.ok && data.reply) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: data.reply,
            isUser: false,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
        } else {
          throw new Error(data.message || 'Unexpected response from AI');
        }
      } catch (parseError) {
        console.error('Failed to parse response:', raw);
        Alert.alert("Server Error", "Invalid response received from server.");
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: "Sorry, I couldn't understand the server response. Please try again later.",
          isUser: false,
          timestamp: new Date()
        }]);
      }

    } catch (error) {
      console.error('Chat error:', error);
      Alert.alert('Network Error', 'Could not connect to server. Please try again.');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  const renderMessage = (message: Message) => (
    <View 
      key={message.id} 
      style={[
        styles.messageContainer,
        message.isUser ? styles.userMessage : styles.aiMessage
      ]}
    >
      {message.isUser ? (
        <Text style={[styles.messageText, styles.userMessageText]}>
          {message.text}
        </Text>
      ) : (
        <Markdown >
          {message.text}
        </Markdown>
      )}
      <Text style={[
        styles.timestamp,
        message.isUser ? styles.userTimestamp : styles.aiTimestamp
      ]}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <HeaderWithBack/>
      
      {recipeName && (
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeTitle}>{decodeURIComponent(recipeName)}</Text>
        </View>
      )}

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}
        
        {isLoading && (
          <View style={[styles.messageContainer, styles.aiMessage]}>
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color="#666" />
              <Text style={styles.typingText}>AI is typing...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask me anything about this recipe..."
          placeholderTextColor="#888"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.disabledButton]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  recipeHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    fontFamily: 'LexendDeca-Regular',
    textAlign: 'center',
  },
  messagesContainer: { flex: 1, paddingHorizontal: 16 },
  messagesContent: { paddingVertical: 16 },
  messageContainer: { marginBottom: 16, maxWidth: '80%' },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#111',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'LexendDeca-Regular',
    lineHeight: 22,
  },
  userMessageText: { color: 'white' },
  aiMessageText: { color: '#111' },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'LexendDeca-Regular',
  },
  userTimestamp: { color: '#ccc', textAlign: 'right' },
  aiTimestamp: { color: '#888' },
  typingIndicator: { flexDirection: 'row', alignItems: 'center' },
  typingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontFamily: 'LexendDeca-Regular',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'LexendDeca-Regular',
    backgroundColor: '#f8f8f8',
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#111',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: { backgroundColor: '#ccc' },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'LexendDeca-Regular',
  },
});
