/**
 * Chart.js Institutional Dark Styling Engine
 * Exact Color Tokens & Chart Pipeline Implementation
 */
const ChartService = {
  getThemeColors() {
    return {
      text: "#A1A1AA",
      heading: "#FAFAFA",
      grid: "rgba(255, 255, 255, 0.06)",
      border: "rgba(255, 255, 255, 0.08)",
      tooltipBg: "#14141C",
      tooltipBorder: "rgba(255, 255, 255, 0.08)",
      tooltipText: "#FAFAFA",
      accent: "#8B5CF6",
      accentHover: "#A78BFA",
      accentBg: "rgba(139, 92, 246, 0.18)",
      danger: "#EF4444",
      dangerBg: "rgba(239, 68, 68, 0.18)",
      warning: "#F59E0B",
      warningBg: "rgba(245, 158, 11, 0.18)",
      success: "#22C55E",
      successBg: "rgba(34, 197, 94, 0.18)",
      info: "#3B82F6",
    };
  },

  /**
   * Helper to safely get canvas context and destroy any existing instance
   */
  prepareCanvas(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    if (typeof Chart !== "undefined") {
      const existingChart = Chart.getChart(ctx);
      if (existingChart) {
        existingChart.destroy();
      }
    }
    return ctx;
  },

  /**
   * Monthly Anomaly Volume & Value Exposure (Smooth Line Chart with Dual Axis)
   */
  createMonthlyAnomalyTrendChart(canvasId, data) {
    const ctx = this.prepareCanvas(canvasId);
    if (!ctx || typeof Chart === "undefined") return null;

    const colors = this.getThemeColors();

    const labels =
      data && Array.isArray(data.labels) && data.labels.length
        ? data.labels
        : [
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
          ];

    const fraudVolume =
      data && Array.isArray(data.fraud_volume) && data.fraud_volume.length
        ? data.fraud_volume
        : data && Array.isArray(data.fraud_count) && data.fraud_count.length
          ? data.fraud_count
          : [120, 156, 198, 245, 290, 315, 280, 340, 395, 420, 385, 450];

    const exposureK =
      data &&
      Array.isArray(data.exposure_amount_k) &&
      data.exposure_amount_k.length
        ? data.exposure_amount_k
        : data &&
            Array.isArray(data.expected_loss_k) &&
            data.expected_loss_k.length
          ? data.expected_loss_k
          : [310, 440, 520, 680, 810, 890, 760, 950, 1120, 1250, 1080, 1340];

    return new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Fraud Volume (Count)",
            data: fraudVolume,
            borderColor: colors.accent,
            backgroundColor: "rgba(139, 92, 246, 0.10)",
            fill: true,
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: colors.accent,
            pointBorderColor: "#14141C",
            pointBorderWidth: 1.5,
            tension: 0.4,
            yAxisID: "y",
          },
          {
            label: "Exposure Value ($k)",
            data: exposureK,
            borderColor: colors.danger,
            backgroundColor: "rgba(239, 68, 68, 0.05)",
            fill: true,
            borderDash: [5, 4],
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: colors.danger,
            pointBorderColor: "#14141C",
            pointBorderWidth: 1.5,
            tension: 0.4,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              padding: 10,
              color: colors.text,
              font: { family: "JetBrains Mono", size: 10, weight: 600 },
            },
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleColor: colors.heading,
            bodyColor: colors.text,
            titleFont: { family: "JetBrains Mono", size: 11, weight: 700 },
            bodyFont: { family: "JetBrains Mono", size: 10 },
            padding: 10,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: function (context) {
                if (context.dataset.yAxisID === "y1") {
                  return ` ${context.dataset.label}: $${Number(context.raw).toLocaleString()}k`;
                }
                return ` ${context.dataset.label}: ${Number(context.raw).toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: "JetBrains Mono", size: 9 },
            },
          },
          y: {
            type: "linear",
            position: "left",
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.accent,
              font: { family: "JetBrains Mono", size: 9 },
            },
          },
          y1: {
            type: "linear",
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: {
              color: colors.danger,
              font: { family: "JetBrains Mono", size: 9 },
              callback: (value) => "$" + value + "k",
            },
          },
        },
      },
    });
  },

  /**
   * Risk Trend Chart (Overview Page Dual Axis)
   */
  createRiskTrendChart(canvasId, data) {
    const ctx = this.prepareCanvas(canvasId);
    if (!ctx || typeof Chart === "undefined") return null;

    const colors = this.getThemeColors();

    const labels =
      data && Array.isArray(data.labels) && data.labels.length
        ? data.labels
        : [
            "00:00",
            "03:00",
            "06:00",
            "09:00",
            "12:00",
            "15:00",
            "18:00",
            "21:00",
          ];

    const fraudCount =
      data && Array.isArray(data.fraud_count) && data.fraud_count.length
        ? data.fraud_count
        : [12, 18, 9, 34, 52, 48, 61, 38];

    const lossK =
      data && Array.isArray(data.expected_loss_k) && data.expected_loss_k.length
        ? data.expected_loss_k
        : [140, 210, 85, 420, 680, 590, 820, 490];

    return new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Expected Loss ($k)",
            data: lossK,
            borderColor: colors.danger,
            backgroundColor: "transparent",
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5,
            pointBackgroundColor: colors.danger,
            tension: 0.3,
            yAxisID: "y1",
          },
          {
            label: "Flagged Count",
            data: fraudCount,
            borderColor: colors.accent,
            backgroundColor: "transparent",
            borderDash: [4, 4],
            borderWidth: 1.75,
            pointRadius: 2,
            pointHoverRadius: 5,
            pointBackgroundColor: colors.accent,
            tension: 0.3,
            yAxisID: "y",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              padding: 10,
              color: colors.text,
              font: { family: "JetBrains Mono", size: 10, weight: 600 },
            },
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleColor: colors.heading,
            bodyColor: colors.text,
            titleFont: { family: "JetBrains Mono", size: 11, weight: 700 },
            bodyFont: { family: "JetBrains Mono", size: 10 },
            padding: 10,
            cornerRadius: 8,
            displayColors: true,
          },
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: "JetBrains Mono", size: 9 },
            },
          },
          y: {
            type: "linear",
            position: "left",
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: "JetBrains Mono", size: 9 },
            },
          },
          y1: {
            type: "linear",
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: {
              color: colors.danger,
              font: { family: "JetBrains Mono", size: 9 },
              callback: (value) => "$" + value + "k",
            },
          },
        },
      },
    });
  },

  /**
   * Channel Concentration Donut Chart
   */
  createTypeDistributionChart(canvasId, data) {
    const ctx = this.prepareCanvas(canvasId);
    if (!ctx || typeof Chart === "undefined") return null;

    const colors = this.getThemeColors();

    const labels =
      data && Array.isArray(data.labels) && data.labels.length
        ? data.labels
        : ["TRANSFER", "CASH_OUT", "PAYMENT", "DEBIT", "CASH_IN"];

    const counts =
      data && Array.isArray(data.counts) && data.counts.length
        ? data.counts
        : [1140, 620, 58, 16, 8];

    return new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: counts,
            backgroundColor: [
              colors.danger, // TRANSFER
              colors.warning, // CASH_OUT
              colors.accent, // PAYMENT
              colors.success, // DEBIT
              colors.info, // CASH_IN
            ],
            borderWidth: 2,
            borderColor: "#14141C",
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              padding: 8,
              color: colors.text,
              font: { family: "JetBrains Mono", size: 9, weight: 500 },
            },
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleColor: colors.heading,
            bodyColor: colors.text,
            titleFont: { family: "JetBrains Mono", size: 10, weight: 600 },
            bodyFont: { family: "JetBrains Mono", size: 9 },
            padding: 8,
            cornerRadius: 8,
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const value = context.raw;
                const percentage =
                  total > 0 ? Math.round((value / total) * 100) : 0;
                return ` ${context.label}: ${Number(value).toLocaleString()} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  },

  /**
   * Global Mean SHAP Importance Ranking (Horizontal Bar Chart, Sorted Descending)
   */
  createGlobalShapRankingChart(canvasId, features) {
    const ctx = this.prepareCanvas(canvasId);
    if (!ctx || typeof Chart === "undefined") return null;

    const colors = this.getThemeColors();

    const defaultFeatures = [
      { name: "balanceDiffOrig", importance: 3.84 },
      { name: "oldbalanceOrg", importance: 2.76 },
      { name: "amount", importance: 2.15 },
      { name: "balanceDiffDest", importance: 1.68 },
      { name: "newbalanceDest", importance: 1.22 },
      { name: "step", importance: 0.94 },
      { name: "type", importance: 0.78 },
      { name: "originAccountEmptied", importance: 0.55 },
      { name: "newbalanceOrig", importance: 0.34 },
      { name: "largeTransaction", importance: 0.19 },
    ];

    let list =
      features && Array.isArray(features) && features.length
        ? [...features]
        : defaultFeatures;

    list.sort((a, b) => {
      const valA =
        a.shap_mean !== undefined
          ? Number(a.shap_mean)
          : a.importance !== undefined
            ? Number(a.importance)
            : 0;
      const valB =
        b.shap_mean !== undefined
          ? Number(b.shap_mean)
          : b.importance !== undefined
            ? Number(b.importance)
            : 0;
      return valB - valA;
    });

    list = list.slice(0, 10);
    const labels = list.map((f) => f.name || f.feature);
    const shapData = list.map((f) =>
      f.shap_mean !== undefined
        ? Number(f.shap_mean)
        : f.importance !== undefined
          ? Number(f.importance)
          : 0,
    );

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Mean |SHAP Value| (Global Impact)",
            data: shapData,
            backgroundColor: colors.accent,
            hoverBackgroundColor: colors.accentHover,
            borderRadius: 4,
            maxBarThickness: 14,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleColor: colors.heading,
            bodyColor: colors.text,
            titleFont: { family: "JetBrains Mono", size: 10, weight: 600 },
            bodyFont: { family: "JetBrains Mono", size: 9 },
            padding: 8,
            cornerRadius: 8,
            callbacks: {
              label: function (context) {
                return ` Mean |SHAP|: ${Number(context.raw).toFixed(2)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: "JetBrains Mono", size: 9 },
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: colors.heading,
              font: { family: "JetBrains Mono", size: 9, weight: 500 },
            },
          },
        },
      },
    });
  },

  /**
   * TreeSHAP Horizontal Bar Attribution Chart (Case Detail)
   */
  createShapContributionChart(canvasId, shapFeatures) {
    const ctx = this.prepareCanvas(canvasId);
    if (!ctx || typeof Chart === "undefined") return null;

    const colors = this.getThemeColors();

    const features =
      shapFeatures && Array.isArray(shapFeatures) && shapFeatures.length
        ? shapFeatures
        : [
            {
              name: "Origin Balance Drain",
              feature: "balanceDiffOrig",
              shap_value: 4.24,
            },
            {
              name: "Account Emptied Flag",
              feature: "originAccountEmptied",
              shap_value: 2.81,
            },
            {
              name: "High Value Flag",
              feature: "largeTransaction",
              shap_value: 1.94,
            },
            {
              name: "Transfer Channel Risk",
              feature: "type",
              shap_value: 1.45,
            },
          ];

    const labels = features.map((f) => f.name || f.feature);
    const values = features.map((f) => f.shap_value);
    const bgColors = values.map((v) =>
      v >= 0 ? colors.danger : colors.success,
    );

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "SHAP Contribution (Additive Log-Odds)",
            data: values,
            backgroundColor: bgColors,
            borderRadius: 4,
            maxBarThickness: 18,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleColor: colors.heading,
            bodyColor: colors.text,
            titleFont: { family: "JetBrains Mono", size: 10, weight: 600 },
            bodyFont: { family: "JetBrains Mono", size: 9 },
            padding: 8,
            cornerRadius: 8,
            callbacks: {
              label: function (context) {
                const val = Number(context.raw);
                const dir = val >= 0 ? "+ FRAUD PUSH" : "- LEGIT PUSH";
                return ` Value: ${val > 0 ? "+" : ""}${val.toFixed(2)} (${dir})`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: "JetBrains Mono", size: 9 },
              callback: (value) => (value > 0 ? `+${value}` : value),
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: colors.heading,
              font: { family: "JetBrains Mono", size: 9, weight: 500 },
            },
          },
        },
      },
    });
  },

  /**
   * Behavioral vs Transaction Fraud Comparison Chart
   */
  createBehavioralVsTraditionalChart(canvasId, data) {
    const ctx = this.prepareCanvas(canvasId);
    if (!ctx || typeof Chart === "undefined") return null;

    const colors = this.getThemeColors();
    const labels =
      data && Array.isArray(data.labels) && data.labels.length
        ? data.labels
        : [
            "Velocity Fraud",
            "Structuring",
            "Recipient Risk",
            "Traditional Single-Tx",
          ];

    const counts =
      data && Array.isArray(data.counts) && data.counts.length
        ? data.counts
        : [142, 98, 76, 210];

    const amounts =
      data && Array.isArray(data.amounts) && data.amounts.length
        ? data.amounts.map((a) => Math.round(a / 1000))
        : [1850, 940, 1280, 3120];

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Incident Volume",
            data: counts,
            backgroundColor: [
              colors.warning,
              colors.accent,
              colors.danger,
              colors.info,
            ],
            borderRadius: 4,
            yAxisID: "y",
          },
          {
            label: "Exposure ($k)",
            data: amounts,
            type: "line",
            borderColor: colors.danger,
            backgroundColor: "transparent",
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: colors.danger,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              color: colors.text,
              font: { family: "JetBrains Mono", size: 9, weight: 600 },
            },
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleColor: colors.heading,
            bodyColor: colors.text,
            titleFont: { family: "JetBrains Mono", size: 10, weight: 600 },
            bodyFont: { family: "JetBrains Mono", size: 9 },
            padding: 8,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: "JetBrains Mono", size: 8 },
            },
          },
          y: {
            type: "linear",
            position: "left",
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: "JetBrains Mono", size: 9 },
            },
          },
          y1: {
            type: "linear",
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: {
              color: colors.danger,
              font: { family: "JetBrains Mono", size: 9 },
              callback: (v) => "$" + v + "k",
            },
          },
        },
      },
    });
  },

  /**
   * Velocity Risk Distribution (Bar Chart)
   */
  createVelocityDistributionChart(canvasId, data) {
    const ctx = this.prepareCanvas(canvasId);
    if (!ctx || typeof Chart === "undefined") return null;

    const colors = this.getThemeColors();
    const labels =
      data && Array.isArray(data.labels) && data.labels.length
        ? data.labels
        : [
            "0-20 (Normal)",
            "21-40 (Elevated)",
            "41-60 (Moderate)",
            "61-80 (High Burst)",
            "81-100 (Critical Spike)",
          ];

    const counts =
      data && Array.isArray(data.counts) && data.counts.length
        ? data.counts
        : [6820, 1420, 380, 142, 48];

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Monitored Accounts",
            data: counts,
            backgroundColor: [
              colors.success,
              colors.info,
              colors.accent,
              colors.warning,
              colors.danger,
            ],
            borderRadius: 4,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleColor: colors.heading,
            bodyColor: colors.text,
            titleFont: { family: "JetBrains Mono", size: 10, weight: 600 },
            bodyFont: { family: "JetBrains Mono", size: 9 },
            padding: 8,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: "JetBrains Mono", size: 8 },
            },
          },
          y: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: "JetBrains Mono", size: 9 },
            },
          },
        },
      },
    });
  },

  /**
   * Structuring Detection Statistics (Donut Chart)
   */
  createStructuringStatsChart(canvasId, data) {
    const ctx = this.prepareCanvas(canvasId);
    if (!ctx || typeof Chart === "undefined") return null;

    const colors = this.getThemeColors();
    const labels =
      data && Array.isArray(data.labels) && data.labels.length
        ? data.labels
        : [
            "Sub-Threshold Splits",
            "Rapid Multi-Hop",
            "Cyclic Smurfing",
            "Account Consolidation",
          ];

    const counts =
      data && Array.isArray(data.counts) && data.counts.length
        ? data.counts
        : [156, 84, 42, 65];

    return new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: counts,
            backgroundColor: [
              colors.danger,
              colors.warning,
              colors.accent,
              colors.info,
            ],
            borderWidth: 2,
            borderColor: "#14141C",
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              padding: 6,
              color: colors.text,
              font: { family: "JetBrains Mono", size: 8, weight: 500 },
            },
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleColor: colors.heading,
            bodyColor: colors.text,
            titleFont: { family: "JetBrains Mono", size: 10, weight: 600 },
            bodyFont: { family: "JetBrains Mono", size: 9 },
            padding: 8,
            cornerRadius: 8,
          },
        },
      },
    });
  },

  /**
   * Recipient Risk Distribution (Horizontal Bar Chart)
   */
  createRecipientRiskDistChart(canvasId, data) {
    const ctx = this.prepareCanvas(canvasId);
    if (!ctx || typeof Chart === "undefined") return null;

    const colors = this.getThemeColors();
    const labels =
      data && Array.isArray(data.labels) && data.labels.length
        ? data.labels
        : [
            "Clean (0-20)",
            "Low (21-40)",
            "Watchlist (41-60)",
            "Escalated (61-80)",
            "Confirmed Mule (81-100)",
          ];

    const counts =
      data && Array.isArray(data.counts) && data.counts.length
        ? data.counts
        : [8940, 1200, 310, 89, 45];

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Beneficiary Accounts",
            data: counts,
            backgroundColor: [
              colors.success,
              colors.info,
              colors.accent,
              colors.warning,
              colors.danger,
            ],
            borderRadius: 4,
            maxBarThickness: 16,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleColor: colors.heading,
            bodyColor: colors.text,
            titleFont: { family: "JetBrains Mono", size: 10, weight: 600 },
            bodyFont: { family: "JetBrains Mono", size: 9 },
            padding: 8,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: "JetBrains Mono", size: 8 },
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: colors.heading,
              font: { family: "JetBrains Mono", size: 8, weight: 500 },
            },
          },
        },
      },
    });
  },

  /**
   * TreeSHAP Additive Feature Contribution Chart (Horizontal Bar Chart)
   * Red = Fraud Push (+SHAP), Green = Legit Push (-SHAP)
   */
  createShapContributionChart(canvasId, features) {
    const ctx = this.prepareCanvas(canvasId);
    if (!ctx || typeof Chart === "undefined") return null;

    const colors = this.getThemeColors();

    let featList =
      Array.isArray(features) && features.length > 0 ? [...features] : [];

    // Fallback if no features supplied
    if (featList.length === 0) {
      featList = [
        {
          name: "Recipient Reputation Risk",
          shap_value: 4.1,
          direction: "FRAUD",
        },
        {
          name: "Transaction Velocity Spike",
          shap_value: 3.42,
          direction: "FRAUD",
        },
        {
          name: "Origin Balance Drain Delta",
          shap_value: 2.85,
          direction: "FRAUD",
        },
        {
          name: "Structuring / Smurfing Pattern",
          shap_value: 2.15,
          direction: "FRAUD",
        },
        {
          name: "Historic Channel Baseline",
          shap_value: -1.2,
          direction: "LEGIT",
        },
        {
          name: "Account Age Stability",
          shap_value: -0.65,
          direction: "LEGIT",
        },
      ];
    }

    // Sort descending by absolute impact
    featList.sort((a, b) => {
      const valA = Math.abs(
        Number(a.shap_value ?? a.value ?? a.importance ?? 0),
      );
      const valB = Math.abs(
        Number(b.shap_value ?? b.value ?? b.importance ?? 0),
      );
      return valB - valA;
    });

    const displayList = featList.slice(0, 7);

    const labels = displayList.map((f) => {
      const rawName = f.name || f.feature || "Feature";
      return rawName.length > 28 ? rawName.substring(0, 26) + "…" : rawName;
    });

    const values = displayList.map((f) => {
      const v = Number(f.shap_value ?? f.value ?? 0);
      return Math.round(v * 100) / 100;
    });

    const bgColors = values.map((v) =>
      v >= 0 ? colors.danger : colors.success,
    );
    const borderColors = values.map((v) => (v >= 0 ? "#dc2626" : "#059669"));

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "SHAP Value (Log-Odds Impact)",
            data: values,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: 16,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            titleColor: colors.heading,
            bodyColor: colors.text,
            titleFont: { family: "JetBrains Mono", size: 10, weight: 600 },
            bodyFont: { family: "JetBrains Mono", size: 9 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const val = context.raw;
                const sign = val >= 0 ? "+" : "";
                const dir =
                  val >= 0
                    ? "Fraud-driving (+log-odds)"
                    : "Legitimate-driving (-log-odds)";
                return [` Impact: ${sign}${val} SHAP`, ` Direction: ${dir}`];
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: "JetBrains Mono", size: 9 },
              callback: (v) => (v > 0 ? `+${v}` : `${v}`),
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: colors.heading,
              font: { family: "JetBrains Mono", size: 9, weight: 500 },
            },
          },
        },
      },
    });
  },
};
