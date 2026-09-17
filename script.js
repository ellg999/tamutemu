// State & Database Simulasi
let currentView = 'form'; // form | photo | success | admin
let draftForm = {};
let draftPhoto = null;
let cameraStream = null;

// Password Admin: admin123
const ADMIN_PIN = '1234';

// Simulasi Data (Beberapa sudah di-acc agar masuk ke kalender)
let appointments = [
  { id: '1', name: 'Budi Santoso', date: todayStr(), time: '09:00', reason: 'Rapat komite sekolah', photo: null, status: 'approved' },
  { id: '2', name: 'Ibu Ratna', date: todayStr(), time: '13:30', reason: 'Konsultasi masalah siswa', photo: null, status: 'approved' },
  { id: '3', name: 'Anton', date: tomorrowStr(), time: '10:00', reason: 'Pengajuan proposal pensi', photo: null, status: 'pending' }
];

function todayStr() { return new Date().toISOString().slice(0,10); }
function tomorrowStr() { 
  let d = new Date(); d.setDate(d.getDate() + 1); 
  return d.toISOString().slice(0,10); 
}

// Generate Pilihan Jam 24 Jam (07:00 - 16:30)
function getTimeOptions() {
  let opts = '';
  for(let h=7; h<=16; h++){
    let hh = h.toString().padStart(2,'0');
    opts += `<option value="${hh}:00">${hh}:00</option>`;
    opts += `<option value="${hh}:30">${hh}:30</option>`;
  }
  return opts;
}

// --- RENDER ENGINE ---
function render() {
  const container = document.getElementById('appContainer');
  const btnAdmin = document.getElementById('btnAdminSwitch');
  
  // Sembunyikan tombol admin jika sedang di dasbor admin
  btnAdmin.style.display = (currentView === 'admin') ? 'none' : 'block';
  container.className = (currentView === 'admin') ? 'admin-container' : '';

  if (currentView === 'form') container.innerHTML = viewForm();
  else if (currentView === 'photo') container.innerHTML = viewPhoto();
  else if (currentView === 'success') container.innerHTML = viewSuccess();
  else if (currentView === 'admin') container.innerHTML = viewAdmin();

  wireEvents();
}

// --- VIEWS ---
function viewForm() {
  return `
    <div class="glass-card">
      <h2>Janji Temu</h2>
      
      <div class="form-group">
        <label>Nama Lengkap</label>
        <input type="text" id="v_name" placeholder="Masukkan nama Anda..." required>
      </div>
      
      <div style="display:flex; gap:12px;">
        <div class="form-group" style="flex:1;">
          <label>Tanggal</label>
          <input type="date" id="v_date" value="${todayStr()}">
        </div>
        <div class="form-group" style="flex:1;">
          <label>Waktu (WIB)</label>
          <div style="display:flex; align-items:center; gap:8px;">
            <select id="v_time" style="flex:1;">${getTimeOptions()}</select>
            <span style="font-size:12px; color:var(--text-soft);">WIB</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>Alasan Bertemu</label>
        <textarea id="v_reason" rows="3" placeholder="Jelaskan secara singkat..."></textarea>
      </div>

      <button class="btn btn-primary" id="btnToPhoto">Lanjut Ambil Foto &rarr;</button>
    </div>
  `;
}

function viewPhoto() {
  return `
    <div class="glass-card">
      <h2>Identitas Visual</h2>
      <p class="subtitle">Ambil swafoto (selfie) atau unggah pas foto Anda.</p>
      
      <div class="camera-box">
        ${draftPhoto 
          ? `<img src="${draftPhoto}">` 
          : `<video id="videoFeed" class="mirror" autoplay playsinline></video>`}
      </div>

      <div style="display:flex; gap:10px; margin-bottom:20px;">
        ${draftPhoto 
          ? `<button class="btn btn-secondary" id="btnRetake">Ulangi</button>` 
          : `<button class="btn btn-secondary" id="btnSnap">📸 Jepret</button>`}
        <button class="btn btn-secondary" id="btnUploadTrig">⬆ Unggah</button>
        <input type="file" id="uploadFile" accept="image/*" style="display:none;">
      </div>

      <div style="display:flex; gap:10px;">
        <button class="btn btn-secondary" id="btnBackForm">&larr; Batal</button>
        <button class="btn btn-primary" id="btnSubmit">Kirim Pengajuan</button>
      </div>
    </div>
  `;
}

function viewSuccess() {
  return `
    <div class="glass-card" style="text-align:center;">
      <div style="font-size:50px; margin-bottom:10px;">✅</div>
      <h2>Berhasil Terkirim</h2>
      <p class="subtitle" style="margin-bottom:20px;">Pengajuan jadwal Anda telah masuk. Silakan tunggu persetujuan dari Kepala Sekolah.</p>
      <button class="btn btn-secondary" id="btnHome">Kembali ke Awal</button>
    </div>
  `;
}

function viewAdmin() {
  const pending = appointments.filter(a => a.status === 'pending');
  const approved = appointments.filter(a => a.status === 'approved')
                               .sort((a, b) => a.time.localeCompare(b.time)); // Urutkan jam

  // Kelompokkan jadwal disetujui berdasarkan tanggal (GCal Style)
  const grouped = {};
  approved.forEach(a => {
    if(!grouped[a.date]) grouped[a.date] = [];
    grouped[a.date].push(a);
  });

  let calendarHTML = '';
  if (Object.keys(grouped).length === 0) {
    calendarHTML = `<p style="color:var(--text-soft); font-size:13px;">Belum ada jadwal yang disetujui.</p>`;
  } else {
    for (const [date, events] of Object.entries(grouped)) {
      calendarHTML += `<div class="gcal-date-header">🗓️ Tanggal: ${date}</div><div class="gcal-agenda">`;
      events.forEach(ev => {
        calendarHTML += `
          <div class="gcal-event">
            <div class="gcal-time">🕒 ${ev.time} WIB</div>
            <div class="gcal-title">${ev.name}</div>
            <div class="gcal-desc">Tujuan: ${ev.reason}</div>
          </div>
        `;
      });
      calendarHTML += `</div>`;
    }
  }

  let pendingHTML = pending.length === 0 
    ? `<p style="color:var(--text-soft); font-size:13px;">Semua antrean sudah diproses.</p>` 
    : pending.map(a => `
        <div class="list-item">
          ${a.photo ? `<img src="${a.photo}" class="avatar">` : `<div class="avatar" style="display:flex;align-items:center;justify-content:center;">👤</div>`}
          <div class="item-info">
            <h4>${a.name}</h4>
            <p>📅 ${a.date} | 🕒 ${a.time} WIB</p>
            <p>📝 ${a.reason}</p>
            <div style="margin-top:10px; display:flex; gap:8px;">
              <button class="btn btn-sm btn-approve" data-id="${a.id}">Setujui</button>
              <button class="btn btn-sm btn-reject" data-id="${a.id}">Tolak</button>
            </div>
          </div>
        </div>
      `).join('');

  return `
    <div class="glass-card" style="margin-top: 20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
        <h2>Dasbor Kepala Sekolah</h2>
        <button class="btn btn-secondary btn-sm" id="btnLogout">Keluar Mode</button>
      </div>

      <div class="admin-grid">
        <!-- Kolom Kiri: Permintaan Masuk -->
        <div>
          <h3 style="margin-bottom:15px; font-size:16px; border-bottom:1px solid var(--border); padding-bottom:8px;">Menunggu Persetujuan (${pending.length})</h3>
          ${pendingHTML}
        </div>

        <!-- Kolom Kanan: Kalender (GCal Style) -->
        <div>
          <h3 style="margin-bottom:15px; font-size:16px; border-bottom:1px solid var(--border); padding-bottom:8px;">Kalender Disetujui</h3>
          ${calendarHTML}
        </div>
      </div>
    </div>
  `;
}

// --- EVENT LISTENERS & CAMERA LOGIC ---
function wireEvents() {
  // 1. Form Kiosk
  const btnToPhoto = document.getElementById('btnToPhoto');
  if (btnToPhoto) {
    btnToPhoto.addEventListener('click', () => {
      const name = document.getElementById('v_name').value.trim();
      const reason = document.getElementById('v_reason').value.trim();
      if (!name || !reason) return alert('Nama dan alasan wajib diisi!');
      
      draftForm = {
        name,
        date: document.getElementById('v_date').value,
        time: document.getElementById('v_time').value,
        reason
      };
      currentView = 'photo';
      render();
      startCamera();
    });
  }

  // 2. Camera & Photo
  const btnBackForm = document.getElementById('btnBackForm');
  if (btnBackForm) {
    btnBackForm.addEventListener('click', () => {
      stopCamera(); currentView = 'form'; render();
    });
  }

  const btnSnap = document.getElementById('btnSnap');
  if (btnSnap) btnSnap.addEventListener('click', takeSnapshot);

  const btnRetake = document.getElementById('btnRetake');
  if (btnRetake) {
    btnRetake.addEventListener('click', () => {
      draftPhoto = null; render(); startCamera();
    });
  }

  const btnUploadTrig = document.getElementById('btnUploadTrig');
  const uploadFile = document.getElementById('uploadFile');
  if (btnUploadTrig && uploadFile) {
    btnUploadTrig.addEventListener('click', () => uploadFile.click());
    uploadFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { draftPhoto = reader.result; stopCamera(); render(); };
      reader.readAsDataURL(file);
    });
  }

  const btnSubmit = document.getElementById('btnSubmit');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      if (!draftPhoto) return alert('Mohon ambil foto terlebih dahulu.');
      appointments.push({
        id: Date.now().toString(),
        ...draftForm,
        photo: draftPhoto,
        status: 'pending'
      });
      draftForm = {}; draftPhoto = null;
      currentView = 'success'; render();
    });
  }

  const btnHome = document.getElementById('btnHome');
  if (btnHome) btnHome.addEventListener('click', () => { currentView = 'form'; render(); });

  // 3. Admin Switch
  const btnAdminSwitch = document.getElementById('btnAdminSwitch');
  if (btnAdminSwitch) {
    btnAdminSwitch.addEventListener('click', () => {
      document.getElementById('modalRoot').innerHTML = `
        <div class="modal-overlay" id="pinOverlay">
          <div class="modal-content">
            <h3>Login Admin</h3>
            <p style="font-size:12px; color:var(--text-soft);">Masukkan sandi (hint: admin123)</p>
            <input type="password" id="pinInput" class="pin-input" placeholder="••••">
            <div style="display:flex; gap:10px;">
              <button class="btn btn-secondary" id="btnPinCancel">Batal</button>
              <button class="btn btn-primary" id="btnPinSubmit">Masuk</button>
            </div>
          </div>
        </div>
      `;
      
      document.getElementById('btnPinCancel').addEventListener('click', () => {
        document.getElementById('modalRoot').innerHTML = '';
      });

      document.getElementById('btnPinSubmit').addEventListener('click', () => {
        const val = document.getElementById('pinInput').value;
        if (val === ADMIN_PIN) {
          document.getElementById('modalRoot').innerHTML = '';
          currentView = 'admin'; render();
        } else {
          alert('Sandi salah!');
        }
      });
    });
  }

  // 4. Admin Dashboard Actions
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', () => { currentView = 'form'; render(); });

  document.querySelectorAll('.btn-approve').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      appointments.find(a => a.id === id).status = 'approved';
      render();
    });
  });

  document.querySelectorAll('.btn-reject').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      appointments.find(a => a.id === id).status = 'rejected';
      render();
    });
  });
}

// --- WEBRTC CAMERA LOGIC ---
function startCamera() {
  const video = document.getElementById('videoFeed');
  if (!video) return;
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
    .then(stream => {
      cameraStream = stream;
      video.srcObject = stream;
    })
    .catch(err => console.log("Kamera tidak diizinkan atau tidak ada.", err));
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
}

function takeSnapshot() {
  const video = document.getElementById('videoFeed');
  if (!video || !cameraStream) return alert('Kamera belum siap atau ditolak.');
  
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  
  // Mirror canvas agar hasil jepretan tidak terbalik
  ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  draftPhoto = canvas.toDataURL('image/jpeg', 0.8);
  stopCamera(); render();
}

// Inisialisasi awal
render();
