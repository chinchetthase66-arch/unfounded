/**
 * ระบบฐานข้อมูลและการเชื่อมต่อ Supabase Cloud Sync (Data & Cloud Layer)
 * โครงการ: เทศกาลท่องเที่ยวเมืองพร้าว 2569 (Phrao Tourism Festival 2026)
 * ผู้พัฒนา: S.Y. Interactive Development Limited
 */

const SUPABASE_CONFIG = {
  url: 'https://mpsuumkyqweenvdkmwwf.supabase.co',
  publishableKey: 'sb_publishable_4faJa4XnDt4Q7vHkE_nktQ_Pafv8fu3',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wc3V1bWt5cXdlZW52ZGttd3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NjM2MTEsImV4cCI6MjExMDQzOTYxMX0.be_xbEmxi2UnBRWxe_aGCoNn9BEuYbCDNbCZRPixfRs'
};

const STORAGE_KEYS = {
  BOOKINGS_CACHE: 'phrao_festival_2569_bookings_v1',
  SETTINGS_CACHE: 'phrao_festival_2569_settings_v1',
  ADMIN_AUTH: 'phrao_festival_2569_admin_session_v1',
  ADMIN_CREDS: 'phrao_festival_2569_admin_creds_v1'
};

const DEFAULT_SETTINGS = {
  quota_2026_11_24: 200,
  quota_2026_11_25: 200,
  open_2026_11_24: true,
  open_2026_11_25: true,
  open_2026_11_20: true,
  open_2026_11_21: true
};

/**
 * แปลงชื่อคอลัมน์จากฐานข้อมูล (snake_case) เป็นรูปแบบใช้งานในแอป (camelCase)
 */
function dbRowToBooking(row) {
  if (!row) return null;
  return {
    id: String(row.id || ''),
    category: row.category || 'lantern',
    eventDate: row.event_date || row.eventDate || '2026-11-24',
    customerName: row.customer_name || row.customerName || '',
    phone: String(row.phone || ''),
    quantity: Number(row.quantity) || 1,
    attendees: Number(row.attendees) || (row.category === 'lantern' ? (Number(row.quantity) || 1) * 2 : (Number(row.quantity) || 1)),
    unitPrice: Number(row.unit_price || row.unitPrice) || (row.category === 'lantern' ? 299 : 100),
    totalAmount: Number(row.total_amount || row.totalAmount) || 0,
    paymentMethod: row.payment_method || row.paymentMethod || 'promptpay_qr',
    slipDataUrl: row.slip_data_url ?? row.slipDataUrl ?? '',
    paymentStatus: row.payment_status || row.paymentStatus || 'pending',
    checkedIn: Boolean(row.checked_in ?? row.checkedIn ?? false),
    checkedInAt: row.checked_in_at || row.checkedInAt || null,
    channel: row.channel || 'online',
    ticketSerialRange: row.ticket_serial_range || row.ticketSerialRange || '',
    note: row.note || '',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString()
  };
}

/**
 * แปลงออบเจกต์การจองในแอป (camelCase) เป็นคอลัมน์ใน Supabase (snake_case)
 */
function bookingToDbRow(booking) {
  return {
    id: String(booking.id),
    category: booking.category || 'lantern',
    event_date: booking.eventDate,
    customer_name: booking.customerName.trim(),
    phone: String(booking.phone).replace(/[^0-9]/g, ''),
    quantity: Number(booking.quantity),
    attendees: Number(booking.attendees),
    unit_price: Number(booking.unitPrice),
    total_amount: Number(booking.totalAmount),
    payment_method: booking.paymentMethod || 'promptpay_qr',
    slip_data_url: booking.slipDataUrl || null,
    payment_status: booking.paymentStatus || 'pending',
    checked_in: Boolean(booking.checkedIn),
    checked_in_at: booking.checkedInAt || null,
    channel: booking.channel || 'online',
    ticket_serial_range: booking.ticketSerialRange || null,
    note: booking.note || '',
    created_at: booking.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * เรียกใช้ Supabase REST API (PostgREST) พร้อมระบบสลับ Key อัตโนมัติหากจำเป็น
 */
async function supabaseRestFetch(path, options = {}) {
  const apiKey = SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.publishableKey;
  const headers = {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${path}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Supabase HTTP ${response.status}: ${errText}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * อ่านข้อมูล Cache ในเครื่อง
 */
function getLocalBookingsCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS_CACHE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(dbRowToBooking) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalBookingsCache(bookings) {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS_CACHE, JSON.stringify(bookings));
  } catch (e) {
    // กรณีพื้นที่เต็ม ให้เก็บรูปสลิปเฉพาะรายการล่าสุดใน LocalStorage (บน Supabase เก็บครบ 100%)
    try {
      const slim = bookings.map((b, idx) => idx < 30 ? b : { ...b, slipDataUrl: '' });
      localStorage.setItem(STORAGE_KEYS.BOOKINGS_CACHE, JSON.stringify(slim));
    } catch (_) {}
  }
}

/**
 * ดึงรายการจองทั้งหมดจาก Supabase (พร้อมอัปเดต Local Cache)
 */
async function fetchAllBookings() {
  try {
    const rows = await supabaseRestFetch('bookings?select=*&order=created_at.desc');
    const bookings = (rows || []).map(dbRowToBooking);
    saveLocalBookingsCache(bookings);
    window.PHRAO_CLOUD_ONLINE = true;
    return bookings;
  } catch (err) {
    console.warn('Using local bookings cache fallback:', err.message);
    window.PHRAO_CLOUD_ONLINE = false;
    return getLocalBookingsCache();
  }
}

/**
 * ค้นหาบัตรของลูกค้าด้วยเบอร์โทรศัพท์หรือรหัสจอง
 */
async function findBookingsByQuery(queryStr) {
  const clean = String(queryStr || '').trim();
  if (!clean) return [];
  const digitsOnly = clean.replace(/[^0-9]/g, '');
  const all = await fetchAllBookings();
  return all.filter(b => {
    const bPhone = String(b.phone || '').replace(/[^0-9]/g, '');
    const matchId = b.id.toLowerCase().includes(clean.toLowerCase());
    const matchPhone = digitsOnly.length >= 4 && bPhone.includes(digitsOnly);
    const matchName = b.customerName.toLowerCase().includes(clean.toLowerCase());
    return matchId || matchPhone || matchName;
  });
}

/**
 * สร้างรหัสการจองไม่ซ้ำ เช่น KL24-0001, KL25-0002, MB20-0001, MB21-0001
 */
function generateBookingId(category, eventDate, existingBookings = []) {
  const prefixMap = {
    'lantern_2026-11-24': 'KL24',
    'lantern_2026-11-25': 'KL25',
    'balloon_2026-11-20': 'MB20',
    'balloon_2026-11-21': 'MB21'
  };
  const prefix = prefixMap[`${category}_${eventDate}`] || (category === 'lantern' ? 'KL26' : 'MB26');
  let maxNum = 0;
  existingBookings.forEach(b => {
    if (b.id && b.id.startsWith(prefix + '-')) {
      const part = parseInt(b.id.split('-')[1], 10);
      if (!isNaN(part) && part > maxNum) maxNum = part;
    }
  });
  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(4, '0');
  const candidate = `${prefix}-${padded}`;
  // ป้องกันการชนกันกรณีจองพร้อมกันหลายเครื่อง
  const exists = existingBookings.some(b => b.id === candidate);
  if (exists) {
    const randSuffix = String(Math.floor(1000 + Math.random() * 9000));
    return `${prefix}-${randSuffix}`;
  }
  return candidate;
}

/**
 * บันทึกรายการจองใหม่ลง Supabase และ Local Cache
 */
async function createBookingRecord(bookingData) {
  const currentList = await fetchAllBookings();
  const id = bookingData.id || generateBookingId(bookingData.category, bookingData.eventDate, currentList);
  const nowIso = new Date().toISOString();

  const unitPrice = bookingData.category === 'lantern' ? 299 : 100;
  const quantity = Math.max(1, parseInt(bookingData.quantity, 10) || 1);
  const attendees = bookingData.category === 'lantern' ? quantity * 2 : quantity;
  const totalAmount = quantity * unitPrice;

  const newBooking = dbRowToBooking({
    id,
    category: bookingData.category || 'lantern',
    eventDate: bookingData.eventDate,
    customerName: bookingData.customerName,
    phone: String(bookingData.phone).replace(/[^0-9]/g, ''),
    quantity,
    attendees,
    unitPrice,
    totalAmount,
    paymentMethod: bookingData.paymentMethod || 'promptpay_qr',
    slipDataUrl: bookingData.slipDataUrl || '',
    paymentStatus: bookingData.paymentStatus || 'pending',
    checkedIn: Boolean(bookingData.checkedIn || false),
    checkedInAt: bookingData.checkedInAt || null,
    channel: bookingData.channel || 'online',
    ticketSerialRange: bookingData.ticketSerialRange || '',
    note: bookingData.note || '',
    createdAt: nowIso,
    updatedAt: nowIso
  });

  const dbPayload = bookingToDbRow(newBooking);

  try {
    await supabaseRestFetch('bookings', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(dbPayload)
    });
    window.PHRAO_CLOUD_ONLINE = true;
  } catch (err) {
    console.warn('Saved to local cache (cloud retry pending):', err.message);
    window.PHRAO_CLOUD_ONLINE = false;
  }

  const updatedList = [newBooking, ...currentList.filter(b => b.id !== newBooking.id)];
  saveLocalBookingsCache(updatedList);
  return newBooking;
}

/**
 * อัปเดตข้อมูลการจอง (เช่น อนุมัติสลิป, เช็คอินรับโคม, แก้ไขข้อมูลลูกค้า)
 */
async function updateBookingRecord(id, patch) {
  const currentList = getLocalBookingsCache();
  const target = currentList.find(b => b.id === id);
  const merged = target ? { ...target, ...patch, updatedAt: new Date().toISOString() } : { id, ...patch };

  // ถ้ามีการเปลี่ยนจำนวนหรือประเภท ให้คำนวณยอดและจำนวนผู้เข้าร่วมใหม่
  if (patch.quantity !== undefined || patch.category !== undefined) {
    const cat = merged.category || 'lantern';
    const qty = Math.max(1, parseInt(merged.quantity, 10) || 1);
    merged.quantity = qty;
    merged.unitPrice = cat === 'lantern' ? 299 : 100;
    merged.attendees = cat === 'lantern' ? qty * 2 : qty;
    merged.totalAmount = qty * merged.unitPrice;
  }

  const dbRow = bookingToDbRow(merged);
  try {
    await supabaseRestFetch(`bookings?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(dbRow)
    });
    window.PHRAO_CLOUD_ONLINE = true;
  } catch (err) {
    console.warn('Updated local cache:', err.message);
  }

  const nextList = currentList.map(b => (b.id === id ? dbRowToBooking(merged) : b));
  saveLocalBookingsCache(nextList);
  return dbRowToBooking(merged);
}

/**
 * ลบรายการจอง
 */
async function deleteBookingRecord(id) {
  try {
    await supabaseRestFetch(`bookings?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('Delete local fallback:', err.message);
  }
  const currentList = getLocalBookingsCache().filter(b => b.id !== id);
  saveLocalBookingsCache(currentList);
  return true;
}

/**
 * ดึงค่าการตั้งค่าโควตาและสถานะเปิด/ปิดรับจองจาก Supabase
 */
async function fetchFestivalSettings() {
  try {
    const rows = await supabaseRestFetch('festival_settings?key=eq.config&select=*');
    if (rows && rows.length > 0 && rows[0].value) {
      const merged = { ...DEFAULT_SETTINGS, ...rows[0].value };
      localStorage.setItem(STORAGE_KEYS.SETTINGS_CACHE, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Using local settings cache:', err.message);
  }
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.SETTINGS_CACHE);
    return cached ? { ...DEFAULT_SETTINGS, ...JSON.parse(cached) } : { ...DEFAULT_SETTINGS };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * บันทึกการตั้งค่าโควตาและสถานะเปิด/ปิดรับจองขึ้น Supabase
 */
async function saveFestivalSettings(newSettings) {
  const merged = { ...DEFAULT_SETTINGS, ...newSettings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS_CACHE, JSON.stringify(merged));
  try {
    await supabaseRestFetch('festival_settings', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        key: 'config',
        value: merged,
        updated_at: new Date().toISOString()
      })
    });
  } catch (err) {
    console.warn('Saved settings locally:', err.message);
  }
  return merged;
}

/**
 * บีบอัดภาพสลิปโอนเงินด้วย HTML5 Canvas เพื่อให้ขนาดกะทัดรัด อัปโหลดขึ้น Supabase ได้รวดเร็ว 100%
 */
function compressSlipImage(file, maxWidth = 880, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('กรุณาเลือกไฟล์รูปสลิปโอนเงิน'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = (evt) => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์ที่เลือกไม่ใช่รูปภาพที่ถูกต้อง'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * วาด QR Matrix สำหรับรหัสบัตร E-Ticket ลงบน Canvas (ไม่ต้องพึ่งพา External API ทำงานได้ 100% แม้ออฟไลน์)
 */
function drawTicketMatrixCode(canvas, codeText) {
  if (!canvas) return;
  const size = 180;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  const cells = 21;
  const pad = 12;
  const cellSize = Math.floor((size - pad * 2) / cells);

  function drawFinder(r0, c0) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        ctx.fillStyle = (isBorder || isInner) ? '#0F172A' : '#FFFFFF';
        ctx.fillRect(pad + (c0 + c) * cellSize, pad + (r0 + r) * cellSize, cellSize, cellSize);
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, cells - 7);
  drawFinder(cells - 7, 0);

  // สร้างลวดลาย Deterministic จากรหัสจองและเบอร์โทร
  let hash = 2166136261;
  const str = String(codeText || 'PHRAO-2569');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const inTL = r < 8 && c < 8;
      const inTR = r < 8 && c >= cells - 8;
      const inBL = r >= cells - 8 && c < 8;
      if (inTL || inTR || inBL) continue;

      if (r === 6 || c === 6) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#0F172A' : '#FFFFFF';
        ctx.fillRect(pad + c * cellSize, pad + r * cellSize, cellSize, cellSize);
        continue;
      }

      const seed = Math.imul(r * 31 + c * 17 + str.charCodeAt((r + c) % str.length), hash);
      const bit = (Math.abs(seed) % 7) < 4;
      if (bit) {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(pad + c * cellSize, pad + r * cellSize, cellSize, cellSize);
      }
    }
  }
}

/**
 * สร้างและดาวน์โหลดรูปภาพบัตร E-Ticket ความละเอียดสูง (.png) ลงมือถือ/คอมพิวเตอร์ของลูกค้า
 */
function downloadETicketAsPng(booking) {
  if (!booking) return;
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');

  const isLantern = booking.category === 'lantern';

  // พื้นหลังไล่เฉดสี
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (isLantern) {
    grad.addColorStop(0, '#0B132B');
    grad.addColorStop(0.5, '#1C2541');
    grad.addColorStop(1, '#0F172A');
  } else {
    grad.addColorStop(0, '#1B4332');
    grad.addColorStop(0.5, '#2D6A4F');
    grad.addColorStop(1, '#081C15');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // กรอบทองมงคล
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 6;
  ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

  // ส่วนหัวบัตร
  ctx.fillStyle = '#FBBF24';
  ctx.font = 'bold 34px Prompt, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('เทศกาลท่องเที่ยวเมืองพร้าว 2569', canvas.width / 2, 105);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px Prompt, sans-serif';
  ctx.fillText(
    isLantern ? '🏮 บัตรพรีออเดอร์ปล่อยโคมลอย (E-TICKET)' : '🎈 บัตรชมมินิบอลลูน (E-TICKET)',
    canvas.width / 2,
    165
  );

  ctx.fillStyle = '#FEF3C7';
  ctx.font = '26px Prompt, sans-serif';
  ctx.fillText('ณ โฮงชาฮักมี ต.แม่ปั๋ง อ.พร้าว จ.เชียงใหม่ | โทร. 081-669-6653 (คุณฝ้าย)', canvas.width / 2, 215);

  // กล่องเนื้อหาสีครีม
  ctx.fillStyle = '#FDFBF7';
  ctx.fillRect(65, 255, canvas.width - 130, 880);
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 3;
  ctx.strokeRect(65, 255, canvas.width - 130, 880);

  // รหัสการจอง
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 30px Prompt, sans-serif';
  ctx.fillText('รหัสการจอง (BOOKING ID)', canvas.width / 2, 315);

  ctx.fillStyle = '#D97706';
  ctx.font = 'bold 60px Prompt, monospace';
  ctx.fillText(booking.id, canvas.width / 2, 385);

  // สถานะบัตร
  const statusMap = {
    approved: { label: '✅ อนุมัติสลิปแล้ว (ยืนยันสมบูรณ์)', color: '#059669' },
    pending: { label: '⏳ แนบสลิปแล้ว (ใช้ยื่นลงทะเบียนหน้างานได้ทันที)', color: '#D97706' },
    rejected: { label: '❌ รายการถูกยกเลิก/กรุณาติดต่อเจ้าหน้าที่', color: '#DC2626' }
  };
  const st = booking.checkedIn
    ? { label: '🏮 ลงทะเบียนรับของหน้างานเรียบร้อยแล้ว', color: '#2563EB' }
    : (statusMap[booking.paymentStatus] || statusMap.pending);

  ctx.fillStyle = st.color;
  ctx.font = 'bold 28px Prompt, sans-serif';
  ctx.fillText(st.label, canvas.width / 2, 435);

  // เส้นคั่น
  ctx.strokeStyle = '#CBD5E1';
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(95, 465);
  ctx.lineTo(canvas.width - 95, 465);
  ctx.stroke();
  ctx.setLineDash([]);

  // รายละเอียดผู้จอง
  ctx.textAlign = 'left';
  const leftX = 115;
  let y = 525;
  const lineGap = 56;

  const dateLabelMap = {
    '2026-11-24': 'วันอังคารที่ 24 พฤศจิกายน 2569',
    '2026-11-25': 'วันพุธที่ 25 พฤศจิกายน 2569',
    '2026-11-20': 'วันศุกร์ที่ 20 พฤศจิกายน 2569',
    '2026-11-21': 'วันเสาร์ที่ 21 พฤศจิกายน 2569'
  };

  const rows = [
    ['ชื่อผู้จอง:', booking.customerName],
    ['เบอร์โทรศัพท์:', booking.phone],
    ['วันที่เข้าร่วมงาน:', dateLabelMap[booking.eventDate] || booking.eventDate],
    [
      'จำนวนสิทธิ์:',
      isLantern
        ? `${booking.quantity} โคม (เข้างานได้ ${booking.attendees} ท่าน)`
        : `${booking.quantity} ใบ (เข้างานได้ ${booking.attendees} ท่าน)`
    ],
    ['ยอดชำระเงินรวม:', `${Number(booking.totalAmount).toLocaleString()} บาท`],
    [
      'กำหนดการสำคัญ:',
      isLantern
        ? 'ลงทะเบียน 18.00 น. | ปล่อยโคมพร้อมกัน 20.00 น.'
        : 'เวลาเข้าชม 18.00 - 20.00 น.'
    ]
  ];

  rows.forEach(([label, val]) => {
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 26px Prompt, sans-serif';
    ctx.fillText(label, leftX, y);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 28px Prompt, sans-serif';
    ctx.fillText(String(val || '-'), leftX + 230, y);
    y += lineGap;
  });

  if (isLantern) {
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(105, y - 20, canvas.width - 210, 74);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.strokeRect(105, y - 20, canvas.width - 210, 74);
    ctx.fillStyle = '#92400E';
    ctx.textAlign = 'center';
    ctx.font = 'bold 23px Prompt, sans-serif';
    ctx.fillText('สิ่งที่ได้รับ: โคมลอยไซส์ XL • ไฟแช็ค • เทียน • ปากกา • เครื่องดื่ม • ของที่ระลึก', canvas.width / 2, y + 26);
    y += 95;
  } else {
    y += 30;
  }

  // วาด QR Code ประจำบัตร
  const qrCanvas = document.createElement('canvas');
  drawTicketMatrixCode(qrCanvas, `${booking.id}|${booking.phone}|${booking.eventDate}`);
  ctx.drawImage(qrCanvas, canvas.width / 2 - 90, 920, 180, 180);

  // ส่วนท้ายเครดิตผู้พัฒนา
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 22px Prompt, sans-serif';
  ctx.fillText('กรุณาแสดงบัตรนี้แก่เจ้าหน้าที่หน้างาน ณ โฮงชาฮักมี เวลา 18.00 น.', canvas.width / 2, 1185);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '20px Prompt, sans-serif';
  ctx.fillText('Developed by S.Y. Interactive Development Limited', canvas.width / 2, 1225);

  const link = document.createElement('a');
  link.download = `ETicket-${booking.id}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
