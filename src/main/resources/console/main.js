/* UI Beautify — Theme Loader + Particle Effects (v1.1.2) */
(function() {
  "use strict";

  var PLUGIN_NAME = "plugin-ui-beautify";
  var PLUGIN_VERSION = "1.2.1";
  var LINK_ID = "ui-beautify-theme-css";
  var CANVAS_ID = "ui-beautify-fx-canvas";
  var CUSTOM_STYLE_ID = "ui-beautify-custom-css";
  var BASE_URL = "/plugins/" + PLUGIN_NAME + "/assets/console/";
  var CONFIG_URL = "/apis/api.console.halo.run/v1alpha1/plugins/" +
    PLUGIN_NAME + "/json-config";
  var VALID_THEMES = ["default", "ocean", "dark", "sakura", "minimal", "aurora"];
  var currentTheme = null;
  var enableEffects = true;
  var darkMql = window.matchMedia("(prefers-color-scheme: dark)");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ========== Theme CSS Loading ========== */

  function resolveAutoTheme(theme) {
    if (theme !== "auto") return theme;
    return darkMql.matches ? "dark" : "default";
  }

  function applyTransition() {
    var root = document.documentElement;
    root.style.transition =
      "background-color 0.35s ease, color 0.35s ease";
    setTimeout(function() { root.style.transition = ""; }, 500);
  }

  function loadThemeCSS(theme) {
    theme = resolveAutoTheme(theme);
    if (VALID_THEMES.indexOf(theme) === -1) theme = "default";

    var existing = document.getElementById(LINK_ID);
    if (existing && existing.dataset.theme === theme) {
      FX.apply(theme);
      return;
    }

    applyTransition();
    if (existing) existing.remove();

    var link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    link.dataset.theme = theme;
    link.href = BASE_URL + "theme-" + theme + ".css?v=" + PLUGIN_VERSION;
    document.head.appendChild(link);

    FX.apply(theme);
  }

  function fetchConfig() {
    return fetch(CONFIG_URL)
      .then(function(res) { return res.ok ? res.json() : null; })
      .then(function(data) {
        if (data && data.basic) {
          enableEffects = data.basic.enableEffects !== false;
          applyCustomCss(data.basic.customCss || "");
          return data.basic.consoleTheme || "default";
        }
        return "default";
      })
      .catch(function() { return "default"; });
  }

  function applyCustomCss(css) {
    var existing = document.getElementById(CUSTOM_STYLE_ID);
    if (existing) existing.remove();
    if (!css || !css.trim()) return;
    /* Basic sanitization — block dangerous CSS patterns */
    var sanitized = css
      .replace(/expression\s*\(/gi, "/* blocked */")
      .replace(/javascript\s*:/gi, "/* blocked */")
      .replace(/@import\b/gi, "/* blocked */")
      .replace(/behavior\s*:/gi, "/* blocked */")
      .replace(/-moz-binding\s*:/gi, "/* blocked */");
    var style = document.createElement("style");
    style.id = CUSTOM_STYLE_ID;
    style.textContent = sanitized;
    document.head.appendChild(style);
  }

  /* ========== Particle Effects Engine ========== */

  var FX = {
    canvas: null,
    ctx: null,
    raf: null,
    particles: [],
    config: null,
    w: 0,
    h: 0,

    THEMES: {
      sakura: {
        count: 22,
        color: function() {
          var colors = [
            "rgba(236,72,153,0.18)",
            "rgba(244,114,182,0.15)",
            "rgba(251,191,210,0.2)",
            "rgba(253,164,200,0.16)"
          ];
          return colors[Math.floor(Math.random() * colors.length)];
        },
        size: function() { return 6 + Math.random() * 10; },
        speed: function() { return 0.3 + Math.random() * 0.6; },
        draw: function(ctx, p) {
          /* 5-petal sakura flower */
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          for (var i = 0; i < 5; i++) {
            var angle = (i * 72 - 90) * Math.PI / 180;
            var r = p.size * 0.5;
            ctx.ellipse(
              Math.cos(angle) * r * 0.5,
              Math.sin(angle) * r * 0.5,
              r * 0.45, r * 0.25,
              angle, 0, Math.PI * 2
            );
          }
          ctx.fill();
          ctx.restore();
        },
        update: function(p, w, h) {
          p.y += p.vy;
          p.x += Math.sin(p.wobble) * 0.5;
          p.wobble += 0.015;
          p.rot += p.rotSpeed;
          if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        }
      },

      dark: {
        count: 35,
        color: function() {
          var a = 0.15 + Math.random() * 0.35;
          return "rgba(139,92,246," + a.toFixed(2) + ")";
        },
        size: function() { return 1 + Math.random() * 2.5; },
        speed: function() { return 0; },
        draw: function(ctx, p) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color.replace(
            /[\d.]+\)$/,
            (p.alpha * p.baseAlpha).toFixed(2) + ")"
          );
          ctx.fill();
        },
        update: function(p) {
          /* twinkle */
          p.phase += p.phaseSpeed;
          p.alpha = 0.3 + Math.sin(p.phase) * 0.7;
        }
      },

      aurora: {
        count: 4,
        color: function() {
          var colors = [
            "rgba(168,85,247,0.06)",
            "rgba(236,72,153,0.05)",
            "rgba(139,92,246,0.05)",
            "rgba(192,132,252,0.04)"
          ];
          return colors[Math.floor(Math.random() * colors.length)];
        },
        size: function() { return 80 + Math.random() * 120; },
        speed: function() { return 0.15 + Math.random() * 0.2; },
        draw: function(ctx, p) {
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
        update: function(p, w, h) {
          p.x += Math.sin(p.wobble) * 0.4;
          p.y += Math.cos(p.wobble * 0.7) * 0.2;
          p.wobble += 0.005;
          /* wrap */
          if (p.x < -p.size) p.x = w + p.size;
          if (p.x > w + p.size) p.x = -p.size;
          if (p.y < -p.size) p.y = h + p.size;
          if (p.y > h + p.size) p.y = -p.size;
        }
      },

      ocean: {
        count: 18,
        color: function() {
          var a = 0.08 + Math.random() * 0.12;
          return "rgba(59,130,246," + a.toFixed(2) + ")";
        },
        size: function() { return 3 + Math.random() * 6; },
        speed: function() { return 0.2 + Math.random() * 0.5; },
        draw: function(ctx, p) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          /* highlight */
          ctx.beginPath();
          ctx.arc(
            p.x - p.size * 0.25,
            p.y - p.size * 0.25,
            p.size * 0.3, 0, Math.PI * 2
          );
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.fill();
        },
        update: function(p, w, h) {
          p.y -= p.vy;
          p.x += Math.sin(p.wobble) * 0.3;
          p.wobble += 0.02;
          /* shrink as rising */
          p.size *= 0.9998;
          if (p.y < -20 || p.size < 1) {
            p.y = h + 10;
            p.x = Math.random() * w;
            p.size = 3 + Math.random() * 6;
          }
        }
      },

      "default": {
        count: 12,
        color: function() {
          var a = 0.06 + Math.random() * 0.08;
          return "rgba(76,203,160," + a.toFixed(2) + ")";
        },
        size: function() { return 15 + Math.random() * 30; },
        speed: function() { return 0; },
        draw: function(ctx, p) {
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
        update: function(p, w, h) {
          p.x += Math.sin(p.wobble) * 0.2;
          p.y += Math.cos(p.wobble * 0.8) * 0.15;
          p.wobble += 0.003 + Math.random() * 0.002;
          if (p.x < -p.size) p.x = w + p.size;
          if (p.x > w + p.size) p.x = -p.size;
          if (p.y < -p.size) p.y = h + p.size;
          if (p.y > h + p.size) p.y = -p.size;
        }
      }
    },

    createParticle: function(cfg, w, h) {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size: cfg.size(),
        color: cfg.color(),
        vy: cfg.speed(),
        vx: 0,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        wobble: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.01 + Math.random() * 0.02,
        alpha: 1,
        baseAlpha: 0.15 + Math.random() * 0.35
      };
    },

    init: function(theme) {
      var cfg = this.THEMES[theme];
      if (!cfg) return;

      this.destroy();

      var canvas = document.createElement("canvas");
      canvas.id = CANVAS_ID;
      canvas.style.cssText =
        "position:fixed;top:0;left:0;width:100%;height:100%;" +
        "pointer-events:none;z-index:0;opacity:1;";
      document.body.appendChild(canvas);

      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.config = cfg;
      this.resize();
      this.particles = [];

      for (var i = 0; i < cfg.count; i++) {
        this.particles.push(
          this.createParticle(cfg, this.w, this.h)
        );
      }

      var self = this;
      window.addEventListener("resize", this._onResize = function() {
        self.resize();
      });

      this.loop();
    },

    resize: function() {
      if (!this.canvas) return;
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.canvas.width = this.w;
      this.canvas.height = this.h;
    },

    loop: function() {
      var self = this;
      this.raf = requestAnimationFrame(function frame() {
        self.render();
        self.raf = requestAnimationFrame(frame);
      });
    },

    render: function() {
      var ctx = this.ctx;
      var cfg = this.config;
      if (!ctx || !cfg) return;

      ctx.clearRect(0, 0, this.w, this.h);

      for (var i = 0; i < this.particles.length; i++) {
        var p = this.particles[i];
        cfg.update(p, this.w, this.h);
        cfg.draw(ctx, p);
      }
    },

    destroy: function() {
      if (this.raf) {
        cancelAnimationFrame(this.raf);
        this.raf = null;
      }
      if (this._onResize) {
        window.removeEventListener("resize", this._onResize);
        this._onResize = null;
      }
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      this.canvas = null;
      this.ctx = null;
      this.particles = [];
      this.config = null;
    },

    apply: function(theme) {
      theme = resolveAutoTheme(theme);
      if (!enableEffects || reducedMotion.matches || theme === "minimal") {
        this.destroy();
        return;
      }
      this.init(theme);
    }
  };

  /* ========== Bootstrap ========== */

  fetchConfig().then(function(theme) {
    currentTheme = theme;
    loadThemeCSS(theme);
  });

  darkMql.addEventListener("change", function() {
    if (currentTheme === "auto") {
      loadThemeCSS("auto");
    }
  });

  reducedMotion.addEventListener("change", function() {
    FX.apply(currentTheme);
  });

  /* Intercept config save — apply new theme without reload */
  var originalFetch = window.fetch;
  window.fetch = function() {
    var url = arguments[0];
    var options = arguments[1];

    /* Handle Request objects */
    var urlStr = typeof url === "string" ? url
      : (url && url.url) ? url.url : "";
    var method = (options && options.method)
      ? options.method
      : (url && url.method) ? url.method : "GET";

    if (urlStr.indexOf(CONFIG_URL) !== -1
        && method.toUpperCase() === "PUT") {
      return originalFetch.apply(this, arguments).then(function(response) {
        if (response.ok || response.status === 204) {
          setTimeout(function() {
            fetchConfig().then(function(newTheme) {
              if (newTheme !== currentTheme) {
                currentTheme = newTheme;
                loadThemeCSS(newTheme);
              } else {
                FX.apply(newTheme);
              }
            }).catch(function() {});
          }, 300);
        }
        return response;
      }).catch(function(err) {
        return Promise.reject(err);
      });
    }

    return originalFetch.apply(this, arguments);
  };

  /* ============================================
     PAGE TRANSITION — fade in on route change
     ============================================ */
  (function initPageTransition() {
    if (reducedMotion.matches) return;
    var mainContent = null;
    var observer = new MutationObserver(function() {
      if (!mainContent) mainContent = document.querySelector(".main-content");
      if (!mainContent) return;
      mainContent.style.animation = "none";
      void mainContent.offsetHeight; /* trigger reflow */
      mainContent.style.animation = "_ui_pageIn 0.3s ease forwards";
    });
    /* Observe route changes via URL hash/path changes */
    var lastPath = location.pathname + location.hash;
    setInterval(function() {
      var curPath = location.pathname + location.hash;
      if (curPath !== lastPath) {
        lastPath = curPath;
        if (mainContent && !reducedMotion.matches) {
          mainContent.style.animation = "none";
          void mainContent.offsetHeight;
          mainContent.style.animation = "_ui_pageIn 0.3s ease forwards";
        }
      }
    }, 100);
    /* Inject keyframes */
    var pageStyle = document.createElement("style");
    pageStyle.textContent =
      "@keyframes _ui_pageIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }";
    document.head.appendChild(pageStyle);
  })();

  /* ============================================
     STAGGERED LIST ENTRANCE
     ============================================ */
  (function initStaggeredList() {
    if (reducedMotion.matches) return;
    var staggerStyle = document.createElement("style");
    staggerStyle.textContent =
      "@keyframes _ui_staggerIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }" +
      ".entity-wrapper { animation: _ui_staggerIn 0.25s ease both; }" +
      ".entity-wrapper:nth-child(1) { animation-delay: 0ms; }" +
      ".entity-wrapper:nth-child(2) { animation-delay: 30ms; }" +
      ".entity-wrapper:nth-child(3) { animation-delay: 60ms; }" +
      ".entity-wrapper:nth-child(4) { animation-delay: 90ms; }" +
      ".entity-wrapper:nth-child(5) { animation-delay: 120ms; }" +
      ".entity-wrapper:nth-child(6) { animation-delay: 150ms; }" +
      ".entity-wrapper:nth-child(7) { animation-delay: 180ms; }" +
      ".entity-wrapper:nth-child(8) { animation-delay: 210ms; }" +
      ".entity-wrapper:nth-child(9) { animation-delay: 240ms; }" +
      ".entity-wrapper:nth-child(10) { animation-delay: 270ms; }" +
      ".entity-wrapper:nth-child(n+11) { animation-delay: 300ms; }";
    document.head.appendChild(staggerStyle);
  })();

  /* ============================================
     CURSOR GLOW — soft light follows mouse
     ============================================ */
  (function initCursorGlow() {
    if (reducedMotion.matches) return;
    var glow = document.createElement("div");
    glow.id = "ui-beautify-cursor-glow";
    glow.style.cssText =
      "position:fixed;width:300px;height:300px;border-radius:50%;" +
      "pointer-events:none;z-index:0;opacity:0;" +
      "background:radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%);" +
      "transition:opacity 0.3s ease;transform:translate(-50%,-50%);will-change:left,top;";
    document.body.appendChild(glow);

    var mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
    var visible = false, rafId = null;

    function lerp(a, b, t) { return a + (b - a) * t; }

    function animate() {
      glowX = lerp(glowX, mouseX, 0.25);
      glowY = lerp(glowY, mouseY, 0.25);
      glow.style.left = glowX + "px";
      glow.style.top = glowY + "px";
      rafId = requestAnimationFrame(animate);
    }

    document.addEventListener("mousemove", function(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) {
        glowX = mouseX; glowY = mouseY;
        glow.style.opacity = "1";
        visible = true;
        rafId = requestAnimationFrame(animate);
      }
    });
    document.addEventListener("mouseleave", function() {
      glow.style.opacity = "0"; visible = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    });

    /* Update glow color based on theme */
    function updateGlowColor(theme) {
      var colors = {
        "default": "rgba(76,203,160,0.12)",
        "sakura": "rgba(236,72,153,0.12)",
        "ocean": "rgba(59,130,246,0.12)",
        "dark": "rgba(139,92,246,0.15)",
        "aurora": "rgba(168,85,247,0.15)",
        "minimal": "rgba(0,0,0,0.04)"
      };
      var c = colors[theme] || colors["default"];
      glow.style.background = "radial-gradient(circle," + c + " 0%,transparent 70%)";
    }
    /* Expose for theme switch */
    window._uiBeautifyUpdateGlow = updateGlowColor;
  })();

  /* ============================================
     ENHANCED PARTICLES — shooting stars, wind, fish
     ============================================ */
  (function enhanceParticles() {
    /* Shooting star for dark theme */
    var origApply = FX.apply.bind(FX);
    var shootingStarInterval = null;

    FX.apply = function(theme) {
      origApply(theme);
      clearInterval(shootingStarInterval);

      /* Update cursor glow color */
      if (window._uiBeautifyUpdateGlow) {
        window._uiBeautifyUpdateGlow(theme);
      }

      if (theme === "dark" && !reducedMotion.matches) {
        shootingStarInterval = setInterval(function() {
          if (!FX.ctx || !FX.canvas) return;
          var ctx = FX.ctx;
          var startX = Math.random() * FX.w;
          var startY = Math.random() * FX.h * 0.3;
          var len = 60 + Math.random() * 80;
          var angle = Math.PI / 4 + Math.random() * 0.3;
          var frames = 0;
          var maxFrames = 20;

          function drawStar() {
            if (frames >= maxFrames) return;
            var progress = frames / maxFrames;
            var alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
            var x = startX + Math.cos(angle) * len * progress;
            var y = startY + Math.sin(angle) * len * progress;

            ctx.save();
            ctx.globalAlpha = alpha * 0.6;
            ctx.strokeStyle = "#a78bfa";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - Math.cos(angle) * 20, y - Math.sin(angle) * 20);
            ctx.stroke();
            /* bright head */
            ctx.globalAlpha = alpha;
            ctx.fillStyle = "#c4b5fd";
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            frames++;
            requestAnimationFrame(drawStar);
          }
          drawStar();
        }, 4000 + Math.random() * 6000);
      }

      /* Wind gust for sakura */
      if (theme === "sakura" && !reducedMotion.matches && FX.particles) {
        setInterval(function() {
          FX.particles.forEach(function(p) {
            p.vx += 1.5; /* push right */
            setTimeout(function() { p.vx -= 1.5; }, 2000);
          });
        }, 8000 + Math.random() * 5000);
      }
    };
  })();
})();

/* Plugin Module Registration */
try {
  window["plugin-ui-beautify"] = (function(n) {
    "use strict";
    return n.definePlugin({
      components: {},
      routes: [],
      ucRoutes: [],
      extensionPoints: {},
    });
  })(HaloUiShared);
} catch(e) {
  /* HaloUiShared may not be available, theme loading still works */
}
