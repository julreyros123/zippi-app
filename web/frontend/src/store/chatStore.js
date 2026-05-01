import { create } from 'zustand';

const useChatStore = create((set) => ({
  channels: [],
  messages: [],
  activeChannel: null,
  activeUsers: [],
  unreadCounts: {},

  setChannels: (channels) => set((state) => {
    // When channels change, clean up unreadCounts for deleted channels
    const channelIds = new Set(channels.map(c => c.id));
    const newUnreadCounts = {};

    // Only keep unread counts for channels that still exist
    Object.entries(state.unreadCounts).forEach(([channelId, count]) => {
      if (channelIds.has(channelId)) {
        newUnreadCounts[channelId] = count;
      }
    });

    return { channels, unreadCounts: newUnreadCounts };
  }),
  setActiveChannel: (channelId) => set({ activeChannel: channelId }),

  incrementUnread: (channelId) => set((state) => ({
    unreadCounts: { ...state.unreadCounts, [channelId]: (state.unreadCounts[channelId] || 0) + 1 }
  })),
  clearUnread: (channelId) => set((state) => ({
    unreadCounts: { ...state.unreadCounts, [channelId]: 0 }
  })),

  setMessages: (updater) => set((state) => ({
    messages: typeof updater === 'function' ? updater(state.messages) : updater
  })),
  addMessage: (message) => set((state) => {
    // Dedup guard: don't add if a message with same ID already exists
    if (message.id && state.messages.some(m => m.id === message.id)) {
      return state;
    }
    return { messages: [...state.messages, message] };
  }),
  replaceMessage: (oldId, newMsg) => set((state) => ({
    messages: state.messages.map(m => m.id === oldId ? newMsg : m)
  })),
  removeMessage: (messageId) => set((state) => ({
    messages: state.messages.filter(m => m.id !== messageId)
  })),

  setActiveUsers: (users) => set({ activeUsers: users }),
  addActiveUser: (userId) => set((state) => ({
    activeUsers: [...new Set([...state.activeUsers, userId])]
  })),
  removeActiveUser: (userId) => set((state) => ({
    activeUsers: state.activeUsers.filter(id => id !== userId)
  })),
}));

export default useChatStore;
