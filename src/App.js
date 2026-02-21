import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import "./App.css";

/* ══════════════════════════════════════════════════════════
   CONFIG  — change this to your backend URL when deployed
══════════════════════════════════════════════════════════ */
const SERVER = "https://gochat-6ib7.onrender.com";

/* ══════════════════════════════════════════════════════════
   API HELPER
══════════════════════════════════════════════════════════ */
const api = async (path, method = "GET", body = null) => {
  const token = localStorage.getItem("gc_token");
  const res = await fetch(`${SERVER}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

/* ══════════════════════════════════════════════════════════
   SOCKET SINGLETON
══════════════════════════════════════════════════════════ */
let socketInstance = null;
const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SERVER, { autoConnect: false });
  }
  return socketInstance;
};

const formatTime = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString();
};

const getInitials = (name = "") =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const COLORS = ["#6C63FF","#FF6B9D","#00C9A7","#FF9F43","#1e88e5","#A29BFE","#FD79A8","#48DBFB"];
const getColor = (id = "") => COLORS[id.charCodeAt(id.length - 1) % COLORS.length];

const EMOJIS = ["😀","😂","❤️","👍","🔥","🎉","😍","🤔","👏","💯","😢","🙏","✨","🚀","💪","🎊","😎","🤩","💖","🌟"];
const REACTIONS = ["👍","❤️","😂","😮","😢","🙏"];

/* ══════════════════════════════════════════════════════════
   SMALL COMPONENTS
══════════════════════════════════════════════════════════ */
function Avatar({ user, size = 44, showOnline = true, onlineIds = [] }) {
  const name = user?.name || "?";
  const color = getColor(user?._id || user?.id || name);
  const isOnline = onlineIds.includes(user?._id || user?.id);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(135deg, ${color}, ${color}bb)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.36, fontWeight: 700, color: "#fff",
        boxShadow: `0 2px 10px ${color}44`, flexShrink: 0,
      }}>
        {getInitials(name)}
      </div>
      {showOnline && isOnline && (
        <div style={{
          position: "absolute", bottom: 1, right: 1,
          width: size * 0.27, height: size * 0.27, borderRadius: "50%",
          background: "#00C9A7", border: "2px solid var(--bg-primary)",
        }} />
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AUTH SCREEN
══════════════════════════════════════════════════════════ */
function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState("login"); // login | register
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
      const body = tab === "login"
        ? { phone: form.phone, password: form.password }
        : { name: form.name, phone: form.phone, password: form.password };
      const data = await api(endpoint, "POST", body);
      localStorage.setItem("gc_token", data.token);
      localStorage.setItem("gc_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inp = (field) => ({
    value: form[field],
    onChange: (e) => setForm((p) => ({ ...p, [field]: e.target.value })),
    style: {
      width: "100%", padding: "13px 16px", borderRadius: 12,
      background: "var(--bg-tertiary)", border: "1.5px solid var(--border)",
      color: "var(--text-primary)", fontSize: 15, fontFamily: "'Sora', sans-serif",
      outline: "none", transition: "border 0.2s",
    },
  });

  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse at 30% 20%, #1e88e520 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, #00C9A720 0%, transparent 50%), var(--bg-primary)",
    }}>
      <div style={{
        width: "min(420px, 94vw)", background: "var(--bg-secondary)",
        borderRadius: 28, padding: "40px 36px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        border: "1px solid var(--border)", animation: "slideIn 0.4s ease",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: "linear-gradient(135deg, #1e88e5, #00C9A7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 34, margin: "0 auto 14px", boxShadow: "0 8px 32px #1e88e540",
          }}>💬</div>
          <div style={{ fontWeight: 800, fontSize: 28, letterSpacing: -1 }}>GoChat</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
            Real-time messaging for everyone
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "var(--bg-tertiary)", borderRadius: 14, padding: 4, marginBottom: 28 }}>
          {["login", "register"].map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(""); }} style={{
              flex: 1, padding: "10px", borderRadius: 11, fontWeight: 700,
              fontSize: 14, fontFamily: "'Sora', sans-serif",
              background: tab === t ? "var(--accent)" : "transparent",
              color: tab === t ? "#fff" : "var(--text-secondary)",
              transition: "all 0.2s", textTransform: "capitalize",
              boxShadow: tab === t ? "0 4px 12px #1e88e540" : "none",
            }}>{t === "login" ? "Sign In" : "Create Account"}</button>
          ))}
        </div>

        <form onSubmit={handle} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {tab === "register" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Full Name</label>
              <input {...inp("name")} placeholder="Your full name" required />
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
              📱 Phone Number
            </label>
            <input {...inp("phone")} placeholder="+91 98765 43210" type="tel" required />
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
              Used to find and connect with others
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Password</label>
            <input {...inp("password")} placeholder="••••••••" type="password" required />
          </div>

          {error && (
            <div style={{ background: "#FF596015", border: "1px solid #FF596040", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#FF5960" }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop: 6, padding: "14px", borderRadius: 14, fontWeight: 800,
            fontSize: 15, fontFamily: "'Sora', sans-serif",
            background: loading ? "var(--bg-tertiary)" : "linear-gradient(135deg, #1e88e5, #1565C0)",
            color: loading ? "var(--text-secondary)" : "#fff",
            boxShadow: loading ? "none" : "0 6px 20px #1e88e540",
            transition: "all 0.2s",
          }}>
            {loading ? "Please wait..." : tab === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--text-secondary)" }}>
          🔐 Your messages are end-to-end encrypted
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════ */
export default function App() {
  /* ── Auth ── */
  const [me, setMe] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gc_user")); } catch { return null; }
  });

  /* ── Theme ── */
  const [darkMode, setDarkMode] = useState(true);

  /* ── Chats & Messages ── */
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  /* ── UI State ── */
  const [view, setView] = useState("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState("phone"); // phone | userid
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typing, setTyping] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactions, setShowReactions] = useState(null);
  const [showProfile, setShowProfile] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [pinnedMsg, setPinnedMsg] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeout = useRef(null);
  const socket = useRef(null);

  /* ── CSS Variables ── */
  useEffect(() => {
    const vars = darkMode ? {
      "--bg-primary": "#0a0d14", "--bg-secondary": "#13172a",
      "--bg-tertiary": "#1e2235", "--text-primary": "#eef0f8",
      "--text-secondary": "#7b82a0", "--border": "#252a40",
      "--accent": "#1e88e5", "--online": "#00C9A7",
      "--msg-out": "#1a4a8a", "--msg-in": "#1e2235",
    } : {
      "--bg-primary": "#f0f4fb", "--bg-secondary": "#ffffff",
      "--bg-tertiary": "#f5f7fc", "--text-primary": "#111827",
      "--text-secondary": "#6b7280", "--border": "#e5e7eb",
      "--accent": "#1e88e5", "--online": "#00C9A7",
      "--msg-out": "#dbeafe", "--msg-in": "#ffffff",
    };
    Object.entries(vars).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v)
    );
  }, [darkMode]);

  /* ── Socket setup ── */
  useEffect(() => {
    if (!me) return;
    const s = getSocket();
    socket.current = s;
    s.connect();
    s.emit("user_online", me._id || me.id);

    s.on("online_users", (ids) => setOnlineUsers(ids));

    s.on("receive_message", (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      setChats((prev) => prev.map((c) =>
        c._id === msg.chatId
          ? { ...c, lastMessage: msg, updatedAt: msg.createdAt }
          : c
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
      // notify if not in active chat
      setActiveChat((ac) => {
        if (ac?._id !== msg.chatId) {
          pushNotif("💬 New message", msg.text?.slice(0, 60) || "File received");
        }
        return ac;
      });
    });

    s.on("user_typing", ({ chatId, userId, name }) => {
      if (userId === (me._id || me.id)) return;
      setTyping((p) => ({ ...p, [chatId]: name }));
    });
    s.on("user_stop_typing", ({ chatId }) => {
      setTyping((p) => { const n = { ...p }; delete n[chatId]; return n; });
    });

    return () => {
      s.off("online_users"); s.off("receive_message");
      s.off("user_typing"); s.off("user_stop_typing");
      s.disconnect();
    };
  }, [me]);

  /* ── Load chats ── */
  useEffect(() => {
    if (!me) return;
    api("/chat").then(setChats).catch(console.error);
  }, [me]);

  /* ── Load messages when chat changes ── */
  useEffect(() => {
    if (!activeChat) return;
    setLoadingMsgs(true);
    setMessages([]);
    socket.current?.emit("join_chat", activeChat._id);
    api(`/chat/${activeChat._id}/messages`)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoadingMsgs(false));
  }, [activeChat]);

  /* ── Auto scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Helpers ── */
  const pushNotif = (title, body) => {
    const id = Date.now();
    setNotifications((p) => [...p, { id, title, body }]);
    setTimeout(() => setNotifications((p) => p.filter((n) => n.id !== id)), 5000);
  };

  const getOtherUser = (chat) => {
    if (!chat || !me) return null;
    if (chat.isGroup) return null;
    return chat.members?.find((m) => (m._id || m.id) !== (me._id || me.id));
  };

  const getChatName = (chat) => {
    if (!chat) return "";
    if (chat.isGroup) return chat.name;
    const other = getOtherUser(chat);
    return other?.name || "Unknown";
  };

  /* ── Send Message ── */
  const sendMessage = () => {
    if (!input.trim() || !activeChat || !socket.current) return;
    const payload = {
      chatId: activeChat._id,
      senderId: me._id || me.id,
      senderName: me.name,
      text: input.trim(),
      replyTo: replyTo?._id || null,
    };
    socket.current.emit("send_message", payload);
    setInput(""); setReplyTo(null); setShowEmojiPicker(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    socket.current.emit("stop_typing", { chatId: activeChat._id, userId: me._id || me.id });
  };

  /* ── Typing indicator ── */
  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    if (!socket.current || !activeChat) return;
    socket.current.emit("typing", { chatId: activeChat._id, userId: me._id || me.id, name: me.name });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.current?.emit("stop_typing", { chatId: activeChat._id, userId: me._id || me.id });
    }, 2000);
  };

  /* ── Search users ── */
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const endpoint = searchMode === "phone"
        ? `/auth/search/phone/${encodeURIComponent(searchQuery.trim())}`
        : `/auth/search/userid/${encodeURIComponent(searchQuery.trim())}`;
      const results = await api(endpoint);
      setSearchResults(results);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, [searchQuery, searchMode]);

  useEffect(() => {
    const t = setTimeout(handleSearch, 500);
    return () => clearTimeout(t);
  }, [handleSearch]);

  /* ── Open / start chat ── */
  const openChat = async (userId) => {
    try {
      const chat = await api("/chat/open", "POST", { userId });
      setChats((p) => {
        const exists = p.find((c) => c._id === chat._id);
        return exists ? p : [chat, ...p];
      });
      setActiveChat(chat);
      setView("chats"); setShowSearch(false);
      setSearchQuery(""); setSearchResults([]);
    } catch (err) { pushNotif("❌ Error", err.message); }
  };

  /* ── React to message ── */
  const reactToMessage = async (msgId, emoji) => {
    try {
      await api(`/chat/message/${msgId}/react`, "POST", { emoji });
      setMessages((prev) => prev.map((m) => {
        if (m._id !== msgId) return m;
        const reactions = [...(m.reactions || [])];
        const idx = reactions.findIndex((r) => r.emoji === emoji);
        if (idx > -1) reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1 };
        else reactions.push({ emoji, count: 1 });
        return { ...m, reactions };
      }));
    } catch {}
    setShowReactions(null);
  };

  /* ── Logout ── */
  const logout = () => {
    localStorage.removeItem("gc_token");
    localStorage.removeItem("gc_user");
    socket.current?.disconnect();
    socketInstance = null;
    setMe(null);
  };

  /* ── Auth gate ── */
  if (!me) return <AuthScreen onLogin={(user) => setMe(user)} />;

  const myId = me._id || me.id;
  const activeChatName = getChatName(activeChat);
  const otherUser = activeChat ? getOtherUser(activeChat) : null;
  const isOtherOnline = otherUser && onlineUsers.includes(otherUser._id || otherUser.id);
  const chatTyping = activeChat ? typing[activeChat._id] : null;

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: "var(--bg-primary)", color: "var(--text-primary)",
      fontFamily: "'Sora', sans-serif",
    }}>

      {/* ── Notifications ── */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {notifications.map((n) => (
          <div key={n.id} style={{
            background: "var(--bg-secondary)", border: "1px solid var(--border)",
            borderRadius: 14, padding: "12px 18px", maxWidth: 300,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)", animation: "notifSlide 0.3s ease",
          }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{n.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{n.body}</div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════
          LEFT SIDEBAR
      ════════════════════════════════════════ */}
      <div style={{
        width: 340, minWidth: 340, display: "flex", flexDirection: "column",
        borderRight: "1px solid var(--border)", background: "var(--bg-secondary)",
      }}>

        {/* Sidebar Header */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #1e88e5, #1565C0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", boxShadow: "0 4px 12px #1e88e550" }}>G</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>GoChat</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>@{me.username || me.phone}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setShowSearch(!showSearch)} style={{ width: 34, height: 34, borderRadius: 10, background: showSearch ? "var(--accent)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: showSearch ? "#fff" : "var(--text-secondary)" }}>🔍</button>
              <button onClick={() => setDarkMode(!darkMode)} style={{ width: 34, height: 34, borderRadius: 10, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{darkMode ? "☀️" : "🌙"}</button>
              <button onClick={logout} title="Logout" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🚪</button>
            </div>
          </div>

          {/* Search Panel */}
          {showSearch ? (
            <div>
              {/* Search mode toggle */}
              <div style={{ display: "flex", background: "var(--bg-tertiary)", borderRadius: 12, padding: 3, marginBottom: 10 }}>
                <button onClick={() => { setSearchMode("phone"); setSearchQuery(""); setSearchResults([]); }} style={{ flex: 1, padding: "8px", borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: "'Sora',sans-serif", background: searchMode === "phone" ? "var(--accent)" : "transparent", color: searchMode === "phone" ? "#fff" : "var(--text-secondary)" }}>
                  📱 Phone Number
                </button>
                <button onClick={() => { setSearchMode("userid"); setSearchQuery(""); setSearchResults([]); }} style={{ flex: 1, padding: "8px", borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: "'Sora',sans-serif", background: searchMode === "userid" ? "var(--accent)" : "transparent", color: searchMode === "userid" ? "#fff" : "var(--text-secondary)" }}>
                  🆔 User ID
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-tertiary)", borderRadius: 12, padding: "8px 14px", border: "1.5px solid var(--border)" }}>
                <span style={{ fontSize: 15 }}>{searchMode === "phone" ? "📱" : "🆔"}</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={searchMode === "phone" ? "Enter phone number..." : "Enter @username or ID..."}
                  style={{ flex: 1, fontSize: 13, fontFamily: "'Sora',sans-serif", background: "transparent", border: "none", outline: "none", color: "var(--text-primary)" }}
                  autoFocus
                />
                {searching && <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div style={{ marginTop: 8, background: "var(--bg-tertiary)", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                  {searchResults.map((u) => (
                    <div key={u._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                      onClick={() => openChat(u._id)}
                      onMouseOver={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
                      onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                      <Avatar user={u} size={40} onlineIds={onlineUsers} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{u.username} · {u.phone}</div>
                      </div>
                      <button style={{ background: "var(--accent)", color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, fontFamily: "'Sora',sans-serif" }}>
                        Chat
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery && !searching && searchResults.length === 0 && (
                <div style={{ textAlign: "center", padding: "16px", fontSize: 13, color: "var(--text-secondary)" }}>
                  No user found with this {searchMode === "phone" ? "phone number" : "user ID"}
                </div>
              )}
            </div>
          ) : (
            /* Normal search */
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-tertiary)", borderRadius: 12, padding: "8px 14px" }}>
              <span style={{ color: "var(--text-secondary)" }}>🔍</span>
              <input
                placeholder="Search chats..."
                style={{ flex: 1, fontSize: 14, fontFamily: "'Sora',sans-serif", background: "transparent", border: "none", outline: "none", color: "var(--text-primary)" }}
              />
            </div>
          )}
        </div>

        {/* Nav Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "3px 6px" }}>
          {[
            { id: "chats", icon: "💬", label: "Chats" },
            { id: "online", icon: "🟢", label: "Online" },
            { id: "calls", icon: "📞", label: "Calls" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setView(tab.id)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 10, fontFamily: "'Sora',sans-serif",
              fontSize: 11, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              color: view === tab.id ? "var(--accent)" : "var(--text-secondary)",
              background: view === tab.id ? "#1e88e515" : "transparent",
            }}>
              <span style={{ fontSize: 16 }}>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* Chat List */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* ── CHATS TAB ── */}
          {view === "chats" && (
            <div>
              {chats.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>No chats yet</div>
                  <div style={{ fontSize: 13 }}>Press 🔍 to find people by phone or ID</div>
                </div>
              )}
              {chats.map((chat) => {
                const other = getOtherUser(chat);
                const name = getChatName(chat);
                const lastMsg = chat.lastMessage;
                const isActive = activeChat?._id === chat._id;
                const isOtherOnline2 = other && onlineUsers.includes(other._id);
                return (
                  <div key={chat._id} onClick={() => setActiveChat(chat)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                    borderRadius: 12, margin: "2px 6px", cursor: "pointer",
                    background: isActive ? "#1e88e515" : "transparent",
                    borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                    transition: "all 0.15s",
                  }}
                    onMouseOver={(e) => { if (!isActive) e.currentTarget.style.background = "var(--bg-tertiary)"; }}
                    onMouseOut={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <Avatar user={other || { name, _id: chat._id }} size={46} onlineIds={onlineUsers} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{name}</span>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)", flexShrink: 0 }}>{lastMsg ? formatTime(lastMsg.createdAt) : ""}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                        <div style={{ fontSize: 13, color: typing[chat._id] ? "var(--accent)" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190, fontStyle: typing[chat._id] ? "italic" : "normal" }}>
                          {typing[chat._id] ? `${typing[chat._id]} is typing...` : lastMsg ? (lastMsg.sender?._id === myId || lastMsg.sender === myId ? "You: " : "") + (lastMsg.text || "📎 File") : "Start chatting!"}
                        </div>
                        {isOtherOnline2 && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--online)", flexShrink: 0 }} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ONLINE TAB ── */}
          {view === "online" && (
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>
                🟢 {onlineUsers.length} Online Now
              </div>
              {chats.filter((c) => {
                const other = getOtherUser(c);
                return other && onlineUsers.includes(other._id);
              }).map((c) => {
                const other = getOtherUser(c);
                return (
                  <div key={c._id} onClick={() => setActiveChat(c)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                    <Avatar user={other} size={44} onlineIds={onlineUsers} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{other?.name}</div>
                      <div style={{ fontSize: 12, color: "var(--online)" }}>🟢 Active now</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── CALLS TAB ── */}
          {view === "calls" && (
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>Recent Calls</div>
              {chats.filter((c) => !c.isGroup).slice(0, 6).map((c) => {
                const other = getOtherUser(c);
                return (
                  <div key={c._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <Avatar user={other} size={44} onlineIds={onlineUsers} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{other?.name}</div>
                      <div style={{ fontSize: 12, color: "var(--accent)" }}>📞 Voice call</div>
                    </div>
                    <button style={{ width: 36, height: 36, borderRadius: "50%", background: "#00C9A720", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>📞</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My profile bar at bottom */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar user={me} size={36} showOnline={false} onlineIds={[]} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{me.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>ID: {me.username || (me._id || me.id)?.slice(-8)}</div>
          </div>
          <button onClick={() => setShowProfile(me)} style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👤</button>
        </div>
      </div>

      {/* ════════════════════════════════════════
          MAIN CHAT AREA
      ════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
              background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
            }}>
              <button onClick={() => setActiveChat(null)} style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "var(--text-secondary)" }}>←</button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setShowProfile(otherUser || activeChat)}>
                <Avatar user={otherUser || { name: activeChatName, _id: activeChat._id }} size={42} onlineIds={onlineUsers} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{activeChatName}</div>
                  <div style={{ fontSize: 12, color: chatTyping ? "var(--accent)" : isOtherOnline ? "var(--online)" : "var(--text-secondary)" }}>
                    {chatTyping ? `✏️ ${chatTyping} is typing...` : isOtherOnline ? "🟢 Online now" : otherUser ? `Last seen recently` : `${activeChat.members?.length} members`}
                  </div>
                </div>
              </div>

              <div style={{ flex: 1 }} />
              <button style={{ width: 36, height: 36, borderRadius: 10, background: "#00C9A720", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📞</button>
              <button style={{ width: 36, height: 36, borderRadius: 10, background: "#1e88e520", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📹</button>
              <button style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⋮</button>
            </div>

            {/* Pinned */}
            {pinnedMsg && (
              <div style={{ padding: "7px 20px", background: "#1e88e512", borderBottom: "1px solid #1e88e525", display: "flex", alignItems: "center", gap: 10 }}>
                <span>📌</span>
                <div style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pinnedMsg.text}</div>
                <button onClick={() => setPinnedMsg(null)} style={{ color: "var(--text-secondary)", fontSize: 16 }}>✕</button>
              </div>
            )}

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "16px 20px",
              display: "flex", flexDirection: "column", gap: 4,
              background: darkMode
                ? "radial-gradient(ellipse at 15% 50%, #1e88e508 0%, transparent 50%), var(--bg-primary)"
                : "radial-gradient(ellipse at 15% 50%, #e8f4fd30 0%, transparent 50%), var(--bg-primary)",
            }}>
              {loadingMsgs && <Spinner />}

              {messages.map((msg, idx) => {
                const isMe = (msg.sender?._id || msg.sender) === myId;
                const sender = msg.sender;
                const senderName = typeof sender === "object" ? sender?.name : me.name;
                const showAvatar = !isMe && (idx === 0 || (messages[idx - 1]?.sender?._id || messages[idx - 1]?.sender) !== (msg.sender?._id || msg.sender));
                const showDate = idx === 0 || formatDate(messages[idx - 1]?.createdAt) !== formatDate(msg.createdAt);

                return (
                  <div key={msg._id || idx}>
                    {/* Date separator */}
                    {showDate && (
                      <div style={{ textAlign: "center", margin: "12px 0 8px" }}>
                        <span style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 14px", fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <div className="msg-bubble" style={{
                      display: "flex", alignItems: "flex-end", gap: 8,
                      justifyContent: isMe ? "flex-end" : "flex-start",
                      marginTop: showAvatar ? 10 : 2,
                    }}>
                      {!isMe && (
                        <div style={{ width: 30 }}>
                          {showAvatar && <Avatar user={typeof sender === "object" ? sender : { name: senderName, _id: msg.sender }} size={30} showOnline={false} onlineIds={[]} />}
                        </div>
                      )}

                      <div style={{ maxWidth: "66%", position: "relative" }}>
                        {/* Reply Quote */}
                        {msg.replyTo && (
                          <div style={{ background: isMe ? "#ffffff18" : "var(--bg-tertiary)", borderLeft: "3px solid var(--accent)", borderRadius: "8px 8px 0 0", padding: "5px 10px", fontSize: 12, color: "var(--text-secondary)", marginBottom: 1 }}>
                            {msg.replyTo.text?.slice(0, 80)}
                          </div>
                        )}

                        {/* Bubble */}
                        <div
                          onDoubleClick={() => setShowReactions(msg._id)}
                          onContextMenu={(e) => { e.preventDefault(); setShowReactions(msg._id); }}
                          style={{
                            background: isMe ? "var(--msg-out)" : "var(--msg-in)",
                            borderRadius: isMe ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                            padding: "9px 13px",
                            boxShadow: isMe ? "0 2px 8px #1e88e530" : "0 2px 8px rgba(0,0,0,0.08)",
                            border: isMe ? "none" : "1px solid var(--border)",
                            position: "relative",
                          }}>

                          {activeChat.isGroup && !isMe && showAvatar && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: getColor(msg.sender?._id || ""), marginBottom: 3 }}>{senderName}</div>
                          )}

                          <div style={{ fontSize: 14, lineHeight: 1.55 }}>{msg.text}</div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 }}>
                            <span style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.55)" : "var(--text-secondary)" }}>{formatTime(msg.createdAt)}</span>
                            {isMe && <span style={{ fontSize: 11, color: "#64B5F6" }}>✓✓</span>}
                          </div>
                        </div>

                        {/* Reactions */}
                        {msg.reactions?.length > 0 && (
                          <div style={{ display: "flex", gap: 3, marginTop: 3, justifyContent: isMe ? "flex-end" : "flex-start", flexWrap: "wrap" }}>
                            {msg.reactions.map((r, i) => (
                              <span key={i} onClick={() => reactToMessage(msg._id, r.emoji)} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 20, padding: "1px 7px", fontSize: 12, cursor: "pointer" }}>
                                {r.emoji} {r.count}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Reaction Picker */}
                        {showReactions === msg._id && (
                          <div style={{
                            position: "absolute", bottom: "100%", [isMe ? "right" : "left"]: 0,
                            background: "var(--bg-secondary)", border: "1px solid var(--border)",
                            borderRadius: 16, padding: "6px 10px", display: "flex", gap: 4,
                            boxShadow: "0 8px 32px rgba(0,0,0,0.3)", zIndex: 100, animation: "fadeIn 0.15s ease",
                          }}>
                            {REACTIONS.map((e) => (
                              <button key={e} onClick={() => reactToMessage(msg._id, e)} style={{ fontSize: 20, padding: "3px 4px", borderRadius: 8 }}>{e}</button>
                            ))}
                            <button onClick={() => setReplyTo(msg)} style={{ fontSize: 14, padding: "3px 6px", borderRadius: 8, color: "var(--accent)", fontWeight: 700, fontFamily: "'Sora',sans-serif" }}>↩</button>
                            <button onClick={() => setPinnedMsg(msg)} style={{ fontSize: 14, padding: "3px 4px", borderRadius: 8 }}>📌</button>
                            <button onClick={() => setShowReactions(null)} style={{ fontSize: 13, padding: "3px 5px", borderRadius: 8, color: "var(--text-secondary)" }}>✕</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing dots */}
              {chatTyping && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 4 }}>
                  <Avatar user={otherUser} size={30} showOnline={false} onlineIds={[]} />
                  <div style={{ background: "var(--msg-in)", borderRadius: "4px 18px 18px 18px", padding: "10px 14px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--text-secondary)", animationDelay: `${i*0.15}s` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Banner */}
            {replyTo && (
              <div style={{ padding: "8px 20px", background: "var(--bg-secondary)", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 3, alignSelf: "stretch", background: "var(--accent)", borderRadius: 3 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 2 }}>Replying to {replyTo.sender?.name || "message"}</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.text}</div>
                </div>
                <button onClick={() => setReplyTo(null)} style={{ fontSize: 18, color: "var(--text-secondary)" }}>✕</button>
              </div>
            )}

            {/* Input Bar */}
            <div style={{ padding: "10px 14px", background: "var(--bg-secondary)", borderTop: "1px solid var(--border)", display: "flex", alignItems: "flex-end", gap: 8 }}>
              <button style={{ width: 40, height: 40, borderRadius: 12, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📎</button>

              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 8, background: "var(--bg-tertiary)", borderRadius: 16, padding: "7px 12px", border: "1.5px solid var(--border)", position: "relative" }}>
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ fontSize: 20, flexShrink: 0, marginBottom: 2 }}>😊</button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type a message..."
                  rows={1}
                  style={{ flex: 1, fontSize: 14, resize: "none", maxHeight: 120, lineHeight: 1.5, paddingTop: 1, fontFamily: "'Sora',sans-serif", background: "transparent", border: "none", outline: "none", color: "var(--text-primary)" }}
                />
                {showEmojiPicker && (
                  <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 16, padding: 10, display: "flex", flexWrap: "wrap", gap: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", zIndex: 100, animation: "slideIn 0.2s ease" }}>
                    {EMOJIS.map((e) => (
                      <button key={e} onClick={() => setInput((p) => p + e)} style={{ fontSize: 22, padding: 4, borderRadius: 8 }}>{e}</button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={sendMessage}
                style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: input.trim() ? "linear-gradient(135deg, #1e88e5, #1565C0)" : "var(--bg-tertiary)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                  boxShadow: input.trim() ? "0 4px 16px #1e88e540" : "none",
                  color: input.trim() ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.2s",
                }}
              >{input.trim() ? "➤" : "🎤"}</button>
            </div>
          </>
        ) : (
          /* Welcome */
          <div style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: darkMode ? "radial-gradient(ellipse at center, #13172a 0%, #0a0d14 100%)" : "radial-gradient(ellipse at center, #f0f4ff 0%, #f5f7fb 100%)",
          }}>
            <div style={{ width: 110, height: 110, borderRadius: "50%", background: "linear-gradient(135deg, #1e88e5, #00C9A7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50, marginBottom: 22, boxShadow: "0 8px 40px #1e88e550", animation: "pulse 3s ease infinite" }}>💬</div>
            <div style={{ fontWeight: 800, fontSize: 30, letterSpacing: -1, marginBottom: 8 }}>Welcome, {me.name.split(" ")[0]}!</div>
            <div style={{ fontSize: 15, color: "var(--text-secondary)", textAlign: "center", maxWidth: 300, lineHeight: 1.6, marginBottom: 28 }}>
              Select a chat or find someone new to start messaging
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setShowSearch(true)} style={{ background: "linear-gradient(135deg, #1e88e5, #1565C0)", color: "#fff", borderRadius: 14, padding: "12px 24px", fontWeight: 700, fontSize: 14, fontFamily: "'Sora',sans-serif", boxShadow: "0 6px 20px #1e88e540" }}>
                📱 Find by Phone
              </button>
              <button onClick={() => { setSearchMode("userid"); setShowSearch(true); }} style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", borderRadius: 14, padding: "12px 24px", fontWeight: 700, fontSize: 14, fontFamily: "'Sora',sans-serif", border: "1px solid var(--border)" }}>
                🆔 Find by ID
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Profile Modal ── */}
      {showProfile && (
        <div onClick={() => setShowProfile(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, animation: "fadeIn 0.2s ease" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-secondary)", borderRadius: 24, width: "min(380px, 92vw)", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.5)", animation: "slideIn 0.3s ease" }}>
            <div style={{ height: 130, background: `linear-gradient(135deg, ${getColor(showProfile._id || showProfile.id || "")}, #1e88e5)`, position: "relative" }}>
              <button onClick={() => setShowProfile(null)} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              <div style={{ position: "absolute", bottom: -30, left: 20 }}>
                <Avatar user={showProfile} size={70} showOnline={showProfile._id !== myId} onlineIds={onlineUsers} />
              </div>
            </div>
            <div style={{ padding: "42px 22px 22px" }}>
              <div style={{ fontWeight: 800, fontSize: 22 }}>{showProfile.name}</div>
              <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, marginTop: 2 }}>{showProfile.username}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>📱 {showProfile.phone}</div>
              {showProfile.bio && <div style={{ marginTop: 10, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{showProfile.bio}</div>}
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-tertiary)", borderRadius: 8, padding: "6px 10px", fontFamily: "monospace" }}>
                🆔 ID: {(showProfile._id || showProfile.id || "").slice(-12)}
              </div>
              {showProfile._id !== myId && (
                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button onClick={() => { openChat(showProfile._id); setShowProfile(null); }} style={{ flex: 1, background: "linear-gradient(135deg, #1e88e5, #1565C0)", color: "#fff", borderRadius: 14, padding: 12, fontWeight: 700, fontSize: 14, fontFamily: "'Sora',sans-serif", boxShadow: "0 4px 16px #1e88e540" }}>💬 Message</button>
                  <button style={{ width: 48, height: 48, borderRadius: 14, background: "#00C9A720", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>📞</button>
                </div>
              )}
              {showProfile._id === myId && (
                <button onClick={logout} style={{ width: "100%", marginTop: 16, background: "#FF596015", color: "#FF5960", borderRadius: 14, padding: 12, fontWeight: 700, fontSize: 14, fontFamily: "'Sora',sans-serif", border: "1px solid #FF596030" }}>🚪 Sign Out</button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );

}
