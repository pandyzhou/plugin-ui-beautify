/* UI Beautify — Modular Architecture */
(function() {
  "use strict";

  /* ========== CONSTANTS ========== */
  var PLUGIN_NAME = "plugin-ui-beautify";
  var PLUGIN_VERSION = "2.1.0";
  var LINK_ID = "ui-beautify-theme-css";
  var CANVAS_ID = "ui-beautify-fx-canvas";
  var CUSTOM_STYLE_ID = "ui-beautify-custom-css";
  var BASE_URL = "/plugins/" + PLUGIN_NAME + "/assets/console/";
  var CONFIG_URL = "/apis/api.console.halo.run/v1alpha1/plugins/" + PLUGIN_NAME + "/json-config";
  var VALID_THEMES = ["default", "ocean", "deepblue", "dark", "sakura", "minimal", "aurora", "neon"];
  var DARK_THEMES = ["dark", "deepblue", "aurora", "neon"];
  var DEFAULT_THEME = "minimal";
  var BASE_LINK_ID = "ui-beautify-base-css";
  var darkMql = window.matchMedia("(prefers-color-scheme: dark)");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function getSidebarWidth() {
    var sb = document.querySelector(".sidebar");
    return sb ? sb.getBoundingClientRect().width : 260;
  }

  var ColorUtils = {
    toRgba: function(color, alpha, fallback) {
      if (!color || !color.trim()) return fallback;
      color = color.trim();
      if (color.startsWith("rgb")) {
        var match = color.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        return match
          ? ("rgba(" + match[1] + "," + match[2] + "," + match[3] + "," + alpha + ")")
          : fallback;
      }
      if (color.startsWith("#")) {
        var hex = color.slice(1);
        if (hex.length === 3) {
          hex = hex.split("").map(function(ch) { return ch + ch; }).join("");
        }
        if (hex.length === 6) {
          var r = parseInt(hex.slice(0, 2), 16);
          var g = parseInt(hex.slice(2, 4), 16);
          var b = parseInt(hex.slice(4, 6), 16);
          return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
        }
      }
      return fallback;
    },

    toRgbTriplet: function(color, fallback) {
      if (!color || !color.trim()) return fallback;
      color = color.trim();
      if (color.startsWith("rgb(") || color.startsWith("rgba(")) {
        var match = color.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        return match ? (match[1] + "," + match[2] + "," + match[3]) : fallback;
      }
      if (color.startsWith("#")) {
        var hex = color.slice(1);
        if (hex.length === 3) {
          hex = hex.split("").map(function(ch) { return ch + ch; }).join("");
        }
        if (hex.length === 6) {
          return parseInt(hex.slice(0, 2), 16) + "," + parseInt(hex.slice(2, 4), 16) + "," + parseInt(hex.slice(4, 6), 16);
        }
      }
      return fallback;
    }
  };

  /* ========== APP CORE — Config, Router, Module Registry ========== */

  var App = {
    /* --- State --- */
    currentTheme: null,
    toggles: {},          /* { enableEffects: true, enableCursorGlow: true, ... } */
    _modules: [],         /* registered module descriptors */
    _lastPath: "",        /* for route change detection */
    _routeTimer: null,
    _mutationObs: null,
    _mutationCbs: [],     /* modules that need DOM mutation notifications */

    /* --- Config --- */
    fetchConfig: function() {
      var self = this;
      return fetch(CONFIG_URL)
        .then(function(res) { return res.ok ? res.json().catch(function() { return null; }) : null; })
        .then(function(data) {
          if (data && data.basic) {
            self._applyCustomCss(data.basic.customCss || "");
            var f = data.features || {};
            var b = data.basic;
            function readToggle(name) {
              if (data.features && f[name] !== undefined) return f[name] !== false;
              if (b[name] !== undefined) return b[name] !== false;
              return true;
            }
            self.toggles.enableEffects = readToggle("enableEffects");
            self.toggles.enableCursorGlow = readToggle("enableCursorGlow");
            self.toggles.enablePageTransition = readToggle("enablePageTransition");
            self.toggles.enableListAnimation = readToggle("enableListAnimation");
            self.toggles.enableMacOSCards = readToggle("enableMacOSCards");
            self.toggles.enable3DCards = readToggle("enable3DCards");
            self.toggles.enableWallpaper = readToggle("enableWallpaper");
            self.toggles.enableWelcomeBanner = readToggle("enableWelcomeBanner");
            self._applyToggleStates();
            return data.basic.consoleTheme || DEFAULT_THEME;
          }
          return DEFAULT_THEME;
        })
        .catch(function() { return DEFAULT_THEME; });
    },

    isEnabled: function(toggleName) {
      return this.toggles[toggleName] !== false;
    },

    /* --- Theme --- */
    resolveTheme: function(theme) {
      if (theme !== "auto") return theme;
      return darkMql.matches ? "dark" : DEFAULT_THEME;
    },

    loadThemeCSS: function(theme) {
      theme = this.resolveTheme(theme);
      if (VALID_THEMES.indexOf(theme) === -1) theme = DEFAULT_THEME;

      var existing = document.getElementById(LINK_ID);
      if (existing && existing.dataset.theme === theme) {
        FX.apply(theme);
        this._notifyThemeChange(theme);
        return;
      }

      /* Smooth transition */
      var root = document.documentElement;
      root.style.transition = "background-color 0.35s ease, color 0.35s ease";
      setTimeout(function() { root.style.transition = ""; }, 500);

      /* Load base CSS (light or dark) */
      var isDark = DARK_THEMES.includes(theme);
      var baseName = isDark ? "theme-base-dark" : "theme-base-light";
      var existingBase = document.getElementById(BASE_LINK_ID);
      if (!existingBase || existingBase.dataset.base !== baseName) {
        if (existingBase) existingBase.remove();
        var baseLink = document.createElement("link");
        baseLink.id = BASE_LINK_ID;
        baseLink.rel = "stylesheet";
        baseLink.dataset.base = baseName;
        baseLink.href = BASE_URL + baseName + ".css?v=" + PLUGIN_VERSION;
        document.head.appendChild(baseLink);
      }

      /* Load theme-specific CSS — insert after base, remove old after new loads */
      var link = document.createElement("link");
      link.id = LINK_ID + "-loading";
      link.rel = "stylesheet";
      link.dataset.theme = theme;
      link.href = BASE_URL + "theme-" + theme + ".css?v=" + PLUGIN_VERSION;
      var oldLink = existing;
      link.onload = function() {
        link.id = LINK_ID;
        if (oldLink && oldLink.parentNode) oldLink.remove();
      };
      /* Fallback: if onload doesn't fire within 2s, force swap */
      setTimeout(function() {
        link.id = LINK_ID;
        if (oldLink && oldLink.parentNode) oldLink.remove();
      }, 2000);
      var baseEl = document.getElementById(BASE_LINK_ID);
      if (baseEl && baseEl.nextSibling) { baseEl.parentNode.insertBefore(link, baseEl.nextSibling); }
      else { document.head.appendChild(link); }

      FX.apply(theme);
      this._notifyThemeChange(theme);
    },

    /* --- Module Registry --- */
    register: function(mod) {
      this._modules.push(mod);
    },

    _initModules: function() {
      var self = this;
      this._modules.forEach(function(mod) {
        if (mod.skipIfReducedMotion && reducedMotion.matches) return;
        if (mod.toggle && !self.isEnabled(mod.toggle)) return;
        try { mod.init(self); } catch(e) { console.warn("[ui-beautify] Module " + mod.id + " init error:", e); }
      });
    },

    /* --- Router (event-driven with fallback poller) --- */
    _startRouter: function() {
      var self = this;
      this._lastPath = location.pathname + location.hash;
      this._routeCheckHandler = function() {
        var cur = location.pathname + location.hash;
        if (cur !== self._lastPath) {
          self._lastPath = cur;
          self._notifyRouteChange(cur);
        }
      };
      window.addEventListener("popstate", this._routeCheckHandler);
      window.addEventListener("hashchange", this._routeCheckHandler);
      // Intercept pushState/replaceState for Vue Router
      this._origPushState = history.pushState;
      this._origReplaceState = history.replaceState;
      history.pushState = function() { self._origPushState.apply(this, arguments); self._routeCheckHandler(); };
      history.replaceState = function() { self._origReplaceState.apply(this, arguments); self._routeCheckHandler(); };
      // Fallback poller at 500ms
      this._routeTimer = setInterval(this._routeCheckHandler, 500);
    },

    /* --- Unified MutationObserver --- */
    _startMutationObserver: function() {
      var self = this;
      var debounce = null;
      this._mutationObs = new MutationObserver(function() {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(function() {
          self._mutationCbs.forEach(function(cb) {
            try { cb(); } catch(e) {}
          });
        }, 250);
      });
      this._mutationObs.observe(document.body, { childList: true, subtree: true });
    },

    onMutation: function(cb) {
      this._mutationCbs.push(cb);
    },

    /* --- Notifications --- */
    _notifyThemeChange: function(theme) {
      this._modules.forEach(function(mod) {
        if (mod.onThemeChange) {
          try { mod.onThemeChange(theme); } catch(e) {}
        }
      });
    },

    _notifyRouteChange: function(path) {
      this._modules.forEach(function(mod) {
        if (mod.onRouteChange) {
          try { mod.onRouteChange(path); } catch(e) {}
        }
      });
    },

    /* --- Toggle States (disable/enable modules at runtime) --- */
    _applyToggleStates: function() {
      var self = this;
      this._modules.forEach(function(mod) {
        if (mod.toggle && mod.onToggle) {
          try { mod.onToggle(self.isEnabled(mod.toggle)); } catch(e) {}
        }
      });
    },

    /* --- Custom CSS --- */
    _applyCustomCss: function(css) {
      var existing = document.getElementById(CUSTOM_STYLE_ID);
      if (existing) existing.remove();
      if (!css || !css.trim()) return;
      var sanitized = css
        .replace(/<\/style/gi, "/* blocked */")
        .replace(/<script/gi, "/* blocked */")
        .replace(/expression\s*\(/gi, "/* blocked */")
        .replace(/javascript\s*:/gi, "/* blocked */")
        .replace(/@import\b/gi, "/* blocked */")
        .replace(/@charset\b/gi, "/* blocked */")
        .replace(/behavior\s*:/gi, "/* blocked */")
        .replace(/-moz-binding\s*:/gi, "/* blocked */")
        .replace(/url\s*\(\s*["']?\s*data\s*:/gi, "url(/* blocked */");
      var style = document.createElement("style");
      style.id = CUSTOM_STYLE_ID;
      style.textContent = sanitized;
      document.head.appendChild(style);
    },

    /* --- Toast --- */
    showRefreshHint: function() {
      if (document.getElementById("ui-beautify-refresh-toast")) return;
      if (!document.getElementById("ui-toast-keyframes")) {
        var ks = document.createElement("style");
        ks.id = "ui-toast-keyframes";
        ks.textContent = "@keyframes uiToastIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}"
          + "@keyframes uiToastOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(16px)}}";
        document.head.appendChild(ks);
      }
      var toast = document.createElement("div");
      toast.id = "ui-beautify-refresh-toast";
      toast.style.cssText = "position:fixed;bottom:32px;right:32px;z-index:99999;"
        + "display:flex;align-items:center;gap:10px;padding:12px 20px;"
        + "background:rgba(30,30,30,0.88);backdrop-filter:blur(12px);"
        + "color:#fff;border-radius:12px;font-size:13px;font-weight:500;"
        + "box-shadow:0 8px 32px rgba(0,0,0,0.25);cursor:pointer;"
        + "animation:uiToastIn .35s ease;font-family:system-ui,sans-serif;";
      toast.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">'
        + '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>'
        + '<span>设置已保存，刷新页面以完整应用</span>'
        + '<span style="background:rgba(255,255,255,0.15);padding:4px 12px;border-radius:6px;font-size:12px;">刷新</span>';
      toast.addEventListener("click", function() { location.reload(); });
      var timer = setTimeout(function() { dismissToast(toast); }, 8000);
      toast.addEventListener("mouseenter", function() { clearTimeout(timer); });
      toast.addEventListener("mouseleave", function() {
        timer = setTimeout(function() { dismissToast(toast); }, 3000);
      });
      document.body.appendChild(toast);

      /**
       * Dismisses a toast element by playing its exit animation and removing it from the DOM.
       * @param {HTMLElement} el - The toast element to dismiss; ignored if not present in the document.
       */
      function dismissToast(el) {
        if (!el || !el.parentNode) return;
        el.style.animation = "uiToastOut .3s ease forwards";
        setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
      }
    },

    /* --- Destroy All --- */
    destroyAll: function() {
      if (this._routeTimer) { clearInterval(this._routeTimer); this._routeTimer = null; }
      if (this._routeCheckHandler) {
        window.removeEventListener("popstate", this._routeCheckHandler);
        window.removeEventListener("hashchange", this._routeCheckHandler);
        history.pushState = this._origPushState;
        history.replaceState = this._origReplaceState;
        this._routeCheckHandler = null;
        this._origPushState = null;
        this._origReplaceState = null;
      }
      if (this._mutationObs) { this._mutationObs.disconnect(); this._mutationObs = null; }
      this._modules.forEach(function(mod) {
        if (mod.destroy) { try { mod.destroy(); } catch(e) { console.warn('[ui-beautify] Module ' + mod.id + ' destroy error:', e); } }
      });
    }
  };

  /* ========== PARTICLE EFFECTS ENGINE ========== */

  var FX = {
    canvas: null, ctx: null, raf: null,
    particles: [], config: null, w: 0, h: 0,

    THEMES: {
      sakura: {
        count: 22, wind: true,
        color: function() {
          var c = ["rgba(236,72,153,0.18)","rgba(244,114,182,0.15)","rgba(251,191,210,0.2)","rgba(253,164,200,0.16)"];
          return c[Math.floor(Math.random() * c.length)];
        },
        size: function() { return 6 + Math.random() * 10; },
        speed: function() { return 0.3 + Math.random() * 0.6; },
        draw: function(ctx, p) {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color; ctx.beginPath();
          for (var i = 0; i < 5; i++) {
            var a = (i * 72 - 90) * Math.PI / 180, r = p.size * 0.5;
            ctx.ellipse(Math.cos(a)*r*0.5, Math.sin(a)*r*0.5, r*0.45, r*0.25, a, 0, Math.PI*2);
          }
          ctx.fill(); ctx.restore();
        },
        update: function(p, w, h) {
          p.y += p.vy; p.x += Math.sin(p.wobble) * 0.5 + (p.vx || 0);
          p.wobble += 0.015; p.rot += p.rotSpeed;
          if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        }
      },
      dark: {
        count: 35, shootingStars: true, shootingStarColor: "#a78bfa", shootingStarGlow: "#c4b5fd",
        color: function() { return "rgba(139,92,246," + (0.15 + Math.random() * 0.35).toFixed(2) + ")"; },
        size: function() { return 1 + Math.random() * 2.5; },
        speed: function() { return 0; },
        draw: function(ctx, p) {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color.replace(/[\d.]+\)$/, (p.alpha * p.baseAlpha).toFixed(2) + ")");
          ctx.fill();
        },
        update: function(p) { p.phase += p.phaseSpeed; p.alpha = 0.3 + Math.sin(p.phase) * 0.7; }
      },
      aurora: {
        count: 4,
        color: function() {
          var c = ["rgba(168,85,247,0.06)","rgba(236,72,153,0.05)","rgba(139,92,246,0.05)","rgba(192,132,252,0.04)"];
          return c[Math.floor(Math.random() * c.length)];
        },
        size: function() { return 80 + Math.random() * 120; },
        speed: function() { return 0.15 + Math.random() * 0.2; },
        draw: function(ctx, p) {
          var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, p.color); g.addColorStop(1, "transparent");
          ctx.fillStyle = g; ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        },
        update: function(p, w, h) {
          p.x += Math.sin(p.wobble) * 0.4; p.y += Math.cos(p.wobble * 0.7) * 0.2; p.wobble += 0.005;
          if (p.x < -p.size) p.x = w + p.size; if (p.x > w + p.size) p.x = -p.size;
          if (p.y < -p.size) p.y = h + p.size; if (p.y > h + p.size) p.y = -p.size;
        }
      },
      ocean: {
        count: 18,
        color: function() { return "rgba(59,130,246," + (0.08 + Math.random() * 0.12).toFixed(2) + ")"; },
        size: function() { return 3 + Math.random() * 6; },
        speed: function() { return 0.2 + Math.random() * 0.5; },
        draw: function(ctx, p) {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
          ctx.beginPath(); ctx.arc(p.x - p.size*0.25, p.y - p.size*0.25, p.size*0.3, 0, Math.PI*2);
          ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fill();
        },
        update: function(p, w, h) {
          p.y -= p.vy; p.x += Math.sin(p.wobble) * 0.3; p.wobble += 0.02; p.size *= 0.9998;
          if (p.y < -20 || p.size < 1) { p.y = h + 10; p.x = Math.random() * w; p.size = 3 + Math.random() * 6; }
        }
      },
      deepblue: {
        count: 15,
        color: function() {
          var c = ["rgba(56,189,248,","rgba(14,165,233,","rgba(99,102,241,","rgba(129,140,248,"];
          return c[Math.floor(Math.random()*c.length)] + (0.06+Math.random()*0.1).toFixed(2) + ")";
        },
        size: function() { return 2 + Math.random() * 5; },
        speed: function() { return 0.1 + Math.random() * 0.3; },
        draw: function(ctx, p) {
          var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size*3);
          g.addColorStop(0, p.color); g.addColorStop(1, "transparent");
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size*3, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size*0.5, 0, Math.PI*2);
          ctx.fillStyle = "rgba(200,220,255,0.4)"; ctx.fill();
        },
        update: function(p, w, h) {
          p.y -= p.vy * 0.3; p.x += Math.sin(p.wobble) * 0.4; p.wobble += 0.015;
          p.size += Math.sin(p.wobble * 2) * 0.02;
          if (p.y < -30) { p.y = h + 20; p.x = Math.random() * w; }
        }
      },
      neon: {
        count: 30, shootingStars: true, shootingStarColor: "#ff006e", shootingStarGlow: "#00ffff",
        color: function() {
          var c = ["rgba(255,0,110,","rgba(0,255,255,","rgba(185,103,255,","rgba(5,255,161,"];
          return c[Math.floor(Math.random()*c.length)] + (0.15+Math.random()*0.25).toFixed(2) + ")";
        },
        size: function() { return 1 + Math.random() * 2.5; },
        speed: function() { return 0; },
        draw: function(ctx, p) {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
          ctx.fillStyle = p.color; ctx.fill();
          /* neon glow */
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size*3, 0, Math.PI*2);
          var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size*3);
          g.addColorStop(0, p.color.replace(/[\d.]+\)$/, "0.15)")); g.addColorStop(1, "transparent");
          ctx.fillStyle = g; ctx.fill();
        },
        update: function(p, w, h) {
          p.phase += p.phaseSpeed; p.alpha = 0.4 + Math.sin(p.phase) * 0.6;
          p.x += Math.sin(p.wobble) * 0.3; p.y += Math.cos(p.wobble * 0.6) * 0.2;
          p.wobble += 0.004;
          if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10;
        }
      },
      "default": {
        count: 12,
        color: function() { return "rgba(76,203,160," + (0.06 + Math.random() * 0.08).toFixed(2) + ")"; },
        size: function() { return 15 + Math.random() * 30; },
        speed: function() { return 0; },
        draw: function(ctx, p) {
          var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, p.color); g.addColorStop(1, "transparent");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        },
        update: function(p, w, h) {
          p.x += Math.sin(p.wobble) * 0.2; p.y += Math.cos(p.wobble * 0.8) * 0.15;
          p.wobble += 0.003 + Math.random() * 0.002;
          if (p.x < -p.size) p.x = w + p.size; if (p.x > w + p.size) p.x = -p.size;
          if (p.y < -p.size) p.y = h + p.size; if (p.y > h + p.size) p.y = -p.size;
        }
      }
    },

    createParticle: function(cfg, w, h) {
      return {
        x: Math.random()*w, y: Math.random()*h, size: cfg.size(), color: cfg.color(),
        vy: cfg.speed(), vx: 0, rot: Math.random()*Math.PI*2,
        rotSpeed: (Math.random()-0.5)*0.02, wobble: Math.random()*Math.PI*2,
        phase: Math.random()*Math.PI*2, phaseSpeed: 0.01+Math.random()*0.02,
        alpha: 1, baseAlpha: 0.15+Math.random()*0.35
      };
    },
    init: function(theme) {
      var cfg = this.THEMES[theme]; if (!cfg) return;
      this.destroy();
      var c = document.createElement("canvas"); c.id = CANVAS_ID;
      c.style.cssText = "position:fixed;top:0;left:" + getSidebarWidth() + "px;right:0;bottom:0;pointer-events:none;z-index:0;opacity:1;";
      document.body.appendChild(c);
      this.canvas = c; this.ctx = c.getContext("2d"); this.config = cfg;
      this.resize(); this.particles = [];
      for (var i = 0; i < cfg.count; i++) this.particles.push(this.createParticle(cfg, this.w, this.h));
      var self = this;
      window.addEventListener("resize", this._onResize = function() { self.resize(); });
      this.loop();
    },
    resize: function() {
      if (!this.canvas) return;
      var sw = getSidebarWidth();
      this.w = window.innerWidth - sw; this.h = window.innerHeight;
      this.canvas.width = this.w; this.canvas.height = this.h;
      this.canvas.style.left = sw + "px";
    },
    loop: function() {
      var self = this;
      this.raf = requestAnimationFrame(function frame() { self.render(); self.raf = requestAnimationFrame(frame); });
    },
    render: function() {
      var ctx = this.ctx, cfg = this.config; if (!ctx || !cfg) return;
      ctx.clearRect(0, 0, this.w, this.h);
      for (var i = 0; i < this.particles.length; i++) { var p = this.particles[i]; cfg.update(p, this.w, this.h); cfg.draw(ctx, p); }
    },
    destroy: function() {
      if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
      if (this._onResize) { window.removeEventListener("resize", this._onResize); this._onResize = null; }
      if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
      this.canvas = null; this.ctx = null; this.particles = []; this.config = null;
    },
    apply: function(theme) {
      theme = App.resolveTheme(theme);
      if (!App.isEnabled("enableEffects") || reducedMotion.matches || theme === "minimal") { this.destroy(); return; }
      this.init(theme);
    }
  };

  /* ========== BOOTSTRAP + INTERCEPT ========== */

  /* Config is loaded once after modules are registered — see INIT section below */

  darkMql.addEventListener("change", function() {
    if (App.currentTheme === "auto") App.loadThemeCSS("auto");
  });
  reducedMotion.addEventListener("change", function() { FX.apply(App.currentTheme); });

  /* Intercept config save (debounced) */
  var _saveDebounce = null;
  function onPluginSettingSaved() {
    clearTimeout(_saveDebounce);
    _saveDebounce = setTimeout(function() {
      App.fetchConfig().then(function(newTheme) {
        if (newTheme !== App.currentTheme) { App.currentTheme = newTheme; App.loadThemeCSS(newTheme); }
        else { FX.apply(newTheme); }
        App.showRefreshHint();
      }).catch(function() {});
    }, 500);
  }

  var originalFetch = window.fetch;
  window.fetch = function() {
    var url = arguments[0], options = arguments[1];
    var urlStr = typeof url === "string" ? url : (url && url.url) ? url.url : "";
    var method = (options && options.method) ? options.method : (url && url.method) ? url.method : "GET";
    if (method.toUpperCase() === "PUT" && urlStr.indexOf(CONFIG_URL) !== -1) {
      return originalFetch.apply(this, arguments).then(function(r) {
        if (r.ok || r.status === 204) onPluginSettingSaved();
        return r;
      }).catch(function(e) { throw e; });
    }
    return originalFetch.apply(this, arguments);
  };

  /* --- Module: Page Transition --- */
  App.register({
    id: "pageTransition", toggle: "enablePageTransition", skipIfReducedMotion: true,
    _styleEl: null,
    init: function() {
      this._styleEl = document.createElement("style");
      this._styleEl.id = "ui-beautify-page-anim";
      this._styleEl.textContent =
        "@keyframes _ui_pageIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}" +
        "@keyframes _ui_slideIn{from{opacity:0;transform:translateX(30px) scale(0.98)}to{opacity:1;transform:translateX(0) scale(1)}}";
      document.head.appendChild(this._styleEl);
    },
    onRouteChange: function() {
      if (!App.isEnabled("enablePageTransition")) return;
      var mc = document.querySelector(".main-content");
      if (!mc) return;
      var anim = Math.random() > 0.5 ? "_ui_pageIn 0.3s ease forwards" : "_ui_slideIn .35s cubic-bezier(.22,1,.36,1) forwards";
      mc.style.animation = "none"; void mc.offsetHeight; mc.style.animation = anim;
    },
    onToggle: function(on) { if (this._styleEl) this._styleEl.disabled = !on; }
  });

  /* --- Module: Staggered List Animation --- */
  App.register({
    id: "listAnimation", toggle: "enableListAnimation", skipIfReducedMotion: true,
    _styleEl: null,
    init: function() {
      this._styleEl = document.createElement("style");
      this._styleEl.id = "ui-beautify-list-anim";
      var css = "@keyframes _ui_staggerIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}";
      for (var i = 1; i <= 8; i++) css += ".entity-wrapper:nth-child(" + i + "){animation:_ui_staggerIn 0.2s ease both;animation-delay:" + ((i-1)*25) + "ms}";
      this._styleEl.textContent = css;
      document.head.appendChild(this._styleEl);
    },
    onToggle: function(on) { if (this._styleEl) this._styleEl.disabled = !on; }
  });

  /* --- Module: Cursor Glow --- */
  App.register({
    id: "cursorGlow", toggle: "enableCursorGlow", skipIfReducedMotion: true,
    _el: null, _mouseX: 0, _mouseY: 0, _glowX: 0, _glowY: 0, _visible: false, _rafId: null,
    _COLORS: {
      "default":"rgba(76,203,160,0.12)","sakura":"rgba(236,72,153,0.12)","ocean":"rgba(59,130,246,0.12)",
      "deepblue":"rgba(56,189,248,0.15)","dark":"rgba(139,92,246,0.15)","aurora":"rgba(168,85,247,0.15)",
      "minimal":"rgba(0,0,0,0.04)","neon":"rgba(255,0,110,0.18)"
    },
    init: function() {
      var self = this;
      this._el = document.createElement("div");
      this._el.id = "ui-beautify-cursor-glow";
      this._el.style.cssText = "position:fixed;width:300px;height:300px;border-radius:50%;pointer-events:none;z-index:0;opacity:0;"
        + "background:radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%);"
        + "transition:opacity 0.3s ease;transform:translate(-50%,-50%);will-change:left,top;";
      document.body.appendChild(this._el);

      this._onMove = function(e) {
        if (!App.isEnabled("enableCursorGlow")) { self._el.style.opacity = "0"; return; }
        self._mouseX = e.clientX; self._mouseY = e.clientY;
        if (!self._visible) { self._glowX = self._mouseX; self._glowY = self._mouseY; self._el.style.opacity = "1"; self._visible = true; }
        if (!self._rafId) self._rafId = requestAnimationFrame(function anim() {
          self._glowX += (self._mouseX - self._glowX) * 0.25;
          self._glowY += (self._mouseY - self._glowY) * 0.25;
          self._el.style.left = self._glowX + "px"; self._el.style.top = self._glowY + "px";
          if (Math.abs(self._glowX - self._mouseX) < 0.5 && Math.abs(self._glowY - self._mouseY) < 0.5) { self._rafId = null; return; }
          self._rafId = requestAnimationFrame(anim);
        });
      };
      this._onLeave = function() {
        self._el.style.opacity = "0"; self._visible = false;
        if (self._rafId) { cancelAnimationFrame(self._rafId); self._rafId = null; }
      };
      document.addEventListener("mousemove", this._onMove);
      document.addEventListener("mouseleave", this._onLeave);
    },
    onThemeChange: function(theme) {
      if (!this._el) return;
      var c = this._COLORS[theme];
      if (!c) {
        var style = getComputedStyle(document.documentElement);
        var primary = style.getPropertyValue("--ui-primary").trim();
        c = ColorUtils.toRgba(primary, 0.12, this._COLORS["minimal"] || this._COLORS["default"]);
      }
      this._el.style.background = "radial-gradient(circle," + c + " 0%,transparent 70%)";
    },
    onToggle: function(on) {
      if (!this._el) return;
      if (on) {
        this._el.style.display = "";
        document.addEventListener("mousemove", this._onMove);
        document.addEventListener("mouseleave", this._onLeave);
      } else {
        this._el.style.display = "none"; this._el.style.opacity = "0"; this._visible = false;
        if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
        document.removeEventListener("mousemove", this._onMove);
        document.removeEventListener("mouseleave", this._onLeave);
      }
    },
    destroy: function() {
      if (this._onMove) document.removeEventListener("mousemove", this._onMove);
      if (this._onLeave) document.removeEventListener("mouseleave", this._onLeave);
      if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
      if (this._el && this._el.parentNode) this._el.remove();
      this._el = null;
    }
  });

  /* --- Module: Enhanced Particles (shooting stars + wind) --- */
  App.register({
    id: "enhancedParticles", skipIfReducedMotion: true,
    _shootInterval: null, _windInterval: null, _activeRafs: [],
    init: function() {},
    onThemeChange: function(theme) {
      var self = this;
      clearInterval(this._shootInterval); clearInterval(this._windInterval);
      this._shootInterval = null; this._windInterval = null;
      this._activeRafs.forEach(function(id) { cancelAnimationFrame(id); });
      this._activeRafs = [];

      var cfg = FX.THEMES[theme];
      if (cfg && cfg.shootingStars) {
        var starColor = cfg.shootingStarColor || "#a78bfa";
        var starGlow = cfg.shootingStarGlow || "#c4b5fd";
        this._shootInterval = setInterval(function() {
          if (!FX.ctx || !FX.canvas) return;
          var ctx = FX.ctx, startX = Math.random()*FX.w, startY = Math.random()*FX.h*0.3;
          var len = 60+Math.random()*80, angle = Math.PI/4+Math.random()*0.3, frames = 0;
          var rafId;
          (function drawStar() {
            if (rafId) { var idx = self._activeRafs.indexOf(rafId); if (idx > -1) self._activeRafs.splice(idx, 1); }
            if (frames >= 20) return;
            var t = frames/20, alpha = t < 0.5 ? t*2 : (1-t)*2;
            var x = startX+Math.cos(angle)*len*t, y = startY+Math.sin(angle)*len*t;
            ctx.save(); ctx.globalAlpha = alpha*0.6; ctx.strokeStyle = starColor; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-Math.cos(angle)*20, y-Math.sin(angle)*20); ctx.stroke();
            ctx.globalAlpha = alpha; ctx.fillStyle = starGlow;
            ctx.beginPath(); ctx.arc(x,y,1.5,0,Math.PI*2); ctx.fill(); ctx.restore();
            frames++; rafId = requestAnimationFrame(drawStar);
            self._activeRafs.push(rafId);
          })();
        }, theme === "neon" ? 3000 : 5000);
      }

      if (cfg && cfg.wind && FX.particles) {
        this._windInterval = setInterval(function() {
          FX.particles.forEach(function(p) { p.vx += 1.5; setTimeout(function() { p.vx -= 1.5; }, 2000); });
        }, 10000);
      }
    },
    destroy: function() {
      clearInterval(this._shootInterval); clearInterval(this._windInterval);
      this._shootInterval = null; this._windInterval = null;
      this._activeRafs.forEach(function(id) { cancelAnimationFrame(id); });
      this._activeRafs = [];
    }
  });

  /* --- Module: Aurora Dynamic Background --- */
  App.register({
    id: "auroraBackground", toggle: "enableWallpaper", skipIfReducedMotion: true,
    _el: null, _angle: 0, _rafId: null,
    _GRADIENTS: {
      "default":"radial-gradient(ellipse at 40% 40%,rgba(76,203,160,0.06) 0%,transparent 60%),radial-gradient(ellipse at 75% 25%,rgba(54,179,137,0.04) 0%,transparent 60%),radial-gradient(ellipse at 55% 75%,rgba(76,203,160,0.03) 0%,transparent 60%)",
      "sakura":"radial-gradient(ellipse at 40% 40%,rgba(236,72,153,0.06) 0%,transparent 60%),radial-gradient(ellipse at 75% 25%,rgba(219,39,119,0.04) 0%,transparent 60%),radial-gradient(ellipse at 55% 75%,rgba(244,114,182,0.03) 0%,transparent 60%)",
      "ocean":"radial-gradient(ellipse at 40% 40%,rgba(59,130,246,0.06) 0%,transparent 60%),radial-gradient(ellipse at 75% 25%,rgba(37,99,235,0.04) 0%,transparent 60%),radial-gradient(ellipse at 55% 75%,rgba(96,165,250,0.03) 0%,transparent 60%)",
      "deepblue":"radial-gradient(ellipse at 40% 40%,rgba(56,189,248,0.08) 0%,transparent 60%),radial-gradient(ellipse at 75% 25%,rgba(14,165,233,0.05) 0%,transparent 60%),radial-gradient(ellipse at 55% 75%,rgba(99,102,241,0.04) 0%,transparent 60%)",
      "dark":"radial-gradient(ellipse at 40% 40%,rgba(139,92,246,0.05) 0%,transparent 60%),radial-gradient(ellipse at 75% 25%,rgba(124,58,237,0.03) 0%,transparent 60%),radial-gradient(ellipse at 55% 75%,rgba(167,139,250,0.02) 0%,transparent 60%)",
      "aurora":"radial-gradient(ellipse at 40% 40%,rgba(168,85,247,0.06) 0%,transparent 60%),radial-gradient(ellipse at 75% 25%,rgba(236,72,153,0.04) 0%,transparent 60%),radial-gradient(ellipse at 55% 75%,rgba(129,140,248,0.03) 0%,transparent 60%)",
      "neon":"radial-gradient(ellipse at 40% 40%,rgba(255,0,110,0.08) 0%,transparent 60%),radial-gradient(ellipse at 75% 25%,rgba(0,255,255,0.05) 0%,transparent 60%),radial-gradient(ellipse at 55% 75%,rgba(185,103,255,0.04) 0%,transparent 60%)",
      "minimal":"none"
    },
    init: function() {
      var self = this;
      /* Outer clip container — fixed to main content area */
      this._el = document.createElement("div");
      this._el.id = "ui-beautify-aurora-bg";
      this._el.style.cssText = "position:fixed;top:0;left:" + getSidebarWidth() + "px;right:0;bottom:0;pointer-events:none;z-index:-1;overflow:hidden;";
      /* Inner gradient layer — animated inside the clip */
      this._inner = document.createElement("div");
      this._inner.style.cssText = "position:absolute;top:-20%;left:-20%;width:140%;height:140%;opacity:0.3;will-change:transform;";
      this._el.appendChild(this._inner);
      document.body.prepend(this._el);
      this._angle = 0;
      (function animate() {
        self._angle += 0.001;
        var x = Math.sin(self._angle)*3, y = Math.cos(self._angle*0.7)*2, r = Math.sin(self._angle*0.3)*1.5;
        if (self._inner) self._inner.style.transform = "translate("+x+"%,"+y+"%) rotate("+r+"deg)";
        self._rafId = requestAnimationFrame(animate);
      })();
    },
    onThemeChange: function(theme) {
      if (!this._inner) return;
      var grad = this._GRADIENTS[theme];
      if (!grad) {
        var style = getComputedStyle(document.documentElement);
        var primary = style.getPropertyValue("--ui-primary").trim();
        var rgb = ColorUtils.toRgbTriplet(primary, "99,102,241");
        grad = "radial-gradient(ellipse at 40% 40%,rgba(" + rgb + ",0.06) 0%,transparent 60%)";
      }
      this._inner.style.background = grad;
      this._inner.style.opacity = theme === "minimal" ? "0" : "0.3";
    },
    onToggle: function(on) {
      if (!this._el) return;
      if (on) {
        this._el.style.display = "";
        if (!this._rafId) {
          var self = this;
          (function animate() {
            self._angle += 0.001;
            var x = Math.sin(self._angle)*3, y = Math.cos(self._angle*0.7)*2, r = Math.sin(self._angle*0.3)*1.5;
            if (self._inner) self._inner.style.transform = "translate("+x+"%,"+y+"%) rotate("+r+"deg)";
            self._rafId = requestAnimationFrame(animate);
          })();
        }
      } else {
        this._el.style.display = "none";
        if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
      }
    },
    destroy: function() {
      if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
      if (this._el && this._el.parentNode) this._el.remove();
      this._el = null; this._inner = null;
    }
  });

  /* --- Module: macOS Window Cards --- */
  App.register({
    id: "macosCards", toggle: "enableMacOSCards",
    init: function(app) {
      var self = this;
      this._scan = function() {
        if (!App.isEnabled("enableMacOSCards")) return;
        /* Match both legacy .card-header and new WidgetCard header structure */
        var headers = document.querySelectorAll(".vue-grid-item .card-header");
        /* WidgetCard: first child div with border-b inside .vue-grid-item */
        document.querySelectorAll(".vue-grid-item").forEach(function(gridItem) {
          var card = gridItem.querySelector(":scope > div > div.rounded-lg, :scope > div > div[class*='rounded']");
          if (!card) card = gridItem.querySelector(":scope > div");
          if (!card) return;
          /* Find the header: first child div that has border-b style or contains title text */
          var firstChild = card.firstElementChild;
          if (firstChild && firstChild.tagName === "DIV" &&
              (firstChild.className.indexOf("border-b") > -1 || firstChild.classList.contains("card-header"))) {
            if (!firstChild.querySelector(".ui-traffic-lights")) {
              var c = document.createElement("div"); c.className = "ui-traffic-lights";
              c.style.cssText = "position:absolute;left:14px;top:50%;transform:translateY(-50%);display:flex;gap:7px;z-index:1;pointer-events:none;";
              ["#ff5f57","#febc2e","#28c840"].forEach(function(col) {
                var d = document.createElement("span");
                d.style.cssText = "width:11px;height:11px;border-radius:50%;background:"+col+";display:block;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.12);";
                c.appendChild(d);
              });
              firstChild.style.position = "relative"; firstChild.style.paddingLeft = "72px"; firstChild.prepend(c);
            }
          }
        });
        /* Also handle legacy .card-header */
        headers.forEach(function(header) {
          if (header.querySelector(".ui-traffic-lights")) return;
          var c = document.createElement("div"); c.className = "ui-traffic-lights";
          c.style.cssText = "position:absolute;left:14px;top:50%;transform:translateY(-50%);display:flex;gap:7px;z-index:1;pointer-events:none;";
          ["#ff5f57","#febc2e","#28c840"].forEach(function(col) {
            var d = document.createElement("span");
            d.style.cssText = "width:11px;height:11px;border-radius:50%;background:"+col+";display:block;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.12);";
            c.appendChild(d);
          });
          header.style.position = "relative"; header.style.paddingLeft = "72px"; header.prepend(c);
        });
      };
      this._scan();
      app.onMutation(this._scan);
    },
    onToggle: function(on) {
      if (!on) {
        document.querySelectorAll(".ui-traffic-lights").forEach(function(el) {
          var h = el.parentElement; if (h) h.style.paddingLeft = ""; el.remove();
        });
      }
    }
  });

  /* --- Module: Sidebar Overhaul --- */
  App.register({
    id: "sidebarOverhaul",
    _styleEl: null,
    init: function() {
      this._styleEl = document.createElement("style");
      this._styleEl.id = "ui-beautify-sidebar-overhaul";
      this._styleEl.textContent =
        ".sidebar .menu-item-title{margin:3px 10px!important;padding:9px 12px!important;border-radius:10px!important;border:1px solid transparent!important;transition:all .25s cubic-bezier(.4,0,.2,1)!important}" +
        ".sidebar .menu-item-title:hover{background-color:var(--ui-surface-hover,rgba(128,128,128,0.06))!important;border-color:transparent!important}" +
        ".sidebar .menu-item-title.active{box-shadow:0 2px 12px rgba(0,0,0,0.06)!important}" +
        ".sidebar .menu-icon svg{width:22px!important;height:22px!important;transition:transform .2s ease!important}" +
        ".sidebar .menu-item-title:hover .menu-icon svg{transform:scale(1.15)!important}" +
        ".sidebar .menu-label{margin-top:16px!important;padding:6px 22px 4px!important;font-size:13px!important;font-weight:700!important;letter-spacing:0.5px!important;opacity:0.85!important;text-shadow:0 0 0 currentColor!important}";
      document.head.appendChild(this._styleEl);
    },
    onToggle: function(on) { if (this._styleEl) this._styleEl.disabled = !on; }
  });

  /* --- Module: Dashboard Visual Overhaul + Sparklines --- */
  App.register({
    id: "dashboardOverhaul",
    _styleEl: null,
    init: function(app) {
      this._styleEl = document.createElement("style");
      this._styleEl.id = "ui-beautify-dashboard";
      this._styleEl.textContent =
        ".dashboard .vue-grid-item>div{overflow:hidden!important;position:relative!important}" +
        ".dashboard [class*='text-2xl'],.dashboard [class*='text-3xl']{font-size:2.25rem!important;font-weight:800!important;letter-spacing:-0.03em!important}" +
        ".dashboard .rounded-full[class*='bg-gray-100'],.dashboard .rounded-full[class*='bg-gray']{width:48px!important;height:48px!important;display:flex!important;align-items:center!important;justify-content:center!important}" +
        ".dashboard .rounded-full[class*='bg-gray-100'] svg,.dashboard .rounded-full[class*='bg-gray'] svg{width:24px!important;height:24px!important}";
      document.head.appendChild(this._styleEl);
      var self = this;
      app.onMutation(function() { self._injectSparklines(); });
    },
    _injectSparklines: function() {
      var cards = document.querySelectorAll(".dashboard .vue-grid-item > div"), idx = 0;
      cards.forEach(function(card) {
        if (card.querySelector(".ui-sparkline")) return;
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 120 24"); svg.setAttribute("class", "ui-sparkline");
        svg.style.cssText = "position:absolute;bottom:0;left:0;width:100%;height:28px;opacity:0.08;pointer-events:none;";
        var off = idx * 1.3, pts = [];
        for (var i = 0; i < 24; i++) pts.push((i/23*120).toFixed(1)+","+(12+Math.sin(i/23*Math.PI*2+off)*8).toFixed(1));
        svg.innerHTML = '<polyline points="'+pts.join(" ")+'" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>';
        card.appendChild(svg); idx++;
      });
    },
    onRouteChange: function(path) {
      if (path.indexOf("/console") > -1) { var self = this; setTimeout(function() { self._injectSparklines(); }, 800); }
    }
  });

  /* --- Module: Zen Mode Editor --- */
  App.register({
    id: "zenMode",
    _styleEl: null, _btn: null,
    init: function() {
      this._styleEl = document.createElement("style");
      this._styleEl.id = "ui-beautify-zen";
      this._styleEl.textContent =
        "#ui-zen-btn{position:fixed!important;bottom:24px!important;right:24px!important;left:auto!important;z-index:99999!important}" +
        "body.ui-zen-mode .sidebar{transform:translateX(-100%)!important;transition:transform .5s cubic-bezier(.4,0,.2,1)!important}" +
        "body.ui-zen-mode .main-content{margin-left:0!important;width:100%!important;transition:margin-left .5s ease!important}" +
        "body.ui-zen-mode .page-header{opacity:0!important;height:0!important;overflow:hidden!important;transition:opacity .3s ease,height .3s ease!important}" +
        "body.ui-zen-mode .page-header:hover{opacity:1!important;height:auto!important}" +
        "body.ui-zen-mode .editor-header{opacity:0.3!important;transition:opacity .3s ease!important}" +
        "body.ui-zen-mode .editor-header:hover{opacity:1!important}" +
        "body.ui-zen-mode .ProseMirror{max-width:48rem!important;margin:0 auto!important;padding:2rem!important;min-height:80vh!important}" +
        "body.ui-zen-mode .editor-entry-extra{display:none!important}" +
        "body.ui-zen-mode #ui-zen-btn{background:#ef4444!important}" +
        "body.ui-zen-mode #ui-zen-btn::after{content:'退出 Zen'}" +
        "body:not(.ui-zen-mode) #ui-zen-btn::after{content:'🧘 Zen'}";
      document.head.appendChild(this._styleEl);

      this._btn = document.createElement("button");
      this._btn.id = "ui-zen-btn";
      this._btn.style.cssText = "position:fixed;bottom:24px;right:24px;left:auto;z-index:99999;padding:10px 20px;border-radius:24px;border:none;cursor:pointer;"
        + "font-size:14px;font-weight:600;color:#fff;background:linear-gradient(135deg,#667eea,#764ba2);"
        + "box-shadow:0 4px 16px rgba(102,126,234,0.4);transition:all .3s ease;display:none;";
      this._btn.addEventListener("click", function() { document.body.classList.toggle("ui-zen-mode"); });
      document.body.appendChild(this._btn);

      this._onKeydown = function(e) { if (e.key === "Escape") document.body.classList.remove("ui-zen-mode"); };
      document.addEventListener("keydown", this._onKeydown);

      // Initial check
      this._updateVisibility();
    },
    _updateVisibility: function() {
      if (!this._btn) return;
      var isEditor = !!document.querySelector(".ProseMirror") || location.pathname.indexOf("/editor") > -1;
      this._btn.style.display = isEditor ? "block" : "none";
      if (!isEditor) document.body.classList.remove("ui-zen-mode");
    },
    onRouteChange: function() {
      var self = this;
      // Small delay to let Vue render the editor
      setTimeout(function() { self._updateVisibility(); }, 300);
    },
    destroy: function() {
      if (this._onKeydown) { document.removeEventListener("keydown", this._onKeydown); this._onKeydown = null; }
      if (this._btn && this._btn.parentNode) this._btn.remove();
      if (this._styleEl && this._styleEl.parentNode) this._styleEl.remove();
      document.body.classList.remove("ui-zen-mode");
    }
  });

  /* --- Module: 3D Card Tilt --- */
  App.register({
    id: "card3D", toggle: "enable3DCards", skipIfReducedMotion: true,
    _currentCard: null,
    init: function() {
      var self = this;
      this._onMove = function(e) {
        if (!App.isEnabled("enable3DCards")) return;
        var card = e.target.closest(".dashboard .vue-grid-item > div");
        if (!card) {
          if (self._currentCard) { self._currentCard.style.transform = ""; self._currentCard = null; }
          return;
        }
        var r = card.getBoundingClientRect();
        if (r.width > 600) return;
        self._currentCard = card;
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transition = "transform .15s ease-out";
        card.style.transform = "perspective(800px) rotateY(" + (x * 3).toFixed(2) + "deg) rotateX(" + (-y * 3).toFixed(2) + "deg)";
      };
      this._onOut = function(e) {
        var card = e.target.closest(".dashboard .vue-grid-item > div");
        if (card && !card.contains(e.relatedTarget)) { card.style.transform = ""; self._currentCard = null; }
      };
      document.addEventListener("mousemove", this._onMove);
      document.addEventListener("mouseout", this._onOut);
    },
    onToggle: function(on) {
      if (!on) {
        document.querySelectorAll(".dashboard .vue-grid-item > div").forEach(function(el) { el.style.transform = ""; });
        this._currentCard = null;
      }
    },
    destroy: function() {
      if (this._onMove) document.removeEventListener("mousemove", this._onMove);
      if (this._onOut) document.removeEventListener("mouseout", this._onOut);
      document.querySelectorAll(".dashboard .vue-grid-item > div").forEach(function(el) { el.style.transform = ""; });
      this._currentCard = null;
    }
  });

  /* --- Module: Rainbow Glow Borders --- */
  App.register({
    id: "rainbowBorders", skipIfReducedMotion: true,
    init: function() {
      var s = document.createElement("style");
      s.textContent =
        "@keyframes _ui_rainbowSpin{0%{--_rb_angle:0deg}100%{--_rb_angle:360deg}}" +
        "@property --_rb_angle{syntax:'<angle>';initial-value:0deg;inherits:false}" +
        ".dashboard .card-wrapper{position:relative!important}" +
        ".dashboard .card-wrapper:hover::before{content:''!important;position:absolute!important;inset:-2px!important;border-radius:inherit!important;z-index:-1!important;" +
        "background:conic-gradient(from var(--_rb_angle),#ff6b6b,#feca57,#48dbfb,#ff9ff3,#54a0ff,#5f27cd,#ff6b6b)!important;" +
        "animation:_ui_rainbowSpin 6s linear infinite!important;opacity:0.15!important;filter:blur(12px)!important}";
      document.head.appendChild(s);
    }
  });

  /* --- Module: Page Slide Transition --- */
  /* --- Module: Welcome Banner --- */
  App.register({
    id: "welcomeBanner", toggle: "enableWelcomeBanner",
    init: function(app) {
      var self = this;
      this._create = function() {
        if (!App.isEnabled("enableWelcomeBanner")) return;
        var dash = document.querySelector(".dashboard");
        if (!dash || dash.querySelector("#ui-welcome-banner")) return;
        var h = new Date().getHours(), greeting, emoji, gradient;
        if (h < 6) { greeting = "夜深了"; emoji = "🌙"; gradient = "linear-gradient(135deg,#1a1a2e,#16213e)"; }
        else if (h < 12) { greeting = "早上好"; emoji = "☀️"; gradient = "linear-gradient(135deg,#f093fb,#f5576c)"; }
        else if (h < 14) { greeting = "中午好"; emoji = "🌤️"; gradient = "linear-gradient(135deg,#4facfe,#00f2fe)"; }
        else if (h < 18) { greeting = "下午好"; emoji = "🌅"; gradient = "linear-gradient(135deg,#fa709a,#fee140)"; }
        else { greeting = "晚上好"; emoji = "🌆"; gradient = "linear-gradient(135deg,#a18cd1,#fbc2eb)"; }
        var userName = "";
        var userEl = document.querySelector(".sidebar__profile .profile-name") ||
                     document.querySelector("[class*='profile'] [class*='name']") ||
                     document.querySelector(".sidebar__profile span");
        if (userEl) userName = "，" + userEl.textContent.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        var b = document.createElement("div"); b.id = "ui-welcome-banner";
        b.style.cssText = "background:" + gradient + ";border-radius:16px;padding:28px 32px;margin-bottom:20px;color:#fff;position:relative;overflow:hidden;"
          + "box-shadow:0 8px 32px rgba(0,0,0,0.12);animation:_ui_pageIn .3s ease forwards;";
        b.innerHTML = '<div style="position:relative;z-index:1">'
          + '<div style="font-size:2.5rem;margin-bottom:4px">' + emoji + '</div>'
          + '<div style="font-size:1.75rem;font-weight:700;letter-spacing:-0.02em">' + greeting + userName + '</div>'
          + '<div style="font-size:0.9rem;opacity:0.8;margin-top:6px">' + new Date().toLocaleDateString("zh-CN", { weekday:"long", year:"numeric", month:"long", day:"numeric" }) + '</div>'
          + '</div>'
          + '<div style="position:absolute;top:-20%;right:-5%;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.1)"></div>'
          + '<div style="position:absolute;bottom:-30%;right:15%;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,0.06)"></div>';
        dash.prepend(b);
      };
      this._create();
      app.onMutation(this._create);
    },
    onRouteChange: function() { var self = this; setTimeout(function() { self._create(); }, 150); },
    onToggle: function(on) { var el = document.getElementById("ui-welcome-banner"); if (el) el.style.display = on ? "" : "none"; }
  });

  /* --- Module: Dynamic Wallpaper (particle network) --- */
  App.register({
    id: "wallpaper", toggle: "enableWallpaper", skipIfReducedMotion: true,
    _canvas: null, _ctx: null, _particles: [], _color: "59,130,246", _rafId: null,
    _COLORS: {
      "default":"76,203,160","sakura":"236,72,153","ocean":"59,130,246",
      "deepblue":"56,189,248","dark":"139,92,246","aurora":"168,85,247","minimal":"148,163,184","neon":"255,0,110"
    },
    init: function() {
      var self = this;
      this._canvas = document.createElement("canvas");
      this._canvas.id = "ui-beautify-wallpaper";
      this._canvas.style.cssText = "position:fixed;top:0;left:" + getSidebarWidth() + "px;right:0;bottom:0;pointer-events:none;z-index:-2;opacity:0.4;";
      document.body.prepend(this._canvas);
      this._ctx = this._canvas.getContext("2d");

      this._onResize = function() { var sw = getSidebarWidth(); self._canvas.width = window.innerWidth - sw; self._canvas.height = window.innerHeight; self._canvas.style.left = sw + "px"; };
      window.addEventListener("resize", this._onResize);
      this._onResize();

      for (var i = 0; i < 40; i++) {
        this._particles.push({
          x: Math.random() * this._canvas.width, y: Math.random() * this._canvas.height,
          vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, r: 1 + Math.random() * 1.5
        });
      }
      this._startDraw();
    },
    onThemeChange: function(theme) {
      this._color = this._COLORS[theme];
      if (!this._color) {
        var style = getComputedStyle(document.documentElement);
        var primary = style.getPropertyValue("--ui-primary").trim();
        this._color = ColorUtils.toRgbTriplet(primary, this._COLORS["minimal"] || this._COLORS["default"]);
      }
    },
    _startDraw: function() {
      var self = this, c = this._canvas, ctx = this._ctx, ps = this._particles, col = this._color;
      if (this._rafId) cancelAnimationFrame(this._rafId);
      var DIST_THRESHOLD = 130, DIST_SQ = DIST_THRESHOLD * DIST_THRESHOLD;
      (function draw() {
        col = self._color;
        ctx.clearRect(0, 0, c.width, c.height);
        for (var i = 0; i < ps.length; i++) {
          var p = ps[i];
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > c.width) p.vx *= -1;
          if (p.y < 0 || p.y > c.height) p.vy *= -1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + col + ",0.5)"; ctx.fill();
          for (var j = i + 1; j < ps.length; j++) {
            var q = ps[j], dx = p.x - q.x, dy = p.y - q.y, distSq = dx*dx + dy*dy;
            if (distSq < DIST_SQ) {
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
              ctx.strokeStyle = "rgba(" + col + "," + (0.12 * (1 - Math.sqrt(distSq) / DIST_THRESHOLD)).toFixed(3) + ")";
              ctx.lineWidth = 0.5; ctx.stroke();
            }
          }
        }
        self._rafId = requestAnimationFrame(draw);
      })();
    },
    onToggle: function(on) {
      if (!this._canvas) return;
      if (on) { this._canvas.style.display = ""; this._startDraw(); }
      else { this._canvas.style.display = "none"; if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; } }
    },
    destroy: function() {
      if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
      if (this._onResize) { window.removeEventListener("resize", this._onResize); this._onResize = null; }
      if (this._canvas && this._canvas.parentNode) this._canvas.remove();
      this._canvas = null; this._ctx = null; this._particles = [];
    }
  });

  /* --- Module: Button Ripple Effect --- */
  App.register({
    id: "buttonRipple", skipIfReducedMotion: true,
    _styleEl: null, _handler: null,
    init: function() {
      this._styleEl = document.createElement("style");
      this._styleEl.textContent =
        "@keyframes _ui_ripple{0%{transform:scale(0);opacity:0.35}100%{transform:scale(4);opacity:0}}" +
        "._ui_ripple-host{position:relative!important;overflow:hidden!important}" +
        "._ui_ripple{position:absolute;border-radius:50%;background:currentColor;pointer-events:none;animation:_ui_ripple .5s ease-out forwards}";
      document.head.appendChild(this._styleEl);
      this._handler = function(e) {
        if (!App.isEnabled("enableEffects")) return;
        var btn = e.target.closest("button, .btn, [role='button'], a.action-btn");
        if (!btn) return;
        btn.classList.add("_ui_ripple-host");
        var r = btn.getBoundingClientRect(), size = Math.max(r.width, r.height);
        var rip = document.createElement("span"); rip.className = "_ui_ripple";
        rip.style.cssText = "width:"+size+"px;height:"+size+"px;left:"+(e.clientX-r.left-size/2)+"px;top:"+(e.clientY-r.top-size/2)+"px;";
        btn.appendChild(rip);
        setTimeout(function() { rip.remove(); }, 550);
      };
      document.addEventListener("click", this._handler);
    },
    destroy: function() {
      if (this._handler) document.removeEventListener("click", this._handler);
      if (this._styleEl && this._styleEl.parentNode) this._styleEl.remove();
      this._handler = null;
      this._styleEl = null;
    }
  });

  /* --- Module: Tab Sliding Indicator --- */
  App.register({
    id: "tabSlider", skipIfReducedMotion: true,
    _observers: [],
    init: function(app) {
      var s = document.createElement("style");
      s.textContent =
        "._ui_tab-bar{position:relative}" +
        "._ui_tab-indicator{position:absolute;bottom:0;height:2px;border-radius:1px;transition:left .3s cubic-bezier(.4,0,.2,1),width .3s cubic-bezier(.4,0,.2,1);pointer-events:none;z-index:1}";
      document.head.appendChild(s);
      var self = this;

      /**
       * Attach and manage a sliding tab indicator inside a tab bar element.
       *
       * Creates and inserts a visual indicator that matches the width and position of the currently
       * active tab, updates its position on clicks and when tab selection or classes change, and
       * registers a MutationObserver for ongoing updates (observer is added to `self._observers`).
       *
       * @param {HTMLElement} bar - The tab bar container element whose child tab items include an active state (e.g., `.active`, `[aria-selected="true"]`, or `.router-link-active`).
       */
      function setupTabBar(bar) {
        if (bar.querySelector("._ui_tab-indicator")) return;
        bar.classList.add("_ui_tab-bar");
        var ind = document.createElement("div"); ind.className = "_ui_tab-indicator";
        ind.style.background = "var(--ui-primary, #4f46e5)";
        bar.style.position = "relative"; bar.appendChild(ind);
        function move() {
          var active = bar.querySelector(".active, [aria-selected='true'], .router-link-active");
          if (!active) { ind.style.width = "0"; return; }
          var br = bar.getBoundingClientRect(), tr = active.getBoundingClientRect();
          ind.style.left = (tr.left - br.left) + "px"; ind.style.width = tr.width + "px";
        }
        move();
        bar.addEventListener("click", function() { setTimeout(move, 50); });
        var obs = new MutationObserver(move);
        obs.observe(bar, { attributes: true, subtree: true, attributeFilter: ["class", "aria-selected"] });
        self._observers.push(obs);
      }

      /**
 * Initializes sliding-tab indicators on existing tab containers.
 *
 * Scans the document for elements matching "[role='tablist']", ".tab-bar", or ".tabs" and attaches the sliding-indicator behavior to each matching element.
 */
function scan() { document.querySelectorAll("[role='tablist'], .tab-bar, .tabs").forEach(setupTabBar); }
      scan();
      app.onMutation(scan);
    },
    destroy: function() {
      this._observers.forEach(function(obs) { obs.disconnect(); });
      this._observers = [];
    }
  });

  /* --- Module: Number Count-Up Animation --- */
  App.register({
    id: "countUp", skipIfReducedMotion: true,
    init: function(app) {
      var self = this;
      app.onMutation(function() { self._scan(); });
    },
    _animateEl: function(el) {
      if (el.dataset.uiCounted) return;
      var text = el.textContent.trim();
      var match = text.match(/^([\d,]+\.?\d*)(.*)$/);
      if (!match) return;
      var raw = match[1].replace(/,/g, ""), target = parseFloat(raw);
      if (isNaN(target) || target === 0) return;
      var suffix = match[2] || "", hasComma = match[1].indexOf(",") > -1;
      var isFloat = raw.indexOf(".") > -1, decimals = isFloat ? (raw.split(".")[1] || "").length : 0;
      el.dataset.uiCounted = "1";
      var start = performance.now(), duration = Math.min(800, 300 + target * 0.5);
      function tick(now) {
        var t = Math.min((now - start) / duration, 1);
        t = 1 - Math.pow(1 - t, 3);
        var val = target * t;
        var display = isFloat ? val.toFixed(decimals) : Math.round(val).toString();
        if (hasComma) display = Number(display).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        el.textContent = display + suffix;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    },
    _scan: function() {
      var self = this;
      document.querySelectorAll(".dashboard [class*='text-2xl'], .dashboard [class*='text-3xl'], .dashboard .stat-number").forEach(function(el) { self._animateEl(el); });
    },
    onRouteChange: function(path) {
      if (path.indexOf("/console") > -1) { var self = this; setTimeout(function() { self._scan(); }, 900); }
    }
  });

  /* --- Module: Seasonal / Holiday Effects --- */
  App.register({
    id: "seasonalEffects", skipIfReducedMotion: true,
    init: function() {
      var now = new Date(), m = now.getMonth() + 1, d = now.getDate(), holiday = null;
      if ((m === 1 && d >= 20) || (m === 2 && d <= 15)) holiday = "cny";
      else if (m === 12 && d >= 20 && d <= 26) holiday = "christmas";
      else if (m === 10 && d >= 28) holiday = "halloween";
      else if (m === 2 && d >= 13 && d <= 15) holiday = "valentine";
      else if ((m === 9 && d >= 15) || (m === 10 && d <= 5)) holiday = "midautumn";
      if (!holiday) return;

      var symbols = {
        cny:["🧧","🎆","🏮","🎊","✨"], christmas:["❄️","🎄","⭐","🎁","✨"],
        halloween:["🎃","👻","🦇","🕸️","✨"], valentine:["❤️","💕","💖","🌹","✨"],
        midautumn:["🥮","🌕","🏮","🐇","✨"]
      };
      var pool = symbols[holiday] || ["✨"];

      var container = document.createElement("div");
      container.id = "ui-seasonal-fx";
      container.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99998;overflow:hidden;";
      document.body.appendChild(container);

      var ss = document.createElement("style");
      ss.textContent = "@keyframes _ui_seasonFall{0%{transform:translateY(0) rotate(0deg);opacity:0.7}100%{transform:translateY(calc(100vh + 60px)) rotate(360deg);opacity:0}}";
      document.head.appendChild(ss);

      /**
       * Creates and appends a single falling symbol element to the seasonal container.
       *
       * If the container already contains 12 or more child elements, the function does nothing.
       * The element's text is chosen at random from the `pool`. Its horizontal position is a
       * random percentage, and its animation timing and font size are randomized:
       * - duration between 6 and 12 seconds
       * - font size between 14px and 28px
       * - start delay between 0 and 2 seconds
       *
       * The element is styled for absolute positioning, semi-transparent opacity, and pointer-events disabled,
       * then appended to `container`. The element is removed from the DOM shortly after its animation completes.
       */
      function spawn() {
        if (container.children.length >= 12) return;
        var el = document.createElement("span");
        el.textContent = pool[Math.floor(Math.random() * pool.length)];
        var x = Math.random()*100, dur = 6+Math.random()*6, size = 14+Math.random()*14, delay = Math.random()*2;
        el.style.cssText = "position:absolute;top:-40px;left:"+x+"%;font-size:"+size+"px;opacity:0.7;pointer-events:none;animation:_ui_seasonFall "+dur+"s linear "+delay+"s forwards;";
        container.appendChild(el);
        setTimeout(function() { if (el.parentNode) el.remove(); }, (dur+delay)*1000+500);
      }
      for (var i = 0; i < 6; i++) spawn();
      var spawnId = setInterval(spawn, 3000);
      setTimeout(function() { clearInterval(spawnId); if (container.parentNode) container.remove(); if (ss.parentNode) ss.remove(); }, 120000);
    }
  });

  /* --- Module: Settings Page Refresh Button --- */
  App.register({
    id: "settingsRefresh",
    init: function() {
      /* Trigger on initial load in case user lands directly on settings page */
      var self = this;
      setTimeout(function() { self.onRouteChange(location.pathname + location.hash); }, 600);
    },
    onRouteChange: function(path) {
      var old = document.getElementById("ui-beautify-settings-refresh");
      if (old) old.remove();
      if (path.indexOf(PLUGIN_NAME) === -1) return;
      setTimeout(function() {
        if (document.getElementById("ui-beautify-settings-refresh")) return;
        var btn = document.createElement("button");
        btn.id = "ui-beautify-settings-refresh"; btn.type = "button";
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px">'
          + '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>刷新页面';
        btn.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;"
          + "padding:10px 24px;border-radius:10px;border:1px solid var(--ui-border,rgba(128,128,128,0.2));"
          + "background:var(--ui-surface,rgba(255,255,255,0.9));backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);"
          + "color:var(--ui-text,#333);font-size:13px;font-weight:500;cursor:pointer;"
          + "box-shadow:0 4px 20px var(--ui-shadow,rgba(0,0,0,0.08));transition:all .2s ease;font-family:system-ui,sans-serif;";
        btn.addEventListener("mouseenter", function() { btn.style.boxShadow = "0 6px 24px var(--ui-shadow-hover,rgba(0,0,0,0.12))"; });
        btn.addEventListener("mouseleave", function() { btn.style.boxShadow = "0 4px 20px var(--ui-shadow,rgba(0,0,0,0.08))"; });
        btn.addEventListener("click", function() { location.reload(); });
        document.body.appendChild(btn);
      }, 500);
    }
  });

  /* ========== INIT ALL MODULES ========== */
  App._startMutationObserver();
  App._startRouter();
  App._initModules();

  /* Load config → apply theme → re-apply toggles → trigger initial DOM scan */
  App.fetchConfig().then(function(theme) {
    App.currentTheme = theme;
    App.loadThemeCSS(theme);
    App._applyToggleStates();
    /* Fire all mutation callbacks once so modules can scan existing DOM */
    App._mutationCbs.forEach(function(cb) { try { cb(); } catch(e) {} });
  });

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
} catch(e) { console.warn("[ui-beautify] Plugin registration failed:", e); }
