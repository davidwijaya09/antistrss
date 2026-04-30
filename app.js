// ============================================================
// NAPAS APP — Optimized & Enhanced
// ============================================================

// === DATA (loaded from JSON) ===
let moodResponses = {};
let quotes = [];
let microSteps = [];
let motivasiQuotes = [];
let percintaanQuotes = [];
let masaDepanQuotes = [];

const emojiMap = {
  overwhelmed: "😵‍💫", sedih: "😢", cemas: "😰", marah: "😤",
  kosong: "😶", lelah: "😮‍💨", biasa: "😐", lumayan: "🙂"
};

const techniques = {
  "478": { name: "4-7-8", inhale: 4, hold: 7, exhale: 8 },
  "box": { name: "Box", inhale: 4, hold: 4, exhale: 4, hold2: 4 },
  "simple": { name: "Simple", inhale: 4, hold: 0, exhale: 6 }
};

// === STATE ===
let currentTechnique = "478";
let breatheInterval = null;
let cycleCount = 0;
let currentMotCat = "all";

// === DATA LOADER ===
async function loadAllData() {
  const [moodRes, quotesRes, stepsRes, motiRes, loveRes, futureRes] = await Promise.all([
    fetch("data/mood-responses.json").then(r => r.json()),
    fetch("data/quotes.json").then(r => r.json()),
    fetch("data/micro-steps.json").then(r => r.json()),
    fetch("data/motivasi.json").then(r => r.json()),
    fetch("data/percintaan.json").then(r => r.json()),
    fetch("data/masa-depan.json").then(r => r.json())
  ]);
  moodResponses = moodRes;
  quotes = quotesRes;
  microSteps = stepsRes;
  motivasiQuotes = motiRes;
  percintaanQuotes = loveRes;
  masaDepanQuotes = futureRes;
}

// ============================================================
// 1. THREE.JS BACKGROUND — Hexagonal grid + cursor interaction
// ============================================================

function setupVisualEffects() {
  const container = document.getElementById("three-bg");
  if (!container || typeof THREE === "undefined") return;

  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 20;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Mouse tracking (normalized -1 to 1)
  const mouse = new THREE.Vector2(-10, -10);
  const mouseTarget = new THREE.Vector2(-10, -10);
  document.addEventListener("mousemove", (e) => {
    mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // Create hexagon shape
  function createHexShape(radius) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }

  // Hexagonal grid — dynamically sized to cover full viewport
  const hexagons = [];
  const hexRadius = 0.6;
  const spacing = 1.5;

  // Calculate grid size based on camera frustum
  const vFov = (camera.fov * Math.PI) / 180;
  const viewHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
  const viewWidth = viewHeight * camera.aspect;
  const cols = Math.ceil(viewWidth / spacing) + 4;
  const rows = Math.ceil(viewHeight / (spacing * 0.866)) + 4;

  const accentColor = new THREE.Color(0x7c6fea);
  const dimColor = new THREE.Color(0x1a1d30);
  const greenColor = new THREE.Color(0x34d399);
  const pinkColor = new THREE.Color(0xf472b6);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = (col - cols / 2) * spacing + (row % 2 === 0 ? 0 : spacing * 0.5);
      const y = (row - rows / 2) * spacing * 0.866;

      // Hex outline (EdgesGeometry for wireframe look)
      const hexShape = createHexShape(hexRadius);
      const shapeGeo = new THREE.ShapeGeometry(hexShape);
      const edgesGeo = new THREE.EdgesGeometry(shapeGeo);
      const mat = new THREE.LineBasicMaterial({ color: dimColor, transparent: true, opacity: 0.3 });
      const line = new THREE.LineSegments(edgesGeo, mat);
      line.position.set(x, y, 0);

      // Store original data
      line.userData = {
        origX: x, origY: y,
        baseOpacity: 0.15 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2
      };

      scene.add(line);
      hexagons.push(line);
      shapeGeo.dispose();
    }
  }

  // Floating particles
  const particleCount = 40;
  const pGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(particleCount * 3);
  const pVelocities = [];
  for (let i = 0; i < particleCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 30;
    pPositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    pVelocities.push({ x: (Math.random() - 0.5) * 0.005, y: (Math.random() - 0.5) * 0.005 });
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xa78bfa, size: 0.08, transparent: true, opacity: 0.5 });
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // Cursor trail hexagons
  const trailHexes = [];
  const TRAIL_COUNT = 12;
  for (let i = 0; i < TRAIL_COUNT; i++) {
    const s = createHexShape(0.3 + i * 0.05);
    const g = new THREE.ShapeGeometry(s);
    const eg = new THREE.EdgesGeometry(g);
    const m = new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0 });
    const l = new THREE.LineSegments(eg, m);
    l.position.set(-100, -100, 1);
    scene.add(l);
    trailHexes.push(l);
    g.dispose();
  }

  // Trail position history
  const trailPositions = [];

  let isVisible = true;
  document.addEventListener("visibilitychange", () => { isVisible = !document.hidden; });

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Theme awareness
  function getIsLight() {
    return document.documentElement.getAttribute("data-theme") === "light";
  }

  // Animate
  const clock = new THREE.Clock();
  function animate() {
    if (!isVisible) { requestAnimationFrame(animate); return; }
    requestAnimationFrame(animate);

    const t = clock.getElapsedTime();
    const isLight = getIsLight();

    // Smooth mouse
    mouse.x += (mouseTarget.x - mouse.x) * 0.08;
    mouse.y += (mouseTarget.y - mouse.y) * 0.08;

    // Convert mouse to world coords (based on actual frustum)
    const mx = mouse.x * (viewWidth / 2);
    const my = mouse.y * (viewHeight / 2);

    // Update trail positions
    trailPositions.unshift({ x: mx, y: my });
    if (trailPositions.length > TRAIL_COUNT) trailPositions.pop();

    // Update trail hexagons
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const th = trailHexes[i];
      if (i < trailPositions.length) {
        const tp = trailPositions[i];
        th.position.set(tp.x, tp.y, 1);
        th.rotation.z = t * 0.5 + i * 0.3;
        const fade = 1 - (i / TRAIL_COUNT);
        th.material.opacity = fade * 0.6;
        th.material.color.set(isLight ? 0x6c5ce7 : 0xa78bfa);
        const scale = 1 + i * 0.15;
        th.scale.set(scale, scale, 1);
      } else {
        th.material.opacity = 0;
      }
    }

    // Update hexagonal grid
    const bgColor = isLight ? new THREE.Color(0x9b8ec4) : dimColor;
    for (let i = 0; i < hexagons.length; i++) {
      const hex = hexagons[i];
      const ud = hex.userData;
      const dx = mx - ud.origX;
      const dy = my - ud.origY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const influence = Math.max(0, 1 - dist / 6);

      // Proximity glow
      const glowOpacity = ud.baseOpacity + influence * 0.7;
      hex.material.opacity = glowOpacity + Math.sin(t * 0.8 + ud.phase) * 0.05;

      // Color shift near cursor
      if (influence > 0.1) {
        const mixColor = influence > 0.5 ? greenColor : accentColor;
        hex.material.color.lerpColors(bgColor, mixColor, influence);
      } else {
        hex.material.color.copy(bgColor);
      }

      // Subtle Z displacement
      hex.position.z = Math.sin(t * 0.5 + ud.phase) * 0.15 + influence * 1.5;

      // Slight rotation
      hex.rotation.z = influence * 0.3 + Math.sin(t * 0.3 + ud.phase) * 0.02;
    }

    // Update particles
    const positions = pGeo.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += pVelocities[i].x;
      positions[i * 3 + 1] += pVelocities[i].y;
      if (Math.abs(positions[i * 3]) > 16) pVelocities[i].x *= -1;
      if (Math.abs(positions[i * 3 + 1]) > 11) pVelocities[i].y *= -1;
    }
    pGeo.attributes.position.needsUpdate = true;
    pMat.color.set(isLight ? 0x6c5ce7 : 0xa78bfa);
    pMat.opacity = isLight ? 0.3 : 0.5;

    // Background — handled by CSS, keep Three.js transparent
    renderer.setClearColor(0x000000, 0);

    renderer.render(scene, camera);
  }
  animate();
}

// ============================================================
// AURORA GRADIENT FOLLOW
// ============================================================

function setupAurora() {
  const container = document.getElementById("aurora-follow");
  if (!container) return;

  // Create 3 aurora blobs with different colors and sizes
  const blobs = [
    { el: null, size: 450, color: { dark: "rgba(124,111,234,0.18)", light: "rgba(124,111,234,0.12)" }, offsetX: 0, offsetY: 0, delay: 0 },
    { el: null, size: 380, color: { dark: "rgba(52,211,153,0.14)", light: "rgba(52,211,153,0.10)" }, offsetX: 80, offsetY: -60, delay: 0.15 },
    { el: null, size: 320, color: { dark: "rgba(244,114,182,0.12)", light: "rgba(244,114,182,0.08)" }, offsetX: -70, offsetY: 70, delay: 0.3 }
  ];

  blobs.forEach(b => {
    const el = document.createElement("div");
    el.className = "aurora-blob";
    el.style.width = b.size + "px";
    el.style.height = b.size + "px";
    el.style.transform = "translate(-50%, -50%)";
    container.appendChild(el);
    b.el = el;
    b.x = window.innerWidth / 2;
    b.y = window.innerHeight / 2;
    b.targetX = b.x;
    b.targetY = b.y;
  });

  // Track mouse
  document.addEventListener("mousemove", (e) => {
    blobs.forEach(b => {
      b.targetX = e.clientX + b.offsetX;
      b.targetY = e.clientY + b.offsetY;
    });
  });

  // Color cycling
  let hueShift = 0;

  function animate() {
    requestAnimationFrame(animate);
    hueShift += 0.2;
    const isLight = document.documentElement.getAttribute("data-theme") === "light";

    blobs.forEach((b, i) => {
      // Smooth follow with different speeds per blob
      const speed = 0.04 - i * 0.008;
      b.x += (b.targetX - b.x) * speed;
      b.y += (b.targetY - b.y) * speed;

      b.el.style.transform = `translate(${b.x - b.size / 2}px, ${b.y - b.size / 2}px)`;

      // Shift colors over time
      const hue = (hueShift + i * 40) % 360;
      const saturation = isLight ? "60%" : "70%";
      const lightness = isLight ? "65%" : "55%";
      const opacity = isLight ? 0.18 : 0.25;
      b.el.style.background = `radial-gradient(circle, hsla(${hue}, ${saturation}, ${lightness}, ${opacity}), transparent 70%)`;
    });
  }
  animate();
}

// ============================================================
// 2. PWA — Service Worker + Manifest for installable app
// ============================================================

function setupPWA() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

// ============================================================
// 3. ACCESSIBILITY — Skip nav, focus management, ARIA
// ============================================================

function setupAccessibility() {
  // Focus management on page switch
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      const section = document.getElementById(`page-${page}`);
      if (section) {
        const heading = section.querySelector("h1, h2");
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus();
        }
      }
    });
  });

  // Keyboard support for mood buttons
  document.querySelectorAll(".mood-btn").forEach(btn => {
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", "false");
  });

  // Live region for dynamic content
  const liveRegion = document.createElement("div");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("aria-atomic", "true");
  liveRegion.className = "sr-only";
  liveRegion.id = "live-announcer";
  document.body.appendChild(liveRegion);
}

function announce(message) {
  const el = document.getElementById("live-announcer");
  if (el) { el.textContent = ""; setTimeout(() => { el.textContent = message; }, 100); }
}

// ============================================================
// 4. DATA EXPORT/IMPORT — Robust persistence
// ============================================================

function exportData() {
  const data = {
    version: 1,
    exportDate: new Date().toISOString(),
    moods: JSON.parse(localStorage.getItem("napas_moods") || "[]"),
    journal: JSON.parse(localStorage.getItem("napas_journal") || "[]"),
    theme: localStorage.getItem("napas_theme") || "dark",
    reminderEnabled: localStorage.getItem("napas_reminder") || "false"
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `napas-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Data berhasil di-export 📦");
  announce("Data berhasil di-export");
}

function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.version !== 1) throw new Error("Format tidak dikenali");
        if (data.moods) localStorage.setItem("napas_moods", JSON.stringify(data.moods));
        if (data.journal) localStorage.setItem("napas_journal", JSON.stringify(data.journal));
        if (data.theme) { localStorage.setItem("napas_theme", data.theme); applyTheme(data.theme); }
        loadMoodHistory();
        loadJournalEntries();
        showToast("Data berhasil di-import ✅");
        announce("Data berhasil di-import");
      } catch (err) {
        showToast("Gagal import: file tidak valid ❌");
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

function setupDataTools() {
  const btnExport = document.getElementById("btn-export");
  const btnImport = document.getElementById("btn-import");
  if (btnExport) btnExport.addEventListener("click", exportData);
  if (btnImport) btnImport.addEventListener("click", importData);
}

// ============================================================
// 5. REMINDER NOTIFICATION — Daily check-in reminder
// ============================================================

function setupReminder() {
  const toggle = document.getElementById("reminder-toggle");
  if (!toggle) return;

  const enabled = localStorage.getItem("napas_reminder") === "true";
  toggle.checked = enabled;

  toggle.addEventListener("change", async () => {
    if (toggle.checked) {
      if ("Notification" in window) {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          localStorage.setItem("napas_reminder", "true");
          scheduleReminder();
          showToast("Reminder aktif 🔔");
          announce("Reminder harian diaktifkan");
        } else {
          toggle.checked = false;
          showToast("Izin notifikasi ditolak 😔");
        }
      } else {
        toggle.checked = false;
        showToast("Browser tidak mendukung notifikasi");
      }
    } else {
      localStorage.setItem("napas_reminder", "false");
      showToast("Reminder dimatikan");
      announce("Reminder harian dimatikan");
    }
  });

  if (enabled) scheduleReminder();
}

function scheduleReminder() {
  // Check every 30 minutes if it's time to remind
  setInterval(() => {
    if (localStorage.getItem("napas_reminder") !== "true") return;
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Remind at 9:00 AM and 8:00 PM
    if ((hour === 9 && minute < 30) || (hour === 20 && minute < 30)) {
      const lastRemind = localStorage.getItem("napas_last_remind");
      const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${hour}`;
      if (lastRemind !== todayKey) {
        localStorage.setItem("napas_last_remind", todayKey);
        if (Notification.permission === "granted") {
          new Notification("🌿 Napas — Waktunya Check-in", {
            body: hour === 9
              ? "Selamat pagi, David! Gimana perasaanmu hari ini?"
              : "Selamat malam, David! Sudah journaling hari ini?",
            icon: "favicon.svg"
          });
        }
      }
    }
  }, 60000 * 15); // Check every 15 minutes
}

// ============================================================
// CORE FEATURES (cleaned up, single init)
// ============================================================

function setupNav() {
  // Regular nav buttons
  document.querySelectorAll(".nav-btn:not(.nav-dropdown-trigger)").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      activatePage(page);
      // Close any open dropdown
      closeAllDropdowns();
    });
  });

  // Dropdown triggers
  document.querySelectorAll(".nav-dropdown").forEach(dropdown => {
    const dropdownTrigger = dropdown.querySelector(".nav-dropdown-trigger");
    if (!dropdownTrigger) return;

    dropdownTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !dropdown.classList.contains("open");
      closeAllDropdowns();
      dropdown.classList.toggle("open", willOpen);
      dropdownTrigger.setAttribute("aria-expanded", String(willOpen));
    });

    // Dropdown items
    dropdown.querySelectorAll(".nav-dropdown-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const page = item.dataset.page;
        activatePage(page);
        closeAllDropdowns();

        // Mark dropdown trigger as active
        document.querySelectorAll(".nav-btn").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
        dropdownTrigger.classList.add("active");
        dropdownTrigger.setAttribute("aria-selected", "true");

        // Mark dropdown item as active
        document.querySelectorAll(".nav-dropdown-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");
      });
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", closeAllDropdowns);
}

function closeAllDropdowns() {
  document.querySelectorAll(".nav-dropdown").forEach(dropdown => {
    dropdown.classList.remove("open");
    const trigger = dropdown.querySelector(".nav-dropdown-trigger");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  });
}

function activatePage(page) {
  if (!page) return;
  document.querySelectorAll(".nav-btn").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
  document.querySelectorAll(".nav-dropdown-item").forEach(i => i.classList.remove("active"));
  const directBtn = document.querySelector(`.nav-btn[data-page="${page}"]`);
  if (directBtn) { directBtn.classList.add("active"); directBtn.setAttribute("aria-selected", "true"); }
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const targetPage = document.getElementById(`page-${page}`);
  if (targetPage) targetPage.classList.add("active");
}

function setupGreeting() {
  const hour = new Date().getHours();
  let greet = "Halo, David 👋";
  if (hour < 11) greet = "Selamat pagi, David 🌅";
  else if (hour < 15) greet = "Selamat siang, David ☀️";
  else if (hour < 18) greet = "Selamat sore, David 🌤️";
  else greet = "Selamat malam, David 🌙";
  document.getElementById("greeting").textContent = greet;
}

function showQuote() {
  const idx = Math.floor(Math.random() * quotes.length);
  document.getElementById("daily-quote").textContent = `"${quotes[idx]}"`;
}

function setupMood() {
  document.querySelectorAll(".mood-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const mood = btn.dataset.mood;
      document.querySelectorAll(".mood-btn").forEach(b => { b.classList.remove("selected"); b.setAttribute("aria-checked", "false"); });
      btn.classList.add("selected");
      btn.setAttribute("aria-checked", "true");

      const response = moodResponses[mood];
      document.getElementById("response-text").textContent = response.text;
      document.getElementById("response-suggestion").textContent = response.suggestion;
      document.getElementById("mood-response").classList.remove("hidden");
      announce(response.text);

      saveMood(mood);
      loadMoodHistory();
    });
  });

  document.getElementById("btn-breathe-now").addEventListener("click", () => {
    document.querySelector('[data-page="breathe"]').click();
  });
}

function saveMood(mood) {
  const history = JSON.parse(localStorage.getItem("napas_moods") || "[]");
  history.unshift({ mood, emoji: emojiMap[mood], date: new Date().toISOString() });
  if (history.length > 30) history.pop();
  localStorage.setItem("napas_moods", JSON.stringify(history));
}

function loadMoodHistory() {
  const history = JSON.parse(localStorage.getItem("napas_moods") || "[]");
  const container = document.getElementById("mood-history");
  const empty = document.getElementById("history-empty");
  if (history.length === 0) { empty.classList.remove("hidden"); container.innerHTML = ""; return; }
  empty.classList.add("hidden");
  container.innerHTML = history.slice(0, 14).map(item => {
    const d = new Date(item.date);
    const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    const timeStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return `<div class="history-item"><span>${item.emoji}</span><span class="history-date">${dateStr} ${timeStr}</span></div>`;
  }).join("");
}

function setupBreathe() {
  document.querySelectorAll(".technique-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".technique-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTechnique = btn.dataset.technique;
    });
  });
  document.getElementById("breathe-circle").addEventListener("click", toggleBreathe);
}

function toggleBreathe() {
  if (breatheInterval) {
    stopBreathe();
  } else {
    startBreathe();
  }
}

function startBreathe() {
  cycleCount = 0;
  document.getElementById("cycle-count").textContent = "0";
  document.getElementById("breathe-cycle-info").textContent = "Klik untuk berhenti";
  announce("Latihan napas dimulai");
  runBreatheCycle();
}

function stopBreathe() {
  clearTimeout(breatheInterval);
  breatheInterval = null;
  document.getElementById("breathe-circle").className = "breathe-circle";
  document.getElementById("breathe-text").textContent = "Mulai";
  document.getElementById("breathe-count").textContent = "";
  document.getElementById("breathe-cycle-info").textContent = cycleCount > 0 ? `${cycleCount} siklus selesai ✓` : "";
  announce(`Latihan napas selesai. ${cycleCount} siklus.`);
}

function runBreatheCycle() {
  const tech = techniques[currentTechnique];
  const circle = document.getElementById("breathe-circle");
  const text = document.getElementById("breathe-text");
  const count = document.getElementById("breathe-count");
  let phase = "inhale", seconds = tech.inhale;

  function tick() {
    if (!breatheInterval && breatheInterval !== 0) return;
    count.textContent = seconds;
    if (phase === "inhale") {
      circle.className = "breathe-circle inhale"; text.textContent = "Tarik napas...";
      if (seconds <= 0) { phase = tech.hold > 0 ? "hold" : "exhale"; seconds = tech.hold > 0 ? tech.hold : tech.exhale; breatheInterval = setTimeout(tick, 1000); return; }
    } else if (phase === "hold") {
      circle.className = "breathe-circle hold"; text.textContent = "Tahan...";
      if (seconds <= 0) { phase = "exhale"; seconds = tech.exhale; breatheInterval = setTimeout(tick, 1000); return; }
    } else if (phase === "exhale") {
      circle.className = "breathe-circle exhale"; text.textContent = "Buang napas...";
      if (seconds <= 0) {
        if (tech.hold2 > 0) { phase = "hold2"; seconds = tech.hold2; } else { cycleCount++; document.getElementById("cycle-count").textContent = cycleCount; document.getElementById("breathe-cycle-info").textContent = `Siklus ${cycleCount}`; phase = "inhale"; seconds = tech.inhale; }
        breatheInterval = setTimeout(tick, 1000); return;
      }
    } else if (phase === "hold2") {
      circle.className = "breathe-circle hold"; text.textContent = "Tahan...";
      if (seconds <= 0) { cycleCount++; document.getElementById("cycle-count").textContent = cycleCount; document.getElementById("breathe-cycle-info").textContent = `Siklus ${cycleCount}`; phase = "inhale"; seconds = tech.inhale; breatheInterval = setTimeout(tick, 1000); return; }
    }
    seconds--;
    breatheInterval = setTimeout(tick, 1000);
  }
  breatheInterval = setTimeout(tick, 0);
}

// === JOURNAL ===
function setupJournal() {
  document.querySelectorAll(".prompt-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const input = document.getElementById("journal-input");
      input.value = chip.dataset.prompt + " ";
      input.focus();
    });
  });
  document.getElementById("btn-save-journal").addEventListener("click", saveJournal);
  loadJournalEntries();
}

function saveJournal() {
  const input = document.getElementById("journal-input");
  const text = input.value.trim();
  if (!text) return;
  const entries = JSON.parse(localStorage.getItem("napas_journal") || "[]");
  entries.unshift({ text, date: new Date().toISOString(), id: Date.now() });
  localStorage.setItem("napas_journal", JSON.stringify(entries));
  input.value = "";
  loadJournalEntries();
  showToast("Tersimpan 💛");
  announce("Jurnal tersimpan");
}

function loadJournalEntries() {
  const entries = JSON.parse(localStorage.getItem("napas_journal") || "[]");
  const container = document.getElementById("entries-list");
  const empty = document.getElementById("entries-empty");
  if (entries.length === 0) { empty.classList.remove("hidden"); container.innerHTML = ""; return; }
  empty.classList.add("hidden");
  container.innerHTML = entries.map(entry => {
    const d = new Date(entry.date);
    const dateStr = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    return `<div class="entry-card"><div class="entry-date">${dateStr}</div><div class="entry-text">${escapeHtml(entry.text)}</div><button class="entry-delete" onclick="deleteEntry(${entry.id})" aria-label="Hapus catatan">🗑️ Hapus</button></div>`;
  }).join("");
}

function deleteEntry(id) {
  let entries = JSON.parse(localStorage.getItem("napas_journal") || "[]");
  entries = entries.filter(e => e.id !== id);
  localStorage.setItem("napas_journal", JSON.stringify(entries));
  loadJournalEntries();
  showToast("Catatan dihapus");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// === STEPS ===
function setupSteps() {
  renderSteps("all");
  document.querySelectorAll(".step-cat").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".step-cat").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderSteps(btn.dataset.cat);
    });
  });
}

function renderSteps(cat) {
  const filtered = cat === "all" ? microSteps : microSteps.filter(s => s.cat === cat);
  const catLabels = { kerja: "Kerja", keluarga: "Keluarga", diri: "Diri Sendiri", arah: "Cari Arah" };
  document.getElementById("steps-list").innerHTML = filtered.map(step => `
    <div class="step-card"><div class="step-icon">${step.icon}</div><div class="step-content"><h4>${step.title}</h4><p>${step.desc}</p><span class="step-tag">${catLabels[step.cat]}</span></div></div>
  `).join("");
}

// === MOTIVASI ===
function setupMotivasi() {
  showFeaturedQuote();
  renderMotivasiList("all");
  document.querySelectorAll(".moti-cat").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".moti-cat").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentMotCat = btn.dataset.mcat;
      showFeaturedQuote();
      renderMotivasiList(currentMotCat);
    });
  });
  document.getElementById("btn-shuffle-quote").addEventListener("click", showFeaturedQuote);
}

function showFeaturedQuote() {
  const filtered = currentMotCat === "all" ? motivasiQuotes : motivasiQuotes.filter(q => q.cat === currentMotCat);
  const pick = filtered[Math.floor(Math.random() * filtered.length)];
  document.getElementById("motivasi-featured").innerHTML = `<p class="featured-quote">"${pick.text}"</p><p class="featured-author">— ${pick.author}</p>`;
}

function renderMotivasiList(cat) {
  const filtered = cat === "all" ? motivasiQuotes : motivasiQuotes.filter(q => q.cat === cat);
  const catLabels = { kehidupan: "Kehidupan", kegagalan: "Kegagalan", keberanian: "Keberanian", diri: "Diri Sendiri" };
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  document.getElementById("motivasi-list").innerHTML = shuffled.map(q => `
    <div class="moti-card" data-mcat="${q.cat}"><p class="moti-text">"${q.text}"</p><span class="moti-author">— ${q.author}</span><span class="moti-tag">${catLabels[q.cat]}</span></div>
  `).join("");
}

// === DAILY MOTIVASI ON HOME ===
function setupDailyMotivasi() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const pick = motivasiQuotes[seed % motivasiQuotes.length];
  document.getElementById("daily-motivasi-text").textContent = `"${pick.text}"`;
  document.getElementById("daily-motivasi-author").textContent = `— ${pick.author}`;
}

// === THEME ===
function setupTheme() {
  const toggle = document.getElementById("theme-toggle");
  applyTheme(localStorage.getItem("napas_theme") || "dark");
  toggle.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
    localStorage.setItem("napas_theme", next);
  });
}

function applyTheme(theme) {
  const toggle = document.getElementById("theme-toggle");
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    toggle.textContent = "☀️ Light";
  } else {
    document.documentElement.removeAttribute("data-theme");
    toggle.textContent = "🌙 Dark";
  }
}

// === TOAST ===
function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) { toast = document.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); document.body.appendChild(toast); }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// ============================================================
// SINGLE INIT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Load all data from JSON files first
  await loadAllData();

  // Then init everything
  setupTheme();
  setupNav();
  setupGreeting();
  showQuote();
  document.getElementById("refresh-quote").addEventListener("click", showQuote);
  setupMood();
  setupBreathe();
  setupJournal();
  setupSteps();
  setupMotivasi();
  setupDailyMotivasi();
  setupPercintaan();
  setupMasaDepan();
  loadMoodHistory();
  setupVisualEffects();
  setupAurora();
  setupAccessibility();
  setupDataTools();
  setupReminder();
  setupPWA();
});

// ============================================================
// PERCINTAAN — Wejangan Cinta
// ============================================================

// Data loaded from data/percintaan.json

let currentLoveCat = "all";

function setupPercintaan() {
  showFeaturedLove();
  renderPercintaanList("all");

  document.querySelectorAll(".love-cat").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".love-cat").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentLoveCat = btn.dataset.lcat;
      showFeaturedLove();
      renderPercintaanList(currentLoveCat);
    });
  });

  document.getElementById("btn-shuffle-love").addEventListener("click", showFeaturedLove);
}

function showFeaturedLove() {
  const filtered = currentLoveCat === "all" ? percintaanQuotes : percintaanQuotes.filter(q => q.cat === currentLoveCat);
  const pick = filtered[Math.floor(Math.random() * filtered.length)];
  document.getElementById("percintaan-featured").innerHTML = `
    <p class="love-featured-text">"${pick.text}"</p>
    <p class="love-featured-author">— ${pick.author}</p>
  `;
}

function renderPercintaanList(cat) {
  const filtered = cat === "all" ? percintaanQuotes : percintaanQuotes.filter(q => q.cat === cat);
  const catLabels = { pendekatan: "Pendekatan", memilih: "Memilih Pasangan", diri: "Siapkan Dirimu", bijak: "Bijak dalam Cinta" };
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  document.getElementById("percintaan-list").innerHTML = shuffled.map(q => `
    <div class="love-card" data-lcat="${q.cat}">
      <p class="love-text">"${q.text}"</p>
      <span class="love-author">— ${q.author}</span>
      <span class="love-tag">${catLabels[q.cat]}</span>
    </div>
  `).join("");
}

// percintaan init is now in main DOMContentLoaded

// ============================================================
// MASA DEPAN — Wejangan Masa Depan
// ============================================================

let currentFutureCat = "all";

function setupMasaDepan() {
  showFeaturedFuture();
  renderMasaDepanList("all");

  document.querySelectorAll(".future-cat").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".future-cat").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFutureCat = btn.dataset.fcat;
      showFeaturedFuture();
      renderMasaDepanList(currentFutureCat);
    });
  });

  document.getElementById("btn-shuffle-future").addEventListener("click", showFeaturedFuture);
}

function showFeaturedFuture() {
  const filtered = currentFutureCat === "all" ? masaDepanQuotes : masaDepanQuotes.filter(q => q.cat === currentFutureCat);
  if (filtered.length === 0) return;
  const pick = filtered[Math.floor(Math.random() * filtered.length)];
  document.getElementById("masadepan-featured").innerHTML = `
    <p class="future-featured-text">"${pick.text}"</p>
    <p class="future-featured-author">— ${pick.author}</p>
  `;
}

function renderMasaDepanList(cat) {
  const filtered = cat === "all" ? masaDepanQuotes : masaDepanQuotes.filter(q => q.cat === cat);
  const catLabels = { karir: "Karir", tujuan: "Tujuan Hidup", keuangan: "Keuangan", mental: "Mindset" };
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  document.getElementById("masadepan-list").innerHTML = shuffled.map(q => `
    <div class="future-card" data-fcat="${q.cat}">
      <p class="future-text">"${q.text}"</p>
      <span class="future-author">— ${q.author}</span>
      <span class="future-tag">${catLabels[q.cat]}</span>
    </div>
  `).join("");
}
