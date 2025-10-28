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
  Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Speech from 'expo-speech';
import { MaterialIcons } from '@expo/vector-icons';
import HeaderWithBack from './components/HeaderWithBack';

import { SERVER_URL } from '../constants/config';

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
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  /** Tracks which message (if any) is currently being spoken */
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // --------------------------------------------------------------
  // 1. INITIAL WELCOME + AUTO-ASK RECIPE
  // --------------------------------------------------------------
  useEffect(() => {
    if (recipeName) {
      const decoded = decodeURIComponent(recipeName);
      const welcome: Message = {
        id: Date.now().toString(),
        text: `Hello! I'm your AI cooking assistant. I see you're interested in **${decoded}**. Let me help you with the recipe!`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcome]);

      const initialPrompt = `Can you provide me with a detailed recipe for ${decoded}? Please include ingredients, step-by-step instructions, cooking time, and any helpful tips.`;
      setInputText(initialPrompt);
    }
  }, [recipeName]);

  // --------------------------------------------------------------
  // 2. TTS HELPERS
  // --------------------------------------------------------------
  const canSpeak = async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.length > 0;
    } catch {
      return false;
    }
  };

  const speakMessage = async (messageId: string, rawText: string) => {
    if (!isTtsEnabled) return;

    // ---- stop any ongoing speech first ----
    await Speech.stop();
    setCurrentSpeakingId(null);

    if (!(await canSpeak())) {
      Alert.alert('TTS Unavailable', 'Check device TTS settings.');
      return;
    }

    const voices = await Speech.getAvailableVoicesAsync();
    const voice = voices.find(v => v.language.startsWith('en')) || voices[0];

    const cleanText = rawText
      .replace(/[#*_`]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    setCurrentSpeakingId(messageId);

    Speech.speak(cleanText, {
      language: 'en-US',
      voice: voice.identifier,
      pitch: 1.0,
      rate: 0.95,
      onStart: () => console.log('TTS started'),
      onDone: () => {
        console.log('TTS done');
        setCurrentSpeakingId(null);
      },
      onStopped: () => setCurrentSpeakingId(null),
      onError: (e) => {
        console.warn('TTS error', e);
        setCurrentSpeakingId(null);
        Alert.alert('Speech error', 'Try again or check TTS settings.');
      },
    });
  };

  // --------------------------------------------------------------
  // 3. SEND MESSAGE
  // --------------------------------------------------------------
  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    // stop any playing speech
    await Speech.stop();
    setCurrentSpeakingId(null);

    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        Alert.alert('Auth error', 'Please log in again.');
        router.replace('/');
        return;
      }

      const res = await fetch(`${SERVER_URL}/api/recipes/chat/message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMsg.text, recipeName }),
      });

      const raw = await res.text();

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error('Invalid JSON from server');
      }

      if (!res.ok || !data.reply) {
        throw new Error(data.message || 'Server error');
      }

      const aiId = `${Date.now()}`;
      const aiMsg: Message = {
        id: aiId,
        text: data.reply,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMsg]);

      // **NO AUTO-SPEAK**
      // (removed the setTimeout + speakMessage call)
    } catch (err: any) {
      console.error(err);
      const errMsg: Message = {
        id: `${Date.now()}-err`,
        text: err.message?.includes('Network')
          ? 'Network error – check your connection.'
          : 'Something went wrong. Try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------------
  // 4. SCROLL TO BOTTOM
  // --------------------------------------------------------------
  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };
  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  // --------------------------------------------------------------
  // 5. RENDER MESSAGE
  // --------------------------------------------------------------
  const renderMessage = (msg: Message) => (
    <View
      key={msg.id}
      style={[styles.messageWrapper, msg.isUser ? styles.userWrapper : styles.aiWrapper]}
    >
      <View style={[styles.bubble, msg.isUser ? styles.userBubble : styles.aiBubble]}>
        {msg.isUser ? (
          <Text style={styles.userText}>{msg.text}</Text>
        ) : (
          <View style={styles.aiContent}>
            <Markdown style={markdownStyles}>{msg.text}</Markdown>

            <TouchableOpacity
              style={styles.speakBtn}
              onPress={() => {
                if (currentSpeakingId === msg.id) {
                  // stop current speech
                  Speech.stop();
                  setCurrentSpeakingId(null);
                } else {
                  speakMessage(msg.id, msg.text);
                }
              }}
              disabled={!isTtsEnabled}
            >
              <MaterialIcons
                // show "stop" only for the message that is speaking
                name={currentSpeakingId === msg.id ? 'stop' : 'volume-up'}
                size={18}
                color={isTtsEnabled ? '#555' : '#bbb'}
              />
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.time, msg.isUser ? styles.userTime : styles.aiTime]}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  // --------------------------------------------------------------
  // 6. UI
  // --------------------------------------------------------------
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <HeaderWithBack />

      {recipeName && (
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeTitle} numberOfLines={1}>
            {decodeURIComponent(recipeName)}
          </Text>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}

        {isLoading && (
          <View style={[styles.messageWrapper, styles.aiWrapper]}>
            <View style={[styles.bubble, styles.aiBubble]}>
              <View style={styles.typing}>
                <ActivityIndicator size="small" color="#666" />
                <Text style={styles.typingTxt}>AI is typing…</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* OPTIONAL TTS TOGGLE + TEST BUTTON */}
      <View style={styles.ttsBar}>
        <TouchableOpacity
          onPress={() => setIsTtsEnabled(v => !v)}
          style={styles.ttsToggle}
        >
          <MaterialIcons
            name={isTtsEnabled ? 'record-voice-over' : 'voice-over-off'}
            size={20}
            color={isTtsEnabled ? '#111' : '#999'}
          />
          <Text style={styles.ttsLabel}>TTS {isTtsEnabled ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => speakMessage('test', 'This is a test of text-to-speech.')}
          style={styles.testBtn}
        >
          <Text style={styles.testTxt}>Test TTS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputArea}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about the recipe…"
            placeholderTextColor="#aaa"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <MaterialIcons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// --------------------------------------------------------------
// MARKDOWN STYLES
// --------------------------------------------------------------
const markdownStyles = {
  body: { fontSize: 14, lineHeight: 20, color: '#1a1a1a' },
  heading1: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  heading2: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  paragraph: { marginBottom: 6 },
  list_item: { marginBottom: 3 },
};

// --------------------------------------------------------------
// STYLES (unchanged)
// --------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  recipeHeader: {
    paddingVertical: 12,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  recipeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },

  chatArea: { flex: 1 },
  chatContent: { padding: 12 },

  messageWrapper: { marginBottom: 12 },
  userWrapper: { alignItems: 'flex-end' },
  aiWrapper: { alignItems: 'flex-start' },

  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 10,
  },
  userBubble: { backgroundColor: '#111', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#f5f5f5', borderBottomLeftRadius: 4 },

  userText: { fontSize: 14, color: '#fff', lineHeight: 20 },

  aiContent: { flexDirection: 'column' },

  speakBtn: {
    alignSelf: 'flex-end',
    marginTop: 4,
    padding: 4,
  },

  time: {
    fontSize: 10,
    marginTop: 4,
  },
  userTime: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  aiTime: { color: '#999' },

  typing: { flexDirection: 'row', alignItems: 'center' },
  typingTxt: { marginLeft: 8, fontSize: 13, color: '#666', fontStyle: 'italic' },

  ttsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  ttsToggle: { flexDirection: 'row', alignItems: 'center' },
  ttsLabel: { marginLeft: 6, fontSize: 13, color: '#111' },
  testBtn: { paddingHorizontal: 12, paddingVertical: 4 },
  testTxt: { fontSize: 13, color: '#0066cc' },

  inputArea: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
    maxHeight: 100,
    minHeight: 40,
    color: '#111',
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#ccc' },
});
