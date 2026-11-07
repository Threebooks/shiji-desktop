(function () {
  "use strict";

  const Store = window.ResourceStore;
  const Desktop = window.ShijiDesktop;
  const KIND_META = {
    recording: { label: "录制原片", icon: "monitor", tone: "#557d68" },
    transition: { label: "转场", icon: "layers", tone: "#8a6c97" },
    texture: { label: "贴图 / 材质", icon: "gallery", tone: "#ad7a4d" },
    motion: { label: "动效", icon: "settings", tone: "#5d7398" },
    audio: { label: "音频", icon: "note", tone: "#a86465" },
    template: { label: "模板", icon: "file", tone: "#777b56" },
    cover: { label: "封面", icon: "star", tone: "#9a5063" },
    other: { label: "其他", icon: "folder", tone: "#65756c" }
  };
  const ASSET_STATUS_META = {
    inbox: { label: "待筛选", tone: "#7c837b" },
    usable: { label: "可用", tone: "#557d68" },
    waste: { label: "废片", tone: "#a64d4d" },
    archived: { label: "已归档", tone: "#5d7398" },
    trash: { label: "已清理", tone: "#777b56" }
  };
  const PROJECT_STATUS_META = {
    planning: { label: "准备素材", tone: "#7c837b" },
    editing: { label: "剪辑中", tone: "#5d7398" },
    completed: { label: "已发布", tone: "#557d68" },
    archived: { label: "已归档", tone: "#8a7244" }
  };
  const EDITOR_META = {
    jianying: { label: "剪映", icon: "monitor", extensions: [".json"] },
    premiere: { label: "Premiere Pro", icon: "layers", extensions: [".prproj"] },
    aftereffects: {
      label: "After Effects",
      icon: "settings",
      extensions: [".aep", ".aepx"]
    },
    photoshop: {
      label: "Photoshop",
      icon: "gallery",
      extensions: [".psd", ".psb"]
    },
    other: { label: "其他工程", icon: "file", extensions: [] }
  };
  const VIDEO_EXTENSIONS = new Set([
    ".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".wmv", ".flv",
    ".mts", ".m2ts"
  ]);
  const IMAGE_EXTENSIONS = new Set([
    ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff",
    ".psd", ".psb"
  ]);
  const AUDIO_EXTENSIONS = new Set([
    ".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".aiff"
  ]);
  const PROJECT_EXTENSIONS = new Set([
    ".prproj", ".aep", ".aepx", ".drp", ".veg", ".blend"
  ]);
  const TAB_META = {
    assets: { label: "全部素材", icon: "library" },
    recordings: { label: "录制原片", icon: "monitor" },
    reusable: { label: "可复用素材", icon: "layers" },
    projects: { label: "视频项目", icon: "inbox" },
    covers: { label: "封面", icon: "star" },
    cleanup: { label: "待清理", icon: "trash" }
  };
  const ASSET_GUIDE_KEY = "shiji.assetGuideSeen";
  const STARTER_ASSETS_KEY = "shiji.starterAssets";
  const STARTER_PREVIEW_SRC = "./assets/demo/recording-preview.mp4";
  const AUTO_SYNC_FOLDER_KEY = "shiji.studioAutoSyncFolder";
  const AUTO_SYNC_INTERVAL_MS = 10000;
  const BROWSER_FILE_PREFIX = "browser-file://";
  const BROWSER_UPLOAD_ACCEPT = [
    "video/*",
    "audio/*",
    "image/*",
    ".psd",
    ".psb",
    ".prproj",
    ".aep",
    ".aepx",
    ".drp",
    ".veg",
    ".blend"
  ].join(",");
  const DEFAULT_STARTER_ASSETS = [
    {
      id: "starter-video-01",
      title: "示例视频素材 01",
      kind: "recording",
      description: "首次使用示例，可以像普通素材一样修改名称、类型和说明。"
    },
    {
      id: "starter-video-02",
      title: "示例视频素材 02",
      kind: "recording",
      description: "上传第一份真实素材后，初始卡片会自动隐藏。"
    }
  ];

  const state = {
    loaded: false,
    loading: false,
    loadError: "",
    tab: "assets",
    kind: "all",
    status: "all",
    query: "",
    assets: [],
    projects: [],
    selectedAssetIds: new Set(),
    pendingProjectAssetIds: [],
    pendingFiles: [],
    dialogContext: null,
    imageCache: new Map(),
    browserMediaUrls: new Map(),
    videoThumbQueue: new Set(),
    syncFolder: "",
    syncTimer: null,
    syncBusy: false,
    syncError: "",
    searchTimer: null
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

  function makeId(prefix = "studio") {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (!value) {
      return "0 B";
    }
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(
      units.length - 1,
      Math.floor(Math.log(value) / Math.log(1024))
    );
    const size = value / 1024 ** index;
    return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
  }

  function formatDate(timestamp) {
    if (!timestamp) {
      return "未记录日期";
    }
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(timestamp));
  }

  function formatRelativeTime(timestamp) {
    if (!timestamp) {
      return "刚刚";
    }
    const delta = Date.now() - Number(timestamp);
    if (delta < 60 * 1000) {
      return "刚刚";
    }
    if (delta < 60 * 60 * 1000) {
      return `${Math.floor(delta / (60 * 1000))} 分钟前`;
    }
    if (delta < 24 * 60 * 60 * 1000) {
      return `${Math.floor(delta / (60 * 60 * 1000))} 小时前`;
    }
    if (delta < 30 * 24 * 60 * 60 * 1000) {
      return `${Math.floor(delta / (24 * 60 * 60 * 1000))} 天前`;
    }
    return formatDate(timestamp);
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () =>
        reject(reader.error || new Error("无法读取浏览器素材"));
      reader.readAsDataURL(blob);
    });
  }

  function extensionOf(name) {
    const value = String(name || "").toLocaleLowerCase("zh-CN");
    const dot = value.lastIndexOf(".");
    return dot >= 0 ? value.slice(dot) : "";
  }

  function isVideoFile(fileName) {
    return VIDEO_EXTENSIONS.has(extensionOf(fileName));
  }

  function isAudioFile(fileName) {
    return AUDIO_EXTENSIONS.has(extensionOf(fileName));
  }

  function isDisplayImageFile(fileName) {
    return (
      IMAGE_EXTENSIONS.has(extensionOf(fileName)) &&
      !/\.(?:psd|psb|tif|tiff)$/i.test(String(fileName || ""))
    );
  }

  function mediaUrl(filePath) {
    return `shiji-media://local/?path=${encodeURIComponent(filePath)}`;
  }

  function formatMediaTime(seconds) {
    if (!Number.isFinite(Number(seconds)) || Number(seconds) < 0) {
      return "0:00";
    }
    const total = Math.floor(Number(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }

  function embeddedFile(asset) {
    return asset?.fileBlob instanceof Blob ? asset.fileBlob : null;
  }

  function browserAssetUrl(asset) {
    const fileBlob = embeddedFile(asset);
    if (!fileBlob) {
      return "";
    }
    const cached = state.browserMediaUrls.get(asset.id);
    if (cached) {
      return cached;
    }
    const objectUrl = URL.createObjectURL(fileBlob);
    state.browserMediaUrls.set(asset.id, objectUrl);
    return objectUrl;
  }

  function revokeBrowserAssetUrl(assetId) {
    const objectUrl = state.browserMediaUrls.get(assetId);
    if (!objectUrl) {
      return;
    }
    URL.revokeObjectURL(objectUrl);
    state.browserMediaUrls.delete(assetId);
  }

  function assetMediaSource(asset) {
    if (embeddedFile(asset)) {
      return browserAssetUrl(asset);
    }
    return Desktop && asset?.localPath ? mediaUrl(asset.localPath) : "";
  }

  function inlineVideoMarkup({ source, title, poster = "" }) {
    return `
      <div class="studio-inline-video-shell">
        <video
          class="studio-inline-video"
          src="${escapeHTML(source)}"
          ${poster ? `poster="${escapeHTML(poster)}"` : ""}
          playsinline
          preload="metadata"
          aria-label="${escapeHTML(title)}"
          tabindex="0"
        ></video>
        <div class="studio-inline-controls">
          <button class="studio-inline-control-button" type="button" aria-label="播放视频" data-inline-video-toggle>
            <svg class="icon" data-inline-icon-play aria-hidden="true"><use href="#icon-play-fill"></use></svg>
            <svg class="icon" data-inline-icon-pause aria-hidden="true" hidden><use href="#icon-pause"></use></svg>
          </button>
          <input
            class="studio-inline-progress"
            type="range"
            min="0"
            max="1000"
            value="0"
            step="1"
            aria-label="视频进度"
            data-inline-video-progress
          />
          <span class="studio-inline-time" data-inline-video-time>0:00 / 0:00</span>
          <button class="studio-inline-control-button" type="button" aria-label="静音" data-inline-video-mute>
            <svg class="icon" data-inline-icon-volume aria-hidden="true"><use href="#icon-volume"></use></svg>
            <svg class="icon" data-inline-icon-muted aria-hidden="true" hidden><use href="#icon-volume-off"></use></svg>
          </button>
          <button class="studio-inline-control-button" type="button" aria-label="全屏播放" data-inline-video-fullscreen>
            ${icon("fullscreen")}
          </button>
        </div>
        <button class="studio-inline-play" type="button" data-inline-video-play>
          ${icon("play")}
          <span>播放预览</span>
        </button>
        <p class="studio-inline-video-error" hidden>当前视频无法在拾集内播放，请尝试独立播放器或检查文件格式。</p>
      </div>
    `;
  }

  function bindInlineVideoPlayers(root = document) {
    root.querySelectorAll(".studio-inline-video-shell").forEach((shell) => {
      const video = shell.querySelector(".studio-inline-video");
      const trigger = shell.querySelector("[data-inline-video-play]");
      const error = shell.querySelector(".studio-inline-video-error");
      if (!(video instanceof HTMLVideoElement) || !trigger) {
        return;
      }
      const toggle = shell.querySelector("[data-inline-video-toggle]");
      const playIcon = shell.querySelector("[data-inline-icon-play]");
      const pauseIcon = shell.querySelector("[data-inline-icon-pause]");
      const mute = shell.querySelector("[data-inline-video-mute]");
      const volumeIcon = shell.querySelector("[data-inline-icon-volume]");
      const mutedIcon = shell.querySelector("[data-inline-icon-muted]");
      const fullscreen = shell.querySelector(
        "[data-inline-video-fullscreen]"
      );
      const progress = shell.querySelector("[data-inline-video-progress]");
      const time = shell.querySelector("[data-inline-video-time]");
      const syncPlaybackIcon = () => {
        if (playIcon) {
          playIcon.hidden = !video.paused;
        }
        if (pauseIcon) {
          pauseIcon.hidden = video.paused;
        }
        toggle?.setAttribute(
          "aria-label",
          video.paused ? "播放视频" : "暂停视频"
        );
      };
      const togglePlayback = () => {
        if (video.paused) {
          video.play().catch(() => {
            if (error) {
              error.hidden = false;
            }
          });
        } else {
          video.pause();
        }
      };
      const updateProgress = () => {
        const duration = Number.isFinite(video.duration)
          ? Math.max(0, video.duration)
          : 0;
        const current = Math.min(duration || video.currentTime, video.currentTime);
        const ratio = duration ? current / duration : 0;
        if (progress) {
          progress.value = String(Math.round(ratio * 1000));
          progress.style.setProperty(
            "--inline-video-progress",
            `${Math.max(0, Math.min(100, ratio * 100))}%`
          );
        }
        if (time) {
          time.textContent = `${formatMediaTime(current)} / ${formatMediaTime(duration)}`;
        }
      };
      const syncMutedIcon = () => {
        if (volumeIcon) {
          volumeIcon.hidden = video.muted;
        }
        if (mutedIcon) {
          mutedIcon.hidden = !video.muted;
        }
        mute?.setAttribute(
          "aria-label",
          video.muted ? "取消静音" : "静音"
        );
      };
      trigger.addEventListener("click", () => {
        video.play().catch(() => {
          if (error) {
            error.hidden = false;
          }
        });
      });
      toggle?.addEventListener("click", togglePlayback);
      video.addEventListener("click", togglePlayback);
      video.addEventListener("play", () => {
        trigger.hidden = true;
        syncPlaybackIcon();
      });
      video.addEventListener("pause", () => {
        if (!video.ended) {
          trigger.hidden = false;
        }
        syncPlaybackIcon();
      });
      video.addEventListener("ended", () => {
        trigger.hidden = false;
        syncPlaybackIcon();
      });
      video.addEventListener("loadedmetadata", updateProgress);
      video.addEventListener("durationchange", updateProgress);
      video.addEventListener("timeupdate", updateProgress);
      video.addEventListener("volumechange", syncMutedIcon);
      mute?.addEventListener("click", () => {
        video.muted = !video.muted;
      });
      fullscreen?.addEventListener("click", async () => {
        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          } else if (shell.requestFullscreen) {
            await shell.requestFullscreen();
          } else {
            await video.requestFullscreen?.();
          }
        } catch {
          // Fullscreen can be unavailable in embedded browser surfaces.
        }
      });
      progress?.addEventListener("input", () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) {
          return;
        }
        video.currentTime =
          (Number(progress.value) / 1000) * video.duration;
        updateProgress();
      });
      syncPlaybackIcon();
      syncMutedIcon();
      video.addEventListener("error", () => {
        trigger.hidden = true;
        if (error) {
          error.hidden = false;
        }
      });
    });
  }

  function inferAssetKind(fileName) {
    const name = String(fileName || "").toLocaleLowerCase("zh-CN");
    const extension = extensionOf(name);
    if (VIDEO_EXTENSIONS.has(extension)) {
      if (/transition|转场/.test(name)) {
        return "transition";
      }
      if (/motion|动效|animation|anim/.test(name)) {
        return "motion";
      }
      return "recording";
    }
    if (AUDIO_EXTENSIONS.has(extension)) {
      return "audio";
    }
    if (IMAGE_EXTENSIONS.has(extension)) {
      if (/cover|封面|thumb|标题/.test(name)) {
        return "cover";
      }
      return "texture";
    }
    if (PROJECT_EXTENSIONS.has(extension)) {
      return "template";
    }
    if (/template|模板/.test(name)) {
      return "template";
    }
    if (/transition|转场/.test(name)) {
      return "transition";
    }
    if (/texture|材质|贴图/.test(name)) {
      return "texture";
    }
    return "other";
  }

  function inferEditorKind(fileName) {
    const name = String(fileName || "").toLocaleLowerCase("zh-CN");
    const extension = extensionOf(name);
    if (extension === ".prproj") {
      return "premiere";
    }
    if (extension === ".aep" || extension === ".aepx") {
      return "aftereffects";
    }
    if (extension === ".psd" || extension === ".psb") {
      return "photoshop";
    }
    if (
      extension === ".json" ||
      name.includes("draft") ||
      name.includes("剪映") ||
      name.includes("jianying")
    ) {
      return "jianying";
    }
    return "other";
  }

  function normalizeFileInfo(file) {
    if (!file || typeof file !== "object") {
      return null;
    }
    const isBrowserFile =
      typeof File !== "undefined" && file instanceof File;
    const fileBlob =
      file.fileBlob instanceof Blob
        ? file.fileBlob
        : isBrowserFile
          ? file
          : null;
    const suppliedPath = String(file.path || "").trim();
    if (!suppliedPath && !fileBlob) {
      return null;
    }
    const name = String(
      file.name ||
      (suppliedPath ? suppliedPath.split(/[\\/]/).pop() : "") ||
      "未命名文件"
    );
    const path =
      suppliedPath ||
      `${BROWSER_FILE_PREFIX}${encodeURIComponent(
        `${name}:${fileBlob.size}:${fileBlob.lastModified || 0}`
      )}`;
    return {
      path,
      name,
      size: Math.max(0, Number(file.size) || fileBlob?.size || 0),
      lastModified:
        Number(file.lastModified) || Number(fileBlob?.lastModified) || Date.now(),
      sourcePath: String(file.sourcePath || file.originalPath || ""),
      isDirectory: Boolean(file.isDirectory),
      storageMode: fileBlob ? "embedded" : "path",
      fileBlob
    };
  }

  function normalizeTags(value) {
    const source = Array.isArray(value) ? value : String(value || "").split(/[,，]/);
    return [...new Set(
      source
        .map((tag) => String(tag || "").trim().slice(0, 24))
        .filter(Boolean)
    )].slice(0, 20);
  }

  function normalizeAsset(raw) {
    if (!raw || typeof raw !== "object" || !String(raw.title || "").trim()) {
      return null;
    }
    const now = Date.now();
    const fileBlob = raw.fileBlob instanceof Blob ? raw.fileBlob : null;
    return {
      id: String(raw.id || makeId("asset")),
      title: String(raw.title).trim().slice(0, 120),
      kind: KIND_META[raw.kind] ? raw.kind : "recording",
      status: ASSET_STATUS_META[raw.status] ? raw.status : "inbox",
      description: String(raw.description || "").trim().slice(0, 800),
      tags: normalizeTags(raw.tags),
      favorite: Boolean(raw.favorite),
      minecraftVersion: String(raw.minecraftVersion || "").trim().slice(0, 40),
      localPath: String(raw.localPath || ""),
      sourcePath: String(raw.sourcePath || ""),
      fileName: String(raw.fileName || ""),
      fileSize: Math.max(0, Number(raw.fileSize) || 0),
      fileType: String(raw.fileType || fileBlob?.type || ""),
      storageMode: fileBlob
        ? "embedded"
        : String(raw.localPath || "").trim()
          ? "path"
          : "",
      fileModifiedAt: Number(raw.fileModifiedAt) || 0,
      mediaDuration: Math.max(0, Number(raw.mediaDuration) || 0),
      videoWidth: Math.max(0, Number(raw.videoWidth) || 0),
      videoHeight: Math.max(0, Number(raw.videoHeight) || 0),
      videoMetadataFailed: Boolean(raw.videoMetadataFailed),
      thumbnailData:
        typeof raw.thumbnailData === "string" &&
        raw.thumbnailData.startsWith("data:image/")
          ? raw.thumbnailData
          : "",
      thumbnailUpdatedAt: Number(raw.thumbnailUpdatedAt) || 0,
      thumbnailFailed: Boolean(raw.thumbnailFailed),
      createdAt: Number(raw.createdAt) || now,
      updatedAt: Number(raw.updatedAt) || now,
      trashedAt: Number(raw.trashedAt) || null,
      fileBlob
    };
  }

  function normalizeMaterial(raw) {
    const assetId = String(raw?.assetId || "").trim();
    if (!assetId) {
      return null;
    }
    return {
      assetId,
      use: ["candidate", "used", "unused"].includes(raw?.use)
        ? raw.use
        : "candidate",
      addedAt: Number(raw?.addedAt) || Date.now()
    };
  }

  function normalizeCover(raw, projectId) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const source = normalizeFileInfo(raw.source);
    const exported = normalizeFileInfo(raw.exported);
    const previewData =
      typeof raw.previewData === "string" &&
      raw.previewData.startsWith("data:image/") &&
      raw.previewData.length < 2 * 1024 * 1024
        ? raw.previewData
        : "";
    if (!source && !exported && !previewData) {
      return null;
    }
    return {
      id: String(raw.id || makeId("cover")),
      projectId,
      title: String(raw.title || exported?.name || source?.name || "未命名封面")
        .trim()
        .slice(0, 100),
      source,
      exported,
      previewData,
      selected: Boolean(raw.selected),
      createdAt: Number(raw.createdAt) || Date.now()
    };
  }

  function normalizeProject(raw) {
    if (!raw || typeof raw !== "object" || !String(raw.title || "").trim()) {
      return null;
    }
    const now = Date.now();
    const id = String(raw.id || makeId("project"));
    const seen = new Set();
    const materials = (Array.isArray(raw.materials) ? raw.materials : [])
      .map(normalizeMaterial)
      .filter((material) => {
        if (!material || seen.has(material.assetId)) {
          return false;
        }
        seen.add(material.assetId);
        return true;
      });
    const covers = (Array.isArray(raw.covers) ? raw.covers : [])
      .map((cover) => normalizeCover(cover, id))
      .filter(Boolean);
    let hasSelectedCover = false;
    covers.forEach((cover) => {
      if (cover.selected && !hasSelectedCover) {
        hasSelectedCover = true;
      } else {
        cover.selected = false;
      }
    });
    const editorFiles = (Array.isArray(raw.editorFiles) ? raw.editorFiles : [])
      .map((item) => {
        const file = normalizeFileInfo(item);
        if (!file) {
          return null;
        }
        return {
          id: String(item.id || makeId("editor")),
          kind: EDITOR_META[item.kind] ? item.kind : inferEditorKind(file.name),
          ...file
        };
      })
      .filter(Boolean);
    return {
      id,
      title: String(raw.title).trim().slice(0, 120),
      description: String(raw.description || "").trim().slice(0, 1200),
      platform: String(raw.platform || "").trim().slice(0, 60),
      status: PROJECT_STATUS_META[raw.status] ? raw.status : "planning",
      finalVideo: normalizeFileInfo(raw.finalVideo),
      editorFiles,
      materials,
      covers,
      createdAt: Number(raw.createdAt) || now,
      updatedAt: Number(raw.updatedAt) || now,
      publishedAt: Number(raw.publishedAt) || null
    };
  }

  function loadStarterAssets() {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(STARTER_ASSETS_KEY) || "null");
    } catch {
      stored = null;
    }
    const now = Date.now();
    return DEFAULT_STARTER_ASSETS.map((fallback, index) => {
      const saved = Array.isArray(stored)
        ? stored.find((item) => item?.id === fallback.id)
        : null;
      const title = String(saved?.title || fallback.title).trim() || fallback.title;
      return {
        ...fallback,
        title,
        kind: KIND_META[saved?.kind] ? saved.kind : fallback.kind,
        description:
          typeof saved?.description === "string"
            ? saved.description.slice(0, 800)
            : fallback.description,
        fileName: `${title}.mp4`,
        createdAt: Number(saved?.createdAt) || now - index * 60000
      };
    });
  }

  function saveStarterAssets(assets) {
    localStorage.setItem(
      STARTER_ASSETS_KEY,
      JSON.stringify(
        assets.map((asset) => ({
          id: asset.id,
          title: asset.title,
          kind: asset.kind,
          description: asset.description,
          createdAt: asset.createdAt
        }))
      )
    );
  }

  async function load({ force = false } = {}) {
    if (state.loaded && !force) {
      return;
    }
    if (state.loading) {
      return;
    }
    state.loading = true;
    state.loadError = "";
    try {
      const data = await Store.loadStudioData();
      state.browserMediaUrls.forEach((objectUrl) =>
        URL.revokeObjectURL(objectUrl)
      );
      state.browserMediaUrls.clear();
      state.assets = (data.mediaAssets || []).map(normalizeAsset).filter(Boolean);
      state.projects = (data.videoProjects || [])
        .map(normalizeProject)
        .filter(Boolean);
      state.loaded = true;
      loadAutoSyncFolderSetting();
      restartAutoSync({ scanNow: true });
      syncNavigationCount();
    } catch (error) {
      state.loadError = error.message || "素材数据无法读取";
    } finally {
      state.loading = false;
      renderIntoPage();
    }
  }

  function assetById(id) {
    return state.assets.find((asset) => asset.id === id) || null;
  }

  function projectById(id) {
    return state.projects.find((project) => project.id === id) || null;
  }

  function projectsForAsset(assetId) {
    return state.projects
      .map((project) => ({
        project,
        material: project.materials.find((item) => item.assetId === assetId)
      }))
      .filter((item) => item.material);
  }

  function activeProjectsForAsset(assetId) {
    return projectsForAsset(assetId).filter(({ project }) =>
      ["planning", "editing"].includes(project.status)
    );
  }

  function materialLabel(use) {
    if (use === "used") {
      return "成片采用";
    }
    if (use === "unused") {
      return "成片未采用";
    }
    return "项目候选";
  }

  function cleanupReason(asset) {
    if (
      !asset ||
      asset.kind !== "recording" ||
      asset.status === "trash" ||
      asset.status === "archived"
    ) {
      return "";
    }
    if (asset.favorite || activeProjectsForAsset(asset.id).length) {
      return "";
    }
    if (asset.status === "waste") {
      return "已标记为废片";
    }
    const associations = projectsForAsset(asset.id);
    if (
      associations.length &&
      associations.every(
        ({ project, material }) =>
          ["completed", "archived"].includes(project.status) &&
          material.use === "unused"
      )
    ) {
      return "成片未采用，且项目已完成";
    }
    return "";
  }

  function cleanupCandidates() {
    return state.assets
      .map((asset) => ({ asset, reason: cleanupReason(asset) }))
      .filter((item) => item.reason)
      .sort((a, b) => b.asset.fileSize - a.asset.fileSize);
  }

  function assetMatches(asset) {
    if (asset.status === "trash") {
      return false;
    }
    if (state.kind !== "all" && asset.kind !== state.kind) {
      return false;
    }
    if (!state.query) {
      return true;
    }
    const query = state.query.toLocaleLowerCase("zh-CN");
    const projectNames = projectsForAsset(asset.id)
      .map(({ project }) => project.title)
      .join(" ");
    return [
      asset.title,
      asset.fileName,
      asset.localPath,
      asset.sourcePath,
      asset.description,
      asset.minecraftVersion,
      KIND_META[asset.kind]?.label,
      asset.tags.join(" "),
      projectNames
    ]
      .join(" ")
      .toLocaleLowerCase("zh-CN")
      .includes(query);
  }

  function currentAssetView() {
    return state.assets.filter(assetMatches);
  }

  function covers() {
    return state.projects.flatMap((project) =>
      project.covers.map((cover) => ({ ...cover, project }))
    );
  }

  function filteredCovers() {
    const query = state.query.toLocaleLowerCase("zh-CN");
    return covers()
      .filter((cover) => {
        if (!query) {
          return true;
        }
        return [
          cover.title,
          cover.project.title,
          cover.source?.name,
          cover.exported?.name,
          cover.source?.path,
          cover.exported?.path
        ]
          .join(" ")
          .toLocaleLowerCase("zh-CN")
          .includes(query);
      })
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }

  function filteredProjects() {
    const query = state.query.toLocaleLowerCase("zh-CN");
    return state.projects
      .filter((project) => {
        if (!query) {
          return true;
        }
        const linked = project.materials
          .map((material) => assetById(material.assetId))
          .filter(Boolean)
          .flatMap((asset) => [asset.title, asset.fileName, ...asset.tags]);
        return [
          project.title,
          project.description,
          project.platform,
          ...linked
        ]
          .join(" ")
          .toLocaleLowerCase("zh-CN")
          .includes(query);
      })
      .sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
  }

  function statusBadge(meta, label = meta?.label || "") {
    return `<span class="studio-status" style="--studio-tone:${meta?.tone || "#7c837b"}"><i></i>${escapeHTML(label)}</span>`;
  }

  function renderTabs() {
    return `
      <div class="studio-tabs" role="tablist" aria-label="素材中心分类">
        ${Object.entries(TAB_META)
          .map(
            ([id, meta]) => `
              <button
                class="studio-tab${state.tab === id ? " is-active" : ""}"
                type="button"
                role="tab"
                aria-selected="${state.tab === id}"
                data-studio-action="tab"
                data-studio-tab="${id}"
              >
                ${icon(meta.icon)}
                <span>${meta.label}</span>
              </button>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderStudioHeader() {
    const library = window.ResourceLibrary?.getConfig?.();
    const assets = state.assets.filter((asset) => asset.status !== "trash");
    const syncFolderName =
      state.syncFolder.split(/[\\/]/).filter(Boolean).pop() || "";
    const videos = assets.filter(
      (asset) => asset.kind === "recording" || isVideoFile(asset.fileName)
    );
    const totalSize = assets.reduce(
      (sum, asset) => sum + Number(asset.fileSize || 0),
      0
    );
    return `
      <header class="studio-hero">
        <div class="studio-hero-copy">
          <p class="eyebrow">LOCAL ASSET LIBRARY</p>
          <h1>素材库</h1>
          <p>上传、浏览和播放素材。需要剪辑时，直接打开所在文件夹，把文件拖入剪映、PR 或其他软件。</p>
          <div class="studio-hero-actions">
            <button class="button button--primary" type="button" data-studio-action="import-files">
              ${icon("upload")}<span>上传素材</span>
            </button>
            ${
              Desktop
                ? `<button class="button button--ghost" type="button" data-studio-action="configure-auto-sync">
                    ${icon("folder")}<span>${state.syncFolder ? "更换同步文件夹" : "自动同步视频"}</span>
                  </button>`
                : ""
            }
            ${
              library?.rootPath
                ? `<button class="button button--ghost studio-library-location" type="button" data-library-action="reveal-root" title="${escapeHTML(library.rootPath)}">${icon("folder")}<span>打开素材库</span></button>`
                : `<button class="button button--ghost" type="button" data-library-action="open-setup">${icon("folder")}<span>设置素材库</span></button>`
            }
          </div>
          ${
            Desktop
              ? `<div class="studio-sync-status${state.syncError ? " is-error" : ""}">
                  <span class="studio-sync-dot" aria-hidden="true"></span>
                  <span title="${escapeHTML(state.syncFolder)}">${
                    state.syncFolder
                      ? state.syncError
                        ? `自动同步异常：${escapeHTML(syncFolderName)}`
                        : `${state.syncBusy ? "正在扫描" : "自动同步中"} · ${escapeHTML(syncFolderName)}`
                      : "选择一个视频文件夹，新增视频会自动加入素材库"
                  }</span>
                  ${
                    state.syncFolder
                      ? `<button type="button" data-studio-action="clear-auto-sync">停止</button>`
                      : ""
                  }
                </div>`
              : ""
          }
        </div>
        <div class="studio-hero-mark" aria-hidden="true">
          <span>ASSETS</span>
          <strong>${String(assets.length).padStart(2, "0")}</strong>
          <small>本地素材</small>
        </div>
      </header>
      <section class="studio-stat-grid studio-stat-grid--simple" aria-label="素材统计">
        <div class="studio-stat"><span>全部素材</span><strong>${assets.length}</strong><small>可直接浏览和播放</small></div>
        <div class="studio-stat"><span>视频</span><strong>${videos.length}</strong><small>原片与视频素材</small></div>
        <div class="studio-stat"><span>占用空间</span><strong>${formatBytes(totalSize)}</strong><small>${library?.rootPath ? escapeHTML(library.rootPath) : "尚未设置素材库"}</small></div>
      </section>
    `;
  }

  function renderKindFilters() {
    const kinds =
      state.tab === "recordings"
        ? ["recording"]
        : state.tab === "reusable"
          ? ["transition", "texture", "motion", "audio", "template", "other"]
          : Object.keys(KIND_META).filter((kind) => kind !== "cover");
    const options = [
      { id: "all", label: "全部类型" },
      ...kinds.map((kind) => ({ id: kind, label: KIND_META[kind].label }))
    ];
    return `
      <div class="studio-filter-row" role="group" aria-label="素材类型">
        ${options
          .map(
            (option) => `
              <button
                class="studio-filter-chip${state.kind === option.id ? " is-active" : ""}"
                type="button"
                data-studio-action="kind-filter"
                data-studio-kind="${option.id}"
              >${escapeHTML(option.label)}</button>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderStatusFilters() {
    const options = [
      ["all", "全部状态"],
      ["inbox", "待筛选"],
      ["usable", "可用"],
      ["waste", "废片"],
      ["favorite", "精选"]
    ];
    return `
      <div class="studio-filter-row studio-filter-row--status" role="group" aria-label="素材状态">
        ${options
          .map(
            ([id, label]) => `
              <button
                class="studio-filter-chip${state.status === id ? " is-active" : ""}"
                type="button"
                data-studio-action="status-filter"
                data-studio-status="${id}"
              >${label}</button>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderAssetThumb(asset) {
    const extension = extensionOf(asset.fileName);
    const canShowEmbeddedImage = Boolean(embeddedFile(asset));
    const needsVideoMetadata =
      isVideoFile(asset.fileName) &&
      (!asset.mediaDuration || !asset.videoWidth || !asset.videoHeight);
    const canShowImage =
      IMAGE_EXTENSIONS.has(extension) && !/\.psd|\.psb$/i.test(extension);
    const canGenerateVideoCover =
      isVideoFile(asset.fileName) &&
      Boolean(embeddedFile(asset) || (Desktop && asset.localPath));
    const meta = KIND_META[asset.kind] || KIND_META.other;
    return `
      <div class="studio-asset-thumb${asset.thumbnailData ? " has-cover" : ""}" style="--studio-tone:${meta.tone}">
        ${asset.thumbnailData
          ? `<img src="${escapeHTML(asset.thumbnailData)}"${needsVideoMetadata ? ` data-video-cover-asset="${escapeHTML(asset.id)}"` : ""} alt="" />`
          : canShowEmbeddedImage && canShowImage
            ? `<img src="${escapeHTML(browserAssetUrl(asset))}" alt="" />`
          : canShowImage
            ? `<img data-studio-thumb="${escapeHTML(asset.localPath)}" alt="" />`
            : canGenerateVideoCover
              ? `<img data-video-cover-asset="${escapeHTML(asset.id)}" alt="" hidden />`
              : `<span class="studio-thumb-grid" aria-hidden="true"></span>`}
        <span class="studio-thumb-icon">${icon(meta.icon)}</span>
        <span class="studio-thumb-type">${escapeHTML(extension.replace(".", "").toUpperCase() || "FILE")}</span>
      </div>
    `;
  }

  function renderAssetCard(asset) {
    const meta = KIND_META[asset.kind] || KIND_META.other;
    const statusMeta = ASSET_STATUS_META[asset.status] || ASSET_STATUS_META.inbox;
    const extension = extensionOf(asset.fileName);
    const isVideo = isVideoFile(asset.fileName);
    const storageLabel = embeddedFile(asset)
      ? "浏览器本地"
      : Desktop && asset.localPath
        ? "电脑文件"
        : "仅记录信息";
    const durationLabel =
      asset.mediaDuration > 0
        ? formatMediaTime(asset.mediaDuration)
        : isVideo
          ? "读取中"
          : "—";
    const resolutionLabel =
      asset.videoWidth && asset.videoHeight
        ? `${asset.videoWidth} × ${asset.videoHeight}`
        : isVideo
          ? "读取中"
          : "—";
    const selected = state.selectedAssetIds.has(asset.id);
    const canPlayAsset =
      (embeddedFile(asset) ||
        (Desktop && asset.localPath)) &&
      (isVideoFile(asset.fileName) || isAudioFile(asset.fileName));
    const playAction = embeddedFile(asset) ? "play-asset" : "play-media";
    return `
      <article
        class="studio-asset-card studio-asset-card--simple${selected ? " is-selected" : ""}"
        style="--studio-tone:${meta.tone}"
        tabindex="0"
        role="button"
        aria-label="打开素材 ${escapeHTML(asset.title)}"
        data-studio-action="open-asset"
        data-asset-id="${escapeHTML(asset.id)}"
      >
        <button
          class="studio-card-select"
          type="button"
          title="${selected ? "取消选择" : "选择素材"}"
          aria-label="${selected ? "取消选择" : "选择素材"}"
          aria-pressed="${selected}"
          data-studio-action="toggle-select"
          data-asset-id="${escapeHTML(asset.id)}"
        >${icon("check")}</button>
        ${renderAssetThumb(asset)}
        <div class="studio-asset-body">
          <div class="studio-asset-kicker">
            <span>${icon(meta.icon)}${meta.label}</span>
            <span class="studio-card-status" style="--studio-tone:${statusMeta.tone}"><i></i>${statusMeta.label}</span>
          </div>
          <h3>${escapeHTML(asset.title)}</h3>
          <p>${escapeHTML(asset.fileName || "本地素材")}</p>
          <div class="studio-card-details">
            <span><small>时长</small><strong data-card-duration="${escapeHTML(asset.id)}">${durationLabel}</strong></span>
            <span><small>分辨率</small><strong data-card-resolution="${escapeHTML(asset.id)}">${resolutionLabel}</strong></span>
            <span><small>格式</small><strong>${escapeHTML(extension.replace(".", "").toUpperCase() || "FILE")}</strong></span>
            <span><small>存储</small><strong>${storageLabel}</strong></span>
          </div>
          <p class="studio-card-description">${escapeHTML(asset.description || "暂无备注")}</p>
        </div>
        <footer class="studio-asset-foot">
          <span>${formatBytes(asset.fileSize)}</span>
          <span>${formatDate(asset.createdAt)}</span>
        </footer>
        <div class="studio-asset-tools">
          ${
            canPlayAsset
              ? `<button
                  class="studio-icon-button studio-icon-button--play"
                  type="button"
                  title="在拾集中播放"
                  aria-label="播放素材"
                  data-studio-action="${playAction}"
                  data-path="${escapeHTML(asset.localPath)}"
                  data-title="${escapeHTML(asset.title)}"
                  data-asset-id="${escapeHTML(asset.id)}"
                >${icon("play")}</button>`
              : ""
          }
          <button
            class="studio-icon-button"
            type="button"
            title="重命名"
            aria-label="重命名素材"
            data-studio-action="rename-asset"
            data-asset-id="${escapeHTML(asset.id)}"
          >${icon("edit")}</button>
          ${
            Desktop && asset.localPath && !embeddedFile(asset)
              ? `<button
                  class="studio-icon-button"
                  type="button"
                  title="打开所在文件夹"
                  aria-label="打开所在文件夹"
                  data-studio-action="reveal-path"
                  data-path="${escapeHTML(asset.localPath)}"
                >${icon("folder")}</button>`
              : ""
          }
        </div>
      </article>
    `;
  }

  function renderSelectionBar(assets) {
    if (!state.selectedAssetIds.size) {
      return "";
    }
    const selectedAssets = assets.filter((asset) =>
      state.selectedAssetIds.has(asset.id)
    );
    const selectedKind =
      selectedAssets.length &&
      selectedAssets.every((asset) => asset.kind === selectedAssets[0].kind)
        ? selectedAssets[0].kind
        : "";
    return `
      <div class="studio-selection-bar">
        <div><strong>已选 ${state.selectedAssetIds.size} 项</strong></div>
        <div class="studio-selection-actions">
          <div class="studio-bulk-kind">
            <select class="studio-select" id="studio-bulk-kind" aria-label="切换所选素材类型">
              <option value="">切换类型…</option>
              ${Object.entries(KIND_META)
                .filter(([kind]) => kind !== "cover")
                .map(
                  ([kind, meta]) =>
                    `<option value="${kind}"${selectedKind === kind ? " selected" : ""}>${meta.label}</option>`
                )
                .join("")}
            </select>
            <button class="button button--ghost" type="button" data-studio-action="bulk-set-kind">应用</button>
          </div>
          <button class="button button--quiet studio-danger-button" type="button" data-studio-action="bulk-remove">${icon("trash")}<span>删除所选</span></button>
          <button class="button button--quiet" type="button" data-studio-action="clear-selection">取消选择</button>
        </div>
      </div>
    `;
  }

  function renderAssetLibrary() {
    const assets = currentAssetView();
    const allSelected =
      assets.length > 0 &&
      assets.every((asset) => state.selectedAssetIds.has(asset.id));
    return `
      <section class="studio-section">
        <div class="studio-section-head">
          <div>
            <p class="eyebrow">BROWSE</p>
            <h2>全部素材 <small class="studio-result-count">${assets.length}</small></h2>
          </div>
          <div class="studio-section-actions">
            ${
              assets.length
                ? `<button class="button button--quiet" type="button" data-studio-action="select-visible">${icon("check")}<span>${allSelected ? "取消全选" : "全选"}</span></button>`
                : ""
            }
          </div>
        </div>
        ${renderKindFilters()}
        ${renderSelectionBar(assets)}
        ${
          assets.length
            ? `<div class="studio-asset-grid">${assets.map(renderAssetCard).join("")}</div>`
            : renderEmpty(
              "素材库还是空的",
              "上传素材或设置自动同步文件夹，新增视频会自动识别并加入素材库。",
              "上传素材",
              "import-files"
            )
        }
      </section>
    `;
  }

  function renderAssetGuideCards(libraryConfigured) {
    const starters = loadStarterAssets();
    return `
      <div class="studio-asset-grid studio-starter-grid">
        ${starters
          .map(
            (asset, index) => `
              <article
                class="studio-asset-card studio-asset-card--simple studio-starter-card studio-starter-card--${index === 0 ? "upload" : "browse"}"
                tabindex="0"
                role="button"
                aria-label="查看初始素材 ${escapeHTML(asset.title)}"
                data-studio-action="open-starter-asset"
                data-starter-id="${escapeHTML(asset.id)}"
              >
                <div class="studio-asset-thumb studio-starter-thumb" style="--studio-tone:${KIND_META[asset.kind].tone}">
                  <span class="studio-thumb-grid" aria-hidden="true"></span>
                  <span class="studio-thumb-icon">${icon(KIND_META[asset.kind].icon)}</span>
                  <span class="studio-thumb-type">MP4</span>
                  <div class="studio-asset-tools">
                    <button class="studio-icon-button" type="button" title="修改名称" data-studio-action="open-starter-asset" data-starter-id="${escapeHTML(asset.id)}" data-focus-rename="true">${icon("edit")}</button>
                    <button class="studio-icon-button" type="button" title="设置素材" data-studio-action="open-starter-asset" data-starter-id="${escapeHTML(asset.id)}" data-focus-settings="true">${icon("settings")}</button>
                    <button class="studio-icon-button" type="button" title="查看信息" data-studio-action="open-starter-asset" data-starter-id="${escapeHTML(asset.id)}">${icon("info")}</button>
                  </div>
                </div>
                <div class="studio-asset-body">
                  <div class="studio-asset-kicker">
                    <span>${icon(KIND_META[asset.kind].icon)}${KIND_META[asset.kind].label}</span>
                  </div>
                  <h3>${escapeHTML(asset.title)}</h3>
                  <p>${escapeHTML(asset.fileName)}</p>
                </div>
                <footer class="studio-asset-foot">
                  <span>初始素材</span>
                  <span>点击查看信息</span>
                </footer>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  function openStarterAssetDetail(
    starterId,
    { focusRename = false, focusSettings = false } = {}
  ) {
    const assets = loadStarterAssets();
    const asset = assets.find((item) => item.id === starterId);
    if (!asset) {
      return;
    }
    const kindMeta = KIND_META[asset.kind] || KIND_META.other;
    const baseName = asset.title;
    openDialog(`
      <form id="starter-asset-form">
        <header class="modal-header studio-asset-detail-header">
          <div class="studio-detail-header-main">
            <p class="eyebrow">素材详情 · 初始卡片</p>
            <div class="studio-inline-rename-form">
              <label class="sr-only" for="starter-inline-rename">文件名</label>
              <div class="studio-inline-rename-control">
                <input id="starter-inline-rename" type="text" maxlength="120" value="${escapeHTML(baseName)}" aria-label="修改素材名称" />
                <span>.mp4</span>
              </div>
            </div>
          </div>
          <button class="icon-button" type="button" data-studio-action="close-dialog" aria-label="关闭">${icon("close")}</button>
        </header>
        <div class="modal-body studio-dialog-body studio-simple-asset-detail">
          <div class="studio-detail-layout">
            <div class="studio-simple-preview studio-starter-detail-cover is-video" style="--studio-tone:${kindMeta.tone}">
              ${inlineVideoMarkup({
                source: STARTER_PREVIEW_SRC,
                title: `${asset.title} 示例预览`
              })}
            </div>
            <div class="studio-detail-side">
              <div class="studio-simple-asset-info">
                <div class="studio-asset-kicker">
                  <span>${icon(kindMeta.icon)}${kindMeta.label}</span>
                </div>
                <p>${escapeHTML(asset.fileName)} · 初始素材 · ${formatDate(asset.createdAt)}</p>
              </div>
              <label class="studio-field">
                <span>素材类型</span>
                <select class="studio-select" id="starter-asset-kind">
                  ${Object.entries(KIND_META)
                    .filter(([kind]) => kind !== "cover")
                    .map(
                      ([kind, meta]) =>
                        `<option value="${kind}"${asset.kind === kind ? " selected" : ""}>${meta.label}</option>`
                    )
                    .join("")}
                </select>
              </label>
              <label class="studio-field">
                <span>说明</span>
                <textarea id="starter-asset-description" rows="4" maxlength="800">${escapeHTML(asset.description)}</textarea>
              </label>
              <p class="studio-dialog-note">${icon("info")}<span>这是一张可以操作的初始素材卡片。上传真实素材后，它会被真实素材替换并自动隐藏。</span></p>
            </div>
          </div>
        </div>
        <footer class="modal-footer studio-simple-asset-footer">
          <button class="button button--ghost" type="button" data-studio-action="import-files">${icon("upload")}<span>上传真实素材</span></button>
          <div>
            <button class="button button--quiet" type="button" data-studio-action="close-dialog">取消</button>
            <button class="button button--primary" type="submit">${icon("check")}<span>保存设置</span></button>
          </div>
        </footer>
      </form>
    `);
    bindInlineVideoPlayers(document.getElementById("studio-dialog"));
    const form = document.getElementById("starter-asset-form");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const title = document
        .getElementById("starter-inline-rename")
        .value.trim()
        .replace(/\.mp4$/i, "");
      if (!title) {
        showToast("名称不能为空", true);
        return;
      }
      const updated = assets.map((item) =>
        item.id === asset.id
          ? {
              ...item,
              title,
              fileName: `${title}.mp4`,
              kind: document.getElementById("starter-asset-kind").value,
              description: document
                .getElementById("starter-asset-description")
                .value.trim()
            }
          : item
      );
      saveStarterAssets(updated);
      closeDialog();
      renderIntoPage();
      showToast("初始素材设置已保存");
    });
    window.setTimeout(() => {
      const target = focusRename
        ? document.getElementById("starter-inline-rename")
        : focusSettings
          ? document.getElementById("starter-asset-kind")
          : null;
      target?.focus();
      if (focusRename && target instanceof HTMLInputElement) {
        target.select();
      }
    }, 80);
  }

  function renderProjectCard(project) {
    const meta = PROJECT_STATUS_META[project.status];
    const assets = project.materials
      .map((material) => assetById(material.assetId))
      .filter(Boolean);
    const used = project.materials.filter((material) => material.use === "used").length;
    const editingFiles = project.editorFiles
      .map((file) => EDITOR_META[file.kind]?.label)
      .filter(Boolean);
    return `
      <article
        class="studio-project-card"
        tabindex="0"
        role="button"
        data-studio-action="open-project"
        data-project-id="${escapeHTML(project.id)}"
      >
        <header>
          <div class="studio-project-icon">${icon("inbox")}</div>
          ${statusBadge(meta)}
        </header>
        <h3>${escapeHTML(project.title)}</h3>
        <p>${escapeHTML(project.description || "还没有项目说明。")}</p>
        <div class="studio-project-assets">
          ${assets.slice(0, 5).map((asset) => `<span style="--studio-tone:${KIND_META[asset.kind]?.tone || "#557d68"}">${icon(KIND_META[asset.kind]?.icon || "file")}</span>`).join("")}
          ${assets.length > 5 ? `<span>+${assets.length - 5}</span>` : ""}
        </div>
        <div class="studio-progress-label"><span>成片采用</span><strong>${used} / ${project.materials.length}</strong></div>
        <div class="studio-progress"><i style="width:${project.materials.length ? Math.round((used / project.materials.length) * 100) : 0}%"></i></div>
        <footer>
          <span>${editingFiles.length ? [...new Set(editingFiles)].join(" · ") : "未关联剪辑工程"}</span>
          <span>${project.covers.length} 版封面</span>
        </footer>
      </article>
    `;
  }

  function renderProjects() {
    const projects = filteredProjects();
    return `
      <section class="studio-section">
        <div class="studio-section-head">
          <div>
            <p class="eyebrow">VIDEO PROJECTS</p>
            <h2>视频项目</h2>
          </div>
          <button class="button button--primary" type="button" data-studio-action="new-project">${icon("plus")}<span>新建视频项目</span></button>
        </div>
        ${
          projects.length
            ? `<div class="studio-project-grid">${projects.map(renderProjectCard).join("")}</div>`
            : renderEmpty(
                "还没有视频项目",
                "新建一个项目，把录制原片、剪辑工程、成片和封面集中到同一条工作流里。",
                "新建视频项目",
                "new-project"
              )
        }
      </section>
    `;
  }

  function renderCoverCard(cover) {
    const exported = cover.exported;
    const source = cover.source;
    const thumbnailFile = exported?.path || source?.path || "";
    const canShowImage =
      Boolean(cover.previewData) ||
      (thumbnailFile &&
        IMAGE_EXTENSIONS.has(extensionOf(thumbnailFile)) &&
        !/\.psd|\.psb$/i.test(thumbnailFile));
    return `
      <article
        class="studio-cover-card${cover.selected ? " is-selected" : ""}"
        tabindex="0"
        role="button"
        aria-label="浏览封面 ${escapeHTML(cover.title)}"
        data-studio-action="open-cover-browser"
        data-project-id="${escapeHTML(cover.projectId)}"
        data-cover-id="${escapeHTML(cover.id)}"
      >
        <div class="studio-cover-preview">
          ${
            cover.previewData
              ? `<img src="${escapeHTML(cover.previewData)}" alt="" />`
              : canShowImage
                ? `<img data-studio-thumb="${escapeHTML(thumbnailFile)}" alt="" />`
                : icon("gallery")
          }
          <span>${cover.selected ? "当前使用" : "封面版本"}</span>
        </div>
        <div class="studio-cover-copy">
          <div class="studio-cover-topline">
            <span>${escapeHTML(cover.project.title)}</span>
            <small>${formatDate(cover.createdAt)}</small>
          </div>
          <h3>${escapeHTML(cover.title)}</h3>
          <p>${escapeHTML(exported?.name || source?.name || "未关联文件")}</p>
          <div class="studio-cover-actions">
            <button class="button button--quiet" type="button" data-studio-action="open-cover-file" data-path="${escapeHTML((exported || source)?.path || "")}">${icon("external")}<span>打开</span></button>
            <button class="button button--quiet" type="button" data-studio-action="select-cover" data-project-id="${escapeHTML(cover.projectId)}" data-cover-id="${escapeHTML(cover.id)}">${icon("check")}<span>${cover.selected ? "已选" : "设为使用"}</span></button>
          </div>
        </div>
      </article>
    `;
  }

  function renderCoversPage() {
    const items = filteredCovers();
    return `
      <section class="studio-section">
        <div class="studio-section-head">
          <div>
            <p class="eyebrow">COVER LIBRARY</p>
            <h2>封面版本</h2>
          </div>
          <p class="studio-section-hint">PSD 源文件与导出图跟随视频项目归档。</p>
        </div>
        ${
          items.length
            ? `<div class="studio-cover-grid">${items.map(renderCoverCard).join("")}</div>`
            : renderEmpty(
                "还没有封面记录",
                "在视频项目里添加 PSD 源文件与导出图，就能统一查看和标记最终版本。",
                "查看视频项目",
                "tab-projects"
              )
        }
      </section>
    `;
  }

  function renderCleanupPage() {
    const candidates = cleanupCandidates();
    const total = candidates.reduce((sum, item) => sum + item.asset.fileSize, 0);
    return `
      <section class="studio-section">
        <div class="studio-cleanup-banner">
          <div>
            <p class="eyebrow">SAFE CLEANUP</p>
            <h2>整理完成后再决定是否清理</h2>
            <p>这里只建议清理录制原片。转场、贴图、动效和模板不会因为项目未使用而进入清理列表。</p>
          </div>
          <div><strong>${formatBytes(total)}</strong><span>可整理空间</span></div>
        </div>
        ${
          candidates.length
            ? `<div class="studio-cleanup-list">
                ${candidates
                  .map(
                    ({ asset, reason }) => `
                      <article class="studio-cleanup-row">
                        <div class="studio-cleanup-icon">${icon("monitor")}</div>
                        <div class="studio-cleanup-copy">
                          <strong>${escapeHTML(asset.title)}</strong>
                          <span>${escapeHTML(reason)} · ${escapeHTML(asset.fileName)}</span>
                        </div>
                        <span class="studio-cleanup-size">${formatBytes(asset.fileSize)}</span>
                        <div class="studio-cleanup-actions">
                          <button class="button button--ghost" type="button" data-studio-action="keep-asset" data-asset-id="${escapeHTML(asset.id)}">保留</button>
                          <button class="button button--ghost studio-danger-button" type="button" data-studio-action="trash-asset" data-asset-id="${escapeHTML(asset.id)}">${icon("trash")}<span>删除源文件</span></button>
                        </div>
                      </article>
                    `
                  )
                  .join("")}
              </div>
              <p class="studio-safety-note">${icon("shield")}<span>移入系统回收站后仍可在 Windows 回收站恢复。拾集不会自动永久删除任何原片。</span></p>`
            : renderEmpty(
                "暂时没有需要清理的原片",
                "完成项目校对后，未采用的原片会出现在这里；精选和正在使用的素材会受到保护。",
                "查看录制原片",
                "tab-recordings"
              )
        }
      </section>
    `;
  }

  function renderEmpty(title, description, buttonLabel, action) {
    return `
      <div class="empty-state studio-empty">
        <div class="empty-icon">${icon("inbox")}</div>
        <h2>${escapeHTML(title)}</h2>
        <p>${escapeHTML(description)}</p>
        <button class="button button--primary" type="button" data-studio-action="${escapeHTML(action)}">${escapeHTML(buttonLabel)}</button>
      </div>
    `;
  }

  function renderPage() {
    if (!state.loaded) {
      return `<div class="content-inner studio-page" data-studio-page><div class="loading-state">正在读取素材库…</div></div>`;
    }
    if (state.loadError) {
      return `
        <div class="content-inner studio-page" data-studio-page>
          <div class="empty-state">
            <div class="empty-icon">${icon("info")}</div>
            <h2>素材库暂时无法打开</h2>
            <p>${escapeHTML(state.loadError)}</p>
            <button class="button button--primary" type="button" data-studio-action="reload">重新读取</button>
          </div>
        </div>
      `;
    }
    return `
      <div class="content-inner studio-page" data-studio-page>
        ${renderStudioHeader()}
        ${renderAssetLibrary()}
      </div>
    `;
  }

  function render() {
    if (!state.loaded && !state.loading) {
      void load();
    }
    return renderPage();
  }

  function isStudioActive() {
    return Boolean(
      document.querySelector(
        '.nav-item[data-view="studio"].is-active, #content [data-studio-page]'
      )
    );
  }

  function renderIntoPage({ preserveScroll = true } = {}) {
    if (!document.querySelector('.nav-item[data-view="studio"].is-active')) {
      return;
    }
    const content = document.getElementById("content");
    if (!content) {
      return;
    }
    const previousTop = content.scrollTop;
    content.innerHTML = renderPage();
    if (preserveScroll) {
      content.scrollTop = previousTop;
    }
    window.ShijiUI?.upgradeCustomSelects(content);
    hydrateThumbnails(content);
    hydrateVideoCovers(content);
  }

  function syncNavigationCount() {
    const count = document.getElementById("studio-nav-count");
    if (count) {
      count.textContent = String(
        state.assets.filter((asset) => asset.status !== "trash").length
      );
    }
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
    }, 2400);
  }

  async function saveAsset(asset) {
    const normalized = normalizeAsset(asset);
    if (!normalized) {
      throw new Error("素材信息不完整。");
    }
    await Store.saveMediaAsset(normalized);
    const index = state.assets.findIndex((item) => item.id === normalized.id);
    if (index >= 0) {
      state.assets[index] = normalized;
    } else {
      state.assets.push(normalized);
    }
    syncNavigationCount();
    return normalized;
  }

  async function saveAssets(assets) {
    const normalized = assets.map(normalizeAsset).filter(Boolean);
    await Store.saveMediaAssets(normalized);
    const byId = new Map(state.assets.map((asset) => [asset.id, asset]));
    normalized.forEach((asset) => byId.set(asset.id, asset));
    state.assets = [...byId.values()];
    syncNavigationCount();
    return normalized;
  }

  async function saveProject(project) {
    const normalized = normalizeProject(project);
    if (!normalized) {
      throw new Error("项目信息不完整。");
    }
    normalized.updatedAt = Date.now();
    await Store.saveVideoProject(normalized);
    const index = state.projects.findIndex((item) => item.id === normalized.id);
    if (index >= 0) {
      state.projects[index] = normalized;
    } else {
      state.projects.push(normalized);
    }
    return normalized;
  }

  function ensureDialog() {
    let dialog = document.getElementById("studio-dialog");
    if (dialog) {
      return dialog;
    }
    dialog = document.createElement("dialog");
    dialog.className = "modal studio-dialog";
    dialog.id = "studio-dialog";
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
    dialog.addEventListener("close", () => {
      state.dialogContext = null;
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  function openDialog(markup) {
    const dialog = ensureDialog();
    dialog.innerHTML = `<div class="modal-card studio-dialog-card">${markup}</div>`;
    if (!dialog.open) {
      dialog.showModal();
    }
    window.ShijiUI?.upgradeCustomSelects(dialog);
    hydrateThumbnails(dialog);
    return dialog;
  }

  function closeDialog() {
    const dialog = document.getElementById("studio-dialog");
    if (dialog?.open) {
      dialog.close();
    }
    window.ShijiUI?.closeCustomSelects();
    state.dialogContext = null;
  }

  function dialogHeader(eyebrow, title) {
    return `
      <header class="modal-header">
        <div>
          <p class="eyebrow">${escapeHTML(eyebrow)}</p>
          <h2>${escapeHTML(title)}</h2>
        </div>
        <button class="icon-button" type="button" data-studio-action="close-dialog" aria-label="关闭">${icon("close")}</button>
      </header>
    `;
  }

  async function hydrateThumbnails(root = document) {
    if (!Desktop?.getImageThumbnail) {
      return;
    }
    const images = [...root.querySelectorAll("img[data-studio-thumb]")];
    for (const image of images) {
      const path = image.dataset.studioThumb;
      if (!path) {
        continue;
      }
      let dataUrl = state.imageCache.get(path);
      if (dataUrl === undefined) {
        try {
          dataUrl = await Desktop.getImageThumbnail(path);
          state.imageCache.set(path, dataUrl || "");
        } catch {
          state.imageCache.set(path, "");
          dataUrl = "";
        }
      }
      if (dataUrl && image.isConnected) {
        image.src = dataUrl;
        image.hidden = false;
        image.closest(".studio-asset-thumb")?.classList.add("has-cover");
      } else if (image.isConnected) {
        image.remove();
      }
    }
  }

  function captureVideoFrame(filePath, { seekRatio = 0.12, source = "" } = {}) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.style.position = "fixed";
      video.style.width = "1px";
      video.style.height = "1px";
      video.style.opacity = "0";
      video.style.pointerEvents = "none";
      video.style.left = "-9999px";
      let finished = false;
      let seekRequested = false;

      const cleanup = () => {
        window.clearTimeout(timer);
        video.pause?.();
        video.removeAttribute("src");
        video.load?.();
        video.remove();
      };
      const fail = (error) => {
        if (finished) {
          return;
        }
        finished = true;
        cleanup();
        reject(error instanceof Error ? error : new Error("无法读取视频封面"));
      };
      const grabFrame = () => {
        if (finished || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
          return;
        }
        try {
          const maxWidth = 640;
          const scale = Math.min(1, maxWidth / video.videoWidth);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("无法创建视频封面画布");
          }
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          finished = true;
          cleanup();
          resolve({
            thumbnailData: dataUrl,
            duration: Number.isFinite(video.duration)
              ? Math.max(0, video.duration)
              : 0,
            width: video.videoWidth,
            height: video.videoHeight
          });
        } catch (error) {
          fail(error);
        }
      };
      const requestFrame = () => {
        if (seekRequested || finished) {
          return;
        }
        seekRequested = true;
        if (Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = Math.min(
            Math.max(0.08, video.duration * seekRatio),
            Math.max(0.08, video.duration - 0.05),
            3
          );
        } else {
          grabFrame();
        }
      };
      const timer = window.setTimeout(
        () => fail(new Error("读取视频封面超时")),
        12000
      );

      video.addEventListener("loadeddata", requestFrame, { once: true });
      video.addEventListener("seeked", grabFrame, { once: true });
      video.addEventListener("error", () => fail(new Error("视频格式暂不支持生成封面")), {
        once: true
      });
      video.src = source || mediaUrl(filePath);
      document.body.appendChild(video);
      video.load();
    });
  }

  async function hydrateVideoCovers(root = document) {
    const images = [
      ...root.querySelectorAll("img[data-video-cover-asset]")
    ];
    for (const image of images) {
      const assetId = image.dataset.videoCoverAsset;
      const asset = assetById(assetId);
      if (
        !asset ||
        state.videoThumbQueue.has(assetId)
      ) {
        if (asset?.thumbnailData) {
          image.src = asset.thumbnailData;
          image.hidden = false;
        }
        continue;
      }
      const needsThumbnail =
        !asset.thumbnailData && !asset.thumbnailFailed;
      const needsMetadata =
        !asset.mediaDuration ||
        !asset.videoWidth ||
        !asset.videoHeight;
      if (!needsThumbnail && (!needsMetadata || asset.videoMetadataFailed)) {
        if (asset.thumbnailData) {
          image.src = asset.thumbnailData;
          image.hidden = false;
        }
        continue;
      }
      state.videoThumbQueue.add(assetId);
      try {
        const source = assetMediaSource(asset);
        if (!source) {
          throw new Error("找不到视频文件");
        }
        const metadata = await captureVideoFrame(asset.localPath, {
          source
        });
        const latest = assetById(assetId) || asset;
        const updated = {
          ...latest,
          thumbnailData: metadata.thumbnailData || latest.thumbnailData,
          thumbnailUpdatedAt: Date.now(),
          thumbnailFailed: false,
          mediaDuration: metadata.duration || latest.mediaDuration || 0,
          videoWidth: metadata.width || latest.videoWidth || 0,
          videoHeight: metadata.height || latest.videoHeight || 0,
          videoMetadataFailed: false,
          updatedAt: Date.now()
        };
        await saveAsset(updated);
        [...root.querySelectorAll(`[data-video-cover-asset="${CSS.escape(assetId)}"]`)].forEach(
          (target) => {
            target.src = updated.thumbnailData;
            target.hidden = false;
            target.closest(".studio-asset-thumb")?.classList.add("has-cover");
            const card = target.closest(".studio-asset-card");
            const duration = card?.querySelector("[data-card-duration]");
            const resolution = card?.querySelector("[data-card-resolution]");
            if (duration && updated.mediaDuration) {
              duration.textContent = formatMediaTime(updated.mediaDuration);
            }
            if (resolution && updated.videoWidth && updated.videoHeight) {
              resolution.textContent = `${updated.videoWidth} × ${updated.videoHeight}`;
            }
          }
        );
      } catch {
        const latest = assetById(assetId) || asset;
        try {
          await saveAsset({
            ...latest,
            thumbnailFailed: !latest.thumbnailData,
            videoMetadataFailed: true,
            updatedAt: Date.now()
          });
        } catch {
          // Keep the type placeholder when the thumbnail cannot be persisted.
        }
      } finally {
        state.videoThumbQueue.delete(assetId);
      }
    }
  }

  function openMediaPlayer(filePath, title = "素材预览", context = {}) {
    if (!Desktop?.openPath || !filePath) {
      showToast("拾集内播放仅在电脑版中可用", true);
      return;
    }
    const fileName = filePath.split(/[\\/]/).pop() || "媒体文件";
    if (!isVideoFile(fileName) && !isAudioFile(fileName)) {
      showToast("这个文件不支持在拾集内播放", true);
      return;
    }
    const audioOnly = isAudioFile(fileName);
    const asset = context.assetId ? assetById(context.assetId) : null;
    const extension = asset ? extensionOf(asset.fileName) : "";
    const baseName = asset
      ? extension
        ? asset.fileName.slice(0, -extension.length)
        : asset.fileName || asset.title
      : "";
    state.dialogContext = {
      kind: "media-player",
      path: filePath,
      assetId: context.assetId || "",
      projectId: context.projectId || ""
    };
    openDialog(`
      ${
        asset
          ? `<header class="modal-header studio-player-header">
              <div class="studio-detail-header-main">
                <p class="eyebrow">${audioOnly ? "音频播放" : "视频播放"}</p>
                <form class="studio-inline-rename-form" id="studio-player-rename-form">
                  <label class="sr-only" for="studio-player-rename">文件名</label>
                  <div class="studio-inline-rename-control">
                    <input id="studio-player-rename" type="text" maxlength="120" value="${escapeHTML(baseName)}" aria-label="修改文件名" />
                    <span>${escapeHTML(extension || "无扩展名")}</span>
                    <button class="button button--ghost" type="submit" title="保存文件名">${icon("check")}<span>保存</span></button>
                  </div>
                </form>
              </div>
              <button class="icon-button" type="button" data-studio-action="close-dialog" aria-label="关闭">${icon("close")}</button>
            </header>`
          : dialogHeader(audioOnly ? "音频播放" : "素材播放", title)
      }
      <div class="modal-body studio-player-body">
        <div class="studio-player-stage${audioOnly ? " is-audio" : ""}">
          ${
            audioOnly
              ? `<div class="studio-audio-visual">${icon("note")}<strong>${escapeHTML(title)}</strong><span>${escapeHTML(fileName)}</span></div>`
              : ""
          }
          <${audioOnly ? "audio" : "video"}
            class="studio-media-player"
            src="${escapeHTML(mediaUrl(filePath))}"
            controls
            ${context.autoplay === false ? "" : "autoplay"}
            playsinline
            preload="metadata"
          ></${audioOnly ? "audio" : "video"}>
          <p class="studio-player-error" hidden>当前编码无法在拾集内播放，可以使用外部播放器打开。</p>
        </div>
        <div class="studio-player-meta">
          <div><strong>${escapeHTML(fileName)}</strong><span title="${escapeHTML(filePath)}">${escapeHTML(filePath)}</span></div>
          <div>
            ${
              !audioOnly && (context.assetId || context.projectId)
                ? `<button class="button button--quiet" type="button" data-studio-action="capture-current-frame">${icon("gallery")}<span>用当前画面做封面</span></button>`
                : ""
            }
            <button class="button button--quiet" type="button" data-studio-action="reveal-path" data-path="${escapeHTML(filePath)}">${icon("folder")}<span>定位文件</span></button>
            <button class="button button--quiet" type="button" data-studio-action="open-path" data-path="${escapeHTML(filePath)}">${icon("external")}<span>外部打开</span></button>
          </div>
        </div>
      </div>
    `);
    const player = document.querySelector("#studio-dialog .studio-media-player");
    const error = document.querySelector("#studio-dialog .studio-player-error");
    player?.addEventListener("error", () => {
      if (error) {
        error.hidden = false;
      }
    });
    const resumeAt = Math.max(0, Number(context.resumeAt) || 0);
    if (resumeAt) {
      player?.addEventListener(
        "loadedmetadata",
        () => {
          try {
            player.currentTime = Math.min(resumeAt, player.duration || resumeAt);
          } catch {
            // Continue from the beginning if seeking is unavailable.
          }
        },
        { once: true }
      );
    }
    if (context.autoplay !== false) {
      player?.play?.().catch(() => {});
    }

    const renameForm = document.getElementById("studio-player-rename-form");
    renameForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = document.getElementById("studio-player-rename");
      let nextBaseName = input.value.trim();
      if (
        extension &&
        nextBaseName.toLocaleLowerCase("zh-CN").endsWith(extension)
      ) {
        nextBaseName = nextBaseName.slice(0, -extension.length).trim();
      }
      if (!nextBaseName) {
        showToast("名称不能为空", true);
        input.focus();
        return;
      }
      if (nextBaseName === baseName) {
        input.focus();
        return;
      }
      const submit = renameForm.querySelector('[type="submit"]');
      submit.disabled = true;
      const resumeTime = Number(player?.currentTime) || 0;
      const shouldResume = Boolean(player && !player.paused);
      player?.pause?.();
      const previousSource = player?.src || "";
      player?.removeAttribute("src");
      player?.load?.();
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      try {
        const paths = [...new Set(
          [asset.localPath, asset.sourcePath].filter(Boolean)
        )];
        const results = await window.ResourceLibrary.renameFiles(
          paths,
          nextBaseName
        );
        const normalizedLocalPath = asset.localPath
          .replaceAll("\\", "/")
          .toLocaleLowerCase("zh-CN");
        const normalizedSourcePath = asset.sourcePath
          .replaceAll("\\", "/")
          .toLocaleLowerCase("zh-CN");
        const localResult =
          results.find(
            (item) =>
              item.oldPath
                .replaceAll("\\", "/")
                .toLocaleLowerCase("zh-CN") === normalizedLocalPath
          ) || (results.length === 1 ? results[0] : null);
        const sourceResult =
          results.find(
            (item) =>
              item.oldPath
                .replaceAll("\\", "/")
                .toLocaleLowerCase("zh-CN") === normalizedSourcePath
          ) || null;
        if (asset.localPath && !localResult) {
          throw new Error("素材库文件没有成功重命名。");
        }
        const updated = await saveAsset({
          ...asset,
          title: nextBaseName,
          fileName: localResult?.name || asset.fileName,
          localPath: localResult?.path || asset.localPath,
          sourcePath: sourceResult?.path || asset.sourcePath,
          updatedAt: Date.now()
        });
        renderIntoPage();
        openMediaPlayer(updated.localPath, updated.title, {
          assetId: updated.id,
          projectId: context.projectId,
          resumeAt: resumeTime,
          autoplay: shouldResume
        });
        showToast("素材名称和电脑文件已同步修改");
      } catch (renameError) {
        if (player && previousSource) {
          player.src = previousSource;
          player.load();
          player.addEventListener(
            "loadedmetadata",
            () => {
              try {
                player.currentTime = resumeTime;
              } catch {
                // Keep the previous playback position when possible.
              }
              if (shouldResume) {
                player.play().catch(() => {});
              }
            },
            { once: true }
          );
        }
        showToast(renameError.message || "重命名失败，请稍后重试。", true);
        input.focus();
        input.select();
      } finally {
        submit.disabled = false;
      }
    });
    if (context.focusRename && asset) {
      window.setTimeout(() => {
        const input = document.getElementById("studio-player-rename");
        input?.focus();
        input?.select();
      }, 80);
    }
  }

  async function captureCurrentPlayerFrame() {
    const player = document.querySelector(
      "#studio-dialog .studio-media-player"
    );
    const context = state.dialogContext;
    if (
      !(player instanceof HTMLVideoElement) ||
      player.readyState < 2 ||
      !player.videoWidth ||
      !player.videoHeight ||
      context?.kind !== "media-player"
    ) {
      showToast("当前画面还没有准备好，请稍后再试", true);
      return;
    }
    try {
      const maxWidth = 1280;
      const scale = Math.min(1, maxWidth / player.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(player.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(player.videoHeight * scale));
      const painter = canvas.getContext("2d");
      if (!painter) {
        throw new Error("无法创建封面画布");
      }
      painter.drawImage(player, 0, 0, canvas.width, canvas.height);
      const previewData = canvas.toDataURL("image/jpeg", 0.9);
      const now = Date.now();
      const seconds = Math.max(0, Math.floor(player.currentTime || 0));
      const timeLabel = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

      if (context.assetId) {
        const asset = assetById(context.assetId);
        if (asset) {
          await saveAsset({
            ...asset,
            thumbnailData: previewData,
            thumbnailUpdatedAt: now,
            thumbnailFailed: false,
            updatedAt: now
          });
        }
      }
      let targetProject = context.projectId
        ? projectById(context.projectId)
        : null;
      if (!targetProject && context.assetId) {
        const associations = projectsForAsset(context.assetId);
        if (associations.length === 1) {
          targetProject = associations[0].project;
        }
      }
      if (targetProject) {
        const sourceAsset = context.assetId
          ? assetById(context.assetId)
          : null;
        targetProject.covers.push({
          id: makeId("cover"),
          projectId: targetProject.id,
          title: sourceAsset
            ? `${sourceAsset.title} · ${timeLabel}`
            : `视频截帧 ${timeLabel}`,
          source: null,
          exported: null,
          previewData,
          selected: targetProject.covers.length === 0,
          createdAt: now
        });
        await saveProject(targetProject);
      }
      renderIntoPage();
      showToast("已用当前画面生成封面");
    } catch (error) {
      showToast(error.message || "无法生成封面", true);
    }
  }

  function coverPreviewPath(cover) {
    const exportedPath = cover?.exported?.path || "";
    if (isDisplayImageFile(exportedPath)) {
      return exportedPath;
    }
    const sourcePath = cover?.source?.path || "";
    return isDisplayImageFile(sourcePath) ? sourcePath : "";
  }

  function renderCoverBrowser() {
    const context = state.dialogContext;
    if (!context || context.kind !== "cover-browser") {
      return;
    }
    const project = projectById(context.projectId);
    const items = project?.covers || [];
    if (!project || !items.length) {
      closeDialog();
      return;
    }
    let index = items.findIndex((item) => item.id === context.coverId);
    if (index < 0) {
      index = 0;
    }
    const cover = items[index];
    context.coverId = cover.id;
    const previewPath = Desktop ? coverPreviewPath(cover) : "";
    const previewData = cover.previewData || "";
    openDialog(`
      ${dialogHeader(
        `封面浏览 · ${index + 1} / ${items.length}`,
        cover.title
      )}
      <div class="modal-body studio-cover-browser-body">
        <div class="studio-cover-browser-stage">
          <button
            class="studio-cover-nav is-prev"
            type="button"
            data-studio-action="cover-browser-step"
            data-direction="-1"
            aria-label="上一版封面"
            ${items.length < 2 ? "disabled" : ""}
          >${icon("arrow-left")}</button>
          <div class="studio-cover-large">
            ${
              previewData
                ? `<img src="${escapeHTML(previewData)}" alt="${escapeHTML(cover.title)}" />`
                : previewPath
                ? `<img data-cover-preview-image src="${escapeHTML(mediaUrl(previewPath))}" alt="${escapeHTML(cover.title)}" />`
                : `<div class="studio-cover-large-placeholder">${icon("gallery")}<strong>${escapeHTML(cover.title)}</strong><span>${cover.exported ? "当前导出图格式不支持内嵌预览" : "该项目封面还没有可预览的导出图"}</span></div>`
            }
            ${cover.selected ? `<span class="studio-cover-in-use">当前使用版本</span>` : ""}
          </div>
          <button
            class="studio-cover-nav is-next"
            type="button"
            data-studio-action="cover-browser-step"
            data-direction="1"
            aria-label="下一版封面"
            ${items.length < 2 ? "disabled" : ""}
          >${icon("chevron-right")}</button>
        </div>
        <div class="studio-cover-browser-info">
          <div class="studio-cover-browser-copy">
            <span>${escapeHTML(project.title)}</span>
            <strong>${escapeHTML(cover.title)}</strong>
            <small>${escapeHTML(cover.exported?.name || cover.source?.name || "未关联文件")}</small>
          </div>
          <div class="studio-cover-browser-actions">
            ${
              cover.source
                ? `<button class="button button--quiet" type="button" data-studio-action="open-path" data-path="${escapeHTML(cover.source.path)}">${icon("file")}<span>打开 PSD 源文件</span></button>`
                : ""
            }
            ${
              cover.exported
                ? `<button class="button button--quiet" type="button" data-studio-action="open-path" data-path="${escapeHTML(cover.exported.path)}">${icon("external")}<span>打开导出图</span></button>`
                : ""
            }
            <button class="button ${cover.selected ? "button--ghost" : "button--primary"}" type="button" data-studio-action="select-cover" data-project-id="${escapeHTML(project.id)}" data-cover-id="${escapeHTML(cover.id)}">${icon("check")}<span>${cover.selected ? "当前使用" : "设为使用"}</span></button>
          </div>
        </div>
        <div class="studio-cover-browser-strip" aria-label="封面版本列表">
          ${items
            .map(
              (item, itemIndex) => `
                <button
                  class="studio-cover-strip-item${item.id === cover.id ? " is-active" : ""}${item.selected ? " is-selected" : ""}"
                  type="button"
                  data-studio-action="open-cover-browser"
                  data-project-id="${escapeHTML(project.id)}"
                  data-cover-id="${escapeHTML(item.id)}"
                >
                  <span>${itemIndex + 1}</span>
                  <strong>${escapeHTML(item.title)}</strong>
                  ${item.selected ? `<small>使用中</small>` : ""}
                </button>
              `
            )
            .join("")}
        </div>
      </div>
      <footer class="modal-footer studio-cover-browser-footer">
        <span>使用 ← → 键切换封面版本</span>
        <div>
          <button class="button button--quiet" type="button" data-studio-action="open-project" data-project-id="${escapeHTML(project.id)}">${icon("inbox")}<span>返回项目</span></button>
          <button class="button button--ghost" type="button" data-studio-action="close-dialog">关闭</button>
        </div>
      </footer>
    `);
    const image = document.querySelector("#studio-dialog [data-cover-preview-image]");
    image?.addEventListener("error", () => {
      image.hidden = true;
      const placeholder = document.createElement("div");
      placeholder.className = "studio-cover-large-placeholder";
      placeholder.innerHTML = `${icon("gallery")}<strong>${escapeHTML(cover.title)}</strong><span>图片无法读取，请确认文件仍在原位置</span>`;
      image.parentElement?.appendChild(placeholder);
    });
    hydrateThumbnails(document.getElementById("studio-dialog"));
  }

  function openCoverBrowser(projectId, coverId) {
    const project = projectById(projectId);
    if (!project?.covers.length) {
      showToast("这个项目还没有封面版本", true);
      return;
    }
    state.dialogContext = {
      kind: "cover-browser",
      projectId,
      coverId:
        project.covers.some((cover) => cover.id === coverId)
          ? coverId
          : project.covers[0].id
    };
    renderCoverBrowser();
  }

  function stepCoverBrowser(direction) {
    const context = state.dialogContext;
    if (!context || context.kind !== "cover-browser") {
      return;
    }
    const project = projectById(context.projectId);
    if (!project?.covers.length) {
      return;
    }
    const index = Math.max(
      0,
      project.covers.findIndex((cover) => cover.id === context.coverId)
    );
    const nextIndex =
      (index + Number(direction) + project.covers.length) %
      project.covers.length;
    context.coverId = project.covers[nextIndex].id;
    renderCoverBrowser();
  }

  async function pickFilesAndImport() {
    if (Desktop?.pickFiles) {
      try {
        const files = await Desktop.pickFiles();
        if (files?.length) {
          openImportDialog(files);
        }
      } catch (error) {
        showToast(error.message || "无法选择素材", true);
      }
      return;
    }

    document.getElementById("studio-browser-upload-input")?.remove();
    const input = document.createElement("input");
    input.id = "studio-browser-upload-input";
    input.type = "file";
    input.accept = BROWSER_UPLOAD_ACCEPT;
    input.multiple = true;
    input.hidden = true;
    const cleanup = () => input.remove();
    input.addEventListener(
      "change",
      () => {
        const files = [...(input.files || [])];
        cleanup();
        if (files.length) {
          openImportDialog(files);
        }
      },
      { once: true }
    );
    input.addEventListener("cancel", cleanup, { once: true });
    document.body.appendChild(input);
    input.click();
  }

  async function scanFolderAndImport() {
    if (!Desktop?.pickMediaFolder || !Desktop?.scanMediaFolder) {
      showToast("自动同步文件夹仅在电脑版中可用", true);
      return;
    }
    try {
      const result = await Desktop.pickMediaFolder();
      if (result?.canceled) {
        return;
      }
      if (!result?.folder?.path) {
        showToast("没有取得有效的同步文件夹", true);
        return;
      }
      state.syncFolder = result.folder.path;
      state.syncError = "";
      localStorage.setItem(AUTO_SYNC_FOLDER_KEY, state.syncFolder);
      restartAutoSync({ scanNow: false });
      const imported = await importDetectedVideos(result.files || []);
      renderIntoPage();
      showToast(
        imported.length
          ? `已同步 ${imported.length} 个视频，并开始自动监控`
          : "已开始自动监控这个文件夹"
      );
    } catch (error) {
      showToast(error.message || "无法设置自动同步文件夹", true);
    }
  }

  function loadAutoSyncFolderSetting() {
    try {
      state.syncFolder = Desktop
        ? String(localStorage.getItem(AUTO_SYNC_FOLDER_KEY) || "").trim()
        : "";
    } catch {
      state.syncFolder = "";
    }
  }

  function restoredFilePathKey(filePath) {
    return String(filePath || "")
      .replaceAll("\\", "/")
      .toLocaleLowerCase("zh-CN");
  }

  async function importDetectedVideos(files) {
    if (!Array.isArray(files) || !files.length) {
      return [];
    }
    const knownPaths = new Set(
      state.assets.flatMap((asset) =>
        [asset.localPath, asset.sourcePath]
          .filter(Boolean)
          .map(restoredFilePathKey)
      )
    );
    const now = Date.now();
    const incoming = uniqueIncomingFiles(files).filter(
      (file) =>
        isVideoFile(file.name) &&
        !knownPaths.has(restoredFilePathKey(file.path))
    );
    if (!incoming.length) {
      return [];
    }
    const detectedAssets = incoming.map((file) =>
      normalizeAsset({
        id: makeId("asset"),
        title: file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[_-]+/g, " ")
          .trim()
          .slice(0, 120),
        kind: inferAssetKind(file.name),
        status: "usable",
        description: "从自动同步文件夹识别并添加。",
        tags: ["自动同步"],
        localPath: file.path,
        sourcePath: file.path,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.fileBlob?.type || "",
        storageMode: "path",
        fileModifiedAt: file.lastModified,
        createdAt: now,
        updatedAt: now
      })
    ).filter(Boolean);
    if (!detectedAssets.length) {
      return [];
    }
    await saveAssets(detectedAssets);
    localStorage.setItem(ASSET_GUIDE_KEY, "1");
    return detectedAssets;
  }

  async function syncWatchedFolder({ notify = true } = {}) {
    if (
      !Desktop?.scanMediaFolder ||
      !state.syncFolder ||
      state.syncBusy
    ) {
      return [];
    }
    state.syncBusy = true;
    try {
      const result = await Desktop.scanMediaFolder(state.syncFolder);
      const imported = await importDetectedVideos(result?.files || []);
      state.syncError = "";
      if (imported.length) {
        renderIntoPage();
        if (notify) {
          showToast(`自动同步：已添加 ${imported.length} 个新视频`);
        }
      }
      return imported;
    } catch (error) {
      const message = error.message || "自动同步文件夹暂时无法读取";
      if (notify && state.syncError !== message) {
        showToast(message, true);
      }
      state.syncError = message;
      return [];
    } finally {
      state.syncBusy = false;
    }
  }

  function restartAutoSync({ scanNow = true } = {}) {
    window.clearInterval(state.syncTimer);
    state.syncTimer = null;
    if (!Desktop?.scanMediaFolder || !state.syncFolder) {
      return;
    }
    if (scanNow) {
      void syncWatchedFolder({ notify: false });
    }
    state.syncTimer = window.setInterval(() => {
      void syncWatchedFolder({ notify: true });
    }, AUTO_SYNC_INTERVAL_MS);
  }

  function clearAutoSyncFolder() {
    window.clearInterval(state.syncTimer);
    state.syncTimer = null;
    state.syncFolder = "";
    state.syncError = "";
    localStorage.removeItem(AUTO_SYNC_FOLDER_KEY);
    renderIntoPage();
    showToast("已停止自动同步");
  }

  async function configureAutoSyncFolder() {
    if (!Desktop?.pickMediaFolder || !Desktop?.scanMediaFolder) {
      showToast("自动同步文件夹仅在电脑版中可用", true);
      return;
    }
    await scanFolderAndImport();
  }

  function uniqueIncomingFiles(files) {
    const seen = new Set();
    return files
      .map(normalizeFileInfo)
      .filter((file) => {
        if (!file) {
          return false;
        }
        const key = `${file.path.toLocaleLowerCase("zh-CN")}|${file.size}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }

  function openImportDialog(files, options = {}) {
    const incoming = uniqueIncomingFiles(files);
    if (!incoming.length) {
      showToast("没有可导入的素材", true);
      return;
    }
    state.pendingFiles = incoming;
    const browserUpload = !Desktop;
    const libraryReady = Boolean(
      !browserUpload && window.ResourceLibrary?.isConfigured?.()
    );
    const libraryMode = window.ResourceLibrary?.getConfig?.()?.mode;
    openDialog(`
      ${dialogHeader("批量导入", options.folderName ? `扫描「${options.folderName}」` : "导入素材")}
      <form id="studio-import-form">
        <div class="modal-body studio-dialog-body">
          <p class="studio-dialog-note">${icon(browserUpload ? "info" : "folder")}<span>${
            browserUpload
              ? "视频会保存在当前浏览器的本地数据中，不会上传服务器。保存后可以像桌面版一样在素材详情内直接播放；大型视频会占用浏览器存储空间。"
              : libraryReady
                ? `素材会${libraryMode === "move" ? "移动" : "复制"}到已设置的素材库，并按类型自动归档。文件夹最多扫描 1000 个支持的文件。`
                : "尚未设置素材库，当前只记录文件原位置；可以在设置中建立分类素材库。"
          }</span></p>
          <div class="studio-import-list">
            ${incoming
              .map(
                (file, index) => `
                  <div class="studio-import-row" data-import-row data-import-index="${index}">
                    <div class="studio-import-file">
                      <strong>${escapeHTML(file.name)}</strong>
                      <span>${formatBytes(file.size)} · ${file.fileBlob instanceof Blob ? "浏览器本地文件" : escapeHTML(file.path)}</span>
                    </div>
                    <select class="studio-select" data-import-kind aria-label="素材类型">
                      ${Object.entries(KIND_META)
                        .filter(([kind]) => kind !== "cover")
                        .map(
                          ([kind, meta]) =>
                            `<option value="${kind}"${inferAssetKind(file.name) === kind ? " selected" : ""}>${meta.label}</option>`
                        )
                        .join("")}
                    </select>
                  </div>
                `
              )
              .join("")}
          </div>
          <p class="form-error" id="studio-import-error" role="alert"></p>
        </div>
        <footer class="modal-footer">
          <button class="button button--ghost" type="button" data-studio-action="close-dialog">取消</button>
          <button class="button button--primary" type="submit">${icon("upload")}<span>上传 ${incoming.length} 项素材</span></button>
        </footer>
      </form>
    `);
    document.getElementById("studio-import-form").addEventListener("submit", submitImport);
  }

  async function submitImport(event) {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('[type="submit"]');
    const error = document.getElementById("studio-import-error");
    const rows = [...event.currentTarget.querySelectorAll("[data-import-row]")];
    const now = Date.now();
    const existingByPath = new Map(
      state.assets.flatMap((asset) => {
        const entries = [[asset.localPath.toLocaleLowerCase("zh-CN"), asset]];
        if (asset.sourcePath) {
          entries.push([asset.sourcePath.toLocaleLowerCase("zh-CN"), asset]);
        }
        return entries;
      })
    );
    const assets = [];
    for (const row of rows) {
        const file = state.pendingFiles[Number(row.dataset.importIndex)];
        if (!file) {
          continue;
        }
        const existing = existingByPath.get(file.path.toLocaleLowerCase("zh-CN"));
        const kind = row.querySelector("[data-import-kind]").value;
        let managedFile = file;
        if (
          !existing &&
          Desktop &&
          window.ResourceLibrary?.isConfigured?.()
        ) {
          try {
            managedFile = await window.ResourceLibrary.importFile(
              file,
              window.ResourceLibrary.assetFolder(kind)
            );
          } catch (fileError) {
            error.textContent =
              fileError.message || `无法将「${file.name}」加入素材库。`;
            submit.disabled = false;
            return;
          }
        }
        const asset = normalizeAsset({
          ...(existing || {}),
          id: existing?.id || makeId("asset"),
          title:
            existing?.title ||
            file.name
              .replace(/\.[^.]+$/, "")
              .replace(/[_-]+/g, " ")
              .trim()
              .slice(0, 120),
          kind,
          status: existing?.status || "usable",
          tags: existing?.tags || [],
          localPath: managedFile.path,
          sourcePath:
            existing?.sourcePath || managedFile.originalPath || file.path,
          fileName: managedFile.name,
          fileSize: managedFile.size,
          fileType:
            managedFile.fileBlob?.type ||
            existing?.fileType ||
            "application/octet-stream",
          storageMode: managedFile.fileBlob ? "embedded" : "path",
          fileBlob:
            managedFile.fileBlob instanceof Blob
              ? managedFile.fileBlob
              : existing?.fileBlob instanceof Blob
                ? existing.fileBlob
                : null,
          fileModifiedAt: managedFile.lastModified,
          createdAt: existing?.createdAt || now,
          updatedAt: now
        });
        if (asset) {
          assets.push(asset);
        }
    }

    submit.disabled = true;
    error.textContent = "";
    try {
      const saved = await saveAssets(assets);
      localStorage.setItem(ASSET_GUIDE_KEY, "1");
      closeDialog();
      renderIntoPage();
      showToast(`已导入 ${saved.length} 项素材`);
    } catch (saveError) {
      error.textContent =
        saveError?.name === "QuotaExceededError"
          ? "浏览器存储空间不足，请移除部分素材后重试，或改用桌面版上传。"
          : saveError.message || "导入失败，请稍后重试。";
    } finally {
      submit.disabled = false;
    }
  }

  function openProjectDialog(project = null) {
    const existing = project ? projectById(project.id) : null;
    openDialog(`
      ${dialogHeader("视频项目", existing ? "编辑视频项目" : "新建视频项目")}
      <form id="studio-project-form">
        <div class="modal-body studio-dialog-body">
          <label class="studio-field">
            <span>项目名称 <em>*</em></span>
            <input id="studio-project-title" type="text" maxlength="120" required value="${escapeHTML(existing?.title || "")}" placeholder="例如：我的世界生存第一期" />
          </label>
          <label class="studio-field">
            <span>项目说明</span>
            <textarea id="studio-project-description" rows="3" maxlength="1200" placeholder="选题、剪辑方向或需要保留的素材说明">${escapeHTML(existing?.description || "")}</textarea>
          </label>
          <div class="studio-form-grid">
            <label class="studio-field">
              <span>发布平台</span>
              <input id="studio-project-platform" type="text" maxlength="60" value="${escapeHTML(existing?.platform || "")}" placeholder="例如：B站 / 抖音" />
            </label>
            <label class="studio-field">
              <span>项目阶段</span>
              <select id="studio-project-status" class="studio-select">
                ${Object.entries(PROJECT_STATUS_META)
                  .map(
                    ([id, meta]) =>
                      `<option value="${id}"${(existing?.status || "planning") === id ? " selected" : ""}>${meta.label}</option>`
                  )
                  .join("")}
              </select>
            </label>
          </div>
          <p class="form-error" id="studio-project-error" role="alert"></p>
        </div>
        <footer class="modal-footer">
          <button class="button button--ghost" type="button" data-studio-action="close-dialog">取消</button>
          <button class="button button--primary" type="submit">${icon("check")}<span>${existing ? "保存项目" : "创建项目"}</span></button>
        </footer>
      </form>
    `);
    document
      .getElementById("studio-project-form")
      .addEventListener("submit", (event) => submitProject(event, existing));
  }

  async function submitProject(event, existing) {
    event.preventDefault();
    const title = document.getElementById("studio-project-title").value.trim();
    if (!title) {
      document.getElementById("studio-project-error").textContent = "请填写项目名称。";
      return;
    }
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const project = await saveProject({
        ...(existing || {}),
        id: existing?.id || makeId("project"),
        title,
        description: document.getElementById("studio-project-description").value.trim(),
        platform: document.getElementById("studio-project-platform").value.trim(),
        status: document.getElementById("studio-project-status").value,
        materials: existing?.materials || [],
        covers: existing?.covers || [],
        editorFiles: existing?.editorFiles || [],
        createdAt: existing?.createdAt || Date.now()
      });
      if (!existing && state.pendingProjectAssetIds.length) {
        const ids = new Set(project.materials.map((item) => item.assetId));
        state.pendingProjectAssetIds.forEach((assetId) => {
          if (assetById(assetId) && !ids.has(assetId)) {
            project.materials.push({
              assetId,
              use: "candidate",
              addedAt: Date.now()
            });
          }
        });
        await saveProject(project);
      }
      state.pendingProjectAssetIds = [];
      closeDialog();
      state.tab = "projects";
      renderIntoPage();
      showToast(existing ? "项目已更新" : "视频项目已创建");
      openProjectDetail(project.id);
    } catch (error) {
      document.getElementById("studio-project-error").textContent =
        error.message || "项目保存失败。";
    } finally {
      submit.disabled = false;
    }
  }

  function openAssetDetail(
    assetId,
    { focusRename = false, autoplay = false } = {}
  ) {
    const asset = assetById(assetId);
    if (!asset) {
      return;
    }
    state.dialogContext = null;
    const extension = extensionOf(asset.fileName);
    const baseName = extension
      ? asset.fileName.slice(0, -extension.length)
      : asset.fileName || asset.title;
    const kindMeta = KIND_META[asset.kind];
    const browserStored = Boolean(embeddedFile(asset));
    const desktopStored = Boolean(Desktop && asset.localPath);
    const isVideo = isVideoFile(asset.fileName);
    const videoSource =
      isVideo && (browserStored || desktopStored)
        ? assetMediaSource(asset)
        : "";
    const inlineVideo =
      videoSource
        ? inlineVideoMarkup({
            source: videoSource,
            title: `${asset.title} 视频预览`,
            poster: asset.thumbnailData
          })
        : "";
    const previewImage = asset.thumbnailData
      ? `<img src="${escapeHTML(asset.thumbnailData)}" alt="" />`
      : isDisplayImageFile(asset.fileName)
        ? browserStored
          ? `<img src="${escapeHTML(browserAssetUrl(asset))}" alt="" />`
          : `<img data-studio-thumb="${escapeHTML(asset.localPath)}" alt="" />`
        : "";
    const detailHeaderMarkup = `<header class="modal-header studio-asset-detail-header">
          <div class="studio-detail-header-main">
            <p class="eyebrow">素材详情</p>
            <form class="studio-inline-rename-form" id="studio-inline-rename-form">
              <label class="sr-only" for="studio-inline-rename">文件名</label>
              <div class="studio-inline-rename-control">
                <input id="studio-inline-rename" type="text" maxlength="120" value="${escapeHTML(baseName)}" aria-label="修改文件名" />
                <span>${escapeHTML(extension || "无扩展名")}</span>
                <button class="button button--ghost" type="submit" title="保存文件名">${icon("check")}<span>保存</span></button>
              </div>
            </form>
          </div>
          <button class="icon-button" type="button" data-studio-action="close-dialog" aria-label="关闭">${icon("close")}</button>
        </header>`;
    openDialog(`
      ${detailHeaderMarkup}
      <div class="modal-body studio-dialog-body studio-simple-asset-detail">
        <div class="studio-detail-layout">
          <div class="studio-simple-preview${inlineVideo ? " is-video" : ""}" style="--studio-tone:${kindMeta.tone}">
            ${inlineVideo || previewImage || `<span>${icon(kindMeta.icon)}</span>`}
          </div>
          <div class="studio-detail-side">
            <label class="studio-detail-field">
              <span>素材类型</span>
              <select class="studio-select" id="studio-detail-kind">
                ${Object.entries(KIND_META)
                  .filter(([kind]) => kind !== "cover")
                  .map(
                    ([kind, meta]) =>
                      `<option value="${kind}"${asset.kind === kind ? " selected" : ""}>${meta.label}</option>`
                  )
                  .join("")}
              </select>
            </label>
            <form class="studio-detail-note-form" id="studio-detail-note-form">
              <label class="studio-detail-field" for="studio-detail-description">
                <span>备注</span>
                <textarea id="studio-detail-description" rows="3" maxlength="800" placeholder="记录素材用途、拍摄内容或剪辑提示…">${escapeHTML(asset.description)}</textarea>
              </label>
              <div class="studio-detail-note-actions">
                <span>${browserStored ? "仅保存在当前浏览器" : "备注与素材记录一起保存"}</span>
                <button class="button button--quiet" type="submit">保存备注</button>
              </div>
            </form>
            <section class="studio-media-info${isVideo ? " is-video" : ""}" aria-label="${isVideo ? "视频信息" : "素材信息"}">
              <header>
                <strong>${isVideo ? "视频信息" : "素材信息"}</strong>
                <span>${escapeHTML(extension.replace(".", "").toUpperCase() || "FILE")}</span>
              </header>
              <dl>
                <div><dt>格式</dt><dd>${escapeHTML(extension.replace(".", "").toUpperCase() || "未知")}</dd></div>
                <div><dt>大小</dt><dd>${formatBytes(asset.fileSize)}</dd></div>
                ${
                  isVideo
                    ? `<div><dt>时长</dt><dd data-video-info-duration>读取中…</dd></div>
                       <div><dt>分辨率</dt><dd data-video-info-resolution>读取中…</dd></div>`
                    : ""
                }
                <div><dt>加入时间</dt><dd>${formatDate(asset.createdAt)}</dd></div>
                <div><dt>存储方式</dt><dd>${browserStored ? "浏览器本地" : desktopStored ? "电脑文件" : "仅记录信息"}</dd></div>
              </dl>
            </section>
            <div class="studio-detail-danger">
              <span>${browserStored ? "删除后会释放浏览器存储空间" : "移除记录不会删除电脑文件"}</span>
              <div class="studio-detail-danger-actions">
                <button class="button button--quiet" type="button" data-studio-action="remove-asset" data-asset-id="${escapeHTML(asset.id)}">${icon("close")}<span>${browserStored ? "删除" : "移除记录"}</span></button>
                ${
                  browserStored
                    ? ""
                    : `<button class="button button--quiet studio-danger-button" type="button" data-studio-action="trash-asset" data-asset-id="${escapeHTML(asset.id)}">${icon("trash")}<span>删除源文件</span></button>`
                }
              </div>
            </div>
          </div>
        </div>
      </div>
      ${
        desktopStored
          ? `<footer class="modal-footer studio-simple-asset-footer studio-simple-asset-footer--compact">
              <div>
                <button class="button button--ghost" type="button" data-studio-action="reveal-path" data-path="${escapeHTML(asset.localPath)}">${icon("folder")}<span>打开文件所在位置</span></button>
              </div>
            </footer>`
          : ""
      }
    `);
    bindInlineVideoPlayers(document.getElementById("studio-dialog"));
    const dialog = document.getElementById("studio-dialog");
    const inlinePlayer = dialog.querySelector(".studio-inline-video");
    const durationInfo = dialog.querySelector("[data-video-info-duration]");
    const resolutionInfo = dialog.querySelector(
      "[data-video-info-resolution]"
    );
    const updateVideoInfo = () => {
      if (!(inlinePlayer instanceof HTMLVideoElement)) {
        return;
      }
      if (durationInfo) {
        durationInfo.textContent =
          Number.isFinite(inlinePlayer.duration) && inlinePlayer.duration > 0
            ? formatMediaTime(inlinePlayer.duration)
            : "未知";
      }
      if (resolutionInfo) {
        resolutionInfo.textContent =
          inlinePlayer.videoWidth && inlinePlayer.videoHeight
            ? `${inlinePlayer.videoWidth} × ${inlinePlayer.videoHeight}`
            : "未知";
      }
    };
    if (inlinePlayer instanceof HTMLVideoElement) {
      inlinePlayer.addEventListener("loadedmetadata", updateVideoInfo);
      inlinePlayer.addEventListener("durationchange", updateVideoInfo);
      updateVideoInfo();
    }
    dialog
      .querySelector("#studio-detail-kind")
      ?.addEventListener("change", async (event) => {
        const kind = event.currentTarget.value;
        const meta = KIND_META[kind];
        if (!meta) {
          return;
        }
        try {
          const current = assetById(asset.id) || asset;
          await saveAsset({
            ...current,
            kind,
            updatedAt: Date.now()
          });
          const kicker = dialog.querySelector(".studio-asset-kicker");
          if (kicker) {
            kicker.innerHTML = `<span>${icon(meta.icon)}${meta.label}</span>`;
          }
          dialog
            .querySelector(".studio-simple-preview")
            ?.style.setProperty("--studio-tone", meta.tone);
          renderIntoPage();
          showToast("素材类型已更新");
        } catch (kindError) {
          showToast(kindError.message || "无法更新素材类型", true);
        }
      });
    dialog
      .querySelector("#studio-detail-note-form")
      ?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const notes = dialog
          .querySelector("#studio-detail-description")
          .value.trim();
        try {
          const current = assetById(asset.id) || asset;
          await saveAsset({
            ...current,
            description: notes,
            updatedAt: Date.now()
          });
          renderIntoPage();
          showToast("备注已保存");
        } catch (noteError) {
          showToast(noteError.message || "备注保存失败", true);
        }
      });
    if (autoplay) {
      const player = document.querySelector(
        "#studio-dialog .studio-inline-video"
      );
      window.setTimeout(() => {
        player?.play?.().catch(() => {});
      }, 80);
    }
    const form = document.getElementById("studio-inline-rename-form");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = document.getElementById("studio-inline-rename");
      let nextBaseName = input.value.trim();
      if (
        extension &&
        nextBaseName.toLocaleLowerCase("zh-CN").endsWith(extension)
      ) {
        nextBaseName = nextBaseName.slice(0, -extension.length).trim();
      }
      if (!nextBaseName) {
        showToast("名称不能为空", true);
        input.focus();
        return;
      }
      if (nextBaseName === baseName) {
        input.focus();
        return;
      }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        if (browserStored) {
          const current = assetById(asset.id) || asset;
          const updated = await saveAsset({
            ...current,
            title: nextBaseName,
            fileName: `${nextBaseName}${extension}`,
            updatedAt: Date.now()
          });
          renderIntoPage();
          openAssetDetail(updated.id);
          showToast("素材名称已更新");
          return;
        }
        if (asset.localPath) {
          try {
            await Desktop.getFileInfo(asset.localPath);
          } catch {
            throw new Error("素材库文件已被移动或删除，无法重命名。");
          }
        }
        const paths = [...new Set(
          [asset.localPath, asset.sourcePath].filter(Boolean)
        )];
        const results = await window.ResourceLibrary.renameFiles(
          paths,
          nextBaseName
        );
        const normalizedLocalPath = asset.localPath
          .replaceAll("\\", "/")
          .toLocaleLowerCase("zh-CN");
        const normalizedSourcePath = asset.sourcePath
          .replaceAll("\\", "/")
          .toLocaleLowerCase("zh-CN");
        const localResult =
          results.find(
            (item) =>
              item.oldPath
                .replaceAll("\\", "/")
                .toLocaleLowerCase("zh-CN") === normalizedLocalPath
          ) || (results.length === 1 ? results[0] : null);
        const sourceResult =
          results.find(
            (item) =>
              item.oldPath
                .replaceAll("\\", "/")
                .toLocaleLowerCase("zh-CN") === normalizedSourcePath
          ) || null;
        if (asset.localPath && !localResult) {
          throw new Error("素材库文件没有成功重命名。");
        }
        const updated = await saveAsset({
          ...asset,
          title: nextBaseName,
          fileName: localResult?.name || asset.fileName,
          localPath: localResult?.path || asset.localPath,
          sourcePath: sourceResult?.path || asset.sourcePath,
          updatedAt: Date.now()
        });
        renderIntoPage();
        openAssetDetail(updated.id);
        showToast("素材名称和电脑文件已同步修改");
      } catch (renameError) {
        showToast(renameError.message || "重命名失败，请稍后重试。", true);
        input.focus();
        input.select();
      } finally {
        submit.disabled = false;
      }
    });
    if (focusRename) {
      window.setTimeout(() => {
        const input = document.getElementById("studio-inline-rename");
        input?.focus();
        input?.select();
      }, 80);
    }
  }

  function openRenameAssetDialog(assetId) {
    const asset = assetById(assetId);
    if (!asset) {
      return;
    }
    const extension = extensionOf(asset.fileName);
    const baseName = extension
      ? asset.fileName.slice(0, -extension.length)
      : asset.fileName || asset.title;
    const sourceNote =
      asset.sourcePath &&
      asset.sourcePath.toLocaleLowerCase("zh-CN") !==
        asset.localPath.toLocaleLowerCase("zh-CN")
        ? "素材是复制入库的，入库前保留的原文件也会同步改名。"
        : "电脑上的源文件会同步改名，扩展名保持不变。";
    openDialog(`
      ${dialogHeader("重命名素材", asset.title)}
      <form id="studio-rename-form">
        <div class="modal-body studio-dialog-body">
          <label class="studio-field">
            <span>新名称</span>
            <div class="studio-rename-input">
              <input id="studio-rename-name" type="text" maxlength="120" value="${escapeHTML(baseName)}" autofocus />
              <span>${escapeHTML(extension || "无扩展名")}</span>
            </div>
          </label>
          <p class="studio-dialog-note">${icon("edit")}<span>${escapeHTML(sourceNote)}</span></p>
          <p class="form-error" id="studio-rename-error" role="alert"></p>
        </div>
        <footer class="modal-footer">
          <button class="button button--ghost" type="button" data-studio-action="close-dialog">取消</button>
          <button class="button button--primary" type="submit">${icon("check")}<span>重命名</span></button>
        </footer>
      </form>
    `);
    const form = document.getElementById("studio-rename-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = document.getElementById("studio-rename-name");
      const error = document.getElementById("studio-rename-error");
      let nextBaseName = input.value.trim();
      if (
        extension &&
        nextBaseName.toLocaleLowerCase("zh-CN").endsWith(extension)
      ) {
        nextBaseName = nextBaseName.slice(0, -extension.length).trim();
      }
      if (!nextBaseName) {
        error.textContent = "请输入新名称。";
        input.focus();
        return;
      }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      error.textContent = "";
      try {
        if (asset.localPath) {
          try {
            await Desktop.getFileInfo(asset.localPath);
          } catch {
            throw new Error("素材库文件已被移动或删除，无法重命名。");
          }
        }
        const paths = [...new Set(
          [asset.localPath, asset.sourcePath].filter(Boolean)
        )];
        const results = await window.ResourceLibrary.renameFiles(
          paths,
          nextBaseName
        );
        const normalizedLocalPath = asset.localPath
          .replaceAll("\\", "/")
          .toLocaleLowerCase("zh-CN");
        const normalizedSourcePath = asset.sourcePath
          .replaceAll("\\", "/")
          .toLocaleLowerCase("zh-CN");
        const localResult =
          results.find(
            (item) =>
              item.oldPath
                .replaceAll("\\", "/")
                .toLocaleLowerCase("zh-CN") === normalizedLocalPath
          ) || (results.length === 1 ? results[0] : null);
        const sourceResult =
          results.find(
            (item) =>
              item.oldPath
                .replaceAll("\\", "/")
                .toLocaleLowerCase("zh-CN") === normalizedSourcePath
          ) || null;
        if (asset.localPath && !localResult) {
          throw new Error("素材库文件没有成功重命名。");
        }
        await saveAsset({
          ...asset,
          title: nextBaseName,
          fileName: localResult?.name || asset.fileName,
          localPath: localResult?.path || asset.localPath,
          sourcePath: sourceResult?.path || asset.sourcePath,
          updatedAt: Date.now()
        });
        closeDialog();
        renderIntoPage();
        showToast("素材名称和电脑文件已同步修改");
      } catch (renameError) {
        error.textContent =
          renameError.message || "重命名失败，请稍后重试。";
      } finally {
        submit.disabled = false;
      }
    });
    window.setTimeout(() => {
      const input = document.getElementById("studio-rename-name");
      input?.focus();
      input?.select();
    }, 60);
  }

  function renderMaterialRow(project, material) {
    const asset = assetById(material.assetId);
    if (!asset) {
      return `
        <div class="studio-material-row is-missing">
          <div><strong>素材记录已不存在</strong><span>${escapeHTML(material.assetId)}</span></div>
          <button class="button button--quiet" type="button" data-studio-action="remove-material" data-project-id="${escapeHTML(project.id)}" data-asset-id="${escapeHTML(material.assetId)}">移除</button>
        </div>
      `;
    }
    const meta = KIND_META[asset.kind];
    return `
      <div class="studio-material-row" style="--studio-tone:${meta.tone}">
        <div class="studio-material-icon">${icon(meta.icon)}</div>
        <div class="studio-material-copy">
          <strong>${escapeHTML(asset.title)}</strong>
          <span>${meta.label} · ${formatBytes(asset.fileSize)}${asset.favorite ? " · 精选" : ""}</span>
        </div>
        <div class="studio-material-state" role="group" aria-label="成片使用状态">
          <button class="${material.use === "candidate" ? "is-active" : ""}" type="button" data-studio-action="material-use" data-project-id="${escapeHTML(project.id)}" data-asset-id="${escapeHTML(asset.id)}" data-use="candidate">候选</button>
          <button class="${material.use === "used" ? "is-active" : ""}" type="button" data-studio-action="material-use" data-project-id="${escapeHTML(project.id)}" data-asset-id="${escapeHTML(asset.id)}" data-use="used">采用</button>
          <button class="${material.use === "unused" ? "is-active" : ""}" type="button" data-studio-action="material-use" data-project-id="${escapeHTML(project.id)}" data-asset-id="${escapeHTML(asset.id)}" data-use="unused">未采用</button>
        </div>
        <button class="studio-icon-button" type="button" title="打开素材" data-studio-action="open-asset" data-asset-id="${escapeHTML(asset.id)}">${icon("external")}</button>
        <button class="studio-icon-button" type="button" title="从项目移除" data-studio-action="remove-material" data-project-id="${escapeHTML(project.id)}" data-asset-id="${escapeHTML(asset.id)}">${icon("close")}</button>
      </div>
    `;
  }

  function renderProjectDetail(project) {
    const meta = PROJECT_STATUS_META[project.status];
    const assets = project.materials
      .map((material) => assetById(material.assetId))
      .filter(Boolean);
    const used = project.materials.filter((material) => material.use === "used").length;
    const candidates = project.materials.filter(
      (material) => material.use === "candidate"
    ).length;
    return `
      ${dialogHeader("视频项目档案", project.title)}
      <div class="modal-body studio-dialog-body studio-project-detail">
        <div class="studio-project-summary">
          <div>
            ${statusBadge(meta)}
            <h3>${escapeHTML(project.title)}</h3>
            <p>${escapeHTML(project.description || "还没有项目说明。")}</p>
          </div>
          <div class="studio-project-numbers">
            <span><strong>${assets.length}</strong>素材</span>
            <span><strong>${used}</strong>采用</span>
            <span><strong>${candidates}</strong>待校对</span>
          </div>
        </div>
        <div class="studio-detail-actions">
          <button class="button button--primary" type="button" data-studio-action="add-project-materials" data-project-id="${escapeHTML(project.id)}">${icon("plus")}<span>从素材库添加</span></button>
          <button class="button button--ghost" type="button" data-studio-action="finalize-project" data-project-id="${escapeHTML(project.id)}">${icon("check")}<span>完成成片校对</span></button>
          <button class="button button--ghost" type="button" data-studio-action="edit-project" data-project-id="${escapeHTML(project.id)}">${icon("edit")}<span>编辑项目</span></button>
        </div>
        <section class="studio-dialog-section">
          <div class="studio-dialog-section-head">
            <div><span>剪辑篮</span><small>记录候选、采用和未采用素材</small></div>
          </div>
          <div class="studio-material-list">
            ${
              project.materials.length
                ? project.materials.map((material) => renderMaterialRow(project, material)).join("")
                : `<div class="studio-dialog-empty">剪辑篮还是空的。先从素材库加入原片或可复用组件。</div>`
            }
          </div>
        </section>
        <section class="studio-dialog-section">
          <div class="studio-dialog-section-head">
            <div><span>剪辑工程与成片</span><small>剪映、Premiere Pro、After Effects</small></div>
            <div>
              <button class="button button--quiet" type="button" data-studio-action="link-editor" data-project-id="${escapeHTML(project.id)}">${icon("plus")}<span>关联工程</span></button>
              <button class="button button--quiet" type="button" data-studio-action="choose-final-video" data-project-id="${escapeHTML(project.id)}">${icon("monitor")}<span>设置成片</span></button>
            </div>
          </div>
          <div class="studio-linked-files">
            ${
              project.finalVideo
                ? `<div class="studio-linked-file"><span class="studio-linked-icon">${icon("monitor")}</span><div><strong>最终成片</strong><small>${escapeHTML(project.finalVideo.name)}</small></div>${isVideoFile(project.finalVideo.name) && Desktop ? `<button class="studio-icon-button" type="button" title="播放成片" data-studio-action="play-media" data-path="${escapeHTML(project.finalVideo.path)}" data-title="${escapeHTML(project.title)} · 最终成片" data-project-id="${escapeHTML(project.id)}">${icon("play")}</button>` : `<span></span>`}<button class="studio-icon-button" type="button" data-studio-action="open-path" data-path="${escapeHTML(project.finalVideo.path)}">${icon("external")}</button></div>`
                : ""
            }
            ${project.editorFiles
              .map(
                (file) => `
                  <div class="studio-linked-file" data-editor-id="${escapeHTML(file.id)}">
                    <span class="studio-linked-icon">${icon(EDITOR_META[file.kind]?.icon || "file")}</span>
                    <div><strong>${EDITOR_META[file.kind]?.label || "剪辑工程"}</strong><small>${escapeHTML(file.name)}</small></div>
                    <button class="studio-icon-button" type="button" data-studio-action="open-path" data-path="${escapeHTML(file.path)}" title="打开">${icon("external")}</button>
                    <button class="studio-icon-button" type="button" data-studio-action="remove-editor-file" data-project-id="${escapeHTML(project.id)}" data-editor-id="${escapeHTML(file.id)}" title="移除">${icon("close")}</button>
                  </div>
                `
              )
              .join("")}
            ${
              !project.finalVideo && !project.editorFiles.length
                ? `<div class="studio-dialog-empty">还没有关联剪辑工程或成片。</div>`
                : ""
            }
          </div>
        </section>
        <section class="studio-dialog-section">
          <div class="studio-dialog-section-head">
            <div><span>封面版本</span><small>PSD 源文件与导出版本</small></div>
            <button class="button button--quiet" type="button" data-studio-action="add-cover" data-project-id="${escapeHTML(project.id)}">${icon("plus")}<span>添加封面</span></button>
          </div>
          <div class="studio-cover-mini-list">
            ${
              project.covers.length
                ? project.covers
                    .map(
                      (cover) => `
                        <div class="studio-cover-mini${cover.selected ? " is-selected" : ""}">
                          <div><strong>${escapeHTML(cover.title)}</strong><small>${escapeHTML(cover.exported?.name || cover.source?.name || "未关联文件")}</small></div>
                          ${cover.selected ? `<span>当前使用</span>` : ""}
                          <button class="button button--quiet" type="button" data-studio-action="open-cover-browser" data-project-id="${escapeHTML(project.id)}" data-cover-id="${escapeHTML(cover.id)}">${icon("gallery")}<span>浏览</span></button>
                          <button class="button button--quiet" type="button" data-studio-action="select-cover" data-project-id="${escapeHTML(project.id)}" data-cover-id="${escapeHTML(cover.id)}">${icon("check")}<span>${cover.selected ? "已选" : "设为使用"}</span></button>
                        </div>
                      `
                    )
                    .join("")
                : `<div class="studio-dialog-empty">还没有封面版本。</div>`
            }
          </div>
        </section>
      </div>
      <footer class="modal-footer studio-dialog-footer-split">
        <button class="button button--quiet studio-danger-button" type="button" data-studio-action="delete-project" data-project-id="${escapeHTML(project.id)}">${icon("trash")}<span>删除项目</span></button>
        <button class="button button--ghost" type="button" data-studio-action="close-dialog">关闭</button>
      </footer>
    `;
  }

  function openProjectDetail(projectId) {
    const project = projectById(projectId);
    if (!project) {
      return;
    }
    state.dialogContext = null;
    openDialog(renderProjectDetail(project));
  }

  function openAssetPickerForProject(projectId) {
    const project = projectById(projectId);
    if (!project) {
      return;
    }
    const linked = new Set(project.materials.map((material) => material.assetId));
    const assets = state.assets.filter(
      (asset) => asset.status !== "trash" && !linked.has(asset.id)
    );
    openDialog(`
      ${dialogHeader("项目剪辑篮", "从素材库添加")}
      <form id="studio-material-picker-form">
        <div class="modal-body studio-dialog-body">
          <p class="studio-dialog-note">${icon("plus")}<span>可以同时加入录制原片和可复用组件，加入后再在项目中标记成片采用状态。</span></p>
          <div class="studio-picker-list">
            ${
              assets.length
                ? assets
                    .map(
                      (asset) => `
                        <label class="studio-picker-row" style="--studio-tone:${KIND_META[asset.kind].tone}">
                          <input type="checkbox" value="${escapeHTML(asset.id)}" />
                          <span class="studio-picker-icon">${icon(KIND_META[asset.kind].icon)}</span>
                          <span><strong>${escapeHTML(asset.title)}</strong><small>${KIND_META[asset.kind].label} · ${formatBytes(asset.fileSize)}</small></span>
                        </label>
                      `
                    )
                    .join("")
                : `<div class="studio-dialog-empty">素材库中没有可添加的新素材。</div>`
            }
          </div>
        </div>
        <footer class="modal-footer">
          <button class="button button--ghost" type="button" data-studio-action="close-dialog">取消</button>
          <button class="button button--primary" type="submit">${icon("plus")}<span>加入剪辑篮</span></button>
        </footer>
      </form>
    `);
    document
      .getElementById("studio-material-picker-form")
      .addEventListener("submit", async (event) => {
        event.preventDefault();
        const ids = [
          ...event.currentTarget.querySelectorAll('input[type="checkbox"]:checked')
        ].map((input) => input.value);
        if (!ids.length) {
          return;
        }
        ids.forEach((assetId) => {
          project.materials.push({
            assetId,
            use: "candidate",
            addedAt: Date.now()
          });
        });
        await saveProject(project);
        openProjectDetail(project.id);
        renderIntoPage();
        showToast(`已加入 ${ids.length} 项素材`);
      });
  }

  function openProjectPickerForAssets() {
    const ids = [...state.selectedAssetIds].filter((id) => assetById(id));
    if (!ids.length) {
      showToast("请先选择素材", true);
      return;
    }
    if (!state.projects.length) {
      state.pendingProjectAssetIds = ids;
      openProjectDialog();
      showToast("先创建一个视频项目");
      return;
    }
    openDialog(`
      ${dialogHeader("加入视频项目", `已选 ${ids.length} 项素材`)}
      <form id="studio-project-picker-form">
        <div class="modal-body studio-dialog-body">
          <label class="studio-field">
            <span>目标项目</span>
            <select class="studio-select" id="studio-target-project">
              ${state.projects
                .map(
                  (project) =>
                    `<option value="${escapeHTML(project.id)}">${escapeHTML(project.title)} · ${PROJECT_STATUS_META[project.status].label}</option>`
                )
                .join("")}
            </select>
          </label>
          <p class="studio-dialog-note">${icon("inbox")}<span>素材会作为“项目候选”加入剪辑篮，不会复制原文件。</span></p>
        </div>
        <footer class="modal-footer">
          <button class="button button--ghost" type="button" data-studio-action="new-project-from-selection">新建项目</button>
          <button class="button button--primary" type="submit">${icon("plus")}<span>加入项目</span></button>
        </footer>
      </form>
    `);
    document
      .getElementById("studio-project-picker-form")
      .addEventListener("submit", async (event) => {
        event.preventDefault();
        const project = projectById(
          document.getElementById("studio-target-project").value
        );
        if (!project) {
          return;
        }
        const linked = new Set(project.materials.map((item) => item.assetId));
        ids.forEach((assetId) => {
          if (!linked.has(assetId)) {
            project.materials.push({
              assetId,
              use: "candidate",
              addedAt: Date.now()
            });
          }
        });
        await saveProject(project);
        state.selectedAssetIds.clear();
        closeDialog();
        renderIntoPage();
        showToast(`已加入「${project.title}」`);
      });
  }

  function openFinalizeDialog(projectId) {
    const project = projectById(projectId);
    if (!project) {
      return;
    }
    const materials = project.materials
      .map((material) => ({ material, asset: assetById(material.assetId) }))
      .filter((item) => item.asset);
    openDialog(`
      ${dialogHeader("成片结算", `校对「${project.title}」`)}
      <form id="studio-finalize-form">
        <div class="modal-body studio-dialog-body">
          <p class="studio-dialog-note">${icon("check")}<span>勾选真正出现在成片里的素材。未勾选的录制原片会在完成后进入清理建议，可复用素材不会自动进入清理。</span></p>
          <div class="studio-finalize-list">
            ${
              materials.length
                ? materials
                    .map(
                      ({ material, asset }) => `
                        <label class="studio-finalize-row" style="--studio-tone:${KIND_META[asset.kind].tone}">
                          <input type="checkbox" value="${escapeHTML(asset.id)}"${material.use === "used" ? " checked" : ""} />
                          <span class="studio-picker-icon">${icon(KIND_META[asset.kind].icon)}</span>
                          <span><strong>${escapeHTML(asset.title)}</strong><small>${KIND_META[asset.kind].label} · ${formatBytes(asset.fileSize)}</small></span>
                        </label>
                      `
                    )
                    .join("")
                : `<div class="studio-dialog-empty">剪辑篮里还没有素材。</div>`
            }
          </div>
        </div>
        <footer class="modal-footer">
          <button class="button button--ghost" type="button" data-studio-action="close-dialog">稍后处理</button>
          <button class="button button--primary" type="submit">${icon("check")}<span>完成并生成清理建议</span></button>
        </footer>
      </form>
    `);
    document
      .getElementById("studio-finalize-form")
      .addEventListener("submit", async (event) => {
        event.preventDefault();
        const used = new Set(
          [...event.currentTarget.querySelectorAll('input[type="checkbox"]:checked')].map(
            (input) => input.value
          )
        );
        project.materials.forEach((material) => {
          material.use = used.has(material.assetId) ? "used" : "unused";
        });
        project.status = "completed";
        project.publishedAt = project.publishedAt || Date.now();
        await saveProject(project);
        closeDialog();
        state.tab = "cleanup";
        renderIntoPage();
        showToast("成片校对完成，已生成清理建议");
      });
  }

  function openEditorLinkDialog(projectId) {
    const project = projectById(projectId);
    if (!project) {
      return;
    }
    state.dialogContext = { kind: "editor", projectId, file: null };
    openDialog(`
      ${dialogHeader("关联剪辑工程", project.title)}
      <form id="studio-editor-form">
        <div class="modal-body studio-dialog-body">
          <label class="studio-field">
            <span>工程类型</span>
            <select class="studio-select" id="studio-editor-kind">
              ${Object.entries(EDITOR_META)
                .map(
                  ([id, meta]) =>
                    `<option value="${id}">${meta.label}</option>`
                )
                .join("")}
            </select>
          </label>
          <div class="studio-path-picker">
            <div>
              <strong id="studio-editor-file-name">还没有选择工程</strong>
              <span id="studio-editor-file-path">可以关联工程文件，或选择剪映草稿文件夹。</span>
            </div>
            <div>
              <button class="button button--ghost" type="button" data-studio-action="choose-editor-file">${icon("file")}<span>选择文件</span></button>
              <button class="button button--ghost" type="button" data-studio-action="choose-editor-folder">${icon("folder")}<span>选择文件夹</span></button>
            </div>
          </div>
        </div>
        <footer class="modal-footer">
          <button class="button button--ghost" type="button" data-studio-action="close-dialog">取消</button>
          <button class="button button--primary" type="submit">${icon("check")}<span>关联工程</span></button>
        </footer>
      </form>
    `);
    document
      .getElementById("studio-editor-form")
      .addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!state.dialogContext?.file) {
          showToast("请先选择工程文件或文件夹", true);
          return;
        }
        project.editorFiles.push({
          id: makeId("editor"),
          kind: document.getElementById("studio-editor-kind").value,
          ...state.dialogContext.file
        });
        await saveProject(project);
        openProjectDetail(project.id);
        renderIntoPage();
        showToast("剪辑工程已关联");
      });
  }

  async function chooseEditorPath(isDirectory) {
    if (!state.dialogContext || state.dialogContext.kind !== "editor") {
      return;
    }
    try {
      const file = isDirectory
        ? await Desktop?.pickDirectory?.()
        : await Desktop?.pickFile?.();
      if (!file) {
        return;
      }
      const normalized = normalizeFileInfo(file);
      if (!normalized) {
        return;
      }
      normalized.isDirectory = Boolean(isDirectory);
      state.dialogContext.file = normalized;
      document.getElementById("studio-editor-file-name").textContent =
        normalized.name;
      document.getElementById("studio-editor-file-path").textContent =
        normalized.path;
      if (!isDirectory) {
        document.getElementById("studio-editor-kind").value =
          inferEditorKind(normalized.name);
      }
    } catch (error) {
      showToast(error.message || "无法读取工程路径", true);
    }
  }

  function openCoverDialog(projectId) {
    const project = projectById(projectId);
    if (!project) {
      return;
    }
    state.dialogContext = {
      kind: "cover",
      projectId,
      source: null,
      exported: null
    };
    openDialog(`
      ${dialogHeader("封面版本", project.title)}
      <form id="studio-cover-form">
        <div class="modal-body studio-dialog-body">
          <label class="studio-field">
            <span>版本名称 <em>*</em></span>
            <input id="studio-cover-title" type="text" maxlength="100" required placeholder="例如：终版 / 竖屏版 / 备用版" />
          </label>
          <div class="studio-cover-file-grid">
            <div class="studio-path-picker">
              <div><strong id="studio-cover-source-name">未选择 PSD 源文件</strong><span id="studio-cover-source-path">可选</span></div>
              <button class="button button--ghost" type="button" data-studio-action="choose-cover-source">${icon("file")}<span>选择源文件</span></button>
            </div>
            <div class="studio-path-picker">
              <div><strong id="studio-cover-export-name">未选择导出图</strong><span id="studio-cover-export-path">可选</span></div>
              <button class="button button--ghost" type="button" data-studio-action="choose-cover-export">${icon("gallery")}<span>选择导出图</span></button>
            </div>
          </div>
          <p class="form-error" id="studio-cover-error" role="alert"></p>
        </div>
        <footer class="modal-footer">
          <button class="button button--ghost" type="button" data-studio-action="close-dialog">取消</button>
          <button class="button button--primary" type="submit">${icon("plus")}<span>保存封面版本</span></button>
        </footer>
      </form>
    `);
    document
      .getElementById("studio-cover-form")
      .addEventListener("submit", async (event) => {
        event.preventDefault();
        const title = document.getElementById("studio-cover-title").value.trim();
        if (!title) {
          return;
        }
        const context = state.dialogContext;
        if (!context?.source && !context?.exported) {
          document.getElementById("studio-cover-error").textContent =
            "请至少选择一个源文件或导出图。";
          return;
        }
        let managedSource = context.source;
        let managedExported = context.exported;
        try {
          if (window.ResourceLibrary?.isConfigured?.()) {
            if (managedSource) {
              managedSource = await window.ResourceLibrary.importFile(
                managedSource,
                window.ResourceLibrary.coverFolder("source")
              );
            }
            if (managedExported) {
              managedExported = await window.ResourceLibrary.importFile(
                managedExported,
                window.ResourceLibrary.coverFolder("exported")
              );
            }
          }
        } catch (fileError) {
          document.getElementById("studio-cover-error").textContent =
            fileError.message || "封面文件无法加入素材库。";
          return;
        }
        project.covers.push({
          id: makeId("cover"),
          projectId,
          title,
          source: normalizeFileInfo(managedSource),
          exported: normalizeFileInfo(managedExported),
          selected: project.covers.length === 0,
          createdAt: Date.now()
        });
        await saveProject(project);
        openProjectDetail(project.id);
        renderIntoPage();
        showToast("封面版本已添加");
      });
  }

  async function chooseCoverPath(kind) {
    if (!state.dialogContext || state.dialogContext.kind !== "cover") {
      return;
    }
    try {
      const file = await Desktop?.pickFile?.();
      if (!file) {
        return;
      }
      const normalized = normalizeFileInfo(file);
      if (!normalized) {
        return;
      }
      state.dialogContext[kind] = normalized;
      const prefix = kind === "source" ? "studio-cover-source" : "studio-cover-export";
      document.getElementById(`${prefix}-name`).textContent = normalized.name;
      document.getElementById(`${prefix}-path`).textContent = normalized.path;
    } catch (error) {
      showToast(error.message || "无法读取封面文件", true);
    }
  }

  async function chooseFinalVideo(projectId) {
    const project = projectById(projectId);
    if (!project) {
      return;
    }
    try {
      const file = await Desktop?.pickFile?.();
      if (!file) {
        return;
      }
      const managedFile = window.ResourceLibrary?.isConfigured?.()
        ? await window.ResourceLibrary.importFile(
            file,
            window.ResourceLibrary.finalVideoFolder()
          )
        : file;
      project.finalVideo = normalizeFileInfo(managedFile);
      await saveProject(project);
      openProjectDetail(project.id);
      renderIntoPage();
      showToast("最终成片已关联");
    } catch (error) {
      showToast(error.message || "无法设置成片", true);
    }
  }

  async function openPath(targetPath) {
    if (!targetPath) {
      return;
    }
    try {
      const result = await Desktop?.openPath?.(targetPath);
      if (!result?.ok) {
        throw new Error(result?.error || "文件可能已被移动或删除");
      }
    } catch (error) {
      showToast(error.message || "无法打开文件", true);
    }
  }

  async function revealPath(targetPath) {
    if (!targetPath) {
      return;
    }
    try {
      await Desktop?.revealPath?.(targetPath);
    } catch (error) {
      showToast(error.message || "无法定位文件", true);
    }
  }

  async function copyPath(targetPath) {
    if (!targetPath) {
      return;
    }
    try {
      await navigator.clipboard.writeText(targetPath);
      showToast("文件路径已复制");
    } catch {
      showToast("复制失败，请手动选择路径", true);
    }
  }

  async function toggleFavorite(assetId) {
    const asset = assetById(assetId);
    if (!asset) {
      return;
    }
    const updated = {
      ...asset,
      favorite: !asset.favorite,
      updatedAt: Date.now()
    };
    try {
      await saveAsset(updated);
      renderIntoPage();
      showToast(updated.favorite ? "已标记精选" : "已取消精选");
    } catch (error) {
      showToast(error.message || "无法保存精选状态", true);
    }
  }

  async function setAssetStatus(assetId, status) {
    const asset = assetById(assetId);
    if (!asset || !ASSET_STATUS_META[status]) {
      return;
    }
    try {
      await saveAsset({
        ...asset,
        status,
        updatedAt: Date.now()
      });
      renderIntoPage();
      showToast(status === "waste" ? "已标记为废片" : "已恢复为待筛选");
    } catch (error) {
      showToast(error.message || "无法更新素材状态", true);
    }
  }

  async function bulkSetStatus(status) {
    const ids = [...state.selectedAssetIds].filter((id) => assetById(id));
    if (!ids.length) {
      return;
    }
    try {
      const updated = ids.map((id) => ({
        ...assetById(id),
        status,
        updatedAt: Date.now()
      }));
      await saveAssets(updated);
      state.selectedAssetIds.clear();
      renderIntoPage();
      showToast(
        status === "waste" ? "已标记为废片" : "已标记为可用素材"
      );
    } catch (error) {
      showToast(error.message || "批量操作失败", true);
    }
  }

  async function bulkSetKind(kind) {
    if (!KIND_META[kind] || kind === "cover") {
      showToast("请选择要切换的素材类型", true);
      return;
    }
    const ids = [...state.selectedAssetIds].filter((id) => assetById(id));
    if (!ids.length) {
      return;
    }
    try {
      const updated = ids.map((id) => ({
        ...assetById(id),
        kind,
        updatedAt: Date.now()
      }));
      await saveAssets(updated);
      state.selectedAssetIds.clear();
      renderIntoPage();
      showToast(`已将 ${updated.length} 项素材切换为${KIND_META[kind].label}`);
    } catch (error) {
      showToast(error.message || "批量切换类型失败", true);
    }
  }

  async function keepAsset(assetId) {
    const asset = assetById(assetId);
    if (!asset) {
      return;
    }
    await saveAsset({
      ...asset,
      status: "archived",
      updatedAt: Date.now()
    });
    renderIntoPage();
    showToast("已保留，不再出现在清理建议中");
  }

  function projectUsageText(ids) {
    const projectNames = [
      ...new Set(
        ids.flatMap((assetId) =>
          projectsForAsset(assetId).map(({ project }) => project.title)
        )
      )
    ];
    return projectNames.length
      ? `\n关联项目：${projectNames.slice(0, 4).join("、")}${projectNames.length > 4 ? ` 等 ${projectNames.length} 个` : ""}`
      : "";
  }

  async function removeAssetsFromApp(ids) {
    const validIds = ids.filter((id) => assetById(id));
    if (!validIds.length) {
      return;
    }
    await Store.deleteMediaAssets(validIds);
    const removing = new Set(validIds);
    validIds.forEach(revokeBrowserAssetUrl);
    state.assets = state.assets.filter((asset) => !removing.has(asset.id));
    const affectedProjects = state.projects.filter((project) =>
      project.materials.some((material) => removing.has(material.assetId))
    );
    for (const project of affectedProjects) {
      project.materials = project.materials.filter(
        (material) => !removing.has(material.assetId)
      );
      await saveProject(project);
    }
    validIds.forEach((id) => state.selectedAssetIds.delete(id));
    syncNavigationCount();
    closeDialog();
    renderIntoPage();
  }

  async function removeAssetFromApp(assetId) {
    const asset = assetById(assetId);
    if (!asset) {
      return;
    }
    const browserStored = Boolean(embeddedFile(asset));
    const confirmed = window.confirm(
      `${browserStored ? "删除浏览器中的素材副本" : "仅从拾集移除"}「${asset.title}」？\n\n${
        browserStored
          ? "这份上传数据会从当前浏览器中删除，电脑上的原始文件不会被改动。"
          : "电脑上的源文件会保留。"
      }${projectUsageText([assetId])}`
    );
    if (!confirmed) {
      return;
    }
    try {
      await removeAssetsFromApp([assetId]);
      showToast(
        browserStored
          ? "浏览器中的素材副本已删除"
          : "素材已从拾集移除，本地文件未删除"
      );
    } catch (error) {
      showToast(error.message || "无法移除素材记录", true);
    }
  }

  async function deleteAssetSources(ids, reason = "手动删除") {
    const assets = ids.map(assetById).filter(Boolean);
    if (!assets.length) {
      return;
    }
    if (!Desktop?.trashFile) {
      showToast("删除源文件仅在电脑版中可用", true);
      return;
    }
    const targets = [];
    const targetsByPath = new Map();
    for (const asset of assets) {
      for (const filePath of [asset.localPath, asset.sourcePath].filter(Boolean)) {
        const key = filePath.toLocaleLowerCase("zh-CN");
        if (targetsByPath.has(key)) {
          targetsByPath.get(key).assetIds.push(asset.id);
          continue;
        }
        try {
          const info = await Desktop.getFileInfo(filePath);
          const target = {
            path: info.path,
            size: info.size,
            assetIds: [asset.id]
          };
          targetsByPath.set(key, target);
          targets.push(target);
        } catch {
          // A stale original path is skipped; the current library file may still exist.
        }
      }
    }
    if (!targets.length) {
      showToast("找不到可删除的本地文件", true);
      return;
    }
    const totalSize = targets.reduce((sum, item) => sum + item.size, 0);
    const confirmed = window.confirm(
      `删除 ${targets.length} 个电脑文件？\n\n原因：${reason}\n大小：${formatBytes(totalSize)}${projectUsageText(ids)}\n\n如果素材是复制入库的，素材库副本和入库前原文件都会移入 Windows 回收站。仍可从系统回收站恢复。`
    );
    if (!confirmed) {
      return;
    }
    const deletedIds = new Set();
    const failures = [];
    for (const target of targets) {
      try {
        await Desktop.trashFile(target.path);
        target.assetIds.forEach((assetId) => deletedIds.add(assetId));
      } catch (error) {
        failures.push({ target, error });
      }
    }
    if (deletedIds.size) {
      await removeAssetsFromApp([...deletedIds]);
    }
    if (failures.length) {
      showToast(
        `${targets.length - failures.length} 个文件已删除，${failures.length} 个失败：${failures[0].error.message || "文件可能已被移动"}`,
        true
      );
    } else {
      showToast(
        `${targets.length} 个电脑文件已移入 Windows 回收站`
      );
    }
  }

  async function trashAsset(assetId) {
    const asset = assetById(assetId);
    if (!asset) {
      return;
    }
    const reason = cleanupReason(asset) || "手动清理";
    try {
      await deleteAssetSources([assetId], reason);
    } catch (error) {
      showToast(error.message || "无法删除源文件", true);
    }
  }

  async function bulkRemoveSelected({ deleteSource = false } = {}) {
    const ids = [...state.selectedAssetIds].filter((id) => assetById(id));
    if (!ids.length) {
      return;
    }
    if (deleteSource) {
      await deleteAssetSources(ids, "批量删除素材");
      return;
    }
    const totalSize = ids.reduce(
      (sum, id) => sum + (assetById(id)?.fileSize || 0),
      0
    );
    const embeddedCount = ids.filter(
      (id) => assetById(id) && embeddedFile(assetById(id))
    ).length;
    const confirmed = window.confirm(
      `删除选中的 ${ids.length} 项素材？\n\n${
        embeddedCount === ids.length
          ? "浏览器上传副本会同时从本地数据库删除。"
          : embeddedCount
            ? `${embeddedCount} 项浏览器上传副本会删除，其余电脑源文件会保留。`
            : "电脑上的源文件会保留。"
      }\n素材大小：${formatBytes(totalSize)}${projectUsageText(ids)}`
    );
    if (!confirmed) {
      return;
    }
    try {
      await removeAssetsFromApp(ids);
      showToast("选中素材已从拾集移除，本地文件未删除");
    } catch (error) {
      showToast(error.message || "批量移除失败", true);
    }
  }

  async function updateMaterialUse(projectId, assetId, use) {
    const project = projectById(projectId);
    const material = project?.materials.find((item) => item.assetId === assetId);
    if (!project || !material) {
      return;
    }
    material.use = use;
    await saveProject(project);
    openProjectDetail(project.id);
    renderIntoPage();
  }

  async function removeMaterial(projectId, assetId) {
    const project = projectById(projectId);
    if (!project) {
      return;
    }
    project.materials = project.materials.filter(
      (material) => material.assetId !== assetId
    );
    await saveProject(project);
    openProjectDetail(project.id);
    renderIntoPage();
  }

  async function selectCover(projectId, coverId) {
    const project = projectById(projectId);
    if (!project) {
      return;
    }
    const browsing = state.dialogContext?.kind === "cover-browser";
    project.covers.forEach((cover) => {
      cover.selected = cover.id === coverId;
    });
    await saveProject(project);
    if (browsing) {
      state.dialogContext.coverId = coverId;
      renderCoverBrowser();
    } else if (document.getElementById("studio-dialog")?.open) {
      openProjectDetail(project.id);
    }
    renderIntoPage();
    showToast("封面使用版本已更新");
  }

  async function removeEditorFile(projectId, editorId) {
    const project = projectById(projectId);
    if (!project) {
      return;
    }
    project.editorFiles = project.editorFiles.filter(
      (file) => file.id !== editorId
    );
    await saveProject(project);
    openProjectDetail(project.id);
    renderIntoPage();
  }

  async function deleteProject(projectId) {
    const project = projectById(projectId);
    if (!project) {
      return;
    }
    if (
      !window.confirm(
        `确定删除项目「${project.title}」吗？只会删除拾集中的项目档案，不会删除素材、工程或成片文件。`
      )
    ) {
      return;
    }
    await Store.deleteVideoProject(projectId);
    state.projects = state.projects.filter((item) => item.id !== projectId);
    closeDialog();
    renderIntoPage();
    showToast("视频项目已删除");
  }

  async function reload() {
    state.loaded = false;
    await load({ force: true });
  }

  function changeTab(tab) {
    if (!TAB_META[tab]) {
      return;
    }
    state.tab = tab;
    state.kind = "all";
    state.status = "all";
    state.selectedAssetIds.clear();
    renderIntoPage({ preserveScroll: false });
  }

  function selectVisible() {
    const assets = currentAssetView();
    const allSelected =
      assets.length > 0 && assets.every((asset) => state.selectedAssetIds.has(asset.id));
    assets.forEach((asset) => {
      if (allSelected) {
        state.selectedAssetIds.delete(asset.id);
      } else {
        state.selectedAssetIds.add(asset.id);
      }
    });
    renderIntoPage();
  }

  async function handleStudioAction(actionElement) {
    const action = actionElement.dataset.studioAction;
    const assetId = actionElement.dataset.assetId;
    const projectId = actionElement.dataset.projectId;
    if (action === "tab") {
      changeTab(actionElement.dataset.studioTab);
      return;
    }
    if (action.startsWith("tab-")) {
      changeTab(action.slice(4));
      return;
    }
    if (action === "reload") {
      void reload();
      return;
    }
    if (action === "dismiss-guide") {
      localStorage.setItem(ASSET_GUIDE_KEY, "1");
      renderIntoPage();
      return;
    }
    if (action === "import-files") {
      void pickFilesAndImport();
      return;
    }
    if (action === "configure-auto-sync") {
      void configureAutoSyncFolder();
      return;
    }
    if (action === "clear-auto-sync") {
      clearAutoSyncFolder();
      return;
    }
    if (action === "new-project") {
      state.pendingProjectAssetIds = [];
      openProjectDialog();
      return;
    }
    if (action === "new-project-from-selection") {
      state.pendingProjectAssetIds = [...state.selectedAssetIds];
      closeDialog();
      openProjectDialog();
      return;
    }
    if (action === "open-asset") {
      openAssetDetail(assetId);
      return;
    }
    if (action === "play-asset") {
      openAssetDetail(assetId, { autoplay: true });
      return;
    }
    if (action === "open-starter-asset") {
      openStarterAssetDetail(actionElement.dataset.starterId, {
        focusRename: actionElement.dataset.focusRename === "true",
        focusSettings: actionElement.dataset.focusSettings === "true"
      });
      return;
    }
    if (action === "rename-asset") {
      const asset = assetById(assetId);
      if (
        asset &&
        Desktop &&
        asset.localPath &&
        (isVideoFile(asset.fileName) || isAudioFile(asset.fileName))
      ) {
        openMediaPlayer(asset.localPath, asset.title, {
          assetId: asset.id,
          focusRename: true
        });
      } else {
        openAssetDetail(assetId, { focusRename: true });
      }
      return;
    }
    if (action === "toggle-select") {
      if (state.selectedAssetIds.has(assetId)) {
        state.selectedAssetIds.delete(assetId);
      } else {
        state.selectedAssetIds.add(assetId);
      }
      renderIntoPage();
      return;
    }
    if (action === "select-visible") {
      selectVisible();
      return;
    }
    if (action === "clear-selection") {
      state.selectedAssetIds.clear();
      renderIntoPage();
      return;
    }
    if (action === "favorite-asset") {
      await toggleFavorite(assetId);
      return;
    }
    if (action === "set-asset-status") {
      await setAssetStatus(assetId, actionElement.dataset.status);
      return;
    }
    if (action === "bulk-usable") {
      await bulkSetStatus("usable");
      return;
    }
    if (action === "bulk-waste") {
      await bulkSetStatus("waste");
      return;
    }
    if (action === "bulk-set-kind") {
      await bulkSetKind(
        document.getElementById("studio-bulk-kind")?.value || ""
      );
      return;
    }
    if (action === "bulk-remove") {
      await bulkRemoveSelected();
      return;
    }
    if (action === "bulk-delete-source") {
      await bulkRemoveSelected({ deleteSource: true });
      return;
    }
    if (action === "kind-filter") {
      state.kind = actionElement.dataset.studioKind || "all";
      renderIntoPage();
      return;
    }
    if (action === "status-filter") {
      state.status = actionElement.dataset.studioStatus || "all";
      renderIntoPage();
      return;
    }
    if (action === "add-selected-project") {
      openProjectPickerForAssets();
      return;
    }
    if (action === "add-asset-to-project") {
      state.selectedAssetIds = new Set([assetId]);
      openProjectPickerForAssets();
      return;
    }
    if (action === "open-project") {
      openProjectDetail(projectId);
      return;
    }
    if (action === "edit-project") {
      openProjectDialog(projectById(projectId));
      return;
    }
    if (action === "add-project-materials") {
      void openAssetPickerForProject(projectId);
      return;
    }
    if (action === "finalize-project") {
      openFinalizeDialog(projectId);
      return;
    }
    if (action === "material-use") {
      await updateMaterialUse(projectId, assetId, actionElement.dataset.use);
      return;
    }
    if (action === "remove-material") {
      await removeMaterial(projectId, assetId);
      return;
    }
    if (action === "link-editor") {
      openEditorLinkDialog(projectId);
      return;
    }
    if (action === "choose-editor-file") {
      await chooseEditorPath(false);
      return;
    }
    if (action === "choose-editor-folder") {
      await chooseEditorPath(true);
      return;
    }
    if (action === "choose-final-video") {
      await chooseFinalVideo(projectId);
      return;
    }
    if (action === "add-cover") {
      openCoverDialog(projectId);
      return;
    }
    if (action === "choose-cover-source") {
      await chooseCoverPath("source");
      return;
    }
    if (action === "choose-cover-export") {
      await chooseCoverPath("exported");
      return;
    }
    if (action === "select-cover") {
      await selectCover(projectId, actionElement.dataset.coverId);
      return;
    }
    if (action === "remove-editor-file") {
      await removeEditorFile(projectId, actionElement.dataset.editorId);
      return;
    }
    if (action === "delete-project") {
      await deleteProject(projectId);
      return;
    }
    if (action === "keep-asset") {
      await keepAsset(assetId);
      return;
    }
    if (action === "trash-asset") {
      await trashAsset(assetId);
      return;
    }
    if (action === "remove-asset") {
      await removeAssetFromApp(assetId);
      return;
    }
    if (action === "play-media") {
      openMediaPlayer(
        actionElement.dataset.path,
        actionElement.dataset.title || "素材预览",
        {
          assetId: actionElement.dataset.assetId || "",
          projectId: actionElement.dataset.projectId || ""
        }
      );
      return;
    }
    if (action === "capture-current-frame") {
      await captureCurrentPlayerFrame();
      return;
    }
    if (action === "open-cover-browser") {
      openCoverBrowser(projectId, actionElement.dataset.coverId);
      return;
    }
    if (action === "cover-browser-step") {
      stepCoverBrowser(actionElement.dataset.direction);
      return;
    }
    if (action === "open-path" || action === "open-cover-file") {
      await openPath(actionElement.dataset.path);
      return;
    }
    if (action === "reveal-path") {
      await revealPath(actionElement.dataset.path);
      return;
    }
    if (action === "copy-path") {
      await copyPath(actionElement.dataset.path);
      return;
    }
    if (action === "close-dialog") {
      closeDialog();
    }
  }

  function handleClick(event) {
    const actionElement = event.target.closest?.("[data-studio-action]");
    if (!actionElement) {
      return;
    }
    if (!actionElement.closest("[data-studio-page], #studio-dialog")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    void handleStudioAction(actionElement);
  }

  function handleInput(event) {
    if (event.target.id !== "search-input" || !isStudioActive()) {
      return;
    }
    state.query = event.target.value;
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => {
      renderIntoPage();
    }, 90);
  }

  function handleKeydown(event) {
    if (
      event.key === "Escape" &&
      !document.querySelector("dialog[open]") &&
      isStudioActive() &&
      (event.ctrlKey || event.metaKey)
    ) {
      state.selectedAssetIds.clear();
      renderIntoPage();
    }

    if (
      state.dialogContext?.kind === "cover-browser" &&
      document.getElementById("studio-dialog")?.open &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      event.preventDefault();
      stepCoverBrowser(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }

    if (
      !isStudioActive() ||
      document.querySelector("dialog[open]") ||
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      event.target.isContentEditable
    ) {
      return;
    }

    const starterCard = event.target.closest?.(".studio-starter-card");
    if (starterCard && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      starterCard.click();
      return;
    }

    const coverCard = event.target.closest?.(
      '.studio-cover-card[data-studio-action="open-cover-browser"]'
    );
    if (coverCard && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      coverCard.click();
      return;
    }

    const card = event.target.closest?.('[data-studio-action="open-asset"]');
    if (!card) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      card.click();
      return;
    }
    if (event.key.toLocaleLowerCase("en-US") === "j" || event.key.toLocaleLowerCase("en-US") === "k") {
      event.preventDefault();
      const cards = [...document.querySelectorAll(".studio-asset-card")];
      const index = cards.indexOf(card);
      const direction = event.key.toLocaleLowerCase("en-US") === "j" ? 1 : -1;
      cards[Math.max(0, Math.min(cards.length - 1, index + direction))]?.focus();
    }
  }

  async function getBackup() {
    if (!state.loaded) {
      await load();
    }
    const mediaAssets = [];
    for (const asset of state.assets) {
      const exported = { ...asset };
      if (asset.fileBlob instanceof Blob) {
        exported.fileData = await blobToDataUrl(asset.fileBlob);
      }
      delete exported.fileBlob;
      mediaAssets.push(exported);
    }
    return {
      version: 1,
      mediaAssets,
      videoProjects: state.projects
    };
  }

  async function restoreBackup(studioBackup) {
    if (!studioBackup || typeof studioBackup !== "object") {
      return;
    }
    const assets = [];
    for (const raw of Array.isArray(studioBackup.mediaAssets)
      ? studioBackup.mediaAssets
      : []) {
      let fileBlob = raw?.fileBlob instanceof Blob ? raw.fileBlob : null;
      if (
        !fileBlob &&
        typeof raw?.fileData === "string" &&
        raw.fileData.startsWith("data:")
      ) {
        try {
          fileBlob = await fetch(raw.fileData).then((response) =>
            response.blob()
          );
        } catch {
          fileBlob = null;
        }
      }
      const asset = normalizeAsset({ ...raw, fileBlob });
      if (asset) {
        assets.push(asset);
      }
    }
    const projects = (Array.isArray(studioBackup.videoProjects)
      ? studioBackup.videoProjects
      : []
    )
      .map(normalizeProject)
      .filter(Boolean);
    await Store.replaceStudioData(assets, projects);
    state.browserMediaUrls.forEach((objectUrl) =>
      URL.revokeObjectURL(objectUrl)
    );
    state.browserMediaUrls.clear();
    state.assets = assets;
    state.projects = projects;
    state.loaded = true;
    state.selectedAssetIds.clear();
    syncNavigationCount();
    renderIntoPage();
  }

  function updateSearch(query) {
    state.query = String(query || "");
    renderIntoPage();
  }

  document.addEventListener("click", handleClick, true);
  document.addEventListener("input", handleInput, true);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("shiji:library-configured", () => {
    renderIntoPage();
    syncNavigationCount();
  });
  window.addEventListener("focus", () => {
    if (state.syncFolder) {
      void syncWatchedFolder({ notify: false });
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.syncFolder) {
      void syncWatchedFolder({ notify: false });
    }
  });

  window.ShijiStudio = Object.freeze({
    render,
    load,
    reload,
    updateSearch,
    openAssetDialog: pickFilesAndImport,
    openProjectDialog: () => openProjectDialog(),
    syncAutoFolder: async (folderPath) => {
      if (!Desktop?.scanMediaFolder || !folderPath) {
        return 0;
      }
      state.syncFolder = String(folderPath);
      localStorage.setItem(AUTO_SYNC_FOLDER_KEY, state.syncFolder);
      restartAutoSync({ scanNow: false });
      const imported = await syncWatchedFolder({ notify: false });
      renderIntoPage();
      return imported.length;
    },
    clearAutoSync: () => clearAutoSyncFolder(),
    getBackup,
    restoreBackup,
    syncNavigationCount
  });
})();
