import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Phone, Globe, MapPin, Youtube, MessageSquare, ShieldCheck, Ticket, Calendar,
  Users, ShoppingCart, HelpCircle, ChevronRight, X, Heart, Menu, Trash2,
  Lock, ArrowRight, Instagram, Facebook, Sparkles, Image as ImageIcon, Upload
} from "lucide-react";
import { AdminSettings, Feedback } from "./types";
import TicketBookingModal from "./components/TicketBookingModal";
import AdminPanel from "./components/AdminPanel";

function FlyingBats() {
  const bats = [
    { id: 1, delay: 0, duration: 18, startY: 15, scale: 0.5 },
    { id: 2, delay: 4, duration: 22, startY: 35, scale: 0.4 },
    { id: 3, delay: 8, duration: 20, startY: 55, scale: 0.6 },
    { id: 4, delay: 2, duration: 25, startY: 75, scale: 0.45 },
    { id: 5, delay: 12, duration: 16, startY: 25, scale: 0.55 },
    { id: 6, delay: 6, duration: 24, startY: 65, scale: 0.35 },
    { id: 7, delay: 10, duration: 19, startY: 85, scale: 0.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {bats.map((bat) => {
        const yStart = bat.startY;
        const ySteps = [
          `${yStart}%`,
          `${yStart - 8}%`,
          `${yStart + 7}%`,
          `${yStart - 5}%`,
          `${yStart}%`
        ];

        return (
          <motion.div
            key={bat.id}
            initial={{ x: "-15%", y: `${yStart}%`, opacity: 0 }}
            animate={{
              x: ["-15%", "115%"],
              y: ySteps,
              opacity: [0, 0.15, 0.22, 0.15, 0]
            }}
            transition={{
              duration: bat.duration,
              repeat: Infinity,
              delay: bat.delay,
              ease: "easeInOut"
            }}
            className="absolute"
            style={{ width: 44, height: 44 }}
          >
            <motion.svg
              viewBox="0 0 64 64"
              className="w-full h-full text-[#5a5a40]/25 fill-current"
              animate={{
                scaleY: [1, 0.3, 1, 0.2, 1],
                rotate: [-12, 12, -7, 10, -12]
              }}
              transition={{
                duration: 0.55,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ scale: bat.scale }}
            >
              <path d="M32 20c-2 2-5 4-8 4.5-3 .5-7-.5-10-2 2 5 5.5 9 10 11-2.5 0-5.5 0-8-1.5-4-2.5-6-7-7.5-11-.5 4-2 9-5.5 11-2.5 1.5-6 1-8.5 0 2.5 3 6.5 5 10.5 5 5 0 11-3.5 14.5-7.5 1 4.5 0 10-2.5 13.5 0 0 .5-.5 1.1-1.1 1-1 1.8-2.3 2.1-4 1 3.5 3.1 7 7.1 9 .6.3 1.7.8 2.3.8 1-.1.6-1.1.6-1.7V36c.3-.6 1.1-1.1 1.7-1.1s1.4.5 1.7 1.1v12.2c0 .6-.3 1.6.6 1.7.6 0 1.7-.5 2.3-.8 4-2 6.1-5.5 7.1-9 .3 1.7 1.1 3 2.1 4 .6.6 1.1 1.1 1.1 1.1-2.5-3.5-3.5-9-2.5-13.5 3.5 4 9.5 7.5 14.5 7.5 4 0 8-2 10.5-5-2.5 1-6 1.5-8.5 0-3.5-2-5-7-5.5-11-1.5 4-3.5 8.5-7.5 11-2.5 1.5-5.5 1.5-8 1.5 4.5-2 8-6 10-11-3 1.5-7 2.5-10 2-3-.5-6-2.5-8-4.5z" />
            </motion.svg>
          </motion.div>
        );
      })}
    </div>
  );
}

// Helper to convert any YouTube URL format into a persistent Embed URL (using youtube-nocookie.com to prevent blocking by browser extensions, Brave Shields, or Chrome 3rd-party cookie restrictions)
const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return "";
  let trimmed = url.trim();

  // Case 1: Full HTML iframe embed string pasted by user
  if (trimmed.includes("<iframe") && trimmed.includes("src=")) {
    const matchSrc = trimmed.match(/src="([^"]+)"/) || trimmed.match(/src='([^']+)'/);
    if (matchSrc && matchSrc[1]) {
      trimmed = matchSrc[1];
    }
  }

  // Helper to extract 11-char video ID using general regex patterns
  const extractVideoId = (text: string) => {
    const patterns = [
      /(?:v=|\/embed\/|embed-nocookie\/|\/shorts\/|\/v\/|youtu\.be\/|\/vi\/|(?:\?|&)v=)([a-zA-Z0-9_-]{11})/i,
      /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    ];
    for (const pat of patterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        return match[1];
      }
    }
    // Check if the entire trimmed string or last part of it is an 11-char video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(text)) {
      return text;
    }
    const lastPart = text.split("/").pop() || "";
    if (/^[a-zA-Z0-9_-]{11}$/.test(lastPart.split(/[?#]/)[0])) {
      return lastPart.split(/[?#]/)[0];
    }
    return null;
  };

  const videoId = extractVideoId(trimmed);
  if (videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&enablejsapi=1`;
  }

  // Fallback: If it's already an embed but not using nocookie, replace it
  if (trimmed.includes("/embed/")) {
    if (trimmed.includes("youtube.com")) {
      return trimmed.replace("youtube.com", "youtube-nocookie.com");
    }
    return trimmed;
  }

  return trimmed;
};

export default function App() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [gallery, setGallery] = useState<{ id: string; url: string; title: string }[]>([]);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [showPrepAlert, setShowPrepAlert] = useState(false);
  
  // Modals for flyers
  const [activeFlyerModal, setActiveFlyerModal] = useState<"ticket" | "camping" | "payment" | "gallery" | null>(null);

  // Administrative stats
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [adminUser, setAdminUser] = useState<string | null>(null);

  // Feedback (criticism/suggestions) block state
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Visitor uploads to activities gallery states
  const [visitorPhotoTitle, setVisitorPhotoTitle] = useState("");
  const [visitorPhotoBase64, setVisitorPhotoBase64] = useState("");
  const [visitorUploading, setVisitorUploading] = useState(false);
  const [visitorUploadError, setVisitorUploadError] = useState("");
  const [visitorUploadSuccess, setVisitorUploadSuccess] = useState(false);
  const [isVisitorDragOver, setIsVisitorDragOver] = useState(false);

  // Fetch settings & gallery of operations
  const fetchPublicData = async () => {
    try {
      const settingsRes = await fetch("/api/public-settings");
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings);
      }

      const galleryRes = await fetch("/api/gallery");
      if (galleryRes.ok) {
        const gal = await galleryRes.json();
        setGallery(gal);
      }
    } catch (err) {
      console.error("Failed to fetch public data:", err);
    }
  };

  useEffect(() => {
    fetchPublicData();
    // Track visitor view increment
    fetch("/api/visit", { method: "POST" }).catch(() => {});
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal masuk");
      }
      setAdminUser(data.admin.username);
      setIsAdminMode(true);
      setIsAdminModalOpen(false);
      setUsernameInput("");
      setPasswordInput("");
    } catch (err: any) {
      setLoginError(err.message || "Username or Password wrong");
    }
  };

  // Submit suggestion
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;
    setFeedbackLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: feedbackName, message: feedbackMessage })
      });
      if (res.ok) {
        setFeedbackSuccess(true);
        setFeedbackMessage("");
        setFeedbackName("");
        setTimeout(() => setFeedbackSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleVisitorFile = (file: File) => {
    if (file) {
      if (!file.type.startsWith("image/")) {
        setVisitorUploadError("Berkas harus berupa gambar.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setVisitorUploadError("Ukuran gambar maksimal 5MB.");
        return;
      }
      setVisitorUploadError("");
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setVisitorPhotoBase64(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVisitorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleVisitorFile(file);
  };

  const handleVisitorUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorPhotoBase64) {
      setVisitorUploadError("Silakan pilih atau seret foto terlebih dahulu.");
      return;
    }
    setVisitorUploading(true);
    setVisitorUploadError("");
    setVisitorUploadSuccess(false);

    try {
      const res = await fetch("/api/gallery/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data: visitorPhotoBase64,
          title: visitorPhotoTitle.trim() || "Aktivitas Pengunjung"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah foto.");
      }

      setGallery(data.gallery);
      setVisitorPhotoBase64("");
      setVisitorPhotoTitle("");
      setVisitorUploadSuccess(true);
      setTimeout(() => setVisitorUploadSuccess(false), 5000);
    } catch (err: any) {
      setVisitorUploadError(err.message || "Gagal mengirim foto ke galeri");
    } finally {
      setVisitorUploading(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f5f0] text-[#1a1a1a]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#5a5a40] border-t-transparent" />
        <p className="text-sm text-[#8e8e70] mt-4 font-display">Memuat Halaman Desa Wisata...</p>
      </div>
    );
  }

  // Active Admin Board View
  if (isAdminMode && adminUser) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#5a5a40]/10">
            <div className="flex items-center gap-3">
              <img
                src={settings.logoUrl}
                onError={(e) => { (e.target as HTMLImageElement).src = "/src/assets/images/goa_lawah_logo_1781677843742.jpg" }}
                className="w-10 h-10 rounded-full border border-[#5a5a40]"
                alt="logo"
              />
              <div>
                <h2 className="font-display font-bold text-base text-[#5a5a40] tracking-wide">
                  {settings.contentTexts.destinationName}
                </h2>
                <p className="text-xs text-[#8e8e70]">{settings.contentTexts.villageName}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsAdminMode(false);
                fetchPublicData(); // Reload updated elements
              }}
              className="px-4 py-2 bg-[#5a5a40] hover:bg-[#4a4a35] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Lihat Beranda Publik
            </button>
          </div>
          
          <AdminPanel
            adminName={adminUser}
            onLogout={() => {
              setIsAdminMode(false);
              setAdminUser(null);
              fetchPublicData();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-sans selection:bg-[#5a5a40]/20 selection:text-[#5a5a40] relative overflow-x-hidden pb-12">
      {/* Decorative background glow circles */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-[#5a5a40]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#d4a373]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Atmospheric Flying Bats animation */}
      <FlyingBats />

      {/* FLOAT LOGIN CONTROLS (TOP RIGHT) */}
      <div className="absolute top-4 right-4 z-40">
        <button
          onClick={() => setIsAdminModalOpen(true)}
          className="p-3 bg-white hover:bg-[#fdfaf5] text-[#5a5a40] hover:text-[#d4a373] border border-[#5a5a40]/10 rounded-full cursor-pointer transition-all shadow-xl hover:scale-105"
          id="admin-login-button"
          title="Login Admin"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>

      {/* BIOLINK CONTAINER CONTAINER */}
      <main className="max-w-md mx-auto px-4 pt-10 flex flex-col items-center gap-6 relative z-10">
        {/* LOGO */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#5a5a40] to-[#d4a373] rounded-full opacity-40 blur group-hover:opacity-70 transition-all duration-700" />
          <img
            src={settings.logoUrl}
            onError={(e) => { (e.target as HTMLImageElement).src = "/src/assets/images/goa_lawah_logo_1781677843742.jpg" }}
            className="w-24 h-24 rounded-full border-2 border-[#5a5a40] object-cover shadow-2xl relative"
            alt="Desa Wisata Logo"
          />
        </div>

        {/* DESTINATION TITLE BRAND */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5a5a40]/10 border border-[#5a5a40]/20 text-[#5a5a40] text-[10px] font-bold tracking-wider uppercase mb-1">
            <Sparkles className="w-3 h-3 text-[#d4a373]" /> {settings.contentTexts.heroSubtitle}
          </div>
          <h1 className="font-display font-black text-2xl text-[#5a5a40] tracking-tight leading-tight">
            {settings.contentTexts.destinationName}
          </h1>
          <p className="text-xs text-[#8e8e70] leading-relaxed font-light px-3">
            {settings.contentTexts.description}
          </p>
        </div>

        {/* VIDEO YOUTUBE EMBED PLAYER */}
        {settings.youtubeUrl && (
          <div className="w-full bg-white border border-[#5a5a40]/10 rounded-3xl overflow-hidden shadow-xl">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                title="Youtube Player Desa Wisata Lebah Sempage"
                src={getYouTubeEmbedUrl(settings.youtubeUrl)}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute top-0 left-0 w-full h-full"
              />
            </div>
          </div>
        )}

        {/* BIOLINK ACTIONS/BUTTONS STACK */}
        <div className="w-full space-y-3.5 pt-2">
          
          {/* Action 1: PESAN E-TICKET (Most Prominent Link) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (settings?.eTicketActive === false) {
                setShowPrepAlert(true);
              } else {
                setIsBookingOpen(true);
              }
            }}
            className="w-full p-4.5 bg-[#5a5a40] text-white font-black rounded-2xl flex items-center justify-between shadow-lg shadow-[#5a5a40]/20 hover:shadow-[#5a5a40]/30 border border-[#5a5a40]/30 cursor-pointer animate-pulse-subtle"
            id="pesan-ticket-button"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-300 to-amber-500 rounded-xl text-neutral-900 shadow-sm">
                <Ticket className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#e6c280]">
                  {settings.contentTexts.action1Label || "Rekomendasi Utama"}
                </div>
                <div className="text-base text-white font-extrabold tracking-wide -mt-0.5">
                  {settings.contentTexts.action1Title || "PESAN E-TICKET SEKARANG"}
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-300" />
          </motion.button>

          {/* Action 2: INFO TIKET */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            onClick={() => setActiveFlyerModal("ticket")}
            className="w-full p-4 bg-white hover:bg-[#fdfaf5] text-[#1a1a1a] rounded-2xl flex items-center justify-between border border-[#5a5a40]/10 hover:border-[#5a5a40]/25 shadow-sm group transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl group-hover:bg-sky-100 transition-colors">
                <Calendar className="w-5 h-5 text-sky-600" fill="rgba(14, 165, 233, 0.25)" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">
                  {settings.contentTexts.action2Title || "Info Tiket Masuk Resmi"}
                </div>
                <p className="text-[10px] text-[#8e8e70]">
                  {settings.contentTexts.action2Subtitle || "Rincian harga rekreasi harian"}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-sky-600 group-hover:translate-x-1.5 transition-all duration-200" />
          </motion.button>

          {/* Action 3: SEWA ALAT CAMPING */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            onClick={() => setActiveFlyerModal("camping")}
            className="w-full p-4 bg-white hover:bg-[#fdfaf5] text-[#1a1a1a] rounded-2xl flex items-center justify-between border border-[#5a5a40]/10 hover:border-[#5a5a40]/25 shadow-sm group transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition-colors">
                <ShoppingCart className="w-5 h-5 text-amber-600" fill="rgba(245, 158, 11, 0.25)" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">
                  {settings.contentTexts.action3Title || "Daftar Sewa Alat Camping"}
                </div>
                <p className="text-[10px] text-[#8e8e70]">
                  {settings.contentTexts.action3Subtitle || "Tenda dome, matras, api unggun, SB"}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-amber-600 group-hover:translate-x-1.5 transition-all duration-200" />
          </motion.button>

          {/* Action 4: INFO PEMBAYARAN */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            onClick={() => setActiveFlyerModal("payment")}
            className="w-full p-4 bg-white hover:bg-[#fdfaf5] text-[#1a1a1a] rounded-2xl flex items-center justify-between border border-[#5a5a40]/10 hover:border-[#5a5a40]/25 shadow-sm group transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors">
                <Globe className="w-5 h-5 text-indigo-600" fill="rgba(99, 102, 241, 0.25)" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">
                  {settings.contentTexts.action4Title || "Informasi Pembayaran"}
                </div>
                <p className="text-[10px] text-[#8e8e70]">
                  {settings.contentTexts.action4Subtitle || "Bayar di tempat / QRIS non-tunai resmi"}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-indigo-600 group-hover:translate-x-1.5 transition-all duration-200" />
          </motion.button>

          {/* Action 5: GALERI KEGIATAN */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            onClick={() => setActiveFlyerModal("gallery")}
            className="w-full p-4 bg-white hover:bg-[#fdfaf5] text-[#1a1a1a] rounded-2xl flex items-center justify-between border border-[#5a5a40]/10 hover:border-[#5a5a40]/25 shadow-sm group transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-100 transition-colors">
                <ImageIcon className="w-5 h-5 text-rose-600" fill="rgba(244, 63, 94, 0.25)" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">
                  {settings.contentTexts.action5Title || "Galeri Kegiatan Wisatawan"}
                </div>
                <p className="text-[10px] text-[#8e8e70]">
                  {settings.contentTexts.action5Subtitle || "Keseruan wisata di Desa Wisata Lebah Sempage"}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-rose-600 group-hover:translate-x-1.5 transition-all duration-200" />
          </motion.button>

          {/* Action 6: HUBUNGI KAMI */}
          {settings.whatsappUrl && (
            <motion.a
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              href={settings.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-4 bg-white hover:bg-[#fdfaf5] text-[#1a1a1a] rounded-2xl flex items-center justify-between border border-[#5a5a40]/10 hover:border-[#5a5a40]/25 shadow-sm group transition-all duration-300 cursor-pointer block"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors">
                  <Phone className="w-5 h-5 text-emerald-600" fill="rgba(16, 185, 129, 0.25)" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">
                    {settings.contentTexts.action6Title || "Hubungi Kami (WhatsApp)"}
                  </div>
                  <p className="text-[10px] text-[#8e8e70]">
                    {settings.contentTexts.action6Subtitle || "Tanya Pokdarwis / Layanan Khusus"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-600 group-hover:translate-x-1.5 transition-all duration-200" />
            </motion.a>
          )}

          {/* Action 7: RUTE LOKASI MAPS (Direct Embed) */}
          {settings.googleMapsUrl && (
            <div className="w-full bg-white border border-[#5a5a40]/10 rounded-3xl p-4.5 space-y-3 shadow-sm">
              <div className="flex items-center gap-2.5 text-xs font-bold text-[#5a5a40] tracking-wide uppercase">
                <MapPin className="w-4 h-4 text-[#d4a373]" /> {settings.contentTexts.mapsTitle || "Rute & Lokasi Desa Wisata Lebah Sempage"}
              </div>
              <div className="w-full h-44 rounded-2xl overflow-hidden border border-[#5a5a40]/10">
                <iframe
                  title="Google Maps Location"
                  src={settings.googleMapsUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}

          {/* Action 8: KRITIK & SARAN FORM */}
          <div className="w-full bg-white border border-[#5a5a40]/10 rounded-3xl p-5 space-y-4 shadow-sm text-left">
            <h4 className="text-xs font-bold text-[#5a5a40] uppercase tracking-widest flex items-center gap-1.5 border-b border-[#5a5a40]/10 pb-2">
              <MessageSquare className="w-4 h-4" /> {settings.contentTexts.feedbackTitle || "Kritik & Saran Pengunjung"}
            </h4>
            
            {feedbackSuccess ? (
              <div className="p-4 bg-[#5a5a40]/10 border border-[#5a5a40]/20 rounded-2xl text-xs text-center text-[#5a5a40] font-semibold animate-pulse">
                {settings.contentTexts.feedbackSuccessMsg || "✓ Terima kasih! Saran & masukan telah terkirim menuju database Pokdarwis Desa Wisata Lebah Sempage."}
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-3.5">
                <div>
                  <input
                    type="text"
                    value={feedbackName}
                    onChange={(e) => setFeedbackName(e.target.value)}
                    placeholder={settings.contentTexts.feedbackPlacName || "Nama Kamu (Opsional)"}
                    className="w-full bg-[#fdfaf5] border border-[#5a5a40]/10 text-xs text-[#1a1a1a] placeholder-neutral-400 rounded-xl px-4 py-3 outline-none focus:border-[#d4a373]"
                  />
                </div>
                <div>
                  <textarea
                    rows={2}
                    required
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder={settings.contentTexts.feedbackPlacMsg || "Tuliskan kritik, masukan, atau saran..."}
                    className="w-full bg-[#fdfaf5] border border-[#5a5a40]/10 text-xs text-[#1a1a1a] placeholder-neutral-400 rounded-xl px-4 py-3 outline-none focus:border-[#d4a373]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={feedbackLoading}
                  className="w-full py-2.5 bg-[#5a5a40] hover:bg-[#4a4a35] text-white font-bold text-xs rounded-xl cursor-pointer shadow-md transition-all disabled:opacity-40"
                >
                  {feedbackLoading ? "Memproses..." : (settings.contentTexts.feedbackBtn || "Kirim Masukan")}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Action 9: SOSIAL MEDIA ( FB, IG, TIKTOK - Badges elongated below) */}
        <div className="w-full pt-4 text-center space-y-3">
          <div className="text-[10px] text-[#8e8e70] uppercase tracking-widest font-semibold">
            {settings.contentTexts.socmedTitle || "Kunjungi Media Sosial"}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {settings.facebookUrl && (
              <a
                href={settings.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#e8f0fe] border border-[#1877f2]/25 text-[#1877f2] hover:bg-[#1877f2] hover:text-white hover:border-[#1877f2] rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Facebook className="w-3.5 h-3.5 fill-current" /> Facebook
              </a>
            )}
            {settings.instagramUrl && (
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#fdf0f5] border border-[#e1306c]/25 text-[#e1306c] hover:bg-gradient-to-r hover:from-[#f81f01] hover:via-[#e1306c] hover:to-[#c13584] hover:text-white hover:border-transparent rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Instagram className="w-3.5 h-3.5 animate-pulse" /> Instagram
              </a>
            )}
            {settings.tiktokUrl && (
              <a
                href={settings.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#f3f4f6] border border-neutral-900/15 text-neutral-900 hover:bg-neutral-950 hover:text-white hover:border-neutral-950 rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Globe className="w-3.5 h-3.5" /> TikTok
              </a>
            )}
          </div>
        </div>

        {/* COPYRIGHT AND LEGAL */}
        <footer className="w-full pt-6 text-center border-t border-[#5a5a40]/10 text-[10px] text-[#8e8e70] font-light space-y-1">
          <p className="text-xs font-bold text-emerald-700 tracking-wide">{settings.contentTexts.footerText}</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-[#5a5a40] font-semibold">
              {settings.contentTexts.footerHeart || "Made with Care in Lebah Sempage"}
            </span>
          </div>
        </footer>
      </main>

      {/* FLYERS & INFOS POPUP OVERLAY DRAWER */}
      <AnimatePresence>
        {activeFlyerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={() => setActiveFlyerModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1a1a]/60 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white border border-[#5a5a40]/15 rounded-3xl p-6 shadow-2xl space-y-4 text-[#1a1a1a] cursor-default"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#5a5a40]/10 pb-3">
                <h3 className="font-display font-bold text-sm tracking-wide text-[#5a5a40] uppercase">
                  {activeFlyerModal === "ticket" && "Brosur & Info Tiket Masuk"}
                  {activeFlyerModal === "camping" && "Daftar Sewa Alat Camping"}
                  {activeFlyerModal === "payment" && "Informasi Transaksi Tunai / QRIS"}
                  {activeFlyerModal === "gallery" && "Dokumentasi Galeri Kegiatan"}
                </h3>
                <button
                  onClick={() => setActiveFlyerModal(null)}
                  className="p-1.5 hover:bg-[#f5f5f0] rounded-full text-[#8e8e70] hover:text-[#5a5a40] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body elements */}
              <div className="overflow-y-auto max-h-[65vh] space-y-3">
                {activeFlyerModal === "ticket" && (
                  <div className="space-y-4 text-left">
                    <img
                      src={settings.ticketInfoImage}
                      onError={(e) => { (e.target as HTMLImageElement).src = "/src/assets/images/ticket_flyer_1781677879257.jpg" }}
                      className="w-full rounded-2xl border border-[#5a5a40]/10 shadow-lg object-contain"
                      alt="brosur tiket"
                    />
                  </div>
                )}

                {activeFlyerModal === "camping" && (
                  <div className="space-y-4 text-left">
                    <img
                      src={settings.campingImage}
                      onError={(e) => { (e.target as HTMLImageElement).src = "/src/assets/images/camping_rental_1781677897755.jpg" }}
                      className="w-full rounded-2xl border border-[#5a5a40]/10 shadow-lg object-contain"
                      alt="sewa camping"
                    />
                  </div>
                )}

                {activeFlyerModal === "payment" && (
                  <div className="space-y-4 text-left">
                    <img
                      src={settings.paymentImage}
                      onError={(e) => { (e.target as HTMLImageElement).src = "/src/assets/images/qris_payment_1781677862360.jpg" }}
                      className="w-full rounded-2xl border border-[#5a5a40]/10 shadow-lg object-contain"
                      alt="qris pembayaran"
                    />
                    <div className="bg-[#fdfaf5] p-4 border border-[#5a5a40]/10 rounded-2xl">
                      <p className="text-[11px] text-[#8e8e70] text-center leading-relaxed font-light">
                        Pembayaran di muka tidak wajib. Untuk kenyamanan wisatawan, pembayaran dapat diselesaikan secara tunai atau men-scan QRIS di loket utama saat check-in di loket.
                      </p>
                    </div>
                  </div>
                )}

                {activeFlyerModal === "gallery" && (
                  <div className="space-y-5 min-h-[250px] text-left">
                    {/* BAGIAN UPLOAD PENGUNJUNG */}
                    <div className="bg-[#fcf8f2] border border-[#d4a373]/20 rounded-2xl p-4 space-y-3 shadow-none">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#5a5a40] uppercase tracking-wide">
                        <Upload className="w-4 h-4 text-[#d4a373]" /> Unggah Keseruan Anda di Sini!
                      </div>
                      <p className="text-[10px] text-[#8e8e70] leading-relaxed">
                        Wisatawan diperkenankan untuk mengunggah momen keseruan di Desa Wisata Lebah Sempage untuk tampil pada galeri dokumentasi bersama pengunjung lainnya.
                      </p>

                      <form onSubmit={handleVisitorUploadSubmit} className="space-y-3">
                        {/* Judul Input */}
                        <div>
                          <label className="block text-[10px] font-semibold text-[#5a5a40] uppercase mb-1">
                            Keterangan Foto / Aktivitas
                          </label>
                          <input
                            type="text"
                            value={visitorPhotoTitle}
                            onChange={(e) => setVisitorPhotoTitle(e.target.value)}
                            placeholder="Contoh: Menikmati udara sejuk camping ground..."
                            className="w-full bg-white border border-[#5a5a40]/10 text-xs text-[#1a1a1a] placeholder-neutral-400 rounded-xl px-3 py-2 outline-none focus:border-[#d4a373]"
                          />
                        </div>

                        {/* Drag and Drop Zone Container */}
                        <div>
                          <label className="block text-[10px] font-semibold text-[#5a5a40] uppercase mb-1">
                            Berkas Foto Kegiatan*
                          </label>
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsVisitorDragOver(true);
                            }}
                            onDragLeave={() => setIsVisitorDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsVisitorDragOver(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file) handleVisitorFile(file);
                            }}
                            className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                              isVisitorDragOver
                                ? "border-[#d4a373] bg-[#d4a373]/5"
                                : "border-[#5a5a40]/15 bg-white hover:border-[#d4a373]"
                            }`}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleVisitorFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            
                            {visitorPhotoBase64 ? (
                              <div className="space-y-2 w-full flex flex-col items-center">
                                <img
                                  src={visitorPhotoBase64}
                                  alt="Preview upload"
                                  className="h-20 w-auto object-cover rounded-lg border border-[#5a5a40]/10 shadow-sm"
                                />
                                <span className="text-[10px] text-emerald-600 font-bold block">
                                  ✓ Foto Terpilih (Siap Unggah)
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Upload className="w-6 h-6 text-[#8e8e70] mx-auto opacity-70" />
                                <p className="text-[10px] text-[#5a5a40] font-medium">
                                  <span className="text-[#d4a373] underline">Klik untuk memilih</span> atau seret file foto ke sini
                                </p>
                                <p className="text-[9px] text-[#8e8e70]">Maksimal ukuran file 5MB (PNG, JPG, JPEG)</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {visitorUploadError && (
                          <div className="text-[10px] text-rose-500 font-medium bg-rose-50 border border-rose-100 p-2 rounded-lg">
                            ⚠️ {visitorUploadError}
                          </div>
                        )}

                        {visitorUploadSuccess && (
                          <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 p-2 rounded-lg">
                            ✓ Terima kasih! Foto berhasil ditambahkan ke galeri.
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={visitorUploading || !visitorPhotoBase64}
                          className="w-full py-2 bg-[#5a5a40] hover:bg-[#4a4a35] disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          {visitorUploading ? "Mengunggah..." : "Unggah & Bagikan Foto"}
                        </button>
                      </form>
                    </div>

                    <div className="border-t border-[#5a5a40]/10 pt-3">
                      <div className="text-xs font-bold text-[#5a5a40] mb-3 uppercase tracking-wide">
                        Dokumentasi Galeri ({gallery.length})
                      </div>
                      <div className="grid grid-cols-2 gap-3.5 max-h-[300px] overflow-y-auto pr-1">
                        {gallery.length === 0 ? (
                          <p className="col-span-2 text-center text-xs text-neutral-400 italic py-10">Belum ada foto galeri.</p>
                        ) : (
                          gallery.map((g, idx) => (
                            <div key={g.id || idx} className="bg-[#fdfaf5] rounded-2xl border border-[#5a5a40]/10 p-2.5 space-y-1.5 shadow-sm">
                              <img
                                src={g.url}
                                className="w-full h-28 object-cover rounded-xl"
                                alt={g.title}
                              />
                              <div className="text-[10px] font-semibold text-[#5a5a40] truncate text-center px-1">{g.title}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setActiveFlyerModal(null)}
                className="w-full bg-[#f5f5f0] hover:bg-[#e9e9df] text-[#5a5a40] border border-[#5a5a40]/10 text-xs font-semibold py-2.5 rounded-xl cursor-pointer"
              >
                Tutup Jendela
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* E-TICKET TRANSACTION BOOKING PANEL MODAL */}
      <TicketBookingModal
         isOpen={isBookingOpen}
         onClose={() => setIsBookingOpen(false)}
         settings={settings}
         onBookingSuccess={() => {}}
      />

      {/* ADMIN SECURE LOGIN PANEL MODAL */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with fade-in and dismiss on click */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => {
                setIsAdminModalOpen(false);
                setLoginError("");
              }}
              className="absolute inset-0 bg-[#1a1a1a]/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className="relative w-full max-w-sm bg-white border border-[#5a5a40]/15 rounded-3xl p-6 shadow-2xl text-[#1a1a1a] z-10"
            >
              <button
                onClick={() => {
                  setIsAdminModalOpen(false);
                  setLoginError("");
                }}
                className="absolute top-4 right-4 p-1.5 bg-[#fdfaf5] border border-[#5a5a40]/10 rounded-md text-[#8e8e70] hover:text-[#5a5a40]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex p-3 bg-[#5a5a40]/10 text-[#5a5a40] rounded-full border border-[#5a5a40]/25">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-lg text-[#5a5a40]">Login Admin Desa Wisata Lebah Sempage</h3>
                <p className="text-xs text-[#8e8e70]">Gunakan kredensial admin Pokdarwis Anda</p>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl mb-4 text-center">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#5a5a40] mb-1.5">Username Admin</label>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full bg-[#fdfaf5] border border-[#5a5a40]/10 hover:border-[#5a5a40]/20 text-sm focus:border-[#d4a373] text-[#1a1a1a] placeholder-neutral-400 rounded-xl px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#5a5a40] mb-1.5">Password Sandi</label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full bg-[#fdfaf5] border border-[#5a5a40]/10 hover:border-[#5a5a40]/20 text-sm focus:border-[#d4a373] text-[#1a1a1a] placeholder-neutral-400 rounded-xl px-4 py-3 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#5a5a40] hover:bg-[#4a4a35] text-white font-bold text-sm tracking-wide rounded-xl cursor-pointer shadow-lg transition-all"
                >
                  Masuk Panel Admin
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Warning/Preparation Alert Modal when Booking is OFF */}
        {showPrepAlert && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrepAlert(false)}
              className="absolute inset-0 bg-[#1a1a1a]/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-[#fdfaf5] border border-[#5a5a40]/25 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center space-y-5"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPrepAlert(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#5a5a40]/10 text-[#5a5a40] transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Warning Illustration Icon */}
              <div className="inline-flex p-4.5 bg-amber-50 text-amber-600 rounded-full border border-amber-200">
                <Ticket className="w-8 h-8 opacity-75" />
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-bold text-lg text-[#5a5a40] tracking-wide">
                  Pemesanan Tiket Online
                </h3>
                <p className="text-sm text-[#5a5a40] leading-relaxed font-semibold px-2">
                  untuk saat ini pemesanan tiket secara online hanya bisa dilakukan melalui whatsapp
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {settings.whatsappUrl && (
                  <a
                    href={settings.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm tracking-wide rounded-xl cursor-pointer shadow-lg shadow-emerald-600/15 hover:shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Hubungi via WhatsApp
                  </a>
                )}
                <button
                  onClick={() => setShowPrepAlert(false)}
                  className="w-full py-3 bg-[#5a5a40] hover:bg-[#4a4a35] text-white font-extrabold text-sm tracking-wide rounded-xl cursor-pointer shadow-lg shadow-[#5a5a40]/15 hover:shadow-[#5a5a40]/25 transition-all"
                >
                  Baik, Saya Mengerti
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
