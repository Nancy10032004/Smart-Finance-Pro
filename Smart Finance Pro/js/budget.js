/**
 * Smart Finance Pro - Budget Calculations & Checks
 */

import { getTransactions, getBudgets } from './storage.js';

/**
 * Gets spending breakdown by category for a specific month (format: YYYY-MM)
 */
export function getCategorySpendingForMonth(yearMonth) {
  const transactions = getTransactions();
  const spending = {};

  transactions.forEach(tx => {
    if (tx.type === 'expense' && tx.date.startsWith(yearMonth)) {
      spending[tx.category] = (spending[tx.category] || 0) + tx.amount;
    }
  });

  return spending;
}

/**
 * Summarizes budget status for a given month (format: YYYY-MM)
 */
export function getBudgetStatus(yearMonth) {
  const budgets = getBudgets();
  const spending = getCategorySpendingForMonth(yearMonth);
  
  let totalBudget = 0;
  let totalSpent = 0;
  const categoriesList = [];

  // Loop through all defined budgets
  Object.keys(budgets).forEach(category => {
    const limit = budgets[category];
    const spent = spending[category] || 0;
    const remaining = limit - spent;
    const percent = limit > 0 ? (spent / limit) * 100 : 0;
    
    let status = 'safe'; // safe | warning | exceeded
    if (percent >= 100) {
      status = 'exceeded';
    } else if (percent >= 80) {
      status = 'warning';
    }

    totalBudget += limit;
    totalSpent += spent;

    categoriesList.push({
      category,
      limit,
      spent,
      remaining,
      percent,
      status
    });
  });

  // Check any categories that have spending but no budget set
  Object.keys(spending).forEach(category => {
    if (budgets[category] === undefined) {
      const spent = spending[category];
      totalSpent += spent;
      categoriesList.push({
        category,
        limit: 0,
        spent,
        remaining: -spent,
        percent: 100, // essentially exceeded
        status: 'exceeded'
      });
    }
  });

  const totalRemaining = totalBudget - totalSpent;
  const totalPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  let totalStatus = 'safe';
  if (totalPercent >= 100) {
    totalStatus = 'exceeded';
  } else if (totalPercent >= 80) {
    totalStatus = 'warning';
  }

  return {
    totalBudget,
    totalSpent,
    totalRemaining,
    totalPercent,
    totalStatus,
    categories: categoriesList
  };
}

/**
 * Checks if a recent transaction would cross the 80% or 100% budget threshold.
 * Returns an alert status object if a threshold was crossed.
 */
export function checkBudgetAlerts(category, yearMonth) {
  const budgets = getBudgets();
  const limit = budgets[category];
  if (!limit) return null;

  const spending = getCategorySpendingForMonth(yearMonth);
  const spent = spending[category] || 0;
  const percent = (spent / limit) * 100;

  if (percent >= 100) {
    return {
      type: 'danger',
      message: `Budget Exceeded! You have spent ${percent.toFixed(0)}% of your budget for ${category}.`
    };
  } else if (percent >= 80) {
    return {
      type: 'warning',
      message: `Budget Warning! You have used ${percent.toFixed(0)}% of your budget for ${category}.`
    };
  }
  return null;
}
