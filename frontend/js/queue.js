/**
 * Fraud Queue Controller - Multi-Tab Lifecycle Management with Persistent Mutations
 * Aegis Intelligence Enterprise Console
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
  actionModal: null,

  async init() {
    const modalEl = document.getElementById("triageActionModal");
    if (modalEl) this.actionModal = new bootstrap.Modal(modalEl);

    this.renderSkeleton();
    await this.loadCurrentTabData();
    await this.updateAllTabBadges();
    this.attachEventListeners();
  },

  renderSkeleton() {
    const tbody = document.getElementById("queue-tbody");
    if (!tbody) return;
    let skeletonHtml = "";
    for (let i = 0; i < 5; i++) {
      skeletonHtml += `
        <tr>
          <td><div class="skeleton skeleton-text" style="width: 20px;"></div></td>
          <td><div class="skeleton skeleton-text" style="width: 90px;"></div></td>
          <td><div class="skeleton skeleton-text" style="width: 70px;"></div></td>
          <td><div class="skeleton skeleton-text" style="width: 80px;"></div></td>
          <td><div class="skeleton skeleton-text" style="width: 100px;"></div></td>
          <td><div class="skeleton skeleton-text" style="width: 90px;"></div></td>
          <td><div class="skeleton skeleton-text" style="width: 60px;"></div></td>
          <td><div class="skeleton skeleton-text" style="width: 70px;"></div></td>
          <td><div class="skeleton skeleton-text" style="width: 120px;"></div></td>
        </tr>
      `;
    }
    tbody.innerHTML = skeletonHtml;
  },

  async loadCurrentTabData() {
    this.renderSkeleton();
    let response;
    if (this.currentTab === "ACTIVE") {
      response = await ApiService.getQueue();
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

      const sidebarBadges = document.querySelectorAll(".menu-count-badge");
      sidebarBadges.forEach((b) => {
        b.textContent = activeCount;
      });
    } catch (e) {
      // Ignored
    }
  },

  applyFiltersAndSort() {
    const searchVal = (document.getElementById("queueSearchInput")?.value || "")
      .toLowerCase()
      .trim();
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
        const reason = (item.top_reason || "").toLowerCase();
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

      // Risk level
      if (
        riskFilter !== "ALL" &&
        (item.risk_level || "").toUpperCase() !== riskFilter
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
    const tbody = document.getElementById("queue-tbody");
    if (!tbody) return;

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

      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-5">
            <i class="bi bi-shield-check text-success fs-1 mb-2 d-block"></i>
            <div class="fw-semibold">${emptyMessage}</div>
            <div class="text-muted small">The system is operating normally within acceptable risk boundaries.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = pagedItems
      .map((item, index) => {
        const globalRank = start + index + 1;
        const id = item.id;
        const orig = item.orig_account || item.origAccount || "";
        const riskScore =
          item.risk_score || Math.round(item.fraud_probability * 100);

        let riskBadge = "badge-ws-low";
        if (item.risk_level === "Critical") riskBadge = "badge-ws-critical";
        else if (item.risk_level === "High") riskBadge = "badge-ws-high";
        else if (item.risk_level === "Medium") riskBadge = "badge-ws-medium";

        let statusBadge = "badge-ws-neutral";
        if (item.status === "UNDER_REVIEW") statusBadge = "badge-ws-medium";
        else if (item.status === "FROZEN") statusBadge = "badge-ws-critical";
        else if (item.status === "RESOLVED") statusBadge = "badge-ws-low";
        else if (item.status === "FALSE_POSITIVE")
          statusBadge = "badge-ws-high";

        let probColor = "text-success";
        if (item.fraud_probability >= 0.85) probColor = "text-danger fw-bold";
        else if (item.fraud_probability >= 0.7)
          probColor = "text-warning fw-bold";
        else if (item.fraud_probability >= 0.4) probColor = "text-accent";

        // Action buttons
        let actionsHtml = "";
        if (this.currentTab === "ACTIVE") {
          actionsHtml = `
          <div class="d-flex align-items-center justify-content-end gap-1">
            <button class="btn-ws btn-ws-danger py-0.5 px-1.5 btn-action-freeze" data-id="${id}" title="Freeze Account">
              <i class="bi bi-slash-circle"></i> Freeze
            </button>
            <button class="btn-ws btn-ws-warning py-0.5 px-1.5 btn-action-escalate" data-id="${id}" title="Escalate Case">
              <i class="bi bi-arrow-up-right-circle"></i> Escalate
            </button>
            <button class="btn-ws btn-ws-success py-0.5 px-1.5 btn-action-resolve" data-id="${id}" title="Resolve Case">
              <i class="bi bi-check2"></i> Resolve
            </button>
            <button class="btn-ws py-0.5 px-1.5 btn-action-fp" data-id="${id}" title="Mark False Positive">
              <i class="bi bi-flag"></i> FP
            </button>
            <a href="transaction-detail.html?id=${id}" class="btn-ws py-0.5 px-1.5" title="Case Investigator">
              <i class="bi bi-search"></i>
            </a>
          </div>
        `;
        } else {
          actionsHtml = `
          <div class="d-flex align-items-center justify-content-end gap-1">
            <a href="transaction-detail.html?id=${id}" class="btn-ws py-0.5 px-2">
              <i class="bi bi-search"></i> Dossier & SHAP
            </a>
          </div>
        `;
        }

        return `
        <tr id="row-${id}">
          <td><span class="font-mono text-muted">#${globalRank}</span></td>
          <td>
            <div class="fw-bold font-mono text-primary">${id}</div>
            <div class="text-muted font-mono" style="font-size: 0.6875rem;">${orig}</div>
          </td>
          <td>
            <span class="badge bg-light text-dark border font-mono" style="font-size: 0.6875rem;">${item.type}</span>
          </td>
          <td>
            <div class="fw-bold font-mono">${formatCurrency(item.amount)}</div>
          </td>
          <td>
            <span class="font-mono ${probColor}">${formatPercent(item.fraud_probability)}</span>
          </td>
          <td>
            <div class="fw-bold font-mono text-danger">${formatCurrency(item.expected_loss)}</div>
          </td>
          <td>
            <span class="badge-ws ${riskBadge}">${riskScore}/100</span>
          </td>
          <td>
            <span class="badge-ws ${statusBadge}">${item.status}</span>
          </td>
          <td class="text-end">
            ${actionsHtml}
          </td>
        </tr>
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
      <li class="page-item ${this.currentPage === 1 ? "disabled" : ""}">
        <a class="page-link font-mono" href="#" data-page="${this.currentPage - 1}">Prev</a>
      </li>
    `;

    for (let p = 1; p <= totalPages; p++) {
      if (
        p === 1 ||
        p === totalPages ||
        (p >= this.currentPage - 1 && p <= this.currentPage + 1)
      ) {
        html += `
          <li class="page-item ${p === this.currentPage ? "active" : ""}">
            <a class="page-link font-mono" href="#" data-page="${p}">${p}</a>
          </li>
        `;
      } else if (p === this.currentPage - 2 || p === this.currentPage + 2) {
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
    }

    html += `
      <li class="page-item ${this.currentPage === totalPages ? "disabled" : ""}">
        <a class="page-link font-mono" href="#" data-page="${this.currentPage + 1}">Next</a>
      </li>
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

    if (this.actionModal) this.actionModal.show();
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
    if (this.actionModal) this.actionModal.hide();

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
      btn.addEventListener("click", async (e) => {
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
    ["queueSearchInput", "riskLevelFilter", "txTypeFilter"].forEach((id) => {
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
        document.getElementById("queueSearchInput").value = "";
        document.getElementById("riskLevelFilter").value = "ALL";
        document.getElementById("txTypeFilter").value = "ALL";
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
    const tbody = document.getElementById("queue-tbody");
    if (tbody) {
      tbody.addEventListener("click", (e) => {
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

    // Modal confirm freeze
    const modalConfirmBtn = document.getElementById("modalConfirmActionBtn");
    if (modalConfirmBtn) {
      modalConfirmBtn.addEventListener("click", () =>
        this.executeFreezeFromModal(),
      );
    }

    // Pagination delegation
    const pagContainer = document.getElementById("queue-pagination");
    if (pagContainer) {
      pagContainer.addEventListener("click", (e) => {
        e.preventDefault();
        const link = e.target.closest("a.page-link");
        if (link && !link.parentElement.classList.contains("disabled")) {
          const page = parseInt(link.getAttribute("data-page"));
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
