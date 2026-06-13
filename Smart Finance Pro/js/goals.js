/**
 * Smart Finance Pro - Savings Goals Engine
 */

import { getGoals, getTransactions } from './storage.js';

/**
 * Calculates historical monthly savings rate of the user.
 * Returns the average net savings per month over the last 3 months.
 */
export function getAverageMonthlySavings() {
  const transactions = getTransactions();
  if (transactions.length === 0) return 0;

  // Group net income/expenses by month
  const monthlyTotals = {};
  
  transactions.forEach(tx => {
    const monthKey = tx.date.substring(0, 7); // "YYYY-MM"
    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = { income: 0, expense: 0 };
    }
    if (tx.type === 'income') {
      monthlyTotals[monthKey].income += tx.amount;
    } else {
      monthlyTotals[monthKey].expense += tx.amount;
    }
  });

  const months = Object.keys(monthlyTotals);
  if (months.length === 0) return 0;

  let totalSavings = 0;
  months.forEach(m => {
    totalSavings += (monthlyTotals[m].income - monthlyTotals[m].expense);
  });

  return Math.max(0, totalSavings / months.length);
}

/**
 * Enriches savings goals with progress, remaining target, and deadline estimations.
 */
export function getEnrichedGoals() {
  const goals = getGoals();
  const avgMonthlySavings = getAverageMonthlySavings();
  const currentDate = new Date();

  return goals.map(goal => {
    const target = goal.target;
    const current = goal.current;
    const remaining = Math.max(0, target - current);
    const percent = target > 0 ? (current / target) * 100 : 0;
    
    // Days remaining to deadline
    const deadlineDate = new Date(goal.deadline);
    const msDiff = deadlineDate.getTime() - currentDate.getTime();
    const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    
    let status = 'On Track'; // Completed | Overdue | On Track | Behind | Undefined (no savings rate)
    let estimateMsg = '';

    if (current >= target) {
      status = 'Completed';
      estimateMsg = 'Goal achieved!';
    } else if (daysRemaining <= 0) {
      status = 'Overdue';
      estimateMsg = `Overdue by ${Math.abs(daysRemaining)} days. Need ${remaining} more.`;
    } else {
      // If we have some savings rate
      if (avgMonthlySavings > 0) {
        const monthsNeeded = remaining / avgMonthlySavings;
        const daysNeeded = monthsNeeded * 30.4;
        
        if (daysNeeded <= daysRemaining) {
          status = 'On Track';
          estimateMsg = `On Track. Estimate completion in ${Math.ceil(daysNeeded)} days (requires ~${Math.ceil(remaining)} savings).`;
        } else {
          status = 'Behind';
          const requiredSavingsPerMonth = remaining / (daysRemaining / 30.4);
          estimateMsg = `Behind. Requires saving ${requiredSavingsPerMonth.toFixed(0)}/mo to meet deadline. Current avg is ${avgMonthlySavings.toFixed(0)}/mo.`;
        }
      } else {
        status = 'Behind';
        estimateMsg = 'Set aside savings monthly to make progress.';
      }
    }

    return {
      ...goal,
      remaining,
      percent,
      daysRemaining,
      status,
      estimateMsg
    };
  });
}
