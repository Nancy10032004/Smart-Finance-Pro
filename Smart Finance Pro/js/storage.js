/**
 * Smart Finance Pro - LocalStorage State Management
 */

import { generateSampleData } from '../data/sampleData.js';

const STORAGE_KEY = 'smart_finance_pro_state';

// In-memory state
let appState = null;

// Initialize state
export function loadState() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (rawData) {
      appState = JSON.parse(rawData);
      // Ensure all fields exist
      if (!appState.transactions) appState.transactions = [];
      if (!appState.budgets) appState.budgets = {};
      if (!appState.goals) appState.goals = [];
      if (!appState.recurring) appState.recurring = [];
      if (!appState.achievements) appState.achievements = [];
      if (!appState.settings) {
        appState.settings = { theme: 'dark', currency: 'INR' };
      }
    } else {
      // Initialize with sample data on first run
      appState = generateSampleData();
      saveState();
    }
  } catch (error) {
    console.error("Failed to load state from LocalStorage. Resetting to sample data.", error);
    appState = generateSampleData();
    saveState();
  }
  return appState;
}

export function saveState() {
  if (!appState) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    // Trigger custom event to notify components that state updated
    window.dispatchEvent(new CustomEvent('financeStateUpdated', { detail: appState }));
  } catch (error) {
    console.error("Failed to save state to LocalStorage.", error);
  }
}

export function getState() {
  if (!appState) {
    loadState();
  }
  return appState;
}

// --- CURRENCY UTILITIES ---
export function formatCurrency(amount) {
  const state = getState();
  const currency = state.settings?.currency || 'INR';
  
  let locale = 'en-IN';
  let currencyCode = 'INR';
  
  if (currency === 'USD') {
    locale = 'en-US';
    currencyCode = 'USD';
  } else if (currency === 'EUR') {
    locale = 'en-IE'; // English layout for Euro
    currencyCode = 'EUR';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (e) {
    // Fallback format
    const symbols = { INR: '₹', USD: '$', EUR: '€' };
    const symbol = symbols[currency] || '₹';
    return `${symbol}${Number(amount).toLocaleString()}`;
  }
}

export function getCurrencySymbol() {
  const state = getState();
  const currency = state.settings?.currency || 'INR';
  const symbols = { INR: '₹', USD: '$', EUR: '€' };
  return symbols[currency] || '₹';
}

// --- TRANSACTION CRUD ---
export function getTransactions() {
  return getState().transactions;
}

export function addTransaction(tx) {
  const state = getState();
  const newTx = {
    id: tx.id || `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: tx.type, // 'income' | 'expense'
    category: tx.category,
    amount: parseFloat(tx.amount),
    date: tx.date,
    description: tx.description || ''
  };
  state.transactions.push(newTx);
  // Re-sort transactions by date desc by default
  state.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  saveState();
  return newTx;
}

export function updateTransaction(updatedTx) {
  const state = getState();
  const idx = state.transactions.findIndex(t => t.id === updatedTx.id);
  if (idx !== -1) {
    state.transactions[idx] = {
      ...state.transactions[idx],
      type: updatedTx.type,
      category: updatedTx.category,
      amount: parseFloat(updatedTx.amount),
      date: updatedTx.date,
      description: updatedTx.description || ''
    };
    state.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    saveState();
    return true;
  }
  return false;
}

export function deleteTransaction(id) {
  const state = getState();
  const idx = state.transactions.findIndex(t => t.id === id);
  if (idx !== -1) {
    state.transactions.splice(idx, 1);
    saveState();
    return true;
  }
  return false;
}

// --- BUDGETS CRUD ---
export function getBudgets() {
  return getState().budgets;
}

export function saveBudget(category, limit) {
  const state = getState();
  if (!state.budgets) state.budgets = {};
  state.budgets[category] = parseFloat(limit);
  saveState();
}

// --- SAVINGS GOALS CRUD ---
export function getGoals() {
  return getState().goals;
}

export function addGoal(goal) {
  const state = getState();
  const newGoal = {
    id: `goal-${Date.now()}`,
    name: goal.name,
    target: parseFloat(goal.target),
    current: parseFloat(goal.current || 0),
    deadline: goal.deadline
  };
  state.goals.push(newGoal);
  saveState();
  return newGoal;
}

export function updateGoal(updatedGoal) {
  const state = getState();
  const idx = state.goals.findIndex(g => g.id === updatedGoal.id);
  if (idx !== -1) {
    state.goals[idx] = {
      ...state.goals[idx],
      name: updatedGoal.name,
      target: parseFloat(updatedGoal.target),
      current: parseFloat(updatedGoal.current),
      deadline: updatedGoal.deadline
    };
    saveState();
    return true;
  }
  return false;
}

export function deleteGoal(id) {
  const state = getState();
  const idx = state.goals.findIndex(g => g.id === id);
  if (idx !== -1) {
    state.goals.splice(idx, 1);
    saveState();
    return true;
  }
  return false;
}

export function adjustGoalFunds(id, amount) {
  const state = getState();
  const goal = state.goals.find(g => g.id === id);
  if (goal) {
    goal.current = Math.max(0, Math.min(goal.target, goal.current + parseFloat(amount)));
    saveState();
    return goal;
  }
  return null;
}

// --- RECURRING CRUD ---
export function getRecurring() {
  return getState().recurring;
}

export function addRecurring(rec) {
  const state = getState();
  const newRec = {
    id: `rec-${Date.now()}`,
    name: rec.name,
    amount: parseFloat(rec.amount),
    category: rec.category,
    frequency: rec.frequency || 'monthly',
    dayOfMonth: parseInt(rec.dayOfMonth),
    lastBilledDate: rec.lastBilledDate || null
  };
  state.recurring.push(newRec);
  saveState();
  return newRec;
}

export function deleteRecurring(id) {
  const state = getState();
  const idx = state.recurring.findIndex(r => r.id === id);
  if (idx !== -1) {
    state.recurring.splice(idx, 1);
    saveState();
    return true;
  }
  return false;
}

export function updateRecurringLastBilled(id, dateString) {
  const state = getState();
  const rec = state.recurring.find(r => r.id === id);
  if (rec) {
    rec.lastBilledDate = dateString;
    saveState();
  }
}

// --- ACHIEVEMENTS CRUD ---
export function getAchievements() {
  return getState().achievements;
}

export function unlockAchievement(id) {
  const state = getState();
  const ach = state.achievements.find(a => a.id === id);
  if (ach && !ach.unlocked) {
    ach.unlocked = true;
    ach.unlockedDate = new Date().toISOString().split('T')[0];
    saveState();
    return ach; // Return unlocked achievement for toast notification
  }
  return null;
}

// --- SETTINGS CRUD ---
export function getSettings() {
  return getState().settings;
}

export function updateSettings(newSettings) {
  const state = getState();
  state.settings = {
    ...state.settings,
    ...newSettings
  };
  saveState();
}

// --- BACKUP & RESTORE ---
export function exportBackup() {
  const state = getState();
  return JSON.stringify(state, null, 2);
}

export function restoreBackup(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    // Simple schema validation
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.transactions) && typeof parsed.budgets === 'object' && Array.isArray(parsed.goals)) {
      appState = parsed;
      saveState();
      return { success: true };
    } else {
      return { success: false, error: 'Invalid backup file schema structure.' };
    }
  } catch (error) {
    return { success: false, error: 'Failed to parse JSON content: ' + error.message };
  }
}

export function resetAllData() {
  localStorage.removeItem(STORAGE_KEY);
  appState = generateSampleData();
  saveState();
  return appState;
}
