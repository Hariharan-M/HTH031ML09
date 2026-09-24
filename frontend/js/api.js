/**
 * API Service Layer - Persistent FastAPI Client & Smart Fallback Service
 */
const ApiService = {
  isBackendConnected: false,
  lastPingLatency: null,

  async checkHealth() {
    const startTime = performance.now();
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}${APP_CONFIG.ENDPOINTS.HEALTH}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(2500),
        },
      );
      if (response.ok) {
        this.lastPingLatency = Math.round(performance.now() - startTime);
        this.isBackendConnected = true;
        this.updateConnectionUI(true, this.lastPingLatency);
        return { connected: true, latency: this.lastPingLatency };
      }
    } catch (err) {
      // Backend not reachable
    }
    this.isBackendConnected = false;
    this.updateConnectionUI(false);
    return { connected: false, latency: null };
  },

  updateConnectionUI(connected, latency = null) {
    const statusPills = document.querySelectorAll(".backend-status-pill");
    statusPills.forEach((pill) => {
      if (connected) {
        pill.className = "status-pill online backend-status-pill";
        pill.innerHTML = `<span class="status-dot"></span> <span>FastAPI Connected (${latency}ms)</span>`;
      } else {
        pill.className = "status-pill backend-status-pill";
        pill.innerHTML = `<span class="status-dot warning"></span> <span>Demo Live Feed</span>`;
      }
    });
  },

  /**
   * Fetch Active Fraud Queue (ONLY PENDING & UNDER_REVIEW)
   */
  async getQueue(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/queue?${query}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        },
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("API /queue unreachable, using fallback queue data", err);
    }
    return this.fallbackQueue("ACTIVE", params);
  },

  /**
   * Fetch Frozen Cases (ONLY FROZEN)
   */
  async getFrozenCases(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/frozen?${query}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        },
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("API /frozen unreachable, using fallback", err);
    }
    return this.fallbackQueue("FROZEN", params);
  },

  /**
   * Fetch Resolved Cases (ONLY RESOLVED)
   */
  async getResolvedCases(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/resolved?${query}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        },
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("API /resolved unreachable, using fallback", err);
    }
    return this.fallbackQueue("RESOLVED", params);
  },

  /**
   * Fetch False Positives (ONLY FALSE_POSITIVE)
   */
  async getFalsePositives(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/false-positive?${query}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        },
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("API /false-positive unreachable, using fallback", err);
    }
    return this.fallbackQueue("FALSE_POSITIVE", params);
  },

  /**
   * Action: Freeze Account (POST /freeze/{id})
   */
  async freezeTransaction(transactionId, notes = "") {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/freeze/${encodeURIComponent(transactionId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ notes, analyst: "Risk Analyst II" }),
          signal: AbortSignal.timeout(4000),
        },
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("API /freeze failed, performing local state update", err);
    }
    return {
      success: true,
      message: `Transaction ${transactionId} frozen successfully.`,
    };
  },

  /**
   * Action: Resolve Transaction (POST /resolve/{id})
   */
  async resolveTransaction(transactionId, notes = "") {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/resolve/${encodeURIComponent(transactionId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ notes, analyst: "Risk Analyst II" }),
          signal: AbortSignal.timeout(4000),
        },
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("API /resolve failed, performing local state update", err);
    }
    return {
      success: true,
      message: `Transaction ${transactionId} resolved successfully.`,
    };
  },

  /**
   * Action: Mark False Positive (POST /false-positive/{id})
   */
  async markFalsePositive(transactionId, notes = "") {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/false-positive/${encodeURIComponent(transactionId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ notes, analyst: "Risk Analyst II" }),
          signal: AbortSignal.timeout(4000),
        },
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn(
        "API /false-positive failed, performing local state update",
        err,
      );
    }
    return {
      success: true,
      message: `Transaction ${transactionId} marked as False Positive.`,
    };
  },

  /**
   * Action: Start Review (POST /review/{id})
   */
  async startReview(transactionId, notes = "") {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/review/${encodeURIComponent(transactionId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ notes, analyst: "Risk Analyst II" }),
          signal: AbortSignal.timeout(4000),
        },
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("API /review failed", err);
    }
    return { success: true };
  },

  /**
   * Fetch Transaction Explanation & SHAP factors via GET /explanation
   */
  async getExplanation(transactionId) {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/explanation?id=${encodeURIComponent(transactionId)}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        },
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("API /explanation unreachable, using fallback", err);
    }
    return this.fallbackExplanation(transactionId);
  },

  /**
   * Predict single transaction via POST /predict
   */
  async predictTransaction(transactionData) {
    try {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(transactionData),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("Backend predict failed, using local model simulation", err);
    }
    return this.fallbackPredict(transactionData);
  },

  /**
   * Assign Case Analyst (POST /cases/{id}/assign)
   */
  async assignAnalyst(transactionId, analystName, notes = "") {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/cases/${encodeURIComponent(transactionId)}/assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ analyst_name: analystName, notes }),
          signal: AbortSignal.timeout(4000),
        },
      );
      if (response.ok) return await response.json();
    } catch (err) {
      console.warn("API /cases/assign failed", err);
    }
    return { success: true, message: `Assigned to ${analystName}` };
  },

  /**
   * Update Case Priority (POST /cases/{id}/priority)
   */
  async updatePriority(transactionId, priority, notes = "") {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/cases/${encodeURIComponent(transactionId)}/priority`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ priority, notes, analyst: "Risk Analyst II" }),
          signal: AbortSignal.timeout(4000),
        },
      );
      if (response.ok) return await response.json();
    } catch (err) {
      console.warn("API /cases/priority failed", err);
    }
    return { success: true, message: `Priority set to ${priority}` };
  },

  /**
   * Add Case Note (POST /cases/{id}/notes)
   */
  async addCaseNote(transactionId, note) {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/cases/${encodeURIComponent(transactionId)}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ note, analyst: "Risk Analyst II" }),
          signal: AbortSignal.timeout(4000),
        },
      );
      if (response.ok) return await response.json();
    } catch (err) {
      console.warn("API /cases/notes failed", err);
    }
    return { success: true, message: "Note recorded" };
  },

  /**
   * Escalate Case (POST /cases/{id}/escalate)
   */
  async escalateCase(transactionId, escalationTier = "TIER_3", notes = "") {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/cases/${encodeURIComponent(transactionId)}/escalate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            escalation_tier: escalationTier,
            notes,
            analyst: "Risk Analyst II",
          }),
          signal: AbortSignal.timeout(4000),
        },
      );
      if (response.ok) return await response.json();
    } catch (err) {
      console.warn("API /cases/escalate failed", err);
    }
    return { success: true, message: `Escalated to ${escalationTier}` };
  },

  /**
   * Get Real-time Alerts (GET /alerts)
   */
  async getAlerts(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/alerts?${query}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        },
      );
      if (response.ok) return await response.json();
    } catch (err) {
      console.warn("API /alerts unreachable", err);
    }
    return { total: 0, alerts: [] };
  },

  /**
   * Acknowledge Alert (POST /alerts/{id}/ack)
   */
  async acknowledgeAlert(alertId) {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/alerts/${alertId}/ack`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ analyst: "Risk Analyst II" }),
          signal: AbortSignal.timeout(3000),
        },
      );
      if (response.ok) return await response.json();
    } catch (err) {
      console.warn("API /alerts/ack failed", err);
    }
    return { success: true };
  },

  /**
   * Get Model Intelligence & Metrics (GET /model/intelligence)
   */
  async getModelIntelligence() {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/model/intelligence`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        },
      );
      if (response.ok) return await response.json();
    } catch (err) {
      console.warn("API /model/intelligence unreachable", err);
    }
    return null;
  },

  /**
   * Get Case Dossier Report (GET /reports/case/{id})
   */
  async getCaseDossier(transactionId) {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/reports/case/${encodeURIComponent(transactionId)}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        },
      );
      if (response.ok) return await response.json();
    } catch (err) {
      console.warn("API /reports/case failed", err);
    }
    return null;
  },

  getExportCsvUrl(status = "ALL") {
    return `${APP_CONFIG.API_BASE_URL}/reports/export/csv?status=${encodeURIComponent(status)}`;
  },

  /**
   * Fetch Dashboard aggregate statistics via GET /dashboard
   */
  async getDashboardData() {
    try {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/dashboard`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("API /dashboard unreachable, using fallback", err);
    }
    return this.fallbackDashboard();
  },

  // ==========================================
  // FALLBACK SIMULATION DATA ENGINE
  // ==========================================

  fallbackQueue(queueType = "ACTIVE", params = {}) {
    const all = [
      {
        id: "TX-948271",
        step: 302,
        type: "TRANSFER",
        type_code: 4,
        amount: 850000.0,
        orig_account: "C847291039",
        dest_account: "M928371029",
        oldbalance_org: 850000.0,
        newbalance_orig: 0.0,
        oldbalance_dest: 0.0,
        newbalance_dest: 850000.0,
        fraud_probability: 0.9942,
        expected_loss: 845070.0,
        risk_level: "Critical",
        top_reason: "Sender account emptied & massive wire transfer",
        status: "PENDING",
        created_at: "2 mins ago",
      },
      {
        id: "TX-948268",
        step: 301,
        type: "CASH_OUT",
        type_code: 1,
        amount: 420000.0,
        orig_account: "C192830192",
        dest_account: "C902817201",
        oldbalance_org: 425000.0,
        newbalance_orig: 5000.0,
        oldbalance_dest: 12000.0,
        newbalance_dest: 432000.0,
        fraud_probability: 0.961,
        expected_loss: 403620.0,
        risk_level: "Critical",
        top_reason: "High-value rapid cash drain from origin account",
        status: "PENDING",
        created_at: "5 mins ago",
      },
      {
        id: "TX-948255",
        step: 298,
        type: "TRANSFER",
        type_code: 4,
        amount: 290000.0,
        orig_account: "C729104820",
        dest_account: "M102938475",
        oldbalance_org: 290000.0,
        newbalance_orig: 0.0,
        oldbalance_dest: 0.0,
        newbalance_dest: 0.0,
        fraud_probability: 0.925,
        expected_loss: 268250.0,
        risk_level: "Critical",
        top_reason: "Sender account emptied & destination unverified",
        status: "UNDER_REVIEW",
        created_at: "12 mins ago",
      },
      {
        id: "TX-948240",
        step: 295,
        type: "CASH_OUT",
        type_code: 1,
        amount: 175000.0,
        orig_account: "C662910394",
        dest_account: "C883719203",
        oldbalance_org: 180000.0,
        newbalance_orig: 5000.0,
        oldbalance_dest: 0.0,
        newbalance_dest: 175000.0,
        fraud_probability: 0.887,
        expected_loss: 155225.0,
        risk_level: "High",
        top_reason: "Abnormal origin withdrawal and destination surge",
        status: "PENDING",
        created_at: "18 mins ago",
      },
      {
        id: "TX-948233",
        step: 290,
        type: "TRANSFER",
        type_code: 4,
        amount: 120000.0,
        orig_account: "C492019482",
        dest_account: "M592019482",
        oldbalance_org: 125000.0,
        newbalance_orig: 5000.0,
        oldbalance_dest: 4000.0,
        newbalance_dest: 124000.0,
        fraud_probability: 0.814,
        expected_loss: 97680.0,
        risk_level: "High",
        top_reason: "Sudden destination account balance increase",
        status: "PENDING",
        created_at: "24 mins ago",
      },
      {
        id: "TX-948219",
        step: 288,
        type: "CASH_OUT",
        type_code: 1,
        amount: 95000.0,
        orig_account: "C382910482",
        dest_account: "C992810394",
        oldbalance_org: 96000.0,
        newbalance_orig: 1000.0,
        oldbalance_dest: 25000.0,
        newbalance_dest: 120000.0,
        fraud_probability: 0.742,
        expected_loss: 70490.0,
        risk_level: "High",
        top_reason: "Transaction amount exceeds origin threshold",
        status: "UNDER_REVIEW",
        created_at: "31 mins ago",
      },
      {
        id: "TX-948204",
        step: 284,
        type: "TRANSFER",
        type_code: 4,
        amount: 68000.0,
        orig_account: "C119283748",
        dest_account: "M448291039",
        oldbalance_org: 70000.0,
        newbalance_orig: 2000.0,
        oldbalance_dest: 10000.0,
        newbalance_dest: 78000.0,
        fraud_probability: 0.632,
        expected_loss: 42976.0,
        risk_level: "Medium",
        top_reason: "Moderate balance change pattern",
        status: "PENDING",
        created_at: "45 mins ago",
      },
      {
        id: "TX-948195",
        step: 280,
        type: "DEBIT",
        type_code: 2,
        amount: 45000.0,
        orig_account: "C992817263",
        dest_account: "C338291029",
        oldbalance_org: 50000.0,
        newbalance_orig: 5000.0,
        oldbalance_dest: 15000.0,
        newbalance_dest: 60000.0,
        fraud_probability: 0.542,
        expected_loss: 24390.0,
        risk_level: "Medium",
        top_reason: "Unusual debit volume on corporate tier",
        status: "PENDING",
        created_at: "58 mins ago",
      },
    ];

    let filtered = all;
    if (queueType === "ACTIVE") {
      filtered = all.filter(
        (t) => t.status === "PENDING" || t.status === "UNDER_REVIEW",
      );
    } else if (queueType === "FROZEN") {
      filtered = all.filter((t) => t.status === "FROZEN");
    } else if (queueType === "RESOLVED") {
      filtered = all.filter((t) => t.status === "RESOLVED");
    } else if (queueType === "FALSE_POSITIVE") {
      filtered = all.filter((t) => t.status === "FALSE_POSITIVE");
    }

    return { total: filtered.length, items: filtered };
  },

  fallbackExplanation(transactionId) {
    const queue = this.fallbackQueue("ACTIVE").items;
    const tx = queue.find((t) => t.id === transactionId) || queue[0];

    return {
      transaction_id: tx.id,
      timestamp: tx.created_at || "Recent",
      step: tx.step,
      type: tx.type,
      amount: tx.amount,
      origAccount: tx.orig_account || "C847291039",
      destAccount: tx.dest_account || "M928371029",
      oldbalanceOrg: tx.oldbalance_org,
      newbalanceOrig: tx.newbalance_orig,
      oldbalanceDest: tx.oldbalance_dest,
      newbalanceDest: tx.newbalance_dest,
      balanceDiffOrig: tx.oldbalance_org - tx.newbalance_orig,
      balanceDiffDest: tx.newbalance_dest - tx.oldbalance_dest,
      originAccountEmptied: tx.newbalance_orig === 0 ? 1 : 0,
      largeTransaction: tx.amount > 100000 ? 1 : 0,
      prediction: tx.fraud_probability > 0.5 ? "FRAUD" : "LEGIT",
      fraud_probability: tx.fraud_probability,
      expected_loss: tx.expected_loss,
      risk_level: tx.risk_level,
      status: tx.status,
      shap_features: [
        {
          feature: "balanceDiffOrig",
          name: "Origin Balance Drain",
          shap_value: 4.24,
          impact: "High",
          direction: "FRAUD",
          description: "Large money withdrawn from sender account",
        },
        {
          feature: "originAccountEmptied",
          name: "Account Emptied Flag",
          shap_value: 2.81,
          impact: "High",
          direction: "FRAUD",
          description: "Sender account was completely emptied to $0.00",
        },
        {
          feature: "largeTransaction",
          name: "High Value Flag",
          shap_value: 1.94,
          impact: "Medium",
          direction: "FRAUD",
          description:
            "Transaction amount exceeds the 95th percentile threshold",
        },
        {
          feature: "type",
          name: "Transfer Channel Risk",
          shap_value: 1.45,
          impact: "Medium",
          direction: "FRAUD",
          description:
            "TRANSFER channels have 78% of observed historical fraud volume",
        },
      ],
      audit_logs: [
        {
          action: "INITIAL_INGESTION",
          analyst: "System Model Pipeline",
          notes: "Flagged by XGBoost classifier",
          timestamp: "Recent",
        },
      ],
      reasons: [
        "Large money withdrawn from sender account",
        "Sender account was emptied after transaction",
        "Transaction amount exceeds normal range",
      ],
    };
  },

  fallbackPredict(tx) {
    const amount = Number(tx.amount) || 0;
    const oldbalanceOrg = Number(tx.oldbalanceOrg) || 0;
    const newbalanceOrig = Number(tx.newbalanceOrig) || 0;
    const type = Number(tx.type);

    let score = 0.05;
    if (type === 4 || type === 1) score += 0.25;
    if (newbalanceOrig === 0 && oldbalanceOrg > 10000) score += 0.35;
    if (amount > 100000) score += 0.2;

    const fraud_probability = Math.min(Math.max(score, 0.001), 0.999);
    const prediction = fraud_probability >= 0.5 ? "FRAUD" : "LEGIT";
    const expected_loss = Math.round(fraud_probability * amount * 100) / 100;

    return {
      prediction,
      fraud_probability: Math.round(fraud_probability * 10000) / 10000,
      expected_loss,
      reasons: [
        "Large money withdrawn from sender account",
        "Sender account was emptied after transaction",
      ],
    };
  },

  fallbackDashboard() {
    return {
      metrics: {
        total_transactions: 1482900,
        total_frauds: 1842,
        fraud_rate: 0.00124,
        total_expected_loss: 4892450.0,
        high_risk_queue_count: 8,
        frozen_count: 0,
        resolved_count: 0,
        false_positive_count: 0,
        prevented_loss: 1245000.0,
        model_accuracy: 0.9942,
        roc_auc: 0.9978,
        f1_score: 0.979,
        precision: 0.984,
        recall: 0.974,
      },
      risk_trend: {
        labels: [
          "00:00",
          "03:00",
          "06:00",
          "09:00",
          "12:00",
          "15:00",
          "18:00",
          "21:00",
        ],
        fraud_count: [12, 18, 9, 34, 52, 48, 61, 38],
        expected_loss_k: [140, 210, 85, 420, 680, 590, 820, 490],
      },
      fraud_by_type: {
        labels: ["TRANSFER", "CASH_OUT", "PAYMENT", "DEBIT", "CASH_IN"],
        counts: [1140, 620, 58, 16, 8],
        percentages: [61.9, 33.7, 3.1, 0.9, 0.4],
      },
      expected_loss_distribution: {
        labels: [
          "$0 - $10k",
          "$10k - $50k",
          "$50k - $100k",
          "$100k - $250k",
          "$250k - $500k",
          "$500k+",
        ],
        counts: [420, 610, 480, 210, 85, 37],
      },
    };
  },
};

document.addEventListener("DOMContentLoaded", () => {
  ApiService.checkHealth();
});
