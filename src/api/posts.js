// src/api/posts.js
import client from "./client";

// ── Feed ──────────────────────────────────────────────────────────────────────
// GET /posts/feed?page=1&limit=20&type=GENERAL
export const getFeed = (params = {}) =>
  client.get("/posts/feed", { params }).then((r) => r.data.data);

// ── My posts ──────────────────────────────────────────────────────────────────
export const getMyPosts = (params = {}) =>
  client.get("/posts/my", { params }).then((r) => r.data.data);

// ── User posts ────────────────────────────────────────────────────────────────
export const getUserPosts = (userId, params = {}) =>
  client.get(`/posts/user/${userId}`, { params }).then((r) => r.data.data);

// ── Single post ───────────────────────────────────────────────────────────────
export const getPost = (postId) =>
  client.get(`/posts/${postId}`).then((r) => r.data.data.post);

// ── Create post (multipart FormData for image support) ────────────────────────
export const createPost = (payload) => {
  // payload: { content, type?, isPublic?, images?: [{ uri, name, type }] }
  const form = new FormData();
  form.append("content", payload.content);
  form.append("type", payload.type ?? "GENERAL");
  form.append("isPublic", payload.isPublic ?? true);

  (payload.images ?? []).forEach((img, i) => {
    form.append("images", {
      uri: img.uri,
      name: img.name ?? `photo_${i}.jpg`,
      type: img.type ?? "image/jpeg",
    });
  });

  return client
    .post("/posts", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data.data.post);
};

// ── Update post ───────────────────────────────────────────────────────────────
export const updatePost = (postId, payload) =>
  client.put(`/posts/${postId}`, payload).then((r) => r.data.data.post);

// ── Delete post ───────────────────────────────────────────────────────────────
export const deletePost = (postId) =>
  client.delete(`/posts/${postId}`).then((r) => r.data);

// ── Repost ────────────────────────────────────────────────────────────────────
export const repost = (postId, content = "") =>
  client
    .post(`/posts/${postId}/repost`, { content })
    .then((r) => r.data.data.post);

// ── React ─────────────────────────────────────────────────────────────────────
// type: LIKE | LOVE | INSIGHTFUL | CELEBRATE | SUPPORT
export const reactToPost = (postId, type = "LIKE") =>
  client.post(`/posts/${postId}/react`, { type }).then((r) => r.data);

// ── Comments ──────────────────────────────────────────────────────────────────
export const getComments = (postId, params = {}) =>
  client.get(`/posts/${postId}/comments`, { params }).then((r) => r.data.data);

export const addComment = (postId, content, parentId = null) =>
  client
    .post(`/posts/${postId}/comments`, { content, parentId })
    .then((r) => r.data.data.comment);

export const deleteComment = (commentId) =>
  client.delete(`/posts/comments/${commentId}`).then((r) => r.data);
