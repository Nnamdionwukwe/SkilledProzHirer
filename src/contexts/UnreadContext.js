// src/contexts/UnreadContext.js
//
// Shared unread counts for the TopBar bell / messages icons.
//
// Previously lived inside WorkerNavigator.js, which meant Hirer-app screens
// (which never mounted WorkerNavigator) got the default context values of 0
// — no badges ever rendered. Moving the provider to its own file also
// removes the circular import cycle (TopBar → WorkerNavigator → TopBar).

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuthStore } from "../store/authStore";
import { getNotifications } from "../api/notifications";
import { getConversations } from "../api/messages";

const UnreadContext = createContext({
  unreadNotifs: 0,
  unreadMessages: 0,
  refresh: () => {},
});

export function UnreadProvider({ children }) {
  const { user } = useAuthStore();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [notifData, convos] = await Promise.all([
        getNotifications({ page: 1, limit: 1 }),
        getConversations(),
      ]);
      if (cancelledRef.current) return;
      setUnreadNotifs(Number(notifData?.unreadCount ?? 0));
      setUnreadMessages(
        convos.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0),
      );
    } catch (e) {
      // Swallow — badges stay at the last known value.
    }
  }, [user?.id]);

  useEffect(() => {
    cancelledRef.current = false;
    if (!user?.id) {
      setUnreadNotifs(0);
      setUnreadMessages(0);
      return;
    }
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [user?.id, refresh]);

  return (
    <UnreadContext.Provider value={{ unreadNotifs, unreadMessages, refresh }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
