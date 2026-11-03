// src/store/supportStore.js
import { create } from "zustand";
import { getMyChats } from "../api/support";

export const useSupportStore = create((set) => ({
  unreadCount: 0,
  loading: false,

  setUnreadCount: (count) =>
    set({ unreadCount: Math.max(0, Number(count) || 0) }),

  incrementUnread: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),

  clearUnread: () => set({ unreadCount: 0 }),

  // Fetch unread count from /support/chat/my (matches web supportStore)
  refresh: async () => {
    set({ loading: true });
    try {
      const data = await getMyChats();
      const chats = data?.chats ?? data?.conversations ?? data ?? [];
      const unread = Array.isArray(chats)
        ? chats.reduce(
            (sum, ch) =>
              sum + (typeof ch?.unreadCount === "number" ? ch.unreadCount : 0),
            0,
          )
        : 0;
      set({ unreadCount: unread, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
