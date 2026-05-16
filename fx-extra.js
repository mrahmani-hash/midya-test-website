(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  var scrollCharge = 0;
  var lastScrollY = window.scrollY;
  var lastScrollT = performance.now();
  var meshBoost = 1;
  var bursts = [];
  var burstCanvas = document.getElementById("field-burst");
  var burstCtx = burstCanvas && burstCanvas.getContext ? burstCanvas.getContext("2d") : null;
  var flashEl = document.getElementById("scroll-flash");
  var ripplesRoot = document.getElementById("ripples");
  var hudScroll = document.getElementById("hud-scroll");
  var fxMesh = document.querySelector(".fx__mesh");
  var fxHex = document.querySelector(".fx__hexfield");
  var body = document.body;

  /* ========== ADVANCED REVEAL ========== */
  function initAdvancedReveal() {
    if (!("IntersectionObserver" in window)) return;

    document.querySelectorAll("[data-stagger]").forEach(function (container) {
      var kids = container.children;
      for (var i = 0; i < kids.length; i++) {
        kids[i].classList.add("reveal", "reveal--stagger");
        kids[i].style.setProperty("--reveal-i", String(i));
        if (!kids[i].hasAttribute("data-reveal")) kids[i].setAttribute("data-reveal", "");
      }
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          el.classList.add("is-visible");
          if (el.classList.contains("reveal--blast")) {
            el.classList.add("is-blast");
            spawnBurstAt(el);
            triggerFlash(0.35);
          }
          if (el.closest("[data-section]")) {
            body.classList.add("is-section-active");
            setTimeout(function () {
              body.classList.remove("is-section-active");
            }, 420);
          }
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    document.querySelectorAll("[data-reveal], .reveal--stagger").forEach(function (n) {
      if (!n.classList.contains("reveal")) n.classList.add("reveal");
      io.observe(n);
    });

    document.querySelectorAll("[data-section]").forEach(function (sec) {
      var secIo = new IntersectionObserver(
        function (entries) {
          if (!entries[0].isIntersecting) return;
          sec.classList.add("is-inview");
          spawnBurstAt(sec.querySelector(".band__hd") || sec);
          triggerFlash(0.55);
          if (audioOn) playBlip(880, 0.04);
        },
        { threshold: 0.22 }
      );
      secIo.observe(sec);
    });
  }

  /* ========== SCROLL PARALLAX & CHARGE ========== */
  function initScrollDynamics() {
    var bands = document.querySelectorAll(".band--fx");

    function onScroll() {
      var y = window.scrollY;
      var now = performance.now();
      var dt = Math.max(16, now - lastScrollT);
      var vel = Math.abs(y - lastScrollY) / dt;
      lastScrollY = y;
      lastScrollT = now;

      scrollCharge = Math.min(1, scrollCharge * 0.92 + vel * 0.08);
      meshBoost = 1 + scrollCharge * 1.8;
      body.style.setProperty("--scroll-charge", scrollCharge.toFixed(3));

      if (hudScroll) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        var p = h > 0 ? Math.round((y / h) * 100) : 0;
        hudScroll.textContent = "DEPTH " + p + "%";
      }

      if (fxMesh) {
        fxMesh.style.transform =
          "translateY(" + y * 0.06 + "px) scale(" + (1 + scrollCharge * 0.04) + ")";
      }
      if (fxHex) {
        fxHex.style.transform = "translateY(" + y * -0.04 + "px)";
      }

      bands.forEach(function (b) {
        var r = b.getBoundingClientRect();
        var center = r.top + r.height / 2 - window.innerHeight / 2;
        var offset = center * 0.04;
        b.style.setProperty("--parallax-y", offset + "px");
      });

      if (vel > 2.2 && Math.random() > 0.7) {
        triggerFlash(0.15);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ========== BURST CANVAS ========== */
  function resizeBurst() {
    if (!burstCanvas || !burstCtx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    burstCanvas.width = window.innerWidth * dpr;
    burstCanvas.height = window.innerHeight * dpr;
    burstCanvas.style.width = window.innerWidth + "px";
    burstCanvas.style.height = window.innerHeight + "px";
    burstCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnBurstAt(el) {
    if (!burstCtx || !el) return;
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var n = 28 + (Math.random() * 20) | 0;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 2 + Math.random() * 7;
      bursts.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        hue: Math.random() > 0.5 ? 170 : 200 + Math.random() * 40,
        r: 1 + Math.random() * 2.5
      });
    }
  }

  function stepBursts() {
    if (!burstCtx) return;
    burstCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (var i = bursts.length - 1; i >= 0; i--) {
      var p = bursts[i];
      p.x += p.vx * meshBoost;
      p.y += p.vy * meshBoost;
      p.life -= 0.028;
      if (p.life <= 0) {
        bursts.splice(i, 1);
        continue;
      }
      burstCtx.fillStyle = "hsla(" + p.hue + ",100%,65%," + p.life * 0.85 + ")";
      burstCtx.beginPath();
      burstCtx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      burstCtx.fill();
    }
    requestAnimationFrame(stepBursts);
  }

  function initBurstCanvas() {
    if (!burstCanvas) return;
    resizeBurst();
    window.addEventListener("resize", resizeBurst);
    requestAnimationFrame(stepBursts);
  }

  function triggerFlash(intensity) {
    if (!flashEl) return;
    flashEl.style.setProperty("--flash-i", String(intensity || 0.4));
    flashEl.classList.remove("is-flash");
    void flashEl.offsetWidth;
    flashEl.classList.add("is-flash");
  }

  /* ========== CLICK RIPPLES ========== */
  function initRipples() {
    if (!ripplesRoot) return;
    document.addEventListener(
      "click",
      function (e) {
        var ripple = document.createElement("span");
        ripple.className = "ripple";
        ripple.style.left = e.clientX + "px";
        ripple.style.top = e.clientY + "px";
        ripplesRoot.appendChild(ripple);
        setTimeout(function () {
          ripple.remove();
        }, 900);
        if (audioOn) playBlip(520 + Math.random() * 200, 0.03);
      },
      { passive: true }
    );
  }

  /* ========== AUDIO ========== */
  var audioCtx = null;
  var masterGain = null;
  var sfxGain = null;
  var ambientNodes = [];
  var audioOn = false;
  var sfxOn = true;
  var arpTimer = null;

  function playBlip(freq, gain) {
    if (!audioCtx || !sfxGain || !sfxOn || !audioOn) return;
    var t = audioCtx.currentTime;
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g);
    g.connect(sfxGain);
    o.start(t);
    o.stop(t + 0.14);
  }

  function startAmbient() {
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    var freqs = [55, 82.5, 110, 164.81];
    freqs.forEach(function (f, i) {
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.018 + i * 0.004, t + 2);
      o.connect(g);
      g.connect(masterGain);
      o.start(t);
      ambientNodes.push(o);
    });

    var arpNotes = [220, 261.63, 329.63, 392, 493.88, 587.33];
    var arpIdx = 0;
    arpTimer = setInterval(function () {
      if (!audioOn) return;
      playBlip(arpNotes[arpIdx % arpNotes.length] * (Math.random() > 0.85 ? 2 : 1), 0.025);
      arpIdx++;
    }, 1400);
  }

  function stopAmbient() {
    ambientNodes.forEach(function (o) {
      try {
        o.stop();
      } catch (e) {}
    });
    ambientNodes = [];
    if (arpTimer) clearInterval(arpTimer);
    arpTimer = null;
  }

  function initAudio() {
    var toggle = document.getElementById("audio-toggle");
    var controls = document.getElementById("audio-controls");
    var vol = document.getElementById("audio-volume");
    var sfxBtn = document.getElementById("audio-sfx-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", function () {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        sfxGain = audioCtx.createGain();
        masterGain.connect(audioCtx.destination);
        sfxGain.connect(audioCtx.destination);
        masterGain.gain.value = (vol ? vol.value : 35) / 400;
        sfxGain.gain.value = 0.12;
      }
      if (audioCtx.state === "suspended") audioCtx.resume();

      audioOn = !audioOn;
      toggle.setAttribute("aria-pressed", audioOn ? "true" : "false");
      toggle.querySelector(".audio-panel__label").textContent = audioOn
        ? "AUDIO LIVE"
        : "ACTIVATE AUDIO";
      toggle.classList.toggle("is-live", audioOn);
      if (controls) controls.hidden = !audioOn;

      if (audioOn) {
        startAmbient();
        playBlip(660, 0.08);
        triggerFlash(0.5);
      } else stopAmbient();
    });

    if (vol) {
      vol.addEventListener("input", function () {
        if (masterGain) masterGain.gain.value = vol.value / 400;
      });
    }

    if (sfxBtn) {
      sfxBtn.addEventListener("click", function () {
        sfxOn = !sfxOn;
        sfxBtn.setAttribute("aria-pressed", sfxOn ? "true" : "false");
        sfxBtn.textContent = sfxOn ? "SFX ON" : "SFX OFF";
      });
    }

    document.querySelectorAll("a, button").forEach(function (el) {
      el.addEventListener(
        "mouseenter",
        function () {
          if (!audioOn) return;
          playBlip(400 + Math.random() * 300, 0.015);
        },
        { passive: true }
      );
    });
  }

  /* ========== KONAMI ========== */
  function initKonami() {
    var seq = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
    var pos = 0;
    document.addEventListener("keydown", function (e) {
      if (e.keyCode === seq[pos]) {
        pos++;
        if (pos === seq.length) {
          pos = 0;
          body.classList.add("is-overdrive");
          triggerFlash(0.9);
          for (var i = 0; i < 5; i++) spawnBurstAt(document.body);
          playBlip(1200, 0.1);
          setTimeout(function () {
            body.classList.remove("is-overdrive");
          }, 4000);
        }
      } else pos = 0;
    });
  }

  function startFx() {
    initAdvancedReveal();
    initScrollDynamics();
    initBurstCanvas();
    initRipples();
    initAudio();
    initKonami();
  }

  function boot() {
    var bootEl = document.getElementById("boot");
    if (bootEl && !bootEl.classList.contains("is-done")) {
      var obs = new MutationObserver(function () {
        if (bootEl.classList.contains("is-done")) {
          obs.disconnect();
          startFx();
        }
      });
      obs.observe(bootEl, { attributes: true, attributeFilter: ["class"] });
    } else {
      startFx();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
