/* ═══════════════════════════════════════════════
   PHOENIX CRYSTAL - «Золотая трасса»
   Ванильный JS: канвас-феникс, scroll-маршрут,
   reveal-анимации, меню, форма → WhatsApp
   ═══════════════════════════════════════════════ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Год в футере ── */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── Шапка: фон при скролле ── */
  var topbar = document.getElementById("topbar");
  var onScrollBar = function () {
    topbar.classList.toggle("scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScrollBar, { passive: true });
  onScrollBar();

  /* ── Меню-оверлей ── */
  var menuBtn = document.getElementById("menuBtn");
  var menuOverlay = document.getElementById("menuOverlay");
  function toggleMenu(force) {
    var open = typeof force === "boolean" ? force : !menuOverlay.classList.contains("open");
    menuOverlay.classList.toggle("open", open);
    menuBtn.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  }
  menuBtn.addEventListener("click", function () { toggleMenu(); });
  menuOverlay.addEventListener("click", function (e) {
    if (e.target.closest("a")) toggleMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") toggleMenu(false);
  });

  /* ── H1: пословное появление (WAAPI - текст виден всегда) ── */
  var h1 = document.getElementById("heroTitle");
  if (h1 && !reduceMotion && "animate" in document.body) {
    var words = h1.textContent.trim().split(/\s+/);
    h1.textContent = "";
    words.forEach(function (w, i) {
      var s = document.createElement("span");
      s.className = "w";
      s.textContent = w;
      h1.appendChild(s);
      if (i < words.length - 1) h1.appendChild(document.createTextNode(" "));
      s.animate(
        [
          { opacity: 0, transform: "translateY(.6em) rotate(3deg)" },
          { opacity: 1, transform: "none" }
        ],
        { duration: 800, delay: 150 + i * 120, fill: "backwards", easing: "cubic-bezier(.2,.8,.2,1)" }
      );
    });
  }

  /* ── Reveal on scroll ── */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("visible");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ── Счётчики «почему мы» ── */
  var counters = document.querySelectorAll(".why-big[data-count]");
  if ("IntersectionObserver" in window && !reduceMotion && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target;
        var target = parseInt(el.getAttribute("data-count"), 10);
        var t0 = null;
        var dur = 1400;
        function tick(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ── Золотая трасса: отрисовка по скроллу ── */
  var routePath = document.getElementById("routePath");
  var routeWrap = document.getElementById("routeWrap");
  if (routePath && routeWrap) {
    var len = routePath.getTotalLength();
    routePath.style.strokeDasharray = len + " " + len;
    routePath.style.strokeDashoffset = reduceMotion ? 0 : len;

    if (!reduceMotion) {
      var ticking = false;
      var drawRoute = function () {
        ticking = false;
        var r = routeWrap.getBoundingClientRect();
        var vh = window.innerHeight;
        // прогресс: 0 когда верх обёртки у низа экрана, 1 когда низ обёртки у 70% экрана
        var total = r.height + vh * 0.7;
        var passed = vh - r.top;
        var p = Math.max(0, Math.min(1, passed / total));
        routePath.style.strokeDashoffset = len * (1 - p);
      };
      window.addEventListener("scroll", function () {
        if (!ticking) { ticking = true; requestAnimationFrame(drawRoute); }
      }, { passive: true });
      window.addEventListener("resize", drawRoute);
      drawRoute();
    }
  }

  /* ══════════════════════════════════════════
     КАНВАС: золотой феникс-комета летит между
     «городами»-точками, оставляя шлейф частиц
     ══════════════════════════════════════════ */
  var canvas = document.getElementById("skyCanvas");
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext("2d");
    var DPR = Math.min(window.devicePixelRatio || 1, 1.8);
    var W = 0, H = 0;
    var cities = [];
    var particles = [];
    var stars = [];
    var comet = { t: 0, seg: 0, speed: 0.006, x: 0, y: 0, px: 0, py: 0 };
    var running = true;
    var heroVisible = true;

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildWorld();
    }

    function buildWorld() {
      // «города» - детерминированная россыпь точек-нод
      var pts = [
        [0.12, 0.30], [0.32, 0.62], [0.50, 0.24], [0.68, 0.58],
        [0.86, 0.30], [0.72, 0.14], [0.26, 0.14], [0.90, 0.66],
        [0.08, 0.62], [0.46, 0.74]
      ];
      cities = pts.map(function (p) {
        return { x: p[0] * W, y: p[1] * H, tw: Math.random() * Math.PI * 2 };
      });
      // звёздная пыль
      stars = [];
      var n = Math.round((W * H) / 16000);
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 1.1 + 0.3,
          tw: Math.random() * Math.PI * 2,
          sp: 0.4 + Math.random() * 0.8
        });
      }
      comet.seg = 0; comet.t = 0;
      particles.length = 0;
    }

    // сегмент полёта: дуга Безье между двумя городами
    function segPoints(i) {
      var a = cities[i % cities.length];
      var b = cities[(i + 3) % cities.length]; // прыжки через карту
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var dx = b.x - a.x, dy = b.y - a.y;
      var lift = Math.min(H * 0.22, Math.hypot(dx, dy) * 0.35);
      // контрольная точка «вверх» от хорды
      var norm = Math.hypot(dx, dy) || 1;
      var cxp = mx - (dy / norm) * lift;
      var cyp = my + (dx / norm) * lift * -1;
      return { a: a, b: b, cx: cxp, cy: Math.min(cyp, my) };
    }

    function bezier(p, t) {
      var mt = 1 - t;
      return {
        x: mt * mt * p.a.x + 2 * mt * t * p.cx + t * t * p.b.x,
        y: mt * mt * p.a.y + 2 * mt * t * p.cy + t * t * p.b.y
      };
    }

    function emit(x, y, vx, vy, burst) {
      var count = burst ? 26 : 3;
      for (var i = 0; i < count; i++) {
        if (particles.length > 320) particles.shift();
        var ang = Math.random() * Math.PI * 2;
        var sp = burst ? (Math.random() * 1.8 + 0.4) : (Math.random() * 0.35);
        particles.push({
          x: x, y: y,
          vx: (burst ? Math.cos(ang) * sp : -vx * 0.25 + (Math.random() - 0.5) * 0.5),
          vy: (burst ? Math.sin(ang) * sp : -vy * 0.25 + (Math.random() - 0.5) * 0.5),
          life: 1,
          decay: burst ? 0.012 + Math.random() * 0.015 : 0.008 + Math.random() * 0.012,
          r: burst ? Math.random() * 2 + 0.8 : Math.random() * 2.4 + 1
        });
      }
    }

    var frame = 0;
    function draw() {
      if (!running || !heroVisible) return;
      frame++;
      ctx.clearRect(0, 0, W, H);

      // фон-градиент неба
      var g = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, Math.max(W, H) * 0.75);
      g.addColorStop(0, "#0e0b06");
      g.addColorStop(1, "#070604");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // звёзды
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var a = 0.25 + 0.55 * Math.abs(Math.sin(s.tw + frame * 0.008 * s.sp));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#cdb87a";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // города-ноды
      for (i = 0; i < cities.length; i++) {
        var c = cities[i];
        var tw = 0.5 + 0.5 * Math.sin(c.tw + frame * 0.02);
        ctx.fillStyle = "rgba(242,215,145," + (0.5 + tw * 0.5) + ")";
        ctx.beginPath();
        ctx.arc(c.x, c.y, 2 + tw, 0, 6.283);
        ctx.fill();
        ctx.strokeStyle = "rgba(201,162,75," + (0.25 * (1 - tw)) + ")";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 5 + tw * 7, 0, 6.283);
        ctx.stroke();
      }

      // комета-феникс
      var seg = segPoints(comet.seg);
      comet.t += comet.speed;
      if (comet.t >= 1) {
        emit(seg.b.x, seg.b.y, 0, 0, true); // вспышка прибытия
        comet.seg = (comet.seg + 3) % cities.length;
        comet.t = 0;
        seg = segPoints(comet.seg);
      }
      var pos = bezier(seg, comet.t);
      var vx = pos.x - comet.px, vy = pos.y - comet.py;
      comet.px = pos.x; comet.py = pos.y;
      emit(pos.x, pos.y, vx, vy, false);

      // частицы шлейфа
      for (i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vy -= 0.004; // лёгкий подъём - пламя
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        var lr = p.life;
        ctx.globalAlpha = lr * 0.85;
        ctx.fillStyle = lr > 0.6 ? "#f7e3ae" : (lr > 0.3 ? "#c9a24b" : "#7a5c1e");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * lr, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // голова кометы - золотое ядро со свечением
      var glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 26);
      glow.addColorStop(0, "rgba(255,240,200,.9)");
      glow.addColorStop(0.25, "rgba(242,215,145,.55)");
      glow.addColorStop(1, "rgba(201,162,75,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 26, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = "#fff6dd";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2.4, 0, 6.283);
      ctx.fill();

      requestAnimationFrame(draw);
    }

    // пауза, когда hero не на экране / вкладка скрыта
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        var was = heroVisible;
        heroVisible = entries[0].isIntersecting;
        if (heroVisible && !was) requestAnimationFrame(draw);
      }, { threshold: 0.02 }).observe(canvas.parentElement);
    }
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      if (running) requestAnimationFrame(draw);
    });

    var rT;
    window.addEventListener("resize", function () {
      clearTimeout(rT);
      rT = setTimeout(resize, 150);
    });

    resize();
    requestAnimationFrame(draw);
  }

  /* ── Форма → WhatsApp ── */
  var form = document.getElementById("calcForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var msg = "Здравствуйте! Хочу рассчитать доставку.\n" +
        "Откуда: " + (d.get("from") || "-") + "\n" +
        "Куда: " + (d.get("to") || "-") + "\n" +
        "Груз: " + (d.get("cargo") || "-") + "\n" +
        "Телефон: " + (d.get("phone") || "-");
      window.open("https://wa.me/77478765598?text=" + encodeURIComponent(msg), "_blank", "noopener");
    });
  }
})();
