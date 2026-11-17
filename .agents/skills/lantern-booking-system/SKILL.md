---
name: lantern-booking-system
description: >-
  Guides the implementation and verification of the Sky Lantern Pre-order Booking System
  (พรีออเดอร์ปล่อยโคมลอย เทศกาลท่องเที่ยวเมืองพร้าว 24-25 พ.ย. 2569 ราคาโคมละ 299 บาท/2 ท่าน)
  including date selection, automatic price calculation, PromptPay QR payment display,
  slip compression/upload, and instant E-Ticket generation.
---

# Sky Lantern Pre-order Booking System Skill

Use this skill when building, updating, or verifying the customer-facing booking workflow for the Sky Lantern Pre-order event and online Mini Balloon ticket booking.

## 1. Core Business Rules

1. **Event Details (Must match [387004.jpg](../../../387004.jpg) exactly):**
   - **Dates:** `2026-11-24` (อังคาร 24 พ.ย. 2569) or `2026-11-25` (พุธ 25 พ.ย. 2569)
   - **Location:** ณ โฮงชาฮักมี ต.แม่ปั๋ง อ.พร้าว จ.เชียงใหม่
   - **Schedule:** ลงทะเบียน 18.00 น. | ปล่อยโคมลอยพร้อมกัน 20.00 น.
   - **Pricing:** `299` บาท ต่อ 1 โคม (สำหรับ 2 ท่าน)
   - **Included Items:** โคมลอยไซส์ XL, ไฟแช็ค, เทียน, ปากกา, เครื่องดื่ม, ของที่ระลึก
   - **Contact:** `081-669-6653` คุณฝ้าย

2. **Formula Calculations:**
   - `totalAmount = quantity * 299` (for lanterns)
   - `attendees = quantity * 2` (for lanterns)
   - `totalAmount = quantity * 100` and `attendees = quantity` (for online Mini Balloon tickets on 20–21 Nov 2569)

3. **Payment & Slip Handling:**
   - Display `./QR Code.jpg` clearly along with account name **น.ส.กนกพิชญ์ ชัยชมภู** (Krungthai PromptPay).
   - Provide a button to download `./QR Code.jpg` so mobile users can import it into their banking app.
   - Compress uploaded slip images via HTML5 `<canvas>` (max dimension `900px`, JPEG quality `0.78`) before storing so storage and network transfers never fail or hit size limits.

4. **Instant E-Ticket & Phone Lookup:**
   - Never require customer login.
   - Immediately after submission, generate an E-Ticket with:
     - Booking Reference ID (e.g., `KL24-XXXX` or `KL25-XXXX`)
     - Scannable QR Code containing the booking ID
     - Customer name, phone, selected date, number of lanterns, number of attendees, and payment status badge
     - "บันทึกรูปบัตร (Save E-Ticket)" button and "ค้นหาบัตรด้วยเบอร์โทรศัพท์" tab.

## 2. Verification Checklist
- [ ] Selecting 1 lantern shows `299 บาท` and `สำหรับ 2 ท่าน`.
- [ ] Selecting 3 lanterns shows `897 บาท` and `สำหรับ 6 ท่าน`.
- [ ] Form prevents submission if date, name, 10-digit phone number, or slip image is missing.
- [ ] E-Ticket renders cleanly and can be looked up by phone number anytime.
