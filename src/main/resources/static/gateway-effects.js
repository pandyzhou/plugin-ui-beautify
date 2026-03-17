/* Gateway Particle Effects (v3.5.0) */
(function() {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var theme = window.__UI_BEAUTIFY_THEME__ || "default";
  if (theme === "minimal") return;

  var canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;" +
    "pointer-events:none;z-index:0;";
  document.body.appendChild(canvas);

  var ctx = canvas.getContext("2d");
  var w, h, particles = [];

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  var THEMES = {
    sakura: {
      count: 20,
      create: function() {
        var colors = [
          "rgba(236,72,153,0.25)",
          "rgba(244,114,182,0.2)",
          "rgba(251,191,210,0.28)",
          "rgba(253,164,200,0.22)"
        ];
        return {
          x: Math.random() * w,
          y: -20 - Math.random() * h * 0.5,
          size: 5 + Math.random() * 8,
          color: colors[Math.floor(Math.random() * colors.length)],
          vy: 0.4 + Math.random() * 0.8,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.03,
          wobble: Math.random() * Math.PI * 2
        };
      },
      draw: function(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        for (var i = 0; i < 5; i++) {
          var a = (i * 72 - 90) * Math.PI / 180;
          var r = p.size * 0.5;
          ctx.ellipse(
            Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5,
            r * 0.45, r * 0.25, a, 0, Math.PI * 2
          );
        }
        ctx.fill();
        ctx.restore();
      },
      update: function(p) {
        p.y += p.vy;
        p.x += Math.sin(p.wobble) * 0.6;
        p.wobble += 0.018;
        p.rot += p.rotSpeed;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
      }
    },

    dark: {
      count: 30,
      create: function() {
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          size: 1 + Math.random() * 2,
          baseAlpha: 0.2 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          phaseSpeed: 0.01 + Math.random() * 0.02,
          alpha: 1
        };
      },
      draw: function(p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(139,92,246," +
          (p.alpha * p.baseAlpha).toFixed(2) + ")";
        ctx.fill();
      },
      update: function(p) {
        p.phase += p.phaseSpeed;
        p.alpha = 0.3 + Math.sin(p.phase) * 0.7;
      }
    },

    aurora: {
      count: 4,
      create: function() {
        var colors = [
          "rgba(168,85,247,0.08)",
          "rgba(236,72,153,0.06)",
          "rgba(139,92,246,0.07)",
          "rgba(192,132,252,0.05)"
        ];
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          size: 80 + Math.random() * 120,
          color: colors[Math.floor(Math.random() * colors.length)],
          wobble: Math.random() * Math.PI * 2
        };
      },
      draw: function(p) {
        var grd = ctx.createRadialGradient(
          p.x, p.y, 0, p.x, p.y, p.size
        );
        grd.addColorStop(0, p.color);
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.fillRect(
          p.x - p.size, p.y - p.size,
          p.size * 2, p.size * 2
        );
      },
      update: function(p) {
        p.x += Math.sin(p.wobble) * 0.5;
        p.y += Math.cos(p.wobble * 0.7) * 0.3;
        p.wobble += 0.006;
        if (p.x < -p.size) p.x = w + p.size;
        if (p.x > w + p.size) p.x = -p.size;
        if (p.y < -p.size) p.y = h + p.size;
        if (p.y > h + p.size) p.y = -p.size;
      }
    },

    ocean: {
      count: 15,
      create: function() {
        return {
          x: Math.random() * w,
          y: h + 10 + Math.random() * 100,
          size: 3 + Math.random() * 5,
          color: "rgba(59,130,246," +
            (0.1 + Math.random() * 0.15).toFixed(2) + ")",
          vy: 0.3 + Math.random() * 0.5,
          wobble: Math.random() * Math.PI * 2
        };
      },
      draw: function(p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
          p.x - p.size * 0.25, p.y - p.size * 0.25,
          p.size * 0.3, 0, Math.PI * 2
        );
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fill();
      },
      update: function(p) {
        p.y -= p.vy;
        p.x += Math.sin(p.wobble) * 0.35;
        p.wobble += 0.02;
        p.size *= 0.9998;
        if (p.y < -20 || p.size < 1) {
          p.y = h + 10;
          p.x = Math.random() * w;
          p.size = 3 + Math.random() * 5;
        }
      }
    },

    "default": {
      count: 10,
      create: function() {
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          size: 15 + Math.random() * 25,
          color: "rgba(76,203,160," +
            (0.06 + Math.random() * 0.08).toFixed(2) + ")",
          wobble: Math.random() * Math.PI * 2
        };
      },
      draw: function(p) {
        var grd = ctx.createRadialGradient(
          p.x, p.y, 0, p.x, p.y, p.size
        );
        grd.addColorStop(0, p.color);
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      },
      update: function(p) {
        p.x += Math.sin(p.wobble) * 0.25;
        p.y += Math.cos(p.wobble * 0.8) * 0.18;
        p.wobble += 0.004;
        if (p.x < -p.size) p.x = w + p.size;
        if (p.x > w + p.size) p.x = -p.size;
        if (p.y < -p.size) p.y = h + p.size;
        if (p.y > h + p.size) p.y = -p.size;
      }
    }
  };

  var cfg = THEMES[theme] || THEMES["default"];
  if (!cfg) return;

  for (var i = 0; i < cfg.count; i++) {
    particles.push(cfg.create());
  }

  var rafId = null;
  function loop() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < particles.length; i++) {
      cfg.update(particles[i]);
      cfg.draw(particles[i]);
    }
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);

  // Pause when tab is hidden, resume when visible
  document.addEventListener("visibilitychange", function() {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else {
      if (!rafId) rafId = requestAnimationFrame(loop);
    }
  });

  // Full cleanup on page unload
  window.addEventListener("pagehide", function() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    window.removeEventListener("resize", resize);
    if (canvas.parentNode) canvas.remove();
  });
})();
