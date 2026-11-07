(function () {
  "use strict";

  const Desktop = window.ShijiDesktop;
  const STORAGE_KEY = "shiji.assetLibrary";
  const DEFERRED_KEY = "shiji.assetLibraryDeferred";
  const ASSET_FOLDERS = {
    recording: ["01_录制原片"],
    transition: ["02_可复用素材", "转场"],
    texture: ["02_可复用素材", "材质包"],
    motion: ["02_可复用素材", "动效"],
    audio: ["02_可复用素材", "音频"],
    template: ["02_可复用素材", "模板"],
    cover: ["05_封面", "导出图"],
    other: ["02_可复用素材", "其他"]
  };
  const MINECRAFT_FOLDERS = {
    map: ["00_通用资源", "我的世界", "地图"],
    shader: ["02_可复用素材", "光影"],
    mod: ["00_通用资源", "我的世界", "模组"],
    resourcepack: ["02_可复用素材", "材质包"],
    modpack: ["00_通用资源", "我的世界", "整合包"]
  };
  const EDITOR_LABELS = {
    jianying: "剪映",
    premiere: "Premiere Pro",
    aftereffects: "After Effects",
    photoshop: "Photoshop",
    other: "其他"
  };
  const state = {
    config: loadConfig(),
    draft: null,
    setupResolve: null,
    saving: false
  };

  function icon(name, className = "icon") {
    return `<svg class="${className}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  }

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

  function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    const text = document.getElementById("toast-text");
    if (!toast || !text) {
      return;
    }
    text.textContent = message;
    toast.classList.toggle("is-error", isError);
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2600);
  }

  function normalizeConfig(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const rootPath = String(raw.rootPath || "").trim();
    if (!rootPath) {
      return null;
    }
    return {
      rootPath,
      cachePath: String(raw.cachePath || "").trim(),
      mode: raw.mode === "move" ? "move" : "copy",
      configuredAt: Number(raw.configuredAt) || Date.now()
    };
  }

  function loadConfig() {
    try {
      return normalizeConfig(
        JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")
      );
    } catch {
      return null;
    }
  }

  function saveConfig(config) {
    state.config = normalizeConfig(config);
    if (state.config) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config));
      localStorage.removeItem(DEFERRED_KEY);
    }
    return state.config;
  }

  function isConfigured() {
    return Boolean(state.config?.rootPath);
  }

  function getConfig() {
    return state.config ? { ...state.config } : null;
  }

  function assetFolder(kind) {
    return [...(ASSET_FOLDERS[kind] || ASSET_FOLDERS.other)];
  }

  function genericAssetFolder(categoryName) {
    return ["00_通用资源", String(categoryName || "未分类").trim() || "未分类"];
  }

  function minecraftAssetFolder(type) {
    return [
      ...(MINECRAFT_FOLDERS[type] || ["00_通用资源", "我的世界", "其他"])
    ];
  }

  function coverFolder(kind) {
    return [
      "05_封面",
      kind === "source" ? "PSD源文件" : "导出图"
    ];
  }

  function finalVideoFolder() {
    return ["04_成片"];
  }

  function editorFolder(kind) {
    return ["03_项目工程", EDITOR_LABELS[kind] || "其他"];
  }

  async function importFile(fileInfo, folderSegments) {
    if (!fileInfo?.path || !isConfigured() || !Desktop?.importLibraryFile) {
      return fileInfo;
    }
    const imported = await Desktop.importLibraryFile({
      filePath: fileInfo.path,
      rootPath: state.config.rootPath,
      mode: state.config.mode,
      folderSegments
    });
    return {
      ...fileInfo,
      ...imported,
      originalPath: imported.sourcePath || fileInfo.path
    };
  }

  async function renameFiles(paths, baseName) {
    if (!Desktop?.renameLibraryFiles) {
      throw new Error("文件重命名仅在电脑版中可用。");
    }
    return Desktop.renameLibraryFiles({
      paths: Array.isArray(paths) ? paths : [],
      baseName
    });
  }

  function ensureDialog() {
    let dialog = document.getElementById("library-setup-dialog");
    if (dialog) {
      return dialog;
    }
    dialog = document.createElement("dialog");
    dialog.className = "modal library-setup-dialog";
    dialog.id = "library-setup-dialog";
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        finishSetup(false);
      }
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finishSetup(false);
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  function resolveSetup(result) {
    if (state.setupResolve) {
      const resolve = state.setupResolve;
      state.setupResolve = null;
      resolve(result);
    }
  }

  function finishSetup(result = false) {
    const dialog = document.getElementById("library-setup-dialog");
    if (dialog?.open) {
      dialog.close();
    }
    if (!result && !state.config) {
      localStorage.setItem(DEFERRED_KEY, "1");
    }
    resolveSetup(Boolean(result));
  }

  function renderModeOptions() {
    const mode = state.draft?.mode || "copy";
    return `
      <div class="library-mode-grid" role="radiogroup" aria-label="素材入库方式">
        <button
          class="library-mode-option${mode === "copy" ? " is-active" : ""}"
          type="button"
          data-library-action="mode"
          data-library-mode="copy"
          aria-pressed="${mode === "copy"}"
        >
          <span>${icon("copy")}</span>
          <strong>复制到素材库</strong>
          <small>原文件保留，最安全，适合已有剪辑项目</small>
        </button>
        <button
          class="library-mode-option${mode === "move" ? " is-active" : ""}"
          type="button"
          data-library-action="mode"
          data-library-mode="move"
          aria-pressed="${mode === "move"}"
        >
          <span>${icon("folder")}</span>
          <strong>移动到素材库</strong>
          <small>不重复占空间，但会改变原文件位置</small>
        </button>
      </div>
    `;
  }

  function renderSetupDialog() {
    const configured = isConfigured();
    const draft = state.draft || {};
    return `
      <div class="modal-card library-setup-card">
        <header class="modal-header">
          <div>
            <p class="eyebrow">${configured ? "素材库设置" : "首次设置"}</p>
            <h2>选择素材库位置</h2>
          </div>
          <button class="icon-button" type="button" data-library-action="later" aria-label="关闭">${icon("close")}</button>
        </header>
        <div class="modal-body library-setup-body">
          <section class="library-setup-intro">
            <span>${icon("folder")}</span>
            <div>
              <strong>把以后导入的资源集中到一个地方</strong>
              <p>拾集会根据素材类型创建二级目录。已有素材不会被强制搬动，缓存和原素材分开保存。</p>
            </div>
          </section>
          <div class="library-path-setting">
            <div class="library-path-heading">
              <div><strong>素材库位置 <em>*</em></strong><span>录制原片、材质包、封面和成片会从这里分类保存。</span></div>
              <button class="button button--ghost" type="button" data-library-action="choose-root">${icon("folder")}<span>选择文件夹</span></button>
            </div>
            <div class="library-path-value${draft.rootPath ? " has-value" : ""}">
              ${draft.rootPath ? escapeHTML(draft.rootPath) : "尚未选择素材库文件夹"}
            </div>
          </div>
          <div class="library-path-setting">
            <div class="library-path-heading">
              <div><strong>缓存位置</strong><span>缩略图、临时截图等可清理数据，不会和原素材混放。</span></div>
              <div class="library-path-actions">
                <button class="button button--quiet" type="button" data-library-action="default-cache">恢复默认</button>
                <button class="button button--ghost" type="button" data-library-action="choose-cache">${icon("database")}<span>选择文件夹</span></button>
              </div>
            </div>
            <div class="library-path-value has-value">${escapeHTML(draft.cachePath || "正在读取默认缓存位置…")}</div>
          </div>
          <div class="library-mode-section">
            <div class="library-path-heading">
              <div><strong>以后导入的文件</strong><span>只影响新导入文件，不会自动移动现有素材。</span></div>
            </div>
            ${renderModeOptions()}
          </div>
          <details class="library-structure">
            <summary>${icon("layers")}<span>查看自动分类结构</span></summary>
            <pre>拾集素材库/
├─ 00_通用资源/
├─ 01_录制原片/
├─ 02_可复用素材/
│  ├─ 转场/
│  ├─ 材质包/
│  ├─ 光影/
│  ├─ 动效/
│  ├─ 音频/
│  └─ 模板/
├─ 03_项目工程/
├─ 04_成片/
└─ 05_封面/
   ├─ PSD源文件/
   └─ 导出图/</pre>
            <p>不会预先创建空目录；第一次导入对应类型时才创建。</p>
          </details>
          <p class="form-error" id="library-setup-error" role="alert"></p>
        </div>
        <footer class="modal-footer library-setup-footer">
          <button class="button button--quiet" type="button" data-library-action="later">稍后设置</button>
          <button class="button button--primary" type="button" data-library-action="save" ${draft.rootPath ? "" : "disabled"}>
            ${icon("check")}<span>${configured ? "保存素材库设置" : "完成设置并开始使用"}</span>
          </button>
        </footer>
      </div>
    `;
  }

  function updateSetupDialog() {
    const dialog = ensureDialog();
    dialog.innerHTML = renderSetupDialog();
  }

  async function openSetup({ required = false } = {}) {
    if (!Desktop?.pickDirectory || !Desktop?.initializeLibrary) {
      if (required) {
        showToast("素材库设置仅在电脑版中可用", true);
      }
      return false;
    }
    const dialog = ensureDialog();
    if (dialog.open) {
      return false;
    }
    const defaultCache = await Desktop.getDefaultCachePath?.().catch(() => null);
    state.draft = {
      rootPath: state.config?.rootPath || "",
      cachePath:
        state.config?.cachePath ||
        defaultCache?.path ||
        "",
      mode: state.config?.mode || "copy"
    };
    updateSetupDialog();
    dialog.showModal();
    return new Promise((resolve) => {
      state.setupResolve = resolve;
    });
  }

  function openSetupIfNeeded() {
    if (
      isConfigured() ||
      localStorage.getItem(DEFERRED_KEY) === "1" ||
      !Desktop
    ) {
      return;
    }
    const welcome = document.getElementById("welcome-dialog");
    if (welcome?.open) {
      welcome.addEventListener(
        "close",
        () => {
          window.setTimeout(() => void openSetup({ required: true }), 180);
        },
        { once: true }
      );
      return;
    }
    void openSetup({ required: true });
  }

  async function chooseFolder(kind) {
    if (!Desktop?.pickDirectory) {
      showToast("选择文件夹仅在电脑版中可用", true);
      return;
    }
    try {
      const folder = await Desktop.pickDirectory();
      if (!folder?.path) {
        return;
      }
      state.draft[kind === "cache" ? "cachePath" : "rootPath"] = folder.path;
      updateSetupDialog();
    } catch (error) {
      showToast(error.message || "无法选择文件夹", true);
    }
  }

  async function useDefaultCache() {
    try {
      const result = await Desktop?.getDefaultCachePath?.();
      if (result?.path) {
        state.draft.cachePath = result.path;
        updateSetupDialog();
      }
    } catch (error) {
      showToast(error.message || "无法读取默认缓存位置", true);
    }
  }

  async function saveSetup() {
    if (state.saving) {
      return;
    }
    const error = document.getElementById("library-setup-error");
    if (!state.draft?.rootPath) {
      if (error) {
        error.textContent = "请先选择素材库文件夹。";
      }
      return;
    }
    state.saving = true;
    try {
      await configure({
        rootPath: state.draft.rootPath,
        cachePath: state.draft.cachePath,
        mode: state.draft.mode
      });
      finishSetup(true);
      showToast("素材库位置已设置");
      window.dispatchEvent(
        new CustomEvent("shiji:library-configured", {
          detail: getConfig()
        })
      );
    } catch (setupError) {
      if (error) {
        error.textContent = setupError.message || "素材库设置失败。";
      }
    } finally {
      state.saving = false;
    }
  }

  async function configure(options) {
    const initialized = await Desktop.initializeLibrary({
      rootPath: options?.rootPath,
      cachePath: options?.cachePath
    });
    return saveConfig({
      rootPath: initialized.root,
      cachePath: initialized.cache,
      mode: options?.mode === "move" ? "move" : "copy",
      configuredAt: Date.now()
    });
  }

  function renderSettingsCard() {
    const config = state.config;
    if (!config) {
      return `
        <section class="settings-card">
          <h2>${icon("folder")}素材库位置</h2>
          <p>设置后，以后导入的原片、材质包、封面和成片会按类型统一归档。</p>
          <div class="settings-row">
            <div class="settings-row-copy"><strong>尚未设置素材库</strong><span>当前仍会记录文件原位置，不会自动复制文件</span></div>
            <button class="button button--primary" type="button" data-library-action="open-setup">${icon("folder")}<span>开始设置</span></button>
          </div>
        </section>
      `;
    }
    return `
      <section class="settings-card">
        <h2>${icon("folder")}素材库位置</h2>
        <p>新导入的素材会按类型归档；已有文件和剪辑工程位置不会被自动改变。</p>
        <div class="settings-row">
          <div class="settings-row-copy"><strong>素材库</strong><span title="${escapeHTML(config.rootPath)}">${escapeHTML(config.rootPath)}</span></div>
          <div class="settings-actions-grid">
            <button class="button button--quiet" type="button" data-library-action="reveal-root">${icon("folder")}<span>打开</span></button>
            <button class="button button--ghost" type="button" data-library-action="open-setup">${icon("edit")}<span>修改</span></button>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy"><strong>缓存位置</strong><span title="${escapeHTML(config.cachePath)}">${escapeHTML(config.cachePath)}</span></div>
          <button class="button button--quiet" type="button" data-library-action="reveal-cache">${icon("database")}<span>打开缓存</span></button>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy"><strong>入库方式</strong><span>${config.mode === "move" ? "新文件会移动到素材库" : "新文件会复制到素材库，原文件保留"}</span></div>
          <button class="button button--ghost" type="button" data-library-action="open-setup">修改设置</button>
        </div>
      </section>
    `;
  }

  async function revealConfiguredFolder(kind) {
    const path = kind === "cache" ? state.config?.cachePath : state.config?.rootPath;
    if (!path || !Desktop?.revealPath) {
      return;
    }
    try {
      await Desktop.revealPath(path);
    } catch (error) {
      showToast(error.message || "无法打开文件夹", true);
    }
  }

  async function handleAction(element) {
    const action = element.dataset.libraryAction;
    if (action === "open-setup") {
      void openSetup({ required: !isConfigured() });
      return;
    }
    if (action === "choose-root") {
      await chooseFolder("root");
      return;
    }
    if (action === "choose-cache") {
      await chooseFolder("cache");
      return;
    }
    if (action === "default-cache") {
      await useDefaultCache();
      return;
    }
    if (action === "mode") {
      state.draft.mode =
        element.dataset.libraryMode === "move" ? "move" : "copy";
      updateSetupDialog();
      return;
    }
    if (action === "save") {
      await saveSetup();
      return;
    }
    if (action === "later") {
      finishSetup(false);
      return;
    }
    if (action === "reveal-root") {
      await revealConfiguredFolder("root");
      return;
    }
    if (action === "reveal-cache") {
      await revealConfiguredFolder("cache");
    }
  }

  document.addEventListener(
    "click",
    (event) => {
      const element = event.target.closest?.("[data-library-action]");
      if (!element) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      void handleAction(element);
    },
    true
  );

  window.addEventListener("shiji:library-configured", () => {
    if (document.getElementById("content")?.querySelector(".settings-shell")) {
      document.querySelector('[data-settings-section="library"]')?.click();
    }
  });

  window.ResourceLibrary = Object.freeze({
    isConfigured,
    getConfig,
    openSetupIfNeeded,
    openSetup,
    configure,
    importFile,
    renameFiles,
    assetFolder,
    genericAssetFolder,
    minecraftAssetFolder,
    coverFolder,
    finalVideoFolder,
    editorFolder,
    renderSettingsCard
  });
})();
