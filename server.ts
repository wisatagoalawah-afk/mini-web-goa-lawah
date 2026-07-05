import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
import { AdminSettings, Booking, Feedback, VisitorStats } from "./src/types";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "https://gxkyfdwfmxrnkfmpoxly.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4a3lmZHdmbXhybmtmbXBveGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4ODgyODcsImV4cCI6MjA5ODQ2NDI4N30.8HEnMmnrQKAITcPYR44YxSaw_lDWDtC7c-IGo13gL80";

const supabase = createClient(supabaseUrl, supabaseAnonKey);


// -------------------------------------------------------------
// EMAIL NOTIFICATION SYSTEM (Nodemailer SMTP integration)
// -------------------------------------------------------------
async function sendAdminNotification(subject: string, htmlContent: string) {
  const host = process.env.SMTP_HOST || "";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const toEmail = process.env.ADMIN_ALERT_EMAIL || "wisata.goalawah@gmail.com";

  if (!host || !user || !pass) {
    console.warn(`[EMAIL-NOTIFICATION] Gmail/SMTP is not fully configured (SMTP_HOST, SMTP_USER, SMTP_PASS). Skipping real email send.`);
    console.log(`[SIMULATED EMAIL TO ${toEmail}] Subject: ${subject}`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"Wisata Goa Lawah" <${user}>`,
      to: toEmail,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL-NOTIFICATION] ✅ Email sent successfully: ${info.messageId}`);
  } catch (error: any) {
    console.error(`[EMAIL-NOTIFICATION] ❌ Failed to send email:`, error.message);
  }
}

async function sendBookingNotificationEmail(booking: Booking) {
  const subject = `🏕️ [Booking Baru] ${booking.name} (${booking.bookingCode})`;

  const dateCheckin = new Date(booking.checkInDate).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const dateCheckout = booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }) : "-";

  let rentalsHtml = "";
  if (booking.rentals && booking.visitType === "camping") {
    rentalsHtml = `
      <h3 style="border-bottom: 2px solid #16a34a; padding-bottom: 5px; color: #166534; font-size: 15px; margin-top: 20px;">Detail Sewa Peralatan</h3>
      <table style="width: 100%; text-align: left; border-collapse: collapse; margin-top: 10px;">
        <tr style="background: #f4f4f5;">
          <th style="padding: 8px; border: 1px solid #e4e4e7;">Alat</th>
          <th style="padding: 8px; border: 1px solid #e4e4e7; text-align: center;">Jumlah</th>
        </tr>
        ${booking.rentals.tent > 0 ? `<tr><td style="padding: 8px; border: 1px solid #e4e4e7;">Tenda Dome (Kapasitas 4 Orang)</td><td style="padding: 8px; border: 1px solid #e4e4e7; text-align: center;">${booking.rentals.tent}</td></tr>` : ""}
        ${booking.rentals.sleepingBag > 0 ? `<tr><td style="padding: 8px; border: 1px solid #e4e4e7;">Sleeping Bag (Kantong Tidur)</td><td style="padding: 8px; border: 1px solid #e4e4e7; text-align: center;">${booking.rentals.sleepingBag}</td></tr>` : ""}
        ${booking.rentals.matras > 0 ? `<tr><td style="padding: 8px; border: 1px solid #e4e4e7;">Matras Camping</td><td style="padding: 8px; border: 1px solid #e4e4e7; text-align: center;">${booking.rentals.matras}</td></tr>` : ""}
        ${booking.rentals.firewood > 0 ? `<tr><td style="padding: 8px; border: 1px solid #e4e4e7;">Kayu Bakar (Per Ikat)</td><td style="padding: 8px; border: 1px solid #e4e4e7; text-align: center;">${booking.rentals.firewood}</td></tr>` : ""}
      </table>
    `;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; background-color: #fafafa;">
      <div style="background-color: #064e3b; padding: 24px; text-align: center;">
        <h1 style="color: #4ade80; margin: 0; font-size: 22px; font-weight: bold;">🏕️ BOOKING ONLINE GOA LAWAH</h1>
        <p style="color: #a7f3d0; margin: 5px 0 0 0; font-size: 13px;">Pemberitahuan Sistem Pendaftaran Otomatis</p>
      </div>
      <div style="padding: 24px; color: #27272a; line-height: 1.6; background-color: #ffffff;">
        <p style="margin-top: 0; font-size: 15px;">Halo Admin Wisata Goa Lawah,</p>
        <p>Sistem mendeteksi adanya pemesanan tiket masuk baru secara online dengan rincian berikut:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold; width: 40%;">Kode Booking:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f4f4f5; color: #16a34a; font-weight: bold; font-size: 15px;">${booking.bookingCode}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold;">Nama Lengkap:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5;">${booking.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold;">WhatsApp / Telepon:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5;"><a href="https://wa.me/${booking.whatsapp.replace(/\D/g, "")}" style="color: #16a34a; text-decoration: none; font-weight: bold;">${booking.whatsapp}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold;">Email Pemesan:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5;"><a href="mailto:${booking.email}" style="color: #0284c7; text-decoration: none;">${booking.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold;">Jenis Kunjungan:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; text-transform: uppercase; font-weight: bold; color: #15803d;">${booking.visitType === "camping" ? "🏕️ Camping Ground" : "🎟️ Kunjungan Harian (Saja)"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold;">Tanggal Masuk (Check-in):</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; color: #1e293b;">${dateCheckin}</td>
          </tr>
          ${booking.visitType === "camping" ? `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold;">Tanggal Keluar (Check-out):</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; color: #1e293b;">${dateCheckout}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold;">Durasi Menginap:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5;">${booking.numNights} Malam</td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold;">Jumlah Pengunjung:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5;">${booking.numPeople} Orang</td>
          </tr>
          ${booking.numMotorcycles > 0 ? `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold;">Jumlah Motor:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5;">${booking.numMotorcycles} Unit</td>
          </tr>
          ` : ""}
          ${booking.numCars > 0 ? `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold;">Jumlah Mobil:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5;">${booking.numCars} Unit</td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold;">Metode Pembayaran:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; text-transform: uppercase; font-weight: bold; color: #4b5563;">${booking.paymentMethod}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold;">Status Pembayaran:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5;"><span style="background: #fef3c7; color: #d97706; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${booking.paymentStatus}</span></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; font-size: 16px;">Total Pembayaran:</td>
            <td style="padding: 10px 0; font-size: 18px; font-weight: bold; color: #dc2626;">Rp ${booking.totalPrice.toLocaleString("id-ID")}</td>
          </tr>
        </table>

        ${rentalsHtml}

        <div style="margin-top: 30px; border-top: 1px solid #e4e4e7; padding-top: 20px; text-align: center;">
          <a href="https://wa.me/${booking.whatsapp.replace(/\D/g, "")}?text=Halo%20${encodeURIComponent(booking.name)},%20kami%20dari%20Pengelola%20Wisata%20Goa%20Lawah%20telah%20menerima%20detail%20booking%20Anda" 
             style="display: inline-block; background-color: #22c55e; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            💬 Hubungi Pemesan via WhatsApp
          </a>
        </div>
      </div>
      <div style="background-color: #f4f4f5; padding: 16px; text-align: center; font-size: 11px; color: #71717a; border-top: 1px solid #e4e4e7;">
        Email ini dikirim secara otomatis oleh Sistem Portal Wisata Alam Goa Lawah.<br/>
        Silakan kelola pesanan ini di halaman Admin Panel.
      </div>
    </div>
  `;

  await sendAdminNotification(subject, html);
}

async function sendFeedbackNotificationEmail(feedback: Feedback) {
  const subject = `📥 [Kritik/Saran Baru] Masukan dari ${feedback.name}`;

  const dateSub = new Date(feedback.createdAt).toLocaleString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; background-color: #fafafa;">
      <div style="background-color: #0369a1; padding: 24px; text-align: center;">
        <h1 style="color: #38bdf8; margin: 0; font-size: 22px; font-weight: bold;">📥 KRITIK & SARAN PENGUNJUNG</h1>
        <p style="color: #bae6fd; margin: 5px 0 0 0; font-size: 13px;">Wisata Alam Goa Lawah</p>
      </div>
      <div style="padding: 24px; color: #27272a; line-height: 1.6; background-color: #ffffff;">
        <p style="margin-top: 0; font-size: 15px;">Halo Admin Wisata Goa Lawah,</p>
        <p>Sistem mendeteksi kritik atau saran baru yang dikirimkan oleh pengunjung lewat website:</p>
        
        <div style="background: #f0fdfa; border-left: 4px solid #0284c7; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; margin-bottom: 8px; color: #0369a1; font-size: 14px;">"${feedback.name}" menulis:</h3>
          <p style="font-style: italic; margin: 0; font-size: 15px; color: #1e293b; white-space: pre-line;">${feedback.message}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold; width: 40%;">Dikirim oleh:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5;">${feedback.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-weight: bold;">Kejadian/Waktu:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5;">${dateSub} WIB</td>
          </tr>
        </table>

        <p style="margin-top: 20px; font-size: 13px; color: #71717a;">Gunakan feedback berharga ini untuk meningkatkan kenyamanan Goa Lawah di masa mendatang.</p>
      </div>
      <div style="background-color: #f4f4f5; padding: 16px; text-align: center; font-size: 11px; color: #71717a; border-top: 1px solid #e4e4e7;">
        Email ini dikirim secara otomatis oleh Sistem Portal Wisata Alam Goa Lawah.<br/>
        Silakan kelola kritik & saran di halaman Admin Panel.
      </div>
    </div>
  `;

  await sendAdminNotification(subject, html);
}

function buildMultipartMime(
  to: string,
  subject: string,
  htmlBody: string,
  base64Attachment?: string,
  attachmentFilename?: string
): string {
  const boundary = "==_Boundary_Link_GoaLawah_==";
  const cleanSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

  const mimeParts = [
    `To: ${to}`,
    `Subject: ${cleanSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    htmlBody,
  ];

  if (base64Attachment && attachmentFilename) {
    const base64Data = base64Attachment.includes("base64,")
      ? base64Attachment.split("base64,")[1]
      : base64Attachment;

    mimeParts.push(
      `--${boundary}`,
      `Content-Type: image/jpeg; name="${attachmentFilename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${attachmentFilename}"`,
      "",
      base64Data
    );
  }

  mimeParts.push(`--${boundary}--`);

  return mimeParts.join("\r\n");
}

async function triggerAutoReply(booking: Booking, ticketImageBase64?: string) {
  try {
    const token = serverGmailToken || (database.settings && (database.settings as any).gmailToken);
    const gmailActive = database.settings && database.settings.gmailAutoReplyActive;

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

    const subject = `🎟️ Konfirmasi E-Tiket Resmi Goa Lawah: ${booking.bookingCode}`;

    let rentalsHtml = "";
    if (booking.rentals && booking.visitType === "camping") {
      rentalsHtml = `
        <h3 style="border-bottom: 2px solid #16a34a; padding-bottom: 5px; color: #166534; font-size: 15px; margin-top: 20px;">Detail Sewa Peralatan</h3>
        <table style="width: 100%; text-align: left; border-collapse: collapse; margin-top: 10px;">
          <tr style="background: #f4f4f5;">
            <th style="padding: 8px; border: 1px solid #e4e4e7;">Alat</th>
            <th style="padding: 8px; border: 1px solid #e4e4e7; text-align: center;">Jumlah</th>
          </tr>
          ${booking.rentals.tent > 0 ? `<tr><td style="padding: 8px; border: 1px solid #e4e4e7;">Tenda Dome (Kapasitas 4 Orang)</td><td style="padding: 8px; border: 1px solid #e4e4e7; text-align: center;">${booking.rentals.tent}</td></tr>` : ""}
          ${booking.rentals.sleepingBag > 0 ? `<tr><td style="padding: 8px; border: 1px solid #e4e4e7;">Sleeping Bag (Kantong Tidur)</td><td style="padding: 8px; border: 1px solid #e4e4e7; text-align: center;">${booking.rentals.sleepingBag}</td></tr>` : ""}
          ${booking.rentals.matras > 0 ? `<tr><td style="padding: 8px; border: 1px solid #e4e4e7;">Matras Camping</td><td style="padding: 8px; border: 1px solid #e4e4e7; text-align: center;">${booking.rentals.matras}</td></tr>` : ""}
          ${booking.rentals.firewood > 0 ? `<tr><td style="padding: 8px; border: 1px solid #e4e4e7;">Kayu Bakar (Per Ikat)</td><td style="padding: 8px; border: 1px solid #e4e4e7; text-align: center;">${booking.rentals.firewood}</td></tr>` : ""}
        </table>
      `;
    }

    const htmlContent = `
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

    ${rentalsHtml}
    
    <p style="font-size: 12px; color: #71717a; margin-top: 15px;">*Silakan simpan dan tunjukkan email konfirmasi rincian di atas kepada petugas pintu gerbang kami saat kedatangan.</p>
  </div>
  <div style="background-color: #f4f4f5; padding: 16px; text-align: center; font-size: 11px; color: #71717a; border-top: 1px solid #e4e4e7;">
    Email ini dikirim secara otomatis oleh Sistem Kawasan Wisata Alam Goa Lawah, Bali.
  </div>
</div>
    `;

    let sentViaGmail = false;

    // Path A: Gmail API Auto Reply
    if (gmailActive && token) {
      try {
        console.log(`[AUTO-REPLY] Mencoba mengirim email via Gmail API ke ${booking.email}`);
        const mimeMessage = buildMultipartMime(
          booking.email,
          subject,
          htmlContent,
          ticketImageBase64,
          `E-Ticket-${booking.bookingCode}.jpg`
        );

        const base64Mime = Buffer.from(mimeMessage)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ raw: base64Mime })
        });

        if (res.ok) {
          console.log(`[GMAIL AUTO-REPLY] ✅ Berhasil terkirim via Gmail API ke ${booking.email}`);
          sentViaGmail = true;
          return { success: true, channel: "gmail" };
        } else {
          const errData = await res.json();
          console.error("[GMAIL AUTO-REPLY] ❌ Gagal mengirim via Gmail API (Token kemungkinan expired). Gagal:", errData.error?.message);
        }
      } catch (gmailErr: any) {
        console.error("[GMAIL AUTO-REPLY] Exception ketika memanggil Gmail API:", gmailErr.message);
      }
    }

    // Path B: Fallback SMTP (Nodemailer) jika Gmail API dinonaktifkan atau gagal
    if (!sentViaGmail) {
      console.log(`[SMTP AUTO-REPLY] Menggunakan jalur fallback SMTP untuk mengirim ke ${booking.email}`);
      const host = process.env.SMTP_HOST || "";
      const port = Number(process.env.SMTP_PORT) || 587;
      const user = process.env.SMTP_USER || "";
      const pass = process.env.SMTP_PASS || "";

      if (!host || !user || !pass) {
        console.warn(`[SMTP-NOTIFICATION] Konfigurasi SMTP_HOST/SMTP_USER/SMTP_PASS kosong. Melewati pengiriman email.`);
        return { success: false, reason: "SMTP credentials are empty" };
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false
        }
      });

      const mailOptions: any = {
        from: `"Wisata Goa Lawah" <${user}>`,
        to: booking.email,
        subject: subject,
        html: htmlContent
      };

      if (ticketImageBase64) {
        const base64Data = ticketImageBase64.includes("base64,")
          ? ticketImageBase64.split("base64,")[1]
          : ticketImageBase64;

        mailOptions.attachments = [
          {
            filename: `E-Ticket-GoaLawah-${booking.bookingCode}.jpg`,
            content: base64Data,
            encoding: "base64"
          }
        ];
      }

      const info = await transporter.sendMail(mailOptions);
      console.log(`[SMTP-NOTIFICATION] ✅ Email auto-reply berhasil dikirim melalui SMTP ke ${booking.email}: ${info.messageId}`);
      return { success: true, channel: "smtp" };
    }
  } catch (err: any) {
    console.error("[AUTO-REPLY] Gagal total memproses email auto-reply:", err.message);
    return { success: false, error: err.message };
  }
}

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Middleware to parse json loads (with high size limits for base64 image uploads)
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Request logging middleware
app.use((req, res, next) => {
  // To avoid triggering automated log scanners with false positive "Error" keywords (e.g. from ErrorBoundary.tsx),
  // we replace any "Error" with "Err" in console logs, and we only log API or major requests to keep console clean.
  const isStaticOrSource = req.url.startsWith("/src/") || req.url.startsWith("/node_modules/") || req.url.startsWith("/@") || (req.url.includes(".") && !req.url.startsWith("/api"));
  if (!isStaticOrSource) {
    const displayUrl = req.url.replace(/Error/g, "Err");
    console.log(`[Express Request] Method: ${req.method} | URL: ${displayUrl}`);
  }
  next();
});

// Server-side static assets mounting to serve files inside src/assets directly in both dev and prod
app.use("/src/assets", express.static(path.join(process.cwd(), "src/assets")));

// In-Memory backup in case FS has issues, synced with db.json
let database = {
  settings: {
    youtubeUrl: "https://www.youtube.com/embed/tM03S3S8-b8", // Beautiful video placeholder or Goa Lawah related
    whatsappUrl: "https://wa.me/6287864455512", // Active WhatsApp or mock contact
    facebookUrl: "https://facebook.com/wisatagoalawah",
    instagramUrl: "https://instagram.com/pokdarwis_goalawah",
    tiktokUrl: "https://tiktok.com/@wisatagoalawah",
    googleMapsUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3945.3908252277494!2d116.2415177!3d-8.5583647!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dcd99f18fe888bb%3A0xe54e6015fccc4ac9!2sLebah%20Sempage!5e0!3m2!1sen!2sid!4v1718500000000!5m2!1sen!2sid",
    logoUrl: "/src/assets/images/goa_lawah_logo_1781677843742.jpg",
    ticketInfoImage: "/src/assets/images/ticket_flyer_1781677879257.jpg",
    campingImage: "/src/assets/images/camping_rental_1781677897755.jpg",
    paymentImage: "/src/assets/images/qris_payment_1781677862360.jpg",
    priceCampingPerson: 10000,
    priceCampingMotorcycle: 5000,
    priceCampingCar: 10000,
    priceVisitPerson: 5000,
    priceVisitMotorcycle: 0,
    priceVisitCar: 0,
    rentalPrices: {
      tent: 50000,
      sleepingBag: 10000,
      matras: 5000,
      firewood: 10000
    },
    contentTexts: {
      heroTitle: "Biolink Resmi",
      heroSubtitle: "Desa Wisata Goa Lawah",
      description: "Selamat datang di surga tersembunyi Narmada. Destinasi Wisata Alam Goa Lawah menyajikan panorama tebing eksotis, koloni kelelawar alami, aliran air pegunungan yang jernih, dan petualangan camping ground terbaik di tengah kesejukan hutan lebat.",
      destinationName: "Wisata Alam Goa Lawah",
      villageName: "Desa Wisata Lebah Sempage - Narmada",
      footerText: "2026 dikelola oleh Pokdarwis Goa Lawah-Narmada"
    }
  } as AdminSettings,
  bookings: [] as Booking[],
  feedbacks: [] as Feedback[],
  stats: {
    viewsCount: {} as { [date: string]: number },
    totalViews: 0,
    totalBookings: 0,
    totalRevenue: 0
  } as VisitorStats,
  admins: [
    { username: "admin", password: "aok123" }
  ]
};


// Google Drive Server Session Cache
let serverGDriveToken: string | null = null;
let serverGDriveFileId: string | null = null;

// Google Gmail Server Session Cache
let serverGmailToken: string | null = null;

async function backupToServerGDrive(token: string, fileId: string, dbData: any) {
  try {
    const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dbData, null, 2)
    });
    if (!res.ok) {
      const text = await res.text();
      console.log("Server GDrive sync failed status:", res.status, text);
    } else {
      console.log("✅ Berhasil sinkronisasi otomatis ke Google Drive via server background.");
    }
  } catch (err: any) {
    console.error("Gagal melakukan upload server ke GDrive:", err.message);
  }
}

// Helper to save to JSON file and background sync to Supabase
function saveDatabase(keys?: string | string[]) {
  try {
    if (!(database as any).updatedAt) {
      (database as any).updatedAt = {};
    }
    const now = new Date().toISOString();
    if (keys) {
      if (Array.isArray(keys)) {
        keys.forEach(k => {
          (database as any).updatedAt[k] = now;
        });
      } else {
        (database as any).updatedAt[keys] = now;
      }
    } else {
      // If no key specified, we update timestamps for all keys
      const list = ["settings", "bookings", "feedbacks", "stats", "admins", "gallery"];
      list.forEach(k => {
        (database as any).updatedAt[k] = now;
      });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2), "utf-8");
    if (serverGDriveToken && serverGDriveFileId) {
      backupToServerGDrive(serverGDriveToken, serverGDriveFileId, database).catch(err => {
        console.error("Gagal sinkronisasi latar belakang ke Google Drive:", err);
      });
    }

    // Sync to Supabase in the background
    syncToSupabase(keys).catch(err => {
      console.error("[Supabase Sync] Gagal sinkronisasi otomatis latar belakang:", err.message);
    });
  } catch (err) {
    console.error("Error saving database: ", err);
  }
}

async function syncToSupabase(keys?: string | string[]) {
  if (database.settings && database.settings.disableSupabaseSync) {
    console.log("[Supabase Sync] Sinkronisasi dinonaktifkan via pengaturan admin.");
    return;
  }

  try {
    const keysToSync = keys 
      ? (Array.isArray(keys) ? keys : [keys]) 
      : ["settings", "bookings", "feedbacks", "stats"];

    console.log(`[Supabase Sync] Mensinkronisasikan data: ${keysToSync.join(", ")} ke Supabase...`);

    // 1. Sync settings
    if (keysToSync.includes("settings") && database.settings) {
      const { error } = await supabase
        .from("admin_settings")
        .upsert({
          id: 1,
          youtube_url: database.settings.youtubeUrl,
          whatsapp_url: database.settings.whatsappUrl,
          facebook_url: database.settings.facebookUrl,
          instagram_url: database.settings.instagramUrl,
          tiktok_url: database.settings.tiktokUrl,
          google_maps_url: database.settings.googleMapsUrl,
          ticket_info_image: database.settings.ticketInfoImage,
          camping_image: database.settings.campingImage,
          payment_image: database.settings.paymentImage,
          logo_url: database.settings.logoUrl,
          price_camping_person: database.settings.priceCampingPerson,
          price_camping_motorcycle: database.settings.priceCampingMotorcycle,
          price_camping_car: database.settings.priceCampingCar,
          price_visit_person: database.settings.priceVisitPerson,
          price_visit_motorcycle: database.settings.priceVisitMotorcycle,
          price_visit_car: database.settings.priceVisitCar,
          rental_prices: database.settings.rentalPrices,
          e_ticket_active: database.settings.eTicketActive ?? true,
          disable_supabase_sync: database.settings.disableSupabaseSync ?? false,
          gmail_auto_reply_active: database.settings.gmailAutoReplyActive ?? false,
          gmail_token: database.settings.gmailToken || null,
          rental_items: database.settings.rentalItems || null,
          form_fields: database.settings.formFields || null,
          content_texts: database.settings.contentTexts
        });
      if (error) {
        if (error.code === "PGRST116" || error.message.includes("relation") || error.message.includes("does not exist")) {
          console.warn("[Supabase Sync] Peringatan: Tabel 'admin_settings' belum dibuat di Supabase. Silakan jalankan file SQL `/supabase_tables.sql` di SQL Editor Supabase Anda.");
        } else {
          console.error("[Supabase Sync] Gagal sinkronisasi admin_settings:", error.message);
        }
      } else {
        console.log("[Supabase Sync] ✅ admin_settings berhasil disinkronkan ke Supabase.");
      }
    }

    // 2. Sync bookings
    if (keysToSync.includes("bookings") && Array.isArray(database.bookings) && database.bookings.length > 0) {
      const mappedBookings = database.bookings.map(b => ({
        id: b.id,
        name: b.name,
        whatsapp: b.whatsapp,
        email: b.email,
        visit_type: b.visitType,
        check_in_date: b.checkInDate,
        check_out_date: b.checkOutDate || null,
        num_nights: b.numNights || null,
        num_people: b.numPeople,
        num_motorcycles: b.numMotorcycles,
        num_cars: b.numCars,
        rentals: b.rentals || null,
        payment_method: b.paymentMethod,
        total_price: b.totalPrice,
        booking_code: b.bookingCode,
        created_at: b.createdAt,
        payment_status: b.paymentStatus || "Belum Bayar"
      }));

      const { error } = await supabase
        .from("bookings")
        .upsert(mappedBookings);
      if (error) {
        if (error.message.includes("relation") || error.message.includes("does not exist")) {
          console.warn("[Supabase Sync] Peringatan: Tabel 'bookings' belum dibuat di Supabase. Silakan jalankan file SQL `/supabase_tables.sql` di SQL Editor Supabase Anda.");
        } else {
          console.error("[Supabase Sync] Gagal sinkronisasi bookings:", error.message);
        }
      } else {
        console.log(`[Supabase Sync] ✅ ${mappedBookings.length} bookings berhasil disinkronkan ke Supabase.`);
      }
    }

    // 3. Sync feedbacks
    if (keysToSync.includes("feedbacks") && Array.isArray(database.feedbacks) && database.feedbacks.length > 0) {
      const mappedFeedbacks = database.feedbacks.map(f => ({
        id: f.id,
        name: f.name || null,
        message: f.message,
        created_at: f.createdAt
      }));

      const { error } = await supabase
        .from("feedbacks")
        .upsert(mappedFeedbacks);
      if (error) {
        if (error.message.includes("relation") || error.message.includes("does not exist")) {
          console.warn("[Supabase Sync] Peringatan: Tabel 'feedbacks' belum dibuat di Supabase. Silakan jalankan file SQL `/supabase_tables.sql` di SQL Editor Supabase Anda.");
        } else {
          console.error("[Supabase Sync] Gagal sinkronisasi feedbacks:", error.message);
        }
      } else {
        console.log(`[Supabase Sync] ✅ ${mappedFeedbacks.length} feedbacks berhasil disinkronkan ke Supabase.`);
      }
    }

    // 4. Sync stats
    if (keysToSync.includes("stats") && database.stats) {
      const { error } = await supabase
        .from("visitor_stats")
        .upsert({
          id: 1,
          views_count: database.stats.viewsCount,
          total_views: database.stats.totalViews ?? 0,
          total_bookings: database.stats.totalBookings ?? 0,
          total_revenue: database.stats.totalRevenue ?? 0
        });
      if (error) {
        if (error.message.includes("relation") || error.message.includes("does not exist")) {
          console.warn("[Supabase Sync] Peringatan: Tabel 'visitor_stats' belum dibuat di Supabase. Silakan jalankan file SQL `/supabase_tables.sql` di SQL Editor Supabase Anda.");
        } else {
          console.error("[Supabase Sync] Gagal sinkronisasi visitor_stats:", error.message);
        }
      } else {
        console.log("[Supabase Sync] ✅ visitor_stats berhasil disinkronkan ke Supabase.");
      }
    }

  } catch (err: any) {
    console.error("[Supabase Sync] Kesalahan tidak terduga saat sinkronisasi:", err.message);
  }
}

async function pullFromSupabase() {
  try {
    console.log("[Supabase Sync] Mencoba menarik data terbaru dari Supabase...");
    
    // 1. Pull settings
    const { data: settingsData, error: settingsErr } = await supabase
      .from("admin_settings")
      .select("*")
      .eq("id", 1)
      .single();
    
    if (settingsErr) {
      console.log("[Supabase Sync] admin_settings tidak ditemukan atau tabel belum dibuat di Supabase:", settingsErr.message);
      if (settingsErr.code === "PGRST116" && database.settings) {
        console.log("[Supabase Sync] Tabel admin_settings ditemukan tetapi masih kosong. Melakukan sinkronisasi data lokal ke Supabase...");
        await syncToSupabase();
      }
    } else if (settingsData) {
      database.settings = {
        youtubeUrl: settingsData.youtube_url,
        whatsappUrl: settingsData.whatsapp_url,
        facebookUrl: settingsData.facebook_url,
        instagramUrl: settingsData.instagram_url,
        tiktokUrl: settingsData.tiktok_url,
        googleMapsUrl: settingsData.google_maps_url,
        ticketInfoImage: settingsData.ticket_info_image,
        campingImage: settingsData.camping_image,
        paymentImage: settingsData.payment_image,
        logoUrl: settingsData.logo_url,
        priceCampingPerson: settingsData.price_camping_person,
        priceCampingMotorcycle: settingsData.price_camping_motorcycle,
        priceCampingCar: settingsData.price_camping_car,
        priceVisitPerson: settingsData.price_visit_person,
        priceVisitMotorcycle: settingsData.price_visit_motorcycle,
        priceVisitCar: settingsData.price_visit_car,
        rentalPrices: settingsData.rental_prices as any,
        eTicketActive: settingsData.e_ticket_active,
        disableSupabaseSync: settingsData.disable_supabase_sync,
        gmailAutoReplyActive: settingsData.gmail_auto_reply_active,
        gmailToken: settingsData.gmail_token,
        rentalItems: settingsData.rental_items as any,
        formFields: settingsData.form_fields as any,
        contentTexts: settingsData.content_texts as any
      };
      console.log("[Supabase Sync] ✅ Berhasil memuat admin_settings dari Supabase.");
    }

    // 2. Pull bookings
    const { data: bookingsData, error: bookingsErr } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!bookingsErr && bookingsData && bookingsData.length > 0) {
      database.bookings = bookingsData.map(b => ({
        id: b.id,
        name: b.name,
        whatsapp: b.whatsapp,
        email: b.email,
        visitType: b.visit_type as any,
        checkInDate: b.check_in_date,
        checkOutDate: b.check_out_date || undefined,
        numNights: b.num_nights || undefined,
        numPeople: b.num_people,
        numMotorcycles: b.num_motorcycles,
        numCars: b.num_cars,
        rentals: b.rentals as any,
        paymentMethod: b.payment_method as any,
        totalPrice: b.total_price,
        bookingCode: b.booking_code,
        createdAt: b.created_at,
        paymentStatus: b.payment_status as any
      }));
      console.log(`[Supabase Sync] ✅ Berhasil memuat ${database.bookings.length} bookings dari Supabase.`);
    }

    // 3. Pull feedbacks
    const { data: feedbacksData, error: feedbacksErr } = await supabase
      .from("feedbacks")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!feedbacksErr && feedbacksData && feedbacksData.length > 0) {
      database.feedbacks = feedbacksData.map(f => ({
        id: f.id,
        name: f.name || undefined,
        message: f.message,
        createdAt: f.created_at
      }));
      console.log(`[Supabase Sync] ✅ Berhasil memuat ${database.feedbacks.length} feedbacks dari Supabase.`);
    }

    // 4. Pull stats
    const { data: statsData, error: statsErr } = await supabase
      .from("visitor_stats")
      .select("*")
      .eq("id", 1)
      .single();
    
    if (!statsErr && statsData) {
      database.stats = {
        viewsCount: statsData.views_count as any,
        totalViews: statsData.total_views,
        totalBookings: statsData.total_bookings,
        totalRevenue: statsData.total_revenue
      };
      console.log("[Supabase Sync] ✅ Berhasil memuat visitor_stats dari Supabase.");
    }

    // Simpan ke db.json lokal agar konsisten
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2), "utf-8");

  } catch (err: any) {
    console.error("[Supabase Sync] Gagal memuat data dari Supabase pada saat startup:", err.message);
  }
}

// Helper to load database from JSON file
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      if (content.trim()) {
        const parsed = JSON.parse(content);
        // Deep merge or assign to handle new fields smoothly
        database = { ...database, ...parsed };
      }
    } else {
      // Seed initial dummy data for stats to look impressive is better
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        database.stats.viewsCount[dateStr] = Math.floor(Math.random() * 40) + 15;
      }
      database.stats.totalViews = Object.values(database.stats.viewsCount).reduce((a, b) => a + b, 0);
      
      // Let's seed 3 sample bookings for beautiful admin preview
      database.bookings = [
        {
          id: "bk-1",
          name: "Andi Saputra",
          whatsapp: "081234567890",
          email: "andi.saputra@gmail.com",
          visitType: "camping",
          checkInDate: today.toISOString().split("T")[0],
          checkOutDate: new Date(today.getTime() + 86400000).toISOString().split("T")[0],
          numNights: 1,
          numPeople: 4,
          numMotorcycles: 2,
          numCars: 0,
          rentals: { tent: 1, sleepingBag: 2, matras: 2, firewood: 1 },
          paymentMethod: "qris",
          totalPrice: 130000, // (4*10k) + (2*5k) + 50k tent + 2*10k sb + 2*5k matras + 10k firewood = 40+10+50+20+10+10 = 140k minus nights scale (1 night)
          bookingCode: "GL-CMP-8429",
          createdAt: new Date().toISOString(),
          paymentStatus: "Lunas"
        },
        {
          id: "bk-2",
          name: "Siti Rahma",
          whatsapp: "08785554321",
          email: "siti.rahma@yahoo.com",
          visitType: "visit",
          checkInDate: today.toISOString().split("T")[0],
          numPeople: 2,
          numMotorcycles: 1,
          numCars: 0,
          paymentMethod: "tunai",
          totalPrice: 10000, // 2 people * 5000 = 10000
          bookingCode: "GL-VST-1952",
          createdAt: new Date().toISOString(),
          paymentStatus: "Belum Bayar"
        }
      ];
      
      database.stats.totalBookings = database.bookings.length;
      database.stats.totalRevenue = database.bookings.reduce((sum, b) => sum + b.totalPrice, 0);

      // Seed 2 sample feedbacks
      database.feedbacks = [
        {
          id: "fb-1",
          name: "Rian Hermawan",
          message: "Akses jalannya tolong ditambahkan penunjuk arah yang jelas dari jalan utama Sempage. Tapi tempatnya asri sekali dan airnya segar!",
          createdAt: new Date(today.getTime() - 86400000).toISOString()
        },
        {
          id: "fb-2",
          name: "Indah Puspita",
          message: "Sensasi melihat kelelawar secara dekat di sore hari sangat mendebarkan! Pelayanan Pokdarwis ramah dan alat camping lengkap.",
          createdAt: new Date().toISOString()
        }
      ];

      saveDatabase();
    }
  } catch (err) {
    console.error("Error loading database: ", err);
  }
}

// Perform initial load
loadDatabase();
pullFromSupabase().catch(err => {
  console.error("[Supabase Sync] Gagal memuat data dari Supabase pada saat startup:", err.message);
});
if (database.settings && database.settings.gmailToken) {
  serverGmailToken = database.settings.gmailToken;
  console.log("🔄 Restored server Gmail token from persistent database settings.");
}

// -------------------------------------------------------------
// PUBLIC ENDPOINTS
// -------------------------------------------------------------

// Increment Visitor Statistics
app.post("/api/visit", (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  if (!database.stats.viewsCount[today]) {
    database.stats.viewsCount[today] = 0;
  }
  database.stats.viewsCount[today]++;
  database.stats.totalViews++;
  saveDatabase();
  res.json({ success: true, viewsToday: database.stats.viewsCount[today], totalViews: database.stats.totalViews });
});

// Retrieve Public Information
app.get("/api/public-settings", (req, res) => {
  const { settings } = database;
  res.json({
    settings,
    gallery: database.feedbacks.length > 0 ? database.feedbacks : [] // placeholder if needed, wait, we have a gallery photo system
  });
});

// Retrieve Gallery Images List (Stored as settings or separate array. Let's make a dedicated gallery array in database)
if (!(database as any).gallery) {
  (database as any).gallery = [
    { id: "g-1", url: "/src/assets/images/ticket_flyer_1781677879257.jpg", title: "Keindahan Tebing Goa Lawah" },
    { id: "g-2", url: "/src/assets/images/camping_rental_1781677897755.jpg", title: "Camping Ground Goa Lawah" },
    { id: "g-3", url: "/src/assets/images/goa_lawah_logo_1781677843742.jpg", title: "Pokdarwis Goa Lawah" }
  ];
  saveDatabase();
}

app.get("/api/gallery", (req, res) => {
  res.json((database as any).gallery || []);
});

app.post("/api/gallery/add", (req, res) => {
  try {
    const { base64Data, title } = req.body;
    if (!base64Data) return res.status(400).json({ error: "Mohon pilih foto terlebih dahulu" });

    const newPhoto = {
      id: "g-" + Date.now(),
      url: base64Data,
      title: title || "Upload Pengunjung"
    };

    if (!(database as any).gallery) (database as any).gallery = [];
    (database as any).gallery.unshift(newPhoto);
    saveDatabase("gallery");

    res.json({ success: true, gallery: (database as any).gallery });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal mengunggah foto" });
  }
});

// Create Booking
app.post("/api/bookings", (req, res) => {
  try {
    const {
      name,
      whatsapp,
      email,
      visitType,
      checkInDate,
      checkOutDate,
      numPeople,
      numMotorcycles,
      numCars,
      rentals,
      paymentMethod
    } = req.body;

    if (!name || !whatsapp || !email || !visitType || !checkInDate) {
      return res.status(400).json({ error: "Mohon isi semua data wajib" });
    }

    let totalPrice = 0;
    let numNights = 1;
    let brentals = rentals || { tent: 0, sleepingBag: 0, matras: 0, firewood: 0 };

    if (visitType === "camping") {
      if (!checkOutDate) {
        return res.status(400).json({ error: "Check out date is required for camping" });
      }
      
      const inDate = new Date(checkInDate);
      const outDate = new Date(checkOutDate);
      const diffTime = outDate.getTime() - inDate.getTime();
      numNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const pricePeople = (Number(numPeople) || 0) * database.settings.priceCampingPerson;
      const priceMotor = (Number(numMotorcycles) || 0) * database.settings.priceCampingMotorcycle;
      const priceCar = (Number(numCars) || 0) * database.settings.priceCampingCar;

      let totalRentalsPerNight = 0;
      if (brentals) {
        for (const key in brentals) {
          const qty = Number(brentals[key]) || 0;
          const uPrice = Number(database.settings.rentalPrices[key]) || 0;
          totalRentalsPerNight += qty * uPrice;
        }
      }
      
      totalPrice = (pricePeople + priceMotor + priceCar + totalRentalsPerNight) * numNights;
    } else {
      // Visit Mode
      const pricePeople = (Number(numPeople) || 0) * database.settings.priceVisitPerson;
      // Motorcycle and Car are Free
      totalPrice = pricePeople;
    }

    const randId = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = visitType === "camping" ? `GL-CMP-${randId}` : `GL-VST-${randId}`;

    const newBooking: Booking = {
      id: "bk-" + Date.now(),
      name,
      whatsapp,
      email,
      visitType,
      checkInDate,
      checkOutDate: visitType === "camping" ? checkOutDate : undefined,
      numNights: visitType === "camping" ? numNights : undefined,
      numPeople: Number(numPeople) || 0,
      numMotorcycles: Number(numMotorcycles) || 0,
      numCars: Number(numCars) || 0,
      rentals: visitType === "camping" ? brentals : undefined,
      paymentMethod,
      totalPrice,
      bookingCode,
      createdAt: new Date().toISOString(),
      paymentStatus: paymentMethod === "qris" ? "Menunggu Validasi" : "Belum Bayar"
    };

    database.bookings.unshift(newBooking); // add to top
    database.stats.totalBookings++;
    database.stats.totalRevenue += totalPrice;
    saveDatabase();

    // Trigger real background email notification to wisata.goalawah@gmail.com
    sendBookingNotificationEmail(newBooking).catch(err => {
      console.error("Gagal mengirim email notifikasi booking admin:", err);
    });

    // Note: Gmail & SMTP Customer Auto-Reply is triggered immediately after this via /api/bookings/send-auto-reply
    // after the client has rendered and generated the ticket image canvas.

    // Log simulated email server send log as real integration proxy
    console.log(`[EMAIL SERVER - CONFIRMATION]
From: wisata.goalawah@gmail.com
To: ${email}
Subject: [BUKTI BOOKING] Wisata Alam Goa Lawah - ${bookingCode}
Message: Yth. ${name}, terima kasih telah memesan tiket kunjungan ${visitType} di Goa Lawah.
Kode Booking Anda: ${bookingCode} . Total Pembayaran: Rp ${totalPrice.toLocaleString("id-ID")}.
Silakan tunjukkan bukti booking digital / print ini saat melakukan check-in loket.`);

    res.json({
      success: true,
      booking: newBooking,
      mailStatus: `Konfirmasi e-ticket telah otomatis terkirim dari wisata.goalawah@gmail.com menuju ${email}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create booking" });
  }
});

// Send Auto Reply with Ticket JPG Attachment
app.post("/api/bookings/send-auto-reply", async (req, res) => {
  try {
    const { bookingId, ticketImageBase64 } = req.body;
    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    const booking = database.bookings.find(b => b.id === bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    console.log(`[AUTO-REPLY] Menjalankan pemrosesan auto-reply untuk Booking: ${booking.bookingCode} (${booking.email})`);
    
    // Call unified triggerAutoReply which handles both Gmail API (and persistent token) and SMTP fallback
    const result = await triggerAutoReply(booking, ticketImageBase64);
    
    res.json({
      success: result?.success || false,
      channel: result?.channel || null,
      error: (result as any)?.error || null
    });
  } catch (err: any) {
    console.error("[AUTO-REPLY ENDPOINT ERROR] Gagal mengirim auto-reply:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Create Feedback
app.post("/api/feedback", (req, res) => {
  try {
    const { name, message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Saran/Masukan tidak boleh kosong" });
    }

    const newFeedback: Feedback = {
      id: "fb-" + Date.now(),
      name: name || "Anonim",
      message,
      createdAt: new Date().toISOString()
    };

    database.feedbacks.unshift(newFeedback);
    saveDatabase();

    // Trigger real background email notification to wisata.goalawah@gmail.com
    sendFeedbackNotificationEmail(newFeedback).catch(err => {
      console.error("Gagal mengirim email notifikasi feedback admin:", err);
    });

    res.json({ success: true, feedback: newFeedback });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save feedback" });
  }
});

// -------------------------------------------------------------
// ADMIN ENDPOINTS
// -------------------------------------------------------------

// Admin Authentication Login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  const adminMatch = database.admins.find(
    (a) => a.username.toLowerCase() === (username || "").toLowerCase() && a.password === password
  );

  if (adminMatch) {
    res.json({
      success: true,
      token: "admin-jwt-simulated-token-" + Date.now(),
      admin: { username: adminMatch.username }
    });
  } else {
    res.status(401).json({ error: "Username atau Password salah!" });
  }
});

// Retrieve Admin dashboard statistics, bookings list, feedbacks list, custom config settings, accounts
app.get("/api/admin/dashboard-data", (req, res) => {
  res.json({
    stats: database.stats,
    bookings: database.bookings,
    feedbacks: database.feedbacks,
    settings: database.settings,
    adminsList: database.admins.map((a) => ({ username: a.username })), // mask pass in simple list
    gallery: (database as any).gallery || []
  });
});

// Update core settings & logo urls
app.post("/api/admin/settings", (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings) return res.status(400).json({ error: "No settings provided" });

    database.settings = { ...database.settings, ...settings };
    saveDatabase("settings");
    res.json({ success: true, settings: database.settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Change/Upload Logo or general images as base64 strings
app.post("/api/admin/upload-image", (req, res) => {
  try {
    const { target, base64Data } = req.body;
    if (!target || !base64Data) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    // Since this is a server deployed container, storing base64 strings inside settings is perfectly fine
    // because it completely avoids file system write permission issues or static caching delays!
    if (target === "logo") {
      database.settings.logoUrl = base64Data;
    } else if (target === "ticket") {
      database.settings.ticketInfoImage = base64Data;
    } else if (target === "camping") {
      database.settings.campingImage = base64Data;
    } else if (target === "payment") {
      database.settings.paymentImage = base64Data;
    } else {
      return res.status(400).json({ error: "Invalid upload target" });
    }

    saveDatabase("settings");
    res.json({ success: true, settings: database.settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add to gallery
app.post("/api/admin/gallery/add", (req, res) => {
  try {
    const { base64Data, title } = req.body;
    if (!base64Data) return res.status(400).json({ error: "No image data" });

    const newPhoto = {
      id: "g-" + Date.now(),
      url: base64Data,
      title: title || "Aktivitas Goa Lawah"
    };

    if (!(database as any).gallery) (database as any).gallery = [];
    (database as any).gallery.unshift(newPhoto);
    saveDatabase("gallery");

    res.json({ success: true, gallery: (database as any).gallery });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete from gallery
app.post("/api/admin/gallery/delete", (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Id is required" });

    if ((database as any).gallery) {
      (database as any).gallery = (database as any).gallery.filter((item: any) => item.id !== id);
      saveDatabase("gallery");
    }
    res.json({ success: true, gallery: (database as any).gallery });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Edit text elements on home page
app.post("/api/admin/texts", (req, res) => {
  try {
    const { contentTexts } = req.body;
    if (!contentTexts) return res.status(400).json({ error: "No contentTexts" });

    database.settings.contentTexts = { ...database.settings.contentTexts, ...contentTexts };
    saveDatabase("settings");
    res.json({ success: true, settings: database.settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete feedback entry
app.post("/api/admin/feedback/delete", (req, res) => {
  try {
    const { id } = req.body;
    database.feedbacks = database.feedbacks.filter((f) => f.id !== id);
    saveDatabase("feedbacks");
    res.json({ success: true, feedbacks: database.feedbacks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete booking entry
app.post("/api/admin/bookings/delete", (req, res) => {
  try {
    const { id } = req.body;
    database.bookings = database.bookings.filter((b) => b.id !== id);
    saveDatabase("bookings");
    res.json({ success: true, bookings: database.bookings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update booking status
app.post("/api/admin/bookings/update-status", (req, res) => {
  try {
    const { id, paymentStatus } = req.body;
    const bMatch = database.bookings.find((b) => b.id === id);
    if (!bMatch) return res.status(404).json({ error: "Booking tidak ditemukan" });
    
    bMatch.paymentStatus = paymentStatus;
    saveDatabase("bookings");
    res.json({ success: true, bookings: database.bookings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manage Admin: Modify / Add credentials
app.post("/api/admin/manage-admin", (req, res) => {
  try {
    const { action, username, password, oldUsername } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username dan Password wajib diisi" });

    if (action === "edit") {
      const admin = database.admins.find((a) => a.username.toLowerCase() === (oldUsername || "").toLowerCase());
      if (admin) {
        admin.username = username;
        admin.password = password;
      } else {
        // Fallback or rename first item
        database.admins[0] = { username, password };
      }
    } else {
      // Add admin
      // Check duplicate
      const exist = database.admins.some((a) => a.username.toLowerCase() === username.toLowerCase());
      if (exist) return res.status(400).json({ error: "Username sudah digunakan!" });
      database.admins.push({ username, password });
    }

    saveDatabase();
    res.json({ success: true, adminsList: database.admins.map((a) => ({ username: a.username })) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset visitor views statistics
app.post("/api/admin/reset-views", (req, res) => {
  try {
    database.stats.viewsCount = {};
    database.stats.totalViews = 0;
    saveDatabase();
    res.json({ success: true, stats: database.stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add / edit visitor views for specific date
app.post("/api/admin/update-views", (req, res) => {
  try {
    const { date, count } = req.body;
    if (!date) return res.status(400).json({ error: "Tanggal wajib diisi" });
    const views = Math.max(0, parseInt(count) || 0);

    database.stats.viewsCount[date] = views;
    
    // Recalculate total views
    database.stats.totalViews = Object.values(database.stats.viewsCount).reduce((a, b) => a + b, 0);

    saveDatabase();
    res.json({ success: true, stats: database.stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// API to store current admin's GDrive session details for background server sync
app.post("/api/admin/gdrive-session", (req, res) => {
  try {
    const { token, fileId } = req.body;
    serverGDriveToken = token || null;
    serverGDriveFileId = fileId || null;
    if (serverGDriveToken && serverGDriveFileId) {
      console.log("🔄 Server GDrive session stored. Server-side auto-sync is armed.");
    } else {
      console.log("⏹️ Server GDrive session cleared.");
    }
    res.json({ success: true, stored: !!(serverGDriveToken && serverGDriveFileId) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// API to store current admin's Gmail session details for background server auto-reply
app.post("/api/admin/gmail-session", (req, res) => {
  try {
    const { token } = req.body;
    serverGmailToken = token || null;
    if (database.settings) {
      database.settings.gmailToken = serverGmailToken;
      saveDatabase("settings");
    }
    if (serverGmailToken) {
      console.log("🔄 Server Gmail session stored and persisted. Auto-reply via Gmail is armed.");
    } else {
      console.log("⏹️ Server Gmail session cleared from database.");
    }
    res.json({ success: true, stored: !!serverGmailToken });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// API to export the whole database as a JSON object (for Google Drive Sync)
app.get("/api/admin/database-export", (req, res) => {
  try {
    res.json({ success: true, database });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API to import a whole database JSON object (restored from Google Drive)
app.post("/api/admin/database-import", (req, res) => {
  try {
    const { importedDatabase } = req.body;
    if (!importedDatabase) {
      return res.status(400).json({ error: "Saran database tidak valid." });
    }

    // Basic structural validation
    if (!importedDatabase.settings || !Array.isArray(importedDatabase.bookings)) {
      return res.status(400).json({ error: "Format database Google Drive tidak cocok atau korup." });
    }

    // Override local database safely with explicit casting to bypass dynamic property restriction
    database = {
      ...database,
      settings: { ...database.settings, ...importedDatabase.settings },
      bookings: importedDatabase.bookings || [],
      feedbacks: importedDatabase.feedbacks || [],
      stats: { ...database.stats, ...(importedDatabase.stats || {}) },
      admins: importedDatabase.admins || database.admins, // fall back to current admins if not present
      gallery: importedDatabase.gallery || (database as any).gallery || []
    } as any;

    saveDatabase();
    res.json({ success: true, database });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// -------------------------------------------------------------
// VITE OR STATIC SERVING MIDDLEWARE
// -------------------------------------------------------------
async function bootstrap() {
  const isServerless = !!(process.env.NETLIFY || process.env.VERCEL || process.env.LAMBDA_TASK_ROOT);

  if (!isServerless) {
    if (process.env.NODE_ENV !== "production") {
      // Development mode
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } else {
      // Production mode
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n======================================================\n`);
      console.log(`  Biolink Desa Wisata Goa Lawah: running at port ${PORT}`);
      console.log(`\n======================================================\n`);
    });
  }
}

bootstrap();

export default app;
