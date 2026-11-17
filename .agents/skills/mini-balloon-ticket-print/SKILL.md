---
name: mini-balloon-ticket-print
description: >-
  Guides the creation and layout verification of the manual bus-ticket style tear-off tickets
  for the Mini Balloon event (จำหน่ายบัตรชมมินิบอลลูน คนละ 100 บาท เทศกาลท่องเที่ยวเมืองพร้าว
  วันที่ 20-21 พฤศจิกายน 2569 เวลา 18.00 - 20.00 น. ณ โฮงชาฮักมี ต.แม่ปั๋ง อ.พร้าว จ.เชียงใหม่).
  Use when building or modifying the printable manual ticket generator.
---

# Mini Balloon Manual Ticket Print Skill (ตั๋วชมมินิบอลลูนแบบตั๋วรถขายหน้างาน)

Use this skill when creating or updating the printable manual ticket system for on-site sales (ขายหน้างาน แบบตั๋วรถ).

## 1. Required Ticket Text (Exact Match)

Every printed ticket must contain:
- **ชื่องาน/หัวบัตร:** จำหน่ายบัตรชมมินิบอลลูน คนละ 100 บาท
- **เทศกาล:** เทศกาลท่องเที่ยวเมืองพร้าว (PHRAO TOURISM FESTIVAL 2026)
- **วันที่:** วันที่ 20-21 พฤศจิกายน 2569
- **เวลา:** เวลา 18.00 - 20.00 น.
- **สถานที่:** ณ โฮงชาฮักมี ต.แม่ปั๋ง อ.พร้าว จ.เชียงใหม่
- **หมายเลขติดต่อ:** 081-669-6653

## 2. Bus-Ticket / Tear-off Booklet Layout Specification

1. **Two-Part Structure per Ticket:**
   - **Left Stub (ต้นขั้วสำหรับคนขาย / เย็บเล่ม):** Width `28%`, contains running serial number (e.g., `NO. 0001`), ticket type (`บัตรชมมินิบอลลูน 100฿`), date checkboxes (`[ ] 20 พ.ย.` `[ ] 21 พ.ย.`), and collector note line.
   - **Perforation Line (เส้นปะสำหรับฉีก):** Vertical dashed border (`border-left: 2px dashed #64748b`) with scissor icon `✂`.
   - **Right Main Ticket (บัตรสำหรับลูกค้า):** Width `72%`, features festival artwork/balloon graphic ([บอลลูนตาหมากรุกเหนือทุ่งยามอาทิตย์อัสดง.png](../../../บอลลูนตาหมากรุกเหนือทุ่งยามอาทิตย์อัสดง.png) or [บอลลูนวัวยักษ์เหนือนาทุ่ง.png](../../../บอลลูนวัวยักษ์เหนือนาทุ่ง.png)), full event text, large `100 บาท` badge, and matching serial number (`NO. 0001`).

2. **A4 Page Packing & Print CSS:**
   - Fit **10 tickets per A4 page** (2 columns × 5 rows) or **8 tickets per A4 page** (1 column or 2×4 large format, selectable by user).
   - Include `@page { size: A4 portrait; margin: 6mm; }` and `@media print` rules that hide all UI controls/navbars and enforce `-webkit-print-color-adjust: exact; print-color-adjust: exact;`.
   - Each ticket container must have `break-inside: avoid; page-break-inside: avoid;` so no ticket is ever split across pages.

3. **Customization Controls (Hidden when printing):**
   - Start Number & End Number (e.g., `1` to `100`, formatted as `0001`–`0100`).
   - Date Mode selector:
     - `รวม 2 วัน (20-21 พฤศจิกายน 2569 พร้อมช่องติ๊ก)`
     - `เฉพาะวันศุกร์ที่ 20 พฤศจิกายน 2569`
     - `เฉพาะวันเสาร์ที่ 21 พฤศจิกายน 2569`
   - Artwork Theme selector: บอลลูนตาหมากรุก / บอลลูนวัวยักษ์ (งัวเงีย) / คละลาย
   - Direct button to **"สั่งพิมพ์ตั๋ว / บันทึกเป็น PDF (Print A4)"** plus a button to **"บันทึกยอดขายตั๋วเล่มเข้าหน้ารายงาน Admin"**.
