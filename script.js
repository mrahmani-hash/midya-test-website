(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  var userEmail = ["midyarahmani", "icloud.com"].join("@");
  document.querySelectorAll("[data-email-link]").forEach(function (el) {
    el.href = "mailto:" + userEmail;
    el.textContent = userEmail;
  });

  /* ========== BOOT ========== */
  var boot = document.getElementById("boot");
  var bootFill = document.getElementById("boot-fill");
  var bootLog = document.getElementById("boot-log");
  var bootLines = [
    "LOADING PROFILE SIGNAL…",
    "SYNC EDUCATION LAYER…",
    "MOUNT EXPERIENCE MAP…",
    "INDEX INTEREST STREAM…",
    "CALIBRATING AI CHANNEL…",
    "UPLINK READY."
  ];

  function runBoot(cb) {
    if (reduce || !boot) {
      if (boot) boot.classList.add("is-done");
      if (cb) cb();
      return;
    }
    var p = 0;
    var line = 0;
    var iv = setInterval(function () {
      p += 4 + Math.random() * 8;
      if (p > 100) p = 100;
      if (bootFill) bootFill.style.width = p + "%";
      if (bootLog && p > line * 16 && line < bootLines.length) {
        bootLog.textContent = bootLines[line];
        line++;
      }
      if (p >= 100) {
        clearInterval(iv);
        setTimeout(function () {
          boot.classList.add("is-done");
          if (cb) cb();
        }, 400);
      }
    }, 70);
  }

  /* ========== NAV ========== */
  var navBtn = document.querySelector(".nav__btn");
  var navDrawer = document.getElementById("nav-drawer");
  if (navBtn && navDrawer) {
    navBtn.addEventListener("click", function () {
      var open = navDrawer.classList.toggle("is-open");
      navBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navDrawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navDrawer.classList.remove("is-open");
        navBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ========== HUD ========== */
  var hudHash = document.getElementById("hud-hash");
  var hudTick = document.getElementById("hud-tick");
  var hudFps = document.getElementById("hud-fps");
  var hudMouse = document.getElementById("hud-mouse");
  var t0 = performance.now();

  function updateHud() {
    if (hudHash) {
      hudHash.textContent =
        "0x" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    }
    if (hudTick) {
      hudTick.textContent = "T+" + ((performance.now() - t0) / 1000).toFixed(3);
    }
  }

  if (!reduce) setInterval(updateHud, 140);
  updateHud();

  /* ========== SCROLL PROGRESS ========== */
  var scrollProg = document.getElementById("scroll-prog");
  function onScroll() {
    if (!scrollProg) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? (window.scrollY / h) * 100 : 0;
    scrollProg.style.width = p + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ========== CURSOR ========== */
  var cursor = document.getElementById("cursor");
  var mx = 0;
  var my = 0;
  var cx = 0;
  var cy = 0;

  if (cursor && !reduce && window.matchMedia("(pointer: fine)").matches) {
    document.addEventListener(
      "mousemove",
      function (e) {
        mx = e.clientX;
        my = e.clientY;
        if (hudMouse) hudMouse.textContent = mx + "," + my;
      },
      { passive: true }
    );
    document.addEventListener("mousedown", function () {
      cursor.classList.add("is-click");
    });
    document.addEventListener("mouseup", function () {
      cursor.classList.remove("is-click");
    });
    function cursorRaf() {
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      cursor.style.left = cx + "px";
      cursor.style.top = cy + "px";
      requestAnimationFrame(cursorRaf);
    }
    requestAnimationFrame(cursorRaf);
  }

  /* ========== REVEAL ========== */
  function initReveal() {
    if (!reduce && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add("is-visible");
              io.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
      );
      document.querySelectorAll("[data-reveal]").forEach(function (n) {
        io.observe(n);
      });
    } else {
      document.querySelectorAll("[data-reveal]").forEach(function (n) {
        n.classList.add("is-visible");
      });
    }
  }

  /* ========== SCRAMBLE ========== */
  function initScramble() {
    var el = document.getElementById("hero-scramble");
    if (!el) return;
    var finalText = el.textContent.trim();
    var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%&";
    if (reduce) {
      el.textContent = finalText;
      return;
    }
    var frame = 0;
    var max = 52;
    function step() {
      frame++;
      var out = "";
      for (var i = 0; i < finalText.length; i++) {
        var ch = finalText[i];
        if (" ,.—".indexOf(ch) >= 0) {
          out += ch;
          continue;
        }
        if (frame > max * (i / Math.max(finalText.length, 1))) out += ch;
        else out += charset[(Math.random() * charset.length) | 0];
      }
      el.textContent = out;
      if (frame < max + 12) requestAnimationFrame(step);
      else el.textContent = finalText;
    }
    requestAnimationFrame(step);
  }

  /* ========== COUNTERS ========== */
  function initCounters() {
    var stats = document.getElementById("hero-stats");
    if (!stats || reduce) return;
    var io = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        stats.querySelectorAll("[data-count]").forEach(function (n) {
          var target = parseInt(n.getAttribute("data-count"), 10);
          var start = performance.now();
          function tick(now) {
            var t = Math.min(1, (now - start) / 1400);
            var eased = 1 - Math.pow(1 - t, 3);
            n.textContent = String(Math.round(target * eased));
            if (t < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.3 }
    );
    io.observe(stats);
  }

  /* ========== TILT + MAGNETIC + GLOW ========== */
  function bindTilt(el) {
    if (reduce) return;
    var max = 12;
    el.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        "perspective(800px) rotateY(" +
        px * max +
        "deg) rotateX(" +
        -py * max +
        "deg)";
    });
    el.addEventListener("mouseleave", function () {
      el.style.transform = "";
    });
  }

  function bindMagnetic(el) {
    if (reduce) return;
    el.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      el.style.transform =
        "translate(" +
        (e.clientX - r.left - r.width / 2) * 0.28 +
        "px," +
        (e.clientY - r.top - r.height / 2) * 0.28 +
        "px)";
    });
    el.addEventListener("mouseleave", function () {
      el.style.transform = "";
    });
  }

  function bindGlow(el) {
    if (reduce) return;
    el.addEventListener("mouseenter", function () {
      el.classList.add("is-glow");
    });
    el.addEventListener("mouseleave", function () {
      el.classList.remove("is-glow");
    });
  }

  document.querySelectorAll("[data-tilt]").forEach(bindTilt);
  document.querySelectorAll("[data-magnetic]").forEach(bindMagnetic);
  document.querySelectorAll("[data-glow]").forEach(bindGlow);

  /* ========== PARALLAX ========== */
  var parallax = document.querySelector(".hero__glow");
  if (parallax && !reduce) {
    document.addEventListener(
      "mousemove",
      function (e) {
        var x = (e.clientX / window.innerWidth - 0.5) * 2;
        var y = (e.clientY / window.innerHeight - 0.5) * 2;
        parallax.style.transform =
          "translate(" + x * 50 + "px," + y * 40 + "px) scale(1.08)";
      },
      { passive: true }
    );
  }

  /* ========== HERO SVG SPOKES ========== */
  function initSpokes() {
    var g = document.querySelector(".hero__spokes");
    if (!g) return;
    var cx = 200;
    var cy = 200;
    var count = 24;
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2;
      var r1 = 50;
      var r2 = 155;
      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(cx + Math.cos(a) * r1));
      line.setAttribute("y1", String(cy + Math.sin(a) * r1));
      line.setAttribute("x2", String(cx + Math.cos(a) * r2));
      line.setAttribute("y2", String(cy + Math.sin(a) * r2));
      g.appendChild(line);
    }
    if (!reduce) {
      var rot = 0;
      function spin() {
        rot += 0.15;
        g.setAttribute("transform", "rotate(" + rot + " " + cx + " " + cy + ")");
        requestAnimationFrame(spin);
      }
      requestAnimationFrame(spin);
    }
  }

  /* ========== TERMINAL FEED ========== */
  var termEvents = [
    ["linkedin.sync", "profile · midyarahmani"],
    ["cert.acp120", "Atlassian Cloud Admin"],
    ["exp.adaptavist", "Senior Consultant · remote"],
    ["exp.cibc", "Senior Consultant · awards"],
    ["edu.waterloo", "MSc · 2021–2023"],
    ["edu.york", "BCom IT · 2011–2016"],
    ["locale.toronto", "Toronto, ON"],
    ["award.impact", "CIBC Impact Award"],
    ["interest.peak", "basketball · courtside"],
    ["interest.markets", "stocks · investing · finance"],
    ["hobby.crypto", "crypto · personal research"],
    ["signal.strong", "midya.ca · online"]
  ];

  function initTerminal() {
    var feed = document.getElementById("term-feed");
    if (!feed) return;
    var idx = 0;
    function pushLine() {
      var ev = termEvents[idx % termEvents.length];
      idx++;
      var li = document.createElement("li");
      var ms = String(Math.floor(Math.random() * 400)).padStart(3, "0");
      li.innerHTML =
        "<time>+" +
        ms +
        "ms</time><code>" +
        ev[0] +
        "</code> " +
        ev[1];
      feed.insertBefore(li, feed.firstChild);
      while (feed.children.length > 8) feed.removeChild(feed.lastChild);
    }
    pushLine();
    if (!reduce) setInterval(pushLine, 1800);
  }

  /* ========== CANVAS MESH ========== */
  function initMesh() {
    var canvas = document.getElementById("field");
    if (!canvas || !canvas.getContext) return null;
    var ctx = canvas.getContext("2d");
    var W = 0;
    var H = 0;
    var DPR = 1;
    var particles = [];
    var mouse = { x: -9999, y: -9999 };

    function count() {
      if (window.innerWidth < 640) return 40;
      if (window.innerWidth < 1024) return 75;
      return 120;
    }

    function spawn() {
      particles = [];
      var n = count();
      for (var i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.7,
          vy: (Math.random() - 0.5) * 0.7,
          r: Math.random() * 2 + 0.3
        });
      }
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      spawn();
    }

    resize();
    window.addEventListener("resize", resize);

    if (!reduce) {
      document.addEventListener(
        "mousemove",
        function (e) {
          mouse.x = e.clientX;
          mouse.y = e.clientY;
        },
        { passive: true }
      );
    }

    var linkDist = 130;
    var hue = 0;
    var lastFps = performance.now();
    var frames = 0;

    function scrollBoost() {
      var c = parseFloat(
        getComputedStyle(document.body).getPropertyValue("--scroll-charge") || "0"
      );
      return 1 + c * 2.2;
    }

    function step() {
      if (reduce) return;
      frames++;
      var now = performance.now();
      if (now - lastFps >= 500 && hudFps) {
        hudFps.textContent = "FPS " + Math.round((frames * 1000) / (now - lastFps));
        frames = 0;
        lastFps = now;
      }

      var boost = scrollBoost();
      hue = (hue + 0.6 * boost) % 360;
      ctx.fillStyle = "rgba(1, 2, 6, " + (0.14 + boost * 0.04) + ")";
      ctx.fillRect(0, 0, W, H);

      var i;
      var j;
      for (i = 0; i < particles.length; i++) {
        var p = particles[i];
        var dxm = mouse.x - p.x;
        var dym = mouse.y - p.y;
        var dm = Math.sqrt(dxm * dxm + dym * dym);
        if (dm < 160 * boost && dm > 0) {
          p.vx -= (dxm / dm) * 0.02 * boost;
          p.vy -= (dym / dm) * 0.02 * boost;
        }
        p.x += p.vx * boost;
        p.y += p.vy * boost;
        p.vx *= 0.995;
        p.vy *= 0.995;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        p.x = Math.max(0, Math.min(W, p.x));
        p.y = Math.max(0, Math.min(H, p.y));
      }

      for (i = 0; i < particles.length; i++) {
        for (j = i + 1; j < particles.length; j++) {
          var p1 = particles[i];
          var p2 = particles[j];
          var dx = p1.x - p2.x;
          var dy = p1.y - p2.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < linkDist * boost) {
            var a = (1 - d / (linkDist * boost)) * 0.38 * boost;
            ctx.strokeStyle = "rgba(0,255,232," + a + ")";
            ctx.lineWidth = 0.55;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      for (i = 0; i < particles.length; i++) {
        var q = particles[i];
        ctx.fillStyle = "hsla(" + ((hue + i * 2) % 360) + ",100%,65%,0.85)";
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(step);
    }

    if (!reduce) requestAnimationFrame(step);
    else {
      ctx.fillStyle = "#010206";
      ctx.fillRect(0, 0, W, H);
    }
    return { resize: resize };
  }

  /* ========== CANVAS RAIN ========== */
  function initRain() {
    var canvas = document.getElementById("field2");
    if (!canvas || !canvas.getContext || reduce || window.innerWidth < 768) return;
    var ctx = canvas.getContext("2d");
    var W = 0;
    var H = 0;
    var cols = [];
    var charset = "01アイウエオｱｲｳｴｵAI{}[]<>";

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      var colW = 14;
      var n = Math.ceil(W / colW);
      cols = [];
      for (var i = 0; i < n; i++) {
        cols.push({
          x: i * colW,
          y: Math.random() * H,
          speed: 2 + Math.random() * 4
        });
      }
    }
    resize();
    window.addEventListener("resize", resize);

    function step() {
      ctx.fillStyle = "rgba(1, 2, 6, 0.12)";
      ctx.fillRect(0, 0, W, H);
      ctx.font = "12px JetBrains Mono, monospace";
      for (var i = 0; i < cols.length; i++) {
        var c = cols[i];
        var ch = charset[(Math.random() * charset.length) | 0];
        ctx.fillStyle =
          Math.random() > 0.96 ? "#00ffe8" : "rgba(0,255,232,0.35)";
        ctx.fillText(ch, c.x, c.y);
        c.y += c.speed;
        if (c.y > H) {
          c.y = 0;
          c.speed = 2 + Math.random() * 5;
        }
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ========== FLARE CANVAS ========== */
  function initFlare() {
    var canvas = document.getElementById("field3");
    if (!canvas || !canvas.getContext || reduce) return;
    var ctx = canvas.getContext("2d");
    var W = 0;
    var H = 0;
    var orbs = [];

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      orbs = [];
      var n = window.innerWidth < 768 ? 6 : 14;
      for (var i = 0; i < n; i++) {
        orbs.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 40 + Math.random() * 120,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          hue: Math.random() > 0.5 ? 170 : 205
        });
      }
    }
    resize();
    window.addEventListener("resize", resize);

    function step() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < orbs.length; i++) {
        var o = orbs[i];
        o.x += o.vx;
        o.y += o.vy;
        if (o.x < -o.r) o.x = W + o.r;
        if (o.x > W + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = H + o.r;
        if (o.y > H + o.r) o.y = -o.r;
        var g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0, "hsla(" + o.hue + ",100%,60%,0.07)");
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ========== FLOATING SHARDS ========== */
  function initShards() {
    var root = document.getElementById("fx-shards");
    if (!root || reduce) return;
    var n = window.innerWidth < 640 ? 8 : 18;
    for (var i = 0; i < n; i++) {
      var li = document.createElement("li");
      li.style.left = Math.random() * 100 + "%";
      li.style.top = Math.random() * 100 + "%";
      li.style.animationDelay = -Math.random() * 12 + "s";
      li.style.animationDuration = 8 + Math.random() * 10 + "s";
      root.appendChild(li);
    }
  }

  /* ========== ROLE CYCLE ========== */
  function initRoleCycle() {
    var el = document.getElementById("role-cycle");
    if (!el || reduce) return;
    var roles = [
      "Senior Consultant · Adaptavist",
      "Atlassian Certified · ACP-120",
      "Management Science · Waterloo",
      "Stocks · Investing · Crypto",
      "Toronto · Canada"
    ];
    var i = 0;
    setInterval(function () {
      i = (i + 1) % roles.length;
      el.style.opacity = "0";
      setTimeout(function () {
        el.textContent = roles[i];
        el.style.opacity = "1";
      }, 280);
    }, 3200);
    el.style.transition = "opacity 0.28s ease";
  }

  /* ========== START ========== */
  function startApp() {
    initShards();
    initReveal();
    initScramble();
    initCounters();
    initSpokes();
    initRoleCycle();
    initTerminal();
    initMesh();
    initRain();
    initFlare();
  }

  runBoot(startApp);
})();
