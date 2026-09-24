const ChartService = {
  getThemeColors() {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    return {
      text: isDark ? "#8B949E" : "#64748B",
      heading: isDark ? "#F0F6FC" : "#0F172A",
      grid: isDark ? "#21262D" : "#E5E7EB",
      border: isDark ? "#30363D" : "#D1D5DB",
      tooltipBg: isDark ? "#161B22" : "#0F172A",
      tooltipText: "#FFFFFF",
      accent: isDark ? "#58A6FF" : "#0284C7",
      danger: isDark ? "#F85149" : "#B91C1C",
      warning: isDark ? "#D29922" : "#B45309",
      success: isDark ? "#3FB950" : "#047857",
    };
  },

  /**
   * Risk Trend Chart (Dual Axis: Loss Value & Fraud Count)
   */
  createRiskTrendChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const colors = this.getThemeColors();

    return new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Expected Loss ($k)",
            data: data.expected_loss_k,
            borderColor: colors.danger,
            backgroundColor: "transparent",
            borderWidth: 1.75,
            pointRadius: 2,
            pointHoverRadius: 4,
            tension: 0.1,
            yAxisID: "y1",
          },
          {
            label: "Flagged Count",
            data: data.fraud_count,
            borderColor: colors.accent,
            backgroundColor: "transparent",
            borderDash: [3, 3],
            borderWidth: 1.5,
            pointRadius: 2,
            pointHoverRadius: 4,
            tension: 0.1,
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
              padding: 8,
              color: colors.text,
              font: { family: "JetBrains Mono", size: 10, weight: 600 },
            },
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.border,
            borderWidth: 1,
            titleFont: { family: "JetBrains Mono", size: 11, weight: 700 },
            bodyFont: { family: "JetBrains Mono", size: 10 },
            padding: 8,
            cornerRadius: 2,
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
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const colors = this.getThemeColors();

    return new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.labels,
        datasets: [
          {
            data: data.counts,
            backgroundColor: [
              colors.danger, // TRANSFER
              colors.warning, // CASH_OUT
              colors.accent, // PAYMENT
              colors.success, // DEBIT
              colors.text, // CASH_IN
            ],
            borderWidth: 1,
            borderColor: colors.border,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "76%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 8,
              padding: 6,
              color: colors.text,
              font: { family: "JetBrains Mono", size: 9, weight: 500 },
            },
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            borderColor: colors.border,
            borderWidth: 1,
            titleFont: { family: "JetBrains Mono", size: 10 },
            bodyFont: { family: "JetBrains Mono", size: 9 },
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const value = context.raw;
                const percentage = Math.round((value / total) * 100);
                return ` ${context.label}: ${value.toLocaleString()} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  },

  /**
   * TreeSHAP Horizontal Bar Attribution Chart
   */
  createShapContributionChart(canvasId, shapFeatures) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const colors = this.getThemeColors();

    const labels = shapFeatures.map((f) => f.name || f.feature);
    const values = shapFeatures.map((f) => f.shap_value);
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
            borderRadius: 1,
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
            borderColor: colors.border,
            borderWidth: 1,
            titleFont: { family: "JetBrains Mono", size: 10 },
            bodyFont: { family: "JetBrains Mono", size: 9 },
            callbacks: {
              label: function (context) {
                const val = context.raw;
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
              font: { family: "JetBrains Mono", size: 9, weight: 600 },
            },
          },
        },
      },
    });
  },
};

window.addEventListener("themeChanged", () => {
  Chart.helpers.each(Chart.instances, function (instance) {
    const colors = ChartService.getThemeColors();
    if (instance.options.scales && instance.options.scales.x) {
      instance.options.scales.x.grid.color = colors.grid;
      instance.options.scales.x.ticks.color = colors.text;
    }
    if (instance.options.scales && instance.options.scales.y) {
      instance.options.scales.y.grid.color = colors.grid;
      instance.options.scales.y.ticks.color = colors.text;
    }
    instance.update();
  });
});
