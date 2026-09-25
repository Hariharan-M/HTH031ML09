/**
 * Fraud Queue Controller - Linear-Style Work-Item Lifecycle Management
 * Aegis Risk Intelligence - ReactBits Palette Architecture
 */
const QueueController = {
  currentTab: "ACTIVE", // 'ACTIVE', 'FROZEN', 'RESOLVED', 'FALSE_POSITIVE'
  rawItems: [],
  filteredItems: [],
  currentPage: 1,
  pageSize: 10,
  sortField: "fraud_probability",
  sortDirection: "desc",
  pendingActionItem: null,

  async init() {
    this.renderSkeleton();
    await this.loadCurrentTabData();
    await this.updateAllTabBadges();
    this.attachEventListeners();
  },

  renderSkeleton() {
    const container = document.getElementById("queue-tbody");
    if (!container) return;
    let skeletonHtml = "";
    for (let i = 0; i < 6; i++) {
      skeletonHtml += `
        <div class="issue-row">
          <div class="skeleton skeleton-text" style="width: 20px;"></div>
          <div class="skeleton skeleton-text" style="width: 90px;"></div>
          <div class="skeleton skeleton-text" style="width: 70px;"></div>
          <div class="skeleton skeleton-text" style="width: 80px;"></div>
          <div class="skeleton skeleton-text" style="width: 60px;"></div>
          <div class="skeleton skeleton-text" style="width: 80px;"></div>
          <div class="skeleton skeleton-text" style="width: 70px;"></div>
          <div class="skeleton skeleton-text" style="width: 80px;"></div>
          <div class="skeleton skeleton-text" style="width: 100px; margin-left: auto;"></div>
        </div>
      `;
    }
    container.innerHTML = skeletonHtml;
  },

  async loadCurrentTabData() {
    this.renderSkeleton();
    let response;
    const cat = document.getElementById("categoryFilter")?.value || "ALL";
    if (this.currentTab === "ACTIVE") {
      response = await ApiService.getQueue(
        cat !== "ALL" ? { category: cat } : {},
      );
    } else if (this.currentTab === "FROZEN") {
      response = await ApiService.getFrozenCases();
    } else if (this.currentTab === "RESOLVED") {
      response = await ApiService.getResolvedCases();
    } else if (this.currentTab === "FALSE_POSITIVE") {
      response = await ApiService.getFalsePositives();
    }

    this.rawItems = response && response.items ? response.items : [];
    this.applyFiltersAndSort();
  },

  async updateAllTabBadges() {
    try {
      const activeRes = await ApiService.getQueue();
      const frozenRes = await ApiService.getFrozenCases();
      const resolvedRes = await ApiService.getResolvedCases();
      const fpRes = await ApiService.getFalsePositives();

      const activeCount =
        activeRes.total !== undefined
          ? activeRes.total
          : activeRes.items?.length || 0;
      const frozenCount =
        frozenRes.total !== undefined
          ? frozenRes.total
          : frozenRes.items?.length || 0;
      const resolvedCount =
        resolvedRes.total !== undefined
          ? resolvedRes.total
          : resolvedRes.items?.length || 0;
      const fpCount =
        fpRes.total !== undefined ? fpRes.total : fpRes.items?.length || 0;

      const elActive = document.getElementById("tab-active-count");
      const elFrozen = document.getElementById("tab-frozen-count");
      const elResolved = document.getElementById("tab-resolved-count");
      const elFp = document.getElementById("tab-fp-count");

      if (elActive) elActive.textContent = activeCount;
      if (elFrozen) elFrozen.textContent = frozenCount;
      if (elResolved) elResolved.textContent = resolvedCount;
      if (elFp) elFp.textContent = fpCount;

      const sidebarBadges = document.querySelectorAll("#sidebar-queue-badge");
      sidebarBadges.forEach((b) => {
        b.textContent = activeCount;
      });
    } catch (e) {
      // Ignore
    }
  },

  applyFiltersAndSort() {
    const searchVal = (document.getElementById("queueSearchInput")?.value || "")
      .toLowerCase()
      .trim();
    const catFilter = document.getElementById("categoryFilter")?.value || "ALL";
    const riskFilter =
      document.getElementById("riskLevelFilter")?.value || "ALL";
    const typeFilter = document.getElementById("txTypeFilter")?.value || "ALL";

    this.filteredItems = this.rawItems.filter((item) => {
      // Search term
      if (searchVal) {
        const id = (item.id || "").toLowerCase();
        const orig = (
          item.orig_account ||
          item.origAccount ||
          ""
        ).toLowerCase();
        const dest = (
          item.dest_account ||
          item.destAccount ||
          ""
        ).toLowerCase();
        const reason = (item.top_reason || item.topReason || "").toLowerCase();
        const analyst = (item.assigned_analyst || "").toLowerCase();
        if (
          !id.includes(searchVal) &&
          !orig.includes(searchVal) &&
          !dest.includes(searchVal) &&
          !reason.includes(searchVal) &&
          !analyst.includes(searchVal)
        ) {
          return false;
        }
      }

      // Category filter
      if (catFilter !== "ALL") {
        const itemCat = (
          item.fraud_category ||
          item.fraudCategory ||
          ""
        ).toUpperCase();
        if (itemCat !== catFilter) return false;
      }

      // Risk level
      if (
        riskFilter !== "ALL" &&
        (item.risk_level || item.final_risk_tier || "").toUpperCase() !==
          riskFilter
      ) {
        return false;
      }

      // Type
      if (
        typeFilter !== "ALL" &&
        (item.type || "").toUpperCase() !== typeFilter
      ) {
        return false;
      }

      return true;
    });

    // Sort
    this.filteredItems.sort((a, b) => {
      let valA = a[this.sortField];
      let valB = b[this.sortField];
      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return this.sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return this.sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    this.currentPage = 1;
    this.renderTable();
    this.renderPagination();
  },

  renderTable() {
    const container = document.getElementById("queue-tbody");
    if (!container) return;

    const start = (this.currentPage - 1) * this.pageSize;
    const pagedItems = this.filteredItems.slice(start, start + this.pageSize);

    if (pagedItems.length === 0) {
      let emptyMessage = "No active fraud transactions in queue";
      if (this.currentTab === "FROZEN")
        emptyMessage = "No frozen cases recorded";
      if (this.currentTab === "RESOLVED")
        emptyMessage = "No resolved cases found";
      if (this.currentTab === "FALSE_POSITIVE")
        emptyMessage = "No false positives recorded";

      container.innerHTML = `
        <div style="text-align: center; padding: 48px 24px; color: var(--text-muted);">
          <i class="bi bi-shield-check" style="font-size: 2rem; color: var(--status-success); display: block; margin-bottom: 12px;"></i>
          <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${emptyMessage}</div>
          <div style="font-size: 0.75rem;">The system is operating normally within acceptable risk boundaries.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = pagedItems
      .map((item, index) => {
        const globalRank = start + index + 1;
        const id = item.id;
        const orig = item.orig_account || item.origAccount || "";
        const dest = item.dest_account || item.destAccount || "";
        const finalScore = Math.round(
          item.final_risk_score ??
            item.risk_score ??
            item.fraud_probability * 100,
        );
        const velScore = Math.round(
          item.velocity_score ?? item.velocityScore ?? 0,
        );
        const structScore = Math.round(
          item.structuring_score ?? item.structuringScore ?? 0,
        );
        const repScore = Math.round(
          item.recipient_reputation_score ?? item.recipientRisk ?? 0,
        );
        const behScore = Math.round(
          item.behavioral_risk_score ?? item.behavioralRisk ?? 0,
        );

        const riskLevel = item.final_risk_tier || item.risk_level || "Low";
        let riskPill = "pill-low";
        if (riskLevel === "Critical") riskPill = "pill-critical";
        else if (riskLevel === "High") riskPill = "pill-high";
        else if (riskLevel === "Medium") riskPill = "pill-medium";

        // Behavioral score pills
        const getScorePill = (val) => {
          if (val >= 70) return "pill-critical";
          if (val >= 40) return "pill-medium";
          return "pill-neutral";
        };

        // Action buttons
        let actionsHtml = "";
        if (this.currentTab === "ACTIVE") {
          actionsHtml = `
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
            <button class="aegis-btn aegis-btn-danger btn-action-freeze" style="padding: 2px 6px; font-size: 0.65rem;" data-id="${id}" title="Freeze Account">
              <i class="bi bi-slash-circle"></i> Freeze
            </button>
            <button class="aegis-btn aegis-btn-primary btn-action-resolve" style="padding: 2px 6px; font-size: 0.65rem;" data-id="${id}" title="Resolve Case">
              <i class="bi bi-check2"></i>
            </button>
            <a href="transaction-detail.html?id=${id}" class="aegis-btn" style="padding: 2px 6px; font-size: 0.65rem;" title="Case Investigator">
              <i class="bi bi-search"></i>
            </a>
          </div>
        `;
        } else {
          actionsHtml = `
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
            <a href="transaction-detail.html?id=${id}" class="aegis-btn" style="padding: 2px 8px; font-size: 0.6875rem;">
              <i class="bi bi-search"></i> Dossier
            </a>
          </div>
        `;
        }

        return `
        <div class="issue-row" id="row-${id}">
          <div style="font-family: var(--font-mono); color: var(--text-disabled); font-size: 0.7rem;">#${globalRank}</div>
          <div>
            <div style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary); font-size: 0.775rem;">${id}</div>
            <div style="font-family: var(--font-mono); color: var(--text-muted); font-size: 0.65rem;">${orig}</div>
          </div>
          <div>
            <span class="status-pill pill-neutral font-mono" style="font-size: 0.65rem;">${item.type}</span>
          </div>
          <div style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary); font-size: 0.75rem;">
            ${formatCurrency(item.amount)}
          </div>
          <div>
            <span class="status-pill ${getScorePill(velScore)} font-mono" style="font-size: 0.6875rem;">${velScore}</span>
          </div>
          <div>
            <span class="status-pill ${getScorePill(structScore)} font-mono" style="font-size: 0.6875rem;">${structScore}</span>
          </div>
          <div>
            <span class="status-pill ${getScorePill(repScore)} font-mono" style="font-size: 0.6875rem;">${repScore}</span>
          </div>
          <div>
            <span class="status-pill ${getScorePill(behScore)} font-mono" style="font-size: 0.6875rem;">${behScore}</span>
          </div>
          <div>
            <span class="status-pill ${riskPill} font-mono" style="font-size: 0.7rem; font-weight: 700;">${finalScore}/100</span>
          </div>
          <div>
            ${actionsHtml}
          </div>
        </div>
      `;
      })
      .join("");
  },

  renderPagination() {
    const totalPages =
      Math.ceil(this.filteredItems.length / this.pageSize) || 1;
    const container = document.getElementById("queue-pagination");
    const infoText = document.getElementById("queue-pagination-info");

    if (infoText) {
      const start =
        this.filteredItems.length === 0
          ? 0
          : (this.currentPage - 1) * this.pageSize + 1;
      const end = Math.min(
        this.currentPage * this.pageSize,
        this.filteredItems.length,
      );
      infoText.textContent = `Showing ${start} - ${end} of ${this.filteredItems.length} transactions`;
    }

    if (!container) return;

    let html = `
      <button class="aegis-btn ${this.currentPage === 1 ? "disabled" : ""}" data-page="${this.currentPage - 1}" style="padding: 3px 8px; font-size: 0.75rem;">Prev</button>
    `;

    for (let p = 1; p <= totalPages; p++) {
      if (
        p === 1 ||
        p === totalPages ||
        (p >= this.currentPage - 1 && p <= this.currentPage + 1)
      ) {
        html += `
          <button class="aegis-btn ${p === this.currentPage ? "aegis-btn-primary" : ""}" data-page="${p}" style="padding: 3px 8px; font-size: 0.75rem;">${p}</button>
        `;
      }
    }

    html += `
      <button class="aegis-btn ${this.currentPage === totalPages ? "disabled" : ""}" data-page="${this.currentPage + 1}" style="padding: 3px 8px; font-size: 0.75rem;">Next</button>
    `;

    container.innerHTML = html;
  },

  animateRowRemoval(txId, callback) {
    const row = document.getElementById(`row-${txId}`);
    if (row) {
      row.style.transition = "all 0.3s ease";
      row.style.opacity = "0";
      row.style.transform = "translateX(20px)";
      setTimeout(() => {
        if (row.parentNode) row.parentNode.removeChild(row);
        this.rawItems = this.rawItems.filter((i) => i.id !== txId);
        this.filteredItems = this.filteredItems.filter((i) => i.id !== txId);
        this.renderPagination();
        this.updateAllTabBadges();
        if (callback) callback();
      }, 300);
    } else {
      this.rawItems = this.rawItems.filter((i) => i.id !== txId);
      this.filteredItems = this.filteredItems.filter((i) => i.id !== txId);
      this.renderTable();
      this.renderPagination();
      this.updateAllTabBadges();
      if (callback) callback();
    }
  },

  openFreezeModal(txId) {
    const item = this.rawItems.find((i) => i.id === txId);
    if (!item) return;

    this.pendingActionItem = item;
    document.getElementById("modal-tx-id").textContent = item.id;
    document.getElementById("modal-amount").textContent = formatCurrency(
      item.amount,
    );
    document.getElementById("modal-orig-acc").textContent =
      item.orig_account || item.origAccount || "C847291039";
    document.getElementById("modal-prob").textContent = formatPercent(
      item.fraud_probability,
      2,
    );
    document.getElementById("modal-action-notes").value = "";

    const modalEl = document.getElementById("triageActionModal");
    if (modalEl) modalEl.classList.add("show");
  },

  closeFreezeModal() {
    const modalEl = document.getElementById("triageActionModal");
    if (modalEl) modalEl.classList.remove("show");
  },

  async executeFreezeFromModal() {
    if (!this.pendingActionItem) return;
    const txId = this.pendingActionItem.id;
    const notes =
      document.getElementById("modal-action-notes").value.trim() ||
      "Origin account frozen by analyst via triage queue";

    const btn = document.getElementById("modalConfirmActionBtn");
    if (btn) btn.classList.add("disabled");

    await ApiService.freezeTransaction(txId, notes);

    if (btn) btn.classList.remove("disabled");
    this.closeFreezeModal();

    this.animateRowRemoval(txId, () => {
      Toast.danger(
        "Account Frozen & Dispatched",
        `Transaction ${txId} frozen. Funds secured in escrow.`,
      );
    });
  },

  async executeResolve(txId) {
    await ApiService.resolveTransaction(
      txId,
      "Approved and resolved from queue",
    );
    this.animateRowRemoval(txId, () => {
      Toast.success(
        "Case Resolved",
        `Transaction ${txId} approved & cleared for settlement.`,
      );
    });
  },

  async executeEscalate(txId) {
    await ApiService.escalateCase(
      txId,
      "TIER_3",
      "Escalated from triage queue for senior review",
    );
    Toast.warning(
      "Case Escalated",
      `Transaction ${txId} escalated to Senior Financial Crime Unit.`,
    );
    await this.loadCurrentTabData();
    await this.updateAllTabBadges();
  },

  async executeFalsePositive(txId) {
    await ApiService.markFalsePositive(
      txId,
      "Marked as False Positive by analyst",
    );
    this.animateRowRemoval(txId, () => {
      Toast.info(
        "Marked False Positive",
        `Transaction ${txId} sent to model retraining repository.`,
      );
    });
  },

  attachEventListeners() {
    // Tab switching
    document.querySelectorAll(".queue-tab-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const tab = btn.getAttribute("data-tab");
        document
          .querySelectorAll(".queue-tab-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentTab = tab;
        await this.loadCurrentTabData();
      });
    });

    // Search and filters
    [
      "queueSearchInput",
      "categoryFilter",
      "riskLevelFilter",
      "txTypeFilter",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", () => this.applyFiltersAndSort());
        el.addEventListener("change", () => this.applyFiltersAndSort());
      }
    });

    // Reset filters
    const resetBtn = document.getElementById("resetFiltersBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const qSearch = document.getElementById("queueSearchInput");
        const cFilter = document.getElementById("categoryFilter");
        const rFilter = document.getElementById("riskLevelFilter");
        const tFilter = document.getElementById("txTypeFilter");
        if (qSearch) qSearch.value = "";
        if (cFilter) cFilter.value = "ALL";
        if (rFilter) rFilter.value = "ALL";
        if (tFilter) tFilter.value = "ALL";
        this.applyFiltersAndSort();
      });
    }

    // Refresh queue
    const refreshBtn = document.getElementById("refreshQueueBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", async () => {
        Toast.info(
          "Syncing Database",
          "Fetching latest SQLite persistent state...",
        );
        await this.loadCurrentTabData();
        await this.updateAllTabBadges();
      });
    }

    // Export CSV
    const exportBtn = document.getElementById("exportCsvBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const url = ApiService.getExportCsvUrl(this.currentTab);
        window.open(url, "_blank");
        Toast.success(
          "Export Dispatched",
          `Downloading ${this.currentTab} transactions CSV.`,
        );
      });
    }

    // Delegation for table row action buttons
    const container = document.getElementById("queue-tbody");
    if (container) {
      container.addEventListener("click", (e) => {
        const freezeBtn = e.target.closest(".btn-action-freeze");
        const resolveBtn = e.target.closest(".btn-action-resolve");
        const escalateBtn = e.target.closest(".btn-action-escalate");
        const fpBtn = e.target.closest(".btn-action-fp");

        if (freezeBtn) {
          const id = freezeBtn.getAttribute("data-id");
          this.openFreezeModal(id);
        } else if (resolveBtn) {
          const id = resolveBtn.getAttribute("data-id");
          this.executeResolve(id);
        } else if (escalateBtn) {
          const id = escalateBtn.getAttribute("data-id");
          this.executeEscalate(id);
        } else if (fpBtn) {
          const id = fpBtn.getAttribute("data-id");
          this.executeFalsePositive(id);
        }
      });
    }

    // Modal buttons
    const modalConfirmBtn = document.getElementById("modalConfirmActionBtn");
    if (modalConfirmBtn) {
      modalConfirmBtn.addEventListener("click", () =>
        this.executeFreezeFromModal(),
      );
    }

    const modalCloseBtn = document.getElementById("modalCloseBtn");
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener("click", () => this.closeFreezeModal());
    }

    const modalCancelBtn = document.getElementById("modalCancelBtn");
    if (modalCancelBtn) {
      modalCancelBtn.addEventListener("click", () => this.closeFreezeModal());
    }

    // Pagination delegation
    const pagContainer = document.getElementById("queue-pagination");
    if (pagContainer) {
      pagContainer.addEventListener("click", (e) => {
        e.preventDefault();
        const btn = e.target.closest("button[data-page]");
        if (btn && !btn.classList.contains("disabled")) {
          const page = parseInt(btn.getAttribute("data-page"));
          if (page && page !== this.currentPage) {
            this.currentPage = page;
            this.renderTable();
            this.renderPagination();
          }
        }
      });
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("queue-tbody")) {
    QueueController.init();
  }
});
