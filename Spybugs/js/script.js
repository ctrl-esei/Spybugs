// Spybugs POS - script.js
console.log("Spybugs POS script loaded");

(function () {
  "use strict";

  // Make sure this matches your real folder name in XAMPP (Spybugs vs spybugs)
  const API_BASE = "/Spybugs/backend/";

  const ENDPOINTS = {
    login: API_BASE + "auth/login.php",
    orders: API_BASE + "api/orders.php",
    inventory: API_BASE + "api/inventory.php",
    analytics: API_BASE + "api/analytics.php",
  };

  async function fetchJson(url, options = {}) {
    try {
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        ...options,
      });
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      return await res.json();
    } catch (err) {
      console.error("fetchJson error:", err);
      return null;
    }
  }

  async function postJson(url, bodyObj) {
    return fetchJson(url, {
      method: "POST",
      body: JSON.stringify(bodyObj || {}),
    });
  }

  // UI HELPERS
  function formatCurrency(value) {
    const num = Number(value || 0);
    if (isNaN(num)) return "₱0";
    return "₱" + num.toLocaleString("en-PH", { minimumFractionDigits: 0 });
  }

  function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) {
      alert(message);
      return;
    }

    const toast = document.createElement("div");
    toast.style.padding = "0.6rem 0.9rem";
    toast.style.borderRadius = "0.75rem";
    toast.style.color = "#fff";
    toast.style.fontSize = "0.8rem";
    toast.style.boxShadow = "0 8px 20px rgba(15,23,42,0.25)";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "0.4rem";

    let bg = "#4b5563";
    if (type === "success") bg = "#16a34a";
    else if (type === "error") bg = "#dc2626";
    else if (type === "warning") bg = "#f97316";

    toast.style.background = bg;

    toast.innerHTML = `
      <span style="flex:1;">${message}</span>
      <button style="border:none; background:transparent; color:#f9fafb; cursor:pointer; font-size:0.8rem;">
        ×
      </button>
    `;

    const closeBtn = toast.querySelector("button");
    closeBtn.addEventListener("click", () => {
      container.removeChild(toast);
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement === container) {
        container.removeChild(toast);
      }
    }, 4000);
  }

  // MENU ITEMS (for Create Order)
  const MENU_ITEMS = [
    // A4
    { category: "Print Papers", name: "A4 - Students", price: 3 },
    { category: "Print Papers", name: "A4 - B&W", price: 5 },
    { category: "Print Papers", name: "A4 - Full Color", price: 10 },
    { category: "Print Papers", name: "A4 - Full Color Students", price: 8 },

    // Short
    { category: "Print Papers", name: "Short - Students", price: 3 },
    { category: "Print Papers", name: "Short - B&W", price: 5 },
    { category: "Print Papers", name: "Short - Full Color", price: 10 },
    { category: "Print Papers", name: "Short - Full Color Students", price: 8 },

    // Long
    { category: "Print Papers", name: "Long - Students", price: 3 },
    { category: "Print Papers", name: "Long - B&W", price: 5 },
    { category: "Print Papers", name: "Long - Full Color", price: 10 },
    { category: "Print Papers", name: "Long - Full Color Students", price: 8 },

    { category: "Print Papers", name: "Board Paper", price: 25 },
    { category: "Print Papers", name: "Board (Double-Sided)", price: 35 },
    { category: "Print Papers", name: "Glossy", price: 40 },
    { category: "Print Papers", name: "Glossy (Double-Sided)", price: 50 },
    { category: "Print Papers", name: "Sticker Paper", price: 35 },
    { category: "Print Papers", name: "Transparent Sticker", price: 35 },

    // Picture Packages
    { category: "Picture Packages", name: "Package 1: 3pcs 2x2, 4pcs 1x1", price: 55 },
    { category: "Picture Packages", name: "Package 2: 4pcs 2x2", price: 55 },
    { category: "Picture Packages", name: "Package 3: 4pcs Passport + 3pcs 1x1", price: 75 },
    { category: "Picture Packages", name: "Package 4: 2pcs 2x2, 2pcs Passport, 3pcs 1x1", price: 75 },
    { category: "Picture Packages", name: "Package 5: 2pcs 2x2 + 4pcs 1x1", price: 50 },
    { category: "Picture Packages", name: "Package 6: 10pcs 1x1", price: 50 },
    { category: "Picture Packages", name: "Package 7: 8pcs 1x1", price: 40 },
    { category: "Picture Packages", name: "Package 8: 6pcs Passport", price: 75 },
    { category: "Picture Packages", name: "Wallet Size", price: 20 },
    { category: "Picture Packages", name: "3R", price: 20 },
    { category: "Picture Packages", name: "4R", price: 30 },
    { category: "Picture Packages", name: "5R", price: 35 },

    // Online Assistance
    { category: "Online Assistance", name: "Police Clearance", price: 150 },
    { category: "Online Assistance", name: "Police Clearance (with payment)", price: 330 },
    { category: "Online Assistance", name: "SSS", price: 150 },
    { category: "Online Assistance", name: "NBI", price: 300 },
    { category: "Online Assistance", name: "Pag-ibig", price: 350 },
    { category: "Online Assistance", name: "E-Reg / PEOS", price: 250 },
    { category: "Online Assistance", name: "Passport", price: 1500 },
    { category: "Online Assistance", name: "PSA", price: 150 },
    { category: "Online Assistance", name: "Balik-Manggagawa", price: 250 },
    { category: "Online Assistance", name: "OEC", price: 250 },

    // Other Services
    { category: "Other Services", name: "Install MS Office", price: 350 },
    { category: "Other Services", name: "Format", price: 800 },
    { category: "Other Services", name: "PC Repair", price: 0 },
    { category: "Other Services", name: "Laminate ID", price: 25 },
    { category: "Other Services", name: "Laminate Half", price: 50 },
    { category: "Other Services", name: "Laminate Full", price: 80 },
    { category: "Other Services", name: "PVC Card", price: 100 },
    { category: "Other Services", name: "Layout", price: 0 },
    { category: "Other Services", name: "Resume", price: 50 },
    { category: "Other Services", name: "Typing (Rush)", price: 100 },
    { category: "Other Services", name: "Typing (Regular)", price: 50 },
  ];

  // ===============================
  // ORDER STATUS FLOW + META
  // (aligned with DB ENUM: pending, in_progress, completed, cancelled)
  // ===============================
  const ORDER_STATUS_FLOW = [
    { key: "pending",     label: "Pending",     icon: "📝" },
    { key: "in_progress", label: "In Progress", icon: "⚙️" },
    { key: "completed",   label: "Completed",   icon: "✅" },
    { key: "cancelled",   label: "Cancelled",   icon: "❌" },
  ];

  const STATUS_MESSAGES = {
    pending: "🕐 Your order has been received and is waiting to be processed.",
    in_progress: "⚙️ Your order is currently in progress.",
    completed: "✅ Your order has been completed. Thank you!",
    cancelled: "❌ This order has been cancelled. Please contact the shop if you have questions.",
  };

  const STATUS_BADGE_COLORS = {
    pending: "#fbbf24",
    in_progress: "#3b82f6",
    completed: "#10b981",
    cancelled: "#ef4444",
  };

  function getStatusMeta(statusRaw) {
    const raw = (statusRaw || "pending").toLowerCase();
    let mapped;
  
    switch (raw) {
      case "pending":
        mapped = "pending";
        break;
  
      // DB intermediate states -> UI "In Progress"
      case "in-queue":
      case "printing":
      case "ready":
      case "in_progress":
      case "in progress":
        mapped = "in_progress";
        break;
  
      // DB "released" -> UI "Completed"
      case "released":
      case "completed":
      case "done":
        mapped = "completed";
        break;
  
      case "cancelled":
        mapped = "cancelled";
        break;
  
      default:
        mapped = "pending";
        break;
    }
  
    const idx = ORDER_STATUS_FLOW.findIndex((s) => s.key === mapped);
    const currentIndex = idx >= 0 ? idx : 0;
    const flowEntry = ORDER_STATUS_FLOW[currentIndex];
  
    return {
      rawStatus: raw,           // actual DB value (pending / printing / released / etc)
      currentStatus: mapped,    // UI canonical: pending / in_progress / completed / cancelled
      currentIndex,
      flowEntry,
      message: STATUS_MESSAGES[mapped] || STATUS_MESSAGES.pending,
    };
  }  

  // ===============================
  // INVENTORY / PRINT PAPER HELPERS
  // ===============================
  function isPrintPaperItemName(name = "") {
    return (
      name.includes("A4") ||
      name.includes("Short") ||
      name.includes("Long") ||
      name.includes("A3") ||
      name.includes("Board") ||
      name.includes("Glossy") ||
      name.includes("Sticker")
    );
  }

  function mapItemToPaper(itemName = "") {
    const name = itemName.toLowerCase();
  
    // Separate stocks
    if (name.includes("a4")) return "A4 Paper";
    if (name.includes("short")) return "Short Bond Paper";
    if (name.includes("long")) return "Long Bond Paper";
  
    // Others
    if (name.includes("a3")) return "A3 Paper";
    if (name.includes("board")) return "Board Paper";
    if (name.includes("glossy") || name.includes("photo")) return "Glossy Photo Paper";
    if (name.includes("transparent")) return "Transparent Sticker";
    if (name.includes("sticker")) return "Sticker Paper";
  
    return null;
  }  

  function isPrintPaperOrderItem(item) {
    const name = item.item_name || item.name || "";
    return (
      item.category === "Print Papers" ||
      item.category === "Picture Packages" ||
      !!item.paperType ||
      isPrintPaperItemName(name)
    );
  }
  

  // ===============================
  // GLOBAL STATE
  // ===============================
  let currentOrders = [];
  let currentInventory = [];
  let currentOrderItems = [];
  let currentAnalyticsFilter = { range: "all" };

  let revenueByCategoryChart = null;
  let orderStatusChart = null;

  const inventoryChangeLogs = {}; // in-memory session logs

  // ===============================
  // BACKEND HELPERS (ORDERS)
  // ===============================
  async function getOrdersFromBackend() {
    const data = await fetchJson(ENDPOINTS.orders);
    return data;
  }

  async function createOrderInBackend(payload) {
    const data = await postJson(ENDPOINTS.orders, {
      action: "create",
      ...payload,
    });
    return data;
  }

  async function updateOrderInBackend(id, payload) {
    const data = await postJson(ENDPOINTS.orders, {
      action: "update",
      id,
      ...payload,
    });
    return data;
  }

  async function trackOrderFromBackend(reference) {
    const data = await postJson(ENDPOINTS.orders, {
      action: "track",
      reference,
    });
    return data;
  }

  // ===============================
  // BACKEND HELPERS (INVENTORY)
  // ===============================
  async function getInventoryFromBackend() {
    const data = await fetchJson(ENDPOINTS.inventory);
    return data;
  }

  async function saveInventoryItemBackend(item) {
    const action = item.id ? "update" : "create";

    const payload = {
      action,
      id: item.id || null,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit_price: item.unit_price,
      reorder_level: item.reorder_level,
    };

    return postJson(ENDPOINTS.inventory, payload);
  }

  async function updateInventoryQuantityBackend(id, delta) {
    const payload = {
      action: "adjust_quantity",
      id,
      delta,
    };
    return postJson(ENDPOINTS.inventory, payload);
  }

  async function deleteInventoryItemBackend(id) {
    const payload = {
      action: "delete",
      id,
    };
    return postJson(ENDPOINTS.inventory, payload);
  }

  // ===============================
  // BACKEND HELPERS (ANALYTICS)
  // ===============================
  async function getAnalyticsFromBackend(params = {}) {
    // Build URL with query params
    const url = new URL(ENDPOINTS.analytics, window.location.origin);

    const range = params.range || currentAnalyticsFilter.range || "all";
    url.searchParams.set("range", range);

    if (range === "custom") {
      if (params.from) url.searchParams.set("from", params.from);
      if (params.to) url.searchParams.set("to", params.to);
    }

    return fetchJson(url.toString());
  }

  // ===============================
  // CREATE ORDER (TAB 1)
  // ===============================
  function updateOrderSummaryUI() {
    const emptyState = document.getElementById("orderSummaryEmpty");
    const wrapper = document.getElementById("orderItemsWrapper");
    const listEl = document.getElementById("orderItemsList");
    const totalEl = document.getElementById("orderTotalAmount");
    const subtotalEl = document.getElementById("orderSubtotalAmount");
    const discountInput = document.getElementById("orderDiscountInput");

    if (!listEl || !totalEl || !emptyState || !wrapper) return;

    if (currentOrderItems.length === 0) {
      emptyState.style.display = "block";
      wrapper.style.display = "none";

      if (subtotalEl) subtotalEl.textContent = formatCurrency(0);
      if (totalEl) totalEl.textContent = formatCurrency(0);
      if (discountInput) discountInput.value = "0";

      return;
    }

    emptyState.style.display = "none";
    wrapper.style.display = "block";
    listEl.innerHTML = "";

    let subtotal = 0;
    currentOrderItems.forEach((item, index) => {
      const lineTotal =
        typeof item.totalPrice === "number"
          ? item.totalPrice
          : item.price * item.quantity;
      subtotal += lineTotal;

      const isPrintPaper = isPrintPaperOrderItem(item);
      const pagesLabel =
        isPrintPaper && item.totalPages ? ` (${item.totalPages} pages)` : "";

      const row = document.createElement("div");
      row.className = "card";
      row.style.marginBottom = "0.5rem";

      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.75rem;">
          <div>
            <div style="font-weight:600; font-size:0.9rem;">${item.name}${pagesLabel}</div>
            <div style="font-size:0.8rem; color:#6b7280;">
              ${formatCurrency(item.price)} ${
        isPrintPaper && item.pages
          ? `× ${item.pages} pages × ${item.quantity} set(s)`
          : `× ${item.quantity}`
      }
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:600; margin-bottom:0.25rem;">
              ${formatCurrency(lineTotal)}
            </div>
            <button class="btn btn-sm" data-remove-index="${index}"
                    style="background:#fee2e2; color:#b91c1c;">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `;

      listEl.appendChild(row);
    });

    if (subtotalEl) {
      subtotalEl.textContent = formatCurrency(subtotal);
    }

    let discount = 0;
    if (discountInput) {
      discount = parseFloat(discountInput.value || "0") || 0;
      if (discount < 0) discount = 0;
      if (discount > subtotal) discount = subtotal;
    }

    const grandTotal = subtotal - discount;
    if (totalEl) {
      totalEl.textContent = formatCurrency(grandTotal);
    }

    listEl.querySelectorAll("[data-remove-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-remove-index"), 10);
        if (!isNaN(idx)) {
          currentOrderItems.splice(idx, 1);
          updateOrderSummaryUI();
        }
      });
    });
  }

  function buildPaperRequirements(orderItems) {
    const requirements = {}; // { "A4 Paper" or "3R Photo Paper": {needed, invItem} }
  
    orderItems.forEach((item) => {
      const category = item.category || "";
      const totalPages =
        item.totalPages ??
        (item.pages ? item.pages * item.quantity : item.quantity);
  
      if (!totalPages || totalPages <= 0) return;
  
      let paperType = null;
  
      // Picture Packages: use the selected paperType from the form
      if (category === "Picture Packages" && item.paperType) {
        paperType = item.paperType;
      } else if (isPrintPaperOrderItem(item)) {
        // Print Papers: map from item name like before
        paperType = mapItemToPaper(item.name);
      }
  
      if (!paperType) return;
  
      if (!requirements[paperType]) {
        requirements[paperType] = { needed: 0, invItem: null };
      }
      requirements[paperType].needed += totalPages;
    });
  
    Object.keys(requirements).forEach((paperType) => {
      const invItem = currentInventory.find(
        (i) => (i.name || "").toLowerCase() === paperType.toLowerCase()
      );
      requirements[paperType].invItem = invItem || null;
    });
  
    return requirements;
  }  

  function checkInventoryForOrder(orderItems) {
    const reqs = buildPaperRequirements(orderItems);
    for (const [paperType, info] of Object.entries(reqs)) {
      const { needed, invItem } = info;
      if (!invItem) {
        return {
          ok: false,
          requirements: reqs,
          message: `Cannot create order. Inventory item "${paperType}" not found.`,
        };
      }
      const available = Number(invItem.stock_quantity ?? invItem.quantity ?? 0);
      if (available < needed) {
        return {
          ok: false,
          requirements: reqs,
          message: `Cannot create order. Only ${available} sheets of ${paperType} available (need ${needed}).`,
        };
      }
    }
    return { ok: true, requirements: reqs };
  }

  async function applyInventoryDeduction(requirements) {
    for (const [paperType, info] of Object.entries(requirements)) {
      const { needed, invItem } = info;
      if (!invItem || !needed) continue;

      const available = Number(invItem.stock_quantity ?? invItem.quantity ?? 0);
      const newQty = available - needed;

      const res = await updateInventoryQuantityBackend(invItem.id, -needed);
      if (!res || res.status !== "success") {
        showToast(
          res && res.message
            ? res.message
            : `Failed to update inventory for ${paperType}.`,
          "error"
        );
        continue;
      }

      showToast(
        `Order created! Inventory updated: -${needed} ${paperType}.`,
        "success"
      );

      const threshold = Number(
        invItem.reorder_level ??
          invItem.low_stock_threshold ??
          invItem.lowStockThreshold ??
          0
      );

      if (newQty <= 0) {
        showToast(`❌ Error: ${paperType} is now out of stock!`, "error");
      } else if (threshold && newQty <= threshold) {
        showToast(`⚠️ Warning: ${paperType} is now low in stock!`, "error");
      }
    }

    await reloadInventory();
  }

  function initCreateOrderTab() {
    const categorySelect = document.getElementById("categorySelect");
    const itemSelect = document.getElementById("itemSelect");
    const pagesWrapper = document.getElementById("pagesInputWrapper");
    const pagesInput = document.getElementById("pagesInput");
    const paperTypeWrapper = document.getElementById("paperTypeWrapper");
    const paperTypeSelect = document.getElementById("paperTypeSelect");
    const quantityInput = document.getElementById("quantityInput");
    const addItemBtn = document.getElementById("addItemBtn");
    const createOrderBtn = document.getElementById("createOrderBtn");
    const customerNameInput = document.getElementById("customerNameInput");
    const discountInput = document.getElementById("orderDiscountInput");
  
    if (
      !categorySelect ||
      !itemSelect ||
      !quantityInput ||
      !addItemBtn ||
      !createOrderBtn
    ) {
      return; // not on admin.html or missing elements
    }
  
    // Update total when discount changes
    if (discountInput) {
      discountInput.addEventListener("input", () => {
        updateOrderSummaryUI();
      });
    }
  
    function validateAddItemButton() {
      const category = categorySelect.value;
      const hasItem = itemSelect.value !== "";
      const qtyValid = Number(quantityInput.value) > 0;
  
      let pagesValid = true;
      let paperValid = true;
  
      if (category === "Print Papers" || category === "Picture Packages") {
        pagesValid = Number(pagesInput.value) > 0;
      }
      if (category === "Picture Packages") {
        paperValid = paperTypeSelect.value !== "";
      }
  
      addItemBtn.disabled = !(
        category &&
        hasItem &&
        qtyValid &&
        pagesValid &&
        paperValid
      );
    }
  
    function populateItemsForCategory() {
      const category = categorySelect.value;
      itemSelect.innerHTML = `<option value="">Select item</option>`;
  
      if (!category) {
        addItemBtn.disabled = true;
        return;
      }
  
      const filtered = MENU_ITEMS.filter((m) => m.category === category);
      filtered.forEach((item, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx); // index within this filtered list
        opt.textContent = `${item.name} (${formatCurrency(item.price)})`;
        itemSelect.appendChild(opt);
      });
  
      addItemBtn.disabled = true;
    }
  
    // Category change: show/hide fields + repopulate items
    categorySelect.addEventListener("change", () => {
      const category = categorySelect.value;
  
      // Pages visible for Print Papers and Picture Packages
      if (category === "Print Papers" || category === "Picture Packages") {
        if (pagesWrapper) pagesWrapper.style.display = "block";
      } else {
        if (pagesWrapper) pagesWrapper.style.display = "none";
        if (pagesInput) pagesInput.value = "";
      }
  
      // Paper type only for Picture Packages
      if (category === "Picture Packages") {
        if (paperTypeWrapper) paperTypeWrapper.style.display = "block";
      } else {
        if (paperTypeWrapper) paperTypeWrapper.style.display = "none";
        if (paperTypeSelect) paperTypeSelect.value = "";
      }
  
      populateItemsForCategory();
      validateAddItemButton();
    });
  
    // Other input listeners for validation
    if (itemSelect) {
      itemSelect.addEventListener("change", validateAddItemButton);
    }
    if (quantityInput) {
      quantityInput.addEventListener("input", validateAddItemButton);
    }
    if (pagesInput) {
      pagesInput.addEventListener("input", validateAddItemButton);
    }
    if (paperTypeSelect) {
      paperTypeSelect.addEventListener("change", validateAddItemButton);
    }
  
    // Add Item
    addItemBtn.addEventListener("click", () => {
      const category = categorySelect.value;
      const selectedIndex = itemSelect.value;
      const qty = parseInt(quantityInput.value, 10) || 1;
  
      if (!category || selectedIndex === "" || qty <= 0) return;
  
      const filtered = MENU_ITEMS.filter((m) => m.category === category);
      const menuItem = filtered[selectedIndex];
      if (!menuItem) return;
  
      let pages = null;
      let totalPages = null;
      let totalPrice = null;
      let paperType = null;
  
      if (category === "Print Papers" || category === "Picture Packages") {
        pages = parseInt(pagesInput.value, 10) || 0;
        if (!pages || pages <= 0) {
          showToast("Please enter number of pages.", "error");
          return;
        }
        totalPages = pages * qty;
      }
  
      if (category === "Picture Packages") {
        paperType = paperTypeSelect.value || null;
        if (!paperType) {
          showToast("Please select paper type.", "error");
          return;
        }
      }
  
      if (totalPages !== null) {
        totalPrice = totalPages * menuItem.price;
      } else {
        totalPrice = menuItem.price * qty;
      }
  
      // Merge with existing same item (same category, name, pages, paperType)
      const existing = currentOrderItems.find(
        (i) =>
          i.name === menuItem.name &&
          i.category === menuItem.category &&
          (pages ? i.pages === pages : true) &&
          (paperType ? i.paperType === paperType : true)
      );
  
      if (existing) {
        existing.quantity += qty;
        if (totalPages !== null) {
          existing.totalPages = (existing.totalPages || 0) + totalPages;
        }
        existing.totalPrice += totalPrice;
      } else {
        currentOrderItems.push({
          category: menuItem.category,
          name: menuItem.name,
          price: menuItem.price,
          pages: pages || null,
          totalPages: totalPages || null,
          quantity: qty,
          totalPrice,
          paperType: paperType || null,
        });
      }
  
      updateOrderSummaryUI();
      showToast("Item added to order.", "success");
  
      // Reset only quantity (and maybe pages) if you want
      quantityInput.value = "1";
      // pagesInput.value = "";
      validateAddItemButton();
    });
  
    // Create Order
    createOrderBtn.addEventListener("click", async () => {
      const customerName = customerNameInput?.value.trim();
      if (!customerName) {
        showToast("Please enter customer name.", "error");
        return;
      }
  
      if (currentOrderItems.length === 0) {
        showToast("Add at least one item.", "error");
        return;
      }
  
      const invCheck = checkInventoryForOrder(currentOrderItems);
      if (!invCheck.ok) {
        showToast(invCheck.message, "error");
        return;
      }
  
      const subtotal = currentOrderItems.reduce((sum, item) => {
        const lineTotal =
          typeof item.totalPrice === "number"
            ? item.totalPrice
            : item.price * item.quantity;
        return sum + lineTotal;
      }, 0);
  
      let discount = 0;
      if (discountInput) {
        discount = parseFloat(discountInput.value || "0") || 0;
        if (discount < 0) discount = 0;
        if (discount > subtotal) discount = subtotal;
      }
  
      const total = subtotal - discount;
  
      const payload = {
        customer_name: customerName,
        discount,
        subtotal,
        total,
        items: currentOrderItems.map((i) => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          pages: i.pages,
          total_pages: i.totalPages,
          total_price:
            typeof i.totalPrice === "number"
              ? i.totalPrice
              : i.price * i.quantity,
          category: i.category,
          paper_type: i.paperType || null,
        })),
      };
  
      const data = await createOrderInBackend(payload);
      if (!data || data.status !== "success" || !data.order) {
        showToast(
          (data && data.message) || "Failed to create order.",
          "error"
        );
        return;
      }
  
      const order = data.order;
  
      // Deduct inventory
      await applyInventoryDeduction(invCheck.requirements);
  
      // Reset UI
      currentOrderItems = [];
      if (customerNameInput) customerNameInput.value = "";
      if (quantityInput) quantityInput.value = "1";
      if (pagesInput) pagesInput.value = "";
      if (paperTypeSelect) paperTypeSelect.value = "";
      if (categorySelect) categorySelect.value = "";
      if (itemSelect) itemSelect.innerHTML = `<option value="">Select item</option>`;
      if (addItemBtn) addItemBtn.disabled = true;
      if (discountInput) discountInput.value = "0";
      if (pagesWrapper) pagesWrapper.style.display = "none";
      if (paperTypeWrapper) paperTypeWrapper.style.display = "none";
  
      updateOrderSummaryUI();
  
      showToast(`Order ${order.id} created successfully!`, "success");
  
      await reloadOrders();
  
      const ordersTabButton = document.querySelector(
        '.tab-button[data-tab="tab-orders"]'
      );
      if (ordersTabButton) {
        ordersTabButton.click();
      }
    });
  }  

  // ===============================
  // ORDERS LIST (TAB 2)
  // ===============================
  function renderOrdersList() {
    const listEl = document.getElementById("ordersList");
    const filterSelect = document.getElementById("orderFilter");
    if (!listEl || !filterSelect) return;

    const filter = filterSelect.value || "all";
    listEl.innerHTML = "";

    const filtered = currentOrders.filter((o) => {
      if (filter === "all") return true;
      return (o.status || "").toLowerCase() === filter;
    });

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "card";
      empty.innerHTML = `<p style="font-size:0.85rem;">No orders found.</p>`;
      listEl.appendChild(empty);
      return;
    }

    filtered.forEach((order) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.marginBottom = "0.75rem";

      const statusMeta = getStatusMeta(order.status);
      const statusColor =
        STATUS_BADGE_COLORS[statusMeta.currentStatus] || "#6b7280";

      const payStatus = (order.payment_status || "unpaid").toLowerCase();
      let paymentColor = "#f97316";
      if (payStatus === "paid") paymentColor = "#16a34a";
      else if (payStatus === "partial") paymentColor = "#0ea5e9";

      const date = new Date(order.created_at || order.date);
      const prettyDate = isNaN(date.getTime())
        ? order.created_at || order.date
        : date.toLocaleString();

      const itemsHtml = (order.items || [])
        .map((it) => {
          const totalPrice =
            it.line_total ??
            it.total_price ??
            it.totalPrice ??
            Number(it.unit_price || it.price || 0) * (it.quantity || 0);
          const pages = it.total_pages ?? it.totalPages ?? it.pages ?? null;
          const labelExtra = pages ? ` (${pages} pages)` : "";
          return `<li style="font-size:0.8rem;">
            ${(it.item_name || it.name)}${labelExtra} × ${it.quantity}
            - ${formatCurrency(totalPrice)}
          </li>`;
        })
        .join("");

      const ref = order.reference || order.id;

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem;">
          <div>
            <div style="font-weight:700; font-size:0.95rem; color:#ec4899;">${ref}</div>
            <div style="font-size:0.85rem; color:#374151;">${order.customer_name}</div>
            <div style="font-size:0.75rem; color:#6b7280;">${prettyDate}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700; font-size:1rem;">
              ${formatCurrency(order.total_amount || order.total)}
            </div>
            <div style="margin-top:0.35rem;">
              <span style="
                display:inline-block;
                font-size:0.7rem;
                padding:0.15rem 0.5rem;
                border-radius:999px;
                background:${statusColor}20;
                color:${statusColor};
                margin-bottom:0.15rem;">
                ${statusMeta.flowEntry.label}
              </span>
              <br>
              <span style="
                display:inline-block;
                font-size:0.7rem;
                padding:0.15rem 0.5rem;
                border-radius:999px;
                background:${paymentColor}20;
                color:${paymentColor};">
                ${order.payment_status || "unpaid"}
              </span>
            </div>
          </div>
        </div>

        <div style="margin-top:0.75rem; background:rgba(236,72,153,0.03); border-radius:0.75rem; padding:0.5rem 0.75rem;">
          <div style="font-size:0.8rem; font-weight:600; margin-bottom:0.25rem;">Order Items:</div>
          <ul style="margin:0; padding-left:1.1rem;">
            ${itemsHtml}
          </ul>
        </div>

        <div style="margin-top:0.75rem; display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center; justify-content:space-between;">
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; font-size:0.8rem;">
            <label>Status:
            <select class="select order-status-select" data-order-id="${order.id}">
              <option value="pending"      ${
                statusMeta.currentStatus === "pending" ? "selected" : ""
              }>Pending</option>
              <option value="in_progress"  ${
                statusMeta.currentStatus === "in_progress" ? "selected" : ""
              }>In Progress</option>
              <option value="completed"    ${
                statusMeta.currentStatus === "completed" ? "selected" : ""
              }>Completed</option>
              <option value="cancelled"    ${
                statusMeta.currentStatus === "cancelled" ? "selected" : ""
              }>Cancelled</option>
            </select>
            </label>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; font-size:0.8rem;">
            <label>Payment:
              <select class="select order-payment-select" data-order-id="${order.id}">
                <option value="unpaid" ${
                  payStatus === "unpaid" ? "selected" : ""
                }>Unpaid</option>
                <option value="partial" ${
                  payStatus === "partial" ? "selected" : ""
                }>Partial</option>
                <option value="paid"   ${
                  payStatus === "paid" ? "selected" : ""
                }>Paid</option>
              </select>
            </label>
          </div>
        </div>
      `;

      listEl.appendChild(card);
    });

    listEl.querySelectorAll(".order-status-select").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const id = sel.getAttribute("data-order-id");
        const newStatus = sel.value;

        const data = await updateOrderInBackend(id, { status: newStatus });
        if (!data || data.status !== "success") {
          showToast("Failed to update order status.", "error");
          return;
        }
        showToast(`Order ${id} status updated.`, "success");
        await reloadOrders();
      });
    });

    listEl.querySelectorAll(".order-payment-select").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const id = sel.getAttribute("data-order-id");
        const newPayment = sel.value;

        const data = await updateOrderInBackend(id, {
          payment_status: newPayment,
        });
        if (!data || data.status !== "success") {
          showToast("Failed to update payment status.", "error");
          return;
        }
        showToast(`Order ${id} payment updated.`, "success");
        await reloadOrders();
      });
    });
  }

  // ===============================
  // ANALYTICS (TAB 3) – from backend analytics.php
  // ===============================
  async function updateAnalytics(params) {
    const statTotalRevenue = document.getElementById("statTotalRevenue");
    const statTotalOrders = document.getElementById("statTotalOrders");
    const statPendingPayments = document.getElementById("statPendingPayments");
    const statCustomers = document.getElementById("statCustomers");
    const activeLabelEl = document.getElementById("analyticsActiveLabel");

    if (
      !statTotalRevenue ||
      !statTotalOrders ||
      !statPendingPayments ||
      !statCustomers
    ) {
      return;
    }

    // Update global filter state if new params provided
    if (params) {
      currentAnalyticsFilter = {
        ...currentAnalyticsFilter,
        ...params,
      };
    }

    const data = await getAnalyticsFromBackend(currentAnalyticsFilter);
    if (!data || data.status !== "success" || !data.analytics) {
      console.error("Failed to load backend analytics:", data);
      return;
    }

    const {
      totalRevenue,
      totalOrders,
      pendingPayments,
      customers,
      statusCounts,
      categoryTotals,
    } = data.analytics;

    // Top stats
    statTotalRevenue.textContent = formatCurrency(totalRevenue || 0);
    statTotalOrders.textContent = String(totalOrders || 0);
    statPendingPayments.textContent = formatCurrency(pendingPayments || 0);
    statCustomers.textContent = String(customers || 0);

    // Active label (meta from backend)
    if (activeLabelEl && data.meta) {
      activeLabelEl.textContent =
        data.meta.label || `Showing: ${currentAnalyticsFilter.range || "all"}`;
    }

    // Charts via Chart.js
    if (typeof Chart !== "undefined") {
      const ctx1 = document.getElementById("revenueByCategoryChart");
      const ctx2 = document.getElementById("orderStatusChart");

      // --- Revenue by Category ---
      if (ctx1 && categoryTotals) {
        const catLabels = Object.keys(categoryTotals);
        const catValues = Object.values(categoryTotals);

        if (revenueByCategoryChart) {
          revenueByCategoryChart.destroy();
        }
        revenueByCategoryChart = new Chart(ctx1, {
          type: "bar",
          data: {
            labels: catLabels,
            datasets: [
              {
                label: "Revenue",
                data: catValues,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: { beginAtZero: true },
            },
          },
        });
      }

      // --- Order Status Distribution ---
      if (ctx2 && statusCounts) {
        if (orderStatusChart) {
          orderStatusChart.destroy();
        }

        const labels = ["pending", "in_progress", "completed", "cancelled"];
        const values = labels.map((key) => statusCounts[key] || 0);

        orderStatusChart = new Chart(ctx2, {
          type: "doughnut",
          data: {
            labels: ["Pending", "In Progress", "Completed", "Cancelled"],
            datasets: [
              {
                data: values,
              },
            ],
          },
          options: {
            responsive: true,
          },
        });
      }
    }
  }

  // ===============================
  // INVENTORY (TAB 4)
  // ===============================
  function updateInventoryLogElement(itemId) {
    const el = document.getElementById(`invLog-${itemId}`);
    if (!el) return;
    const logs = inventoryChangeLogs[itemId] || [];
    if (!logs.length) {
      el.innerHTML =
        '<span style="font-size:0.75rem; color:#9ca3af;">No recent changes in this session.</span>';
      return;
    }
    const last = logs.slice(-5).reverse();
    el.innerHTML =
      '<strong style="font-size:0.8rem;">Recent Changes:</strong><br>' +
      last
        .map(
          (line) =>
            `<div style="font-size:0.75rem; color:#4b5563;">${line}</div>`
        )
        .join("");
  }

  const inventoryForm = {
    card: null,
    titleEl: null,
    nameInput: null,
    categoryInput: null,
    qtyInput: null,
    unitPriceInput: null,
    reorderInput: null,
    idInput: null,
    saveBtn: null,
    cancelBtn: null,

    init() {
      this.card = document.getElementById("inventoryFormCard");
      if (!this.card) return;
      this.titleEl = document.getElementById("inventoryFormTitle");
      this.nameInput = document.getElementById("invNameInput");
      this.categoryInput = document.getElementById("invCategoryInput");
      this.qtyInput = document.getElementById("invQtyInput");
      this.unitPriceInput = document.getElementById("invUnitPriceInput");
      this.reorderInput = document.getElementById("invReorderInput");
      this.idInput = document.getElementById("invIdInput");
      this.saveBtn = document.getElementById("invSaveBtn");
      this.cancelBtn = document.getElementById("invCancelBtn");

      if (this.cancelBtn) {
        this.cancelBtn.addEventListener("click", () => this.hide());
      }
      if (this.saveBtn) {
        this.saveBtn.addEventListener("click", () => this.save());
      }
    },

    show() {
      if (this.card) this.card.style.display = "block";
    },
    hide() {
      if (this.card) this.card.style.display = "none";
    },
    openForCreate() {
      if (!this.card) return;
      this.titleEl.textContent = "Add Product";
      this.nameInput.value = "";
      this.categoryInput.value = "";
      this.qtyInput.value = "0";
      this.unitPriceInput.value = "0";
      this.reorderInput.value = "0";
      this.idInput.value = "";
      this.show();
    },
    openForEdit(item) {
      if (!this.card || !item) return;
      this.titleEl.textContent = "Edit Product";
      this.nameInput.value = item.name || "";
      this.categoryInput.value = item.category || "";
      this.qtyInput.value = item.stock_quantity ?? item.quantity ?? 0;
      this.unitPriceInput.value = item.unit_price ?? item.price ?? 0;
      this.reorderInput.value =
        item.reorder_level ??
        item.low_stock_threshold ??
        item.lowStockThreshold ??
        0;
      this.idInput.value = item.id;
      this.show();
    },
    async save() {
      const name = this.nameInput.value.trim();
      const category = this.categoryInput.value.trim();
      const qty = parseInt(this.qtyInput.value || "0", 10) || 0;
      const unitPrice =
        parseFloat(this.unitPriceInput.value || "0") || 0;
      const reorder =
        parseInt(this.reorderInput.value || "0", 10) || 0;
      const id = this.idInput.value;

      if (!name || !category) {
        showToast("Name and category are required.", "error");
        return;
      }

      const payload = {
        id: id || null,
        name,
        category,
        quantity: qty,
        unit_price: unitPrice,
        reorder_level: reorder,
      };

      const res = await saveInventoryItemBackend(payload);
      if (!res || res.status !== "success") {
        showToast(
          res && res.message
            ? res.message
            : "Failed to save inventory item.",
          "error"
        );
        return;
      }
      showToast("Inventory item saved.", "success");
      this.hide();
      await reloadInventory();
    },
  };

  function renderInventory() {
    const container = document.getElementById("inventoryContainer");
    const lowStockSubtitle = document.getElementById("lowStockSubtitle");
    const lowStockList = document.getElementById("lowStockList");
    if (!container || !lowStockSubtitle || !lowStockList) return;

    const items = currentInventory || [];
    container.innerHTML = "";
    lowStockList.innerHTML = "";

    const byCategory = {};
    items.forEach((item) => {
      const cat = item.category || "General";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    });

    const categories = Object.keys(byCategory);
    categories.forEach((cat) => {
      const block = document.createElement("div");
      block.style.marginBottom = "1.5rem";

      const header = document.createElement("h3");
      header.textContent = cat;
      header.style.fontSize = "1rem";
      header.style.marginBottom = "0.5rem";
      block.appendChild(header);

      const grid = document.createElement("div");
      grid.className = "grid-3";
      block.appendChild(grid);

      byCategory[cat].forEach((item) => {
        const threshold = Number(
          item.reorder_level ??
            item.low_stock_threshold ??
            item.lowStockThreshold ??
            0
        );
        const qty = Number(
          item.stock_quantity ?? item.quantity ?? 0
        );
        const isLow = threshold > 0 && qty <= threshold;

        const price = Number(item.unit_price ?? item.price ?? 0);

        const card = document.createElement("div");
        card.className = "card";
        card.style.marginBottom = "0.75rem";

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
            <div>
              <div style="font-weight:600; font-size:0.9rem;">${item.name}</div>
              <div style="font-size:0.8rem; color:#6b7280;">
                Current: ${qty} sheets
              </div>
              <div style="font-size:0.8rem; color:#6b7280;">
                Price: ${formatCurrency(price)}
              </div>
              ${
                threshold > 0
                  ? `<div style="font-size:0.75rem; color:#9ca3af;">Reorder at ≤ ${threshold}</div>`
                  : ""
              }
            </div>
            <div style="text-align:right;">
              ${
                isLow
                  ? `<span style="display:inline-block; font-size:0.7rem; padding:0.15rem 0.5rem; border-radius:999px; background:rgba(245,158,11,0.2); color:#b45309;">
                      Low Stock
                    </span>`
                  : ""
              }
            </div>
          </div>

          <!-- Adjust Quantity -->
          <div style="margin-top:0.6rem; display:flex; flex-direction:column; gap:0.45rem;">
            <div style="display:flex; gap:0.45rem; align-items:center; flex-wrap:wrap;">
              <input
                type="number"
                class="input"
                style="flex:1; min-width:110px;"
                placeholder="Enter amount"
                data-adjust-input="${item.id}"
              />
              <button class="btn btn-light"
                      data-adjust-id="${item.id}"
                      data-action="add">
                ADD
              </button>
              <button class="btn btn-light"
                      style="background:#fee2e2; color:#b91c1c;"
                      data-adjust-id="${item.id}"
                      data-action="deduct">
                DEDUCT
              </button>
            </div>

            <select class="select" data-reason-id="${item.id}" style="max-width:100%;">
              <option value="">Reason (optional)</option>
              <option value="Paper crash/damaged">Paper crash/damaged</option>
              <option value="Paper loss">Paper loss</option>
              <option value="Used for testing">Used for testing</option>
              <option value="Inventory correction">Inventory correction</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <!-- Quick adjust + Edit/Delete -->
          <div style="margin-top:0.6rem; display:flex; flex-wrap:wrap; gap:0.4rem; align-items:center;">
            <button class="btn btn-light"
                    data-quick-id="${item.id}"
                    data-quick-delta="-10">
              -10
            </button>
            <button class="btn btn-light"
                    data-quick-id="${item.id}"
                    data-quick-delta="10">
              +10
            </button>
            <button class="btn btn-light" data-edit-id="${item.id}">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button class="btn btn-light"
                    data-delete-id="${item.id}"
                    style="background:#fee2e2; color:#b91c1c;">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
          </div>

          <div id="invLog-${item.id}" style="margin-top:0.6rem;"></div>
        `;

        grid.appendChild(card);
        updateInventoryLogElement(item.id);
      });

      container.appendChild(block);
    });

    const lowItems = items.filter((i) => {
      const threshold = Number(
        i.reorder_level ??
          i.low_stock_threshold ??
          i.lowStockThreshold ??
          0
      );
      const qty = Number(
        i.stock_quantity ?? i.quantity ?? 0
      );
      return threshold > 0 && qty <= threshold;
    });

    if (lowItems.length === 0) {
      lowStockSubtitle.textContent =
        "All items are above the low stock threshold.";
    } else {
      lowStockSubtitle.textContent = `${lowItems.length} item(s) running low on stock.`;
      lowItems.forEach((i) => {
        const tag = document.createElement("span");
        tag.textContent = i.name;
        tag.style.fontSize = "0.75rem";
        tag.style.padding = "0.15rem 0.6rem";
        tag.style.borderRadius = "999px";
        tag.style.background = "rgba(245,158,11,0.15)";
        tag.style.color = "#b45309";
        lowStockList.appendChild(tag);
      });
    }

    container.onclick = async (e) => {
      const adjustBtn = e.target.closest("button[data-adjust-id]");
      if (adjustBtn) {
        const id = adjustBtn.getAttribute("data-adjust-id");
        const action = adjustBtn.getAttribute("data-action");
        const input = container.querySelector(
          `input[data-adjust-input="${id}"]`
        );
        const reasonSelect = container.querySelector(
          `select[data-reason-id="${id}"]`
        );
        const amount = parseInt(input?.value || "0", 10) || 0;
        if (!amount || amount <= 0) {
          showToast("Enter a quantity to adjust.", "error");
          return;
        }
        const delta = action === "deduct" ? -amount : amount;
        const res = await updateInventoryQuantityBackend(id, delta);
        if (!res || res.status !== "success") {
          showToast(
            res && res.message
              ? res.message
              : "Failed to update inventory.",
            "error"
          );
          return;
        }

        const reason = reasonSelect?.value || "";
        const stamp = new Date().toLocaleString();
        const line = `${stamp}: ${
          delta > 0 ? "+" : ""
        }${delta} sheets${reason ? ` (${reason})` : ""}`;
        if (!inventoryChangeLogs[id]) inventoryChangeLogs[id] = [];
        inventoryChangeLogs[id].push(line);

        showToast("Inventory updated.", "success");
        await reloadInventory();
        return;
      }

      const quickBtn = e.target.closest("button[data-quick-id]");
      if (quickBtn) {
        const id = quickBtn.getAttribute("data-quick-id");
        const delta =
          parseInt(quickBtn.getAttribute("data-quick-delta"), 10) || 0;
        const res = await updateInventoryQuantityBackend(id, delta);
        if (!res || res.status !== "success") {
          showToast(
            res && res.message
              ? res.message
              : "Failed to update inventory.",
            "error"
          );
          return;
        }
        const stamp = new Date().toLocaleString();
        const line = `${stamp}: ${
          delta > 0 ? "+" : ""
        }${delta} sheets (quick adjust)`;
        if (!inventoryChangeLogs[id]) inventoryChangeLogs[id] = [];
        inventoryChangeLogs[id].push(line);

        showToast("Inventory updated.", "success");
        await reloadInventory();
        return;
      }

      const editBtn = e.target.closest("button[data-edit-id]");
      if (editBtn) {
        const id = editBtn.getAttribute("data-edit-id");
        const item = currentInventory.find(
          (it) => String(it.id) === String(id)
        );
        if (item && inventoryForm.openForEdit) {
          inventoryForm.openForEdit(item);
        }
        return;
      }

      const deleteBtn = e.target.closest("button[data-delete-id]");
      if (deleteBtn) {
        const id = deleteBtn.getAttribute("data-delete-id");
        if (!confirm("Are you sure you want to delete this product?")) {
          return;
        }
        const data = await deleteInventoryItemBackend(id);
        if (!data || data.status !== "success") {
          showToast(
            data && data.message
              ? data.message
              : "Failed to delete product.",
            "error"
          );
          return;
        }
        showToast("Product deleted.", "success");
        await reloadInventory();
      }
    };
  }

  // Inventory tab init (Add Product button)
  function initInventoryTab() {
    const addBtn = document.getElementById("btnAddProduct");
    if (!addBtn) return;
    addBtn.addEventListener("click", () => {
      inventoryForm.openForCreate();
    });
  }

  // ===============================
  // REPORTS (TAB 5) – client-side
  // ===============================
  function updateReports() {
    const todayOrdersEl = document.getElementById("repTodayOrders");
    const todayRevEl = document.getElementById("repTodayRevenue");
    const weekOrdersEl = document.getElementById("repWeekOrders");
    const weekRevEl = document.getElementById("repWeekRevenue");
    const monthOrdersEl = document.getElementById("repMonthOrders");
    const monthRevEl = document.getElementById("repMonthRevenue");

    const repTotalPaidEl = document.getElementById("repTotalPaid");
    const repPendingAmountEl = document.getElementById("repPendingAmount");
    const repTotalExpectedEl = document.getElementById("repTotalExpected");
    const repPaidPendingTextEl = document.getElementById(
      "repPaidPendingText"
    );

    const topServicesListEl = document.getElementById("topServicesList");

    if (
      !todayOrdersEl ||
      !todayRevEl ||
      !weekOrdersEl ||
      !weekRevEl ||
      !monthOrdersEl ||
      !monthRevEl ||
      !repTotalPaidEl ||
      !repPendingAmountEl ||
      !repTotalExpectedEl ||
      !repPaidPendingTextEl
    ) {
      return;
    }

    const orders = currentOrders || [];
    const now = new Date();

    let todayOrders = 0,
      todayRevenue = 0;
    let weekOrders = 0,
      weekRevenue = 0;
    let monthOrders = 0,
      monthRevenue = 0;

    let totalPaid = 0;
    let totalPending = 0;
    let paidCount = 0;
    let pendingCount = 0;

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ---------- MAIN STATS ----------
    orders.forEach((o) => {
      const d = new Date(o.created_at || o.date || now);
      const amount = Number(o.total_amount || o.total || 0) || 0;
      const paymentStatus = (o.payment_status || "").toLowerCase();

      if (paymentStatus === "paid") {
        totalPaid += amount;
        paidCount++;
      } else {
        totalPending += amount;
        pendingCount++;
      }

      if (d >= startOfToday) {
        todayOrders++;
        todayRevenue += amount;
      }
      if (d >= startOfWeek) {
        weekOrders++;
        weekRevenue += amount;
      }
      if (d >= startOfMonth) {
        monthOrders++;
        monthRevenue += amount;
      }
    });

    todayOrdersEl.textContent = String(todayOrders);
    todayRevEl.textContent = formatCurrency(todayRevenue);
    weekOrdersEl.textContent = String(weekOrders);
    weekRevEl.textContent = formatCurrency(weekRevenue);
    monthOrdersEl.textContent = String(monthOrders);
    monthRevEl.textContent = formatCurrency(monthRevenue);

    repTotalPaidEl.textContent = formatCurrency(totalPaid);
    repPendingAmountEl.textContent = formatCurrency(totalPending);
    repTotalExpectedEl.textContent = formatCurrency(
      totalPaid + totalPending
    );
    repPaidPendingTextEl.textContent = `${paidCount} paid orders, ${pendingCount} pending.`;

    // ---------- TOP SERVICES ----------
    if (!topServicesListEl) return;

    const itemStats = {}; // { "Service Name": { name, qty, revenue } }

    orders.forEach((o) => {
      const items = o.items || [];
      items.forEach((it) => {
        const name = (it.item_name || it.name || "Unknown").trim();
        if (!name) return;

        const qty = Number(it.quantity || 0) || 0;
        const lineTotal =
          it.line_total ??
          it.total_price ??
          it.totalPrice ??
          Number(it.unit_price || it.price || 0) * (it.quantity || 0);

        if (!itemStats[name]) {
          itemStats[name] = { name, qty: 0, revenue: 0 };
        }
        itemStats[name].qty += qty;
        itemStats[name].revenue += Number(lineTotal || 0);
      });
    });

    const topItems = Object.values(itemStats)
      .sort((a, b) => {
        if (b.qty !== a.qty) return b.qty - a.qty;
        return b.revenue - a.revenue;
      })
      .slice(0, 5);

    if (!topItems.length) {
      topServicesListEl.innerHTML =
        '<p style="font-size:0.8rem; color:#6b7280;">No orders yet.</p>';
      return;
    }

    topServicesListEl.innerHTML = topItems
      .map(
        (item) => `
          <div
            style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              padding:0.5rem 0;
              border-bottom:1px dashed rgba(148,163,184,0.4);
              font-size:0.85rem;
            "
          >
            <div>
              <div style="font-weight:600;">${item.name}</div>
              <div style="font-size:0.75rem; color:#6b7280;">
                ${item.qty}x ordered
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:0.75rem; color:#6b7280;">Revenue</div>
              <div style="font-weight:600; color:#ec4899;">
                ${formatCurrency(item.revenue)}
              </div>
            </div>
          </div>
        `
      )
      .join("");
  }

  function csvEscape(value) {
    const s = String(value ?? "");
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function filterOrdersByRange(range) {
    const orders = currentOrders || [];
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let start;
    if (range === "daily") start = startOfToday;
    else if (range === "weekly") start = startOfWeek;
    else if (range === "monthly") start = startOfMonth;
    else if (range === "yearly") start = startOfYear;
    else start = startOfToday;

    return orders.filter((o) => {
      const d = new Date(o.created_at || o.date || now);
      return d >= start;
    });
  }

  function buildOrdersCsv(orders, rangeLabel) {
    const lines = [];

    lines.push(
      csvEscape("Report Type") + "," + csvEscape(rangeLabel || "Custom")
    );
    lines.push(
      csvEscape("Generated At") +
        "," +
        csvEscape(new Date().toLocaleString())
    );
    lines.push(""); // empty line

    const header = [
      "Order ID",
      "Customer",
      "Date",
      "Status",
      "Payment Status",
      "Item",
      "Quantity",
      "Unit Price",
      "Line Total",
    ]
      .map(csvEscape)
      .join(",");
    lines.push(header);

    orders.forEach((o) => {
      const ref = o.reference || o.id;
      const d = new Date(o.created_at || o.date || "");
      const dateStr = isNaN(d.getTime())
        ? (o.created_at || o.date || "")
        : d.toLocaleString();

      const status = o.status || "";
      const paymentStatus = o.payment_status || "";

      const items = o.items && o.items.length ? o.items : [
        {
          item_name: "",
          quantity: "",
          unit_price: "",
          line_total: o.total_amount || o.total || "",
        },
      ];

      items.forEach((it) => {
        const itemName = it.item_name || it.name || "";
        const qty = it.quantity ?? "";
        const unitPrice =
          it.unit_price ?? it.price ?? "";
        const lineTotal =
          it.line_total ??
          it.total_price ??
          it.totalPrice ??
          (Number(unitPrice || 0) * Number(qty || 0));

        const row = [
          ref,
          o.customer_name || "",
          dateStr,
          status,
          paymentStatus,
          itemName,
          qty,
          unitPrice,
          lineTotal,
        ]
          .map(csvEscape)
          .join(",");
        lines.push(row);
      });
    });

    return lines.join("\r\n");
  }

  function downloadCsv(filename, csvContent) {
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function initReportsTab() {
    const dailyBtn = document.getElementById("btnDailyReport");
    const weeklyBtn = document.getElementById("btnWeeklyReport");
    const monthlyBtn = document.getElementById("btnMonthlyReport");
    if (!dailyBtn && !weeklyBtn && !monthlyBtn) return;

    const makeHandler = (range, label) => async () => {
      if (!currentOrders || !currentOrders.length) {
        showToast("No orders to export yet.", "warning");
        return;
      }
      const filtered = filterOrdersByRange(range);
      if (!filtered.length) {
        showToast(`No ${label.toLowerCase()} orders found.`, "warning");
        return;
      }
      const csv = buildOrdersCsv(filtered, label);
      const filename = `spybugs-${range}-report.csv`;
      downloadCsv(filename, csv);
      showToast(`${label} report downloaded.`, "success");
    };

    if (dailyBtn) {
      dailyBtn.addEventListener("click", makeHandler("daily", "Daily"));
    }
    if (weeklyBtn) {
      weeklyBtn.addEventListener("click", makeHandler("weekly", "Weekly"));
    }
    if (monthlyBtn) {
      monthlyBtn.addEventListener("click", makeHandler("monthly", "Monthly"));
    }
  }

  // ===============================
  // ORDER TRACKING (order.html)
  // ===============================
  function initOrderTracking() {
    const trackInput = document.getElementById("trackRef");
    const resultCard = document.getElementById("orderTrackingResult");
    const timelineEl = document.getElementById("orderTimeline");
    const statusMsgEl = document.getElementById("orderStatusMessage");
    const receiptArea = document.getElementById("receiptPrintArea");
    const printBtn = document.getElementById("printReceiptBtn");

    if (!trackInput) return; // not on order.html

    function renderTimeline(order) {
      const statusMeta = getStatusMeta(order.status);
      const currentIdx = statusMeta.currentIndex;
      const steps = ORDER_STATUS_FLOW;
      const stepCount = steps.length;

      const progressPercent =
        statusMeta.currentStatus === "cancelled"
          ? 0
          : (currentIdx / (stepCount - 1)) * 100;

      let stepsHtml = "";
      steps.forEach((step, idx) => {
        let cls = "tl-step-upcoming";
        if (idx < currentIdx) cls = "tl-step-completed";
        else if (idx === currentIdx) cls = "tl-step-current";

        stepsHtml += `
          <div class="tl-step ${cls}">
            <div class="tl-icon">${step.icon}</div>
            <div class="tl-label">${step.label}</div>
          </div>
        `;
      });

      timelineEl.innerHTML = `
        <div class="order-timeline-progress">
          <div class="order-timeline-progress-bar" style="width:${progressPercent}%;"></div>
        </div>
        <div class="order-timeline-steps">
          ${stepsHtml}
        </div>
      `;

      statusMsgEl.textContent = statusMeta.message;
    }

    function renderReceipt(order) {
      const ref = order.reference || order.id;
      const date = new Date(order.created_at || order.date);
      const prettyDate = isNaN(date.getTime())
        ? order.created_at || order.date
        : date.toLocaleString();

      const statusMeta = getStatusMeta(order.status);
      const badgeColor =
        STATUS_BADGE_COLORS[statusMeta.currentStatus] || "#6b7280";

      const items = order.items || [];
      let subtotal = 0;

      const itemsRows = items
        .map((it) => {
          const totalPrice =
            it.line_total ??
            it.total_price ??
            it.totalPrice ??
            Number(it.unit_price || it.price || 0) *
              (it.quantity || 0);
          subtotal += totalPrice;
          const pages =
            it.total_pages ?? it.totalPages ?? it.pages ?? null;
          const nameExtra = pages ? ` (${pages} pages)` : "";
          return `
            <tr>
              <td>${it.item_name || it.name}${nameExtra}</td>
              <td class="align-right">${it.quantity}</td>
              <td class="align-right">${formatCurrency(
                it.unit_price || it.price || totalPrice
              )}</td>
              <td class="align-right">${formatCurrency(totalPrice)}</td>
            </tr>
          `;
        })
        .join("");

      const discount = Number(order.discount || 0);
      const totalAmount =
        Number(order.total_amount || order.total || subtotal) ||
        subtotal;

      const paymentStatus = (order.payment_status || "unpaid").toUpperCase();

      receiptArea.innerHTML = `
        <div class="receipt-header">
          <div class="receipt-title">ORDER RECEIPT</div>
        </div>

        <div class="receipt-body">
          <div class="receipt-business">
            <strong>SPYBUGS PRINTING SHOP</strong><br/>
            A. Delas Alas Street, Taal Batangas<br/>
            Contact: 0995-512-2521<br/>
            Email: jeremitorrano@yahoo.com
          </div>

          <hr class="receipt-divider" />

          <div class="receipt-meta">
            <div>
              <div><strong>Order ID:</strong> ${ref}</div>
              <div><strong>Customer:</strong> ${order.customer_name}</div>
              <div><strong>Date:</strong> ${prettyDate}</div>
            </div>
            <div style="text-align:right;">
              <div><strong>Status:</strong></div>
              <span class="status-badge"
                    style="background:${badgeColor}20; color:${badgeColor};">
                ${statusMeta.flowEntry.label}
              </span>
            </div>
          </div>

          <hr class="receipt-divider" />

          <table class="receipt-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="align-right">Qty</th>
                <th class="align-right">Price</th>
                <th class="align-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${
                itemsRows ||
                `<tr><td colspan="4" class="align-center">No items.</td></tr>`
              }
            </tbody>
          </table>

          <hr class="receipt-divider thick" />

          <div class="receipt-summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            <div class="summary-row">
              <span>Discount:</span>
              <span>- ${formatCurrency(discount)}</span>
            </div>
            <div class="summary-row total">
              <span>TOTAL AMOUNT:</span>
              <span>${formatCurrency(totalAmount)}</span>
            </div>
            <div class="summary-row">
              <span>Payment Status:</span>
              <span>${paymentStatus}</span>
            </div>
          </div>

          <div class="receipt-footer">
            Thank you for your business!
          </div>
        </div>
      `;
    }

    async function doTrack() {
      const ref = trackInput.value.trim().toUpperCase();
      if (!ref) {
        alert("Please enter your reference number.");
        return;
      }

      const data = await trackOrderFromBackend(ref);
      if (!data || data.status !== "success" || !data.order) {
        alert(
          (data && data.message) ||
            "Order not found. Please check your reference number."
        );
        if (resultCard) resultCard.style.display = "none";
        return;
      }

      const order = data.order;
      resultCard.style.display = "block";
      renderTimeline(order);
      renderReceipt(order);
    }

    window.trackOrder = doTrack;

    trackInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doTrack();
      }
    });

    if (printBtn) {
      printBtn.addEventListener("click", () => {
        window.print();
      });
    }
  }

  // ===============================
  // AUTH + DASHBOARD INIT (admin.html)
  // ===============================
  async function reloadOrders() {
    const data = await getOrdersFromBackend();
    if (!data || data.status !== "success") {
      console.error("Failed to load orders:", data);
      return;
    }
    currentOrders = data.orders || [];
    renderOrdersList();
    updateAnalytics();
    updateReports();
  }

  async function reloadInventory() {
    const data = await getInventoryFromBackend();
    if (!data || data.status !== "success") {
      console.error("Failed to load inventory:", data);
      return;
    }
    currentInventory = data.inventory || [];
    renderInventory();
  }

  function initTabs() {
    const nav = document.getElementById("posTabNav");
    if (!nav) return;
    const buttons = nav.querySelectorAll(".tab-button");
    const panels = document.querySelectorAll(".tab-panel");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabId = btn.getAttribute("data-tab");
        buttons.forEach((b) => b.classList.remove("tab-button--active"));
        panels.forEach((p) => p.classList.remove("tab-panel--active"));

        btn.classList.add("tab-button--active");
        const activePanel = document.getElementById(tabId);
        if (activePanel) activePanel.classList.add("tab-panel--active");
      });
    });
  }

  function initAuthAndDashboard() {
    const loginScreen = document.getElementById("login-screen");
    const dashboard = document.getElementById("dashboard");
    const loginForm = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const loginError = document.getElementById("loginError");
    const logoutBtn = document.getElementById("logoutBtn");
    const forgotPasswordLink = document.getElementById("forgotPasswordLink");

    if (!loginForm || !loginScreen || !dashboard) return; // not on admin.html

    function showDashboard() {
      loginScreen.style.display = "none";
      dashboard.style.display = "block";
    }

    function showLogin() {
      loginScreen.style.display = "flex";
      dashboard.style.display = "none";
    }

    const savedSession = sessionStorage.getItem("spybugsAdminLoggedIn");
    if (savedSession === "1") {
      showDashboard();
      initTabs();
      inventoryForm.init();
      initAnalyticsFilters();
      initInventoryTab();
      initCreateOrderTab();
      initReportsTab(); 
      reloadOrders();
      reloadInventory();
      updateAnalytics();
    } else {
      showLogin();
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (loginError) {
        loginError.style.display = "none";
      }

      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();

      if (!username || !password) {
        if (loginError) {
          loginError.textContent = "Please enter username and password.";
          loginError.style.display = "block";
        }
        return;
      }

      const data = await postJson(ENDPOINTS.login, {
        username,
        password,
      });

      if (!data || data.status !== "success") {
        const msg = data && data.message ? data.message : "Login failed.";
        if (loginError) {
          loginError.textContent = msg;
          loginError.style.display = "block";
        }
        showToast(msg, "error");
        return;
      }

      sessionStorage.setItem("spybugsAdminLoggedIn", "1");
      showDashboard();
      initTabs();
      inventoryForm.init();
      initAnalyticsFilters();
      initInventoryTab();
      initCreateOrderTab();
      initReportsTab();
      reloadOrders();
      reloadInventory();
      updateAnalytics(); 
      showToast("Logged in successfully.", "success");
    });

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem("spybugsAdminLoggedIn");
        showLogin();
      });
    }

    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener("click", async (e) => {
        e.preventDefault();

        const email = prompt("Enter your admin email to reset your password:");
        if (!email) return;

        try {
          const res = await fetch(API_BASE + "password_reset/request_reset.php", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
          });

          const data = await res.json().catch(() => null);

          if (!res.ok || !data) {
            showToast("Failed to request password reset.", "error");
            return;
          }

          if (data.status === "success") {
            showToast(
              data.message || "If this email is registered, a reset link was sent.",
              "success"
            );
          } else {
            showToast(
              data.message || "Failed to request password reset.",
              "error"
            );
          }
        } catch (err) {
          console.error(err);
          showToast("Failed to request password reset.", "error");
        }
      });
    }
  }

  function initAnalyticsFilters() {
    const rangeSelect = document.getElementById("analyticsRange");
    const customWrap = document.getElementById("analyticsCustomDates");
    const fromInput = document.getElementById("analyticsFrom");
    const toInput = document.getElementById("analyticsTo");
    const applyBtn = document.getElementById("analyticsApplyBtn");

    if (!rangeSelect || !applyBtn) return;

    // Show/hide custom date inputs
    rangeSelect.addEventListener("change", () => {
      if (rangeSelect.value === "custom") {
        if (customWrap) customWrap.style.display = "grid";
      } else {
        if (customWrap) customWrap.style.display = "none";
      }
    });

    applyBtn.addEventListener("click", () => {
      const range = rangeSelect.value || "all";
      const params = { range };

      if (range === "custom") {
        const from = fromInput?.value || "";
        const to = toInput?.value || "";
        if (!from || !to) {
          showToast("Please choose both From and To dates.", "error");
          return;
        }
        params.from = from;
        params.to = to;
      }

      updateAnalytics(params);
    });
  }

  // ===============================
  // DOM READY
  // ===============================
  document.addEventListener("DOMContentLoaded", () => {
    initAuthAndDashboard();
    initOrderTracking();
  });

  document.addEventListener("DOMContentLoaded", () => {
  const logo = document.querySelector(".brand-home-link");

  if (logo) {
    logo.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }
});

})();
