(function () {
  "use strict";

  const Store = window.ResourceStore;
  const TYPE_META = {
    link: { label: "链接", icon: "link", color: "#5d7398" },
    file: { label: "文件", icon: "file", color: "#557d68" },
    note: { label: "笔记", icon: "note", color: "#ad7a4d" }
  };
  const MINECRAFT_META = {
    map: { label: "地图", icon: "layers", color: "#a97943" },
    shader: { label: "光影", icon: "sun", color: "#697fa8" },
    mod: { label: "模组", icon: "settings", color: "#558267" },
    resourcepack: { label: "材质包", icon: "library", color: "#a36365" },
    modpack: { label: "整合包", icon: "cube", color: "#8a7244" }
  };
  const ACCOUNT_CATEGORY = {
    social: { label: "社交", color: "#5d7398" },
    game: { label: "游戏", color: "#557d68" },
    media: { label: "影音", color: "#a86465" },
    work: { label: "工作", color: "#8a7244" },
    shopping: { label: "购物", color: "#8a6c97" },
    other: { label: "其他", color: "#777b56" }
  };
  const DEFAULT_ACCOUNT_CATEGORIES = Object.entries(ACCOUNT_CATEGORY).map(
    ([id, meta]) => ({ id, label: meta.label, color: meta.color })
  );
  const DEFAULT_MINECRAFT_CATEGORIES = Object.entries(MINECRAFT_META).map(
    ([id, meta]) => ({ id, label: meta.label, color: meta.color, icon: meta.icon })
  );
  const ACCOUNT_LAYOUT_META = {
    cards: { label: "卡片", icon: "library" },
    list: { label: "列表", icon: "list" },
    table: { label: "表格", icon: "table" }
  };
  const ACCOUNT_ICON_CHOICES = new Set([
    "link",
    "key",
    "user",
    "star",
    "cube",
    "note"
  ]);
  const LAYOUT_META = {
    grid: { label: "卡片", icon: "library", description: "信息均衡，适合日常浏览" },
    list: { label: "紧凑", icon: "list", description: "同屏显示更多资源" },
    gallery: { label: "画廊", icon: "gallery", description: "突出标题与内容氛围" },
    table: { label: "表格", icon: "table", description: "按栏位快速扫读" }
  };
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const DEFAULT_COLOR = "#557d68";
  const FILE_HELP_TEXT = window.ShijiDesktop
    ? "桌面版只记录文件路径，不会复制或移动原文件"
    : "文件将保存在此设备的浏览器中";
  const NAV_ORDER_KEY = "shiji.navOrder";
  const NAV_VIEWS = ["all", "favorites", "recent"];
  const LIBRARY_STORAGE_KEY = "shiji.libraries";
  const LIBRARY_ICON_CHOICES = [
    "library",
    "note",
    "folder",
    "link",
    "file",
    "gallery",
    "star",
    "cube",
    "clock",
    "layers"
  ];
  const LIBRARY_LAYOUT_CHOICES = ["grid", "list", "gallery", "table"];
  const LIBRARY_TYPE_CHOICES = ["link", "file", "note"];
  const LIBRARY_COLOR_CHOICES = [
    "#557d68",
    "#ad7a4d",
    "#5d7398",
    "#a86465",
    "#8a6c97",
    "#777b56"
  ];
  const LIBRARY_TEMPLATES = {
    blank: {
      name: "",
      description: "",
      icon: "folder",
      color: "#557d68",
      types: ["link", "file", "note"],
      layout: "grid",
      includeAccounts: false
    },
    article: {
      name: "文章与阅读",
      description: "收集值得反复阅读的文章、摘录和个人笔记。",
      icon: "note",
      color: "#ad7a4d",
      types: ["link", "note"],
      layout: "list",
      includeAccounts: false
    },
    download: {
      name: "下载资源",
      description: "集中整理工具、素材、安装包和本地文件。",
      icon: "file",
      color: "#557d68",
      types: ["link", "file"],
      layout: "table",
      includeAccounts: false
    },
    inspiration: {
      name: "灵感收藏",
      description: "保存视觉参考、设计链接和零散的创意想法。",
      icon: "gallery",
      color: "#5d7398",
      types: ["link", "note"],
      layout: "gallery",
      includeAccounts: false
    }
  };
  const LIBRARY_TEMPLATE_META = {
    blank: { label: "空白专区", hint: "自由配置所有选项" },
    article: { label: "文章与阅读", hint: "链接与笔记，紧凑排版" },
    download: { label: "下载资源", hint: "链接与文件，表格浏览" },
    inspiration: { label: "灵感收藏", hint: "链接与笔记，画廊浏览" }
  };
  const FONT_SCALE_VALUES = {
    small: 0.9,
    standard: 1,
    large: 1.1,
    xlarge: 1.2
  };
  const THEME_PALETTES = [
    { id: "forest", label: "森林绿", color: "#345f49" },
    { id: "ocean", label: "海盐蓝", color: "#477087" },
    { id: "clay", label: "陶土棕", color: "#986149" },
    { id: "plum", label: "暮霭紫", color: "#74556f" },
    { id: "berry", label: "莓果红", color: "#9a5063" },
    { id: "amber", label: "琥珀金", color: "#9d6b32" },
    { id: "slate", label: "石墨蓝", color: "#52697a" }
  ];
  const MINECRAFT_TAG_PRESETS = {
    map: ["建筑", "生存", "冒险", "玩法", "跑酷", "空岛"],
    shader: ["低配", "中配", "高配", "写实", "卡通", "自然"],
    mod: ["优化", "实用", "科技", "魔法", "冒险", "装饰"],
    resourcepack: ["16x", "32x", "64x", "写实", "卡通", "原版"],
    modpack: ["轻量", "生存", "科技", "魔法", "多人", "任务"]
  };
  const STARTUP_VIEW_OPTIONS = [
    { value: "all", label: "全部资源" },
    { value: "favorites", label: "我的收藏" },
    { value: "recent", label: "最近打开" },
    { value: "studio", label: "素材库" },
    { value: "minecraft", label: "我的世界" },
    { value: "accounts", label: "账号保险箱" }
  ];
  const SHORTCUT_DEFINITIONS = [
    {
      id: "search",
      label: "全局搜索",
      description: "聚焦顶部搜索框，账号页会聚焦账号搜索",
      defaultKeys: "Ctrl+K",
      icon: "search"
    },
    {
      id: "new-resource",
      label: "新建内容",
      description: "新建资源；在账号保险箱中新建账号",
      defaultKeys: "N",
      icon: "plus"
    },
    {
      id: "toggle-theme",
      label: "切换外观",
      description: "在浅色和深色界面之间切换",
      defaultKeys: "Alt+T",
      icon: "sun"
    },
    {
      id: "open-accounts",
      label: "账号保险箱",
      description: "直接打开本地账号保险箱",
      defaultKeys: "Alt+A",
      icon: "key"
    },
    {
      id: "open-settings",
      label: "设置",
      description: "直接打开设置页面",
      defaultKeys: "Alt+Comma",
      icon: "settings"
    }
  ];
  const SHORTCUT_KEY_TOKENS = new Set([
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "Comma", "Period", "Slash", "Semicolon", "Quote", "BracketLeft",
    "BracketRight", "Backslash", "Minus", "Equal", "Space", "Enter",
    "Tab", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9",
    "F10", "F11", "F12"
  ]);
  const RESERVED_SHORTCUTS = new Set([
    "Ctrl+R",
    "Ctrl+W",
    "Ctrl+Q",
    "Ctrl+Shift+R",
    "Ctrl+Shift+I",
    "F5",
    "F12",
    "Alt+F4"
  ]);

  function defaultShortcuts() {
    return Object.fromEntries(
      SHORTCUT_DEFINITIONS.map((shortcut) => [
        shortcut.id,
        shortcut.defaultKeys
      ])
    );
  }

  function normalizeStoredShortcut(value) {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return "";
    }
    const parts = raw.split("+");
    const key = parts.pop();
    const modifiers = [];
    for (const modifier of parts) {
      if (!["Ctrl", "Alt", "Shift"].includes(modifier) || modifiers.includes(modifier)) {
        return "";
      }
      modifiers.push(modifier);
    }
    if (!SHORTCUT_KEY_TOKENS.has(key)) {
      return "";
    }
    return [...modifiers, key].join("+");
  }

  function loadShortcutPreferences() {
    const defaults = defaultShortcuts();
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem("shiji.shortcuts") || "null");
    } catch {
      // Invalid shortcut preferences fall back to defaults.
    }
    return Object.fromEntries(
      SHORTCUT_DEFINITIONS.map((shortcut) => {
        if (!stored || !Object.prototype.hasOwnProperty.call(stored, shortcut.id)) {
          return [shortcut.id, defaults[shortcut.id]];
        }
        const normalized = normalizeStoredShortcut(stored[shortcut.id]);
        return [
          shortcut.id,
          String(stored[shortcut.id] ?? "") === "" ? "" : normalized || defaults[shortcut.id]
        ];
      })
    );
  }

  function saveShortcutPreferences() {
    localStorage.setItem("shiji.shortcuts", JSON.stringify(state.shortcuts));
  }

  function normalizeLibraries(value) {
    if (!Array.isArray(value)) {
      return [];
    }
    const seen = new Set();
    return value
      .map((item, index) => {
        const id = String(item?.id || "").trim().slice(0, 100);
        const name = String(item?.name || "").trim().slice(0, 24);
        if (!id || !name || seen.has(id)) {
          return null;
        }
        seen.add(id);
        const types = Array.isArray(item.types)
          ? item.types.filter((type) => LIBRARY_TYPE_CHOICES.includes(type))
          : [];
        return {
          id,
          name,
          description: String(item.description || "").trim().slice(0, 180),
          color: safeColor(item.color),
          icon: LIBRARY_ICON_CHOICES.includes(item.icon) ? item.icon : "folder",
          types: types.length ? [...new Set(types)] : ["link", "file", "note"],
          layout: LIBRARY_LAYOUT_CHOICES.includes(item.layout)
            ? item.layout
            : "grid",
          includeAccounts: Boolean(item.includeAccounts),
          order: Number.isFinite(Number(item.order)) ? Number(item.order) : index
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);
  }

  function loadLibraries() {
    try {
      return normalizeLibraries(
        JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEY) || "[]")
      );
    } catch {
      return [];
    }
  }

  function saveLibraries() {
    state.libraries = normalizeLibraries(state.libraries);
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(state.libraries));
  }

  const state = {
    resources: [],
    categories: [],
    libraries: loadLibraries(),
    view: "all",
    categoryId: null,
    libraryId: null,
    typeFilter: "all",
    minecraftType: "all",
    zoneFilter: "all",
    minecraftCategories: [],
    layout: "grid",
    detailMode:
      localStorage.getItem("shiji.detailMode") === "drawer"
        ? "drawer"
        : "window",
    sidebarScale:
      localStorage.getItem("shiji.sidebarScale") === "standard"
        ? "standard"
        : "large",
    fontScale: Object.prototype.hasOwnProperty.call(
      FONT_SCALE_VALUES,
      localStorage.getItem("shiji.fontScale")
    )
      ? localStorage.getItem("shiji.fontScale")
      : "standard",
    palette: THEME_PALETTES.some(
      (palette) => palette.id === localStorage.getItem("shiji.palette")
    )
      ? localStorage.getItem("shiji.palette")
      : "forest",
    navOrder: NAV_VIEWS.slice(),
    query: "",
    sort: "updated",
    orderMode: ["position", "arrows", "drag", "name"].includes(
      localStorage.getItem("shiji.orderMode")
    )
      ? localStorage.getItem("shiji.orderMode")
      : "position",
    settingsSection: localStorage.getItem("shiji.settingsSection") || "general",
    startupView: ["all", "favorites", "recent", "studio", "minecraft", "accounts"].includes(
      localStorage.getItem("shiji.startupView")
    )
      ? localStorage.getItem("shiji.startupView")
      : "all",
    confirmDelete: localStorage.getItem("shiji.confirmDelete") !== "false",
    autoIconDefault: localStorage.getItem("shiji.autoIconDefault") !== "false",
    closeBehavior:
      ["tray", "minimize"].includes(localStorage.getItem("shiji.closeBehavior"))
        ? "tray"
        : "exit",
    closeBehaviorKnown: false,
    shortcuts: loadShortcutPreferences(),
    startupAtLogin: false,
    startupSettingKnown: false,
    editingResourceId: null,
    detailResourceId: null,
    vaultAccounts: [],
    accountCategories: [],
    accountLayout: ACCOUNT_LAYOUT_META[
      localStorage.getItem("shiji.accountLayout") || "cards"
    ]
      ? localStorage.getItem("shiji.accountLayout") || "cards"
      : "cards",
    accountQuery: "",
    accountCategory: "all",
    revealedAccountIds: new Set(),
    showAllPasswords: false
  };

  let selectedFile = null;
  let selectedLocalFile = null;
  let autoDetectedTags = [];
  let toastTimer = null;
  let easterBuffer = "";
  let easterSequenceTimer = null;
  let sortDragState = null;
  let orderDragState = null;
  let accountIconTimer = null;
  let firstResourceGuideActive = false;
  let managedCategoryKind = "account";
  let editingLibraryId = null;
  let resourceEditorReturnResourceId = null;
  let releaseNotesReturnToAuthor = false;
  let libraryEditorReturnToManager = false;
  let tutorialStepIndex = 0;
  let appIsReady = false;
  let searchRenderTimer = null;
  let shortcutRecordingAction = null;
  let customSelectCounter = 0;
  let datePickerCursor = new Date();

  const elements = {
    content: document.getElementById("content"),
    searchBox: document.getElementById("search-box"),
    searchInput: document.getElementById("search-input"),
    categoryNav: document.getElementById("category-nav-list"),
    allCount: document.getElementById("all-count"),
    favoritesCount: document.getElementById("favorites-count"),
    minecraftCount: document.getElementById("minecraft-count"),
    resourceDialog: document.getElementById("resource-dialog"),
    resourceForm: document.getElementById("resource-form"),
    categoryDialog: document.getElementById("category-dialog"),
    categoryForm: document.getElementById("category-form"),
    accountDialog: document.getElementById("account-dialog"),
    accountForm: document.getElementById("account-form"),
    welcomeDialog: document.getElementById("welcome-dialog"),
    detailDialog: document.getElementById("detail-dialog"),
    detailContent: document.getElementById("detail-content"),
    toast: document.getElementById("toast"),
    toastText: document.getElementById("toast-text"),
    importInput: document.getElementById("import-input")
  };

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };
      return entities[character];
    });
  }

  function icon(name, className = "icon") {
    return `<svg class="${className}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  }

  function syncCustomSelect(selectOrControl) {
    const control =
      selectOrControl instanceof Element
        ? selectOrControl.closest(".custom-select") || selectOrControl
        : null;
    const select = control?.querySelector(":scope > select");
    const trigger = control?.querySelector(".custom-select-trigger");
    const label = trigger?.querySelector("[data-custom-select-label]");
    const swatch = trigger?.querySelector(".custom-select-swatch");
    if (!control || !select || !trigger || !label) {
      return;
    }
    const selectedOption = select.options[select.selectedIndex];
    label.textContent = selectedOption?.textContent?.trim() || "暂无可选项";
    if (swatch) {
      const showSwatch = select.id === "managed-category-color";
      swatch.hidden = !showSwatch;
      if (showSwatch) {
        swatch.style.setProperty(
          "--swatch",
          safeColor(selectedOption?.value)
        );
      }
    }
    trigger.disabled = select.disabled || !select.options.length;
    trigger.setAttribute("aria-expanded", "false");
  }

  function upgradeCustomSelect(select) {
    if (
      !(select instanceof HTMLSelectElement) ||
      select.classList.contains("custom-select-native") ||
      select.closest(".custom-select")
    ) {
      return;
    }

    const control = document.createElement("div");
    control.className = "custom-select";
    control.dataset.customSelectId = `custom-select-${++customSelectCounter}`;
    select.parentNode.insertBefore(control, select);
    control.appendChild(select);
    select.classList.add("custom-select-native");

    const trigger = document.createElement("button");
    trigger.className = "custom-select-trigger";
    trigger.type = "button";
    trigger.dataset.action = "toggle-custom-select";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    const fieldLabel =
      select.getAttribute("aria-label") ||
      select
        .closest("label")
        ?.querySelector(":scope > span, :scope > .field-label")
        ?.textContent?.replace("*", "")
        .trim() ||
      select
        .closest(".field")
        ?.querySelector(".field-label")
        ?.textContent?.replace("*", "")
        .trim();
    trigger.setAttribute("aria-label", fieldLabel || "选择选项");
    trigger.innerHTML = `
      <span class="custom-select-value">
        <i class="custom-select-swatch" hidden></i>
        <span data-custom-select-label></span>
      </span>
      ${icon("chevron-right", "icon custom-select-chevron")}
    `;

    const menu = document.createElement("div");
    menu.className = "custom-select-menu";
    menu.dataset.customSelectFor = control.dataset.customSelectId;
    menu.setAttribute("role", "listbox");
    menu.hidden = true;
    control.append(trigger, menu);
    syncCustomSelect(control);
  }

  function upgradeCustomSelects(root = document) {
    root.querySelectorAll("select").forEach(upgradeCustomSelect);
  }

  function closeCustomSelects(except = null) {
    document.querySelectorAll(".custom-select.is-open").forEach((control) => {
      if (control === except) {
        return;
      }
      control.classList.remove("is-open");
      const trigger = control.querySelector(".custom-select-trigger");
      const menu = document.querySelector(
        `.custom-select-menu[data-custom-select-for="${control.dataset.customSelectId}"]`
      );
      trigger?.setAttribute("aria-expanded", "false");
      if (menu) {
        menu.hidden = true;
      }
    });
  }

  function openCustomSelect(trigger) {
    const control = trigger.closest(".custom-select");
    const select = control?.querySelector(":scope > select");
    const menu = document.querySelector(
      `.custom-select-menu[data-custom-select-for="${control?.dataset.customSelectId}"]`
    );
    if (!control || !select || !menu) {
      return;
    }
    closeCustomSelects(control);
    syncCustomSelect(control);
    menu.innerHTML = Array.from(select.options)
      .map(
        (option) => `
          <button
            class="custom-select-option"
            type="button"
            role="option"
            data-custom-select-value="${escapeHTML(option.value)}"
            aria-selected="${option.selected}"
            ${option.disabled ? "disabled" : ""}
          >
            <span class="custom-select-option-main">
              ${select.id === "managed-category-color"
                ? `<i class="custom-select-swatch" style="--swatch: ${safeColor(option.value)}"></i>`
                : ""}
              <span>${escapeHTML(option.textContent.trim())}</span>
            </span>
            ${option.selected ? icon("check") : ""}
          </button>
        `
      )
      .join("");
    const dialog = control.closest("dialog");
    const menuHost = dialog || document.body;
    if (menu.parentElement !== menuHost) {
      menuHost.appendChild(menu);
    }
    const rect = trigger.getBoundingClientRect();
    const estimatedHeight = Math.min(280, select.options.length * 38 + 12);
    menu.style.width = `${rect.width}px`;
    if (dialog) {
      const dialogRect = dialog.getBoundingClientRect();
      const availableBelow = Math.max(0, dialogRect.bottom - rect.bottom - 8);
      const openUpward =
        availableBelow < Math.min(estimatedHeight, 180) && rect.top > 170;
      menu.style.position = "absolute";
      menu.style.left = `${rect.left - dialogRect.left}px`;
      menu.style.top = openUpward
        ? `${rect.top - dialogRect.top - estimatedHeight - 7}px`
        : `${rect.bottom - dialogRect.top + 7}px`;
      menu.style.maxHeight = openUpward
        ? `${Math.min(280, Math.max(120, rect.top - dialogRect.top - 14))}px`
        : `${Math.min(280, Math.max(120, availableBelow))}px`;
    } else {
      const availableBelow = Math.max(0, window.innerHeight - rect.bottom - 12);
      const openUpward =
        availableBelow < Math.min(estimatedHeight, 180) && rect.top > 170;
      menu.style.position = "fixed";
      menu.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - rect.width - 12))}px`;
      menu.style.top = openUpward
        ? `${Math.max(12, rect.top - estimatedHeight - 7)}px`
        : `${rect.bottom + 7}px`;
      menu.style.maxHeight = openUpward
        ? `${Math.min(280, Math.max(120, rect.top - 19))}px`
        : `${Math.min(280, Math.max(120, availableBelow))}px`;
    }
    menu.hidden = false;
    control.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    window.setTimeout(() => {
      menu
        .querySelector('[aria-selected="true"]')
        ?.focus({ preventScroll: true });
    }, 0);
  }

  function selectCustomOption(optionButton) {
    const control = document.querySelector(
      `[data-custom-select-id="${optionButton.closest(".custom-select-menu")?.dataset.customSelectFor}"]`
    );
    const select = control?.querySelector(":scope > select");
    if (!control || !select) {
      return;
    }
    select.value = optionButton.dataset.customSelectValue;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    syncCustomSelect(control);
    closeCustomSelects();
    control
      .querySelector(".custom-select-trigger")
      ?.focus({ preventScroll: true });
  }

  function parseDatePickerValue(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
      return null;
    }
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function syncDatePicker() {
    const input = document.getElementById("resource-date");
    const trigger = document.querySelector(".date-picker-trigger");
    const label = trigger?.querySelector("[data-date-picker-label]");
    if (!input || !label) {
      return;
    }
    const date = parseDatePickerValue(input.value);
    label.textContent = date
      ? `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`
      : "选择日期";
  }

  function renderDatePicker() {
    const panel = document.getElementById("resource-date-panel");
    const input = document.getElementById("resource-date");
    if (!panel || !input) {
      return;
    }
    const year = datePickerCursor.getFullYear();
    const month = datePickerCursor.getMonth();
    const todayValue = toDateInputValue(Date.now());
    const selectedValue = input.value;
    const firstDay = new Date(year, month, 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - mondayOffset);
    const days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const value = toDateInputValue(date.getTime());
      const classes = [
        "date-picker-day",
        date.getMonth() !== month ? "is-outside" : "",
        value === todayValue ? "is-today" : "",
        value === selectedValue ? "is-selected" : ""
      ]
        .filter(Boolean)
        .join(" ");
      return `
        <button
          class="${classes}"
          type="button"
          data-date-picker-day="${value}"
          aria-label="${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日"
          aria-pressed="${value === selectedValue}"
        >${date.getDate()}</button>
      `;
    }).join("");

    panel.innerHTML = `
      <div class="date-picker-head">
        <button class="icon-button" type="button" data-action="date-picker-prev" aria-label="上个月">${icon("chevron-right", "icon date-picker-prev-icon")}</button>
        <strong>${year} 年 ${month + 1} 月</strong>
        <button class="icon-button" type="button" data-action="date-picker-next" aria-label="下个月">${icon("chevron-right")}</button>
      </div>
      <div class="date-picker-weekdays">
        ${["一", "二", "三", "四", "五", "六", "日"].map((day) => `<span>${day}</span>`).join("")}
      </div>
      <div class="date-picker-grid">${days}</div>
      <div class="date-picker-foot">
        <button class="button button--quiet" type="button" data-action="date-picker-clear">清除</button>
        <button class="button button--ghost" type="button" data-action="date-picker-today">今天</button>
      </div>
    `;
  }

  function closeDatePicker({ restoreFocus = false } = {}) {
    const trigger = document.querySelector(".date-picker-trigger");
    const panel = document.getElementById("resource-date-panel");
    const control = document.querySelector(".date-picker");
    control?.classList.remove("is-open");
    trigger?.setAttribute("aria-expanded", "false");
    if (panel) {
      panel.hidden = true;
    }
    if (restoreFocus) {
      trigger?.focus({ preventScroll: true });
    }
  }

  function openDatePicker(trigger) {
    const panel = document.getElementById("resource-date-panel");
    const input = document.getElementById("resource-date");
    if (!panel || !input) {
      return;
    }
    closeCustomSelects();
    closeDatePicker();
    const selectedDate = parseDatePickerValue(input.value);
    datePickerCursor = selectedDate ? new Date(selectedDate) : new Date();
    renderDatePicker();
    const dialog = trigger.closest("dialog");
    const panelHost = dialog || document.body;
    if (panel.parentElement !== panelHost) {
      panelHost.appendChild(panel);
    }
    const rect = trigger.getBoundingClientRect();
    const panelWidth = 304;
    const panelHeight = 360;
    const viewportAvailableBelow = Math.max(
      0,
      window.innerHeight - rect.bottom - 12
    );
    const openUpward =
      viewportAvailableBelow < 160 && rect.top > panelHeight + 20;
    panel.style.width = `${panelWidth}px`;
    if (dialog) {
      const dialogRect = dialog.getBoundingClientRect();
      panel.style.position = "absolute";
      panel.style.left = `${rect.left - dialogRect.left}px`;
      panel.style.top = openUpward
        ? `${rect.top - dialogRect.top - panelHeight - 7}px`
        : `${rect.bottom - dialogRect.top + 7}px`;
    } else {
      panel.style.position = "fixed";
      panel.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12))}px`;
      panel.style.top = openUpward
        ? `${Math.max(12, rect.top - panelHeight - 7)}px`
        : `${rect.bottom + 7}px`;
    }
    panel.style.maxHeight = openUpward
      ? `${Math.min(panelHeight, Math.max(180, rect.top - 19))}px`
      : `${Math.min(panelHeight, Math.max(160, viewportAvailableBelow))}px`;
    panel.hidden = false;
    trigger.closest(".date-picker")?.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    window.setTimeout(
      () =>
        panel
          .querySelector(".date-picker-day.is-selected, .date-picker-day.is-today")
          ?.focus({ preventScroll: true }),
      0
    );
  }

  function setDatePickerValue(value) {
    const input = document.getElementById("resource-date");
    if (!input) {
      return;
    }
    input.value = value;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    syncDatePicker();
    closeDatePicker({ restoreFocus: true });
  }

  function highlightText(value, query) {
    const text = String(value ?? "");
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return escapeHTML(text);
    }

    const index = text.toLocaleLowerCase("zh-CN").indexOf(cleanQuery.toLocaleLowerCase("zh-CN"));
    if (index < 0) {
      return escapeHTML(text);
    }

    return (
      escapeHTML(text.slice(0, index)) +
      `<mark>${escapeHTML(text.slice(index, index + cleanQuery.length))}</mark>` +
      escapeHTML(text.slice(index + cleanQuery.length))
    );
  }

  function safeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : DEFAULT_COLOR;
  }

  function shortcutKeyTokenFromEvent(event) {
    const keyMatch = /^Key([A-Z])$/.exec(event.code || "");
    if (keyMatch) {
      return keyMatch[1];
    }
    const digitMatch = /^(?:Digit|Numpad)([0-9])$/.exec(event.code || "");
    if (digitMatch) {
      return digitMatch[1];
    }
    if (SHORTCUT_KEY_TOKENS.has(event.code)) {
      return event.code;
    }
    if (/^F(?:[1-9]|1[0-2])$/.test(event.key)) {
      return event.key;
    }
    const punctuation = {
      ",": "Comma",
      ".": "Period",
      "/": "Slash",
      ";": "Semicolon",
      "'": "Quote",
      "[": "BracketLeft",
      "]": "BracketRight",
      "\\": "Backslash",
      "-": "Minus",
      "=": "Equal",
      " ": "Space",
      Enter: "Enter",
      Tab: "Tab"
    };
    return punctuation[event.key] || "";
  }

  function shortcutFromEvent(event) {
    const key = shortcutKeyTokenFromEvent(event);
    if (!key) {
      return "";
    }
    const parts = [];
    if (event.ctrlKey || event.metaKey) {
      parts.push("Ctrl");
    }
    if (event.altKey) {
      parts.push("Alt");
    }
    if (event.shiftKey) {
      parts.push("Shift");
    }
    parts.push(key);
    return parts.join("+");
  }

  function formatShortcutDisplay(shortcut, separator = " + ") {
    if (!shortcut) {
      return "未设置";
    }
    const labels = {
      Comma: ",",
      Period: ".",
      Slash: "/",
      Semicolon: ";",
      Quote: "'",
      BracketLeft: "[",
      BracketRight: "]",
      Backslash: "\\",
      Minus: "-",
      Equal: "=",
      Space: "Space"
    };
    return shortcut
      .split("+")
      .map((part) => labels[part] || part)
      .join(separator);
  }

  function shortcutMatches(event, action) {
    const configured = state.shortcuts[action];
    return Boolean(configured && !event.repeat && shortcutFromEvent(event) === configured);
  }

  function shortcutUsesModifier(shortcut) {
    return /(?:^|\+)(?:Ctrl|Alt|Shift)\+/.test(shortcut || "");
  }

  function syncShortcutHints() {
    const searchHint = document.getElementById("search-shortcut");
    if (searchHint) {
      searchHint.textContent = formatShortcutDisplay(state.shortcuts.search, " ");
      searchHint.hidden = !state.shortcuts.search;
    }
    const addHint = document.getElementById("add-resource-shortcut");
    if (addHint) {
      addHint.textContent = formatShortcutDisplay(state.shortcuts["new-resource"], " ");
      addHint.hidden = !state.shortcuts["new-resource"];
    }
  }

  function finishShortcutRecording(actionId) {
    shortcutRecordingAction = null;
    renderContent({ animate: false, preserveScroll: true });
    if (actionId) {
      window.setTimeout(() => {
        document
          .querySelector('[data-shortcut-action="' + actionId + '"]')
          ?.focus({ preventScroll: true });
      }, 0);
    }
  }

  function startShortcutRecording(actionId) {
    if (!SHORTCUT_DEFINITIONS.some((shortcut) => shortcut.id === actionId)) {
      return;
    }
    shortcutRecordingAction = actionId;
    document.querySelectorAll("[data-shortcut-action]").forEach((button) => {
      const active = button.dataset.shortcutAction === actionId;
      button.classList.toggle("is-recording", active);
      const value = button.querySelector("[data-shortcut-value]");
      if (active && value) {
        value.textContent = "请按组合键…";
      }
    });
    const status = document.getElementById("shortcut-recording-status");
    if (status) {
      status.textContent = "正在录制。按 Esc 取消，按 Backspace 清除当前快捷键。";
    }
  }

  function handleShortcutRecording(event) {
    if (!shortcutRecordingAction) {
      return false;
    }
    event.preventDefault();

    if (event.key === "Escape") {
      finishShortcutRecording(shortcutRecordingAction);
      return true;
    }
    if (event.repeat) {
      return true;
    }
    if (
      ["Backspace", "Delete"].includes(event.key) &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      state.shortcuts[shortcutRecordingAction] = "";
      saveShortcutPreferences();
      syncShortcutHints();
      finishShortcutRecording(shortcutRecordingAction);
      showToast("快捷键已清除");
      return true;
    }

    const candidate = shortcutFromEvent(event);
    if (!candidate) {
      if (!["Control", "Alt", "Shift", "Meta"].includes(event.key)) {
        showToast("请使用字母、数字、功能键或标点键", true);
      }
      return true;
    }
    if (
      !shortcutUsesModifier(candidate) &&
      ["Enter", "Tab", "Space"].includes(candidate)
    ) {
      showToast("这个按键会与界面操作冲突，请搭配 Ctrl 或 Alt", true);
      return true;
    }
    if (RESERVED_SHORTCUTS.has(candidate)) {
      showToast("这个组合键由系统或浏览器保留，请换一个", true);
      return true;
    }
    const conflict = SHORTCUT_DEFINITIONS.find(
      (shortcut) =>
        shortcut.id !== shortcutRecordingAction &&
        state.shortcuts[shortcut.id] === candidate
    );
    if (conflict) {
      showToast(`与「${conflict.label}」冲突，请换一个组合键`, true);
      return true;
    }

    state.shortcuts[shortcutRecordingAction] = candidate;
    saveShortcutPreferences();
    syncShortcutHints();
    finishShortcutRecording(shortcutRecordingAction);
    showToast(`快捷键已设置为 ${formatShortcutDisplay(candidate)}`);
    return true;
  }

  function toggleStartupDropdown(trigger) {
    const control = trigger.closest("[data-settings-dropdown]");
    if (!control) {
      return;
    }
    const menu = control.querySelector(".settings-dropdown-menu");
    const shouldOpen = Boolean(menu?.hidden);
    closeStartupDropdown();
    if (shouldOpen && menu) {
      menu.hidden = false;
      control.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      window.setTimeout(
        () =>
          menu
            .querySelector('[aria-selected="true"]')
            ?.focus({ preventScroll: true }),
        0
      );
    }
  }

  function closeStartupDropdown({ restoreFocus = false } = {}) {
    const control = document.querySelector("[data-settings-dropdown].is-open");
    if (!control) {
      return;
    }
    const trigger = control.querySelector(".settings-dropdown-trigger");
    const menu = control.querySelector(".settings-dropdown-menu");
    control.classList.remove("is-open");
    trigger?.setAttribute("aria-expanded", "false");
    if (menu) {
      menu.hidden = true;
    }
    if (restoreFocus) {
      trigger?.focus({ preventScroll: true });
    }
  }

  function selectStartupView(value) {
    const option = STARTUP_VIEW_OPTIONS.find((item) => item.value === value);
    if (!option) {
      return;
    }
    state.startupView = option.value;
    localStorage.setItem("shiji.startupView", option.value);
    const control = document.querySelector("[data-settings-dropdown]");
    const label = control?.querySelector("[data-startup-view-label]");
    if (label) {
      label.textContent = option.label;
    }
    control?.querySelectorAll("[data-startup-view-value]").forEach((button) => {
      button.setAttribute(
        "aria-selected",
        String(button.dataset.startupViewValue === option.value)
      );
    });
    closeStartupDropdown({ restoreFocus: true });
    showToast("启动页面设置已保存");
  }

  function openImagePreview(button) {
    const dialog = document.getElementById("image-preview-dialog");
    const image = document.getElementById("image-preview-image");
    const caption = document.getElementById("image-preview-caption");
    if (!dialog || !image) {
      return;
    }
    image.src = button.dataset.imageSrc || "";
    image.alt = button.dataset.imageAlt || "";
    if (caption) {
      caption.textContent = button.dataset.imageCaption || "";
    }
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  function categoryById(id) {
    return state.categories.find((category) => category.id === id) || null;
  }

  function libraryById(id) {
    return state.libraries.find((library) => library.id === id) || null;
  }

  function libraryZoneId(libraryId) {
    return `custom:${libraryId}`;
  }

  function libraryForZone(zone) {
    if (typeof zone !== "string" || !zone.startsWith("custom:")) {
      return null;
    }
    return libraryById(zone.slice("custom:".length));
  }

  function libraryAllowedTypes(library) {
    return library?.types?.length ? library.types : LIBRARY_TYPE_CHOICES;
  }

  function resourceById(id) {
    return state.resources.find((resource) => resource.id === id) || null;
  }

  function resourceTone(resource) {
    if (resource.zone === "minecraft") {
      return minecraftCategoryById(resource.minecraftType).color || "#557d68";
    }
    const library = libraryForZone(resource.zone);
    if (library) {
      return library.color;
    }
    return categoryById(resource.categoryId)?.color || TYPE_META[resource.type]?.color || DEFAULT_COLOR;
  }

  function minecraftMeta(resource) {
    return minecraftCategoryById(resource.minecraftType);
  }

  function minecraftCategoryById(id) {
    return (
      state.minecraftCategories.find((category) => category.id === id) ||
      minecraftCategoryFallback()
    );
  }

  function accountCategoryMeta(category) {
    return (
      state.accountCategories.find((item) => item.id === category) ||
      accountCategoryFallback()
    );
  }

  function faviconUrlForWebsite(website) {
    try {
      const parsed = new URL(normalizeUrl(website));
      if (!/^https?:$/.test(parsed.protocol)) {
        return "";
      }
      return `${parsed.origin}/favicon.ico`;
    } catch {
      return "";
    }
  }

  function faviconFallbackUrlForWebsite(website) {
    try {
      const parsed = new URL(normalizeUrl(website));
      return /^https?:$/.test(parsed.protocol)
        ? `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(parsed.hostname)}`
        : "";
    } catch {
      return "";
    }
  }

  function sanitizeIconUrl(value) {
    try {
      const raw = String(value || "");
      if (/^data:image\/(?:png|jpeg|webp|gif|svg\+xml);base64,/i.test(raw)) {
        return raw;
      }
      const parsed = new URL(raw);
      return /^https?:$/.test(parsed.protocol) ? parsed.toString() : "";
    } catch {
      return "";
    }
  }

  function accountInitial(account) {
    return (account.platform || "?").trim().charAt(0) || "?";
  }

  function renderAccountAvatar(account) {
    const iconUrl = sanitizeIconUrl(account.iconUrl);
    const builtinIcon = ACCOUNT_ICON_CHOICES.has(account.iconBuiltin)
      ? account.iconBuiltin
      : "";
    const fallbackIconUrl = faviconFallbackUrlForWebsite(account.website);
    return `
      <div class="account-avatar${iconUrl || builtinIcon ? " has-icon" : ""}" aria-hidden="true">
        ${iconUrl ? `<img class="account-favicon" src="${escapeHTML(iconUrl)}" data-fallback="${escapeHTML(fallbackIconUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ""}
        ${builtinIcon ? `<svg class="account-builtin-icon"><use href="#icon-${builtinIcon}"></use></svg>` : ""}
        <span class="account-avatar-fallback">${escapeHTML(accountInitial(account))}</span>
      </div>
    `;
  }

  function updateAccountIconPreview(website, fetchedIconUrl = "") {
    const feedback = document.getElementById("account-icon-feedback");
    const image = document.getElementById("account-icon-preview-image");
    const glyph = document.getElementById("account-icon-preview-glyph");
    const fallback = document.getElementById("account-icon-preview-fallback");
    const status = document.getElementById("account-icon-status");
    const iconInput = document.getElementById("account-icon-url");
    const builtinInput = document.getElementById("account-icon-builtin");
    const modeInput = document.getElementById("account-icon-mode");
    const autoEnabled = document.getElementById("account-icon-auto").checked;
    const platform = document.getElementById("account-platform").value.trim();
    const currentMode = modeInput.value;
    const iconUrl =
      sanitizeIconUrl(fetchedIconUrl) || faviconUrlForWebsite(website);
    document.querySelectorAll("[data-account-icon-choice]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        currentMode === "builtin" &&
          button.dataset.accountIconChoice === builtinInput.value
      );
    });

    if (!autoEnabled || currentMode === "custom" || currentMode === "builtin") {
      if (currentMode === "custom" && iconInput.value) {
        image.src = iconInput.value;
        image.dataset.fallback = "";
        image.hidden = false;
        glyph.hidden = true;
        fallback.hidden = true;
        status.textContent = "使用自定义上传图标";
      } else if (currentMode === "builtin" && builtinInput.value) {
        image.hidden = true;
        glyph.hidden = false;
        glyph.querySelector("use").setAttribute("href", `#icon-${builtinInput.value}`);
        fallback.hidden = true;
        status.textContent = "使用软件内置图标";
      } else {
        image.hidden = true;
        glyph.hidden = true;
        fallback.hidden = false;
        fallback.textContent = platform.charAt(0) || "站";
        status.textContent = "未设置图标，将显示平台首字";
      }
      return;
    }

    modeInput.value = "auto";
    builtinInput.value = "";
    if (!iconUrl) {
      iconInput.value = "";
      image.hidden = true;
      glyph.hidden = true;
      fallback.hidden = false;
      fallback.textContent = platform.charAt(0) || "站";
      status.textContent = website
        ? "未获取到网站图标，可上传或选择内置图标"
        : "输入网址后自动获取网站图标";
      return;
    }

    iconInput.value = iconUrl;
    image.src = iconUrl;
    image.dataset.fallback = faviconFallbackUrlForWebsite(website);
    image.hidden = false;
    glyph.hidden = true;
    fallback.hidden = true;
    fallback.textContent = platform.charAt(0) || "站";
    status.textContent = "已自动获取网站图标";
  }

  function chooseBuiltinAccountIcon(iconName) {
    if (!ACCOUNT_ICON_CHOICES.has(iconName)) {
      return;
    }
    document.getElementById("account-icon-auto").checked = false;
    document.getElementById("account-icon-mode").value = "builtin";
    document.getElementById("account-icon-url").value = "";
    document.getElementById("account-icon-builtin").value = iconName;
    document.querySelectorAll("[data-account-icon-choice]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.accountIconChoice === iconName
      );
    });
    updateAccountIconPreview(document.getElementById("account-website").value, "");
  }

  function clearAccountIcon() {
    document.getElementById("account-icon-auto").checked = false;
    document.getElementById("account-icon-mode").value = "none";
    document.getElementById("account-icon-url").value = "";
    document.getElementById("account-icon-builtin").value = "";
    document.querySelectorAll("[data-account-icon-choice]").forEach((button) => {
      button.classList.remove("is-active");
    });
    updateAccountIconPreview(document.getElementById("account-website").value, "");
  }

  function loadCustomAccountIcon(file) {
    if (!file) {
      return;
    }
    if (file.size > 512 * 1024 || !file.type.startsWith("image/")) {
      showToast("图标需为 512 KB 以内的图片", true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = sanitizeIconUrl(reader.result);
      if (!dataUrl) {
        showToast("无法读取这个图标文件", true);
        return;
      }
      document.getElementById("account-icon-auto").checked = false;
      document.getElementById("account-icon-mode").value = "custom";
      document.getElementById("account-icon-url").value = dataUrl;
      document.getElementById("account-icon-builtin").value = "";
      document.querySelectorAll("[data-account-icon-choice]").forEach((button) => {
        button.classList.remove("is-active");
      });
      updateAccountIconPreview(
        document.getElementById("account-website").value,
        ""
      );
      document.getElementById("account-icon-status").textContent =
        "使用自定义上传图标";
    };
    reader.readAsDataURL(file);
  }

  function accountById(id) {
    return state.vaultAccounts.find((account) => account.id === id) || null;
  }

  function maskPassword(password) {
    return "•".repeat(Math.min(18, Math.max(8, String(password || "").length)));
  }

  function normalizeUrl(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      return "";
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) {
      return "";
    }

    return `https://${trimmed}`;
  }

  function isSafeStoredUrl(value) {
    return /^https?:\/\//i.test(String(value || ""));
  }

  function parseTags(value) {
    return Array.from(
      new Set(
        String(value || "")
          .split(/[,，]/)
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 12)
      )
    );
  }

  function formatRelativeTime(timestamp) {
    if (!timestamp) {
      return "尚未打开";
    }

    const value = Number(timestamp);
    const now = Date.now();
    const difference = Math.max(0, now - value);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (difference < minute) {
      return "刚刚";
    }
    if (difference < hour) {
      return `${Math.floor(difference / minute)} 分钟前`;
    }
    if (difference < day) {
      return `${Math.floor(difference / hour)} 小时前`;
    }
    if (difference < 2 * day) {
      return "昨天";
    }
    if (difference < 7 * day) {
      return `${Math.floor(difference / day)} 天前`;
    }

    const date = new Date(value);
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return sameYear
      ? `${date.getMonth() + 1} 月 ${date.getDate()} 日`
      : `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
  }

  function formatDate(timestamp) {
    if (!timestamp) {
      return "未知";
    }

    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(new Date(timestamp));
  }

  function toDateInputValue(timestamp) {
    const date = new Date(timestamp || Date.now());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function fromDateInputValue(value) {
    if (!value) {
      return Date.now();
    }

    const parsed = new Date(`${value}T12:00:00`).getTime();
    return Number.isFinite(parsed) ? parsed : Date.now();
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) {
      return `${value} B`;
    }
    if (value < 1024 * 1024) {
      return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
    }
    if (value < 1024 * 1024 * 1024) {
      return `${(value / (1024 * 1024)).toFixed(value < 10 * 1024 * 1024 ? 1 : 0)} MB`;
    }
    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  function showToast(message, isError = false) {
    window.clearTimeout(toastTimer);
    elements.toastText.textContent = message;
    elements.toast.querySelector("use").setAttribute("href", isError ? "#icon-info" : "#icon-check");
    elements.toast.classList.add("is-visible");

    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2600);
  }

  function triggerEasterEgg(message) {
    document.querySelector(".easter-confetti")?.remove();
    const layer = document.createElement("div");
    layer.className = "easter-confetti";
    const symbols = ["✦", "✧", "◆", "●", "★"];
    const colors = ["#d7b369", "#7fa68c", "#e6a0af", "#7f9fc4", "#f2e8ca"];
    layer.innerHTML = Array.from({ length: 38 }, (_, index) => {
      const symbol = symbols[index % symbols.length];
      const left = 4 + ((index * 27) % 92);
      const delay = ((index * 73) % 900) / 1000;
      const duration = 1.7 + ((index * 29) % 900) / 1000;
      const drift = ((index * 41) % 220) - 110;
      const color = colors[index % colors.length];
      return `<span style="--x:${left}%;--delay:${delay}s;--duration:${duration}s;--drift:${drift}px;--confetti-color:${color}">${symbol}</span>`;
    }).join("");
    document.body.appendChild(layer);
    document.documentElement.classList.add("easter-glow");
    showToast(message);
    window.setTimeout(() => {
      layer.remove();
      document.documentElement.classList.remove("easter-glow");
    }, 3000);
  }

  function markWelcomeSeen() {
    localStorage.setItem("shiji.welcomeSeen", "1");
  }

  function updateAuthorLevelWidget(now = new Date()) {
    const birthYear = 2006;
    const birthMonth = 4;
    const birthDay = 24;
    let currentBirthday = new Date(
      now.getFullYear(),
      birthMonth,
      birthDay
    );
    if (now < currentBirthday) {
      currentBirthday = new Date(
        now.getFullYear() - 1,
        birthMonth,
        birthDay
      );
    }
    const nextBirthday = new Date(
      currentBirthday.getFullYear() + 1,
      birthMonth,
      birthDay
    );
    const age = currentBirthday.getFullYear() - birthYear;
    const total = Math.max(1, nextBirthday.getTime() - currentBirthday.getTime());
    const elapsed = Math.max(0, now.getTime() - currentBirthday.getTime());
    const progress = Math.min(1, elapsed / total);
    const percent = Math.round(progress * 100);
    const remainingDays = Math.max(
      0,
      Math.ceil((nextBirthday.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    );
    const level = document.getElementById("author-level");
    const fill = document.getElementById("author-xp-fill");
    const track = document.getElementById("author-xp-track");
    const percentElement = document.getElementById("author-level-percent");
    if (level) {
      level.textContent = String(age);
    }
    if (fill) {
      fill.style.width = `${Math.max(2, percent)}%`;
    }
    if (track) {
      track.setAttribute("aria-valuenow", String(percent));
      track.setAttribute(
        "aria-valuetext",
        `当前 ${age} 岁，距离 ${age + 1} 岁还有 ${remainingDays} 天`
      );
    }
    if (percentElement) {
      percentElement.textContent = `${percent}%`;
    }
  }

  function openAuthorProfile() {
    updateAuthorLevelWidget();
    const dialog = document.getElementById("author-dialog");
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  const RELEASE_HISTORY = [
    {
      version: "1.1.0",
      codename: "文件索引",
      status: "第二测试版",
      date: "2026.11.07",
      summary:
        "重新聚焦本地文件索引，让索引、路径搜索和原文件定位成为软件的主要入口。",
      changes: [
        ["增加", "自定义专区、全部资源专区筛选、快捷键、系统托盘、图片预览和多级返回。"],
        ["优化", "文件路径展示、宽屏布局、表格字号、搜索响应和表单控件。"],
        ["改动", "侧栏按资料库、专区、账号和分类分组，详情默认窗口式。"],
        ["删除", "侧栏重复的文件索引入口、原生下拉框和多余作者信息。"]
      ],
      image: "./assets/release/1.1.0-table.png",
      imageAlt: "文件索引与表格视图",
      caption: "文件路径索引与高清表格视图"
    },
    {
      version: "1.0.1",
      codename: "性能优化",
      status: "第一测试版更新",
      date: "2026.11.06",
      summary:
        "保持原有功能，集中改善搜索、统计、宽屏布局和桌面启动体验。",
      changes: [
        ["优化", "搜索使用防抖局部刷新，统计和筛选改为单次遍历。"],
        ["改动", "资源网格自动铺满宽屏，长列表减少离屏绘制。"]
      ],
      image: "./assets/release/1.0.0-settings.png",
      imageAlt: "设置与偏好",
      caption: "设置、偏好与本地数据管理"
    },
    {
      version: "1.0.0",
      codename: "首个测试版",
      status: "首个完整里程碑",
      date: "2026.11.06",
      summary:
        "完成资源、文件索引、账号、Minecraft、分类、搜索和完整备份的首个可用闭环。",
      changes: [
        ["增加", "链接、文件、笔记、账号保险箱、Minecraft 专区和多种排版。"],
        ["改动", "所有数据默认保存在本机，并支持完整 JSON 备份与恢复。"]
      ],
      image: "./assets/release/1.0.0-desktop.png",
      imageAlt: "首个测试版界面",
      caption: "首个测试版的资源库主界面"
    }
  ];

  function renderReleaseTimeline() {
    return `
      <div class="release-timeline-intro">
        <p class="eyebrow">VERSION TIMELINE</p>
        <h2>版本记录</h2>
        <p>命名规则：<code>v主版本.次版本.修订号 · 版本主题</code>。以下按时间从新到旧排列。</p>
      </div>
      <div class="release-timeline">
        ${RELEASE_HISTORY.map(
          (entry, index) => `
            <article class="release-timeline-entry${index === 0 ? " is-current" : ""}">
              <div class="release-timeline-marker">
                <span>v${entry.version}</span>
                <i aria-hidden="true"></i>
              </div>
              <div class="release-timeline-content">
                <header class="release-timeline-head">
                  <div>
                    <p class="eyebrow">${entry.status}</p>
                    <h3>${entry.codename}</h3>
                  </div>
                  <time>${entry.date}</time>
                </header>
                <p>${entry.summary}</p>
                <ul class="release-timeline-changes">
                  ${entry.changes
                    .map(
                      ([kind, text]) =>
                        `<li><strong>${kind}</strong><span>${text}</span></li>`
                    )
                    .join("")}
                </ul>
                <figure class="release-timeline-figure">
                  <button type="button" data-action="open-image-preview" data-image-src="${entry.image}" data-image-alt="${entry.imageAlt}" data-image-caption="${entry.caption}">
                    <img src="${entry.image}" alt="${entry.imageAlt}" loading="lazy" />
                    <span>点击放大</span>
                  </button>
                  <figcaption>${entry.caption}</figcaption>
                </figure>
              </div>
            </article>
          `
        ).join("")}
      </div>
      <div class="release-footer-note">
        <strong>拾集 · 第二测试版 1.1.0</strong>
        <span>作者：YinL. · QQ：3551522664 · 邮箱：Threebooks@163.com</span>
      </div>
    `;
  }

  function openReleaseNotes(returnToAuthor = false) {
    releaseNotesReturnToAuthor = Boolean(returnToAuthor);
    const back = document.getElementById("release-notes-back");
    if (back) {
      back.hidden = !releaseNotesReturnToAuthor;
    }
    const dialog = document.getElementById("release-notes-dialog");
    dialog.querySelector(".release-notes-body").innerHTML =
      renderReleaseTimeline();
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  const TUTORIAL_STEPS = [
    {
      icon: "plus",
      title: "添加第一条资源",
      body: "点击“添加资源”，先填写名称，再选择链接、文件或笔记。链接适合网页，文件适合工具和 Minecraft 内容，笔记适合记录短文本。"
    },
    {
      icon: "layers",
      title: "选择分类和标签",
      body: "分类用于建立大方向，标签用于补充检索关键词。标题、正文、标签和本地文件路径都会参与搜索。"
    },
    {
      icon: "search",
      title: "快速找到内容",
      body: "使用顶部搜索框或设置中的搜索快捷键。左侧导航和分类可以拖动，也可以点击“排序”直接选择位置。"
    },
    {
      icon: "key",
      title: "账号与本地文件",
      body: "账号保险箱可直接保存平台账号和网站图标。电脑版文件资源只记录原文件路径，详情页可以打开文件或在文件夹中定位。"
    }
  ];

  function renderTutorialDialog() {
    const step = TUTORIAL_STEPS[tutorialStepIndex];
    document.getElementById("tutorial-step-count").textContent =
      `${tutorialStepIndex + 1} / ${TUTORIAL_STEPS.length}`;
    document.getElementById("tutorial-progress-bar").style.width =
      `${((tutorialStepIndex + 1) / TUTORIAL_STEPS.length) * 100}%`;
    document.getElementById("tutorial-dialog-step").innerHTML = `
      ${
        tutorialStepIndex === 0
          ? `<button class="tutorial-dialog-icon" type="button" data-action="tutorial-add-resource" aria-label="打开添加资源界面">${icon(step.icon)}</button>`
          : `<span class="tutorial-dialog-icon">${icon(step.icon)}</span>`
      }
      <span class="tutorial-dialog-index">${String(tutorialStepIndex + 1).padStart(2, "0")}</span>
      <h3>${step.title}</h3>
      <p>${step.body}</p>
      ${
        tutorialStepIndex === 0
          ? `<button class="button button--primary tutorial-action-button" type="button" data-action="tutorial-add-resource">${icon("plus")}<span>添加第一条资源</span></button>`
          : ""
      }
    `;
    document.getElementById("tutorial-prev").disabled = tutorialStepIndex === 0;
    document.getElementById("tutorial-next").textContent =
      tutorialStepIndex === TUTORIAL_STEPS.length - 1 ? "完成" : "下一步";
  }

  function openTutorialDialog() {
    tutorialStepIndex = 0;
    renderTutorialDialog();
    const dialog = document.getElementById("tutorial-dialog");
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  function showWelcomeIfNeeded() {
    if (localStorage.getItem("shiji.welcomeSeen") === "1") {
      return;
    }
    window.setTimeout(() => {
      if (!elements.welcomeDialog.open && !document.querySelector("dialog[open]")) {
        elements.welcomeDialog.showModal();
      }
    }, 450);
  }

  function setTheme(theme) {
    const preference =
      theme === "system" ? "system" : theme === "dark" ? "dark" : "light";
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const nextTheme =
      preference === "system"
        ? systemPrefersDark
          ? "dark"
          : "light"
        : preference;
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.dataset.themePreference = preference;
    localStorage.setItem("shiji.theme", preference);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", nextTheme === "dark" ? "#171a17" : "#f6f5f1");
  }

  function initTheme() {
    const storedTheme = localStorage.getItem("shiji.theme");
    setTheme(["light", "dark", "system"].includes(storedTheme) ? storedTheme : "system");
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (document.documentElement.dataset.themePreference === "system") {
        setTheme("system");
      }
    };
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handler);
    } else {
      query.addListener(handler);
    }
  }

  function applyPersonalization() {
    document.documentElement.dataset.detailMode =
      state.detailMode === "drawer" ? "drawer" : "window";
    document.documentElement.dataset.sidebarScale =
      state.sidebarScale === "standard" ? "standard" : "large";
    document.documentElement.dataset.fontScale = state.fontScale;
    document.documentElement.dataset.palette = state.palette;
    const zoomFactor = FONT_SCALE_VALUES[state.fontScale] || 1;
    if (window.ShijiDesktop?.setZoomFactor) {
      window.ShijiDesktop.setZoomFactor(zoomFactor).catch((error) => {
        console.warn("Unable to apply interface zoom:", error);
      });
    } else {
      document.body.style.zoom = String(zoomFactor);
    }
  }

  function initLayout() {
    const storedLayout =
      localStorage.getItem("shiji.layout.desktop") ||
      localStorage.getItem("shiji.layout");
    state.layout = LAYOUT_META[storedLayout] ? storedLayout : "grid";
  }

  function normalizeCategorySet(value, defaults) {
    const source = Array.isArray(value) ? value : defaults;
    const seen = new Set();
    const categories = source
      .map((item) => {
        const id = String(item?.id || "").trim().slice(0, 80);
        const label = String(item?.label || "").trim().slice(0, 20);
        if (!id || !label || seen.has(id)) {
          return null;
        }
        seen.add(id);
        return {
          id,
          label,
          color: safeColor(item?.color),
          icon: Object.values(MINECRAFT_META).some(
            (meta) => meta.icon === item?.icon
          )
            ? item.icon
            : "cube"
        };
      })
      .filter(Boolean);
    return categories.length ? categories : defaults.map((item) => ({ ...item }));
  }

  function loadCategoryPreferences() {
    let accountCategories = null;
    let minecraftCategories = null;
    try {
      accountCategories = JSON.parse(
        localStorage.getItem("shiji.accountCategories") || "null"
      );
      minecraftCategories = JSON.parse(
        localStorage.getItem("shiji.minecraftCategories") || "null"
      );
    } catch {
      // Invalid category preferences fall back to defaults.
    }
    state.accountCategories = normalizeCategorySet(
      accountCategories,
      DEFAULT_ACCOUNT_CATEGORIES
    );
    state.minecraftCategories = normalizeCategorySet(
      minecraftCategories,
      DEFAULT_MINECRAFT_CATEGORIES
    );
  }

  function saveCategoryPreferences() {
    localStorage.setItem(
      "shiji.accountCategories",
      JSON.stringify(state.accountCategories)
    );
    localStorage.setItem(
      "shiji.minecraftCategories",
      JSON.stringify(state.minecraftCategories)
    );
  }

  function accountCategoryFallback() {
    return (
      state.accountCategories.find((category) => category.id === "other") ||
      state.accountCategories[0]
    );
  }

  function minecraftCategoryFallback() {
    return (
      state.minecraftCategories.find((category) => category.id === "map") ||
      state.minecraftCategories[0]
    );
  }

  function normalizeNavOrder(value) {
    const candidates = Array.isArray(value) ? value : [];
    const unique = [];

    candidates.forEach((view) => {
      if (NAV_VIEWS.includes(view) && !unique.includes(view)) {
        unique.push(view);
      }
    });

    return [...unique, ...NAV_VIEWS.filter((view) => !unique.includes(view))];
  }

  function applyNavigationOrder() {
    const container = document.getElementById("library-nav-items");
    if (!container) {
      return;
    }

    const buttons = new Map(
      [...container.querySelectorAll(".nav-item[data-view]")].map((button) => [
        button.dataset.view,
        button
      ])
    );
    state.navOrder = normalizeNavOrder(state.navOrder);

    state.navOrder.forEach((view) => {
      const button = buttons.get(view);
      if (button) {
        container.appendChild(button);
      }
    });
  }

  function initNavigationOrder() {
    try {
      state.navOrder = normalizeNavOrder(
        JSON.parse(localStorage.getItem(NAV_ORDER_KEY) || "[]")
      );
    } catch {
      state.navOrder = NAV_VIEWS.slice();
    }
    applyNavigationOrder();
  }

  function getSortableContext(element) {
    const categoryButton = element?.closest?.(
      "#category-nav-list .category-nav-item[data-category-filter]"
    );
    if (categoryButton) {
      return {
        kind: "category",
        element: categoryButton,
        container: document.getElementById("category-nav-list"),
        selector: ".category-nav-item[data-category-filter]",
        id: categoryButton.dataset.categoryFilter
      };
    }

    const navButton = element?.closest?.(
      "#library-nav-items .nav-item[data-view]"
    );
    if (navButton) {
      return {
        kind: "nav",
        element: navButton,
        container: document.getElementById("library-nav-items"),
        selector: ".nav-item[data-view]",
        id: navButton.dataset.view
      };
    }

    return null;
  }

  function readSortableOrder(container, selector) {
    return [...container.querySelectorAll(selector)].map((item) =>
      item.dataset.categoryFilter || item.dataset.view
    );
  }

  function getDragAfterElement(container, y, selector) {
    const elements = [
      ...container.querySelectorAll(`${selector}:not(.is-dragging)`)
    ];

    return elements.reduce(
      (closest, element) => {
        const box = element.getBoundingClientRect();
        const distance = y - box.top - box.height / 2;
        return distance < 0 && distance > closest.distance
          ? { distance, element }
          : closest;
      },
      { distance: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }

  function applySortableOrder(container, selector, order) {
    const items = new Map(
      [...container.querySelectorAll(selector)].map((item) => [
        item.dataset.categoryFilter || item.dataset.view,
        item
      ])
    );
    order.forEach((id) => {
      const item = items.get(id);
      if (item) {
        container.appendChild(item);
      }
    });
  }

  function animateSortableChange(container, selector, operation) {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const before = new Map(
      [...container.querySelectorAll(selector)].map((item) => [
        item,
        item.getBoundingClientRect().top
      ])
    );

    operation();
    if (reduceMotion) {
      return;
    }

    container.querySelectorAll(selector).forEach((item) => {
      if (item.classList.contains("is-dragging")) {
        return;
      }
      const previousTop = before.get(item);
      const nextTop = item.getBoundingClientRect().top;
      const delta = previousTop - nextTop;
      if (previousTop !== undefined && Math.abs(delta) > 1) {
        item.animate(
          [
            { transform: `translateY(${delta}px)` },
            { transform: "translateY(0)" }
          ],
          {
            duration: 180,
            easing: "cubic-bezier(0.23, 1, 0.32, 1)"
          }
        );
      }
    });
  }

  async function persistSortableOrder(kind, order, focusId = null) {
    if (kind === "nav") {
      state.navOrder = normalizeNavOrder(order);
      localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(state.navOrder));
      applyNavigationOrder();
      showToast("资料库导航顺序已保存");
      return;
    }

    const previousCategories = state.categories.slice();
    const byId = new Map(state.categories.map((category) => [category.id, category]));
    const ordered = order
      .map((id, index) => {
        const category = byId.get(id);
        return category ? { ...category, order: index } : null;
      })
      .filter(Boolean);

    if (ordered.length !== state.categories.length) {
      return;
    }

    state.categories = ordered;
    try {
      await Promise.all(ordered.map((category) => Store.saveCategory(category)));
      renderContent({ animate: false, preserveScroll: true });
      if (focusId) {
        window.requestAnimationFrame(() => {
          [
            ...document.querySelectorAll(
              "#category-nav-list .category-nav-item[data-category-filter]"
            )
          ]
            .find((button) => button.dataset.categoryFilter === focusId)
            ?.focus();
        });
      }
      showToast("分类顺序已保存");
    } catch (error) {
      state.categories = previousCategories;
      renderContent({ animate: false, preserveScroll: true });
      showToast(error.message || "分类顺序保存失败", true);
    }
  }

  function startSortableDrag(event) {
    const context = getSortableContext(event.target);
    if (!context) {
      return;
    }

    sortDragState = {
      ...context,
      startOrder: readSortableOrder(context.container, context.selector),
      dropped: false
    };
    context.element.classList.add("is-dragging");
    document.documentElement.classList.add("is-sorting-nav");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", context.id);
    }
  }

  function handleSortableDragOver(event) {
    if (!sortDragState || !sortDragState.container.contains(event.target)) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    const afterElement = getDragAfterElement(
      sortDragState.container,
      event.clientY,
      sortDragState.selector
    );
    if (afterElement !== sortDragState.element) {
      animateSortableChange(
        sortDragState.container,
        sortDragState.selector,
        () =>
          sortDragState.container.insertBefore(
            sortDragState.element,
            afterElement
          )
      );
    }
  }

  function handleSortableDrop(event) {
    if (!sortDragState || !sortDragState.container.contains(event.target)) {
      return;
    }
    event.preventDefault();
    sortDragState.dropped = true;
  }

  function finishSortableDrag() {
    if (!sortDragState) {
      return;
    }

    const { kind, container, selector, element, startOrder, dropped } =
      sortDragState;
    sortDragState = null;
    element.classList.remove("is-dragging");
    document.documentElement.classList.remove("is-sorting-nav");

    if (!dropped) {
      animateSortableChange(container, selector, () =>
        applySortableOrder(container, selector, startOrder)
      );
      return;
    }

    const order = readSortableOrder(container, selector);
    if (order.join("\u0000") === startOrder.join("\u0000")) {
      return;
    }
    void persistSortableOrder(kind, order);
  }

  function moveSortableByKeyboard(element, direction) {
    const context = getSortableContext(element);
    if (!context) {
      return false;
    }

    const items = [...context.container.querySelectorAll(context.selector)];
    const currentIndex = items.indexOf(context.element);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= items.length) {
      return false;
    }

    const target = items[targetIndex];
    animateSortableChange(
      context.container,
      context.selector,
      () =>
        context.container.insertBefore(
          context.element,
          direction < 0 ? target : target.nextSibling
        )
    );
    const order = readSortableOrder(context.container, context.selector);
    void persistSortableOrder(context.kind, order, context.id);
    return true;
  }

  function setLayout(layout) {
    if (!LAYOUT_META[layout]) {
      return;
    }
    state.layout = layout;
    localStorage.setItem("shiji.layout.desktop", layout);
    renderContent();
  }

  function toggleTheme() {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    renderContent({ animate: false, preserveScroll: true });
  }

  function typeLabel(type) {
    return TYPE_META[type]?.label || "资源";
  }

  function categoryFallback(excludeId) {
    return state.categories.find((category) => category.id !== excludeId) || null;
  }

  function getViewBase() {
    let resources = state.resources.slice();

    if (state.view === "minecraft") {
      resources = resources.filter((resource) => resource.zone === "minecraft");
    } else if (state.view === "custom") {
      const library = libraryById(state.libraryId);
      resources = library
        ? resources.filter(
            (resource) => resource.zone === libraryZoneId(library.id)
          )
        : [];
    } else if (state.view === "favorites") {
      resources = resources.filter((resource) => resource.favorite);
    } else if (state.view === "recent") {
      resources = resources
        .filter((resource) => resource.openedAt)
        .sort((a, b) => Number(b.openedAt) - Number(a.openedAt))
        .slice(0, 30);
    } else if (state.view !== "all") {
      resources = resources.filter((resource) => resource.zone !== "minecraft");
    }

    if (state.view === "all" && state.zoneFilter !== "all") {
      resources = resources.filter(
        (resource) => resource.zone === state.zoneFilter
      );
    }

    if (state.categoryId) {
      resources = resources.filter((resource) => resource.categoryId === state.categoryId);
    }

    return resources;
  }

  function normalizeSearchQuery(query) {
    return String(query || "").trim().toLocaleLowerCase("zh-CN");
  }

  function resourceMatchesSearch(resource, query) {
    if (!query) {
      return true;
    }

    const category = categoryById(resource.categoryId)?.name || "";
    const library = libraryForZone(resource.zone)?.name || "";
    const minecraftCategory =
      resource.zone === "minecraft" ? minecraftMeta(resource).label : "";
    const haystack = [
      resource.title,
      resource.description,
      resource.url,
      resource.fileName,
      resource.localPath,
      resource.sourcePath,
      category,
      library,
      minecraftCategory,
      ...(resource.tags || [])
    ]
      .join(" ")
      .toLocaleLowerCase("zh-CN");

    return haystack.includes(query);
  }

  function searchResources(resources, query) {
    const normalizedQuery = normalizeSearchQuery(query);
    return normalizedQuery
      ? resources.filter((resource) =>
          resourceMatchesSearch(resource, normalizedQuery)
        )
      : resources;
  }

  function filterAndSortResources(resources) {
    resources = resources.slice();
    if (state.view === "minecraft" && state.minecraftType !== "all") {
      resources = resources.filter((resource) => resource.minecraftType === state.minecraftType);
    } else if (state.view !== "minecraft" && state.typeFilter !== "all") {
      resources = resources.filter((resource) => resource.type === state.typeFilter);
    }

    if (state.view !== "recent") {
      resources.sort((a, b) => {
        if (state.sort === "title") {
          return String(a.title).localeCompare(String(b.title), "zh-CN");
        }
        if (state.sort === "created") {
          return Number(b.createdAt || 0) - Number(a.createdAt || 0);
        }
        if (state.sort === "opened") {
          return Number(b.openedAt || 0) - Number(a.openedAt || 0);
        }
        return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
      });
    }

    return resources;
  }

  function renderZoneFilters() {
    if (state.view !== "all" || state.categoryId) {
      return "";
    }
    const counts = new Map();
    state.resources.forEach((resource) => {
      counts.set(resource.zone || "library", (counts.get(resource.zone || "library") || 0) + 1);
    });
    const options = [
      {
        value: "all",
        label: "全部专区",
        icon: "layers",
        color: DEFAULT_COLOR,
        count: state.resources.length
      },
      {
        value: "library",
        label: "通用资源库",
        icon: "library",
        color: DEFAULT_COLOR,
        count: counts.get("library") || 0
      },
      {
        value: "minecraft",
        label: "我的世界",
        icon: "cube",
        color: "#8a7244",
        count: counts.get("minecraft") || 0
      },
      ...state.libraries.map((library) => ({
        value: libraryZoneId(library.id),
        label: library.name,
        icon: library.icon,
        color: library.color,
        count: counts.get(libraryZoneId(library.id)) || 0
      }))
    ];
    return `
      <div class="zone-filter-bar" role="group" aria-label="按专区筛选">
        <span class="zone-filter-label">专区</span>
        ${options
          .map(
            (option) => `
              <button
                class="zone-filter-chip${state.zoneFilter === option.value ? " is-active" : ""}"
                type="button"
                data-zone-filter="${escapeHTML(option.value)}"
                style="--tone: ${safeColor(option.color)}"
                aria-pressed="${state.zoneFilter === option.value}"
              >
                ${icon(option.icon)}
                <span>${escapeHTML(option.label)}</span>
                <strong>${option.count}</strong>
              </button>
            `
          )
          .join("")}
      </div>
    `;
  }

  function getFilteredResources() {
    return filterAndSortResources(searchResources(getViewBase(), state.query));
  }

  function countResourcesByCategory(resources = state.resources) {
    const counts = new Map();
    resources.forEach((resource) => {
      if (resource.categoryId) {
        counts.set(resource.categoryId, (counts.get(resource.categoryId) || 0) + 1);
      }
    });
    return counts;
  }

  function countResourcesByType(resources) {
    const counts = { all: resources.length, link: 0, file: 0, note: 0 };
    resources.forEach((resource) => {
      if (Object.prototype.hasOwnProperty.call(counts, resource.type)) {
        counts[resource.type] += 1;
      }
    });
    return counts;
  }

  function renderNavigation() {
    let libraryCount = 0;
    let favoriteCount = 0;
    let minecraftCount = 0;
    const customLibraryCounts = new Map();
    const categoryCounts = countResourcesByCategory();
    state.resources.forEach((resource) => {
      if (resource.zone === "minecraft") {
        minecraftCount += 1;
      } else if (!libraryForZone(resource.zone)) {
        libraryCount += 1;
      }
      const customLibrary = libraryForZone(resource.zone);
      if (customLibrary) {
        customLibraryCounts.set(
          customLibrary.id,
          (customLibraryCounts.get(customLibrary.id) || 0) + 1
        );
      }
      if (resource.favorite) {
        favoriteCount += 1;
      }
    });
    elements.allCount.textContent = String(state.resources.length);
    elements.favoritesCount.textContent = String(favoriteCount);
    elements.minecraftCount.textContent = String(minecraftCount);
    const customLibraryNav = document.getElementById("custom-library-nav");
    const customLibrarySignature = state.libraries
      .map(
        (library) =>
          `${library.id}\u0001${library.name}\u0001${library.color}\u0001${library.icon}\u0001${customLibraryCounts.get(library.id) || 0}`
      )
      .join("\u0002");
    if (customLibraryNav.dataset.signature !== customLibrarySignature) {
      customLibraryNav.innerHTML = state.libraries.length
        ? state.libraries
            .map(
              (library) => `
                <button
                  class="nav-item nav-item--custom${state.view === "custom" && state.libraryId === library.id ? " is-active" : ""}"
                  type="button"
                  data-library-id="${escapeHTML(library.id)}"
                  style="--library-color: ${safeColor(library.color)}"
                  aria-current="${state.view === "custom" && state.libraryId === library.id ? "page" : "false"}"
                >
                  ${icon(library.icon)}
                  <span>${escapeHTML(library.name)}</span>
                  <span class="nav-count">${customLibraryCounts.get(library.id) || 0}</span>
                </button>
              `
            )
            .join("")
        : `<div class="nav-empty-hint">还没有自定义专区</div>`;
      customLibraryNav.dataset.signature = customLibrarySignature;
    } else {
      customLibraryNav.querySelectorAll("[data-library-id]").forEach((button) => {
        const active =
          state.view === "custom" &&
          state.libraryId === button.dataset.libraryId;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-current", active ? "page" : "false");
      });
    }

    const selectedView = state.categoryId ? "__category" : state.view;

    document.querySelectorAll(".nav-item[data-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === selectedView);
    });

    const categoryItems = state.categories.map((category) => ({
      category,
      count: categoryCounts.get(category.id) || 0
    }));
    const categorySignature = categoryItems
      .map(
        ({ category, count }) =>
          `${category.id}\u0001${category.name}\u0001${category.color}\u0001${count}`
      )
      .join("\u0002");

    if (elements.categoryNav.dataset.signature !== categorySignature) {
      elements.categoryNav.innerHTML = categoryItems
        .map(({ category, count }) => {
          const active = state.categoryId === category.id;

          return `
            <button
              class="category-nav-item${active ? " is-active" : ""}"
              type="button"
              data-category-filter="${escapeHTML(category.id)}"
              draggable="true"
              title="拖动排序；按 Alt+↑/↓ 调整"
              aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
              aria-current="${active ? "page" : "false"}"
            >
              <span class="category-dot" style="--category-color: ${safeColor(category.color)}"></span>
              <span>${escapeHTML(category.name)}</span>
              <span class="nav-count">${count}</span>
            </button>
          `;
        })
        .join("");
      elements.categoryNav.dataset.signature = categorySignature;
      elements.categoryNav.classList.remove("is-refreshing");
      void elements.categoryNav.offsetWidth;
      elements.categoryNav.classList.add("is-refreshing");
      window.setTimeout(
        () => elements.categoryNav.classList.remove("is-refreshing"),
        360
      );
    } else {
      elements.categoryNav
        .querySelectorAll("[data-category-filter]")
        .forEach((button) => {
          const active = state.categoryId === button.dataset.categoryFilter;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-current", active ? "page" : "false");
        });
    }

    const usesSearch = ["all", "favorites", "recent", "studio", "minecraft", "custom"].includes(
      state.view
    );
    elements.searchBox.hidden = !usesSearch;

    const contextualAddLabel =
      state.view === "studio"
        ? "上传素材"
        : state.view === "minecraft"
        ? "添加内容"
        : state.view === "custom"
          ? "添加内容"
        : state.view === "accounts"
          ? "添加账号"
          : "添加资源";
    document
      .querySelectorAll('[data-action="add-resource"] > span')
      .forEach((label) => {
        label.textContent = contextualAddLabel;
      });
    document.querySelectorAll(".topbar-add").forEach((button) => {
      button.hidden = ["studio", "accounts", "minecraft", "custom"].includes(
        state.view
      );
    });
  }

  function renderSummaryPills() {
    let allCount = 0;
    let favorites = 0;
    let recentUpdates = 0;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    state.resources.forEach((resource) => {
      allCount += 1;
      if (resource.favorite) {
        favorites += 1;
      }
      if (Number(resource.updatedAt) > weekAgo) {
        recentUpdates += 1;
      }
    });

    return `
      <div class="library-summary" aria-label="资源统计">
        <div class="summary-pill">
          <strong>${allCount}</strong>
          <span>全部资源</span>
        </div>
        <div class="summary-pill">
          <strong>${favorites}</strong>
          <span>已收藏</span>
        </div>
        <div class="summary-pill">
          <strong>${recentUpdates}</strong>
          <span>本周更新</span>
        </div>
      </div>
    `;
  }

  function pageHeading() {
    if (state.categoryId) {
      const category = categoryById(state.categoryId);
      return {
        eyebrow: "分类视图",
        title: category?.name || "未分类",
        description: category
          ? `集中查看「${category.name}」中的资源，也可以继续按类型筛选。`
          : "这个分类已经不存在。"
      };
    }

    if (state.view === "custom") {
      const library = libraryById(state.libraryId);
      return {
        eyebrow: "自定义专区",
        title: library?.name || "专区",
        description:
          library?.description || "这个专区已经不存在，请重新选择。"
      };
    }

    const headings = {
      all: {
        eyebrow: "你的本地资料空间",
        title: "全部资源",
        description: "索引电脑中的文件，同时收纳链接、笔记与专区内容，需要时快速找回。"
      },
      favorites: {
        eyebrow: "精选内容",
        title: "我的收藏",
        description: "这里是你最常回看、最重要的资源。"
      },
      recent: {
        eyebrow: "继续上次",
        title: "最近打开",
        description: "最近访问过的资源会出现在这里，方便快速回到手头的工作。"
      }
    };

    return headings[state.view] || headings.all;
  }

  function renderResourceCard(resource) {
    const isMinecraft = resource.zone === "minecraft";
    const customLibrary = libraryForZone(resource.zone);
    const meta = isMinecraft ? minecraftMeta(resource) : TYPE_META[resource.type] || TYPE_META.note;
    const category = categoryById(resource.categoryId);
    const tone = resourceTone(resource);
    const tags = (resource.tags || []).slice(0, 3);
    const extraTags = Math.max(0, (resource.tags || []).length - tags.length);
    const description =
      resource.description ||
      (resource.type === "file"
        ? `${resource.fileName || "本地文件"} · ${formatBytes(resource.fileSize)}`
        : "暂无补充说明");

    return `
      <article
        class="resource-card"
        style="--tone: ${safeColor(tone)}"
        data-resource-card="${escapeHTML(resource.id)}"
        tabindex="0"
        role="button"
        aria-label="查看资源：${escapeHTML(resource.title)}"
      >
        <div class="resource-card-head">
          <span class="resource-type-icon">${icon(meta.icon)}</span>
          <button
            class="favorite-button${resource.favorite ? " is-favorite" : ""}"
            type="button"
            data-favorite-id="${escapeHTML(resource.id)}"
            aria-label="${resource.favorite ? "取消收藏" : "收藏资源"}"
            aria-pressed="${Boolean(resource.favorite)}"
          >
            ${icon("star")}
          </button>
        </div>
        <div class="resource-card-copy">
          <div class="resource-card-title">${highlightText(resource.title, state.query)}</div>
          <p class="resource-card-description">${highlightText(description, state.query)}</p>
          ${
            resource.type === "file"
              ? `<div class="resource-file-path" title="${escapeHTML(resource.localPath || resource.fileName || "")}">
                  ${icon("folder")}<span>${escapeHTML(resource.localPath || resource.fileName || "未选择文件")}</span>
                </div>`
              : ""
          }
          ${
            tags.length
              ? `<div class="tag-list">
                  ${tags.map((tag) => `<span class="tag">#${highlightText(tag, state.query)}</span>`).join("")}
                  ${extraTags ? `<span class="tag">+${extraTags}</span>` : ""}
                </div>`
              : ""
          }
        </div>
        <div class="resource-card-foot">
          <span class="category-label">${escapeHTML(
            isMinecraft
              ? meta.label
              : customLibrary?.name || category?.name || "未分类"
          )}</span>
          <span class="foot-divider"></span>
          <span class="resource-card-time">${formatRelativeTime(resource.updatedAt)}</span>
        </div>
      </article>
    `;
  }

  function resourceDisplayMeta(resource) {
    if (resource.zone === "minecraft") {
      const minecraft = minecraftMeta(resource);
      return {
        label: minecraft.label,
        icon: minecraft.icon,
        tone: minecraft.color
      };
    }
    const type = TYPE_META[resource.type] || TYPE_META.note;
    const category = categoryById(resource.categoryId);
    const library = libraryForZone(resource.zone);
    return {
      label: category?.name || library?.name || type.label,
      icon: type.icon,
      tone: library?.color || category?.color || type.color
    };
  }

  function renderResourceTable(resources) {
    const rows = resources
      .map((resource) => {
        const meta = resourceDisplayMeta(resource);
        const category = categoryById(resource.categoryId);
        const library = libraryForZone(resource.zone);
        const context =
          resource.zone === "minecraft"
            ? `我的世界 · ${meta.label}`
            : library?.name || category?.name || "未分类";
        const secondary =
          resource.type === "file"
            ? resource.localPath || resource.fileName || "未选择文件"
            : resource.description || "暂无补充说明";
        return `
          <article
            class="resource-table-row"
            data-resource-card="${escapeHTML(resource.id)}"
            tabindex="0"
            role="button"
            style="--tone: ${safeColor(meta.tone)}"
            aria-label="查看资源：${escapeHTML(resource.title)}"
          >
            <span class="table-type-icon">${icon(meta.icon)}</span>
            <span class="table-title-cell">
              <strong>${highlightText(resource.title, state.query)}</strong>
              <span title="${escapeHTML(secondary)}">${highlightText(secondary, state.query)}</span>
            </span>
            <span class="table-context">${escapeHTML(context)}</span>
            <span class="table-tags">${(resource.tags || []).slice(0, 2).map((tag) => `#${escapeHTML(tag)}`).join(" ") || "—"}</span>
            <span class="table-date">${formatRelativeTime(resource.updatedAt)}</span>
            <button
              class="favorite-button table-favorite${resource.favorite ? " is-favorite" : ""}"
              type="button"
              data-favorite-id="${escapeHTML(resource.id)}"
              aria-label="${resource.favorite ? "取消收藏" : "收藏资源"}"
              aria-pressed="${Boolean(resource.favorite)}"
            >${icon("star")}</button>
          </article>
        `;
      })
      .join("");

    return `
      <div class="resource-table" role="table" aria-label="资源表格">
        <div class="resource-table-head" role="row">
          <span></span>
          <span>名称</span>
          <span>分类</span>
          <span>标签</span>
          <span>更新</span>
          <span></span>
        </div>
        ${rows}
      </div>
    `;
  }

  function renderResourceCollection(resources) {
    if (state.layout === "table") {
      return renderResourceTable(resources);
    }
    return `<div class="resource-grid resource-grid--${state.layout}">${resources.map(renderResourceCard).join("")}</div>`;
  }

  function renderLayoutSwitcher(showLabels = false) {
    return `
      <div class="layout-switcher${showLabels ? " layout-switcher--labels" : ""}" role="group" aria-label="切换资源排版">
        ${Object.entries(LAYOUT_META)
          .map(
            ([layout, meta]) => `
              <button
                class="layout-button${state.layout === layout ? " is-active" : ""}"
                type="button"
                data-layout="${layout}"
                aria-label="${meta.label}排版"
                aria-pressed="${state.layout === layout}"
                title="${meta.label} · ${meta.description}"
              >
                ${icon(meta.icon)}
                ${showLabels ? `<span>${meta.label}</span>` : ""}
              </button>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderSortControl() {
    const options = [
      ["updated", "最近更新"],
      ["created", "添加时间"],
      ["opened", "最近打开"],
      ["title", "名称顺序"]
    ];
    const current = options.find(([value]) => value === state.sort) || options[0];
    return `
      <div class="sort-control">
        <button class="sort-trigger" type="button" data-action="toggle-sort-menu" aria-expanded="false">
          ${icon("sort")}
          <span>${current[1]}</span>
          <i aria-hidden="true"></i>
        </button>
        <div class="sort-menu" hidden>
          ${options
            .map(
              ([value, label]) => `
                <button class="sort-option${state.sort === value ? " is-active" : ""}" type="button" data-sort-option="${value}">
                  <span>${label}</span>
                  ${state.sort === value ? icon("check") : ""}
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function closeSortMenus() {
    document.querySelectorAll(".sort-control").forEach((control) => {
      control.querySelector(".sort-menu").hidden = true;
      control
        .querySelector(".sort-trigger")
        ?.setAttribute("aria-expanded", "false");
    });
  }

  function renderEmptyState() {
    if (state.query.trim()) {
      return `
        <div class="empty-state">
          <div class="empty-icon">${icon("search")}</div>
          <h2>没有找到匹配的资源</h2>
          <p>换一个关键词，或清除当前筛选条件再试试。</p>
          <button class="button button--ghost" type="button" data-action="clear-filters">清除筛选</button>
        </div>
      `;
    }

    if (state.view === "favorites") {
      return `
        <div class="empty-state">
          <div class="empty-icon">${icon("star")}</div>
          <h2>收藏夹还是空的</h2>
          <p>点开任意资源，在详情或卡片右上角点亮星标，就能在这里快速找到它。</p>
          <button class="button button--ghost" type="button" data-view="all">浏览全部资源</button>
        </div>
      `;
    }

    if (state.view === "minecraft") {
      return `
        <div class="empty-state">
          <div class="empty-icon">${icon("cube")}</div>
          <h2>还没有 Minecraft 资源</h2>
          <p>把常用地图、光影、模组、材质包或整合包放进来，之后按类型和版本标签就能快速找到。</p>
          <button class="button button--primary" type="button" data-action="add-minecraft-resource">
            ${icon("plus")}
            <span>添加第一个内容</span>
          </button>
        </div>
      `;
    }

    if (state.view === "recent") {
      return `
        <div class="empty-state">
          <div class="empty-icon">${icon("clock")}</div>
          <h2>还没有最近记录</h2>
          <p>打开链接或下载文件后，资源会自动出现在这里。</p>
          <button class="button button--ghost" type="button" data-view="all">前往资源库</button>
        </div>
      `;
    }

    return `
      <div class="empty-state">
        <div class="empty-icon">${icon("inbox")}</div>
        <h2>从第一条资源开始</h2>
        <p>链接、文件和短笔记都可以收进拾集。保存之后，用标题、标签或内容搜索即可快速找到。</p>
        <button class="button button--primary" type="button" data-action="add-resource">
          ${icon("plus")}
          <span>添加第一条资源</span>
        </button>
      </div>
    `;
  }

  function renderLibrary() {
    const heading = pageHeading();
    const base = searchResources(getViewBase(), state.query);
    const resources = filterAndSortResources(base);
    const typeCounts = countResourcesByType(base);
    const activeCategory = categoryById(state.categoryId);
    const typeButtons = [
      ["all", "全部", "library"],
      ["link", "链接", "link"],
      ["file", "文件", "file"],
      ["note", "笔记", "note"]
    ]
      .map(
        ([type, label, iconName]) => `
          <button
            class="segment-button${state.typeFilter === type ? " is-active" : ""}"
            type="button"
            data-type-filter="${type}"
          >
            ${icon(iconName)}
            <span>${label}</span>
            <span class="segment-count" data-filter-count="${type}">${typeCounts[type]}</span>
          </button>
        `
      )
      .join("");

    const content = resources.length
      ? renderResourceCollection(resources)
      : renderEmptyState();

    return `
      <div class="content-inner content-inner--library">
        <div class="page-head page-head--library">
          <div class="page-heading">
            <p class="eyebrow">${escapeHTML(heading.eyebrow)}</p>
            <h1>${escapeHTML(heading.title)}</h1>
            <p>${heading.description}</p>
          </div>
          ${renderSummaryPills()}
        </div>

        ${renderZoneFilters()}

        <div class="filter-bar">
          <div class="segmented-control" role="group" aria-label="按资源类型筛选">
            ${typeButtons}
          </div>
          ${
            activeCategory
              ? `<div class="active-category-filter">
                  <span class="category-dot" style="--category-color: ${safeColor(activeCategory.color)}"></span>
                  <span>${escapeHTML(activeCategory.name)}</span>
                  <button type="button" data-action="clear-category-filter" aria-label="清除分类筛选">${icon("close")}</button>
                </div>`
              : ""
          }
          <div class="filter-meta">
            ${renderLayoutSwitcher()}
            <span class="result-count" data-result-count aria-live="polite">${resources.length} 条结果</span>
            ${renderSortControl()}
          </div>
        </div>

        <div id="resource-results" data-resource-results>${content}</div>
      </div>
    `;
  }

  function renderCustomLibrary() {
    const library = libraryById(state.libraryId);
    if (!library) {
      return `
        <div class="content-inner">
          <div class="empty-state">
            <div class="empty-icon">${icon("library")}</div>
            <h2>这个专区已经不存在</h2>
            <p>专区可能已被删除，请从左侧选择其他资料库。</p>
            <button class="button button--primary" type="button" data-view="all">返回全部资源</button>
          </div>
        </div>
      `;
    }

    const allowedTypes = libraryAllowedTypes(library);
    if (
      state.typeFilter !== "all" &&
      !allowedTypes.includes(state.typeFilter)
    ) {
      state.typeFilter = "all";
    }
    const base = searchResources(getViewBase(), state.query);
    const resources = filterAndSortResources(base);
    const typeCounts = countResourcesByType(base);
    const typeButtons = [
      ["all", "全部", "library"],
      ...allowedTypes.map((type) => [
        type,
        TYPE_META[type]?.label || type,
        TYPE_META[type]?.icon || "file"
      ])
    ]
      .map(
        ([type, label, iconName]) => `
          <button
            class="segment-button${state.typeFilter === type ? " is-active" : ""}"
            type="button"
            data-type-filter="${type}"
          >
            ${icon(iconName)}
            <span>${label}</span>
            <span class="segment-count" data-filter-count="${type}">${typeCounts[type] || 0}</span>
          </button>
        `
      )
      .join("");
    const content = resources.length
      ? renderResourceCollection(resources)
      : renderEmptyState();

    return `
      <div class="content-inner">
        <div class="page-head">
          <div class="page-heading">
            <p class="eyebrow">自定义专区</p>
            <h1>${escapeHTML(library.name)}</h1>
            <p>${escapeHTML(library.description || "你的个性化资料分区。")}</p>
          </div>
          <div class="page-head-actions">
            <button class="button button--ghost" type="button" data-action="edit-current-library" data-library-id="${escapeHTML(library.id)}">
              ${icon("settings")}<span>专区设置</span>
            </button>
            <button class="button button--primary" type="button" data-action="add-resource">
              ${icon("plus")}<span>添加内容</span>
            </button>
          </div>
        </div>

        <section class="custom-library-hero" style="--tone: ${safeColor(library.color)}">
          <div class="custom-library-hero-icon">${icon(library.icon)}</div>
          <div class="custom-library-hero-copy">
            <p class="eyebrow">${escapeHTML(library.name)}</p>
            <h2>${escapeHTML(library.description || "为这类内容留一个专属位置。")}</h2>
            <div class="custom-library-stats">
              ${allowedTypes
                .map(
                  (type) =>
                    `<span>${icon(TYPE_META[type]?.icon || "file")}<strong data-custom-library-stat="${escapeHTML(type)}">${typeCounts[type] || 0}</strong>${escapeHTML(TYPE_META[type]?.label || type)}</span>`
                )
                .join("")}
            </div>
          </div>
          <div class="custom-library-hero-count">
            <strong data-custom-library-count>${resources.length}</strong>
            <span>条内容</span>
          </div>
        </section>

        <div class="filter-bar">
          <div class="segmented-control" role="group" aria-label="按资源类型筛选">
            ${typeButtons}
          </div>
          <div class="filter-meta">
            ${renderLayoutSwitcher()}
            <span class="result-count" data-result-count aria-live="polite">${resources.length} 条结果</span>
            ${renderSortControl()}
          </div>
        </div>

        <div id="resource-results" data-resource-results>${content}</div>
      </div>
    `;
  }

  function renderMinecraft() {
    const base = searchResources(getViewBase(), state.query);
    const resources = filterAndSortResources(base);
    const typeCounts = { all: base.length };
    state.minecraftCategories.forEach((category) => {
      typeCounts[category.id] = 0;
    });
    base.forEach((resource) => {
      const type = resource.minecraftType;
      if (Object.prototype.hasOwnProperty.call(typeCounts, type)) {
        typeCounts[type] += 1;
      }
    });
    const typeButtons = [
      ["all", { label: "全部", icon: "cube" }],
      ...state.minecraftCategories.map((category) => [
        category.id,
        { label: category.label, icon: category.icon || "cube" }
      ])
    ]
      .map(
        ([type, meta]) => `
          <button
            class="segment-button${state.minecraftType === type ? " is-active" : ""}"
            type="button"
            data-minecraft-type="${type}"
          >
            ${icon(meta.icon)}
            <span>${meta.label}</span>
            <span class="segment-count" data-filter-count="${type}">${typeCounts[type] || 0}</span>
          </button>
        `
      )
      .join("") +
      `
        <button class="segment-button segment-button--manage" type="button" data-action="manage-minecraft-categories" title="管理 Minecraft 分类">
          ${icon("settings")}
          <span>管理</span>
        </button>
      `;
    const content = resources.length
      ? renderResourceCollection(resources)
      : renderEmptyState();

    return `
      <div class="content-inner">
        <div class="page-head page-head--minecraft">
          <div class="page-heading">
            <p class="eyebrow">Minecraft 专用资源库</p>
            <h1>我的世界</h1>
            <p>地图、光影、模组和材质包各归其位，保留版本与加载器信息，下次开服或换整合包时不用再翻聊天记录。</p>
          </div>
          <button class="button button--primary" type="button" data-action="add-minecraft-resource">
            ${icon("plus")}
            <span>添加内容</span>
          </button>
        </div>

        <section class="minecraft-hero" aria-label="我的世界资源统计">
          <div class="minecraft-hero-copy">
            <p class="eyebrow">BLOCK BY BLOCK</p>
            <h2>把每一块喜欢的世界收好</h2>
            <p>添加文件或下载链接，再用类型、标签和正文搜索。模组还可以把 Minecraft 版本和加载器写进标签。</p>
            <div class="minecraft-stats">
              ${state.minecraftCategories
                .slice(0, 4)
                .map(
                  (category) =>
                    `<span class="minecraft-stat"><strong data-minecraft-stat="${escapeHTML(category.id)}">${typeCounts[category.id] || 0}</strong>${escapeHTML(category.label)}</span>`
                )
                .join("")}
            </div>
          </div>
          <div class="minecraft-art" aria-hidden="true">${icon("cube")}</div>
        </section>

        <div class="filter-bar">
          <div class="segmented-control" role="group" aria-label="按 Minecraft 类型筛选">
            ${typeButtons}
          </div>
          <div class="filter-meta">
            ${renderLayoutSwitcher()}
            <span class="result-count" data-result-count aria-live="polite">${resources.length} 条结果</span>
            ${renderSortControl()}
          </div>
        </div>

        <div id="resource-results" data-resource-results>${content}</div>
      </div>
    `;
  }

  function renderCategories() {
    const categoryCounts = countResourcesByCategory();
    const cards = state.categories
      .map((category) => {
        const count = categoryCounts.get(category.id) || 0;
        return `
          <article
            class="category-card"
            style="--tone: ${safeColor(category.color)}"
            data-open-category="${escapeHTML(category.id)}"
            tabindex="0"
            role="button"
            aria-label="查看分类：${escapeHTML(category.name)}"
          >
            <div class="category-card-top">
              <span class="category-icon">${icon("folder")}</span>
              <span class="category-card-arrow">${icon("chevron-right")}</span>
            </div>
            <h2>${escapeHTML(category.name)}</h2>
            <p>${count} 条资源</p>
            <div class="category-actions">
              <button class="category-action" type="button" data-category-edit="${escapeHTML(category.id)}" aria-label="编辑分类">
                ${icon("edit")}
              </button>
              <button class="category-action category-action--danger" type="button" data-category-delete="${escapeHTML(category.id)}" aria-label="删除分类">
                ${icon("trash")}
              </button>
            </div>
          </article>
        `;
      })
      .join("");

    return `
      <div class="content-inner">
        <div class="page-head">
          <div class="page-heading">
            <p class="eyebrow">建立秩序</p>
            <h1>分类</h1>
            <p>按用途建立少量、清晰的分类。删除分类不会删除其中的资源。</p>
          </div>
        </div>
        <div class="category-grid">
          ${cards}
          <button class="new-category-card" type="button" data-action="create-category">
            <span class="new-category-icon">${icon("plus")}</span>
            <strong>新建分类</strong>
            <span>为资源留一个新位置</span>
          </button>
        </div>
      </div>
    `;
  }

  function accountMatchesSearch(account, query) {
    if (!query) {
      return true;
    }
    return [
      account.platform,
      account.username,
      account.website,
      account.note,
      accountCategoryMeta(account.category).label
    ]
      .join(" ")
      .toLocaleLowerCase("zh-CN")
      .includes(query);
  }

  function getFilteredAccounts() {
    const query = normalizeSearchQuery(state.accountQuery);
    return state.vaultAccounts
      .filter((account) => accountMatchesSearch(account, query))
      .filter(
        (account) =>
          state.accountCategory === "all" ||
          account.category === state.accountCategory
      )
      .sort((a, b) => String(a.platform).localeCompare(String(b.platform), "zh-CN"));
  }

  function renderAccountCard(account) {
    const category = accountCategoryMeta(account.category);
    const tone = category.color;
    const showPassword =
      state.showAllPasswords || state.revealedAccountIds.has(account.id);
    const passwordValue = showPassword ? account.password : maskPassword(account.password);
    const safeWebsite = isSafeStoredUrl(account.website) ? account.website : "";

    return `
      <article class="account-card" style="--tone: ${safeColor(tone)}">
        <div class="account-card-head">
          ${renderAccountAvatar(account)}
          <div class="account-identity">
            <h2>${escapeHTML(account.platform)}</h2>
            <span>${escapeHTML(category.label)}账号</span>
          </div>
          <div class="account-card-actions">
            <button class="category-action" type="button" data-edit-account="${escapeHTML(account.id)}" aria-label="编辑账号">
              ${icon("edit")}
            </button>
            <button class="category-action category-action--danger" type="button" data-delete-account="${escapeHTML(account.id)}" aria-label="删除账号">
              ${icon("trash")}
            </button>
          </div>
        </div>
        <div class="credential-list">
          <div class="credential-row">
            <span class="credential-label">账号</span>
            <span class="credential-value" title="${escapeHTML(account.username)}">${escapeHTML(account.username)}</span>
            <button class="credential-action" type="button" data-copy-account="${escapeHTML(account.id)}" aria-label="复制账号">
              ${icon("copy")}
            </button>
          </div>
          <div class="credential-row">
            <span class="credential-label">密码</span>
            <span class="credential-value${showPassword ? "" : " is-secret"}" data-toggle-account-password="${escapeHTML(account.id)}" title="${showPassword ? "点击隐藏密码" : "点击显示密码"}">${escapeHTML(passwordValue)}</span>
            <button
              class="credential-action"
              type="button"
              data-toggle-account-password="${escapeHTML(account.id)}"
              aria-label="${showPassword ? "隐藏密码" : "显示密码"}"
              aria-pressed="${showPassword}"
            >${icon(showPassword ? "eye-off" : "eye")}</button>
            <button class="credential-action" type="button" data-copy-password="${escapeHTML(account.id)}" aria-label="复制密码">
              ${icon("copy")}
            </button>
          </div>
        </div>
        ${account.note ? `<p class="account-note">${escapeHTML(account.note)}</p>` : ""}
        <div class="account-card-foot">
          ${
            safeWebsite
              ? `<a class="account-site-link" href="${escapeHTML(safeWebsite)}" target="_blank" rel="noopener noreferrer">
                  ${icon("external")}
                  <span>${escapeHTML(account.website.replace(/^https?:\/\//i, ""))}</span>
                </a>`
              : `<span>${escapeHTML(account.username.includes("@") ? "邮箱账号" : "本地保存")}</span>`
          }
          <span>更新于 ${formatRelativeTime(account.updatedAt)}</span>
        </div>
      </article>
    `;
  }

  function renderAccountListRow(account) {
    const category = accountCategoryMeta(account.category);
    const showPassword =
      state.showAllPasswords || state.revealedAccountIds.has(account.id);
    const safeWebsite = isSafeStoredUrl(account.website) ? account.website : "";

    return `
      <article class="account-list-row" style="--tone: ${safeColor(category.color)}">
        <div class="account-list-identity">
          ${renderAccountAvatar(account)}
          <div class="account-identity">
            <h2>${escapeHTML(account.platform)}</h2>
            <span>${escapeHTML(account.username)}</span>
          </div>
        </div>
        <span class="account-list-category">${escapeHTML(category.label)}</span>
        <div class="account-list-credentials">
          <span class="credential-value${showPassword ? "" : " is-secret"}" data-toggle-account-password="${escapeHTML(account.id)}" title="${showPassword ? "点击隐藏密码" : "点击显示密码"}">${escapeHTML(
            showPassword ? account.password : maskPassword(account.password)
          )}</span>
          <button class="credential-action" type="button" data-toggle-account-password="${escapeHTML(account.id)}" aria-label="${showPassword ? "隐藏密码" : "显示密码"}">
            ${icon(showPassword ? "eye-off" : "eye")}
          </button>
          <button class="credential-action" type="button" data-copy-password="${escapeHTML(account.id)}" aria-label="复制密码">
            ${icon("copy")}
          </button>
        </div>
        <div class="account-list-meta">
          <span>${safeWebsite ? escapeHTML(account.website.replace(/^https?:\/\//i, "")) : "未填写网址"}</span>
          <small>更新于 ${formatRelativeTime(account.updatedAt)}</small>
        </div>
        <div class="account-list-actions">
          <button class="category-action" type="button" data-edit-account="${escapeHTML(account.id)}" aria-label="编辑账号">
            ${icon("edit")}
          </button>
          <button class="category-action category-action--danger" type="button" data-delete-account="${escapeHTML(account.id)}" aria-label="删除账号">
            ${icon("trash")}
          </button>
        </div>
      </article>
    `;
  }

  function renderAccountTableRow(account) {
    const category = accountCategoryMeta(account.category);
    const showPassword =
      state.showAllPasswords || state.revealedAccountIds.has(account.id);
    const safeWebsite = isSafeStoredUrl(account.website) ? account.website : "";

    return `
      <div class="account-table-row" style="--tone: ${safeColor(category.color)}">
        <div class="account-table-account">
          ${renderAccountAvatar(account)}
          <div>
            <strong>${escapeHTML(account.platform)}</strong>
            <span>${escapeHTML(account.username)}</span>
          </div>
        </div>
        <span class="account-table-category">${escapeHTML(category.label)}</span>
        <span class="account-table-password credential-value${showPassword ? "" : " is-secret"}" data-toggle-account-password="${escapeHTML(account.id)}">${escapeHTML(
          showPassword ? account.password : maskPassword(account.password)
        )}</span>
        <span class="account-table-site">${safeWebsite ? escapeHTML(account.website.replace(/^https?:\/\//i, "")) : "—"}</span>
        <span class="account-table-date">${formatRelativeTime(account.updatedAt)}</span>
        <div class="account-table-actions">
          <button class="credential-action" type="button" data-toggle-account-password="${escapeHTML(account.id)}" aria-label="${showPassword ? "隐藏密码" : "显示密码"}">
            ${icon(showPassword ? "eye-off" : "eye")}
          </button>
          <button class="credential-action" type="button" data-copy-password="${escapeHTML(account.id)}" aria-label="复制密码">
            ${icon("copy")}
          </button>
          <button class="category-action" type="button" data-edit-account="${escapeHTML(account.id)}" aria-label="编辑账号">
            ${icon("edit")}
          </button>
          <button class="category-action category-action--danger" type="button" data-delete-account="${escapeHTML(account.id)}" aria-label="删除账号">
            ${icon("trash")}
          </button>
        </div>
      </div>
    `;
  }

  function renderAccountResults() {
    const accounts = getFilteredAccounts();
    if (!accounts.length) {
      return `
        <div class="account-empty">
          <div class="vault-gate-icon">${icon(state.accountQuery ? "search" : "key")}</div>
          <h2>${state.accountQuery ? "没有找到匹配账号" : "保险箱还是空的"}</h2>
          <p>${state.accountQuery ? "换一个平台名称、账号或分类关键词再试。" : "添加常用平台账号后，可以在这里直接查看、复制和生成密码。"}</p>
          <button class="button button--primary" type="button" data-action="${state.accountQuery ? "clear-account-search" : "add-account"}">
            ${icon(state.accountQuery ? "close" : "plus")}
            <span>${state.accountQuery ? "清除搜索" : "添加第一个账号"}</span>
          </button>
        </div>
      `;
    }

    if (state.accountLayout === "list") {
      return `<div class="account-list">${accounts.map(renderAccountListRow).join("")}</div>`;
    }
    if (state.accountLayout === "table") {
      return `
        <div class="account-table" role="table" aria-label="账号表格">
          <div class="account-table-head" role="row">
            <span>平台与账号</span>
            <span>分类</span>
            <span>密码</span>
            <span>登录网址</span>
            <span>更新时间</span>
            <span>操作</span>
          </div>
          ${accounts.map(renderAccountTableRow).join("")}
        </div>
      `;
    }
    return `<div class="account-grid">${accounts.map(renderAccountCard).join("")}</div>`;
  }

  function renderAccountLibrary() {
    const query = normalizeSearchQuery(state.accountQuery);
    const searched = query
      ? state.vaultAccounts.filter((account) => accountMatchesSearch(account, query))
      : state.vaultAccounts;
    const categoryCounts = Object.fromEntries(
      state.accountCategories.map((category) => [category.id, 0])
    );
    searched.forEach((account) => {
      if (Object.prototype.hasOwnProperty.call(categoryCounts, account.category)) {
        categoryCounts[account.category] += 1;
      }
    });
    const filters = [
      `<button class="account-filter-chip${state.accountCategory === "all" ? " is-active" : ""}" type="button" data-account-category="all">全部 ${searched.length}</button>`,
      ...state.accountCategories.map(
        (category) => `
          <button
            class="account-filter-chip${state.accountCategory === category.id ? " is-active" : ""}"
            type="button"
            data-account-category="${escapeHTML(category.id)}"
            style="--tone: ${safeColor(category.color)}"
          >${escapeHTML(category.label)} ${categoryCounts[category.id]}</button>
        `
      )
    ];

    return `
      <div class="content-inner">
        <div class="page-head page-head--vault">
          <div class="page-heading">
            <p class="eyebrow">本机账号管理</p>
            <h1>账号保险箱</h1>
            <p>${state.vaultAccounts.length} 个账号保存在本机。密码默认隐藏，可单独查看或一键显示全部。</p>
          </div>
          <div class="vault-head-actions">
            <span class="vault-badge">${icon("database")}本机保存</span>
            <button class="button button--primary" type="button" data-action="add-account">
              ${icon("plus")}<span>添加账号</span>
            </button>
          </div>
        </div>
        <div class="vault-toolbar">
          <label class="vault-search">
            ${icon("search")}
            <input id="account-search" type="search" placeholder="搜索平台、账号或备注…" value="${escapeHTML(state.accountQuery)}" autocomplete="off" />
          </label>
          <div class="account-toolbar-actions">
            <div class="layout-switcher" role="group" aria-label="账号显示方式">
              ${Object.entries(ACCOUNT_LAYOUT_META)
                .map(
                  ([layout, meta]) => `
                    <button
                      class="layout-button${state.accountLayout === layout ? " is-active" : ""}"
                      type="button"
                      data-account-layout="${layout}"
                      aria-label="${meta.label}视图"
                      aria-pressed="${state.accountLayout === layout}"
                      title="${meta.label}视图"
                    >
                      ${icon(meta.icon)}
                    </button>
                  `
                )
                .join("")}
            </div>
            <button class="button button--ghost" type="button" data-action="toggle-all-passwords">
              ${icon(state.showAllPasswords ? "eye-off" : "eye")}
              <span>${state.showAllPasswords ? "隐藏全部密码" : "显示全部密码"}</span>
            </button>
          </div>
        </div>
        <div class="account-category-chips" aria-label="账号分类">
          ${filters.join("")}
          <button class="account-filter-chip account-filter-manage" type="button" data-action="manage-account-categories">
            ${icon("settings")}<span>管理分类</span>
          </button>
        </div>
        <div id="account-results">${renderAccountResults()}</div>
      </div>
    `;
  }

  function renderAccounts() {
    return renderAccountLibrary();
  }

  function renderAbout() {
    return `
      <div class="content-inner about-page">
        <div class="page-head page-head--about">
          <div class="page-heading">
            <p class="eyebrow">软件与网页介绍</p>
            <h1>关于拾集</h1>
            <p>为电脑文件建立快速、可搜索的本地路径索引。</p>
          </div>
          <button class="vault-badge author-badge-button" type="button" data-action="open-author-profile">
            ${icon("user")}作者 YinL.
          </button>
        </div>

        <section class="about-hero">
          <div class="about-logo">
            <div class="brand-mark brand-mark--large" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
            <div>
              <p class="eyebrow">SHIJI · LOCAL FILE INDEX</p>
              <h2>拾集</h2>
            </div>
          </div>
          <p>拾集首先解决“文件存在电脑里，却忘了放在哪”的问题。它只记录文件名称、大小、更新时间和完整路径，不复制原文件；再通过搜索、标签、分类和自定义专区，让本机文件与常用链接、笔记、账号一起被快速找到。</p>
          <div class="about-author-line">
            <span>作者</span>
            <strong>YinL.</strong>
            <span>·</span>
            <span>© 2026</span>
          </div>
        </section>

        <div class="about-feature-grid">
          <article class="about-feature about-feature--link" data-view="all" tabindex="0" role="button" aria-label="前往全部资源">
            ${icon("folder")}
            <h2>本地文件索引</h2>
            <p>只保存路径与元数据，不复制文件；支持按名称、说明、标签和路径搜索。</p>
          </article>
          <article class="about-feature about-feature--link" data-view="all" tabindex="0" role="button" aria-label="前往文件路径定位">
            ${icon("search")}
            <h2>快速定位路径</h2>
            <p>详情页可直接打开原文件、在资源管理器中定位，或复制完整文件路径。</p>
          </article>
          <article class="about-feature about-feature--link" data-action="create-library" tabindex="0" role="button" aria-label="新建自定义专区">
            ${icon("layers")}
            <h2>自定义专区</h2>
            <p>按用途创建资料库，自行选择图标、配色、内容类型与默认排版。</p>
          </article>
          <article class="about-feature about-feature--link" data-view="settings" tabindex="0" role="button" aria-label="前往数据备份设置">
            ${icon("shield")}
            <h2>数据自主</h2>
            <p>无需注册，数据默认只保存在当前设备，可随时导出完整备份。</p>
          </article>
        </div>

        <section class="release-notes-entry">
          <div class="release-notes-entry-icon">${icon("clock")}</div>
          <div>
            <p class="eyebrow">版本记录</p>
            <h2>版本时间轴</h2>
            <p>当前为第二测试版 1.1.0，共记录三个主要测试版本。</p>
          </div>
          <button class="button button--ghost" type="button" data-action="open-release-notes">
            ${icon("chevron-right")}
            <span>查看时间轴</span>
          </button>
        </section>
      </div>
    `;
  }

  function renderSettings() {
    const settingsGroups = [
      {
        label: "应用",
        items: [
          { id: "general", label: "通用设置", icon: "settings" },
          { id: "personalization", label: "个性化", icon: "gallery" },
          { id: "shortcuts", label: "快捷键", icon: "keyboard" }
        ]
      },
      {
        label: "数据管理",
        items: [
          { id: "data", label: "备份与恢复", icon: "download" },
          { id: "library", label: "素材库位置", icon: "folder" },
          { id: "storage", label: "本地存储", icon: "database" }
        ]
      },
      {
        label: "内容管理",
        items: [{ id: "content", label: "分类与排序", icon: "layers" }]
      },
      {
        label: "安全与帮助",
        items: [
          { id: "privacy", label: "隐私与清理", icon: "shield" },
          { id: "help", label: "教程与关于", icon: "info" }
        ]
      }
    ];
    const validSection = settingsGroups.some((group) =>
      group.items.some((item) => item.id === state.settingsSection)
    )
      ? state.settingsSection
      : "general";
    state.settingsSection = validSection;

    const nav = settingsGroups
      .map(
        (group) => `
          <div class="settings-nav-group">
            <p>${group.label}</p>
            ${group.items
              .map(
                (item) => `
                  <button class="settings-nav-button${state.settingsSection === item.id ? " is-active" : ""}" type="button" data-settings-section="${item.id}">
                    ${icon(item.icon)}<span>${item.label}</span>
                  </button>
                `
              )
              .join("")}
          </div>
        `
      )
      .join("");

    const themePreference =
      document.documentElement.dataset.themePreference || "system";
    const themeOptions = `
      <div class="appearance-options settings-appearance-options settings-theme-options">
        <button class="appearance-option${themePreference === "system" ? " is-active" : ""}" type="button" data-theme-choice="system" aria-pressed="${themePreference === "system"}">
          ${icon("monitor")}<span>跟随系统</span>
        </button>
        <button class="appearance-option${themePreference === "light" ? " is-active" : ""}" type="button" data-theme-choice="light" aria-pressed="${themePreference === "light"}">
          ${icon("sun")}<span>浅色</span>
        </button>
        <button class="appearance-option${themePreference === "dark" ? " is-active" : ""}" type="button" data-theme-choice="dark" aria-pressed="${themePreference === "dark"}">
          ${icon("moon")}<span>深色</span>
        </button>
      </div>
    `;
    const paletteOptions = `
      <div class="theme-palette-grid" role="radiogroup" aria-label="主题配色">
        ${THEME_PALETTES.map(
          (palette) => `
            <button
              class="theme-palette-option${state.palette === palette.id ? " is-active" : ""}"
              type="button"
              data-action="set-theme-palette"
              data-palette-choice="${palette.id}"
              aria-pressed="${state.palette === palette.id}"
              style="--swatch: ${palette.color}"
            >
              <span class="theme-palette-swatch"></span>
              <span>${palette.label}</span>
            </button>
          `
        ).join("")}
      </div>
    `;

    const startupSupported = Boolean(window.ShijiDesktop?.getStartupSetting);
    const closeBehaviorSupported = Boolean(window.ShijiDesktop?.setCloseBehavior);
    const switchButton = (action, active, label, disabled = false) => `
      <button class="setting-switch${active ? " is-on" : ""}" type="button" role="switch" aria-checked="${active}" aria-label="${label}" ${disabled ? "disabled" : ""} data-action="${action}">
        <i></i>
      </button>
    `;
    const activeStartupView =
      STARTUP_VIEW_OPTIONS.find((option) => option.value === state.startupView) ||
      STARTUP_VIEW_OPTIONS[0];
    const shortcutRows = SHORTCUT_DEFINITIONS.map(
      (shortcut) => `
        <div class="settings-row shortcut-setting-row">
          <div class="settings-row-copy shortcut-setting-copy">
            <span class="shortcut-setting-icon">${icon(shortcut.icon)}</span>
            <div>
              <strong>${escapeHTML(shortcut.label)}</strong>
              <span>${escapeHTML(shortcut.description)}</span>
            </div>
          </div>
          <button
            class="shortcut-recorder"
            type="button"
            data-action="record-shortcut"
            data-shortcut-action="${escapeHTML(shortcut.id)}"
            aria-label="修改${escapeHTML(shortcut.label)}快捷键"
            aria-keyshortcuts="${escapeHTML(state.shortcuts[shortcut.id])}"
          >
            <span data-shortcut-value>${escapeHTML(formatShortcutDisplay(state.shortcuts[shortcut.id]))}</span>
            ${icon("edit")}
          </button>
        </div>
      `
    ).join("");

    const panels = {
      general: `
        <section class="settings-card">
          <h2>${icon("settings")}启动与应用</h2>
          <p>调整拾集的启动方式和常用操作偏好。</p>
          <div class="settings-row">
            <div class="settings-row-copy">
              <strong>开机自启动</strong>
              <span>${startupSupported ? "登录 Windows 后自动打开拾集" : "该选项仅在电脑版中可用"}</span>
            </div>
            ${switchButton("toggle-startup", state.startupAtLogin, "开机自启动", !startupSupported)}
          </div>
          <div class="settings-row">
            <div class="settings-row-copy">
              <strong>启动时打开</strong>
              <span>选择每次启动后默认进入的页面</span>
            </div>
            <div class="settings-dropdown" data-settings-dropdown>
              <button
                class="settings-dropdown-trigger"
                type="button"
                data-action="toggle-startup-dropdown"
                aria-haspopup="listbox"
                aria-expanded="false"
              >
                <span data-startup-view-label>${escapeHTML(activeStartupView.label)}</span>
                ${icon("chevron-right", "icon settings-dropdown-chevron")}
              </button>
              <div class="settings-dropdown-menu" role="listbox" aria-label="启动时打开的页面" hidden>
                ${STARTUP_VIEW_OPTIONS.map(
                  (option) => `
                    <button
                      class="settings-dropdown-option"
                      type="button"
                      role="option"
                      data-action="select-startup-view"
                      data-startup-view-value="${escapeHTML(option.value)}"
                      aria-selected="${option.value === state.startupView}"
                    >
                      <span>${escapeHTML(option.label)}</span>
                      ${option.value === state.startupView ? icon("check") : ""}
                    </button>
                  `
                ).join("")}
              </div>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-copy">
              <strong>删除前二次确认</strong>
              <span>删除账号、资源或分类时显示确认提示</span>
            </div>
            ${switchButton("toggle-confirm-delete", state.confirmDelete, "删除前二次确认")}
          </div>
          <div class="settings-row">
            <div class="settings-row-copy">
              <strong>默认获取网站图标</strong>
              <span>新建账号时自动尝试读取登录网站图标</span>
            </div>
            ${switchButton("toggle-auto-icon", state.autoIconDefault, "默认获取网站图标")}
          </div>
          <div class="settings-row">
            <div class="settings-row-copy">
              <strong>关闭窗口时</strong>
              <span>${closeBehaviorSupported ? "选择点击窗口关闭按钮后的行为" : "该选项仅在电脑版中可用"}</span>
            </div>
            <div class="settings-choice-group" role="radiogroup" aria-label="关闭窗口时的行为">
              <button
                class="settings-choice${state.closeBehavior === "exit" ? " is-active" : ""}"
                type="button"
                data-action="set-close-behavior"
                data-close-behavior-choice="exit"
                aria-pressed="${state.closeBehavior === "exit"}"
                ${closeBehaviorSupported ? "" : "disabled"}
              >退出软件</button>
              <button
                class="settings-choice${state.closeBehavior === "tray" ? " is-active" : ""}"
                type="button"
                data-action="set-close-behavior"
                data-close-behavior-choice="tray"
                aria-pressed="${state.closeBehavior === "tray"}"
                ${closeBehaviorSupported ? "" : "disabled"}
              >收起到系统托盘</button>
            </div>
          </div>
          ${
            closeBehaviorSupported
              ? `<div class="settings-row">
                  <div class="settings-row-copy">
                    <strong>立即退出</strong>
                    <span>无论关闭按钮设置为何，立即结束拾集进程</span>
                  </div>
                  <button class="button button--danger" type="button" data-action="quit-app">${icon("close")}<span>退出拾集</span></button>
                </div>`
              : ""
          }
        </section>
      `,
      personalization: `
        <section class="settings-card">
          <h2>${icon("gallery")}外观与交互</h2>
          <p>调整主题、详情展示方式和侧栏可读性，设置会保存在当前设备。</p>
          <div class="settings-row">
            <div class="settings-row-copy">
              <strong>界面模式</strong>
              <span>也可使用右上角按钮快速切换</span>
            </div>
            ${themeOptions}
          </div>
          <div class="settings-row settings-row--palette">
            <div class="settings-row-copy">
              <strong>主题配色</strong>
              <span>选择强调色和主视觉配色，可与浅色或深色模式组合</span>
            </div>
            ${paletteOptions}
          </div>
          <div class="settings-row">
            <div class="settings-row-copy">
              <strong>资源详情展示</strong>
              <span>窗口式居中显示，侧边式从右侧滑出</span>
            </div>
            <div class="settings-choice-group" role="radiogroup" aria-label="资源详情展示方式">
              <button class="settings-choice${state.detailMode === "window" ? " is-active" : ""}" type="button" data-action="set-detail-mode" data-detail-mode-choice="window" aria-pressed="${state.detailMode === "window"}">窗口式</button>
              <button class="settings-choice${state.detailMode === "drawer" ? " is-active" : ""}" type="button" data-action="set-detail-mode" data-detail-mode-choice="drawer" aria-pressed="${state.detailMode === "drawer"}">侧边式</button>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-copy">
              <strong>侧栏字号</strong>
              <span>全屏或高分辨率屏幕上建议使用大字号</span>
            </div>
            <div class="settings-choice-group" role="radiogroup" aria-label="侧栏字号">
              <button class="settings-choice${state.sidebarScale === "standard" ? " is-active" : ""}" type="button" data-action="set-sidebar-scale" data-sidebar-scale-choice="standard" aria-pressed="${state.sidebarScale === "standard"}">标准</button>
              <button class="settings-choice${state.sidebarScale === "large" ? " is-active" : ""}" type="button" data-action="set-sidebar-scale" data-sidebar-scale-choice="large" aria-pressed="${state.sidebarScale === "large"}">大字号</button>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-copy">
              <strong>界面字号</strong>
              <span>缩放整个软件的文字与界面，选择后立即生效</span>
            </div>
            <div class="settings-choice-group settings-font-scale-group" role="radiogroup" aria-label="界面字号">
              ${Object.entries({
                small: "小",
                standard: "标准",
                large: "大",
                xlarge: "特大"
              })
                .map(
                  ([value, label]) => `
                    <button class="settings-choice${state.fontScale === value ? " is-active" : ""}" type="button" data-action="set-font-scale" data-font-scale-choice="${value}" aria-pressed="${state.fontScale === value}">${label}</button>
                  `
                )
                .join("")}
            </div>
          </div>
        </section>
      `,
      shortcuts: `
        <section class="settings-card shortcut-settings-card">
          <h2>${icon("keyboard")}快捷键设置</h2>
          <p>点击右侧按键后直接输入新的组合键。快捷键只保存在当前设备，并会跟随完整备份迁移。</p>
          <div class="shortcut-settings-list">
            ${shortcutRows}
          </div>
          <div class="shortcut-settings-footer">
            <span id="shortcut-recording-status">组合键建议包含 Ctrl 或 Alt；按 Backspace 可清除单项。</span>
            <button class="button button--ghost" type="button" data-action="reset-shortcuts">${icon("clock")}<span>恢复默认</span></button>
          </div>
        </section>
        <section class="settings-card shortcut-help-card">
          <h2>${icon("info")}保留按键</h2>
          <p>Ctrl + R、Ctrl + W、F5、F12 等由系统、浏览器或开发工具占用，不会用于拾集操作。</p>
        </section>
      `,
      data: `
        <section class="settings-card">
          <h2>${icon("database")}备份与恢复</h2>
          <p>备份包含资源、分类、文件索引、账号与偏好设置。</p>
          <div class="settings-row">
            <div class="settings-row-copy">
              <strong>导出完整备份</strong>
              <span>下载一份可迁移的 JSON 文件</span>
            </div>
            <button class="button button--ghost" type="button" data-action="export-data">${icon("download")}<span>导出 JSON</span></button>
          </div>
          <div class="settings-row">
            <div class="settings-row-copy">
              <strong>从备份恢复</strong>
              <span>导入后将替换当前设备中的对应数据</span>
            </div>
            <button class="button button--ghost" type="button" data-action="import-data">${icon("upload")}<span>选择备份</span></button>
          </div>
        </section>
      `,
      storage: `
        <section class="settings-card storage-card">
          <p class="eyebrow">当前来源</p>
          <h2>${icon("database")}本地占用</h2>
          <div class="storage-number"><span id="storage-used">计算中</span> <span>used</span></div>
          <div class="storage-bar"><span id="storage-bar-fill"></span></div>
          <div class="storage-caption" id="storage-caption">正在读取本地存储信息…</div>
        </section>
        <section class="settings-card">
          <h2>${icon("file")}文件索引</h2>
          <p>电脑版只保存原文件路径，不上传或复制文件到拾集数据库。</p>
          <button class="button button--ghost" type="button" data-view="all">${icon("folder")}<span>查看文件资源</span></button>
        </section>
      `,
      library:
        window.ResourceLibrary?.renderSettingsCard() ||
        `<section class="settings-card"><h2>${icon("folder")}素材库位置</h2><p>素材库设置仅在电脑版中可用。</p></section>`,
      content: `
        <section class="settings-card">
          <h2>${icon("layers")}分类与导航</h2>
          <div class="settings-row">
            <div class="settings-row-copy"><strong>通用资源分类</strong><span>新建、重命名、配色或删除</span></div>
            <button class="button button--ghost" type="button" data-view="categories">${icon("layers")}<span>管理分类</span></button>
          </div>
          <div class="settings-row">
            <div class="settings-row-copy"><strong>账号分类</strong><span>管理账号保险箱中的自定义分类</span></div>
            <button class="button button--ghost" type="button" data-action="manage-account-categories">${icon("key")}<span>管理</span></button>
          </div>
          <div class="settings-row">
            <div class="settings-row-copy"><strong>Minecraft 分类</strong><span>管理地图、光影、模组等类型标签</span></div>
            <button class="button button--ghost" type="button" data-action="manage-minecraft-categories">${icon("cube")}<span>管理</span></button>
          </div>
          <div class="settings-row">
            <div class="settings-row-copy"><strong>导航顺序</strong><span>使用位置、按钮、拖拽或名称排序</span></div>
            <button class="button button--ghost" type="button" data-action="open-order-dialog">${icon("sort")}<span>调整顺序</span></button>
          </div>
        </section>
      `,
      privacy: `
        <section class="settings-card">
          <h2>${icon("shield")}隐私与清理</h2>
          <p>拾集没有云端账号。资源、账号密码和偏好设置都保存在当前设备。</p>
          <div class="settings-row">
            <div class="settings-row-copy">
              <strong>恢复初始状态</strong>
              <span>清除个人数据与设置，恢复首次启动的示例资源和欢迎引导</span>
            </div>
            <button class="button button--danger" type="button" data-action="reset-app-state">${icon("refresh")}<span>恢复初始状态</span></button>
          </div>
          <div class="settings-row">
            <div class="settings-row-copy">
              <strong>清空资源</strong>
              <span>删除资源内容，保留分类、设置和账号保险箱</span>
            </div>
            <button class="button button--danger" type="button" data-action="clear-resources">清空资源</button>
          </div>
        </section>
      `,
      help: `
        <section class="settings-card">
          <h2>${icon("info")}教程与关于</h2>
          <p>查看操作教程、软件说明、版本更新和作者信息。</p>
          <div class="settings-actions-grid">
            <button class="button button--ghost" type="button" data-action="open-tutorial-dialog">${icon("note")}<span>新手教程</span></button>
            <button class="button button--ghost" type="button" data-view="about">${icon("info")}<span>软件介绍</span></button>
            <button class="button button--ghost" type="button" data-action="open-release-notes">${icon("clock")}<span>更新记录</span></button>
            <button class="button button--ghost" type="button" data-action="open-author-profile">${icon("user")}<span>作者信息</span></button>
          </div>
          <div class="app-version"><span>拾集 · YinL.</span><span>第二测试版 <b class="version-inline-highlight">1.1.0</b></span></div>
        </section>
      `
    };

    return `
      <div class="content-inner">
        <div class="page-head">
          <div class="page-heading">
            <p class="eyebrow">应用偏好</p>
            <h1>设置</h1>
            <p>按分类调整启动、个性化、快捷键、退出行为、数据、内容、隐私和帮助选项。</p>
          </div>
        </div>
        <div class="settings-shell">
          <nav class="settings-nav" aria-label="设置分类">
            ${nav}
          </nav>
          <div class="settings-panel">
            ${panels[state.settingsSection]}
          </div>
        </div>
      </div>
    `;
  }

  function renderContent({ animate = true, preserveScroll = false } = {}) {
    window.clearTimeout(searchRenderTimer);
    searchRenderTimer = null;
    if (!appIsReady) {
      elements.content.innerHTML = `<div class="loading-state">正在打开你的资源库…</div>`;
      return;
    }

    const previousScrollTop = elements.content.scrollTop;
    renderNavigation();

    if (state.view === "studio") {
      elements.content.innerHTML =
        window.ShijiStudio?.render() ||
        `<div class="loading-state">正在打开 Minecraft 素材中心…</div>`;
    } else if (state.view === "minecraft") {
      elements.content.innerHTML = renderMinecraft();
    } else if (state.view === "custom") {
      elements.content.innerHTML = renderCustomLibrary();
    } else if (state.view === "accounts") {
      elements.content.innerHTML = renderAccounts();
    } else if (state.view === "about") {
      elements.content.innerHTML = renderAbout();
    } else if (state.view === "categories") {
      elements.content.innerHTML = renderCategories();
    } else if (state.view === "settings") {
      elements.content.innerHTML = renderSettings();
      updateStorageEstimate();
    } else {
      elements.content.innerHTML = renderLibrary();
    }

    const contentRoot = elements.content.firstElementChild;
    if (
      animate &&
      contentRoot &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      contentRoot.classList.add("is-entering");
    }

    elements.content.scrollTop = preserveScroll ? previousScrollTop : 0;
  }

  function updateResourceSearchResults() {
    if (state.view === "studio") {
      window.ShijiStudio?.updateSearch(state.query);
      return;
    }

    if (
      !appIsReady ||
      !["all", "favorites", "recent", "minecraft", "custom"].includes(state.view)
    ) {
      return;
    }

    const resultRegion = document.querySelector("[data-resource-results]");
    if (!resultRegion) {
      renderContent({ animate: false, preserveScroll: true });
      return;
    }

    const base = searchResources(getViewBase(), state.query);
    const resources = filterAndSortResources(base);
    resultRegion.innerHTML = resources.length
      ? renderResourceCollection(resources)
      : renderEmptyState();

    document.querySelectorAll("[data-result-count]").forEach((element) => {
      element.textContent = `${resources.length} 条结果`;
    });

    if (state.view === "minecraft") {
      const typeCounts = { all: base.length };
      state.minecraftCategories.forEach((category) => {
        typeCounts[category.id] = 0;
      });
      base.forEach((resource) => {
        if (Object.prototype.hasOwnProperty.call(typeCounts, resource.minecraftType)) {
          typeCounts[resource.minecraftType] += 1;
        }
      });
      document.querySelectorAll("[data-filter-count]").forEach((element) => {
        element.textContent = String(typeCounts[element.dataset.filterCount] || 0);
      });
      document.querySelectorAll("[data-minecraft-stat]").forEach((element) => {
        element.textContent = String(typeCounts[element.dataset.minecraftStat] || 0);
      });
      return;
    }

    const typeCounts = countResourcesByType(base);
    document.querySelectorAll("[data-filter-count]").forEach((element) => {
      element.textContent = String(typeCounts[element.dataset.filterCount] || 0);
    });
    if (state.view === "custom") {
      const total = document.querySelector("[data-custom-library-count]");
      if (total) {
        total.textContent = String(resources.length);
      }
      document.querySelectorAll("[data-custom-library-stat]").forEach((element) => {
        element.textContent = String(
          typeCounts[element.dataset.customLibraryStat] || 0
        );
      });
    }
  }

  function scheduleResourceSearchUpdate() {
    window.clearTimeout(searchRenderTimer);
    searchRenderTimer = window.setTimeout(() => {
      searchRenderTimer = null;
      updateResourceSearchResults();
    }, 90);
  }

  function setView(view, categoryId = null, libraryId = null) {
    state.view = view;
    state.categoryId = categoryId;
    state.libraryId = view === "custom" ? libraryId : null;
    state.typeFilter = "all";
    state.minecraftType = "all";
    state.zoneFilter = "all";

    if (!["all", "favorites", "recent", "studio", "minecraft", "custom"].includes(view)) {
      state.query = "";
      elements.searchInput.value = "";
    }

    if (view === "custom") {
      const library = libraryById(libraryId);
      if (library) {
        state.layout = library.layout;
      }
    }

    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.view === view && !button.dataset.libraryId
      );
    });
    renderContent();
  }

  function openCategory(categoryId) {
    if (!categoryById(categoryId)) {
      showToast("这个分类已经不存在", true);
      return;
    }

    setView("all", categoryId);
  }

  async function toggleFavorite(resourceId) {
    const resource = resourceById(resourceId);
    if (!resource) {
      return;
    }

    const updated = {
      ...resource,
      favorite: !resource.favorite,
      updatedAt: Date.now()
    };

    try {
      await Store.saveResource(updated);
      state.resources = state.resources.map((item) =>
        item.id === resourceId ? updated : item
      );
      renderContent({ animate: false, preserveScroll: true });
      if (state.detailResourceId === resourceId && elements.detailDialog.open) {
        renderDetail();
      }
      showToast(updated.favorite ? "已加入收藏" : "已取消收藏");
    } catch (error) {
      showToast(error.message || "收藏状态保存失败", true);
    }
  }

  function renderDetail() {
    const resource = resourceById(state.detailResourceId);
    if (!resource) {
      elements.detailContent.innerHTML = `
        <div class="empty-state">
          <h2>资源不存在</h2>
          <p>它可能已经被删除。</p>
        </div>
      `;
      return;
    }

    const isMinecraft = resource.zone === "minecraft";
    const meta = isMinecraft ? minecraftMeta(resource) : TYPE_META[resource.type] || TYPE_META.note;
    const category = categoryById(resource.categoryId);
    const customLibrary = libraryForZone(resource.zone);
    const tone = resourceTone(resource);
    const isNote = resource.type === "note";
    const isLink = resource.type === "link";
    const isFile = resource.type === "file";
    const isLocalFile = isFile && Boolean(resource.localPath);

    const primaryAction = isLink
      ? `<button class="button button--primary" type="button" data-action="open-link" data-resource-id="${escapeHTML(resource.id)}">
          ${icon("external")}<span>打开链接</span>
        </button>`
      : isFile
        ? `<button class="button button--primary" type="button" data-action="${isLocalFile ? "open-local-file" : "download-file"}" data-resource-id="${escapeHTML(resource.id)}">
            ${icon(isLocalFile ? "external" : "download")}<span>${isLocalFile ? "打开文件" : "下载文件"}</span>
          </button>`
        : `<button class="button button--primary" type="button" data-action="edit-resource" data-resource-id="${escapeHTML(resource.id)}">
            ${icon("edit")}<span>编辑笔记</span>
          </button>`;

    const contentBlock = isLink
      ? `<div class="detail-content-block">
          <h2>资源链接</h2>
          <a class="link-value" href="${escapeHTML(resource.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(resource.url)}</a>
        </div>`
      : isFile
        ? `<div class="detail-content-block">
            <h2>${isLocalFile ? "本地文件索引" : "浏览器文件"}</h2>
            <div class="meta-box">
              <span>文件名</span>
              <strong>${escapeHTML(resource.fileName || "未命名文件")}</strong>
            </div>
            ${
              isLocalFile
                ? `<div class="meta-box path-box">
                    <span>文件位置</span>
                    <strong title="${escapeHTML(resource.localPath)}">${escapeHTML(resource.localPath)}</strong>
                  </div>`
                : ""
            }
          </div>`
        : `<div class="detail-content-block">
            <h2>笔记内容</h2>
            <div class="note-content">${escapeHTML(resource.description || "这条笔记还是空的。")}</div>
          </div>`;

    elements.detailContent.innerHTML = `
      <div class="detail-hero" style="--tone: ${safeColor(tone)}">
        <div class="detail-type-row">
          <span class="detail-type-badge">${icon(meta.icon)}${meta.label}</span>
          <span class="detail-date">更新于 ${formatRelativeTime(resource.updatedAt)}</span>
        </div>
        <h1>${escapeHTML(resource.title)}</h1>
        ${
          !isNote
            ? `<p>${escapeHTML(resource.description || "暂无补充说明。")}</p>`
            : ""
        }
        <div class="detail-meta">
          <div class="meta-box">
            <span>所属专区</span>
            <strong style="--tone: ${safeColor(tone)}">${escapeHTML(
              isMinecraft
                ? `我的世界 · ${meta.label}`
                : customLibrary?.name || category?.name || "未分类"
            )}</strong>
          </div>
          <div class="meta-box">
            <span>${isFile ? "文件大小" : "记录日期"}</span>
            <strong>${isFile ? formatBytes(resource.fileSize) : formatDate(resource.createdAt)}</strong>
          </div>
        </div>
        ${
          (resource.tags || []).length
            ? `<div class="detail-tags">
                ${resource.tags.map((tag) => `<span class="tag">#${escapeHTML(tag)}</span>`).join("")}
              </div>`
            : ""
        }
      </div>
      ${contentBlock}
      <div class="detail-actions">
        ${primaryAction}
        ${
          isNote
            ? ""
            : `<button class="button button--ghost" type="button" data-action="edit-resource" data-resource-id="${escapeHTML(resource.id)}">
                ${icon("edit")}<span>编辑</span>
              </button>`
        }
        ${
          isLocalFile
            ? `<button class="button button--danger resource-delete-source" type="button" data-action="delete-local-file-resource" data-resource-id="${escapeHTML(resource.id)}">
                ${icon("trash")}<span>删除电脑文件</span>
              </button>`
            : ""
        }
      </div>
      <div class="detail-action-icons">
        ${
          isLocalFile
            ? `<button class="icon-button" type="button" data-action="reveal-local-file" data-resource-id="${escapeHTML(resource.id)}" aria-label="在文件夹中显示" title="在文件夹中显示">
                ${icon("folder")}
              </button>
              <button class="icon-button" type="button" data-action="copy-local-path" data-resource-id="${escapeHTML(resource.id)}" aria-label="复制文件路径" title="复制文件路径">
                ${icon("copy")}
              </button>`
            : ""
        }
        <button
          class="icon-button${resource.favorite ? " is-favorite" : ""}"
          type="button"
          data-action="toggle-detail-favorite"
          data-resource-id="${escapeHTML(resource.id)}"
          aria-label="${resource.favorite ? "取消收藏" : "收藏资源"}"
          aria-pressed="${Boolean(resource.favorite)}"
        >${icon("star")}</button>
        <button class="icon-button" type="button" data-action="delete-resource" data-resource-id="${escapeHTML(resource.id)}" aria-label="仅从拾集移除资源" title="仅从拾集移除，不删除原文件">
          ${icon("trash")}
        </button>
      </div>
    `;
  }

  function openDetail(resourceId) {
    const resource = resourceById(resourceId);
    if (!resource) {
      return;
    }

    state.detailResourceId = resourceId;
    renderDetail();

    if (!elements.detailDialog.open) {
      elements.detailDialog.showModal();
    }
  }

  async function markOpened(resourceId) {
    const resource = resourceById(resourceId);
    if (!resource) {
      return;
    }

    const updated = { ...resource, openedAt: Date.now() };
    try {
      await Store.saveResource(updated);
      state.resources = state.resources.map((item) =>
        item.id === resourceId ? updated : item
      );
      if (state.view === "recent") {
        renderContent();
      }
      if (state.detailResourceId === resourceId && elements.detailDialog.open) {
        renderDetail();
      }
    } catch (error) {
      console.warn("Unable to update recent history:", error);
    }
  }

  function openLink(resourceId) {
    const resource = resourceById(resourceId);
    if (!resource || !isSafeStoredUrl(resource.url)) {
      showToast("这个链接地址无效", true);
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = resource.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    markOpened(resourceId);
  }

  function saveBlobToDevice(blob, fileName) {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  }

  async function openLocalFile(resourceId) {
    const resource = resourceById(resourceId);
    if (!resource?.localPath) {
      showToast("找不到本地文件路径", true);
      return;
    }
    if (!window.ShijiDesktop?.openFile) {
      showToast("打开本地文件仅在电脑版中可用", true);
      return;
    }
    try {
      const result = await window.ShijiDesktop.openFile(resource.localPath);
      if (!result?.ok) {
        throw new Error(result?.error || "原文件可能已被移动或删除");
      }
      markOpened(resourceId);
    } catch (error) {
      showToast(error.message || "无法打开原文件", true);
    }
  }

  async function revealLocalFile(resourceId) {
    const resource = resourceById(resourceId);
    if (!resource?.localPath) {
      showToast("找不到本地文件路径", true);
      return;
    }
    if (!window.ShijiDesktop?.revealFile) {
      showToast("定位文件仅在电脑版中可用", true);
      return;
    }
    try {
      await window.ShijiDesktop.revealFile(resource.localPath);
    } catch (error) {
      showToast(error.message || "原文件可能已被移动或删除", true);
    }
  }

  async function copyLocalPath(resourceId) {
    const resource = resourceById(resourceId);
    if (!resource?.localPath) {
      showToast("找不到可复制的本地路径", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(resource.localPath);
      showToast("文件路径已复制");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = resource.localPath;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      showToast("文件路径已复制");
    }
  }

  async function downloadFile(resourceId) {
    const resource = resourceById(resourceId);
    if (!resource || !(resource.fileBlob instanceof Blob)) {
      showToast("找不到这个文件，请重新上传", true);
      return;
    }

    try {
      await saveBlobToDevice(
        resource.fileBlob,
        resource.fileName || resource.title || "resource"
      );
      markOpened(resourceId);
      showToast("文件已开始下载");
    } catch (error) {
      showToast(error.message || "文件保存失败", true);
    }
  }

  async function deleteResource(resourceId) {
    const resource = resourceById(resourceId);
    if (!resource) {
      return;
    }

    const message = resource.localPath
      ? `确定从拾集中删除「${resource.title}」吗？原文件不会被删除。`
      : `确定删除「${resource.title}」吗？此操作无法撤销。`;
    if (state.confirmDelete && !window.confirm(message)) {
      return;
    }

    try {
      await Store.deleteResource(resourceId);
      state.resources = state.resources.filter((item) => item.id !== resourceId);
      if (state.detailResourceId === resourceId) {
        elements.detailDialog.close();
        state.detailResourceId = null;
      }
      renderContent();
      showToast("资源已删除");
    } catch (error) {
      showToast(error.message || "删除失败", true);
    }
  }

  async function deleteLocalFileResource(resourceId) {
    const resource = resourceById(resourceId);
    if (!resource?.localPath) {
      showToast("找不到要删除的本地文件", true);
      return;
    }
    if (!window.ShijiDesktop?.trashFile) {
      showToast("删除源文件仅在电脑版中可用", true);
      return;
    }
    const targets = [];
    const seen = new Set();
    for (const targetPath of [resource.localPath, resource.sourcePath].filter(Boolean)) {
      const key = targetPath.toLocaleLowerCase("zh-CN");
      if (seen.has(key) || !window.ShijiDesktop?.getFileInfo) {
        continue;
      }
      seen.add(key);
      try {
        const info = await window.ShijiDesktop.getFileInfo(targetPath);
        targets.push(info);
      } catch {
        // Ignore stale paths while keeping the current accessible file deletable.
      }
    }
    if (!targets.length) {
      showToast("找不到可删除的本地文件", true);
      return;
    }
    const totalSize = targets.reduce((sum, item) => sum + item.size, 0);
    const confirmed = window.confirm(
      `删除「${resource.title}」关联的 ${targets.length} 个电脑文件？\n\n大小：${formatBytes(totalSize)}\n复制入库时保留的原文件也会一并处理。文件会移入 Windows 回收站，同时从拾集中移除。`
    );
    if (!confirmed) {
      return;
    }
    try {
      const failures = [];
      let deletedCount = 0;
      for (const target of targets) {
        try {
          await window.ShijiDesktop.trashFile(target.path);
          deletedCount += 1;
        } catch (error) {
          failures.push(error);
        }
      }
      if (!deletedCount) {
        throw failures[0] || new Error("无法删除源文件");
      }
      await Store.deleteResource(resourceId);
      state.resources = state.resources.filter((item) => item.id !== resourceId);
      if (state.detailResourceId === resourceId) {
        elements.detailDialog.close();
        state.detailResourceId = null;
      }
      renderContent();
      showToast(
        failures.length
          ? `${deletedCount} 个文件已删除，${failures.length} 个失败`
          : `${deletedCount} 个电脑文件已移入 Windows 回收站`,
        failures.length > 0
      );
    } catch (error) {
      showToast(error.message || "无法删除原文件", true);
    }
  }

  function fillCategorySelect(selectedId) {
    const select = document.getElementById("resource-category");
    select.innerHTML = state.categories
      .map(
        (category) => `
          <option value="${escapeHTML(category.id)}"${category.id === selectedId ? " selected" : ""}>
            ${escapeHTML(category.name)}
          </option>
        `
      )
      .join("");
    syncCustomSelect(select);
  }

  function fillMinecraftCategorySelect(selectedId) {
    const select = document.getElementById("minecraft-type");
    const fallback = minecraftCategoryFallback();
    select.innerHTML = state.minecraftCategories
      .map(
        (category) => `
          <option value="${escapeHTML(category.id)}"${category.id === selectedId ? " selected" : ""}>
            ${escapeHTML(category.label)}
          </option>
        `
      )
      .join("");
    select.value =
      state.minecraftCategories.some((category) => category.id === selectedId)
        ? selectedId
        : fallback.id;
    syncCustomSelect(select);
    updateMinecraftTagPresets();
  }

  function updateMinecraftTagPresets() {
    const section = document.getElementById("tag-preset-section");
    const optionsElement = document.getElementById("tag-preset-options");
    const hint = document.getElementById("tag-preset-hint");
    const zone = document.getElementById("resource-zone")?.value;
    if (!section || !optionsElement || zone !== "minecraft") {
      if (section) {
        section.hidden = true;
      }
      return;
    }
    const type = document.getElementById("minecraft-type")?.value || "map";
    const presets = MINECRAFT_TAG_PRESETS[type] || ["实用", "推荐", "待整理"];
    const currentTags = parseTags(
      document.getElementById("resource-tags")?.value || ""
    );
    const categoryLabel = minecraftCategoryById(type).label;
    section.hidden = false;
    if (hint) {
      hint.textContent = `${categoryLabel}常用标签，点击可添加或取消`;
    }
    optionsElement.innerHTML = presets
      .map(
        (tag) => `
          <button
            class="tag-preset-button${currentTags.includes(tag) ? " is-active" : ""}"
            type="button"
            data-tag-preset="${escapeHTML(tag)}"
            aria-pressed="${currentTags.includes(tag)}"
          >#${escapeHTML(tag)}</button>
        `
      )
      .join("");
  }

  function toggleMinecraftTagPreset(tag) {
    const input = document.getElementById("resource-tags");
    if (!input || !tag) {
      return;
    }
    const tags = parseTags(input.value);
    const next = tags.includes(tag)
      ? tags.filter((item) => item !== tag)
      : [...tags, tag];
    input.value = next.join(", ");
    updateMinecraftTagPresets();
  }

  function updateDescriptionField(type) {
    const label = document.getElementById("description-label");
    const hint = document.getElementById("description-hint");
    const description = document.getElementById("resource-description");

    if (type === "note") {
      label.innerHTML = '笔记内容 <em>*</em>';
      hint.textContent = "支持多段文字，内容也会参与搜索";
      description.placeholder = "写下值得保留的想法、步骤或摘录…";
      description.rows = 8;
    } else if (type === "file") {
      label.textContent = "备注";
      hint.textContent = "说明文件用途，便于以后检索";
      description.placeholder = "这个文件适合用在哪里？";
      description.rows = 3;
    } else {
      label.textContent = "简介";
      hint.textContent = "一句话说明用途";
      description.placeholder = "补充一些便于以后检索的信息";
      description.rows = 4;
    }
  }

  function normalizeResourceZone(zone) {
    if (zone === "minecraft") {
      return "minecraft";
    }
    return libraryForZone(zone) ? zone : "library";
  }

  function fillResourceZoneSelect(selectedZone = "library") {
    const select = document.getElementById("resource-zone");
    const normalizedZone = normalizeResourceZone(selectedZone);
    select.innerHTML = [
      `<option value="library">通用资源库</option>`,
      `<option value="minecraft">我的世界</option>`,
      ...state.libraries.map(
        (library) =>
          `<option value="${escapeHTML(libraryZoneId(library.id))}">${escapeHTML(library.name)}</option>`
      )
    ].join("");
    select.value = normalizedZone;
    syncCustomSelect(select);
  }

  function updateResourceTypeAccess(zone, resource = null) {
    const library = libraryForZone(zone);
    const allowedTypes = libraryAllowedTypes(library);
    const passwordButton = document.querySelector(
      '.type-option[data-open-password-vault]'
    );
    if (passwordButton) {
      passwordButton.hidden = Boolean(library) && !library.includeAccounts;
    }
    let visibleCount = passwordButton?.hidden ? 0 : 1;
    document.querySelectorAll("[data-resource-type]").forEach((button) => {
      const allowed = allowedTypes.includes(button.dataset.resourceType);
      button.hidden = !allowed;
      button.disabled = !allowed;
      if (allowed) {
        visibleCount += 1;
      }
    });
    const switcher = document.querySelector(".type-switcher");
    if (switcher) {
      switcher.style.gridTemplateColumns = `repeat(${Math.max(1, visibleCount)}, minmax(0, 1fr))`;
    }
    const currentType =
      resource?.type || document.getElementById("resource-type").value || "link";
    if (!allowedTypes.includes(currentType)) {
      updateResourceType(allowedTypes[0] || "link", resource);
    }
  }

  function updateResourceType(type, resource = resourceById(state.editingResourceId)) {
    const normalizedType = TYPE_META[type] ? type : "link";
    document.getElementById("resource-type").value = normalizedType;

    document.querySelectorAll("[data-resource-type]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.resourceType === normalizedType);
    });

    document.querySelectorAll("[data-field-for]").forEach((field) => {
      field.hidden = field.dataset.fieldFor !== normalizedType;
    });

    updateDescriptionField(normalizedType);

    const fileTitle = document.getElementById("file-drop-title");
    const fileMeta = document.getElementById("file-drop-meta");
    if (normalizedType === "file" && !selectedFile && !selectedLocalFile) {
      if (resource?.localPath) {
        fileTitle.textContent = resource.fileName;
        fileMeta.textContent = `${formatBytes(resource.fileSize)} · 本地路径 · 点击选择新文件替换`;
      } else if (resource?.fileName && resource?.fileBlob instanceof Blob) {
        fileTitle.textContent = resource.fileName;
        fileMeta.textContent = `${formatBytes(resource.fileSize)} · 点击选择新文件替换`;
      } else {
        fileTitle.textContent = "拖入文件，或点击选择";
        fileMeta.textContent = FILE_HELP_TEXT;
      }
    }
  }

  function updateResourceZone(zone, resource = resourceById(state.editingResourceId)) {
    const normalizedZone = normalizeResourceZone(zone);
    const isMinecraft = normalizedZone === "minecraft";
    const customLibrary = libraryForZone(normalizedZone);
    document.getElementById("resource-zone").value = normalizedZone;
    syncCustomSelect(document.getElementById("resource-zone"));
    document.getElementById("resource-category-field").hidden = isMinecraft;
    document.getElementById("minecraft-type-field").hidden = !isMinecraft;
    fillMinecraftCategorySelect(
      resource?.minecraftType || minecraftCategoryFallback().id
    );
    document.getElementById("resource-dialog-title").textContent = resource
      ? "编辑资源"
      : isMinecraft
        ? "添加 Minecraft 内容"
        : customLibrary
          ? `添加到「${customLibrary.name}」`
          : "添加资源";
    document.getElementById("resource-submit").querySelector("span").textContent =
      resource
        ? "保存修改"
        : isMinecraft
          ? "保存到我的世界"
          : customLibrary
            ? "保存到专区"
            : "保存资源";
    updateResourceTypeAccess(normalizedZone, resource);

    if (selectedFile) {
      if (isMinecraft) {
        void setSelectedFile(selectedFile);
      } else {
        mergeDetectedTags([]);
        document.getElementById("file-drop-meta").textContent =
          `${formatBytes(selectedFile.size)} · 已准备保存`;
      }
    } else if (selectedLocalFile) {
      if (isMinecraft) {
        void setSelectedLocalFile(selectedLocalFile);
      } else {
        mergeDetectedTags([]);
        document.getElementById("file-drop-meta").textContent =
          `${formatBytes(selectedLocalFile.size)} · 本地路径索引`;
      }
    }
  }

  function resetResourceForm() {
    elements.resourceForm.reset();
    selectedFile = null;
    selectedLocalFile = null;
    autoDetectedTags = [];
    document.getElementById("resource-id").value = "";
    document.getElementById("resource-type").value = "link";
    fillResourceZoneSelect("library");
    document.getElementById("minecraft-type").value = "map";
    document.getElementById("resource-date").value = toDateInputValue(Date.now());
    syncDatePicker();
    document.getElementById("description-count").textContent = "0 / 1200";
    document.getElementById("resource-form-error").textContent = "";
    document.getElementById("resource-file").value = "";
    document.getElementById("file-drop-title").textContent = "拖入文件，或点击选择";
    document.getElementById("file-drop-meta").textContent = FILE_HELP_TEXT;
    ["resource-zone", "minecraft-type", "resource-category"].forEach((id) => {
      syncCustomSelect(document.getElementById(id));
    });
    elements.resourceForm.querySelectorAll("[aria-invalid='true']").forEach((field) => {
      field.removeAttribute("aria-invalid");
    });
  }

  function openResourceDialog(resource = null, presetType = "link", presetZone = "library") {
    resetResourceForm();
    state.editingResourceId = resource?.id || null;

    fillCategorySelect(resource?.categoryId || state.categoryId || state.categories[0]?.id);
    fillMinecraftCategorySelect(
      resource?.minecraftType || minecraftCategoryFallback().id
    );

    if (resource) {
      document.getElementById("resource-id").value = resource.id;
      document.getElementById("resource-title").value = resource.title || "";
      document.getElementById("resource-url").value = resource.url || "";
      document.getElementById("resource-description").value = resource.description || "";
      document.getElementById("resource-tags").value = (resource.tags || []).join(", ");
      document.getElementById("resource-date").value = toDateInputValue(resource.createdAt);
      document.getElementById("description-count").textContent =
        `${(resource.description || "").length} / 1200`;
      updateResourceType(resource.type, resource);
      updateResourceZone(resource.zone || "library", resource);
    } else {
      updateResourceType(presetType, null);
      updateResourceZone(presetZone, null);
    }
    syncDatePicker();

    if (!elements.resourceDialog.open) {
      elements.resourceDialog.showModal();
    }
    const backButton = document.getElementById("resource-editor-back");
    if (backButton) {
      backButton.hidden = !resourceEditorReturnResourceId;
    }
    document.getElementById("first-resource-guide").hidden =
      !firstResourceGuideActive;

    window.setTimeout(() => document.getElementById("resource-title").focus(), 80);
  }

  function closeDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog?.open) {
      dialog.close();
    }
    if (dialogId === "detail-dialog") {
      state.detailResourceId = null;
    }
  }

  function inferMinecraftTypeFromName(fileName) {
    const name = fileName.toLocaleLowerCase("zh-CN");
    const rules = [
      [
        "modpack",
        ["modpack", "整合包", "curseforge", "feedthebeast", "all the mods", "ftb", "mrpack"]
      ],
      [
        "shader",
        [
          "shader",
          "光影",
          "complementary",
          "bsl",
          "seus",
          "photon",
          "rethinking",
          "bliss",
          "kappa",
          "sildur",
          "chocapic",
          "solas",
          "makeup"
        ]
      ],
      [
        "resourcepack",
        [
          "resourcepack",
          "resource_pack",
          "texturepack",
          "texture_pack",
          "texture",
          "材质",
          "faithful",
          "staytrue",
          "stay true",
          "vanilla tweaks",
          "16x",
          "32x",
          "64x",
          "128x",
          "256x"
        ]
      ],
      ["map", ["map", "地图", "world", "存档", "adventure", "parkour", "ctm"]],
      [
        "mod",
        ["mod", "模组", "fabric", "forge", "neoforge", "quilt", "iris", "sodium", "optifine"]
      ]
    ];

    return rules.find(([, keywords]) =>
      keywords.some((keyword) => name.includes(keyword))
    )?.[0];
  }

  async function readArchiveEntryNames(file) {
    if (typeof file.arrayBuffer !== "function") {
      return [];
    }
    if (!/\.(zip|jar|mcpack|mcworld|mctemplate|mrpack|modpack)$/i.test(file.name)) {
      return [];
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const decoder = new TextDecoder();
    let endOffset = -1;
    const scanStart = Math.max(0, bytes.length - 65557);

    for (let offset = bytes.length - 22; offset >= scanStart; offset -= 1) {
      if (view.getUint32(offset, true) === 0x06054b50) {
        endOffset = offset;
        break;
      }
    }
    if (endOffset < 0) {
      return [];
    }

    let offset = view.getUint32(endOffset + 16, true);
    const entryCount = view.getUint16(endOffset + 10, true);
    const entries = [];

    for (let index = 0; index < entryCount && offset + 46 <= bytes.length; index += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) {
        break;
      }
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const nameStart = offset + 46;
      const nameEnd = nameStart + nameLength;
      if (nameEnd > bytes.length) {
        break;
      }
      entries.push(
        decoder.decode(bytes.subarray(nameStart, nameEnd)).replaceAll("\\", "/").toLowerCase()
      );
      offset = nameEnd + extraLength + commentLength;
    }

    return entries;
  }

  function inferMinecraftTypeFromEntries(entries) {
    const has = (pattern) => entries.some((entry) => pattern.test(entry));
    if (
      has(/^(modrinth\.index\.json|manifest\.json|instance\.cfg)$/) ||
      has(/^overrides\//) ||
      (has(/^mods\//) && entries.some((entry) => /\.(jar)$/.test(entry)))
    ) {
      return "modpack";
    }
    if (has(/(^|\/)shaders\//) || has(/shaderpack/)) {
      return "shader";
    }
    if (has(/(^|\/)level\.dat$/) || has(/(^|\/)region\//)) {
      return "map";
    }
    if (
      has(/^(fabric\.mod\.json|quilt\.mod\.json|mcmod\.info|meta-inf\/mods\.toml)$/)
    ) {
      return "mod";
    }
    if (
      has(/^assets\/minecraft\/textures\//) ||
      has(/^pack\.mcmeta$/) ||
      has(/^font\//)
    ) {
      return "resourcepack";
    }
    return null;
  }

  async function detectMinecraftFile(file, archiveEntries = null) {
    const dotIndex = file.name.lastIndexOf(".");
    const extension = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
    let minecraftType = inferMinecraftTypeFromName(file.name);
    let entries = Array.isArray(archiveEntries) ? archiveEntries : [];

    if (!Array.isArray(archiveEntries)) {
      try {
        entries = await readArchiveEntryNames(file);
      } catch (error) {
        console.warn("Unable to inspect Minecraft archive:", error);
      }
    }

    minecraftType =
      inferMinecraftTypeFromEntries(entries) ||
      minecraftType ||
      (extension === ".jar"
        ? "mod"
        : extension === ".mrpack"
          ? "modpack"
          : [".mcworld", ".mctemplate"].includes(extension)
            ? "map"
            : extension === ".mcpack"
              ? "resourcepack"
              : extension === ".zip"
                ? "resourcepack"
                : null);

    const tags = [];
    if (minecraftType) {
      minecraftType = minecraftCategoryById(minecraftType).id;
      tags.push(minecraftCategoryById(minecraftType).label);
    }
    const version = file.name.match(/(?<!\d)(1\.\d{1,2}(?:\.\d{1,2})?)(?!\d)/);
    if (version) {
      tags.push(version[1]);
    }
    const lowerName = file.name.toLowerCase();
    const loader = lowerName.includes("neoforge")
      ? "NeoForge"
      : lowerName.includes("fabric")
        ? "Fabric"
        : lowerName.includes("quilt")
          ? "Quilt"
          : lowerName.includes("forge")
            ? "Forge"
            : "";
    if (loader) {
      tags.push(loader);
    }

    return { minecraftType, tags };
  }

  function mergeDetectedTags(tags) {
    const input = document.getElementById("resource-tags");
    const current = parseTags(input.value).filter(
      (tag) => !autoDetectedTags.includes(tag)
    );
    const merged = [...current, ...tags].filter(
      (tag, index, values) => values.indexOf(tag) === index
    );
    autoDetectedTags = tags;
    input.value = merged.join(", ");
    updateMinecraftTagPresets();
  }

  async function setSelectedFile(file) {
    const title = document.getElementById("file-drop-title");
    const meta = document.getElementById("file-drop-meta");

    if (!file) {
      selectedFile = null;
      selectedLocalFile = null;
      autoDetectedTags = [];
      title.textContent = "拖入文件，或点击选择";
      meta.textContent = FILE_HELP_TEXT;
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      selectedFile = null;
      selectedLocalFile = null;
      document.getElementById("resource-file").value = "";
      title.textContent = "拖入文件，或点击选择";
      meta.textContent = FILE_HELP_TEXT;
      showToast("单个文件不能超过 50 MB", true);
      return;
    }

    selectedFile = file;
    selectedLocalFile = null;
    title.textContent = file.name;
    meta.textContent = `${formatBytes(file.size)} · 正在识别资源类型…`;
    document.getElementById("resource-type").value = "file";
    updateResourceType("file");
    mergeDetectedTags([]);

    if (document.getElementById("resource-zone").value !== "minecraft") {
      meta.textContent = `${formatBytes(file.size)} · 已准备保存`;
      return;
    }

    const titleInput = document.getElementById("resource-title");
    if (!titleInput.value.trim()) {
      titleInput.value = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]+/g, " ")
        .trim()
        .slice(0, 100);
    }

    const detection = await detectMinecraftFile(file);
    if (selectedFile !== file) {
      return;
    }
    if (detection.minecraftType) {
      document.getElementById("minecraft-type").value = detection.minecraftType;
      mergeDetectedTags(detection.tags);
      const label = minecraftCategoryById(detection.minecraftType).label;
      meta.textContent = `${formatBytes(file.size)} · 已识别为${label}`;
      showToast(`已自动识别为「${label}」`);
    } else {
      meta.textContent = `${formatBytes(file.size)} · 未识别类型，请手动选择`;
    }
  }

  async function setSelectedLocalFile(fileInfo) {
    if (!fileInfo?.path) {
      return;
    }

    selectedFile = null;
    selectedLocalFile = fileInfo;
    autoDetectedTags = [];
    const title = document.getElementById("file-drop-title");
    const meta = document.getElementById("file-drop-meta");
    title.textContent = fileInfo.name;
    meta.textContent = `${formatBytes(fileInfo.size)} · 本地路径索引 · 正在识别资源类型…`;
    document.getElementById("resource-type").value = "file";
    updateResourceType("file");
    mergeDetectedTags([]);

    const titleInput = document.getElementById("resource-title");
    if (!titleInput.value.trim()) {
      titleInput.value = fileInfo.name
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]+/g, " ")
        .trim()
        .slice(0, 100);
    }

    if (document.getElementById("resource-zone").value !== "minecraft") {
      meta.textContent = `${formatBytes(fileInfo.size)} · 本地路径索引`;
      return;
    }

    let archiveEntries = null;
    if (window.ShijiDesktop?.inspectArchive) {
      try {
        archiveEntries = await window.ShijiDesktop.inspectArchive(fileInfo.path);
      } catch (error) {
        console.warn("Unable to inspect local Minecraft archive:", error);
      }
    }
    const detection = await detectMinecraftFile(
      { name: fileInfo.name },
      archiveEntries
    );
    if (selectedLocalFile !== fileInfo) {
      return;
    }
    if (detection.minecraftType) {
      document.getElementById("minecraft-type").value = detection.minecraftType;
      mergeDetectedTags(detection.tags);
      const label = minecraftCategoryById(detection.minecraftType).label;
      meta.textContent = `${formatBytes(fileInfo.size)} · 本地路径 · 已识别为${label}`;
      showToast(`已自动识别为「${label}」`);
    } else {
      meta.textContent = `${formatBytes(fileInfo.size)} · 本地路径 · 未识别类型`;
    }
  }

  async function handleIncomingFile(file) {
    if (!file) {
      await setSelectedFile(null);
      return;
    }
    if (window.ShijiDesktop?.getPathForFile && window.ShijiDesktop?.getFileInfo) {
      try {
        const filePath = window.ShijiDesktop.getPathForFile(file);
        if (filePath) {
          const fileInfo = await window.ShijiDesktop.getFileInfo(filePath);
          await setSelectedLocalFile(fileInfo);
          return;
        }
      } catch (error) {
        showToast(error.message || "无法读取文件路径", true);
        return;
      }
    }
    await setSelectedFile(file);
  }

  async function submitResourceForm(event) {
    event.preventDefault();
    const form = elements.resourceForm;
    const errorElement = document.getElementById("resource-form-error");
    const submitButton = document.getElementById("resource-submit");
    const previousResources = state.resources.slice();
    errorElement.textContent = "";

    const existing = state.editingResourceId
      ? resourceById(state.editingResourceId)
      : null;
    const type = document.getElementById("resource-type").value;
    const zone = normalizeResourceZone(
      document.getElementById("resource-zone").value
    );
    const title = document.getElementById("resource-title").value.trim();
    const rawUrl = document.getElementById("resource-url").value.trim();
    const description = document.getElementById("resource-description").value.trim();
    const categoryId = document.getElementById("resource-category").value;
    const tags = parseTags(document.getElementById("resource-tags").value);
    const recordDate = fromDateInputValue(document.getElementById("resource-date").value);
    const fileInput = document.getElementById("resource-file");

    form.querySelectorAll("[aria-invalid='true']").forEach((field) => {
      field.removeAttribute("aria-invalid");
    });

    if (!title) {
      document.getElementById("resource-title").setAttribute("aria-invalid", "true");
      errorElement.textContent = "请填写资源名称。";
      document.getElementById("resource-title").focus();
      return;
    }

    if (type === "link") {
      if (!normalizeUrl(rawUrl)) {
        document.getElementById("resource-url").setAttribute("aria-invalid", "true");
        errorElement.textContent = "请填写有效的 HTTP 或 HTTPS 链接。";
        document.getElementById("resource-url").focus();
        return;
      }
    }

    if (type === "note" && !description) {
      document.getElementById("resource-description").setAttribute("aria-invalid", "true");
      errorElement.textContent = "请填写笔记内容。";
      document.getElementById("resource-description").focus();
      return;
    }
    const targetLibrary = libraryForZone(zone);
    if (
      targetLibrary &&
      !libraryAllowedTypes(targetLibrary).includes(type)
    ) {
      errorElement.textContent = "这个专区不允许添加当前类型的内容。";
      return;
    }

    const pickedFile = fileInput.files?.[0] || selectedFile;
    const pickedLocalFile = selectedLocalFile;
    const existingFileIsValid =
      existing?.fileBlob instanceof Blob || Boolean(existing?.localPath);
    if (type === "file" && !pickedFile && !pickedLocalFile && !existingFileIsValid) {
      errorElement.textContent = "请选择要索引的文件。";
      document.getElementById("file-drop").scrollIntoView({ block: "center" });
      return;
    }

    if (zone === "library" && !categoryId) {
      errorElement.textContent = "请选择资源分类。";
      document.getElementById("resource-category").focus();
      return;
    }

    submitButton.disabled = true;
    const now = Date.now();
    let managedLocalFile = pickedLocalFile;
    let managedSourcePath =
      existing?.sourcePath || (pickedLocalFile ? pickedLocalFile.path : "");
    if (
      pickedLocalFile &&
      window.ResourceLibrary?.isConfigured()
    ) {
      const targetCategory = categoryById(categoryId);
      const targetMinecraftType = document.getElementById("minecraft-type").value;
      try {
        managedLocalFile = await window.ResourceLibrary.importFile(
          pickedLocalFile,
          zone === "minecraft"
            ? window.ResourceLibrary.minecraftAssetFolder(targetMinecraftType)
            : window.ResourceLibrary.genericAssetFolder(
                targetCategory?.name || "未分类"
              )
        );
        managedSourcePath =
          managedLocalFile.originalPath || pickedLocalFile.path;
      } catch (fileError) {
        errorElement.textContent =
          fileError.message || "文件无法加入素材库。";
        submitButton.disabled = false;
        return;
      }
    }
    const resource = {
      id: existing?.id || Store.makeId(),
      type,
      zone,
      minecraftType:
        zone === "minecraft"
          ? document.getElementById("minecraft-type").value
          : null,
      title,
      url: type === "link" ? normalizeUrl(rawUrl) : "",
      description,
      categoryId: zone === "minecraft" ? null : categoryId,
      tags,
      favorite: Boolean(existing?.favorite),
      createdAt: existing?.createdAt || recordDate,
      updatedAt: now,
      openedAt: existing?.openedAt || null,
      fileName:
        type === "file"
          ? managedLocalFile?.name || pickedFile?.name || existing?.fileName || ""
          : "",
      fileSize:
        type === "file"
          ? managedLocalFile?.size || pickedFile?.size || existing?.fileSize || 0
          : 0,
      fileType:
        type === "file"
          ? pickedFile?.type || existing?.fileType || "application/octet-stream"
          : "",
      localPath:
        type === "file"
          ? managedLocalFile?.path ||
            (!pickedFile ? existing?.localPath || "" : "")
          : "",
      sourcePath: type === "file" ? managedSourcePath : "",
      storageMode:
        type === "file"
          ? managedLocalFile?.path
            ? "path"
            : pickedFile || existing?.fileBlob instanceof Blob
              ? "embedded"
              : ""
          : "",
      fileBlob:
        type === "file" && !managedLocalFile
          ? pickedFile || existing?.fileBlob || null
          : null
    };

    try {
      await Store.saveResource(resource);
      state.resources = existing
        ? state.resources.map((item) => (item.id === resource.id ? resource : item))
        : [...state.resources, resource];
      if (!existing && zone === "minecraft" && state.view === "minecraft") {
        state.minecraftType = resource.minecraftType || "all";
      }
      elements.resourceDialog.close();
      state.editingResourceId = null;
      renderContent();
      showToast(existing ? "资源已更新" : "资源已保存");
      if (!existing && firstResourceGuideActive) {
        firstResourceGuideActive = false;
        markWelcomeSeen();
        showToast("第一条资源已创建，可以继续添加或开始整理。");
      }
      if (state.detailResourceId === resource.id && elements.detailDialog.open) {
        renderDetail();
      }
    } catch (error) {
      state.resources = previousResources;
      errorElement.textContent = error.message || "保存失败，请稍后再试。";
    } finally {
      submitButton.disabled = false;
    }
  }

  function normalizeVaultAccounts(accounts) {
    if (!Array.isArray(accounts)) {
      return [];
    }

    return accounts
      .filter(
        (account) =>
          account &&
          typeof account === "object" &&
          String(account.platform || "").trim() &&
          String(account.username || "").trim() &&
          String(account.password || "")
      )
      .map((account) => ({
        id: String(account.id || Store.makeId()),
        platform: String(account.platform).slice(0, 60),
        username: String(account.username).slice(0, 160),
        password: String(account.password).slice(0, 256),
        website: isSafeStoredUrl(normalizeUrl(account.website))
          ? normalizeUrl(account.website)
          : "",
        category: state.accountCategories.some(
          (item) => item.id === account.category
        )
          ? account.category
          : accountCategoryFallback().id,
        note: String(account.note || "").slice(0, 600),
        iconUrl: sanitizeIconUrl(account.iconUrl) || faviconUrlForWebsite(account.website),
        iconBuiltin: ACCOUNT_ICON_CHOICES.has(account.iconBuiltin)
          ? account.iconBuiltin
          : "",
        iconMode: ["auto", "custom", "builtin", "none"].includes(account.iconMode)
          ? account.iconMode
          : "auto",
        createdAt: Number(account.createdAt) || Date.now(),
        updatedAt: Number(account.updatedAt) || Date.now()
      }));
  }

  async function persistVault() {
    const record = {
      id: "accounts",
      version: 1,
      accounts: state.vaultAccounts,
      updatedAt: Date.now()
    };
    await Store.saveVault(record);
  }

  function fillAccountCategorySelect(selectedId) {
    const select = document.getElementById("account-category");
    select.innerHTML = state.accountCategories
      .map(
        (category) => `
          <option value="${escapeHTML(category.id)}"${category.id === selectedId ? " selected" : ""}>
            ${escapeHTML(category.label)}
          </option>
        `
      )
      .join("");
    syncCustomSelect(select);
  }

  function openAccountDialog(account = null) {
    elements.accountForm.reset();
    fillAccountCategorySelect(account?.category || accountCategoryFallback().id);
    document.getElementById("account-id").value = account?.id || "";
    document.getElementById("account-platform").value = account?.platform || "";
    document.getElementById("account-username").value = account?.username || "";
    document.getElementById("account-password").value = account?.password || "";
    document.getElementById("account-password").type = "password";
    elements.accountForm
      .querySelector('[data-action="toggle-account-form-password"] use')
      ?.setAttribute("href", "#icon-eye");
    document.getElementById("account-website").value = account?.website || "";
    const iconMode = account
      ? account.iconMode || (account.iconUrl ? "auto" : "none")
      : state.autoIconDefault
        ? "auto"
        : "none";
    document.getElementById("account-icon-mode").value = iconMode;
    document.getElementById("account-icon-auto").checked = iconMode === "auto";
    document.getElementById("account-icon-url").value = account?.iconUrl || "";
    document.getElementById("account-icon-builtin").value =
      account?.iconBuiltin || "";
    updateAccountIconPreview(
      account?.website || "",
      iconMode === "auto" ? account?.iconUrl || "" : ""
    );
    document.getElementById("account-category").value =
      account?.category || accountCategoryFallback().id;
    document.getElementById("account-note").value = account?.note || "";
    document.getElementById("account-form-error").textContent = "";
    document.getElementById("account-dialog-title").textContent = account
      ? "编辑账号"
      : "添加账号";
    elements.accountForm.querySelector('button[type="submit"]').textContent = account
      ? "保存修改"
      : "保存到保险箱";

    if (!elements.accountDialog.open) {
      elements.accountDialog.showModal();
    }
    window.setTimeout(() => document.getElementById("account-platform").focus(), 80);
  }

  function generatePassword(length = 20) {
    const groups = [
      "abcdefghijkmnopqrstuvwxyz",
      "ABCDEFGHJKLMNPQRSTUVWXYZ",
      "23456789",
      "!@#$%^&*_-+="
    ];
    const all = groups.join("");
    const randomIndex = (limit) => {
      const random = crypto.getRandomValues(new Uint32Array(1))[0];
      return random % limit;
    };
    const characters = groups.map((group) => group[randomIndex(group.length)]);
    while (characters.length < length) {
      characters.push(all[randomIndex(all.length)]);
    }
    for (let index = characters.length - 1; index > 0; index -= 1) {
      const target = randomIndex(index + 1);
      [characters[index], characters[target]] = [characters[target], characters[index]];
    }
    return characters.join("");
  }

  async function submitAccountForm(event) {
    event.preventDefault();
    const existing = accountById(document.getElementById("account-id").value);
    const platform = document.getElementById("account-platform").value.trim();
    const username = document.getElementById("account-username").value.trim();
    const password = document.getElementById("account-password").value;
    const rawWebsite = document.getElementById("account-website").value.trim();
    const website = rawWebsite ? normalizeUrl(rawWebsite) : "";
    const category = document.getElementById("account-category").value;
    const note = document.getElementById("account-note").value.trim();
    const iconMode = document.getElementById("account-icon-mode").value;
    const iconUrl =
      iconMode === "none" || iconMode === "builtin"
        ? ""
        : sanitizeIconUrl(document.getElementById("account-icon-url").value) ||
          (iconMode === "auto" ? faviconUrlForWebsite(website) : "");
    const iconBuiltin =
      iconMode === "builtin" &&
      ACCOUNT_ICON_CHOICES.has(
        document.getElementById("account-icon-builtin").value
      )
        ? document.getElementById("account-icon-builtin").value
        : "";
    const errorElement = document.getElementById("account-form-error");
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    errorElement.textContent = "";

    if (!platform || !username || !password) {
      errorElement.textContent = "平台名称、账号和密码都需要填写。";
      return;
    }
    if (rawWebsite && !website) {
      errorElement.textContent = "登录网址需要以 http:// 或 https:// 开头。";
      return;
    }

    const now = Date.now();
    const account = {
      id: existing?.id || Store.makeId(),
      platform: platform.slice(0, 60),
      username: username.slice(0, 160),
      password: password.slice(0, 256),
      website,
      category: state.accountCategories.some((item) => item.id === category)
        ? category
        : accountCategoryFallback().id,
      note: note.slice(0, 600),
      iconUrl,
      iconBuiltin,
      iconMode,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    const previousAccounts = state.vaultAccounts.slice();
    state.vaultAccounts = existing
      ? state.vaultAccounts.map((item) => (item.id === account.id ? account : item))
      : [...state.vaultAccounts, account];

    submitButton.disabled = true;
    try {
      await persistVault();
      elements.accountDialog.close();
      if (!existing) {
        state.revealedAccountIds.delete(account.id);
      }
      renderContent();
      showToast(existing ? "账号信息已更新" : "账号已保存");
    } catch (error) {
      state.vaultAccounts = previousAccounts;
      errorElement.textContent = error.message || "保存失败，请稍后再试。";
    } finally {
      submitButton.disabled = false;
    }
  }

  async function deleteAccount(accountId) {
    const account = accountById(accountId);
    if (
      !account ||
      (state.confirmDelete &&
        !window.confirm(`确定删除「${account.platform}」账号吗？`))
    ) {
      return;
    }

    const previousAccounts = state.vaultAccounts.slice();
    state.vaultAccounts = state.vaultAccounts.filter((item) => item.id !== accountId);
    try {
      await persistVault();
      state.revealedAccountIds.delete(accountId);
      renderContent();
      showToast("账号已删除");
    } catch (error) {
      state.vaultAccounts = previousAccounts;
      showToast(error.message || "删除失败", true);
    }
  }

  function renderLibraryEditorChoices(source) {
    document.getElementById("library-template-options").innerHTML = Object.entries(
      LIBRARY_TEMPLATE_META
    )
      .map(
        ([id, meta]) => `
          <button
            class="library-template-option${source.template === id ? " is-active" : ""}"
            type="button"
            data-action="apply-library-template"
            data-library-template="${id}"
          >
            <strong>${meta.label}</strong>
            <span>${meta.hint}</span>
          </button>
        `
      )
      .join("");
    document.getElementById("library-icon-options").innerHTML =
      LIBRARY_ICON_CHOICES.map(
        (iconName) => `
          <button
            class="library-icon-option${source.icon === iconName ? " is-active" : ""}"
            type="button"
            data-action="choose-library-icon"
            data-library-icon="${iconName}"
            aria-label="${iconName}"
            aria-pressed="${source.icon === iconName}"
          >${icon(iconName)}</button>
        `
      ).join("");
    document.getElementById("library-color-options").innerHTML =
      LIBRARY_COLOR_CHOICES.map(
        (color) => `
          <button
            class="library-color-option${source.color === color ? " is-active" : ""}"
            type="button"
            data-action="choose-library-color"
            data-library-color="${color}"
            style="--swatch: ${color}"
            aria-label="${color}"
            aria-pressed="${source.color === color}"
          ></button>
        `
      ).join("");
    document.getElementById("library-type-options").innerHTML =
      LIBRARY_TYPE_CHOICES.map((type) => {
        const active = source.types.includes(type);
        const meta = TYPE_META[type];
        return `
          <button
            class="library-type-option${active ? " is-active" : ""}"
            type="button"
            data-action="toggle-library-type"
            data-library-type="${type}"
            aria-pressed="${active}"
          >${icon(meta.icon)}<span>${meta.label}</span></button>
        `;
      }).join("");
  }

  function applyLibraryFormValues(source) {
    document.getElementById("library-id").value = source.id || "";
    document.getElementById("library-name").value = source.name || "";
    document.getElementById("library-description").value =
      source.description || "";
    document.getElementById("library-default-layout").value =
      source.layout || "grid";
    document.getElementById("library-include-accounts").checked =
      Boolean(source.includeAccounts);
    renderLibraryEditorChoices(source);
    syncCustomSelect(document.getElementById("library-default-layout"));
  }

  function openLibraryDialog(library = null, templateId = "blank") {
    editingLibraryId = library?.id || null;
    const template =
      LIBRARY_TEMPLATES[templateId] || LIBRARY_TEMPLATES.blank;
    const source = library
      ? { ...library, template: "blank" }
      : { ...template, types: [...template.types], template: templateId };
    document.getElementById("library-dialog-title").textContent = library
      ? "编辑专区"
      : "新建专区";
    document.getElementById("library-submit-label").textContent = library
      ? "保存专区"
      : "创建专区";
    document.getElementById("library-form-error").textContent = "";
    upgradeCustomSelects(document.getElementById("library-dialog"));
    applyLibraryFormValues(source);
    const backButton = document.getElementById("library-editor-back");
    if (backButton) {
      backButton.hidden = !libraryEditorReturnToManager;
    }
    const dialog = document.getElementById("library-dialog");
    if (!dialog.open) {
      dialog.showModal();
    }
    window.setTimeout(() => document.getElementById("library-name").focus(), 60);
  }

  function applyLibraryTemplate(templateId) {
    const template = LIBRARY_TEMPLATES[templateId];
    if (!template) {
      return;
    }
    applyLibraryFormValues({
      ...template,
      id: editingLibraryId,
      types: [...template.types],
      template: templateId
    });
    document.getElementById("library-form-error").textContent = "";
  }

  function updateLibraryEditorChoice(button) {
    const container = button.parentElement;
    container.querySelectorAll("button").forEach((item) => {
      item.classList.remove("is-active");
      item.setAttribute("aria-pressed", "false");
    });
    button.classList.add("is-active");
    button.setAttribute("aria-pressed", "true");
  }

  function toggleLibraryEditorType(button) {
    const active = !button.classList.contains("is-active");
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  function renderLibraryManager() {
    const list = document.getElementById("library-manager-list");
    if (!state.libraries.length) {
      list.innerHTML = `
        <div class="library-empty-state">
          还没有自定义专区。你可以从空白专区开始，也可以使用文章、下载或灵感模板。
        </div>
      `;
      return;
    }
    list.innerHTML = state.libraries
      .map((library) => {
        const count = state.resources.filter(
          (resource) => resource.zone === libraryZoneId(library.id)
        ).length;
        return `
          <div class="library-manager-row">
            <span class="library-manager-icon" style="--tone: ${safeColor(library.color)}">${icon(library.icon)}</span>
            <div class="library-manager-copy">
              <strong>${escapeHTML(library.name)}</strong>
              <span>${count} 条内容 · ${libraryAllowedTypes(library)
                .map((type) => TYPE_META[type]?.label || type)
                .join(" / ")}</span>
            </div>
            <div class="library-manager-actions">
              <button class="category-action" type="button" data-action="edit-library" data-library-id="${escapeHTML(library.id)}" aria-label="编辑专区">${icon("edit")}</button>
              <button class="category-action category-action--danger" type="button" data-action="delete-library" data-library-id="${escapeHTML(library.id)}" aria-label="删除专区">${icon("trash")}</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function openLibraryManager() {
    renderLibraryManager();
    const dialog = document.getElementById("library-manager-dialog");
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  async function submitLibraryForm(event) {
    event.preventDefault();
    const name = document.getElementById("library-name").value.trim();
    const description = document
      .getElementById("library-description")
      .value.trim();
    const iconName =
      document.querySelector("#library-icon-options .is-active")?.dataset
        .libraryIcon || "folder";
    const color =
      document.querySelector("#library-color-options .is-active")?.dataset
        .libraryColor || LIBRARY_COLOR_CHOICES[0];
    const types = [
      ...document.querySelectorAll(
        "#library-type-options .library-type-option.is-active"
      )
    ].map((button) => button.dataset.libraryType);
    const errorElement = document.getElementById("library-form-error");
    errorElement.textContent = "";
    if (!name) {
      errorElement.textContent = "请填写专区名称。";
      document.getElementById("library-name").focus();
      return;
    }
    if (!types.length) {
      errorElement.textContent = "请至少允许一种内容类型。";
      return;
    }
    const existing = editingLibraryId
      ? libraryById(editingLibraryId)
      : null;
    const library = {
      id: existing?.id || `library-${Store.makeId()}`,
      name: name.slice(0, 24),
      description: description.slice(0, 180),
      icon: LIBRARY_ICON_CHOICES.includes(iconName) ? iconName : "folder",
      color: safeColor(color),
      types,
      layout: LIBRARY_LAYOUT_CHOICES.includes(
        document.getElementById("library-default-layout").value
      )
        ? document.getElementById("library-default-layout").value
        : "grid",
      includeAccounts: document.getElementById("library-include-accounts").checked,
      order: existing?.order ?? state.libraries.length
    };
    state.libraries = existing
      ? state.libraries.map((item) =>
          item.id === existing.id ? library : item
        )
      : [...state.libraries, library];
    saveLibraries();
    document.getElementById("library-dialog").close();
    if (state.view === "custom" && state.libraryId === library.id) {
      state.layout = library.layout;
    }
    renderContent({ animate: false, preserveScroll: true });
    showToast(existing ? "专区设置已保存" : "专区已创建");
  }

  async function deleteLibrary(libraryId) {
    const library = libraryById(libraryId);
    if (!library) {
      return;
    }
    const resources = state.resources.filter(
      (resource) => resource.zone === libraryZoneId(libraryId)
    );
    const message = resources.length
      ? `删除「${library.name}」后，其中 ${resources.length} 条内容会移到「通用资源库」。确定继续吗？`
      : `确定删除专区「${library.name}」吗？`;
    if (state.confirmDelete && !window.confirm(message)) {
      return;
    }
    try {
      const updatedResources = resources.map((resource) => ({
        ...resource,
        zone: "library",
        updatedAt: Date.now()
      }));
      await Promise.all(updatedResources.map((resource) => Store.saveResource(resource)));
      const updatedById = new Map(
        updatedResources.map((resource) => [resource.id, resource])
      );
      state.resources = state.resources.map(
        (resource) => updatedById.get(resource.id) || resource
      );
      state.libraries = state.libraries.filter((item) => item.id !== libraryId);
      saveLibraries();
      renderLibraryManager();
      if (state.zoneFilter === libraryZoneId(libraryId)) {
        state.zoneFilter = "all";
      }
      if (state.view === "custom" && state.libraryId === libraryId) {
        setView("all");
      } else {
        renderContent({ animate: false, preserveScroll: true });
      }
      showToast("专区已删除，内容已移到通用资源库");
    } catch (error) {
      showToast(error.message || "专区删除失败", true);
    }
  }

  function renderManagedCategories() {
    const isAccount = managedCategoryKind === "account";
    const categories = isAccount
      ? state.accountCategories
      : state.minecraftCategories;
    const counts = isAccount
      ? Object.fromEntries(
          categories.map((category) => [
            category.id,
            state.vaultAccounts.filter(
              (account) => account.category === category.id
            ).length
          ])
        )
      : Object.fromEntries(
          categories.map((category) => [
            category.id,
            state.resources.filter(
              (resource) =>
                resource.zone === "minecraft" &&
                resource.minecraftType === category.id
            ).length
          ])
        );

    document.getElementById("category-options-title").textContent = isAccount
      ? "管理账号分类"
      : "管理 Minecraft 分类";
    document.getElementById("managed-category-kind").value = managedCategoryKind;
    document.getElementById("managed-category-list").innerHTML = categories
      .map(
        (category) => `
          <div class="managed-category-row">
            <span class="managed-category-dot" style="--tone: ${safeColor(category.color)}"></span>
            <strong>${escapeHTML(category.label)}</strong>
            <span>${counts[category.id] || 0} 项</span>
            <button class="category-action category-action--danger" type="button" data-managed-category-delete="${escapeHTML(category.id)}" aria-label="删除分类">
              ${icon("trash")}
            </button>
          </div>
        `
      )
      .join("");
    document.getElementById("managed-category-error").textContent = "";
  }

  function openManagedCategoryDialog(kind) {
    managedCategoryKind = kind === "minecraft" ? "minecraft" : "account";
    document.getElementById("managed-category-form").reset();
    renderManagedCategories();
    upgradeCustomSelects(document.getElementById("category-options-dialog"));
    syncCustomSelect(document.getElementById("managed-category-color"));
    const dialog = document.getElementById("category-options-dialog");
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  async function addManagedCategory(event) {
    event.preventDefault();
    const name = document.getElementById("managed-category-name").value.trim();
    const color = safeColor(document.getElementById("managed-category-color").value);
    const errorElement = document.getElementById("managed-category-error");
    const categories =
      managedCategoryKind === "account"
        ? state.accountCategories
        : state.minecraftCategories;

    if (!name) {
      errorElement.textContent = "请填写分类名称。";
      return;
    }
    if (
      categories.some(
        (category) =>
          category.label.toLocaleLowerCase("zh-CN") ===
          name.toLocaleLowerCase("zh-CN")
      )
    ) {
      errorElement.textContent = "已经有同名分类了。";
      return;
    }

    const category = {
      id: `${managedCategoryKind}-${Store.makeId()}`,
      label: name.slice(0, 20),
      color,
      icon: "cube"
    };
    if (managedCategoryKind === "account") {
      state.accountCategories = [...state.accountCategories, category];
    } else {
      state.minecraftCategories = [...state.minecraftCategories, category];
    }
    saveCategoryPreferences();
    document.getElementById("managed-category-form").reset();
    syncCustomSelect(document.getElementById("managed-category-color"));
    renderManagedCategories();
    renderContent({ animate: false, preserveScroll: true });
    showToast("分类已新增");
  }

  async function deleteManagedCategory(categoryId) {
    const isAccount = managedCategoryKind === "account";
    const categories = isAccount
      ? state.accountCategories
      : state.minecraftCategories;
    if (categories.length <= 1) {
      document.getElementById("managed-category-error").textContent =
        "至少需要保留一个分类。";
      return;
    }
    const category = categories.find((item) => item.id === categoryId);
    if (!category) {
      return;
    }
    const remaining = categories.filter((item) => item.id !== categoryId);
    const fallback = isAccount
      ? remaining.find((item) => item.id === "other") || remaining[0]
      : remaining.find((item) => item.id === "map") || remaining[0];

    if (isAccount) {
      state.accountCategories = remaining;
      if (state.accountCategory === categoryId) {
        state.accountCategory = "all";
      }
      state.vaultAccounts = state.vaultAccounts.map((account) =>
        account.category === categoryId
          ? { ...account, category: fallback.id, updatedAt: Date.now() }
          : account
      );
      await persistVault();
    } else {
      state.minecraftCategories = remaining;
      state.resources = state.resources.map((resource) =>
        resource.minecraftType === categoryId
          ? { ...resource, minecraftType: fallback.id, updatedAt: Date.now() }
          : resource
      );
      await Promise.all(
        state.resources
          .filter((resource) => resource.minecraftType === fallback.id)
          .map((resource) => Store.saveResource(resource))
      );
      if (state.minecraftType === categoryId) {
        state.minecraftType = "all";
      }
    }

    saveCategoryPreferences();
    renderManagedCategories();
    renderContent({ animate: false, preserveScroll: true });
    showToast("分类已删除");
  }

  const NAV_LABELS = {
    all: "全部资源",
    favorites: "我的收藏",
    recent: "最近打开",
    minecraft: "我的世界",
    accounts: "账号保险箱"
  };

  function orderControlMarkup(kind, id, index, total, label) {
    if (state.orderMode === "position") {
      return `
        <label class="order-position">
          <span>位置</span>
          <select data-order-kind="${kind}" data-order-id="${id}" aria-label="${label}的位置">
            ${Array.from({ length: total }, (_, position) => `<option value="${position}"${position === index ? " selected" : ""}>${position + 1}</option>`).join("")}
          </select>
        </label>
      `;
    }
    if (state.orderMode === "arrows") {
      return `
        <div class="order-row-actions">
          <button class="icon-button" type="button" data-order-arrow-kind="${kind}" data-order-id="${id}" data-order-target="${index - 1}" aria-label="上移" ${index === 0 ? "disabled" : ""}>↑</button>
          <button class="icon-button" type="button" data-order-arrow-kind="${kind}" data-order-id="${id}" data-order-target="${index + 1}" aria-label="下移" ${index === total - 1 ? "disabled" : ""}>↓</button>
        </div>
      `;
    }
    if (state.orderMode === "drag") {
      return `<span class="order-drag-handle" aria-hidden="true">↕</span>`;
    }
    return `<span class="order-number">${index + 1}</span>`;
  }

  function renderOrderDialog() {
    document.querySelectorAll("[data-order-mode]").forEach((button) => {
      const active = button.dataset.orderMode === state.orderMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const hints = {
      position: "直接选择每一项的目标位置",
      arrows: "使用上下按钮逐项移动",
      drag: "按住列表项拖动到目标位置",
      name: "按照当前名称重新排列"
    };
    document.getElementById("order-mode-hint").textContent = hints[state.orderMode];
    document.getElementById("nav-order-list").innerHTML = state.navOrder
      .map((view, index) => {
        const draggable = state.orderMode === "drag";
        return `
          <div class="order-row" ${draggable ? `draggable="true" data-order-drag-kind="nav" data-order-drag-id="${view}"` : ""}>
            <strong>${NAV_LABELS[view] || view}</strong>
            ${orderControlMarkup("nav", view, index, state.navOrder.length, NAV_LABELS[view] || view)}
          </div>
        `;
      })
      .join("");
    document.getElementById("category-order-list").innerHTML = state.categories
      .map((category, index) => {
        const draggable = state.orderMode === "drag";
        return `
          <div class="order-row" ${draggable ? `draggable="true" data-order-drag-kind="category" data-order-drag-id="${escapeHTML(category.id)}"` : ""}>
            <span class="category-dot" style="--category-color: ${safeColor(category.color)}"></span>
            <strong>${escapeHTML(category.name)}</strong>
            ${orderControlMarkup("category", escapeHTML(category.id), index, state.categories.length, escapeHTML(category.name))}
          </div>
        `;
      })
      .join("");
    document.querySelector(".order-name-action").hidden =
      state.orderMode !== "name";
    const orderDialog = document.getElementById("order-dialog");
    upgradeCustomSelects(orderDialog);
    orderDialog.querySelectorAll("select").forEach((select) => {
      syncCustomSelect(select);
    });
  }

  function openOrderDialog() {
    renderOrderDialog();
    const dialog = document.getElementById("order-dialog");
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  async function applyOrderList(kind, items) {
    if (kind === "nav") {
      state.navOrder = normalizeNavOrder(items);
      localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(state.navOrder));
      applyNavigationOrder();
    } else {
      const byId = new Map(state.categories.map((category) => [category.id, category]));
      state.categories = items
        .map((categoryId, order) => {
          const category = byId.get(categoryId);
          return category ? { ...category, order } : null;
        })
        .filter(Boolean);
      await Promise.all(
        state.categories.map((category) => Store.saveCategory(category))
      );
      renderContent({ animate: false, preserveScroll: true });
    }
    renderOrderDialog();
  }

  async function moveOrderItem(kind, id, target) {
    const items = kind === "nav" ? state.navOrder : state.categories.map((item) => item.id);
    const index = items.indexOf(id);
    if (index < 0 || target < 0 || target >= items.length) {
      return;
    }
    const [moved] = items.splice(index, 1);
    items.splice(target, 0, moved);
    await applyOrderList(kind, items);
  }

  async function sortOrderByName() {
    state.navOrder = state.navOrder
      .slice()
      .sort((a, b) => (NAV_LABELS[a] || a).localeCompare(NAV_LABELS[b] || b, "zh-CN"));
    localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(state.navOrder));
    applyNavigationOrder();
    state.categories = state.categories
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
      .map((category, order) => ({ ...category, order }));
    await Promise.all(
      state.categories.map((category) => Store.saveCategory(category))
    );
    renderContent({ animate: false, preserveScroll: true });
    renderOrderDialog();
    showToast("已按名称重新排序");
  }

  function startOrderRowDrag(event) {
    const row = event.target.closest("[data-order-drag-kind]");
    if (!row || state.orderMode !== "drag") {
      return;
    }
    orderDragState = {
      row,
      kind: row.dataset.orderDragKind,
      id: row.dataset.orderDragId,
      container: row.parentElement
    };
    row.classList.add("is-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", orderDragState.id);
    }
  }

  function handleOrderRowDragOver(event) {
    if (!orderDragState || !orderDragState.container.contains(event.target)) {
      return;
    }
    event.preventDefault();
    const rows = [...orderDragState.container.querySelectorAll(".order-row:not(.is-dragging)")];
    const afterElement = rows.reduce(
      (closest, row) => {
        const box = row.getBoundingClientRect();
        const distance = event.clientY - box.top - box.height / 2;
        return distance < 0 && distance > closest.distance
          ? { distance, row }
          : closest;
      },
      { distance: Number.NEGATIVE_INFINITY, row: null }
    ).row;
    if (afterElement !== orderDragState.row) {
      animateSortableChange(
        orderDragState.container,
        ".order-row",
        () =>
          orderDragState.container.insertBefore(
            orderDragState.row,
            afterElement
          )
      );
    }
  }

  function finishOrderRowDrag() {
    if (!orderDragState) {
      return;
    }
    const { row, kind, container } = orderDragState;
    orderDragState = null;
    row.classList.remove("is-dragging");
    const items = [...container.querySelectorAll(".order-row")].map(
      (item) => item.dataset.orderDragId
    );
    void applyOrderList(kind, items);
  }

  async function copyText(value, isSecret = false) {
    const text = String(value ?? "");
    if (!text) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      showToast(isSecret ? "密码已复制，使用后请清理剪贴板" : "账号已复制");
    } catch (error) {
      showToast("复制失败，请手动选择文本", true);
    }
  }

  function openCategoryDialog(category = null) {
    elements.categoryForm.reset();
    document.getElementById("category-id").value = category?.id || "";
    document.getElementById("category-name").value = category?.name || "";
    document.getElementById("category-dialog-title").textContent = category
      ? "编辑分类"
      : "新建分类";
    document.getElementById("category-form-error").textContent = "";

    const color = safeColor(category?.color || DEFAULT_COLOR);
    const colorInput = elements.categoryForm.querySelector(
      `input[name="categoryColor"][value="${color}"]`
    );
    if (colorInput) {
      colorInput.checked = true;
    } else {
      elements.categoryForm.querySelector('input[name="categoryColor"]').checked = true;
    }

    if (!elements.categoryDialog.open) {
      elements.categoryDialog.showModal();
    }
    window.setTimeout(() => document.getElementById("category-name").focus(), 80);
  }

  async function submitCategoryForm(event) {
    event.preventDefault();
    const categoryId = document.getElementById("category-id").value;
    const existing = categoryById(categoryId);
    const name = document.getElementById("category-name").value.trim();
    const color = safeColor(
      elements.categoryForm.querySelector('input[name="categoryColor"]:checked')?.value
    );
    const errorElement = document.getElementById("category-form-error");
    errorElement.textContent = "";

    if (!name) {
      errorElement.textContent = "请填写分类名称。";
      return;
    }

    const duplicate = state.categories.some(
      (category) =>
        category.id !== categoryId &&
        category.name.toLocaleLowerCase("zh-CN") === name.toLocaleLowerCase("zh-CN")
    );
    if (duplicate) {
      errorElement.textContent = "已经有同名分类了。";
      return;
    }

    const category = {
      id: existing?.id || Store.makeId(),
      name,
      color,
      order: existing?.order ?? state.categories.length,
      createdAt: existing?.createdAt || Date.now()
    };

    try {
      await Store.saveCategory(category);
      state.categories = existing
        ? state.categories.map((item) => (item.id === category.id ? category : item))
        : [...state.categories, category];
      state.categories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      elements.categoryDialog.close();
      renderContent();
      showToast(existing ? "分类已更新" : "分类已创建");
    } catch (error) {
      errorElement.textContent = error.message || "分类保存失败。";
    }
  }

  async function deleteCategory(categoryId) {
    const category = categoryById(categoryId);
    if (!category) {
      return;
    }

    const fallback = categoryFallback(categoryId);
    if (!fallback) {
      showToast("至少需要保留一个分类", true);
      return;
    }

    const count = state.resources.filter(
      (resource) => resource.categoryId === categoryId
    ).length;
    const message = count
      ? `删除「${category.name}」后，其中 ${count} 条资源会移到「${fallback.name}」。确定继续吗？`
      : `确定删除分类「${category.name}」吗？`;

    if (state.confirmDelete && !window.confirm(message)) {
      return;
    }

    try {
      await Store.deleteCategoryAndReassign(categoryId, fallback.id);
      const now = Date.now();
      state.resources = state.resources.map((resource) =>
        resource.categoryId === categoryId
          ? { ...resource, categoryId: fallback.id, updatedAt: now }
          : resource
      );
      state.categories = state.categories.filter((item) => item.id !== categoryId);
      if (state.categoryId === categoryId) {
        state.categoryId = null;
      }
      renderContent();
      showToast("分类已删除，资源已移到其他分类");
    } catch (error) {
      showToast(error.message || "分类删除失败", true);
    }
  }

  function clearFilters() {
    state.query = "";
    state.typeFilter = "all";
    state.categoryId = null;
    elements.searchInput.value = "";
    renderContent();
  }

  async function updateStorageEstimate() {
    const usedElement = document.getElementById("storage-used");
    const barElement = document.getElementById("storage-bar-fill");
    const captionElement = document.getElementById("storage-caption");
    if (!usedElement || !barElement || !captionElement) {
      return;
    }

    if (!navigator.storage?.estimate) {
      usedElement.textContent = "未知";
      captionElement.textContent = "当前浏览器不提供存储用量信息";
      return;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const used = Number(estimate.usage || 0);
      const quota = Number(estimate.quota || 0);
      const percent = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
      usedElement.textContent = formatBytes(used);
      barElement.style.transform = `scaleX(${Math.max(0.02, percent / 100)})`;
      captionElement.textContent = quota
        ? `浏览器为此站点分配约 ${formatBytes(quota)}`
        : "由浏览器自动管理可用空间";
    } catch (error) {
      usedElement.textContent = "未知";
      captionElement.textContent = "暂时无法读取存储用量";
    }
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function exportData() {
    const exportButton = document.querySelector('[data-action="export-data"]');
    if (exportButton) {
      exportButton.disabled = true;
    }

    try {
      const resources = [];
      for (const resource of state.resources) {
        const exported = { ...resource };
        if (resource.fileBlob instanceof Blob) {
          exported.fileData = await blobToDataURL(resource.fileBlob);
        }
        delete exported.fileBlob;
        resources.push(exported);
      }

      const payload = {
        app: "拾集",
        schemaVersion: 3,
        exportedAt: new Date().toISOString(),
        categories: state.categories,
        resources,
        preferences: {
          accountCategories: state.accountCategories,
          minecraftCategories: state.minecraftCategories,
          libraries: state.libraries,
          shortcuts: state.shortcuts,
          closeBehavior: state.closeBehavior,
          detailMode: state.detailMode,
          sidebarScale: state.sidebarScale,
          fontScale: state.fontScale,
          palette: state.palette
        },
        vault: {
          id: "accounts",
          version: 1,
          accounts: state.vaultAccounts
        },
        studio: window.ShijiStudio
          ? await window.ShijiStudio.getBackup()
          : undefined
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8"
      });
      const stamp = new Date().toISOString().slice(0, 10);
      saveBlobToDevice(
        blob,
        `拾集-备份-${stamp}.json`
      );
      showToast("备份已导出");
    } catch (error) {
      showToast(error.message || "导出备份失败", true);
    } finally {
      if (exportButton) {
        exportButton.disabled = false;
      }
    }
  }

  function validateImportedCategory(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const id = String(raw.id || "").trim();
    const name = String(raw.name || "").trim().slice(0, 20);
    if (!id || !name) {
      return null;
    }
    return {
      id,
      name,
      color: safeColor(raw.color),
      order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : 0,
      createdAt: Number(raw.createdAt) || Date.now()
    };
  }

  async function validateImportedResource(raw, categoryIds) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const type = TYPE_META[raw.type] ? raw.type : "note";
    const zone =
      raw.zone === "minecraft"
        ? "minecraft"
        : libraryForZone(raw.zone)
          ? raw.zone
          : "library";
    const minecraftType = state.minecraftCategories.some(
      (category) => category.id === raw.minecraftType
    )
      ? raw.minecraftType
      : minecraftCategoryFallback().id;
    const title = String(raw.title || "").trim().slice(0, 100);
    if (!title) {
      return null;
    }

    const fallbackCategory = categoryIds.values().next().value;
    let fileBlob = null;
    if (type === "file" && typeof raw.fileData === "string") {
      try {
        const response = await fetch(raw.fileData);
        fileBlob = await response.blob();
      } catch (error) {
        fileBlob = null;
      }
    }

    return {
      id: String(raw.id || Store.makeId()),
      type,
      zone,
      minecraftType: zone === "minecraft" ? minecraftType : null,
      title,
      url: type === "link" && isSafeStoredUrl(normalizeUrl(raw.url)) ? normalizeUrl(raw.url) : "",
      description: String(raw.description || "").slice(0, 1200),
      categoryId:
        zone === "minecraft"
          ? null
          : categoryIds.has(raw.categoryId)
            ? raw.categoryId
            : fallbackCategory,
      tags: Array.isArray(raw.tags)
        ? raw.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12)
        : parseTags(raw.tags),
      favorite: Boolean(raw.favorite),
      createdAt: Number(raw.createdAt) || Date.now(),
      updatedAt: Number(raw.updatedAt) || Date.now(),
      openedAt: Number(raw.openedAt) || null,
      fileName: type === "file" ? String(raw.fileName || "恢复的文件") : "",
      fileSize: type === "file" ? Number(raw.fileSize) || fileBlob?.size || 0 : 0,
      fileType:
        type === "file"
          ? String(raw.fileType || fileBlob?.type || "application/octet-stream")
          : "",
      localPath:
        type === "file" && typeof raw.localPath === "string"
          ? raw.localPath
          : "",
      sourcePath:
        type === "file" && typeof raw.sourcePath === "string"
          ? raw.sourcePath
          : "",
      storageMode:
        type === "file" && typeof raw.localPath === "string" && raw.localPath
          ? "path"
          : fileBlob
            ? "embedded"
            : "",
      fileBlob
    };
  }

  async function importData(file) {
    if (!file) {
      return;
    }

    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload.categories) || !Array.isArray(payload.resources)) {
        throw new Error("这不是有效的拾集备份文件。");
      }

      if (Array.isArray(payload.preferences?.accountCategories)) {
        state.accountCategories = normalizeCategorySet(
          payload.preferences.accountCategories,
          DEFAULT_ACCOUNT_CATEGORIES
        );
      }
      if (Array.isArray(payload.preferences?.minecraftCategories)) {
        state.minecraftCategories = normalizeCategorySet(
          payload.preferences.minecraftCategories,
          DEFAULT_MINECRAFT_CATEGORIES
        );
      }
      if (Array.isArray(payload.preferences?.libraries)) {
        state.libraries = normalizeLibraries(payload.preferences.libraries);
      }
      if (payload.preferences?.shortcuts && typeof payload.preferences.shortcuts === "object") {
        const importedShortcuts = {};
        SHORTCUT_DEFINITIONS.forEach((shortcut) => {
          const value = payload.preferences.shortcuts[shortcut.id];
          importedShortcuts[shortcut.id] =
            value === ""
              ? ""
              : normalizeStoredShortcut(value) || shortcut.defaultKeys;
        });
        state.shortcuts = importedShortcuts;
      }
      if (["exit", "tray", "minimize"].includes(payload.preferences?.closeBehavior)) {
        state.closeBehavior =
          payload.preferences.closeBehavior === "exit" ? "exit" : "tray";
        localStorage.setItem("shiji.closeBehavior", state.closeBehavior);
        if (window.ShijiDesktop?.setCloseBehavior) {
          await window.ShijiDesktop.setCloseBehavior(state.closeBehavior);
        }
      }
      if (["window", "drawer"].includes(payload.preferences?.detailMode)) {
        state.detailMode = payload.preferences.detailMode;
        localStorage.setItem("shiji.detailMode", state.detailMode);
      }
      if (["standard", "large"].includes(payload.preferences?.sidebarScale)) {
        state.sidebarScale = payload.preferences.sidebarScale;
        localStorage.setItem("shiji.sidebarScale", state.sidebarScale);
      }
      if (
        Object.prototype.hasOwnProperty.call(
          FONT_SCALE_VALUES,
          payload.preferences?.fontScale
        )
      ) {
        state.fontScale = payload.preferences.fontScale;
        localStorage.setItem("shiji.fontScale", state.fontScale);
      }
      if (
        THEME_PALETTES.some(
          (palette) => palette.id === payload.preferences?.palette
        )
      ) {
        state.palette = payload.preferences.palette;
        localStorage.setItem("shiji.palette", state.palette);
      }
      applyPersonalization();
      saveCategoryPreferences();
      saveLibraries();
      saveShortcutPreferences();
      syncShortcutHints();

      const categories = payload.categories
        .map(validateImportedCategory)
        .filter(Boolean);
      if (!categories.length) {
        throw new Error("备份中至少需要一个有效分类。");
      }

      if (
        !window.confirm(
          `备份包含 ${payload.resources.length} 条资源${Array.isArray(payload.vault?.accounts) ? "和账号保险箱" : ""}。导入后将替换当前设备上的对应数据，确定继续吗？`
        )
      ) {
        return;
      }

      const categoryIds = new Set(categories.map((category) => category.id));
      const resources = [];
      for (const item of payload.resources) {
        const resource = await validateImportedResource(item, categoryIds);
        if (resource) {
          resources.push(resource);
        }
      }

      await Store.replaceAll(categories, resources);
      if (payload.studio && window.ShijiStudio) {
        await window.ShijiStudio.restoreBackup(payload.studio);
      }
      if (Array.isArray(payload.vault?.accounts)) {
        const vaultRecord = {
          id: "accounts",
          version: 1,
          accounts: normalizeVaultAccounts(payload.vault.accounts),
          updatedAt: Date.now()
        };
        await Store.saveVault(vaultRecord);
        state.vaultAccounts = normalizeVaultAccounts(vaultRecord.accounts);
        state.revealedAccountIds.clear();
      }
      state.categories = categories.sort((a, b) => a.order - b.order);
      state.resources = resources;
      state.view = "all";
      state.categoryId = null;
      state.typeFilter = "all";
      state.query = "";
      elements.searchInput.value = "";
      renderContent();
      showToast(`已恢复 ${resources.length} 条资源`);
    } catch (error) {
      showToast(error.message || "备份文件读取失败", true);
    } finally {
      elements.importInput.value = "";
    }
  }

  async function clearResources() {
    if (
      state.confirmDelete &&
      !window.confirm(
        "确定清空全部资源吗？分类会保留，但资源与文件无法恢复。建议先导出备份。"
      )
    ) {
      return;
    }

    try {
      await Store.replaceAll(state.categories, []);
      state.resources = [];
      state.categoryId = null;
      state.typeFilter = "all";
      state.query = "";
      elements.searchInput.value = "";
      renderContent();
      showToast("资源已清空");
    } catch (error) {
      showToast(error.message || "清空失败", true);
    }
  }

  async function resetApplicationState() {
    const confirmed = window.confirm(
      "确定恢复初始状态吗？当前资源、分类、账号、快捷键和其他设置都会被删除，并重新写入首次启动的示例内容。此操作无法撤销，建议先导出备份。"
    );
    if (!confirmed) {
      return;
    }

    try {
      await Store.resetToDefaults();
      if (window.ShijiDesktop?.setCloseBehavior) {
        await window.ShijiDesktop.setCloseBehavior("exit").catch(() => {});
      }
      if (window.ShijiDesktop?.setStartupSetting) {
        await window.ShijiDesktop.setStartupSetting(false).catch(() => {});
      }
      Object.keys(localStorage)
        .filter((key) => key.startsWith("shiji."))
        .forEach((key) => localStorage.removeItem(key));
      window.location.reload();
    } catch (error) {
      showToast(error.message || "恢复初始状态失败", true);
    }
  }

  function handleDocumentClick(event) {
    if (!event.target.closest(".sort-control")) {
      closeSortMenus();
    }
    if (!event.target.closest(".custom-select, .custom-select-menu")) {
      closeCustomSelects();
    }
    if (!event.target.closest(".date-picker, .date-picker-panel")) {
      closeDatePicker();
    }
    if (!event.target.closest("[data-settings-dropdown]")) {
      closeStartupDropdown();
    }
    if (shortcutRecordingAction) {
      finishShortcutRecording(shortcutRecordingAction);
      return;
    }

    const authorSignature = event.target.closest('[data-easter="author-signature"]');
    if (authorSignature) {
      openAuthorProfile();
      return;
    }

    const closeButton = event.target.closest("[data-close-dialog]");
    if (closeButton) {
      closeDialog(closeButton.dataset.closeDialog);
      return;
    }

    const customSelectOption = event.target.closest("[data-custom-select-value]");
    if (customSelectOption) {
      selectCustomOption(customSelectOption);
      return;
    }

    const tagPreset = event.target.closest("[data-tag-preset]");
    if (tagPreset) {
      toggleMinecraftTagPreset(tagPreset.dataset.tagPreset);
      return;
    }

    const datePickerDay = event.target.closest("[data-date-picker-day]");
    if (datePickerDay) {
      setDatePickerValue(datePickerDay.dataset.datePickerDay);
      return;
    }

    const actionElement = event.target.closest("[data-action]");
    if (actionElement) {
      const action = actionElement.dataset.action;
      const resourceId = actionElement.dataset.resourceId;

      if (action === "add-resource") {
        if (state.view === "studio") {
          window.ShijiStudio?.openAssetDialog();
        } else if (state.view === "minecraft") {
          openResourceDialog(null, "file", "minecraft");
        } else if (state.view === "custom") {
          const library = libraryById(state.libraryId);
          openResourceDialog(
            null,
            libraryAllowedTypes(library)[0] || "link",
            libraryZoneId(state.libraryId)
          );
        } else if (state.view === "accounts") {
          openAccountDialog();
        } else {
          openResourceDialog();
        }
        return;
      }
      if (action === "create-library") {
        libraryEditorReturnToManager =
          document.getElementById("library-manager-dialog")?.open || false;
        closeDialog("library-manager-dialog");
        openLibraryDialog();
        return;
      }
      if (action === "manage-libraries") {
        openLibraryManager();
        return;
      }
      if (action === "edit-library" || action === "edit-current-library") {
        const library = libraryById(actionElement.dataset.libraryId);
        if (library) {
          libraryEditorReturnToManager =
            action === "edit-library" &&
            Boolean(document.getElementById("library-manager-dialog")?.open);
          closeDialog("library-manager-dialog");
          openLibraryDialog(library);
        }
        return;
      }
      if (action === "back-to-library-manager") {
        libraryEditorReturnToManager = false;
        closeDialog("library-dialog");
        openLibraryManager();
        return;
      }
      if (action === "delete-library") {
        deleteLibrary(actionElement.dataset.libraryId);
        return;
      }
      if (action === "apply-library-template") {
        applyLibraryTemplate(actionElement.dataset.libraryTemplate);
        return;
      }
      if (action === "choose-library-icon") {
        updateLibraryEditorChoice(actionElement);
        return;
      }
      if (action === "choose-library-color") {
        updateLibraryEditorChoice(actionElement);
        return;
      }
      if (action === "toggle-library-type") {
        toggleLibraryEditorType(actionElement);
        return;
      }
      if (action === "open-author-profile") {
        openAuthorProfile();
        return;
      }
      if (action === "author-open-release-notes") {
        closeDialog("author-dialog");
        openReleaseNotes(true);
        return;
      }
      if (action === "back-to-author") {
        releaseNotesReturnToAuthor = false;
        closeDialog("release-notes-dialog");
        openAuthorProfile();
        return;
      }
      if (action === "back-to-detail") {
        const resourceId = resourceEditorReturnResourceId;
        resourceEditorReturnResourceId = null;
        closeDialog("resource-dialog");
        if (resourceId) {
          openDetail(resourceId);
        }
        return;
      }
      if (action === "open-image-preview") {
        openImagePreview(actionElement);
        return;
      }
      if (action === "record-shortcut") {
        startShortcutRecording(actionElement.dataset.shortcutAction);
        return;
      }
      if (action === "reset-shortcuts") {
        state.shortcuts = defaultShortcuts();
        saveShortcutPreferences();
        syncShortcutHints();
        renderContent({ animate: false, preserveScroll: true });
        showToast("快捷键已恢复默认");
        return;
      }
      if (action === "toggle-startup-dropdown") {
        toggleStartupDropdown(actionElement);
        return;
      }
      if (action === "select-startup-view") {
        selectStartupView(actionElement.dataset.startupViewValue);
        return;
      }
      if (action === "toggle-sort-menu") {
        const control = actionElement.closest(".sort-control");
        const menu = control?.querySelector(".sort-menu");
        if (menu) {
          const shouldOpen = menu.hidden;
          closeSortMenus();
          menu.hidden = !shouldOpen;
          actionElement.setAttribute("aria-expanded", String(shouldOpen));
        }
        return;
      }
      if (action === "toggle-custom-select") {
        openCustomSelect(actionElement);
        return;
      }
      if (action === "toggle-date-picker") {
        const panel = document.getElementById("resource-date-panel");
        if (panel?.hidden) {
          openDatePicker(actionElement);
        } else {
          closeDatePicker({ restoreFocus: true });
        }
        return;
      }
      if (action === "date-picker-prev" || action === "date-picker-next") {
        const direction = action === "date-picker-prev" ? -1 : 1;
        datePickerCursor = new Date(
          datePickerCursor.getFullYear(),
          datePickerCursor.getMonth() + direction,
          1
        );
        renderDatePicker();
        return;
      }
      if (action === "date-picker-today") {
        setDatePickerValue(toDateInputValue(Date.now()));
        return;
      }
      if (action === "date-picker-clear") {
        setDatePickerValue("");
        return;
      }
      if (action === "toggle-startup") {
        if (!window.ShijiDesktop?.setStartupSetting) {
          showToast("开机自启动仅在电脑版中可用", true);
          return;
        }
        window.ShijiDesktop
          .setStartupSetting(!state.startupAtLogin)
          .then((result) => {
            state.startupAtLogin = Boolean(result?.enabled);
            state.startupSettingKnown = true;
            renderContent({ animate: false, preserveScroll: true });
            showToast(
              state.startupAtLogin ? "已开启开机自启动" : "已关闭开机自启动"
            );
          })
          .catch((error) => {
            showToast(error.message || "无法修改开机自启动", true);
          });
        return;
      }
      if (action === "toggle-confirm-delete") {
        state.confirmDelete = !state.confirmDelete;
        localStorage.setItem(
          "shiji.confirmDelete",
          String(state.confirmDelete)
        );
        renderContent({ animate: false, preserveScroll: true });
        return;
      }
      if (action === "toggle-auto-icon") {
        state.autoIconDefault = !state.autoIconDefault;
        localStorage.setItem(
          "shiji.autoIconDefault",
          String(state.autoIconDefault)
        );
        renderContent({ animate: false, preserveScroll: true });
        return;
      }
      if (action === "set-close-behavior") {
        const behavior =
          actionElement.dataset.closeBehaviorChoice === "tray"
            ? "tray"
            : "exit";
        if (!window.ShijiDesktop?.setCloseBehavior) {
          showToast("关闭行为仅在电脑版中可设置", true);
          return;
        }
        window.ShijiDesktop.setCloseBehavior(behavior)
          .then((result) => {
            state.closeBehavior = result?.behavior === "tray" ? "tray" : "exit";
            state.closeBehaviorKnown = true;
            localStorage.setItem("shiji.closeBehavior", state.closeBehavior);
            renderContent({ animate: false, preserveScroll: true });
            showToast(
              state.closeBehavior === "tray"
                ? "关闭按钮将收起到系统托盘"
                : "关闭按钮将退出拾集"
            );
          })
          .catch((error) => {
            showToast(error.message || "无法保存关闭行为", true);
          });
        return;
      }
      if (action === "set-detail-mode") {
        state.detailMode =
          actionElement.dataset.detailModeChoice === "drawer"
            ? "drawer"
            : "window";
        localStorage.setItem("shiji.detailMode", state.detailMode);
        applyPersonalization();
        renderContent({ animate: false, preserveScroll: true });
        showToast(
          state.detailMode === "drawer"
            ? "资源详情将使用侧边式"
            : "资源详情将使用窗口式"
        );
        return;
      }
      if (action === "set-sidebar-scale") {
        state.sidebarScale =
          actionElement.dataset.sidebarScaleChoice === "standard"
            ? "standard"
            : "large";
        localStorage.setItem("shiji.sidebarScale", state.sidebarScale);
        applyPersonalization();
        renderContent({ animate: false, preserveScroll: true });
        showToast("侧栏字号已更新");
        return;
      }
      if (action === "set-font-scale") {
        const requested = actionElement.dataset.fontScaleChoice;
        state.fontScale = Object.prototype.hasOwnProperty.call(
          FONT_SCALE_VALUES,
          requested
        )
          ? requested
          : "standard";
        localStorage.setItem("shiji.fontScale", state.fontScale);
        applyPersonalization();
        renderContent({ animate: false, preserveScroll: true });
        showToast("界面字号已更新");
        return;
      }
      if (action === "set-theme-palette") {
        const requested = actionElement.dataset.paletteChoice;
        state.palette = THEME_PALETTES.some(
          (palette) => palette.id === requested
        )
          ? requested
          : "forest";
        localStorage.setItem("shiji.palette", state.palette);
        applyPersonalization();
        renderContent({ animate: false, preserveScroll: true });
        showToast(
          `主题配色已切换为「${THEME_PALETTES.find((palette) => palette.id === state.palette)?.label || "森林绿"}」`
        );
        return;
      }
      if (action === "quit-app") {
        if (!window.ShijiDesktop?.quitApp) {
          showToast("退出功能仅在电脑版中可用", true);
          return;
        }
        window.ShijiDesktop.quitApp().catch((error) => {
          showToast(error.message || "无法退出拾集", true);
        });
        return;
      }
      if (action === "clear-account-icon") {
        clearAccountIcon();
        return;
      }
      if (action === "add-minecraft-resource") {
        openResourceDialog(null, "file", "minecraft");
        return;
      }
      if (action === "add-account") {
        openAccountDialog();
        return;
      }
      if (action === "toggle-all-passwords") {
        state.showAllPasswords = !state.showAllPasswords;
        renderContent({ animate: false, preserveScroll: true });
        return;
      }
      if (action === "clear-account-search") {
        state.accountQuery = "";
        renderContent({ animate: false, preserveScroll: true });
        return;
      }
      if (action === "toggle-account-form-password") {
        const passwordInput = document.getElementById("account-password");
        passwordInput.type = passwordInput.type === "password" ? "text" : "password";
        actionElement.querySelector("use").setAttribute(
          "href",
          passwordInput.type === "password" ? "#icon-eye" : "#icon-eye-off"
        );
        return;
      }
      if (action === "generate-account-password") {
        const passwordInput = document.getElementById("account-password");
        passwordInput.value = generatePassword();
        passwordInput.type = "text";
        actionElement.closest(".input-with-actions")
          ?.querySelector('[data-action="toggle-account-form-password"] use')
          ?.setAttribute("href", "#icon-eye-off");
        showToast("已生成 20 位随机密码");
        return;
      }
      if (action === "clear-filters") {
        clearFilters();
        return;
      }
      if (action === "clear-category-filter") {
        state.categoryId = null;
        renderContent();
        return;
      }
      if (action === "toggle-theme") {
        toggleTheme();
        return;
      }
      if (action === "dismiss-welcome") {
        markWelcomeSeen();
        elements.welcomeDialog.close();
        return;
      }
      if (action === "start-first-resource") {
        markWelcomeSeen();
        elements.welcomeDialog.close();
        firstResourceGuideActive = true;
        openResourceDialog();
        return;
      }
      if (action === "export-data") {
        exportData();
        return;
      }
      if (action === "import-data") {
        elements.importInput.click();
        return;
      }
      if (action === "clear-resources") {
        clearResources();
        return;
      }
      if (action === "reset-app-state") {
        resetApplicationState();
        return;
      }
      if (action === "create-category") {
        openCategoryDialog();
        return;
      }
      if (action === "open-order-dialog") {
        openOrderDialog();
        return;
      }
      if (action === "sort-order-by-name") {
        sortOrderByName();
        return;
      }
      if (action === "manage-account-categories") {
        openManagedCategoryDialog("account");
        return;
      }
      if (action === "manage-minecraft-categories") {
        openManagedCategoryDialog("minecraft");
        return;
      }
      if (action === "open-release-notes") {
        openReleaseNotes(false);
        return;
      }
      if (action === "open-tutorial-dialog") {
        openTutorialDialog();
        return;
      }
      if (action === "tutorial-add-resource") {
        closeDialog("tutorial-dialog");
        firstResourceGuideActive = true;
        openResourceDialog();
        return;
      }
      if (action === "open-link") {
        openLink(resourceId);
        return;
      }
      if (action === "download-file") {
        downloadFile(resourceId);
        return;
      }
      if (action === "open-local-file") {
        openLocalFile(resourceId);
        return;
      }
      if (action === "reveal-local-file") {
        revealLocalFile(resourceId);
        return;
      }
      if (action === "copy-local-path") {
        copyLocalPath(resourceId);
        return;
      }
      if (action === "edit-resource") {
        const resource = resourceById(resourceId);
        if (resource) {
          resourceEditorReturnResourceId = elements.detailDialog.open
            ? resourceId
            : null;
          closeDialog("detail-dialog");
          openResourceDialog(resource);
        }
        return;
      }
      if (action === "delete-resource") {
        deleteResource(resourceId);
        return;
      }
      if (action === "delete-local-file-resource") {
        deleteLocalFileResource(resourceId);
        return;
      }
      if (action === "toggle-detail-favorite") {
        toggleFavorite(resourceId);
        return;
      }
    }

    const orderModeButton = event.target.closest("[data-order-mode]");
    if (orderModeButton) {
      state.orderMode = orderModeButton.dataset.orderMode;
      localStorage.setItem("shiji.orderMode", state.orderMode);
      renderOrderDialog();
      return;
    }

    const settingsSectionButton = event.target.closest("[data-settings-section]");
    if (settingsSectionButton) {
      state.settingsSection = settingsSectionButton.dataset.settingsSection;
      localStorage.setItem("shiji.settingsSection", state.settingsSection);
      renderContent({ animate: false, preserveScroll: true });
      return;
    }

    const customLibraryButton = event.target.closest(
      ".nav-item[data-library-id]"
    );
    if (customLibraryButton) {
      setView(
        "custom",
        null,
        customLibraryButton.dataset.libraryId
      );
      return;
    }

    const zoneFilterButton = event.target.closest("[data-zone-filter]");
    if (zoneFilterButton) {
      state.zoneFilter = zoneFilterButton.dataset.zoneFilter || "all";
      state.typeFilter = "all";
      renderContent({ animate: false, preserveScroll: true });
      return;
    }

    const themeChoice = event.target.closest("[data-theme-choice]");
    if (themeChoice) {
      setTheme(themeChoice.dataset.themeChoice);
      renderContent({ animate: false, preserveScroll: true });
      return;
    }

    const orderArrowButton = event.target.closest("[data-order-arrow-kind]");
    if (orderArrowButton) {
      moveOrderItem(
        orderArrowButton.dataset.orderArrowKind,
        orderArrowButton.dataset.orderId,
        Number(orderArrowButton.dataset.orderTarget)
      );
      return;
    }

    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      setView(viewButton.dataset.view);
      return;
    }

    const accountIconChoice = event.target.closest("[data-account-icon-choice]");
    if (accountIconChoice) {
      chooseBuiltinAccountIcon(accountIconChoice.dataset.accountIconChoice);
      return;
    }

    const sortOption = event.target.closest("[data-sort-option]");
    if (sortOption) {
      state.sort = sortOption.dataset.sortOption;
      renderContent({ animate: false, preserveScroll: true });
      return;
    }

    const managedCategoryDelete = event.target.closest(
      "[data-managed-category-delete]"
    );
    if (managedCategoryDelete) {
      deleteManagedCategory(managedCategoryDelete.dataset.managedCategoryDelete);
      return;
    }

    const layoutButton = event.target.closest("[data-layout]");
    if (layoutButton) {
      setLayout(layoutButton.dataset.layout);
      return;
    }

    const typeButton = event.target.closest("[data-type-filter]");
    if (typeButton) {
      state.typeFilter = typeButton.dataset.typeFilter;
      renderContent();
      return;
    }

    const minecraftTypeButton = event.target.closest("[data-minecraft-type]");
    if (minecraftTypeButton) {
      state.minecraftType = minecraftTypeButton.dataset.minecraftType;
      renderContent();
      return;
    }

    const accountLayoutButton = event.target.closest("[data-account-layout]");
    if (accountLayoutButton) {
      const layout = accountLayoutButton.dataset.accountLayout;
      if (ACCOUNT_LAYOUT_META[layout]) {
        state.accountLayout = layout;
        localStorage.setItem("shiji.accountLayout", layout);
        renderContent({ animate: false, preserveScroll: true });
      }
      return;
    }

    const accountCategoryButton = event.target.closest("[data-account-category]");
    if (accountCategoryButton) {
      state.accountCategory = accountCategoryButton.dataset.accountCategory;
      renderContent();
      return;
    }

    const copyAccountButton = event.target.closest("[data-copy-account]");
    if (copyAccountButton) {
      copyText(accountById(copyAccountButton.dataset.copyAccount)?.username);
      return;
    }

    const copyPasswordButton = event.target.closest("[data-copy-password]");
    if (copyPasswordButton) {
      copyText(accountById(copyPasswordButton.dataset.copyPassword)?.password, true);
      return;
    }

    const toggleAccountPassword = event.target.closest("[data-toggle-account-password]");
    if (toggleAccountPassword) {
      const accountId = toggleAccountPassword.dataset.toggleAccountPassword;
      if (state.revealedAccountIds.has(accountId)) {
        state.revealedAccountIds.delete(accountId);
      } else {
        state.revealedAccountIds.add(accountId);
      }
      renderContent({ animate: false, preserveScroll: true });
      return;
    }

    const editAccountButton = event.target.closest("[data-edit-account]");
    if (editAccountButton) {
      const account = accountById(editAccountButton.dataset.editAccount);
      if (account) {
        openAccountDialog(account);
      }
      return;
    }

    const deleteAccountButton = event.target.closest("[data-delete-account]");
    if (deleteAccountButton) {
      deleteAccount(deleteAccountButton.dataset.deleteAccount);
      return;
    }

    const categoryFilter = event.target.closest("[data-category-filter]");
    if (categoryFilter) {
      state.categoryId = categoryFilter.dataset.categoryFilter || null;
      state.zoneFilter = "all";
      if (["categories", "settings", "minecraft"].includes(state.view)) {
        state.view = "all";
      }
      renderContent();
      return;
    }

    const favoriteButton = event.target.closest("[data-favorite-id]");
    if (favoriteButton) {
      event.stopPropagation();
      toggleFavorite(favoriteButton.dataset.favoriteId);
      return;
    }

    const categoryEdit = event.target.closest("[data-category-edit]");
    if (categoryEdit) {
      const category = categoryById(categoryEdit.dataset.categoryEdit);
      if (category) {
        openCategoryDialog(category);
      }
      return;
    }

    const categoryDelete = event.target.closest("[data-category-delete]");
    if (categoryDelete) {
      deleteCategory(categoryDelete.dataset.categoryDelete);
      return;
    }

    const categoryCard = event.target.closest("[data-open-category]");
    if (categoryCard) {
      openCategory(categoryCard.dataset.openCategory);
      return;
    }

    const resourceCard = event.target.closest("[data-resource-card]");
    if (resourceCard) {
      openDetail(resourceCard.dataset.resourceCard);
    }
  }

  function handleKeydown(event) {
    if (handleShortcutRecording(event)) {
      return;
    }

    const customSelectTrigger = event.target.closest?.(".custom-select-trigger");
    if (
      customSelectTrigger &&
      ["ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      openCustomSelect(customSelectTrigger);
      return;
    }

    const customSelectOption = event.target.closest?.(".custom-select-option");
    if (
      customSelectOption &&
      ["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
    ) {
      event.preventDefault();
      const options = [
        ...(customSelectOption
          .closest(".custom-select-menu")
          ?.querySelectorAll(".custom-select-option:not(:disabled)") || [])
      ];
      const currentIndex = options.indexOf(customSelectOption);
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? options.length - 1
            : event.key === "ArrowUp"
              ? Math.max(0, currentIndex - 1)
              : Math.min(options.length - 1, currentIndex + 1);
      options[nextIndex]?.focus({ preventScroll: true });
      return;
    }

    if (event.key === "Escape" && document.querySelector(".custom-select.is-open")) {
      const control = document.querySelector(".custom-select.is-open");
      closeCustomSelects();
      control
        ?.querySelector(".custom-select-trigger")
        ?.focus({ preventScroll: true });
      event.preventDefault();
      return;
    }

    if (
      event.key === "Escape" &&
      !document.getElementById("resource-date-panel")?.hidden
    ) {
      event.preventDefault();
      closeDatePicker({ restoreFocus: true });
      return;
    }

    if (document.querySelector("dialog[open]")) {
      return;
    }

    const dropdownTrigger = event.target.closest?.(".settings-dropdown-trigger");
    if (
      dropdownTrigger &&
      (event.key === "ArrowUp" || event.key === "ArrowDown")
    ) {
      event.preventDefault();
      const menu = dropdownTrigger
        .closest("[data-settings-dropdown]")
        ?.querySelector(".settings-dropdown-menu");
      if (menu?.hidden) {
        toggleStartupDropdown(dropdownTrigger);
      }
      const options = [
        ...dropdownTrigger
          .closest("[data-settings-dropdown]")
          ?.querySelectorAll(".settings-dropdown-option") || []
      ];
      const target =
        event.key === "ArrowUp" ? options[options.length - 1] : options[0];
      target?.focus({ preventScroll: true });
      return;
    }

    const dropdownOption = event.target.closest?.(".settings-dropdown-option");
    if (
      dropdownOption &&
      ["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
    ) {
      event.preventDefault();
      const options = [
        ...(dropdownOption
          .closest(".settings-dropdown-menu")
          ?.querySelectorAll(".settings-dropdown-option") || [])
      ];
      const currentIndex = options.indexOf(dropdownOption);
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? options.length - 1
            : event.key === "ArrowUp"
              ? Math.max(0, currentIndex - 1)
              : Math.min(options.length - 1, currentIndex + 1);
      options[nextIndex]?.focus({ preventScroll: true });
      return;
    }

    if (event.key === "Escape") {
      closeStartupDropdown({ restoreFocus: true });
      closeSortMenus();
    }

    if (
      event.altKey &&
      (event.key === "ArrowUp" || event.key === "ArrowDown")
    ) {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      if (moveSortableByKeyboard(event.target, direction)) {
        event.preventDefault();
        return;
      }
    }

    const isTyping =
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      event.target.isContentEditable;

    if (shortcutMatches(event, "search")) {
      event.preventDefault();
      closeStartupDropdown();
      if (state.view === "accounts") {
        document.getElementById("account-search")?.focus();
        return;
      }
      if (!["all", "favorites", "recent", "studio", "minecraft"].includes(state.view)) {
        setView("all");
      }
      elements.searchInput.focus();
      elements.searchInput.select();
      return;
    }

    if (
      shortcutMatches(event, "toggle-theme") &&
      (!isTyping || shortcutUsesModifier(state.shortcuts["toggle-theme"]))
    ) {
      event.preventDefault();
      toggleTheme();
      return;
    }

    if (
      shortcutMatches(event, "open-accounts") &&
      (!isTyping || shortcutUsesModifier(state.shortcuts["open-accounts"]))
    ) {
      event.preventDefault();
      closeStartupDropdown();
      setView("accounts");
      return;
    }

    if (
      shortcutMatches(event, "open-settings") &&
      (!isTyping || shortcutUsesModifier(state.shortcuts["open-settings"]))
    ) {
      event.preventDefault();
      closeStartupDropdown();
      setView("settings");
      return;
    }

    if (!isTyping && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const pressedKey = event.key.toLocaleLowerCase();
      if (/^[a-z]$/.test(pressedKey)) {
        if (pressedKey === "y") {
          easterBuffer = "y";
        } else if (easterBuffer && "yinl".startsWith(easterBuffer + pressedKey)) {
          easterBuffer += pressedKey;
        } else {
          easterBuffer = "";
        }
        window.clearTimeout(easterSequenceTimer);
        if (easterBuffer) {
          easterSequenceTimer = window.setTimeout(() => {
            easterBuffer = "";
          }, 2200);
        }
        if (easterBuffer === "yinl") {
          window.clearTimeout(easterSequenceTimer);
          easterBuffer = "";
          triggerEasterEgg("✦ 彩蛋：欢迎来到 YinL. 的秘密角落");
          return;
        }
      }

      if (
        shortcutMatches(event, "new-resource") &&
        easterBuffer !== "yin"
      ) {
        event.preventDefault();
        window.clearTimeout(easterSequenceTimer);
        easterBuffer = "";
        if (state.view === "accounts") {
          openAccountDialog();
        } else if (state.view === "studio") {
          window.ShijiStudio?.openAssetDialog();
        } else {
          const library =
            state.view === "custom" ? libraryById(state.libraryId) : null;
          openResourceDialog(
            null,
            library ? libraryAllowedTypes(library)[0] || "link" : "link",
            state.view === "minecraft"
              ? "minecraft"
              : library
                ? libraryZoneId(library.id)
                : "library"
          );
        }
        return;
      }
    }

    if (
      event.key === "Enter" &&
      !isTyping &&
      event.target.matches?.("[data-resource-card], [data-open-category], .about-feature--link")
    ) {
      event.preventDefault();
      event.target.click();
    }
  }

  function bindEvents() {
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("dragstart", startSortableDrag);
    document.addEventListener("dragover", handleSortableDragOver);
    document.addEventListener("drop", handleSortableDrop);
    document.addEventListener("dragend", finishSortableDrag);
    document.addEventListener("dragstart", startOrderRowDrag);
    document.addEventListener("dragover", handleOrderRowDragOver);
    document.addEventListener("dragend", finishOrderRowDrag);
    window.addEventListener("resize", () => closeCustomSelects());
    document.addEventListener(
      "scroll",
      (event) => {
        if (!event.target.closest?.(".custom-select-menu")) {
          closeCustomSelects();
        }
        if (!event.target.closest?.(".date-picker-panel")) {
          closeDatePicker();
        }
      },
      true
    );
    document.addEventListener("change", (event) => {
      const positionSelect = event.target.closest?.("[data-order-kind]");
      if (positionSelect) {
        moveOrderItem(
          positionSelect.dataset.orderKind,
          positionSelect.dataset.orderId,
          Number(positionSelect.value)
        );
      } else if (event.target.id === "minecraft-type") {
        updateMinecraftTagPresets();
      }
    });

    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

    elements.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      if (state.view === "studio") {
        return;
      }
      scheduleResourceSearchUpdate();
    });

    elements.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        state.query = "";
        event.target.value = "";
        window.clearTimeout(searchRenderTimer);
        searchRenderTimer = null;
        updateResourceSearchResults();
      }
    });

    elements.resourceForm.addEventListener("submit", submitResourceForm);
    elements.categoryForm.addEventListener("submit", submitCategoryForm);
    elements.accountForm.addEventListener("submit", submitAccountForm);
    document
      .getElementById("library-form")
      .addEventListener("submit", submitLibraryForm);
    document
      .getElementById("managed-category-form")
      .addEventListener("submit", addManagedCategory);

    document.getElementById("account-website").addEventListener("input", (event) => {
      window.clearTimeout(accountIconTimer);
      const website = event.target.value.trim();
      const feedback = document.getElementById("account-icon-feedback");
      if (!document.getElementById("account-icon-auto").checked) {
        updateAccountIconPreview(website);
        return;
      }
      if (!website) {
        updateAccountIconPreview("");
        return;
      }
      feedback.hidden = false;
      document.getElementById("account-icon-status").textContent =
        "正在获取网站图标…";
      accountIconTimer = window.setTimeout(async () => {
        updateAccountIconPreview(website);
        if (window.ShijiDesktop?.fetchSiteIcon) {
          try {
            const iconData = await window.ShijiDesktop.fetchSiteIcon(website);
            const currentWebsite =
              document.getElementById("account-website").value.trim();
            if (
              iconData &&
              currentWebsite === website &&
              document.getElementById("account-icon-auto").checked &&
              document.getElementById("account-icon-mode").value === "auto"
            ) {
              updateAccountIconPreview(website, iconData);
              document.getElementById("account-icon-status").textContent =
                "已抓取并保存网站图标";
            }
          } catch {
            // Keep the direct favicon fallback when automatic fetching is unavailable.
          }
        }
      }, 450);
    });

    document.getElementById("account-icon-auto").addEventListener("change", (event) => {
      if (event.target.checked) {
        document.getElementById("account-icon-mode").value = "auto";
        document.getElementById("account-icon-builtin").value = "";
        document.getElementById("account-icon-url").value = "";
        updateAccountIconPreview(
          document.getElementById("account-website").value.trim()
        );
      } else {
        clearAccountIcon();
      }
    });

    document.getElementById("account-icon-file").addEventListener("change", (event) => {
      loadCustomAccountIcon(event.target.files?.[0] || null);
      event.target.value = "";
    });

    document.getElementById("tutorial-prev").addEventListener("click", () => {
      tutorialStepIndex = Math.max(0, tutorialStepIndex - 1);
      renderTutorialDialog();
    });

    document.getElementById("tutorial-next").addEventListener("click", () => {
      if (tutorialStepIndex >= TUTORIAL_STEPS.length - 1) {
        document.getElementById("tutorial-dialog").close();
        return;
      }
      tutorialStepIndex += 1;
      renderTutorialDialog();
    });

    document.getElementById("account-platform").addEventListener("input", () => {
      document.getElementById("account-icon-preview-fallback").textContent =
        document.getElementById("account-platform").value.trim().charAt(0) || "站";
    });

    document.querySelectorAll("[data-resource-type]").forEach((button) => {
      button.addEventListener("click", () => {
        updateResourceType(button.dataset.resourceType);
        document.getElementById("resource-form-error").textContent = "";
      });
    });

    document.querySelectorAll("[data-open-password-vault]").forEach((button) => {
      button.addEventListener("click", () => {
        closeDialog("resource-dialog");
        openAccountDialog();
      });
    });

    document.getElementById("resource-description").addEventListener("input", (event) => {
      document.getElementById("description-count").textContent =
        `${event.target.value.length} / 1200`;
    });

    document.getElementById("resource-tags").addEventListener("input", () => {
      updateMinecraftTagPresets();
    });

    document.getElementById("resource-zone").addEventListener("change", (event) => {
      updateResourceZone(event.target.value);
    });

    document.getElementById("resource-file").addEventListener("change", (event) => {
      handleIncomingFile(event.target.files?.[0] || null);
    });

    document.getElementById("resource-file").addEventListener("click", async (event) => {
      if (!window.ShijiDesktop?.pickFile) {
        return;
      }
      event.preventDefault();
      try {
        const fileInfo = await window.ShijiDesktop.pickFile();
        if (fileInfo) {
          await setSelectedLocalFile(fileInfo);
        }
      } catch (error) {
        showToast(error.message || "无法读取所选文件", true);
      }
    });

    const fileDrop = document.getElementById("file-drop");
    ["dragenter", "dragover"].forEach((eventName) => {
      fileDrop.addEventListener(eventName, (event) => {
        event.preventDefault();
        fileDrop.classList.add("is-dragging");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      fileDrop.addEventListener(eventName, (event) => {
        event.preventDefault();
        fileDrop.classList.remove("is-dragging");
      });
    });
    fileDrop.addEventListener("drop", async (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (file) {
        await handleIncomingFile(file);
      }
    });

    [
      elements.resourceDialog,
      elements.categoryDialog,
      document.getElementById("category-options-dialog"),
      document.getElementById("order-dialog"),
      document.getElementById("release-notes-dialog"),
      document.getElementById("tutorial-dialog"),
      document.getElementById("library-dialog"),
      document.getElementById("library-manager-dialog"),
      elements.accountDialog,
      document.getElementById("author-dialog"),
      elements.welcomeDialog,
      document.getElementById("image-preview-dialog"),
      elements.detailDialog
    ].forEach((dialog) => {
        dialog.addEventListener("click", (event) => {
          if (event.target === dialog) {
            dialog.close();
          }
        });
      });

    elements.detailDialog.addEventListener("close", () => {
      state.detailResourceId = null;
    });

    elements.resourceDialog.addEventListener("close", () => {
      state.editingResourceId = null;
      selectedFile = null;
      selectedLocalFile = null;
      resourceEditorReturnResourceId = null;
      const backButton = document.getElementById("resource-editor-back");
      if (backButton) {
        backButton.hidden = true;
      }
      firstResourceGuideActive = false;
      document.getElementById("first-resource-guide").hidden = true;
    });

    document.getElementById("release-notes-dialog").addEventListener("close", () => {
      releaseNotesReturnToAuthor = false;
      const backButton = document.getElementById("release-notes-back");
      if (backButton) {
        backButton.hidden = true;
      }
    });

    document.getElementById("library-dialog").addEventListener("close", () => {
      libraryEditorReturnToManager = false;
      const backButton = document.getElementById("library-editor-back");
      if (backButton) {
        backButton.hidden = true;
      }
    });

    elements.welcomeDialog.addEventListener("close", markWelcomeSeen);

    elements.content.addEventListener("input", (event) => {
      if (event.target.id === "account-search") {
        state.accountQuery = event.target.value;
        const results = document.getElementById("account-results");
        if (results) {
          results.innerHTML = renderAccountResults();
        }
      }
    });

    elements.importInput.addEventListener("change", (event) => {
      importData(event.target.files?.[0]);
    });

    document.addEventListener(
      "error",
      (event) => {
        if (event.target?.id === "account-icon-preview-image") {
          const fallback = event.target.dataset.fallback;
          if (fallback && event.target.src !== fallback) {
            event.target.src = fallback;
            delete event.target.dataset.fallback;
            document.getElementById("account-icon-status").textContent =
              "已通过图标服务获取网站图标";
          } else {
            event.target.hidden = true;
            document.getElementById("account-icon-status").textContent =
              "未获取到网站图标，将显示平台首字";
          }
        } else if (event.target?.classList?.contains("account-favicon")) {
          const fallback = event.target.dataset.fallback;
          if (fallback && event.target.src !== fallback) {
            event.target.src = fallback;
            delete event.target.dataset.fallback;
          } else {
            event.target.remove();
          }
        }
      },
      true
    );
  }

  async function loadStartupSetting() {
    if (!window.ShijiDesktop?.getStartupSetting) {
      state.startupSettingKnown = true;
      return;
    }
    try {
      const result = await window.ShijiDesktop.getStartupSetting();
      state.startupAtLogin = Boolean(result?.enabled);
      state.startupSettingKnown = true;
      if (state.view === "settings" && state.settingsSection === "general") {
        renderContent({ animate: false, preserveScroll: true });
      }
    } catch (error) {
      state.startupSettingKnown = true;
      console.warn("Unable to read startup setting:", error);
    }
  }

  async function loadCloseBehavior() {
    if (!window.ShijiDesktop?.getCloseBehavior) {
      state.closeBehaviorKnown = true;
      return;
    }
    try {
      const result = await window.ShijiDesktop.getCloseBehavior();
      state.closeBehavior =
        result?.behavior === "tray" ? "tray" : "exit";
      state.closeBehaviorKnown = true;
      localStorage.setItem("shiji.closeBehavior", state.closeBehavior);
      if (state.view === "settings" && state.settingsSection === "general") {
        renderContent({ animate: false, preserveScroll: true });
      }
    } catch (error) {
      state.closeBehaviorKnown = true;
      console.warn("Unable to read window close behavior:", error);
    }
  }

  window.ShijiUI = Object.freeze({
    upgradeCustomSelects,
    syncCustomSelect,
    closeCustomSelects
  });

  async function init() {
    initTheme();
    applyPersonalization();
    initLayout();
    loadCategoryPreferences();
    initNavigationOrder();
    syncShortcutHints();
    syncDatePicker();
    upgradeCustomSelects();
    bindEvents();
    void loadStartupSetting();
    void loadCloseBehavior();
    renderContent();

    try {
      const data = await Store.initialize();
      state.categories = data.categories;
      state.resources = data.resources;
      state.vaultAccounts = normalizeVaultAccounts(data.vaultRecord?.accounts);
      state.view = state.startupView;
      appIsReady = true;
      renderContent();
      void window.ShijiStudio?.load();
      showWelcomeIfNeeded();
      window.setTimeout(() => {
        window.ResourceLibrary?.openSetupIfNeeded();
      }, 520);
    } catch (error) {
      console.error("Unable to initialize resource library:", error);
      elements.content.innerHTML = `
        <div class="content-inner">
          <div class="empty-state">
            <div class="empty-icon">${icon("info")}</div>
            <h2>资源库暂时无法打开</h2>
            <p>${escapeHTML(error.message || "本地数据库连接失败")} 请通过本地服务器打开项目，并确认浏览器允许网站存储数据。</p>
            <button class="button button--ghost" type="button" onclick="location.reload()">重新加载</button>
          </div>
        </div>
      `;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
