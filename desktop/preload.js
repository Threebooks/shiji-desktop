"use strict";

const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld(
  "ShijiDesktop",
  Object.freeze({
    getStartupSetting: () => ipcRenderer.invoke("app:get-startup"),
    setStartupSetting: (enabled) =>
      ipcRenderer.invoke("app:set-startup", enabled),
    getCloseBehavior: () => ipcRenderer.invoke("app:get-close-behavior"),
    setCloseBehavior: (behavior) =>
      ipcRenderer.invoke("app:set-close-behavior", behavior),
    quitApp: () => ipcRenderer.invoke("app:quit"),
    setZoomFactor: (value) => ipcRenderer.invoke("ui:set-zoom", value),
    pickFile: () => ipcRenderer.invoke("files:pick"),
    pickFiles: () => ipcRenderer.invoke("files:pick-many"),
    pickMediaFolder: () => ipcRenderer.invoke("files:pick-media-folder"),
    scanMediaFolder: (folderPath) =>
      ipcRenderer.invoke("files:scan-media-folder", folderPath),
    pickDirectory: () => ipcRenderer.invoke("paths:pick-directory"),
    getDefaultCachePath: () =>
      ipcRenderer.invoke("library:get-default-cache"),
    initializeLibrary: (options) =>
      ipcRenderer.invoke("library:initialize", options),
    importLibraryFile: (options) =>
      ipcRenderer.invoke("library:import-file", options),
    renameLibraryFiles: (options) =>
      ipcRenderer.invoke("library:rename-files", options),
    getFileInfo: (filePath) => ipcRenderer.invoke("files:info", filePath),
    getImageThumbnail: (filePath) =>
      ipcRenderer.invoke("files:image-thumbnail", filePath),
    inspectArchive: (filePath) =>
      ipcRenderer.invoke("files:inspect-archive", filePath),
    openFile: (filePath) => ipcRenderer.invoke("files:open", filePath),
    openPath: (targetPath) => ipcRenderer.invoke("files:open-path", targetPath),
    revealFile: (filePath) => ipcRenderer.invoke("files:reveal", filePath),
    revealPath: (targetPath) =>
      ipcRenderer.invoke("files:reveal-path", targetPath),
    trashFile: (filePath) => ipcRenderer.invoke("files:trash", filePath),
    getPathForFile: (file) => webUtils.getPathForFile(file),
    fetchSiteIcon: (website) => ipcRenderer.invoke("site:icon", website)
  })
);
