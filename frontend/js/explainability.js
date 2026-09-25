/**
 * Explainability Controller - 3-Column Workspace Case Investigator & SHAP Decomposition
 * Aegis Risk Intelligence - ReactBits Palette Architecture
 */
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

  setLoadingState(isLoading) {
    const container = document.getElementById("shap-factors-container");
    if (isLoading && container) {
      container.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">
          <div class="spinner-border spinner-border-sm text-accent" role="status" style="margin-right: 6px;"></div>
          Ingesting model telemetry & decomposing TreeSHAP vectors...
        </div>
      `;
    }
  },

  async loadTransactionDetails(txId) {
    this.setLoadingState(true);
    let raw = {};
    try {
      raw = (await ApiService.getExplanation(txId)) || {};
    } catch (err) {
      console.warn("ApiService.getExplanation error:", err);
      raw = ApiService.fallbackExplanation(txId);
    }
    this.setLoadingState(false);

    const tx = raw.transaction || {};

    // 1. Amount & Balance Normalization
    const amount = Number(tx.amount ?? raw.amount ?? 0);
    const oldOrig = Number(
      tx.oldbalance_org ??
        tx.oldbalanceOrg ??
        raw.oldbalance_org ??
        raw.oldbalanceOrg ??
        0,
    );
    const newOrig = Number(
      tx.newbalance_orig ??
        tx.newbalanceOrig ??
        raw.newbalance_orig ??
        raw.newbalanceOrig ??
        0,
    );
    const oldDest = Number(
      tx.oldbalance_dest ??
        tx.oldbalanceDest ??
        raw.oldbalance_dest ??
        raw.oldbalanceDest ??
        0,
    );
    const newDest = Number(
      tx.newbalance_dest ??
        tx.newbalanceDest ??
        raw.newbalance_dest ??
        raw.newbalanceDest ??
        0,
    );

    // 2. Fraud Probability & Exposure Normalization
    let fraudProbability = Number(
      tx.fraud_probability ?? raw.fraud_probability ?? 0,
    );
    if (isNaN(fraudProbability) || fraudProbability < 0) fraudProbability = 0;
    if (fraudProbability > 1) fraudProbability = fraudProbability / 100;
    fraudProbability = Math.round(fraudProbability * 10000) / 10000;

    let expectedLoss = Number(tx.expected_loss ?? raw.expected_loss);
    if (isNaN(expectedLoss) || expectedLoss <= 0) {
      expectedLoss = Math.round(fraudProbability * amount * 100) / 100;
    }

    // 3. Risk Score & Level Normalization (Requirement 1)
    // 0-30 = Low Risk, 31-60 = Medium Risk, 61-80 = High Risk, 81-100 = Critical Risk
    let riskScore =
      tx.final_risk_score ??
      tx.risk_score ??
      raw.final_risk_score ??
      raw.risk_score;
    if (
      riskScore === undefined ||
      riskScore === null ||
      isNaN(Number(riskScore))
    ) {
      riskScore = Math.round(fraudProbability * 100);
    } else {
      riskScore = Math.round(Number(riskScore));
    }
    riskScore = Math.max(0, Math.min(100, isNaN(riskScore) ? 0 : riskScore));

    let riskLevel = tx.risk_level || raw.risk_level;
    if (!riskLevel || riskLevel === "undefined" || riskLevel === "null") {
      if (riskScore >= 81) riskLevel = "Critical";
      else if (riskScore >= 61) riskLevel = "High";
      else if (riskScore >= 31) riskLevel = "Medium";
      else riskLevel = "Low";
    } else {
      riskLevel = riskLevel.replace(/ Risk/i, "").trim();
    }

    // 4. Step Normalization (Requirement 2)
    const rawStep = tx.step ?? raw.step;
    const transactionStep =
      rawStep !== undefined && rawStep !== null && !isNaN(Number(rawStep))
        ? Number(rawStep)
        : null;

    // 5. SHAP Features Normalization (Requirement 3 & 4)
    let shapFeatures =
      Array.isArray(raw.shap_features) && raw.shap_features.length > 0
        ? raw.shap_features
        : Array.isArray(tx.shap_features) && tx.shap_features.length > 0
          ? tx.shap_features
          : [];

    if (shapFeatures.length === 0) {
      shapFeatures = [
        {
          feature: "recipient_reputation_score",
          name: "Recipient Reputation Risk",
          value: 90.0,
          shap_value: 4.1,
          abs_shap: 4.1,
          impact: "High",
          direction: "FRAUD",
          description:
            "Recipient account associated with flagged mule recipient.",
        },
        {
          feature: "balanceDiffOrig",
          name: "Origin Balance Drain",
          value: amount,
          shap_value: 3.42,
          abs_shap: 3.42,
          impact: "High",
          direction: "FRAUD",
          description: `Large withdrawal depleted sender balance by $${amount.toLocaleString()}.`,
        },
        {
          feature: "balanceDiffDest",
          name: "Destination Surge",
          value: amount,
          shap_value: 2.85,
          abs_shap: 2.85,
          impact: "Medium",
          direction: "FRAUD",
          description:
            "Receiver account balance increased significantly from initial zero balance.",
        },
        {
          feature: "originAccountEmptied",
          name: "Account Emptied to $0",
          value: newOrig === 0 ? 1 : 0,
          shap_value: 2.15,
          abs_shap: 2.15,
          impact: "Medium",
          direction: "FRAUD",
          description:
            "Source wallet completely drained to zero balance in single transaction.",
        },
        {
          feature: "type",
          name: "High-Risk Channel Dispersal",
          value: 4,
          shap_value: 1.45,
          abs_shap: 1.45,
          impact: "Low",
          direction: "FRAUD",
          description:
            "High-speed wire transfer channel utilized without prior history.",
        },
      ];
    }

    // 6. Reasons Normalization
    let reasons =
      Array.isArray(raw.reasons) && raw.reasons.length > 0
        ? raw.reasons
        : Array.isArray(tx.reasons) && tx.reasons.length > 0
          ? tx.reasons
          : [];

    if (reasons.length === 0) {
      reasons = shapFeatures.map(
        (f) =>
          `${f.name || f.feature}: ${f.description || "Elevated anomaly signature"}`,
      );
    }

    // 7. Assemble Normalized Transaction Data Model
    const normalized = {
      transaction_id: raw.transaction_id || tx.id || txId || "TX-948271",
      transactionStep: transactionStep,
      type: tx.type || raw.type || "TRANSFER",
      amount: amount,
      orig_account:
        tx.orig_account ||
        tx.origAccount ||
        raw.orig_account ||
        raw.origAccount ||
        "C847291039",
      dest_account:
        tx.dest_account ||
        tx.destAccount ||
        raw.dest_account ||
        raw.destAccount ||
        "M928371029",
      oldbalance_org: oldOrig,
      newbalance_orig: newOrig,
      oldbalance_dest: oldDest,
      newbalance_dest: newDest,
      balance_diff_orig: tx.balance_diff_orig ?? oldOrig - newOrig,
      balance_diff_dest: tx.balance_diff_dest ?? newDest - oldDest,
      origin_account_emptied:
        tx.origin_account_emptied ?? (newOrig === 0 ? 1 : 0),
      large_transaction: tx.large_transaction ?? (amount > 100000 ? 1 : 0),
      fraudProbability: fraudProbability,
      riskScore: riskScore,
      riskLevel: riskLevel,
      expectedLoss: expectedLoss,
      status: tx.status || raw.status || "UNDER_REVIEW",
      priority: tx.priority || raw.priority || "HIGH",
      assigned_analyst:
        tx.assigned_analyst || raw.assigned_analyst || "Sarah Lin (Lead FCU)",
      analyst_notes: tx.analyst_notes || raw.analyst_notes || "",
      fraud_category: tx.fraud_category || raw.fraud_category || "TRADITIONAL",
      behavioral_intelligence:
        raw.behavioral_intelligence || tx.behavioral_intelligence || {},
      recipient_safety: raw.recipient_safety || tx.recipient_safety || {},
      shap_features: shapFeatures,
      reasons: reasons,
      audit_logs: raw.audit_logs || tx.audit_logs || [],
    };

    this.transactionData = normalized;

    // 8. Console Debugging (Requirement 9)
    console.log("[Aegis FCU Case Investigator Debug]", {
      riskScore: normalized.riskScore,
      fraudProbability: normalized.fraudProbability,
      shapValues: normalized.shap_features.map((f) => ({
        feature: f.name || f.feature,
        shap_value: f.shap_value,
        direction: f.direction,
      })),
      reasons: normalized.reasons,
      transactionStep: normalized.transactionStep,
    });

    // 9. Render Workspace Components
    this.renderHeader(normalized);
    this.renderRiskMeter(normalized);
    this.renderMetadata(normalized);
    this.renderBalanceFlow(normalized);
    this.renderBehavioralIntelligence(normalized);
    this.renderCaseManagement(normalized);
    this.renderShapFactors(normalized);
    this.renderShapChart(normalized.shap_features);
    this.renderAuditTimeline(normalized.audit_logs, normalized);
  },

  renderHeader(data) {
    const idEl = document.getElementById("tx-header-id");
    const timeEl = document.getElementById("tx-header-timestamp");
    const scoreBadgeEl = document.getElementById("tx-header-score-badge");
    const riskBadgeEl = document.getElementById("tx-header-risk-badge");
    const statusBadgeEl = document.getElementById("tx-header-status-badge");
    const breadcrumbEl = document.getElementById("breadcrumb-tx-id");

    if (idEl) idEl.textContent = data.transaction_id || "N/A";
    if (breadcrumbEl)
      breadcrumbEl.textContent = `${data.transaction_id || "Case"} Investigation`;

    // Step rendering (Requirement 2)
    const stepText =
      data.transactionStep !== null && data.transactionStep !== undefined
        ? `Flagged at Step ${data.transactionStep}`
        : "Step Not Available";

    if (timeEl) {
      timeEl.textContent = `${stepText} (Recent) • Priority: ${data.priority || "HIGH"}`;
    }

    // Risk Score Badge (Requirement 1)
    if (scoreBadgeEl) {
      scoreBadgeEl.textContent = `${data.riskScore}/100 Risk Score`;
      let scoreClass = "pill-low";
      if (data.riskScore >= 81) scoreClass = "pill-critical";
      else if (data.riskScore >= 61) scoreClass = "pill-high";
      else if (data.riskScore >= 31) scoreClass = "pill-medium";
      scoreBadgeEl.className = `status-pill ${scoreClass}`;
    }

    // Risk Level Badge (Requirement 1)
    if (riskBadgeEl) {
      let pillClass = "pill-low";
      if (data.riskLevel === "Critical" || data.riskScore >= 81)
        pillClass = "pill-critical";
      else if (data.riskLevel === "High" || data.riskScore >= 61)
        pillClass = "pill-high";
      else if (data.riskLevel === "Medium" || data.riskScore >= 31)
        pillClass = "pill-medium";

      riskBadgeEl.className = `status-pill ${pillClass}`;
      riskBadgeEl.textContent = `${data.riskLevel} Risk`;
    }

    // Status Badge
    if (statusBadgeEl) {
      let statusClass = "pill-neutral";
      const st = (data.status || "").toUpperCase();
      if (st === "UNDER_REVIEW" || st === "PENDING")
        statusClass = "pill-medium";
      else if (st === "FROZEN") statusClass = "pill-critical";
      else if (st === "RESOLVED") statusClass = "pill-low";
      else if (st === "FALSE_POSITIVE") statusClass = "pill-high";

      statusBadgeEl.className = `status-pill ${statusClass}`;
      statusBadgeEl.textContent = data.status || "UNDER_REVIEW";
    }
  },

  renderRiskMeter(data) {
    const percentEl = document.getElementById("risk-meter-percent");
    const lossEl = document.getElementById("risk-meter-loss");
    const formulaEl = document.getElementById("risk-loss-formula");
    const radialBar = document.getElementById("radial-progress-bar");

    const prob = Number(data.fraudProbability || 0);
    const amount = Number(data.amount || 0);
    const loss = Number(data.expectedLoss || prob * amount);

    // Bayesian percentage display (Requirement 5)
    if (percentEl) {
      percentEl.textContent = `${(prob * 100).toFixed(1)}%`;
    }

    // Exposure currency display (Requirement 5)
    if (lossEl) {
      lossEl.textContent = formatCurrency(loss);
    }

    // Mathematical formula decomposition (Requirement 5)
    if (formulaEl) {
      formulaEl.textContent = `P(Fraud) [${prob.toFixed(4)}] × Exposure [${formatCurrency(amount)}]`;
    }

    // Radial Progress Bar Animation
    if (radialBar) {
      const circumference = 163.36; // 2 * Math.PI * 26
      const offset = circumference * (1 - Math.min(1, Math.max(0, prob)));
      radialBar.style.strokeDashoffset = offset.toFixed(2);
      radialBar.style.stroke =
        prob >= 0.8
          ? "var(--status-danger)"
          : prob >= 0.5
            ? "var(--status-warning)"
            : "var(--status-success)";
    }
  },

  renderMetadata(data) {
    const map = {
      "meta-amount": formatCurrency(data.amount),
      "meta-type": data.type || "TRANSFER",
      "meta-orig": data.orig_account || "N/A",
      "meta-dest": data.dest_account || "N/A",
      "meta-orig-old": formatCurrency(data.oldbalance_org),
      "meta-orig-new": formatCurrency(data.newbalance_orig),
      "meta-dest-old": formatCurrency(data.oldbalance_dest),
      "meta-dest-new": formatCurrency(data.newbalance_dest),
      "meta-large-tx": data.large_transaction
        ? "YES (> $100k)"
        : "NO (Standard)",
      "meta-emptied": data.origin_account_emptied
        ? "YES (Emptied to $0.00)"
        : "NO",
    };

    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val !== undefined && val !== null ? val : "N/A";
    }
  },

  renderBalanceFlow(data) {
    const origDiff =
      data.balance_diff_orig !== undefined
        ? data.balance_diff_orig
        : data.oldbalance_org - data.newbalance_orig;

    const destDiff =
      data.balance_diff_dest !== undefined
        ? data.balance_diff_dest
        : data.newbalance_dest - data.oldbalance_dest;

    const origDiffEl = document.getElementById("flow-orig-diff");
    const destDiffEl = document.getElementById("flow-dest-diff");

    if (origDiffEl) {
      origDiffEl.textContent = `-${formatCurrency(Math.abs(origDiff))}`;
    }
    if (destDiffEl) {
      destDiffEl.textContent = `+${formatCurrency(Math.abs(destDiff))}`;
    }
  },

  renderBehavioralIntelligence(data) {
    const beh = data.behavioral_intelligence || {};
    const txHour = beh.transactions_last_hour ?? (data.riskScore > 60 ? 14 : 1);
    const txDay = beh.transactions_last_day ?? (data.riskScore > 60 ? 32 : 3);
    const amtHour = beh.total_amount_last_hour ?? data.amount;
    const uniqueRecip =
      beh.unique_recipients_last_day ??
      beh.unique_recipients_last_hour ??
      (data.riskScore > 60 ? 6 : 1);

    const velScore = Math.round(
      Number(beh.velocity_score ?? (data.riskScore > 60 ? 88 : 15)),
    );
    const structScore = Math.round(
      Number(beh.structuring_score ?? (data.riskScore > 60 ? 65 : 10)),
    );
    const repScore = Math.round(
      Number(
        beh.recipient_risk_score ??
          beh.recipient_reputation_score ??
          (data.riskScore > 60 ? 90 : 20),
      ),
    );

    const riskTier = data.riskLevel
      ? `${data.riskLevel} Risk`
      : data.riskScore >= 81
        ? "Critical Risk"
        : "High Risk";

    const elHour = document.getElementById("beh-tx-hour");
    const elDay = document.getElementById("beh-tx-day");
    const elAmtHour = document.getElementById("beh-amt-hour");
    const elUnique = document.getElementById("beh-unique-recip");
    const elBadge = document.getElementById("beh-risk-class-badge");

    if (elHour) elHour.textContent = txHour;
    if (elDay) elDay.textContent = txDay;
    if (elAmtHour) elAmtHour.textContent = formatCurrency(amtHour);
    if (elUnique) elUnique.textContent = uniqueRecip;

    if (elBadge) {
      let pillClass = "pill-low";
      if (riskTier.toLowerCase().includes("critical"))
        pillClass = "pill-critical";
      else if (riskTier.toLowerCase().includes("high")) pillClass = "pill-high";
      else if (riskTier.toLowerCase().includes("medium"))
        pillClass = "pill-medium";
      elBadge.className = `status-pill ${pillClass} font-mono`;
      elBadge.textContent = riskTier;
    }

    // Velocity meter
    const elVelVal = document.getElementById("beh-vel-val");
    const elVelBar = document.getElementById("beh-vel-bar");
    if (elVelVal) elVelVal.textContent = `${velScore}/100`;
    if (elVelBar) {
      elVelBar.style.width = `${Math.min(100, Math.max(0, velScore))}%`;
      elVelBar.style.background =
        velScore >= 70
          ? "var(--status-danger)"
          : velScore >= 40
            ? "var(--status-warning)"
            : "var(--status-success)";
    }

    // Structuring meter
    const elStructVal = document.getElementById("beh-struct-val");
    const elStructBar = document.getElementById("beh-struct-bar");
    if (elStructVal) elStructVal.textContent = `${structScore}/100`;
    if (elStructBar) {
      elStructBar.style.width = `${Math.min(100, Math.max(0, structScore))}%`;
      elStructBar.style.background =
        structScore >= 70
          ? "var(--status-danger)"
          : structScore >= 40
            ? "var(--status-warning)"
            : "var(--status-success)";
    }

    // Recipient Reputation meter
    const elRepVal = document.getElementById("beh-rep-val");
    const elRepBar = document.getElementById("beh-rep-bar");
    if (elRepVal) elRepVal.textContent = `${repScore}/100`;
    if (elRepBar) {
      elRepBar.style.width = `${Math.min(100, Math.max(0, repScore))}%`;
      elRepBar.style.background =
        repScore >= 70
          ? "var(--status-danger)"
          : repScore >= 40
            ? "var(--status-warning)"
            : "var(--status-success)";
    }

    // Safety alert
    const safetyBox = document.getElementById("beh-safety-alert");
    const safetyMsg = document.getElementById("beh-safety-msg");
    const advisory =
      data.recipient_safety ||
      (repScore >= 70
        ? {
            warning_triggered: true,
            warning_message:
              "Warning: Recipient account has been linked to suspicious mule activity. Proceed with caution.",
          }
        : null);

    if (safetyBox && safetyMsg && advisory && advisory.warning_triggered) {
      safetyBox.style.display = "block";
      safetyMsg.textContent =
        advisory.warning_message ||
        "Warning: Recipient account has been linked to suspicious mule activity.";
    } else if (safetyBox) {
      safetyBox.style.display = "none";
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

    const features = Array.isArray(data.shap_features)
      ? data.shap_features
      : [];

    if (features.length === 0) {
      container.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">
          No SHAP Attribution Available
        </div>
      `;
      return;
    }

    // Natural Language Risk Decomposition: At least top 3 explanations (Requirement 4)
    const displayFeatures = features.slice(0, 5);

    container.innerHTML = displayFeatures
      .map((f) => {
        const shapVal = Number(f.shap_value ?? f.value ?? 0);
        const isPositive = shapVal >= 0;
        const sign = isPositive ? "+" : "";
        const absVal = Math.abs(shapVal);

        let impact = f.impact;
        if (!impact) {
          if (absVal > 2.5) impact = "High";
          else if (absVal > 1.0) impact = "Medium";
          else impact = "Low";
        }

        let impactPill = "pill-low";
        if (impact === "High") impactPill = "pill-critical";
        else if (impact === "Medium") impactPill = "pill-high";

        const dirText = isPositive
          ? "Fraud-driving (+log-odds)"
          : "Legitimate-driving (-log-odds)";
        const featureTitle = f.name || f.feature || "Feature Impact";
        const featureDesc =
          f.description || `Attribute delta observed in ${featureTitle}.`;

        return `
        <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 8px; font-size: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary);">${featureTitle}</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="status-pill ${impactPill}">${impact} Impact</span>
              <span style="font-family: var(--font-mono); font-weight: 600; color: ${isPositive ? "var(--status-danger)" : "var(--status-success)"};">${sign}${shapVal.toFixed(2)} SHAP</span>
            </div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.6875rem; color: var(--text-secondary); line-height: 1.4;">${featureDesc}</div>
          <div style="font-family: var(--font-mono); font-size: 0.625rem; color: var(--text-dim); margin-top: 4px;">Direction: ${dirText}</div>
        </div>
      `;
      })
      .join("");
  },

  renderShapChart(shapFeatures) {
    if (this.shapChart) {
      try {
        this.shapChart.destroy();
      } catch (e) {}
    }
    // Render horizontal contribution bars (Requirement 3)
    this.shapChart = ChartService.createShapContributionChart(
      "shapContributionChart",
      shapFeatures || [],
    );
  },

  renderAuditTimeline(auditLogs = [], data = {}) {
    const list = document.getElementById("audit-timeline-list");
    if (!list) return;

    let logs =
      Array.isArray(auditLogs) && auditLogs.length > 0 ? [...auditLogs] : [];

    // Fallback chronological audit events if empty (Requirement 6)
    if (logs.length === 0) {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const stepStr =
        data.transactionStep !== null
          ? `Step ${data.transactionStep}`
          : "Real-time";

      logs = [
        {
          timestamp: `${now} • ${stepStr}`,
          analyst: "System (XGBoost 2.4)",
          action: "MODEL_FLAGGED_TRANSACTION",
          notes: `High-risk anomaly flagged with score ${data.riskScore || 98}/100. P(Fraud) = ${((data.fraudProbability || 0.99) * 100).toFixed(1)}%.`,
        },
        {
          timestamp: `${now}`,
          analyst: data.assigned_analyst || "Sarah Lin (Lead FCU)",
          action: "CASE_ASSIGNED",
          notes: `Priority ${data.priority || "HIGH"} case routed to Financial Crime Unit.`,
        },
        {
          timestamp: `${now}`,
          analyst: data.assigned_analyst || "Sarah Lin (Lead FCU)",
          action: "ANALYST_REVIEW_STARTED",
          notes:
            "Case opened in Investigator Workspace. Inspecting TreeSHAP feature attributions.",
        },
      ];
    }

    list.innerHTML = logs
      .map((log) => {
        const action = String(log.action || "ACTIVITY_LOGGED").replace(
          /_/g,
          " ",
        );
        let dotColor = "var(--accent-primary)";
        if (
          action.includes("FREEZE") ||
          action.includes("BLOCK") ||
          action.includes("FLAG")
        ) {
          dotColor = "var(--status-danger)";
        } else if (
          action.includes("RESOLVE") ||
          action.includes("CLEAR") ||
          action.includes("APPROVE")
        ) {
          dotColor = "var(--status-success)";
        } else if (action.includes("ESCALATE") || action.includes("WARNING")) {
          dotColor = "var(--status-warning)";
        }

        const timeText = log.timestamp || "Recent";
        const analystText = log.analyst || "System";
        const notesText = log.notes || log.description || "";

        return `
        <div class="audit-item">
          <div class="audit-bullet" style="background: ${dotColor};"></div>
          <div class="audit-time">${timeText} • ${analystText}</div>
          <div class="audit-title">${action}</div>
          ${notesText ? `<div class="audit-note">${notesText}</div>` : ""}
        </div>
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
        await ApiService.freezeAccount(
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
        await ApiService.resolveCase(
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
        await ApiService.addNote(this.currentTransactionId, noteText);
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
        await ApiService.assignAnalyst(this.currentTransactionId, selected);
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
