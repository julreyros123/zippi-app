import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ScrollView, Alert, SafeAreaView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import { API_URL, SOCKET_URL } from '../constants/Config';
import io from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';

let socket: any;
const MODULES = ['channels', 'discover', 'classmates', 'events', 'announcements'] as const;
type ModuleTab = typeof MODULES[number];

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatEventDate(d: string) {
  const date = new Date(d);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Chat() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const { channels, setChannels, messages, setMessages, addMessage, activeChannel, setActiveChannel } = useChatStore();
  const [inputText, setInputText] = useState('');
  const [view, setView] = useState<'channels' | 'messages'>('channels');
  const [activeModule, setActiveModule] = useState<ModuleTab>('channels');
  const [publicChannels, setPublicChannels] = useState<any[]>([]);
  const [classmates, setClassmates] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [joiningChannelId, setJoiningChannelId] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '' });
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', scheduledAt: '', emoji: '📅' });
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });

  // simple auto-scroll mechanism using flatlist
  const flatListRef = useRef<FlatList>(null);

  const fetchMyChannels = useCallback(async () => {
    if (!token) return;
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
  }, [token, setChannels]);

  const fetchPublicChannels = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/channels/search?q=`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPublicChannels(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const fetchClassmates = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/users?q=`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClassmates(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const fetchEvents = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const fetchAnnouncements = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const fetchConnections = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/connections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConnections(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const handleCreateChannel = async () => {
    if (!newChannel.name.trim()) return;
    try {
      const res = await fetch(`${API_URL}/channels`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
         body: JSON.stringify({ name: newChannel.name, description: newChannel.description, isPrivate: false })
      });
      if (res.ok) {
         setShowCreateChannel(false);
         setNewChannel({name: '', description: ''});
         fetchMyChannels();
         fetchPublicChannels();
      }
    } catch(e) {}
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.scheduledAt.trim()) return;
    try {
      const dateObj = new Date(newEvent.scheduledAt);
      const dateStr = isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString();
      const res = await fetch(`${API_URL}/events`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
         body: JSON.stringify({ ...newEvent, scheduledAt: dateStr })
      });
      if (res.ok) {
         setShowCreateEvent(false);
         setNewEvent({title: '', description: '', scheduledAt: '', emoji: '📅'});
         fetchEvents();
      }
    } catch(e) {}
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) return;
    try {
      const res = await fetch(`${API_URL}/announcements`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
         body: JSON.stringify({ title: newAnnouncement.title, content: newAnnouncement.content })
      });
      if (res.ok) {
         setShowCreateAnnouncement(false);
         setNewAnnouncement({title: '', content: ''});
         fetchAnnouncements();
      }
    } catch(e) {}
  };

  const handleConnect = async (targetUserId: string) => {
    if (!token) return;
    const existing = connections.find(c => 
      (c.userAId === targetUserId && c.userBId === user?.id) || 
      (c.userBId === targetUserId && c.userAId === user?.id)
    );

    try {
      if (existing && existing.status === 'ACCEPTED') {
        await fetch(`${API_URL}/connections/${existing.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      } else {
        await fetch(`${API_URL}/connections`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ targetUserId })
        });
      }
      fetchConnections();
    } catch(e) {}
  };

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

  useEffect(() => {
    if (!token) return;
    fetchMyChannels();
    fetchPublicChannels();
    fetchClassmates();
    fetchEvents();
    fetchAnnouncements();
    fetchConnections();
  }, [token, fetchMyChannels, fetchPublicChannels, fetchClassmates, fetchEvents, fetchAnnouncements, fetchConnections]);

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

  const handleJoinChannel = async (channelId: string) => {
    if (!token) return;
    setJoiningChannelId(channelId);
    try {
      const res = await fetch(`${API_URL}/channels/${channelId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchMyChannels();
        await fetchPublicChannels();
        Alert.alert('Joined', 'You joined the channel successfully.');
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert('Join failed', data.error || 'Unable to join this channel right now.');
      }
    } catch (error) {
      Alert.alert('Connection issue', 'Could not join channel. Please try again.');
    } finally {
      setJoiningChannelId(null);
    }
  };

  const getHeaderContent = () => {
    switch(activeModule) {
      case 'channels': return { title: 'My Channels', subtitle: 'Pick a room to continue chatting' };
      case 'discover': return { title: 'Discover', subtitle: 'Find new public spaces' };
      case 'classmates': return { title: 'Classmates', subtitle: 'Connect with students in your network' };
      case 'events': return { title: 'Events', subtitle: 'Upcoming activities and dates' };
      case 'announcements': return { title: 'Announcements', subtitle: 'Important updates from the faculty' };
      default: return { title: 'Zippi', subtitle: 'Connect and collaborate' };
    }
  };

  if (view === 'channels') {
    const { title, subtitle } = getHeaderContent();

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
          <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.headerMenuBtn}>
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
        </View>

        <Modal visible={isSidebarOpen} transparent animationType="fade" onRequestClose={() => setIsSidebarOpen(false)}>
          <View style={styles.sidebarOverlay}>
            <TouchableOpacity style={styles.sidebarCloseArea} onPress={() => setIsSidebarOpen(false)} activeOpacity={1} />
            <View style={styles.sidebarContent}>
              <View style={styles.sidebarHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                  <View style={styles.sidebarUserAvatar}>
                    <Text style={styles.sidebarUserAvatarText}>{(user?.username || 'U').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.sidebarTitle}>{user?.nickname || user?.username}</Text>
                    <Text style={styles.sidebarSubtitle}>@{user?.username}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setIsSidebarOpen(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.sidebarScroll} contentContainerStyle={{paddingBottom: 40}}>
                <Text style={styles.sidebarSectionTitle}>Network ({classmates.length} Online)</Text>
                {classmates.map(cm => {
                  const conn = connections.find(c => 
                    (c.userAId === cm.id && c.userBId === user?.id) || 
                    (c.userBId === cm.id && c.userAId === user?.id)
                  );
                  const isConnected = conn?.status === 'ACCEPTED';
                  
                  return (
                  <View key={cm.id} style={styles.sidebarUserItem}>
                    <View style={styles.sidebarUserAvatarSmall}>
                      <Text style={styles.sidebarUserAvatarTextSmall}>{(cm.nickname || cm.username).charAt(0).toUpperCase()}</Text>
                      <View style={styles.onlineIndicator} />
                    </View>
                    <View>
                      <Text style={styles.sidebarUserName}>{cm.nickname || cm.username} {isConnected && <Ionicons name="checkmark-circle" size={14} color="#34D399" />}</Text>
                      <Text style={styles.sidebarUserStatus}>Online</Text>
                    </View>
                  </View>
                )})}
              </ScrollView>
              
              <View style={styles.sidebarFooter}>
                <TouchableOpacity style={styles.sidebarLogoutBtn} onPress={logout}>
                  <Ionicons name="log-out-outline" size={22} color="#FCA5A5" />
                  <Text style={styles.sidebarLogoutText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {activeModule === 'channels' && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>My Channels</Text>
                <TouchableOpacity onPress={() => fetchMyChannels()}>
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {showCreateChannel && (
                <View style={styles.formCard}>
                  <TextInput style={styles.formInput} placeholder="Channel Name" placeholderTextColor="#6B7280" value={newChannel.name} onChangeText={t => setNewChannel({...newChannel, name: t})} />
                  <TextInput style={styles.formInput} placeholder="Description (optional)" placeholderTextColor="#6B7280" value={newChannel.description} onChangeText={t => setNewChannel({...newChannel, description: t})} />
                  <TouchableOpacity style={styles.formSubmitBtn} onPress={handleCreateChannel}>
                    <Text style={styles.formSubmitText}>Create Channel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {channels.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyTitle}>No channels yet</Text>
                  <Text style={styles.emptySubtitle}>Switch to Discover tab and join a channel.</Text>
                </View>
              ) : (
                channels.map((item) => (
                  <TouchableOpacity 
                    key={item.id}
                    style={styles.channelItem}
                    onPress={() => selectChannel(item.id)}
                  >
                    <Text style={styles.channelIcon}>#</Text>
                    <Text style={styles.channelName}>{item.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}

          {activeModule === 'discover' && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Discover Channels</Text>
                <TouchableOpacity onPress={() => fetchPublicChannels()}>
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>
              {publicChannels.filter((c) => !channels.some((my) => my.id === c.id)).length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptySubtitle}>No public channels available right now.</Text>
                </View>
              ) : (
                publicChannels
                  .filter((c) => !channels.some((my) => my.id === c.id))
                  .map((item) => (
                    <View key={item.id} style={styles.publicChannelItem}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.channelName}># {item.name}</Text>
                        {!!item.description && <Text style={styles.channelDescription}>{item.description}</Text>}
                      </View>
                      <TouchableOpacity
                        style={[styles.joinButton, joiningChannelId === item.id && styles.joinButtonDisabled]}
                        disabled={joiningChannelId === item.id}
                        onPress={() => handleJoinChannel(item.id)}
                      >
                        <Text style={styles.joinButtonText}>{joiningChannelId === item.id ? 'Joining...' : 'Join'}</Text>
                      </TouchableOpacity>
                    </View>
                  ))
              )}
            </>
          )}

          {activeModule === 'classmates' && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Classmates</Text>
                <TouchableOpacity onPress={() => { fetchClassmates(); fetchConnections(); }}>
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>
              {classmates.filter(c => c.id !== user?.id).length === 0 ? (
                <View style={styles.emptyStateCard}><Text style={styles.emptySubtitle}>No classmates found.</Text></View>
              ) : classmates.filter(c => c.id !== user?.id).map((mate) => {
                const conn = connections.find(c => 
                  (c.userAId === mate.id && c.userBId === user?.id) || 
                  (c.userBId === mate.id && c.userAId === user?.id)
                );
                let btnText = "Connect";
                let isAcc = false;
                if (conn) {
                  if (conn.status === 'ACCEPTED') { btnText = "Connected"; isAcc = true; }
                  else if (conn.userBId === user?.id) btnText = "Accept";
                  else if (conn.userAId === user?.id) btnText = "Pending";
                }
                
                return (
                  <View key={mate.id} style={[styles.infoCard, {flexDirection: 'row', alignItems: 'center'}]}>
                    <View style={{flex: 1, paddingRight: 8}}>
                      <Text style={styles.infoTitle}>{mate.nickname || mate.username}</Text>
                      <Text style={styles.infoMeta}>@{mate.username}{mate.subject ? ` • ${mate.subject}` : ''}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleConnect(mate.id)} style={[styles.connectBtn, isAcc && styles.connectedBtn]}>
                       <Text style={[styles.connectBtnText, isAcc && styles.connectedBtnText]}>{btnText}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}

          {activeModule === 'events' && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Events</Text>
                <TouchableOpacity onPress={() => fetchEvents()}>
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {showCreateEvent && (
                <View style={styles.formCard}>
                  <TextInput style={styles.formInput} placeholder="Event Title" placeholderTextColor="#6B7280" value={newEvent.title} onChangeText={t => setNewEvent({...newEvent, title: t})} />
                  <TextInput style={styles.formInput} placeholder="Description" placeholderTextColor="#6B7280" value={newEvent.description} onChangeText={t => setNewEvent({...newEvent, description: t})} />
                  <TextInput style={styles.formInput} placeholder="Date (e.g., 2026-05-10T10:00)" placeholderTextColor="#6B7280" value={newEvent.scheduledAt} onChangeText={t => setNewEvent({...newEvent, scheduledAt: t})} />
                  <TextInput style={styles.formInput} placeholder="Emoji" placeholderTextColor="#6B7280" value={newEvent.emoji} onChangeText={t => setNewEvent({...newEvent, emoji: t})} />
                  <TouchableOpacity style={styles.formSubmitBtn} onPress={handleCreateEvent}>
                    <Text style={styles.formSubmitText}>Create Event</Text>
                  </TouchableOpacity>
                </View>
              )}

              {events.length === 0 ? (
                <View style={styles.emptyStateCard}><Text style={styles.emptySubtitle}>No events right now.</Text></View>
              ) : events.map((ev) => (
                <View key={ev.id} style={styles.infoCard}>
                  <Text style={styles.infoTitle}>{ev.emoji || '📅'} {ev.title}</Text>
                  {!!ev.description && <Text style={styles.infoMeta}>{ev.description}</Text>}
                  <Text style={styles.infoTime}>{formatEventDate(ev.scheduledAt)}</Text>
                </View>
              ))}
            </>
          )}

          {activeModule === 'announcements' && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Announcements</Text>
                <TouchableOpacity onPress={() => fetchAnnouncements()}>
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {showCreateAnnouncement && (
                <View style={styles.formCard}>
                  <TextInput style={styles.formInput} placeholder="Title" placeholderTextColor="#6B7280" value={newAnnouncement.title} onChangeText={t => setNewAnnouncement({...newAnnouncement, title: t})} />
                  <TextInput style={[styles.formInput, { height: 80 }]} placeholder="Content" placeholderTextColor="#6B7280" multiline value={newAnnouncement.content} onChangeText={t => setNewAnnouncement({...newAnnouncement, content: t})} />
                  <TouchableOpacity style={styles.formSubmitBtn} onPress={handleCreateAnnouncement}>
                    <Text style={styles.formSubmitText}>Post Announcement</Text>
                  </TouchableOpacity>
                </View>
              )}

              {announcements.length === 0 ? (
                <View style={styles.emptyStateCard}><Text style={styles.emptySubtitle}>No announcements yet.</Text></View>
              ) : announcements.map((ann) => (
                <View key={ann.id} style={styles.infoCard}>
                  <Text style={styles.infoTitle}>{ann.title || 'Update'}</Text>
                  <Text style={styles.infoMeta}>{ann.content}</Text>
                  <Text style={styles.infoTime}>{timeAgo(ann.createdAt)}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.bottomTabBar}>
          {MODULES.map((tab) => {
            let iconName = 'chatbubble';
            if (tab === 'discover') iconName = 'compass';
            if (tab === 'classmates') iconName = 'people';
            if (tab === 'events') iconName = 'calendar';
            if (tab === 'announcements') iconName = 'megaphone';
            const isActive = activeModule === tab;
            return (
              <TouchableOpacity key={tab} style={styles.tabItem} onPress={() => setActiveModule(tab)}>
                <Ionicons name={isActive ? (iconName as any) : `${iconName}-outline` as any} size={24} color={isActive ? '#6366F1' : '#6B7280'} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab === 'channels' ? 'Chat' : tab === 'announcements' ? 'News' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {['channels', 'events', 'announcements'].includes(activeModule) && (
          <TouchableOpacity 
            style={styles.fab}
            onPress={() => {
              if (activeModule === 'channels') setShowCreateChannel(!showCreateChannel);
              if (activeModule === 'events') setShowCreateEvent(!showCreateEvent);
              if (activeModule === 'announcements') setShowCreateAnnouncement(!showCreateAnnouncement);
            }}
          >
            <Ionicons name={(activeModule === 'channels' && showCreateChannel) || (activeModule === 'events' && showCreateEvent) || (activeModule === 'announcements' && showCreateAnnouncement) ? 'close' : 'add'} size={28} color="white" />
          </TouchableOpacity>
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
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#030712',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    color: '#6B7280',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#6366F1',
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
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
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#E5E7EB', fontSize: 15, fontWeight: '700' },
  refreshText: { color: '#60A5FA', fontSize: 13, fontWeight: '700' },
  formCard: { backgroundColor: '#0B1220', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#1F2937' },
  formInput: { backgroundColor: '#020617', color: 'white', borderWidth: 1, borderColor: '#374151', borderRadius: 8, padding: 10, marginBottom: 10 },
  formSubmitBtn: { backgroundColor: '#4F46E5', borderRadius: 8, alignItems: 'center', padding: 12 },
  formSubmitText: { color: 'white', fontWeight: 'bold' },
  connectBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  connectedBtn: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  connectBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  connectedBtnText: { color: '#9CA3AF' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  emptyStateCard: {
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 40,
    paddingHorizontal: 14,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: '#E5E7EB', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  publicChannelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  channelDescription: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  joinButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  joinButtonDisabled: { opacity: 0.6 },
  joinButtonText: { color: 'white', fontSize: 12, fontWeight: '700' },
  infoCard: {
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  infoTitle: { color: '#E2E8F0', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  infoMeta: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  infoTime: { color: '#64748B', fontSize: 11, marginTop: 6 },
  
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
  sendButtonText: { color: 'white', fontWeight: 'bold' },
  
  sidebarOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sidebarCloseArea: {
    flex: 1,
  },
  sidebarContent: {
    width: '75%',
    maxWidth: 320,
    backgroundColor: '#020617',
    borderLeftWidth: 1,
    borderLeftColor: '#1F2937',
    height: '100%',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  sidebarUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarUserAvatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sidebarTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sidebarSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  sidebarScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sidebarSectionTitle: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sidebarUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  sidebarUserAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  sidebarUserAvatarTextSmall: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#020617',
  },
  sidebarUserName: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  sidebarUserStatus: {
    color: '#10B981',
    fontSize: 12,
  },
  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  sidebarLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3F2222',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  sidebarLogoutText: {
    color: '#FCA5A5',
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerMenuBtn: {
    padding: 4,
  }
});
