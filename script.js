(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var mqSmall = window.matchMedia("(max-width: 767px)");

  /* shared pointer state (single source of truth) */
  var ptr = { x: window.innerWidth / 2, y: window.innerHeight / 2, has: false };
  var rafLoops = [];
  var hidden = false;

  function addLoop(step) {
    var running = true;
    function frame() {
      if (!running) return;
      if (!hidden) step();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    rafLoops.push(function () { running = false; });
  }

  document.addEventListener("visibilitychange", function () {
    hidden = document.hidden;
  });

  /* ===== year + email obfuscation ===== */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  var email = ["midyarahmani", "icloud.com"].join("@");
  document.querySelectorAll("[data-email-link]").forEach(function (el) {
    el.href = "mailto:" + email;
    var span = el.querySelector("span") || el;
    span.textContent = email;
  });

  /* ===== global pointer ===== */
  if (finePointer && !reduce) {
    document.addEventListener("mousemove", function (e) {
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.has = true;
    }, { passive: true });
  }

  /* ===== BOOT ===== */
  function runBoot(cb) {
    var boot = document.getElementById("boot");
    var fill = document.getElementById("boot-fill");
    var log = document.getElementById("boot-log");
    var pct = document.getElementById("boot-pct");
    if (reduce || !boot) { if (boot) boot.classList.add("is-done"); cb(); return; }
    var lines = [
      "LOADING PROFILE SIGNAL…", "SYNC EDUCATION LAYER…", "MOUNT EXPERIENCE MAP…",
      "INDEX INTEREST STREAM…", "CALIBRATE AI CHANNEL…", "UPLINK READY."
    ];
    var p = 0, line = 0;
    var iv = setInterval(function () {
      p = Math.min(100, p + 4 + Math.random() * 9);
      if (fill) fill.style.width = p + "%";
      if (pct) pct.textContent = Math.round(p) + "%";
      if (log && p > line * 16 && line < lines.length) { log.textContent = lines[line]; line++; }
      if (p >= 100) {
        clearInterval(iv);
        setTimeout(function () { boot.classList.add("is-done"); cb(); }, 360);
      }
    }, 68);
  }

  /* ===== NAV (toggle + scrollspy) ===== */
  function initNav() {
    var btn = document.querySelector(".nav__btn");
    var list = document.getElementById("nav-list");
    if (btn && list) {
      btn.addEventListener("click", function () {
        var open = list.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      list.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
          list.classList.remove("is-open");
          btn.setAttribute("aria-expanded", "false");
        });
      });
    }
    var links = {};
    document.querySelectorAll(".nav__list a").forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      if (id) links[id] = a;
    });
    var sections = Object.keys(links).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if ("IntersectionObserver" in window && sections.length) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            Object.keys(links).forEach(function (id) { links[id].classList.remove("is-active"); });
            if (links[e.target.id]) links[e.target.id].classList.add("is-active");
          }
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      sections.forEach(function (s) { spy.observe(s); });
    }
  }

  /* ===== HEADER scrolled + SCROLL PROGRESS ===== */
  function initScroll() {
    var prog = document.getElementById("prog");
    var head = document.getElementById("head");
    var ticking = false;
    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var sy = window.scrollY;
      if (prog) prog.style.width = (h > 0 ? (sy / h) * 100 : 0) + "%";
      if (head) head.classList.toggle("is-scrolled", sy > 12);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ===== HUD ===== */
  function initHud() {
    var hash = document.getElementById("hud-hash");
    var tick = document.getElementById("hud-tick");
    var mouse = document.getElementById("hud-mouse");
    var t0 = performance.now();
    function upd() {
      if (hash) hash.textContent = "0x" + ((Math.random() * 0xffffff) | 0).toString(16).padStart(6, "0");
      if (tick) tick.textContent = "T+" + ((performance.now() - t0) / 1000).toFixed(3);
      if (mouse) mouse.textContent = (ptr.x | 0) + "," + (ptr.y | 0);
    }
    upd();
    if (!reduce) setInterval(upd, 150);
  }

  /* ===== CURSOR ===== */
  function initCursor() {
    var cursor = document.getElementById("cursor");
    if (!cursor || reduce || !finePointer) return;
    var cx = ptr.x, cy = ptr.y;
    document.addEventListener("mousedown", function () { cursor.classList.add("is-down"); });
    document.addEventListener("mouseup", function () { cursor.classList.remove("is-down"); });
    var hotSel = "a, button, .chip, [data-magnetic], [data-tilt]";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(hotSel)) cursor.classList.add("is-hot");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest(hotSel)) cursor.classList.remove("is-hot");
    });
    addLoop(function () {
      cx += (ptr.x - cx) * 0.2; cy += (ptr.y - cy) * 0.2;
      cursor.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
    });
  }

  /* ===== REVEAL ===== */
  function initReveal() {
    var nodes = document.querySelectorAll("[data-reveal]");
    nodes.forEach(function (n) { n.classList.add("reveal-init"); });
    if (reduce || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var sibs = el.parentElement ? el.parentElement.querySelectorAll(":scope > [data-reveal]") : [el];
        var idx = Array.prototype.indexOf.call(sibs, el);
        el.style.transitionDelay = (Math.min(idx, 6) * 70) + "ms";
        el.classList.add("is-visible");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -7% 0px", threshold: 0.08 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ===== SCRAMBLE ===== */
  function scramble(el) {
    var finalText = el.getAttribute("data-final") || el.textContent.trim();
    el.setAttribute("data-final", finalText);
    if (reduce) { el.textContent = finalText; return; }
    var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#%&·";
    var frame = 0, max = 46;
    function step() {
      frame++;
      var out = "";
      for (var i = 0; i < finalText.length; i++) {
        var ch = finalText[i];
        if (" ,.—·/".indexOf(ch) >= 0) { out += ch; continue; }
        if (frame > max * (i / Math.max(finalText.length, 1))) out += ch;
        else out += charset[(Math.random() * charset.length) | 0];
      }
      el.textContent = out;
      if (frame < max + 10) requestAnimationFrame(step);
      else el.textContent = finalText;
    }
    requestAnimationFrame(step);
  }
  function initScramble() {
    var nodes = document.querySelectorAll("[data-scramble]");
    if (!("IntersectionObserver" in window) || reduce) {
      nodes.forEach(function (n) { scramble(n); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { scramble(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ===== COUNTERS ===== */
  function initCounters() {
    var stats = document.getElementById("hero-stats");
    if (!stats || reduce) return;
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      stats.querySelectorAll("[data-count]").forEach(function (n) {
        var target = parseInt(n.getAttribute("data-count"), 10) || 0;
        var start = performance.now();
        function tick(now) {
          var t = Math.min(1, (now - start) / 1400);
          n.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    io.observe(stats);
  }

  /* ===== TILT / MAGNETIC / GLOW / GLARE ===== */
  function initInteractions() {
    if (reduce || !finePointer) return;
    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(900px) rotateY(" + px * 9 + "deg) rotateX(" + -py * 9 + "deg)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * 0.25 + "px," + (e.clientY - r.top - r.height / 2) * 0.25 + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
    document.querySelectorAll("[data-glow]").forEach(function (el) {
      el.addEventListener("mouseenter", function () { el.classList.add("is-glow"); });
      el.addEventListener("mouseleave", function () { el.classList.remove("is-glow"); });
    });
    document.querySelectorAll("[data-glare]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        el.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      });
    });
  }

  /* ===== PARALLAX (hero stage) ===== */
  function initParallax() {
    var nodes = document.querySelectorAll("[data-parallax]");
    if (!nodes.length || reduce || !finePointer) return;
    addLoop(function () {
      var dx = (ptr.x / window.innerWidth - 0.5) * 2;
      var dy = (ptr.y / window.innerHeight - 0.5) * 2;
      nodes.forEach(function (n) {
        var f = parseFloat(n.getAttribute("data-parallax")) || 0.05;
        n.style.transform = "translate(" + dx * f * 70 + "px," + dy * f * 70 + "px)";
      });
    });
  }

  /* ===== ROLE CYCLE ===== */
  function initRole() {
    var el = document.getElementById("role-cycle");
    if (!el || reduce) return;
    var roles = (el.getAttribute("data-roles") || "").split("|").filter(Boolean);
    if (roles.length < 2) return;
    el.style.transition = "opacity 0.3s";
    var i = 0;
    setInterval(function () {
      i = (i + 1) % roles.length;
      el.style.opacity = "0";
      setTimeout(function () { el.textContent = roles[i]; el.style.opacity = "1"; }, 300);
    }, 3000);
  }

  /* ===== HERO SPOKES ===== */
  function initSpokes() {
    var g = document.querySelector(".orbit__spokes");
    if (!g) return;
    var cx = 220, cy = 220, count = 30;
    var ns = "http://www.w3.org/2000/svg";
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2;
      var ln = document.createElementNS(ns, "line");
      ln.setAttribute("x1", String(cx + Math.cos(a) * 70));
      ln.setAttribute("y1", String(cy + Math.sin(a) * 70));
      ln.setAttribute("x2", String(cx + Math.cos(a) * 195));
      ln.setAttribute("y2", String(cy + Math.sin(a) * 195));
      g.appendChild(ln);
    }
  }

  /* ===== TERMINAL FEED ===== */
  function initTerminal() {
    var feed = document.getElementById("term-feed");
    if (!feed) return;
    var events = [
      ["linkedin.sync", "profile · midyarahmani"],
      ["exp.adaptavist", "Adaptavist · remote"],
      ["exp.cibc", "CIBC · Toronto"],
      ["exp.goldline", "Group of Gold Line · Markham"],
      ["edu.waterloo", "University of Waterloo · 2021–2023"],
      ["edu.york", "York University · 2011–2016"],
      ["locale.toronto", "Toronto, ON · Canada"],
      ["lang.set", "English · Persian"],
      ["signal.strong", "midya.ca · online"]
    ];
    var idx = 0;
    function push() {
      var ev = events[idx % events.length]; idx++;
      var li = document.createElement("li");
      var ms = String((Math.random() * 400) | 0).padStart(3, "0");
      li.innerHTML = "<time>+" + ms + "ms</time><code>" + ev[0] + "</code> " + ev[1];
      feed.insertBefore(li, feed.firstChild);
      while (feed.children.length > 8) feed.removeChild(feed.lastChild);
    }
    push(); push(); push();
    if (!reduce) setInterval(push, 1900);
  }

  /* ===== CANVAS: PARTICLE NETWORK (spatial-grid optimized) ===== */
  function initNet() {
    var canvas = document.getElementById("net");
    if (!canvas || !canvas.getContext || reduce) return;
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, DPR = 1, parts = [], link = 132;

    function num() {
      var w = window.innerWidth;
      if (w < 640) return 46;
      if (w < 1100) return 84;
      return 130;
    }
    function spawn() {
      parts = [];
      for (var i = 0, n = num(); i < n; i++) {
        parts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, r: Math.random() * 1.8 + 0.4 });
      }
    }
    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      spawn();
    }
    resize();
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 200); }, { passive: true });

    var hue = 180, fpsEl = document.getElementById("hud-fps"), frames = 0, last = performance.now();
    var cells = {}, cs = link;

    addLoop(function () {
      frames++;
      var now = performance.now();
      if (now - last >= 500) { if (fpsEl) fpsEl.textContent = "FPS " + Math.round((frames * 1000) / (now - last)); frames = 0; last = now; }
      hue = (hue + 0.4) % 360;

      ctx.fillStyle = "rgba(4,6,13,0.2)";
      ctx.fillRect(0, 0, W, H);

      var i, p;
      cells = {};
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        var dxm = ptr.x - p.x, dym = ptr.y - p.y, dm = Math.sqrt(dxm * dxm + dym * dym);
        if (ptr.has && dm < 170 && dm > 0) { p.vx -= (dxm / dm) * 0.018; p.vy -= (dym / dm) * 0.018; }
        p.x += p.vx; p.y += p.vy; p.vx *= 0.996; p.vy *= 0.996;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        p.x = Math.max(0, Math.min(W, p.x)); p.y = Math.max(0, Math.min(H, p.y));
        var key = ((p.x / cs) | 0) + "," + ((p.y / cs) | 0);
        (cells[key] || (cells[key] = [])).push(p);
      }

      ctx.lineWidth = 0.55;
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        var gx = (p.x / cs) | 0, gy = (p.y / cs) | 0;
        for (var ox = -1; ox <= 1; ox++) {
          for (var oy = -1; oy <= 1; oy++) {
            var bucket = cells[(gx + ox) + "," + (gy + oy)];
            if (!bucket) continue;
            for (var b = 0; b < bucket.length; b++) {
              var q = bucket[b];
              if (q === p || q.x < p.x) continue;
              var dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy);
              if (d < link) {
                ctx.strokeStyle = "rgba(0,240,255," + (1 - d / link) * 0.32 + ")";
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
              }
            }
          }
        }
      }
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        ctx.fillStyle = "hsla(" + ((hue + i * 2) % 360) + ",100%,68%,0.85)";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  /* ===== CANVAS: MATRIX RAIN ===== */
  function initRain() {
    var canvas = document.getElementById("rain");
    if (!canvas || !canvas.getContext || reduce || mqSmall.matches) return;
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, cols = [], charset = "01アイウエオｱｲｳｴｵAI{}[]<>/", colW = 15;
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
      cols = [];
      for (var i = 0, n = Math.ceil(W / colW); i < n; i++) cols.push({ x: i * colW, y: Math.random() * H, s: 2 + Math.random() * 4 });
    }
    resize();
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 200); }, { passive: true });
    ctx.font = "13px 'JetBrains Mono', monospace";
    addLoop(function () {
      ctx.fillStyle = "rgba(4,6,13,0.1)"; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < cols.length; i++) {
        var c = cols[i];
        ctx.fillStyle = Math.random() > 0.97 ? "#00f0ff" : "rgba(0,240,255,0.32)";
        ctx.fillText(charset[(Math.random() * charset.length) | 0], c.x, c.y);
        c.y += c.s;
        if (c.y > H) { c.y = 0; c.s = 2 + Math.random() * 5; }
      }
    });
  }

  /* ===== START ===== */
  function start() {
    initNav();
    initScroll();
    initHud();
    initCursor();
    initReveal();
    initScramble();
    initCounters();
    initInteractions();
    initParallax();
    initRole();
    initSpokes();
    initTerminal();
    initNet();
    initRain();
  }

  runBoot(start);
})();
