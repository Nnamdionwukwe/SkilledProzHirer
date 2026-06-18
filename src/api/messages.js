// src/api/messages.js
import client from "./client";

// GET /messages/conversations
export const getConversations = () =>
  client
    .get("/messages/conversations")
    .then((r) => r.data.data.conversations ?? []);

// GET /messages/:conversationId?page=1&limit=50
export const getMessages = (conversationId, params = {}) =>
  client
    .get(`/messages/${conversationId}`, { params })
    .then((r) => r.data.data.messages ?? []);

// POST /messages  (text or file)
export const sendMessage = (payload) => {
  const isFile = !!payload.file;
  if (isFile) {
    const form = new FormData();
    form.append("receiverId", payload.receiverId);
    if (payload.conversationId)
      form.append("conversationId", payload.conversationId);
    if (payload.content) form.append("content", payload.content);
    form.append("file", {
      uri: payload.file.uri,
      name: payload.file.name ?? "attachment",
      type: payload.file.mimeType ?? "application/octet-stream",
    });
    return client
      .post("/messages", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.data);
  }
  return client
    .post("/messages", {
      receiverId: payload.receiverId,
      content: payload.content,
      conversationId: payload.conversationId ?? null,
    })
    .then((r) => r.data.data);
};

// PATCH /messages/:conversationId/read
export const markConversationRead = (conversationId) =>
  client.patch(`/messages/${conversationId}/read`).then((r) => r.data);
