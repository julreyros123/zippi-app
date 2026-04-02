import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import {
  Home, BookOpen, Users, Search, LogOut, Hash, Lock, Globe,
  Plus, ArrowRight, MessageSquare, Zap, Star, Calendar,
  Sparkles, GraduationCap, UserPlus, Check, Megaphone,
  Trash2, X, Bell, ChevronDown, User, Shield, Settings,
  Sun, Moon, Heart, MessageCircle, MoreHorizontal, Monitor,
  Type, Volume2, AlertTriangle, Sliders, Menu
} from 'lucide-react';

const API_URL = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '')}/api`;
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const NAV_ITEMS = [
  { id: 'home',         label: 'Home',          icon: Home },
  { id: 'groups',       label: 'Study Groups',  icon: BookOpen },
  { id: 'discover',     label: 'Discover',      icon: Search },
  { id: 'classmates',   label: 'Classmates',    icon: Users },
  { id: 'events',       label: 'Events',        icon: Calendar },
  { id: 'announcements',label: 'Announcements', icon: Megaphone },
];

const BADGE_COLORS = {
  Assignment: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Resource:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Notice:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Event:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  General:    'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatEventDate(d) {
  const date = new Date(d);
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const eventDay = new Date(date); eventDay.setHours(0,0,0,0);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (eventDay.getTime() === today.getTime()) return `Today, ${time}`;
  if (eventDay.getTime() === tomorrow.getTime()) return `Tomorrow, ${time}`;
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + `, ${time}`;
}

export default function Dashboard() {
  const { user, token, logout, setUser } = useAuthStore();
  const { theme, setTheme, fontSize, setFontSize, notificationsEnabled, setNotificationsEnabled } = useSettingsStore();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('home');

  const isLight = theme === 'light';

  // Data state
  const [myChannels, setMyChannels] = useState([]);
  const [publicChannels, setPublicChannels] = useState([]);
  const [classmates, setClassmates] = useState([]);
  const [connections, setConnections] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Loading
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);

  // Inline post composer
  const [postDraft, setPostDraft] = useState({ title: '', content: '', badge: 'General' });
  const [postStatus, setPostStatus] = useState({ loading: false, error: '' });
  const [postFocused, setPostFocused] = useState(false);
  const [postFiles, setPostFiles] = useState([]); // [{ url, mimeType, originalName, localPreview }]

  // Forms
  const [groupForm, setGroupForm] = useState({ name: '', description: '', isPrivate: true, tags: '' });
  const [groupStatus, setGroupStatus] = useState({ loading: false, error: '' });
  const [eventForm, setEventForm] = useState({ title: '', description: '', emoji: '📅', scheduledAt: '' });
  const [eventStatus, setEventStatus] = useState({ loading: false, error: '' });
  const [annForm, setAnnForm] = useState({ title: '', content: '', badge: 'Notice' });
  const [annStatus, setAnnStatus] = useState({ loading: false, error: '' });
  
  const [nicknameForm, setNicknameForm] = useState({});
  const [nicknameStatus, setNicknameStatus] = useState({ loading: false, success: '', error: '' });
  
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, success: '', error: '' });
  
  const [selectedProfile, setSelectedProfile] = useState(null);

  const authHeaders = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { ...authHeaders, 'Content-Type': 'application/json' };

  // ── Fetchers ──
  const fetchMyChannels = useCallback(async () => {
    const res = await fetch(`${API_URL}/channels`, { headers: authHeaders });
    if (res.ok) setMyChannels(await res.json());
  }, [token]);

  const searchChannels = useCallback(async (q = '') => {
    setLoadingSearch(true);
    const res = await fetch(`${API_URL}/channels/search?q=${encodeURIComponent(q)}`, { headers: authHeaders });
    if (res.ok) setPublicChannels(await res.json());
    setLoadingSearch(false);
  }, [token]);

  const fetchClassmates = useCallback(async (q = '') => {
    const res = await fetch(`${API_URL}/users?q=${encodeURIComponent(q)}`, { headers: authHeaders });
    if (res.ok) setClassmates(await res.json());
  }, [token]);

  const fetchConnections = useCallback(async () => {
    const res = await fetch(`${API_URL}/connections`, { headers: authHeaders });
    if (res.ok) setConnections(await res.json());
  }, [token]);

  const fetchEvents = useCallback(async () => {
    const res = await fetch(`${API_URL}/events`, { headers: authHeaders });
    if (res.ok) setEvents(await res.json());
  }, [token]);

  const fetchAnnouncements = useCallback(async () => {
    const res = await fetch(`${API_URL}/announcements`, { headers: authHeaders });
    if (res.ok) setAnnouncements(await res.json());
  }, [token]);

  useEffect(() => {
    if (!user || !token) { navigate('/login'); return; }
    fetchMyChannels();
    searchChannels('');
    fetchClassmates();
    fetchConnections();
    fetchEvents();
    fetchAnnouncements();
  }, [user, token, navigate, fetchMyChannels, searchChannels, fetchClassmates, fetchConnections, fetchEvents, fetchAnnouncements]);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.on('dashboard_update', ({ type, targetUserId }) => {
      if (type === 'event') fetchEvents();
      if (type === 'announcement') fetchAnnouncements();
      if (type === 'group') {
        fetchMyChannels();
        searchChannels('');
      }
      if (type === 'connection' && (!targetUserId || targetUserId === user.id)) {
        fetchConnections();
      }
    });

    return () => socketRef.current?.disconnect();
  }, [user, fetchEvents, fetchAnnouncements, fetchMyChannels, searchChannels, fetchConnections]);

  // ── Handlers ──
  const handleJoin = async (channelId) => {
    setJoiningId(channelId);
    const res = await fetch(`${API_URL}/channels/${channelId}/join`, { method: 'POST', headers: authHeaders });
    if (res.ok) { await fetchMyChannels(); await searchChannels(searchQuery); }
    else { const d = await res.json(); alert(d.error || 'Failed to join'); }
    setJoiningId(null);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setGroupStatus({ loading: true, error: '' });
    const res = await fetch(`${API_URL}/channels`, {
      method: 'POST', headers: jsonHeaders, body: JSON.stringify(groupForm)
    });
    const data = await res.json();
    if (res.ok) { 
      setShowCreateGroup(false); 
      setGroupForm({ name: '', description: '', isPrivate: true, tags: '' }); 
      await fetchMyChannels(); 
      socketRef.current?.emit('dashboard_update', { type: 'group' });
    }
    else setGroupStatus({ loading: false, error: data.error || 'Failed' });
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setEventStatus({ loading: true, error: '' });
    const res = await fetch(`${API_URL}/events`, {
      method: 'POST', headers: jsonHeaders, body: JSON.stringify(eventForm)
    });
    const data = await res.json();
    if (res.ok) { 
      setShowCreateEvent(false); 
      setEventForm({ title: '', description: '', emoji: '📅', scheduledAt: '' }); 
      await fetchEvents(); 
      socketRef.current?.emit('dashboard_update', { type: 'event' });
    }
    else setEventStatus({ loading: false, error: data.error || 'Failed' });
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Delete this event?')) return;
    const res = await fetch(`${API_URL}/events/${id}`, { method: 'DELETE', headers: authHeaders });
    if (res.ok) {
      await fetchEvents();
      socketRef.current?.emit('dashboard_update', { type: 'event' });
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    setAnnStatus({ loading: true, error: '' });
    const res = await fetch(`${API_URL}/announcements`, {
      method: 'POST', headers: jsonHeaders, body: JSON.stringify(annForm)
    });
    const data = await res.json();
    if (res.ok) { 
      setShowCreateAnnouncement(false); 
      setAnnForm({ title: '', content: '', badge: 'Notice' }); 
      await fetchAnnouncements(); 
      socketRef.current?.emit('dashboard_update', { type: 'announcement' });
    }
    else setAnnStatus({ loading: false, error: data.error || 'Failed' });
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    const res = await fetch(`${API_URL}/announcements/${id}`, { method: 'DELETE', headers: authHeaders });
    if (res.ok) {
      await fetchAnnouncements();
      socketRef.current?.emit('dashboard_update', { type: 'announcement' });
    }
  };

  const getConnectionForUser = (userId) => connections.find(
    c => (c.userAId === userId || c.userBId === userId)
  );

  const handleConnect = async (targetUserId) => {
    const existing = getConnectionForUser(targetUserId);
    if (existing) {
      if (existing.status === 'PENDING' && existing.userBId === user.id) {
        // I am userB, so I am accepting userA's request
        const res = await fetch(`${API_URL}/connections`, {
          method: 'POST', headers: jsonHeaders, body: JSON.stringify({ targetUserId })
        });
        if (res.ok) {
          socketRef.current?.emit('dashboard_update', { type: 'connection', targetUserId });
        }
      } else {
        // Either I am userA canceling, or userB rejecting, or already ACCEPTED and now removing.
        const res = await fetch(`${API_URL}/connections/${existing.id}`, { method: 'DELETE', headers: authHeaders });
        if (res.ok) {
          socketRef.current?.emit('dashboard_update', { type: 'connection', targetUserId });
        }
      }
    } else {
      const res = await fetch(`${API_URL}/connections`, {
        method: 'POST', headers: jsonHeaders, body: JSON.stringify({ targetUserId })
      });
      if (res.ok) {
        socketRef.current?.emit('dashboard_update', { type: 'connection', targetUserId });
      }
    }
    await fetchConnections();
  };

  const handleNicknameUpdate = async (e) => {
    e.preventDefault();
    setNicknameStatus({ loading: true, success: '', error: '' });
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({
          nickname: nicknameForm.nickname !== undefined ? nicknameForm.nickname : user?.nickname,
          bio: nicknameForm.bio !== undefined ? nicknameForm.bio : user?.bio,
          subject: nicknameForm.subject !== undefined ? nicknameForm.subject : user?.subject
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNicknameStatus({ loading: false, success: 'Profile updated!', error: '' });
        setUser(data.user);
        setNicknameForm({});
      } else {
        setNicknameStatus({ loading: false, success: '', error: data.error || 'Update failed' });
      }
    } catch (err) {
      setNicknameStatus({ loading: false, success: '', error: 'Network error occurred' });
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordStatus({ loading: true, success: '', error: '' });
    try {
      const res = await fetch(`${API_URL}/auth/password`, {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify(passwordForm)
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordStatus({ loading: false, success: 'Password updated successfully!', error: '' });
        setPasswordForm({ currentPassword: '', newPassword: '' });
      } else {
        setPasswordStatus({ loading: false, success: '', error: data.error || 'Update failed' });
      }
    } catch (err) {
      setPasswordStatus({ loading: false, success: '', error: 'Network error occurred' });
    }
  };

  const alreadyMember = (id) => myChannels.some(c => c.id === id);
  const displayName = user?.nickname || user?.username || 'Student';
  const todayEvents = events.filter(e => {
    const evDay = new Date(e.scheduledAt); evDay.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    return evDay.getTime() === today.getTime();
  });

  const onlineCount = classmates.length; // All registered users are "classmates"

  // Temporary UI State for Likes (Doesn't persist yet backend not wired)
  const [likedAnnouncements, setLikedAnnouncements] = useState([]);
  const toggleLike = (id) => {
    setLikedAnnouncements(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };



  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">

      {/* ── Left Sidebar ── */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 z-10">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-800">
          <div className="w-9 h-9 rounded bg-gray-800 flex items-center justify-center shadow-sm">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <p className="font-display font-extrabold text-white leading-tight tracking-tight">Zippi</p>
            <p className="text-[10px] text-gray-500 font-medium">Study Hub</p>
          </div>
        </div>

        {/* User card (self) */}
        <div className="mx-2 mt-4 mb-2 p-2.5 flex items-center gap-3 bg-gray-800/50 hover:bg-gray-800 rounded-md cursor-pointer transition-colors" onClick={() => setActiveNav('profile')}>
          <div className="relative shrink-0">
            <img src={`https://ui-avatars.com/api/?background=random&color=fff&name=${user?.username}`} alt="avatar"
              className="w-10 h-10 rounded-full bg-gray-900 border border-gray-700" />
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-gray-900" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">@{user?.username}</p>
            {user?.subject && <p className="text-xs text-blue-400 truncate">{user.subject}</p>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveNav(id)}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded text-sm font-medium transition-all ${
                activeNav === id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
              }`}
            >
              <Icon size={18} />
              {label}
              {id === 'events' && events.length > 0 && (
                <span className="ml-auto text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">{events.length}</span>
              )}
              {id === 'announcements' && announcements.length > 0 && (
                <span className="ml-auto text-xs bg-yellow-600 text-white px-1.5 py-0.5 rounded-full font-bold">{announcements.length}</span>
              )}
              {id === 'classmates' && connections.filter(c => c.status === 'PENDING' && c.userBId === user.id).length > 0 && (
                <span className="ml-auto text-xs bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                  {connections.filter(c => c.status === 'PENDING' && c.userBId === user.id).length}
                </span>
              )}
            </button>
          ))}

          <div className="pt-4 pb-1 px-4">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">My Study Groups</p>
          </div>
          {myChannels.slice(0, 6).map(ch => (
            <button key={ch.id} onClick={() => navigate(`/chat?channel=${ch.id}`)}
              className="w-full flex items-center gap-2 px-4 py-2 rounded text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors">
              {ch.isPrivate ? <Lock size={13} className="text-gray-600 shrink-0" /> : <Hash size={13} className="text-gray-600 shrink-0" />}
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
          <button onClick={() => setShowCreateGroup(true)}
            className="w-full flex items-center gap-2 px-4 py-2 rounded text-sm text-blue-400 hover:bg-blue-500/10 transition-colors">
            <Plus size={14} /> New Study Group
          </button>
        </nav>

        {/* Bottom actions */}
        <div className="px-2 pb-4 space-y-1">
          <button onClick={() => navigate('/chat')}
            className="w-full flex items-center gap-3 px-4 py-2 rounded text-sm text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 transition-colors">
            <MessageSquare size={18} /> Open Chat
          </button>
          <button onClick={() => setActiveNav('profile')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded text-sm transition-all ${activeNav === 'profile' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'}`}>
            <User size={18} /> My Profile
          </button>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>
      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* No background blurs for a sharp flat UI */}

        {/* ── Top Navbar ── */}
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-8 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="font-display font-semibold text-lg text-white tracking-wide">
              {activeNav === 'settings' ? 'System Settings' : activeNav === 'profile' ? 'My Profile' : (NAV_ITEMS.find(n => n.id === activeNav)?.label || 'Dashboard')}
            </h2>
            {activeNav === 'home' && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-gray-400 text-xs font-bold">
                <Sparkles size={12} className="text-blue-400" />
                Welcome back, {displayName}!
              </span>
            )}
          </div>
          <div className="flex items-center gap-5">
            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="bg-gray-950 border-none text-sm rounded-full pl-9 pr-4 py-1.5 focus:outline-none  text-white w-48 transition-all focus:w-64 placeholder-gray-600"
              />
            </div>
            <button className="text-gray-400 hover:text-white relative transition-colors">
              <Bell size={18} />
              {events.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-gray-900"></span>}
            </button>
            <button
              onClick={() => setActiveNav('settings')}
              title="System Settings"
              className={`transition-colors ${activeNav === 'settings' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
              <Settings size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative z-10 w-full">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6">

            {/* ─── HOME ─── */}
            {activeNav === 'home' && (
              <div className="space-y-6">
                {/* Hero section was removed and replaced with top navbar header */}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
                
                {/* ── Announcements Column ── */}
                <div className="lg:col-span-9 space-y-4 lg:pr-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      Community Feed
                    </h3>
                  </div>

                  {/* Post Composer */}
                  <div className="hidden md:block">
                    <InlinePostComposer
                      user={user}
                      token={token}
                      draft={postDraft}
                      setDraft={setPostDraft}
                      status={postStatus}
                      focused={postFocused}
                      setFocused={setPostFocused}
                      files={postFiles}
                      setFiles={setPostFiles}
                      onPost={async () => {
                        if (!postDraft.content.trim()) return;
                        setPostStatus({ loading: true, error: '' });
                        const res = await fetch(`${API_URL}/announcements`, {
                          method: 'POST',
                          headers: jsonHeaders,
                          body: JSON.stringify({
                            title: postDraft.title,
                            content: postDraft.content,
                            badge: postDraft.badge,
                            fileUrls: postFiles.map(f => f.url).filter(Boolean),
                            fileTypes: postFiles.map(f => f.mimeType).filter(Boolean),
                          })
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setPostDraft({ title: '', content: '', badge: 'General' });
                          setPostFocused(false);
                          setPostFiles([]);
                          setPostStatus({ loading: false, error: '' });
                          await fetchAnnouncements();
                          socketRef.current?.emit('dashboard_update', { type: 'announcement' });
                        } else {
                          setPostStatus({ loading: false, error: data.error || 'Failed to post' });
                        }
                      }}
                    />
                  </div>

                  {/* Posts List */}
                  <div className="space-y-2">
                    {announcements.length === 0 ? (
                      <div className="text-center py-10 text-gray-500 border border-dashed border-gray-700 rounded-md text-sm">
                        No announcements yet. Be the first to start a discussion!
                      </div>
                    ) : announcements.slice(0, 10).map(ann => {
                      const isLiked = likedAnnouncements.includes(ann.id);
                      return (
                        <div key={ann.id} className="p-4 bg-gray-800 rounded-md hover:bg-[#32363b] transition-colors relative group">
                          
                          {/* Hover Action / Delete */}
                          {ann.authorId === user?.id && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-gray-400 hover:text-red-400 p-1.5 rounded hover:bg-gray-900" title="Delete Announcement">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}

                          <div className="flex gap-4">
                            <img src={`https://ui-avatars.com/api/?background=random&color=fff&name=${ann.author.username}`} alt={ann.author.username}
                              className="w-10 h-10 rounded-full bg-gray-900 shrink-0 cursor-pointer hover:opacity-80 transition-opacity mt-0.5"
                              onClick={() => setSelectedProfile(ann.author)} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-bold text-[15px] text-gray-100 cursor-pointer hover:underline" onClick={() => setSelectedProfile(ann.author)}>
                                  {ann.author.nickname || ann.author.username}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border border-transparent ${BADGE_COLORS[ann.badge] || BADGE_COLORS.General}`}>{ann.badge}</span>
                                <span className="text-[12px] text-gray-400 font-medium ml-1">{timeAgo(ann.createdAt)}</span>
                              </div>
                              
                              {ann.title && <h4 className="text-[15px] font-bold text-gray-100 mb-1 leading-snug">{ann.title}</h4>}
                              <div className="text-[15px] text-gray-300 leading-relaxed whitespace-pre-wrap">{ann.content}</div>
                              
                              {ann.fileUrls?.length > 0 && (
                                <div className="mt-3">
                                  <AttachmentPreview fileUrls={ann.fileUrls} fileTypes={ann.fileTypes} compact />
                                </div>
                              )}
                              
                              {/* Interaction Bar */}
                              <div className="flex items-center gap-4 mt-3">
                                <button 
                                  onClick={() => toggleLike(ann.id)}
                                  className={`flex items-center gap-1.5 text-[12px] font-bold transition-colors p-1.5 rounded hover:bg-gray-700 ${isLiked ? 'text-pink-500' : 'text-gray-400 hover:text-gray-200'}`}>
                                  <Heart size={16} className={isLiked ? 'fill-pink-500' : ''} />
                                  {isLiked ? 'Liked' : 'Like'}
                                </button>
                                
                                <button className="flex items-center gap-1.5 text-[12px] font-bold text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors p-1.5 rounded">
                                   <MessageCircle size={16} />
                                   Comment
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Right Sidebar (Online Classmates) ── */}
                <div className="lg:col-span-3 hidden lg:block lg:pl-6 lg:border-l border-gray-800">
                  <div className="sticky top-6 flex flex-col gap-4 max-h-[calc(100vh-8rem)] overflow-y-auto w-full pr-2 pb-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mt-1">
                    Online Now
                  </h3>
                  
                  <div className="bg-gray-800 rounded-md p-3">
                    {connections.filter(c => c.status === 'ACCEPTED').length === 0 ? (
                       <div className="text-center py-6 text-gray-400 text-sm">
                         No active connections.
                         <button onClick={() => setActiveNav('discover')} className="text-blue-400 block w-full mt-2 font-medium hover:underline">Find Classmates</button>
                       </div>
                    ) : (
                       <div className="space-y-0.5">
                         {connections.filter(c => c.status === 'ACCEPTED').slice(0, 8).map(conn => {
                            const friend = conn.userAId === user.id ? conn.userB : conn.userA;
                            if (!friend) return null;
                            const isOnline = Math.random() > 0.5; // UI Simulation
                            return (
                              <div key={conn.id} onClick={() => setSelectedProfile(friend)} className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 cursor-pointer transition-colors group">
                                <div className="relative">
                                  <img src={`https://ui-avatars.com/api/?background=random&color=fff&name=${friend.username}`} alt="avatar" className="w-8 h-8 rounded-full bg-gray-900" />
                                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14px] font-semibold text-gray-200 truncate group-hover:text-gray-100 transition-colors">{friend.nickname || friend.username}</p>
                                  {friend.subject && <p className="text-[11px] text-gray-400 truncate">{friend.subject}</p>}
                                </div>
                              </div>
                            );
                         })}
                       </div>
                    )}
                  </div>

                  {/* Built-in Trending Topic widget */}
                  <div className="mt-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Trending</h3>
                    <div className="flex flex-wrap gap-2">
                      {['#cs101', '#midterms', '#studyhack', '#math', '#exam-prep'].map(tag => (
                        <span key={tag} className="px-2.5 py-1 bg-gray-800 text-gray-300 text-[11px] font-bold rounded cursor-pointer hover:bg-gray-700 transition-colors">{tag}</span>
                      ))}
                    </div>
                  </div>
                  </div>
                </div>

              </div>


            </div>
          )}

          {/* ─── STUDY GROUPS ─── */}
          {activeNav === 'groups' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-extrabold text-white">My Study Groups</h2>
                  <p className="text-gray-500 text-sm mt-1">{myChannels.length} group{myChannels.length !== 1 ? 's' : ''} joined</p>
                </div>
                <button onClick={() => setShowCreateGroup(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors shadow-sm shadow-blue-600/20">
                  <Plus size={16} /> New Group
                </button>
              </div>
              {myChannels.length === 0 ? (
                <div className="text-center py-20 text-gray-600 border-none bg-gray-800/40 p-10 flex flex-col items-center justify-center rounded-md">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="font-semibold text-lg">No study groups yet</p>
                  <button onClick={() => setActiveNav('discover')}
                    className="mt-4 px-5 py-2 rounded bg-gray-700 text-white border-none hover:bg-blue-600/30 transition-colors text-sm font-medium">
                    Discover Groups
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myChannels.map(ch => (
                    <button key={ch.id} onClick={() => navigate(`/chat?channel=${ch.id}`)}
                      className="group flex items-start gap-4 p-5 bg-gray-800 border-none shadow-none rounded-md text-left hover:bg-[#32363b] transition-colors">
                      <div className="w-12 h-12 rounded bg-gray-900 flex items-center justify-center shrink-0 text-gray-400 group-hover:text-white transition-colors">
                        {ch.isPrivate ? <Lock size={22} className="opacity-80" /> : <Hash size={24} className="opacity-80" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{ch.name}</p>
                        <p className="text-xs text-gray-500 mt-1 truncate">{ch.description || (ch.isPrivate ? 'Private group' : 'Public group')}</p>
                        {ch.tags && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {ch.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                              <span key={tag} className="px-2 py-0.5 text-xs bg-gray-800 text-gray-400 rounded-full border-none">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRight size={16} className="text-gray-600 group-hover:text-blue-400 transition-colors shrink-0 mt-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── DISCOVER ─── */}
          {activeNav === 'discover' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white">Discover Study Groups</h2>
                <p className="text-gray-500 text-sm mt-1">Browse and join public groups</p>
              </div>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); searchChannels(e.target.value); }}
                  placeholder="Search by subject, name, or tag..."
                  className="w-full bg-gray-900 border-none text-white rounded-md pl-11 pr-4 py-3.5 focus:outline-none   transition-colors" />
                {loadingSearch && <div className="absolute right-4 top-3.5 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
              </div>
              {publicChannels.length === 0 && !loadingSearch ? (
                <div className="text-center py-16 text-gray-600 border-none bg-gray-800/40 p-10 flex flex-col items-center justify-center rounded-md">
                  <Search size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No public study groups found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {publicChannels.map(ch => {
                    const isMember = alreadyMember(ch.id);
                    return (
                      <div key={ch.id} className="p-5 bg-gray-800 border-none shadow-none rounded-md transition-all hover:bg-[#32363b]">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-11 h-11 rounded bg-gray-900 flex items-center justify-center shrink-0 text-gray-400">
                            {ch.isPrivate ? <Lock size={20} className="opacity-80" /> : <Hash size={22} className="opacity-80" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white">{ch.name}</p>
                            {ch.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{ch.description}</p>}
                          </div>
                          <Globe size={13} className="text-emerald-500 shrink-0 mt-1" />
                        </div>
                        {ch.tags && (
                          <div className="flex gap-1 flex-wrap mb-3">
                            {ch.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                              <span key={tag} className="px-2 py-0.5 text-xs bg-gray-700 text-gray-200 rounded px-1.5 py-0.5 border-none">#{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-600 flex items-center gap-1"><Users size={11} /> {ch._count?.members ?? '?'} members</p>
                          {isMember ? (
                            <button onClick={() => navigate('/chat')} className="px-4 py-1.5 rounded bg-gray-700 text-white border-none text-xs font-semibold hover:bg-blue-600/30 transition-colors">Open Chat</button>
                          ) : (
                            <button onClick={() => handleJoin(ch.id)} disabled={joiningId === ch.id}
                              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-60">
                              {joiningId === ch.id ? 'Joining...' : 'Join Group'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── CLASSMATES ─── */}
          {activeNav === 'classmates' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white">Classmates</h2>
                <p className="text-gray-500 text-sm mt-1">{classmates.length} student{classmates.length !== 1 ? 's' : ''} in the network</p>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text"
                  onChange={e => fetchClassmates(e.target.value)}
                  placeholder="Search by name, username or subject..."
                  className="w-full bg-gray-900 border-none text-white rounded-md pl-10 pr-4 py-3 focus:outline-none   text-sm" />
              </div>
              <div className="flex flex-col gap-2 mb-6">
                <h2 className="font-display text-2xl font-extrabold text-white">Classmates</h2>
                <p className="text-gray-500 text-sm">Find friends, study partners, and fellow students from across Zippi.</p>
              </div>

              {/* Pending Requests Section */}
              {(() => {
                const incomingRequests = connections.filter(c => c.status === 'PENDING' && c.userBId === user.id);
                if (incomingRequests.length === 0) return null;
                return (
                  <div className="mb-10 animate-in slide-in-from-top-4 duration-500">
                    <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Bell size={14} className="animate-bounce" /> Connection Requests ({incomingRequests.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {incomingRequests.map(req => {
                        const fromUser = req.userA;
                        return (
                          <div key={req.id} className="p-4 bg-gray-800 border border-gray-700 rounded-md flex items-center gap-4 relative overflow-hidden group">
                            
                            <img src={`https://ui-avatars.com/api/?background=random&color=fff&name=${fromUser.username}`} className="w-12 h-12 rounded bg-gray-900 border border-yellow-500/20" alt="avatar" />
                            <div className="flex-1 min-w-0 z-10">
                              <p className="font-bold text-white text-sm truncate">{fromUser.nickname || fromUser.username}</p>
                              <p className="text-[10px] text-gray-500 truncate">@{fromUser.username}</p>
                            </div>
                            <div className="flex gap-2 z-10">
                              <button onClick={() => handleConnect(fromUser.id)} className="p-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors" title="Accept">
                                <Check size={16} />
                              </button>
                              <button onClick={() => { handleConnect(fromUser.id); /* This will trigger delete as UserB */ }} className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white transition-colors" title="Decline">
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">All Students</h3>
                <div className="text-[10px] text-gray-600 font-bold">{classmates.length} total students on Zippi</div>
              </div>

              {classmates.filter(cm => cm.id !== user.id).length === 0 ? (
                <div className="text-center py-16 text-gray-600 border-none bg-gray-800/40 p-10 flex flex-col items-center justify-center rounded-md">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No other students registered yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {classmates.filter(cm => cm.id !== user.id).map(cm => {
                    const conn = getConnectionForUser(cm.id);
                    const isConnected = conn?.status === 'ACCEPTED';
                    const isPendingMe = conn?.status === 'PENDING' && conn?.userAId === user.id;
                    const isPendingThem = conn?.status === 'PENDING' && conn?.userBId === user.id;

                    return (
                      <div key={cm.id} className="p-3 bg-gray-800 border-none rounded-sm transition-all flex items-center text-left gap-4 cursor-pointer hover:bg-gray-700/50" onClick={() => setSelectedProfile(cm)}>
                        {/* Avatar & Online Dot */}
                        <div className="relative shrink-0">
                          <img src={`https://ui-avatars.com/api/?background=random&color=fff&name=${cm.username}`} alt={cm.username}
                            className="w-12 h-12 rounded bg-gray-900 border border-gray-700 transition-colors" />
                          <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-[1.5px] border-gray-900 ${cm.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm truncate group-hover:text-blue-400 transition-colors">{cm.nickname || cm.username}</p>
                            <p className="text-xs text-gray-500 truncate">@{cm.username}</p>
                          </div>
                          {cm.subject && <span className="text-[10px] text-blue-400 font-semibold bg-gray-900 px-2 py-0.5 rounded truncate self-start sm:self-auto">{cm.subject}</span>}
                          {cm.bio && <span className="text-xs text-gray-400 truncate hidden md:inline-block md:max-w-xs">{cm.bio}</span>}
                        </div>

                        {/* Action Buttons */}
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleConnect(cm.id); }}
                            className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded text-xs font-semibold transition-all ${
                              isConnected ? 'bg-gray-700 text-white hover:bg-red-500/20 hover:text-red-400' 
                              : isPendingMe ? 'bg-gray-700 text-yellow-500 hover:bg-gray-600'
                              : isPendingThem ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                              : 'bg-indigo-600 text-white hover:bg-indigo-500'
                            }`}
                          >
                            {isConnected ? <><Check size={14} /> Connected</> 
                              : isPendingMe ? <><X size={14} /> Cancel</> 
                              : isPendingThem ? <><Check size={14} /> Accept</> 
                              : <><UserPlus size={14} /> Connect</>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── EVENTS ─── */}
          {activeNav === 'events' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-extrabold text-white">Study Events</h2>
                  <p className="text-gray-500 text-sm mt-1">{events.length} event{events.length !== 1 ? 's' : ''} scheduled</p>
                </div>
                <button onClick={() => setShowCreateEvent(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded bg-gray-700 text-white border-none border border-purple-500/20 hover:bg-purple-600/30 transition-colors text-sm font-semibold">
                  <Plus size={16} /> Add Event
                </button>
              </div>

              {todayEvents.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 border-l-4 border-l-indigo-500 rounded-md p-5">
                  <p className="text-sm font-bold text-purple-300 mb-1 flex items-center gap-2"><Zap size={14}/> Today</p>
                  <p className="text-xl font-bold text-white">{todayEvents[0].emoji} {todayEvents[0].title}</p>
                  <p className="text-gray-400 text-sm mt-1">{formatEventDate(todayEvents[0].scheduledAt)} • by {todayEvents[0].creator?.nickname || todayEvents[0].creator?.username}</p>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => navigate('/chat')} className="px-5 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">Join in Chat</button>
                  </div>
                </div>
              )}

              {events.length === 0 ? (
                <div className="text-center py-16 text-gray-600 border-none bg-gray-800/40 p-10 flex flex-col items-center justify-center rounded-md">
                  <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No events yet. Create the first one!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {events.map(ev => (
                    <div key={ev.id} className="p-3 bg-gray-800 border-none rounded-sm transition-all flex items-center gap-4 hover:bg-gray-700/50">
                      <div className="text-2xl shrink-0 w-10 h-10 bg-gray-900 rounded flex items-center justify-center">{ev.emoji}</div>
                      <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white text-sm truncate">{ev.title}</p>
                          {ev.description && <p className="text-xs text-gray-400 truncate">{ev.description}</p>}
                        </div>
                        <div className="shrink-0 flex flex-col md:items-end">
                           <p className="text-[11px] text-gray-400 font-semibold">{formatEventDate(ev.scheduledAt)}</p>
                           <p className="text-[10px] text-gray-500">by {ev.creator?.nickname || ev.creator?.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => navigate('/chat')} className="px-4 py-1.5 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors">Join</button>
                        {ev.creatorId === user?.id && (
                          <button onClick={() => handleDeleteEvent(ev.id)} className="p-1.5 rounded bg-gray-900 text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-colors"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── ANNOUNCEMENTS ─── */}
          {activeNav === 'announcements' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-extrabold text-white">Announcements</h2>
                  <p className="text-gray-500 text-sm mt-1">{announcements.length} post{announcements.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowCreateAnnouncement(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded bg-gray-700 text-white border-none border border-yellow-500/20 hover:bg-yellow-600/30 transition-colors text-sm font-semibold">
                  <Plus size={16} /> Post Announcement
                </button>
              </div>
              {announcements.length === 0 ? (
                <div className="text-center py-16 text-gray-600 border-none bg-gray-800/40 p-10 flex flex-col items-center justify-center rounded-md">
                  <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No announcements yet. Post the first one!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {announcements.map(ann => (
                    <div key={ann.id} className="p-4 bg-gray-800 border-none rounded-sm transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <img src={`https://ui-avatars.com/api/?background=random&color=fff&name=${ann.author.username}`} alt={ann.author.username} 
                             className="w-8 h-8 rounded bg-gray-900 cursor-pointer hover:ring-2 hover:ring-indigo-500/50" 
                             onClick={() => setSelectedProfile(ann.author)} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm cursor-pointer hover:underline truncate" onClick={() => setSelectedProfile(ann.author)}>
                            {ann.author.nickname || ann.author.username}
                          </p>
                          <p className="text-[11px] text-gray-500">{timeAgo(ann.createdAt)}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium border-none text-white ${BADGE_COLORS[ann.badge] || BADGE_COLORS.General}`}>{ann.badge}</span>
                        {ann.authorId === user?.id && (
                          <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-1.5 rounded bg-gray-900 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      {ann.title && <p className="text-sm font-bold text-gray-100 mb-1">{ann.title}</p>}
                      <p className="text-xs text-gray-300 leading-relaxed mb-2">{ann.content}</p>
                      <AttachmentPreview fileUrls={ann.fileUrls || []} fileTypes={ann.fileTypes || []} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── MY PROFILE ─── */}
          {activeNav === 'profile' && (
            <div className="w-full max-w-3xl mx-auto">
              <h2 className="text-base font-bold text-white mb-4">My Profile</h2>

              {/* Profile Card Preview */}
              <div className="flex items-start gap-4 bg-gray-800 p-4 rounded border border-gray-700/50 mb-1">
                <div className="relative shrink-0">
                  <img
                    src={`https://ui-avatars.com/api/?background=random&color=fff&name=${user?.username}`}
                    alt="avatar"
                    className="w-16 h-16 rounded bg-gray-900 border border-gray-700 object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{user?.nickname || user?.username}</p>
                  <p className="text-xs text-gray-400 mt-0.5">@{user?.username}</p>
                  {user?.subject && <span className="text-[10px] text-blue-400 bg-gray-900 px-2 py-0.5 rounded mt-1 inline-block">{user.subject}</span>}
                  {user?.bio && <p className="text-xs text-gray-300 mt-1.5">{user.bio}</p>}
                </div>
              </div>

              {/* Activity Heatmap */}
              <div className="h-px bg-gray-800 my-5" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Activity</p>
              <div className="bg-gray-800 p-4 rounded border border-gray-700/50 flex justify-center">
                <ActivityHeatmap />
              </div>

              {/* Edit Details */}
              <div className="h-px bg-gray-800 my-5" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Edit Details</p>
              <div className="bg-gray-800 p-4 rounded border border-gray-700/50">
                <form onSubmit={handleNicknameUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Display Name</label>
                    <input type="text"
                      value={nicknameForm.nickname !== undefined ? nicknameForm.nickname : (user?.nickname || '')}
                      onChange={(e) => setNicknameForm(prev => ({ ...prev, nickname: e.target.value }))}
                      placeholder="What should we call you?"
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Major / Subject</label>
                    <input type="text"
                      value={nicknameForm.subject !== undefined ? nicknameForm.subject : (user?.subject || '')}
                      onChange={(e) => setNicknameForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g. Computer Science"
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-sm" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Bio</label>
                    <textarea rows="3"
                      value={nicknameForm.bio !== undefined ? nicknameForm.bio : (user?.bio || '')}
                      onChange={(e) => setNicknameForm(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell classmates a bit about your study interests..."
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-sm resize-none" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    {nicknameStatus.success && <p className="mb-3 text-sm text-emerald-400 flex items-center gap-1"><Check size={14}/>{nicknameStatus.success}</p>}
                    {nicknameStatus.error && <p className="mb-3 text-sm text-red-400">{nicknameStatus.error}</p>}
                    <button type="submit" disabled={nicknameStatus.loading}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50">
                      {nicknameStatus.loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Password & Security */}
              <div className="h-px bg-gray-800 my-5" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password & Security</p>
              <div className="bg-gray-800 p-4 rounded border border-gray-700/50 mb-10">
                <form onSubmit={handlePasswordUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Current Password</label>
                    <input type="password" required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">New Password</label>
                    <input type="password" required minLength={6}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-sm" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    {passwordStatus.error && <p className="mb-3 text-sm text-red-400">{passwordStatus.error}</p>}
                    {passwordStatus.success && <p className="mb-3 text-sm text-emerald-400 flex items-center gap-1"><Check size={14}/>{passwordStatus.success}</p>}
                    <button type="submit" disabled={passwordStatus.loading}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50">
                      {passwordStatus.loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ─── SYSTEM SETTINGS ─── */}
          {activeNav === 'settings' && (
            <div className="w-full max-w-3xl mx-auto">
              <h2 className="text-base font-bold text-white mb-4">System Settings</h2>

              {/* Appearance */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Appearance</p>
              <div className="bg-gray-800 rounded border border-gray-700/50 divide-y divide-gray-700/60">
                {/* Theme */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Interface Theme</p>
                    <p className="text-xs text-gray-500 mt-0.5">Changes the overall colour scheme of the app</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setTheme('dark')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition-all ${
                        theme === 'dark' ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-gray-700 text-gray-500 hover:text-gray-300'
                      }`}>
                      <Moon size={13} /> Dark
                    </button>
                    <button onClick={() => setTheme('light')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition-all ${
                        theme === 'light' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-700 text-gray-500 hover:text-gray-300'
                      }`}>
                      <Sun size={13} /> Light
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Settings */}
              <div className="h-px bg-gray-800 my-5" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Chat</p>
              <div className="bg-gray-800 rounded border border-gray-700/50 divide-y divide-gray-700/60">
                {/* Chat text size */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Chat Text Size</p>
                    <p className="text-xs text-gray-500 mt-0.5">Controls message font size in the chat view</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[{val:'xs',label:'Small'},{val:'sm',label:'Normal'},{val:'base',label:'Large'},{val:'lg',label:'X-Large'}].map(({val,label}) => (
                      <button key={val} onClick={() => setFontSize(val)}
                        className={`px-2.5 py-1 rounded border text-xs font-semibold transition-all ${
                          fontSize === val ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-700 text-gray-500 hover:text-gray-300'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="h-px bg-gray-800 my-5" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notifications</p>
              <div className="bg-gray-800 rounded border border-gray-700/50 divide-y divide-gray-700/60">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-700/30 transition-colors"
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}>
                  <div>
                    <p className="text-sm font-semibold text-white">Desktop Notifications</p>
                    <p className="text-xs text-gray-500 mt-0.5">Receive alerts when Zippi is in the background</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${notificationsEnabled ? 'bg-blue-600' : 'bg-gray-600'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${notificationsEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="h-px bg-gray-800 my-5" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">About</p>
              <div className="bg-gray-800 rounded border border-gray-700/50 divide-y divide-gray-700/60">
                <div className="p-4 flex items-center justify-between">
                  <p className="text-sm text-gray-400">Version</p>
                  <span className="text-xs font-mono bg-gray-900 border border-gray-700 px-2 py-1 rounded text-gray-400">Zippi v1.0.0</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <p className="text-sm text-gray-400">Build</p>
                  <span className="text-xs font-mono bg-gray-900 border border-gray-700 px-2 py-1 rounded text-gray-400">dev-local</span>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="h-px bg-gray-800 my-5" />
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">Danger Zone</p>
              <div className="bg-gray-800 rounded border border-red-900/40 divide-y divide-gray-700/60 mb-10">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-red-400">Delete Account</p>
                    <p className="text-xs text-gray-500 mt-0.5">Permanently delete your account and all data. This cannot be undone.</p>
                  </div>
                  <button className="px-3 py-1.5 rounded border border-red-800 text-red-400 text-xs font-semibold hover:bg-red-500/10 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>

    {/* ── Global View Profile Modal ── */}
      {selectedProfile && (
        <Modal title="Student Profile" icon={<User size={20} className="text-blue-400" />} onClose={() => setSelectedProfile(null)}>
          <div className="flex flex-col items-center text-center p-4">
            <div className="relative mb-4">
              <img 
                src={`https://ui-avatars.com/api/?background=random&color=fff&name=${selectedProfile.username}`} 
                alt="avatar" 
                className="w-24 h-24 rounded-md bg-gray-900 border-2 border-blue-500/30 object-cover shadow-md"
              />
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-gray-900 ${selectedProfile.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-gray-500'}`} />
            </div>
            
            <h3 className="text-base font-bold text-white">
              {selectedProfile.nickname || selectedProfile.username}
            </h3>
            <p className="text-sm font-medium text-gray-400 mt-1">
              @{selectedProfile.username}
            </p>
            
            {selectedProfile.subject && (
              <p className="mt-3 inline-flex bg-blue-500/10 px-3 py-1 rounded text-xs text-blue-400 font-semibold">
                {selectedProfile.subject}
              </p>
            )}
            
            {selectedProfile.bio && (
              <div className="mt-5 w-full bg-gray-800/30 p-4 rounded-md border-none/50">
                <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-blue-500/50 pl-3 text-left">
                  "{selectedProfile.bio}"
                </p>
              </div>
            )}

            {selectedProfile.id !== user?.id && (() => {
              const conn = getConnectionForUser(selectedProfile.id);
              const isConnected = conn?.status === 'ACCEPTED';
              const isPendingMe = conn?.status === 'PENDING' && conn?.userAId === user.id;
              const isPendingThem = conn?.status === 'PENDING' && conn?.userBId === user.id;

              return (
                <div className="mt-8 w-full">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleConnect(selectedProfile.id); setSelectedProfile(null); }}
                    className={`w-full flex justify-center items-center gap-2 p-3 rounded font-bold transition-all shadow-sm ${
                      isConnected ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
                      : isPendingMe ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20'
                      : isPendingThem ? 'bg-blue-600/90 text-white border border-blue-500/20 hover:bg-blue-500'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                    }`}
                  >
                    {isConnected ? <><X size={18} /> Remove Connection</> 
                      : isPendingMe ? <><X size={18} /> Cancel Request</> 
                      : isPendingThem ? <><Check size={18} /> Accept Request</> 
                      : <><UserPlus size={18} /> Connect with {selectedProfile.nickname || selectedProfile.username}</>}
                  </button>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* ── Create Group Modal ── */}
      {showCreateGroup && (
        <Modal title="Create Study Group" icon={<BookOpen size={20} className="text-blue-400"/>} onClose={() => setShowCreateGroup(false)}>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <Field label="Group Name *">
              <input type="text" required value={groupForm.name} onChange={e => setGroupForm({...groupForm, name: e.target.value})} placeholder="e.g. calculus-studygroup" className={INPUT} />
            </Field>
            <Field label="Description">
              <input type="text" value={groupForm.description} onChange={e => setGroupForm({...groupForm, description: e.target.value})} placeholder="What topic?" className={INPUT} />
            </Field>
            <Field label="Subject Tags">
              <input type="text" value={groupForm.tags} onChange={e => setGroupForm({...groupForm, tags: e.target.value})} placeholder="math, grade11, calc" className={INPUT} />
            </Field>
            <PrivacyToggle value={groupForm.isPrivate} onChange={v => setGroupForm({...groupForm, isPrivate: v})} />
            {groupStatus.error && <p className="text-red-400 text-sm">{groupStatus.error}</p>}
            <ModalActions onCancel={() => setShowCreateGroup(false)} loading={groupStatus.loading} label="Create Group" />
          </form>
        </Modal>
      )}

      {/* ── Create Event Modal ── */}
      {showCreateEvent && (
        <Modal title="Schedule Event" icon={<Calendar size={20} className="text-purple-400"/>} onClose={() => setShowCreateEvent(false)}>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <Field label="Event Title *">
              <input type="text" required value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} placeholder="e.g. Physics Review Session" className={INPUT} />
            </Field>
            <Field label="Description">
              <input type="text" value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} placeholder="What will you cover?" className={INPUT} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Emoji">
                <input type="text" value={eventForm.emoji} onChange={e => setEventForm({...eventForm, emoji: e.target.value})} placeholder="📅" className={INPUT} maxLength={2} />
              </Field>
              <Field label="Date & Time *">
                <input type="datetime-local" required value={eventForm.scheduledAt} onChange={e => setEventForm({...eventForm, scheduledAt: e.target.value})} className={INPUT} />
              </Field>
            </div>
            {eventStatus.error && <p className="text-red-400 text-sm">{eventStatus.error}</p>}
            <ModalActions onCancel={() => setShowCreateEvent(false)} loading={eventStatus.loading} label="Schedule Event" />
          </form>
        </Modal>
      )}

      {/* ── Create Announcement Modal ── */}
      {showCreateAnnouncement && (
        <Modal title="Post Announcement" icon={<Megaphone size={20} className="text-yellow-400"/>} onClose={() => setShowCreateAnnouncement(false)}>
          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
            <Field label="Title (Optional)">
              <input type="text" value={annForm.title} onChange={e => setAnnForm({...annForm, title: e.target.value})} placeholder="Announcement headline" className={INPUT} />
            </Field>
            <Field label="Content *">
              <textarea required rows={3} value={annForm.content} onChange={e => setAnnForm({...annForm, content: e.target.value})}
                placeholder="Write your announcement..." className={INPUT + ' resize-none'} />
            </Field>
            <Field label="Badge Type">
              <select value={annForm.badge} onChange={e => setAnnForm({...annForm, badge: e.target.value})} className={INPUT}>
                {['Notice', 'Assignment', 'Resource', 'Event', 'General'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            {annStatus.error && <p className="text-red-400 text-sm">{annStatus.error}</p>}
            <ModalActions onCancel={() => setShowCreateAnnouncement(false)} loading={annStatus.loading} label="Post" />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Shared sub-components ──
const INPUT = 'w-full bg-gray-950 border-none text-white rounded px-4 py-2.5 focus:outline-none  focus:ring-1 focus:ring-blue-500 text-sm';

// ── Activity Heatmap Component ──
function ActivityHeatmap() {
  const data = Array.from({ length: 90 }).map((_, i) => ({
    date: new Date(Date.now() - (89 - i) * 86400000),
    level: Math.floor(Math.random() * 4) // 0-3 activity level
  }));

  const getColor = (lvl) => {
    switch(lvl) {
      case 1: return 'bg-indigo-900 border-indigo-950';
      case 2: return 'bg-indigo-600 border-indigo-700';
      case 3: return 'bg-indigo-400 border-indigo-500';
      default: return 'bg-gray-900 border-gray-800';
    }
  };

  return (
    <div className="bg-gray-800 rounded-sm p-4 w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-sm bg-gray-900 text-gray-400">
          Last 90 Days
        </span>
      </div>
      <div className="flex flex-wrap gap-1 overflow-hidden justify-start">
        {data.map((day, idx) => (
          <div 
            key={idx} 
            title={day.date.toDateString() + ` - Activity Level: ${day.level}`}
            className={`w-3 h-3 rounded-sm border-[0.5px] transition-colors cursor-pointer ${getColor(day.level)}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Inline Post Composer ──
const BADGE_OPTIONS = ['General', 'Notice', 'Assignment', 'Resource', 'Event'];
const BADGE_PILL = {
  General:    'bg-gray-700/60 text-gray-300 border-gray-600/50',
  Notice:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Assignment: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Resource:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Event:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

function fileIcon(mimeType = '') {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
  if (mimeType === 'text/plain') return '📃';
  return '📎';
}

function AttachmentPreview({ fileUrls = [], fileTypes = [], compact = false }) {
  if (!fileUrls.length) return null;
  const images = fileUrls.filter((_, i) => (fileTypes[i] || '').startsWith('image/'));
  const imageTypes = fileTypes.filter(t => t.startsWith('image/'));
  const docs   = fileUrls.filter((_, i) => !(fileTypes[i] || '').startsWith('image/'));
  const docTypes = fileTypes.filter(t => !t.startsWith('image/'));

  return (
    <div className={compact ? 'mt-2 space-y-1' : 'mt-4 space-y-3'}>
      {images.length > 0 && (
        <div className={`grid gap-1.5 rounded-md overflow-hidden ${
          images.length === 1 ? 'grid-cols-1' :
          images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
        }`}>
          {images.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer" className="block group">
              <img
                src={url}
                alt={`attachment-${i}`}
                className={`w-full object-cover rounded border border-white/5 group-hover:opacity-90 transition-opacity ${
                  compact ? 'max-h-40' : (images.length === 1 ? 'max-h-96' : 'max-h-48')
                }`}
              />
            </a>
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {docs.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-800/60 border-none/50  transition-colors text-xs text-gray-300 hover:text-white max-w-xs"
            >
              <span>{fileIcon(docTypes[i])}</span>
              <span className="truncate">{decodeURIComponent(url.split('/').pop())}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function InlinePostComposer({ user, token, draft, setDraft, status, focused, setFocused, files = [], setFiles, onPost }) {
  const textareaRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState('');

  const handleFocus = () => {
    setFocused(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    e.target.value = '';
    setUploading(true);
    setUploadError('');

    // Add local previews immediately
    const previews = selected.map(f => ({
      localPreview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      originalName: f.name,
      mimeType: f.type,
      url: null, // null = still uploading
    }));
    setFiles(prev => [...prev, ...previews]);

    try {
      const formData = new FormData();
      selected.forEach(f => formData.append('files', f));
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      // Swap the pending entries with real uploaded data
      setFiles(prev => {
        const uploaded = data.files.map((f, i) => ({
          url: f.url,
          mimeType: f.mimeType,
          originalName: f.originalName,
          localPreview: selected[i]?.type.startsWith('image/') ? URL.createObjectURL(selected[i]) : null,
        }));
        // Replace the last `selected.length` pending entries
        const stable = prev.filter(f => f.url !== null);
        return [...stable, ...uploaded];
      });
    } catch (err) {
      setUploadError(err.message);
      setFiles(prev => prev.filter(f => f.url !== null)); // Remove pending on error
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const canPost = draft.content.trim().length > 0 && !status.loading && !uploading;
  const images = files.filter(f => f.mimeType?.startsWith('image/'));
  const docs   = files.filter(f => !f.mimeType?.startsWith('image/'));

  return (
    <div
      className={`bg-gray-800 border-none rounded-md p-4 w-full transition-all duration-300 ${
        focused ? 'bg-[#32363b]' : ''
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex gap-3">
        <img
          src={`https://ui-avatars.com/api/?background=random&color=fff&name=${user?.username}`}
          className="w-10 h-10 rounded-full bg-gray-800 border-none shrink-0 mt-0.5"
          alt="avatar"
        />
        <div className="flex-1 min-w-0">
          {!focused ? (
            <button
              onClick={handleFocus}
              className="w-full text-left bg-gray-950/50 hover:bg-gray-950 border-none/50 text-gray-500 hover:text-gray-300 rounded-md px-5 py-3 text-sm focus:outline-none transition-colors duration-200"
            >
              Share an update, files, images, or ask a question...
            </button>
          ) : (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200 mt-1">
              <input
                type="text"
                value={draft.title}
                onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
                placeholder="Add a title (optional)"
                className="w-full bg-transparent border-none text-white font-bold px-1 text-[15px] focus:outline-none placeholder-gray-600 pb-2 border-b border-gray-700/50 rounded-none h-auto"
              />
              <textarea
                ref={textareaRef}
                rows={2}
                value={draft.content}
                onChange={e => setDraft(p => ({ ...p, content: e.target.value }))}
                placeholder="What's on your mind? Share notes, ask a question, or post a resource..."
                className="w-full bg-transparent text-white text-[14px] placeholder-gray-500 focus:outline-none resize-none px-1 mt-1 leading-relaxed"
              />

              {/* File Previews */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {images.length > 0 && (
                    <div className={`grid gap-1.5 rounded-md overflow-hidden ${
                      images.length === 1 ? 'grid-cols-1' :
                      images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                    }`}>
                      {images.map((f, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={f.localPreview || f.url}
                            alt={f.originalName}
                            className={`w-full object-cover rounded border border-white/5 transition-opacity ${
                              images.length === 1 ? 'max-h-64' : 'max-h-36'
                            } ${!f.url ? 'opacity-50' : 'opacity-100'}`}
                          />
                          {!f.url && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                            </div>
                          )}
                          <button
                            onClick={() => removeFile(files.indexOf(f))}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {docs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {docs.map((f, i) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-medium ${
                          f.url ? 'bg-gray-800/60 border-gray-700/50 text-gray-300' : 'bg-gray-800/30 border-gray-800 text-gray-500'
                        }`}>
                          <span>{fileIcon(f.mimeType)}</span>
                          <span className="truncate max-w-[140px]">{f.originalName}</span>
                          {!f.url && <div className="w-3 h-3 rounded-full border border-gray-500 border-t-transparent animate-spin shrink-0" />}
                          {f.url && (
                            <button onClick={() => removeFile(files.indexOf(f))} className="text-gray-600 hover:text-red-400 transition-colors ml-0.5 shrink-0">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom action bar */}
              <div className="flex items-center justify-between border-t border-gray-700/50 pt-2.5 mt-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-gray-700/30 hover:bg-gray-700/50 border-none text-[11px] font-bold text-gray-300 transition-all disabled:opacity-50"
                    title="Attach images or files"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                    {uploading ? 'Uploading...' : 'Attach'}
                  </button>

                  <div className="hidden sm:flex items-center gap-1 border-l border-gray-700/50 pl-3">
                    {BADGE_OPTIONS.map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setDraft(p => ({ ...p, badge: b }))}
                        className={`text-[11px] font-bold transition-all px-2 py-0.5 rounded ${
                          draft.badge === b
                            ? 'text-white bg-gray-700/50'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  {(status.error || uploadError) && (
                    <p className="text-xs text-red-400 truncate ml-2">{status.error || uploadError}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setFocused(false); setDraft({ title: '', content: '', badge: 'General' }); setFiles([]); }}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onPost}
                    disabled={!canPost}
                    className="px-6 py-2 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {status.loading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Modal({ title, icon, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border-none rounded-md w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">{icon} {title}</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</label>
      {children}
    </div>
  );
}

function PrivacyToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-800/40 rounded border-none/50 cursor-pointer" onClick={() => onChange(!value)}>
      <div className={`w-10 h-10 rounded flex items-center justify-center ${value ? 'bg-blue-600/20' : 'bg-emerald-600/20'}`}>
        {value ? <Lock size={18} className="text-blue-400" /> : <Globe size={18} className="text-emerald-400" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{value ? 'Private Group' : 'Public Group'}</p>
        <p className="text-xs text-gray-500">{value ? 'Invite-only' : 'Anyone can discover & join'}</p>
      </div>
      <div className={`w-10 h-6 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-emerald-600'}`}>
        <div className={`w-5 h-5 rounded-full bg-white mx-0.5 mt-0.5 transition-transform shadow-sm ${value ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}

function ModalActions({ onCancel, loading, label }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded border-none text-gray-400 hover:bg-gray-800 transition-colors font-semibold text-sm">Cancel</button>
      <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-60 text-sm">
        {loading ? 'Saving...' : label}
      </button>
    </div>
  );
}
