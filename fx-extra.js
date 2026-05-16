(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  var scrollCharge = 0;
  var lastScrollY = window.scrollY;
  var lastScrollT = performance.now();
  var meshBoost = 1;
  var bursts = [];
  var overlays = [];
  var debris = [];
  var burstCanvas = document.getElementById("field-burst");
  var burstCtx = burstCanvas && burstCanvas.getContext ? burstCanvas.getContext("2d") : null;
  var debrisCanvas = document.getElementById("field-debris");
  var debrisCtx = debrisCanvas && debrisCanvas.getContext ? debrisCanvas.getContext("2d") : null;
  var flashEl = document.getElementById("scroll-flash");
  var ripplesRoot = document.getElementById("ripples");
  var hudScroll = document.getElementById("hud-scroll");
  var fxMesh = document.querySelector(".fx__mesh");
  var fxHex = document.querySelector(".fx__hexfield");
  var body = document.body;

  var SHAPE_KINDS = ["dot", "tri", "hex", "diamond", "line", "grid"];

  function pickShape() {
    var r = Math.random();
    if (r < 0.12) return "dot";
    if (r < 0.32) return "tri";
    if (r < 0.52) return "hex";
    if (r < 0.72) return "diamond";
    if (r < 0.88) return "line";
    return "grid";
  }

  function burstCount(intensity) {
    var base = 36 + (Math.random() * 28) | 0;
    return Math.min(140, Math.floor(base * (1 + scrollCharge * 2.2) * intensity));
  }

  /* ========== ADVANCED REVEAL ========== */
  function initAdvancedReveal() {
    if (!("IntersectionObserver" in window)) return;

    document.querySelectorAll("[data-stagger]").forEach(function (container) {
      var kids = container.children;
      for (var i = 0; i < kids.length; i++) {
        kids[i].classList.add("reveal", "reveal--stagger", "reveal--geo");
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
            spawnBurstAt(el, 1.15);
            triggerFlash(0.4);
          }
          if (el.closest("[data-section]")) {
            body.classList.add("is-section-active");
            setTimeout(function () {
              body.classList.remove("is-section-active");
            }, 480);
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
          var hd = sec.querySelector(".band__hd");
          if (hd) hd.classList.add("is-frame-live");
          spawnBurstAt(hd || sec, 1.65);
          spawnSpokeOverlay(sec);
          spawnGridOverlay(sec);
          triggerFlash(0.62);
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
    var scrollBurstCooldown = 0;

    function onScroll() {
      var y = window.scrollY;
      var now = performance.now();
      var dt = Math.max(16, now - lastScrollT);
      var vel = Math.abs(y - lastScrollY) / dt;
      lastScrollY = y;
      lastScrollT = now;

      scrollCharge = Math.min(1, scrollCharge * 0.9 + vel * 0.1);
      meshBoost = 1 + scrollCharge * 2.4;
      body.style.setProperty("--scroll-charge", scrollCharge.toFixed(3));

      if (hudScroll) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        var p = h > 0 ? Math.round((y / h) * 100) : 0;
        hudScroll.textContent = "DEPTH " + p + "%";
      }

      if (fxMesh) {
        fxMesh.style.transform =
          "translateY(" +
          y * 0.06 +
          "px) scale(" +
          (1 + scrollCharge * 0.06) +
          ") rotate(" +
          scrollCharge * 0.8 +
          "deg)";
      }
      if (fxHex) {
        fxHex.style.transform =
          "translateY(" + y * -0.04 + "px) scale(" + (1 + scrollCharge * 0.08) + ")";
        fxHex.style.opacity = String(0.55 + scrollCharge * 0.45);
      }

      bands.forEach(function (b) {
        var r = b.getBoundingClientRect();
        var center = r.top + r.height / 2 - window.innerHeight / 2;
        var offset = center * 0.04;
        b.style.setProperty("--parallax-y", offset + "px");
      });

      if (vel > 1.8 && now > scrollBurstCooldown) {
        var chance = 0.35 + scrollCharge * 0.45;
        if (Math.random() < chance) {
          scrollBurstCooldown = now + 90;
          spawnScrollBurst(
            window.innerWidth * (0.25 + Math.random() * 0.5),
            window.innerHeight * (0.2 + Math.random() * 0.55)
          );
        }
      }

      if (vel > 2.8) {
        triggerFlash(0.12 + scrollCharge * 0.22);
        if (Math.random() > 0.55) spawnVelocityGrid();
      }

      if (vel > 4.2 && Math.random() > 0.65) {
        spawnDebrisShard(
          window.innerWidth * Math.random(),
          window.innerHeight * 0.35 + Math.random() * window.innerHeight * 0.35
        );
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

  function resizeDebris() {
    if (!debrisCanvas || !debrisCtx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    debrisCanvas.width = window.innerWidth * dpr;
    debrisCanvas.height = window.innerHeight * dpr;
    debrisCanvas.style.width = window.innerWidth + "px";
    debrisCanvas.style.height = window.innerHeight + "px";
    debrisCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticle(cx, cy, intensity, wire) {
    var a = Math.random() * Math.PI * 2;
    var sp = (2.5 + Math.random() * 9) * (0.85 + scrollCharge * 0.65) * intensity;
    return {
      x: cx + (Math.random() - 0.5) * 12,
      y: cy + (Math.random() - 0.5) * 12,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 1,
      hue: Math.random() > 0.45 ? 170 : 195 + Math.random() * 45,
      size: 2.5 + Math.random() * 5.5,
      rot: Math.random() * Math.PI * 2,
      rotSpd: (Math.random() - 0.5) * 0.22,
      kind: pickShape(),
      wire: wire || Math.random() > 0.55
    };
  }

  function spawnBurstAt(el, intensity) {
    if (!burstCtx || !el) return;
    intensity = intensity || 1;
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var n = burstCount(intensity);
    var i;
    for (i = 0; i < n; i++) {
      bursts.push(makeParticle(cx, cy, intensity, i % 3 === 0));
    }
    spawnSpokeOverlayAt(cx, cy, 0.7 + intensity * 0.35);
    spawnGridOverlayAt(cx, cy, 0.55 + intensity * 0.3);
    for (i = 0; i < 4; i++) {
      spawnDebrisShard(cx, cy);
    }
  }

  function spawnScrollBurst(x, y) {
    if (!burstCtx) return;
    var n = Math.floor(12 + scrollCharge * 22);
    var i;
    for (i = 0; i < n; i++) {
      bursts.push(makeParticle(x, y, 0.65 + scrollCharge * 0.5, true));
    }
    if (scrollCharge > 0.35) spawnSpokeOverlayAt(x, y, 0.35 + scrollCharge * 0.4);
  }

  function spawnSpokeOverlay(sec) {
    var r = sec.getBoundingClientRect();
    spawnSpokeOverlayAt(r.left + r.width / 2, r.top + r.height * 0.25, 1);
  }

  function spawnGridOverlay(sec) {
    var r = sec.getBoundingClientRect();
    spawnGridOverlayAt(r.left + r.width / 2, r.top + r.height * 0.35, 0.9);
  }

  function spawnSpokeOverlayAt(cx, cy, power) {
    overlays.push({
      type: "spokes",
      cx: cx,
      cy: cy,
      life: 1,
      power: power,
      count: 10 + (power * 8) | 0,
      rot: Math.random() * Math.PI
    });
  }

  function spawnGridOverlayAt(cx, cy, power) {
    overlays.push({
      type: "grid",
      cx: cx,
      cy: cy,
      life: 1,
      power: power,
      span: 40 + power * 70
    });
  }

  function spawnVelocityGrid() {
    if (!burstCtx) return;
    overlays.push({
      type: "grid",
      cx: window.innerWidth * Math.random(),
      cy: window.innerHeight * Math.random(),
      life: 0.85,
      power: 0.45 + scrollCharge * 0.55,
      span: 30 + scrollCharge * 50
    });
  }

  function spawnDebrisShard(x, y) {
    if (!debrisCtx) return;
    var kinds = ["tri", "hex", "diamond", "line"];
    debris.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 3,
      vy: -1 - Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      rotSpd: (Math.random() - 0.5) * 0.12,
      life: 1,
      size: 4 + Math.random() * 10,
      hue: Math.random() > 0.5 ? 170 : 205,
      kind: kinds[(Math.random() * kinds.length) | 0]
    });
  }

  function drawShape(ctx, p) {
    var s = p.size * p.life * (p.kind === "dot" ? 0.55 : 1);
    var alpha = p.life * 0.88;
    ctx.strokeStyle = "hsla(" + p.hue + ",100%,68%," + alpha + ")";
    ctx.fillStyle = "hsla(" + p.hue + ",100%,62%," + (alpha * 0.75) + ")";
    ctx.lineWidth = p.wire ? 1.4 : 1;

    if (p.kind === "dot") {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, s * 0.45), 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (p.kind === "line") {
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(s, 0);
      ctx.stroke();
      return;
    }

    if (p.kind === "grid") {
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(s, 0);
      ctx.moveTo(0, -s);
      ctx.lineTo(0, s);
      ctx.stroke();
      ctx.strokeRect(-s * 0.6, -s * 0.6, s * 1.2, s * 1.2);
      return;
    }

    ctx.beginPath();
    if (p.kind === "tri") {
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.92, s * 0.55);
      ctx.lineTo(-s * 0.92, s * 0.55);
    } else if (p.kind === "diamond") {
      ctx.moveTo(0, -s);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s, 0);
    } else {
      var i;
      for (i = 0; i < 6; i++) {
        var ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
        var px = Math.cos(ang) * s;
        var py = Math.sin(ang) * s;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    if (p.wire) ctx.stroke();
    else {
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawOverlays(ctx) {
    var i;
    for (i = overlays.length - 1; i >= 0; i--) {
      var o = overlays[i];
      o.life -= 0.034;
      if (o.life <= 0) {
        overlays.splice(i, 1);
        continue;
      }
      var a = o.life * o.power * 0.55;
      ctx.save();
      ctx.translate(o.cx, o.cy);
      if (o.type === "spokes") {
        ctx.rotate(o.rot + (1 - o.life) * 0.4);
        var j;
        var spokes = o.count;
        var rad = (60 + o.power * 90) * (1.1 - o.life * 0.35);
        ctx.strokeStyle = "rgba(0,255,232," + a + ")";
        ctx.lineWidth = 1;
        for (j = 0; j < spokes; j++) {
          var ang = (j / spokes) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
          ctx.stroke();
        }
      } else {
        var span = o.span * (0.6 + (1 - o.life) * 0.9);
        ctx.strokeStyle = "rgba(0,180,255," + a + ")";
        ctx.lineWidth = 0.8;
        var step = 14;
        var gx;
        for (gx = -span; gx <= span; gx += step) {
          ctx.beginPath();
          ctx.moveTo(gx, -span);
          ctx.lineTo(gx, span);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-span, gx);
          ctx.lineTo(span, gx);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  function stepBursts() {
    if (!burstCtx) return;
    burstCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    drawOverlays(burstCtx);

    var i;
    for (i = bursts.length - 1; i >= 0; i--) {
      var p = bursts[i];
      p.x += p.vx * meshBoost;
      p.y += p.vy * meshBoost;
      p.rot += p.rotSpd;
      p.life -= 0.024;
      if (p.life <= 0) {
        bursts.splice(i, 1);
        continue;
      }
      burstCtx.save();
      burstCtx.translate(p.x, p.y);
      burstCtx.rotate(p.rot);
      drawShape(burstCtx, p);
      burstCtx.restore();
    }
    requestAnimationFrame(stepBursts);
  }

  function stepDebris() {
    if (!debrisCtx) return;
    debrisCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    var i;
    for (i = debris.length - 1; i >= 0; i--) {
      var d = debris[i];
      d.x += d.vx * (0.8 + scrollCharge * 0.6);
      d.y += d.vy * (0.8 + scrollCharge * 0.6);
      d.vy += 0.06;
      d.rot += d.rotSpd;
      d.life -= 0.012;
      if (d.life <= 0 || d.y > window.innerHeight + 40) {
        debris.splice(i, 1);
        continue;
      }
      debrisCtx.save();
      debrisCtx.translate(d.x, d.y);
      debrisCtx.rotate(d.rot);
      drawShape(debrisCtx, {
        kind: d.kind,
        size: d.size,
        life: d.life,
        hue: d.hue,
        wire: true
      });
      debrisCtx.restore();
    }
    requestAnimationFrame(stepDebris);
  }

  function initBurstCanvas() {
    if (!burstCanvas) return;
    resizeBurst();
    window.addEventListener("resize", resizeBurst);
    requestAnimationFrame(stepBursts);
  }

  function initDebrisCanvas() {
    if (!debrisCanvas) return;
    resizeDebris();
    window.addEventListener("resize", resizeDebris);
    requestAnimationFrame(stepDebris);
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
        ripple.className = "ripple ripple--geo";
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

  /* ========== AUDIO — Tron-style procedural score (D minor, ~120 BPM) ========== */
  var audioCtx = null;
  var masterGain = null;
  var sfxGain = null;
  var musicBus = null;
  var musicNodes = [];
  var audioOn = false;
  var sfxOn = true;

  var TRON_BPM = 120;
  var TRON_ROOT = 73.42; /* D2 */
  var TRON_SCALE = [0, 2, 3, 5, 7, 8, 10];
  var TRON_ARP = [0, 3, 5, 7, 10, 7, 5, 3, 0, 5, 8, 10, 12, 10, 8, 5];
  var TRON_BASS = [0, 0, 4, 4, 0, 0, 4, 4];
  var musicSchedulerId = null;
  var musicStep = 0;
  var musicNext = 0;
  var padFilter = null;
  var padLfo = null;
  var duckGain = null;

  function scaleFreq(degree, baseOctave) {
    var len = TRON_SCALE.length;
    var idx = ((degree % len) + len) % len;
    var oct = (baseOctave || 0) + Math.floor(degree / len);
    return TRON_ROOT * Math.pow(2, (TRON_SCALE[idx] + oct * 12) / 12);
  }

  function playBlip(freq, gain, wave) {
    if (!audioCtx || !sfxGain || !sfxOn || !audioOn) return;
    var t = audioCtx.currentTime;
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    var f = audioCtx.createBiquadFilter();
    o.type = wave || "square";
    o.frequency.setValueAtTime(freq, t);
    f.type = "lowpass";
    f.frequency.setValueAtTime(3200, t);
    f.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(f);
    f.connect(g);
    g.connect(sfxGain);
    o.start(t);
    o.stop(t + 0.1);
  }

  function trackNode(node) {
    musicNodes.push(node);
    return node;
  }

  function playKick(time, intensity) {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(140, time);
    o.frequency.exponentialRampToValueAtTime(48, time + 0.11);
    var vol = 0.22 + intensity * 0.12;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
    o.connect(g);
    g.connect(musicBus);
    o.start(time);
    o.stop(time + 0.16);
    if (duckGain) {
      duckGain.gain.cancelScheduledValues(time);
      duckGain.gain.setValueAtTime(1, time);
      duckGain.gain.setTargetAtTime(0.62, time, 0.018);
      duckGain.gain.setTargetAtTime(1, time + 0.1, 0.08);
    }
  }

  function playHat(time, intensity) {
    var len = Math.floor(audioCtx.sampleRate * 0.04);
    var buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    var data = buf.getChannelData(0);
    var i;
    for (i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = audioCtx.createBufferSource();
    src.buffer = buf;
    var hp = audioCtx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.035 + intensity * 0.02, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
    src.connect(hp);
    hp.connect(g);
    g.connect(musicBus);
    src.start(time);
    src.stop(time + 0.05);
  }

  function playBass(time, degree, intensity) {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    var lp = audioCtx.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(scaleFreq(degree, 1), time);
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(420 + intensity * 380, time);
    lp.Q.value = 2;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.11 + intensity * 0.06, time + 0.012);
    g.gain.setValueAtTime(0.09 + intensity * 0.05, time + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
    o.connect(lp);
    lp.connect(g);
    g.connect(musicBus);
    o.start(time);
    o.stop(time + 0.22);
  }

  function playArp(time, degree, intensity) {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    var lp = audioCtx.createBiquadFilter();
    o.type = "square";
    o.frequency.setValueAtTime(scaleFreq(degree, 3), time);
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1800 + intensity * 2200, time);
    lp.Q.value = 6;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.045 + intensity * 0.035, time + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);
    o.connect(lp);
    lp.connect(g);
    g.connect(musicBus);
    o.start(time);
    o.stop(time + 0.13);
  }

  function startPads(time) {
    var mix = audioCtx.createGain();
    mix.gain.value = 0.14;
    padFilter = audioCtx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 520;
    padFilter.Q.value = 0.7;
    padLfo = audioCtx.createOscillator();
    var lfoGain = audioCtx.createGain();
    padLfo.type = "sine";
    padLfo.frequency.value = 0.07;
    lfoGain.gain.value = 380;
    padLfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    mix.connect(padFilter);
    padFilter.connect(duckGain || musicBus);

    [0, 3, 7].forEach(function (deg, i) {
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = "sawtooth";
      o.frequency.value = scaleFreq(deg, 2);
      o.detune.value = i === 0 ? -8 : i === 1 ? 6 : -3;
      g.gain.value = 0.22 - i * 0.04;
      o.connect(g);
      g.connect(mix);
      o.start(time);
      trackNode(o);
    });
    padLfo.start(time);
    trackNode(padLfo);
    trackNode(mix);
  }

  function scheduleMusicStep() {
    if (!audioCtx || !audioOn) return;
    var sixteenth = 60 / TRON_BPM / 4;
    var horizon = audioCtx.currentTime + 0.12;
    var intensity = 0.35 + scrollCharge * 0.65;

    while (musicNext < horizon) {
      var t = musicNext;
      var step = musicStep % 16;
      var beat = step % 4;

      if (beat === 0) playKick(t, intensity);
      if (step % 2 === 1) playHat(t, intensity * 0.85);
      if (step % 2 === 0) playBass(t, TRON_BASS[step % TRON_BASS.length], intensity);
      playArp(t, TRON_ARP[step % TRON_ARP.length], intensity);

      musicStep++;
      musicNext += sixteenth;
    }

    if (musicSchedulerId) clearTimeout(musicSchedulerId);
    musicSchedulerId = setTimeout(scheduleMusicStep, 28);
  }

  function startAmbient() {
    if (!audioCtx) return;
    var t = audioCtx.currentTime + 0.05;

    duckGain = audioCtx.createGain();
    duckGain.gain.value = 1;
    duckGain.connect(masterGain);

    musicBus = audioCtx.createGain();
    musicBus.gain.setValueAtTime(0.0001, t);
    musicBus.gain.linearRampToValueAtTime(0.85, t + 1.8);
    musicBus.connect(duckGain);

    var delay = audioCtx.createDelay(0.6);
    delay.delayTime.value = sixteenthDelay();
    var fb = audioCtx.createGain();
    fb.gain.value = 0.32;
    var delayMix = audioCtx.createGain();
    delayMix.gain.value = 0.38;
    musicBus.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(delayMix);
    delayMix.connect(duckGain);
    trackNode(delay);
    trackNode(fb);
    trackNode(delayMix);

    startPads(t);
    musicStep = 0;
    musicNext = t;
    scheduleMusicStep();
  }

  function sixteenthDelay() {
    return 60 / TRON_BPM / 4 * 3;
  }

  function stopAmbient() {
    if (musicSchedulerId) {
      clearTimeout(musicSchedulerId);
      musicSchedulerId = null;
    }
    musicNodes.forEach(function (node) {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    musicNodes = [];
    if (padLfo) {
      try {
        padLfo.stop();
      } catch (e2) {}
    }
    padFilter = null;
    padLfo = null;
    if (duckGain) {
      try {
        duckGain.disconnect();
      } catch (e3) {}
    }
    duckGain = null;
    if (musicBus) {
      try {
        musicBus.disconnect();
      } catch (e4) {}
    }
    musicBus = null;
    musicStep = 0;
    musicNext = 0;
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
        sfxGain.gain.value = 0.1;
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      audioOn = !audioOn;
      toggle.setAttribute("aria-pressed", audioOn ? "true" : "false");
      toggle.querySelector(".audio-panel__label").textContent = audioOn
        ? "GRID LIVE"
        : "ACTIVATE SOUNDTRACK";
      toggle.classList.toggle("is-live", audioOn);
      if (controls) controls.hidden = !audioOn;

      if (audioOn) {
        startAmbient();
        playBlip(587.33, 0.07, "square");
        triggerFlash(0.5);
      } else {
        stopAmbient();
      }
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
          playBlip(440 + Math.random() * 280, 0.012, "square");
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
          for (var i = 0; i < 8; i++) {
            spawnBurstAt(document.body, 1.2);
          }
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
    initDebrisCanvas();
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
