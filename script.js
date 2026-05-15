(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* —— Nav —— */
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

  /* —— HUD —— */
  var hudHash = document.getElementById("hud-hash");
  var hudTick = document.getElementById("hud-tick");
  var t0 = performance.now();

  function randHex() {
    return "0x" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  }

  function updateHud() {
    if (hudHash) hudHash.textContent = randHex();
    if (hudTick) {
      var s = (performance.now() - t0) / 1000;
      hudTick.textContent = "T+" + s.toFixed(3);
    }
  }

  if (!reduce) {
    setInterval(updateHud, 120);
  }
  updateHud();

  /* —— Reveal —— */
  if (!reduce && "IntersectionObserver" in window) {
    var nodes = document.querySelectorAll("[data-reveal]");
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    nodes.forEach(function (n) {
      io.observe(n);
    });
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (n) {
      n.classList.add("is-visible");
    });
  }

  /* —— Text scramble —— */
  var scrambleEl = document.getElementById("hero-scramble");
  if (scrambleEl) {
    var finalText = scrambleEl.textContent.trim();
    var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    if (reduce) {
      scrambleEl.textContent = finalText;
    } else {
      var frame = 0;
      var maxFrames = 48;
      function scrambleStep() {
        frame++;
        var out = "";
        for (var i = 0; i < finalText.length; i++) {
          var ch = finalText[i];
          if (ch === " " || ch === "," || ch === "—" || ch === ".") {
            out += ch;
            continue;
          }
          if (frame > maxFrames * (i / Math.max(finalText.length, 1))) {
            out += ch;
          } else {
            out += charset[Math.floor(Math.random() * charset.length)];
          }
        }
        scrambleEl.textContent = out;
        if (frame < maxFrames + 10) {
          requestAnimationFrame(scrambleStep);
        } else {
          scrambleEl.textContent = finalText;
        }
      }
      requestAnimationFrame(scrambleStep);
    }
  }

  /* —— Parallax (hero glow) —— */
  var parallaxLayer = document.querySelector(".hero__parallax");
  if (parallaxLayer && !reduce) {
    document.addEventListener(
      "mousemove",
      function (e) {
        var x = (e.clientX / window.innerWidth - 0.5) * 2;
        var y = (e.clientY / window.innerHeight - 0.5) * 2;
        var s = parseFloat(parallaxLayer.getAttribute("data-parallax") || "0.06");
        parallaxLayer.style.transform =
          "translate(" + x * 40 * s + "px," + y * 30 * s + "px) scale(1.05)";
      },
      { passive: true }
    );
  }

  /* —— 3D tilt cards —— */
  function bindTilt(el) {
    if (reduce) return;
    var max = 11;
    el.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        "perspective(900px) rotateY(" +
        px * max +
        "deg) rotateX(" +
        -py * max +
        "deg) translateZ(4px)";
    });
    el.addEventListener("mouseleave", function () {
      el.style.transform = "";
    });
  }

  document.querySelectorAll("[data-tilt]").forEach(bindTilt);

  /* —— Magnetic links —— */
  function bindMagnetic(el) {
    if (reduce) return;
    var strength = 0.32;
    el.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) * strength;
      var dy = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.transform = "translate(" + dx + "px," + dy + "px)";
    });
    el.addEventListener("mouseleave", function () {
      el.style.transform = "";
    });
  }

  document.querySelectorAll("[data-magnetic]").forEach(bindMagnetic);

  /* —— Canvas field —— */
  var canvas = document.getElementById("field");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var particles = [];
  var W = 0;
  var H = 0;
  var DPR = 1;

  function count() {
    return window.innerWidth < 640 ? 40 : 88;
  }

  function spawn() {
    particles = [];
    var n = count();
    for (var i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.55,
        vy: (Math.random() - 0.5) * 0.55,
        r: Math.random() * 1.8 + 0.35
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

  var linkDist = 118;
  var hue = 0;

  function step() {
    if (reduce) return;
    hue = (hue + 0.4) % 360;
    ctx.fillStyle = "rgba(2, 3, 8, 0.2)";
    ctx.fillRect(0, 0, W, H);

    var i;
    for (i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      p.x = Math.max(0, Math.min(W, p.x));
      p.y = Math.max(0, Math.min(H, p.y));
    }

    var a;
    var b;
    for (a = 0; a < particles.length; a++) {
      for (b = a + 1; b < particles.length; b++) {
        var p1 = particles[a];
        var p2 = particles[b];
        var dx = p1.x - p2.x;
        var dy = p1.y - p2.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < linkDist) {
          var alpha = (1 - d / linkDist) * 0.32;
          ctx.strokeStyle = "rgba(0,255,213," + alpha + ")";
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
      ctx.fillStyle = "hsla(" + (hue + i * 3) % 360 + ",100%,68%,0.82)";
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  if (!reduce) {
    requestAnimationFrame(step);
  } else {
    resize();
    ctx.fillStyle = "#020308";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0,255,213,0.12)";
    for (var k = 0; k < particles.length; k += 3) {
      var p = particles[k];
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
})();
