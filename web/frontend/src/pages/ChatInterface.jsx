import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import io from 'socket.io-client';
import useChatStore from '../store/chatStore';
import useSettingsStore from '../store/settingsStore';
import { Send, Hash, Settings, Users, LogOut, Plus, Paperclip, FileText, Smile, X, Bell, Moon, Sun, Shield, User, UserPlus, Type, LayoutDashboard, Lock, Globe, MessageSquare, Image, File, Check, Edit2, Trash2 } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChannelInfoPanel from '../components/ChannelInfoPanel';

const API_URL = (import.meta.env.VITE_API_URL || 'https://zippi-uwwt.onrender.com') + '/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://zippi-uwwt.onrender.com';

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function ChatInterface() {
  const { user, token, logout, setUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { channels, setChannels, messages, setMessages, addMessage, replaceMessage, removeMessage, activeChannel, setActiveChannel, unreadCounts, incrementUnread, clearUnread } = useChatStore();
  const safeChannels = Array.isArray(channels) ? channels : [];
  const safeMessages = Array.isArray(messages) ? messages : [];
  const safeUnreadCounts = unreadCounts && typeof unreadCounts === 'object' ? unreadCounts : {};
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState([]); // [{ file, localUrl, name, type, uploaded }]
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showNewChannelForm, setShowNewChannelForm] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(true);
  const [newChannelTags, setNewChannelTags] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const { theme: devTheme, setTheme, fontSize: chatFontSize, setFontSize, notificationsEnabled: devNotifications, setNotificationsEnabled } = useSettingsStore();
  const [settingsTab, setSettingsTab] = useState('appearance');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [activeReactionMessageId, setActiveReactionMessageId] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editInputText, setEditInputText] = useState('');
  const typingTimeoutRef = useRef(null);

  // Notebook state
  const [showNotebook, setShowNotebook] = useState(false);
  const [notebookContent, setNotebookContent] = useState('');
  // We use a ref for the notebook content to sync avoiding closure staleness 
  // without triggering re-renders in socket callbacks
  const notebookRef = useRef('');
  
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Close emoji pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Chat input emoji picker
      if (showEmojiPicker && !event.target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
      // Reaction picker
      if (activeReactionMessageId && !event.target.closest('.reaction-picker-container')) {
        setActiveReactionMessageId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, activeReactionMessageId]);

  if (!user || !token) {
    return <Navigate to="/login" />;
  }

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!loadingMore) {
      scrollToBottom();
    }
  }, [messages, loadingMore]);

  const loadMoreMessages = async () => {
    if (!activeChannel || !nextCursor || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const res = await fetch(`${API_URL}/channels/${activeChannel}/messages?limit=50&cursor=${nextCursor}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          // Prepend older messages directly via Zustand store
          setMessages([...data.messages, ...messages]);
          setNextCursor(data.nextCursor);
        }
      }
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addAttachments(Array.from(e.target.files));
      fileInputRef.current.value = '';
    }
  };

  const addAttachments = (files) => {
    const newAttachments = files.map(file => {
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      let localUrl = null;
      if (type === 'image') {
        localUrl = URL.createObjectURL(file);
      }
      return { file, localUrl, name: file.name, type, uploaded: false };
    });
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => {
      const newAtt = [...prev];
      const removed = newAtt.splice(idx, 1)[0];
      if (removed.localUrl) {
        URL.revokeObjectURL(removed.localUrl);
      }
      return newAtt;
    });
  };

  // Initial fetch of channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch(`${API_URL}/channels`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setChannels(data);
          
          const params = new URLSearchParams(location.search);
          const urlChannelId = params.get('channel');
          
          if (urlChannelId && data.some(c => c.id === urlChannelId)) {
            setActiveChannel(urlChannelId);
          } else if (data.length > 0 && (!activeChannel || !data.some(c => c.id === activeChannel))) {
            setActiveChannel(data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching channels', err);
      }
    };
    fetchChannels();
  }, [token, setChannels, setActiveChannel, location.search, activeChannel]);

  // Fetch messages when active channel changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeChannel) return;
      try {
        const res = await fetch(`${API_URL}/channels/${activeChannel}/messages?limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // API now returns { messages, nextCursor }
          if (data.messages) {
            setMessages(data.messages);
            setNextCursor(data.nextCursor);
          } else {
            // Fallback for older api format during dev
            setMessages(Array.isArray(data) ? data : []);
            setNextCursor(null);
          }
        }
      } catch (err) {
        console.error('Error fetching messages', err);
      }
    };

    const fetchNotebook = async () => {
      if (!activeChannel) return;
      try {
        const res = await fetch(`${API_URL}/channels/${activeChannel}/notebook`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotebookContent(data.notebook || '');
          notebookRef.current = data.notebook || '';
        }
      } catch (err) {
        console.error('Error fetching notebook', err);
      }
    };

    fetchMessages();
    fetchNotebook();
  }, [activeChannel, token, setMessages]);

  useEffect(() => {
    // Initialize Socket Connection safely
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
      if (activeChannel) {
        socketRef.current.emit('join_channel', activeChannel);
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    socketRef.current.on('reconnect', () => {
      console.log('Reconnected to socket server');
      // Rejoin the current channel after reconnection
      if (activeChannel) {
        socketRef.current.emit('join_channel', activeChannel);
      }
    });

    socketRef.current.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    socketRef.current.on('receive_message', (data) => {
      // Only add message if it's for the current channel
      const currentChannel = useChatStore.getState().activeChannel;
      if (data.channelId === currentChannel) {
        addMessage(data);
      } else {
        // Only increment unread if message is for a different channel
        useChatStore.getState().incrementUnread(data.channelId);
      }
    });

    socketRef.current.on('user_typing', ({ username }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(username);
        return newSet;
      });
    });

    socketRef.current.on('user_stopped_typing', ({ username }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(username);
        return newSet;
      });
    });

    socketRef.current.on('receive_reaction', ({ messageId, emoji, username }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          const reactions = m.reactions ? { ...m.reactions } : {};
          if (!reactions[emoji]) reactions[emoji] = [];
          if (!reactions[emoji].includes(username)) {
            reactions[emoji] = [...reactions[emoji], username];
          }
          return { ...m, reactions };
        }
        return m;
      }));
    });

    socketRef.current.on('message_edited', (data) => {
      replaceMessage(data.id, data);
    });

    socketRef.current.on('message_deleted', ({ messageId }) => {
      removeMessage(messageId);
    });

    socketRef.current.on('notebook_updated', async ({ notebook }) => {
      // Only update if the content is different (prevent conflicting overwrites)
      const currentContent = notebookRef.current;

      // If the notebook was edited by someone else and differs from current local state
      if (notebook !== currentContent) {
        // If user is actively editing, show warning and don't overwrite
        if (document.activeElement?.closest('.notebook-textarea')) {
          console.warn('Notebook was updated by another user. Showing conflict resolution...');
          // Show a subtle notification instead of silently overwriting
          // User can refresh to get latest version
          return;
        }

        // If user is not editing, update to latest version
        setNotebookContent(notebook);
        notebookRef.current = notebook;
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, addMessage]); // Only re-run if token changes
  
  // Join new channel when active channel changes
  useEffect(() => {
    if (socketRef.current && activeChannel) {
      socketRef.current.emit('join_channel', activeChannel);
    }
  }, [activeChannel]);

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/channels`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          name: newChannelName.trim().toLowerCase(),
          isPrivate: newChannelIsPrivate,
          tags: newChannelTags.trim() || null
        })
      });
      if (res.ok) {
        const data = await res.json();
        setChannels([...channels, data]);
        setActiveChannel(data.id);
        setShowNewChannelForm(false);
        setNewChannelName('');
        setNewChannelTags('');
        setNewChannelIsPrivate(true);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to create channel');
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred while creating channel');
    }
  };

  const handleChannelDeleted = (channelId) => {
    const remaining = channels.filter(c => c.id !== channelId);
    setChannels(remaining);
    if (activeChannel === channelId) {
      setActiveChannel(remaining[0]?.id || null);
      setMessages([]);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !activeChannel) return;
    try {
      const res = await fetch(`${API_URL}/channels/${activeChannel}/invite`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ username: inviteUsername.trim() })
      });
      if (res.ok) {
        setShowInviteModal(false);
        setInviteUsername('');
        alert('User invited successfully!');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to invite user');
      }
    } catch (err) {
      console.error(err);
      alert('Error inviting user');
    }
  };


  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || !activeChannel) return;

    const textToSend = inputText;
    const filesToSend = [...attachments];
    setInputText('');
    setAttachments([]);
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    if (socketRef.current) {
      socketRef.current.emit('stop_typing', { channelId: activeChannel, username: user.username });
    }

    // 1. Create and render Optimistic Message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      content: textToSend,
      createdAt: new Date().toISOString(),
      userId: user.id,
      channelId: activeChannel,
      username: user.username,
      user: user,
      fileUrls: filesToSend.map(a => a.localUrl),
      fileTypes: filesToSend.map(a => a.type || 'application/octet-stream'),
      isOptimistic: true
    };
    
    // Fallback for single file rendering format
    if (filesToSend.length > 0) {
      const firstType = filesToSend[0].type || '';
      optimisticMsg.fileUrl = filesToSend[0].localUrl;
      optimisticMsg.fileType = firstType.startsWith('image/') ? 'image' : 'file';
    }
    
    addMessage(optimisticMsg);

    // 2. Upload files if any
    let uploadedFiles = [];
    if (filesToSend.length > 0) {
      setUploading(true);
      try {
        const formData = new FormData();
        filesToSend.forEach(a => formData.append('files', a.file));
        const upRes = await fetch(`${API_URL.replace('/api', '')}/api/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (upRes.ok) {
          const upData = await upRes.json();
          uploadedFiles = upData.files || []; // [{ url, mimeType, originalName }]
        }
      } catch (err) {
        console.error('Upload error', err);
      } finally {
        setUploading(false);
      }
    }

    try {
      // 3. Send final payload to REST API
      const formData = new FormData();
      if (textToSend.trim()) formData.append('content', textToSend);
      // Pass uploaded file URLs as JSON
      if (uploadedFiles.length > 0) {
        formData.append('fileUrls', JSON.stringify(uploadedFiles.map(f => f.url)));
        formData.append('fileTypes', JSON.stringify(uploadedFiles.map(f => f.mimeType)));
        
        // Legacy compat: first file format
        const firstFile = uploadedFiles[0];
        formData.append('fileUrl', firstFile.url);
        formData.append('fileType', firstFile.mimeType.startsWith('image/') ? 'image' : 'file');
      }

      const res = await fetch(`${API_URL}/channels/${activeChannel}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData // Backend handles multipart or regular depending on how route is set up, though this uses FormData without actual file binary now. Wait, does the backend message route support multer? Yes. Wait, if we send FormData to the backend `/messages` and it expects `req.file`... Oh! This uses `req.body.content` strings mostly if we separated the upload. Let's just send JSON if no files, or FormData if needed. We'll stick to formData for compatibility.
      });

      if (res.ok) {
        const serverMsg = await res.json();
        // Parse if they came back as strings
        if (serverMsg.fileUrls && typeof serverMsg.fileUrls === 'string') {
          try { serverMsg.fileUrls = JSON.parse(serverMsg.fileUrls); } catch {}
        }
        if (serverMsg.fileTypes && typeof serverMsg.fileTypes === 'string') {
          try { serverMsg.fileTypes = JSON.parse(serverMsg.fileTypes); } catch {}
        }
        
        // 4. Replace optimistic fake message with real DB message
        replaceMessage(tempId, serverMsg);
        
        socketRef.current?.emit('send_message', serverMsg);
      } else {
        // If it failed, mark optimistic message as failed
        replaceMessage(tempId, { ...optimisticMsg, error: true, isOptimistic: false });
      }
    } catch (err) {
      console.error(err);
      replaceMessage(tempId, { ...optimisticMsg, error: true, isOptimistic: false });
    }
  };

  const handleEditMessage = async (msgId) => {
    if (!editInputText.trim() || !activeChannel || !editingMessage) return;

    try {
      const res = await fetch(`${API_URL}/channels/${activeChannel}/messages/${msgId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: editInputText })
      });

      if (res.ok) {
        const updatedMsg = await res.json();
        replaceMessage(msgId, updatedMsg);
        socketRef.current?.emit('edit_message', updatedMsg);
        setEditingMessage(null);
        setEditInputText('');
      } else {
        alert('Failed to edit message');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!activeChannel || !window.confirm('Delete this message?')) return;

    try {
      const res = await fetch(`${API_URL}/channels/${activeChannel}/messages/${msgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        removeMessage(msgId);
        socketRef.current?.emit('delete_message', { channelId: activeChannel, messageId: msgId });
      } else {
        alert('Failed to delete message');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    // Auto-grow
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';

    if (socketRef.current && activeChannel) {
      socketRef.current.emit('typing', { channelId: activeChannel, username: user.username });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('stop_typing', { channelId: activeChannel, username: user.username });
      }, 2000);
    }
  };

  const handleAddReaction = (messageId, emojiObject) => {
    if (!socketRef.current || !activeChannel) return;
    
    // Optimistic UI update
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const reactions = m.reactions ? { ...m.reactions } : {};
        if (!reactions[emojiObject.emoji]) reactions[emojiObject.emoji] = [];
        if (!reactions[emojiObject.emoji].includes(user.username)) {
          reactions[emojiObject.emoji] = [...reactions[emojiObject.emoji], user.username];
        }
        return { ...m, reactions };
      }
      return m;
    }));

    socketRef.current.emit('add_reaction', { 
      channelId: activeChannel, 
      messageId, 
      emoji: emojiObject.emoji,
      username: user.username 
    });
    setActiveReactionMessageId(null);
  };

  // Debounced save for the notebook
  const saveNotebook = useRef(
    debounce(async (channelId, content, currentToken) => {
      try {
        await fetch(`${API_URL}/channels/${channelId}/notebook`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}` 
          },
          body: JSON.stringify({ notebook: content })
        });
      } catch (err) {
        console.error('Failed to save notebook', err);
      }
    }, 1000)
  ).current;

  const handleNotebookChange = (e) => {
    const val = e.target.value;
    setNotebookContent(val);
    notebookRef.current = val;
    socketRef.current.emit('notebook_update', { channelId: activeChannel, notebook: val });
    saveNotebook(activeChannel, val, token);
  };

  const onEmojiClick = (emojiObject) => {
    setInputText(prev => prev + emojiObject.emoji);
  };

  const activeChannelObj = safeChannels.find(c => c.id === activeChannel);

  const getMediaUrl = (url) => {
    return `http://localhost:5000${url}`;
  };

  const isLight = devTheme === 'light';
  
  const theme = {
    bgApp: isLight ? 'bg-gray-50 text-gray-900' : 'bg-gray-950 text-gray-100',
    sidebar: isLight ? 'bg-white border-gray-300' : 'bg-gray-900 border-gray-800',
    border: isLight ? 'border-gray-200' : 'border-gray-800',
    header: isLight ? 'bg-white/80 border-gray-200' : 'bg-gray-900/40 border-gray-800',
    inputBg: isLight ? 'bg-gray-100 border-gray-300' : 'bg-gray-900/50 border-gray-800',
    inputLine: isLight ? 'bg-white text-gray-900 placeholder-gray-500 border-gray-300' : 'bg-gray-950 text-white placeholder-gray-500 border-gray-700',
    muted: isLight ? 'text-gray-500' : 'text-gray-400',
    hoverMuted: isLight ? 'hover:text-gray-900' : 'hover:text-white',
    hoverBg: isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800',
    channelActive: isLight ? 'bg-blue-50 text-blue-700' : 'bg-blue-600/20 text-blue-400',
    channelInactive: isLight ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
    bubbleOther: isLight ? 'bg-white text-gray-800 border-gray-200 shadow-sm' : 'bg-gray-800/80 text-gray-100 border-gray-700/50 shadow-lg',
    bubbleMe: isLight ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-md shadow-blue-600/20',
    prose: isLight ? 'prose-gray prose-a:text-blue-600' : 'prose-invert prose-a:text-blue-400',
    modalOverlay: isLight ? 'bg-gray-900/40' : 'bg-black/60',
    modalCard: isLight ? 'bg-white border-gray-200 shadow-xl' : 'bg-gray-900 border-gray-800 shadow-2xl',
    modalSidebar: isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-950 border-gray-800',
    btnPrimary: isLight ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white',
    textMain: isLight ? 'text-gray-900' : 'text-white'
  };

  const fontSizeClass = chatFontSize === 'xs' ? 'text-xs' : chatFontSize === 'sm' ? 'text-sm' : chatFontSize === 'base' ? 'text-base' : 'text-lg';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }} className={`transition-colors duration-300 ${theme.bgApp}`}>
      <div style={{ width: '256px', flexShrink: 0, display: 'flex', flexDirection: 'column', zIndex: 10 }} className={`border-r shadow-xl transition-colors duration-300 ${theme.sidebar}`}>
        <div style={{ height: '64px', minHeight: '64px', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f1f3d 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid rgba(59,130,246,0.3)', flexShrink: 0 }}>
          <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>⚡ Zippi</h2>
          <button onClick={() => navigate('/dashboard')} style={{ padding: '8px', color: '#93c5fd', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px' }} title="Dashboard">
            <LayoutDashboard size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="flex justify-between items-center mb-2 px-3">
            <div className={`text-xs font-semibold uppercase tracking-wider ${theme.muted}`}>Channels</div>
            <button onClick={() => setShowNewChannelForm(!showNewChannelForm)} className={`${theme.muted} ${theme.hoverMuted} transition-colors`}>
              <Plus size={16} />
            </button>
          </div>

          {showNewChannelForm && (
            <form onSubmit={handleCreateChannel} className="px-2 mb-2 space-y-2">
              <input
                autoFocus
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="channel-name"
                className={`w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border ${theme.inputLine}`}
              />
              <input
                type="text"
                value={newChannelTags}
                onChange={(e) => setNewChannelTags(e.target.value)}
                placeholder="tags: dev, fun..."
                className={`w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border ${theme.inputLine}`}
              />
              <div className="flex items-center gap-2 px-1">
                <button
                  type="button"
                  onClick={() => setNewChannelIsPrivate(!newChannelIsPrivate)}
                  className={`w-8 h-4 rounded-full transition-colors ${newChannelIsPrivate ? 'bg-blue-600' : 'bg-gray-600'}`}
                >
                  <div className={`w-3 h-3 rounded-full bg-white mx-0.5 transition-transform ${newChannelIsPrivate ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className={`text-xs ${theme.muted}`}>{newChannelIsPrivate ? <><Lock size={10} className="inline mr-1" />Private</> : <><Globe size={10} className="inline mr-1" />Public</>}</span>
              </div>
              <button type="submit" className="w-full text-xs py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors">Create</button>
            </form>
          )}

          {safeChannels.map(channel => {
            const hasUnread = safeUnreadCounts[channel.id] > 0;
            return (
            <div key={channel.id} className="flex group/row">
              <button
                onClick={() => { setActiveChannel(channel.id); clearUnread(channel.id); }}
                className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-l-lg text-sm font-medium transition-colors min-w-0 ${activeChannel === channel.id ? theme.channelActive : theme.channelInactive} ${hasUnread && activeChannel !== channel.id ? 'font-bold text-white' : ''}`}
              >
                {channel.isPrivate ? <Lock size={13} className={activeChannel === channel.id ? 'text-blue-500 shrink-0' : 'text-gray-500 shrink-0'} /> : <Hash size={13} className={activeChannel === channel.id ? 'text-blue-500 shrink-0' : 'text-gray-500 shrink-0'} />}
                <span className="truncate flex-1 text-left">{channel.name}</span>
                {hasUnread && activeChannel !== channel.id && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {safeUnreadCounts[channel.id]}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setActiveChannel(channel.id); setShowChannelInfo(true); clearUnread(channel.id); }}
                title="Channel info"
                className={`px-2 py-2 rounded-r-lg text-sm transition-colors opacity-0 group-hover/row:opacity-100 ${activeChannel === channel.id ? theme.channelActive : theme.channelInactive}`}
              >
                <Users size={13} />
              </button>
            </div>
          )})}
          {safeChannels.length === 0 && (
            <div className={`px-3 py-2 text-sm italic ${theme.muted}`}>No channels created yet.</div>
          )}
        </div>

        <div className={`p-4 border-t flex items-center gap-3 transition-colors ${theme.sidebar} ${theme.border}`}>
          <img 
            src={`https://ui-avatars.com/api/?background=random&color=fff&name=${user.username}`} 
            alt="avatar" 
            className="w-10 h-10 rounded-full bg-blue-500/10 shadow-lg shrink-0 border border-blue-500/20"
          />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${theme.textMain}`}>{user?.nickname || user?.username}</p>
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Online
            </p>
          </div>
          <button onClick={logout} className={`p-2 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors ${theme.muted}`} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Header - in flow, not absolute */}
        <div style={{ height: '64px', minHeight: '64px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: `1px solid ${isLight ? '#e5e7eb' : '#1f2937'}`, background: isLight ? '#ffffff' : '#111827', zIndex: 10 }}>
          <button
            onClick={() => activeChannel && setShowChannelInfo(true)}
            className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${!activeChannel ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {activeChannelObj?.isPrivate ? <Lock size={18} className={theme.muted} /> : <Hash size={18} className={theme.muted} />}
            <span className={`font-semibold text-lg ${theme.textMain}`}>{activeChannelObj ? activeChannelObj.name : 'Select a channel'}</span>
            {activeChannelObj && <Users size={14} className={`${theme.muted} ml-1`} />}
          </button>
          <div className={`flex gap-4 ${theme.muted}`}>
            {activeChannel && (
              <button onClick={() => setShowNotebook(!showNotebook)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors border ${showNotebook ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-transparent border-gray-700 hover:bg-gray-800'}`} title="Shared Notebook">
                <FileText size={16} /> <span className="hidden sm:inline">Notebook</span>
              </button>
            )}
            <button onClick={() => setShowInviteModal(true)} className={`${theme.hoverMuted} transition-colors`} title="Invite User"><Users size={20} /></button>
            <button onClick={() => setShowSettings(true)} className={`${theme.hoverMuted} transition-colors`}><Settings size={20} /></button>
          </div>
        </div>

        {/* Dynamic Split Layout inner container */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Main Chat Area Inner */}
          <div className="flex-1 flex flex-col relative w-full h-full transition-all duration-300 border-r border-transparent" style={{ borderRightColor: showNotebook ? (isLight ? '#e5e7eb' : '#1f2937') : 'transparent' }}>
            
            {/* Message List — Discord style */}
            <div
              className="flex-1 overflow-y-auto pb-4"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files.length > 0) addAttachments(e.dataTransfer.files);
              }}
            >
              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/10 border-2 border-dashed border-blue-500/60 rounded-2xl backdrop-blur-sm pointer-events-none">
                  <div className="text-center">
                    <Paperclip size={48} className="mx-auto mb-3 text-blue-400" />
                    <p className="text-xl font-bold text-blue-300">Drop files to attach</p>
                  </div>
                </div>
              )}

              <div className="px-4 pt-4 space-y-0.5">
                {nextCursor && (
                  <div className="text-center pb-4 pt-2">
                    <button
                      onClick={loadMoreMessages}
                      disabled={loadingMore}
                      className="px-4 py-1.5 text-xs font-semibold bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 rounded-full transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? 'Loading...' : 'Load older messages'}
                    </button>
                  </div>
                )}
                {safeMessages.map((msg, i) => {
                  const prev = safeMessages[i - 1];
                  const isMe = msg.userId === user.id;
                  const sameAuthor = prev && prev.userId === msg.userId;
                  const sameMinute = prev && Math.abs(new Date(msg.createdAt) - new Date(prev.createdAt)) < 5 * 60 * 1000;
                  const grouped = sameAuthor && sameMinute;

                  // Parse fileUrls/fileTypes
                  let fileUrls = msg.fileUrls || [];
                  let fileTypes = msg.fileTypes || [];
                  if (typeof fileUrls === 'string') { try { fileUrls = JSON.parse(fileUrls); } catch { fileUrls = []; } }
                  if (typeof fileTypes === 'string') { try { fileTypes = JSON.parse(fileTypes); } catch { fileTypes = []; } }
                  // Fall back to legacy single file
                  if (fileUrls.length === 0 && msg.fileUrl) {
                    const rawUrl = msg.fileUrl.startsWith('http') ? msg.fileUrl : getMediaUrl(msg.fileUrl);
                    fileUrls = [rawUrl];
                    fileTypes = [msg.fileType === 'image' ? 'image/jpeg' : 'application/octet-stream'];
                  }
                  const imageUrls = fileUrls.filter((_, idx) => (fileTypes[idx] || '').startsWith('image/'));
                  const docUrls = fileUrls.filter((_, idx) => !(fileTypes[idx] || '').startsWith('image/'));
                  const docTypes = fileTypes.filter(t => !t.startsWith('image/'));

                  return (
                    <div
                      key={msg.id || i}
                      className={`group flex gap-3 px-2 py-0.5 rounded-lg hover:bg-white/[0.02] transition-colors ${grouped ? '' : 'mt-4'} ${msg.isOptimistic ? 'opacity-60 grayscale-[20%]' : ''} ${msg.error ? 'border border-red-500/50 bg-red-500/5' : ''}`}
                    >
                      {/* Avatar column — always same width */}
                      <div className="w-10 shrink-0 flex items-start pt-0.5">
                        {!grouped ? (
                          <img
                            src={`https://ui-avatars.com/api/?background=random&color=fff&name=${msg.username}`}
                            alt={msg.username}
                            className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700/50 cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all"
                            onClick={() => msg.user && setSelectedProfile(msg.user)}
                          />
                        ) : (
                          <span className="w-10 text-[10px] text-gray-600 text-right pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Content column */}
                      <div className="flex-1 min-w-0">
                        {!grouped && (
                          <div className="flex items-baseline gap-2 mb-1">
                            <span
                              className={`font-semibold text-sm cursor-pointer hover:underline ${isMe ? 'text-blue-400' : 'text-indigo-400'}`}
                              onClick={() => msg.user && setSelectedProfile(msg.user)}
                            >
                              {msg.username}
                              {isMe && <span className="ml-1 text-[10px] font-normal text-gray-500">(you)</span>}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}

                        {/* Text content */}
                        {msg.content && (
                          <div className={`${fontSizeClass} leading-relaxed prose prose-p:my-0.5 max-w-none text-gray-200 ${theme.prose}`}>
                            {editingMessage === msg.id ? (
                              <div className="flex flex-col gap-2 mt-1 w-full max-w-2xl">
                                <textarea
                                  value={editInputText}
                                  onChange={(e) => setEditInputText(e.target.value)}
                                  className="w-full bg-gray-800 text-gray-100 rounded-lg border border-gray-600 p-2 text-sm max-h-32 min-h-16 outline-none focus:border-blue-500"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditMessage(msg.id); }
                                    if (e.key === 'Escape') setEditingMessage(null);
                                  }}
                                />
                                <div className="text-xs text-gray-400 flex gap-2 w-full justify-start items-center">
                                  escape to <span className="text-blue-400 cursor-pointer" onClick={() => setEditingMessage(null)}>cancel</span> •
                                  enter to <span className="text-blue-400 cursor-pointer" onClick={() => handleEditMessage(msg.id)}>save</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                {msg.updatedAt && new Date(msg.updatedAt).getTime() - new Date(msg.createdAt).getTime() > 1000 && (
                                  <span className="text-[10px] text-gray-500 ml-1 italic">(edited)</span>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Image grid */}
                        {imageUrls.length > 0 && (
                          <div className={`mt-2 grid gap-1 rounded-2xl overflow-hidden max-w-lg ${
                            imageUrls.length === 1 ? 'grid-cols-1' :
                            imageUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                          }`}>
                            {imageUrls.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noreferrer" className="block group/img">
                                <img
                                  src={url}
                                  alt={`img-${idx}`}
                                  className={`w-full object-cover rounded-xl border border-white/5 group-hover/img:opacity-90 transition-opacity ${
                                    imageUrls.length === 1 ? 'max-h-96' : 'max-h-48'
                                  }`}
                                />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* File chips */}
                        {docUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {docUrls.map((url, idx) => (
                              <a
                                key={idx}
                                href={msg.isOptimistic ? '#' : url}
                                target={msg.isOptimistic ? '_self' : '_blank'}
                                rel="noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700/50 hover:border-gray-600 transition-colors text-sm text-gray-300 hover:text-white"
                              >
                                <FileText size={16} className="shrink-0 text-blue-400" />
                                <span className="truncate max-w-[200px]">{msg.isOptimistic ? 'Uploading...' : decodeURIComponent(url.split('/').pop())}</span>
                              </a>
                            ))}
                          </div>
                        )}
                        
                        {msg.error && (
                          <div className="text-red-400 text-xs mt-1 flex items-center gap-1 font-semibold">
                            <X size={12} /> Message failed to send
                          </div>
                        )}

                        {/* Reactions */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.keys(msg.reactions).map(emoji => (
                              <div key={emoji} className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-0.5 rounded-full text-xs cursor-pointer transition-colors">
                                <span>{emoji}</span>
                                <span className="text-gray-400 font-bold">{msg.reactions[emoji].length}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Hover Actions */}
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 relative items-start">
                        {isMe && !msg.isOptimistic && (
                          <>
                            <button
                              onClick={() => { setEditingMessage(msg.id); setEditInputText(msg.content || ''); }}
                              className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-blue-400 hover:bg-gray-700 border border-gray-700 transition-all"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 border border-gray-700 transition-all"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id)}
                          className="reaction-picker-container p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 border border-gray-700 transition-all"
                          title="React"
                        >
                          <Smile size={14} />
                        </button>
                        {activeReactionMessageId === msg.id && (
                          <div className="absolute right-0 top-8 z-[100] animate-in zoom-in-95 reaction-picker-container">
                            <div className="bg-gray-900 border border-gray-700 p-2 rounded-2xl flex gap-1 shadow-xl">
                              {['👍', '❤️', '😂', '🔥', '👀', '🎉'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => handleAddReaction(msg.id, { emoji })}
                                  className="w-9 h-9 flex items-center justify-center hover:bg-gray-800 rounded-xl text-xl hover:scale-125 transition-transform"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {safeMessages.length === 0 && activeChannel && (
                  <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 rounded-2xl bg-gray-800/50 border border-gray-700 flex items-center justify-center mb-4">
                      <Hash size={32} className="text-gray-600" />
                    </div>
                    <p className="font-bold text-gray-300 text-lg">Welcome to #{activeChannelObj?.name}!</p>
                    <p className="text-gray-500 text-sm mt-1">This is the very beginning of this channel.</p>
                  </div>
                )}

                {!activeChannel && (
                  <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-500">
                    <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                      <MessageSquare size={40} />
                    </div>
                    <h3 className={`text-2xl font-bold mb-2 ${theme.textMain}`}>Welcome to Zippi Chat</h3>
                    <p className="max-w-md text-sm text-gray-500 leading-relaxed">
                      Join a study group from your dashboard or create a new channel.
                    </p>
                    <button
                      onClick={() => setShowNewChannelForm(true)}
                      className={`mt-6 px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2 ${theme.btnPrimary}`}
                    >
                      <Plus size={18} /> Create New Channel
                    </button>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-1" />
              </div>
            </div>

            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <div className={`px-6 py-1 text-xs font-semibold flex items-center gap-2 ${theme.muted}`}>
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            {/* ── Discord-style Input Bar ── */}
            <div className={`px-4 pb-4 pt-2 shrink-0 transition-colors duration-300 ${theme.bgApp.split(' ')[0]}`}>
              {showEmojiPicker && (
                <div className={`absolute bottom-[120px] right-20 z-50 shadow-2xl rounded-2xl border ${theme.border} emoji-picker-container`}>
                  <EmojiPicker theme={devTheme === 'dark' ? 'dark' : 'light'} onEmojiClick={onEmojiClick} />
                </div>
              )}

              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className={`mb-2 p-3 rounded-2xl border ${isLight ? 'bg-gray-100 border-gray-300' : 'bg-gray-800/60 border-gray-700/50'}`}>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((a, idx) => (
                      <div key={idx} className="relative group/att">
                        {a.localUrl ? (
                          <div className="relative">
                            <img src={a.localUrl} alt={a.name} className="w-20 h-20 object-cover rounded-xl border border-white/10" />
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-500 shadow-lg"
                            >✕</button>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${isLight ? 'bg-white border-gray-300 text-gray-700' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>
                            <FileText size={14} className="text-blue-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{a.name}</span>
                            <button type="button" onClick={() => removeAttachment(idx)} className="text-gray-500 hover:text-red-400 ml-1">✕</button>
                          </div>
                        )}
                      </div>
                    ))}
                    {uploading && (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                        Uploading...
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={`flex items-end gap-2 rounded-2xl border px-3 py-2 transition-colors ${
                isLight ? 'bg-gray-100 border-gray-300 focus-within:border-gray-400' : 'bg-gray-800/70 border-gray-700 focus-within:border-gray-600'
              }`}>
                {/* Attach button */}
                <button
                  type="button"
                  onClick={() => activeChannel && fileInputRef.current?.click()}
                  disabled={!activeChannel}
                  className={`shrink-0 p-1.5 rounded-lg transition-colors mb-0.5 disabled:opacity-40 ${theme.muted} hover:text-blue-400 hover:bg-blue-500/10`}
                  title="Attach image or file"
                >
                  <Plus size={20} />
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  onChange={handleFileSelect}
                />

                {/* Growing textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleTyping}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  onPaste={(e) => {
                    const items = Array.from(e.clipboardData.items);
                    const imageItems = items.filter(item => item.type.startsWith('image/'));
                    if (imageItems.length > 0) {
                      e.preventDefault();
                      const files = imageItems.map(item => item.getAsFile()).filter(Boolean);
                      addAttachments(files);
                    }
                  }}
                  placeholder={activeChannel ? `Message #${activeChannelObj?.name} — Shift+Enter for newline` : 'Select a channel...'}
                  disabled={!activeChannel}
                  rows={1}
                  className={`flex-1 resize-none bg-transparent focus:outline-none leading-relaxed py-1 text-sm disabled:opacity-50 ${isLight ? 'text-gray-900 placeholder-gray-500' : 'text-gray-100 placeholder-gray-500'}`}
                  style={{ maxHeight: '200px', overflowY: 'auto' }}
                />

                {/* Emoji picker */}
                <button
                  type="button"
                  onClick={() => activeChannel && setShowEmojiPicker(!showEmojiPicker)}
                  disabled={!activeChannel}
                  className={`shrink-0 p-1.5 rounded-lg transition-colors mb-0.5 disabled:opacity-40 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 emoji-picker-container`}
                >
                  <Smile size={20} />
                </button>

                {/* Send button */}
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={(!inputText.trim() && attachments.length === 0) || !activeChannel || uploading}
                  className={`shrink-0 p-2 rounded-xl transition-all mb-0.5 shadow disabled:opacity-40 disabled:cursor-not-allowed hover:scale-110 active:scale-95 ${theme.btnPrimary}`}
                >
                  <Send size={16} className="translate-x-px -translate-y-px" />
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-600 mt-1">Enter to send · Shift+Enter for newline · Paste images directly</p>
            </div> {/* end of input bar */}

          </div> {/* end of inner Chat column */}
        
          {/* Collaborative Notebook Panel */}
          {showNotebook && (
            <div className={`w-[400px] xl:w-[500px] h-full flex flex-col shadow-inner transition-all duration-300 ${isLight ? 'bg-gray-50' : 'bg-gray-950/50'}`}>
              <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${theme.border} ${isLight ? 'bg-gray-50' : 'bg-gray-950'}`}>
                <h3 className="flex items-center gap-2 font-bold text-sm tracking-wide">
                  <FileText size={16} className="text-blue-500" /> Group Notebook
                </h3>
                <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shadow-sm animate-pulse">Live Sync</span>
                <button onClick={() => setShowNotebook(false)} className={`p-1 rounded-md transition-colors ${theme.muted} ${theme.hoverMuted} ${theme.hoverBg}`}>
                  <X size={16} />
                </button>
              </div>
              
              <div className="flex-1 flex flex-col p-4 overflow-hidden relative group">
                {/* Visual texture */}
                <div className="absolute inset-x-8 top-12 bottom-12 border-l border-r border-dashed border-gray-700/20 pointer-events-none"></div>
                <div className="absolute inset-y-8 left-12 right-12 border-t border-b border-dashed border-gray-700/20 pointer-events-none"></div>

                <div className="flex-1 w-full flex flex-col z-10">
                  <textarea
                    value={notebookContent}
                    onChange={handleNotebookChange}
                    placeholder="Start typing your shared notes here...&#10;&#10;Try using Markdown:&#10;# Heading&#10;**Bold text**&#10;- Bullet points&#10;&#10;Changes are synced in real-time."
                    className={`w-full flex-1 resize-none bg-transparent focus:outline-none leading-relaxed p-4 rounded-xl transition-all ${isLight ? 'text-gray-800 placeholder-gray-400' : 'text-gray-200 placeholder-gray-600'}`}
                    style={{ fontSize: chatFontSize === 'xs' ? '12px' : chatFontSize === 'sm' ? '14px' : chatFontSize === 'base' ? '16px' : '18px' }}
                  />
                </div>
              </div>
            </div>
          )}
        
        </div> {/* end of Dynamic Split Layout */}
        
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200 p-4 ${theme.modalOverlay}`}>
          <div className={`rounded-md w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[600px] max-h-[90vh] ${theme.modalCard}`}>
            
            {/* Settings Sidebar */}
            <div className={`w-full md:w-64 border-r p-4 flex flex-col shrink-0 ${theme.modalSidebar}`}>
              <h3 className={`text-xl font-bold flex items-center gap-2 mb-6 px-2 mt-2 ${theme.textMain}`}>
                <Settings className="text-blue-500" size={24}/> Settings
              </h3>
              
              <div className="space-y-1 flex-1">
                <button 
                  onClick={() => setSettingsTab('appearance')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded font-medium text-sm transition-all ${settingsTab === 'appearance' ? theme.channelActive : theme.channelInactive}`}
                >
                  <Sun size={18} /> Appearance
                </button>
                <button 
                  onClick={() => setSettingsTab('notifications')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded font-medium text-sm transition-all ${settingsTab === 'notifications' ? theme.channelActive : theme.channelInactive}`}
                >
                  <Bell size={18} /> Notifications
                </button>
              </div>

              <div className="mt-auto px-2 pb-2">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${theme.muted} ${isLight ? 'bg-white border-gray-300' : 'bg-gray-900 border-gray-800'}`}>Zippi v1.0.0</span>
              </div>
            </div>

            {/* Settings Content */}
            <div className={`flex-1 flex flex-col overflow-hidden relative ${theme.bgApp}`}>
              <button 
                onClick={() => setShowSettings(false)} 
                className={`absolute top-4 right-4 p-2 rounded-lg transition-colors z-10 ${theme.muted} ${theme.hoverMuted} ${theme.hoverBg}`}
              >
                <X size={20} />
              </button>

              <div className="p-8 overflow-y-auto flex-1">

                {settingsTab === 'appearance' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Sun size={20} className="text-yellow-400" /> Theme Preference
                      </h4>
                      <div className="bg-gray-800/20 p-4 rounded border border-gray-700/50 flex gap-3">
                        <button 
                          onClick={() => setTheme('dark')}
                          className={`flex-1 p-3 rounded border-2 transition-all ${devTheme === 'dark' ? 'border-blue-500 bg-gray-800' : 'border-gray-700 bg-gray-950 hover:border-gray-600'}`}
                        >
                          <div className="w-full h-20 bg-gray-900 rounded-lg mb-3 flex flex-col p-2 gap-2 border border-gray-800">
                            <div className="h-4 w-1/2 bg-gray-800 rounded"></div>
                            <div className="h-4 w-3/4 bg-blue-600/20 rounded"></div>
                          </div>
                          <span className="font-semibold block text-center text-white">Dark Theme</span>
                        </button>
                        
                        <button 
                          onClick={() => setTheme('light')}
                          className={`flex-1 p-3 rounded border-2 transition-all ${devTheme === 'light' ? 'border-blue-500 bg-gray-800' : 'border-gray-700 bg-gray-950 hover:border-gray-600 opacity-60'}`}
                        >
                          <div className="w-full h-20 bg-gray-200 rounded-lg mb-3 flex flex-col p-2 gap-2 border border-gray-300">
                            <div className="h-4 w-1/2 bg-white rounded shadow-sm"></div>
                            <div className="h-4 w-3/4 bg-blue-100 rounded shadow-sm"></div>
                          </div>
                          <span className="font-semibold block text-center text-white">Light Theme</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Type size={20} className="text-blue-400" /> Chat Font Size
                      </h4>
                      <div className="bg-gray-800/20 p-4 rounded border border-gray-700/50">
                        <div className="flex items-center gap-2 bg-gray-950 p-1.5 rounded border border-gray-800">
                          {['xs', 'sm', 'base', 'lg'].map(size => (
                            <button 
                              key={size}
                              onClick={() => setFontSize(size)}
                              className={`flex-1 py-1.5 text-center rounded text-xs transition-all capitalize font-medium cursor-pointer ${chatFontSize === size ? 'bg-gray-800 text-white border border-gray-700' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                              {size === 'base' ? 'Medium' : size === 'sm' ? 'Small' : size === 'xs' ? 'Tiny' : 'Large'}
                            </button>
                          ))}
                        </div>
                        <div className="mt-4 p-4 bg-gray-950 rounded border border-gray-800 text-center relative overflow-hidden">
                          <div className="flex justify-end pr-8 pb-4">
                             <p className={`text-${chatFontSize} text-white bg-blue-600 rounded-2xl rounded-tr-sm px-5 py-3 shadow-lg max-w-sm text-left relative z-10`}>
                              This is how your chat messages will look in {chatFontSize === 'base' ? 'Medium' : chatFontSize === 'sm' ? 'Small' : chatFontSize === 'xs' ? 'Tiny' : 'Large'}!
                             </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'notifications' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Bell size={20} className="text-emerald-400" /> Push Notifications
                      </h4>
                      <div className="bg-gray-800/20 p-2 rounded border border-gray-700/50">
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 rounded transition-colors" onClick={() => setNotificationsEnabled(!devNotifications)}>
                          <div>
                            <span className="font-semibold text-white block">Enable Desktop Notifications</span>
                            <span className="text-sm text-gray-400">Receive alerts even when Zippi is in the background</span>
                          </div>
                          <div className={`w-12 h-6 rounded-full relative transition-colors ${devNotifications ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-gray-700'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${devNotifications ? 'left-[26px]' : 'left-1'}`}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
              
              {/* Done Button Footer */}
              <div className="p-4 border-t border-gray-800 bg-gray-900/80 backdrop-blur-md flex justify-end shrink-0 z-20">
                <button onClick={() => setShowSettings(false)} className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors text-sm">
                  Save & Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-md w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white truncate max-w-[250px]">Invite to {activeChannelObj?.name}</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800 p-2">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">Username to invite</label>
              <input
                type="text"
                autoFocus
                required
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="Enter exact username"
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-6"
              />
              <button type="submit" className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex justify-center items-center gap-2 transition-colors shadow-lg shadow-blue-600/20">
                <Users size={18} /> Send Invite
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Channel Info Panel */}
      {showChannelInfo && activeChannel && (
        <ChannelInfoPanel
          channelId={activeChannel}
          user={user}
          token={token}
          onClose={() => setShowChannelInfo(false)}
          onDeleted={handleChannelDeleted}
          onMuteToggled={(id, muted) => console.log('Muted:', id, muted)}
        />
      )}

      {/* Global View Profile Modal */}
      {selectedProfile && (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm ${theme.modalOverlay}`}>
          <div className={`rounded-md w-full max-w-sm overflow-hidden p-6 flex flex-col items-center relative border ${theme.modalCard}`}>
            <button 
              onClick={() => setSelectedProfile(null)} 
              className={`absolute top-4 right-4 p-2 rounded-lg transition-colors z-10 ${theme.muted} ${theme.hoverMuted} hover:bg-black/10`}
            >
              <X size={20} />
            </button>
            <div className="relative mb-4 mt-2">
              <img 
                src={`https://ui-avatars.com/api/?background=random&color=fff&name=${selectedProfile.username}`} 
                alt="avatar" 
                className={`w-20 h-20 rounded border border-gray-700 object-cover ${isLight ? 'bg-gray-100' : 'bg-gray-900'}`}
              />
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] ${isLight ? 'border-white' : 'border-gray-900'} ${selectedProfile.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-gray-500'}`} />
            </div>
            
            <h3 className={`text-base font-bold ${theme.textMain}`}>
              {selectedProfile.nickname || selectedProfile.username}
            </h3>
            <p className={`text-sm font-medium mt-1 ${theme.muted}`}>
              @{selectedProfile.username}
            </p>
            
            {selectedProfile.subject && (
              <p className="mt-3 inline-flex bg-blue-500/10 px-3 py-1 rounded text-xs text-blue-500 font-semibold">
                {selectedProfile.subject}
              </p>
            )}
            
            {selectedProfile.bio && (
              <div className={`mt-4 w-full p-3 rounded border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-800/30 border-gray-700/50'}`}>
                <p className={`text-sm leading-relaxed italic border-l-2 border-blue-500/50 pl-3 text-left ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                  "{selectedProfile.bio}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
