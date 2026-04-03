import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import { API_URL, SOCKET_URL } from '../constants/Config';
import io from 'socket.io-client';

let socket: any;

export default function Chat() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const { channels, setChannels, messages, setMessages, addMessage, activeChannel, setActiveChannel } = useChatStore();
  const [inputText, setInputText] = useState('');
  const [view, setView] = useState<'channels' | 'messages'>('channels');
  // simple auto-scroll mechanism using flatlist
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user || !token) {
      router.replace('/');
      return;
    }

    // Connect Socket
    socket = io(SOCKET_URL, { auth: { token } });
    socket.on('connect', () => {
      console.log('Mobile socket connected');
    });

    socket.on('receive_message', (data: any) => {
      addMessage(data);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [user, token]);

  // Fetch Channels on mount
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch(`${API_URL}/channels`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setChannels(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (token) fetchChannels();
  }, [token]);

  // Fetch Messages when activeChannel changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeChannel) return;
      try {
        const res = await fetch(`${API_URL}/channels/${activeChannel}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
          socket?.emit('join_channel', activeChannel);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
  }, [activeChannel, token]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChannel) return;
    const content = inputText;
    setInputText('');

    try {
      const res = await fetch(`${API_URL}/channels/${activeChannel}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        const serverMsg = await res.json();
        socket?.emit('send_message', serverMsg);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectChannel = (id: string) => {
    setActiveChannel(id);
    setView('messages');
  };

  if (view === 'channels') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Channels</Text>
            <Text style={styles.headerSubtitle}>Pick a room to continue chatting</Text>
          </View>
          <TouchableOpacity onPress={() => logout()} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {channels.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No channels yet</Text>
            <Text style={styles.emptySubtitle}>Create or join a channel on web, then refresh this screen.</Text>
          </View>
        ) : (
          <FlatList
            data={channels}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.channelItem} 
                onPress={() => selectChannel(item.id)}
              >
                <Text style={styles.channelIcon}>#</Text>
                <Text style={styles.channelName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  const activeChannelObj = channels.find(c => c.id === activeChannel);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setView('channels')} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.chatHeaderTitle}># {activeChannelObj?.name}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMe = item.userId === user?.id;
          return (
            <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
              <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
                {!isMe && <Text style={styles.messageUsername}>{item.username}</Text>}
                <Text style={styles.messageText}>{item.content}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.inputArea}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#6B7280"
        />
        <TouchableOpacity style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} onPress={handleSendMessage} disabled={!inputText.trim()}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712', paddingTop: Platform.OS === 'ios' ? 50 : 30 },
  header: {
    minHeight: 74,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  logoutButton: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { color: '#FCA5A5', fontSize: 13, fontWeight: '700' },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 8,
    borderRadius: 12
  },
  channelIcon: { color: '#6B7280', fontSize: 18, marginRight: 12 },
  channelName: { color: '#E5E7EB', fontSize: 16, fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  emptyTitle: { color: '#E5E7EB', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    paddingHorizontal: 16
  },
  backButton: { marginRight: 12 },
  backText: { color: '#60A5FA', fontSize: 15, fontWeight: '700' },
  chatHeaderTitle: { color: 'white', fontSize: 17, fontWeight: '700' },
  
  messageWrapper: { marginVertical: 4, flexDirection: 'row' },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperOther: { justifyContent: 'flex-start' },
  messageBubble: {
    maxWidth: '80%', padding: 12, borderRadius: 16,
  },
  messageBubbleMe: { backgroundColor: '#2563EB', borderBottomRightRadius: 4 },
  messageBubbleOther: { backgroundColor: '#1F2937', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#374151' },
  messageUsername: { color: '#60A5FA', fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  messageText: { color: 'white', fontSize: 15 },
  
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#020617',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    alignItems: 'center'
  },
  textInput: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    color: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    fontSize: 16
  },
  sendButton: {
    marginLeft: 12,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24
  },
  sendButtonDisabled: { opacity: 0.55 },
  sendButtonText: { color: 'white', fontWeight: 'bold' }
});
