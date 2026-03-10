"use client";

import { useState, useCallback, useEffect } from "react";
import PostEditorModal, {
  type PostData,
  createBlankPost,
  postToEditorData,
} from "./editor/PostEditorModal";
import AssetsManager, { type AssetData } from "./AssetsManager";

type LinkItem = {
  id: number;
  label: string;
  url: string;
  display_order: number;
};

type PostItem = {
  slug: string;
  title: string;
  excerpt: string;
  createdAt: number; // Unix timestamp in milliseconds
  published: boolean;
  tags: string[];
  cover?: string;
  readingTime?: number;
};

type AdminDashboardProps = {
  initialPosts: PostItem[];
  adminUsername: string;
  initialLinks: LinkItem[];
  initialAssets: AssetData[];
};

function formatTimestamp(timestamp: number) {
  try {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString();
  }
}

function postStatusLabel(published: boolean) {
  return published ? "Published" : "Draft";
}

export default function AdminDashboard({
  initialPosts,
  adminUsername,
  initialLinks,
  initialAssets,
}: AdminDashboardProps) {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState<PostData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Links state
  const [links, setLinks] = useState<LinkItem[]>(initialLinks);
  const [linkForm, setLinkForm] = useState({ label: "", url: "" });
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [editLinkForm, setEditLinkForm] = useState({ label: "", url: "" });
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");

  const sortedPosts = [...posts].sort((a, b) => b.createdAt - a.createdAt);

  const filteredPosts = sortedPosts.filter((post) => {
    const matchesSearch =
      !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "published" && post.published) ||
      (filterStatus === "draft" && !post.published);

    return matchesSearch && matchesStatus;
  });

  const publishedCount = posts.filter((p) => p.published).length;
  const draftCount = posts.filter((p) => !p.published).length;

  const openNewPost = useCallback(() => {
    setCurrentPost(createBlankPost());
    setIsEditorOpen(true);
    setStatusMessage("");
  }, []);

  const openExistingPost = useCallback(async (slug: string) => {
    setStatusMessage("Loading post...");

    try {
      const response = await fetch(`/api/admin/posts/${slug}`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load post.");
      }

      if (!data.post) {
        throw new Error("Post data not found.");
      }

      setCurrentPost(postToEditorData(data.post));
      setIsEditorOpen(true);
      setStatusMessage("");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to load post.");
    }
  }, []);

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    setCurrentPost(null);
  }, []);

  const handleSavePost = useCallback(async (post: PostData) => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/posts", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalSlug: post.originalSlug,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          createdAt: post.createdAt,
          published: post.published,
          tags: post.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          cover: post.cover,
          readingTime: post.readingTime,
          content: post.content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save post.");
      }

      setPosts((current) => {
        const filtered = current.filter(
          (item) => item.slug !== post.originalSlug && item.slug !== data.slug,
        );
        return [data.post, ...filtered];
      });

      setCurrentPost((prev) =>
        prev
          ? {
              ...prev,
              originalSlug: data.slug,
              slug: data.slug,
            }
          : null,
      );

      setStatusMessage(`Saved "${data.post.title}".`);
    } catch (err) {
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleDeletePost = useCallback(
    async (slug: string) => {
      setIsDeleting(true);

      try {
        const response = await fetch(`/api/admin/posts/${slug}`, {
          method: "DELETE",
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to delete post.");
        }

        setPosts((current) => current.filter((p) => p.slug !== slug));
        closeEditor();
        setStatusMessage(data.message || "Post deleted.");
      } catch (err) {
        throw err;
      } finally {
        setIsDeleting(false);
      }
    },
    [closeEditor],
  );

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        window.location.href = "/admin";
      } else {
        setStatusMessage("Logout failed.");
      }
    } catch {
      setStatusMessage("Logout failed.");
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  const handleUpdatePassword = useCallback(async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatusMessage("New passwords do not match.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setStatusMessage("Password must be at least 8 characters.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const response = await fetch("/api/admin/password", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setStatusMessage("Password updated successfully.");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  }, [passwordForm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEditorOpen) {
        closeEditor();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditorOpen, closeEditor]);

  const handleAddLink = useCallback(async () => {
    const label = linkForm.label.trim();
    const url = linkForm.url.trim();
    if (!label || !url) {
      setLinkError("Both label and URL are required.");
      return;
    }
    setIsSavingLink(true);
    setLinkError("");
    try {
      const res = await fetch("/api/admin/links", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add link.");
      setLinks((prev) => [...prev, data.link]);
      setLinkForm({ label: "", url: "" });
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Failed to add link.");
    } finally {
      setIsSavingLink(false);
    }
  }, [linkForm]);

  const handleUpdateLink = useCallback(async () => {
    if (!editingLink) return;
    const label = editLinkForm.label.trim();
    const url = editLinkForm.url.trim();
    if (!label || !url) {
      setLinkError("Both label and URL are required.");
      return;
    }
    setIsSavingLink(true);
    setLinkError("");
    try {
      const res = await fetch("/api/admin/links", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingLink.id, label, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update link.");
      setLinks((prev) => prev.map((l) => (l.id === editingLink.id ? data.link : l)));
      setEditingLink(null);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Failed to update link.");
    } finally {
      setIsSavingLink(false);
    }
  }, [editingLink, editLinkForm]);

  const handleDeleteLink = useCallback(
    async (id: number) => {
      try {
        const res = await fetch("/api/admin/links", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error);
        }
        setLinks((prev) => prev.filter((l) => l.id !== id));
        if (editingLink?.id === id) setEditingLink(null);
      } catch (err) {
        setLinkError(err instanceof Error ? err.message : "Failed to delete link.");
      }
    },
    [editingLink],
  );

  const handleMoveLink = useCallback(
    async (id: number, direction: "up" | "down") => {
      const sorted = [...links].sort((a, b) => a.display_order - b.display_order);
      const idx = sorted.findIndex((l) => l.id === id);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const newOrder = sorted.map((l) => l.id);
      [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
      try {
        const res = await fetch("/api/admin/links", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newOrder }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setLinks(data.links);
      } catch (err) {
        setLinkError(err instanceof Error ? err.message : "Failed to reorder links.");
      }
    },
    [links],
  );

  return (
    <div className="min-h-screen bg-[#080b10] text-[#f5f7fa]">
      <header className="border-b border-[#202632] bg-[#0a0d12]">
        <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#7d8a99]">
                  Numbered Dev
                </p>
                <h1 className="text-xl font-semibold tracking-tight text-white">Admin Dashboard</h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-[#607080]">
                Signed in as <span className="text-[#c7d0db]">{adminUsername}</span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="border border-[#3a4758] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c7d0db] transition hover:bg-[#151c25] disabled:opacity-50"
              >
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">Posts</h2>
                <p className="mt-1 text-sm text-[#8fa1b3]">
                  {posts.length} total · {publishedCount} published · {draftCount} drafts
                </p>
              </div>

              <button
                type="button"
                onClick={openNewPost}
                className="shrink-0 border border-[#3a4758] bg-[#f5f7fa] px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0a0d12] transition hover:bg-[#dfe6ee]"
              >
                + New Post
              </button>
            </div>

            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts..."
                className="flex-1 border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
              />

              <div className="flex border border-[#202632]">
                {(["all", "published", "draft"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(status)}
                    className={[
                      "px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                      filterStatus === status
                        ? "bg-[#f5f7fa] text-[#0a0d12]"
                        : "text-[#c7d0db] hover:bg-[#151c25]",
                    ].join(" ")}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {statusMessage && (
              <div className="mb-5 border border-[#202632] bg-[#0b0f14] px-4 py-3">
                <p className="text-sm text-[#9fb0bf]">{statusMessage}</p>
              </div>
            )}

            <div className="space-y-3 mb-4">
              {filteredPosts.length === 0 ? (
                <div className="border border-[#202632] bg-[#0b0f14] p-8 text-center">
                  <p className="text-sm text-[#8fa1b3]">
                    {posts.length === 0
                      ? "No posts yet. Create your first article."
                      : "No posts match your search."}
                  </p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <button
                    key={post.slug}
                    type="button"
                    onClick={() => openExistingPost(post.slug)}
                    className="group block w-full border border-[#202632] bg-[#0b0f14] p-5 text-left transition hover:border-[#3a4758] hover:bg-[#0f141b]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-[#f5f7fa] group-hover:text-white truncate">
                          {post.title}
                        </h3>
                        <p className="mt-2 text-sm text-[#8fa1b3] line-clamp-2 leading-relaxed">
                          {post.excerpt}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#607080]">
                          <span>{formatTimestamp(post.createdAt)}</span>
                          <span>·</span>
                          <span className="text-[#7dd3fc]">/blog/{post.slug}</span>
                          {post.tags.length > 0 && (
                            <>
                              <span>·</span>
                              <span>{post.tags.slice(0, 3).join(", ")}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <span
                        className={[
                          "shrink-0 border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]",
                          post.published
                            ? "border-[#294b36] text-[#92d0a6]"
                            : "border-[#4d3c1a] text-[#d4b16a]",
                        ].join(" ")}
                      >
                        {postStatusLabel(post.published)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* ── Assets Manager ── */}
            <AssetsManager initialAssets={initialAssets} />
          </div>

          <aside className="space-y-6">
            {/* ── Links / Linktree ── */}
            <div className="border border-[#202632] bg-[#0b0f14]">
              <div className="border-b border-[#202632] px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8a99]">
                  Homepage Links
                </p>
              </div>

              <div className="p-5 space-y-4">
                {/* Existing links */}
                {links.length === 0 ? (
                  <p className="text-sm text-[#607080]">No links yet. Add one below.</p>
                ) : (
                  <div className="space-y-2">
                    {[...links]
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((link, idx, arr) => (
                        <div key={link.id}>
                          {editingLink?.id === link.id ? (
                            <div className="border border-[#3a4758] bg-[#0f141b] p-3 space-y-2">
                              <input
                                type="text"
                                value={editLinkForm.label}
                                onChange={(e) =>
                                  setEditLinkForm((p) => ({ ...p, label: e.target.value }))
                                }
                                placeholder="Label"
                                className="w-full border border-[#202632] bg-[#0a0d12] px-3 py-2 text-sm text-white outline-none placeholder:text-[#506172] focus:border-[#5b9fd6]"
                              />
                              <input
                                type="url"
                                value={editLinkForm.url}
                                onChange={(e) =>
                                  setEditLinkForm((p) => ({ ...p, url: e.target.value }))
                                }
                                placeholder="https://..."
                                className="w-full border border-[#202632] bg-[#0a0d12] px-3 py-2 text-sm text-white outline-none placeholder:text-[#506172] focus:border-[#5b9fd6]"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleUpdateLink}
                                  disabled={isSavingLink}
                                  className="flex-1 border border-[#3a4758] bg-[#f5f7fa] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0a0d12] transition hover:bg-[#dfe6ee] disabled:opacity-50"
                                >
                                  {isSavingLink ? "Saving…" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLink(null);
                                    setLinkError("");
                                  }}
                                  className="border border-[#202632] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa1b3] transition hover:bg-[#151c25]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 border border-[#202632] bg-[#0a0d12] px-3 py-2">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleMoveLink(link.id, "up")}
                                  disabled={idx === 0}
                                  className="text-[#506172] leading-none hover:text-[#c7d0db] disabled:opacity-25"
                                  aria-label="Move up"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveLink(link.id, "down")}
                                  disabled={idx === arr.length - 1}
                                  className="text-[#506172] leading-none hover:text-[#c7d0db] disabled:opacity-25"
                                  aria-label="Move down"
                                >
                                  ▼
                                </button>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#f5f7fa] truncate">
                                  {link.label}
                                </p>
                                <p className="text-[11px] text-[#506172] truncate">{link.url}</p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLink(link);
                                    setEditLinkForm({ label: link.label, url: link.url });
                                    setLinkError("");
                                  }}
                                  className="border border-[#202632] px-2 py-1 text-[10px] text-[#8fa1b3] transition hover:bg-[#151c25] hover:text-white"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLink(link.id)}
                                  className="border border-[#202632] px-2 py-1 text-[10px] text-[#8fa1b3] transition hover:border-[#7f3030] hover:text-[#fca5a5]"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {/* Add new link */}
                <div className="space-y-2 pt-1 border-t border-[#202632]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#506172] pt-3">
                    Add Link
                  </p>
                  <input
                    type="text"
                    value={linkForm.label}
                    onChange={(e) => setLinkForm((p) => ({ ...p, label: e.target.value }))}
                    placeholder="Label (e.g. GitHub)"
                    className="w-full border border-[#202632] bg-[#0f141b] px-3 py-2 text-sm text-white outline-none placeholder:text-[#506172] focus:border-[#5b9fd6]"
                  />
                  <input
                    type="url"
                    value={linkForm.url}
                    onChange={(e) => setLinkForm((p) => ({ ...p, url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-[#202632] bg-[#0f141b] px-3 py-2 text-sm text-white outline-none placeholder:text-[#506172] focus:border-[#5b9fd6]"
                  />
                  {linkError && <p className="text-xs text-[#fca5a5]">{linkError}</p>}
                  <button
                    type="button"
                    onClick={handleAddLink}
                    disabled={isSavingLink}
                    className="w-full border border-[#3a4758] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f5f7fa] transition hover:bg-[#151c25] disabled:opacity-50"
                  >
                    {isSavingLink ? "Adding…" : "+ Add Link"}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Quick Stats ── */}
            <div className="border border-[#202632] bg-[#0b0f14]">
              <div className="border-b border-[#202632] px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8a99]">
                  Quick Stats
                </p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-[#202632]">
                <div className="bg-[#0b0f14] p-4 text-center">
                  <p className="text-3xl font-bold text-white">{publishedCount}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#607080]">
                    Published
                  </p>
                </div>
                <div className="bg-[#0b0f14] p-4 text-center">
                  <p className="text-3xl font-bold text-white">{draftCount}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#607080]">
                    Drafts
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-[#202632] bg-[#0b0f14]">
              <div className="border-b border-[#202632] px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8a99]">
                  Change Password
                </p>
              </div>

              <div className="p-5 space-y-3">
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  placeholder="Current password"
                  className="w-full border border-[#202632] bg-[#0f141b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                />
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  placeholder="New password"
                  className="w-full border border-[#202632] bg-[#0f141b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                />
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  placeholder="Confirm new password"
                  className="w-full border border-[#202632] bg-[#0f141b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                />
                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword}
                  className="w-full border border-[#3a4758] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#f5f7fa] transition hover:bg-[#151c25] disabled:opacity-50"
                >
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {currentPost && (
        <PostEditorModal
          key={currentPost.originalSlug || "new"}
          isOpen={isEditorOpen}
          post={currentPost}
          onCloseAction={closeEditor}
          onSaveAction={handleSavePost}
          onDeleteAction={handleDeletePost}
          isSaving={isSaving}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
