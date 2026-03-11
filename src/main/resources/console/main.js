/* UI Beautify — Theme Loader + Particle Effects (v3.4.0) */
(function() {
  "use strict";

  var PLUGIN_NAME = "plugin-ui-beautify";
  var PLUGIN_VERSION = "1.1.0";
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
    var style = document.createElement("style");
    style.id = CUSTOM_STYLE_ID;
    style.textContent = css;
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

    if (typeof url === "string" && url.indexOf(CONFIG_URL) !== -1
        && options && options.method
        && options.method.toUpperCase() === "PUT") {
      return originalFetch.apply(this, arguments).then(function(response) {
        if (response.ok || response.status === 204) {
          setTimeout(function() {
            fetchConfig().then(function(newTheme) {
              if (newTheme !== currentTheme) {
                currentTheme = newTheme;
                loadThemeCSS(newTheme);
              } else {
                /* effects toggle may have changed */
                FX.apply(newTheme);
              }
            });
          }, 300);
        }
        return response;
      });
    }

    return originalFetch.apply(this, arguments);
  };
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
