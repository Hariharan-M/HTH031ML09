/**
 * Simulator Controller - Live Inference & Behavioral Scenario Playground
 * Aegis Risk Intelligence - Upgraded Multi-Engine Behavioral Architecture
 */
const SimulatorController = {
  presets: {
    wire_drain: {
      origAccount: "C847291039",
      destAccount: "M928371029",
      step: 300,
      type: 4, // TRANSFER
      amount: 850000.0,
      oldbalanceOrg: 850000.0,
      newbalanceOrig: 0.0,
      oldbalanceDest: 0.0,
      newbalanceDest: 850000.0,
      txHour: 1,
      txDay: 2,
      recentAmounts: "850000",
    },
    velocity_burst: {
      origAccount: "C109283746",
      destAccount: "M304958201",
      step: 305,
      type: 4, // TRANSFER
      amount: 15000.0,
      oldbalanceOrg: 500000.0,
      newbalanceOrig: 485000.0,
      oldbalanceDest: 2000.0,
      newbalanceDest: 17000.0,
      txHour: 25, // 25 tx in last hour
      txDay: 48,
      recentAmounts: "15000, 14500, 15200, 14800, 15000, 14900",
    },
    structuring_smurfing: {
      origAccount: "C554433221",
      destAccount: "M778899001",
      step: 312,
      type: 4, // TRANSFER
      amount: 1200.0,
      oldbalanceOrg: 50000.0,
      newbalanceOrig: 48800.0,
      oldbalanceDest: 1000.0,
      newbalanceDest: 2200.0,
      txHour: 6,
      txDay: 12,
      recentAmounts: "1000, 1200, 1500, 900, 1400", // Classic structuring pattern
    },
    recipient_burst: {
      origAccount: "C998877665",
      destAccount: "M112233445",
      step: 320,
      type: 4, // TRANSFER
      amount: 8500.0,
      oldbalanceOrg: 120000.0,
      newbalanceOrig: 111500.0,
      oldbalanceDest: 0.0,
      newbalanceDest: 8500.0,
      txHour: 8,
      txDay: 18,
      recentAmounts: "8500, 8200, 8900, 8400, 8600",
    },
    mule_recipient: {
      origAccount: "C334455667",
      destAccount: "M_FRAUD_9012", // High risk confirmed mule account
      step: 325,
      type: 4, // TRANSFER
      amount: 45000.0,
      oldbalanceOrg: 200000.0,
      newbalanceOrig: 155000.0,
      oldbalanceDest: 100.0,
      newbalanceDest: 45100.0,
      txHour: 2,
      txDay: 4,
      recentAmounts: "45000",
    },
    normal_retail: {
      origAccount: "C112233445",
      destAccount: "M987654321", // Clean merchant
      step: 150,
      type: 3, // PAYMENT
      amount: 320.0,
      oldbalanceOrg: 5400.0,
      newbalanceOrig: 5080.0,
      oldbalanceDest: 0.0,
      newbalanceDest: 0.0,
      txHour: 1,
      txDay: 3,
      recentAmounts: "320",
    },
  },

  channelNames: {
    0: "CASH_IN",
    1: "CASH_OUT",
    2: "DEBIT",
    3: "PAYMENT",
    4: "TRANSFER",
  },

  init() {
    this.attachEventListeners();
    this.loadPreset("wire_drain");
    this.runSimulation();
  },

  loadPreset(presetKey) {
    const data = this.presets[presetKey];
    if (!data) return;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    setVal("sim-origAccount", data.origAccount || "C847291039");
    setVal("sim-destAccount", data.destAccount || "M928371029");
    setVal("sim-step", data.step);
    setVal("sim-type", data.type);
    setVal("sim-amount", data.amount);
    setVal("sim-oldbalanceOrg", data.oldbalanceOrg);
    setVal("sim-newbalanceOrig", data.newbalanceOrig);
    setVal("sim-oldbalanceDest", data.oldbalanceDest);
    setVal("sim-newbalanceDest", data.newbalanceDest);
    setVal("sim-tx-hour", data.txHour || 1);
    setVal("sim-tx-day", data.txDay || 2);
    setVal("sim-recent-amounts", data.recentAmounts || `${data.amount}`);

    this.updateDerivedFeatures();
    this.checkCustomerSafety();
  },

  updateDerivedFeatures() {
    const amount =
      parseFloat(document.getElementById("sim-amount")?.value) || 0;
    const oldOrig =
      parseFloat(document.getElementById("sim-oldbalanceOrg")?.value) || 0;
    const newOrig =
      parseFloat(document.getElementById("sim-newbalanceOrig")?.value) || 0;
    const oldDest =
      parseFloat(document.getElementById("sim-oldbalanceDest")?.value) || 0;
    const newDest =
      parseFloat(document.getElementById("sim-newbalanceDest")?.value) || 0;

    const diffOrig = oldOrig - newOrig;
    const diffDest = newDest - oldDest;
    const emptied = newOrig === 0 && oldOrig > 0;
    const large = amount > 100000;

    const diffOrigEl = document.getElementById("derived-diff-orig");
    const diffDestEl = document.getElementById("derived-diff-dest");
    const emptiedEl = document.getElementById("derived-emptied");
    const largeEl = document.getElementById("derived-large");

    if (diffOrigEl) diffOrigEl.textContent = formatCurrency(diffOrig);
    if (diffDestEl) diffDestEl.textContent = formatCurrency(diffDest);

    if (emptiedEl) {
      emptiedEl.textContent = emptied ? "TRUE (Account Emptied)" : "FALSE (0)";
      emptiedEl.style.color = emptied
        ? "var(--status-danger)"
        : "var(--text-muted)";
    }

    if (largeEl) {
      largeEl.textContent = large ? "TRUE (> $100k)" : "FALSE (0)";
      largeEl.style.color = large
        ? "var(--status-danger)"
        : "var(--text-muted)";
    }
  },

  async checkCustomerSafety() {
    const destAccount = (
      document.getElementById("sim-destAccount")?.value || ""
    ).trim();
    const amount =
      parseFloat(document.getElementById("sim-amount")?.value) || 0;
    const banner = document.getElementById("safety-advisory-banner");
    const textEl = document.getElementById("safety-advisory-text");

    if (!destAccount) {
      if (banner) banner.style.display = "none";
      return;
    }

    try {
      const safety = await ApiService.checkRecipientSafety(destAccount, amount);
      if (safety && safety.warning_triggered) {
        if (banner) banner.style.display = "block";
        if (textEl)
          textEl.textContent =
            safety.warning_message ||
            "Warning: This recipient account has previously been linked to suspicious or fraudulent activity. Proceed with caution.";
        Toast.warning(
          "Customer Safety Alert",
          "Recipient has prior fraudulent associations. Review advisory.",
        );
      } else {
        if (banner) banner.style.display = "none";
      }
    } catch (e) {
      if (banner) banner.style.display = "none";
    }
  },

  async runSimulation() {
    const btn = document.getElementById("runSimulationBtn");
    const spinner = document.getElementById("sim-spinner");

    if (btn) btn.classList.add("disabled");
    if (spinner) spinner.classList.remove("d-none");

    const typeVal = parseInt(document.getElementById("sim-type")?.value) || 0;
    const amountVal =
      parseFloat(document.getElementById("sim-amount")?.value) || 0;
    const oldOrgVal =
      parseFloat(document.getElementById("sim-oldbalanceOrg")?.value) || 0;
    const newOrgVal =
      parseFloat(document.getElementById("sim-newbalanceOrig")?.value) || 0;
    const oldDestVal =
      parseFloat(document.getElementById("sim-oldbalanceDest")?.value) || 0;
    const newDestVal =
      parseFloat(document.getElementById("sim-newbalanceDest")?.value) || 0;
    const origAcc = (
      document.getElementById("sim-origAccount")?.value || "C847291039"
    ).trim();
    const destAcc = (
      document.getElementById("sim-destAccount")?.value || "M928371029"
    ).trim();
    const txHour = parseInt(document.getElementById("sim-tx-hour")?.value) || 1;
    const txDay = parseInt(document.getElementById("sim-tx-day")?.value) || 2;
    const recentAmountsStr =
      document.getElementById("sim-recent-amounts")?.value || "";
    const recentAmounts = recentAmountsStr
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n));

    const payload = {
      step: parseInt(document.getElementById("sim-step")?.value) || 1,
      type: typeVal,
      amount: amountVal,
      oldbalanceOrg: oldOrgVal,
      newbalanceOrig: newOrgVal,
      oldbalanceDest: oldDestVal,
      newbalanceDest: newDestVal,
      orig_account: origAcc,
      dest_account: destAcc,
      transactions_last_hour: txHour,
      transactions_last_day: txDay,
      recent_amounts: recentAmounts.length > 0 ? recentAmounts : [amountVal],
    };

    const startTime = performance.now();
    try {
      const result = await ApiService.predictTransaction(payload);
      const latency = Math.round(performance.now() - startTime);

      this.renderResults(result, latency, payload);
    } catch (err) {
      console.error("Simulation error:", err);
      Toast.danger(
        "Inference Failed",
        "Unable to reach the prediction service.",
      );
    } finally {
      if (btn) btn.classList.remove("disabled");
      if (spinner) spinner.classList.add("d-none");
    }
  },

  renderResults(res, latency, inputPayload) {
    const resultCard = document.getElementById("sim-result-card");
    if (resultCard) resultCard.classList.remove("d-none");

    const predBadge = document.getElementById("sim-pred-badge");
    const riskTierBadge = document.getElementById("sim-risk-tier-badge");
    const probEl = document.getElementById("sim-prob-val");
    const lossEl = document.getElementById("sim-loss-val");
    const latencyEl = document.getElementById("sim-latency");
    const reasonsContainer = document.getElementById("sim-reasons-list");

    const recBox = document.getElementById("sim-recommendation-box");
    const recIcon = document.getElementById("sim-rec-icon");
    const recTitle = document.getElementById("sim-rec-title");
    const recText = document.getElementById("sim-rec-text");
    const narrativeText = document.getElementById("sim-narrative-text");

    // Individual Sub-Scores
    const mlScoreEl = document.getElementById("score-ml");
    const behScoreEl = document.getElementById("score-beh");
    const velScoreEl = document.getElementById("score-vel");
    const structScoreEl = document.getElementById("score-struct");
    const repScoreEl = document.getElementById("score-rep");

    const mlProb = res.ml_probability ?? res.fraud_probability ?? 0;
    const finalScore = res.final_risk_score ?? Math.round(mlProb * 100);
    const finalTier =
      res.final_risk_tier ??
      (finalScore >= 85
        ? "Critical"
        : finalScore >= 70
          ? "High"
          : finalScore >= 40
            ? "Medium"
            : "Low");
    const isFraud = res.prediction === "FRAUD" || finalScore >= 50;

    const velScore = Math.round(res.velocity_score ?? 0);
    const structScore = Math.round(res.structuring_score ?? 0);
    const repScore = Math.round(
      res.recipient_risk_score ?? res.recipient_reputation_score ?? 0,
    );
    const behScore = Math.round(res.behavioral_risk_score ?? 0);

    // Update 5 Metric Tiles
    if (mlScoreEl) mlScoreEl.textContent = formatPercent(mlProb, 1);
    if (behScoreEl) behScoreEl.textContent = `${behScore}`;
    if (velScoreEl) velScoreEl.textContent = `${velScore}`;
    if (structScoreEl) structScoreEl.textContent = `${structScore}`;
    if (repScoreEl) repScoreEl.textContent = `${repScore}`;

    // Latency
    if (latencyEl) latencyEl.textContent = `${latency}ms Latency`;

    // Prediction Badge
    if (predBadge) {
      if (isFraud) {
        predBadge.className = "status-pill pill-critical";
        predBadge.innerHTML =
          '<i class="bi bi-shield-slash"></i> FRAUD DETECTED';
      } else {
        predBadge.className = "status-pill pill-low";
        predBadge.innerHTML =
          '<i class="bi bi-shield-check"></i> LEGITIMATE TRANSACTION';
      }
    }

    // Risk Tier Badge
    if (riskTierBadge) {
      let pillClass = "pill-low";
      if (finalTier === "Critical") pillClass = "pill-critical";
      else if (finalTier === "High") pillClass = "pill-high";
      else if (finalTier === "Medium") pillClass = "pill-medium";
      riskTierBadge.className = `status-pill ${pillClass} font-mono`;
      riskTierBadge.textContent = `${finalTier} Risk (${finalScore}/100)`;
    }

    // Final Risk & Loss values
    if (probEl) {
      probEl.textContent = `${finalScore.toFixed(1)} / 100`;
      probEl.style.color = isFraud
        ? "var(--status-danger)"
        : "var(--status-success)";
    }
    if (lossEl) {
      lossEl.textContent = formatCurrency(
        res.expected_loss || inputPayload.amount * (finalScore / 100),
      );
      lossEl.style.color = isFraud
        ? "var(--status-danger)"
        : "var(--status-success)";
    }

    // Influencing Attributions (SHAP Drivers)
    if (reasonsContainer) {
      const reasons = res.reasons || [];
      if (reasons.length === 0) {
        reasonsContainer.innerHTML = `
          <div style="color: var(--text-muted); font-size: 0.75rem; padding: 8px 0;">
            No abnormal risk factors detected. Feature attributions remain within standard baseline bounds.
          </div>
        `;
      } else {
        reasonsContainer.innerHTML = reasons
          .map(
            (r) => `
          <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; padding: 6px 10px; background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-sm);">
            <i class="bi bi-exclamation-triangle-fill" style="color: var(--status-danger);"></i>
            <span style="color: var(--text-primary);">${r}</span>
          </div>
        `,
          )
          .join("");
      }
    }

    // Recommendation Box Logic
    if (recBox && recTitle && recText && recIcon) {
      if (res.recommended_action) {
        recText.textContent = res.recommended_action;
      }
      if (finalTier === "Critical") {
        recBox.style.background = "rgba(239, 68, 68, 0.08)";
        recBox.style.borderColor = "rgba(239, 68, 68, 0.22)";
        recIcon.className = "bi bi-exclamation-octagon-fill";
        recIcon.style.color = "var(--status-danger)";
        recTitle.style.color = "var(--status-danger)";
        recTitle.textContent = "CRITICAL ACTION REQUIRED";
        if (!res.recommended_action)
          recText.textContent =
            "Immediate intervention required. Freeze origin account and halt settlement dispatch to prevent permanent wire loss. Escalate case to Senior Financial Crime Unit.";
      } else if (finalTier === "High") {
        recBox.style.background = "rgba(245, 158, 11, 0.08)";
        recBox.style.borderColor = "rgba(245, 158, 11, 0.22)";
        recIcon.className = "bi bi-shield-exclamation";
        recIcon.style.color = "var(--status-warning)";
        recTitle.style.color = "var(--status-warning)";
        recTitle.textContent = "HIGH RISK - MANUAL INVESTIGATION";
        if (!res.recommended_action)
          recText.textContent =
            "Secondary analyst verification required. Flag transaction for manual wire confirmation and temporarily hold settlement dispatch window.";
      } else if (finalTier === "Medium") {
        recBox.style.background = "rgba(139, 92, 246, 0.08)";
        recBox.style.borderColor = "rgba(139, 92, 246, 0.22)";
        recIcon.className = "bi bi-shield-shaded";
        recIcon.style.color = "var(--accent-primary)";
        recTitle.style.color = "var(--accent-primary)";
        recTitle.textContent = "MEDIUM RISK - STEP-UP AUTHENTICATION";
        if (!res.recommended_action)
          recText.textContent =
            "Trigger out-of-band MFA/OTP challenge. Monitor originator for rapid velocity spikes in subsequent clearing cycles.";
      } else {
        recBox.style.background = "rgba(34, 197, 94, 0.08)";
        recBox.style.borderColor = "rgba(34, 197, 94, 0.22)";
        recIcon.className = "bi bi-check-circle-fill";
        recIcon.style.color = "var(--status-success)";
        recTitle.style.color = "var(--status-success)";
        recTitle.textContent = "CLEARED FOR SETTLEMENT";
        if (!res.recommended_action)
          recText.textContent =
            "No action required. Transaction pattern conforms to normal consumer banking behavior and falls within expected velocity limits.";
      }
    }

    // Natural Language Case Narrative Generator
    if (narrativeText && inputPayload) {
      if (res.narrative) {
        narrativeText.textContent = res.narrative;
      } else {
        const channel = this.channelNames[inputPayload.type] || "TRANSFER";
        const formattedAmt = formatCurrency(inputPayload.amount);
        let narrative = `Evaluation of ${channel} request for ${formattedAmt} to ${inputPayload.dest_account}. `;
        if (finalScore >= 70) {
          narrative += `Multi-Engine synthesis assigned a composite risk score of ${finalScore}/100 (${finalTier} Risk). `;
          if (velScore >= 70)
            narrative += `Severe velocity burst detected (${velScore}/100). `;
          if (structScore >= 70)
            narrative += `Structuring smurfing signature identified (${structScore}/100). `;
          if (repScore >= 70)
            narrative += `Recipient has prior confirmed fraud linkages (${repScore}/100). `;
          narrative += `Risk Fusion (70% ML, 20% Behavioral, 10% Rules) mandates decisive compliance intervention.`;
        } else {
          narrative += `Model and behavioral sub-engines classified transaction within standard baseline parameters (${finalScore}/100 risk).`;
        }
        narrativeText.textContent = narrative;
      }
    }
  },

  attachEventListeners() {
    // Preset buttons
    document.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const presetKey = btn.getAttribute("data-preset");
        document
          .querySelectorAll("[data-preset]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.loadPreset(presetKey);
        this.runSimulation();
      });
    });

    // Input listeners for derived updates and safety checks
    [
      "sim-amount",
      "sim-oldbalanceOrg",
      "sim-newbalanceOrig",
      "sim-oldbalanceDest",
      "sim-newbalanceDest",
    ].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener("input", () => this.updateDerivedFeatures());
      }
    });

    const destInput = document.getElementById("sim-destAccount");
    if (destInput) {
      destInput.addEventListener("change", () => this.checkCustomerSafety());
    }

    const checkSafetyBtn = document.getElementById("btn-pre-check-safety");
    if (checkSafetyBtn) {
      checkSafetyBtn.addEventListener("click", () =>
        this.checkCustomerSafety(),
      );
    }

    // Safety Banner Action Buttons
    const proceedBtn = document.getElementById("safety-proceed-btn");
    if (proceedBtn) {
      proceedBtn.addEventListener("click", () => {
        Toast.info(
          "Safety Acknowledged",
          "User confirmed awareness of recipient risk.",
        );
        this.runSimulation();
      });
    }

    const cancelBtn = document.getElementById("safety-cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        const dest = document.getElementById("sim-destAccount");
        if (dest) dest.value = "";
        const banner = document.getElementById("safety-advisory-banner");
        if (banner) banner.style.display = "none";
        Toast.success(
          "Transfer Aborted",
          "Payment to suspicious recipient was cancelled safely.",
        );
      });
    }

    // Run Predict Button
    const runBtn = document.getElementById("runSimulationBtn");
    if (runBtn) {
      runBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.runSimulation();
      });
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("sim-amount")) {
    SimulatorController.init();
  }
});
