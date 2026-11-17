---
name: admin-report-pos
description: >-
  Guides the implementation of the 8-module Admin Backoffice: Admin Login, Executive Financial & Inventory Dashboard,
  Payment Slip Verification & Booking Editor, 18.00 QR Check-in with Anti-Duplicate Guard, Walk-in & Manual Ticket POS Logger,
  Ticket Print Studio link, Excel CSV + Paper Check-in Sheet export, and Quota/Sold-Out/Cloud Sync settings.
---

# Admin Report & Backoffice Management Skill

Use this skill when building or updating the Admin Portal (`หน้ารายงาน ของ admin` & `account login มีแค่แอดมินเท่านั้น`).

## 1. Admin Authentication & Security (Module 1)
- **Admin-Only Login:** Only administrators log in. Customers never see a login wall when booking.
- Provide session persistence (`sessionStorage` / `localStorage`) and allow the admin to change the admin password/PIN in Settings.

## 2. Executive Dashboard & Event Inventory Calculator (Module 2)
1. **Executive Summary KPI Cards:**
   - **รายได้รวมทั้งหมด (Total Revenue):** Total approved revenue, pending slip revenue, and walk-in revenue in THB.
   - **ยอดจองโคมลอย วันที่ 24 พ.ย. 69:** จำนวนโคม (Lanterns) / จำนวนผู้เข้าร่วม (`2 ท่าน/โคม`) / ยอดเงิน (THB) / โควตาคงเหลือ.
   - **ยอดจองโคมลอย วันที่ 25 พ.ย. 69:** จำนวนโคม (Lanterns) / จำนวนผู้เข้าร่วม (`2 ท่าน/โคม`) / ยอดเงิน (THB) / โควตาคงเหลือ.
   - **ยอดบัตรชมมินิบอลลูน วันที่ 20 พ.ย. 69:** จำนวนบัตร (ออนไลน์ + ขายตั๋วรถหน้างาน) / ยอดเงิน (THB).
   - **ยอดบัตรชมมินิบอลลูน วันที่ 21 พ.ย. 69:** จำนวนบัตร (ออนไลน์ + ขายตั๋วรถหน้างาน) / ยอดเงิน (THB).
   - **ยอดลงทะเบียนเข้างาน (Check-in Status):** เช็คอินรับโคมแล้ว vs รอเช็คอิน.
2. **Event Preparation Calculator (คำนวณของที่ต้องเตรียมหน้างาน):**
   - Automatically calculates exact quantities of the 6 included items needed for 24 Nov and 25 Nov:
     1. โคมลอยไซส์ XL (`= total lanterns`)
     2. ไฟแช็ค (`= total lanterns`)
     3. เทียน (`= total lanterns`)
     4. ปากกา (`= total lanterns`)
     5. เครื่องดื่ม (`= total lanterns / 2x attendees`)
     6. ของที่ระลึก (`= total lanterns / 2x attendees`)

## 3. Slip Verification & Booking Editor (Module 3)
- **Full-Size Slip Modal:** View uploaded slip image next to expected amount (`299 × N` or `100 × N`) and account recipient (**น.ส.กนกพิชญ์ ชัยชมภู**).
- **One-Click Status Actions:** `✅ อนุมัติสลิป (Approve)`, `⏳ รอตรวจสอบ (Pending)`, `❌ ปฏิเสธ/ยกเลิก (Reject)`.
- **Booking Editor & E-Ticket Re-issue:** Admin can edit customer name, phone, event date (e.g., move from 24 Nov to 25 Nov), quantity, or note, and open/download the customer's E-Ticket to send via chat.

## 4. 18.00 On-site Check-in & Anti-Duplicate Guard (Module 4)
- **Fast Lookup / QR Scan:** Search by booking ID, last 4 digits of phone, or scan QR Code at 18.00 registration.
- **Anti-Duplicate Protection:** Recording check-in saves `checkedIn = true` and `checkedInAt = timestamp`. If a ticket is scanned or checked in a second time, display a prominent warning with the exact timestamp it was already claimed.

## 5. Walk-in & Manual Bus-Ticket POS Logger (Module 5)
- **Manual Mini Balloon Ticket Batch Logger:** Admin can enter start & end serial numbers from the paper ticket stub (e.g., `NO. 0001` to `NO. 0060` on 20 Nov 2569 = 60 tickets = `6,000 บาท`) or enter ticket count directly.
- **Walk-in Lantern POS:** Record on-site lantern sales (cash or QR transfer) so inventory and financial reports stay 100% accurate.

## 6. Integrated Manual Ticket Print Studio (Module 6)
- Direct access to configure and print A4 sheets of the 100 THB Mini Balloon tear-off tickets (with stub, perforation line, and serial numbers).

## 7. Export Excel (CSV) & Printable Check-in Sheets (Module 7)
- **CSV Export:** Prepend UTF-8 BOM (`\uFEFF`) so Microsoft Excel on Windows opens Thai characters cleanly.
- **Printable Paper Check-in Sheet (A4):** Generates a clean A4 registration table sorted by booking ID/name for 24 Nov and 25 Nov with a signature column (`ลายมือชื่อผู้รับโคม`) for the 18.00 registration desk.
- **Printable Executive Summary (A4):** One-page financial and attendance summary report.

## 8. Quota, Sold-Out Switch & Cloud Sync Settings (Module 8)
- Set daily max lantern quota for 24 Nov and 25 Nov, or toggle open/closed booking status per day.
- Configure Cloud Database sync (Supabase / Firebase) and export/import full JSON backups.
