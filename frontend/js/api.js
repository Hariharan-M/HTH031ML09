/**
 * API Service Layer - Persistent FastAPI Client & Smart Fallback Service
 * Aegis Risk Intelligence - Upgraded with Behavioral Fraud Detection & Customer Safety
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
        pill.className = "status-pill pill-low backend-status-pill";
        pill.innerHTML = `<span class="pill-dot"></span> <span>FastAPI Connected (${latency}ms)</span>`;
      } else {
        pill.className = "status-pill pill-neutral backend-status-pill";
        pill.innerHTML = `<span class="pill-dot"></span> <span>Demo Live Feed</span>`;
      }
    });
  },

  /**
   * Fetch Active Fraud Queue with Category Support
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
   * Run Real-Time Multi-Factor & Behavioral Prediction (POST /predict)
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
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("API /predict failed, using fallback prediction", err);
    }
    return this.fallbackPredict(transactionData);
  },

  /**
   * Customer Safety Pre-Transfer Check (POST /safety/recipient-check)
   */
  async checkRecipientSafety(accountId, amount = 0) {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/safety/recipient-check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            account_id: accountId,
            amount: Number(amount) || 0,
          }),
          signal: AbortSignal.timeout(3000),
        },
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn(
        "API /safety/recipient-check unreachable, using fallback safety check",
        err,
      );
    }
    return this.fallbackRecipientSafety(accountId);
  },

  /**
   * Fetch Single Transaction Full Explanation & Audit Dossier (GET /explanation/{id})
   */
  async getExplanation(transactionId) {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/explanation/${encodeURIComponent(transactionId)}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        },
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn(
        `API /explanation/${transactionId} failed, using fallback`,
        err,
      );
    }
    return this.fallbackExplanation(transactionId);
  },

  /**
   * Freeze Origin Account (POST /cases/{id}/freeze)
   */
  async freezeAccount(
    transactionId,
    notes = "",
    analyst = "Sarah Lin (Lead FCU)",
  ) {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/cases/${encodeURIComponent(transactionId)}/freeze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ analyst, notes }),
          signal: AbortSignal.timeout(4000),
        },
      );
      if (response.ok) return await response.json();
    } catch (err) {
      console.warn("API /cases/freeze failed", err);
    }
    return {
      success: true,
      message: `Account frozen for case ${transactionId}`,
    };
  },

  /**
   * Resolve Case / Mark Legitimate (POST /cases/{id}/resolve)
   */
  async resolveCase(transactionId, notes = "", analyst = "Marcus Vance") {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/cases/${encodeURIComponent(transactionId)}/resolve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ analyst, notes }),
          signal: AbortSignal.timeout(4000),
        },
      );
      if (response.ok) return await response.json();
    } catch (err) {
      console.warn("API /cases/resolve failed", err);
    }
    return { success: true, message: `Case ${transactionId} resolved` };
  },

  /**
   * Mark False Positive (POST /cases/{id}/false-positive)
   */
  async markFalsePositive(
    transactionId,
    justification = "",
    analyst = "Elena Rostova",
  ) {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/cases/${encodeURIComponent(transactionId)}/false-positive`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ analyst, justification }),
          signal: AbortSignal.timeout(4000),
        },
      );
      if (response.ok) return await response.json();
    } catch (err) {
      console.warn("API /cases/false-positive failed", err);
    }
    return {
      success: true,
      message: `Case ${transactionId} marked as False Positive`,
    };
  },

  /**
   * Assign Case to Analyst (POST /cases/{id}/assign)
   */
  async assignAnalyst(transactionId, analystName) {
    try {
      const response = await fetch(
        `${APP_CONFIG.API_BASE_URL}/cases/${encodeURIComponent(transactionId)}/assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ analyst_name: analystName }),
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
   * Add Analyst Note (POST /cases/{id}/notes)
   */
  async addNote(transactionId, note) {
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
    return { success: true, message: "Note added" };
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
      console.warn(
        "API /model/intelligence unreachable, using fallback intelligence",
        err,
      );
    }
    return this.fallbackModelIntelligence();
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
  // FALLBACK SIMULATION & BEHAVIORAL DATA ENGINE
  // ==========================================

  fallbackRecipientSafety(accountId) {
    const highRiskAccounts = {
      M928371029: {
        holder: "Offshore Wire Beneficiary Ltd",
        score: 96.0,
        level: "CRITICAL_FRAUD",
        tags: "Mule Account,Frozen",
      },
      C994821049: {
        holder: "David R. Mule Holder",
        score: 88.0,
        level: "HIGH_RISK",
        tags: "Dispersal Mule",
      },
      C112233445: {
        holder: "QuickPay Virtual Wallet #41",
        score: 92.0,
        level: "CRITICAL_FRAUD",
        tags: "Crypto Ramp,Frozen",
      },
      M556677889: {
        holder: "Apex Gaming Global Services",
        score: 72.0,
        level: "HIGH_RISK",
        tags: "Structuring Endpoint",
      },
      C778899001: {
        holder: "Alex Chen (Unverified Tier 1)",
        score: 68.0,
        level: "HIGH_RISK",
        tags: "Fan-Out Target",
      },
    };

    const rep = highRiskAccounts[accountId];
    if (rep) {
      return {
        account_id: accountId,
        account_holder: rep.holder,
        reputation_score: rep.score,
        risk_level: rep.level,
        has_prior_fraud: true,
        is_frozen: rep.level === "CRITICAL_FRAUD",
        is_safe: false,
        warning_required: true,
        warning_message:
          "Warning: This recipient account has previously been linked to suspicious or fraudulent activity. Proceed with caution.",
        tags: rep.tags,
        safety_action: "CONFIRMATION_REQUIRED",
      };
    }

    return {
      account_id: accountId || "UNKNOWN",
      account_holder: accountId ? `Account ${accountId}` : "Verified Account",
      reputation_score: 5.0,
      risk_level: "CLEAN",
      has_prior_fraud: false,
      is_frozen: false,
      is_safe: true,
      warning_required: false,
      warning_message: null,
      tags: "Verified History",
      safety_action: "SAFE_TO_TRANSFER",
    };
  },

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
        priority: "CRITICAL",
        assigned_analyst: "Sarah Lin (Lead FCU)",
        escalation_level: "TIER_2",
        transactions_last_hour: 1,
        transactions_last_day: 1,
        velocity_score: 35.0,
        structuring_score: 10.0,
        recipient_risk_score: 96.0,
        behavioral_risk_score: 52.0,
        final_risk_score: 98,
        fraud_category: "TRADITIONAL",
        created_at: "Just now",
      },
      {
        id: "TX-VEL-8491",
        step: 302,
        type: "TRANSFER",
        type_code: 4,
        amount: 48500.0,
        orig_account: "C583920194",
        dest_account: "C994821049",
        oldbalance_org: 240000.0,
        newbalance_orig: 191500.0,
        oldbalance_dest: 1200.0,
        newbalance_dest: 49700.0,
        fraud_probability: 0.948,
        expected_loss: 45978.0,
        risk_level: "Critical",
        top_reason:
          "High Transaction Velocity: 25 rapid transfers within 30 minutes",
        status: "PENDING",
        priority: "CRITICAL",
        assigned_analyst: "Marcus Vance",
        escalation_level: "TIER_2",
        transactions_last_hour: 25,
        transactions_last_day: 28,
        velocity_score: 96.0,
        structuring_score: 48.0,
        recipient_risk_score: 88.0,
        behavioral_risk_score: 86.5,
        final_risk_score: 95,
        fraud_category: "VELOCITY",
        created_at: "4 mins ago",
      },
      {
        id: "TX-STR-4921",
        step: 301,
        type: "CASH_OUT",
        type_code: 1,
        amount: 1400.0,
        orig_account: "C392817295",
        dest_account: "M556677889",
        oldbalance_org: 6000.0,
        newbalance_orig: 4600.0,
        oldbalance_dest: 8400.0,
        newbalance_dest: 9800.0,
        fraud_probability: 0.892,
        expected_loss: 1248.8,
        risk_level: "Critical",
        top_reason:
          "Structuring Smurfing: 6x micro-transfers aggregating to ₹6,000",
        status: "PENDING",
        priority: "CRITICAL",
        assigned_analyst: "Elena Rostova",
        escalation_level: "TIER_1",
        transactions_last_hour: 6,
        transactions_last_day: 8,
        velocity_score: 62.0,
        structuring_score: 94.0,
        recipient_risk_score: 72.0,
        behavioral_risk_score: 88.0,
        final_risk_score: 91,
        fraud_category: "STRUCTURING",
        created_at: "8 mins ago",
      },
      {
        id: "TX-REC-7712",
        step: 300,
        type: "TRANSFER",
        type_code: 4,
        amount: 35000.0,
        orig_account: "C774411223",
        dest_account: "C778899001",
        oldbalance_org: 280000.0,
        newbalance_orig: 245000.0,
        oldbalance_dest: 500.0,
        newbalance_dest: 35500.0,
        fraud_probability: 0.884,
        expected_loss: 30940.0,
        risk_level: "Critical",
        top_reason:
          "Recipient Burst Fan-Out: 1 sender transferring to 8 new accounts",
        status: "PENDING",
        priority: "HIGH",
        assigned_analyst: "Sarah Lin (Lead FCU)",
        escalation_level: "TIER_1",
        transactions_last_hour: 8,
        transactions_last_day: 10,
        velocity_score: 68.0,
        structuring_score: 42.0,
        recipient_risk_score: 85.0,
        behavioral_risk_score: 84.0,
        final_risk_score: 89,
        fraud_category: "RECIPIENT_RISK",
        created_at: "15 mins ago",
      },
      {
        id: "TX-948268",
        step: 300,
        type: "CASH_OUT",
        type_code: 1,
        amount: 420000.0,
        orig_account: "C192830192",
        dest_account: "C902817201",
        oldbalance_org: 425000.0,
        newbalance_orig: 5000.0,
        oldbalance_dest: 12000.0,
        newbalance_dest: 432000.0,
        fraud_probability: 0.963,
        expected_loss: 404460.0,
        risk_level: "Critical",
        top_reason: "Rapid ATM/Terminal cash out after balance inflow",
        status: "PENDING",
        priority: "CRITICAL",
        assigned_analyst: "Marcus Vance",
        escalation_level: "TIER_1",
        transactions_last_hour: 2,
        transactions_last_day: 3,
        velocity_score: 45.0,
        structuring_score: 15.0,
        recipient_risk_score: 40.0,
        behavioral_risk_score: 38.0,
        final_risk_score: 92,
        fraud_category: "TRADITIONAL",
        created_at: "22 mins ago",
      },
      {
        id: "TX-STR-4922",
        step: 298,
        type: "TRANSFER",
        type_code: 4,
        amount: 4800.0,
        orig_account: "C284910294",
        dest_account: "C112233445",
        oldbalance_org: 25000.0,
        newbalance_orig: 20200.0,
        oldbalance_dest: 0.0,
        newbalance_dest: 4800.0,
        fraud_probability: 0.865,
        expected_loss: 4152.0,
        risk_level: "Critical",
        top_reason:
          "Structuring Smurfing: sub-5k wire sent to blacklisted crypto mule",
        status: "UNDER_REVIEW",
        priority: "HIGH",
        assigned_analyst: "Elena Rostova",
        escalation_level: "TIER_2",
        transactions_last_hour: 5,
        transactions_last_day: 7,
        velocity_score: 58.0,
        structuring_score: 91.0,
        recipient_risk_score: 92.0,
        behavioral_risk_score: 85.0,
        final_risk_score: 86,
        fraud_category: "STRUCTURING",
        created_at: "34 mins ago",
      },
      {
        id: "TX-948150",
        step: 280,
        type: "TRANSFER",
        type_code: 4,
        amount: 620000.0,
        orig_account: "C998877665",
        dest_account: "M928371029",
        oldbalance_org: 620000.0,
        newbalance_orig: 0.0,
        oldbalance_dest: 0.0,
        newbalance_dest: 620000.0,
        fraud_probability: 0.9981,
        expected_loss: 618822.0,
        risk_level: "Critical",
        top_reason: "Confirmed Account Takeover & liquidation",
        status: "FROZEN",
        priority: "CRITICAL",
        assigned_analyst: "Sarah Lin (Lead FCU)",
        escalation_level: "TIER_3",
        transactions_last_hour: 1,
        transactions_last_day: 1,
        velocity_score: 30.0,
        structuring_score: 10.0,
        recipient_risk_score: 96.0,
        behavioral_risk_score: 45.0,
        final_risk_score: 99,
        fraud_category: "TRADITIONAL",
        created_at: "2 hours ago",
      },
      {
        id: "TX-948110",
        step: 275,
        type: "TRANSFER",
        type_code: 4,
        amount: 95000.0,
        orig_account: "C445566778",
        dest_account: "M182165910",
        oldbalance_org: 100000.0,
        newbalance_orig: 5000.0,
        oldbalance_dest: 2000.0,
        newbalance_dest: 97000.0,
        fraud_probability: 0.082,
        expected_loss: 7790.0,
        risk_level: "Low",
        top_reason: "Verified corporate escrow supplier wire",
        status: "RESOLVED",
        priority: "LOW",
        assigned_analyst: "Marcus Vance",
        escalation_level: "TIER_1",
        transactions_last_hour: 1,
        transactions_last_day: 2,
        velocity_score: 15.0,
        structuring_score: 5.0,
        recipient_risk_score: 2.0,
        behavioral_risk_score: 12.0,
        final_risk_score: 24,
        fraud_category: "NORMAL",
        created_at: "4 hours ago",
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
    }

    if (params.category && params.category !== "ALL") {
      filtered = filtered.filter((t) => t.fraud_category === params.category);
    }

    return { total: filtered.length, items: filtered };
  },

  fallbackExplanation(transactionId) {
    const queue = this.fallbackQueue("ACTIVE").items;
    const tx = queue.find((t) => t.id === transactionId) || queue[0];

    const behavioralInfo = {
      transactions_last_hour: tx.transactions_last_hour || 1,
      transactions_last_day: tx.transactions_last_day || 1,
      total_amount_last_hour: tx.amount,
      total_amount_last_day: tx.amount,
      unique_recipients_last_hour: 1,
      unique_recipients_last_day: 1,
      velocity_score: tx.velocity_score || 25.0,
      structuring_score: tx.structuring_score || 15.0,
      recipient_risk_score: tx.recipient_risk_score || 10.0,
      behavioral_risk_score: tx.behavioral_risk_score || 20.0,
      final_risk_score: tx.final_risk_score || 85,
      fraud_category: tx.fraud_category || "TRADITIONAL",
    };

    const safetyCheck = this.fallbackRecipientSafety(tx.dest_account);

    return {
      transaction_id: tx.id,
      timestamp: tx.created_at || "Recent",
      step: tx.step,
      type: tx.type,
      amount: tx.amount,
      origAccount: tx.orig_account,
      destAccount: tx.dest_account,
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
      priority: tx.priority || "HIGH",
      assigned_analyst: tx.assigned_analyst || "Sarah Lin (Lead FCU)",
      behavioral_intelligence: behavioralInfo,
      recipient_safety: safetyCheck,
      shap_features: [
        {
          feature: "recipient_reputation_score",
          name: "Recipient Reputation Score",
          shap_value: 4.12,
          impact: "High",
          direction: "FRAUD",
          description: "Recipient linked to prior high-risk fraud records",
        },
        {
          feature: "velocity_score",
          name: "Transaction Velocity Score",
          shap_value: 3.42,
          impact: "High",
          direction: "FRAUD",
          description: "Rapid transaction burst velocity",
        },
        {
          feature: "balanceDiffOrig",
          name: "Origin Balance Drain Delta",
          shap_value: 2.85,
          impact: "High",
          direction: "FRAUD",
          description: "Large funds withdrawn from sender account",
        },
        {
          feature: "structuring_score",
          name: "Structuring / Smurfing Score",
          shap_value: 2.15,
          impact: "Medium",
          direction: "FRAUD",
          description: "Sub-threshold repetitive transfer pattern",
        },
        {
          feature: "originAccountEmptied",
          name: "Origin Account Emptied",
          shap_value: 1.76,
          impact: "Medium",
          direction: "FRAUD",
          description: "Sender balance completely emptied to $0.00",
        },
      ],
      audit_logs: [
        {
          action: "INITIAL_INGESTION",
          analyst: "Aegis Behavioral Pipeline",
          notes: `Flagged under category ${tx.fraud_category}`,
          timestamp: "Recent",
        },
      ],
      reasons: [
        tx.top_reason,
        "Behavioral risk threshold divergence detected",
        "Recipient entity evaluated against historical FCU database",
      ],
    };
  },

  fallbackPredict(tx) {
    const amount = Number(tx.amount) || 0;
    const oldbalanceOrg = Number(tx.oldbalanceOrg) || 0;
    const newbalanceOrig = Number(tx.newbalanceOrig) || 0;
    const type = Number(tx.type);

    const velScore =
      tx.velocity_score !== undefined
        ? Number(tx.velocity_score)
        : tx.transactions_last_hour > 5
          ? 90.0
          : 15.0;
    const structScore =
      tx.structuring_score !== undefined
        ? Number(tx.structuring_score)
        : tx.transactions_last_hour > 3 && amount < 5000
          ? 92.0
          : 10.0;
    const repScore =
      tx.recipient_reputation_score !== undefined
        ? Number(tx.recipient_reputation_score)
        : tx.dest_account === "M928371029"
          ? 96.0
          : 5.0;

    let ml_prob = 0.05;
    if (type === 4 || type === 1) ml_prob += 0.3;
    if (newbalanceOrig === 0 && oldbalanceOrg > 10000) ml_prob += 0.4;
    if (amount > 100000) ml_prob += 0.2;
    if (velScore > 60 || structScore > 60 || repScore > 60) ml_prob += 0.35;

    const fraud_prob = Math.min(Math.max(ml_prob, 0.001), 0.999);
    const prediction = fraud_prob >= 0.5 ? "FRAUD" : "LEGIT";

    // Risk Fusion (70% ML + 20% Behavioral + 10% Rules)
    const behav_score = Math.max(velScore, structScore) * 0.7 + repScore * 0.3;
    const rule_score =
      repScore * 0.5 +
      (newbalanceOrig === 0 ? 30 : 0) +
      (amount > 100000 ? 20 : 0);

    const fused_score = Math.round(
      fraud_prob * 100 * 0.7 + behav_score * 0.2 + rule_score * 0.1,
    );
    const final_score = Math.min(100, Math.max(0, fused_score));

    let tier = "Low Risk";
    if (final_score >= 85) tier = "Critical Risk";
    else if (final_score >= 65) tier = "High Risk";
    else if (final_score >= 35) tier = "Medium Risk";

    let category = "NORMAL";
    if (velScore >= 65) category = "VELOCITY";
    else if (structScore >= 60) category = "STRUCTURING";
    else if (repScore >= 60) category = "RECIPIENT_RISK";
    else if (fraud_prob >= 0.5) category = "TRADITIONAL";

    const safetyCheck = this.fallbackRecipientSafety(
      tx.dest_account || "M928371029",
    );

    return {
      prediction,
      fraud_probability: Math.round(fraud_prob * 10000) / 10000,
      final_risk_score: final_score,
      final_risk_tier: tier,
      fraud_category: category,
      expected_loss: Math.round(fraud_prob * amount * 100) / 100,
      recommended_action:
        final_score >= 85
          ? "FREEZE_ACCOUNT"
          : final_score >= 65
            ? "ESCALATE_INVESTIGATION"
            : "CLEAR_TRANSACTION",
      behavioral_intelligence: {
        transactions_last_hour: tx.transactions_last_hour || 1,
        transactions_last_day: tx.transactions_last_day || 1,
        total_amount_last_hour: amount,
        total_amount_last_day: amount,
        unique_recipients_last_hour: tx.unique_recipients_last_hour || 1,
        unique_recipients_last_day: tx.unique_recipients_last_day || 1,
        velocity_score: velScore,
        structuring_score: structScore,
        recipient_burst_score: tx.recipient_burst_score || 10.0,
        recipient_reputation_score: repScore,
        behavioral_risk_score: Math.round(behav_score),
      },
      recipient_safety: safetyCheck,
      fused_risk: {
        final_risk_score: final_score,
        final_risk_tier: tier,
        category: category,
        sub_scores: {
          ml_score: Math.round(fraud_prob * 100),
          behavioral_score: Math.round(behav_score),
          velocity_score: velScore,
          structuring_score: structScore,
          recipient_reputation_score: repScore,
          rule_score: Math.round(rule_score),
        },
      },
      reasons: [
        velScore > 65
          ? "High Transaction Velocity: Rapid activity bursts detected"
          : "Transaction velocity within baseline",
        structScore > 60
          ? "Structuring Pattern: Multiple sub-threshold smurfing transfers"
          : "Amount conforms to baseline",
        repScore > 60
          ? "High Recipient Risk: Prior fraud/mule association"
          : "Recipient status clean",
      ],
    };
  },

  fallbackModelIntelligence() {
    return {
      model_metadata: {
        name: "Aegis Behavioral Multi-Factor Ensemble Classifier",
        version: "v2.5.0-prod",
        algorithm:
          "XGBoost + Temporal Behavioral Heuristics + Recipient Reputation Network",
        training_samples: 6362620,
        trained_at: "2026-09-25 01:20:00 UTC",
        status: "ACTIVE_PRODUCTION",
      },
      performance_metrics: {
        roc_auc: 0.9994,
        pr_auc: 0.9915,
        f1_score: 0.9845,
        precision: 0.988,
        recall: 0.981,
        accuracy: 0.9968,
      },
      confusion_matrix: {
        true_negatives: 6354407,
        false_positives: 180,
        false_negatives: 287,
        true_positives: 7926,
      },
      monthly_anomaly_trend: {
        labels: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        fraud_volume: [
          120, 156, 198, 245, 290, 315, 280, 340, 395, 420, 385, 450,
        ],
        exposure_amount_k: [
          310, 440, 520, 680, 810, 890, 760, 950, 1120, 1250, 1080, 1340,
        ],
      },
      channel_breakdown: {
        labels: ["TRANSFER", "CASH_OUT", "PAYMENT", "DEBIT", "CASH_IN"],
        counts: [1140, 620, 58, 16, 8],
        percentages: [61.9, 33.7, 3.1, 0.9, 0.4],
      },
      behavioral_vs_traditional: {
        labels: [
          "Velocity Fraud",
          "Structuring (Smurfing)",
          "Recipient Burst",
          "High-Risk Recipient",
          "Traditional Drain",
        ],
        counts: [520, 380, 290, 240, 412],
        percentages: [28.2, 20.6, 15.7, 13.0, 22.5],
      },
      velocity_risk_distribution: {
        labels: [
          "0-20 Low",
          "20-40 Moderate",
          "40-60 Elevated",
          "60-80 High",
          "80-100 Critical Burst",
        ],
        counts: [1420, 850, 420, 210, 88],
      },
      structuring_statistics: {
        labels: [
          "Sub-5k Micro",
          "Sub-10k Smurf",
          "Sub-50k Rounding",
          "Cross-Channel",
          "Normal",
        ],
        counts: [310, 420, 190, 85, 2400],
      },
      recipient_risk_distribution: {
        labels: [
          "Clean Verified",
          "Low Anomaly",
          "Flagged Mule",
          "Frozen Target",
          "Blacklisted",
        ],
        counts: [9850, 420, 115, 45, 18],
      },
      global_feature_importance: [
        {
          feature: "recipient_reputation_score",
          name: "Recipient Reputation Score",
          importance: 0.385,
          shap_mean: 4.12,
        },
        {
          feature: "velocity_score",
          name: "Transaction Velocity Score",
          importance: 0.245,
          shap_mean: 3.42,
        },
        {
          feature: "originAccountEmptied",
          name: "Origin Account Emptied",
          importance: 0.118,
          shap_mean: 2.85,
        },
        {
          feature: "structuring_score",
          name: "Structuring / Smurfing Score",
          importance: 0.082,
          shap_mean: 2.15,
        },
        {
          feature: "balanceDiffOrig",
          name: "Origin Balance Drain Delta",
          importance: 0.065,
          shap_mean: 1.76,
        },
        {
          feature: "recipient_burst_score",
          name: "Recipient Burst Fan-Out Score",
          importance: 0.042,
          shap_mean: 1.45,
        },
        {
          feature: "amount",
          name: "Transaction Amount",
          importance: 0.028,
          shap_mean: 1.1,
        },
        {
          feature: "type",
          name: "Transaction Type (Transfer/CashOut)",
          importance: 0.018,
          shap_mean: 0.85,
        },
        {
          feature: "unique_recipients_last_hour",
          name: "Unique Recipients Last Hour",
          importance: 0.01,
          shap_mean: 0.62,
        },
        {
          feature: "transactions_last_hour",
          name: "Transactions Last Hour",
          importance: 0.007,
          shap_mean: 0.44,
        },
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
        frozen_count: 1,
        resolved_count: 1,
        false_positive_count: 0,
        prevented_loss: 1245000.0,
        model_accuracy: 0.9942,
        roc_auc: 0.9984,
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
    };
  },

  /**
   * Fallback Single Transaction Explanation Dossier
   */
  fallbackExplanation(txId) {
    const isMule = txId && txId.includes("MULE");
    const isVel = txId && txId.includes("VEL");
    const isStr = txId && txId.includes("STR");
    const isLegit = txId && txId.includes("948110");

    let amount = 850000.0;
    let prob = 0.9942;
    let riskScore = 98;
    let riskTier = "Critical Risk";
    let riskLevel = "Critical";
    let orig = "C847291039";
    let dest = "M928371029";
    let oldOrig = 850000.0;
    let newOrig = 0.0;
    let oldDest = 0.0;
    let newDest = 850000.0;
    let step = 302;
    let type = "TRANSFER";

    if (isMule) {
      amount = 620000.0;
      prob = 0.998;
      riskScore = 99;
      dest = "M928371029";
      step = 301;
    } else if (isVel) {
      amount = 12000.0;
      prob = 0.942;
      riskScore = 94;
      step = 299;
    } else if (isStr) {
      amount = 4800.0;
      prob = 0.865;
      riskScore = 86;
      step = 298;
    } else if (isLegit) {
      amount = 95000.0;
      prob = 0.082;
      riskScore = 24;
      riskTier = "Low Risk";
      riskLevel = "Low";
      newOrig = 5000.0;
      step = 275;
    }

    const loss = Math.round(prob * amount * 100) / 100;

    const shapFeatures = [
      {
        feature: "recipient_reputation_score",
        name: "Recipient Reputation Risk",
        value: isMule ? 98.0 : 90.0,
        shap_value: 4.1,
        abs_shap: 4.1,
        impact: "High",
        direction: "FRAUD",
        description:
          "Recipient account associated with suspicious mule activity.",
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
        value: 1,
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
      {
        feature: "step",
        name: "Execution Timing Baseline",
        value: step,
        shap_value: -0.85,
        abs_shap: 0.85,
        impact: "Low",
        direction: "LEGIT",
        description:
          "Execution hour conforms to nominal network batch settlement window.",
      },
    ];

    const topReasons = [
      `Origin Balance Drain: Large withdrawal depleted sender balance by $${amount.toLocaleString()}.`,
      "Destination Surge: Receiver account balance increased significantly.",
      "Recipient Reputation Risk: Recipient account associated with suspicious mule activity.",
      "Account Emptied to $0: Source wallet completely drained to zero balance.",
    ];

    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const auditLogs = [
      {
        transaction_id: txId || "TX-948271",
        action: "MODEL_FLAGGED_TRANSACTION",
        analyst: "System (XGBoost 2.4)",
        notes: `High-risk anomaly flagged with score ${riskScore}/100. P(Fraud) = ${(prob * 100).toFixed(1)}%.`,
        timestamp: `${now} (Step ${step})`,
      },
      {
        transaction_id: txId || "TX-948271",
        action: "CASE_ASSIGNED",
        analyst: "Sarah Lin (Lead FCU)",
        notes:
          "Case assigned to Senior Financial Crime Unit for expedited triage.",
        timestamp: `${now}`,
      },
      {
        transaction_id: txId || "TX-948271",
        action: "ANALYST_REVIEW_STARTED",
        analyst: "Sarah Lin (Lead FCU)",
        notes:
          "Investigator opened case workspace. Reviewing TreeSHAP feature attributions.",
        timestamp: `${now}`,
      },
    ];

    const txObj = {
      id: txId || "TX-948271",
      step: step,
      type: type,
      type_code: 4,
      amount: amount,
      orig_account: orig,
      dest_account: dest,
      oldbalance_org: oldOrig,
      newbalance_orig: newOrig,
      oldbalance_dest: oldDest,
      newbalance_dest: newDest,
      balance_diff_orig: amount,
      balance_diff_dest: amount,
      origin_account_emptied: newOrig === 0 ? 1 : 0,
      large_transaction: amount > 100000 ? 1 : 0,
      fraud_probability: prob,
      risk_score: riskScore,
      final_risk_score: riskScore,
      risk_level: riskLevel,
      final_risk_tier: riskTier,
      expected_loss: loss,
      status: "UNDER_REVIEW",
      priority: "CRITICAL",
      assigned_analyst: "Sarah Lin (Lead FCU)",
      analyst_notes:
        "High risk wire settlement requiring secondary authorization.",
      fraud_category: isMule
        ? "RECIPIENT_RISK"
        : isVel
          ? "VELOCITY"
          : isStr
            ? "STRUCTURING"
            : "TRADITIONAL",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      transaction_id: txId || "TX-948271",
      id: txId || "TX-948271",
      step: step,
      type: type,
      amount: amount,
      orig_account: orig,
      dest_account: dest,
      oldbalance_org: oldOrig,
      newbalance_orig: newOrig,
      oldbalance_dest: oldDest,
      newbalance_dest: newDest,
      balance_diff_orig: amount,
      balance_diff_dest: amount,
      origin_account_emptied: newOrig === 0 ? 1 : 0,
      large_transaction: amount > 100000 ? 1 : 0,
      fraud_probability: prob,
      risk_score: riskScore,
      final_risk_score: riskScore,
      risk_level: riskLevel,
      final_risk_tier: riskTier,
      expected_loss: loss,
      status: "UNDER_REVIEW",
      priority: "CRITICAL",
      assigned_analyst: "Sarah Lin (Lead FCU)",
      fraud_category: txObj.fraud_category,
      transaction: txObj,
      behavioral_intelligence: {
        transactions_last_hour: isVel ? 14 : 1,
        transactions_last_day: isVel ? 32 : 3,
        total_amount_last_hour: amount,
        total_amount_last_day: amount,
        unique_recipients_last_hour: 1,
        unique_recipients_last_day: 2,
        velocity_score: isVel ? 88.0 : 45.0,
        structuring_score: isStr ? 91.0 : 15.0,
        recipient_risk_score: isMule ? 96.0 : 40.0,
        behavioral_risk_score: isMule ? 85.0 : 42.0,
      },
      recipient_safety: {
        warning_triggered: isMule,
        warning_message: isMule
          ? "Warning: Beneficiary account has been flagged as a mule recipient."
          : "No known recipient sanctions or blacklists found.",
      },
      shap_features: shapFeatures,
      reasons: topReasons,
      audit_logs: auditLogs,
    };
  },
};

// Aliases for seamless interface compatibility
ApiService.freezeTransaction = ApiService.freezeAccount;
ApiService.resolveTransaction = ApiService.resolveCase;
ApiService.addCaseNote = ApiService.addNote;

document.addEventListener("DOMContentLoaded", () => {
  ApiService.checkHealth();
});
