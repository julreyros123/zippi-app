import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ScrollView, Alert, SafeAreaView, Modal, LayoutAnimation, UIManager, Animated, Image, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState, useRef, useCallback } from 'react';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import { API_URL, SOCKET_URL } from '../constants/Config';
import io from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

let socket: any;
const MODULES = ['home', 'channels', 'discover', 'classmates', 'events', 'announcements', 'userProfile'] as const;
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
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuthStore();
  const { channels, setChannels, messages, setMessages, addMessage, activeChannel, setActiveChannel } = useChatStore();
  const [inputText, setInputText] = useState('');
  const [view, setView] = useState<'channels' | 'messages' | 'profile'>('channels');
  const [activeModule, setActiveModule] = useState<ModuleTab>('home');
  const [publicChannels, setPublicChannels] = useState<any[]>([]);
  const [classmates, setClassmates] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [joiningChannelId, setJoiningChannelId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const pickMedia = async () => {
    try {
      Alert.alert(
        'Upload File',
        'Choose what you want to attach',
        [
          {
            text: 'Photo library',
            onPress: async () => {
              let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                allowsEditing: true,
                quality: 1,
              });
              if (!result.canceled) {
                Alert.alert('Image Attached', 'Image selection is ready to be sent to the backend.');
              }
            }
          },
          {
            text: 'Document',
            onPress: async () => {
              let result = await DocumentPicker.getDocumentAsync({});
              if (!result.canceled) {
                Alert.alert('Document Attached', 'Document selection is ready to be sent to the backend.');
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (e) {
      console.log('Picker error', e);
    }
  };

  const renderNetworkBanner = () => {
    if (isConnected || isConnected === null) return null;
    return (
      <View style={styles.networkBanner}>
        <Ionicons name="cloud-offline-outline" size={16} color="white" />
        <Text style={styles.networkBannerText}>No Internet Connection - Trying to reconnect...</Text>
      </View>
    );
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSidebarOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -400, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true })
      ]).start();
    }
  }, [isSidebarOpen]);

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '' });
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', scheduledAt: '', emoji: '📅' });
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [activePostMenuId, setActivePostMenuId] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postText, setPostText] = useState('');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [posts, setPosts] = useState<{id: string; text: string; userId: string; username: string; createdAt: string; likes: number; shares: number; hasLiked?: boolean; comments?: {id: string; username: string; text: string}[]; isArchived?: boolean;}[]>([
    { id: '1', text: 'Excited to start using Zippi!', userId: 'sys', username: 'Zippi Team', createdAt: new Date().toISOString(), likes: 3, shares: 0, hasLiked: false, comments: [], isArchived: false }
  ]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [followingUsers, setFollowingUsers] = useState<string[]>([]);
  const [profileTab, setProfileTab] = useState<'posts'|'media'|'likes'>('posts');

  // Enable LayoutAnimation for Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

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

  const handleCreatePost = () => {
    if (!postText.trim()) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newP = {
      id: Date.now().toString(),
      text: postText.trim(),
      userId: user?.id || 'me',
      username: user?.nickname || user?.username || 'Me',
      createdAt: new Date().toISOString(),
      likes: 0,
      shares: 0,
      hasLiked: false,
      comments: [],
      isArchived: false
    };
    setPosts([newP, ...posts]);
    setPostText('');
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
      case 'home': return { title: 'Home', subtitle: 'Stay updated with your community' };
      case 'channels': return { title: 'My Channels', subtitle: 'Pick a room to continue chatting' };
      case 'discover': return { title: 'Discover', subtitle: 'Find new public spaces' };
      case 'classmates': return { title: 'Classmates', subtitle: 'Connect with students in your network' };
      case 'events': return { title: 'Events', subtitle: 'Upcoming activities and dates' };
      case 'announcements': return { title: 'Announcements', subtitle: 'Important updates from the faculty' };
      default: return { title: 'Zippi', subtitle: 'Connect and collaborate' };
    }
  };

  if (view === 'profile') {
    return (
      <SafeAreaView style={styles.container}>
        {renderNetworkBanner()}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={() => setView('channels')} style={styles.profileBackBtn}>
            <Ionicons name="chevron-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <Text style={styles.profileHeaderTitle}>Profile & Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.profileContent}>
          <View style={styles.profileAvatarContainer}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{(user?.username || 'U').charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.profileName}>{user?.nickname || user?.username}</Text>
            <Text style={styles.profileUsername}>@{user?.username}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>

          <View style={styles.profileSectionWrapper}>
            <Text style={styles.profileSectionTitle}>App Settings</Text>
            <View style={styles.profileSection}>
              <TouchableOpacity style={styles.profileOptionRow} onPress={() => Alert.alert('Notifications', 'Toggle notification preferences.')}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <Ionicons name="notifications-outline" size={22} color="white" />
                  <Text style={styles.profileOptionLabel}>Notifications</Text>
                </View>
                <Text style={styles.profileOptionSub}>Enabled</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileOptionRow} onPress={() => Alert.alert('Dark Mode', 'Dark Mode is currently enforced by system settings.')}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <Ionicons name="moon-outline" size={22} color="white" />
                  <Text style={styles.profileOptionLabel}>Dark Mode</Text>
                </View>
                <Text style={styles.profileOptionSub}>On</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.profileSectionWrapper}>
            <Text style={styles.profileSectionTitle}>Account & Privacy</Text>
            <View style={styles.profileSection}>
              <TouchableOpacity style={styles.profileOptionRow} onPress={() => Alert.alert('Profile Settings', 'Personal information configuration opens here.')}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <Ionicons name="person-outline" size={22} color="white" />
                  <Text style={styles.profileOptionLabel}>Profile Settings</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileOptionRow} onPress={() => Alert.alert('Profile Privacy', 'Adjust who can see your profile.')}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <Ionicons name="lock-closed-outline" size={22} color="white" />
                  <Text style={styles.profileOptionLabel}>Profile Privacy</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileOptionRow} onPress={() => Alert.alert('Post Privacy', 'Configure default visibility for new posts.')}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <Ionicons name="eye-off-outline" size={22} color="white" />
                  <Text style={styles.profileOptionLabel}>Post Privacy</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileOptionRow} onPress={async () => {
                try {
                  await Share.share({ message: `Connect with me on Zippi: zippi.app/@${user?.username}`});
                } catch (e) {}
              }}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <Ionicons name="link-outline" size={22} color="white" />
                  <Text style={styles.profileOptionLabel}>Share Profile Link</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileOptionRow} onPress={() => {
                const archived = posts.filter(p => p.isArchived);
                if(archived.length === 0) {
                  Alert.alert('Archived Posts', 'You have no archived posts.');
                } else {
                  Alert.alert('Archived Posts', `You have ${archived.length} archived posts.\n\nOption to restore coming soon!`, [
                    { text: 'Unarchive All', onPress: () => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setPosts(posts.map(p => ({...p, isArchived: false})));
                    }},
                    { text: 'Close', style: 'cancel' }
                  ]);
                }
              }}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <Ionicons name="archive-outline" size={22} color="white" />
                  <Text style={styles.profileOptionLabel}>Archived Posts</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileOptionRow} onPress={() => {
                if(blockedUsers.length === 0) {
                  Alert.alert('Blocked Users', 'You have not blocked anyone.');
                } else {
                  Alert.alert('Blocked Users', `You have blocked ${blockedUsers.length} users.\n\nOption to unblock coming soon!`, [
                    { text: 'Unblock All', onPress: () => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setBlockedUsers([]);
                    }},
                    { text: 'Close', style: 'cancel' }
                  ]);
                }
              }}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <Ionicons name="hand-left-outline" size={22} color="white" />
                  <Text style={styles.profileOptionLabel}>Blocked Users</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileOptionRow} onPress={() => Alert.alert('Edit Password', 'Security and password configuration opens here.')}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <Ionicons name="key-outline" size={22} color="white" />
                  <Text style={styles.profileOptionLabel}>Edit Password</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.profileSectionWrapper}>
            <Text style={styles.profileSectionTitle}>Legal & Info</Text>
            <View style={styles.profileSection}>
              <TouchableOpacity style={styles.profileOptionRow} onPress={() => Alert.alert('Terms and Conditions', 'Displays End User License Agreement (EULA).')}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <Ionicons name="document-text-outline" size={22} color="white" />
                  <Text style={styles.profileOptionLabel}>Terms and Conditions</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileOptionRow} onPress={() => Alert.alert('Privacy Policy', 'Displays data processing specifications.')}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <Ionicons name="shield-checkmark-outline" size={22} color="white" />
                  <Text style={styles.profileOptionLabel}>Privacy Policy</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileOptionRow} onPress={logout}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                    <Text style={{fontSize: 16, fontWeight: 'bold', color: '#EF4444', marginLeft: 16}}>Sign Out</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (view === 'channels') {
    const { title, subtitle } = getHeaderContent();

    return (
      <SafeAreaView style={styles.container}>
        {renderNetworkBanner()}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.headerMenuBtn}>
            <Ionicons name="menu" size={28} color="#F8FAFC" />
          </TouchableOpacity>
          
          <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 16}}>
            <Image 
              source={require('../../assets/images/icon.png')} 
              style={{width: 32, height: 32, borderRadius: 8}} 
              resizeMode="cover" 
            />
            <Text style={{color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', marginLeft: 10}}>Zippi</Text>
          </View>
          
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 16}}>
            <TouchableOpacity onPress={() => { Alert.alert('Search', 'Search feature coming soon!'); }}>
              <Ionicons name="search-outline" size={24} color="#F8FAFC" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Alert.alert('Notifications', 'You have no new notifications.'); }}>
              <Ionicons name="notifications-outline" size={24} color="#F8FAFC" />
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View style={[styles.sidebarOverlay, { opacity: fadeAnim }]} pointerEvents={isSidebarOpen ? "auto" : "none"}>
          <Animated.View style={[styles.sidebarContent, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.sidebarHeader}>
              <TouchableOpacity onPress={() => { setIsSidebarOpen(false); setViewingUserId(user?.id || 'me'); }} style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
                <View style={styles.sidebarUserAvatar}>
                  <Text style={styles.sidebarUserAvatarText}>{(user?.username || 'U').charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.sidebarTitle}>{user?.nickname || user?.username}</Text>
                  <Text style={styles.sidebarSubtitle}>@{user?.username}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsSidebarOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.sidebarScroll} contentContainerStyle={{paddingBottom: 40}}>
              <View style={styles.sidebarNavGroup}>
                <TouchableOpacity style={styles.sidebarNavItem} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setView('profile'); setIsSidebarOpen(false); }}>
                  <Ionicons name="person-circle-outline" size={22} color="#E5E7EB" />
                  <Text style={styles.sidebarNavItemText}>Profile & Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sidebarNavItem} onPress={() => { setActiveModule('discover'); setIsSidebarOpen(false); }}>
                  <Ionicons name="compass-outline" size={22} color="#E5E7EB" />
                  <Text style={styles.sidebarNavItemText}>Discover Channels</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sidebarNavItem} onPress={() => { setActiveModule('classmates'); setIsSidebarOpen(false); }}>
                  <Ionicons name="people-outline" size={22} color="#E5E7EB" />
                  <Text style={styles.sidebarNavItemText}>Classmates</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sidebarNavItem} onPress={() => { setActiveModule('events'); setIsSidebarOpen(false); }}>
                  <Ionicons name="calendar-outline" size={22} color="#E5E7EB" />
                  <Text style={styles.sidebarNavItemText}>Events</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sidebarNavItem} onPress={() => { setActiveModule('announcements'); setIsSidebarOpen(false); }}>
                  <Ionicons name="megaphone-outline" size={22} color="#E5E7EB" />
                  <Text style={styles.sidebarNavItemText}>News & Updates</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sidebarSectionTitle}>Active Now ({classmates.length})</Text>
              {classmates.map(cm => {
                const conn = connections.find(c => 
                  (c.userAId === cm.id && c.userBId === user?.id) || 
                  (c.userBId === cm.id && c.userAId === user?.id)
                );
                const isConnected = conn?.status === 'ACCEPTED';
                
                return (
                <TouchableOpacity key={cm.id} onPress={() => { setIsSidebarOpen(false); setViewingUserId(cm.id); }} style={styles.sidebarUserItem}>
                  <View style={styles.sidebarUserAvatarSmall}>
                    <Text style={styles.sidebarUserAvatarTextSmall}>{(cm.nickname || cm.username).charAt(0).toUpperCase()}</Text>
                    <View style={styles.onlineIndicator} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.sidebarUserName} numberOfLines={1}>{cm.nickname || cm.username}</Text>
                      {isConnected && <Ionicons name="checkmark-circle" size={14} color="#34D399" style={{ marginLeft: 4, marginTop: -2 }} />}
                    </View>
                    <Text style={styles.sidebarUserStatus}>Online</Text>
                  </View>
                </TouchableOpacity>
              )})}
            </ScrollView>
          </Animated.View>

          <TouchableOpacity style={styles.sidebarCloseArea} onPress={() => setIsSidebarOpen(false)} activeOpacity={1} />
        </Animated.View>

        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 100 }}>
          {activeModule === 'home' && (
            <>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '600', marginBottom: 10 }}>Active Friends</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={classmates.length === 0 ? { flex: 1 } : {}}>
                  {classmates.length === 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.4 }}>
                      {[1, 2, 3, 4].map(placeholder => (
                        <View key={placeholder} style={{ alignItems: 'center', marginRight: 12, width: 48 }}>
                          <View style={[styles.profileAvatarSmall, { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' }]} />
                        </View>
                      ))}
                    </View>
                  ) : (
                    classmates.map(cm => (
                      <TouchableOpacity key={cm.id} onPress={() => setViewingUserId(cm.id)} style={{ alignItems: 'center', marginRight: 12, width: 48 }}>
                        <View style={[styles.profileAvatarSmall, { width: 48, height: 48, borderRadius: 24 }]}>
                          <Text style={{ color: 'white', fontWeight: 'bold' }}>{(cm.nickname || cm.username).charAt(0).toUpperCase()}</Text>
                          <View style={[styles.onlineIndicator, { right: 0, bottom: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#000' }]} />
                        </View>
                        <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 6, width: 48, textAlign: 'center' }} numberOfLines={1}>{cm.nickname || cm.username}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <TouchableOpacity style={styles.toolBtn} onPress={() => setActiveModule('events')}>
                   <Ionicons name="calendar-outline" size={20} color="#60A5FA" />
                   <Text style={styles.toolBtnText}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => setActiveModule('channels')}>
                   <Ionicons name="chatbubbles-outline" size={20} color="#34D399" />
                   <Text style={styles.toolBtnText}>Rooms</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => setActiveModule('discover')}>
                   <Ionicons name="compass-outline" size={20} color="#F472B6" />
                   <Text style={styles.toolBtnText}>Discover</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.createPostCard}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                  <TouchableOpacity onPress={() => setViewingUserId(user?.id || 'me')} style={styles.profileAvatarSmall}>
                    <Text style={{color: 'white', fontWeight: '700'}}>{(user?.username || 'U').charAt(0).toUpperCase()}</Text>
                  </TouchableOpacity>
                  <TextInput style={styles.createPostInput} placeholder="Share an update..." placeholderTextColor="#6B7280" value={postText} onChangeText={setPostText} />
                </View>

                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 0 }}>
                  <View style={{flexDirection: 'row'}}>
                    <TouchableOpacity style={styles.createPostAction}><Ionicons name="image-outline" size={22} color="#60A5FA" /><Text style={styles.createPostActionText}>Photo</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.createPostAction}><Ionicons name="document-text-outline" size={22} color="#60A5FA" /><Text style={styles.createPostActionText}>Attach</Text></TouchableOpacity>
                  </View>
                  <TouchableOpacity style={[styles.formSubmitBtn, { paddingVertical: 8, paddingHorizontal: 20 }, !postText.trim() && { opacity: 0.6, backgroundColor: '#374151' }]} disabled={!postText.trim()} onPress={() => { handleCreatePost(); }}>
                    <Text style={[styles.formSubmitText, !postText.trim() && { color: '#9CA3AF' }]}>Post</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ marginTop: 0 }}>
                {posts.filter(p => !p.isArchived && !blockedUsers.includes(p.userId)).length === 0 ? (
                  <View style={styles.emptyStateCard}><Text style={styles.emptySubtitle}>No posts yet — check back later.</Text></View>
                ) : (
                  posts.filter(p => !p.isArchived && !blockedUsers.includes(p.userId)).map((post) => (
                    <View key={post.id} style={styles.postItem}>
                      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between'}}>
                        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center'}} onPress={() => { setViewingUserId(post.userId); }}>
                          <View style={[styles.profileAvatarSmall, { width: 36, height: 36, borderRadius: 18, backgroundColor: '#374151' }]}>
                            <Text style={{color: 'white', fontWeight: '700', fontSize: 14}}>{post.username.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={{marginLeft: 10}}>
                            <Text style={styles.postUserName}>{post.username}</Text>
                            <Text style={styles.postTimeText}>{timeAgo(post.createdAt)}</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={{padding: 8}} onPress={() => {
                          setActivePostMenuId(post.id);
                        }}>
                          <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.postContent}>{post.text}</Text>
                      <View style={styles.postActionRow}>
                        <TouchableOpacity style={styles.postActionBtn} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setPosts(posts.map(p => p.id === post.id ? {...p, likes: p.hasLiked ? Math.max(0, p.likes - 1) : p.likes + 1, hasLiked: !p.hasLiked} : p)); }}>
                          <Ionicons name={post.hasLiked ? "heart" : "heart-outline"} size={20} color={post.hasLiked ? "#F43F5E" : "#9CA3AF"} />
                          <Text style={[styles.postActionText, post.hasLiked && { color: '#F43F5E' }]}>{post.likes > 0 ? post.likes : 'Like'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.postActionBtn} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id); }}>
                          <Ionicons name="chatbubble-outline" size={18} color={activeCommentPostId === post.id ? "#60A5FA" : "#9CA3AF"} />
                          <Text style={[styles.postActionText, activeCommentPostId === post.id && { color: '#60A5FA' }]}>{(post.comments?.length || 0) > 0 ? post.comments!.length : 'Comment'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.postActionBtn} onPress={async () => { 
                          try {
                            const res = await Share.share({ message: `Check out ${post.username}'s post: ${post.text}`});
                            if (res.action === Share.sharedAction) {
                              setPosts(posts.map(p => p.id === post.id ? {...p, shares: p.shares + 1} : p));
                            }
                          } catch (e) {
                            Alert.alert('Share Failed', 'Could not share post.');
                          }
                        }}>
                          <Ionicons name="share-outline" size={18} color="#9CA3AF" />
                          <Text style={styles.postActionText}>{(post.shares||0) > 0 ? post.shares : 'Share'}</Text>
                        </TouchableOpacity>
                      </View>

                      {activeCommentPostId === post.id && (
                        <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#1E293B', paddingTop: 12 }}>
                          {(post.comments || []).map((c, i) => (
                            <View key={i} style={{ flexDirection: 'row', marginBottom: 12 }}>
                              <View style={[styles.profileAvatarSmall, { width: 28, height: 28, borderRadius: 14, backgroundColor: '#374151', marginRight: 10 }]}>
                                <Text style={{color: 'white', fontSize: 12, fontWeight: '700'}}>{c.username.charAt(0).toUpperCase()}</Text>
                              </View>
                              <View style={{ backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, flex: 1 }}>
                                <Text style={{ color: '#F8FAFC', fontSize: 13, fontWeight: '600', marginBottom: 2 }}>{c.username}</Text>
                                <Text style={{ color: '#D1D5DB', fontSize: 14 }}>{c.text}</Text>
                              </View>
                            </View>
                          ))}
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 8 }}>
                            <TextInput 
                              style={{ flex: 1, backgroundColor: '#111827', color: '#F8FAFC', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 }} 
                              placeholder="Write a comment..." 
                              placeholderTextColor="#6B7280" 
                              returnKeyType="send"
                              onSubmitEditing={({ nativeEvent }) => {
                                const text = nativeEvent.text.trim();
                                if(text) {
                                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                  setPosts(posts.map(p => p.id === post.id ? {...p, comments: [...(p.comments||[]), {id: Date.now().toString(), username: user?.nickname || user?.username || 'Me', text}]} : p));
                                  setActiveCommentPostId(null);
                                }
                              }} 
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          {activeModule === 'channels' && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>My Channels</Text>
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
              </View>
              {publicChannels.filter((c) => !channels.some((my) => my.id === c.id) && !classmates.some(cl => cl.username === c.name || cl.nickname === c.name)).length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptySubtitle}>No public channels available right now.</Text>
                </View>
              ) : (
                publicChannels
                  .filter((c) => !channels.some((my) => my.id === c.id) && !classmates.some(cl => cl.username === c.name || cl.nickname === c.name))
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

        <View style={[styles.bottomTabBar, { paddingBottom: Math.max(insets.bottom, 6), height: 60 + Math.max(insets.bottom, 6) }]}>
          {['home', 'channels'].map((tab) => {
            let iconName = 'chatbubble';
            if (tab === 'home') iconName = 'home';
            const isActive = activeModule === tab;
            return (
              <TouchableOpacity key={tab} style={styles.tabItem} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveModule(tab as ModuleTab); }}>
                <Ionicons name={isActive ? (iconName as any) : `${iconName}-outline` as any} size={24} color={isActive ? '#6366F1' : '#6B7280'} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab === 'channels' ? 'Chat' : 'Home'}
                </Text>
              </TouchableOpacity>
            )

          })}
        </View>

        {['home', 'channels', 'events', 'announcements'].includes(activeModule) && (
          <TouchableOpacity
            style={[styles.fab, { bottom: Math.max(insets.bottom, 20) + 70, zIndex: 9999, elevation: 12 }]}
            onPress={() => {
              if (activeModule === 'home') setShowCreatePost(!showCreatePost);
              if (activeModule === 'channels') setShowCreateChannel(!showCreateChannel);
              if (activeModule === 'events') setShowCreateEvent(!showCreateEvent);
              if (activeModule === 'announcements') setShowCreateAnnouncement(!showCreateAnnouncement);
            }}
          >
            <Ionicons name={
              (activeModule === 'channels' && showCreateChannel) ||
              (activeModule === 'events' && showCreateEvent) ||
              (activeModule === 'announcements' && showCreateAnnouncement) ||
              (activeModule === 'home' && showCreatePost)
                ? 'close'
                : 'add'
            } size={28} color="white" />
          </TouchableOpacity>
        )}

        <Modal visible={!!activePostMenuId} transparent animationType="fade" onRequestClose={() => setActivePostMenuId(null)}>
          <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setActivePostMenuId(null)}>
            <View style={{backgroundColor: '#111827', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 20}}>
              <View style={{width: 40, height: 4, backgroundColor: '#374151', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 12}} />
              {activePostMenuId && (() => {
                const targetPost = posts.find(p => p.id === activePostMenuId);
                if (!targetPost) return null;
                const isMine = targetPost.userId === (user?.id || 'me');
                return isMine ? (
                  <>
                    <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', padding: 16}} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setPosts(posts.map(p => p.id === targetPost.id ? {...p, isArchived: true} : p)); setActivePostMenuId(null); }}>
                      <Ionicons name="archive-outline" size={24} color="#F8FAFC" />
                      <Text style={{color: '#F8FAFC', fontSize: 16, marginLeft: 16, fontWeight: '500'}}>Archive Post</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', padding: 16}} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setPosts(posts.filter(p => p.id !== targetPost.id)); setActivePostMenuId(null); }}>
                      <Ionicons name="trash-outline" size={24} color="#EF4444" />
                      <Text style={{color: '#EF4444', fontSize: 16, marginLeft: 16, fontWeight: '500'}}>Delete Post</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', padding: 16}} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setBlockedUsers([...blockedUsers, targetPost.userId]); setActivePostMenuId(null); }}>
                      <Ionicons name="hand-left-outline" size={24} color="#EF4444" />
                      <Text style={{color: '#EF4444', fontSize: 16, marginLeft: 16, fontWeight: '500'}}>Block User</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={!!viewingUserId} transparent animationType="slide" onRequestClose={() => setViewingUserId(null)}>
          <View style={{flex: 1, backgroundColor: '#000000'}}>
            <ScrollView contentContainerStyle={{flexGrow: 1}} bounces={false}>
              {/* Cover Image Header */}
              <View style={{height: 180, width: '100%', backgroundColor: '#1E1B4B', overflow: 'hidden'}}>
                <View style={{...StyleSheet.absoluteFillObject, opacity: 0.1, backgroundColor: '#4F46E5'}} />
                <View style={{marginTop: Platform.OS === 'ios' ? 44 : 20, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <TouchableOpacity onPress={() => setViewingUserId(null)} style={{backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20}}>
                    <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
                  </TouchableOpacity>
                  <TouchableOpacity style={{backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20}}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="#F8FAFC" />
                  </TouchableOpacity>
                </View>
              </View>

              {blockedUsers.includes(viewingUserId || '') ? (
                <View style={{alignItems: 'center', marginTop: 100}}>
                  <Ionicons name="lock-closed" size={64} color="#374151" />
                  <Text style={{color: '#F8FAFC', fontSize: 24, fontWeight: 'bold', marginTop: 16}}>Space Unavailable</Text>
                  <Text style={{color: '#9CA3AF', fontSize: 14, marginTop: 8, textAlign: 'center', marginHorizontal: 32}}>
                    This user's space is currently unavailable or blocked.
                  </Text>
                  <TouchableOpacity style={{marginTop: 32, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#374151', borderRadius: 24}} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setBlockedUsers(blockedUsers.filter(id => id !== viewingUserId)); }}>
                    <Text style={{color: '#F8FAFC', fontWeight: 'bold'}}>Unblock User</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{paddingHorizontal: 16, paddingBottom: 40}}>
                  {/* Profile Info Section */}
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -40}}>
                    <View style={{width: 90, height: 90, borderRadius: 45, backgroundColor: '#111827', borderWidth: 4, borderColor: '#000000', justifyContent: 'center', alignItems: 'center'}}>
                      <Text style={{color: '#F8FAFC', fontSize: 36, fontWeight: 'bold'}}>
                        {(() => {
                          const u = viewingUserId === (user?.id || 'me') ? user?.username : (posts.find(p => p.userId === viewingUserId)?.username || classmates.find(c => c.id === viewingUserId)?.username);
                          return (u || 'U').charAt(0).toUpperCase();
                        })()}
                      </Text>
                    </View>
                    
                    {viewingUserId !== (user?.id || 'me') ? (
                      <View style={{flexDirection: 'row', gap: 8, paddingBottom: 8}}>
                        <TouchableOpacity onPress={() => { setViewingUserId(null); setActiveModule('channels'); setView('channels'); }} style={{backgroundColor: '#1E1B4B', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#4F46E5'}}>
                          <Text style={{color: '#6366F1', fontWeight: '600', fontSize: 14}}>Message</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); if (followingUsers.includes(viewingUserId!)) { setFollowingUsers(followingUsers.filter(id => id !== viewingUserId)); } else { setFollowingUsers([...followingUsers, viewingUserId!]); } }} style={{backgroundColor: followingUsers.includes(viewingUserId!) ? 'transparent' : '#F8FAFC', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: followingUsers.includes(viewingUserId!) ? '#374151' : '#F8FAFC'}}>
                          <Text style={{color: followingUsers.includes(viewingUserId!) ? '#F8FAFC' : '#000000', fontWeight: 'bold', fontSize: 14}}>{followingUsers.includes(viewingUserId!) ? 'Following' : 'Follow'}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{paddingBottom: 8}}>
                        <TouchableOpacity onPress={() => { setViewingUserId(null); setView('profile'); }} style={{backgroundColor: 'transparent', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#374151'}}>
                          <Text style={{color: '#F8FAFC', fontWeight: '600', fontSize: 14}}>Edit profile</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View style={{marginTop: 12}}>
                    <Text style={{color: '#F8FAFC', fontSize: 22, fontWeight: '900'}}>
                      {viewingUserId === (user?.id || 'me') ? (user?.nickname || user?.username) : (posts.find(p => p.userId === viewingUserId)?.username || classmates.find(c => c.id === viewingUserId)?.username || 'User')}
                    </Text>
                    <Text style={{color: '#9CA3AF', fontSize: 15, marginTop: 2}}>
                      @{viewingUserId === (user?.id || 'me') ? user?.username : (posts.find(p => p.userId === viewingUserId)?.username || classmates.find(c => c.id === viewingUserId)?.username || 'user')}
                    </Text>
                  </View>

                  <Text style={{color: '#D1D5DB', fontSize: 15, marginTop: 14, lineHeight: 20}}>
                    {viewingUserId === (user?.id || 'me') ? "Building my digital space. 🚀" : "Always exploring and sharing interesting things here."}
                  </Text>
                  
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16}}>
                    <Text style={{color: '#9CA3AF', fontSize: 14}}><Text style={{color: '#F8FAFC', fontWeight: 'bold', fontSize: 15}}>24</Text> Following</Text>
                    <Text style={{color: '#9CA3AF', fontSize: 14}}><Text style={{color: '#F8FAFC', fontWeight: 'bold', fontSize: 15}}>128</Text> Followers</Text>
                  </View>
                  
                  {/* Tabs */}
                  <View style={{flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#27272A', marginTop: 24}}>
                    <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setProfileTab('posts'); }} style={{flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: profileTab === 'posts' ? 3 : 0, borderBottomColor: '#6366F1'}}>
                      <Text style={{color: profileTab === 'posts' ? '#F8FAFC' : '#9CA3AF', fontWeight: profileTab === 'posts' ? 'bold' : '500', fontSize: 15}}>Posts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setProfileTab('media'); }} style={{flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: profileTab === 'media' ? 3 : 0, borderBottomColor: '#6366F1'}}>
                      <Text style={{color: profileTab === 'media' ? '#F8FAFC' : '#9CA3AF', fontWeight: profileTab === 'media' ? 'bold' : '500', fontSize: 15}}>Media</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setProfileTab('likes'); }} style={{flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: profileTab === 'likes' ? 3 : 0, borderBottomColor: '#6366F1'}}>
                      <Text style={{color: profileTab === 'likes' ? '#F8FAFC' : '#9CA3AF', fontWeight: profileTab === 'likes' ? 'bold' : '500', fontSize: 15}}>Likes</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Feed */}
                  <View style={{marginTop: 16}}>
                    {profileTab === 'posts' ? (
                      posts.filter(p => p.userId === viewingUserId && !p.isArchived).length === 0 ? (
                        <View style={{alignItems: 'center', justifyContent: 'center', paddingVertical: 60}}>
                          <Text style={{color: '#F8FAFC', fontSize: 20, fontWeight: 'bold'}}>No posts yet</Text>
                          <Text style={{color: '#6B7280', marginTop: 8, textAlign: 'center'}}>When they post something, it will show up here.</Text>
                        </View>
                      ) : (
                        posts.filter(p => p.userId === viewingUserId && !p.isArchived).map(post => (
                          <View key={post.id} style={{paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#27272A'}}>
                            <View style={{flexDirection: 'row', gap: 12}}>
                              <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center'}}>
                                 <Text style={{color: '#F8FAFC', fontWeight: 'bold'}}>{post.username.charAt(0).toUpperCase()}</Text>
                              </View>
                              <View style={{flex: 1}}>
                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                                  <Text style={{color: '#F8FAFC', fontWeight: 'bold', fontSize: 15}}>{post.username}</Text>
                                  <Text style={{color: '#6B7280', fontSize: 14}}>@{post.username} · {timeAgo(post.createdAt)}</Text>
                                </View>
                                <Text style={{color: '#E5E7EB', fontSize: 15, marginTop: 4, lineHeight: 20}}>{post.text}</Text>
                                
                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 12}}>
                                  <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                                    <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
                                    <Text style={{color: '#6B7280', fontSize: 13}}>{post.comments?.length || 0}</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', gap: 6}} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setPosts(posts.map(p => p.id === post.id ? {...p, likes: p.hasLiked ? Math.max(0, p.likes - 1) : p.likes + 1, hasLiked: !p.hasLiked} : p)); }}>
                                    <Ionicons name={post.hasLiked ? "heart" : "heart-outline"} size={18} color={post.hasLiked ? "#F43F5E" : "#6B7280"} />
                                    <Text style={{color: post.hasLiked ? "#F43F5E" : "#6B7280", fontSize: 13}}>{post.likes}</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity>
                                    <Ionicons name="share-outline" size={18} color="#6B7280" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          </View>
                        ))
                      )
                    ) : profileTab === 'media' ? (
                      <View style={{alignItems: 'center', justifyContent: 'center', paddingVertical: 60}}>
                        <Ionicons name="images-outline" size={48} color="#374151" />
                        <Text style={{color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', marginTop: 16}}>No media yet</Text>
                        <Text style={{color: '#6B7280', marginTop: 8, textAlign: 'center'}}>Photos and videos shared will appear here.</Text>
                      </View>
                    ) : (
                      <View style={{alignItems: 'center', justifyContent: 'center', paddingVertical: 60}}>
                        <Ionicons name="heart-outline" size={48} color="#374151" />
                        <Text style={{color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', marginTop: 16}}>No liked posts</Text>
                        <Text style={{color: '#6B7280', marginTop: 8, textAlign: 'center'}}>Posts they've liked will show up here.</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>

      </SafeAreaView>
    );
  }

  const activeChannelObj = channels.find(c => c.id === activeChannel);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {renderNetworkBanner()}
      <View style={styles.chatHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setView('channels')} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <Text style={styles.chatHeaderTitle} numberOfLines={1}># {activeChannelObj?.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ padding: 8, marginRight: 8 }} onPress={() => {
            const url = `/call?channel=${activeChannelObj?.id}&name=${encodeURIComponent(activeChannelObj?.name || 'Channel')}&isVideo=false`;
            router.push(url as any);
          }}>
            <Ionicons name="call" size={20} color="#34D399" />
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 8 }} onPress={() => {
            const url = `/call?channel=${activeChannelObj?.id}&name=${encodeURIComponent(activeChannelObj?.name || 'Channel')}&isVideo=true`;
            router.push(url as any);
          }}>
            <Ionicons name="videocam" size={24} color="#60A5FA" />
          </TouchableOpacity>
        </View>
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
        <TouchableOpacity style={styles.attachButton} onPress={pickMedia}>
          <Ionicons name="add" size={24} color="#94A3B8" />
        </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'ios' ? 50 : 30 },
  networkBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 47 : 30,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  networkBannerText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 8,
  },
  header: {
    minHeight: 60,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerMenuBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#111111',
  },
  headerSettingsBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#111111',
  },
  headerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  headerSubtitle: { color: '#94A3B8', fontSize: 13, marginTop: 2, fontWeight: '500' },
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
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#262626',
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
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    marginBottom: 0,
  },
  channelIcon: { color: '#6B7280', fontSize: 18, marginRight: 12 },
  channelName: { color: '#E5E7EB', fontSize: 16, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#E5E7EB', fontSize: 15, fontWeight: '700' },
  refreshText: { color: '#60A5FA', fontSize: 13, fontWeight: '700' },
  formCard: { backgroundColor: '#000000', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#262626' },
  formInput: { backgroundColor: '#0a0a0a', color: 'white', borderWidth: 1, borderColor: '#262626', borderRadius: 6, padding: 8, marginBottom: 10 },
  formSubmitBtn: { backgroundColor: '#4F46E5', borderRadius: 6, alignItems: 'center', padding: 12 },
  formSubmitText: { color: 'white', fontWeight: 'bold' },
  connectBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  connectedBtn: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#262626' },
  connectBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  connectedBtnText: { color: '#9CA3B8' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  emptyStateCard: {
    backgroundColor: '#000000',
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
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    paddingVertical: 12,
    marginBottom: 0,
  },
  channelDescription: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  joinButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  joinButtonDisabled: { opacity: 0.6 },
  joinButtonText: { color: 'white', fontSize: 12, fontWeight: '700' },
  infoCard: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    paddingVertical: 12,
    marginBottom: 0,
  },
  infoTitle: { color: '#E2E8F0', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  infoMeta: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  infoTime: { color: '#64748B', fontSize: 11, marginTop: 6 },
  
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    paddingHorizontal: 16
  },
  backButton: { marginRight: 8, padding: 4 },
  backText: { color: '#60A5FA', fontSize: 15, fontWeight: '700' },
  chatHeaderTitle: { color: 'white', fontSize: 17, fontWeight: '700', flex: 1 },
  
  messageWrapper: { marginVertical: 4, flexDirection: 'row' },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperOther: { justifyContent: 'flex-start' },
  messageBubble: {
    maxWidth: '80%', padding: 12, borderRadius: 16,
  },
  messageBubbleMe: { backgroundColor: '#2563EB', borderBottomRightRadius: 4 },
  messageBubbleOther: { backgroundColor: '#000000', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#262626' },
  messageUsername: { color: '#60A5FA', fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  messageText: { color: 'white', fontSize: 15 },
  
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    alignItems: 'center'
  },
  attachButton: {
    marginRight: 10,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 18,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#262626',
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
    position: 'absolute',
    top: 0, left: 0, bottom: 0, right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    zIndex: 999,
    elevation: 999,
  },
  sidebarCloseArea: {
    flex: 1,
  },
  sidebarContent: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#000000',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    height: '100%',
    elevation: 10,
    borderRightWidth: 1,
    borderRightColor: '#262626',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  sidebarUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarUserAvatarText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
  },
  sidebarTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  sidebarSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
  },
  sidebarScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sidebarSectionTitle: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sidebarUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  sidebarUserAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#262626',
  },
  sidebarUserAvatarTextSmall: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#0a0a0a',
  },
  sidebarUserName: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  sidebarUserStatus: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
  },
  sidebarFooter: {
    padding: 24,
  },
  sidebarLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2A1414', // Subtle red hint
    paddingVertical: 14,
    borderRadius: 16, // Modern radius
  },
  sidebarLogoutText: {
    color: '#FCA5A5',
    fontSize: 16,
    fontWeight: '700',
  },
  createPostCard: {
    backgroundColor: '#000000',
    paddingBottom: 16,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  createPostInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    maxHeight: 120,
    marginLeft: 12,
  },
  createPostAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 0,
    marginRight: 16,
  },
  createPostActionText: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '600',
  },
  postItem: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  postUserName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  postTimeText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 1,
  },
  postContent: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 6,
    marginBottom: 16,
  },
  postActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 8,
  },
  postActionText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  postActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
    marginTop: 10,
  },
  toolBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    justifyContent: 'center',
    gap: 6,
  },
  toolBtnText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
  },
  sidebarNavGroup: {
    marginBottom: 20,
    paddingBottom: 8,
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  sidebarNavItemText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  profileAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#262626',
    marginBottom: 12,
  },
  sidebarProfileText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    minHeight: 70,
  },
  profileBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  profileHeaderTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  profileContent: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#000000',
  },
  profileAvatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  profileName: {
    color: '#F9FAFB',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    color: '#9CA3AF',
    fontSize: 15,
  },
  profileAvatarText: {
    color: '#F9FAFB',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileUsername: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
  },
  profileSectionWrapper: {
    marginBottom: 24,
  },
  profileSectionTitle: {
    color: '#9CA3B8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  profileSection: {
    backgroundColor: '#000000',
  },
  profileOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  profileOptionLabel: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '500',
  },
  profileOptionSub: {
    color: '#9CA3B8',
    fontSize: 15,
  },
});
