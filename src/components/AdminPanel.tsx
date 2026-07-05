import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  BarChart3, Ticket, Image, MessageSquare, Settings, Upload, FileText, UserCheck, LogOut, Trash2, Plus, Save, Eye, CheckCircle2, ChevronRight, X, Download, Sun, Moon,
  Cloud, Database, RefreshCw, AlertCircle, Code, CloudLightning, Terminal, Mail, Send, Inbox
} from "lucide-react";
import { AdminSettings, Booking, Feedback, VisitorStats } from "../types";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase safely
const fApp = initializeApp(firebaseConfig);
const fAuth = getAuth(fApp);

interface AdminPanelProps {
  onLogout: () => void;
  adminName: string;
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

export default function AdminPanel({ onLogout, adminName }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "stats" | "tickets" | "ticket_form_edit" | "logo" | "saran" | "gallery" | "settings" | "media" | "texts" | "admins" | "gmail" | "gdrive"
  >("stats");

  // Gmail Integration States
  const [gmailToken, setGmailToken] = useState<string | null>(() => {
    return localStorage.getItem("gmail_token") || localStorage.getItem("gdrive_token") || null;
  });
  const [gmailUser, setGmailUser] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem("gmail_user") || localStorage.getItem("gdrive_user");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [gmailProfile, setGmailProfile] = useState<any | null>(null);
  const [gmailLoading, setGmailLoading] = useState<boolean>(false);
  const [gmailMessages, setGmailMessages] = useState<any[]>([]);
  const [gmailActiveSubTab, setGmailActiveSubTab] = useState<"inbox" | "compose" | "broadcast">("inbox");
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [gmailError, setGmailError] = useState("");
  const [selectedBookingForEmail, setSelectedBookingForEmail] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const [gmailSearchQuery, setGmailSearchQuery] = useState("");
  const [gmailInboxType, setGmailInboxType] = useState<"INBOX" | "SENT">("INBOX");
  const [selectedGmailMessage, setSelectedGmailMessage] = useState<any | null>(null);
  const [broadcastProgress, setBroadcastProgress] = useState<{ current: number; total: number; active: boolean }>({ current: 0, total: 0, active: false });

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [adminsList, setAdminsList] = useState<{ username: string }[]>([]);
  const [gallery, setGallery] = useState<{ id: string; url: string; title: string }[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Form Inputs
  const [newLogoBase64, setNewLogoBase64] = useState("");
  const [newTicketBase64, setNewTicketBase64] = useState("");
  const [newCampingBase64, setNewCampingBase64] = useState("");
  const [newPaymentBase64, setNewPaymentBase64] = useState("");

  // Gallery inputs
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryBase64, setGalleryBase64] = useState("");

  // Admin inputs
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [oldUsername, setOldUsername] = useState("admin");

  // States for ticket form edit
  const [ticketPrices, setTicketPrices] = useState({
    priceCampingPerson: 0,
    priceCampingMotorcycle: 0,
    priceCampingCar: 0,
    priceVisitPerson: 0,
    priceVisitMotorcycle: 0,
    priceVisitCar: 0
  });

  const [rentalItems, setRentalItems] = useState<{ id: string; name: string; price: number }[]>([]);
  const [formFields, setFormFields] = useState<{ id: string; label: string; placeholder: string; type: string; required: boolean; isDefault?: boolean }[]>([]);

  // Editing utilities
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const [newRentalName, setNewRentalName] = useState("");
  const [newRentalPrice, setNewRentalPrice] = useState<number>(0);
  const [eTicketActive, setETicketActive] = useState<boolean>(true);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("admin_theme") as "light" | "dark") || "dark"
  );

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("admin_theme", nextTheme);
  };

  // Google Drive Sync states
  const [gdriveUser, setGdriveUser] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem("gdrive_user");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [gdriveToken, setGdriveToken] = useState<string | null>(() => {
    return localStorage.getItem("gdrive_token") || null;
  });
  const [gdriveFiles, setGdriveFiles] = useState<any[]>([]);
  const [gdriveLoading, setGdriveLoading] = useState<boolean>(false);
  const [dbFileOnDrive, setDbFileOnDrive] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem("gdrive_db_file");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [autoDriveSync, setAutoDriveSync] = useState<boolean>(() => {
    return localStorage.getItem("gdrive_auto_sync") !== "false";
  });

  const [gdriveFolderId, setGdriveFolderId] = useState<string>(() => {
    return localStorage.getItem("gdrive_folder_id") || "root";
  });
  const gdriveFolderUrl = gdriveFolderId === "root"
    ? "https://drive.google.com/drive/my-drive"
    : `https://drive.google.com/drive/folders/${gdriveFolderId}`;

  const isInitialLoaded = useRef(false);

  // Trigger server-side and client-side GDrive session linkage
  useEffect(() => {
    if (gdriveToken) {
      fetch("/api/admin/gdrive-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: gdriveToken, fileId: dbFileOnDrive?.id })
      }).catch(err => console.error("Error sending GDrive token to server:", err));
    } else {
      fetch("/api/admin/gdrive-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: null, fileId: null })
      }).catch(err => console.error("Error clearing GDrive token from server:", err));
    }
  }, [gdriveToken, dbFileOnDrive]);

  // Trigger server-side and client-side Gmail session linkage
  useEffect(() => {
    if (gmailToken) {
      fetch("/api/admin/gmail-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: gmailToken })
      }).catch(err => console.error("Error sending Gmail token to server:", err));
    } else {
      fetch("/api/admin/gmail-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: null })
      }).catch(err => console.error("Error clearing Gmail token from server:", err));
    }
  }, [gmailToken]);

  // Load GDrive statistics if token exists on mount or folder ID changes
  useEffect(() => {
    if (gdriveToken) {
      refreshDriveStats(gdriveToken).catch(err => {
        console.error("Gagal memuat statistik GDrive pada startup:", err);
      });
    }
  }, [gdriveToken, gdriveFolderId]);

  // Monitor database state updates for automatic sync
  useEffect(() => {
    if (loading === false && settings && bookings && feedbacks && gallery) {
      if (!isInitialLoaded.current) {
        const timer = setTimeout(() => {
          isInitialLoaded.current = true;
          console.log("Database state monitor is armed for GDrive auto-sync!");
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, settings, bookings, feedbacks, gallery]);

  useEffect(() => {
    if (isInitialLoaded.current && gdriveToken && autoDriveSync) {
      // Trigger a debounced background sync to Google Drive!
      const timer = setTimeout(() => {
        console.log("Mendeteksi perubahan data, menyinkronkan otomatis ke Google Drive...");
        handlePushDriveDatabase(true);
      }, 5000); // 5 seconds debounce
      return () => clearTimeout(timer);
    }
  }, [settings, bookings, feedbacks, gallery, gdriveToken, autoDriveSync, gdriveFolderId]);

  // Load Gmail details on change
  useEffect(() => {
    if (gmailToken && activeTab === "gmail") {
      fetchGmailProfileAndMessages(gmailToken);
    }
  }, [gmailToken, gmailInboxType, activeTab]);

  // Decoding helper for base64 Gmail payloads
  const decodeBase64 = (data: string): string => {
    try {
      const cleanData = data.replace(/-/g, "+").replace(/_/g, "/");
      const binary = window.btoa(cleanData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch (e) {
      console.error("Base64 decoding error", e);
      return "Gagal memproses lampiran teks.";
    }
  };

  // Helper to extract email body recursively
  const getMessageBody = (payload: any): string => {
    if (!payload) return "";
    if (payload.body && payload.body.data) {
      return decodeBase64(payload.body.data);
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        const body = getMessageBody(part);
        if (body) return body;
      }
    }
    return "";
  };

  const fetchGmailProfileAndMessages = async (token: string) => {
    setGmailLoading(true);
    setGmailError("");
    try {
      // 1. Get profile
      const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.status === 401) {
        throw new Error("Sesi Google Anda kedaluwarsa. Silakan hubungkan ulang akun Google.");
      }
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setGmailProfile(profileData);
      }

      // 2. Get messages list
      const labelParam = gmailInboxType === "SENT" ? "labelIds=SENT" : "labelIds=INBOX";
      const qParam = gmailSearchQuery ? `&q=${encodeURIComponent(gmailSearchQuery)}` : "";
      const messagesRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&${labelParam}${qParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        if (messagesData.messages && messagesData.messages.length > 0) {
          // Fetch details for each message
          const detailsPromises = messagesData.messages.map(async (msg: any) => {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (detailRes.ok) {
              return await detailRes.json();
            }
            return null;
          });
          const detailedMessages = await Promise.all(detailsPromises);
          setGmailMessages(detailedMessages.filter(m => m !== null));
        } else {
          setGmailMessages([]);
        }
      } else {
        setGmailMessages([]);
      }
    } catch (err: any) {
      console.error("Error fetching Gmail data:", err);
      setGmailError(err.message || "Gagal memuat data Gmail.");
    } finally {
      setGmailLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    setGmailLoading(true);
    setGmailError("");
    const isIframe = window.self !== window.top;
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/drive");
      provider.addScope("https://www.googleapis.com/auth/drive.file");
      provider.addScope("https://mail.google.com/");
      provider.addScope("https://www.googleapis.com/auth/gmail.compose");
      provider.addScope("https://www.googleapis.com/auth/gmail.send");
      provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
      provider.addScope("https://www.googleapis.com/auth/gmail.modify");
      
      const result = await signInWithPopup(fAuth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      if (!token) {
        throw new Error("Gagal memperoleh token akses Google.");
      }
      
      setGmailUser(result.user);
      setGmailToken(token);
      localStorage.setItem("gmail_user", JSON.stringify(result.user));
      localStorage.setItem("gmail_token", token);
      
      showSuccess("Koneksi Gmail Berhasil!");
      await fetchGmailProfileAndMessages(token);
    } catch (err: any) {
      console.error("Gmail login error", err);
      let localizedMsg = err.message || "Gagal menghubungkan ke Gmail.";
      if (isIframe || err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment") {
        localizedMsg = "Browser Anda memblokir autentikasi Google dalam Iframe AI Studio. Silakan buka aplikasi ini di TAB BARU dengan mengeklik tombol 'Buka di Tab Baru' (ikon panah keluar di kanan atas pratinjau), lalu hubungkan kembali.";
      }
      setGmailError(localizedMsg);
      showError(localizedMsg);
    } finally {
      setGmailLoading(false);
    }
  };

  const handleDisconnectGmail = () => {
    setGmailToken(null);
    setGmailUser(null);
    setGmailProfile(null);
    setGmailMessages([]);
    localStorage.removeItem("gmail_token");
    localStorage.removeItem("gmail_user");
    showSuccess("Koneksi Gmail berhasil diputuskan.");
  };

  const handleSendGmail = async () => {
    if (!gmailToken) {
      showError("Silakan hubungkan akun Gmail Anda terlebih dahulu.");
      return;
    }
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      showError("Harap lengkapi penerima, subjek, dan isi email.");
      return;
    }

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin mengirim email ini ke ${composeTo}? Email akan terkirim secara resmi dari akun Gmail Anda.`
    );
    if (!confirmed) return;

    setIsSendingEmail(true);
    try {
      const mimeMessage = [
        `To: ${composeTo}`,
        'Content-Type: text/html; charset="UTF-8"',
        'MIME-Version: 1.0',
        `Subject: =?utf-8?B?${window.btoa(unescape(encodeURIComponent(composeSubject)))}?=`,
        '',
        composeBody
      ].join('\r\n');

      const base64Mime = window.btoa(unescape(encodeURIComponent(mimeMessage)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gmailToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: base64Mime })
      });

      if (res.ok) {
        showSuccess("Email berhasil dikirim!");
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
        setSelectedBookingForEmail("");
        setSelectedTemplate("custom");
        await fetchGmailProfileAndMessages(gmailToken);
      } else {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Gagal mengirim email.");
      }
    } catch (err: any) {
      console.error("Error sending email:", err);
      showError(`Gagal mengirim: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleBroadcastGmail = async () => {
    if (!gmailToken) {
      showError("Silakan hubungkan akun Gmail Anda terlebih dahulu.");
      return;
    }
    if (!composeSubject.trim() || !composeBody.trim()) {
      showError("Harap lengkapi subjek dan isi email untuk broadcast.");
      return;
    }

    const uniqueEmails = Array.from(new Set(bookings.map(b => b.email).filter(e => e && e.includes("@"))));
    if (uniqueEmails.length === 0) {
      showError("Tidak ada alamat email pengunjung yang valid untuk broadcast.");
      return;
    }

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin mengirim email broadcast ini ke ${uniqueEmails.length} pengunjung? Tindakan ini akan mengirim email massal secara resmi dari akun Gmail Anda.`
    );
    if (!confirmed) return;

    setBroadcastProgress({ current: 0, total: uniqueEmails.length, active: true });
    showSuccess(`Memulai pengiriman broadcast ke ${uniqueEmails.length} email...`);

    let successCount = 0;
    for (let i = 0; i < uniqueEmails.length; i++) {
      const email = uniqueEmails[i];
      setBroadcastProgress(prev => ({ ...prev, current: i + 1 }));
      try {
        const mimeMessage = [
          `To: ${email}`,
          'Content-Type: text/html; charset="UTF-8"',
          'MIME-Version: 1.0',
          `Subject: =?utf-8?B?${window.btoa(unescape(encodeURIComponent(composeSubject)))}?=`,
          '',
          composeBody
        ].join('\r\n');

        const base64Mime = window.btoa(unescape(encodeURIComponent(mimeMessage)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gmailToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ raw: base64Mime })
        });

        if (res.ok) {
          successCount++;
        }
        await new Promise(r => setTimeout(r, 400));
      } catch (err) {
        console.error(`Gagal mengirim broadcast ke ${email}:`, err);
      }
    }

    setBroadcastProgress({ current: 0, total: 0, active: false });
    showSuccess(`Broadcast selesai! Berhasil mengirim ke ${successCount} dari ${uniqueEmails.length} pengunjung.`);
    setComposeSubject("");
    setComposeBody("");
  };

  const handleTemplateChange = (templateId: string, bookingId: string) => {
    setSelectedTemplate(templateId);
    setSelectedBookingForEmail(bookingId);
    
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      if (templateId === "custom") {
        setComposeSubject("");
        setComposeBody("");
      } else if (templateId === "promo") {
        setComposeSubject("🌟 Penawaran Spesial: Jelajahi Keindahan Wisata Goa Lawah");
        setComposeBody(`
<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; color: #333; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden;">
  <div style="background-color: #064e3b; padding: 24px; text-align: center; color: white;">
    <h2 style="margin: 0; font-size: 20px;">Keindahan Alam & Budaya Goa Lawah</h2>
    <p style="color: #a7f3d0; margin: 5px 0 0 0; font-size: 13px;">Pengalaman Wisata & Spiritual Tak Terlupakan</p>
  </div>
  <div style="padding: 24px; background-color: #ffffff;">
    <p>Halo Pengunjung Setia,</p>
    <p>Dapatkan pengalaman tak terlupakan menjelajahi keindahan budaya dan alam suci Goa Lawah Bali. Nikmati udara malam yang sejuk di area <strong>Camping Ground Goa Lawah</strong> yang asri, atau kunjungi pura bersejarah di tepi pantai.</p>
    <p>Kami menawarkan promo menarik untuk paket camping serta kunjungan ritual upacara kelompok di musim ini.</p>
    <p>Kunjungi situs portal kami untuk memesan tiket secara online dengan diskon khusus!</p>
    <br/>
    <p style="margin-bottom: 0;">Salam hangat,<br/><strong>Pengelola Wisata Goa Lawah</strong></p>
  </div>
</div>
        `);
      }
      return;
    }

    setComposeTo(booking.email || "");

    const checkInStr = new Date(booking.checkInDate).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const checkOutStr = booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }) : "-";

    const totalFormatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR"
    }).format(booking.totalPrice || 0);

    if (templateId === "custom") {
      setComposeSubject("");
      setComposeBody("");
    } else if (templateId === "ticket_confirmation") {
      setComposeSubject(`🎟️ Konfirmasi E-Tiket Resmi Goa Lawah: ${booking.bookingCode}`);
      setComposeBody(`
<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; color: #27272a; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; background-color: #fafafa; margin: 0 auto;">
  <div style="background-color: #064e3b; padding: 24px; text-align: center;">
    <h1 style="color: #4ade80; margin: 0; font-size: 22px;">🎟️ E-TICKET GOA LAWAH</h1>
    <p style="color: #a7f3d0; margin: 5px 0 0 0; font-size: 13px;">Tiket Elektronik Resmi & Konfirmasi Pembayaran</p>
  </div>
  <div style="padding: 24px; background-color: #ffffff;">
    <p>Halo <strong>${booking.name}</strong>,</p>
    <p>Terima kasih telah melakukan pemesanan tiket masuk Goa Lawah secara online. Pemesanan Anda telah terkonfirmasi dengan rincian berikut:</p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 15px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 5px 0; font-weight: bold; width: 40%; font-size: 13px;">Kode Booking:</td>
          <td style="padding: 5px 0; color: #16a34a; font-weight: bold; font-size: 14px;">${booking.bookingCode}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; font-size: 13px;">Tipe Wisata:</td>
          <td style="padding: 5px 0; text-transform: capitalize; font-size: 13px;">${booking.visitType === "camping" ? "Camping / Berkemah" : "Kunjungan Biasa"}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; font-size: 13px;">Tanggal Kunjung:</td>
          <td style="padding: 5px 0; font-size: 13px;">${checkInStr}</td>
        </tr>
        ${booking.visitType === "camping" ? `
        <tr>
          <td style="padding: 5px 0; font-weight: bold; font-size: 13px;">Tanggal Check-out:</td>
          <td style="padding: 5px 0; font-size: 13px;">${checkOutStr}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 5px 0; font-weight: bold; font-size: 13px;">Jumlah Orang:</td>
          <td style="padding: 5px 0; font-size: 13px;">${booking.numPeople} Orang</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; font-size: 13px;">Total Pembayaran:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #166534; font-size: 14px;">${totalFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; font-size: 13px;">Status:</td>
          <td style="padding: 5px 0;"><span style="background-color: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">${booking.paymentStatus}</span></td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 12px; color: #71717a; margin-top: 15px;">*Silakan simpan dan tunjukkan email konfirmasi atau screenshot rincian di atas kepada petugas pintu gerbang kami saat kedatangan.</p>
    <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
    <p style="font-size: 11px; color: #a1a1aa; text-align: center; margin: 0;">Email ini dikirim secara otomatis oleh Sistem Portal Wisata Alam Goa Lawah.</p>
  </div>
</div>
      `);
    } else if (templateId === "thank_you") {
      setComposeSubject(`🌟 Terima Kasih atas Kunjungan Anda di Goa Lawah!`);
      setComposeBody(`
<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; color: #27272a; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; margin: 0 auto;">
  <div style="background-color: #064e3b; padding: 24px; text-align: center; color: white;">
    <h2 style="margin: 0; font-size: 20px;">Matur Suksma & Terima Kasih</h2>
    <p style="color: #a7f3d0; margin: 5px 0 0 0; font-size: 13px;">Kunjungan Anda Sangat Berarti Bagi Kami</p>
  </div>
  <div style="padding: 24px; background-color: #ffffff;">
    <p>Halo <strong>${booking.name}</strong>,</p>
    <p>Kami dari pengelola kawasan suci dan wisata alam Goa Lawah ingin mengucapkan terima kasih yang tulus atas kunjungan Anda pada tanggal ${checkInStr}.</p>
    <p>Kami berharap seluruh aktivitas Anda, baik upacara persembahyangan maupun rekreasi alam, berjalan lancar serta memberikan kedamaian dan kebahagiaan.</p>
    <p>Apabila Anda berkenan, kami sangat menghargai ulasan, saran, ataupun ulasan bintang pada portal utama website kami untuk membantu kami terus menyempurnakan fasilitas kawasan.</p>
    <br/>
    <p>Sampai jumpa kembali di kesempatan berikutnya!</p>
    <br/>
    <p style="margin-bottom: 0;">Salam hangat,<br/><strong>Pengelola Wisata Goa Lawah</strong></p>
  </div>
</div>
      `);
    }
  };

  // Google Sign In & Auth Setup for GDrive
  const handleConnectGDrive = async () => {
    setGdriveLoading(true);
    setSyncLog(["Menginisialisasi masuk dengan Google..."]);
    setErrorMsg("");
    
    const isIframe = window.self !== window.top;
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/drive");
      provider.addScope("https://www.googleapis.com/auth/drive.file");
      
      const result = await signInWithPopup(fAuth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      if (!token) {
        throw new Error("Gagal memperoleh token akses dari Google");
      }
      
      setGdriveUser(result.user);
      setGdriveToken(token);
      localStorage.setItem("gdrive_user", JSON.stringify(result.user));
      localStorage.setItem("gdrive_token", token);
      
      setSyncLog([
        `Berhasil terhubung sebagai ${result.user.displayName || result.user.email}!`,
        "Memeriksa folder Google Drive..."
      ]);
      
      // Load current files on drive
      await refreshDriveStats(token);
      showSuccess("Koneksi Google Drive Berhasil!");
    } catch (err: any) {
      console.error("GDrive login error", err);
      let localizedMsg = err.message || "Gagal menghubungkan ke Google Drive.";
      
      if (isIframe || err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment") {
        localizedMsg = "Browser Anda memblokir autentikasi Google dalam Iframe AI Studio. Silakan buka aplikasi ini di TAB BARU dengan mengeklik tombol 'Buka di Tab Baru' (ikon panah keluar di kanan atas pratinjau), lalu log in dari sana.";
      }
      
      setErrorMsg(localizedMsg);
      setSyncLog(prev => [
        ...prev, 
        `Kesalahan: ${localizedMsg}`,
        "Tips: Silakan klik tombol 'Buka di Tab Baru' di pojok kanan atas preview AI Studio."
      ]);
    } finally {
      setGdriveLoading(false);
    }
  };

  const handleDisconnectGDrive = async () => {
    try {
      await fAuth.signOut();
    } catch(e) {}
    setGdriveUser(null);
    setGdriveToken(null);
    setGdriveFiles([]);
    setDbFileOnDrive(null);
    setSyncStatus("idle");
    setSyncLog([]);
    localStorage.removeItem("gdrive_user");
    localStorage.removeItem("gdrive_token");
    localStorage.removeItem("gdrive_db_file");
    showSuccess("Koneksi Google Drive diputuskan.");
  };

  async function refreshDriveStats(token: string) {
    try {
      // 1. Search database file
      const q = encodeURIComponent(`'${gdriveFolderId}' in parents and name = 'goa_lawah_db.json' and trashed = false`);
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,size)`;
      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!searchRes.ok) throw new Error("Gagal memeriksa berkas");
      const searchData = await searchRes.json();
      const file = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;
      setDbFileOnDrive(file);
      if (file) {
        localStorage.setItem("gdrive_db_file", JSON.stringify(file));
      } else {
        localStorage.removeItem("gdrive_db_file");
      }
      
      let initialLog = [];
      if (file) {
        initialLog.push(`Ditemukan berkas database backup di Google Drive (ID: ${file.id}, Ukuran: ${(file.size / 1024).toFixed(1)} KB).`);
      } else {
        initialLog.push("Belum ditemukan backup database goa_lawah_db.json di folder Drive.");
      }

      setSyncLog(prev => [...prev, ...initialLog]);

      // 2. List all files in the folder
      const listQ = encodeURIComponent(`'${gdriveFolderId}' in parents and trashed = false`);
      const listUrl = `https://www.googleapis.com/drive/v3/files?q=${listQ}&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,size)`;
      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        setGdriveFiles(listData.files || []);
      }
    } catch (e: any) {
      console.error("Error checking drive status:", e);
      setSyncLog(prev => [...prev, `Kesalahan saat membaca folder: ${e.message}`]);
    }
  }

  const handlePullDriveDatabase = async () => {
    if (!gdriveToken || !dbFileOnDrive) return;
    if (!window.confirm("Apakah Anda yakin ingin mengunduh database dari Google Drive? Tindakan ini akan sepenuhnya menimpa seluruh data website saat ini (booking, saran, statistik, konfigurasi) dengan cadangan di awan.")) {
      return;
    }

    setSyncStatus("syncing");
    setSyncLog(prev => [...prev, "Mulai proses pengunduhan berkas cadangan..."]);
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${dbFileOnDrive.id}?alt=media`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${gdriveToken}` }
      });
      if (!res.ok) throw new Error("Unduhan berkas dari Google Drive gagal.");
      
      const importedDatabase = await res.json();
      setSyncLog(prev => [...prev, "Data cadangan diunduh dengan sukses. Menyimpan data ke server lokal..."]);
      
      const saveRes = await fetch("/api/admin/database-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importedDatabase })
      });
      if (!saveRes.ok) {
        const errData = await saveRes.json();
        throw new Error(errData.error || "Gagal mengimpor ke database server.");
      }
      
      setSyncLog(prev => [...prev, "Sukses! Database web lokal berhasil diperbarui dan disinkronkan."]);
      setSyncStatus("success");
      showSuccess("Sinkronisasi Berhasil! Seluruh data diperbarui.");
      
      // Temporarily bypass auto-sync during state repopulation
      isInitialLoaded.current = false;
      await fetchAdminData();
    } catch (e: any) {
      console.error("Import error", e);
      setSyncLog(prev => [...prev, `Gagal melakukan sinkronisasi masuk: ${e.message}`]);
      setSyncStatus("error");
    }
  };

  const handlePushDriveDatabase = async (silent = false) => {
    if (!gdriveToken) return;
    const actionText = dbFileOnDrive ? "MEMPERBARUI" : "MEMBUAT CADANGAN BARU";
    if (!silent) {
      if (!window.confirm(`Apakah Anda yakin ingin ${actionText} database di Google Drive dengah seluruh data website saat ini?`)) {
        return;
      }
      setSyncStatus("syncing");
      setSyncLog(prev => [...prev, "Mengekstrak data website dari database lokal..."]);
    }
    try {
      const resExport = await fetch("/api/admin/database-export");
      if (!resExport.ok) throw new Error("Gagal mentransfer data lokal.");
      const exportJson = await resExport.json();
      const fullDatabase = exportJson.database;
      
      if (!silent) {
        setSyncLog(prev => [...prev, "Berkas dikompilasi. Mengirimkan ke Google Drive..."]);
      }
      
      if (dbFileOnDrive) {
        // Update
        if (!silent) {
          setSyncLog(prev => [...prev, "Menimpa berkas database lama di Google Drive..."]);
        }
        const blob = new Blob([JSON.stringify(fullDatabase, null, 2)], { type: "application/json" });
        const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${dbFileOnDrive.id}?uploadType=media`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${gdriveToken}`,
            "Content-Type": "application/json"
          },
          body: blob
        });
        if (!uploadRes.ok) throw new Error("Gagal mengunggah penimpaan database.");
        if (!silent) {
          setSyncLog(prev => [...prev, "Sinkronisasi berhasil! Berkas cadangan yang ada telah diperbarui."]);
        }
      } else {
        // Create
        if (!silent) {
          setSyncLog(prev => [...prev, "Menyusun metadata berkas cadangan baru..."]);
        }
        const metadata = {
          name: "goa_lawah_db.json",
          parents: [gdriveFolderId],
          mimeType: "application/json"
        };
        const form = new FormData();
        form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
        form.append("file", new Blob([JSON.stringify(fullDatabase, null, 2)], { type: "application/json" }));
        
        const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gdriveToken}`
          },
          body: form
        });
        if (!uploadRes.ok) throw new Error("Gagal membuat dan mentransmisi berkas baru.");
        const uploadData = await uploadRes.json();
        if (!silent) {
          setSyncLog(prev => [...prev, `Sukses! Berkas dibuat dengan ID: ${uploadData.id}`]);
        }
      }
      
      if (!silent) {
        setSyncStatus("success");
        showSuccess("Database berhasil dicadangkan ke Google Drive!");
      } else {
        console.log("Auto-backup GDrive berhasil.");
      }
      
      // Refresh listing
      await refreshDriveStats(gdriveToken);
    } catch (e: any) {
      console.error("Export error", e);
      if (!silent) {
        setSyncLog(prev => [...prev, `Gagal melakukan sinkronisasi keluar: ${e.message}`]);
        setSyncStatus("error");
      }
    }
  };

  const [customViewDate, setCustomViewDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [customViewCount, setCustomViewCount] = useState<number>(10);
  const [isUpdatingViews, setIsUpdatingViews] = useState(false);

  const handleResetViews = async () => {
    if (!window.confirm("Apakah Anda yakin ingin me-reset semua data kunjungan menjadi 0? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }
    
    try {
      const res = await fetch("/api/admin/reset-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error("Gagal mereset statistik");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        showSuccess("Data kunjungan biolink berhasil di-reset ke 0!");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mereset data");
    }
  };

  const handleUpdateViews = async () => {
    if (!customViewDate) {
      setErrorMsg("Tanggal wajib diisi");
      return;
    }
    setIsUpdatingViews(true);
    try {
      const res = await fetch("/api/admin/update-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: customViewDate, count: customViewCount })
      });
      if (!res.ok) throw new Error("Gagal memperbarui kunjungan harian");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        showSuccess(`Berhasil memperbarui statistik kunjungan untuk ${customViewDate}!`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memperbarui data");
    } finally {
      setIsUpdatingViews(false);
    }
  };

  const handleDownloadExcelRecap = () => {
    if (!stats) return;
    
    let csvContent = "\uFEFF"; // Byte Order Mark for Excel UTF-8
    
    // Header Section
    csvContent += "REKAPITULASI LAPORAN DESA WISATA LEBAH SEMPAGE\n";
    csvContent += `Tanggal Cetak;${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}\n`;
    csvContent += "\n";
    
    // Ringkasan Utama
    csvContent += "RINGKASAN STATISTIK UTAMA\n";
    csvContent += `Kategori;Nilai;Keterangan\n`;
    csvContent += `Total Kunjungan Biolink;${stats.totalViews};Total klik views\n`;
    csvContent += `Total Pesanan E-Ticket;${stats.totalBookings};Daftar booking aktif\n`;
    csvContent += `Estimasi Inkasso (Onsite);Rp ${stats.totalRevenue.toLocaleString("id-ID")};Berdasarkan booking harian/pax\n`;
    csvContent += "\n";

    // Kunjungan Harian Biolink
    csvContent += "LAPORAN KUNJUNGAN HARIAN BIOLINK\n";
    csvContent += "Tanggal;Jumlah Kunjungan\n";
    const entries = Object.entries(stats.viewsCount || {}).sort();
    if (entries.length > 0) {
      entries.forEach(([date, count]) => {
        csvContent += `${date};${count}\n`;
      });
    } else {
      csvContent += "-;Belum ada data kunjungan\n";
    }
    csvContent += "\n";

    // Data registrasi pemesanan E-Ticket
    csvContent += "DAFTAR PENDAFTARAN PESANAN E-TICKET\n";
    csvContent += "ID Booking;Nama Lengkap;WhatsApp;Email;Tipe Wisata;Tanggal Kunjung;Jumlah Pax;Durasi Malam;Total Bayar;Status Pembayaran\n";
    
    if (bookings && bookings.length > 0) {
      bookings.forEach((b) => {
        const totalFormatted = b.totalPrice ? `Rp ${b.totalPrice.toLocaleString("id-ID")}` : "Rp 0";
        csvContent += `${b.id || ""};${b.name || ""};${b.whatsapp || ""};${b.email || ""};${b.visitType || ""};${b.checkInDate || ""};${b.numPeople || 0};${b.numNights || 0};${totalFormatted};${b.paymentStatus || "pending"}\n`;
      });
    } else {
      csvContent += "-;-;-;-;-;-;-;-;-;-\n";
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Rekap_Laporan_Wisata_Lebah_Sempage_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Laporan Rekapitulasi Excel/CSV Berhasil Diunduh!");
  };

  const handleDownloadTicketsExcel = () => {
    if (!bookings || bookings.length === 0) {
      alert("Tidak ada data pemesan e-ticket untuk diunduh!");
      return;
    }
    
    let csvContent = "\uFEFF"; // Byte Order Mark for Excel UTF-8
    
    // Header Section
    csvContent += "LOG DATA REKAPITULASI LENGKAP PEMESAN E-TICKET\n";
    csvContent += "Desa Wisata Lebah Sempage - Narmada\n";
    csvContent += `Tanggal Cetak;${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}\n`;
    csvContent += "\n";
    
    // Table Headers
    csvContent += "No;Kode Booking;Tanggal Pemesanan;Nama Pelanggan;WhatsApp;Email;Kategori Wisata;Tanggal Check-In;Tanggal Check-Out;Durasi (Malam);Jumlah Pax/Orang;Jumlah Motor;Jumlah Mobil;Sewa Tenda (Qty);Sewa Sleeping Bag (Qty);Sewa Matras (Qty);Sewa Kayu Bakar (Qty);Sewa Alat Lain (Detail);Metode Pembayaran;Total Biaya;Status Pembayaran\n";
    
    bookings.forEach((b, index) => {
      const num = index + 1;
      const bCode = b.bookingCode || b.id || "";
      const createdAtStr = b.createdAt ? new Date(b.createdAt).toLocaleDateString("id-ID") : "-";
      const nameStr = b.name ? b.name.replace(/;/g, ",") : "";
      const whatsappStr = b.whatsapp ? `'${b.whatsapp}` : "";
      const emailStr = b.email ? b.email.replace(/;/g, ",") : "";
      const visitTypeStr = b.visitType === "camping" ? "Camping" : "Kunjungan Harian";
      const checkInStr = b.checkInDate || "-";
      const checkOutStr = b.checkOutDate || "-";
      const nightsStr = b.visitType === "camping" ? (b.numNights || 1) : "-";
      const paxStr = b.numPeople || 0;
      const motorStr = b.numMotorcycles || 0;
      const carStr = b.numCars || 0;
      
      const rentals = b.rentals || ({} as any);
      const rentTent = rentals.tent || 0;
      const rentSB = rentals.sleepingBag || 0;
      const rentMatras = rentals.matras || 0;
      const rentWood = rentals.wood || rentals.firewood || 0;
      
      const knownKeys = ["tent", "sleepingBag", "matras", "firewood"];
      const customRentalsList: string[] = [];
      Object.entries(rentals).forEach(([key, val]) => {
        if (!knownKeys.includes(key) && Number(val) > 0) {
          const dbItem = settings?.rentalItems?.find(it => it.id === key);
          const iName = dbItem ? dbItem.name : key;
          customRentalsList.push(`${iName}: ${val} unit`);
        }
      });
      const customRentalsStr = customRentalsList.length > 0 ? customRentalsList.join(", ") : "-";
      
      const paymentMethodStr = b.paymentMethod === "tunai" ? "Tunai / Bayar Di Tempat" : "QRIS Non-Tunai";
      const totalFormatted = b.totalPrice ? `Rp ${b.totalPrice.toLocaleString("id-ID")}` : "Rp 0";
      const paymentStatusStr = b.paymentStatus || "Belum Bayar";
      
      csvContent += `${num};${bCode};${createdAtStr};${nameStr};${whatsappStr};${emailStr};${visitTypeStr};${checkInStr};${checkOutStr};${nightsStr};${paxStr};${motorStr};${carStr};${rentTent};${rentSB};${rentMatras};${rentWood};${customRentalsStr};${paymentMethodStr};${totalFormatted};${paymentStatusStr}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Akurasi_Pemesanan_E-Ticket_Lengkap_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Laporan Lengkap E-Ticket Berhasil Diunduh!");
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (settings) {
      setTicketPrices({
        priceCampingPerson: settings.priceCampingPerson || 10000,
        priceCampingMotorcycle: settings.priceCampingMotorcycle || 5000,
        priceCampingCar: settings.priceCampingCar || 10000,
        priceVisitPerson: settings.priceVisitPerson || 5000,
        priceVisitMotorcycle: settings.priceVisitMotorcycle || 0,
        priceVisitCar: settings.priceVisitCar || 0
      });

      // Default rental items fallback
      const defaultRentals = [
        { id: "tent", name: "Tenda Dome", price: settings.rentalPrices?.tent || 50000 },
        { id: "sleepingBag", name: "Sleeping Bag", price: settings.rentalPrices?.sleepingBag || 10000 },
        { id: "matras", name: "Matras Alas", price: settings.rentalPrices?.matras || 5000 },
        { id: "firewood", name: "Kayu Api Unggun", price: settings.rentalPrices?.firewood || 10000 }
      ];
      setRentalItems(settings.rentalItems || defaultRentals);

      // Default form fields fallback
      const defaultFields = [
        { id: "name", label: "Nama Lengkap", placeholder: "Contoh: Budi Santoso", type: "text", required: true, isDefault: true },
        { id: "whatsapp", label: "Nomor WhatsApp", placeholder: "62812345xxxx", type: "tel", required: true, isDefault: true },
        { id: "email", label: "Alamat Email", placeholder: "namakamu@domain.com", type: "email", required: true, isDefault: true }
      ];
      setFormFields(settings.formFields || defaultFields);
      setETicketActive(settings.eTicketActive !== false);
    }
  }, [settings]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard-data");
      if (!res.ok) throw new Error("Gagal mengambil data admin.");
      const data = await res.json();
      setStats(data.stats);
      setBookings(data.bookings);
      setFeedbacks(data.feedbacks);
      setSettings(data.settings);
      setAdminsList(data.adminsList);
      setGallery(data.gallery);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadLocalDbJSON = async () => {
    try {
      const resExport = await fetch("/api/admin/database-export");
      if (!resExport.ok) throw new Error("Gagal mengekspor data.");
      const data = await resExport.json();
      
      const blob = new Blob([JSON.stringify(data.database, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "db.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess("File db.json berhasil diunduh ke komputer Anda!");
    } catch (err: any) {
      showError("Gagal mengunduh db.json: " + err.message);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 5000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, targetSetter: (b64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          targetSetter(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Logo save
  const handleSaveLogo = async () => {
    if (!newLogoBase64) return;
    try {
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "logo", base64Data: newLogoBase64 })
      });
      if (!res.ok) throw new Error("Gagal memperbarui Logo.");
      const data = await res.json();
      setSettings(data.settings);
      setNewLogoBase64("");
      showSuccess("Logo Berhasil Diperbarui!");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Remove logo to default
  const handleDeleteLogo = () => {
    setNewLogoBase64("");
    if (settings) {
      const updated = { ...settings, logoUrl: "/src/assets/images/goa_lawah_logo_1781677843742.jpg" };
      saveSpecificSettings(updated, "Logo dikembalikan ke default");
    }
  };

  // 2. Settings update (WhatsApp, Youtube, Social Links, Maps)
  const handleSaveLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const normalizedYoutube = getYouTubeEmbedUrl(settings.youtubeUrl);
      const updatedSettings = { ...settings, youtubeUrl: normalizedYoutube };
      
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updatedSettings })
      });
      if (!res.ok) throw new Error("Gagal menyimpan tautan.");
      const data = await res.json();
      setSettings(data.settings);
      showSuccess("Semua Tautan Sosmed, Maps, & Youtube Berhasil Disimpan!");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const saveSpecificSettings = async (updatedSettings: AdminSettings, message: string) => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updatedSettings })
      });
      if (!res.ok) throw new Error("Gagal mengupdate.");
      const data = await res.json();
      setSettings(data.settings);
      showSuccess(message);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // 2b. Save whole ticket form, custom fields, and rental items edits
  const handleSaveTicketFormEdit = async () => {
    if (!settings) return;
    setLoading(true);
    try {
      const updatedRentalPrices = { ...settings.rentalPrices };
      rentalItems.forEach(item => {
        updatedRentalPrices[item.id] = item.price;
      });

      const updatedSettings = {
        ...settings,
        ...ticketPrices,
        rentalPrices: updatedRentalPrices,
        rentalItems,
        formFields,
        eTicketActive
      };

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updatedSettings })
      });

      if (!res.ok) throw new Error("Gagal menyimpan informasi form e-ticket.");
      const data = await res.json();
      setSettings(data.settings);
      showSuccess("Semua perubahan informasi form E-Ticket berhasil disimpan!");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan informasi form e-ticket.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) {
      alert("Nama label bidang harus diisi!");
      return;
    }
    const customId = "custom_" + Math.random().toString(36).substr(2, 9);
    const newField = {
      id: customId,
      label: newFieldName,
      placeholder: newFieldPlaceholder || "Masukkan " + newFieldName,
      type: newFieldType,
      required: newFieldRequired,
      isDefault: false
    };
    setFormFields([...formFields, newField]);
    setNewFieldName("");
    setNewFieldPlaceholder("");
    setNewFieldType("text");
    setNewFieldRequired(false);
  };

  const handleDeleteCustomField = (id: string) => {
    setFormFields(formFields.filter(f => f.id !== id));
  };

  const handleAddCustomRental = () => {
    if (!newRentalName.trim()) {
      alert("Nama alat sewa harus diisi!");
      return;
    }
    const customId = "rent_" + Math.random().toString(36).substr(2, 9);
    const newRental = {
      id: customId,
      name: newRentalName,
      price: newRentalPrice
    };
    setRentalItems([...rentalItems, newRental]);
    setNewRentalName("");
    setNewRentalPrice(0);
  };

  const handleDeleteCustomRental = (id: string) => {
    setRentalItems(rentalItems.filter(r => r.id !== id));
  };

  // 3. Save media images (ticket info, camping rental, Qris)
  const handleSaveMedia = async (target: "ticket" | "camping" | "payment", base64: string, setB64: (v: string) => void) => {
    if (!base64) return;
    try {
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, base64Data: base64 })
      });
      if (!res.ok) throw new Error("Gagal mengunggah foto.");
      const data = await res.json();
      setSettings(data.settings);
      setB64("");
      showSuccess(`Foto ${target === "ticket" ? "Info Tiket" : target === "camping" ? "Alat Camping" : "Pembayaran"} Berhasil Diunggah!`);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // 4. Save Text Content Texts
  const handleSaveTexts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const res = await fetch("/api/admin/texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentTexts: settings.contentTexts })
      });
      if (!res.ok) throw new Error("Gagal memperbarui teks konten.");
      const data = await res.json();
      setSettings(data.settings);
      showSuccess("Teks Halaman Utama Berhasil Diperbarui!");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // 5. Add photo to activities gallery
  const handleAddGallery = async () => {
    if (!galleryBase64) {
      setErrorMsg("Mohon pilih foto untuk ditambahkan ke galeri");
      return;
    }
    try {
      const res = await fetch("/api/admin/gallery/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Data: galleryBase64, title: galleryTitle })
      });
      if (!res.ok) throw new Error("Gagal menambahkan galeri.");
      const data = await res.json();
      setGallery(data.gallery);
      setGalleryBase64("");
      setGalleryTitle("");
      showSuccess("Foto berhasil ditambahkan ke Galeri Kegiatan!");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Delete photo from gallery
  const handleDeleteGallery = async (id: string) => {
    if (!confirm("Hapus foto ini dari galeri?")) return;
    try {
      const res = await fetch("/api/admin/gallery/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error("Gagal menghapus galeri.");
      const data = await res.json();
      setGallery(data.gallery);
      showSuccess("Foto galeri dihapus!");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // 6. Delete feedback message
  const handleDeleteFeedback = async (id: string) => {
    if (!confirm("Hapus saran/masukan ini secara permanen?")) return;
    try {
      const res = await fetch("/api/admin/feedback/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error("Gagal menghapus.");
      const data = await res.json();
      setFeedbacks(data.feedbacks);
      showSuccess("Saran masukan terhapus!");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Download Receipt (.jpg) template generator using HTML5 Canvas
  const handleDownloadReceiptJPG = (booking: Booking) => {
    const canvas = document.createElement("canvas");
    canvas.width = 620;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Draw elegant bright, fresh minty/cream gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, "#f9fcf8");
    bgGrad.addColorStop(0.35, "#f3fbf2");
    bgGrad.addColorStop(0.75, "#e9f5e9");
    bgGrad.addColorStop(1, "#f1f8f1");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Beautiful custom ticket side-cut/notched borders filled with pure white
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(20, 245, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(600, 245, 14, 0, Math.PI * 2);
    ctx.fill();

    // Redraw the deep green borders avoiding the notches
    ctx.strokeStyle = "#1b4332";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // Top border
    ctx.moveTo(20, 20);
    ctx.lineTo(600, 20);
    // Right border down to notch
    ctx.lineTo(600, 231);
    // Right notch curve
    ctx.arc(600, 245, 14, -Math.PI / 2, Math.PI / 2, true);
    // Right border down
    ctx.lineTo(600, 980);
    // Bottom border
    ctx.lineTo(20, 980);
    // Left border up to notch
    ctx.lineTo(20, 259);
    // Left notch curve
    ctx.arc(20, 245, 14, Math.PI / 2, -Math.PI / 2, true);
    // Left border back to top-left
    ctx.lineTo(20, 20);
    ctx.closePath();
    ctx.stroke();

    // Draw inner thinner decorative border in semi-transparent light green
    ctx.strokeStyle = "rgba(45, 106, 79, 0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

    // 3. Header Texts
    ctx.textAlign = "center";
    ctx.fillStyle = "#2d6a4f"; // Emerald green
    ctx.font = "bold 12px monospace";
    ctx.fillText("E-TICKET RESMI", 310, 65);

    ctx.fillStyle = "#1b4332"; // Deep forest green
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("WISATA GOA LAWAH", 310, 105);

    ctx.fillStyle = "#52796f"; // Soft sage green
    ctx.font = "12px sans-serif";
    ctx.fillText("Pokdarwis Goa Lawah - Narmada - Lombok Barat", 310, 130);

    // Header divider line
    ctx.strokeStyle = "rgba(45, 106, 79, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 150);
    ctx.lineTo(560, 150);
    ctx.stroke();

    // 4. Booking Code Highlight Card (Bright mint backdrop + forest green text)
    ctx.fillStyle = "#d8f3dc"; // fresh pale mint green
    ctx.fillRect(160, 168, 300, 52);
    ctx.strokeStyle = "#40916c";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(160, 168, 300, 52);

    ctx.fillStyle = "#2d6a4f";
    ctx.font = "10px monospace";
    ctx.fillText("KODE VERIFIKASI / BOOKING", 310, 185);

    ctx.fillStyle = "#1b4332";
    ctx.font = "bold 21px monospace";
    ctx.fillText(booking.bookingCode, 310, 210);

    // 5. Dashed Tear Line connecting the notches
    ctx.strokeStyle = "rgba(45, 106, 79, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(34, 245);
    ctx.lineTo(586, 245);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // 6. Travel Details List
    const details = [
      { label: "NAMA PELANGGAN", val: booking.name },
      { label: "NOMOR WHATSAPP", val: booking.whatsapp },
      { label: "EMAIL PENDAFTAR", val: booking.email || "-" },
      { label: "KATEGORI KUNJUNGAN", val: booking.visitType === "camping" ? "CAMPING PASS (MENGINAP)" : "KUNJUNGAN BIASA (HARIAN)" },
      { label: "TANGGAL CHECK-IN", val: booking.checkInDate },
    ];

    if (booking.visitType === "camping" && booking.checkOutDate) {
      details.push({ label: "TANGGAL CHECK-OUT", val: `${booking.checkOutDate} (${booking.numNights || 1} Malam)` });
    }
    details.push({ label: "JUMLAH PENGUNJUNG", val: `${booking.numPeople} Orang` });
    details.push({ label: "AKSES PARKIR", val: `${booking.numMotorcycles} Motor, ${booking.numCars} Mobil` });
    details.push({ label: "METODE PEMBAYARAN", val: (booking.paymentMethod || "QRIS").toUpperCase() });

    let curY = 285;
    details.forEach((item) => {
      // Label (Left alignment)
      ctx.textAlign = "left";
      ctx.font = "bold 10px sans-serif";
      ctx.fillStyle = "#52796f"; // Soft sage green label
      ctx.fillText(item.label, 60, curY);

      // Value (Right alignment)
      ctx.textAlign = "right";
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = "#1b4332"; // Elegant deep green value
      ctx.fillText(item.val || "-", 560, curY);

      // Grid Row Separator Line
      ctx.strokeStyle = "rgba(45, 106, 79, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, curY + 10);
      ctx.lineTo(560, curY + 10);
      ctx.stroke();

      curY += 36;
    });

    // 7. Costs / Items Details Section
    curY += 10;
    ctx.textAlign = "center";
    ctx.fillStyle = "#2d6a4f";
    ctx.font = "bold 11px monospace";
    ctx.fillText("RINCIAN BIAYA & INSTRUMEN", 310, curY);

    ctx.strokeStyle = "rgba(45, 106, 79, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, curY + 10);
    ctx.lineTo(560, curY + 10);
    ctx.stroke();
    curY += 28;

    // Calculate Prices
    const pricePerPerson = booking.visitType === "camping" 
      ? (settings?.priceCampingPerson || 10000) 
      : (settings?.priceVisitPerson || 5000);
    const ticketTotal = (booking.numPeople || 1) * pricePerPerson;

    const costItems = [
      { name: `Tiket Masuk (${booking.numPeople} Pengunjung)`, cost: ticketTotal }
    ];

    if (booking.visitType === "camping") {
      if (booking.numMotorcycles > 0) {
        costItems.push({ name: `Tiket Parkir Motor (x${booking.numMotorcycles})`, cost: booking.numMotorcycles * 5000 });
      }
      if (booking.numCars > 0) {
        costItems.push({ name: `Tiket Parkir Mobil (x${booking.numCars})`, cost: booking.numCars * 10000 });
      }
      if (booking.rentals) {
        const defaultRentals: { [key: string]: { name: string; price: number } } = {
          tent: { name: "Sewa Tenda Dome", price: settings?.rentalPrices?.tent || 50000 },
          sleepingBag: { name: "Sewa Sleeping Bag", price: settings?.rentalPrices?.sleepingBag || 10000 },
          matras: { name: "Sewa Matras Camp", price: settings?.rentalPrices?.matras || 5000 },
          firewood: { name: "Sewa Kayu Bakar Api Unggun", price: settings?.rentalPrices?.firewood || 10000 }
        };

        Object.entries(booking.rentals).forEach(([key, rawQty]) => {
          const qty = Number(rawQty) || 0;
          if (qty > 0) {
            const dbItem = settings?.rentalItems?.find(it => it.id === key);
            const name = dbItem ? `Sewa ${dbItem.name}` : (defaultRentals[key]?.name || `Sewa Alat (${key})`);
            const price = dbItem ? dbItem.price : (defaultRentals[key]?.price || 0);
            costItems.push({ name: `${name} (x${qty})`, cost: qty * price });
          }
        });
      }
    }

    costItems.forEach((item) => {
      ctx.textAlign = "left";
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#495057"; // dark gray text
      ctx.fillText(item.name, 60, curY);

      ctx.textAlign = "right";
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = "#1b4332";
      ctx.fillText(`Rp ${item.cost.toLocaleString("id-ID")}`, 560, curY);

      curY += 20;
    });

    // 8. Highlight Green Total Price Card Box (Bright pale green palette)
    curY += 12;
    ctx.fillStyle = "#d8f3dc"; // fresh solid light mint backdrop
    ctx.fillRect(50, curY, 520, 48);
    ctx.strokeStyle = "#52b788";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(50, curY, 520, 48);

    ctx.textAlign = "left";
    ctx.font = "bold 10px sans-serif";
    ctx.fillStyle = "#2d6a4f";
    ctx.fillText("TOTAL PEMBAYARAN AKHIR", 65, curY + 28);

    ctx.textAlign = "right";
    ctx.font = "bold 18px monospace";
    ctx.fillStyle = "#0f5132"; // Rich dark emerald
    ctx.fillText(`Rp ${booking.totalPrice.toLocaleString("id-ID")}`, 540, curY + 30);

    curY += 75;

    // 9. QR Code Verification (Deterministic mock built-in renderer!)
    // Draw QR Box at (70, curY)
    const qrSize = 100;
    const qrX = 80;
    const qrY = curY;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.strokeStyle = "#40916c";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);

    const pad = 10;
    const innerSize = qrSize - pad * 2;
    const modules = 21;
    const mSize = Math.floor(innerSize / modules);
    const startX = qrX + pad;
    const startY = qrY + pad;

    const drawFinder = (fx: number, fy: number) => {
      ctx.fillStyle = "#1b4332"; // Deep green finder modules
      ctx.fillRect(fx, fy, 7 * mSize, 7 * mSize);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(fx + mSize, fy + mSize, 5 * mSize, 5 * mSize);
      ctx.fillStyle = "#1b4332";
      ctx.fillRect(fx + 2 * mSize, fy + 2 * mSize, 3 * mSize, 3 * mSize);
    };

    drawFinder(startX, startY);
    drawFinder(startX + (modules - 7) * mSize, startY);
    drawFinder(startX, startY + (modules - 7) * mSize);

    let seed = 12345;
    for (let s = 0; s < booking.bookingCode.length; s++) {
      seed += booking.bookingCode.charCodeAt(s) * (s + 7);
    }
    const pseudoRand = () => {
      const v = Math.sin(seed++) * 10000;
      return v - Math.floor(v);
    };

    ctx.fillStyle = "#1b4332"; // Deep forest green code modules
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (r < 7 && c < 7) continue;
        if (r < 7 && c >= modules - 7) continue;
        if (r >= modules - 7 && c < 7) continue;
        if (r === 6 || c === 6) {
          if ((r + c) % 2 === 0) {
            ctx.fillRect(startX + c * mSize, startY + r * mSize, mSize, mSize);
          }
          continue;
        }
        if (pseudoRand() > 0.45) {
          ctx.fillRect(startX + c * mSize, startY + r * mSize, mSize, mSize);
        }
      }
    }

    // 10. Verification Red/Gold Wax Stamp on the right side
    const stampX = 350;
    const stampY = curY;

    ctx.save();
    ctx.translate(stampX + 90, stampY + 45);
    ctx.rotate(-12 * Math.PI / 180);

    const isPaid = booking.paymentStatus === "Lunas";
    const isValidation = booking.paymentStatus === "Menunggu Validasi";
    
    let primaryStampColor = "#c3002f"; // Belum bayar crimson
    let stampText = "BELUM BAYAR";
    if (isPaid) {
      primaryStampColor = "#0f5132"; // Forest green
      stampText = "LUNAS / PAID";
    } else if (isValidation) {
      primaryStampColor = "#d97706"; // Amber
      stampText = "VERIFIKASI";
    }

    ctx.strokeStyle = primaryStampColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-85, -28, 170, 56, 8);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-81, -24, 162, 48, 6);
    ctx.stroke();

    ctx.fillStyle = primaryStampColor;
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("POKDARWIS GOA LAWAH", 0, -12);

    ctx.font = "bold 15px sans-serif";
    ctx.fillText(stampText, 0, 8);

    ctx.font = "9px monospace";
    ctx.fillText("VERIFIED SECURE", 0, 20);
    ctx.restore();

    // 11. Footer legal terms/notices
    curY += 130;
    ctx.textAlign = "center";
    ctx.fillStyle = "#343a40"; // Dark charcoal notice
    ctx.font = "11px sans-serif";
    ctx.fillText("Simpan E-Ticket ini untuk ditunjukkan di loket masuk Goa Lawah", 310, curY);

    ctx.fillStyle = "#6c757d"; // Muted gray
    ctx.font = "9px monospace";
    ctx.fillText("Diproduksi secara otomatis oleh Sistem Pembayaran Resmi Goa Lawah", 310, curY + 20);
    ctx.fillText("© Pokdarwis Goa Lawah - Narmada - Lombok Barat", 310, curY + 32);

    // 12. Trigger JPEG download to user device representation
    const jpegUrl = canvas.toDataURL("image/jpeg", 0.95);
    const dLink = document.createElement("a");
    dLink.download = `E-Ticket-LebahSempage-${booking.bookingCode}.jpg`;
    dLink.href = jpegUrl;
    document.body.appendChild(dLink);
    dLink.click();
    document.body.removeChild(dLink);
  };

  // Draw canvas and return base64 for background email trigger
  const getReceiptCanvasBase64 = (booking: Booking): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 620;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, "#f9fcf8");
    bgGrad.addColorStop(0.35, "#f3fbf2");
    bgGrad.addColorStop(0.75, "#e9f5e9");
    bgGrad.addColorStop(1, "#f1f8f1");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(20, 245, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(600, 245, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#1b4332";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(600, 20);
    ctx.lineTo(600, 231);
    ctx.arc(600, 245, 14, -Math.PI / 2, Math.PI / 2, true);
    ctx.lineTo(600, 980);
    ctx.lineTo(20, 980);
    ctx.lineTo(20, 259);
    ctx.arc(20, 245, 14, Math.PI / 2, -Math.PI / 2, true);
    ctx.lineTo(20, 20);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = "rgba(45, 106, 79, 0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

    ctx.textAlign = "center";
    ctx.fillStyle = "#2d6a4f";
    ctx.font = "bold 12px monospace";
    ctx.fillText("E-TICKET RESMI", 310, 65);

    ctx.fillStyle = "#1b4332";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("WISATA GOA LAWAH", 310, 105);

    ctx.fillStyle = "#52796f";
    ctx.font = "12px sans-serif";
    ctx.fillText("Pokdarwis Goa Lawah - Narmada - Lombok Barat", 310, 130);

    ctx.strokeStyle = "rgba(45, 106, 79, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 150);
    ctx.lineTo(560, 150);
    ctx.stroke();

    ctx.fillStyle = "#d8f3dc";
    ctx.fillRect(160, 168, 300, 52);
    ctx.strokeStyle = "#40916c";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(160, 168, 300, 52);

    ctx.fillStyle = "#2d6a4f";
    ctx.font = "10px monospace";
    ctx.fillText("KODE VERIFIKASI / BOOKING", 310, 185);

    ctx.fillStyle = "#1b4332";
    ctx.font = "bold 21px monospace";
    ctx.fillText(booking.bookingCode, 310, 210);

    ctx.strokeStyle = "rgba(45, 106, 79, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(34, 245);
    ctx.lineTo(586, 245);
    ctx.stroke();
    ctx.setLineDash([]);

    const details = [
      { label: "NAMA PELANGGAN", val: booking.name },
      { label: "NOMOR WHATSAPP", val: booking.whatsapp },
      { label: "EMAIL PENDAFTAR", val: booking.email || "-" },
      { label: "KATEGORI KUNJUNGAN", val: booking.visitType === "camping" ? "CAMPING PASS (MENGINAP)" : "KUNJUNGAN BIASA (HARIAN)" },
      { label: "TANGGAL CHECK-IN", val: booking.checkInDate },
    ];

    if (booking.visitType === "camping" && booking.checkOutDate) {
      details.push({ label: "TANGGAL CHECK-OUT", val: `${booking.checkOutDate} (${booking.numNights || 1} Malam)` });
    }
    details.push({ label: "JUMLAH PENGUNJUNG", val: `${booking.numPeople} Orang` });
    details.push({ label: "AKSES PARKIR", val: `${booking.numMotorcycles} Motor, ${booking.numCars} Mobil` });
    details.push({ label: "METODE PEMBAYARAN", val: (booking.paymentMethod || "QRIS").toUpperCase() });

    let curY = 285;
    details.forEach((item) => {
      ctx.textAlign = "left";
      ctx.font = "bold 10px sans-serif";
      ctx.fillStyle = "#52796f";
      ctx.fillText(item.label, 60, curY);

      ctx.textAlign = "right";
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = "#1b4332";
      ctx.fillText(item.val || "-", 560, curY);

      ctx.strokeStyle = "rgba(45, 106, 79, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, curY + 10);
      ctx.lineTo(560, curY + 10);
      ctx.stroke();

      curY += 36;
    });

    curY += 10;
    ctx.textAlign = "center";
    ctx.fillStyle = "#2d6a4f";
    ctx.font = "bold 11px monospace";
    ctx.fillText("RINCIAN BIAYA & INSTRUMEN", 310, curY);

    ctx.strokeStyle = "rgba(45, 106, 79, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, curY + 10);
    ctx.lineTo(560, curY + 10);
    ctx.stroke();
    curY += 28;

    const pricePerPerson = booking.visitType === "camping" 
      ? (settings?.priceCampingPerson || 10000) 
      : (settings?.priceVisitPerson || 5000);
    const ticketTotal = (booking.numPeople || 1) * pricePerPerson;

    const costItems = [
      { name: `Tiket Masuk (${booking.numPeople} Pengunjung)`, cost: ticketTotal }
    ];

    if (booking.visitType === "camping") {
      if (booking.numMotorcycles > 0) {
        costItems.push({ name: `Tiket Parkir Motor (x${booking.numMotorcycles})`, cost: booking.numMotorcycles * 5000 });
      }
      if (booking.numCars > 0) {
        costItems.push({ name: `Tiket Parkir Mobil (x${booking.numCars})`, cost: booking.numCars * 10000 });
      }
      if (booking.rentals) {
        const defaultRentals: { [key: string]: { name: string; price: number } } = {
          tent: { name: "Sewa Tenda Dome", price: settings?.rentalPrices?.tent || 50000 },
          sleepingBag: { name: "Sewa Sleeping Bag", price: settings?.rentalPrices?.sleepingBag || 10000 },
          matras: { name: "Sewa Matras Camp", price: settings?.rentalPrices?.matras || 5000 },
          firewood: { name: "Sewa Kayu Bakar Api Unggun", price: settings?.rentalPrices?.firewood || 10000 }
        };

        Object.entries(booking.rentals).forEach(([key, rawQty]) => {
          const qty = Number(rawQty) || 0;
          if (qty > 0) {
            const dbItem = settings?.rentalItems?.find(it => it.id === key);
            const name = dbItem ? `Sewa ${dbItem.name}` : (defaultRentals[key]?.name || `Sewa Alat (${key})`);
            const price = dbItem ? dbItem.price : (defaultRentals[key]?.price || 0);
            costItems.push({ name: `${name} (x${qty})`, cost: qty * price });
          }
        });
      }
    }

    costItems.forEach((item) => {
      ctx.textAlign = "left";
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#495057";
      ctx.fillText(item.name, 60, curY);

      ctx.textAlign = "right";
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = "#1b4332";
      ctx.fillText(`Rp ${item.cost.toLocaleString("id-ID")}`, 560, curY);

      curY += 20;
    });

    curY += 12;
    ctx.fillStyle = "#d8f3dc";
    ctx.fillRect(50, curY, 520, 48);
    ctx.strokeStyle = "#52b788";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(50, curY, 520, 48);

    ctx.textAlign = "left";
    ctx.font = "bold 10px sans-serif";
    ctx.fillStyle = "#2d6a4f";
    ctx.fillText("TOTAL PEMBAYARAN AKHIR", 65, curY + 28);

    ctx.textAlign = "right";
    ctx.font = "bold 18px monospace";
    ctx.fillStyle = "#0f5132";
    ctx.fillText(`Rp ${booking.totalPrice.toLocaleString("id-ID")}`, 540, curY + 30);

    curY += 75;

    const qrSize = 100;
    const qrX = 80;
    const qrY = curY;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.strokeStyle = "#40916c";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);

    const pad = 10;
    const innerSize = qrSize - pad * 2;
    const modules = 21;
    const mSize = Math.floor(innerSize / modules);
    const startX = qrX + pad;
    const startY = qrY + pad;

    const drawFinder = (fx: number, fy: number) => {
      ctx.fillStyle = "#1b4332";
      ctx.fillRect(fx, fy, 7 * mSize, 7 * mSize);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(fx + mSize, fy + mSize, 5 * mSize, 5 * mSize);
      ctx.fillStyle = "#1b4332";
      ctx.fillRect(fx + 2 * mSize, fy + 2 * mSize, 3 * mSize, 3 * mSize);
    };

    drawFinder(startX, startY);
    drawFinder(startX + (modules - 7) * mSize, startY);
    drawFinder(startX, startY + (modules - 7) * mSize);

    let seed = 12345;
    for (let s = 0; s < booking.bookingCode.length; s++) {
      seed += booking.bookingCode.charCodeAt(s) * (s + 7);
    }
    const pseudoRand = () => {
      const v = Math.sin(seed++) * 10000;
      return v - Math.floor(v);
    };

    ctx.fillStyle = "#1b4332";
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (r < 7 && c < 7) continue;
        if (r < 7 && c >= modules - 7) continue;
        if (r >= modules - 7 && c < 7) continue;
        if (r === 6 || c === 6) {
          if ((r + c) % 2 === 0) {
            ctx.fillRect(startX + c * mSize, startY + r * mSize, mSize, mSize);
          }
          continue;
        }
        if (pseudoRand() > 0.45) {
          ctx.fillRect(startX + c * mSize, startY + r * mSize, mSize, mSize);
        }
      }
    }

    const stampX = 350;
    const stampY = curY;

    ctx.save();
    ctx.translate(stampX + 90, stampY + 45);
    ctx.rotate(-12 * Math.PI / 180);

    const isPaid = booking.paymentStatus === "Lunas";
    let primaryStampColor = "#d97706";
    let stampText = "MENUNGGU VALIDASI";
    if (isPaid) {
      primaryStampColor = "#0f5132";
      stampText = "LUNAS / PAID";
    } else if (booking.paymentStatus === "Belum Bayar" || !booking.paymentStatus) {
      if (booking.paymentMethod === "tunai") {
        primaryStampColor = "#c3002f";
        stampText = "BAYAR DI LOKET";
      } else {
        primaryStampColor = "#d97706";
        stampText = "MENUNGGU VERIFIKASI";
      }
    }

    ctx.strokeStyle = primaryStampColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-85, -28, 170, 56, 8);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-81, -24, 162, 48, 6);
    ctx.stroke();

    ctx.fillStyle = primaryStampColor;
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("POKDARWIS GOA LAWAH", 0, -12);

    ctx.font = "bold 13px sans-serif";
    ctx.fillText(stampText, 0, 8);

    ctx.font = "9px monospace";
    ctx.fillText("VERIFIED SECURE", 0, 20);
    ctx.restore();

    curY += 130;
    ctx.textAlign = "center";
    ctx.fillStyle = "#343a40";
    ctx.font = "11px sans-serif";
    ctx.fillText("Simpan E-Ticket ini untuk ditunjukkan di loket masuk Goa Lawah", 310, curY);

    ctx.fillStyle = "#6c757d";
    ctx.font = "9px monospace";
    ctx.fillText("Diproduksi secara otomatis oleh Sistem Pembayaran Resmi Goa Lawah", 310, curY + 20);
    ctx.fillText("© Pokdarwis Goa Lawah - Narmada - Lombok Barat", 310, curY + 32);

    return canvas.toDataURL("image/jpeg", 0.90);
  };

  const handleSendTicketEmail = async (booking: Booking) => {
    try {
      showSuccess("Sedang memproses & mengirim E-Ticket ke email pelanggan...");
      const ticketImageBase64 = getReceiptCanvasBase64(booking);
      const res = await fetch("/api/bookings/send-auto-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          ticketImageBase64
        })
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`E-Ticket berhasil dikirim ulang ke ${booking.email} via ${data.channel.toUpperCase()}`);
      } else {
        throw new Error(data.error || "Gagal mengirim email.");
      }
    } catch (err: any) {
      setErrorMsg("Gagal mengirim tiket ke email: " + err.message);
    }
  };

  // 7. Delete Booking entry
  const handleDeleteBooking = async (id: string) => {
    if (!confirm("Hapus pesanan tiket ini? (Tindakan ini tidak bisa dibatalkan)")) return;
    try {
      const res = await fetch("/api/admin/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error("Gagal menghapus.");
      const data = await res.json();
      setBookings(data.bookings);
      showSuccess("Booking tiket berhasil dihapus!");
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // 7b. Update Booking payment status
  const handleUpdateBookingStatus = async (id: string, newStatus: "Belum Bayar" | "Lunas" | "Menunggu Validasi") => {
    try {
      const res = await fetch("/api/admin/bookings/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, paymentStatus: newStatus })
      });
      if (!res.ok) throw new Error("Gagal mengubah status.");
      const data = await res.json();
      setBookings(data.bookings);
      
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking({ ...selectedBooking, paymentStatus: newStatus });
      }
      
      showSuccess("Status pembayaran berhasil diperbarui!");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // 8. Manage admin (update/create admin account)
  const handleManageAdmin = async (action: "edit" | "add") => {
    if (!adminUser || !adminPass) {
      setErrorMsg("Username dan Password tidak boleh kosong");
      return;
    }
    try {
      const res = await fetch("/api/admin/manage-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, username: adminUser, password: adminPass, oldUsername })
      });
      if (!res.ok) throw new Error("Operasi kelola admin gagal.");
      const data = await res.json();
      setAdminsList(data.adminsList);
      setAdminUser("");
      setAdminPass("");
      showSuccess(action === "edit" ? "Akun Admin Berhasil Diubah!" : "Admin Baru Berhasil Ditambahkan!");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Pure SVG Line Graph for statistics Views over last 7 days
  const renderViewsChart = () => {
    if (!stats || !stats.viewsCount) return null;
    const entries: [string, number][] = Object.entries(stats.viewsCount)
      .map(([date, count]) => [date, Number(count)] as [string, number])
      .sort();
    if (entries.length === 0) return <p className="text-xs text-neutral-500 italic">Belum ada statistik kunjungan</p>;

    const maxVal = Math.max(...entries.map(([_, count]) => count), 10);
    const width = 500;
    const height = 150;
    const padding = 25;

    // Calculate coordinates
    const points = entries.map(([date, count], index) => {
      const x = padding + (index * (width - padding * 2)) / (entries.length - 1 || 1);
      const y = height - padding - (count / maxVal) * (height - padding * 2);
      return { x, y, date, count };
    });

    const pathData = points.reduce((acc, p, idx) => {
      return acc + `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`;
    }, "");

    return (
      <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 block">Grafik Kunjungan Harian (7 Hari Terakhir)</h4>
        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px] h-36">
            {/* Grid horizontal lines */}
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={theme === "light" ? "#d8d7cf" : "#333"} strokeWidth="1" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke={theme === "light" ? "#e9e8e2" : "#222"} strokeWidth="1" strokeDasharray="3 3" />
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke={theme === "light" ? "#e9e8e2" : "#222"} strokeWidth="1" strokeDasharray="3 3" />

            {/* Area under the line */}
            {points.length > 0 && (
              <path
                d={`${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
                fill="url(#emeraldGrad)"
                className="opacity-20"
              />
            )}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* The actual stroke line */}
            <path d={pathData} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Circles and texts on data nodes */}
            {points.map((p, idx) => (
              <g key={idx}>
                <circle cx={p.x} cy={p.y} r="4" fill="#34d399" className="shadow-lg" />
                <text x={p.x} y={p.y - 8} fill="#34d399" fontSize="9" textAnchor="middle" fontWeight="bold">
                  {p.count}
                </text>
                <text x={p.x} y={height - 8} fill={theme === "light" ? "#7d7d70" : "#666"} fontSize="8" textAnchor="middle">
                  {p.date.slice(8, 10)}/{p.date.slice(5, 7)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-neutral-950 rounded-3xl min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-neutral-400 mt-4 animate-pulse">Menghubungkan ke database...</p>
      </div>
    );
  }

  return (
    <div className={`admin-panel ${theme === "light" ? "admin-theme-light" : "admin-theme-dark"} flex flex-col md:flex-row min-h-[500px] bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl text-left`}>
      <style>{`
        /* Dynamic Theme Overrides for Admin Panel */
        .admin-theme-light {
          background-color: #fcfbfa !important;
          border-color: #e5e5dd !important;
          color: #1a1a14 !important;
        }
        .admin-theme-light .bg-neutral-950 {
          background-color: #f5f4ef !important;
          border-color: #e2e2d8 !important;
        }
        .admin-theme-light .bg-neutral-900 {
          background-color: #fafaf7 !important;
          border-color: #e2e2d8 !important;
        }
        .admin-theme-light .bg-neutral-900\\/60 {
          background-color: #fafaf7 !important;
        }
        .admin-theme-light .bg-neutral-800 {
          background-color: #e9e8e2 !important;
          color: #1a1a14 !important;
          border-color: #d8d7cf !important;
        }
        .admin-theme-light .bg-neutral-800:hover {
          background-color: #dfded7 !important;
        }
        .admin-theme-light .border-neutral-800 {
          border-color: #e2e2d8 !important;
        }
        .admin-theme-light .border-neutral-800\\/80 {
          border-color: #e2e2d8 !important;
        }
        .admin-theme-light .border-b,
        .admin-theme-light .border-r,
        .admin-theme-light .pb-4,
        .admin-theme-light .pb-3,
        .admin-theme-light .border-t,
        .admin-theme-light .divide-y > * {
          border-color: #e2e2d8 !important;
        }
        .admin-theme-light .text-white {
          color: #1a1a14 !important;
        }
        .admin-theme-light .text-neutral-200 {
          color: #2b2b20 !important;
        }
        .admin-theme-light .text-neutral-300 {
          color: #3d3d32 !important;
        }
        .admin-theme-light .text-neutral-400 {
          color: #5a5a4e !important;
        }
        .admin-theme-light .text-neutral-500 {
          color: #8c8c7c !important;
        }
        .admin-theme-light input,
        .admin-theme-light select,
        .admin-theme-light textarea {
          background-color: #ffffff !important;
          color: #1a1a14 !important;
          border-color: #d8d7cf !important;
        }
        .admin-theme-light input::placeholder,
        .admin-theme-light textarea::placeholder {
          color: #aaa9a0 !important;
        }
        .admin-theme-light button:not(.bg-emerald-500):not(.bg-rose-600):not(.bg-rose-950\\/40):hover {
          background-color: #e9e8e2 !important;
          color: #1a1a14 !important;
        }
        .admin-theme-light tr:hover {
          background-color: #edece5 !important;
        }
        .admin-theme-light .bg-emerald-950\\/50 {
          background-color: #ecfdf5 !important;
          border-color: #10b981 !important;
          color: #065f46 !important;
        }
        .admin-theme-light .text-emerald-400 {
          color: #047857 !important;
        }
        .admin-theme-light .bg-rose-950\\/40 {
          background-color: #fef2f2 !important;
          color: #991b1b !important;
        }
        .admin-theme-light .text-rose-400 {
          color: #b91c1c !important;
        }
        .admin-theme-light .bg-[#232323],
        .admin-theme-light .bg-neutral-900\\/50 {
          background-color: #ecebe5 !important;
        }
      `}</style>

      {/* Side menus panel - LEFT */}
      <div className="w-full md:w-64 bg-neutral-950 border-r border-neutral-800 p-4 shrink-0 flex flex-col justify-between md:min-h-[600px]">
        <div>
          {/* Header */}
          <div className="pb-4 mb-4 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="text-xs text-emerald-400 font-bold uppercase tracking-widest">SISTEM KELOLA</div>
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-neutral-700/60 shadow-sm"
                title={theme === "dark" ? "Ubah ke Mode Terang (Light Mode)" : "Ubah ke Mode Gelap (Dark Mode)"}
              >
                {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
            </div>
            <h4 className="font-display font-semibold text-white tracking-wide mt-1">Admin Desa Wisata</h4>
            <p className="text-[10px] text-neutral-500 mt-1">Logged as: {adminName}</p>
          </div>

          {/* Tab lists */}
          <nav className="space-y-1.5 relative">
            <motion.button
              whileHover={{ x: 4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => setActiveTab("stats")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "stats" ? "bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/15" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" /> Statistik Pengunjung
            </motion.button>

            <motion.button
              whileHover={{ x: 4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => setActiveTab("tickets")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "tickets" ? "bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/15" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Ticket className="w-4 h-4 shrink-0" /> Pesan E-Ticket
              </span>
              <span className="bg-neutral-800 text-neutral-300 text-[9px] px-2 py-0.5 rounded-full font-bold">
                {bookings.length}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ x: 4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => setActiveTab("ticket_form_edit")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "ticket_form_edit" ? "bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/15" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4 shrink-0 mt-0.5 text-[#a3a3a3]" /> Edit Form E-Ticket
            </motion.button>

            <motion.button
              whileHover={{ x: 4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => setActiveTab("logo")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "logo" ? "bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/15" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <Image className="w-4 h-4 shrink-0" /> Ganti Logo Destinasi
            </motion.button>

            <motion.button
              whileHover={{ x: 4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => setActiveTab("saran")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "saran" ? "bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/15" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 shrink-0" /> Kelola Saran & Kritik
              </span>
              <span className="bg-neutral-800 text-neutral-300 text-[9px] px-2 py-0.5 rounded-full font-bold">
                {feedbacks.length}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ x: 4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => setActiveTab("gallery")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "gallery" ? "bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/15" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <Plus className="w-4 h-4 shrink-0" /> Galeri Kegiatan
            </motion.button>

            <motion.button
              whileHover={{ x: 4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "settings" ? "bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/15" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" /> Setting Link & Sosmed
            </motion.button>

            <motion.button
              whileHover={{ x: 4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => setActiveTab("media")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "media" ? "bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/15" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <Upload className="w-4 h-4 shrink-0" /> Upload Foto Menubar
            </motion.button>

            <motion.button
              whileHover={{ x: 4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => setActiveTab("texts")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "texts" ? "bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/15" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" /> Kelola Konten Teks
            </motion.button>

            <motion.button
              whileHover={{ x: 4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => setActiveTab("admins")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "admins" ? "bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/15" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" /> Kelola Akun Admin
            </motion.button>

            <motion.button
              whileHover={{ x: 4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => setActiveTab("gmail")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all mt-1 cursor-pointer ${
                activeTab === "gmail" ? "bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/15" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Mail className="w-4 h-4 shrink-0 text-amber-400" /> Gmail Inbox & Kirim
              </span>
              <span className={`h-2.5 w-2.5 rounded-full ${gmailToken ? "bg-emerald-500 animate-pulse" : "bg-neutral-500"}`}></span>
            </motion.button>

            <motion.button
              whileHover={{ x: 4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={() => setActiveTab("gdrive")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all mt-1 cursor-pointer ${
                activeTab === "gdrive" ? "bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/15" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Cloud className="w-4 h-4 shrink-0 text-cyan-400" /> Cadangan & Google Drive
              </span>
              <span className={`h-2.5 w-2.5 rounded-full ${gdriveToken ? "bg-cyan-500 animate-pulse" : "bg-neutral-500"}`}></span>
            </motion.button>


          </nav>
        </div>

        {/* Bottom banner success feedback or logout button */}
        <div className="pt-4 mt-4 border-t border-neutral-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-950/40 text-rose-400 hover:bg-rose-900 hover:text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar Panel Admin
          </button>
        </div>
      </div>

      {/* Main active panels - RIGHT */}
      <div className="flex-1 p-6 lg:p-8 bg-neutral-900/60 overflow-y-auto">
        {/* Toast success */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* 1. KUNJUNGAN STATS */}
        {activeTab === "stats" && stats && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-display font-semibold text-lg text-white">Statistik Pengunjung</h3>
                <p className="text-[10px] text-neutral-400">Total data laporan & performa klik halaman</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadExcelRecap}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
                >
                  <Download className="w-3.5 h-3.5" /> Download Rekap (Excel/CSV)
                </button>
                <button
                  type="button"
                  onClick={handleResetViews}
                  className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Reset Kunjungan Ke 0
                </button>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-neutral-950 border border-neutral-800/80 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold">Total Kunjungan Biolink</span>
                <div className="text-3xl font-black text-white mt-1">{stats.totalViews}</div>
                <div className="text-[10px] text-emerald-500 font-medium mt-1">Sesi Tampilan Halaman</div>
                <div className="absolute right-3 bottom-3 opacity-5 text-emerald-400 h-10 w-10">
                  <BarChart3 className="w-10 h-10" />
                </div>
              </div>

              <div className="p-5 bg-neutral-950 border border-neutral-800/80 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold">Pesanan E-Ticket</span>
                <div className="text-3xl font-black text-emerald-400 mt-1">{stats.totalBookings}</div>
                <div className="text-[10px] text-neutral-400 mt-1">Laporan booking aktif</div>
                <div className="absolute right-3 bottom-3 opacity-5 text-emerald-400 h-10 w-10">
                  <Ticket className="w-10 h-10" />
                </div>
              </div>

              <div className="p-5 bg-neutral-950 border border-neutral-800/80 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold">Estimasi Inkasso (Onsite)</span>
                <div className="text-3xl font-black text-amber-500 mt-1">Rp {stats.totalRevenue.toLocaleString("id-ID")}</div>
                <div className="text-[10px] text-neutral-400 mt-1">Dihitung otomatis per malam/pax</div>
                <div className="absolute right-3 bottom-3 opacity-5 text-emerald-400 h-10 w-10">
                  <Save className="w-10 h-10" />
                </div>
              </div>
            </div>

            {/* Daily visits log / "Kunjungan Harian Biolink" table & manual logger */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Table section */}
              <div className="lg:col-span-2 bg-neutral-950 p-5 rounded-2xl border border-neutral-800 space-y-4">
                <div>
                  <h4 className="font-display font-bold text-sm text-white">Laporan Kunjungan Harian Biolink</h4>
                  <p className="text-[10px] text-neutral-500">Rincian rincian klik detail dari pengunjung per tanggal</p>
                </div>

                <div className="max-h-60 overflow-y-auto border border-neutral-800/80 rounded-xl divide-y divide-neutral-800">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-900 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                        <th className="p-3">Tanggal</th>
                        <th className="p-3 text-right">Jumlah Kunjungan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 text-xs">
                      {Object.keys(stats.viewsCount || {}).length === 0 ? (
                        <tr>
                          <td colSpan={2} className="p-4 text-center text-neutral-500 italic">
                            Belum ada statistik kunjungan
                          </td>
                        </tr>
                      ) : (
                        Object.entries(stats.viewsCount)
                          .sort((a, b) => b[0].localeCompare(a[0])) // latest first
                          .map(([date, count]) => (
                            <tr key={date} className="hover:bg-neutral-900/40 transition-colors">
                              <td className="p-3 text-neutral-300 font-mono">{date}</td>
                              <td className="p-3 text-right text-emerald-400 font-bold font-mono">{count} kali</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add/Edit manual visit counts form */}
              <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-display font-bold text-sm text-white font-semibold">Kelola Kunjungan Harian</h4>
                  <p className="text-[10px] text-neutral-400 mb-4">Ubah atau masukkan jumlah kunjungan secara manual</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Pilih Tanggal</label>
                      <input
                        type="date"
                        value={customViewDate}
                        onChange={(e) => setCustomViewDate(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Jumlah Klik/Kunjungan</label>
                      <input
                        type="number"
                        min="0"
                        value={customViewCount}
                        onChange={(e) => setCustomViewCount(parseInt(e.target.value) || 0)}
                        className="w-full text-xs p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    disabled={isUpdatingViews}
                    onClick={handleUpdateViews}
                    className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isUpdatingViews ? "Menyimpan..." : "Simpan Data Kunjungan"}
                  </button>
                </div>
              </div>
            </div>

            {/* Line chart widget */}
            {renderViewsChart()}
          </div>
        )}

        {/* 2. PESAN E-TICKET TABLE */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-display font-semibold text-lg text-white">Laporan Registrasi E-Ticket</h3>
                <p className="text-[10px] text-neutral-500">Daftar booking masuk dari pelanggan</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTicketsExcel}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  <Download className="w-3.5 h-3.5" /> Download Laporan Lengkap (Excel)
                </button>
                <button
                  onClick={fetchAdminData}
                  className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 rounded-xl font-medium cursor-pointer transition-colors"
                >
                  Muat Ulang data
                </button>
              </div>
            </div>

            <div className="bg-neutral-950 rounded-2xl border border-neutral-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-[#050505] text-[10px] text-neutral-500 uppercase tracking-wider font-semibold border-b border-neutral-800">
                    <tr>
                      <th className="p-4">Kode Booking</th>
                      <th className="p-4">Nama Pelanggan</th>
                      <th className="p-4">Kontak / Email</th>
                      <th className="p-4">Kategori Kunjungan</th>
                      <th className="p-4">Check-In</th>
                      <th className="p-4 text-right">Total Biaya</th>
                      <th className="p-4 text-center">Status Pembayaran</th>
                      <th className="p-4 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-neutral-500 italic">
                          Belum ada tiket terdaftar.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((b) => (
                        <tr key={b.id} className="hover:bg-neutral-900/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-emerald-400">{b.bookingCode}</td>
                          <td className="p-4 font-semibold text-white">{b.name}</td>
                          <td className="p-4">
                            <div>{b.whatsapp}</div>
                            <div className="text-[10px] text-neutral-500">{b.email}</div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.visitType === "camping" ? "bg-amber-950/60 text-amber-400 border border-amber-800" : "bg-emerald-950/60 text-emerald-400 border border-emerald-800"
                            }`}>
                              {b.visitType === "camping" ? "CAMPING" : "KUNJUNGAN"}
                            </span>
                            {b.visitType === "camping" && (
                              <div className="text-[10px] text-neutral-500 mt-1">({b.numNights} Malam, {b.numPeople} org)</div>
                            )}
                          </td>
                          <td className="p-4 text-neutral-400">{b.checkInDate}</td>
                          <td className="p-4 text-right font-bold text-white">Rp {b.totalPrice.toLocaleString("id-ID")}</td>
                          <td className="p-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                                b.paymentStatus === "Lunas" ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80" :
                                b.paymentStatus === "Menunggu Validasi" ? "bg-amber-950/60 text-amber-400 border-amber-800/80" :
                                "bg-rose-950/60 text-rose-400 border-rose-800/80"
                              }`}>
                                {b.paymentStatus || "Belum Bayar"}
                              </span>
                              <select
                                value={b.paymentStatus || "Belum Bayar"}
                                onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value as any)}
                                className="bg-neutral-900 text-neutral-400 border border-neutral-800 rounded px-1.5 py-0.5 text-[9px] focus:outline-none focus:border-neutral-700 cursor-pointer"
                              >
                                <option value="Belum Bayar">Belum Bayar</option>
                                <option value="Menunggu Validasi">Menunggu Validasi</option>
                                <option value="Lunas">Lunas</option>
                              </select>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedBooking(b)}
                                className="p-1 px-2.5 bg-amber-950/40 text-amber-400 border border-amber-500/30 hover:bg-amber-900 rounded-lg hover:text-white transition-all text-[10px] font-semibold cursor-pointer"
                              >
                                Lihat / Cetak JPG
                              </button>
                              <button
                                onClick={() => handleDeleteBooking(b.id)}
                                className="p-1 px-2.5 bg-rose-950/30 text-rose-400 border border-rose-500/20 hover:bg-rose-900 rounded hover:text-white transition-all text-[10px]"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. GANTI LOGO */}
        {activeTab === "logo" && settings && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-display font-semibold text-lg text-white">Ganti Logo Destinasi</h3>
              <p className="text-[10px] text-neutral-500">Logo utama di pojok atas biolink</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-950 p-6 rounded-2xl border border-neutral-800">
              <div className="space-y-4">
                <div className="text-xs text-neutral-400 font-medium">Ubah Logo Wisata</div>
                <div className="p-4 border-2 border-dashed border-neutral-800 hover:border-neutral-700 rounded-xl relative flex flex-col items-center justify-center text-center">
                  <Upload className="w-8 h-8 text-neutral-500 mb-2" />
                  <span className="text-[11px] text-neutral-400">Pilih File Foto atau Seret ke sini</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setNewLogoBase64)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                {newLogoBase64 && (
                  <p className="text-[10px] text-emerald-400 font-medium">✓ Foto baru terpilih, siap disimpan.</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveLogo}
                    disabled={!newLogoBase64}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer disabled:opacity-40"
                  >
                    Simpan Logo Baru
                  </button>
                  <button
                    onClick={handleDeleteLogo}
                    className="px-3 py-2 bg-neutral-900 text-neutral-400 hover:text-rose-400 border border-neutral-800 hover:border-rose-950 text-xs rounded-xl cursor-pointer"
                  >
                    Hapus / Reset
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
                <div className="text-xs text-neutral-500 mb-3 font-semibold">TAMPILAN PREVIEW LOGO</div>
                <img
                  src={newLogoBase64 || settings.logoUrl}
                  onError={(e) => { (e.target as HTMLImageElement).src = "/src/assets/images/goa_lawah_logo_1781677843742.jpg" }}
                  className="w-28 h-28 rounded-full border-4 border-emerald-500 object-cover shadow-2xl"
                  alt="logo preview"
                />
                <span className="text-[11px] text-neutral-400 mt-2">Logo Desa Wisata Goa Lawah</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. KELOLA SARAN MASUKAN */}
        {activeTab === "saran" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-display font-semibold text-lg text-white">Kelola Saran dan Kritik</h3>
              <p className="text-[10px] text-neutral-500">Keluhan, masukan, dan pujian dari formulir utama</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {feedbacks.length === 0 ? (
                <div className="bg-neutral-950 p-8 rounded-2xl border border-neutral-800 text-center text-neutral-500 italic text-sm">
                  Belum ada kritik & saran masuk dari publik.
                </div>
              ) : (
                feedbacks.map((f) => (
                  <div key={f.id} className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{f.name || "Anonim"}</span>
                        <span className="text-[9px] text-neutral-500">
                          {new Date(f.createdAt).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed italic">"{f.message}"</p>
                    </div>
                    <button
                      onClick={() => handleDeleteFeedback(f.id)}
                      className="p-1 px-3 bg-rose-950/20 text-rose-400 hover:bg-rose-900 hover:text-white text-xs border border-rose-500/10 rounded-lg shrink-0"
                    >
                      Hapus
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 5. GALERI KEGIATAN */}
        {activeTab === "gallery" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-display font-semibold text-lg text-white">Kelola Galeri Kegiatan</h3>
              <p className="text-[10px] text-neutral-500">Foto-foto keseruan wahana petualangan</p>
            </div>

            {/* Input uploader */}
            <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 space-y-4">
              <div className="text-xs text-neutral-400 font-semibold mb-1 uppercase">Tambah Foto Galeri Baru</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Judul/Deskripsi Foto</label>
                  <input
                    type="text"
                    value={galleryTitle}
                    onChange={(e) => setGalleryTitle(e.target.value)}
                    placeholder="Contoh: Keseruan outbound malam hari"
                    className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Unggah Berkas Gambar*</label>
                  <div className="relative p-2.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl flex items-center justify-between text-xs text-neutral-400">
                    <span>{galleryBase64 ? "✓ Gambar terpilih" : "Pilih gambar..."}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setGalleryBase64)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={handleAddGallery}
                className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs py-2.5 px-6 rounded-xl cursor-pointer"
              >
                + Tambah & Simpan Foto Galeri
              </button>
            </div>

            {/* Gallery manager list */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {gallery.map((g) => (
                <div key={g.id} className="bg-neutral-950 rounded-2xl border border-neutral-800 p-3 overflow-hidden group relative">
                  <img
                    src={g.url}
                    className="w-full h-32 object-cover rounded-xl border border-neutral-800"
                    alt={g.title}
                  />
                  <div className="mt-2 text-xs font-semibold text-white truncate px-1">{g.title}</div>
                  <button
                    onClick={() => handleDeleteGallery(g.id)}
                    className="absolute top-4 right-4 p-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-full cursor-pointer "
                    title="Hapus foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. SETTING LINK MEDIA */}
        {activeTab === "settings" && settings && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-display font-semibold text-lg text-white">Setting Link Sosial Media & Maps</h3>
              <p className="text-[10px] text-neutral-500">Konfigurasi alamat whatsapp, sosmed, youtube, dan lokasi peta</p>
            </div>

            <form onSubmit={handleSaveLinks} className="space-y-6 bg-neutral-950 p-6 rounded-2xl border border-neutral-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Link WhatsApp Hubungi Kami</label>
                  <input
                    type="text"
                    value={settings.whatsappUrl}
                    onChange={(e) => setSettings({ ...settings, whatsappUrl: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Link Pemutaran Video YouTube (Embed)</label>
                  <input
                    type="text"
                    value={settings.youtubeUrl}
                    onChange={(e) => setSettings({ ...settings, youtubeUrl: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder="Contoh: https://www.youtube.com/watch?v=acVrulSr9aw"
                  />
                  <p className="text-[10px] text-[#d4a373] mt-1.5">Mendukung format link biasa (watch), link bagikan (youtu.be), YouTube shorts, maupun link embed secara otomatis.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Link Facebook</label>
                  <input
                    type="text"
                    value={settings.facebookUrl}
                    onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Link Instagram</label>
                  <input
                    type="text"
                    value={settings.instagramUrl}
                    onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Link TikTok</label>
                  <input
                    type="text"
                    value={settings.tiktokUrl}
                    onChange={(e) => setSettings({ ...settings, tiktokUrl: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Iframe Google Maps (Embed Source)</label>
                  <input
                    type="text"
                    value={settings.googleMapsUrl}
                    onChange={(e) => setSettings({ ...settings, googleMapsUrl: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 font-mono text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs py-3 px-6 rounded-xl flex items-center gap-2 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" /> Simpan Konfigurasi Tautan
              </button>
            </form>
          </div>
        )}

        {/* 7. UPLOAD FOTO INFO, ALAT CAMPING & PEMBAYARAN */}
        {activeTab === "media" && settings && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-display font-semibold text-lg text-white">Upload Foto Menubar Mandiri</h3>
              <p className="text-[10px] text-neutral-500">Ganti brosur, daftar sewa camping dan QRIS Pembayaran</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Box 1: Info Tiket */}
              <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-xs font-bold text-emerald-400 mb-1">1. INFO TIKET & BROSUR</div>
                  <p className="text-[10px] text-neutral-500">Tampil ketika menu Info Tiket di klik.</p>
                  <div className="mt-3 relative h-36 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center">
                    <img
                      src={newTicketBase64 || settings.ticketInfoImage}
                      onError={(e) => { (e.target as HTMLImageElement).src = "/src/assets/images/ticket_flyer_1781677879257.jpg" }}
                      className="w-full h-full object-cover"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setNewTicketBase64)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSaveMedia("ticket", newTicketBase64, setNewTicketBase64)}
                  disabled={!newTicketBase64}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs py-2 px-3 rounded-lg cursor-pointer disabled:opacity-40"
                >
                  Unggah Baru
                </button>
              </div>

              {/* Box 2: Alat Camping */}
              <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-xs font-bold text-amber-500 mb-1">2. DAFTAR SEWA ALAT CAMPING</div>
                  <p className="text-[10px] text-neutral-500">Tampil untuk popup sewa eksternal.</p>
                  <div className="mt-3 relative h-36 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center">
                    <img
                      src={newCampingBase64 || settings.campingImage}
                      onError={(e) => { (e.target as HTMLImageElement).src = "/src/assets/images/camping_rental_1781677897755.jpg" }}
                      className="w-full h-full object-cover"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setNewCampingBase64)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSaveMedia("camping", newCampingBase64, setNewCampingBase64)}
                  disabled={!newCampingBase64}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs py-2 px-3 rounded-lg cursor-pointer disabled:opacity-40"
                >
                  Unggah Baru
                </button>
              </div>

              {/* Box 3: Qris */}
              <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-xs font-bold text-teal-400 mb-1">3. QRIS PEMBAYARAN POKDARWIS</div>
                  <p className="text-[10px] text-neutral-500">Tampil saat pelanggan klik struk Qris.</p>
                  <div className="mt-3 relative h-36 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center">
                    <img
                      src={newPaymentBase64 || settings.paymentImage}
                      onError={(e) => { (e.target as HTMLImageElement).src = "/src/assets/images/qris_payment_1781677862360.jpg" }}
                      className="w-full h-full object-cover animate-pulse"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setNewPaymentBase64)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSaveMedia("payment", newPaymentBase64, setNewPaymentBase64)}
                  disabled={!newPaymentBase64}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs py-2 px-3 rounded-lg cursor-pointer disabled:opacity-40"
                >
                  Unggah Baru
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 8. KELOLA KONTEN TEKS UTAMA */}
        {activeTab === "texts" && settings && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-display font-semibold text-lg text-white">Kelola Konten Teks Halaman Utama</h3>
              <p className="text-[10px] text-neutral-500">Sesuaikan semua kalimat, tombol, dan teks yang ada di beranda tanpa sisa</p>
            </div>

            <form onSubmit={handleSaveTexts} className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-6">
              {/* Bagian 1: Header & Judul Utama */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest border-l-2 border-emerald-500 pl-2">
                  1. Bagian Header & Judul Utama (Hero Section)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Judul Utama Hero</label>
                    <input
                      type="text"
                      value={settings.contentTexts.heroTitle}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, heroTitle: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Slogan Hero</label>
                    <input
                      type="text"
                      value={settings.contentTexts.heroSubtitle}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, heroSubtitle: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Nama Destinasi Wisata</label>
                    <input
                      type="text"
                      value={settings.contentTexts.destinationName}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, destinationName: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Nama Lembaga Pokdarwis</label>
                    <input
                      type="text"
                      value={settings.contentTexts.villageName}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, villageName: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Deskripsi Singkat Objek Wisata</label>
                  <textarea
                    rows={3}
                    value={settings.contentTexts.description}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        contentTexts: { ...settings.contentTexts, description: e.target.value }
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Bagian 2: Teks Navigasi Menu Biolink */}
              <div className="space-y-4 pt-4 border-t border-neutral-900">
                <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest border-l-2 border-emerald-500 pl-2">
                  2. Kalimat/Teks Tombol Navigasi Utama (Biolink Menu)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tombol 1 - Rekomendasi Label (Atas)</label>
                    <input
                      type="text"
                      placeholder="e.g. Rekomendasi Utama"
                      value={settings.contentTexts.action1Label || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, action1Label: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tombol 1 - Judul Utama Pesan Tiket</label>
                    <input
                      type="text"
                      placeholder="e.g. PESAN E-TICKET SEKARANG"
                      value={settings.contentTexts.action1Title || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, action1Title: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tombol 2 - Info Tiket Resmi (Judul)</label>
                    <input
                      type="text"
                      placeholder="e.g. Info Tiket Masuk Resmi"
                      value={settings.contentTexts.action2Title || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, action2Title: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tombol 2 - Subtitle Keterangan</label>
                    <input
                      type="text"
                      placeholder="e.g. Rincian harga rekreasi harian"
                      value={settings.contentTexts.action2Subtitle || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, action2Subtitle: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tombol 3 - Sewa Alat Camping (Judul)</label>
                    <input
                      type="text"
                      placeholder="e.g. Daftar Sewa Alat Camping"
                      value={settings.contentTexts.action3Title || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, action3Title: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tombol 3 - Subtitle Alat Camping</label>
                    <input
                      type="text"
                      placeholder="e.g. Tenda dome, matras, api unggun, SB"
                      value={settings.contentTexts.action3Subtitle || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, action3Subtitle: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tombol 4 - Info Pembayaran (Judul)</label>
                    <input
                      type="text"
                      placeholder="e.g. Informasi Pembayaran"
                      value={settings.contentTexts.action4Title || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, action4Title: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tombol 4 - Subtitle Pembayaran</label>
                    <input
                      type="text"
                      placeholder="e.g. Bayar di tempat / QRIS non-tunai resmi"
                      value={settings.contentTexts.action4Subtitle || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, action4Subtitle: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tombol 5 - Galeri Kegiatan (Judul)</label>
                    <input
                      type="text"
                      placeholder="e.g. Galeri Kegiatan Wisatawan"
                      value={settings.contentTexts.action5Title || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, action5Title: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tombol 5 - Subtitle Galeri</label>
                    <input
                      type="text"
                      placeholder="e.g. Keseruan wisata di Desa Wisata Goa Lawah"
                      value={settings.contentTexts.action5Subtitle || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, action5Subtitle: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tombol 6 - WhatsApp Hubungi (Judul)</label>
                    <input
                      type="text"
                      placeholder="e.g. Hubungi Kami (WhatsApp)"
                      value={settings.contentTexts.action6Title || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, action6Title: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tombol 6 - Subtitle WhatsApp</label>
                    <input
                      type="text"
                      placeholder="e.g. Tanya Pokdarwis / Layanan Khusus"
                      value={settings.contentTexts.action6Subtitle || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, action6Subtitle: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 3: Rute Maps, Kritik & Saran, Medsos dan Footer */}
              <div className="space-y-4 pt-4 border-t border-neutral-900">
                <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest border-l-2 border-emerald-500 pl-2">
                  3. Bagian Maps, Kritik & Saran, Medsos & Footer
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5 font-display">Judul Section Google Maps</label>
                    <input
                      type="text"
                      placeholder="e.g. Rute & Lokasi Desa Wisata Goa Lawah"
                      value={settings.contentTexts.mapsTitle || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, mapsTitle: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5 font-display">Judul Section Kritik & Saran</label>
                    <input
                      type="text"
                      placeholder="e.g. Kritik & Saran Pengunjung"
                      value={settings.contentTexts.feedbackTitle || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, feedbackTitle: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5 font-display">Placeholder Form: Nama Kamu</label>
                    <input
                      type="text"
                      placeholder="e.g. Nama Kamu (Opsional)"
                      value={settings.contentTexts.feedbackPlacName || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, feedbackPlacName: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5 font-display">Placeholder Form: Tulis Kritik Saran</label>
                    <input
                      type="text"
                      placeholder="e.g. Tuliskan kritik, masukan, atau saran..."
                      value={settings.contentTexts.feedbackPlacMsg || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, feedbackPlacMsg: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5 font-display">Teks Tombol Kirim Saran</label>
                    <input
                      type="text"
                      placeholder="e.g. Kirim Masukan"
                      value={settings.contentTexts.feedbackBtn || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, feedbackBtn: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5 font-display">Judul Section Media Sosial</label>
                    <input
                      type="text"
                      placeholder="e.g. Kunjungi Media Sosial"
                      value={settings.contentTexts.socmedTitle || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, socmedTitle: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5 font-display">Teks Kredit Kreasi Footer ("Made with Care...")</label>
                    <input
                      type="text"
                      placeholder="e.g. Made with Care in Goa Lawah"
                      value={settings.contentTexts.footerHeart || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, footerHeart: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5 font-display">Pesan Sukses Kirim Kritik Saran</label>
                    <input
                      type="text"
                      placeholder="e.g. ✓ Terima kasih! Saran & masukan..."
                      value={settings.contentTexts.feedbackSuccessMsg || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contentTexts: { ...settings.contentTexts, feedbackSuccessMsg: e.target.value }
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Teks Hak Cipta / Footer</label>
                  <input
                    type="text"
                    value={settings.contentTexts.footerText}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        contentTexts: { ...settings.contentTexts, footerText: e.target.value }
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs py-3 px-6 rounded-xl flex items-center gap-2 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" /> Simpan & Perbarui Semua Teks
              </button>
            </form>
          </div>
        )}

        {/* 9. KELOLA ADMIN CREDENTIALS */}
        {activeTab === "admins" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-display font-semibold text-lg text-white">Kelola Akun Admin</h3>
              <p className="text-[10px] text-neutral-500">Edit hak masuk, ganti password, atau daftarkan admin baru</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form edit credentials */}
              <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-4">
                <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Ubah Akun Admin Utama</div>
                
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Pilih Admin yang akan Diubah</label>
                  <select
                    value={oldUsername}
                    onChange={(e) => setOldUsername(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-2.5"
                  >
                    {adminsList.map((a) => (
                      <option key={a.username} value={a.username}>
                        {a.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Username Baru</label>
                  <input
                    type="text"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    placeholder="Contoh: pokdarwis_admin"
                    className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Password Baru</label>
                  <input
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="Masukkan sandi kuat baru"
                    className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => handleManageAdmin("edit")}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                  <button
                    onClick={() => handleManageAdmin("add")}
                    className="flex-1 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white text-xs py-2.5 px-4 rounded-xl cursor-pointer"
                  >
                    Tambah Sebagai Admin Baru
                  </button>
                </div>
              </div>

              {/* List of active admin accounts */}
              <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-4">
                <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Daftar Pengguna Admin Aktif</div>
                <div className="space-y-2.5">
                  {adminsList.map((a, idx) => (
                    <div key={idx} className="p-4 bg-neutral-900 rounded-xl border border-neutral-800 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-white block">{a.username}</span>
                        <span className="text-[10px] text-neutral-500">Status: Aktif, diizinkan mengakses Database</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">
                        ADMIN
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GMAIL WORKSPACE INTEGRATION TAB */}
        {activeTab === "gmail" && (
          <div className="space-y-6">
            {/* IFRAME WARNING ALERT BANNER */}
            <div className="bg-amber-950/25 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500 animate-pulse" />
              <div className="text-xs space-y-1">
                <span className="font-bold">PENTING - Batasan Browser & Iframe:</span>
                <p className="leading-relaxed text-amber-400">
                  Karena kebijakan privasi browser modern (pemblokiran cookie pihak ketiga dalam iframe), 
                  proses login Google **TIDAK BISA** dilakukan secara langsung di dalam iframe pratinjau ini.
                </p>
                <div className="pt-1">
                  <p className="font-bold text-amber-300">Langkah Penyelesaian:</p>
                  <ol className="list-decimal list-inside space-y-1 mt-1 font-medium pl-1">
                    <li>Klik tombol <strong className="text-white bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Buka di Tab Baru</strong> (ikon kotak dengan panah keluar di kanan paling atas pratinjau).</li>
                    <li>Setelah terbuka di tab baru, buka kembali <strong className="text-white">Admin Panel</strong>, pergi ke menu Gmail ini, lalu klik <strong className="text-white">Hubungkan Google Mail</strong>. Akun Anda akan langsung sukses terhubung!</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-neutral-800 pb-3 gap-3">
              <div>
                <h3 className="font-display font-semibold text-lg text-white">Google Gmail Integration</h3>
                <p className="text-[10px] text-neutral-500">Hubungkan dan kelola kotak surat Gmail Anda untuk mengirim konfirmasi pemesanan, tiket resmi, atau broadcast promosi secara langsung</p>
              </div>
            </div>

            {/* STATUS KONEKSI */}
            <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full">
                  <div className={`p-3 rounded-xl shrink-0 ${gmailToken ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-neutral-900 text-neutral-400 border border-neutral-800"}`}>
                    <Mail className="w-8 h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">Integrasi Akun Gmail</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${gmailToken ? "bg-amber-950 text-amber-400 border border-amber-500/20" : "bg-neutral-900 text-neutral-400 border border-neutral-800"}`}>
                        {gmailToken ? "Terhubung" : "Disiapkan"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      {gmailToken 
                        ? `Terhubung sebagai: ${gmailUser?.displayName || gmailProfile?.emailAddress || gmailUser?.email}` 
                        : "Sistem belum terhubung ke akun Gmail Anda. Hubungkan akun untuk dapat mengirim email lewat Gmail API secara otomatis."}
                    </p>
                    {gmailProfile && (
                      <div className="mt-2 text-[11px] text-neutral-500 flex gap-4">
                        <span>Jumlah Pesan: <strong className="text-neutral-300">{gmailProfile.messagesTotal}</strong></span>
                        <span>Threads: <strong className="text-neutral-300">{gmailProfile.threadsTotal}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 w-full md:w-auto">
                  {!gmailToken ? (
                    <button
                      onClick={handleConnectGmail}
                      disabled={gmailLoading}
                      className="w-full md:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold py-2 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-950/20"
                    >
                      {gmailLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      Hubungkan Google Mail
                    </button>
                  ) : (
                    <button
                      onClick={handleDisconnectGmail}
                      className="w-full md:w-auto bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-rose-400 hover:text-rose-300 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      Putuskan Koneksi Gmail
                    </button>
                  )
                }
                </div>
              </div>

              {gmailError && (
                <div className="bg-rose-950/30 border border-rose-500/10 text-rose-400 p-3 rounded-xl text-xs font-semibold leading-relaxed">
                  Kesalahan Koneksi: {gmailError}
                </div>
              )}
            </div>

            {/* OPSI SINKRONISASI OTOMATIS */}
            {gmailToken && (
              <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <RefreshCw className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-white uppercase tracking-wider">Sinkronisasi & Balas Otomatis Pemesanan</h4>
                      <p className="text-[10px] text-neutral-400 mt-1">Kirim rincian pemesanan & e-ticket secara otomatis menggunakan akun Gmail Anda setiap kali ada pesanan baru</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings?.gmailAutoReplyActive || false}
                        onChange={async (e) => {
                          const checked = e.target.checked;
                          if (settings) {
                            const updated = { ...settings, gmailAutoReplyActive: checked };
                            setSettings(updated);
                            try {
                              const res = await fetch("/api/admin/settings", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(updated)
                              });
                              if (res.ok) {
                                showSuccess(checked ? "Sinkronisasi & Balas Otomatis Gmail diaktifkan!" : "Sinkronisasi & Balas Otomatis Gmail dimatikan.");
                              } else {
                                throw new Error("Gagal memperbarui pengaturan.");
                              }
                            } catch (err: any) {
                              showError(err.message);
                            }
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-neutral-950 peer-checked:after:border-neutral-950"></div>
                    </label>
                  </div>
                </div>

                {settings?.gmailAutoReplyActive && (
                  <div className="bg-amber-950/25 border border-amber-500/10 p-3.5 rounded-xl flex gap-3 text-amber-400 text-[11px] leading-relaxed">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">Sistem Auto-Responder Aktif:</span>
                      <p className="mt-1">
                        Sistem sekarang memantau form pendaftaran E-Ticket. Ketika pengunjung memesan tiket, server akan mengirimkan email detail pemesanan, rincian biaya, dan instruksi lengkap ke email pelanggan secara otomatis menggunakan koneksi Gmail Anda.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GMAIL TAB CONTENTS */}
            {gmailToken && (
              <div className="space-y-6">
                {/* SUB TAB BAR */}
                <div className="flex border-b border-neutral-800 gap-1">
                  <button
                    onClick={() => setGmailActiveSubTab("inbox")}
                    className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                      gmailActiveSubTab === "inbox" 
                        ? "border-amber-500 text-amber-400" 
                        : "border-transparent text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Inbox className="w-3.5 h-3.5" /> Kotak Surat (Inbox / Sent)
                  </button>
                  <button
                    onClick={() => setGmailActiveSubTab("compose")}
                    className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                      gmailActiveSubTab === "compose" 
                        ? "border-amber-500 text-amber-400" 
                        : "border-transparent text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" /> Tulis Email Baru
                  </button>
                  <button
                    onClick={() => setGmailActiveSubTab("broadcast")}
                    className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                      gmailActiveSubTab === "broadcast" 
                        ? "border-amber-500 text-amber-400" 
                        : "border-transparent text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" /> Broadcast Massal
                  </button>
                </div>

                {/* SUB-TAB 1: INBOX */}
                {gmailActiveSubTab === "inbox" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* List column */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setGmailInboxType("INBOX"); setGmailMessages([]); }}
                          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                            gmailInboxType === "INBOX" 
                              ? "bg-amber-950 text-amber-400 border-amber-800" 
                              : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                          }`}
                        >
                          Kotak Masuk (Inbox)
                        </button>
                        <button
                          onClick={() => { setGmailInboxType("SENT"); setGmailMessages([]); }}
                          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                            gmailInboxType === "SENT" 
                              ? "bg-amber-950 text-amber-400 border-amber-800" 
                              : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                          }`}
                        >
                          Pesan Terkirim (Sent)
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Cari email..."
                            value={gmailSearchQuery}
                            onChange={(e) => setGmailSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") fetchGmailProfileAndMessages(gmailToken);
                            }}
                            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:border-amber-500/50"
                          />
                          {gmailSearchQuery && (
                            <button 
                              onClick={() => { setGmailSearchQuery(""); }}
                              className="absolute right-2 top-2 text-neutral-500 hover:text-neutral-300 text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => fetchGmailProfileAndMessages(gmailToken)}
                          disabled={gmailLoading}
                          className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white px-3 rounded-lg text-xs flex items-center justify-center cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${gmailLoading ? "animate-spin" : ""}`} />
                        </button>
                      </div>

                      <div className="bg-neutral-950 rounded-2xl border border-neutral-800 overflow-hidden divide-y divide-neutral-900 max-h-[500px] overflow-y-auto">
                        {gmailLoading && gmailMessages.length === 0 ? (
                          <div className="p-8 text-center text-xs text-neutral-500 space-y-2">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500" />
                            <span>Memuat kotak surat...</span>
                          </div>
                        ) : gmailMessages.length === 0 ? (
                          <div className="p-8 text-center text-xs text-neutral-500">
                            Tidak ada pesan ditemukan.
                          </div>
                        ) : (
                          gmailMessages.map((msg: any) => {
                            const headers = msg.payload?.headers || [];
                            const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown";
                            const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
                            const date = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";
                            
                            const cleanFrom = from.replace(/<.*>/, "").trim();
                            const formattedDate = new Date(date).toLocaleDateString("id-ID", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            });

                            return (
                              <button
                                key={msg.id}
                                onClick={() => setSelectedGmailMessage(msg)}
                                className={`w-full text-left p-3.5 flex flex-col gap-1 transition-all cursor-pointer ${
                                  selectedGmailMessage?.id === msg.id 
                                    ? "bg-amber-950/20 border-l-2 border-amber-500" 
                                    : "hover:bg-neutral-900/45 border-l-2 border-transparent"
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-bold text-xs text-white truncate max-w-[70%]">{cleanFrom}</span>
                                  <span className="text-[9px] text-neutral-500 shrink-0">{formattedDate}</span>
                                </div>
                                <span className="text-xs font-semibold text-amber-100 truncate">{subject}</span>
                                <p className="text-[10px] text-neutral-500 line-clamp-1">{msg.snippet}</p>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Detail Column */}
                    <div className="lg:col-span-7 bg-neutral-950 rounded-2xl border border-neutral-800 p-5 flex flex-col min-h-[400px]">
                      {selectedGmailMessage ? (() => {
                        const headers = selectedGmailMessage.payload?.headers || [];
                        const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "";
                        const to = headers.find((h: any) => h.name.toLowerCase() === "to")?.value || "";
                        const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
                        const date = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";
                        const htmlBody = getMessageBody(selectedGmailMessage.payload);

                        return (
                          <div className="space-y-4 h-full flex flex-col">
                            <div className="border-b border-neutral-800 pb-3 space-y-1.5 shrink-0">
                              <h4 className="font-bold text-sm text-amber-400">{subject}</h4>
                              <div className="text-[10px] text-neutral-400 grid grid-cols-1 md:grid-cols-2 gap-1 pt-1">
                                <span>Dari: <strong className="text-white font-medium">{from}</strong></span>
                                <span>Kepada: <strong className="text-neutral-300 font-medium">{to}</strong></span>
                                <span className="col-span-1 md:col-span-2">Tanggal: <strong className="text-neutral-300 font-medium">{new Date(date).toLocaleString("id-ID")}</strong></span>
                              </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto max-h-[450px] p-4 bg-neutral-900/50 rounded-xl border border-neutral-900 text-neutral-200 text-xs min-h-[250px]">
                              {htmlBody ? (
                                <div 
                                  dangerouslySetInnerHTML={{ __html: htmlBody }} 
                                  className="prose prose-invert prose-xs max-w-none break-words"
                                />
                              ) : (
                                <p className="whitespace-pre-wrap leading-relaxed">{selectedGmailMessage.snippet}</p>
                              )}
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-neutral-900 shrink-0">
                              <button
                                onClick={() => {
                                  setComposeTo(from.match(/<([^>]+)>/)?.[1] || from);
                                  setComposeSubject(`Re: ${subject}`);
                                  setGmailActiveSubTab("compose");
                                  setSelectedGmailMessage(null);
                                }}
                                className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-1.5 px-3.5 rounded-lg text-xs cursor-pointer flex items-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" /> Balas Pesan
                              </button>
                              <button
                                onClick={() => setSelectedGmailMessage(null)}
                                className="text-neutral-400 hover:text-white text-xs"
                              >
                                Tutup Bacaan
                              </button>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="m-auto text-center space-y-2 text-neutral-500">
                          <Mail className="w-12 h-12 text-neutral-800 mx-auto" />
                          <p className="text-xs">Pilih salah satu email di panel kiri untuk membaca isinya secara detail</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: COMPOSE */}
                {gmailActiveSubTab === "compose" && (
                  <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-6">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                      <h4 className="font-semibold text-white text-sm">Tulis & Kirim Surat Elektronik (Gmail API)</h4>
                      <span className="text-[10px] text-amber-500 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/30">Siap Kirim</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Integrasi dengan Booking DB */}
                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5">Hubungkan Dengan Pemesanan (Booking):</label>
                        <select
                          value={selectedBookingForEmail}
                          onChange={(e) => {
                            setSelectedBookingForEmail(e.target.value);
                            handleTemplateChange(selectedTemplate, e.target.value);
                          }}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="">-- Hubungkan dengan Data Booking (Opsional) --</option>
                          {bookings.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.bookingCode} - {b.name} ({b.email || "No Email"})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Template Selector */}
                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5">Pilih Template Email:</label>
                        <select
                          value={selectedTemplate}
                          onChange={(e) => handleTemplateChange(e.target.value, selectedBookingForEmail)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="custom">Kustom / Kosong</option>
                          <option value="ticket_confirmation">🎟️ Konfirmasi E-Tiket Resmi & Rincian Pembayaran</option>
                          <option value="thank_you">🌟 Terima Kasih atas Kunjungan (Matur Suksma)</option>
                          <option value="promo">📢 Promosi Khusus Kawasan Wisata Goa Lawah</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Penerima */}
                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5">Alamat Email Penerima:</label>
                        <input
                          type="email"
                          placeholder="penerima@domain.com"
                          value={composeTo}
                          onChange={(e) => setComposeTo(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Subjek */}
                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5">Subjek Email:</label>
                        <input
                          type="text"
                          placeholder="Masukkan subjek surat elektronik..."
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* HTML Body */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Isi Pesan (Format HTML):</label>
                          <span className="text-[9px] text-neutral-500">Mendukung format paragraf, tabel & visual inline</span>
                        </div>
                        <textarea
                          rows={12}
                          placeholder="Ketik isi pesan email Anda di sini..."
                          value={composeBody}
                          onChange={(e) => setComposeBody(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white font-mono rounded-xl p-3.5 text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Pratinjau HTML */}
                      {composeBody && (
                        <div className="space-y-1.5">
                          <span className="block text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Pratinjau Tampilan Email:</span>
                          <div className="border border-neutral-800 rounded-xl p-4 bg-white text-neutral-800 max-h-[300px] overflow-y-auto text-xs">
                            <div dangerouslySetInnerHTML={{ __html: composeBody }} className="max-w-none prose prose-xs break-words" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={handleSendGmail}
                        disabled={isSendingEmail || !composeTo}
                        className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-2.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSendingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Kirim Email Resmi (Gmail API)
                      </button>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 3: BROADCAST */}
                {gmailActiveSubTab === "broadcast" && (
                  <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-6">
                    <div className="bg-amber-950/20 border border-amber-500/10 p-4 rounded-xl flex gap-3">
                      <Mail className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <span className="font-bold text-amber-300">Modul Broadcast Email Massal:</span>
                        <p className="text-neutral-400 leading-relaxed">
                          Anda memiliki total <strong className="text-white">{Array.from(new Set(bookings.map(b => b.email).filter(e => e && e.includes("@")))).length}</strong> alamat email unik dari pengunjung yang tersimpan di database.
                          Gunakan fitur ini untuk mengirim pengumuman penting, ucapan selamat hari raya suci, atau promo eksklusif wisata secara serentak.
                        </p>
                      </div>
                    </div>

                    {broadcastProgress.active && (
                      <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-white">Proses Mengirim Broadcast...</span>
                          <span className="text-amber-400 font-mono font-bold">
                            {broadcastProgress.current} / {broadcastProgress.total} Email
                          </span>
                        </div>
                        <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800">
                          <div 
                            className="bg-amber-500 h-full transition-all duration-300"
                            style={{ width: `${(broadcastProgress.current / broadcastProgress.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-neutral-500 text-center">Mohon tidak menutup tab browser ini selama proses pengiriman massal berlangsung.</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Subjek */}
                      <div>
                        <label className="block text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5">Subjek Pengumuman / Promosi:</label>
                        <input
                          type="text"
                          placeholder="Masukkan judul broadcast..."
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                          disabled={broadcastProgress.active}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500 disabled:opacity-50"
                        />
                      </div>

                      {/* Body HTML */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Isi Pesan Promosi (Format HTML):</label>
                          <span className="text-[9px] text-neutral-500">Gunakan tag &lt;div&gt;, &lt;p&gt;, &lt;b&gt; untuk memperindah</span>
                        </div>
                        <textarea
                          rows={12}
                          placeholder="Ketik pengumuman broadcast Anda di sini..."
                          value={composeBody}
                          onChange={(e) => setComposeBody(e.target.value)}
                          disabled={broadcastProgress.active}
                          className="w-full bg-neutral-900 border border-neutral-800 text-white font-mono rounded-xl p-3.5 text-xs focus:outline-none focus:border-amber-500 disabled:opacity-50"
                        />
                      </div>

                      {/* Pratinjau */}
                      {composeBody && (
                        <div className="space-y-1.5">
                          <span className="block text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Pratinjau Broadcast:</span>
                          <div className="border border-neutral-800 rounded-xl p-4 bg-white text-neutral-800 max-h-[250px] overflow-y-auto text-xs">
                            <div dangerouslySetInnerHTML={{ __html: composeBody }} className="max-w-none prose prose-xs" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={handleBroadcastGmail}
                        disabled={broadcastProgress.active || !composeSubject || !composeBody}
                        className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-2.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {broadcastProgress.active ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        Mulai Kirim Broadcast Massal ({Array.from(new Set(bookings.map(b => b.email).filter(e => e && e.includes("@")))).length} Penerima)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}



        {/* 10. EDIT FORM E-TICKET CONFIGURATION */}
        {activeTab === "ticket_form_edit" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-display font-semibold text-lg text-white">Edit Form E-Ticket</h3>
                <p className="text-[10px] text-neutral-500">Kelola harga masuk, daftar sewa alat, dan kustomisasi bidang formulir e-ticket</p>
              </div>
              <button
                onClick={handleSaveTicketFormEdit}
                className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/15"
              >
                <Save className="w-4 h-4" /> Simpan Konfigurasi
              </button>
            </div>

            {/* Status Aktif Fitur Pemesanan */}
            <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    {eTicketActive && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${eTicketActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  </span>
                  Fungsi Tombol "Pesan E-Ticket Sekarang" Pada Halaman Utama
                </div>
                <p className="text-xs text-neutral-400 max-w-2xl">
                  {eTicketActive 
                    ? "AKTIF: Pengunjung halaman utama dapat mengisi formulir dan memesan e-ticket secara instan." 
                    : "NONAKTIF: Pengunjung yang mengklik tombol pemesanan akan melihat pemberitahuan bahwa fitur sedang dalam persiapan."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold tracking-wider uppercase ${eTicketActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {eTicketActive ? "Aktif (ON)" : "Nonaktif (OFF)"}
                </span>
                <button
                  type="button"
                  onClick={() => setETicketActive(!eTicketActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    eTicketActive ? 'bg-emerald-500' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-neutral-950 shadow ring-0 transition duration-200 ease-in-out ${
                      eTicketActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* KOLOM 1: HARGA TIKET MASUK */}
              <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-4">
                <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-emerald-400" /> Harga Tiket & Parkir
                </div>
                <p className="text-[11px] text-neutral-500 -mt-2">Semua harga dihitung dalam Rupiah (IDR)</p>

                <div className="space-y-4 pt-2">
                  <div className="border-b border-neutral-900 pb-3">
                    <span className="text-[11px] text-emerald-400 font-bold block mb-2 uppercase">Kunjungan Biasa (Harian)</span>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">Tiket per Orang (Pengunjung)</label>
                        <input
                          type="number"
                          value={ticketPrices.priceVisitPerson}
                          onChange={(e) => setTicketPrices({ ...ticketPrices, priceVisitPerson: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded-xl px-4 py-2 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Parkir Motor</label>
                          <input
                            type="number"
                            value={ticketPrices.priceVisitMotorcycle}
                            onChange={(e) => setTicketPrices({ ...ticketPrices, priceVisitMotorcycle: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Parkir Mobil</label>
                          <input
                            type="number"
                            value={ticketPrices.priceVisitCar}
                            onChange={(e) => setTicketPrices({ ...ticketPrices, priceVisitCar: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-amber-500 font-bold block mb-2 uppercase">Camping Ground Pass (Menginap)</span>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">Tiket Camp per Orang / Malam</label>
                        <input
                          type="number"
                          value={ticketPrices.priceCampingPerson}
                          onChange={(e) => setTicketPrices({ ...ticketPrices, priceCampingPerson: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full bg-neutral-900 border border-neutral-800 text-sm text-[#e4e4e7] rounded-xl px-4 py-2 outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Parkir Motor Camp</label>
                          <input
                            type="number"
                            value={ticketPrices.priceCampingMotorcycle}
                            onChange={(e) => setTicketPrices({ ...ticketPrices, priceCampingMotorcycle: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-2 outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Parkir Mobil Camp</label>
                          <input
                            type="number"
                            value={ticketPrices.priceCampingCar}
                            onChange={(e) => setTicketPrices({ ...ticketPrices, priceCampingCar: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-3 py-2 outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* KOLOM 2: SEWA ALAT CAMPING */}
              <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-4">
                <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" /> Sewa Alat Camping
                </div>
                <p className="text-[11px] text-neutral-500 -mt-2">Edit harga sewa, hapus, atau tambahkan jenis alat baru</p>

                {/* List rental items */}
                <div className="space-y-2 mt-2 max-h-[320px] overflow-y-auto pr-1">
                  {rentalItems.map((item, index) => (
                    <div key={item.id} className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 flex justify-between items-center whitespace-nowrap">
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-neutral-200 block text-xs truncate">{item.name}</span>
                        <span className="text-[10px] text-neutral-500">Key: <span className="font-mono">{item.id}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-neutral-945 border border-neutral-800 rounded-lg px-2 py-1">
                          <span className="text-[10px] text-neutral-500 mr-1">Rp</span>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => {
                              const updated = [...rentalItems];
                              updated[index].price = Math.max(0, parseInt(e.target.value) || 0);
                              setRentalItems(updated);
                            }}
                            className="w-16 bg-transparent text-right text-xs font-mono font-bold text-white outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomRental(item.id)}
                          className="p-1.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Alat Sewa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {rentalItems.length === 0 && (
                    <div className="text-center py-6 text-xs text-neutral-600 italic">Belum ada alat sewa eksternal.</div>
                  )}
                </div>

                {/* Add new rental item form */}
                <div className="pt-4 border-t border-neutral-900 space-y-2.5">
                  <span className="text-[10px] text-neutral-400 font-bold block uppercase">Tambah Alat Sewa Baru</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-neutral-500 mb-0.5">Nama Alat</label>
                      <input
                        type="text"
                        placeholder="e.g. Kompor Portable"
                        value={newRentalName}
                        onChange={(e) => setNewRentalName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-2.5 py-2 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-neutral-500 mb-0.5">Harga Sewa / Malam</label>
                      <input
                        type="number"
                        placeholder="IDR"
                        value={newRentalPrice || ""}
                        onChange={(e) => setNewRentalPrice(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-2.5 py-2 outline-none font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomRental}
                    className="w-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" /> Tambah Alat Sewa
                  </button>
                </div>
              </div>

              {/* KOLOM 3: KUSTOMISASI FORM FIELDS */}
              <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-4">
                <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" /> Isian Formulir Pelanggan
                </div>
                <p className="text-[11px] text-neutral-500 -mt-2">Atur nama label isian atau tambahkan kolom pertanyaan khusus</p>

                {/* List fields */}
                <div className="space-y-3 mt-2 max-h-[280px] overflow-y-auto pr-1">
                  {formFields.map((field, index) => (
                    <div key={field.id} className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-neutral-200 text-xs capitalize">{field.id}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">[{field.type}]</span>
                        </div>
                        {field.isDefault ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-neutral-950 text-neutral-500 border border-neutral-800 rounded">Wajib</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomField(field.id)}
                            className="p-1 px-1.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 rounded-lg text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Hapus
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-neutral-500 mb-0.5">Nama Label</label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => {
                              const updated = [...formFields];
                              updated[index].label = e.target.value;
                              setFormFields(updated);
                            }}
                            className="w-full bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-200 rounded-md px-2 py-1 outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-neutral-500 mb-0.5">Placeholder</label>
                          <input
                            type="text"
                            value={field.placeholder || ""}
                            onChange={(e) => {
                              const updated = [...formFields];
                              updated[index].placeholder = e.target.value;
                              setFormFields(updated);
                            }}
                            className="w-full bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-200 rounded-md px-2 py-1 outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add dynamic custom form field template */}
                <div className="pt-4 border-t border-neutral-900 space-y-2.5">
                  <span className="text-[10px] text-neutral-400 font-bold block uppercase font-display">Tambah Isian Formulir Baru</span>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-neutral-500 mb-0.5">Label Bidang baru</label>
                        <input
                          type="text"
                          placeholder="e.g. Asal Kota / Daerah"
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-2.5 py-1.5 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-neutral-500 mb-0.5">Placeholder bantuan</label>
                        <input
                          type="text"
                          placeholder="e.g. Contoh: Jakarta, Lombok"
                          value={newFieldPlaceholder}
                          onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-2.5 py-1.5 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <div>
                        <label className="block text-[9px] text-neutral-500 mb-0.5">Jenis Isian</label>
                        <select
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-2 py-1.5"
                        >
                          <option value="text">Teks Pendek</option>
                          <option value="tel">Nomor HP / Telp</option>
                          <option value="number">Bilangan Angka</option>
                          <option value="email">Alamat Email</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 pt-3">
                        <input
                          type="checkbox"
                          id="required_chk"
                          checked={newFieldRequired}
                          onChange={(e) => setNewFieldRequired(e.target.checked)}
                          className="rounded bg-neutral-900 border-neutral-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                        />
                        <label htmlFor="required_chk" className="text-[10px] text-neutral-400 font-bold select-none cursor-pointer">Wajib diisi (Required)</label>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="w-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" /> Tambah Bidang Isian
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 11. GOOGLE DRIVE BACKUP & SYNC CONFIGURATION */}
        {activeTab === "gdrive" && (
          <div className="space-y-6 animate-fade-in">
            {/* IFRAME WARNING ALERT BANNER */}
            <div className="bg-cyan-950/25 border border-cyan-500/20 rounded-2xl p-4 flex gap-3 text-cyan-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-cyan-400" />
              <div className="text-xs space-y-1 text-left">
                <span className="font-bold">Batasan Iframe & Login Google:</span>
                <p className="leading-relaxed text-cyan-400/90">
                  Sama halnya dengan Gmail, proses otentikasi Google Drive **TIDAK BISA** dilakukan secara langsung di dalam iframe pratinjau ini.
                </p>
                <div className="pt-1">
                  <p className="font-bold text-cyan-300">Solusi Cepat:</p>
                  <ol className="list-decimal list-inside space-y-1 mt-1 font-medium pl-1">
                    <li>Klik tombol <strong className="text-white bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">Buka di Tab Baru</strong> di kanan atas layar pratinjau.</li>
                    <li>Di tab baru, buka kembali Admin Panel menu ini lalu klik <strong className="text-white">Hubungkan Google Drive</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-neutral-800 pb-3 gap-3">
              <div className="text-left">
                <h3 className="font-display font-semibold text-lg text-white">Cadangan & Google Drive Sync</h3>
                <p className="text-[10px] text-neutral-400">Amankan data pemesanan, tiket, saran, dan pengaturan dengan mencadangkannya langsung ke akun Google Drive pribadi Anda</p>
              </div>
            </div>

            {/* STATUS KONEKSI */}
            <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full text-left">
                  <div className={`p-3 rounded-xl shrink-0 ${gdriveToken ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-neutral-900 text-neutral-400 border border-neutral-800"}`}>
                    <Cloud className="w-8 h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">Status Integrasi Google Drive</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${gdriveToken ? "bg-cyan-950 text-cyan-400 border border-cyan-500/20" : "bg-neutral-900 text-neutral-400 border border-neutral-800"}`}>
                        {gdriveToken ? "Terhubung" : "Disiapkan"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      {gdriveToken 
                        ? `Terhubung sebagai: ${gdriveUser?.displayName || gdriveUser?.email || "Pengguna Drive"}` 
                        : "Sistem belum terhubung ke Google Drive. Cadangan otomatis ke awan dinonaktifkan."}
                    </p>
                    {dbFileOnDrive && (
                      <div className="mt-2 text-[11px] text-neutral-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span>File Cadangan: <strong className="text-neutral-300">{dbFileOnDrive.name}</strong></span>
                        <span>ID File: <strong className="text-neutral-300 font-mono">{dbFileOnDrive.id}</strong></span>
                        <span>Ukuran: <strong className="text-neutral-300">{(dbFileOnDrive.size / 1024).toFixed(2)} KB</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 w-full md:w-auto">
                  {!gdriveToken ? (
                    <button
                      onClick={handleConnectGDrive}
                      disabled={gdriveLoading}
                      className="w-full md:w-auto bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-neutral-950 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-950/20"
                    >
                      {gdriveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                      Hubungkan Google Drive
                    </button>
                  ) : (
                    <button
                      onClick={handleDisconnectGDrive}
                      className="w-full md:w-auto bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-rose-400 hover:text-rose-300 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      Putuskan Google Drive
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* OPSI SINKRONISASI & CADANGAN MANUAL */}
            {gdriveToken && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {/* SINKRONISASI OTOMATIS */}
                <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-white uppercase tracking-wider">Sinkronisasi Otomatis</h4>
                        <p className="text-[10px] text-neutral-400 mt-1">Simpan setiap perubahan data secara real-time ke Google Drive</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoDriveSync}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAutoDriveSync(checked);
                          localStorage.setItem("gdrive_auto_sync", checked ? "true" : "false");
                          showSuccess(checked ? "Sinkronisasi otomatis Google Drive diaktifkan!" : "Sinkronisasi otomatis Google Drive dimatikan.");
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 peer-checked:after:bg-cyan-400 after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-950 border border-neutral-700"></div>
                    </label>
                  </div>
                </div>

                {/* TRANSFER CADANGAN MANUAL */}
                <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-4">
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider">Tindakan Cadangan Awan</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handlePushDriveDatabase(false)}
                      className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-neutral-950 border border-cyan-500/20 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Data (Push)
                    </button>
                    <button
                      onClick={handlePullDriveDatabase}
                      disabled={!dbFileOnDrive}
                      className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Download className="w-3.5 h-3.5" /> Pulihkan Data (Pull)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* OPERASI FILE RAW DB.JSON */}
            <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-4 text-left">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">Ekspor File Database Lokal (db.json)</h4>
                    <p className="text-[10px] text-neutral-400 mt-1">Unduh seluruh salinan file basis data situs (`db.json`) langsung ke penyimpanan komputer Anda.</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadLocalDbJSON}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/10 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh db.json Sekarang
                </button>
              </div>
            </div>

            {/* LIVE LOGS CONSOLE */}
            <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Log Aktivitas Sinkronisasi
                </span>
                <button
                  onClick={() => setSyncLog([])}
                  className="text-[9px] text-neutral-500 hover:text-neutral-300 font-bold uppercase transition-colors"
                >
                  Bersihkan Log
                </button>
              </div>
              <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 max-h-48 overflow-y-auto font-mono text-[10px] text-neutral-300 space-y-1.5 text-left select-text">
                {syncLog.length === 0 ? (
                  <span className="text-neutral-600 block italic">// Menunggu aktivitas sinkronisasi...</span>
                ) : (
                  syncLog.map((log, idx) => (
                    <div key={idx} className="border-l border-cyan-800/40 pl-2">
                      <span className="text-cyan-500 mr-1.5">&gt;</span> {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail E-Ticket Modal overlay */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <Ticket className="w-5 h-5 text-emerald-400" />
                <div className="text-left">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Detail E-Ticket</h4>
                  <p className="text-[10px] text-neutral-500">Kode Booking: <span className="font-mono font-bold text-emerald-400">{selectedBooking.bookingCode}</span></p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content list */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-left">
              {/* Profil Pelanggan */}
              <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/60 space-y-2">
                <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest border-b border-neutral-800/80 pb-1.5 mb-2">Profil Penyelenggara / Kontak</div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div>
                    <span className="text-neutral-500 block text-[9px] uppercase font-bold">Nama Lengkap</span>
                    <span className="font-semibold text-white">{selectedBooking.name}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px] uppercase font-bold">Nomor WhatsApp</span>
                    <span className="font-semibold text-white">{selectedBooking.whatsapp}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-neutral-500 block text-[9px] uppercase font-bold">Alamat Email</span>
                    <span className="font-semibold text-white">{selectedBooking.email}</span>
                  </div>
                </div>
              </div>

              {/* Rincian Kunjungan */}
              <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/60 space-y-2">
                <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest border-b border-neutral-800/80 pb-1.5 mb-2">Jadwal & Kategori</div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div>
                    <span className="text-neutral-500 block text-[9px] uppercase font-bold">Kategori Kunjungan</span>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedBooking.visitType === "camping" ? "bg-amber-950/60 text-amber-400 border border-amber-800" : "bg-emerald-950/60 text-emerald-400 border border-emerald-800"
                    }`}>
                      {selectedBooking.visitType === "camping" ? "CAMPING GROUND" : "KUNJUNGAN BIASA"}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px] uppercase font-bold">Tanggal Check-In</span>
                    <span className="font-medium text-white">{selectedBooking.checkInDate}</span>
                  </div>
                  {selectedBooking.visitType === "camping" && (
                    <>
                      <div>
                        <span className="text-neutral-500 block text-[9px] uppercase font-bold">Tanggal Check-Out</span>
                        <span className="font-medium text-white">{selectedBooking.checkOutDate || "-"}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[9px] uppercase font-bold">Durasi Menginap</span>
                        <span className="font-semibold text-amber-400">{selectedBooking.numNights || 1} Malam</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Jumlah Tiket & Rincian Sewa */}
              <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/60 space-y-2">
                <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest border-b border-neutral-800/80 pb-1.5 mb-2">Item Dan Rincian Pembayaran</div>
                <div className="space-y-1.5 text-xs text-neutral-400">
                  <div className="flex justify-between">
                    <span>Pengunjung / Orang (x{selectedBooking.numPeople})</span>
                    <span className="text-white font-mono">Rp {((selectedBooking.numPeople || 0) * (selectedBooking.visitType === "camping" ? (settings?.priceCampingPerson || 10000) : (settings?.priceVisitPerson || 5000))).toLocaleString("id-ID")}</span>
                  </div>
                  {selectedBooking.numMotorcycles > 0 && (
                    <div className="flex justify-between">
                      <span>Parkir Sepeda Motor (x{selectedBooking.numMotorcycles})</span>
                      <span className="text-white font-mono">Rp {((selectedBooking.numMotorcycles || 0) * 5000).toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  {selectedBooking.numCars > 0 && (
                    <div className="flex justify-between">
                      <span>Parkir Mobil (x{selectedBooking.numCars})</span>
                      <span className="text-white font-mono">Rp {((selectedBooking.numCars || 0) * 10000).toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  {selectedBooking.visitType === "camping" && selectedBooking.rentals && (() => {
                    const fallbackRentals: { [key: string]: { name: string; price: number } } = {
                      tent: { name: "Sewa Tenda", price: settings?.rentalPrices?.tent || 50000 },
                      sleepingBag: { name: "Sewa Sleeping Bag", price: settings?.rentalPrices?.sleepingBag || 10000 },
                      matras: { name: "Sewa Matras", price: settings?.rentalPrices?.matras || 5000 },
                      firewood: { name: "Kayu Bakar", price: settings?.rentalPrices?.firewood || 10000 }
                    };

                    return Object.entries(selectedBooking.rentals).map(([key, rawQty]) => {
                      const qty = Number(rawQty) || 0;
                      if (qty <= 0) return null;
                      
                      const dbItem = settings?.rentalItems?.find(it => it.id === key);
                      const name = dbItem ? `Sewa ${dbItem.name}` : (fallbackRentals[key]?.name || `Sewa Alat (${key})`);
                      const price = dbItem ? dbItem.price : (fallbackRentals[key]?.price || 0);
                      const totalItemPrice = qty * price;

                      return (
                        <div key={key} className="flex justify-between">
                          <span>{name} (x{qty})</span>
                          <span className="text-white font-mono">Rp {totalItemPrice.toLocaleString("id-ID")}</span>
                        </div>
                      );
                    });
                  })()}
                  <div className="pt-2 border-t border-neutral-800/85 flex justify-between font-bold text-sm text-emerald-400">
                    <span>Total Pembayaran</span>
                    <span className="font-mono">Rp {selectedBooking.totalPrice.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>

              {/* Status Pembayaran & Pembayaran */}
              <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/60 space-y-3">
                <div className="text-[10px] text-neutral-500 uppercase font-black tracking-widest border-b border-neutral-800/80 pb-1.5">Administrasi Tiket</div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div>
                    <span className="text-neutral-500 block text-[9px] uppercase font-bold">Metode Pembayaran</span>
                    <span className="font-bold uppercase text-white">{selectedBooking.paymentMethod}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px] uppercase font-bold">Status Saat Ini</span>
                    <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedBooking.paymentStatus === "Lunas" ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80" :
                      selectedBooking.paymentStatus === "Menunggu Validasi" ? "bg-amber-950/60 text-amber-400 border-amber-800/80" :
                      "bg-rose-950/60 text-rose-400 border-rose-800/80"
                    }`}>
                      {selectedBooking.paymentStatus || "Belum Bayar"}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-neutral-800">
                  <span className="block text-[10px] text-neutral-400 mb-2 font-semibold col-span-2">Ubah Status Pembayaran:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id, "Belum Bayar")}
                      className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        (selectedBooking.paymentStatus || "Belum Bayar") === "Belum Bayar"
                          ? "bg-rose-950 text-rose-400 border-rose-800"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                      }`}
                    >
                      Belum Bayar
                    </button>
                    <button
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id, "Menunggu Validasi")}
                      className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedBooking.paymentStatus === "Menunggu Validasi"
                          ? "bg-amber-950 text-amber-400 border-amber-800"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                      }`}
                    >
                      Validasi
                    </button>
                    <button
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id, "Lunas")}
                      className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedBooking.paymentStatus === "Lunas"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                      }`}
                    >
                      Lunas
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-neutral-800">
              <button
                onClick={() => handleDownloadReceiptJPG(selectedBooking)}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
              >
                <Download className="w-4 h-4" /> Unduh E-Ticket (JPG)
              </button>
              <button
                onClick={() => handleSendTicketEmail(selectedBooking)}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer shadow-lg shadow-indigo-950/20"
              >
                <Send className="w-4 h-4" /> Kirim Tiket Otomatis (Instant)
              </button>
              <button
                onClick={() => {
                  setSelectedBookingForEmail(selectedBooking.id);
                  handleTemplateChange("ticket_confirmation", selectedBooking.id);
                  setActiveTab("gmail");
                  setGmailActiveSubTab("compose");
                  setSelectedBooking(null); // Tutup modal rincian booking
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer shadow-lg shadow-amber-950/20"
              >
                <Mail className="w-4 h-4" /> Kirim E-Ticket (Manual)
              </button>
              <button
                onClick={() => setSelectedBooking(null)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
