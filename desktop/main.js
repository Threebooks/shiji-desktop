"use strict";

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  dialog,
  ipcMain,
  nativeImage,
  protocol,
  shell
} = require("electron");
const fs = require("node:fs/promises");
const { createReadStream } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");

const APP_SCHEME = "shiji";
const MEDIA_SCHEME = "shiji-media";
const APP_ORIGIN = `${APP_SCHEME}://app`;
const WWW_ROOT = path.join(__dirname, "www");
const SMOKE_TEST = process.argv.includes("--smoke-test");
const APP_BUILD_ID = "card-details-1.2.14";

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  },
  {
    scheme: MEDIA_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

app.setName("拾集");
app.setAppUserModelId("com.yinl.shiji.desktop");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav"
};

const MEDIA_MIME_TYPES = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-ms-wmv",
  ".flv": "video/x-flv",
  ".mts": "video/mp2t",
  ".m2ts": "video/mp2t",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".aiff": "audio/aiff",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".tif": "image/tiff",
  ".tiff": "image/tiff"
};

const STUDIO_EXTENSIONS = new Set([
  ".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".wmv", ".flv",
  ".mts", ".m2ts",
  ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff",
  ".psd", ".psb",
  ".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".aiff",
  ".prproj", ".aep", ".aepx", ".drp", ".veg", ".blend", ".json"
]);

const STUDIO_FILE_FILTERS = [
  {
    name: "Minecraft 创作素材",
    extensions: [
      "mp4", "mov", "mkv", "avi", "webm", "m4v", "wmv", "flv", "mts",
      "m2ts", "png", "jpg", "jpeg", "webp", "bmp", "gif", "psd", "psb",
      "mp3", "wav", "flac", "m4a", "aac", "ogg", "aiff", "prproj", "aep",
      "aepx", "drp", "veg", "blend", "json"
    ]
  },
  { name: "所有文件", extensions: ["*"] }
];

let mainWindow = null;
let tray = null;
let closeBehavior = "exit";
let isQuitting = false;

if (SMOKE_TEST) {
  app.setPath(
    "userData",
    path.join(os.tmpdir(), `shiji-smoke-userdata-${process.pid}`)
  );
}

function appPreferencesPath() {
  return path.join(app.getPath("userData"), "preferences.json");
}

async function loadAppPreferences() {
  try {
    const preferences = JSON.parse(await fs.readFile(appPreferencesPath(), "utf8"));
    closeBehavior =
      preferences.closeBehavior === "tray" ||
      preferences.closeBehavior === "minimize"
        ? "tray"
        : "exit";
  } catch {
    closeBehavior = "exit";
  }
}

async function saveAppPreferences() {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(
    appPreferencesPath(),
    JSON.stringify({ closeBehavior }, null, 2),
    "utf8"
  );
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function ensureTray() {
  if (tray) {
    return tray;
  }
  const trayIcon = nativeImage
    .createFromPath(path.join(__dirname, "icon.png"))
    .resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip("拾集 · 本地文件索引");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "打开拾集",
        click: showMainWindow
      },
      { type: "separator" },
      {
        label: "退出拾集",
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ])
  );
  tray.on("click", showMainWindow);
  tray.on("double-click", showMainWindow);
  return tray;
}

async function getLocalFileInfo(filePath) {
  if (typeof filePath !== "string" || !path.isAbsolute(filePath)) {
    throw new Error("文件路径无效。");
  }
  const resolvedPath = path.resolve(filePath);
  const stats = await fs.stat(resolvedPath);
  if (!stats.isFile()) {
    throw new Error("所选路径不是文件。");
  }
  return {
    path: resolvedPath,
    name: path.basename(resolvedPath),
    size: stats.size,
    lastModified: stats.mtimeMs
  };
}

async function getLocalPathInfo(targetPath) {
  if (typeof targetPath !== "string" || !path.isAbsolute(targetPath)) {
    throw new Error("路径无效。");
  }
  const resolvedPath = path.resolve(targetPath);
  const stats = await fs.stat(resolvedPath);
  return {
    path: resolvedPath,
    name: path.basename(resolvedPath),
    size: stats.isFile() ? stats.size : 0,
    lastModified: stats.mtimeMs,
    isDirectory: stats.isDirectory()
  };
}

function sanitizeFolderSegment(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 80) || "其他";
}

function resolveLibraryFolder(rootPath, folderSegments) {
  if (typeof rootPath !== "string" || !path.isAbsolute(rootPath)) {
    throw new Error("素材库位置无效。");
  }
  const root = path.resolve(rootPath);
  const segments = Array.isArray(folderSegments)
    ? folderSegments.map(sanitizeFolderSegment).filter(Boolean).slice(0, 6)
    : [];
  const folder = path.resolve(root, ...segments);
  const rootPrefix = `${root}${path.sep}`;
  if (folder !== root && !folder.startsWith(rootPrefix)) {
    throw new Error("素材分类路径超出了素材库范围。");
  }
  return { root, folder };
}

async function uniqueDestinationPath(directory, fileName) {
  const extension = path.extname(fileName);
  const base = path.basename(fileName, extension);
  let candidate = path.join(directory, fileName);
  let index = 1;
  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(directory, `${base} (${index})${extension}`);
      index += 1;
    } catch (error) {
      if (error?.code === "ENOENT") {
        return candidate;
      }
      throw error;
    }
  }
}

async function initializeAssetLibrary(rootPath, cachePath) {
  if (typeof rootPath !== "string" || !path.isAbsolute(rootPath)) {
    throw new Error("请选择有效的素材库位置。");
  }
  if (path.parse(rootPath).root === path.resolve(rootPath)) {
    throw new Error("不能把整个磁盘根目录设为素材库位置。");
  }
  const root = path.resolve(rootPath);
  const cache =
    typeof cachePath === "string" && path.isAbsolute(cachePath)
      ? path.resolve(cachePath)
      : path.join(app.getPath("userData"), "Cache");
  if (cache === root || cache.startsWith(`${root}${path.sep}`)) {
    throw new Error("缓存位置不能放在素材库内部，请选择另一个文件夹。");
  }
  await fs.mkdir(root, { recursive: true });
  await fs.mkdir(cache, { recursive: true });
  return {
    root,
    cache,
    rootInfo: await getLocalPathInfo(root),
    cacheInfo: await getLocalPathInfo(cache)
  };
}

async function importFileToAssetLibrary(options) {
  const sourcePath = String(options?.filePath || "");
  const source = await getLocalFileInfo(sourcePath);
  const rootPath = String(options?.rootPath || "");
  const mode = options?.mode === "move" ? "move" : "copy";
  const { root, folder } = resolveLibraryFolder(
    rootPath,
    options?.folderSegments
  );
  const sourceResolved = path.resolve(source.path);
  const rootPrefix = `${root}${path.sep}`;
  if (sourceResolved.startsWith(rootPrefix)) {
    return {
      ...source,
      managed: true,
      copied: false,
      moved: false
    };
  }

  await fs.mkdir(folder, { recursive: true });
  const destination = await uniqueDestinationPath(folder, source.name);
  await fs.copyFile(source.path, destination);
  try {
    await fs.utimes(destination, new Date(), new Date(source.lastModified));
  } catch {
    // Timestamp preservation is best effort.
  }
  let moved = false;
  if (mode === "move") {
    try {
      await fs.unlink(source.path);
      moved = true;
    } catch {
      // Keep the sorted copy if the original cannot be removed safely.
    }
  }
  return {
    ...(await getLocalFileInfo(destination)),
    managed: true,
    copied: true,
    moved,
    sourcePath: source.path
  };
}

async function renameLibraryFiles(options) {
  const baseName = String(options?.baseName || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 120);
  if (
    !baseName ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(baseName)
  ) {
    throw new Error("文件名无效，请换一个名称。");
  }
  const inputPaths = Array.isArray(options?.paths) ? options.paths : [];
  const uniquePaths = [
    ...new Set(
      inputPaths
        .filter((item) => typeof item === "string" && path.isAbsolute(item))
        .map((item) => path.resolve(item))
    )
  ];
  if (!uniquePaths.length) {
    throw new Error("没有可重命名的文件。");
  }

  const operations = [];
  for (const sourcePath of uniquePaths) {
    let source;
    try {
      source = await getLocalFileInfo(sourcePath);
    } catch {
      continue;
    }
    const extension = path.extname(source.name);
    const targetPath = path.join(path.dirname(source.path), `${baseName}${extension}`);
    if (targetPath === source.path) {
      operations.push({ source, targetPath, unchanged: true });
      continue;
    }
    try {
      await fs.access(targetPath);
      throw new Error(`文件名「${path.basename(targetPath)}」已经存在。`);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
    operations.push({ source, targetPath, unchanged: false });
  }
  if (!operations.length) {
    throw new Error("找不到要重命名的源文件。");
  }

  const completed = [];
  try {
    for (const operation of operations) {
      if (operation.unchanged) {
        continue;
      }
      await fs.rename(operation.source.path, operation.targetPath);
      completed.push(operation);
    }
  } catch (error) {
    for (const operation of completed.reverse()) {
      try {
        await fs.rename(operation.targetPath, operation.source.path);
      } catch {
        // Preserve the original rename error if rollback also fails.
      }
    }
    throw error;
  }

  return Promise.all(
    operations.map(async (operation) => ({
      oldPath: operation.source.path,
      ...(await getLocalFileInfo(operation.targetPath)),
      renamed: !operation.unchanged
    }))
  );
}

async function scanStudioFolder(folderPath, limit = 1000) {
  const root = path.resolve(folderPath);
  const files = [];
  const queue = [{ directory: root, depth: 0 }];

  while (queue.length && files.length < limit) {
    const { directory, depth } = queue.shift();
    let entries = [];
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (files.length >= limit) {
        break;
      }
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory() && depth < 8 && !entry.name.startsWith(".")) {
        queue.push({ directory: entryPath, depth: depth + 1 });
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const extension = path.extname(entry.name).toLowerCase();
      if (!STUDIO_EXTENSIONS.has(extension)) {
        continue;
      }
      try {
        const info = await getLocalFileInfo(entryPath);
        files.push(info);
      } catch {
        // A file may disappear while a large folder is being scanned.
      }
    }
  }

  return files.sort(
    (a, b) =>
      Number(b.lastModified || 0) - Number(a.lastModified || 0) ||
      a.name.localeCompare(b.name, "zh-CN")
  );
}

async function readImageThumbnail(filePath) {
  const info = await getLocalFileInfo(filePath);
  if (
    !/\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(info.name) ||
    info.size > 30 * 1024 * 1024
  ) {
    return "";
  }
  const image = nativeImage.createFromPath(info.path);
  if (image.isEmpty()) {
    return "";
  }
  return image.resize({ width: 420, quality: "good" }).toDataURL();
}

async function inspectLocalArchive(filePath) {
  const info = await getLocalFileInfo(filePath);
  if (!/\.(zip|jar|mcpack|mcworld|mctemplate|mrpack|modpack)$/i.test(info.name)) {
    return [];
  }

  const handle = await fs.open(info.path, "r");
  try {
    const tailLength = Math.min(info.size, 65557);
    const tail = Buffer.alloc(tailLength);
    await handle.read(tail, 0, tailLength, info.size - tailLength);

    let endOffset = -1;
    for (let offset = tail.length - 22; offset >= 0; offset -= 1) {
      if (tail.readUInt32LE(offset) === 0x06054b50) {
        endOffset = offset;
        break;
      }
    }
    if (endOffset < 0) {
      return [];
    }

    const centralOffset = tail.readUInt32LE(endOffset + 16);
    const entryCount = tail.readUInt16LE(endOffset + 10);
    if (centralOffset === 0xffffffff || centralOffset >= info.size) {
      return [];
    }

    const centralLength = Math.min(info.size - centralOffset, 8 * 1024 * 1024);
    const central = Buffer.alloc(centralLength);
    await handle.read(central, 0, centralLength, centralOffset);

    const entries = [];
    let offset = 0;
    for (let index = 0; index < entryCount && offset + 46 <= central.length; index += 1) {
      if (central.readUInt32LE(offset) !== 0x02014b50) {
        break;
      }
      const nameLength = central.readUInt16LE(offset + 28);
      const extraLength = central.readUInt16LE(offset + 30);
      const commentLength = central.readUInt16LE(offset + 32);
      const nameStart = offset + 46;
      const nameEnd = nameStart + nameLength;
      if (nameEnd > central.length) {
        break;
      }
      entries.push(
        central
          .subarray(nameStart, nameEnd)
          .toString("utf8")
          .replaceAll("\\", "/")
          .toLowerCase()
      );
      offset = nameEnd + extraLength + commentLength;
    }
    return entries;
  } finally {
    await handle.close();
  }
}

async function fetchSiteIcon(website) {
  let pageUrl;
  try {
    pageUrl = new URL(website);
    if (!/^https?:$/.test(pageUrl.protocol)) {
      return "";
    }
  } catch {
    return "";
  }

  const candidates = [];
  try {
    const response = await fetch(pageUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
      headers: {
        "User-Agent": "Mozilla/5.0 Shiji/1.1.0"
      }
    });
    if (response.ok) {
      const html = await response.text();
      for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
        const tag = match[0];
        if (!/\brel\s*=\s*["'][^"']*(?:icon|apple-touch-icon)/i.test(tag)) {
          continue;
        }
        const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
        if (href) {
          try {
            candidates.push(new URL(href, pageUrl).toString());
          } catch {
            // Ignore malformed icon links.
          }
        }
      }
    }
  } catch {
    // The site may block HTML requests; its conventional favicon is still worth trying.
  }

  candidates.push(`${pageUrl.origin}/favicon.ico`);
  for (const candidate of [...new Set(candidates)]) {
    try {
      const response = await fetch(candidate, {
        redirect: "follow",
        signal: AbortSignal.timeout(7000),
        headers: {
          "User-Agent": "Mozilla/5.0 Shiji/1.1.0"
        }
      });
      if (!response.ok) {
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
        continue;
      }
      const contentType =
        response.headers.get("content-type")?.split(";")[0] || "image/png";
      if (!contentType.startsWith("image/")) {
        continue;
      }
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    } catch {
      // Continue through conventional icon paths.
    }
  }
  return "";
}

function registerFileHandlers() {
  ipcMain.handle("app:get-startup", () => ({
    supported: true,
    enabled: app.getLoginItemSettings().openAtLogin
  }));

  ipcMain.handle("app:set-startup", (_event, enabled) => {
    if (SMOKE_TEST) {
      return { supported: true, enabled: Boolean(enabled) };
    }
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      path: process.execPath
    });
    return {
      supported: true,
      enabled: app.getLoginItemSettings().openAtLogin
    };
  });

  ipcMain.handle("app:get-close-behavior", () => ({
    supported: true,
    behavior: closeBehavior
  }));

  ipcMain.handle("app:set-close-behavior", async (_event, behavior) => {
    closeBehavior = behavior === "tray" ? "tray" : "exit";
    if (closeBehavior === "tray") {
      ensureTray();
    }
    await saveAppPreferences();
    return { supported: true, behavior: closeBehavior };
  });

  ipcMain.handle("app:quit", () => {
    isQuitting = true;
    app.quit();
    return { ok: true };
  });

  ipcMain.handle("ui:set-zoom", (event, value) => {
    const zoomFactor = Math.min(1.35, Math.max(0.85, Number(value) || 1));
    const contents = event.sender;
    contents.setZoomFactor(zoomFactor);
    return { zoomFactor };
  });

  ipcMain.handle("files:pick", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "选择要建立索引的文件",
      properties: ["openFile"]
    });
    if (result.canceled || !result.filePaths[0]) {
      return null;
    }
    return getLocalFileInfo(result.filePaths[0]);
  });

  ipcMain.handle("files:pick-many", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "选择要加入拾集素材库的文件",
      filters: STUDIO_FILE_FILTERS,
      properties: ["openFile", "multiSelections"]
    });
    if (result.canceled || !result.filePaths.length) {
      return [];
    }
    return Promise.all(result.filePaths.map((filePath) => getLocalFileInfo(filePath)));
  });

  ipcMain.handle("files:pick-media-folder", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "选择要扫描的素材文件夹",
      properties: ["openDirectory"]
    });
    if (result.canceled || !result.filePaths[0]) {
      return { canceled: true, files: [] };
    }
    return {
      canceled: false,
      folder: await getLocalPathInfo(result.filePaths[0]),
      files: await scanStudioFolder(result.filePaths[0])
    };
  });

  ipcMain.handle("files:scan-media-folder", async (_event, folderPath) => {
    const folder = await getLocalPathInfo(folderPath);
    if (!folder.isDirectory) {
      throw new Error("自动同步路径不是文件夹。");
    }
    return {
      folder,
      files: await scanStudioFolder(folder.path)
    };
  });

  ipcMain.handle("paths:pick-directory", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "选择文件夹",
      properties: ["openDirectory"]
    });
    if (result.canceled || !result.filePaths[0]) {
      return null;
    }
    return getLocalPathInfo(result.filePaths[0]);
  });

  ipcMain.handle("library:get-default-cache", () => ({
    path: path.join(app.getPath("userData"), "Cache")
  }));

  ipcMain.handle("library:initialize", (_event, options) =>
    initializeAssetLibrary(options?.rootPath, options?.cachePath)
  );

  ipcMain.handle("library:import-file", (_event, options) =>
    importFileToAssetLibrary(options)
  );

  ipcMain.handle("library:rename-files", (_event, options) =>
    renameLibraryFiles(options)
  );

  ipcMain.handle("files:info", (_event, filePath) => getLocalFileInfo(filePath));

  ipcMain.handle("files:image-thumbnail", (_event, filePath) =>
    readImageThumbnail(filePath)
  );

  ipcMain.handle("files:inspect-archive", (_event, filePath) =>
    inspectLocalArchive(filePath)
  );

  ipcMain.handle("files:open", async (_event, filePath) => {
    const info = await getLocalFileInfo(filePath);
    const error = await shell.openPath(info.path);
    return { ok: !error, error };
  });

  ipcMain.handle("files:reveal", async (_event, filePath) => {
    const info = await getLocalFileInfo(filePath);
    shell.showItemInFolder(info.path);
    return { ok: true };
  });

  ipcMain.handle("files:open-path", async (_event, targetPath) => {
    const info = await getLocalPathInfo(targetPath);
    const error = await shell.openPath(info.path);
    return { ok: !error, error };
  });

  ipcMain.handle("files:reveal-path", async (_event, targetPath) => {
    const info = await getLocalPathInfo(targetPath);
    if (info.isDirectory) {
      await shell.openPath(info.path);
    } else {
      shell.showItemInFolder(info.path);
    }
    return { ok: true };
  });

  ipcMain.handle("files:trash", async (_event, filePath) => {
    const info = await getLocalFileInfo(filePath);
    await shell.trashItem(info.path);
    return { ok: true };
  });

  ipcMain.handle("site:icon", (_event, website) => fetchSiteIcon(website));
}

function registerAppProtocol() {
  protocol.handle(APP_SCHEME, async (request) => {
    try {
      const requestUrl = new URL(request.url);
      const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
      const candidate = path.resolve(WWW_ROOT, relativePath || "index.html");
      const rootPrefix = `${path.resolve(WWW_ROOT)}${path.sep}`;
      const isEntryDocument = !relativePath || relativePath === "index.html";
      const isVersionedAsset =
        requestUrl.searchParams.get("v") === APP_BUILD_ID &&
        /\.(?:css|js)$/i.test(candidate);

      if (!candidate.startsWith(rootPrefix) && candidate !== path.join(WWW_ROOT, "index.html")) {
        return new Response("Forbidden", { status: 403 });
      }

      const contentType =
        MIME_TYPES[path.extname(candidate).toLowerCase()] || "application/octet-stream";
      const stats = await fs.stat(candidate);
      const range = request.headers.get("range");
      const headers = {
        "Content-Type": contentType,
        "Content-Length": String(stats.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": isEntryDocument
          ? "no-cache"
          : isVersionedAsset
            ? "public, max-age=31536000, immutable"
            : "public, max-age=86400",
        "X-Content-Type-Options": "nosniff"
      };

      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
        if (!match) {
          return new Response("Invalid range", {
            status: 416,
            headers: { "Content-Range": `bytes */${stats.size}` }
          });
        }
        let start = match[1] ? Number(match[1]) : 0;
        let end = match[2] ? Number(match[2]) : stats.size - 1;
        if (!match[1] && match[2]) {
          start = Math.max(0, stats.size - Number(match[2]));
          end = stats.size - 1;
        }
        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          start < 0 ||
          start >= stats.size ||
          end < start
        ) {
          return new Response("Range not satisfiable", {
            status: 416,
            headers: { "Content-Range": `bytes */${stats.size}` }
          });
        }
        end = Math.min(end, stats.size - 1);
        headers["Content-Length"] = String(end - start + 1);
        headers["Content-Range"] = `bytes ${start}-${end}/${stats.size}`;
        return new Response(
          request.method === "HEAD"
            ? null
            : Readable.toWeb(createReadStream(candidate, { start, end })),
          { status: 206, headers }
        );
      }

      return new Response(
        request.method === "HEAD"
          ? null
          : Readable.toWeb(createReadStream(candidate)),
        { status: 200, headers }
      );
    } catch (error) {
      const status = error?.code === "ENOENT" ? 404 : 500;
      return new Response(status === 404 ? "Not found" : "Internal error", { status });
    }
  });
}

function registerMediaProtocol() {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    try {
      const requestUrl = new URL(request.url);
      if (requestUrl.hostname !== "local") {
        return new Response("Forbidden", { status: 403 });
      }
      const targetPath = requestUrl.searchParams.get("path") || "";
      if (!path.isAbsolute(targetPath)) {
        return new Response("Invalid media path", { status: 400 });
      }
      const resolvedPath = path.resolve(targetPath);
      const extension = path.extname(resolvedPath).toLowerCase();
      const contentType = MEDIA_MIME_TYPES[extension];
      if (!contentType) {
        return new Response("Unsupported media type", { status: 415 });
      }
      const stats = await fs.stat(resolvedPath);
      if (!stats.isFile()) {
        return new Response("Not found", { status: 404 });
      }

      let start = 0;
      let end = Math.max(0, stats.size - 1);
      let status = 200;
      const range = request.headers.get("range");
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
        if (!match) {
          return new Response("Invalid range", {
            status: 416,
            headers: { "Content-Range": `bytes */${stats.size}` }
          });
        }
        if (match[1]) {
          start = Number(match[1]);
          end = match[2] ? Number(match[2]) : stats.size - 1;
        } else if (match[2]) {
          const suffixLength = Number(match[2]);
          start = Math.max(0, stats.size - suffixLength);
        }
        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          start < 0 ||
          start >= stats.size ||
          end < start
        ) {
          return new Response("Range not satisfiable", {
            status: 416,
            headers: { "Content-Range": `bytes */${stats.size}` }
          });
        }
        end = Math.min(end, stats.size - 1);
        status = 206;
      }

      const headers = {
        "Content-Type": contentType,
        "Content-Length": String(end - start + 1),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*"
      };
      if (status === 206) {
        headers["Content-Range"] = `bytes ${start}-${end}/${stats.size}`;
      }
      if (request.method === "HEAD") {
        return new Response(null, { status, headers });
      }
      return new Response(
        Readable.toWeb(createReadStream(resolvedPath, { start, end })),
        { status, headers }
      );
    } catch (error) {
      const status = error?.code === "ENOENT" ? 404 : 500;
      return new Response(status === 404 ? "Not found" : "Media error", {
        status
      });
    }
  });
}

function openExternalUrl(url) {
  try {
    const parsed = new URL(url);
    if (["https:", "http:", "mailto:"].includes(parsed.protocol)) {
      void shell.openExternal(parsed.toString());
    }
  } catch {
    // Ignore malformed or unsupported links.
  }
}

async function runSmokeTest(window) {
  const outputPath = path.join(app.getPath("temp"), "shiji-desktop-smoke.txt");
  const screenshotPath = path.join(app.getPath("temp"), "shiji-desktop-smoke.png");
  const progressPath = path.join(app.getPath("temp"), "shiji-desktop-smoke-progress.txt");
  const smokeLibraryRoot = path.join(
    app.getPath("temp"),
    `shiji-library-smoke-${process.pid}-${Date.now()}`
  );
  const smokeLibraryCache = `${smokeLibraryRoot}-cache`;
  const mark = async (label) => {
    await fs.appendFile(progressPath, `${label}\n`, "utf8");
  };

  try {
    await fs.writeFile(progressPath, "start\n", "utf8");
    await new Promise((resolve) => setTimeout(resolve, 900));
    window.showInactive();
    window.setSize(1832, 1018);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const result = await window.webContents.executeJavaScript(`
      (async () => {
        const wait = (milliseconds) =>
          new Promise((resolve) => setTimeout(resolve, milliseconds));
        const initial = {
          title: document.querySelector(".page-heading h1")?.textContent || "",
          cards: document.querySelectorAll("[data-resource-card]").length,
          sidebar: Boolean(document.querySelector("#app-sidebar")),
          loading: Boolean(document.querySelector(".loading-state")),
          layout: (() => {
            const content = document.querySelector("#content")?.getBoundingClientRect();
            const inner = document.querySelector(".content-inner")?.getBoundingClientRect();
            const grid = document.querySelector(".resource-grid")?.getBoundingClientRect();
            return {
              contentWidth: Math.round(content?.width || 0),
              innerWidth: Math.round(inner?.width || 0),
              leftGap: Math.round((inner?.left || 0) - (content?.left || 0)),
              rightGap: Math.round((content?.right || 0) - (inner?.right || 0)),
              trailingGap: Math.round((inner?.right || 0) - (grid?.right || 0))
            };
          })()
        };
        if (document.querySelector("#welcome-dialog")?.open) {
          document.querySelector('[data-action="dismiss-welcome"]')?.click();
        }
        for (let attempt = 0; attempt < 16; attempt += 1) {
          if (
            document.querySelector("#library-setup-dialog")?.open ||
            window.ResourceLibrary?.isConfigured?.()
          ) {
            break;
          }
          await wait(100);
        }
        const librarySetup = {
          shown: Boolean(document.querySelector("#library-setup-dialog")?.open),
          alreadyConfigured: Boolean(window.ResourceLibrary?.isConfigured?.()),
          hasRootPicker: Boolean(
            document.querySelector('[data-library-action="choose-root"]')
          ),
          hasCachePicker: Boolean(
            document.querySelector('[data-library-action="choose-cache"]')
          ),
          hasModeChoices:
            document.querySelectorAll("[data-library-mode]").length === 2
        };
        document
          .querySelector('#library-setup-dialog [data-library-action="later"]')
          ?.click();
        await wait(80);
        const previousCloseBehavior =
          (await window.ShijiDesktop?.getCloseBehavior?.())?.behavior || "exit";
        const traySetting =
          await window.ShijiDesktop?.setCloseBehavior?.("tray");
        const restoredCloseBehavior =
          await window.ShijiDesktop?.setCloseBehavior?.(previousCloseBehavior);
        const heading = document.querySelector(".page-heading");
        const input = document.querySelector("#search-input");
        if (heading) {
          heading.dataset.smokeMarker = "preserved";
        }
        if (input) {
          input.value = "Figma";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        await new Promise((resolve) => setTimeout(resolve, 180));
        const search = {
          cards: document.querySelectorAll("[data-resource-card]").length,
          resultCount: document.querySelector("[data-result-count]")?.textContent || "",
          localUpdate:
            document.querySelector(".page-heading")?.dataset.smokeMarker === "preserved"
        };
        if (input) {
          input.value = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        await wait(180);

        document.querySelector('[data-action="add-resource"]')?.click();
        await wait(60);
        const zoneSelect = document.querySelector("#resource-zone");
        zoneSelect
          ?.closest(".custom-select")
          ?.querySelector(".custom-select-trigger")
          ?.click();
        await wait(40);
        const zoneControl = zoneSelect?.closest(".custom-select");
        const customSelectMenu = document.querySelector(
          '.custom-select-menu[data-custom-select-for="' +
            (zoneControl?.dataset.customSelectId || "") +
            '"]'
        );
        const customSelectOpened =
          Boolean(customSelectMenu) &&
          !customSelectMenu.hidden &&
          getComputedStyle(customSelectMenu).position === "absolute";
        customSelectMenu
          ?.querySelector('[data-custom-select-value="minecraft"]')
          ?.click();
        await wait(30);
        const customSelectValue = zoneSelect?.value || "";
        document.querySelector('[data-tag-preset="建筑"]')?.click();
        const mapTagValue =
          document.querySelector("#resource-tags")?.value || "";
        const minecraftTypeSelect = document.querySelector("#minecraft-type");
        minecraftTypeSelect.value = "shader";
        minecraftTypeSelect.dispatchEvent(
          new Event("change", { bubbles: true })
        );
        await wait(30);
        const shaderPresetVisible = Boolean(
          document.querySelector('[data-tag-preset="高配"]')
        );
        document.querySelector(".date-picker-trigger")?.click();
        await wait(40);
        const datePickerOpened =
          !document.querySelector("#resource-date-panel")?.hidden;
        document.querySelector('[data-action="date-picker-today"]')?.click();
        await wait(30);
        const datePickerValue =
          document.querySelector("#resource-date")?.value || "";
        document.querySelector('[data-close-dialog="resource-dialog"]')?.click();
        await wait(30);

        document.querySelector('[data-layout="table"]')?.click();
        await wait(60);
        const tableTypography = {
          header:
            parseFloat(
              getComputedStyle(document.querySelector(".resource-table-head")).fontSize
            ) || 0,
          title:
            parseFloat(
              getComputedStyle(document.querySelector(".table-title-cell strong")).fontSize
            ) || 0,
          secondary:
            parseFloat(
              getComputedStyle(document.querySelector(".table-title-cell span")).fontSize
            ) || 0
        };

        document.querySelector('[data-view="settings"]')?.click();
        await wait(60);
        document.querySelector('[data-settings-section="shortcuts"]')?.click();
        await wait(60);
        const shortcutCount =
          document.querySelectorAll("[data-shortcut-action]").length;
        document.querySelector('[data-shortcut-action="search"]')?.click();
        document
          .querySelector('[data-shortcut-action="search"]')
          ?.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "L",
              code: "KeyL",
              ctrlKey: true,
              shiftKey: true,
              bubbles: true
            })
          );
        await wait(60);
        const recordedShortcut =
          document.querySelector('[data-shortcut-action="search"] [data-shortcut-value]')
            ?.textContent || "";
        document.querySelector('[data-action="reset-shortcuts"]')?.click();
        await wait(60);
        const resetShortcut =
          document.querySelector('[data-shortcut-action="search"] [data-shortcut-value]')
            ?.textContent || "";

        document.querySelector('[data-settings-section="personalization"]')?.click();
        await wait(60);
        document.querySelector('[data-font-scale-choice="large"]')?.click();
        await wait(120);
        const fontScaleSetting =
          document.documentElement.dataset.fontScale || "";
        const fontScaleStored = localStorage.getItem("shiji.fontScale") || "";
        document.querySelector('[data-theme-choice="dark"]')?.click();
        await wait(60);
        const darkTheme = document.documentElement.dataset.theme || "";
        document.querySelector('[data-theme-choice="system"]')?.click();
        await wait(60);
        const systemTheme =
          document.documentElement.dataset.themePreference || "";
        document.querySelector('[data-palette-choice="ocean"]')?.click();
        await wait(80);
        const oceanPalette =
          document.documentElement.dataset.palette || "";
        const oceanAccent =
          getComputedStyle(document.documentElement)
            .getPropertyValue("--accent")
            .trim();
        document.querySelector('[data-palette-choice="forest"]')?.click();
        document.querySelector('[data-font-scale-choice="standard"]')?.click();
        document.querySelector('[data-theme-choice="light"]')?.click();
        await wait(120);

        document.querySelector('[data-settings-section="general"]')?.click();
        await wait(60);
        document.querySelector('[data-action="toggle-startup-dropdown"]')?.click();
        await wait(30);
        const dropdownOpened =
          !document.querySelector(".settings-dropdown-menu")?.hidden;
        document.querySelector('[data-startup-view-value="favorites"]')?.click();
        await wait(30);
        const startupLabel =
          document.querySelector("[data-startup-view-label]")?.textContent || "";
        document.querySelector('[data-action="toggle-startup-dropdown"]')?.click();
        document.querySelector('[data-startup-view-value="all"]')?.click();

        document.querySelector('[data-view="about"]')?.click();
        await wait(60);
        document.querySelector('[data-action="open-release-notes"]')?.click();
        await wait(30);
        document.querySelector('[data-action="open-image-preview"]')?.click();
        await wait(30);
        const preview = {
          open: Boolean(document.querySelector("#image-preview-dialog")?.open),
          hasImage: Boolean(
            document.querySelector("#image-preview-image")?.getAttribute("src")
          )
        };
        document.querySelector('[data-close-dialog="image-preview-dialog"]')?.click();
        document.querySelector('[data-close-dialog="release-notes-dialog"]')?.click();

        document.querySelector('[data-view="settings"]')?.click();
        await wait(60);
        document.querySelector('[data-settings-section="shortcuts"]')?.click();
        await wait(60);
        if (document.querySelector("#welcome-dialog")?.open) {
          document.querySelector('[data-action="dismiss-welcome"]')?.click();
          await wait(40);
        }

        return {
          ...initial,
          search,
          shortcuts: {
            count: shortcutCount,
            recorded: recordedShortcut,
            reset: resetShortcut
          },
          dropdown: {
            opened: dropdownOpened,
            selected: startupLabel
          },
          preview,
          closeBehavior: {
            original: previousCloseBehavior,
            set: traySetting?.behavior || "",
            restored: restoredCloseBehavior?.behavior || ""
          },
          customSelect: {
            opened: customSelectOpened,
            value: customSelectValue
          },
          tagPresets: {
            mapTagValue,
            shaderPresetVisible
          },
          datePicker: {
            opened: datePickerOpened,
            hasValue: Boolean(datePickerValue)
          },
          personalization: {
            fontScale: fontScaleSetting,
            fontScaleStored,
            darkTheme,
            systemTheme,
            oceanPalette,
            oceanAccent
          },
          tableTypography,
          librarySetup
        };
      })()
    `);
    await fs.writeFile(
      outputPath,
      JSON.stringify(
        {
          ok:
            !result.loading &&
            result.sidebar &&
            result.layout.contentWidth > 1500 &&
            result.layout.leftGap <= 40 &&
            result.layout.rightGap <= 40 &&
            result.layout.trailingGap <= 2 &&
            (
              result.librarySetup.alreadyConfigured ||
              (
                result.librarySetup.shown &&
                result.librarySetup.hasRootPicker &&
                result.librarySetup.hasCachePicker &&
                result.librarySetup.hasModeChoices
              )
            ) &&
            result.closeBehavior.set === "tray" &&
            result.closeBehavior.restored === result.closeBehavior.original &&
            result.customSelect.opened &&
            result.customSelect.value === "minecraft" &&
            result.tagPresets.mapTagValue.includes("建筑") &&
            result.tagPresets.shaderPresetVisible &&
            result.datePicker.opened &&
            result.datePicker.hasValue &&
            result.personalization.fontScale === "large" &&
            result.personalization.fontScaleStored === "large" &&
            result.personalization.darkTheme === "dark" &&
            result.personalization.systemTheme === "system" &&
            result.personalization.oceanPalette === "ocean" &&
            result.personalization.oceanAccent === "#477087" &&
            result.tableTypography.header === 10 &&
            result.tableTypography.title === 13 &&
            result.tableTypography.secondary >= 10 &&
            result.search.cards === 1 &&
            result.search.localUpdate &&
            result.shortcuts.count === 5 &&
            result.shortcuts.recorded === "Ctrl + Shift + L" &&
            result.shortcuts.reset === "Ctrl + K" &&
            result.dropdown.opened &&
            result.dropdown.selected === "我的收藏" &&
            result.preview.open &&
            result.preview.hasImage,
          ...result
        },
        null,
        2
      ),
      "utf8"
    );
    const image = await window.webContents.capturePage();
    await fs.writeFile(screenshotPath, image.toPNG());
    await mark("base");
    await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector('[data-settings-section="general"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
        document.querySelector('[data-action="toggle-startup-dropdown"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 180));
      })()
    `);
    const dropdownImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-dropdown-smoke.png"),
      dropdownImage.toPNG()
    );
    await mark("dropdown");
    await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector('[data-action="toggle-startup-dropdown"]')?.click();
        document.querySelector('[data-view="about"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
        document.querySelector('[data-action="open-release-notes"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 30));
        document.querySelector('[data-action="open-image-preview"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 180));
      })()
    `);
    const previewImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-preview-smoke.png"),
      previewImage.toPNG()
    );
    await mark("preview");
    await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector('[data-close-dialog="image-preview-dialog"]')?.click();
        document.querySelector('[data-close-dialog="release-notes-dialog"]')?.click();
        document.querySelector('[data-action="open-author-profile"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 180));
      })()
    `);
    const authorImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-author-smoke.png"),
      authorImage.toPNG()
    );
    await mark("author");
    await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector('[data-action="author-open-release-notes"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 180));
      })()
    `);
    const releaseTimelineImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-release-timeline-smoke.png"),
      releaseTimelineImage.toPNG()
    );
    await mark("release");
    await window.webContents.executeJavaScript(`
      document.querySelector('[data-action="back-to-author"]')?.click()
    `);
    const authorLevelResult = await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector('[data-action="author-open-release-notes"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
        const releaseBackVisible =
          !document.querySelector("#release-notes-back")?.hidden;
        const timelineEntries =
          document.querySelectorAll(".release-timeline-entry").length;
        const timelineFigures =
          document.querySelectorAll(".release-timeline-figure").length;
        const timelineNaming =
          document.querySelector(".release-timeline-intro code")?.textContent || "";
        const releaseBackLeftOfClose =
          document
            .querySelector("#release-notes-back")
            ?.getBoundingClientRect().left <
          document
            .querySelector('#release-notes-dialog [data-close-dialog="release-notes-dialog"]')
            ?.getBoundingClientRect().left;
        document.querySelector('[data-action="back-to-author"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
        return {
        level: document.querySelector("#author-level")?.textContent || "",
        percent: Number(
          document.querySelector("#author-xp-track")?.getAttribute("aria-valuenow")
        ),
        percentText:
          document.querySelector("#author-level-percent")?.textContent || "",
        hasCaption: Boolean(document.querySelector("#author-level-caption")),
        hasBirthday: Boolean(document.querySelector(".author-birthday")),
        background:
          getComputedStyle(
            document.querySelector(".author-level-widget")
          ).backgroundImage,
        borderWidth:
          getComputedStyle(
            document.querySelector(".author-level-widget")
          ).borderTopWidth,
        versionText:
          document.querySelector(".author-current-version")?.textContent.trim() || "",
        labelFont: parseFloat(
          getComputedStyle(
            document.querySelector(".author-contact-item > span")
          ).fontSize
        ),
        valueFont: parseFloat(
          getComputedStyle(
            document.querySelector(".author-contact-item > strong")
          ).fontSize
        ),
        releaseBackVisible,
        timelineEntries,
        timelineFigures,
        timelineNaming,
        releaseBackLeftOfClose,
        returnedToAuthor: Boolean(
          document.querySelector("#author-dialog")?.open
        )
        };
      })()
    `);
    await mark("author-level");
    await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector('[data-close-dialog="author-dialog"]')?.click();
        document.querySelector('[data-view="all"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
        document.querySelector('[data-layout="table"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 180));
      })()
    `);
    const tableImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-table-smoke.png"),
      tableImage.toPNG()
    );
    await mark("table");
    await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector('[data-action="add-resource"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
        document
          .querySelector("#resource-zone")
          ?.closest(".custom-select")
          ?.querySelector(".custom-select-trigger")
          ?.click();
        await new Promise((resolve) => setTimeout(resolve, 180));
      })()
    `);
    const customSelectImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-custom-select-smoke.png"),
      customSelectImage.toPNG()
    );
    await mark("custom-select");
    await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector(".custom-select-trigger")?.click();
        document.querySelector(".date-picker-trigger")?.click();
        await new Promise((resolve) => setTimeout(resolve, 180));
      })()
    `);
    const datePickerImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-date-picker-smoke.png"),
      datePickerImage.toPNG()
    );
    await mark("date-picker");
    await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector('[data-close-dialog="resource-dialog"]')?.click();
        document.querySelector('[data-view="settings"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
        document.querySelector('[data-settings-section="general"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 180));
      })()
    `);
    const closeBehaviorImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-close-settings-smoke.png"),
      closeBehaviorImage.toPNG()
    );
    await mark("close-settings");
    await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector('[data-settings-section="personalization"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 180));
      })()
    `);
    const personalizationImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-personalization-smoke.png"),
      personalizationImage.toPNG()
    );
    await mark("personalization");
    await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector('[data-view="minecraft"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
        document.querySelector('[data-action="manage-minecraft-categories"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
        const colorSelect = document.querySelector("#managed-category-color");
        colorSelect
          ?.closest(".custom-select")
          ?.querySelector(".custom-select-trigger")
          ?.click();
        await new Promise((resolve) => setTimeout(resolve, 180));
      })()
    `);
    const colorMenuResult = await window.webContents.executeJavaScript(`
      (() => {
        const colorSelect = document.querySelector("#managed-category-color");
        const control = colorSelect?.closest(".custom-select");
        const menu = document.querySelector(
          '.custom-select-menu[data-custom-select-for="' +
            (control?.dataset.customSelectId || "") +
            '"]'
        );
        const rect = menu?.getBoundingClientRect();
        return {
          visible:
            Boolean(menu) &&
            !menu.hidden &&
            Boolean(rect?.width) &&
            Boolean(rect?.height) &&
            rect.top >= 0 &&
            rect.bottom <= window.innerHeight,
          swatches: menu?.querySelectorAll(".custom-select-swatch").length || 0,
          topbarAddHidden:
            document.querySelector(".topbar-add")?.hidden === true
        };
      })()
    `);
    const colorMenuImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-color-menu-smoke.png"),
      colorMenuImage.toPNG()
    );
    await mark("color-menu");
    await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector('[data-close-dialog="category-options-dialog"]')?.click();
        document.querySelector('[data-view="accounts"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
        document.querySelector('[data-action="add-account"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 180));
      })()
    `);
    const accountIconLayout = await window.webContents.executeJavaScript(`
      (() => {
        const button = document.querySelector('[data-action="clear-account-icon"]');
        const status = document.querySelector("#account-icon-feedback");
        const buttonRect = button?.getBoundingClientRect();
        const statusRect = status?.getBoundingClientRect();
        return {
          stacked:
            Boolean(buttonRect) &&
            Boolean(statusRect) &&
            statusRect.top >= buttonRect.bottom - 1
        };
      })()
    `);
    const accountImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-account-icon-smoke.png"),
      accountImage.toPNG()
    );
    await mark("account");
    await window.webContents.executeJavaScript(`
      document.querySelector('[data-close-dialog="account-dialog"]')?.click()
    `);
    await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector('[data-view="all"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
        document.querySelector('[data-action="create-library"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
        document.querySelector('[data-library-template="article"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 180));
      })()
    `);
    const libraryEditorResult = await window.webContents.executeJavaScript(`
      (() => ({
        name: document.querySelector("#library-name")?.value || "",
        fileAllowed:
          document
            .querySelector('[data-library-type="file"]')
            ?.getAttribute("aria-pressed") === "true",
        layout:
          document
            .querySelector("#library-default-layout")
            ?.closest(".custom-select")
            ?.querySelector("[data-custom-select-label]")?.textContent || ""
      }))()
    `);
    const libraryEditorImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-library-editor-smoke.png"),
      libraryEditorImage.toPNG()
    );
    await mark("library-editor");
    const libraryTest = await window.webContents.executeJavaScript(`
      (async () => {
        const wait = (milliseconds) =>
          new Promise((resolve) => setTimeout(resolve, milliseconds));
        document.querySelector("#library-form")?.requestSubmit();
        await wait(300);
        const libraryButton = document.querySelector(
          ".nav-item[data-library-id]"
        );
        libraryButton?.click();
        await wait(120);
        const typeFilters = [
          ...document.querySelectorAll("[data-type-filter]")
        ].map((button) => button.dataset.typeFilter);
        document.querySelector('[data-action="add-resource"]')?.click();
        await wait(80);
        const zoneValue =
          document.querySelector("#resource-zone")?.value || "";
        const fileTypeHidden =
          document.querySelector('[data-resource-type="file"]')?.hidden === true;
        document.querySelector('[data-resource-type="note"]')?.click();
        document.querySelector("#resource-title").value = "测试文章";
        document.querySelector("#resource-description").value =
          "这是一篇用于验证文章专区的示例内容。";
        document.querySelector("#resource-form")?.requestSubmit();
        await wait(450);
        const customCards =
          document.querySelectorAll("[data-resource-card]").length;
        const listLayout = Boolean(
          document.querySelector(".resource-grid--list")
        );
        document.querySelector('[data-view="all"]')?.click();
        await wait(120);
        const allCards =
          document.querySelectorAll("[data-resource-card]").length;
        document.querySelector(".nav-item[data-library-id]")?.click();
        await wait(120);
        return {
          title: document.querySelector(".page-heading h1")?.textContent || "",
          typeFilters,
          listLayout,
          zoneValue,
          fileTypeHidden,
          customCards,
          allCards
        };
      })()
    `);
    const customLibraryImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-custom-library-smoke.png"),
      customLibraryImage.toPNG()
    );
    await mark("custom-library");
    const detailAndFilters = await window.webContents.executeJavaScript(`
      (async () => {
        const wait = (milliseconds) =>
          new Promise((resolve) => setTimeout(resolve, milliseconds));
        document.querySelector('[data-view="all"]')?.click();
        await wait(120);
        const zoneFilters = [
          ...document.querySelectorAll("[data-zone-filter]")
        ].map((button) => button.textContent.trim());
        const minecraftFilter = [
          ...document.querySelectorAll("[data-zone-filter]")
        ].find((button) => button.dataset.zoneFilter === "minecraft");
        minecraftFilter?.click();
        await wait(120);
        const minecraftCards =
          document.querySelectorAll("[data-resource-card]").length;
        document.querySelector('[data-zone-filter="all"]')?.click();
        await wait(80);
        const sidebarFont = parseFloat(
          getComputedStyle(
            document.querySelector("#library-nav-items .nav-item")
          ).fontSize
        );
        document.querySelector("[data-resource-card]")?.click();
        await wait(180);
        const detail = document.querySelector("#detail-dialog");
        const rect = detail?.getBoundingClientRect();
        const detailResult = {
          mode: document.documentElement.dataset.detailMode || "",
          open: Boolean(detail?.open),
          centered:
            Boolean(rect) &&
            Math.abs(rect.left - (window.innerWidth - rect.width) / 2) < 30,
          closeAtRight:
            Boolean(rect) &&
            (document.querySelector(".detail-close")?.getBoundingClientRect().left ||
              0) >
              rect.left + rect.width * 0.75
        };
        document.querySelector(
          '#detail-content [data-action="edit-resource"]'
        )?.click();
        await wait(120);
        const resourceEditorBackVisible =
          !document.querySelector("#resource-editor-back")?.hidden;
        const resourceEditorOpen =
          Boolean(document.querySelector("#resource-dialog")?.open);
        const resourceEditorBackLeftOfClose =
          document
            .querySelector("#resource-editor-back")
            ?.getBoundingClientRect().left <
          document
            .querySelector('#resource-dialog [data-close-dialog="resource-dialog"]')
            ?.getBoundingClientRect().left;
        document.querySelector('[data-action="back-to-detail"]')?.click();
        await wait(120);
        const returnedToDetail =
          Boolean(document.querySelector("#detail-dialog")?.open);
        document.querySelector('[data-close-dialog="detail-dialog"]')?.click();
        return {
          detail: detailResult,
          zoneFilters,
          minecraftCards,
          sidebarFont,
          resourceEditorBackVisible,
          resourceEditorOpen,
          resourceEditorBackLeftOfClose,
          returnedToDetail
        };
      })()
    `);
    await window.webContents.executeJavaScript(`
      (async () => {
        document.querySelector("[data-resource-card]")?.click();
        await new Promise((resolve) => setTimeout(resolve, 180));
      })()
    `);
    const detailImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-window-detail-smoke.png"),
      detailImage.toPNG()
    );
    await mark("detail");
    await window.webContents.executeJavaScript(`
      document.querySelector('[data-close-dialog="detail-dialog"]')?.click()
    `);
    const fileFilterResult = await window.webContents.executeJavaScript(`
      (async () => {
        const wait = (milliseconds) =>
          new Promise((resolve) => setTimeout(resolve, milliseconds));
        document.querySelector('[data-view="all"]')?.click();
        await wait(100);
        document.querySelector('[data-layout="grid"]')?.click();
        await wait(80);
        document.querySelector('[data-action="add-resource"]')?.click();
        await wait(80);
        document.querySelector('[data-resource-type="file"]')?.click();
        const input = document.querySelector("#resource-file");
        const file = new File(["shiji-index-test"], "文件索引测试.txt", {
          type: "text/plain"
        });
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        await wait(250);
        document.querySelector("#resource-title").value = "文件索引测试";
        document.querySelector("#resource-form")?.requestSubmit();
        await wait(500);
        document.querySelector('[data-type-filter="file"]')?.click();
        await wait(120);
        return {
          title: document.querySelector(".page-heading h1")?.textContent || "",
          cards: document.querySelectorAll("[data-resource-card]").length,
          hasDuplicateFileNav: Boolean(document.querySelector('[data-view="files"]')),
          hasPathPreview: Boolean(document.querySelector(".resource-file-path"))
        };
      })()
    `);
    const fileIndexImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-file-index-smoke.png"),
      fileIndexImage.toPNG()
    );
    await mark("file-index");
    const smokeMediaPath = path.join(WWW_ROOT, "assets", "author-avatar.jpg");
    const smokeVideoPath = path.join(
      WWW_ROOT,
      "assets",
      "demo",
      "recording-preview.mp4"
    );
    const smokeAutoSyncFolder = path.join(
      WWW_ROOT,
      "assets",
      "demo"
    );
    const studioResult = await window.webContents.executeJavaScript(`
      (async () => {
        const wait = (milliseconds) =>
          new Promise((resolve) => setTimeout(resolve, milliseconds));
        document.getElementById("welcome-dialog")?.close();
        document.querySelector('[data-view="studio"]')?.click();
        await wait(550);
        const pageReady = Boolean(document.querySelector("[data-studio-page]"));
        const heading = document.querySelector(".studio-hero h1")?.textContent || "";
        const hasUploadButton = Boolean(
          document.querySelector('[data-studio-action="import-files"]')
        );
        const hasLegacyTabs = Boolean(document.querySelector(".studio-tabs"));
        const guideCards = document.querySelectorAll(
          ".studio-starter-card"
        ).length;
        const starterUiRemoved =
          guideCards === 0 &&
          Boolean(document.querySelector(".studio-empty"));
        const autoSyncImportedCount =
          await window.ShijiStudio?.syncAutoFolder?.(
            ${JSON.stringify(smokeAutoSyncFolder)}
          );
        await wait(220);
        const autoSyncDuplicateCount =
          await window.ShijiStudio?.syncAutoFolder?.(
            ${JSON.stringify(smokeAutoSyncFolder)}
          );
        const autoSyncMonitorVisible =
          (document.querySelector(".studio-sync-status")?.textContent || "")
            .includes("自动同步中");
        window.ShijiStudio?.clearAutoSync?.();
        await wait(120);
        const autoSyncStopped =
          (document.querySelector(
            '[data-studio-action="configure-auto-sync"]'
          )?.textContent || "").includes("自动同步视频");
        const fileApis = Boolean(
          window.ShijiDesktop?.pickFiles &&
          window.ShijiDesktop?.pickMediaFolder &&
          window.ShijiDesktop?.scanMediaFolder &&
          window.ShijiDesktop?.pickDirectory &&
          window.ShijiDesktop?.openPath &&
          window.ShijiDesktop?.revealPath &&
          window.ShijiDesktop?.trashFile
        );
        const now = Date.now();
        const libraryConfig = await ResourceLibrary.configure({
          rootPath: ${JSON.stringify(smokeLibraryRoot)},
          cachePath: ${JSON.stringify(smokeLibraryCache)},
          mode: "copy"
        });
        const libraryImport = await ResourceLibrary.importFile(
          {
            path: ${JSON.stringify(smokeMediaPath)},
            name: "author-avatar.jpg",
            size: 1024,
            lastModified: now,
            isDirectory: false
          },
          ["02_可复用素材", "材质包"]
        );
        await ResourceStore.replaceStudioData(
          [{
            id: "smoke-recording",
            title: "播放与封面测试素材",
            kind: "recording",
            status: "usable",
            description: "验证拾集内媒体播放器。",
            tags: ["测试"],
            favorite: false,
            minecraftVersion: "1.21.4",
            localPath: ${JSON.stringify(smokeVideoPath)},
            fileName: "播放与封面测试素材.mp4",
            fileSize: 1024,
            fileModifiedAt: now,
            thumbnailFailed: true,
            createdAt: now,
            updatedAt: now,
            trashedAt: null
          }, {
            id: "smoke-delete",
            title: "移除记录测试",
            kind: "texture",
            status: "usable",
            description: "验证仅移出拾集不会删除本地文件。",
            tags: ["测试"],
            favorite: false,
            minecraftVersion: "",
            localPath: libraryImport.path,
            sourcePath: "",
            fileName: libraryImport.name,
            fileSize: libraryImport.size,
            fileModifiedAt: now,
            thumbnailFailed: false,
            createdAt: now,
            updatedAt: now,
            trashedAt: null
          }],
          []
        );
        await ShijiStudio.reload();
        const guideHiddenAfterAssets =
          document.querySelectorAll(".studio-starter-card").length === 0;
        const thumbnailPlaceholder = Boolean(
          document.querySelector(
            'img[data-video-cover-asset="smoke-recording"]'
          )
        );
        const hasFolderAction = Boolean(
          document.querySelector('[data-studio-action="reveal-path"]')
        );
        const cardCoverHeight = Math.round(
          document.querySelector(".studio-asset-card .studio-asset-thumb")
            ?.getBoundingClientRect().height || 0
        );
        document
          .querySelector(
            '.studio-asset-card[data-asset-id="smoke-recording"]'
          )
          ?.click();
        await wait(180);
        const assetInlinePlayer = document.querySelector(
          "#studio-dialog .studio-inline-video"
        );
        document
          .querySelector("#studio-dialog [data-inline-video-play]")
          ?.click();
        await wait(450);
        const assetInlinePlayback =
          Boolean(assetInlinePlayer) &&
          assetInlinePlayer.readyState >= 2 &&
          !assetInlinePlayer.paused;
        const assetProgress = document.querySelector(
          "#studio-dialog [data-inline-video-progress]"
        );
        const assetProgressValue = Number(assetProgress?.value || 0);
        const assetProgressVisible =
          Boolean(assetProgress) &&
          assetProgress.getBoundingClientRect().height >= 18;
        const assetUsesCustomControls =
          Boolean(assetInlinePlayer) &&
          !assetInlinePlayer.hasAttribute("controls") &&
          document.querySelectorAll("#studio-dialog .studio-inline-controls")
            .length === 1 &&
          !document.querySelector("#studio-dialog [data-inline-icon-pause]")
            ?.hidden &&
          document.querySelector("#studio-dialog [data-inline-icon-play]")
            ?.hidden === true;
        document.getElementById("studio-dialog")?.close();
        document.querySelector('[data-studio-action="play-media"]')?.click();
        await wait(120);
        const player = document.querySelector(
          "#studio-dialog .studio-media-player"
        );
        const playerOpen = Boolean(player);
        const playerSource = player?.getAttribute("src") || "";
        const playerCaptureButton = Boolean(
          document.querySelector(
            '#studio-dialog [data-studio-action="capture-current-frame"]'
          )
        );
        const playerRenamePresent = Boolean(
          document.getElementById("studio-player-rename")
        );
        document.getElementById("studio-dialog")?.close();
        document
          .querySelector(
            '.studio-asset-card[data-asset-id="smoke-delete"]'
          )
          ?.click();
        await wait(120);
        const deleteControls = Boolean(
          document.querySelector(
            '#studio-dialog [data-studio-action="remove-asset"]'
          ) &&
          document.querySelector(
            '#studio-dialog [data-studio-action="trash-asset"]'
          )
        );
        const inlineRenamePresent = Boolean(
          document.getElementById("studio-inline-rename")
        );
        const detailPreviewRect = document
          .querySelector("#studio-dialog .studio-simple-preview")
          ?.getBoundingClientRect();
        const detailPreviewWidth = Math.round(detailPreviewRect?.width || 0);
        const detailPreviewHeight = Math.round(detailPreviewRect?.height || 0);
        const detailPreviewRatio =
          detailPreviewHeight > 0
            ? Number((detailPreviewWidth / detailPreviewHeight).toFixed(2))
            : 0;
        document
          .querySelector(
            '#studio-dialog [data-studio-action="rename-asset"]'
          )
          ?.click();
        await wait(100);
        document.getElementById("studio-inline-rename").value = "重命名测试";
        document
          .getElementById("studio-inline-rename-form")
          ?.requestSubmit();
        await wait(350);
        const cardTitleAfterRename =
          document.querySelector(
            '.studio-asset-card[data-asset-id="smoke-delete"] h3'
          )?.textContent || "";
        const renamedPath = libraryImport.path.replace(
          /[^\\\\/]+$/,
          "重命名测试.jpg"
        );
        let renamedFileExists = false;
        try {
          renamedFileExists = Boolean(
            await window.ShijiDesktop.getFileInfo(renamedPath)
          );
        } catch {
          renamedFileExists = false;
        }
        document
          .querySelector(
            '.studio-asset-card[data-asset-id="smoke-delete"]'
          )
          ?.click();
        await wait(100);
        window.confirm = () => true;
        document
          .querySelector(
            '#studio-dialog [data-studio-action="remove-asset"]'
          )
          ?.click();
        await wait(220);
        const recordOnlyRemoved = !document.querySelector(
          '.studio-asset-card[data-asset-id="smoke-delete"]'
        );
        let localFilePreserved = false;
        try {
          localFilePreserved = Boolean(
            await window.ShijiDesktop.getFileInfo(renamedPath)
          );
        } catch {
          localFilePreserved = false;
        }
        const backup = await window.ShijiStudio?.getBackup?.();
        document
          .querySelector(
            '.studio-asset-card[data-asset-id="smoke-recording"]'
          )
          ?.click();
        await wait(180);
        document
          .querySelector("#studio-dialog [data-inline-video-play]")
          ?.click();
        await wait(300);
        document
          .querySelector(
            "#studio-dialog #studio-detail-kind"
          )
          ?.closest(".custom-select")
          ?.querySelector(".custom-select-trigger")
          ?.click();
        await wait(160);
        const detailCustomSelectOpen = Boolean(
          document.querySelector(
            "#studio-dialog .custom-select-menu:not([hidden]) .custom-select-option"
          )
        );
        return {
          pageReady,
          heading,
          hasUploadButton,
          hasLegacyTabs,
          guideCards,
          starterUiRemoved,
          autoSyncImportedCount,
          autoSyncDuplicateCount,
          autoSyncMonitorVisible,
          autoSyncStopped,
          guideHiddenAfterAssets,
          fileApis,
          thumbnailPlaceholder,
          hasFolderAction,
          cardCoverHeight,
          assetInlinePlayback,
          assetProgressValue,
          assetProgressVisible,
          assetUsesCustomControls,
          detailCustomSelectOpen,
          detailPreviewWidth,
          detailPreviewHeight,
          detailPreviewRatio,
          inlineRenamePresent,
          playerOpen,
          playerSource,
          playerCaptureButton,
          playerRenamePresent,
          deleteControls,
          cardTitleAfterRename,
          renamedFileExists,
          recordOnlyRemoved,
          localFilePreserved,
          libraryConfig,
          libraryImport,
          backupReady:
            Array.isArray(backup?.mediaAssets) &&
            Array.isArray(backup?.videoProjects) &&
            backup.mediaAssets.some((asset) => asset.id === "smoke-recording")
        };
      })()
    `);
    const importedFolder = path.resolve(
      smokeLibraryRoot,
      "02_可复用素材",
      "材质包"
    );
    studioResult.libraryImport.folderCreated =
      path.dirname(path.resolve(studioResult.libraryImport.path)) ===
        importedFolder &&
      (await fs.stat(importedFolder)).isDirectory();
    studioResult.libraryImport.cacheCreated =
      (await fs.stat(smokeLibraryCache)).isDirectory();
    const studioImage = await window.webContents.capturePage();
    await fs.writeFile(
      path.join(app.getPath("temp"), "shiji-desktop-studio-smoke.png"),
      studioImage.toPNG()
    );
    const resetReloaded = new Promise((resolve) => {
      window.webContents.once("did-finish-load", resolve);
    });
    await window.webContents
      .executeJavaScript(`
        (async () => {
          document.querySelector('[data-view="settings"]')?.click();
          await new Promise((resolve) => setTimeout(resolve, 60));
          document.querySelector('[data-settings-section="privacy"]')?.click();
          await new Promise((resolve) => setTimeout(resolve, 60));
          window.confirm = () => true;
          document.querySelector('[data-action="reset-app-state"]')?.click();
        })()
      `)
      .catch(() => {});
    await resetReloaded;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const resetResult = await window.webContents.executeJavaScript(`
      ({
        cards: document.querySelectorAll("[data-resource-card]").length,
        welcomeOpen: Boolean(document.querySelector("#welcome-dialog")?.open)
      })
    `);
    await window.webContents.executeJavaScript(
      `window.ShijiDesktop.setCloseBehavior("tray")`
    );
    window.close();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const closeWindowHiddenToTray =
      !window.isDestroyed() && !window.isVisible();
    const smokeReport = JSON.parse(await fs.readFile(outputPath, "utf8"));
    smokeReport.closeWindowHiddenToTray = closeWindowHiddenToTray;
    smokeReport.resetInitialState = resetResult;
    smokeReport.colorMenuVisible = colorMenuResult.visible;
    smokeReport.accountIconStacked = accountIconLayout.stacked;
    smokeReport.libraryEditor = libraryEditorResult;
    smokeReport.customLibrary = libraryTest;
    smokeReport.detailAndFilters = detailAndFilters;
    smokeReport.authorLevel = authorLevelResult;
    smokeReport.fileFilter = fileFilterResult;
    smokeReport.studio = studioResult;
    smokeReport.ok =
      smokeReport.ok &&
      closeWindowHiddenToTray &&
      resetResult.cards === 7 &&
      resetResult.welcomeOpen &&
      colorMenuResult.visible &&
      colorMenuResult.swatches >= 6 &&
      colorMenuResult.topbarAddHidden &&
      accountIconLayout.stacked &&
      libraryEditorResult.name === "文章与阅读" &&
      !libraryEditorResult.fileAllowed &&
      libraryEditorResult.layout === "紧凑列表" &&
      libraryTest.title === "文章与阅读" &&
      !libraryTest.typeFilters.includes("file") &&
      libraryTest.listLayout &&
      libraryTest.zoneValue.startsWith("custom:") &&
      libraryTest.fileTypeHidden &&
      libraryTest.customCards === 1 &&
      libraryTest.allCards === 8 &&
      detailAndFilters.detail.mode === "window" &&
      detailAndFilters.detail.open &&
      detailAndFilters.detail.centered &&
      detailAndFilters.detail.closeAtRight &&
      detailAndFilters.resourceEditorBackVisible &&
      detailAndFilters.resourceEditorOpen &&
      detailAndFilters.resourceEditorBackLeftOfClose &&
      detailAndFilters.returnedToDetail &&
      detailAndFilters.zoneFilters.some((label) => label.includes("我的世界")) &&
      detailAndFilters.zoneFilters.some((label) => label.includes("文章与阅读")) &&
      detailAndFilters.minecraftCards === 3 &&
      detailAndFilters.sidebarFont >= 13 &&
      authorLevelResult.level === "20" &&
      authorLevelResult.percent > 0 &&
      authorLevelResult.percent < 100 &&
      authorLevelResult.percentText.endsWith("%") &&
      !authorLevelResult.hasCaption &&
      !authorLevelResult.hasBirthday &&
      authorLevelResult.background === "none" &&
      authorLevelResult.borderWidth === "0px" &&
      authorLevelResult.versionText.includes("1.1.0") &&
      authorLevelResult.labelFont >= 11 &&
      authorLevelResult.valueFont >= 12 &&
      authorLevelResult.releaseBackVisible &&
      authorLevelResult.timelineEntries === 3 &&
      authorLevelResult.timelineFigures === 3 &&
      authorLevelResult.timelineNaming.includes("主版本") &&
      authorLevelResult.releaseBackLeftOfClose &&
      authorLevelResult.returnedToAuthor &&
      fileFilterResult.title === "全部资源" &&
      fileFilterResult.cards === 1 &&
      !fileFilterResult.hasDuplicateFileNav &&
      fileFilterResult.hasPathPreview &&
      studioResult.pageReady &&
      studioResult.heading === "素材库" &&
      studioResult.hasUploadButton &&
      !studioResult.hasLegacyTabs &&
      studioResult.starterUiRemoved &&
      studioResult.autoSyncImportedCount === 1 &&
      studioResult.autoSyncDuplicateCount === 0 &&
      studioResult.autoSyncMonitorVisible &&
      studioResult.autoSyncStopped &&
      studioResult.guideHiddenAfterAssets &&
      studioResult.fileApis &&
      studioResult.thumbnailPlaceholder &&
      studioResult.hasFolderAction &&
      studioResult.cardCoverHeight >= 120 &&
      studioResult.cardCoverHeight <= 150 &&
      studioResult.assetInlinePlayback &&
      studioResult.assetProgressValue > 0 &&
      studioResult.assetProgressVisible &&
      studioResult.assetUsesCustomControls &&
      studioResult.detailCustomSelectOpen &&
      studioResult.detailPreviewWidth > studioResult.detailPreviewHeight &&
      studioResult.detailPreviewHeight > 0 &&
      studioResult.detailPreviewRatio >= 1.74 &&
      studioResult.detailPreviewRatio <= 1.86 &&
      studioResult.inlineRenamePresent &&
      studioResult.playerOpen &&
      studioResult.playerSource.startsWith("shiji-media://") &&
      studioResult.playerCaptureButton &&
      studioResult.playerRenamePresent &&
      studioResult.deleteControls &&
      studioResult.cardTitleAfterRename === "重命名测试" &&
      studioResult.renamedFileExists &&
      studioResult.recordOnlyRemoved &&
      studioResult.localFilePreserved &&
      studioResult.libraryConfig.rootPath === smokeLibraryRoot &&
      studioResult.libraryImport.managed &&
      studioResult.libraryImport.folderCreated &&
      studioResult.libraryImport.cacheCreated &&
      studioResult.backupReady;
    await fs.writeFile(outputPath, JSON.stringify(smokeReport, null, 2), "utf8");
  } catch (error) {
    await fs.writeFile(outputPath, `FAIL\n${error.stack || error}\n`, "utf8");
  } finally {
    const tempRoot = `${path.resolve(app.getPath("temp"))}${path.sep}`;
    if (path.resolve(smokeLibraryRoot).startsWith(tempRoot)) {
      await fs.rm(smokeLibraryRoot, { recursive: true, force: true });
      await fs.rm(smokeLibraryCache, { recursive: true, force: true });
    }
    isQuitting = true;
    app.quit();
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: "拾集 · 第二测试版 1.2.12",
    backgroundColor: "#f3f2ed",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
      spellcheck: false,
      backgroundThrottling: true,
      v8CacheOptions: "code",
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) {
      event.preventDefault();
      openExternalUrl(url);
    }
  });

  mainWindow.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(permission === "clipboard-sanitized-write");
    }
  );

  mainWindow.once("ready-to-show", () => {
    if (!SMOKE_TEST) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.once("did-finish-load", () => {
    if (SMOKE_TEST) {
      void runSmokeTest(mainWindow);
    }
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error(`Failed to load ${validatedURL}: ${errorCode} ${errorDescription}`);
    }
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting && closeBehavior === "tray") {
      event.preventDefault();
      ensureTray();
      mainWindow.hide();
    }
  });

  void mainWindow.loadURL(`${APP_ORIGIN}/index.html`);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    await loadAppPreferences();
    Menu.setApplicationMenu(null);
    registerAppProtocol();
    registerMediaProtocol();
    registerFileHandlers();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  tray?.destroy();
  tray = null;
});
