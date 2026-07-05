import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Calendar, Users, Bike, Car, ShoppingCart, CheckCircle2, Ticket, ChevronRight, Mail, Download, Printer } from "lucide-react";
import { AdminSettings, Booking, RentalPrices } from "../types";

interface TicketBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AdminSettings;
  onBookingSuccess: () => void;
}

export default function TicketBookingModal({ isOpen, onClose, settings, onBookingSuccess }: TicketBookingModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    email: "",
    visitType: "visit" as "camping" | "visit",
    checkInDate: "",
    checkOutDate: "",
    numPeople: 1,
    numMotorcycles: 0,
    numCars: 0,
    paymentMethod: "tunai" as "tunai" | "qris",
    customResponses: {} as { [key: string]: string }
  });

  const [rentals, setRentals] = useState<RentalPrices>({
    tent: 0,
    sleepingBag: 0,
    matras: 0,
    firewood: 0
  });

  // Dynamic rentals initializer
  useEffect(() => {
    if (isOpen) {
      const initialRentals: { [key: string]: number } = {
        tent: 0,
        sleepingBag: 0,
        matras: 0,
        firewood: 0
      };
      
      if (settings?.rentalItems) {
        settings.rentalItems.forEach(item => {
          initialRentals[item.id] = 0;
        });
      }
      
      setRentals(initialRentals as RentalPrices);
      
      // Initialize dynamic custom field responses
      const initialCustomResponses: { [key: string]: string } = {};
      if (settings?.formFields) {
        settings.formFields.forEach(field => {
          if (!field.isDefault) {
            initialCustomResponses[field.id] = "";
          }
        });
      }
      setFormData(prev => ({
        ...prev,
        customResponses: initialCustomResponses
      }));
    }
  }, [isOpen, settings]);

  const [bookingResult, setBookingResult] = useState<Booking | null>(null);
  const [mailInfo, setMailInfo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [checkoutStep, setCheckoutStep] = useState<"fill" | "summary">("fill");

  // Auto set dates on open
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      
      setFormData(prev => ({
        ...prev,
        checkInDate: todayStr,
        checkOutDate: tomorrowStr
      }));
      setBookingResult(null);
      setErrorMsg("");
      setCheckoutStep("fill");
    }
  }, [isOpen]);

  // Calculate nights
  const calculateNights = () => {
    if (formData.visitType !== "camping" || !formData.checkInDate || !formData.checkOutDate) return 1;
    const start = new Date(formData.checkInDate);
    const end = new Date(formData.checkOutDate);
    const diff = end.getTime() - start.getTime();
    const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  };

  const nightsCount = calculateNights();

  // Price calculations
  const prices = {
    person: formData.visitType === "camping" ? settings.priceCampingPerson : settings.priceVisitPerson,
    motorcycle: formData.visitType === "camping" ? settings.priceCampingMotorcycle : 0, // Free on visit
    car: formData.visitType === "camping" ? settings.priceCampingCar : 0 // Free on visit
  };

  const subtotalPeople = formData.numPeople * prices.person;
  const subtotalMotor = formData.numMotorcycles * prices.motorcycle;
  const subtotalCar = formData.numCars * prices.car;

  // Dynamic rentals calculation
  const getSubtotalRentals = () => {
    if (formData.visitType !== "camping") return 0;
    
    const itemsToSum = settings.rentalItems || [
      { id: "tent", name: "Tenda Dome", price: settings.rentalPrices?.tent || 50000 },
      { id: "sleepingBag", name: "Sleeping Bag", price: settings.rentalPrices?.sleepingBag || 10000 },
      { id: "matras", name: "Matras Alas", price: settings.rentalPrices?.matras || 5000 },
      { id: "firewood", name: "Kayu Api Unggun", price: settings.rentalPrices?.firewood || 10000 }
    ];

    let total = 0;
    itemsToSum.forEach(item => {
      const qty = rentals[item.id] || 0;
      total += qty * item.price;
    });
    return total;
  };

  const subtotalRentals = getSubtotalRentals();

  const grandTotal = (subtotalPeople + subtotalMotor + subtotalCar + subtotalRentals) * (formData.visitType === "camping" ? nightsCount : 1);

  const incrementRent = (item: string) => {
    setRentals(prev => ({ ...prev, [item]: (prev[item] || 0) + 1 }));
  };

  const decrementRent = (item: string) => {
    setRentals(prev => ({ ...prev, [item]: Math.max(0, (prev[item] || 0) - 1) }));
  };

  const handleGoToSummary = () => {
    setErrorMsg("");
    if (!formData.name.trim()) {
      setErrorMsg("Mohon lengkapi Nama Anda");
      return;
    }
    if (!formData.whatsapp.trim()) {
      setErrorMsg("Mohon lengkapi WhatsApp Anda");
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg("Mohon lengkapi Email Anda");
      return;
    }
    if (formData.visitType === "camping") {
      if (!formData.checkInDate || !formData.checkOutDate) {
        setErrorMsg("Mohon lengkapi Tanggal Check-In dan Check-Out");
        return;
      }
      const start = new Date(formData.checkInDate);
      const end = new Date(formData.checkOutDate);
      if (end <= start) {
        setErrorMsg("Tanggal Check-Out harus setelah Tanggal Check-In");
        return;
      }
    } else {
      if (!formData.checkInDate) {
        setErrorMsg("Mohon lengkapi Tanggal Kunjungan");
        return;
      }
    }
    setCheckoutStep("summary");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    if (!formData.name.trim() || !formData.whatsapp.trim() || !formData.email.trim()) {
      setErrorMsg("Mohon lengkapi Nama, WhatsApp, dan Email Anda");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        rentals: formData.visitType === "camping" ? rentals : undefined,
        totalPrice: grandTotal
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat booking");
      }

      setBookingResult(data.booking);
      setMailInfo(data.mailStatus);
      onBookingSuccess();

      // Secara otomatis membuat gambar e-ticket JPG dan memicu auto-reply di server (Gmail/SMTP)
      try {
        const canvas = drawReceiptCanvas(data.booking);
        if (canvas) {
          const ticketImageBase64 = canvas.toDataURL("image/jpeg", 0.90);
          fetch("/api/bookings/send-auto-reply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingId: data.booking.id,
              ticketImageBase64
            })
          })
          .then(r => r.json())
          .then(resData => {
            console.log("[BACKGROUND AUTO-REPLY] Berhasil mengirim instruksi:", resData);
          })
          .catch(e => {
            console.error("[BACKGROUND AUTO-REPLY] Gagal memanggil endpoint:", e);
          });
        }
      } catch (canvasErr) {
        console.error("[BACKGROUND TICKET GEN] Gagal menggambar canvas tiket:", canvasErr);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan koneksi database.");
    } finally {
      setLoading(false);
    }
  };

  // Draw E-Ticket (.jpg) template generator using HTML5 Canvas
  const drawReceiptCanvas = (booking: Booking): HTMLCanvasElement | null => {
    const canvas = document.createElement("canvas");
    canvas.width = 620;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

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
      if (rentals) {
        const defaultRentals: { [key: string]: { name: string; price: number } } = {
          tent: { name: "Sewa Tenda Dome", price: settings?.rentalPrices?.tent || 50000 },
          sleepingBag: { name: "Sewa Sleeping Bag", price: settings?.rentalPrices?.sleepingBag || 10000 },
          matras: { name: "Sewa Matras Camp", price: settings?.rentalPrices?.matras || 5000 },
          firewood: { name: "Sewa Kayu Bakar Api Unggun", price: settings?.rentalPrices?.firewood || 10000 }
        };

        Object.entries(rentals).forEach(([key, rawQty]) => {
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

    // 10. Verification Stamp - defaults to Belum Bayar unless Lunas is preset
    const stampX = 350;
    const stampY = curY;

    ctx.save();
    ctx.translate(stampX + 90, stampY + 45);
    ctx.rotate(-12 * Math.PI / 180);

    const isPaid = booking.paymentStatus === "Lunas";
    
    let primaryStampColor = "#d97706"; // Pending validation default (orange/amber)
    let stampText = "MENUNGGU VALIDASI";
    if (isPaid) {
      primaryStampColor = "#0f5132"; // Forest green
      stampText = "LUNAS / PAID";
    } else if (booking.paymentStatus === "Belum Bayar" || !booking.paymentStatus) {
      if (booking.paymentMethod === "tunai") {
        primaryStampColor = "#c3002f"; // Dark crimson red
        stampText = "BAYAR DI LOKET";
      } else {
        primaryStampColor = "#d97706"; // Amber
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

    return canvas;
  };

  const handleDownloadReceiptJPG = (booking: Booking) => {
    const canvas = drawReceiptCanvas(booking);
    if (!canvas) return;
    const jpegUrl = canvas.toDataURL("image/jpeg", 0.95);
    const dLink = document.createElement("a");
    dLink.download = `E-Ticket-GoaLawah-${booking.bookingCode}.jpg`;
    dLink.href = jpegUrl;
    document.body.appendChild(dLink);
    dLink.click();
    document.body.removeChild(dLink);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1a1a]/60 backdrop-blur-sm overflow-y-auto cursor-pointer"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-white border border-[#5a5a40]/15 rounded-3xl overflow-hidden shadow-2xl text-[#1a1a1a] cursor-default"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#5a5a40]/10 to-[#fdfaf5] border-b border-[#5a5a40]/10">
               <div className="flex items-center gap-3">
                <div className="p-2 bg-[#5a5a40]/10 rounded-xl border border-[#5a5a40]/25 text-[#5a5a40]">
                  <Ticket className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-[#5a5a40] tracking-wide">
                    E-Ticket Goa Lawah
                  </h3>
                  <p className="text-xs text-[#8e8e70]">Pemesanan online instan</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#f5f5f0] text-[#8e8e70] hover:text-[#5a5a40] rounded-full transition-colors"
                id="close-booking-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-600 text-xs text-center font-medium">
                {errorMsg}
              </div>
            )}

            {/* Content box */}
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              {!bookingResult ? (
                checkoutStep === "fill" ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleGoToSummary(); }} className="space-y-6">
                    {/* Step 1: Customer Info */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5a5a40]">1. Data Pemesan</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(settings.formFields || [
                          { id: "name", label: "Nama Lengkap", placeholder: "Contoh: Budi Santoso", type: "text", required: true, isDefault: true },
                          { id: "whatsapp", label: "Nomor WhatsApp", placeholder: "62812345xxxx", type: "tel", required: true, isDefault: true },
                          { id: "email", label: "Alamat Email", placeholder: "namakamu@domain.com", type: "email", required: true, isDefault: true }
                        ]).map((field) => {
                          const isDefault = field.isDefault;
                          const val = isDefault 
                            ? (formData as any)[field.id] 
                            : (formData.customResponses?.[field.id] || "");
                            
                          const onChangeHandler = (valString: string) => {
                            if (isDefault) {
                              setFormData(prev => ({ ...prev, [field.id]: valString }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                customResponses: {
                                  ...(prev.customResponses || {}),
                                  [field.id]: valString
                                }
                              }));
                            }
                          };

                          return (
                            <div key={field.id} className={field.id === "email" ? "col-span-1 md:col-span-2" : "col-span-1"}>
                              <label className="block text-xs font-medium text-[#5a5a40] mb-1.5">
                                {field.label} {field.required && "*"}
                              </label>
                              <input
                                type={field.type}
                                required={field.required}
                                value={val}
                                onChange={(e) => onChangeHandler(e.target.value)}
                                placeholder={field.placeholder}
                                className="w-full bg-[#fdfaf5] border border-[#5a5a40]/10 hover:border-[#5a5a40]/25 focus:border-[#d4a373] text-sm text-[#1a1a1a] placeholder-neutral-400 rounded-xl px-4 py-3 outline-none transition-all"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 2: Visit Categories */}
                    <div className="space-y-4 pt-4 border-t border-[#5a5a40]/10">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5a5a40]">2. Kategori Kunjungan</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, visitType: "visit" })}
                          className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                            formData.visitType === "visit"
                              ? "bg-[#ecf3e6] border-[#5a5a40] text-[#5a5a40] ring-1 ring-[#5a5a40]"
                              : "bg-[#fdfaf5] border-[#5a5a40]/10 hover:border-[#5a5a40]/25 text-[#8e8e70]"
                          }`}
                        >
                          <Ticket className={`w-8 h-8 ${formData.visitType === "visit" ? "text-[#5a5a40]" : "text-[#8e8e70]"}`} />
                          <div>
                            <div className="text-sm font-semibold">Kunjungan Biasa</div>
                            <div className="text-xs text-[#8e8e70] mt-1">Rp {settings.priceVisitPerson.toLocaleString("id-ID")}/orang</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, visitType: "camping" })}
                          className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                            formData.visitType === "camping"
                              ? "bg-[#fdf9f0] border-[#d4a373] text-[#5a5a40] ring-1 ring-[#d4a373]"
                              : "bg-[#fdfaf5] border-[#5a5a40]/10 hover:border-[#5a5a40]/25 text-[#8e8e70]"
                          }`}
                        >
                          <ShoppingCart className={`w-8 h-8 ${formData.visitType === "camping" ? "text-[#d4a373]" : "text-[#8e8e70]"}`} />
                          <div>
                            <div className="text-sm font-semibold">Sewa Camping Ground</div>
                            <div className="text-xs text-[#8e8e70] mt-1">Rp {settings.priceCampingPerson.toLocaleString("id-ID")}/orang/malam</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Step 3: Specific Visit Forms */}
                    <div className="space-y-4 pt-4 border-t border-[#5a5a40]/10">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5a5a40]">3. Jadwal & Jumlah</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#5a5a40] mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#5a5a40]" /> Tanggal Masuk (Check In) *
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.checkInDate}
                            onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                            className="w-full bg-[#fdfaf5] border border-[#5a5a40]/10 text-sm text-[#1a1a1a] rounded-xl px-4 py-3 outline-none focus:border-[#5a5a40]"
                          />
                        </div>

                        {formData.visitType === "camping" && (
                          <div>
                            <label className="block text-xs font-medium text-[#5a5a40] mb-1.5 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#d4a373]" /> Tanggal Keluar (Check Out) *
                            </label>
                            <input
                              type="date"
                              required
                              min={formData.checkInDate}
                              value={formData.checkOutDate}
                              onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                              className="w-full bg-[#fdfaf5] border border-[#5a5a40]/10 text-sm text-[#1a1a1a] rounded-xl px-4 py-3 outline-none focus:border-[#d4a373]"
                            />
                          </div>
                        )}
                      </div>

                      {formData.visitType === "camping" && (
                        <div className="p-3 bg-[#fdfaf5] border border-[#5a5a40]/10 rounded-xl flex justify-between items-center text-xs text-[#5a5a40]">
                          <span>Durasi Bermalam:</span>
                          <span className="font-bold text-[#d4a373]">{nightsCount} Malam</span>
                        </div>
                      )}

                      {/* Steppers count */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div className="bg-[#fdfaf5] p-4 rounded-xl border border-[#5a5a40]/10 flex flex-col justify-between">
                          <div className="text-xs text-[#5a5a40] font-semibold mb-1 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#5a5a40]" /> Jumlah Pengunjung
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-[#8e8e70]">Rp {prices.person.toLocaleString()}/pax</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, numPeople: Math.max(1, formData.numPeople - 1) })}
                                className="px-2.5 py-1 bg-[#f5f5f0] border border-[#5a5a40]/15 text-[#5a5a40] rounded hover:bg-[#e9e9df] font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={formData.numPeople || ""}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setFormData({ ...formData, numPeople: isNaN(val) ? 0 : val });
                                }}
                                onBlur={() => {
                                  if (formData.numPeople < 1) {
                                    setFormData({ ...formData, numPeople: 1 });
                                  }
                                }}
                                className="w-12 text-center bg-white border border-[#5a5a40]/15 rounded-md py-0.5 text-sm font-semibold text-[#1a1a1a] focus:border-[#d4a373] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, numPeople: formData.numPeople + 1 })}
                                className="px-2.5 py-1 bg-[#f5f5f0] border border-[#5a5a40]/15 text-[#5a5a40] rounded hover:bg-[#e9e9df] font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#fdfaf5] p-4 rounded-xl border border-[#5a5a40]/10 flex flex-col justify-between">
                          <div className="text-xs text-[#5a5a40] font-semibold mb-1 flex items-center gap-1.5">
                            <Bike className="w-3.5 h-3.5 text-[#5a5a40]" /> Kendaraan Motor
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-[#8e8e70]">
                              {formData.visitType === "camping" ? `Rp ${settings.priceCampingMotorcycle.toLocaleString()}` : "Gratis"}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, numMotorcycles: Math.max(0, formData.numMotorcycles - 1) })}
                                className="px-2.5 py-1 bg-[#f5f5f0] border border-[#5a5a40]/15 text-[#5a5a40] rounded hover:bg-[#e9e9df] font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={formData.numMotorcycles === 0 && formData.numMotorcycles !== null ? "0" : formData.numMotorcycles || ""}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setFormData({ ...formData, numMotorcycles: isNaN(val) ? 0 : val });
                                }}
                                onBlur={() => {
                                  if (formData.numMotorcycles < 0) {
                                    setFormData({ ...formData, numMotorcycles: 0 });
                                  }
                                }}
                                className="w-12 text-center bg-white border border-[#5a5a40]/15 rounded-md py-0.5 text-sm font-semibold text-[#1a1a1a] focus:border-[#d4a373] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, numMotorcycles: formData.numMotorcycles + 1 })}
                                className="px-2.5 py-1 bg-[#f5f5f0] border border-[#5a5a40]/15 text-[#5a5a40] rounded hover:bg-[#e9e9df] font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#fdfaf5] p-4 rounded-xl border border-[#5a5a40]/10 flex flex-col justify-between">
                          <div className="text-xs text-[#5a5a40] font-semibold mb-1 flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-[#5a5a40]" /> Kendaraan Mobil
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-[#8e8e70]">
                              {formData.visitType === "camping" ? `Rp ${settings.priceCampingCar.toLocaleString()}` : "Gratis"}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, numCars: Math.max(0, formData.numCars - 1) })}
                                className="px-2.5 py-1 bg-[#f5f5f0] border border-[#5a5a40]/15 text-[#5a5a40] rounded hover:bg-[#e9e9df] font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={formData.numCars === 0 && formData.numCars !== null ? "0" : formData.numCars || ""}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setFormData({ ...formData, numCars: isNaN(val) ? 0 : val });
                                }}
                                onBlur={() => {
                                  if (formData.numCars < 0) {
                                    setFormData({ ...formData, numCars: 0 });
                                  }
                                }}
                                className="w-12 text-center bg-white border border-[#5a5a40]/15 rounded-md py-0.5 text-sm font-semibold text-[#1a1a1a] focus:border-[#d4a373] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, numCars: formData.numCars + 1 })}
                                className="px-2.5 py-1 bg-[#f5f5f0] border border-[#5a5a40]/15 text-[#5a5a40] rounded hover:bg-[#e9e9df] font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Camping Rental Gear Section */}
                    {formData.visitType === "camping" && (
                      <div className="space-y-4 pt-4 border-t border-[#5a5a40]/10 p-4 bg-[#ecf3e6]/30 rounded-2xl border border-[#5a5a40]/10">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5a5a40] flex items-center gap-1.5">
                          <ShoppingCart className="w-4 h-4" /> Penyewaan Tambahan Alat Camping
                        </h4>
                        <p className="text-[11px] text-[#8e8e70] -mt-1.5">Biaya sewa berlaku per malam</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                          {(settings.rentalItems || [
                            { id: "tent", name: "Tenda Dome", price: settings.rentalPrices?.tent || 50000 },
                            { id: "sleepingBag", name: "Sleeping Bag", price: settings.rentalPrices?.sleepingBag || 10000 },
                            { id: "matras", name: "Matras Alas", price: settings.rentalPrices?.matras || 5000 },
                            { id: "firewood", name: "Kayu Bakar Api Unggun", price: settings.rentalPrices?.firewood || 10000 }
                          ]).map((item) => {
                            const count = rentals[item.id] || 0;
                            return (
                              <div key={item.id} className="bg-white p-3 rounded-xl flex items-center justify-between border border-[#5a5a40]/10">
                                <div>
                                  <div className="text-xs font-semibold text-[#5a5a40]">{item.name}</div>
                                  <div className="text-[10px] text-[#8e8e70]">Rp {item.price.toLocaleString()}/malam</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => decrementRent(item.id)}
                                    className="px-2 py-0.5 bg-[#f5f5f0] text-xs text-[#5a5a40] border border-[#5a5a40]/10 rounded hover:bg-[#e9e9df] font-semibold cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-bold w-4 text-center text-[#1a1a1a]">{count}</span>
                                  <button
                                    type="button"
                                    onClick={() => incrementRent(item.id)}
                                    className="px-2 py-0.5 bg-[#f5f5f0] text-xs text-[#5a5a40] border border-[#5a5a40]/10 rounded hover:bg-[#e9e9df] font-semibold cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Payment selection & total calculation */}
                    <div className="space-y-4 pt-4 border-t border-[#5a5a40]/10 p-4 bg-[#fdfaf5] rounded-2xl border border-[#5a5a40]/10">
                      <div>
                        <label className="block text-xs font-semibold text-[#5a5a40] mb-1.5">Pilih Metode Pembayaran *</label>
                        <div className="grid grid-cols-2 gap-3 mt-1">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, paymentMethod: "tunai" })}
                            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                              formData.paymentMethod === "tunai"
                                ? "bg-[#ecf3e6] border-[#5a5a40] text-[#5a5a40] ring-1 ring-[#5a5a40]"
                                : "bg-white border-[#5a5a40]/10 text-[#8e8e70]"
                            }`}
                          >
                            Bayar Tunai di Lokasi
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, paymentMethod: "qris" })}
                            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                              formData.paymentMethod === "qris"
                                ? "bg-[#fdf9f0] border-[#d4a373] text-[#5a5a40] ring-1 ring-[#d4a373]"
                                : "bg-white border-[#5a5a40]/10 text-[#8e8e70]"
                            }`}
                          >
                            Transfer / QRIS Pokdarwis
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm pt-2 border-t border-[#5a5a40]/10">
                        <span className="font-semibold text-[#5a5a40]">Total Pembayaran tiket:</span>
                        <span className="text-lg font-bold text-[#5a5a40] font-display">
                          Rp {grandTotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                      {formData.paymentMethod === "qris" && (
                        <p className="text-[10px] text-[#d4a373] mt-1 text-center font-medium">
                          * Tunjukkan QR Code pembayaran di loket saat check-in untuk divalidasi.
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#5a5a40] hover:bg-[#4a4a35] text-white font-bold text-sm tracking-wider py-4 px-6 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      <ShoppingCart className="w-5 h-5" /> Checkout / Rincian Pesanan
                    </button>
                  </form>
                ) : (
                  /* Checkout Rincian Pesanan View (Summary) */
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm text-[#5a5a40] font-semibold border-b border-[#5a5a40]/10 pb-3">
                      <button
                        type="button"
                        onClick={() => setCheckoutStep("fill")}
                        className="hover:underline text-xs text-[#5a5a40] flex items-center gap-1.5 cursor-pointer font-bold duration-150"
                      >
                        &larr; Kembali ke Isi Data
                      </button>
                      <span className="text-neutral-300">/</span>
                      <span className="text-xs text-[#8e8e70] font-normal">Satu langkah lagi untuk memesan</span>
                    </div>

                    <div className="bg-[#fdfaf5] border border-[#5a5a40]/15 rounded-3xl p-6 space-y-4">
                      <h4 className="text-sm font-bold text-[#5a5a40] border-b border-[#5a5a40]/10 pb-2">Rincian Ringkasan Pesanan</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs">
                        <div>
                          <span className="text-[#8e8e70] text-[10px] uppercase tracking-wider block font-semibold mb-0.5">Nama Lengkap</span>
                          <span className="font-bold text-neutral-800 text-sm">{formData.name}</span>
                        </div>
                        <div>
                          <span className="text-[#8e8e70] text-[10px] uppercase tracking-wider block font-semibold mb-0.5">Nomor WhatsApp</span>
                          <span className="font-bold text-neutral-800 text-sm">{formData.whatsapp}</span>
                        </div>
                        <div>
                          <span className="text-[#8e8e70] text-[10px] uppercase tracking-wider block font-semibold mb-0.5">Alamat Email</span>
                          <span className="font-bold text-neutral-800 text-sm">{formData.email}</span>
                        </div>
                        <div>
                          <span className="text-[#8e8e70] text-[10px] uppercase tracking-wider block font-semibold mb-0.5">Kategori</span>
                          <span className="font-bold text-[#d4a373] text-sm uppercase">
                            {formData.visitType === "camping" ? "🏕️ Camping Ground" : "🎟️ Kunjungan Biasa"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8e8e70] text-[10px] uppercase tracking-wider block font-semibold mb-0.5">Tanggal Check-In</span>
                          <span className="font-bold text-neutral-800 text-sm">
                            {new Date(formData.checkInDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                        </div>
                        {formData.visitType === "camping" && formData.checkOutDate && (
                          <div>
                            <span className="text-[#8e8e70] text-[10px] uppercase tracking-wider block font-semibold mb-0.5">Tanggal Check-Out</span>
                            <span className="font-bold text-neutral-800 text-sm">
                              {new Date(formData.checkOutDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} ({nightsCount} Malam)
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-[#8e8e70] text-[10px] uppercase tracking-wider block font-semibold mb-0.5">Pengunjung & Kendaraan</span>
                          <span className="font-bold text-neutral-800 text-sm">
                            {formData.numPeople} Orang {formData.numMotorcycles > 0 && `, ${formData.numMotorcycles} Motor`} {formData.numCars > 0 && `, ${formData.numCars} Mobil`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8e8e70] text-[10px] uppercase tracking-wider block font-semibold mb-0.5">Metode Bayar</span>
                          <span className="font-extrabold text-emerald-700 text-sm uppercase">
                            {formData.paymentMethod === "tunai" ? "Tunai di Loket" : "Transfer / QRIS Pokdarwis"}
                          </span>
                        </div>
                      </div>

                      {/* Fees Items Breakdown list */}
                      <div className="bg-white p-4 rounded-2xl border border-[#5a5a40]/10 text-xs space-y-2 mt-4 text-neutral-700">
                        <span className="block font-bold text-[#5a5a40] border-b border-[#5a5a40]/5 pb-1 mb-1">Rincian Perhitungan Biaya</span>
                        <div className="flex justify-between">
                          <span>Tiket Masuk ({formData.numPeople} Orang)</span>
                          <span className="font-semibold text-neutral-900">Rp {subtotalPeople.toLocaleString("id-ID")}</span>
                        </div>
                        {formData.visitType === "camping" && (
                          <>
                            {formData.numMotorcycles > 0 && (
                              <div className="flex justify-between">
                                  <span>Biaya Parkir Motor ({formData.numMotorcycles} Unit)</span>
                                  <span className="font-semibold text-neutral-900">Rp {subtotalMotor.toLocaleString("id-ID")}</span>
                              </div>
                            )}
                            {formData.numCars > 0 && (
                              <div className="flex justify-between">
                                  <span>Biaya Parkir Mobil ({formData.numCars} Unit)</span>
                                  <span className="font-semibold text-neutral-900">Rp {subtotalCar.toLocaleString("id-ID")}</span>
                              </div>
                            )}
                            
                            {/* Rentals items list */}
                            {(rentals.tent > 0 || rentals.sleepingBag > 0 || rentals.matras > 0 || rentals.firewood > 0) && (
                              <div className="border-t border-[#5a5a40]/5 pt-2 mt-2">
                                <span className="block font-semibold text-[#5a5a40] mb-1">Rincian Alat Camping:</span>
                                {rentals.tent > 0 && (
                                  <div className="flex justify-between pl-2">
                                    <span>Tenda Dome (x{rentals.tent})</span>
                                    <span>Rp {(rentals.tent * settings.rentalPrices.tent).toLocaleString("id-ID")}</span>
                                  </div>
                                )}
                                {rentals.sleepingBag > 0 && (
                                  <div className="flex justify-between pl-2">
                                    <span>Sleeping Bag (x{rentals.sleepingBag})</span>
                                    <span>Rp {(rentals.sleepingBag * settings.rentalPrices.sleepingBag).toLocaleString("id-ID")}</span>
                                  </div>
                                )}
                                {rentals.matras > 0 && (
                                  <div className="flex justify-between pl-2">
                                    <span>Matras Alas (x{rentals.matras})</span>
                                    <span>Rp {(rentals.matras * settings.rentalPrices.matras).toLocaleString("id-ID")}</span>
                                  </div>
                                )}
                                {rentals.firewood > 0 && (
                                  <div className="flex justify-between pl-2">
                                    <span>Kayu Bakar Api Unggun (x{rentals.firewood})</span>
                                    <span>Rp {(rentals.firewood * settings.rentalPrices.firewood).toLocaleString("id-ID")}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {nightsCount > 1 && (
                              <div className="text-[10px] text-amber-700 italic font-medium pt-1">
                                * Biaya dikalikan dengan {nightsCount} malam masa menginap.
                              </div>
                            )}
                          </>
                        )}

                        <div className="flex justify-between border-t border-[#5a5a40]/15 pt-2.5 font-bold text-sm text-[#5a5a40] mt-2">
                          <span>Total Pembayaran Akhir:</span>
                          <span className="text-base text-neutral-900">Rp {grandTotal.toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSubmit()}
                      disabled={loading}
                      className="w-full bg-[#5a5a40] hover:bg-[#4a4a35] text-white font-bold text-sm tracking-wider py-4 px-6 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shadow-md shadow-[#5a5a40]/10"
                    >
                      {loading ? (
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" /> Pesan Sekarang
                        </>
                      )}
                    </button>
                  </div>
                )
              ) : (
                /* Ticket Receipt Display */
                <div className="space-y-6">
                  {/* Visual success alert */}
                  <div className="p-4 bg-[#ecf3e6] border border-[#5a5a40]/15 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-[#5a5a40] shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-[#5a5a40]">Booking E-Ticket Berhasil!</h4>
                      <p className="text-xs text-[#8e8e70] mt-0.5">{mailInfo}</p>
                    </div>
                  </div>

                  {/* High Quality Printable Ticket Layout */}
                  <div
                    id="printable-ticket-area"
                    className="bg-[#fdfaf5] text-[#1a1a1a] rounded-3xl overflow-hidden shadow-xl p-6 border-4 border-dashed border-[#5a5a40] relative flex flex-col gap-6"
                  >
                    {/* Upper decorative elements */}
                    <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-6 h-12 bg-[#1a1a1a]/60 rounded-r-full -ml-3" />
                    <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-6 h-12 bg-[#1a1a1a]/60 rounded-l-full -mr-3" />

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#5a5a40]/10 pb-4 gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={settings.logoUrl}
                          onError={(e) => { (e.target as HTMLImageElement).src = "/src/assets/images/goa_lawah_logo_1781677843742.jpg" }}
                          className="w-12 h-12 rounded-full border border-[#5a5a40] object-cover"
                          alt="logo"
                        />
                        <div>
                          <h4 className="font-display font-bold text-sm tracking-wide text-[#5a5a40]">GOA LAWAH</h4>
                          <p className="text-[10px] text-[#8e8e70]">Pokdarwis Narmada - Lombok Barat</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-[#ecf3e6] text-[#5a5a40] font-extrabold text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full border border-[#5a5a40]/25">
                          {bookingResult.visitType === "camping" ? "CAMPING PASS" : "VISITOR PASS"}
                        </span>
                        <p className="text-[10px] text-[#8e8e70] mt-1">{new Date(bookingResult.createdAt).toLocaleDateString("id-ID")}</p>
                      </div>
                    </div>

                    {/* Ticket Details Body */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs border-b border-[#5a5a40]/10 pb-4">
                      <div>
                        <span className="text-[10px] text-[#8e8e70] block uppercase font-semibold">Nama Pemesan</span>
                        <span className="font-bold text-[#5a5a40]">{bookingResult.name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8e8e70] block uppercase font-semibold">Nomor WhatsApp</span>
                        <span className="font-bold text-[#5a5a40]">{bookingResult.whatsapp}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8e8e70] block uppercase font-semibold">Check-In</span>
                        <span className="font-bold text-[#5a5a40]">
                          {new Date(bookingResult.checkInDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                      </div>
                      <div>
                        {bookingResult.visitType === "camping" && bookingResult.checkOutDate ? (
                          <>
                            <span className="text-[10px] text-[#8e8e70] block uppercase font-semibold">Check-Out</span>
                            <span className="font-bold text-[#5a5a40]">
                              {new Date(bookingResult.checkOutDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] text-[#8e8e70] block uppercase font-semibold">Metode Bayar</span>
                            <span className="font-bold text-[#d4a373] uppercase">{bookingResult.paymentMethod} (On-Site)</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Breakdown and items log */}
                    <div className="bg-[#f5f5f0]/50 p-4 rounded-2xl border border-[#5a5a40]/10 text-xs text-[#1a1a1a]">
                      <h4 className="font-semibold text-[#5a5a40] mb-2 border-b border-[#5a5a40]/10 pb-1">Detail Rincian Biaya</h4>
                      <div className="space-y-1 text-[#8e8e70]">
                        <div className="flex justify-between">
                          <span>
                            {bookingResult.numPeople} Pengunjung x Rp {prices.person.toLocaleString("id-ID")}
                            {bookingResult.visitType === "camping" ? ` x ${bookingResult.numNights} malam` : ""}
                          </span>
                          <span className="font-semibold text-[#1a1a1a]">
                            Rp {((bookingResult.numPeople * prices.person) * (bookingResult.numNights || 1)).toLocaleString("id-ID")}
                          </span>
                        </div>

                        {bookingResult.visitType === "camping" && (
                          <>
                            {(bookingResult.numMotorcycles || 0) > 0 && (
                              <div className="flex justify-between">
                                <span>
                                  {bookingResult.numMotorcycles} Motor x Rp {settings.priceCampingMotorcycle.toLocaleString()} x {bookingResult.numNights} malam
                                </span>
                                <span className="font-semibold text-[#1a1a1a]">
                                  Rp {((bookingResult.numMotorcycles * settings.priceCampingMotorcycle) * (bookingResult.numNights || 1)).toLocaleString("id-ID")}
                                </span>
                              </div>
                            )}

                            {(bookingResult.numCars || 0) > 0 && (
                              <div className="flex justify-between">
                                <span>
                                  {bookingResult.numCars} Mobil x Rp {settings.priceCampingCar.toLocaleString()} x {bookingResult.numNights} malam
                                </span>
                                <span className="font-semibold text-[#1a1a1a]">
                                  Rp {((bookingResult.numCars * settings.priceCampingCar) * (bookingResult.numNights || 1)).toLocaleString("id-ID")}
                                </span>
                              </div>
                            )}

                            {/* Rentals list */}
                            {bookingResult.rentals && (
                              <>
                                {bookingResult.rentals.tent > 0 && (
                                  <div className="flex justify-between">
                                    <span>
                                      {bookingResult.rentals.tent} Tenda Dome x Rp {settings.rentalPrices.tent.toLocaleString()} x {bookingResult.numNights} malam
                                    </span>
                                    <span className="font-semibold text-[#1a1a1a]">
                                      Rp {(bookingResult.rentals.tent * settings.rentalPrices.tent * (bookingResult.numNights || 1)).toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                )}
                                {bookingResult.rentals.sleepingBag > 0 && (
                                  <div className="flex justify-between">
                                    <span>
                                      {bookingResult.rentals.sleepingBag} Sleeping Bag x Rp {settings.rentalPrices.sleepingBag.toLocaleString()} x {bookingResult.numNights} malam
                                    </span>
                                    <span className="font-semibold text-[#1a1a1a]">
                                      Rp {(bookingResult.rentals.sleepingBag * settings.rentalPrices.sleepingBag * (bookingResult.numNights || 1)).toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                )}
                                {bookingResult.rentals.matras > 0 && (
                                  <div className="flex justify-between">
                                    <span>
                                      {bookingResult.rentals.matras} Matras x Rp {settings.rentalPrices.matras.toLocaleString()} x {bookingResult.numNights} malam
                                    </span>
                                    <span className="font-semibold text-[#1a1a1a]">
                                      Rp {(bookingResult.rentals.matras * settings.rentalPrices.matras * (bookingResult.numNights || 1)).toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                )}
                                {bookingResult.rentals.firewood > 0 && (
                                  <div className="flex justify-between">
                                    <span>
                                      {bookingResult.rentals.firewood} Kayu Bakar x Rp {settings.rentalPrices.firewood.toLocaleString()} x {bookingResult.numNights} malam
                                    </span>
                                    <span className="font-semibold text-[#1a1a1a]">
                                      Rp {(bookingResult.rentals.firewood * settings.rentalPrices.firewood * (bookingResult.numNights || 1)).toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}
                        
                        <div className="flex justify-between border-t border-[#5a5a40]/10 pt-2 font-bold text-sm text-[#5a5a40] mt-2">
                          <span>Total Tagihan:</span>
                          <span>Rp {bookingResult.totalPrice.toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom ticket details, code, barcode and mail sender */}
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-[#ecf3e6] p-4 rounded-xl border border-[#5a5a40]/15 text-center sm:text-left gap-4">
                      <div>
                        <span className="text-[9px] text-[#8e8e70] uppercase font-semibold">Tunjukkan Kode Booking di Loket</span>
                        <div className="font-display font-black text-xl tracking-widest text-[#5a5a40] mt-0.5">
                          {bookingResult.bookingCode}
                        </div>
                        <p className="text-[10px] text-[#8e8e70] mt-1 flex items-center justify-center sm:justify-start gap-1">
                          <Mail className="w-3.5 h-3.5 text-[#5a5a40]" /> wisata.goalawah@gmail.com
                        </p>
                      </div>
                      <div className="flex flex-col items-center">
                        {/* Realistic Mock Barcode using pure css */}
                        <div className="flex h-10 w-44 bg-[#1a1a1a] rounded overflow-hidden p-1 items-stretch gap-[1.5px] border border-[#1a1a1a]">
                          {Array.from({ length: 35 }).map((_, idx) => (
                            <div
                              key={idx}
                              style={{ width: idx % 3 === 0 ? "3px" : idx % 5 === 0 ? "5px" : "1.5px" }}
                              className="bg-white h-full shrink-0"
                            />
                          ))}
                        </div>
                        <span className="text-[8px] text-[#8e8e70] tracking-widest font-mono mt-1">*{bookingResult.id}*</span>
                      </div>
                    </div>

                    <div className="text-center text-[9px] text-[#8e8e70] italic">
                      Harap simpan e-ticket ini. Tiket dikonfirmasi dan dikirim otomatis dari alamat wisata.goalawah@gmail.com ke email pemohon.
                    </div>
                  </div>

                  {/* Actions under receipt */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => bookingResult && handleDownloadReceiptJPG(bookingResult)}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg shadow-emerald-900/10"
                    >
                      <Download className="w-4 h-4" /> Unduh Bukti Booking (JPG)
                    </button>
                    <button
                      onClick={onClose}
                      className="bg-[#5a5a40] hover:bg-[#4a4a35] text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      Buka Biolink Utama
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
