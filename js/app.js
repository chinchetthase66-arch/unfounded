/**
 * ระบบควบคุมหลักฝั่งลูกค้าและระบบหลังบ้านแอดมิน + ระบบสแกน QR สลิปอัตโนมัติ & ป้องกันสลิปซ้ำ
 * โครงการ: เทศกาลท่องเที่ยวเมืองพร้าว 2569 (Phrao Tourism Festival 2026)
 * ผู้พัฒนา: S.Y. Interactive Development Limited
 */

const APP_STATE = {
  activeTab: 'balloon',
  bookings: [],
  settings: { ...DEFAULT_SETTINGS },
  compressedSlips: {
    lantern: '',
    balloon: ''
  },
  slipScanMeta: {
    lantern: { qrDetected: false, slipQrRef: '', slipQrRaw: '', slipQrDisplay: '', isDuplicate: false, duplicateOf: null },
    balloon: { qrDetected: false, slipQrRef: '', slipQrRaw: '', slipQrDisplay: '', isDuplicate: false, duplicateOf: null }
  }
};

const DATE_THAI_LABELS = {
  '2026-11-24': 'อังคารที่ 24 พ.ย. 2569',
  '2026-11-25': 'พุธที่ 25 พ.ย. 2569',
  '2026-11-20': 'ศุกร์ที่ 20 พ.ย. 2569',
  '2026-11-21': 'เสาร์ที่ 21 พ.ย. 2569'
};

/**
 * เริ่มต้นระบบเมื่อโหลดหน้าเว็บ
 */
window.addEventListener('DOMContentLoaded', () => {
  onBalloonQtyInput();
  const openAdmin = location.hash === '#admin';
  if (openAdmin && isAdminLoggedIn()) {
    switchMainTab('admin', { keepHash: true });
  } else if (openAdmin) {
    switchMainTab('balloon', { keepHash: true });
    handleAdminNavClick();
  } else {
    switchMainTab('balloon', { keepHash: true });
  }
  document.documentElement.classList.remove('open-admin');
  syncAllDataFromCloud();
});

window.addEventListener('hashchange', () => {
  if (location.hash === '#admin') {
    handleAdminNavClick();
  } else if (APP_STATE.activeTab === 'admin') {
    switchMainTab('balloon', { keepHash: true });
  }
});

/**
 * ซิงค์ข้อมูลการจองและการตั้งค่าจาก Supabase
 */
async function syncAllDataFromCloud() {
  try {
    const [bookings, settings] = await Promise.all([
      fetchAllBookings(),
      fetchFestivalSettings()
    ]);
    APP_STATE.bookings = bookings || [];
    APP_STATE.settings = settings || { ...DEFAULT_SETTINGS };
    updateCustomerQuotaBadges();
    if (APP_STATE.activeTab === 'admin') {
      renderAdminKpiAndInventory();
      renderAdminBookingsTable();
    }
  } catch (err) {
    console.warn('Sync notice:', err.message);
  }
}

/**
 * สลับแท็บหลักของแอป
 */
function switchMainTab(tabName, options = {}) {
  APP_STATE.activeTab = tabName;
  const tabs = ['balloon', 'lookup', 'admin'];
  tabs.forEach(t => {
    const sec = document.getElementById(`tabSection-${t}`);
    const btn = document.getElementById(`navBtn-${t}`);
    if (sec) {
      if (t === tabName) {
        sec.classList.remove('hidden');
      } else {
        sec.classList.add('hidden');
      }
    }
    if (btn) {
      if (t === tabName) {
        btn.className = 'nav-btn nav-active';
      } else if (t === 'admin') {
        btn.className = 'nav-btn nav-admin';
      } else {
        btn.className = 'nav-btn nav-idle';
      }
    }
  });

  if (!options.keepHash) {
    if (tabName === 'admin') {
      if (location.hash !== '#admin') history.replaceState(null, '', '#admin');
    } else if (location.hash === '#admin') {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  if (tabName === 'admin') {
    refreshAdminPortal();
  }
}

/**
 * เดิมใช้โควตาโคมลอย — ระบบปัจจุบันจำหน่ายเฉพาะมินิบอลลูน
 */
function updateCustomerQuotaBadges() {
  /* no-op: lantern product removed */
}

/**
 * เลือกวันที่ปล่อยโคมลอย (24 หรือ 25 พ.ย. 2569)
 */
function selectLanternDate(dateStr) {
  document.getElementById('lanternSelectedDate').value = dateStr;
  ['2026-11-24', '2026-11-25'].forEach(d => {
    const btn = document.getElementById(`lanternDateBtn-${d}`);
    if (!btn) return;
    if (d === dateStr) {
      btn.className = 'date-btn date-active';
    } else {
      btn.className = 'date-btn date-idle';
    }
  });
}

function adjustLanternQty(delta) {
  const input = document.getElementById('lanternQtyInput');
  let val = parseInt(input.value, 10) || 1;
  val = Math.max(1, Math.min(50, val + delta));
  input.value = val;
  onLanternQtyInput();
}

function onLanternQtyInput() {
  const input = document.getElementById('lanternQtyInput');
  let qty = parseInt(input.value, 10) || 1;
  if (qty < 1) qty = 1;
  const attendees = qty * 2;
  const total = qty * 299;

  document.getElementById('lanternCalcAttendees').textContent = `${qty} โคม (สำหรับ ${attendees} ท่าน)`;
  document.getElementById('lanternCalcTotal').textContent = total.toLocaleString();
  const copyBtn = document.getElementById('lanternCopyBtnAmount');
  if (copyBtn) copyBtn.textContent = total.toLocaleString();
}

/**
 * เลือกวันที่ชมมินิบอลลูน (20 หรือ 21 พ.ย. 2569)
 */
function selectBalloonDate(dateStr) {
  document.getElementById('balloonSelectedDate').value = dateStr;
  ['2026-11-20', '2026-11-21'].forEach(d => {
    const btn = document.getElementById(`balloonDateBtn-${d}`);
    if (!btn) return;
    if (d === dateStr) {
      btn.className = 'date-btn date-active date-active--balloon';
    } else {
      btn.className = 'date-btn date-idle date-idle--balloon';
    }
  });
}

function adjustBalloonQty(delta) {
  const input = document.getElementById('balloonQtyInput');
  let val = parseInt(input.value, 10) || 1;
  val = Math.max(1, Math.min(100, val + delta));
  input.value = val;
  onBalloonQtyInput();
}

function onBalloonQtyInput() {
  const input = document.getElementById('balloonQtyInput');
  let qty = parseInt(input.value, 10) || 1;
  if (qty < 1) qty = 1;
  const total = qty * 100;
  document.getElementById('balloonCalcAttendees').textContent = `${qty} ท่าน`;
  document.getElementById('balloonCalcTotal').textContent = total.toLocaleString();
  const balloonCopy = document.getElementById('balloonCopyBtnAmount');
  if (balloonCopy) balloonCopy.textContent = total.toLocaleString();
}

const PROMPTPAY_NUMBER = '0647328284';

async function copyPromptPayNumber() {
  try {
    await navigator.clipboard.writeText(PROMPTPAY_NUMBER);
    alert(`คัดลอกพร้อมเพย์ ${PROMPTPAY_NUMBER} แล้ว`);
  } catch (_) {
    prompt('คัดลอกพร้อมเพย์นี้:', PROMPTPAY_NUMBER);
  }
}

/**
 * คัดลอกยอดโอนเงิน
 */
function copyCurrentAmount(category) {
  const qty = parseInt(document.getElementById(category === 'lantern' ? 'lanternQtyInput' : 'balloonQtyInput').value, 10) || 1;
  const amount = category === 'lantern' ? qty * 299 : qty * 100;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(String(amount)).catch(() => {});
  }
  const btnSpan = document.getElementById(category === 'lantern' ? 'lanternCopyBtnAmount' : 'balloonCopyBtnAmount');
  if (btnSpan) {
    const orig = amount.toLocaleString();
    btnSpan.textContent = `${orig} (คัดลอกแล้ว!)`;
    setTimeout(() => { btnSpan.textContent = orig; }, 1800);
  }
}

/**
 * สแกน QR ในรูปสลิปอัตโนมัติ + ตรวจสอบสลิปซ้ำกับฐานข้อมูล Supabase ทันทีที่ลูกค้าเลือกไฟล์
 */
async function previewBookingSlip(event, category) {
  const file = event.target.files && event.target.files[0];
  const errBox = document.getElementById(`${category}FormError`);
  const qrStatusEl = document.getElementById(`${category}SlipQrStatus`);
  const wrap = document.getElementById(`${category}SlipPreviewWrap`);
  const img = document.getElementById(`${category}SlipPreviewImg`);

  if (errBox) errBox.classList.add('hidden');
  if (!file) return;

  if (qrStatusEl) {
    qrStatusEl.className = 'slip-status slip-status--info';
    qrStatusEl.textContent = '🔍 กำลังสแกนอ่าน QR สลิปธนาคารและตรวจสอบสลิปซ้ำ...';
  }
  if (wrap) wrap.classList.remove('hidden');

  try {
    const scanResult = await compressAndScanSlipImage(file, 880, 0.78);
    APP_STATE.compressedSlips[category] = scanResult.dataUrl;
    if (img) img.src = scanResult.dataUrl;

    // เช็คสลิปซ้ำในฐานข้อมูล Supabase ทันที
    const duplicateBooking = await findDuplicateSlipBooking(scanResult.slipQrRef, scanResult.slipQrRaw);

    const expectedAmount = category === 'lantern'
      ? (parseInt(document.getElementById('lanternQtyInput')?.value, 10) || 1) * 299
      : (parseInt(document.getElementById('balloonQtyInput')?.value, 10) || 1) * 100;
    const amountFromQr = scanResult.amountFromQr;
    let amountMatch = null;
    if (amountFromQr != null) {
      amountMatch = Math.abs(Number(amountFromQr) - Number(expectedAmount)) < 0.01;
    }

    APP_STATE.slipScanMeta[category] = {
      qrDetected: scanResult.qrDetected,
      slipQrRef: scanResult.slipQrRef,
      slipQrRaw: scanResult.slipQrRaw,
      slipQrDisplay: scanResult.slipQrDisplay,
      amountFromQr,
      expectedAmount,
      amountMatch,
      mime: scanResult.mime || 'image/jpeg',
      isDuplicate: Boolean(duplicateBooking),
      duplicateOf: duplicateBooking
    };

    if (duplicateBooking) {
      if (qrStatusEl) {
        qrStatusEl.className = 'slip-status slip-status--error';
        qrStatusEl.innerHTML = `ตรวจพบสลิปซ้ำ! สลิปใบนี้เคยถูกใช้จองแล้วในรหัส <span class="underline">${duplicateBooking.id}</span> (${escapeHtml(duplicateBooking.customerName)})`;
      }
      if (errBox) {
        errBox.textContent = `ไม่สามารถใช้สลิปใบนี้ได้ เนื่องจากเคยถูกใช้จองแล้วในรหัส ${duplicateBooking.id}`;
        errBox.classList.remove('hidden');
      }
      return;
    }

    const fmt = (n) => Number(n).toLocaleString('th-TH');
    const mimeNote = (scanResult.mime || '').includes('webp') ? 'WebP' : 'JPEG';
    if (scanResult.qrDetected) {
      let amountLine = `ยอดที่ต้องโอน <strong>${fmt(expectedAmount)}</strong> บาท`;
      if (amountFromQr != null) {
        amountLine = amountMatch
          ? `ยอดจาก QR สลิป <strong>${fmt(amountFromQr)}</strong> บาท ตรงกับยอดจอง`
          : `ยอดจาก QR สลิป <strong>${fmt(amountFromQr)}</strong> บาท ไม่ตรงยอดจอง ${fmt(expectedAmount)} บาท — แอดมินจะตรวจซ้ำ`;
      }
      if (qrStatusEl) {
        qrStatusEl.className = amountMatch === false ? 'slip-status slip-status--warn' : 'slip-status slip-status--ok';
        qrStatusEl.innerHTML = `สแกน QR สลิปสำเร็จ (Ref: <span class="font-mono">${escapeHtml(scanResult.slipQrDisplay)}</span>) · ไม่ซ้ำ · ${amountLine} · เก็บรูปเป็น ${mimeNote}`;
      }
    } else if (qrStatusEl) {
      qrStatusEl.className = 'slip-status slip-status--warn';
      qrStatusEl.innerHTML = `แนบรูปแล้ว (ไม่พบ QR ในภาพ) ใช้รหัสภาพ ${escapeHtml(scanResult.slipQrRef.slice(0, 14))} ตรวจไม่ซ้ำ · ยอดที่ต้องโอน <strong>${fmt(expectedAmount)}</strong> บาท · รอแอดมินเทียบสลิป · เก็บรูปเป็น ${mimeNote}`;
    }
  } catch (err) {
    if (errBox) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    }
  }
}

/**
 * บันทึกการจองของลูกค้า (โคมลอย หรือ มินิบอลลูน) ลง Supabase และออก E-Ticket ทันที
 */
async function submitCustomerBooking(event, category) {
  event.preventDefault();
  const isLantern = category === 'lantern';
  const errBox = document.getElementById(`${category}FormError`);
  const submitBtn = document.getElementById(`${category}SubmitBtn`);
  if (errBox) errBox.classList.add('hidden');

  const eventDate = document.getElementById(`${category}SelectedDate`).value;
  const quantity = parseInt(document.getElementById(`${category}QtyInput`).value, 10) || 1;
  const customerName = document.getElementById(`${category}CustomerName`).value.trim();
  const rawPhone = document.getElementById(`${category}CustomerPhone`).value.trim();
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  const note = document.getElementById(`${category}CustomerNote`).value.trim();
  const slipDataUrl = APP_STATE.compressedSlips[category];
  const scanMeta = APP_STATE.slipScanMeta[category] || {};

  if (!customerName) {
    errBox.textContent = 'กรุณากรอกชื่อผู้จอง';
    errBox.classList.remove('hidden');
    return;
  }
  if (cleanPhone.length < 9) {
    errBox.textContent = 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (อย่างน้อย 9-10 หลัก)';
    errBox.classList.remove('hidden');
    return;
  }
  if (!slipDataUrl) {
    errBox.textContent = 'กรุณาแนบรูปสลิปโอนเงินก่อนกดยืนยันการจอง';
    errBox.classList.remove('hidden');
    return;
  }

  // บล็อกทันทีหากเป็นสลิปซ้ำ
  if (scanMeta.isDuplicate && scanMeta.duplicateOf) {
    errBox.textContent = `🚫 ไม่สามารถส่งสลิปซ้ำได้! สลิปใบนี้เคยถูกใช้จองแล้วในรหัส ${scanMeta.duplicateOf.id} กรุณาแนบสลิปใบใหม่`;
    errBox.classList.remove('hidden');
    return;
  }

  // ตรวจสอบสถานะเปิดรับจอง
  if (isLantern) {
    const openKey = eventDate === '2026-11-24' ? 'open_2026_11_24' : 'open_2026_11_25';
    if (APP_STATE.settings[openKey] === false) {
      errBox.textContent = `ขออภัย วันที่ ${DATE_THAI_LABELS[eventDate]} ปิดรับพรีออเดอร์แล้ว กรุณาเลือกวันอื่น`;
      errBox.classList.remove('hidden');
      return;
    }
  }

  const origBtnHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '⏳ กำลังตรวจสอบสลิปและออกบัตร E-Ticket...';

  try {
    const newBooking = await createBookingRecord({
      category,
      eventDate,
      customerName,
      phone: cleanPhone,
      quantity,
      paymentMethod: 'promptpay_qr',
      slipDataUrl,
      slipQrRef: scanMeta.slipQrRef || '',
      slipQrRaw: scanMeta.slipQrRaw || '',
      paymentStatus: 'pending',
      checkedIn: false,
      channel: 'online',
      note
    });

    APP_STATE.bookings = [newBooking, ...APP_STATE.bookings.filter(b => b.id !== newBooking.id)];
    updateCustomerQuotaBadges();

    // รีเซ็ตฟอร์ม
    document.getElementById(`${category}BookingForm`).reset();
    APP_STATE.compressedSlips[category] = '';
    APP_STATE.slipScanMeta[category] = { qrDetected: false, slipQrRef: '', slipQrRaw: '', slipQrDisplay: '', amountFromQr: null, expectedAmount: null, amountMatch: null, mime: '', isDuplicate: false, duplicateOf: null };
    const previewWrap = document.getElementById(`${category}SlipPreviewWrap`);
    if (previewWrap) previewWrap.classList.add('hidden');
    if (isLantern) {
      document.getElementById('lanternQtyInput').value = 1;
      onLanternQtyInput();
    } else {
      document.getElementById('balloonQtyInput').value = 2;
      onBalloonQtyInput();
    }

    showETicketModal(newBooking);
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = origBtnHtml;
  }
}

/**
 * แสดงหน้าต่างบัตร E-Ticket พร้อม QR Code และปุ่มดาวน์โหลดเป็นรูปภาพ PNG
 */
function showETicketModal(booking) {
  if (!booking) return;
  const isLantern = booking.category === 'lantern';
  const body = document.getElementById('eTicketModalBody');

  const statusBadge = booking.checkedIn
    ? `<span class="inline-block px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-extrabold">✅ เช็คอินเข้าชมเรียบร้อยแล้ว</span>`
    : booking.paymentStatus === 'approved'
      ? `<span class="inline-block px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-extrabold">✅ อนุมัติสลิปแล้ว (ยืนยันสมบูรณ์)</span>`
      : booking.paymentStatus === 'rejected'
        ? `<span class="inline-block px-3 py-1 rounded-full bg-red-600 text-white text-xs font-extrabold">❌ รายการถูกยกเลิก</span>`
        : `<span class="inline-block px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-extrabold">⏳ แนบสลิปแล้ว (ใช้ยื่นหน้างานได้ทันที)</span>`;

  body.innerHTML = `
    <div class="text-center border-b border-amber-300 pb-3 space-y-1">
      <div class="text-xs font-bold text-amber-800">เทศกาลท่องเที่ยวเมืองพร้าว 2569 • ณ โฮงชาฮักมี</div>
      <div class="text-lg font-extrabold text-slate-950">
        ${isLantern ? 'บัตรพรีออเดอร์ปล่อยโคมลอย (เลิกจำหน่าย)' : '🎈 บัตรชมมินิบอลลูน คนละ 100 บาท'}
      </div>
      <div class="text-2xl font-extrabold text-amber-700 font-mono tracking-wider">${booking.id}</div>
      <div>${statusBadge}</div>
    </div>

    <div class="space-y-1.5 text-xs md:text-sm py-1">
      <div class="flex justify-between">
        <span class="text-slate-600 font-medium">ชื่อผู้จอง:</span>
        <span class="font-extrabold text-slate-900">${escapeHtml(booking.customerName)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-600 font-medium">เบอร์โทรศัพท์:</span>
        <span class="font-bold text-slate-900">${escapeHtml(booking.phone)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-600 font-medium">วันที่เข้าร่วม:</span>
        <span class="font-extrabold text-amber-800">${DATE_THAI_LABELS[booking.eventDate] || booking.eventDate}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-600 font-medium">จำนวนสิทธิ์:</span>
        <span class="font-extrabold text-slate-900">
          ${isLantern ? `${booking.quantity} โคม (${booking.attendees} ท่าน)` : `${booking.quantity} ใบ (${booking.attendees} ท่าน)`}
        </span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-600 font-medium">ยอดชำระรวม:</span>
        <span class="font-extrabold text-emerald-700">${Number(booking.totalAmount).toLocaleString()} บาท</span>
      </div>
      ${booking.slipQrRef ? `
        <div class="flex justify-between">
          <span class="text-slate-600 font-medium">รหัสสลิปอ้างอิง:</span>
          <span class="font-mono text-[11px] font-bold text-slate-700">${escapeHtml(booking.slipQrRef.slice(0, 22))}</span>
        </div>
      ` : ''}
      <div class="flex justify-between">
        <span class="text-slate-600 font-medium">กำหนดการ:</span>
        <span class="font-bold text-slate-800">
          ${isLantern ? 'ลงทะเบียน 18.00 น. / ปล่อยโคม 20.00 น.' : 'เวลา 18.00 - 20.00 น.'}
        </span>
      </div>
    </div>

    ${isLantern ? `
      <div class="p-2.5 rounded-xl bg-amber-100 border border-amber-400 text-[11px] font-bold text-amber-900 text-center">
        สิ่งที่ได้รับ: โคมลอยไซส์ XL • ไฟแช็ค • เทียน • ปากกา • เครื่องดื่ม • ของที่ระลึก
      </div>
    ` : ''}

    <div class="pt-2 flex flex-col items-center">
      <canvas id="modalETicketQrCanvas" class="rounded-xl border border-slate-300 shadow-sm"></canvas>
      <span class="text-[11px] text-slate-500 mt-1">ยื่นรหัสหรือ QR นี้ที่จุดลงทะเบียน ณ โฮงชาฮักมี เวลา 18.00 น.</span>
      <span class="text-[10px] text-slate-400 mt-0.5">Developed by S.Y. Interactive Development Limited</span>
    </div>
  `;

  const qrCanvas = document.getElementById('modalETicketQrCanvas');
  drawTicketMatrixCode(qrCanvas, `${booking.id}|${booking.phone}|${booking.eventDate}`);

  const dlBtn = document.getElementById('eTicketDownloadBtn');
  dlBtn.onclick = () => downloadETicketAsPng(booking);

  const modal = document.getElementById('eTicketModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeETicketModal() {
  const modal = document.getElementById('eTicketModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

/**
 * ค้นหาบัตรของลูกค้าด้วยเบอร์โทรศัพท์หรือรหัสจอง (แท็บค้นหาบัตร)
 */
async function handleCustomerTicketLookup(event) {
  event.preventDefault();
  const q = document.getElementById('lookupSearchInput').value.trim();
  const container = document.getElementById('lookupResultsContainer');
  container.innerHTML = `<div class="text-center text-sm text-amber-300 py-4">⏳ กำลังค้นหาข้อมูลบัตร...</div>`;

  const matches = await findBookingsByQuery(q);
  if (!matches || matches.length === 0) {
    container.innerHTML = `
      <div class="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 text-center space-y-1">
        <div class="text-base font-bold text-amber-300">ไม่พบข้อมูลบัตรที่ตรงกับ "${escapeHtml(q)}"</div>
        <div class="text-xs text-slate-400">กรุณาตรวจสอบเบอร์โทรศัพท์ที่ใช้จอง หรือติดต่อ 081-669-6653 (คุณฝ้าย)</div>
      </div>
    `;
    return;
  }

  container.innerHTML = matches.map(b => {
    const isLantern = b.category === 'lantern';
    const statusText = b.checkedIn
      ? '🏮 เช็คอินรับโคมแล้ว'
      : b.paymentStatus === 'approved'
        ? '✅ อนุมัติสลิปแล้ว'
        : b.paymentStatus === 'rejected'
          ? '❌ ยกเลิก'
          : '⏳ รอตรวจสลิป (ใช้ยื่นหน้างานได้)';
    return `
      <div class="p-4 rounded-2xl bg-slate-800/90 border border-amber-500/35 flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-base font-extrabold text-amber-400 font-mono">${b.id}</span>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-200 border border-amber-500/30 font-bold">${statusText}</span>
          </div>
          <div class="text-sm font-bold text-white">
            ${escapeHtml(b.customerName)} (${escapeHtml(b.phone)})
          </div>
          <div class="text-xs text-slate-300">
            ${isLantern ? '🏮 โคมลอย' : '🎈 มินิบอลลูน'} • ${DATE_THAI_LABELS[b.eventDate] || b.eventDate} •
            ${b.quantity} ${isLantern ? 'โคม' : 'ใบ'} (${b.attendees} ท่าน) • ยอด ${Number(b.totalAmount).toLocaleString()} บาท
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="openTicketById('${b.id}')"
            class="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow">
            🎫 เปิดดูบัตร / ดาวน์โหลด PNG
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openTicketById(id) {
  const b = APP_STATE.bookings.find(item => item.id === id) || getLocalBookingsCache().find(item => item.id === id);
  if (b) showETicketModal(b);
}

/* ============================================================================
 * ระบบหลังบ้านแอดมินครบ 8 โมดูล (ADMIN BACKOFFICE & REPORTING)
 * ============================================================================ */

function isAdminLoggedIn() {
  return sessionStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'authenticated';
}

function clearAdminLoginFields() {
  const userEl = document.getElementById('adminUsernameInput');
  const passEl = document.getElementById('adminPasswordInput');
  if (userEl) userEl.value = '';
  if (passEl) passEl.value = '';
}

function handleAdminNavClick() {
  if (isAdminLoggedIn()) {
    switchMainTab('admin');
  } else {
    const modal = document.getElementById('adminLoginModal');
    document.getElementById('adminLoginError').classList.add('hidden');
    clearAdminLoginFields();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    window.setTimeout(clearAdminLoginFields, 80);
    window.setTimeout(clearAdminLoginFields, 400);
  }
}

function closeAdminLoginModal() {
  const modal = document.getElementById('adminLoginModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function submitAdminLogin(event) {
  event.preventDefault();
  const form = event.target;
  const userEl = document.getElementById('adminUsernameInput');
  const passEl = document.getElementById('adminPasswordInput');
  const err = document.getElementById('adminLoginError');
  const submitBtn = form.querySelector('button[type="submit"]');
  const user = userEl.value.trim();
  const pass = passEl.value.trim();

  err.classList.add('hidden');
  if (!user || !pass) {
    err.textContent = 'กรอกชื่อผู้ใช้และรหัสผ่าน';
    err.classList.remove('hidden');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  try {
    const ok = await verifyAdminLogin(user, pass);
    if (ok) {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'authenticated');
      clearAdminLoginFields();
      closeAdminLoginModal();
      switchMainTab('admin');
      return;
    }
    err.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    err.classList.remove('hidden');
    passEl.value = '';
    passEl.focus();
  } catch (loginErr) {
    err.textContent = 'ตรวจสอบกับฐานข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง';
    err.classList.remove('hidden');
    console.warn('Admin login check failed:', loginErr.message);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function adminLogout() {
  sessionStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
  switchMainTab('balloon');
}

async function refreshAdminPortal() {
  await syncAllDataFromCloud();
  renderAdminKpiAndInventory();
  renderAdminBookingsTable();
}

/**
 * โมดูลที่ 2: แสดง KPI Cards 6 การ์ดหลัก + ตารางคำนวณสิ่งของที่สตาฟต้องจัดเตรียมหน้างาน
 */
function renderAdminKpiAndInventory() {
  const balloonBookings = APP_STATE.bookings.filter(b => b.category === 'balloon' && b.paymentStatus !== 'rejected');

  const approvedRevenue = balloonBookings
    .filter(b => b.paymentStatus === 'approved')
    .reduce((s, b) => s + Number(b.totalAmount || 0), 0);
  const pendingRevenue = balloonBookings
    .filter(b => b.paymentStatus === 'pending')
    .reduce((s, b) => s + Number(b.totalAmount || 0), 0);

  const b20 = balloonBookings.filter(b => b.eventDate === '2026-11-20');
  const b20Qty = b20.reduce((s, b) => s + Number(b.quantity || 0), 0);
  const b20Rev = b20.reduce((s, b) => s + Number(b.totalAmount || 0), 0);

  const b21 = balloonBookings.filter(b => b.eventDate === '2026-11-21');
  const b21Qty = b21.reduce((s, b) => s + Number(b.quantity || 0), 0);
  const b21Rev = b21.reduce((s, b) => s + Number(b.totalAmount || 0), 0);

  const checkedInCount = balloonBookings.filter(b => b.checkedIn).length;
  const waitingCheckinCount = balloonBookings.filter(b => !b.checkedIn).length;
  const balloonTickets = b20Qty + b21Qty;
  const balloonRevenue = b20Rev + b21Rev;

  const kpiGrid = document.getElementById('adminKpiGrid');
  if (kpiGrid) {
    kpiGrid.innerHTML = `
      <div class="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 space-y-1">
        <div class="text-xs font-bold text-amber-300">💰 รายได้บัตรชมมินิบอลลูน</div>
        <div class="text-2xl font-extrabold text-white">${balloonRevenue.toLocaleString()} บาท</div>
        <div class="text-[11px] text-slate-400">
          อนุมัติแล้ว: <strong class="text-emerald-400">${approvedRevenue.toLocaleString()}฿</strong> •
          รอตรวจสลิป: <strong class="text-amber-300">${pendingRevenue.toLocaleString()}฿</strong>
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
        <div class="text-xs font-bold text-emerald-400">🎈 บัตรมินิบอลลูน ศุกร์ 20 พ.ย. 2569</div>
        <div class="text-xl font-extrabold text-white">${b20Qty.toLocaleString()} ใบ / ท่าน</div>
        <div class="text-[11px] text-slate-400">
          ยอดเงินรวม (ออนไลน์+ตั๋วรถหน้างาน): <strong class="text-emerald-300">${b20Rev.toLocaleString()}฿</strong>
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
        <div class="text-xs font-bold text-emerald-400">🎈 บัตรมินิบอลลูน เสาร์ 21 พ.ย. 2569</div>
        <div class="text-xl font-extrabold text-white">${b21Qty.toLocaleString()} ใบ / ท่าน</div>
        <div class="text-[11px] text-slate-400">
          ยอดเงินรวม (ออนไลน์+ตั๋วรถหน้างาน): <strong class="text-emerald-300">${b21Rev.toLocaleString()}฿</strong>
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
        <div class="text-xs font-bold text-blue-400">✅ สถานะเช็คอินหน้างาน 18.00 น.</div>
        <div class="text-xl font-extrabold text-white">เช็คอินแล้ว ${checkedInCount} รายการ</div>
        <div class="text-[11px] text-slate-400">
          รอเช็คอิน: <strong class="text-amber-300">${waitingCheckinCount} รายการ</strong>
        </div>
      </div>
    `;
  }

  const invWrap = document.getElementById('adminInventoryTableWrap');
  if (invWrap) {
    invWrap.innerHTML = `
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-slate-800 text-slate-400">
            <th class="py-2 px-2">รายการ</th>
            <th class="py-2 px-2 text-center">ศุกร์ 20 พ.ย. 69</th>
            <th class="py-2 px-2 text-center">เสาร์ 21 พ.ย. 69</th>
            <th class="py-2 px-2 text-right text-emerald-300">รวม</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60 text-slate-200">
          <tr>
            <td class="py-2 px-2 font-semibold">บัตรชมมินิบอลลูน (ใบ)</td>
            <td class="py-2 px-2 text-center font-bold">${b20Qty.toLocaleString()} ใบ</td>
            <td class="py-2 px-2 text-center font-bold">${b21Qty.toLocaleString()} ใบ</td>
            <td class="py-2 px-2 text-right font-extrabold text-emerald-400">${balloonTickets.toLocaleString()} ใบ</td>
          </tr>
          <tr>
            <td class="py-2 px-2 font-semibold">ยอดเงิน (100 บาท/ท่าน)</td>
            <td class="py-2 px-2 text-center font-bold">${b20Rev.toLocaleString()}฿</td>
            <td class="py-2 px-2 text-center font-bold">${b21Rev.toLocaleString()}฿</td>
            <td class="py-2 px-2 text-right font-extrabold text-amber-300">${balloonRevenue.toLocaleString()}฿</td>
          </tr>
          <tr>
            <td class="py-2 px-2 font-semibold">เวลา / สถานที่</td>
            <td class="py-2 px-2 text-center" colspan="3">18.00–20.00 น. · ณ โฮงชาฮักมี ต.แม่ปั๋ง อ.พร้าว จ.เชียงใหม่</td>
          </tr>
        </tbody>
      </table>
    `;
  }
}

/**
 * โมดูลที่ 3: ตารางรายการจอง ตรวจสลิป เช็คอิน และแก้ไขใบจอง
 */
function getFilteredAdminBookings() {
  const catDateFilter = document.getElementById('adminFilterCategoryDate')?.value || 'all';
  const statusFilter = document.getElementById('adminFilterStatus')?.value || 'all';
  const searchStr = (document.getElementById('adminSearchInput')?.value || '').trim().toLowerCase();

  return APP_STATE.bookings.filter(b => {
    if (b.category !== 'balloon') return false;
    if (catDateFilter !== 'all') {
      const [cat, dt] = catDateFilter.split('_');
      if (b.category !== cat || b.eventDate !== dt) return false;
    }
    if (statusFilter === 'pending' && b.paymentStatus !== 'pending') return false;
    if (statusFilter === 'approved' && b.paymentStatus !== 'approved') return false;
    if (statusFilter === 'rejected' && b.paymentStatus !== 'rejected') return false;
    if (statusFilter === 'checkedin' && !b.checkedIn) return false;
    if (statusFilter === 'not_checkedin' && b.checkedIn) return false;

    if (searchStr) {
      const hay = `${b.id} ${b.customerName} ${b.phone} ${b.slipQrRef || ''} ${b.note || ''}`.toLowerCase();
      if (!hay.includes(searchStr)) return false;
    }
    return true;
  });
}

function renderAdminBookingsTable() {
  const tbody = document.getElementById('adminBookingsTableBody');
  if (!tbody) return;
  const rows = getFilteredAdminBookings();

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="py-8 text-center text-slate-400">
          ยังไม่มีรายการจองที่ตรงกับตัวกรอง (สามารถกดปุ่ม "➕ บันทึกขายหน้างาน" หรือทดสอบจองจากหน้าลูกค้าได้ทันที)
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map(b => {
    const isLantern = b.category === 'lantern';
    const statusPill = b.paymentStatus === 'approved'
      ? `<span class="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">✅ อนุมัติแล้ว</span>`
      : b.paymentStatus === 'rejected'
        ? `<span class="px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold">❌ ยกเลิก</span>`
        : `<span class="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">⏳ รอตรวจสลิป</span>`;

    const qrBadge = b.slipQrRef && b.slipQrRef.startsWith('QR-')
      ? `<div class="text-[10px] text-emerald-400 font-mono mt-0.5" title="${escapeHtml(b.slipQrRef)}">🛡️ QR: ${escapeHtml(b.slipQrRef.slice(3, 15))}..</div>`
      : '';

    const slipBtn = b.slipDataUrl
      ? `<div>
           <button onclick="openSlipInspectorModal('${b.id}')" class="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold">🔍 ดูสลิป</button>
           ${qrBadge}
         </div>`
      : `<span class="text-slate-500">${b.channel === 'walkin' ? 'ขายหน้างาน' : 'ไม่มีรูป'}</span>`;

    const checkinBtn = b.checkedIn
      ? `<button onclick="adminToggleCheckin('${b.id}')" class="px-2.5 py-1.5 rounded-lg bg-blue-600/30 text-blue-200 border border-blue-500/40 font-bold" title="คลิกเพื่อยกเลิกสถานะเช็คอิน">🏮 รับของแล้ว</button>`
      : `<button onclick="adminToggleCheckin('${b.id}')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border border-slate-700 font-bold transition">กดเช็คอิน</button>`;

    return `
      <tr class="hover:bg-slate-800/50 transition">
        <td class="py-3 px-2.5 font-mono font-extrabold text-amber-400" data-label="รหัสจอง">${b.id}</td>
        <td class="py-3 px-2.5" data-label="วันงาน">
          <div class="font-bold text-white">${isLantern ? '🏮 โคมลอย' : '🎈 มินิบอลลูน'}</div>
          <div class="text-[11px] text-slate-400">${DATE_THAI_LABELS[b.eventDate] || b.eventDate}</div>
        </td>
        <td class="py-3 px-2.5" data-label="ลูกค้า">
          <div class="font-bold text-white">${escapeHtml(b.customerName)}</div>
          <div class="text-[11px] text-slate-400">${escapeHtml(b.phone)} ${b.note ? `• ${escapeHtml(b.note)}` : ''}</div>
        </td>
        <td class="py-3 px-2.5 font-bold text-slate-200" data-label="จำนวน">
          ${b.quantity} ${isLantern ? 'โคม' : 'ใบ'} <span class="text-slate-400 font-normal">(${b.attendees} ท่าน)</span>
        </td>
        <td class="py-3 px-2.5 font-extrabold text-emerald-400" data-label="ยอดเงิน">${Number(b.totalAmount).toLocaleString()}฿</td>
        <td class="py-3 px-2.5" data-label="สลิป">${slipBtn}</td>
        <td class="py-3 px-2.5" data-label="สถานะ">${statusPill}</td>
        <td class="py-3 px-2.5" data-label="เช็คอิน">${checkinBtn}</td>
        <td class="py-3 px-2.5 text-right booking-actions">
          ${b.paymentStatus !== 'approved' ? `
            <button onclick="adminChangeSlipStatus('${b.id}', 'approved')" class="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold" title="อนุมัติสลิป">✓ อนุมัติ</button>
          ` : ''}
          <button onclick="openTicketById('${b.id}')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold" title="เปิดบัตร E-Ticket">🎫 บัตร</button>
          <button onclick="openEditBookingModal('${b.id}')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold" title="แก้ไขข้อมูล">✏️</button>
          <button onclick="adminDeleteBooking('${b.id}')" class="px-2 py-1 rounded bg-red-950/80 hover:bg-red-800 text-red-300 border border-red-800/50 font-bold" title="ลบรายการ">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * หน้าต่างตรวจสอบรูปสลิปโอนเงินขนาดใหญ่ (Slip Inspector Modal)
 */
function openSlipInspectorModal(bookingId) {
  const b = APP_STATE.bookings.find(item => item.id === bookingId);
  if (!b) return;
  const content = document.getElementById('slipInspectorContent');

  const qrInfoHtml = b.slipQrRef
    ? b.slipQrRef.startsWith('QR-')
      ? `<div class="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-between">
           <span>🛡️ สแกน QR สลิปธนาคารแล้ว (ไม่ซ้ำกับใบจองอื่น)</span>
           <span class="font-mono text-amber-300">${escapeHtml(b.slipQrRef)}</span>
         </div>`
      : `<div class="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-between">
           <span>ℹ️ ลายนิ้วมือไฟล์ภาพ (ไม่ซ้ำ):</span>
           <span class="font-mono text-amber-300">${escapeHtml(b.slipQrRef)}</span>
         </div>`
    : '';

  content.innerHTML = `
    <div class="p-3 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div class="font-extrabold text-white text-sm">${escapeHtml(b.customerName)} (${escapeHtml(b.phone)})</div>
        <div class="text-slate-400">รหัส: <strong class="text-amber-300">${b.id}</strong> • ${DATE_THAI_LABELS[b.eventDate] || b.eventDate}</div>
      </div>
      <div class="text-right">
        <div class="text-xs text-slate-400">ยอดที่ต้องโอน · พร้อมเพย์ 0647328284</div>
        <div class="text-lg font-extrabold text-emerald-400">${Number(b.totalAmount).toLocaleString()} บาท</div>
        <div class="text-[11px] text-slate-400">น.ส.กนกพิชญ์ ชัยชมภู</div>
      </div>
    </div>

    ${qrInfoHtml}

    <div class="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-100 space-y-1.5">
      <div class="font-extrabold text-amber-300">เช็กลิสต์เทียบสลิป (แอดมิน)</div>
      <label class="flex items-start gap-2"><input type="checkbox" class="mt-0.5" /> ผู้รับเป็น <strong>น.ส.กนกพิชญ์ ชัยชมภู</strong> / พร้อมเพย์ <strong>0647328284</strong></label>
      <label class="flex items-start gap-2"><input type="checkbox" class="mt-0.5" /> ยอดเงินบนสลิปตรง <strong>${Number(b.totalAmount).toLocaleString()} บาท</strong></label>
      <label class="flex items-start gap-2"><input type="checkbox" class="mt-0.5" /> วันเวลาโอนสมเหตุสมผล และสลิปไม่ถูกครอปจนอ่านไม่ได้</label>
      <p class="text-[11px] text-amber-200/80 pt-1">ระบบใช้ QR สลิป + กันสลิปซ้ำอัตโนมัติแล้ว — ขั้นอนุมัติยอดยังเป็นสายตาแอดมิน (ไม่พึ่ง OCR เป็นหลัก)</p>
    </div>

    <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center">
      ${b.slipDataUrl
        ? `<img src="${b.slipDataUrl}" alt="สลิปโอนเงิน" class="max-h-96 mx-auto rounded-xl object-contain" />`
        : `<div class="py-12 text-slate-500">ไม่มีรูปสลิปแนบ</div>`
      }
    </div>

    <div class="grid grid-cols-3 gap-2 pt-2">
      <button onclick="adminChangeSlipStatus('${b.id}', 'approved', true)"
        class="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs">
        อนุมัติสลิปถูกต้อง
      </button>
      <button onclick="adminChangeSlipStatus('${b.id}', 'pending', true)"
        class="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs">
        รอตรวจสอบ
      </button>
      <button onclick="adminChangeSlipStatus('${b.id}', 'rejected', true)"
        class="py-2.5 px-3 rounded-xl bg-red-600/25 hover:bg-red-600/40 text-red-300 border border-red-500/40 font-bold text-xs">
        ปฏิเสธ/ยกเลิก
      </button>
    </div>
  `;

  const modal = document.getElementById('slipInspectorModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeSlipInspectorModal() {
  const modal = document.getElementById('slipInspectorModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function adminChangeSlipStatus(bookingId, newStatus, closeModal = false) {
  await updateBookingRecord(bookingId, { paymentStatus: newStatus });
  if (closeModal) closeSlipInspectorModal();
  await refreshAdminPortal();
}

/**
 * โมดูลที่ 4: ระบบเช็คอินหน้างาน 18.00 น. พร้อมระบบแจ้งเตือนป้องกันการรับโคมซ้ำ
 */
function performQuickCheckinSearch() {
  const q = (document.getElementById('quickCheckinInput')?.value || '').trim().toLowerCase();
  const box = document.getElementById('quickCheckinResultBox');
  if (!q) {
    box.innerHTML = '';
    return;
  }

  const matches = APP_STATE.bookings.filter(b =>
    b.id.toLowerCase().includes(q) ||
    b.phone.includes(q) ||
    b.customerName.toLowerCase().includes(q)
  );

  if (matches.length === 0) {
    box.innerHTML = `<div class="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-xs text-red-200 font-bold">ไม่พบรหัสจองหรือเบอร์โทรนี้</div>`;
    return;
  }

  box.innerHTML = matches.slice(0, 3).map(b => {
    const isLantern = b.category === 'lantern';
    if (b.checkedIn) {
      const timeStr = b.checkedInAt ? new Date(b.checkedInAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';
      return `
        <div class="p-3.5 rounded-2xl bg-red-950/90 border-2 border-red-500 space-y-1">
          <div class="text-xs font-extrabold text-red-300">⚠️ แจ้งเตือน: รหัส ${b.id} รับโคม/เช็คอินไปแล้ว! ${timeStr ? `(เวลา ${timeStr} น.)` : ''}</div>
          <div class="text-xs text-white font-bold">${escapeHtml(b.customerName)} (${escapeHtml(b.phone)}) • ${b.quantity} ${isLantern ? 'โคม' : 'ใบ'}</div>
        </div>
      `;
    }
    return `
      <div class="p-3.5 rounded-2xl bg-slate-800 border border-emerald-500/40 flex items-center justify-between gap-2">
        <div class="text-xs">
          <div class="font-extrabold text-amber-400">${b.id} • ${escapeHtml(b.customerName)}</div>
          <div class="text-slate-300">${DATE_THAI_LABELS[b.eventDate] || b.eventDate} • ส่งมอบ <strong class="text-white">${b.quantity} ${isLantern ? 'โคม' : 'ใบ'} (${b.attendees} ท่าน)</strong></div>
        </div>
        <button onclick="adminToggleCheckin('${b.id}')"
          class="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow">
          🏮 ยืนยันเช็คอินรับโคม
        </button>
      </div>
    `;
  }).join('');
}

async function adminToggleCheckin(bookingId) {
  const b = APP_STATE.bookings.find(item => item.id === bookingId);
  if (!b) return;
  const nextChecked = !b.checkedIn;
  await updateBookingRecord(bookingId, {
    checkedIn: nextChecked,
    checkedInAt: nextChecked ? new Date().toISOString() : null,
    paymentStatus: nextChecked ? 'approved' : b.paymentStatus
  });
  await refreshAdminPortal();
  if (document.getElementById('quickCheckinInput')?.value) {
    performQuickCheckinSearch();
  }
}

/**
 * แก้ไขข้อมูลการจองของลูกค้า (Edit Booking Modal)
 */
function openEditBookingModal(bookingId) {
  const b = APP_STATE.bookings.find(item => item.id === bookingId);
  if (!b) return;
  document.getElementById('editBookingId').value = b.id;
  document.getElementById('editCustomerName').value = b.customerName;
  document.getElementById('editCustomerPhone').value = b.phone;
  document.getElementById('editEventDate').value = b.eventDate;
  document.getElementById('editQuantity').value = b.quantity;
  document.getElementById('editNote').value = b.note || '';

  const modal = document.getElementById('editBookingModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeEditBookingModal() {
  const modal = document.getElementById('editBookingModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function submitEditBookingForm(event) {
  event.preventDefault();
  const id = document.getElementById('editBookingId').value;
  const customerName = document.getElementById('editCustomerName').value.trim();
  const phone = document.getElementById('editCustomerPhone').value.trim();
  const eventDate = document.getElementById('editEventDate').value;
  const quantity = Math.max(1, parseInt(document.getElementById('editQuantity').value, 10) || 1);
  const note = document.getElementById('editNote').value.trim();
  const category = 'balloon';

  await updateBookingRecord(id, {
    category,
    eventDate,
    customerName,
    phone,
    quantity,
    note
  });
  closeEditBookingModal();
  await refreshAdminPortal();
}

async function adminDeleteBooking(bookingId) {
  await deleteBookingRecord(bookingId);
  await refreshAdminPortal();
}

/**
 * โมดูลที่ 5: บันทึกยอดขายหน้างาน (Walk-in & ขายตั๋วรถมินิบอลลูน POS)
 */
function openWalkinPosModal() {
  updateWalkinPosCalc();
  const modal = document.getElementById('walkinPosModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeWalkinPosModal() {
  const modal = document.getElementById('walkinPosModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function updateWalkinPosCalc() {
  const val = document.getElementById('walkinCategoryDate').value;
  const [cat] = val.split('|');
  const qty = Math.max(1, parseInt(document.getElementById('walkinQty').value, 10) || 1);
  const total = qty * (cat === 'lantern' ? 299 : 100);
  document.getElementById('walkinCalcTotal').textContent = `${total.toLocaleString()} บาท`;
}

async function submitWalkinPosForm(event) {
  event.preventDefault();
  const [category, eventDate] = document.getElementById('walkinCategoryDate').value.split('|');
  const quantity = Math.max(1, parseInt(document.getElementById('walkinQty').value, 10) || 1);
  const paymentMethod = document.getElementById('walkinPayMethod').value;
  const title = document.getElementById('walkinTitle').value.trim();

  await createBookingRecord({
    category,
    eventDate,
    customerName: title,
    phone: '0816696653',
    quantity,
    paymentMethod,
    paymentStatus: 'approved',
    checkedIn: true,
    checkedInAt: new Date().toISOString(),
    channel: 'walkin',
    note: 'บันทึกยอดขายหน้างานโดย Admin'
  });

  closeWalkinPosModal();
  await refreshAdminPortal();
}

/**
 * โมดูลที่ 7: ส่งออกไฟล์ Excel (CSV รองรับภาษาไทย UTF-8 BOM) & พิมพ์ใบลงทะเบียนหน้างาน A4
 */
function exportBookingsToCsv() {
  // เฉพาะบัตรมินิบอลลูน (getFilteredAdminBookings กรอง category แล้ว)
  const rows = getFilteredAdminBookings();
  const headers = [
    'รหัสจอง',
    'ประเภทกิจกรรม',
    'วันที่เข้าร่วม',
    'ชื่อลูกค้า',
    'เบอร์โทรศัพท์',
    'จำนวน(โคม/ใบ)',
    'จำนวนผู้เข้าร่วม(ท่าน)',
    'ยอดชำระ(บาท)',
    'รหัสสลิปQRอ้างอิง',
    'ช่องทาง',
    'สถานะสลิป',
    'สถานะเช็คอินหน้างาน',
    'หมายเหตุ',
    'เวลาทำรายการ'
  ];

  const csvLines = [
    headers.join(','),
    ...rows.map(b => [
      `"${b.id}"`,
      `"${b.category === 'lantern' ? 'โคมลอย 299฿' : 'มินิบอลลูน 100฿'}"`,
      `"${DATE_THAI_LABELS[b.eventDate] || b.eventDate}"`,
      `"${String(b.customerName || '').replace(/"/g, '""')}"`,
      `"=""${b.phone}"""`,
      b.quantity,
      b.attendees,
      b.totalAmount,
      `"${String(b.slipQrRef || '').replace(/"/g, '""')}"`,
      `"${b.channel === 'walkin' ? 'ขายหน้างาน' : 'จองออนไลน์'}"`,
      `"${b.paymentStatus}"`,
      `"${b.checkedIn ? 'รับของแล้ว' : 'ยังไม่รับ'}"`,
      `"${String(b.note || '').replace(/"/g, '""')}"`,
      `"${b.createdAt}"`
    ].join(','))
  ];

  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Phrao-Festival-2569-Report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * พิมพ์ใบรายชื่อผู้จองสำหรับวางโต๊ะลงทะเบียนเวลา 18.00 น.
 */
function printRegistrationCheckinSheet() {
  const rows = getFilteredAdminBookings();
  const printArea = document.getElementById('printableAdminReportArea');

  printArea.innerHTML = `
    <div style="font-family: 'Sarabun', 'Prompt', sans-serif; color: #000;">
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
        <h1 style="font-size: 18px; font-weight: bold; margin: 0;">ใบเช็คอินบัตรชมมินิบอลลูน — เทศกาลท่องเที่ยวเมืองพร้าว 2569</h1>
        <p style="font-size: 12px; margin: 4px 0 0 0;">ณ โฮงชาฮักมี ต.แม่ปั๋ง อ.พร้าว จ.เชียงใหม่ • วันที่ 20–21 พฤศจิกายน 2569 • เวลา 18.00–20.00 น. • คนละ 100 บาท</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #000; padding: 6px;">ลำดับ</th>
            <th style="border: 1px solid #000; padding: 6px;">รหัสจอง</th>
            <th style="border: 1px solid #000; padding: 6px;">วันที่</th>
            <th style="border: 1px solid #000; padding: 6px;">ชื่อผู้จอง</th>
            <th style="border: 1px solid #000; padding: 6px;">เบอร์โทรศัพท์</th>
            <th style="border: 1px solid #000; padding: 6px;">จำนวนที่ได้รับ</th>
            <th style="border: 1px solid #000; padding: 6px;">ยอดเงิน</th>
            <th style="border: 1px solid #000; padding: 6px; width: 130px;">ลายมือชื่อเช็คอิน (18.00 น.)</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((b, idx) => `
            <tr>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">${idx + 1}</td>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${b.id}</td>
              <td style="border: 1px solid #000; padding: 6px;">${DATE_THAI_LABELS[b.eventDate] || b.eventDate}</td>
              <td style="border: 1px solid #000; padding: 6px;">${escapeHtml(b.customerName)}</td>
              <td style="border: 1px solid #000; padding: 6px;">${escapeHtml(b.phone)}</td>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">
                ${b.quantity} ${b.category === 'lantern' ? 'โคม' : 'ใบ'} (${b.attendees} ท่าน)
              </td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${Number(b.totalAmount).toLocaleString()}฿</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">${b.checkedIn ? '✓ รับแล้ว' : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 16px; display: flex; justify-content: space-between; font-size: 10px; color: #475569;">
        <span>จำนวนรายการทั้งหมด: ${rows.length} รายการ</span>
        <span>ผู้พัฒนาระบบ: S.Y. Interactive Development Limited</span>
      </div>
    </div>
  `;

  window.print();
}

/**
 * พิมพ์ใบสรุปรายงานผู้บริหาร (A4 Executive Summary Report)
 */
function printExecutiveSummarySheet() {
  const active = APP_STATE.bookings.filter(b => b.category === 'balloon' && b.paymentStatus !== 'rejected');
  const totalRev = active.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
  const printArea = document.getElementById('printableAdminReportArea');

  const summaryByGroup = [
    { label: 'บัตรชมมินิบอลลูน ศุกร์ที่ 20 พ.ย. 2569 (100฿/ท่าน)', cat: 'balloon', dt: '2026-11-20', unit: 'ใบ' },
    { label: 'บัตรชมมินิบอลลูน เสาร์ที่ 21 พ.ย. 2569 (100฿/ท่าน)', cat: 'balloon', dt: '2026-11-21', unit: 'ใบ' }
  ];

  printArea.innerHTML = `
    <div style="font-family: 'Sarabun', 'Prompt', sans-serif; color: #000;">
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px;">
        <h1 style="font-size: 20px; font-weight: bold; margin: 0;">รายงานสรุปยอดจำหน่ายบัตรชมมินิบอลลูน</h1>
        <p style="font-size: 13px; margin: 4px 0 0 0;">เทศกาลท่องเที่ยวเมืองพร้าว 2569 • ณ โฮงชาฮักมี ต.แม่ปั๋ง อ.พร้าว จ.เชียงใหม่ • 20–21 พ.ย. 2569 เวลา 18.00–20.00 น.</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">กิจกรรมและวันที่</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">จำนวนบัตร</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">จำนวนผู้เข้าชม (ท่าน)</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: right;">ยอดรายได้รวม (บาท)</th>
          </tr>
        </thead>
        <tbody>
          ${summaryByGroup.map(g => {
            const list = active.filter(b => b.category === g.cat && b.eventDate === g.dt);
            const qty = list.reduce((s, b) => s + Number(b.quantity || 0), 0);
            const att = list.reduce((s, b) => s + Number(b.attendees || 0), 0);
            const rev = list.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
            return `
              <tr>
                <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">${g.label}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${qty.toLocaleString()} ${g.unit}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${att.toLocaleString()} ท่าน</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${rev.toLocaleString()} บาท</td>
              </tr>
            `;
          }).join('')}
          <tr style="background: #fef3c7; font-weight: bold; font-size: 14px;">
            <td colspan="3" style="border: 1px solid #000; padding: 10px; text-align: right;">รวมรายได้บัตรชมมินิบอลลูน</td>
            <td style="border: 1px solid #000; padding: 10px; text-align: right;">${totalRev.toLocaleString()} บาท</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 24px; display: flex; justify-content: space-between; font-size: 11px;">
        <span>วันที่พิมพ์รายงาน: ${new Date().toLocaleString('th-TH')}</span>
        <span>ผู้พัฒนาระบบ: S.Y. Interactive Development Limited</span>
      </div>
    </div>
  `;

  window.print();
}

/**
 * โมดูลที่ 8: ตั้งค่าโควตา เปิด-ปิดรับจอง และสำรองข้อมูล JSON
 */
function openAdminSettingsModal() {
  document.getElementById('settingNewAdminPass').value = '';
  const modal = document.getElementById('adminSettingsModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeAdminSettingsModal() {
  const modal = document.getElementById('adminSettingsModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function submitAdminSettings(event) {
  event.preventDefault();
  const nextSettings = { ...APP_STATE.settings };

  const newPass = document.getElementById('settingNewAdminPass').value.trim();
  if (newPass) {
    try {
      await saveAdminPassword(newPass);
    } catch (err) {
      console.warn('Admin password cloud save failed:', err.message);
      window.alert('บันทึกรหัสผ่านขึ้นคลาวด์ไม่สำเร็จ ทุกเครื่องจะยังใช้รหัสเดิมอยู่ กรุณาลองอีกครั้ง');
      return;
    }
  }

  APP_STATE.settings = await saveFestivalSettings(nextSettings);
  renderAdminKpiAndInventory();
  closeAdminSettingsModal();
}

function downloadJsonBackup() {
  const backupData = {
    exportedAt: new Date().toISOString(),
    developer: 'S.Y. Interactive Development Limited',
    settings: APP_STATE.settings,
    bookings: APP_STATE.bookings
  };
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Phrao-Festival-Backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
