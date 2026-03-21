# 主题制作指南

本文档面向想要为 `plugin-ui-beautify` 插件创建自定义主题的开发者。

---

## 1. 架构概述

### 分层架构

```text
style.css（全局结构，主题无关）
  |
  +-- theme-base-light.css（浅色公共样式 + CSS 变量）
  |     +-- theme-default.css（薄荷）
  |     +-- theme-ocean.css（海洋）
  |     +-- theme-sakura.css（樱花）
  |     +-- theme-minimal.css（极简）
  |     +-- patch-plugin-pages-light.css（插件页补丁层）
  |     +-- patch-app-store-light.css（应用市场补丁层）
  |
  +-- theme-base-dark.css（暗色公共样式 + CSS 变量）
        +-- theme-dark.css（暗夜）
        +-- theme-deepblue.css（深邃蓝）
        +-- theme-aurora.css（极光）
        +-- theme-neon.css（霓虹）
        +-- patch-plugin-pages-dark.css（插件页补丁层）
        +-- patch-app-store-dark.css（应用市场补丁层）
        +-- patch-dashboard-dark.css（仪表盘补丁层）
```

加载顺序：`style.css` 始终加载 -> 根据主题类型加载对应 base -> 加载 `theme-{name}.css` 覆盖 -> 加载页面级 patch CSS。

### CSS 变量驱动的颜色系统

所有组件样式通过 CSS 变量（`--ui-*`）引用颜色。base 文件定义默认值，主题文件通过 `:root` 覆盖变量即可改变全局配色，无需重写组件样式。

### 模块化 JS 架构

```text
main.js
  |
  +-- App（核心）: 配置加载、主题切换、路由监听、模块管理、patch CSS 加载
  +-- FX（粒子引擎）: Canvas 粒子系统，每个主题定义独立的粒子配置
  +-- 功能模块: 通过 App.register() 注册，支持生命周期回调
       +-- pageTransition（页面过渡动画）
       +-- listAnimation（列表入场动画）
       +-- cursorGlow（光标光晕）
       +-- macOSCards（macOS 窗口风格）
       +-- wallpaper（动态壁纸）
       +-- welcomeBanner（欢迎横幅）
       +-- routeFlags（路由语义类）
       +-- semanticPagePatches（页面语义补丁标记）
       +-- shadowThemeBridge（shadow DOM 主题桥接）
```

### 网关页面独立系统

网关页面（登录、注册等）使用独立的样式和效果系统：
- `gateway-beautify.css` — 公共样式
- `gateway-{name}.css` — 主题特定样式
- `gateway-effects.js` — 独立的粒子效果引擎
- 通过 `GatewayStyleInjector.java` 在服务端注入 HTML

---

## 2. 创建新的 Console 主题（分步骤）

### 步骤 1：选择 base

每个主题必须基于一个 base 文件。base 文件提供了完整的组件样式（侧边栏、菜单、卡片、表单、弹窗等），你的主题只需覆盖颜色变量和添加特色样式。

- 浅色主题 -> 继承 `theme-base-light.css`
- 暗色主题 -> 继承 `theme-base-dark.css`

base 的加载由 `main.js` 中的 `DARK_THEMES` 数组决定：

```javascript
var DARK_THEMES = ["dark", "deepblue", "aurora", "neon"];
```

如果你的主题名在 `DARK_THEMES` 中，系统会加载 `theme-base-dark.css`；否则加载 `theme-base-light.css`。

加载逻辑位于 `App.loadThemeCSS()` 方法中：

```javascript
var isDark = DARK_THEMES.includes(theme);
var baseName = isDark ? "theme-base-dark" : "theme-base-light";
```

### 步骤 2：创建主题 CSS 文件

文件命名规则：`theme-{name}.css`，其中 `{name}` 是你的主题标识符（小写英文，无空格）。

放置位置：`src/main/resources/console/`

主题 CSS 文件的职责：
1. 覆盖 `:root` 中的 CSS 变量来定制颜色
2. 添加主题特有的组件样式（渐变背景、装饰元素等）

以下是一个最小的浅色主题模板：

```css
/* ============================================
   Theme: MyTheme — 简短描述
   Primary: #主色调
   ============================================ */

/* 覆盖颜色变量（可选，不覆盖则使用 base 默认值） */
:root {
  --ui-primary: #你的主色调;
  --ui-primary-soft: rgba(你的主色调, 0.08);
}

/* === 侧边栏定制 === */
.sidebar {
  background: linear-gradient(180deg, #颜色1 0%, #颜色2 100%) !important;
  border-right: 1px solid rgba(主色调, 0.15) !important;
}

/* === 主内容区背景 === */
.main-content {
  background: linear-gradient(160deg, #颜色1 0%, #颜色2 100%) !important;
}

/* === 菜单激活项 === */
.menu-item-title.active {
  background: linear-gradient(135deg, rgba(主色调, 0.15), rgba(主色调, 0.08)) !important;
}
.menu-item-title.active::before {
  background: linear-gradient(180deg, #主色调, #深色调) !important;
}
```

注意事项：
- 所有样式需要 `!important` 来覆盖 Halo 默认样式
- 参考 `theme-default.css`（薄荷主题）了解完整的组件覆盖方式
- 不需要重写 base 中已有的通用样式（圆角、过渡动画等），只需覆盖颜色相关的部分

### 步骤 3：注册主题到 JS

打开 `src/main/resources/console/main.js`，修改文件顶部的两个常量数组：

```javascript
// 1. 在 VALID_THEMES 中添加你的主题名
var VALID_THEMES = ["default", "ocean", "deepblue", "dark", "sakura", "minimal", "aurora", "neon", "mytheme"];

// 2. 如果是暗色主题，还需添加到 DARK_THEMES
var DARK_THEMES = ["dark", "deepblue", "aurora", "neon", "mytheme"];
```

`VALID_THEMES` 用于校验主题名是否合法。如果用户配置了不在列表中的主题名，系统会回退到 `"minimal"`。

### 步骤 4：添加粒子效果（可选）

粒子效果是可选的。如果你的主题不需要粒子效果，跳过此步骤即可（系统不会为没有 `FX.THEMES` 配置的主题显示粒子）。

在 `main.js` 的 `FX.THEMES` 对象中添加你的主题配置：

```javascript
FX.THEMES.mytheme = {
  count: 20,                    // 粒子数量
  color: function() {           // 返回粒子颜色字符串
    return "rgba(100,200,150,0.15)";
  },
  size: function() {            // 返回粒子大小（像素）
    return 3 + Math.random() * 5;
  },
  speed: function() {           // 返回垂直移动速度（vy）
    return 0.2 + Math.random() * 0.4;
  },
  draw: function(ctx, p) {      // 绘制单个粒子
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  },
  update: function(p, w, h) {   // 每帧更新粒子位置
    p.y -= p.vy;
    p.x += Math.sin(p.wobble) * 0.3;
    p.wobble += 0.02;
    if (p.y < -20) { p.y = h + 10; p.x = Math.random() * w; }
  },
  // 可选属性
  shootingStars: false,          // 是否启用流星效果
  shootingStarColor: "#a78bfa",  // 流星颜色
  shootingStarGlow: "#c4b5fd",   // 流星光晕颜色
  wind: false                    // 是否启用风效果（影响 vx）
};
```

各属性详细说明见第 4 节。

### 步骤 5：注册到设置面板

打开 `src/main/resources/extensions/setting.yaml`，在 `consoleTheme` 和 `gatewayTheme` 的 `options` 列表中添加你的主题选项：

```yaml
- label: "🌲 森林 — 自然深邃"
  value: "mytheme"
```

如果是暗色主题且部分页面未完全适配，建议在 label 中标注：

```yaml
- label: "🌲 森林 — 自然深邃（⚠️ 部分页面未适配）"
  value: "mytheme"
```

注意：`consoleTheme` 和 `gatewayTheme` 是两个独立的选项列表，如果你的主题同时支持 Console 和网关页面，两处都需要添加。

### 步骤 6：注册到 Java 端

打开 `src/main/java/run/halo/ui/beautify/GatewayStyleInjector.java`，在 `VALID_THEMES` 集合中添加你的主题名：

```java
private static final Set<String> VALID_THEMES = Set.of(
    "default", "ocean", "deepblue", "dark", "sakura", "minimal", "aurora", "neon", "mytheme"
);
```

这个集合用于校验网关页面的主题配置。如果主题名不在集合中，系统会回退到 `"minimal"`。

同时，你需要创建对应的网关样式文件 `src/main/resources/static/gateway-mytheme.css`（详见第 6 节）。

---

## 3. CSS 变量参考

以下是 `theme-base-light.css` 和 `theme-base-dark.css` 中 `:root` 定义的所有 CSS 变量：

| 变量名 | 用途 | 浅色默认值 | 暗色默认值 |
|--------|------|-----------|-----------|
| `--ui-bg` | 页面背景色 | `#f8fafc` | `#1a1a2e` |
| `--ui-surface` | 卡片/面板表面色 | `#ffffff` | `rgba(30,30,50,0.8)` |
| `--ui-surface-hover` | 表面悬停色 | `#f1f5f9` | `rgba(50,50,70,0.8)` |
| `--ui-border` | 边框颜色 | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` |
| `--ui-border-hover` | 边框悬停色 | `rgba(0,0,0,0.1)` | `rgba(255,255,255,0.12)` |
| `--ui-text` | 主文本颜色 | `#1e293b` | `#e0e0f0` |
| `--ui-text-secondary` | 次要文本颜色 | `#64748b` | `#a0a0b8` |
| `--ui-text-muted` | 弱化文本颜色 | `#94a3b8` | `#666680` |
| `--ui-primary` | 主色调（强调色） | `#6366f1` | `#8b5cf6` |
| `--ui-primary-soft` | 主色调柔和版（背景用） | `rgba(99,102,241,0.08)` | `rgba(139,92,246,0.1)` |
| `--ui-shadow` | 阴影颜色 | `rgba(0,0,0,0.04)` | `rgba(0,0,0,0.2)` |
| `--ui-shadow-hover` | 悬停阴影颜色 | `rgba(0,0,0,0.08)` | `rgba(0,0,0,0.3)` |
| `--ui-scrollbar` | 滚动条颜色 | `rgba(148,163,184,0.3)` | `rgba(255,255,255,0.15)` |
| `--ui-scrollbar-hover` | 滚动条悬停色 | `rgba(148,163,184,0.5)` | `rgba(255,255,255,0.25)` |
| `--ui-overlay` | 遮罩层颜色 | `rgba(255,255,255,0.8)` | `rgba(0,0,0,0.6)` |

这些变量被 base 文件中的所有组件样式引用。你只需在主题 CSS 的 `:root` 中覆盖需要修改的变量，未覆盖的变量会使用 base 的默认值。

示例 — 覆盖主色调为绿色：

```css
:root {
  --ui-primary: #22c55e;
  --ui-primary-soft: rgba(34, 197, 94, 0.1);
}
```

---

## 4. 粒子效果系统详解

### FX.THEMES 接口

Console 端的粒子效果定义在 `main.js` 的 `FX.THEMES` 对象中。每个主题的配置是一个对象，包含以下属性：

```javascript
FX.THEMES.themeName = {
  // --- 必需属性 ---
  count: Number,              // 粒子数量（建议 4~35）
  color: function() {         // 返回颜色字符串（每个粒子创建时调用一次）
    return "rgba(r,g,b,a)";
  },
  size: function() {          // 返回粒子大小，单位像素
    return Number;
  },
  speed: function() {         // 返回垂直移动速度（赋值给 vy）
    return Number;            // 返回 0 表示粒子不做垂直移动
  },
  draw: function(ctx, p) {    // 绘制单个粒子
    // ctx: CanvasRenderingContext2D
    // p: 粒子对象（见下方属性列表）
  },
  update: function(p, w, h) { // 每帧更新粒子状态
    // p: 粒子对象
    // w: 画布宽度
    // h: 画布高度
  },

  // --- 可选属性 ---
  shootingStars: Boolean,     // 是否启用流星效果（默认 false）
  shootingStarColor: String,  // 流星颜色，如 "#a78bfa"
  shootingStarGlow: String,   // 流星光晕颜色，如 "#c4b5fd"
  wind: Boolean               // 是否启用风效果（默认 false）
                              // 启用后粒子会有水平漂移（影响 vx）
};
```

各内置主题的粒子效果参考：

| 主题 | count | 效果类型 | 特殊功能 |
|------|-------|---------|---------|
| default | 12 | 径向渐变光斑，缓慢漂移 | - |
| sakura | 22 | 五瓣花瓣，旋转飘落 | wind |
| ocean | 18 | 气泡，向上浮动 | - |
| deepblue | 15 | 发光粒子，缓慢上浮 | - |
| dark | 35 | 闪烁星点 | shootingStars |
| aurora | 4 | 大型径向渐变光团 | - |
| neon | 30 | 霓虹发光点，缓慢漂移 | shootingStars |

### 粒子对象属性

`FX.createParticle(cfg, w, h)` 方法为每个粒子创建一个对象，包含以下属性：

| 属性 | 类型 | 说明 |
|------|------|------|
| `x` | Number | 水平位置（随机 0~w） |
| `y` | Number | 垂直位置（随机 0~h） |
| `size` | Number | 粒子大小（由 `cfg.size()` 返回） |
| `color` | String | 粒子颜色（由 `cfg.color()` 返回） |
| `vy` | Number | 垂直速度（由 `cfg.speed()` 返回） |
| `vx` | Number | 水平速度（初始为 0，wind 模式下会被修改） |
| `rot` | Number | 旋转角度（随机 0~2PI） |
| `rotSpeed` | Number | 旋转速度（随机 -0.01~0.01） |
| `wobble` | Number | 摆动相位（随机 0~2PI，用于 `Math.sin` 产生波动） |
| `phase` | Number | 闪烁相位（随机 0~2PI） |
| `phaseSpeed` | Number | 闪烁速度（0.01~0.03） |
| `alpha` | Number | 当前透明度（初始为 1） |
| `baseAlpha` | Number | 基础透明度（0.15~0.5） |

你可以在 `update` 函数中修改这些属性来实现各种动画效果。也可以在 `draw` 函数中读取这些属性来控制绘制方式。

常见的动画模式：

```javascript
// 1. 向上浮动（气泡效果）
update: function(p, w, h) {
  p.y -= p.vy;
  p.x += Math.sin(p.wobble) * 0.3;
  p.wobble += 0.02;
  if (p.y < -20) { p.y = h + 10; p.x = Math.random() * w; }
}

// 2. 向下飘落（花瓣/雪花效果）
update: function(p, w, h) {
  p.y += p.vy;
  p.x += Math.sin(p.wobble) * 0.5;
  p.wobble += 0.015;
  p.rot += p.rotSpeed;
  if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
}

// 3. 闪烁（星空效果）
update: function(p) {
  p.phase += p.phaseSpeed;
  p.alpha = 0.3 + Math.sin(p.phase) * 0.7;
}

// 4. 缓慢漂移（光斑效果）
update: function(p, w, h) {
  p.x += Math.sin(p.wobble) * 0.2;
  p.y += Math.cos(p.wobble * 0.8) * 0.15;
  p.wobble += 0.003;
  if (p.x < -p.size) p.x = w + p.size;
  if (p.x > w + p.size) p.x = -p.size;
  if (p.y < -p.size) p.y = h + p.size;
  if (p.y > h + p.size) p.y = -p.size;
}
```

---

## 5. 模块系统

### App.register() 接口

通过 `App.register()` 注册功能模块。每个模块是一个对象，支持以下生命周期回调：

```javascript
App.register({
  id: "myModule",                    // 模块唯一标识（必需）
  toggle: "enableMyModule",          // 对应的功能开关名（可选）
                                     // 对应 setting.yaml 中 features 组的字段名
  skipIfReducedMotion: true,         // 是否在用户开启"减少动画"时跳过初始化（可选）

  init: function(app) {              // 初始化回调（必需）
    // app: App 对象引用
    // 在这里创建 DOM 元素、绑定事件等
  },

  onThemeChange: function(theme) {   // 主题变更回调（可选）
    // theme: 新的主题名（已解析，不会是 "auto"）
  },

  onRouteChange: function(path) {    // 路由变更回调（可选）
    // path: 当前路径（pathname + hash）
  },

  onToggle: function(on) {           // 开关状态变更回调（可选）
    // on: Boolean，当前开关状态
  },

  destroy: function() {              // 销毁清理回调（可选）
    // 移除 DOM 元素、解绑事件、取消 RAF 等
  }
});
```

模块初始化流程：
1. `App._initModules()` 遍历所有已注册模块
2. 如果模块设置了 `skipIfReducedMotion: true` 且用户开启了"减少动画"偏好，跳过该模块
3. 如果模块设置了 `toggle` 且对应开关为关闭状态，跳过该模块
4. 调用 `mod.init(App)` 初始化模块

### 添加新功能模块的步骤

1. 在 `main.js` 中编写模块代码，放在 `/* ========== BOOTSTRAP ========== */` 注释之前
2. 如果模块需要功能开关，在 `setting.yaml` 的 `features` 组中添加对应的 checkbox
3. 在 `App.fetchConfig()` 方法中添加对应的 `readToggle` 调用

示例 — 添加一个简单的打字机效果模块：

```javascript
App.register({
  id: "typewriter",
  toggle: "enableTypewriter",
  skipIfReducedMotion: true,
  _styleEl: null,

  init: function() {
    this._styleEl = document.createElement("style");
    this._styleEl.id = "ui-beautify-typewriter";
    this._styleEl.textContent =
      "@keyframes _ui_typewriter{from{width:0}to{width:100%}}" +
      ".page-header__title{overflow:hidden;white-space:nowrap;" +
      "animation:_ui_typewriter 0.5s steps(20) forwards}";
    document.head.appendChild(this._styleEl);
  },

  onToggle: function(on) {
    if (this._styleEl) this._styleEl.disabled = !on;
  },

  destroy: function() {
    if (this._styleEl && this._styleEl.parentNode) {
      this._styleEl.parentNode.removeChild(this._styleEl);
    }
  }
});
```

对应的 `setting.yaml` 配置：

```yaml
- $formkit: checkbox
  label: "启用打字机效果"
  name: enableTypewriter
  value: true
  help: "页面标题以打字机动画方式显示"
```

---

## 6. 网关主题

网关页面（登录、注册、密码重置等）有独立的样式和效果系统，与 Console 端分开管理。

### 文件结构

```text
src/main/resources/static/
  +-- gateway-beautify.css    # 公共样式（所有网关主题共享）
  +-- gateway-default.css     # 薄荷主题
  +-- gateway-ocean.css       # 海洋主题
  +-- gateway-sakura.css      # 樱花主题
  +-- gateway-dark.css        # 暗夜主题
  +-- gateway-deepblue.css    # 深邃蓝主题
  +-- gateway-aurora.css      # 极光主题
  +-- gateway-neon.css        # 霓虹主题
  +-- gateway-minimal.css     # 极简主题
  +-- gateway-effects.js      # 粒子效果引擎
```

### 注入机制

`GatewayStyleInjector.java` 通过 WebFilter 拦截网关页面的 HTML 响应，在 `</head>` 前注入：

```html
<link rel="stylesheet" href="/plugins/plugin-ui-beautify/assets/static/gateway-beautify.css" />
<link rel="stylesheet" href="/plugins/plugin-ui-beautify/assets/static/gateway-{theme}.css" />
<script src="/plugins/plugin-ui-beautify/assets/static/gateway-effects.js" defer></script>
<script>window.__UI_BEAUTIFY_THEME__="{theme}";</script>
```

拦截的路径包括：
- 精确匹配：`/login`、`/signup`、`/logout`、`/setup`、`/binding`
- 前缀匹配：`/challenges/`、`/password-reset/`

### gateway-effects.js 中的 THEMES 接口

网关端的粒子效果接口与 Console 端略有不同，使用 `create` 方法代替 `color`/`size`/`speed`：

```javascript
var THEMES = {
  mytheme: {
    count: 15,                    // 粒子数量
    create: function() {          // 创建单个粒子（返回粒子对象）
      return {
        x: Math.random() * w,    // w, h 是闭包中的画布尺寸
        y: Math.random() * h,
        size: 3 + Math.random() * 5,
        color: "rgba(100,200,150,0.15)",
        vy: 0.3 + Math.random() * 0.5,
        wobble: Math.random() * Math.PI * 2
        // 可以添加任意自定义属性
      };
    },
    draw: function(p) {           // 绘制粒子（ctx 在闭包中）
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    },
    update: function(p) {         // 更新粒子（w, h 在闭包中）
      p.y -= p.vy;
      p.x += Math.sin(p.wobble) * 0.3;
      p.wobble += 0.02;
      if (p.y < -20) { p.y = h + 10; p.x = Math.random() * w; }
    }
  }
};
```

注意与 Console 端 `FX.THEMES` 的区别：
- 网关端使用 `create()` 方法直接返回完整的粒子对象
- Console 端使用 `color()`、`size()`、`speed()` 分别返回属性值，由 `FX.createParticle()` 组装
- 网关端的 `draw` 和 `update` 不接收 `ctx`/`w`/`h` 参数（它们在闭包中）
- Console 端的 `draw(ctx, p)` 和 `update(p, w, h)` 通过参数传递

### 创建网关主题的步骤

1. 创建 `src/main/resources/static/gateway-mytheme.css`
2. 在 `gateway-effects.js` 的 `THEMES` 对象中添加粒子配置
3. 在 `setting.yaml` 的 `gatewayTheme` options 中添加选项
4. 在 `GatewayStyleInjector.java` 的 `VALID_THEMES` 中添加主题名

---

## 7. 完整示例：创建 "forest" 暗色主题

以下演示从零创建一个名为 "forest" 的暗色主题，主色调为翠绿色，粒子效果为萤火虫。

### 7.1 创建 theme-forest.css

文件路径：`src/main/resources/console/theme-forest.css`

```css
/* ============================================
   Theme: Forest — 深林幽境
   Primary: #22c55e
   Accent gradient: emerald → lime
   ============================================ */

/* 覆盖暗色 base 的颜色变量 */
:root {
  --ui-bg: #0f1a0f;
  --ui-surface: rgba(20, 40, 20, 0.85);
  --ui-surface-hover: rgba(30, 60, 30, 0.8);
  --ui-border: rgba(34, 197, 94, 0.08);
  --ui-border-hover: rgba(34, 197, 94, 0.15);
  --ui-text: #d4e8d4;
  --ui-text-secondary: #8faa8f;
  --ui-text-muted: #4a6a4a;
  --ui-primary: #22c55e;
  --ui-primary-soft: rgba(34, 197, 94, 0.12);
  --ui-shadow: rgba(0, 0, 0, 0.3);
  --ui-shadow-hover: rgba(0, 0, 0, 0.4);
  --ui-scrollbar: rgba(34, 197, 94, 0.2);
  --ui-scrollbar-hover: rgba(34, 197, 94, 0.35);
  --ui-overlay: rgba(0, 0, 0, 0.7);
}

/* === 侧边栏 === */
.sidebar {
  background: linear-gradient(180deg, #0f1a0f 0%, #132613 50%, #0f1a0f 100%) !important;
  border-right: 1px solid rgba(34, 197, 94, 0.1) !important;
}
.sidebar__search {
  background-color: rgba(34, 197, 94, 0.06) !important;
  border: 1px solid rgba(34, 197, 94, 0.1) !important;
}
.sidebar__search:hover {
  background-color: rgba(34, 197, 94, 0.1) !important;
  border-color: rgba(34, 197, 94, 0.2) !important;
}

/* === 菜单 === */
.menu-item:hover {
  background-color: rgba(34, 197, 94, 0.08) !important;
}
.menu-item-title.active {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.06)) !important;
  color: #d4e8d4 !important;
}
.menu-item-title.active::before {
  background: linear-gradient(180deg, #22c55e, #16a34a) !important;
}

/* === 主内容区 === */
.main-content {
  background:
    radial-gradient(ellipse at 20% 20%, rgba(34, 197, 94, 0.04), transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(22, 163, 74, 0.03), transparent 50%),
    #0f1a0f !important;
}

/* === 页面头部 === */
.page-header {
  background: rgba(15, 26, 15, 0.9) !important;
  border-bottom: 1px solid rgba(34, 197, 94, 0.08) !important;
}

/* === 卡片 === */
.card-wrapper {
  background: rgba(20, 40, 20, 0.7) !important;
  border: 1px solid rgba(34, 197, 94, 0.1) !important;
}
.card-wrapper:hover {
  border-color: rgba(34, 197, 94, 0.2) !important;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.08) !important;
}
```

### 7.2 添加 FX.THEMES.forest 粒子效果（萤火虫）

在 `main.js` 的 `FX.THEMES` 对象中添加：

```javascript
forest: {
  count: 25,
  color: function() {
    var colors = [
      "rgba(34,197,94,",
      "rgba(74,222,128,",
      "rgba(134,239,172,",
      "rgba(187,247,208,"
    ];
    return colors[Math.floor(Math.random() * colors.length)]
      + (0.1 + Math.random() * 0.25).toFixed(2) + ")";
  },
  size: function() { return 1.5 + Math.random() * 3; },
  speed: function() { return 0; },
  draw: function(ctx, p) {
    /* 萤火虫核心 */
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    var alpha = (p.alpha * p.baseAlpha).toFixed(2);
    var colorBase = p.color.slice(0, p.color.lastIndexOf(",") + 1);
    ctx.fillStyle = colorBase + alpha + ")";
    ctx.fill();
    /* 萤火虫光晕 */
    var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
    g.addColorStop(0, colorBase + (alpha * 0.3).toFixed(2) + ")");
    g.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  },
  update: function(p, w, h) {
    /* 缓慢随机漂移 + 闪烁 */
    p.phase += p.phaseSpeed;
    p.alpha = 0.2 + Math.sin(p.phase) * 0.8;
    p.x += Math.sin(p.wobble) * 0.3;
    p.y += Math.cos(p.wobble * 0.7) * 0.2;
    p.wobble += 0.004 + Math.random() * 0.002;
    /* 边界循环 */
    if (p.x < -10) p.x = w + 10;
    if (p.x > w + 10) p.x = -10;
    if (p.y < -10) p.y = h + 10;
    if (p.y > h + 10) p.y = -10;
  }
},
```

### 7.3 修改 main.js 常量

```javascript
var VALID_THEMES = ["default", "ocean", "deepblue", "dark", "sakura", "minimal", "aurora", "neon", "forest"];
var DARK_THEMES = ["dark", "deepblue", "aurora", "neon", "forest"];
```

光标光晕、极光背景和动态壁纸默认会从 CSS 变量 `--ui-primary` 自动回退生成颜色，因此**不需要**额外修改 `_COLORS` 映射也能正常工作。

如果你希望为新主题提供更精细的专属颜色（而不是使用 `--ui-primary` 的自动回退），可以**可选地**在光标光晕模块的 `_COLORS` 中添加：

```javascript
_COLORS: {
  // ... 已有主题 ...
  "forest": "rgba(34,197,94,0.15)"
},
```

### 7.4 修改 setting.yaml

在 `consoleTheme` 的 options 中添加：

```yaml
- label: "🌲 森林 — 深林幽境（⚠️ 部分页面未适配）"
  value: "forest"
```

在 `gatewayTheme` 的 options 中添加：

```yaml
- label: "🌲 森林 — 深林幽境（⚠️ 部分页面未适配）"
  value: "forest"
```

### 7.5 修改 GatewayStyleInjector.java

```java
private static final Set<String> VALID_THEMES = Set.of(
    "default", "ocean", "deepblue", "dark", "sakura", "minimal", "aurora", "neon", "forest"
);
```

### 7.6 创建网关样式（可选）

创建 `src/main/resources/static/gateway-forest.css`，参考已有的 `gateway-dark.css` 编写网关页面的暗色样式。

在 `gateway-effects.js` 的 `THEMES` 对象中添加：

```javascript
forest: {
  count: 20,
  create: function() {
    var colors = [
      "rgba(34,197,94,0.2)",
      "rgba(74,222,128,0.15)",
      "rgba(134,239,172,0.18)"
    ];
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      size: 1.5 + Math.random() * 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.008 + Math.random() * 0.015,
      alpha: 1,
      baseAlpha: 0.2 + Math.random() * 0.4,
      wobble: Math.random() * Math.PI * 2
    };
  },
  draw: function(p) {
    var a = (p.alpha * p.baseAlpha).toFixed(2);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color.replace(/[\d.]+\)$/, a + ")");
    ctx.fill();
    var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
    g.addColorStop(0, p.color.replace(/[\d.]+\)$/, (a * 0.3).toFixed(2) + ")"));
    g.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  },
  update: function(p) {
    p.phase += p.phaseSpeed;
    p.alpha = 0.2 + Math.sin(p.phase) * 0.8;
    p.x += Math.sin(p.wobble) * 0.25;
    p.y += Math.cos(p.wobble * 0.7) * 0.15;
    p.wobble += 0.004;
    if (p.x < -10) p.x = w + 10;
    if (p.x > w + 10) p.x = -10;
    if (p.y < -10) p.y = h + 10;
    if (p.y > h + 10) p.y = -10;
  }
},
```

---

## 8. 注册清单

添加新主题时，确保以下文件都已正确修改：

- [ ] `src/main/resources/console/theme-{name}.css` — Console 主题样式文件
- [ ] `src/main/resources/console/main.js` — `VALID_THEMES` 数组
- [ ] `src/main/resources/console/main.js` — `DARK_THEMES` 数组（仅暗色主题）
- [ ] `src/main/resources/console/main.js` — `FX.THEMES.{name}` 粒子配置（可选）
- [ ] `src/main/resources/console/main.js` — 光标光晕 `_COLORS` 映射（可选）
- [ ] `src/main/resources/extensions/setting.yaml` — `consoleTheme` options
- [ ] `src/main/resources/extensions/setting.yaml` — `gatewayTheme` options（如果支持网关）
- [ ] `src/main/java/run/halo/ui/beautify/GatewayStyleInjector.java` — `VALID_THEMES` 集合
- [ ] `src/main/resources/static/gateway-{name}.css` — 网关主题样式文件（如果支持网关）
- [ ] `src/main/resources/static/gateway-effects.js` — `THEMES.{name}` 粒子配置（如果支持网关）

