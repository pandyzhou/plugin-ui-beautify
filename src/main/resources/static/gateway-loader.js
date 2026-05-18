/* Gateway Beautify Loader — path guard + auth layout compatibility */
(function() {
  "use strict";

  if (window.__UI_BEAUTIFY_GATEWAY_LOADED__) return;
  window.__UI_BEAUTIFY_GATEWAY_LOADED__ = true;

  var PLUGIN_NAME = "plugin-ui-beautify";
  var BASE_URL = "/plugins/" + PLUGIN_NAME + "/assets/static/";
  var VALID_THEMES = ["default", "ocean", "deepblue", "dark", "sakura", "minimal", "aurora", "neon"];
  var DEFAULT_THEME = "minimal";
  var EXACT_PATHS = ["/login", "/signup", "/logout", "/setup", "/binding"];
  var PREFIX_PATHS = ["/challenges/", "/password-reset/"];

  function isGatewayPath(path) {
    path = (path || location.pathname).replace(/\/+$/, "") || "/";
    if (EXACT_PATHS.indexOf(path) !== -1) return true;
    return PREFIX_PATHS.some(function(prefix) {
      return location.pathname.indexOf(prefix) === 0;
    });
  }

  if (!isGatewayPath(location.pathname)) return;

  var cfg = window.__UI_BEAUTIFY_GATEWAY__ || {};
  var theme = cfg.theme || window.__UI_BEAUTIFY_THEME__ || DEFAULT_THEME;
  if (VALID_THEMES.indexOf(theme) === -1) theme = DEFAULT_THEME;
  window.__UI_BEAUTIFY_THEME__ = theme;

  function ensureStylesheet(id, href) {
    var existing = document.getElementById(id);
    if (existing) {
      if (existing.getAttribute("href") !== href) existing.setAttribute("href", href);
      return;
    }
    var link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureScript(id, src) {
    if (document.getElementById(id)) return;
    var script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }

  function addClass(selector, className) {
    document.querySelectorAll(selector).forEach(function(el) {
      el.classList.add(className);
    });
  }

  function applyAuthCompatibility() {
    document.body.classList.add("gateway-page");

    addClass(".auth-page-default, .auth-page, .login-page, .signup-page", "gateway-page");
    addClass(".auth-page-default, .auth-page, .gateway-page > main", "gateway-wrapper");
    addClass(".auth-card-default, .auth-card, .auth-form-container", "halo-form-wrapper");
    addClass("form#login-form, form#signup-form, form[name='login-form'], form[name='signup-form'], form.halo-form", "halo-form");
    addClass(".auth-title, .form-title", "form-title");
    addClass(".premium-input, .halo-form input:not([type='hidden']):not([type='checkbox']):not([type='radio']), .halo-form textarea, .halo-form select", "form-input");
    addClass(".premium-btn, .halo-form button[type='submit']", "ui-beautify-gateway-submit");
  }

  ensureStylesheet("ui-beautify-gateway-base-css", BASE_URL + "gateway-beautify.css");
  ensureStylesheet("ui-beautify-gateway-theme-css", BASE_URL + "gateway-" + theme + ".css");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyAuthCompatibility, { once: true });
  } else {
    applyAuthCompatibility();
  }

  ensureScript("ui-beautify-gateway-effects-js", BASE_URL + "gateway-effects.js");
})();
