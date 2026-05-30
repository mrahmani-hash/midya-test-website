(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =================================================================
     AURORA — raw WebGL2 full-screen shader background (no libraries)
     ================================================================= */
  var VERT = [
    "#version 300 es",
    "in vec2 aPos;",
    "void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }"
  ].join("\n");

  var FRAG = [
    "#version 300 es",
    "precision highp float;",
    "out vec4 outColor;",
    "uniform float iTime;",
    "uniform vec2 iResolution;",
    "#define NUM_OCTAVES 3",
    "float rand(vec2 n){ return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }",
    "float noise(vec2 p){",
    "  vec2 ip = floor(p);",
    "  vec2 u = fract(p);",
    "  u = u*u*(3.0-2.0*u);",
    "  float res = mix(mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x), mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);",
    "  return res * res;",
    "}",
    "float fbm(vec2 x){",
    "  float v = 0.0;",
    "  float a = 0.3;",
    "  vec2 shift = vec2(100);",
    "  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));",
    "  for (int i = 0; i < NUM_OCTAVES; ++i){ v += a * noise(x); x = rot * x * 2.0 + shift; a *= 0.4; }",
    "  return v;",
    "}",
    "void main(){",
    "  vec2 shake = vec2(sin(iTime * 1.2) * 0.005, cos(iTime * 2.1) * 0.005);",
    "  vec2 p = ((gl_FragCoord.xy + shake * iResolution.xy) - iResolution.xy * 0.5) / iResolution.y * mat2(6.0, -4.0, 4.0, 6.0);",
    "  vec2 v;",
    "  vec4 o = vec4(0.0);",
    "  float f = 2.0 + fbm(p + vec2(iTime * 5.0, 0.0)) * 0.5;",
    "  for (float i = 0.0; i < 35.0; i++){",
    "    v = p + cos(i * i + (iTime + p.x * 0.08) * 0.025 + i * vec2(13.0, 11.0)) * 3.5 + vec2(sin(iTime * 3.0 + i) * 0.003, cos(iTime * 3.5 - i) * 0.003);",
    "    float tailNoise = fbm(v + vec2(iTime * 0.5, i)) * 0.3 * (1.0 - (i / 35.0));",
    "    vec4 auroraColors = vec4(0.1 + 0.3 * sin(i * 0.2 + iTime * 0.4), 0.3 + 0.5 * cos(i * 0.3 + iTime * 0.5), 0.7 + 0.3 * sin(i * 0.4 + iTime * 0.3), 1.0);",
    "    vec4 currentContribution = auroraColors * exp(sin(i * i + iTime * 0.8)) / length(max(v, vec2(v.x * f * 0.015, v.y * 1.5)));",
    "    float thinnessFactor = smoothstep(0.0, 1.0, i / 35.0) * 0.6;",
    "    o += currentContribution * (1.0 + tailNoise * 0.8) * thinnessFactor;",
    "  }",
    "  o = tanh(pow(o / 100.0, vec4(1.6)));",
    "  outColor = o * 1.5;",
    "}"
  ].join("\n");

  function initAurora() {
    var canvas = document.getElementById("shader-bg");
    if (!canvas) return;
    var gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
    if (!gl) {
      // Graceful fallback: a static aurora-like gradient
      canvas.style.background = "radial-gradient(ellipse 60% 50% at 30% 30%, #0b1f3a, transparent 60%), radial-gradient(ellipse 50% 60% at 75% 70%, #16123a, transparent 60%), #05060b";
      return;
    }

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("shader compile error:", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.style.background = "#070a14"; return; }

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("program link error:", gl.getProgramInfoLog(prog));
      canvas.style.background = "#070a14";
      return;
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uTime = gl.getUniformLocation(prog, "iTime");
    var uRes = gl.getUniformLocation(prog, "iResolution");

    var t = 1.0;
    function draw() { gl.uniform1f(uTime, t); gl.drawArrays(gl.TRIANGLES, 0, 3); }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.floor(window.innerWidth * dpr));
      var h = Math.max(1, Math.floor(window.innerHeight * dpr));
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      draw(); // redraw immediately so a resize never leaves the canvas blank
    }
    resize();
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 150); }, { passive: true });

    if (reduce) return; // resize() already drew one static frame

    var last = performance.now(), raf, running = true;
    function frame(now) {
      if (!running) return;
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      draw();
      raf = requestAnimationFrame(frame);
    }
    draw(); // guarantee a visible frame even if rAF is throttled (hidden tab)
    raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    });
  }

  /* =================================================================
     BOOT — "midya.ca" with ping-pong dots, then reveal content
     ================================================================= */
  function initBoot() {
    var boot = document.getElementById("boot");
    var dotsEl = document.getElementById("boot-dots");
    function finish() {
      document.documentElement.classList.remove("is-loading");
      if (boot) boot.classList.add("is-done");
    }
    if (reduce) { finish(); return; }

    var n = 0, dir = 1;
    var di = setInterval(function () {
      n += dir;
      if (n >= 3) dir = -1;
      if (n <= 0) dir = 1;
      if (dotsEl) dotsEl.textContent = ".".repeat(n);
    }, 420);

    setTimeout(function () {
      clearInterval(di);
      finish();
    }, 3200);
  }

  /* =================================================================
     CONTENT INTERACTIONS
     ================================================================= */
  function initContent() {
    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());

    var email = ["midya.ra", "gmail.com"].join("@");
    document.querySelectorAll("[data-email-link]").forEach(function (el) {
      el.href = "mailto:" + email;
      var t = el.querySelector(".bigbtn__t") || el.querySelector("span") || el;
      t.textContent = email;
    });

    /* nav toggle + scrollspy */
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

    /* scroll progress + header state */
    var prog = document.getElementById("prog");
    var head = document.getElementById("head");
    var ticking = false;
    function onScroll() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var sy = window.scrollY;
      if (prog) prog.style.width = (h > 0 ? (sy / h) * 100 : 0) + "%";
      if (head) head.classList.toggle("is-scrolled", sy > 10);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();

    /* reveal */
    var nodes = document.querySelectorAll("[data-reveal]");
    if (reduce || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          var sibs = el.parentElement ? el.parentElement.querySelectorAll(":scope > [data-reveal]") : [el];
          var idx = Array.prototype.indexOf.call(sibs, el);
          el.style.transitionDelay = (Math.min(idx, 8) * 60) + "ms";
          el.classList.add("is-visible");
          io.unobserve(el);
        });
      }, { rootMargin: "0px 0px -7% 0px", threshold: 0.08 });
      nodes.forEach(function (n) { io.observe(n); });
    }

  }

  /* ===== START ===== */
  try { initAurora(); } catch (e) { console.warn("aurora init failed:", e); }
  initBoot();
  initContent();
})();
