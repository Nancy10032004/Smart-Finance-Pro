/**
 * Smart Finance Pro - Charting & Analytics Controller
 */

import { getTransactions } from './storage.js';

// Holds instances of active Chart.js objects to prevent duplicate canvas issues
const chartInstances = {
  expensePie: null,
  monthlyBar: null,
  incomeExpenseCompare: null,
  savingsTrendLine: null
};

// Theme configurations
const chartThemes = {
  dark: {
    textColor: '#a0aec0', // Slate light gray
    gridColor: 'rgba(255, 255, 255, 0.08)',
    tooltipBg: '#1a202c',
    tooltipBorder: 'rgba(255, 255, 255, 0.15)'
  },
  light: {
    textColor: '#4a5568', // Slate dark gray
    gridColor: 'rgba(0, 0, 0, 0.06)',
    tooltipBg: '#ffffff',
    tooltipBorder: 'rgba(0, 0, 0, 0.1)'
  }
};

// Colors for chart elements
const palette = {
  income: '#10b981', // Emerald
  expense: '#f43f5e', // Coral/Rose
  savings: '#6366f1', // Indigo
  categories: [
    '#6366f1', // Indigo (Salary/Freelancing)
    '#f59e0b', // Amber (Food)
    '#06b6d4', // Cyan (Travel)
    '#ec4899', // Pink (Shopping)
    '#10b981', // Emerald (Bills)
    '#8b5cf6', // Violet (Education)
    '#f97316', // Orange (Entertainment)
    '#ef4444', // Red (Healthcare)
    '#14b8a6', // Teal (Investment)
    '#64748b'  // Slate (Other)
  ]
};

const categoryColors = {
  'Salary': '#3b82f6',
  'Freelancing': '#10b981',
  'Food': '#f59e0b',
  'Travel': '#06b6d4',
  'Shopping': '#ec4899',
  'Bills': '#8b5cf6',
  'Education': '#14b8a6',
  'Entertainment': '#f97316',
  'Healthcare': '#ef4444',
  'Investment': '#6366f1',
  'Other': '#64748b'
};

/**
 * Destroys all existing chart instances to avoid canvas conflicts
 */
export function destroyCharts() {
  Object.keys(chartInstances).forEach(key => {
    if (chartInstances[key]) {
      chartInstances[key].destroy();
      chartInstances[key] = null;
    }
  });
}

/**
 * Initializes and draws the 4 main dashboard and analytics charts
 * @param {string} theme - 'dark' | 'light'
 */
export function updateAnalyticsCharts(theme = 'dark') {
  const transactions = getTransactions();
  const activeTheme = chartThemes[theme] || chartThemes.dark;
  
  // Clean up existing charts first
  destroyCharts();

  if (transactions.length === 0) return;

  // Gather dates info
  const currentDate = new Date();
  const curYear = currentDate.getFullYear();
  const curMonth = currentDate.getMonth();

  const getMonthKey = (offset = 0) => {
    const d = new Date(curYear, curMonth - offset, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' })
    };
  };

  // We will display past 4 months in chronological order (oldest to newest)
  const monthsData = [
    getMonthKey(3),
    getMonthKey(2),
    getMonthKey(1),
    getMonthKey(0)
  ];

  const currentMonthKey = monthsData[3].key;

  // Render Charts
  renderExpensePieChart(transactions, currentMonthKey, activeTheme);
  renderMonthlyBarChart(transactions, monthsData, activeTheme);
  renderIncomeExpenseChart(transactions, monthsData, activeTheme);
  renderSavingsTrendChart(transactions, monthsData, activeTheme);
}

// 1. EXPENSE CATEGORY PIE CHART
function renderExpensePieChart(transactions, currentMonthKey, themeConfig) {
  const canvas = document.getElementById('expensePieChart');
  if (!canvas) return;

  // Aggregate current month expenses by category
  const categoriesMap = {};
  transactions.forEach(tx => {
    if (tx.type === 'expense' && tx.date.startsWith(currentMonthKey)) {
      categoriesMap[tx.category] = (categoriesMap[tx.category] || 0) + tx.amount;
    }
  });

  const labels = Object.keys(categoriesMap);
  const data = Object.values(categoriesMap);
  const backgroundColors = labels.map(cat => categoryColors[cat] || '#64748b');

  if (labels.length === 0) {
    // Render empty state on canvas if no expenses
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px Plus Jakarta Sans';
    ctx.fillStyle = themeConfig.textColor;
    ctx.textAlign = 'center';
    ctx.fillText('No expense data available for this month.', canvas.width / 2, canvas.height / 2);
    return;
  }

  chartInstances.expensePie = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: themeConfig.theme === 'light' ? 1 : 0,
        borderColor: themeConfig.textColor
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: themeConfig.textColor,
            font: { family: 'Plus Jakarta Sans', size: 11 }
          }
        },
        tooltip: {
          backgroundColor: themeConfig.tooltipBg,
          titleColor: themeConfig.theme === 'light' ? '#1a202c' : '#ffffff',
          bodyColor: themeConfig.textColor,
          borderColor: themeConfig.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const val = context.raw;
              const pct = ((val / total) * 100).toFixed(1);
              return ` ${context.label}: ₹${val.toLocaleString()} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// 2. MONTHLY EXPENSES BAR CHART
function renderMonthlyBarChart(transactions, monthsData, themeConfig) {
  const canvas = document.getElementById('monthlyBarChart');
  if (!canvas) return;

  const data = monthsData.map(m => {
    return transactions
      .filter(tx => tx.type === 'expense' && tx.date.startsWith(m.key))
      .reduce((sum, tx) => sum + tx.amount, 0);
  });

  const labels = monthsData.map(m => m.label);

  chartInstances.monthlyBar = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Expenses',
        data: data,
        backgroundColor: palette.expense,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: themeConfig.tooltipBg,
          titleColor: themeConfig.theme === 'light' ? '#1a202c' : '#ffffff',
          bodyColor: themeConfig.textColor,
          borderColor: themeConfig.tooltipBorder,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: themeConfig.textColor,
            font: { family: 'Plus Jakarta Sans' }
          }
        },
        y: {
          grid: { color: themeConfig.gridColor },
          ticks: {
            color: themeConfig.textColor,
            font: { family: 'Plus Jakarta Sans' },
            callback: value => '₹' + value.toLocaleString()
          }
        }
      }
    }
  });
}

// 3. INCOME VS EXPENSE COMPARISON CHART
function renderIncomeExpenseChart(transactions, monthsData, themeConfig) {
  const canvas = document.getElementById('incomeExpenseCompareChart');
  if (!canvas) return;

  const incomeData = monthsData.map(m => {
    return transactions
      .filter(tx => tx.type === 'income' && tx.date.startsWith(m.key))
      .reduce((sum, tx) => sum + tx.amount, 0);
  });

  const expenseData = monthsData.map(m => {
    return transactions
      .filter(tx => tx.type === 'expense' && tx.date.startsWith(m.key))
      .reduce((sum, tx) => sum + tx.amount, 0);
  });

  const labels = monthsData.map(m => m.label);

  chartInstances.incomeExpenseCompare = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          backgroundColor: palette.income,
          borderRadius: 6
        },
        {
          label: 'Expenses',
          data: expenseData,
          backgroundColor: palette.expense,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: themeConfig.textColor,
            font: { family: 'Plus Jakarta Sans' }
          }
        },
        tooltip: {
          backgroundColor: themeConfig.tooltipBg,
          titleColor: themeConfig.theme === 'light' ? '#1a202c' : '#ffffff',
          bodyColor: themeConfig.textColor,
          borderColor: themeConfig.tooltipBorder,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: themeConfig.textColor,
            font: { family: 'Plus Jakarta Sans' }
          }
        },
        y: {
          grid: { color: themeConfig.gridColor },
          ticks: {
            color: themeConfig.textColor,
            font: { family: 'Plus Jakarta Sans' },
            callback: value => '₹' + value.toLocaleString()
          }
        }
      }
    }
  });
}

// 4. SAVINGS TREND LINE CHART
function renderSavingsTrendChart(transactions, monthsData, themeConfig) {
  const canvas = document.getElementById('savingsTrendChart');
  if (!canvas) return;

  // Let's compute a cumulative savings trend.
  // First, find historical net savings before our chart window.
  const oldestVisibleMonth = monthsData[0].key;
  
  let startingSavings = transactions
    .filter(tx => tx.date < oldestVisibleMonth)
    .reduce((sum, tx) => {
      return sum + (tx.type === 'income' ? tx.amount : -tx.amount);
    }, 0);

  // Now build cumulative points for visible months
  let runningSavings = startingSavings;
  const data = monthsData.map(m => {
    const monthNet = transactions
      .filter(tx => tx.date.startsWith(m.key))
      .reduce((sum, tx) => {
        return sum + (tx.type === 'income' ? tx.amount : -tx.amount);
      }, 0);
    runningSavings += monthNet;
    return runningSavings;
  });

  const labels = monthsData.map(m => m.label);

  chartInstances.savingsTrendLine = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Net Worth / Savings',
        data: data,
        borderColor: palette.savings,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        fill: true,
        tension: 0.3,
        borderWidth: 3,
        pointBackgroundColor: palette.savings,
        pointBorderColor: '#ffffff',
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: themeConfig.tooltipBg,
          titleColor: themeConfig.theme === 'light' ? '#1a202c' : '#ffffff',
          bodyColor: themeConfig.textColor,
          borderColor: themeConfig.tooltipBorder,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: themeConfig.textColor,
            font: { family: 'Plus Jakarta Sans' }
          }
        },
        y: {
          grid: { color: themeConfig.gridColor },
          ticks: {
            color: themeConfig.textColor,
            font: { family: 'Plus Jakarta Sans' },
            callback: value => '₹' + value.toLocaleString()
          }
        }
      }
    }
  });
}
