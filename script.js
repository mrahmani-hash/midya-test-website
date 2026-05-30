(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ===== year + email obfuscation ===== */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  var email = ["midyarahmani", "icloud.com"].join("@");
  document.querySelectorAll("[data-email-link]").forEach(function (el) {
    el.href = "mailto:" + email;
    var t = el.querySelector(".bigbtn__t") || el.querySelector("span") || el;
    t.textContent = email;
  });

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

  /* ===== SCROLL PROGRESS ===== */
  function initScroll() {
    var prog = document.getElementById("prog");
    if (!prog) return;
    var ticking = false;
    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ===== REVEAL (snappy, staggered) ===== */
  function initReveal() {
    var nodes = document.querySelectorAll("[data-reveal]");
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
        el.style.transitionDelay = (Math.min(idx, 8) * 55) + "ms";
        el.classList.add("is-visible");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ===== COUNTERS ===== */
  function initCounters() {
    var stats = document.getElementById("hero-stats");
    if (!stats) return;
    var els = stats.querySelectorAll("[data-count]");
    if (!els.length) return;
    if (reduce) { els.forEach(function (n) { n.textContent = n.getAttribute("data-count"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      els.forEach(function (n) {
        var target = parseInt(n.getAttribute("data-count"), 10) || 0;
        var start = performance.now();
        function tick(now) {
          var t = Math.min(1, (now - start) / 1200);
          n.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    io.observe(stats);
  }

  /* ===== ROLE CYCLE ===== */
  function initRole() {
    var el = document.getElementById("role-cycle");
    if (!el || reduce) return;
    var roles = (el.getAttribute("data-roles") || "").split("|").filter(Boolean);
    if (roles.length < 2) return;
    var i = 0;
    setInterval(function () {
      i = (i + 1) % roles.length;
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      setTimeout(function () {
        el.textContent = roles[i];
        el.style.opacity = "1";
        el.style.transform = "none";
      }, 250);
    }, 3000);
  }

  /* ===== LOG FEED ===== */
  function initLog() {
    var feed = document.getElementById("term-feed");
    if (!feed) return;
    var events = [
      ["linkedin.sync", "profile · midyarahmani"],
      ["work.adaptavist", "Adaptavist · remote"],
      ["work.cibc", "CIBC · Toronto"],
      ["work.goldline", "Group of Gold Line · Markham"],
      ["edu.waterloo", "University of Waterloo · 2021–2023"],
      ["edu.york", "York University · 2011–2016"],
      ["locale", "Toronto, ON · Canada"],
      ["lang", "English · Persian"],
      ["status", "midya.ca · online"]
    ];
    var idx = 0;
    function push() {
      var ev = events[idx % events.length]; idx++;
      var li = document.createElement("li");
      var ms = String((Math.random() * 400) | 0).padStart(3, "0");
      li.innerHTML = "<time>+" + ms + "ms</time><b>" + ev[0] + "</b> &nbsp;" + ev[1];
      feed.insertBefore(li, feed.firstChild);
      while (feed.children.length > 8) feed.removeChild(feed.lastChild);
    }
    push(); push(); push();
    if (!reduce) setInterval(push, 2000);
  }

  /* ===== START ===== */
  initNav();
  initScroll();
  initReveal();
  initCounters();
  initRole();
  initLog();
})();
