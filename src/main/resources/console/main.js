/* UI Beautify — Theme Loader + Particle Effects (v1.1.2) */
(function() {
  "use strict";

  var PLUGIN_NAME = "plugin-ui-beautify";
  var PLUGIN_VERSION = "1.3.2";
  var LINK_ID = "ui-beautify-theme-css";
  var CANVAS_ID = "ui-beautify-fx-canvas";
  var CUSTOM_STYLE_ID = "ui-beautify-custom-css";
  var BASE_URL = "/plugins/" + PLUGIN_NAME + "/assets/console/";
  var CONFIG_URL = "/apis/api.console.halo.run/v1alpha1/plugins/" +
    PLUGIN_NAME + "/json-config";
  var VALID_THEMES = ["default", "ocean", "deepblue", "dark", "sakura", "minimal", "aurora"];
  var currentTheme = null;
  var enableEffects = true;
  var enableCursorGlow = true;
  var enablePageTransition = true;
  var enableListAnimation = true;
  var enableMacOSCards = true;
  var enable3DCards = true;
  var enableWallpaper = true;
  var enableWelcomeBanner = true;
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
          enableCursorGlow = data.basic.enableCursorGlow !== false;
          enablePageTransition = data.basic.enablePageTransition !== false;
          enableListAnimation = data.basic.enableListAnimation !== false;
          enableMacOSCards = data.basic.enableMacOSCards !== false;
          enable3DCards = data.basic.enable3DCards !== false;
          enableWallpaper = data.basic.enableWallpaper !== false;
          enableWelcomeBanner = data.basic.enableWelcomeBanner !== false;
          applyCustomCss(data.basic.customCss || "");
          /* Apply toggle states */
          applyToggleStates();
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

  /* Toggle states for performance features */
  function applyToggleStates() {
    /* Cursor glow */
    var glowEl = document.getElementById("ui-beautify-cursor-glow");
    if (glowEl) glowEl.style.display = enableCursorGlow ? "" : "none";
    /* List animation */
    var listStyleEl = document.getElementById("ui-beautify-list-anim");
    if (listStyleEl) listStyleEl.disabled = !enableListAnimation;
    /* Page transition */
    var pageStyleEl = document.getElementById("ui-beautify-page-anim");
    if (pageStyleEl) pageStyleEl.disabled = !enablePageTransition;
    /* macOS cards — remove injected elements if disabled */
    var macLights = document.querySelectorAll(".ui-traffic-lights");
    macLights.forEach(function(el) {
      if (!enableMacOSCards) {
        var header = el.parentElement;
        if (header) header.style.paddingLeft = "";
        el.remove();
      }
    });
    /* 3D cards — clear transforms */
    if (!enable3DCards) {
      document.querySelectorAll(".dashboard .vue-grid-item > div").forEach(function(el) {
        el.style.transform = "";
      });
    }
    /* Wallpaper */
    var wallEl = document.getElementById("ui-beautify-wallpaper");
    if (wallEl) wallEl.style.display = enableWallpaper ? "" : "none";
    /* Aurora background */
    var auroraEl = document.getElementById("ui-beautify-aurora-bg");
    if (auroraEl) auroraEl.style.display = enableWallpaper ? "" : "none";
    /* Welcome banner */
    var bannerEl = document.getElementById("ui-welcome-banner");
    if (bannerEl) bannerEl.style.display = enableWelcomeBanner ? "" : "none";
    /* Sidebar overhaul */
    var sidebarStyle = document.getElementById("ui-beautify-sidebar-overhaul");
    if (sidebarStyle) sidebarStyle.disabled = !enableMacOSCards;
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

      deepblue: {
        count: 15,
        color: function() {
          var colors = ["rgba(56,189,248,", "rgba(14,165,233,", "rgba(99,102,241,", "rgba(129,140,248,"];
          var c = colors[Math.floor(Math.random() * colors.length)];
          return c + (0.06 + Math.random() * 0.1).toFixed(2) + ")";
        },
        size: function() { return 2 + Math.random() * 5; },
        speed: function() { return 0.1 + Math.random() * 0.3; },
        draw: function(ctx, p) {
          /* Bioluminescent glow */
          var grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          grd.addColorStop(0, p.color);
          grd.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
          /* Core */
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(200,220,255,0.4)";
          ctx.fill();
        },
        update: function(p, w, h) {
          p.y -= p.vy * 0.3;
          p.x += Math.sin(p.wobble) * 0.4;
          p.wobble += 0.015;
          /* Pulsate */
          p.size += Math.sin(p.wobble * 2) * 0.02;
          if (p.y < -30) {
            p.y = h + 20;
            p.x = Math.random() * w;
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
        if (mainContent && !reducedMotion.matches && enablePageTransition) {
          mainContent.style.animation = "none";
          void mainContent.offsetHeight;
          mainContent.style.animation = "_ui_pageIn 0.3s ease forwards";
        }
      }
    }, 100);
    /* Inject keyframes */
    var pageStyle = document.createElement("style");
    pageStyle.id = "ui-beautify-page-anim";
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
    staggerStyle.id = "ui-beautify-list-anim";
    staggerStyle.textContent =
      "@keyframes _ui_staggerIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }" +
      ".entity-wrapper:nth-child(-n+8) { animation: _ui_staggerIn 0.2s ease both; }" +
      ".entity-wrapper:nth-child(1) { animation-delay: 0ms; }" +
      ".entity-wrapper:nth-child(2) { animation-delay: 25ms; }" +
      ".entity-wrapper:nth-child(3) { animation-delay: 50ms; }" +
      ".entity-wrapper:nth-child(4) { animation-delay: 75ms; }" +
      ".entity-wrapper:nth-child(5) { animation-delay: 100ms; }" +
      ".entity-wrapper:nth-child(6) { animation-delay: 125ms; }" +
      ".entity-wrapper:nth-child(7) { animation-delay: 150ms; }" +
      ".entity-wrapper:nth-child(8) { animation-delay: 175ms; }";
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
    var visible = false, rafId = null, idleTimer = null;

    function lerp(a, b, t) { return a + (b - a) * t; }

    function animate() {
      glowX = lerp(glowX, mouseX, 0.25);
      glowY = lerp(glowY, mouseY, 0.25);
      glow.style.left = glowX + "px";
      glow.style.top = glowY + "px";
      /* Stop when close enough (idle) */
      if (Math.abs(glowX - mouseX) < 0.5 && Math.abs(glowY - mouseY) < 0.5) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(animate);
    }

    document.addEventListener("mousemove", function(e) {
      if (!enableCursorGlow) {
        glow.style.opacity = "0";
        return;
      }
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) {
        glowX = mouseX; glowY = mouseY;
        glow.style.opacity = "1";
        visible = true;
      }
      if (!rafId) rafId = requestAnimationFrame(animate);
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
        "deepblue": "rgba(56,189,248,0.15)",
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

  /* ============================================
     BIG FEATURE 1: AURORA DYNAMIC BACKGROUND
     Multi-layer gradient that slowly moves
     ============================================ */
  (function initAuroraBackground() {
    if (reducedMotion.matches) return;
    var aurora = document.createElement("div");
    aurora.id = "ui-beautify-aurora-bg";
    aurora.style.cssText =
      "position:fixed;top:0;left:0;width:200%;height:200%;" +
      "pointer-events:none;z-index:-1;opacity:0.5;" +
      "will-change:transform;";
    document.body.prepend(aurora);

    function updateAuroraColors(theme) {
      var gradients = {
        "default": "radial-gradient(ellipse at 20% 50%, rgba(76,203,160,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(54,179,137,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(76,203,160,0.06) 0%, transparent 50%)",
        "sakura": "radial-gradient(ellipse at 20% 50%, rgba(236,72,153,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(219,39,119,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(244,114,182,0.06) 0%, transparent 50%)",
        "ocean": "radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(37,99,235,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(96,165,250,0.06) 0%, transparent 50%)",
        "deepblue": "radial-gradient(ellipse at 20% 50%, rgba(56,189,248,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(14,165,233,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(99,102,241,0.08) 0%, transparent 50%)",
        "dark": "radial-gradient(ellipse at 20% 50%, rgba(139,92,246,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(167,139,250,0.04) 0%, transparent 50%)",
        "aurora": "radial-gradient(ellipse at 20% 50%, rgba(168,85,247,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(236,72,153,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(129,140,248,0.06) 0%, transparent 50%)",
        "minimal": "none"
      };
      aurora.style.background = gradients[theme] || gradients["default"];
      if (theme === "minimal") aurora.style.opacity = "0";
      else aurora.style.opacity = "0.5";
    }

    var angle = 0;
    function animateAurora() {
      angle += 0.001;
      var x = Math.sin(angle) * 5;
      var y = Math.cos(angle * 0.7) * 3;
      var r = Math.sin(angle * 0.3) * 2;
      aurora.style.transform = "translate(" + x + "%, " + y + "%) rotate(" + r + "deg)";
      requestAnimationFrame(animateAurora);
    }
    animateAurora();
    window._uiBeautifyUpdateAurora = updateAuroraColors;
  })();
  /* ============================================
     BIG FEATURE 2: macOS WINDOW CARDS
     Traffic light dots on card headers
     ============================================ */
  (function initMacOSCards() {
    function injectTrafficLights(header) {
      if (!enableMacOSCards) return;
      if (header.querySelector(".ui-traffic-lights")) return;
      var container = document.createElement("div");
      container.className = "ui-traffic-lights";
      container.style.cssText = "position:absolute;left:14px;top:50%;transform:translateY(-50%);display:flex;gap:7px;z-index:1;pointer-events:none;";
      var colors = ["#ff5f57", "#febc2e", "#28c840"];
      for (var i = 0; i < 3; i++) {
        var dot = document.createElement("span");
        dot.style.cssText = "width:11px;height:11px;border-radius:50%;background:" + colors[i] + ";display:block;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.12);";
        container.appendChild(dot);
      }
      header.style.position = "relative";
      header.style.paddingLeft = "72px";
      header.prepend(container);
    }

    function scanAndInject() {
      if (!enableMacOSCards) return;
      document.querySelectorAll(".card-header").forEach(injectTrafficLights);
    }

    scanAndInject();
    var macDebounce = null;
    var macObserver = new MutationObserver(function() {
      if (macDebounce) clearTimeout(macDebounce);
      macDebounce = setTimeout(scanAndInject, 300);
    });
    macObserver.observe(document.body, { childList: true, subtree: true });
  })();
  /* ============================================
     BIG FEATURE 3: SIDEBAR OVERHAUL
     Card-style menu items + enlarged icons
     ============================================ */
  (function initSidebarOverhaul() {
    var sidebarStyle = document.createElement("style");
    sidebarStyle.id = "ui-beautify-sidebar-overhaul";
    sidebarStyle.textContent =
      ".sidebar .menu-item-title {" +
      "  margin: 3px 10px !important;" +
      "  padding: 9px 12px !important;" +
      "  border-radius: 10px !important;" +
      "  border: 1px solid transparent !important;" +
      "  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;" +
      "}" +
      ".sidebar .menu-item-title:hover {" +
      "  border-color: rgba(128,128,128,0.1) !important;" +
      "  box-shadow: 0 2px 8px rgba(0,0,0,0.04) !important;" +
      "}" +
      ".sidebar .menu-item-title.active {" +
      "  box-shadow: 0 2px 12px rgba(0,0,0,0.06) !important;" +
      "}" +
      ".sidebar .menu-icon svg {" +
      "  width: 22px !important;" +
      "  height: 22px !important;" +
      "  transition: transform 0.2s ease !important;" +
      "}" +
      ".sidebar .menu-item-title:hover .menu-icon svg {" +
      "  transform: scale(1.15) !important;" +
      "}" +
      ".sidebar .menu-label {" +
      "  margin-top: 16px !important;" +
      "  padding: 6px 22px 4px !important;" +
      "  font-size: 10px !important;" +
      "  text-transform: uppercase !important;" +
      "  letter-spacing: 1.5px !important;" +
      "  opacity: 0.5 !important;" +
      "}";
    document.head.appendChild(sidebarStyle);
  })();
  /* ============================================
     BIG FEATURE 4: DASHBOARD VISUAL OVERHAUL
     Gradient cards + large numbers + sparklines
     ============================================ */
  (function initDashboardOverhaul() {
    var dashStyle = document.createElement("style");
    dashStyle.id = "ui-beautify-dashboard";
    dashStyle.textContent =
      ".dashboard .vue-grid-item > div {" +
      "  overflow: hidden !important;" +
      "  position: relative !important;" +
      "}" +
      ".dashboard [class*='text-2xl']," +
      ".dashboard [class*='text-3xl'] {" +
      "  font-size: 2.25rem !important;" +
      "  font-weight: 800 !important;" +
      "  letter-spacing: -0.03em !important;" +
      "}" +
      ".dashboard .rounded-full[class*='bg-gray-100']," +
      ".dashboard .rounded-full[class*='bg-gray'] {" +
      "  width: 48px !important;" +
      "  height: 48px !important;" +
      "  display: flex !important;" +
      "  align-items: center !important;" +
      "  justify-content: center !important;" +
      "}" +
      ".dashboard .rounded-full[class*='bg-gray-100'] svg," +
      ".dashboard .rounded-full[class*='bg-gray'] svg {" +
      "  width: 24px !important;" +
      "  height: 24px !important;" +
      "}";
    document.head.appendChild(dashStyle);

    /* Inject sparklines */
    function injectSparklines() {
      var cards = document.querySelectorAll(".dashboard .vue-grid-item > div");
      cards.forEach(function(card) {
        if (card.querySelector(".ui-sparkline")) return;
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 120 30");
        svg.setAttribute("class", "ui-sparkline");
        svg.style.cssText = "position:absolute;bottom:0;left:0;width:100%;height:35px;opacity:0.15;pointer-events:none;";
        var points = [];
        for (var i = 0; i < 20; i++) {
          points.push((i / 19 * 120).toFixed(1) + "," + (5 + Math.random() * 20).toFixed(1));
        }
        svg.innerHTML = '<polyline points="' + points.join(" ") + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
        card.appendChild(svg);
      });
    }

    /* Retry until dashboard loads */
    var dashRetry = setInterval(function() {
      if (document.querySelector(".dashboard .vue-grid-item")) {
        injectSparklines();
        clearInterval(dashRetry);
      }
    }, 500);
    setTimeout(function() { clearInterval(dashRetry); }, 15000);

    /* Re-inject on route change */
    var lastDashPath = "";
    setInterval(function() {
      var p = location.pathname;
      if (p !== lastDashPath && p.indexOf("/console") > -1) {
        lastDashPath = p;
        setTimeout(injectSparklines, 800);
      }
    }, 300);
  })();
  /* ============================================
     BIG FEATURE 5: ZEN MODE EDITOR
     Immersive full-screen writing experience
     ============================================ */
  (function initZenMode() {
    var zenStyle = document.createElement("style");
    zenStyle.id = "ui-beautify-zen";
    zenStyle.textContent =
      "body.ui-zen-mode .sidebar { transform: translateX(-100%) !important; transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important; }" +
      "body.ui-zen-mode .main-content { margin-left: 0 !important; width: 100% !important; transition: margin-left 0.5s ease !important; }" +
      "body.ui-zen-mode .page-header { opacity: 0 !important; height: 0 !important; overflow: hidden !important; transition: opacity 0.3s ease, height 0.3s ease !important; }" +
      "body.ui-zen-mode .page-header:hover { opacity: 1 !important; height: auto !important; }" +
      "body.ui-zen-mode .editor-header { opacity: 0.3 !important; transition: opacity 0.3s ease !important; }" +
      "body.ui-zen-mode .editor-header:hover { opacity: 1 !important; }" +
      "body.ui-zen-mode .ProseMirror { max-width: 48rem !important; margin: 0 auto !important; padding: 2rem !important; min-height: 80vh !important; }" +
      "body.ui-zen-mode .editor-entry-extra { display: none !important; }" +
      "body.ui-zen-mode #ui-zen-btn { background: #ef4444 !important; }" +
      "body.ui-zen-mode #ui-zen-btn::after { content: '退出 Zen'; }" +
      "body:not(.ui-zen-mode) #ui-zen-btn::after { content: '🧘 Zen'; }";
    document.head.appendChild(zenStyle);

    var zenBtn = document.createElement("button");
    zenBtn.id = "ui-zen-btn";
    zenBtn.style.cssText =
      "position:fixed;bottom:24px;right:24px;z-index:9999;" +
      "padding:10px 20px;border-radius:24px;border:none;cursor:pointer;" +
      "font-size:14px;font-weight:600;color:#fff;" +
      "background:linear-gradient(135deg,#667eea,#764ba2);" +
      "box-shadow:0 4px 16px rgba(102,126,234,0.4);" +
      "transition:all 0.3s ease;display:none;";
    zenBtn.addEventListener("click", function() {
      document.body.classList.toggle("ui-zen-mode");
    });
    document.body.appendChild(zenBtn);

    /* Show button only on editor pages */
    setInterval(function() {
      var isEditor = !!document.querySelector(".ProseMirror");
      zenBtn.style.display = isEditor ? "block" : "none";
      if (!isEditor) document.body.classList.remove("ui-zen-mode");
    }, 500);

    /* ESC to exit */
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape") document.body.classList.remove("ui-zen-mode");
    });
  })();
  /* ============================================
     BIG FEATURE 6: 3D CARD TILT ON HOVER
     Perspective tilt following mouse position
     ============================================ */
  (function init3DCards() {
    if (reducedMotion.matches) return;

    document.addEventListener("mousemove", function(e) {
      if (!enable3DCards) return;
      /* Only tilt small dashboard cards, not full-page cards */
      var cards = document.querySelectorAll(".dashboard .vue-grid-item > div");
      cards.forEach(function(card) {
        var rect = card.getBoundingClientRect();
        if (rect.width > 600) return; /* Skip large cards */
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transition = "transform 0.15s ease-out";
        card.style.transform = "perspective(800px) rotateY(" + (x * 3).toFixed(2) + "deg) rotateX(" + (-y * 3).toFixed(2) + "deg)";
      });
    });

    document.addEventListener("mouseout", function(e) {
      var card = e.target.closest(".dashboard .vue-grid-item > div");
      if (card && !card.contains(e.relatedTarget)) {
        card.style.transform = "";
      }
    });
  })();
  /* ============================================
     BIG FEATURE 7: RAINBOW GLOW BORDERS
     Rotating conic-gradient on hover/focus
     ============================================ */
  (function initRainbowBorders() {
    if (reducedMotion.matches) return;
    var rbStyle = document.createElement("style");
    rbStyle.textContent =
      "@keyframes _ui_rainbowSpin { 0% { --_rb_angle: 0deg; } 100% { --_rb_angle: 360deg; } }" +
      "@property --_rb_angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }" +
      ".card-wrapper { position: relative !important; }" +
      ".card-wrapper:hover::before {" +
      "  content: '' !important; position: absolute !important;" +
      "  inset: -2px !important; border-radius: inherit !important; z-index: -1 !important;" +
      "  background: conic-gradient(from var(--_rb_angle), #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #5f27cd, #ff6b6b) !important;" +
      "  animation: _ui_rainbowSpin 6s linear infinite !important;" +
      "  opacity: 0.15 !important; filter: blur(12px) !important;" +
      "}";
    document.head.appendChild(rbStyle);
  })();
  /* ============================================
     BIG FEATURE 8: PAGE SLIDE TRANSITION
     Slide-in from right on route change
     ============================================ */
  (function initSlideTransition() {
    if (reducedMotion.matches) return;
    var slideStyle = document.createElement("style");
    slideStyle.id = "ui-beautify-slide-transition";
    slideStyle.textContent =
      "@keyframes _ui_slideIn { from { opacity: 0; transform: translateX(30px) scale(0.98); } to { opacity: 1; transform: translateX(0) scale(1); } }" +
      "@keyframes _ui_slideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-20px); } }";
    document.head.appendChild(slideStyle);

    var lastSlide = location.pathname;
    setInterval(function() {
      if (!enablePageTransition) return;
      var cur = location.pathname;
      if (cur !== lastSlide) {
        lastSlide = cur;
        var mc = document.querySelector(".main-content");
        if (mc) {
          mc.style.animation = "none";
          void mc.offsetHeight;
          mc.style.animation = "_ui_slideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards";
        }
      }
    }, 100);
  })();
  /* ============================================
     BIG FEATURE 9: WELCOME BANNER
     Time-based greeting on dashboard
     ============================================ */
  (function initWelcomeBanner() {
    function createBanner() {
      var dashboard = document.querySelector(".dashboard");
      if (!dashboard || dashboard.querySelector("#ui-welcome-banner")) return;

      var hour = new Date().getHours();
      var greeting, emoji, gradient;
      if (hour < 6) { greeting = "夜深了"; emoji = "🌙"; gradient = "linear-gradient(135deg, #1a1a2e, #16213e)"; }
      else if (hour < 12) { greeting = "早上好"; emoji = "☀️"; gradient = "linear-gradient(135deg, #f093fb, #f5576c)"; }
      else if (hour < 14) { greeting = "中午好"; emoji = "🌤️"; gradient = "linear-gradient(135deg, #4facfe, #00f2fe)"; }
      else if (hour < 18) { greeting = "下午好"; emoji = "🌅"; gradient = "linear-gradient(135deg, #fa709a, #fee140)"; }
      else { greeting = "晚上好"; emoji = "🌆"; gradient = "linear-gradient(135deg, #a18cd1, #fbc2eb)"; }

      /* Try to get username */
      var userName = "";
      var userEl = document.querySelector(".sidebar__profile .profile-name") ||
                   document.querySelector("[class*='profile'] [class*='name']") ||
                   document.querySelector(".sidebar__profile span");
      if (userEl) userName = "，" + userEl.textContent.trim();

      var banner = document.createElement("div");
      banner.id = "ui-welcome-banner";
      banner.style.cssText =
        "background:" + gradient + ";border-radius:16px;padding:28px 32px;" +
        "margin-bottom:20px;color:#fff;position:relative;overflow:hidden;" +
        "box-shadow:0 8px 32px rgba(0,0,0,0.12);";
      banner.innerHTML =
        '<div style="position:relative;z-index:1;">' +
        '<div style="font-size:2.5rem;margin-bottom:4px;">' + emoji + '</div>' +
        '<div style="font-size:1.75rem;font-weight:700;letter-spacing:-0.02em;">' + greeting + userName + '</div>' +
        '<div style="font-size:0.9rem;opacity:0.8;margin-top:6px;">' + new Date().toLocaleDateString("zh-CN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) + '</div>' +
        '</div>' +
        '<div style="position:absolute;top:-20%;right:-5%;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.1);"></div>' +
        '<div style="position:absolute;bottom:-30%;right:15%;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,0.06);"></div>';

      dashboard.prepend(banner);
    }

    /* Retry until dashboard loads */
    var bannerRetry = setInterval(function() {
      if (document.querySelector(".dashboard")) {
        createBanner();
        clearInterval(bannerRetry);
      }
    }, 500);
    setTimeout(function() { clearInterval(bannerRetry); }, 15000);

    /* Re-inject on route change */
    var lastBannerPath = "";
    setInterval(function() {
      var p = location.pathname;
      if (p !== lastBannerPath) {
        lastBannerPath = p;
        setTimeout(createBanner, 800);
      }
    }, 300);
  })();
  /* ============================================
     BIG FEATURE 10: DYNAMIC WALLPAPER
     Particle network with connecting lines
     ============================================ */
  (function initDynamicWallpaper() {
    if (reducedMotion.matches) return;
    var wallCanvas = document.createElement("canvas");
    wallCanvas.id = "ui-beautify-wallpaper";
    wallCanvas.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;" +
      "pointer-events:none;z-index:-2;opacity:0.4;";
    document.body.prepend(wallCanvas);
    var wCtx = wallCanvas.getContext("2d");
    var wParticles = [];
    var WALL_COUNT = 40;
    var wallColor = "59,130,246";

    function wallResize() {
      wallCanvas.width = window.innerWidth;
      wallCanvas.height = window.innerHeight;
    }
    window.addEventListener("resize", wallResize);
    wallResize();

    for (var i = 0; i < WALL_COUNT; i++) {
      wParticles.push({
        x: Math.random() * wallCanvas.width,
        y: Math.random() * wallCanvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 1 + Math.random() * 1.5
      });
    }

    function wallDraw() {
      wCtx.clearRect(0, 0, wallCanvas.width, wallCanvas.height);
      for (var i = 0; i < wParticles.length; i++) {
        var p = wParticles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > wallCanvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > wallCanvas.height) p.vy *= -1;

        wCtx.beginPath();
        wCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        wCtx.fillStyle = "rgba(" + wallColor + ",0.5)";
        wCtx.fill();

        for (var j = i + 1; j < wParticles.length; j++) {
          var q = wParticles[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            wCtx.beginPath();
            wCtx.moveTo(p.x, p.y);
            wCtx.lineTo(q.x, q.y);
            wCtx.strokeStyle = "rgba(" + wallColor + "," + (0.12 * (1 - dist / 130)).toFixed(3) + ")";
            wCtx.lineWidth = 0.5;
            wCtx.stroke();
          }
        }
      }
      requestAnimationFrame(wallDraw);
    }
    wallDraw();

    window._uiBeautifyUpdateWallpaper = function(theme) {
      var colors = {
        "default": "76,203,160", "sakura": "236,72,153", "ocean": "59,130,246",
        "deepblue": "56,189,248", "dark": "139,92,246", "aurora": "168,85,247",
        "minimal": "148,163,184"
      };
      wallColor = colors[theme] || colors["default"];
    };
  })();
  /* Update all dynamic features on theme change */
  var origLoadTheme = loadThemeCSS;
  loadThemeCSS = function(theme) {
    origLoadTheme(theme);
    if (window._uiBeautifyUpdateAurora) window._uiBeautifyUpdateAurora(theme);
    if (window._uiBeautifyUpdateWallpaper) window._uiBeautifyUpdateWallpaper(theme);
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
