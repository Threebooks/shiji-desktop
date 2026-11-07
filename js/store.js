(function () {
  "use strict";

  const DB_NAME = "shiji-resource-library";
  const DB_VERSION = 3;
  const INITIALIZED_KEY = "shiji.initialized";
  const CONTENT_VERSION_KEY = "shiji.contentVersion";
  const CONTENT_VERSION = 2;
  const LEGACY_SEED_NOTE_IDS = ["seed-summary", "seed-tools", "seed-typography"];
  let databasePromise = null;

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `res_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function openDatabase() {
    if (databasePromise) {
      return databasePromise;
    }

    databasePromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("当前浏览器不支持本地数据库。"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains("resources")) {
          const resources = database.createObjectStore("resources", { keyPath: "id" });
          resources.createIndex("categoryId", "categoryId", { unique: false });
          resources.createIndex("updatedAt", "updatedAt", { unique: false });
        }

        if (!database.objectStoreNames.contains("categories")) {
          const categories = database.createObjectStore("categories", { keyPath: "id" });
          categories.createIndex("order", "order", { unique: false });
        }

        if (!database.objectStoreNames.contains("vault")) {
          database.createObjectStore("vault", { keyPath: "id" });
        }

        if (!database.objectStoreNames.contains("mediaAssets")) {
          const mediaAssets = database.createObjectStore("mediaAssets", {
            keyPath: "id"
          });
          mediaAssets.createIndex("kind", "kind", { unique: false });
          mediaAssets.createIndex("status", "status", { unique: false });
          mediaAssets.createIndex("updatedAt", "updatedAt", { unique: false });
        }

        if (!database.objectStoreNames.contains("videoProjects")) {
          const videoProjects = database.createObjectStore("videoProjects", {
            keyPath: "id"
          });
          videoProjects.createIndex("status", "status", { unique: false });
          videoProjects.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("无法打开本地数据库。"));
      request.onblocked = () => reject(new Error("本地数据库正在被其他窗口占用，请关闭旧窗口后重试。"));
    });

    return databasePromise;
  }

  async function runTransaction(storeNames, mode, operation) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeNames, mode);
      let result;

      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error || new Error("本地数据操作失败。"));
      transaction.onabort = () => reject(transaction.error || new Error("本地数据操作已取消。"));

      try {
        result = operation(transaction);
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    });
  }

  function requestAsPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function seedData() {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const categories = [
      { id: "design", name: "设计灵感", color: "#ad7a4d", order: 0, createdAt: now - 45 * day },
      { id: "learning", name: "学习资料", color: "#557d68", order: 1, createdAt: now - 44 * day },
      { id: "tools", name: "实用工具", color: "#5d7398", order: 2, createdAt: now - 43 * day },
      { id: "reading", name: "稍后阅读", color: "#a86465", order: 3, createdAt: now - 42 * day }
    ];

    const resources = [
      {
        id: "seed-figma",
        type: "link",
        title: "Figma Community 精选设计资源",
        url: "https://www.figma.com/community",
        description: "寻找界面灵感、设计系统和可直接复用的社区文件。",
        categoryId: "design",
        tags: ["设计", "灵感", "UI"],
        favorite: true,
        createdAt: now - 8 * day,
        updatedAt: now - 2 * day,
        openedAt: now - 3 * 60 * 60 * 1000
      },
      {
        id: "seed-colors",
        type: "link",
        title: "Coolors · 快速生成配色方案",
        url: "https://coolors.co",
        description: "几秒钟生成协调的色板，适合做页面和品牌视觉的前期探索。",
        categoryId: "design",
        tags: ["配色", "工具"],
        favorite: false,
        createdAt: now - 11 * day,
        updatedAt: now - 6 * day,
        openedAt: now - 6 * day
      },
      {
        id: "seed-reading",
        type: "link",
        title: "The Marginalian · 值得慢慢读的文章",
        url: "https://www.themarginalian.org",
        description: "关于艺术、科学、哲学与如何好好生活的长期写作。",
        categoryId: "reading",
        tags: ["阅读", "灵感"],
        favorite: false,
        createdAt: now - 18 * day,
        updatedAt: now - 9 * day,
        openedAt: null
      },
      {
        id: "seed-notion",
        type: "link",
        title: "Notion 模板与工作流参考",
        url: "https://www.notion.so/templates",
        description: "挑模板时先看它解决什么问题，再决定是否复制到自己的系统。",
        categoryId: "tools",
        tags: ["Notion", "模板"],
        favorite: false,
        createdAt: now - 30 * day,
        updatedAt: now - 12 * day,
        openedAt: now - 12 * day
      },
      {
        id: "seed-mc-iris",
        type: "link",
        zone: "minecraft",
        minecraftType: "shader",
        title: "Iris Shaders · 光影加载器",
        url: "https://modrinth.com/shader/iris",
        description: "兼容主流光影包的光影加载器，下载前先确认 Minecraft 版本。",
        categoryId: null,
        tags: ["1.21", "Fabric", "光影加载器"],
        favorite: true,
        createdAt: now - 7 * day,
        updatedAt: now - 2 * day,
        openedAt: now - 3 * day
      },
      {
        id: "seed-mc-terralith",
        type: "link",
        zone: "minecraft",
        minecraftType: "mod",
        title: "Terralith · 地形生成扩展",
        url: "https://modrinth.com/datapack/terralith",
        description: "增加大量原版风格地形群系，适合作为长期生存世界的生成模组。",
        categoryId: null,
        tags: ["1.21", "Fabric", "地形"],
        favorite: false,
        createdAt: now - 13 * day,
        updatedAt: now - 7 * day,
        openedAt: null
      },
      {
        id: "seed-mc-pack",
        type: "note",
        zone: "minecraft",
        minecraftType: "resourcepack",
        title: "低配光影与材质包搭配备忘",
        url: "",
        description:
          "低配光影：Complementary Reimagined（关闭体积云）\n材质包：Stay True（16×）\n\n经验：材质包分辨率越高并不一定越好看，先保证常用方块辨识度，再考虑细节。",
        categoryId: null,
        tags: ["低配", "16x", "搭配"],
        favorite: false,
        createdAt: now - 9 * day,
        updatedAt: now - 3 * day,
        openedAt: null
      }
    ];

    return { categories, resources };
  }

  async function getAll(storeName) {
    const database = await openDatabase();
    const transaction = database.transaction(storeName, "readonly");
    return requestAsPromise(transaction.objectStore(storeName).getAll());
  }

  async function initialize() {
    let [categories, resources, vaultRecords] = await Promise.all([
      getAll("categories"),
      getAll("resources"),
      getAll("vault")
    ]);

    if (!localStorage.getItem(INITIALIZED_KEY) && categories.length === 0 && resources.length === 0) {
      const seed = seedData();
      categories = seed.categories;
      resources = seed.resources;
      await replaceAll(categories, resources);
      localStorage.setItem(CONTENT_VERSION_KEY, String(CONTENT_VERSION));
    }

    const contentVersion = Number(localStorage.getItem(CONTENT_VERSION_KEY) || "1");
    if (contentVersion < CONTENT_VERSION) {
      await deleteResourcesByIds(LEGACY_SEED_NOTE_IDS);
      resources = resources.filter(
        (resource) => !LEGACY_SEED_NOTE_IDS.includes(resource.id)
      );
      localStorage.setItem(CONTENT_VERSION_KEY, String(CONTENT_VERSION));
    }

    localStorage.setItem(INITIALIZED_KEY, "1");
    categories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return { categories, resources, vaultRecord: vaultRecords[0] || null };
  }

  async function saveResource(resource) {
    const database = await openDatabase();
    const transaction = database.transaction("resources", "readwrite");
    transaction.objectStore("resources").put(resource);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(resource);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function deleteResource(id) {
    const database = await openDatabase();
    const transaction = database.transaction("resources", "readwrite");
    transaction.objectStore("resources").delete(id);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function deleteResourcesByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return;
    }
    const database = await openDatabase();
    const transaction = database.transaction("resources", "readwrite");
    const store = transaction.objectStore("resources");
    ids.forEach((id) => store.delete(id));

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function saveCategory(category) {
    const database = await openDatabase();
    const transaction = database.transaction("categories", "readwrite");
    transaction.objectStore("categories").put(category);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(category);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function deleteCategoryAndReassign(categoryId, fallbackCategoryId) {
    const database = await openDatabase();
    const transaction = database.transaction(["categories", "resources"], "readwrite");
    const resources = transaction.objectStore("resources");
    const categories = transaction.objectStore("categories");

    categories.delete(categoryId);
    const cursorRequest = resources.index("categoryId").openCursor(IDBKeyRange.only(categoryId));

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) {
        return;
      }

      const resource = cursor.value;
      resource.categoryId = fallbackCategoryId;
      resource.updatedAt = Date.now();
      cursor.update(resource);
      cursor.continue();
    };

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function saveVault(vaultRecord) {
    const database = await openDatabase();
    const transaction = database.transaction("vault", "readwrite");
    transaction.objectStore("vault").put(vaultRecord);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(vaultRecord);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function clearVault() {
    const database = await openDatabase();
    const transaction = database.transaction("vault", "readwrite");
    transaction.objectStore("vault").clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function replaceAll(categories, resources) {
    const database = await openDatabase();
    const transaction = database.transaction(["categories", "resources"], "readwrite");
    const categoryStore = transaction.objectStore("categories");
    const resourceStore = transaction.objectStore("resources");

    categoryStore.clear();
    resourceStore.clear();

    categories.forEach((category) => categoryStore.put(category));
    resources.forEach((resource) => resourceStore.put(resource));

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function resetToDefaults() {
    const seed = seedData();
    await replaceAll(seed.categories, seed.resources);
    await clearVault();
    await clearStudioData();
    localStorage.setItem(INITIALIZED_KEY, "1");
    localStorage.setItem(CONTENT_VERSION_KEY, String(CONTENT_VERSION));
    return seed;
  }

  async function loadStudioData() {
    const [mediaAssets, videoProjects] = await Promise.all([
      getAll("mediaAssets"),
      getAll("videoProjects")
    ]);
    return { mediaAssets, videoProjects };
  }

  async function saveMediaAsset(asset) {
    const database = await openDatabase();
    const transaction = database.transaction("mediaAssets", "readwrite");
    transaction.objectStore("mediaAssets").put(asset);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(asset);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function saveMediaAssets(assets) {
    if (!Array.isArray(assets) || assets.length === 0) {
      return [];
    }
    const database = await openDatabase();
    const transaction = database.transaction("mediaAssets", "readwrite");
    const store = transaction.objectStore("mediaAssets");
    assets.forEach((asset) => store.put(asset));

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(assets);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function deleteMediaAsset(id) {
    const database = await openDatabase();
    const transaction = database.transaction("mediaAssets", "readwrite");
    transaction.objectStore("mediaAssets").delete(id);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function deleteMediaAssets(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return;
    }
    const database = await openDatabase();
    const transaction = database.transaction("mediaAssets", "readwrite");
    const store = transaction.objectStore("mediaAssets");
    ids.forEach((id) => store.delete(id));

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function saveVideoProject(project) {
    const database = await openDatabase();
    const transaction = database.transaction("videoProjects", "readwrite");
    transaction.objectStore("videoProjects").put(project);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(project);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function deleteVideoProject(id) {
    const database = await openDatabase();
    const transaction = database.transaction("videoProjects", "readwrite");
    transaction.objectStore("videoProjects").delete(id);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function replaceStudioData(mediaAssets = [], videoProjects = []) {
    const database = await openDatabase();
    const transaction = database.transaction(
      ["mediaAssets", "videoProjects"],
      "readwrite"
    );
    const assetStore = transaction.objectStore("mediaAssets");
    const projectStore = transaction.objectStore("videoProjects");
    assetStore.clear();
    projectStore.clear();
    mediaAssets.forEach((asset) => assetStore.put(asset));
    videoProjects.forEach((project) => projectStore.put(project));

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function clearStudioData() {
    return replaceStudioData([], []);
  }

  window.ResourceStore = {
    makeId,
    initialize,
    saveResource,
    deleteResource,
    saveCategory,
    deleteCategoryAndReassign,
    saveVault,
    clearVault,
    replaceAll,
    resetToDefaults,
    loadStudioData,
    saveMediaAsset,
    saveMediaAssets,
    deleteMediaAsset,
    deleteMediaAssets,
    saveVideoProject,
    deleteVideoProject,
    replaceStudioData,
    clearStudioData
  };
})();
