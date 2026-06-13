/**
 * Smart Finance Pro - Application Orchestrator & Router
 */

import {
  loadState,
  getState,
  formatCurrency,
  getCurrencySymbol,
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getBudgets,
  saveBudget,
  getGoals,
  addGoal,
  updateGoal,
  deleteGoal,
  adjustGoalFunds,
  getRecurring,
  addRecurring,
  deleteRecurring,
  updateRecurringLastBilled,
  getAchievements,
  unlockAchievement,
  updateSettings
} from './storage.js';

import { getBudgetStatus, checkBudgetAlerts } from './budget.js';
import { getEnrichedGoals } from './goals.js';
import { calculateEMI } from './emi.js';
import { generateInsights } from './insights.js';
import { initSettings, applyTheme } from './settings.js';
import { updateAnalyticsCharts } from './analytics.js';

// Global Chart variables for EMI split representation
let emiChartInstance = null;

// Active Navigation State
let currentTab = 'dashboard';

// Active Transaction Sorting preferences
let txSortField = 'date'; // 'date' | 'amount'
let txSortOrder = 'desc'; // 'desc' | 'asc'

// Calendar State
let calCurrentDate = new Date();

// Initialize App on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load local state
  loadState();

  // Setup Theme Preference on load
  const userSettings = getState().settings;
  applyTheme(userSettings.theme || 'dark');

  // Trigger automated processes
  processRecurringTransactions();
  checkAndTriggerAchievements();

  // Render initial interface
  renderApp();

  // Bind core event hooks
  initNavigation();
  initTransactionCrud();
  initBudgetCrud();
  initGoalsCrud();
  initCalendarView();
  initEmiCalculator();
  initReportsSection();
  initSettingsModule();

  // Setup Lucide icons rendering
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

/**
 * Main application render loop. Re-builds all dynamic layouts.
 */
function renderApp() {
  const currentMonthKey = getCurrentMonthKey();
  
  // 1. Calculate General Financial KPIs
  const transactions = getTransactions();
  const goals = getGoals();

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalGoalSavings = goals.reduce((sum, g) => sum + g.current, 0);
  
  // Total balance = Total income - Total expense - current allocated savings goal cash
  const netWorth = totalIncome - totalExpense;
  const availableBalance = netWorth - totalGoalSavings;

  // Monthly breakdown
  const monthlyIncome = transactions
    .filter(t => t.type === 'income' && t.date.startsWith(currentMonthKey))
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey))
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);
  const monthlySavingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  // Update KPI displays in dashboard
  document.getElementById('kpi-balance-val').textContent = formatCurrency(availableBalance);
  document.getElementById('kpi-income-val').textContent = formatCurrency(monthlyIncome);
  document.getElementById('kpi-expense-val').textContent = formatCurrency(monthlyExpense);
  document.getElementById('kpi-savings-val').textContent = `${monthlySavingsRate.toFixed(0)}%`;
  document.getElementById('kpi-savings-footer').textContent = `Net Saved: ${formatCurrency(monthlySavings)}`;

  // Budget card details on KPI
  const budgetStatus = getBudgetStatus(currentMonthKey);
  const kpiExpenseFooter = document.getElementById('kpi-expense-footer');
  if (budgetStatus.totalBudget > 0) {
    kpiExpenseFooter.textContent = `${budgetStatus.totalPercent.toFixed(0)}% of limit (${formatCurrency(budgetStatus.totalBudget)})`;
    if (budgetStatus.totalPercent >= 100) {
      kpiExpenseFooter.className = 'kpi-footer text-expense';
    } else if (budgetStatus.totalPercent >= 80) {
      kpiExpenseFooter.className = 'kpi-footer text-warning';
    } else {
      kpiExpenseFooter.className = 'kpi-footer';
    }
  } else {
    kpiExpenseFooter.textContent = 'No monthly limit set';
    kpiExpenseFooter.className = 'kpi-footer';
  }

  // 2. Financial Health Score
  const healthScore = calculateHealthScore(monthlySavingsRate, budgetStatus, monthlyIncome, monthlyExpense);
  const radialNode = document.getElementById('dashboard-health-radial');
  const scoreNode = document.getElementById('dashboard-health-score');
  const badgeNode = document.getElementById('dashboard-health-badge');
  const descNode = document.getElementById('dashboard-health-desc');

  scoreNode.textContent = healthScore.score;
  radialNode.style.setProperty('--health-percent', healthScore.score);
  
  badgeNode.textContent = healthScore.status;
  badgeNode.className = `health-badge ${healthScore.status.toLowerCase()}`;
  descNode.textContent = healthScore.message;

  // Set CSS colors for health status
  const statusColors = { Excellent: '#10b981', Good: '#06b6d4', Average: '#f59e0b', Poor: '#f43f5e' };
  radialNode.style.setProperty('--health-color', statusColors[healthScore.status]);

  // 3. Render Views
  renderRecentTransactions();
  renderTransactionsTable();
  renderBudgetsGrid();
  renderGoalsGrid();
  renderRecurringPaymentsList();
  renderUpcomingPaymentsSidebar();
  renderAchievementsView();
}

// --- CALCULATION OF THE FINANCIAL HEALTH SCORE ---
function calculateHealthScore(savingsRate, budgetStatus, income, expense) {
  let score = 0;
  
  // A. Savings rate compliance (40% Weight)
  if (savingsRate >= 30) {
    score += 40;
  } else if (savingsRate >= 20) {
    score += 30;
  } else if (savingsRate >= 10) {
    score += 20;
  } else if (savingsRate > 0) {
    score += 10;
  }

  // B. Budget discipline (30% Weight)
  const breachedCount = budgetStatus.categories.filter(c => c.spent > c.limit && c.limit > 0).length;
  const configuredCount = budgetStatus.categories.filter(c => c.limit > 0).length;
  
  if (configuredCount === 0 || breachedCount === 0) {
    score += 30; // perfect budget score if no limits set or none exceeded
  } else if (breachedCount === 1) {
    score += 15;
  }

  // C. Income vs Expense Compliance (30% Weight)
  if (income > expense && income > 0) {
    score += 30;
  }

  let status = 'Poor';
  let message = 'Your finances are in critical condition. Reduce non-essential expenses immediately.';
  
  if (score >= 85) {
    status = 'Excellent';
    message = 'Incredible financial discipline! Your savings rate is strong and budgets are fully controlled.';
  } else if (score >= 70) {
    status = 'Good';
    message = 'Healthy financial standing. You are saving consistently, but check minor category excesses.';
  } else if (score >= 50) {
    status = 'Average';
    message = 'Average compliance. Your surplus margin is narrow. Tighten your budget caps.';
  }

  return { score, status, message };
}

// --- DYNAMIC VIEW SWITCH ROUTER ---
function initNavigation() {
  const menuLinks = document.querySelectorAll('.sidebar-menu-item');
  const viewTitle = document.getElementById('currentViewTitle');
  const viewSubtitle = document.getElementById('currentViewSubtitle');

  const subtitles = {
    dashboard: 'Overview of your current financial standing.',
    transactions: 'Complete audit of income logs and expenses.',
    budget: 'Monthly spending caps and category allotments.',
    goals: 'Track visual progress of your savings targets.',
    calendar: 'Timeline and calendar coordinates of due bills and milestones.',
    emi: 'Evaluate installment details and amortization values.',
    analytics: 'Visual breakdowns of allocations and assets.',
    reports: 'Detailed analytical summary of monthly logs.',
    settings: 'Configure application theme and currency configurations.'
  };

  menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const target = link.getAttribute('data-target');
      currentTab = target;
      
      // Update sidebar links
      menuLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Update titles
      viewTitle.textContent = link.querySelector('span').textContent;
      viewSubtitle.textContent = subtitles[target] || '';

      // Toggle views
      const views = document.querySelectorAll('.content-view');
      views.forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${target}`).classList.add('active');

      // Trigger specific tab loading behaviors
      if (target === 'analytics') {
        const theme = getState().settings?.theme || 'dark';
        updateAnalyticsCharts(theme);
      } else if (target === 'calendar') {
        renderCalendar();
      } else if (target === 'reports') {
        initReportsOptions();
        renderInsightsFeed();
      }

      // Re-trigger layout components
      renderApp();
      
      if (window.lucide) {
        window.lucide.createIcons();
      }
    });
  });

  // Quick action from dashboard table view all
  document.getElementById('dashboardViewAllTx').addEventListener('click', () => {
    document.querySelector('[data-target="transactions"]').click();
  });
}

// --- TOAST ALERTS SYSTEM ---
export function showToast(message, type = 'success') {
  const container = document.querySelector('.toast-container') || (() => {
    const el = document.createElement('div');
    el.className = 'toast-container';
    document.body.appendChild(el);
    return el;
  })();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconNames = { success: 'check-circle', danger: 'alert-circle', warning: 'alert-triangle', info: 'info' };
  const iconName = iconNames[type] || 'info';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span class="toast-message">${message}</span>
    <i data-lucide="x" class="toast-close"></i>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  // Show
  setTimeout(() => {
    toast.classList.add('show');
  }, 50);

  // Close binding
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });

  // Auto remove
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }
  }, 4500);
}

// --- CONFIRMATION DIALOG MODAL ---
export function showConfirm(title, message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  const titleNode = document.getElementById('confirmTitle');
  const messageNode = document.getElementById('confirmMessage');
  const cancelBtn = document.getElementById('confirmCancelBtn');
  const okBtn = document.getElementById('confirmOkBtn');

  titleNode.textContent = title;
  messageNode.textContent = message;
  modal.classList.add('active');

  const cleanUp = () => {
    modal.classList.remove('active');
    // Remove listeners to avoid accumulation
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  };

  document.getElementById('confirmCancelBtn').addEventListener('click', cleanUp);
  document.getElementById('confirmOkBtn').addEventListener('click', () => {
    onConfirm();
    cleanUp();
  });
}

// --- RECURRING TRANSACTIONS ENGINE ---
function processRecurringTransactions() {
  const recPayments = getRecurring();
  const currentDate = new Date();
  const currentDay = currentDate.getDate();
  const currentYearMonth = getCurrentMonthKey();

  recPayments.forEach(rec => {
    // If the due date day has passed or is today in current month
    if (rec.dayOfMonth <= currentDay) {
      const expectedBilledDate = `${currentYearMonth}-${String(rec.dayOfMonth).padStart(2, '0')}`;
      
      // If never billed or last billed date is in a previous month
      if (!rec.lastBilledDate || rec.lastBilledDate < expectedBilledDate) {
        // Post transaction expense
        const txObj = {
          type: 'expense',
          category: rec.category,
          amount: rec.amount,
          date: expectedBilledDate,
          description: `Recurring: ${rec.name}`
        };

        addTransaction(txObj);
        updateRecurringLastBilled(rec.id, expectedBilledDate);
        showToast(`Auto-processed recurring bill: ${rec.name} (${formatCurrency(rec.amount)})`, 'info');
      }
    }
  });
}

// --- TRANSACTION CRUD & EVENT BINDINGS ---
function initTransactionCrud() {
  const modal = document.getElementById('transactionModal');
  const form = document.getElementById('transactionForm');
  const openBtn = document.getElementById('quickAddTxBtn');
  const closeBtn = document.getElementById('txModalClose');
  const cancelBtn = document.getElementById('txModalCancel');
  
  // Set default date picker to today
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];

  // Open modal
  const openModal = (tx = null) => {
    form.reset();
    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
    
    if (tx) {
      document.getElementById('txModalTitle').textContent = 'Edit Transaction';
      document.getElementById('txId').value = tx.id;
      document.getElementById('txType').value = tx.type;
      document.getElementById('txCategory').value = tx.category;
      document.getElementById('txAmount').value = tx.amount;
      document.getElementById('txDate').value = tx.date;
      document.getElementById('txDescription').value = tx.description;
    } else {
      document.getElementById('txModalTitle').textContent = 'Add Transaction';
      document.getElementById('txId').value = '';
    }
    modal.classList.add('active');
  };

  openBtn.addEventListener('click', () => openModal());
  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

  // Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('txId').value;
    const type = document.getElementById('txType').value;
    const category = document.getElementById('txCategory').value;
    const amount = parseFloat(document.getElementById('txAmount').value);
    const date = document.getElementById('txDate').value;
    const description = document.getElementById('txDescription').value.trim();

    // Input Validation
    if (isNaN(amount) || amount <= 0) {
      showToast('Amount must be a positive number.', 'danger');
      return;
    }

    const txData = { id, type, category, amount, date, description };

    if (id) {
      updateTransaction(txData);
      showToast('Transaction updated successfully.', 'success');
    } else {
      addTransaction(txData);
      showToast('Transaction added successfully.', 'success');
    }

    // Check Budget Warning alerts on addition
    if (type === 'expense') {
      const alert = checkBudgetAlerts(category, date.substring(0, 7));
      if (alert) {
        showToast(alert.message, alert.type);
      }
    }

    modal.classList.remove('active');
    checkAndTriggerAchievements();
    renderApp();
  });

  // Table buttons edit/delete (delegated)
  document.getElementById('transactionsTable').addEventListener('click', handleTableActions);
  
  // Filters binding
  document.getElementById('txSearchInput').addEventListener('input', () => renderTransactionsTable());
  document.getElementById('txFilterCategory').addEventListener('change', () => renderTransactionsTable());
  document.getElementById('txFilterDate').addEventListener('change', () => renderTransactionsTable());

  // Sorting
  document.getElementById('txSortDateBtn').addEventListener('click', () => {
    txSortField = 'date';
    txSortOrder = txSortOrder === 'desc' ? 'asc' : 'desc';
    renderTransactionsTable();
  });
  
  document.getElementById('txSortAmountBtn').addEventListener('click', () => {
    txSortField = 'amount';
    txSortOrder = txSortOrder === 'desc' ? 'asc' : 'desc';
    renderTransactionsTable();
  });
}

function handleTableActions(e) {
  const editBtn = e.target.closest('.tx-edit-btn');
  const deleteBtn = e.target.closest('.tx-delete-btn');
  const transactions = getTransactions();

  if (editBtn) {
    const id = editBtn.getAttribute('data-id');
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      // Re-use add transaction form for edits
      const modal = document.getElementById('transactionModal');
      document.getElementById('txModalTitle').textContent = 'Edit Transaction';
      document.getElementById('txId').value = tx.id;
      document.getElementById('txType').value = tx.type;
      document.getElementById('txCategory').value = tx.category;
      document.getElementById('txAmount').value = tx.amount;
      document.getElementById('txDate').value = tx.date;
      document.getElementById('txDescription').value = tx.description;
      modal.classList.add('active');
    }
  }

  if (deleteBtn) {
    const id = deleteBtn.getAttribute('data-id');
    showConfirm(
      'Delete Transaction?',
      'Are you sure you want to remove this record? This action will adjust your monthly aggregates.',
      () => {
        deleteTransaction(id);
        showToast('Record deleted.', 'info');
        renderApp();
      }
    );
  }
}

// --- RENDER RECENT TRANSACTIONS TABLE ON DASHBOARD ---
function renderRecentTransactions() {
  const transactions = getTransactions();
  const tbody = document.querySelector('#dashboardRecentTxTable tbody');
  const emptyState = document.getElementById('dashboardRecentTxEmpty');

  tbody.innerHTML = '';
  
  // Show first 5 transactions
  const recent = transactions.slice(0, 5);

  if (recent.length === 0) {
    emptyState.style.display = 'flex';
    document.getElementById('dashboardRecentTxTable').style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    document.getElementById('dashboardRecentTxTable').style.display = 'table';
    
    recent.forEach(tx => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDateLabel(tx.date)}</td>
        <td><span class="badge" style="background-color:rgba(99,102,241,0.08); color:var(--color-primary);">${tx.category}</span></td>
        <td>${tx.description || '-'}</td>
        <td><span class="badge badge-${tx.type}">${tx.type}</span></td>
        <td class="text-${tx.type}">${tx.type === 'expense' ? '-' : '+'}${formatCurrency(tx.amount)}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// --- RENDER FULL TRANSACTIONS VIEW TABLE ---
function renderTransactionsTable() {
  const transactions = getTransactions();
  const tbody = document.querySelector('#transactionsTable tbody');
  const emptyState = document.getElementById('transactionsEmpty');
  
  const search = document.getElementById('txSearchInput').value.toLowerCase();
  const categoryFilter = document.getElementById('txFilterCategory').value;
  const dateFilter = document.getElementById('txFilterDate').value;

  tbody.innerHTML = '';

  // Filter transactions
  let filtered = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(search) || tx.category.toLowerCase().includes(search);
    const matchesCategory = categoryFilter ? tx.category === categoryFilter : true;
    
    let matchesDate = true;
    if (dateFilter) {
      const txDate = new Date(tx.date);
      const today = new Date();
      const currentMonthStr = getCurrentMonthKey();
      
      if (dateFilter === 'this-month') {
        matchesDate = tx.date.startsWith(currentMonthStr);
      } else if (dateFilter === 'last-30') {
        const diffTime = Math.abs(today - txDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        matchesDate = diffDays <= 30;
      } else if (dateFilter === 'last-3-months') {
        const diffTime = Math.abs(today - txDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        matchesDate = diffDays <= 90;
      }
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  // Sort transactions
  filtered.sort((a, b) => {
    let factor = txSortOrder === 'desc' ? -1 : 1;
    if (txSortField === 'date') {
      return (new Date(a.date) - new Date(b.date)) * factor;
    } else {
      return (a.amount - b.amount) * factor;
    }
  });

  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
    document.getElementById('transactionsTable').style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    document.getElementById('transactionsTable').style.display = 'table';

    filtered.forEach(tx => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDateLabel(tx.date)}</td>
        <td><span class="badge" style="background-color:rgba(99,102,241,0.08); color:var(--color-primary);">${tx.category}</span></td>
        <td>${tx.description || '-'}</td>
        <td><span class="badge badge-${tx.type}">${tx.type}</span></td>
        <td class="text-${tx.type}">${tx.type === 'expense' ? '-' : '+'}${formatCurrency(tx.amount)}</td>
        <td class="actions-cell">
          <button class="btn-icon tx-edit-btn" data-id="${tx.id}"><i data-lucide="edit-2" style="width:14px; height:14px;"></i></button>
          <button class="btn-icon tx-delete-btn" data-id="${tx.id}"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (window.lucide) window.lucide.createIcons();
}

// --- BUDGET CRUD & VIEW ---
function initBudgetCrud() {
  const modal = document.getElementById('budgetModal');
  const form = document.getElementById('budgetForm');
  const openBtn = document.getElementById('openAddBudgetBtn');
  const closeBtn = document.getElementById('budgetModalClose');
  const cancelBtn = document.getElementById('budgetModalCancel');

  openBtn.addEventListener('click', () => {
    form.reset();
    modal.classList.add('active');
  });

  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('budgetCategory').value;
    const limit = parseFloat(document.getElementById('budgetLimit').value);

    if (isNaN(limit) || limit < 0) {
      showToast('Enter a valid monthly budget limit.', 'danger');
      return;
    }

    saveBudget(category, limit);
    showToast(`Budget limit updated for ${category}.`, 'success');
    modal.classList.remove('active');
    
    checkAndTriggerAchievements();
    renderApp();
  });
}

function renderBudgetsGrid() {
  const currentMonthKey = getCurrentMonthKey();
  const status = getBudgetStatus(currentMonthKey);
  const grid = document.getElementById('categoryBudgetsGrid');
  const quickList = document.getElementById('dashboardBudgetsSummary');
  const alertsContainer = document.getElementById('budgetAlertsContainer');

  grid.innerHTML = '';
  quickList.innerHTML = '';
  alertsContainer.innerHTML = '';

  // Render warnings box inside budget page if limits are breached
  const breached = status.categories.filter(c => c.spent > c.limit && c.limit > 0);
  const warned = status.categories.filter(c => c.status === 'warning' && c.limit > 0);

  if (breached.length > 0) {
    const alertBox = document.createElement('div');
    alertBox.className = 'warning-box danger';
    alertBox.innerHTML = `
      <i data-lucide="alert-circle" style="flex-shrink:0;"></i>
      <div>
        <strong>Budget Limit Exceeded!</strong> You have spent over 100% of your allocated limits in ${breached.length} categories: ${breached.map(b => b.category).join(', ')}. Please hold off on discretionary spending.
      </div>
    `;
    alertsContainer.appendChild(alertBox);
  } else if (warned.length > 0) {
    const alertBox = document.createElement('div');
    alertBox.className = 'warning-box warning';
    alertBox.innerHTML = `
      <i data-lucide="alert-triangle" style="flex-shrink:0;"></i>
      <div>
        <strong>Budget Warning!</strong> You have used over 80% of your budget in categories: ${warned.map(w => w.category).join(', ')}. Keep close track of additional logs.
      </div>
    `;
    alertsContainer.appendChild(alertBox);
  }

  // Draw full category budget cards
  status.categories.forEach(item => {
    if (item.limit === 0 && item.spent === 0) return; // Hide unconfigured inactive categories

    const card = document.createElement('div');
    card.className = `glass-card budget-card ${item.spent > item.limit && item.limit > 0 ? 'breached' : ''}`;
    
    const displayLimit = item.limit > 0 ? formatCurrency(item.limit) : 'Unrestricted';
    const displayRemaining = item.limit > 0 
      ? (item.remaining >= 0 ? `${formatCurrency(item.remaining)} remaining` : `${formatCurrency(Math.abs(item.remaining))} exceeded`) 
      : 'No Limit';

    const barClass = item.status === 'exceeded' ? 'progress-exceeded' : (item.status === 'warning' ? 'progress-warning' : 'progress-safe');
    const remainingClass = item.status === 'exceeded' ? 'exceeded' : (item.status === 'warning' ? 'warning' : 'safe');
    const displayPct = item.limit > 0 ? Math.min(100, item.percent).toFixed(0) : 0;

    card.innerHTML = `
      <div class="budget-card-header">
        <span class="budget-category-name">${item.category}</span>
        <span class="badge" style="background-color:rgba(99,102,241,0.08); color:var(--color-primary);">${item.limit > 0 ? displayPct + '%' : 'N/A'}</span>
      </div>
      
      <div class="budget-progress-container">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${barClass}" style="width: ${item.limit > 0 ? Math.min(100, item.percent) : 0}%"></div>
        </div>
        <div class="budget-vals">
          <span>Spent: ${formatCurrency(item.spent)}</span>
          <span>Limit: ${displayLimit}</span>
        </div>
        <div class="budget-remaining ${remainingClass}">${displayRemaining}</div>
      </div>
    `;
    grid.appendChild(card);

    // Dashboard mini rendering (only active budgets, max 3)
    if (item.limit > 0 && quickList.children.length < 3) {
      const miniRow = document.createElement('div');
      miniRow.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; margin-bottom:4px;">
          <span>${item.category}</span>
          <span>${item.percent.toFixed(0)}%</span>
        </div>
        <div class="progress-bar-bg" style="height:6px; margin-bottom:0;">
          <div class="progress-bar-fill ${barClass}" style="width: ${Math.min(100, item.percent)}%"></div>
        </div>
      `;
      quickList.appendChild(miniRow);
    }
  });

  if (quickList.children.length === 0) {
    quickList.innerHTML = `<span style="font-size:12px; color:var(--text-secondary);">No category budgets configured this month.</span>`;
  }
  
  if (grid.children.length === 0) {
    grid.innerHTML = `
      <div class="glass-card empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon"><i data-lucide="sliders"></i></div>
        <span class="empty-state-title">No category budgets set</span>
        <span class="empty-state-desc">Click "Configure Budget" to establish category spending limits.</span>
      </div>
    `;
  }

  if (window.lucide) window.lucide.createIcons();
}

// --- SAVINGS GOALS CRUD & VIEW ---
function initGoalsCrud() {
  const modal = document.getElementById('goalModal');
  const form = document.getElementById('goalForm');
  const openBtn = document.getElementById('openAddGoalBtn');
  const closeBtn = document.getElementById('goalModalClose');
  const cancelBtn = document.getElementById('goalModalCancel');

  // Fund adjustment modal
  const fundModal = document.getElementById('goalFundModal');
  const fundForm = document.getElementById('goalFundForm');
  const fundCancel = document.getElementById('goalFundCancel');
  const fundClose = document.getElementById('goalFundModalClose');

  openBtn.addEventListener('click', () => {
    form.reset();
    document.getElementById('goalId').value = '';
    document.getElementById('goalModalTitle').textContent = 'Create Savings Goal';
    document.getElementById('goalCurrent').parentElement.style.display = 'flex'; // show for new goals
    modal.classList.add('active');
  });

  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('goalId').value;
    const name = document.getElementById('goalName').value.trim();
    const target = parseFloat(document.getElementById('goalTarget').value);
    const current = parseFloat(document.getElementById('goalCurrent').value || 0);
    const deadline = document.getElementById('goalDeadline').value;

    if (isNaN(target) || target <= 0) {
      showToast('Target amount must be a positive number.', 'danger');
      return;
    }

    if (id) {
      updateGoal({ id, name, target, current, deadline });
      showToast('Savings goal updated.', 'success');
    } else {
      addGoal({ name, target, current, deadline });
      showToast('Savings goal created.', 'success');
    }

    modal.classList.remove('active');
    checkAndTriggerAchievements();
    renderApp();
  });

  // Fund Transfer forms
  fundClose.addEventListener('click', () => fundModal.classList.remove('active'));
  fundCancel.addEventListener('click', () => fundModal.classList.remove('active'));
  
  fundForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('goalFundId').value;
    const action = document.getElementById('goalFundAction').value;
    const amount = parseFloat(document.getElementById('goalFundAmount').value);

    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount.', 'danger');
      return;
    }

    const goal = getGoals().find(g => g.id === id);
    if (!goal) return;

    if (action === 'deposit') {
      // Check if we exceed target
      if (goal.current + amount > goal.target) {
        showToast('Deposit amount exceeds the remaining goal target.', 'warning');
        return;
      }
      adjustGoalFunds(id, amount);
      showToast(`Deposited ${formatCurrency(amount)} into ${goal.name}.`, 'success');
    } else {
      if (amount > goal.current) {
        showToast('Insufficient funds in goal to withdraw.', 'danger');
        return;
      }
      adjustGoalFunds(id, -amount);
      showToast(`Withdrew ${formatCurrency(amount)} from ${goal.name}.`, 'info');
    }

    fundModal.classList.remove('active');
    checkAndTriggerAchievements();
    renderApp();
  });

  // Delegated buttons for goals
  document.getElementById('goalsGrid').addEventListener('click', handleGoalsGridActions);
}

function handleGoalsGridActions(e) {
  const editBtn = e.target.closest('.goal-edit-btn');
  const deleteBtn = e.target.closest('.goal-delete-btn');
  const fundBtn = e.target.closest('.goal-fund-btn');
  const goals = getGoals();

  if (editBtn) {
    const id = editBtn.getAttribute('data-id');
    const goal = goals.find(g => g.id === id);
    if (goal) {
      const modal = document.getElementById('goalModal');
      document.getElementById('goalId').value = goal.id;
      document.getElementById('goalName').value = goal.name;
      document.getElementById('goalTarget').value = goal.target;
      document.getElementById('goalCurrent').value = goal.current;
      document.getElementById('goalDeadline').value = goal.deadline;
      document.getElementById('goalCurrent').parentElement.style.display = 'none'; // hide initial on edit
      document.getElementById('goalModalTitle').textContent = 'Edit Savings Goal';
      modal.classList.add('active');
    }
  }

  if (deleteBtn) {
    const id = deleteBtn.getAttribute('data-id');
    showConfirm(
      'Delete Savings Goal?',
      'Are you sure you want to remove this goal? Allocated funds will be returned to your main balance.',
      () => {
        deleteGoal(id);
        showToast('Savings goal deleted.', 'info');
        renderApp();
      }
    );
  }

  if (fundBtn) {
    const id = fundBtn.getAttribute('data-id');
    const goal = goals.find(g => g.id === id);
    if (goal) {
      const modal = document.getElementById('goalFundModal');
      document.getElementById('goalFundId').value = goal.id;
      document.getElementById('goalFundAmount').value = '';
      document.getElementById('goalFundModalTitle').textContent = `Adjust Funds for ${goal.name}`;
      modal.classList.add('active');
    }
  }
}

function renderGoalsGrid() {
  const enriched = getEnrichedGoals();
  const grid = document.getElementById('goalsGrid');
  const quickList = document.getElementById('dashboardGoalsSummary');

  grid.innerHTML = '';
  quickList.innerHTML = '';

  enriched.forEach(goal => {
    const card = document.createElement('div');
    card.className = `glass-card goal-card ${goal.status === 'Completed' ? 'completed' : ''}`;
    
    const statusClass = goal.status.replace(' ', '-').toLowerCase();
    const displayPct = goal.percent.toFixed(0);

    card.innerHTML = `
      <div class="budget-card-header" style="align-items: flex-start;">
        <div>
          <span class="budget-category-name" style="font-size:16px;">${goal.name}</span>
          <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">Deadline: ${formatDateLabel(goal.deadline)}</div>
        </div>
        <span class="goal-status-badge ${statusClass}">${goal.status}</span>
      </div>
      
      <div class="budget-progress-container">
        <div class="progress-bar-bg" style="height:10px;">
          <div class="progress-bar-fill progress-safe" style="width: ${Math.min(100, goal.percent)}%; background-color:var(--color-info);"></div>
        </div>
        <div class="budget-vals" style="margin-bottom:12px;">
          <span>Saved: ${formatCurrency(goal.current)}</span>
          <span>Target: ${formatCurrency(goal.target)}</span>
        </div>
        
        <p class="goal-estimate-text">${goal.estimateMsg}</p>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top: auto; border-top:1px solid var(--border-glass); padding-top:16px;">
        <button class="btn btn-primary btn-sm goal-fund-btn" data-id="${goal.id}">
          <i data-lucide="arrow-left-right"></i> Transfer Funds
        </button>
        <div class="actions-cell">
          <button class="btn-icon goal-edit-btn" data-id="${goal.id}"><i data-lucide="edit-2" style="width:14px; height:14px;"></i></button>
          <button class="btn-icon goal-delete-btn" data-id="${goal.id}"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>
        </div>
      </div>
    `;
    grid.appendChild(card);

    // Dashboard mini rendering (max 3)
    if (quickList.children.length < 3) {
      const miniRow = document.createElement('div');
      miniRow.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; margin-bottom:4px;">
          <span>${goal.name}</span>
          <span>${displayPct}%</span>
        </div>
        <div class="progress-bar-bg" style="height:6px; margin-bottom:0;">
          <div class="progress-bar-fill" style="width: ${Math.min(100, goal.percent)}%; background-color:var(--color-info);"></div>
        </div>
      `;
      quickList.appendChild(miniRow);
    }
  });

  if (quickList.children.length === 0) {
    quickList.innerHTML = `<span style="font-size:12px; color:var(--text-secondary);">No active savings goals set.</span>`;
  }

  if (grid.children.length === 0) {
    grid.innerHTML = `
      <div class="glass-card empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon"><i data-lucide="target"></i></div>
        <span class="empty-state-title">No savings goals</span>
        <span class="empty-state-desc">Click "Create Savings Goal" to establish a target tracker.</span>
      </div>
    `;
  }

  if (window.lucide) window.lucide.createIcons();
}

// --- RECURRING & CALENDAR HANDLERS ---
function initCalendarView() {
  // Calendar headers
  document.getElementById('calPrevBtn').addEventListener('click', () => {
    calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
    renderCalendar();
  });
  
  document.getElementById('calNextBtn').addEventListener('click', () => {
    calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
    renderCalendar();
  });
  
  document.getElementById('calTodayBtn').addEventListener('click', () => {
    calCurrentDate = new Date();
    renderCalendar();
  });

  // Recurring form submission
  const recurringForm = document.getElementById('addRecurringForm');
  recurringForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('recName').value.trim();
    const amount = parseFloat(document.getElementById('recAmount').value);
    const category = document.getElementById('recCategory').value;
    const dayOfMonth = parseInt(document.getElementById('recDay').value);

    if (isNaN(amount) || amount <= 0) {
      showToast('Enter a valid recurring bill amount.', 'danger');
      return;
    }
    if (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
      showToast('Enter a valid due day of month (1-28).', 'danger');
      return;
    }

    addRecurring({ name, amount, category, dayOfMonth });
    showToast(`Recurring schedule configured for ${name}.`, 'success');
    recurringForm.reset();
    
    processRecurringTransactions();
    renderApp();
    renderCalendar();
  });

  // Delegated deletes for recurring templates
  document.getElementById('recurringListContainer').addEventListener('click', (e) => {
    const delBtn = e.target.closest('.delete-rec-btn');
    if (delBtn) {
      const id = delBtn.getAttribute('data-id');
      showConfirm(
        'Remove Recurring Payment?',
        'Are you sure you want to delete this payment rule? Future months will not generate automated expenses for this item.',
        () => {
          deleteRecurring(id);
          showToast('Payment rule removed.', 'info');
          renderApp();
          renderCalendar();
        }
      );
    }
  });
}

function renderCalendar() {
  const container = document.getElementById('calendarGridContainer');
  const header = document.getElementById('calendarMonthYear');
  
  container.innerHTML = '';

  const year = calCurrentDate.getFullYear();
  const month = calCurrentDate.getMonth();

  // Month header text
  header.textContent = calCurrentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Days headings labels
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  days.forEach(d => {
    const el = document.createElement('div');
    el.className = 'calendar-day-header';
    el.textContent = d;
    container.appendChild(el);
  });

  // Find start day of month and number of days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // Events list map
  const transactions = getTransactions();
  const goals = getGoals();
  const recurring = getRecurring();

  // Format month key YYYY-MM
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const getDayEvents = (day) => {
    const events = [];
    const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;

    // A. Transactions matching date
    transactions.forEach(t => {
      if (t.date === dateStr) {
        events.push({
          type: t.type === 'income' ? 'income' : 'bills',
          label: `${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)} ${t.category}`
        });
      }
    });

    // B. Goals matching deadline
    goals.forEach(g => {
      if (g.deadline === dateStr) {
        events.push({
          type: 'goal',
          label: `🎯 Deadline: ${g.name}`
        });
      }
    });

    // C. Recurring payments matching day
    recurring.forEach(r => {
      if (r.dayOfMonth === day) {
        events.push({
          type: 'emi',
          label: `🔔 Due: ${r.name} (${formatCurrency(r.amount)})`
        });
      }
    });

    return events;
  };

  // 1. Previous month days placeholders
  for (let i = firstDayIndex; i > 0; i--) {
    const day = prevMonthTotalDays - i + 1;
    const cell = document.createElement('div');
    cell.className = 'calendar-cell other-month';
    cell.innerHTML = `<span class="calendar-date-number">${day}</span>`;
    container.appendChild(cell);
  }

  // 2. Current Month days
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    if (isCurrentMonth && today.getDate() === day) {
      cell.classList.add('today');
    }

    const events = getDayEvents(day);
    let eventsMarkup = '';
    
    events.slice(0, 2).forEach(ev => {
      eventsMarkup += `<div class="calendar-event-dot ${ev.type}" title="${ev.label}">${ev.label}</div>`;
    });

    if (events.length > 2) {
      eventsMarkup += `<div class="calendar-event-dot" style="background-color:var(--border-glass); text-align:center;">+${events.length - 2} more</div>`;
    }

    cell.innerHTML = `
      <span class="calendar-date-number">${day}</span>
      <div class="calendar-events-container">${eventsMarkup}</div>
    `;
    container.appendChild(cell);
  }

  // 3. Next month days placeholders to complete grid (assume grid of 42 cells total)
  const totalCellsWritten = firstDayIndex + totalDays;
  const nextMonthCellsNeeded = 42 - totalCellsWritten;
  
  for (let day = 1; day <= nextMonthCellsNeeded; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell other-month';
    cell.innerHTML = `<span class="calendar-date-number">${day}</span>`;
    container.appendChild(cell);
  }

  if (window.lucide) window.lucide.createIcons();
}

function renderRecurringPaymentsList() {
  const recurring = getRecurring();
  const container = document.getElementById('recurringListContainer');
  
  container.innerHTML = '';

  recurring.forEach(rec => {
    const row = document.createElement('div');
    row.className = 'upcoming-event-item';
    row.innerHTML = `
      <div class="upcoming-event-icon" style="background-color:rgba(99,102,241,0.08); color:var(--color-primary);">
        <i data-lucide="bell"></i>
      </div>
      <div class="upcoming-event-info">
        <span class="upcoming-event-name">${rec.name}</span>
        <span class="upcoming-event-date">Due: Day ${rec.dayOfMonth} | ${formatCurrency(rec.amount)}</span>
      </div>
      <button class="btn-icon delete-rec-btn" data-id="${rec.id}"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>
    `;
    container.appendChild(row);
  });

  if (recurring.length === 0) {
    container.innerHTML = `<span style="font-size:12px; color:var(--text-secondary);">No recurring rules set. Add one above.</span>`;
  }
}

function renderUpcomingPaymentsSidebar() {
  const recurring = getRecurring();
  const goals = getGoals();
  const container = document.getElementById('dashboardUpcomingSummary');

  container.innerHTML = '';
  
  const items = [];
  
  // Collect upcoming recurring payments
  const currentDate = new Date();
  const currentDay = currentDate.getDate();

  recurring.forEach(r => {
    // If due this month or next month
    let dueStr = '';
    if (r.dayOfMonth >= currentDay) {
      dueStr = `Due in ${r.dayOfMonth - currentDay} days (Day ${r.dayOfMonth})`;
      items.push({ name: r.name, dueStr, amount: r.amount, type: 'recurring' });
    } else {
      dueStr = `Due next month (Day ${r.dayOfMonth})`;
      items.push({ name: r.name, dueStr, amount: r.amount, type: 'recurring' });
    }
  });

  // Collect upcoming goal deadlines
  goals.forEach(g => {
    const deadline = new Date(g.deadline);
    const diffTime = deadline - currentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && diffDays <= 30 && g.current < g.target) {
      items.push({
        name: `Deadline: ${g.name}`,
        dueStr: `Due in ${diffDays} days (${formatDateLabel(g.deadline)})`,
        amount: g.target - g.current,
        type: 'goal'
      });
    }
  });

  // Sort items by due proximity or show top 3
  const topItems = items.slice(0, 3);

  topItems.forEach(item => {
    const row = document.createElement('div');
    row.className = 'upcoming-event-item';
    
    const iconName = item.type === 'goal' ? 'target' : 'bell';
    const iconColor = item.type === 'goal' ? 'var(--color-info)' : 'var(--color-primary)';
    const bgOpacityColor = item.type === 'goal' ? 'rgba(6, 182, 212, 0.08)' : 'rgba(99, 102, 241, 0.08)';

    row.innerHTML = `
      <div class="upcoming-event-icon" style="background-color:${bgOpacityColor}; color:${iconColor};">
        <i data-lucide="${iconName}"></i>
      </div>
      <div class="upcoming-event-info">
        <span class="upcoming-event-name">${item.name}</span>
        <span class="upcoming-event-date">${item.dueStr}</span>
      </div>
      <div style="font-size:12px; font-weight:700; color:var(--text-main);">${formatCurrency(item.amount)}</div>
    `;
    container.appendChild(row);
  });

  if (topItems.length === 0) {
    container.innerHTML = `<span style="font-size:12px; color:var(--text-secondary);">No upcoming payments inside next 30 days.</span>`;
  }
}

// --- EMI CALCULATOR IMPLEMENTATION ---
function initEmiCalculator() {
  const form = document.getElementById('emiCalculatorForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    renderEMIResults();
  });
  
  // Initial draw
  renderEMIResults();
}

function renderEMIResults() {
  const principal = parseFloat(document.getElementById('emiLoanAmount').value);
  const rate = parseFloat(document.getElementById('emiInterestRate').value);
  const tenure = parseInt(document.getElementById('emiTenure').value);

  const results = calculateEMI(principal, rate, tenure);

  document.getElementById('emi-monthly-val').textContent = formatCurrency(results.monthlyEMI);
  document.getElementById('emi-interest-val').textContent = formatCurrency(results.totalInterest);
  document.getElementById('emi-total-val').textContent = formatCurrency(results.totalPayment);

  // Render Amortization schedule
  const tbody = document.getElementById('emiAmortizationBody');
  tbody.innerHTML = '';
  
  // Show first 12 months for brevity
  const visibleSchedule = results.schedule.slice(0, 12);
  visibleSchedule.forEach(sch => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>Month ${sch.month}</td>
      <td>${formatCurrency(sch.principalPaid)}</td>
      <td>${formatCurrency(sch.interestPaid)}</td>
      <td>${formatCurrency(sch.remainingBalance)}</td>
    `;
    tbody.appendChild(tr);
  });

  if (results.schedule.length > 12) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4" style="text-align:center; color:var(--text-secondary); font-style:italic;">Showing first 12 of ${results.schedule.length} months.</td>`;
    tbody.appendChild(tr);
  }

  // Draw or update Pie Chart
  drawEmiChart(results);
}

function drawEmiChart(results) {
  const canvas = document.getElementById('emiPieChart');
  if (!canvas) return;

  if (emiChartInstance) {
    emiChartInstance.destroy();
  }

  const themeSettings = getState().settings?.theme || 'dark';
  const textColor = themeSettings === 'light' ? '#4a5568' : '#a0aec0';

  emiChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Principal Amount', 'Total Interest'],
      datasets: [{
        data: [results.principalPercent, results.interestPercent],
        backgroundColor: ['#6366f1', '#f43f5e'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            font: { family: 'Plus Jakarta Sans', size: 12 }
          }
        }
      }
    }
  });
}

// --- REPORTS VIEW, INSIGHTS & EXPORTS ---
function initReportsSection() {
  document.getElementById('generateReportBtn').addEventListener('click', generateReportPreview);
  document.getElementById('exportReportPdfBtn').addEventListener('click', exportReportToPdf);

  // Help explain modal
  const explainModal = document.getElementById('healthExplainModal');
  document.getElementById('healthExplainBtn').addEventListener('click', () => {
    explainModal.classList.add('active');
  });
  document.getElementById('healthExplainModalClose').addEventListener('click', () => {
    explainModal.classList.remove('active');
  });
  document.getElementById('healthExplainCloseBtn').addEventListener('click', () => {
    explainModal.classList.remove('active');
  });
}

function initReportsOptions() {
  const select = document.getElementById('reportMonthSelect');
  select.innerHTML = '';
  
  // Aggregate available transaction months in desc order
  const transactions = getTransactions();
  const months = new Set();
  
  transactions.forEach(t => {
    months.add(t.date.substring(0, 7)); // YYYY-MM
  });

  const sortedMonths = Array.from(months).sort().reverse();
  
  sortedMonths.forEach(m => {
    // Format YYYY-MM into a readable select label
    const dateObj = new Date(m + '-01');
    const label = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = label;
    select.appendChild(opt);
  });

  if (sortedMonths.length === 0) {
    const opt = document.createElement('option');
    opt.value = getCurrentMonthKey();
    opt.textContent = 'Current Month';
    select.appendChild(opt);
  }
}

function renderInsightsFeed() {
  const insights = generateInsights();
  const container = document.getElementById('insightsFeedContainer');
  container.innerHTML = '';

  insights.forEach(ins => {
    const card = document.createElement('div');
    card.className = `glass-card insight-card insight-${ins.type}`;
    
    card.innerHTML = `
      <div class="insight-header">
        <div class="insight-icon"><i data-lucide="${ins.icon}"></i></div>
        <span class="insight-title">${ins.title}</span>
      </div>
      <p class="insight-text">${ins.text}</p>
      <div class="insight-advice">${ins.recommendation}</div>
    `;
    container.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
}

function generateReportPreview() {
  const monthStr = document.getElementById('reportMonthSelect').value;
  const previewContainer = document.getElementById('reportPreviewContainer');
  const printableArea = document.getElementById('printableReportTemplate');
  const exportBtn = document.getElementById('exportReportPdfBtn');

  // Perform report math
  const transactions = getTransactions();
  const monthTransactions = transactions.filter(t => t.date.startsWith(monthStr));
  
  const income = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = Math.max(0, income - expense);
  const rate = income > 0 ? (netSavings / income) * 100 : 0;
  
  // Financial health status
  const budgetStatus = getBudgetStatus(monthStr);
  const health = calculateHealthScore(rate, budgetStatus, income, expense);

  // Top 5 category expenses
  const categoryExpenses = {};
  monthTransactions.forEach(t => {
    if (t.type === 'expense') {
      categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
    }
  });

  const sortedCategories = Object.keys(categoryExpenses)
    .map(cat => ({ category: cat, spent: categoryExpenses[cat] }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  // Compile insights
  const insights = generateInsights().slice(0, 3);

  // Create date formatting
  const reportDateObj = new Date(monthStr + '-01');
  const monthName = reportDateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
  const printedTimestamp = new Date().toLocaleString();

  printableArea.innerHTML = `
    <!-- PDF Header -->
    <div class="pdf-header">
      <div>
        <div class="pdf-logo">Smart Finance Pro</div>
        <span style="font-size:12px; color:#718096;">SaaS Financial Statement</span>
      </div>
      <div class="pdf-meta">
        <strong>Billing Period:</strong> ${monthName}<br>
        <strong>Generated:</strong> ${printedTimestamp}
      </div>
    </div>
    
    <!-- KPI Overview -->
    <div class="pdf-kpis">
      <div class="pdf-kpi">
        <span class="pdf-kpi-label">Total Income</span>
        <div class="pdf-kpi-val" style="color:#10b981;">₹${income.toLocaleString()}</div>
      </div>
      <div class="pdf-kpi">
        <span class="pdf-kpi-label">Total Expenses</span>
        <div class="pdf-kpi-val" style="color:#f43f5e;">₹${expense.toLocaleString()}</div>
      </div>
      <div class="pdf-kpi">
        <span class="pdf-kpi-label">Net Savings</span>
        <div class="pdf-kpi-val" style="color:#6366f1;">₹${netSavings.toLocaleString()}</div>
      </div>
      <div class="pdf-kpi">
        <span class="pdf-kpi-label">Health Score</span>
        <div class="pdf-kpi-val" style="color:#2d3748;">${health.score}/100</div>
      </div>
    </div>

    <!-- Health assessment -->
    <div class="pdf-section">
      <div class="pdf-section-title">Financial Health Assessment</div>
      <div style="background-color:#f7fafc; padding:16px; border-radius:8px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-weight:800; font-size:14px; text-transform:uppercase; color:#2d3748;">Status: ${health.status}</span>
          <span style="font-size:12px; color:#718096;">Savings Rate: ${rate.toFixed(0)}%</span>
        </div>
        <p style="font-size:12px; line-height:1.4; color:#4a5568;">${health.message}</p>
      </div>
    </div>

    <!-- Top Categories -->
    <div class="pdf-section">
      <div class="pdf-section-title">Top Expense Breakdown</div>
      <table class="pdf-table">
        <thead>
          <tr>
            <th>Expense Category</th>
            <th>Total Amount</th>
            <th>% of Total Outflow</th>
          </tr>
        </thead>
        <tbody>
          ${sortedCategories.map(c => `
            <tr>
              <td><strong>${c.category}</strong></td>
              <td>₹${c.spent.toLocaleString()}</td>
              <td>${expense > 0 ? ((c.spent / expense) * 100).toFixed(0) : 0}%</td>
            </tr>
          `).join('')}
          ${sortedCategories.length === 0 ? '<tr><td colspan="3" style="text-align:center; color:#718096; padding:20px;">No expense records found.</td></tr>' : ''}
        </tbody>
      </table>
    </div>

    <!-- Insights Section -->
    <div class="pdf-section">
      <div class="pdf-section-title">Personalized Financial Advice</div>
      <div class="pdf-insights-list">
        ${insights.map(ins => `
          <div class="pdf-insight-item">
            <strong>${ins.title}</strong>: ${ins.text}
            <div style="font-size:11px; color:#718096; margin-top:4px;">*Advice: ${ins.recommendation}*</div>
          </div>
        `).join('')}
        ${insights.length === 0 ? '<div style="font-size:12px; color:#718096; text-align:center;">No recommendation parameters matched this month.</div>' : ''}
      </div>
    </div>

    <!-- Footer -->
    <div class="pdf-footer">
      This statement was automatically generated by Smart Finance Pro under John Doe's profile.
      <br><strong>Secure client-side LocalStorage document. Smart Finance Pro © 2026</strong>
    </div>
  `;

  previewContainer.style.display = 'block';
  exportBtn.style.display = 'inline-flex';
}

function exportReportToPdf() {
  const monthStr = document.getElementById('reportMonthSelect').value;
  const element = document.getElementById('printableReportTemplate');

  if (window.html2pdf) {
    const opt = {
      margin:       12,
      filename:     `SmartFinancePro_Report_${monthStr}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
    showToast('Monthly financial report PDF downloaded successfully.', 'success');
  } else {
    showToast('html2pdf library load error.', 'danger');
  }
}

// --- ACHIEVEMENT SYSTEM VIEWS ---
function checkAndTriggerAchievements() {
  const transactions = getTransactions();
  const goals = getGoals();
  const currentMonthKey = getCurrentMonthKey();
  
  // Calculated stats
  const totalGoalSavings = goals.reduce((sum, g) => sum + g.current, 0);
  const completedGoalsCount = goals.filter(g => g.current >= g.target).length;
  const budgetStatus = getBudgetStatus(currentMonthKey);
  const totalTxCount = transactions.length;

  // Track achievements to unlock
  const unlockList = [];

  // A. Saved 10,000
  if (totalGoalSavings >= 10000) {
    const ach = unlockAchievement('ach-1');
    if (ach) unlockList.push(ach);
  }
  // B. Saved 50,000
  if (totalGoalSavings >= 50000) {
    const ach = unlockAchievement('ach-2');
    if (ach) unlockList.push(ach);
  }
  // C. First Goal Milestone Complete
  if (completedGoalsCount >= 1) {
    const ach = unlockAchievement('ach-3');
    if (ach) unlockList.push(ach);
  }
  // D. Stayed within budget (compliance percent is under 100 and there is some budget defined and we have spent > 0)
  const breachedCount = budgetStatus.categories.filter(c => c.spent > c.limit && c.limit > 0).length;
  const budgetsCount = budgetStatus.categories.filter(c => c.limit > 0).length;
  if (budgetsCount > 0 && breachedCount === 0 && budgetStatus.totalSpent > 0) {
    const ach = unlockAchievement('ach-4');
    if (ach) unlockList.push(ach);
  }
  // E. 100 Transactions Added
  if (totalTxCount >= 100) {
    const ach = unlockAchievement('ach-6');
    if (ach) unlockList.push(ach);
  }

  // Handle visual unlock overlay
  if (unlockList.length > 0) {
    const currentAch = unlockList[0];
    const modal = document.getElementById('achievementUnlockModal');
    document.getElementById('unlockedAchName').textContent = currentAch.name;
    document.getElementById('unlockedAchDesc').textContent = currentAch.description;
    
    modal.classList.add('active');
    showToast(`New Achievement Unlocked: ${currentAch.name}!`, 'warning');
    
    const closeBtn = document.getElementById('achievementUnlockCloseBtn');
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }
}

function renderAchievementsView() {
  const achievements = getAchievements();
  const container = document.getElementById('achievementsGridContainer');
  if (!container) return;

  container.innerHTML = '';

  achievements.forEach(ach => {
    const card = document.createElement('div');
    card.className = `glass-card achievement-card ${ach.unlocked ? 'unlocked' : ''}`;
    
    const displayDate = ach.unlockedDate ? `Unlocked: ${formatDateLabel(ach.unlockedDate)}` : 'Locked';

    card.innerHTML = `
      <div class="achievement-trophy">🏆</div>
      <span class="achievement-name">${ach.name}</span>
      <p class="achievement-desc">${ach.description}</p>
      <div class="achievement-date">${displayDate}</div>
    `;
    container.appendChild(card);
  });
}

// --- SETTINGS PREFERENCES INTERFACE ---
function initSettingsModule() {
  initSettings({
    renderApp: () => renderApp(),
    showToast: (msg, type) => showToast(msg, type),
    showConfirm: (title, message, onConfirm) => showConfirm(title, message, onConfirm)
  });

  // Bind theme toggle button
  document.getElementById('themeToggle').addEventListener('click', () => {
    const currentTheme = getState().settings?.theme || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    applyTheme(nextTheme);
    renderApp();
    
    // If we are currently in analytics, redraw charts with correct themes
    if (currentTab === 'analytics') {
      updateAnalyticsCharts(nextTheme);
    }
    showToast(`Switched to ${nextTheme} mode.`, 'success');
  });
}

// --- SHARED UTILITY HELPER METHODS ---
function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateLabel(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' });
}
