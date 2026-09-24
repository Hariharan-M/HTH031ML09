
const ExplainabilityController = {
  currentTransactionId: null,
  transactionData: null,
  shapChart: null,

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    this.currentTransactionId = urlParams.get("id") || "TX-948271";

    await this.loadTransactionDetails(this.currentTransactionId);
    this.attachEventListeners();
  },

  async loadTransactionDetails(txId) {
    this.transactionData = await ApiService.getExplanation(txId);
    this.renderHeader(this.transactionData);
    this.renderRiskMeter(this.transactionData);
    this.renderMetadata(this.transactionData);
    this.renderBalanceFlow(this.transactionData);
    this.renderCaseManagement(this.transactionData);
    this.renderShapFactors(this.transactionData);
    this.renderShapChart(this.transactionData.shap_features);
    this.renderAuditTimeline(this.transactionData.audit_logs || []);
  },

  renderHeader(data) {
    const idEl = document.getElementById("tx-header-id");
    const timeEl = document.getElementById("tx-header-timestamp");
    const scoreBadgeEl = document.getElementById("tx-header-score-badge");
    const riskBadgeEl = document.getElementById("tx-header-risk-badge");
    const statusBadgeEl = document.getElementById("tx-header-status-badge");
    const breadcrumbEl = document.getElementById("breadcrumb-tx-id");

    if (idEl) idEl.textContent = data.transaction_id;
    if (breadcrumbEl)
      breadcrumbEl.textContent = `${data.transaction_id} Investigation`;
    if (timeEl)
      timeEl.textContent = `Flagged at Step ${data.step} (${data.timestamp || "Recent"}) • Priority: ${data.priority || "HIGH"}`;

    const riskScore =
      data.risk_score || Math.round(data.fraud_probability * 100);
    if (scoreBadgeEl) {
      scoreBadgeEl.textContent = `${riskScore}/100 Risk Score`;
    }

    if (riskBadgeEl) {
      let badgeClass = "badge-ws-low";
      if (data.risk_level === "Critical") badgeClass = "badge-ws-critical";
      else if (data.risk_level === "High") badgeClass = "badge-ws-high";
      else if (data.risk_level === "Medium") badgeClass = "badge-ws-medium";
      riskBadgeEl.className = `badge-ws ${badgeClass}`;
      riskBadgeEl.textContent = `${data.risk_level} Risk`;
    }

    if (statusBadgeEl) {
      let statusClass = "badge-ws-neutral";
      if (data.status === "UNDER_REVIEW") statusClass = "badge-ws-medium";
      else if (data.status === "FROZEN") statusClass = "badge-ws-critical";
      else if (data.status === "RESOLVED") statusClass = "badge-ws-low";
      else if (data.status === "FALSE_POSITIVE") statusClass = "badge-ws-high";
      statusBadgeEl.className = `badge-ws ${statusClass}`;
      statusBadgeEl.textContent = data.status;
    }
  },

  renderRiskMeter(data) {
    const percentEl = document.getElementById("risk-meter-percent");
    const lossEl = document.getElementById("risk-meter-loss");
    const formulaEl = document.getElementById("risk-loss-formula");

    const prob = data.fraud_probability;
    if (percentEl) percentEl.textContent = formatPercent(prob, 1);
    if (lossEl) lossEl.textContent = formatCurrency(data.expected_loss);

    if (formulaEl) {
      formulaEl.textContent = `P(Fraud) [${prob.toFixed(4)}] × Exposure [${formatCurrency(data.amount)}]`;
    }
  },

  renderMetadata(data) {
    const map = {
      "meta-amount": formatCurrency(data.amount),
      "meta-type": data.type,
      "meta-orig": data.origAccount || data.orig_account || "C847291039",
      "meta-dest": data.destAccount || data.dest_account || "M928371029",
      "meta-orig-old": formatCurrency(
        data.oldbalanceOrg || data.oldbalance_org,
      ),
      "meta-orig-new": formatCurrency(
        data.newbalanceOrig || data.newbalance_orig,
      ),
      "meta-dest-old": formatCurrency(
        data.oldbalanceDest || data.oldbalance_dest,
      ),
      "meta-dest-new": formatCurrency(
        data.newbalanceDest || data.newbalance_dest,
      ),
      "meta-large-tx":
        data.largeTransaction || data.large_transaction
          ? "YES (> $100k)"
          : "NO (Standard)",
      "meta-emptied":
        data.originAccountEmptied || data.origin_account_emptied
          ? "YES (Emptied to $0.00)"
          : "NO",
    };

    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }
  },

  renderBalanceFlow(data) {
    const origDiff =
      data.balanceDiffOrig || data.oldbalanceOrg - data.newbalanceOrig;
    const destDiff =
      data.balanceDiffDest || data.newbalanceDest - data.oldbalanceDest;

    const origDiffEl = document.getElementById("flow-orig-diff");
    const destDiffEl = document.getElementById("flow-dest-diff");

    if (origDiffEl) {
      origDiffEl.textContent = `-${formatCurrency(origDiff)}`;
    }
    if (destDiffEl) {
      destDiffEl.textContent = `+${formatCurrency(destDiff)}`;
    }
  },

  renderCaseManagement(data) {
    const analystSelect = document.getElementById("case-analyst-select");
    const prioritySelect = document.getElementById("case-priority-select");

    if (analystSelect && data.assigned_analyst) {
      analystSelect.value = data.assigned_analyst;
    }
    if (prioritySelect && data.priority) {
      prioritySelect.value = data.priority;
    }
  },

  renderShapFactors(data) {
    const container = document.getElementById("shap-factors-container");
    if (!container) return;

    const features = data.shap_features || [];
    if (features.length === 0) {
      container.innerHTML = `<div class="text-muted small">No SHAP factors computed for this record.</div>`;
      return;
    }

    container.innerHTML = features
      .slice(0, 5)
      .map((f) => {
        let impactBadge = "badge-ws-low";
        if (f.impact === "High") impactBadge = "badge-ws-critical";
        else if (f.impact === "Medium") impactBadge = "badge-ws-high";

        const isPositive = f.shap_value >= 0;
        const sign = isPositive ? "+" : "";
        const dirText = isPositive
          ? "Accelerates Fraud Odds"
          : "Mitigates Risk Toward Legitimacy";

        return `
        <div class="p-2 mb-1.5 border rounded" style="background: var(--ws-surface); font-size: 0.75rem;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="fw-bold font-mono text-primary">${f.name || f.feature}</span>
            <div class="d-flex align-items-center gap-1">
              <span class="badge-ws ${impactBadge}">${f.impact} Impact</span>
              <span class="font-mono fw-bold ${isPositive ? "text-danger" : "text-success"}">${sign}${f.shap_value.toFixed(2)} SHAP</span>
            </div>
          </div>
          <div class="text-secondary font-mono" style="font-size: 0.6875rem;">${f.description}</div>
          <div class="text-muted font-mono" style="font-size: 0.625rem; margin-top: 2px;">Direction: ${dirText}</div>
        </div>
      `;
      })
      .join("");
  },

  renderShapChart(shapFeatures) {
    if (this.shapChart) {
      this.shapChart.destroy();
    }
    this.shapChart = ChartService.createShapContributionChart(
      "shapContributionChart",
      shapFeatures || [],
    );
  },

  renderAuditTimeline(auditLogs = []) {
    const list = document.getElementById("audit-timeline-list");
    if (!list) return;

    if (auditLogs.length === 0) {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      list.innerHTML = `
        <li class="ws-timeline-item">
          <div class="ws-timeline-dot"></div>
          <div class="ws-timeline-time">${now}</div>
          <div class="ws-timeline-title">Initial XGBoost Triage Ingestion</div>
          <div class="ws-timeline-desc text-muted">Flagged by model inference pipeline.</div>
        </li>
      `;
      return;
    }

    list.innerHTML = auditLogs
      .map((log) => {
        let dotColor = "var(--ws-accent)";
        if (log.action === "FREEZE_ACCOUNT") dotColor = "var(--ws-critical)";
        else if (log.action === "RESOLVE_TRANSACTION")
          dotColor = "var(--ws-low)";
        else if (log.action === "ESCALATE_CASE") dotColor = "var(--ws-high)";

        return `
        <li class="ws-timeline-item">
          <div class="ws-timeline-dot" style="background: ${dotColor};"></div>
          <div class="ws-timeline-time">${log.timestamp} • ${log.analyst}</div>
          <div class="ws-timeline-title">${log.action.replace(/_/g, " ")}</div>
          ${log.notes ? `<div class="ws-timeline-desc font-mono" style="font-size: 0.6875rem;">${log.notes}</div>` : ""}
        </li>
      `;
      })
      .join("");
  },

  attachEventListeners() {
    const blockBtn = document.getElementById("actionBlockBtn");
    const escalateBtn = document.getElementById("actionEscalateBtn");
    const clearBtn = document.getElementById("actionClearBtn");
    const fpBtn = document.getElementById("actionFpBtn");
    const saveNoteBtn = document.getElementById("saveCaseNoteBtn");
    const analystSelect = document.getElementById("case-analyst-select");
    const prioritySelect = document.getElementById("case-priority-select");

    if (blockBtn) {
      blockBtn.addEventListener("click", async () => {
        blockBtn.classList.add("disabled");
        await ApiService.freezeTransaction(
          this.currentTransactionId,
          "Account frozen & blocked via Case Investigator",
        );
        blockBtn.classList.remove("disabled");

        await this.loadTransactionDetails(this.currentTransactionId);
        Toast.danger(
          "Account Frozen",
          `Transaction ${this.currentTransactionId} frozen. Origin funds blocked.`,
        );
      });
    }

    if (escalateBtn) {
      escalateBtn.addEventListener("click", async () => {
        escalateBtn.classList.add("disabled");
        await ApiService.escalateCase(
          this.currentTransactionId,
          "TIER_3",
          "Escalated to Senior FCU Lead via Case Investigator",
        );
        escalateBtn.classList.remove("disabled");

        await this.loadTransactionDetails(this.currentTransactionId);
        Toast.warning(
          "Case Escalated",
          `Transaction ${this.currentTransactionId} escalated to Senior Review Tier.`,
        );
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", async () => {
        clearBtn.classList.add("disabled");
        await ApiService.resolveTransaction(
          this.currentTransactionId,
          "Cleared by investigator after secondary validation",
        );
        clearBtn.classList.remove("disabled");

        await this.loadTransactionDetails(this.currentTransactionId);
        Toast.success(
          "Transaction Resolved",
          `Transaction ${this.currentTransactionId} approved & cleared.`,
        );
      });
    }

    if (fpBtn) {
      fpBtn.addEventListener("click", async () => {
        fpBtn.classList.add("disabled");
        await ApiService.markFalsePositive(
          this.currentTransactionId,
          "Flagged as false positive by investigator",
        );
        fpBtn.classList.remove("disabled");

        await this.loadTransactionDetails(this.currentTransactionId);
        Toast.info("Marked False Positive", `Recorded in retraining dataset.`);
      });
    }

    if (saveNoteBtn) {
      saveNoteBtn.addEventListener("click", async () => {
        const noteInput = document.getElementById("case-new-note");
        const noteText = (noteInput?.value || "").trim();
        if (!noteText) {
          Toast.warning("Empty Note", "Please enter notes before appending.");
          return;
        }

        saveNoteBtn.classList.add("disabled");
        await ApiService.addCaseNote(this.currentTransactionId, noteText);
        saveNoteBtn.classList.remove("disabled");
        if (noteInput) noteInput.value = "";

        await this.loadTransactionDetails(this.currentTransactionId);
        Toast.success(
          "Note Recorded",
          "Journal note committed to SQLite audit trail.",
        );
      });
    }

    if (analystSelect) {
      analystSelect.addEventListener("change", async (e) => {
        const selected = e.target.value;
        await ApiService.assignAnalyst(
          this.currentTransactionId,
          selected,
          `Reassigned to ${selected}`,
        );
        Toast.info("Analyst Reassigned", `Case assigned to ${selected}`);
        await this.loadTransactionDetails(this.currentTransactionId);
      });
    }

    if (prioritySelect) {
      prioritySelect.addEventListener("change", async (e) => {
        const selected = e.target.value;
        await ApiService.updatePriority(
          this.currentTransactionId,
          selected,
          `Priority updated to ${selected}`,
        );
        Toast.info("Priority Updated", `Case SLA priority set to ${selected}`);
        await this.loadTransactionDetails(this.currentTransactionId);
      });
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("tx-header-id")) {
    ExplainabilityController.init();
  }
});
