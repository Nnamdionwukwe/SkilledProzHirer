// src/store/supportStore.js
//
// Single source of truth for "how many support items need my attention?".
//
// Counts:
//   unreadTickets → tickets with status OPEN or IN_REVIEW (needs your action)
//   unreadChats   → live chat threads the user hasn't read
//   unreadCount   → unreadTickets + unreadChats (this is what the drawer
//                    badges read, and matches the website's supportStore API)
//
// Both endpoints are called on refresh(); if either 404s or throws, we
// silently fall back to 0 so the drawer never crashes.

import { create } from "zustand";
import { getMyTickets, getMyChats } from "../api/support";

// Ticket statuses that count as "needs attention". Adjust if your backend
// uses different names (e.g. "PENDING", "NEW").
const OPEN_TICKET_STATUSES = new Set(["OPEN", "IN_REVIEW", "REVIEW"]);

// Reduce a list of tickets to the count of ones needing action.
function countTickets(tickets) {
  if (!Array.isArray(tickets)) return 0;
  return tickets.filter((tk) => {
    const status = String(tk?.status ?? "").toUpperCase();
    if (!OPEN_TICKET_STATUSES.has(status)) return false;
    // If the backend marks per-user unread, respect it
    if (typeof tk?.unreadForUser === "boolean") return tk.unreadForUser;
    if (typeof tk?.unreadCount === "number") return tk.unreadCount > 0;
    // Otherwise assume any OPEN ticket is unread for the user
    return true;
  }).length;
}

// Reduce a list of chat threads to the count with unread messages.
function countChats(chats) {
  if (!Array.isArray(chats)) return 0;
  return chats.filter((ch) => {
    if (typeof ch?.unreadForUser === "boolean") return ch.unreadForUser;
    if (typeof ch?.unreadCount === "number") return ch.unreadCount > 0;
    // Chat thread shape: if lastMessage.author !== currentUser, treat as unread
    // — but we can't know the current user id here, so just count OPEN chats.
    const status = String(ch?.status ?? "").toUpperCase();
    return status === "ACTIVE" || status === "OPEN";
  }).length;
}

export const useSupportStore = create((set, get) => ({
  unreadTickets: 0,
  unreadChats: 0,
  unreadCount: 0,
  loading: false,
  lastFetchedAt: null,

  refresh: async () => {
    set({ loading: true });

    // Both endpoints hit in parallel; a failure on one doesn't block the other.
    const [ticketsRes, chatsRes] = await Promise.allSettled([
      getMyTickets(),
      getMyChats(),
    ]);

    const tickets =
      ticketsRes.status === "fulfilled"
        ? (ticketsRes.value?.tickets ?? ticketsRes.value ?? [])
        : [];
    const chats =
      chatsRes.status === "fulfilled"
        ? (chatsRes.value?.chats ?? chatsRes.value ?? [])
        : [];

    const unreadTickets = countTickets(tickets);
    const unreadChats = countChats(chats);

    set({
      unreadTickets,
      unreadChats,
      unreadCount: unreadTickets + unreadChats,
      loading: false,
      lastFetchedAt: Date.now(),
    });

    return {
      unreadTickets,
      unreadChats,
      unreadCount: unreadTickets + unreadChats,
    };
  },

  // Optimistic "clear badge" after opening a support screen. Use this from
  // SupportChat / SupportHub when you know the user just read everything.
  clearTickets: () => {
    const { unreadChats } = get();
    set({ unreadTickets: 0, unreadCount: unreadChats });
  },
  clearChats: () => {
    const { unreadTickets } = get();
    set({ unreadChats: 0, unreadCount: unreadTickets });
  },
  clearAll: () => set({ unreadTickets: 0, unreadChats: 0, unreadCount: 0 }),
}));
