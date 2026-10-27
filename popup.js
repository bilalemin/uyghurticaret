async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function translateGoogle(text) {
    if (!text || !text.trim()) return text;
    try {
        const r = await fetchWithTimeout(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.substring(0, 400))}&langpair=en|ug`,
            8000
        );
        if (!r.ok) return text;
        const d = await r.json();
        const t = d.responseData?.translatedText;
        if (t && t !== text && !/mymemory|quota|limit/i.test(t)) return t;
    } catch {}
    return text;
}

const StorageEngine = {
  async get(key, defaultVal) {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (res) => {
            resolve(res[key] !== undefined ? res[key] : defaultVal);
          });
        });
      } else {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultVal;
      }
    } catch (e) {
      return defaultVal;
    }
  },
  async set(key, val) {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [key]: val }, () => resolve(true));
        });
      } else {
        localStorage.setItem(key, JSON.stringify(val));
        return true;
      }
    } catch (e) {
      return false;
    }
  }
};

const DEFAULT_PRODUCTS = [
  {
    id: "p1",
    name: "ئەلا سۈپەتلىك شەرقىي تۈركىستان بادام ۋە ياڭاقلىرى",
    price: 35,
    desc: "تەبىئىي، يېڭى يىغىۋېلىنغان قۇرۇق يېمەكلىكلەر. سۈرىيەنىڭ بارلىق شەھەرلىرىگە تېز يەتكۈزۈپ بېرىلىدۇ.",
    sellerName: "مۇھەممەد ئەمىن",
    sellerEmail: "amin.uyghur@gmail.com",
    shamCode: "SC-1042-IDLIB"
  },
  {
    id: "p2",
    name: "قولدا تىكىلگەن ئۇيغۇر دوپپىسى ۋە ئەتلەس بۇيۇملىرى",
    price: 20,
    desc: "مىللىي ئەنئەنىۋى قول ھۈنەرۋەنچىلىك مەھسۇلاتى، سۈپەتلىك يىپەكتىن ئىشلەنگەن نەپىس دوپپا.",
    sellerName: "زەينەپ خانىم",
    sellerEmail: "zeynep.craft@gmail.com",
    shamCode: "SC-8830-ALEPPO"
  },
  {
    id: "p3",
    name: "تەبىئىي سىدر (سۇدرى) ھەسىلى - 1 كىلوگرام",
    price: 45,
    desc: "سۈرىيە ۋە شەرقىي تۈركىستان تېببىي ئۆلچىمىگە ئۇيغۇن ساپ شىپالىق ھەسەل.",
    sellerName: "ئابدۇراخمان تىجارەت",
    sellerEmail: "abdurahman.sy@gmail.com",
    shamCode: "SC-4491-DAM"
  }
];

const DEFAULT_USERS = [
  {
    name: "مۇھەممەد ئەمىن",
    email: "amin.uyghur@gmail.com",
    shamCode: "SC-1042-IDLIB",
    loginTime: "2026-10-27 10:30"
  },
  {
    name: "زەينەپ خانىم",
    email: "zeynep.craft@gmail.com",
    shamCode: "SC-8830-ALEPPO",
    loginTime: "2026-10-27 12:15"
  }
];

let appState = {
  balance: 1250.00,
  currentUser: {
    name: "ئابدۇللاھ (مېھمان)",
    email: "guest@gmail.com",
    shamCode: "SC-9940-UYG"
  },
  products: [],
  users: [],
  orders: [],
  lightMode: false
};

function showToast(msg) {
  try {
    const box = document.getElementById("toastBox");
    if (!box) return;
    box.textContent = msg;
    box.style.display = "block";
    setTimeout(() => {
      box.style.display = "none";
    }, 3200);
  } catch (e) {}
}

async function saveAllState() {
  await StorageEngine.set("ut_app_state_v1", appState);
}

function renderWalletAndUser() {
  try {
    document.getElementById("walletBalance").textContent = appState.balance.toFixed(2);
    document.getElementById("shamAccountCode").textContent = appState.currentUser.shamCode;
    document.getElementById("activeUserBadge").textContent = `👤 ${appState.currentUser.name}`;
  } catch (e) {}
}

function renderProducts(filterText = "") {
  try {
    const container = document.getElementById("productList");
    if (!container) return;
    container.innerHTML = "";

    const q = filterText.trim().toLowerCase();
    const list = appState.products.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.sellerName.toLowerCase().includes(q)
      );
    });

    if (list.length === 0) {
      container.innerHTML = `<div class="glass-card"><p class="uyghur-paragraph">ئىزدىگەن مەھسۇلات تېپىلمىدى. يېڭى مەھسۇلات قوشۇپ سىناپ بېقىڭ.</p></div>`;
      return;
    }

    list.forEach((prod) => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <div class="product-header">
          <span class="product-title">${escapeHtml(prod.name)}</span>
          <span class="product-price">${Number(prod.price).toFixed(2)} $</span>
        </div>
        <p class="uyghur-paragraph">${escapeHtml(prod.desc)}</p>
        <div class="product-meta">
          <span>👤 ساتقۇچى: ${escapeHtml(prod.sellerName)} (${escapeHtml(prod.shamCode)})</span>
          <button class="btn btn-primary buy-btn" style="width:auto; padding:5px 12px; font-size:0.78rem;" data-id="${prod.id}">
            💳 ShamCash بىلەن سېتىۋېلىش
          </button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll(".buy-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleBuyProduct(btn.getAttribute("data-id")));
    });
  } catch (e) {}
}

function renderAdminPanel() {
  try {
    const userTbody = document.getElementById("adminUsersTable");
    document.getElementById("adminUserCount").textContent = appState.users.length;
    userTbody.innerHTML = "";
    appState.users.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="status-pill">${escapeHtml(u.shamCode)}</span></td>
      `;
      userTbody.appendChild(tr);
    });

    const prodTbody = document.getElementById("adminProductsTable");
    document.getElementById("adminProdCount").textContent = appState.products.length;
    prodTbody.innerHTML = "";
    appState.products.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.sellerName)}</td>
        <td>${Number(p.price).toFixed(2)}$</td>
        <td><button class="icon-btn del-prod-btn" data-id="${p.id}" style="padding:2px 6px; font-size:0.72rem; color:#f87171;">ئۆچۈرۈش</button></td>
      `;
      prodTbody.appendChild(tr);
    });

    prodTbody.querySelectorAll(".del-prod-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        appState.products = appState.products.filter((item) => item.id !== id);
        await saveAllState();
        renderProducts();
        renderAdminPanel();
        showToast("🗑️ مەھسۇلات باشقۇرغۇچى تەرىپىدىن ئۆچۈرۈلدى.");
      });
    });

    const orderTbody = document.getElementById("adminOrdersTable");
    orderTbody.innerHTML = "";
    if (appState.orders.length === 0) {
      orderTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#94a3b8;">تېخى سودا خاتىرىسى يوق</td></tr>`;
    } else {
      appState.orders.forEach((o) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(o.productName)}</td>
          <td>${escapeHtml(o.buyerName)}</td>
          <td><span class="status-pill">${Number(o.amount).toFixed(2)}$ -> ${escapeHtml(o.sellerSham)}</span></td>
        `;
        orderTbody.appendChild(tr);
      });
    }
  } catch (e) {}
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function handleBuyProduct(prodId) {
  try {
    const prod = appState.products.find((p) => p.id === prodId);
    if (!prod) return;

    const price = Number(prod.price);
    if (appState.balance < price) {
      showToast("⚠️ ShamCash ھېساباتىڭىزدا يېتەرلىك قالدۇق يوق!");
      return;
    }

    appState.balance -= price;
    appState.orders.unshift({
      productName: prod.name,
      buyerName: appState.currentUser.name,
      sellerSham: prod.shamCode,
      amount: price,
      time: new Date().toLocaleTimeString()
    });

    await saveAllState();
    renderWalletAndUser();
    renderAdminPanel();
    showToast(`✅ «${prod.name}» ئۈچۈن ${price}$ شام كەش (${prod.shamCode}) غا ئەۋەتىلدى!`);
  } catch (e) {}
}

async function initApp() {
  try {
    const saved = await StorageEngine.get("ut_app_state_v1", null);
    if (saved && Array.isArray(saved.products)) {
      appState = saved;
    } else {
      appState.products = DEFAULT_PRODUCTS;
      appState.users = DEFAULT_USERS;
      appState.orders = [];
      await saveAllState();
    }

    if (appState.lightMode) {
      document.body.classList.add("light-mode");
    }

    renderWalletAndUser();
    renderProducts();
    renderAdminPanel();

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        const target = document.getElementById(btn.getAttribute("data-tab"));
        if (target) target.classList.add("active");
      });
    });

    document.getElementById("themeToggleBtn").addEventListener("click", async () => {
      document.body.classList.toggle("light-mode");
      appState.lightMode = document.body.classList.contains("light-mode");
      await saveAllState();
    });

    document.getElementById("receiveSalaryBtn").addEventListener("click", async () => {
      appState.balance += 500;
      await saveAllState();
      renderWalletAndUser();
      showToast("💰 سۈرىيە ShamCash ھېساباتىڭىزغا ئايلىق مائاش (+500$) چۈشتى!");
    });

    document.getElementById("topUpShamBtn").addEventListener("click", async () => {
      appState.balance += 100;
      await saveAllState();
      renderWalletAndUser();
      showToast("➕ ShamCash ھېساباتىڭىزغا +100$ نەق پۇل قوشۇلدى!");
    });

    document.getElementById("searchInput").addEventListener("input", (e) => {
      renderProducts(e.target.value);
    });

    document.getElementById("translateBtn").addEventListener("click", async () => {
      const nameEl = document.getElementById("prodNameInput");
      const descEl = document.getElementById("prodDescInput");
      showToast("⏳ ئىنگلىزچىدىن ئۇيغۇرچىغا تەرجىمە قىلىныۋاتىدۇ...");

      if (nameEl.value.trim()) {
        nameEl.value = await translateGoogle(nameEl.value);
      }
      if (descEl.value.trim()) {
        descEl.value = await translateGoogle(descEl.value);
      }
      showToast("🌐 تەرجىمە مۇۋەپپەقىيەتلىك تاماملاندى!");
    });

    document.getElementById("publishProductBtn").addEventListener("click", async () => {
      const name = document.getElementById("prodNameInput").value.trim();
      const price = parseFloat(document.getElementById("prodPriceInput").value);
      const desc = document.getElementById("prodDescInput").value.trim();
      const sham = document.getElementById("prodSellerShamInput").value.trim() || appState.currentUser.shamCode;

      if (!name || isNaN(price) || price <= 0 || !desc) {
        showToast("⚠️ مەھسۇلات نامى، باھاسى ۋە چۈشەندۈرۈشىنى تولۇق يېزىڭ!");
        return;
      }

      const newProd = {
        id: "prod_" + Date.now(),
        name,
        price,
        desc,
        sellerName: appState.currentUser.name,
        sellerEmail: appState.currentUser.email,
        shamCode: sham
      };

      appState.products.unshift(newProd);
      await saveAllState();
      renderProducts();
      renderAdminPanel();

      document.getElementById("prodNameInput").value = "";
      document.getElementById("prodPriceInput").value = "";
      document.getElementById("prodDescInput").value = "";
      showToast("✅ مەھسۇلاتىڭىز بازارغا ۋە باشقۇرغۇچى تىزىملىكىگە قوشۇلدى!");
    });

    document.getElementById("googleLoginBtn").addEventListener("click", async () => {
      const name = document.getElementById("googleNameInput").value.trim();
      const email = document.getElementById("googleEmailInput").value.trim();
      const sham = document.getElementById("userShamInput").value.trim() || "SC-" + Math.floor(1000 + Math.random() * 9000) + "-SY";

      if (!name || !email || !email.includes("@")) {
        showToast("⚠️ توغرا بولغان ئىسىم ۋە Google ئېلخەت (Gmail) كىرگۈزۈڭ!");
        return;
      }

      appState.currentUser = { name, email, shamCode: sham };

      const exists = appState.users.some((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!exists) {
        appState.users.unshift({
          name,
          email,
          shamCode: sham,
          loginTime: new Date().toLocaleString()
        });
      }

      await saveAllState();
      renderWalletAndUser();
      renderAdminPanel();
      showToast(`🔵 خۇش كەپسىز ${name}! Google ھېساباتىڭىز بىلەن كىردىڭىز.`);
    });

    document.getElementById("logoutBtn").addEventListener("click", async () => {
      appState.currentUser = {
        name: "مېھمان",
        email: "guest@gmail.com",
        shamCode: "SC-0000-GUEST"
      };
      await saveAllState();
      renderWalletAndUser();
      showToast("🚪 ھېساباتتىن بىخەتەر چېكىندىڭىز.");
    });
  } catch (err) {
    console.error("Init error:", err);
  }
}

document.addEventListener("DOMContentLoaded", initApp);