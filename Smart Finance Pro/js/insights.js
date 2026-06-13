/**
 * Smart Finance Pro - Financial Insights Engine
 */

import { getTransactions, getBudgets } from './storage.js';
import { getBudgetStatus } from './budget.js';

/**
 * Generates dynamic financial insights based on user history.
 */
export function generateInsights() {
  const transactions = getTransactions();
  const budgets = getBudgets();
  
  if (transactions.length === 0) {
    return [
      {
        type: 'info',
        icon: 'info',
        title: 'Welcome to Smart Finance Pro!',
        text: 'Add your first transactions to generate customized financial insights.',
        recommendation: 'Get started by configuring your monthly budgets or entering income.'
      }
    ];
  }

  // Determine current and previous month keys
  const currentDate = new Date();
  const curYear = currentDate.getFullYear();
  const curMonth = currentDate.getMonth();

  const getMonthKey = (offset = 0) => {
    const d = new Date(curYear, curMonth - offset, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  };

  const currentMonthKey = getMonthKey(0);
  const previousMonthKey = getMonthKey(1);

  // Group by category and type for both months
  const currentMonthData = getMonthTotals(currentMonthKey);
  const previousMonthData = getMonthTotals(previousMonthKey);

  const insights = [];

  // 1. Savings Rate Insight & Trend
  const currentSavingsRate = currentMonthData.income > 0 
    ? ((currentMonthData.income - currentMonthData.expenses) / currentMonthData.income) * 100 
    : 0;

  const prevSavingsRate = previousMonthData.income > 0 
    ? ((previousMonthData.income - previousMonthData.expenses) / previousMonthData.income) * 100 
    : 0;

  insights.push({
    type: currentSavingsRate >= 30 ? 'success' : currentSavingsRate >= 10 ? 'info' : 'warning',
    icon: 'piggy-bank',
    title: 'Savings Performance',
    text: `Your savings rate is ${currentSavingsRate.toFixed(0)}% this month (saved ${formatAmount(currentMonthData.income - currentMonthData.expenses)} of ${formatAmount(currentMonthData.income)} income).`,
    recommendation: currentSavingsRate >= 30 
      ? 'Excellent savings rate! Consider allocating this surplus to your active Savings Goals or mutual fund investments.'
      : 'Try to aim for a savings rate of at least 20% by identifying minor discretionary expenses you can cut back.'
  });

  if (previousMonthData.income > 0 && currentMonthData.income > 0) {
    const rateDiff = currentSavingsRate - prevSavingsRate;
    if (rateDiff > 0) {
      insights.push({
        type: 'success',
        icon: 'trending-up',
        title: 'Savings Trend Improved',
        text: `Your savings rate improved by ${rateDiff.toFixed(0)}% compared to last month.`,
        recommendation: 'Keep maintaining this upward trajectory! Consistent savings compound quickly over time.'
      });
    } else if (rateDiff < 0) {
      insights.push({
        type: 'warning',
        icon: 'trending-down',
        title: 'Savings Trend Decreased',
        text: `Your savings rate dropped by ${Math.abs(rateDiff).toFixed(0)}% compared to last month.`,
        recommendation: 'Analyze your major expenses this month to see where the leak occurred. Re-adjust your category budgets if needed.'
      });
    }
  }

  // 2. Highest Spending Category
  if (currentMonthData.expenses > 0) {
    let highestCat = '';
    let highestAmt = 0;
    
    Object.keys(currentMonthData.categoryExpenses).forEach(cat => {
      if (currentMonthData.categoryExpenses[cat] > highestAmt) {
        highestAmt = currentMonthData.categoryExpenses[cat];
        highestCat = cat;
      }
    });

    if (highestCat) {
      const pctOfExpenses = (highestAmt / currentMonthData.expenses) * 100;
      const pctOfIncome = currentMonthData.income > 0 ? (highestAmt / currentMonthData.income) * 100 : 0;
      
      insights.push({
        type: pctOfExpenses > 35 ? 'warning' : 'info',
        icon: 'shopping-bag',
        title: `Top Expense: ${highestCat}`,
        text: `You spent ${pctOfExpenses.toFixed(0)}% of your expenses (${formatAmount(highestAmt)}) on ${highestCat} this month.`,
        recommendation: pctOfExpenses > 35 
          ? `Disproportionate spending on ${highestCat}! Try setting a strict budget limit on this category to free up capital.`
          : `Your spending on ${highestCat} is reasonable, but review if any minor items were unnecessary.`
      });

      // MoM category increase check
      const prevCatAmt = previousMonthData.categoryExpenses[highestCat] || 0;
      if (prevCatAmt > 0) {
        const catIncreasePct = ((highestAmt - prevCatAmt) / prevCatAmt) * 100;
        if (catIncreasePct > 15) {
          insights.push({
            type: 'warning',
            icon: 'alert-triangle',
            title: `Spike in ${highestCat}`,
            text: `${highestCat} expenses increased by ${catIncreasePct.toFixed(0)}% compared to last month.`,
            recommendation: `Investigate this sudden spike of ${formatAmount(highestAmt - prevCatAmt)} in ${highestCat}. Look for recurring fees or bulk purchases.`
          });
        }
      }
    }
  }

  // 3. Budget Compliance
  const budgetStatus = getBudgetStatus(currentMonthKey);
  const exceededCategories = budgetStatus.categories.filter(c => c.spent > c.limit && c.limit > 0);
  const warningCategories = budgetStatus.categories.filter(c => c.status === 'warning');

  if (exceededCategories.length > 0) {
    insights.push({
      type: 'danger',
      icon: 'alert-circle',
      title: 'Budget Limits Breached',
      text: `You breached budgets in ${exceededCategories.length} categor${exceededCategories.length > 1 ? 'ies' : 'y'}: ${exceededCategories.map(c => c.category).join(', ')}.`,
      recommendation: 'Exceeding budgets directly hurts your net savings. Lock these categories down for the rest of the month and review next month\'s limits.'
    });
  } else if (warningCategories.length > 0) {
    insights.push({
      type: 'warning',
      icon: 'alert-triangle',
      title: 'Approaching Budget Limits',
      text: `You are nearing limits in ${warningCategories.length} categories: ${warningCategories.map(c => c.category).join(', ')}.`,
      recommendation: 'You have consumed over 80% of these budgets. Freeze non-essential shopping in these areas immediately.'
    });
  } else if (budgetStatus.totalBudget > 0 && budgetStatus.totalSpent < budgetStatus.totalBudget) {
    insights.push({
      type: 'success',
      icon: 'check-circle',
      title: 'Budgets on Track',
      text: 'Great work! You are currently within budget limits across all monitored categories.',
      recommendation: 'Maintain this discipline. Any leftover budget goes directly into your net savings!'
    });
  }

  return insights;
}

// Helpers
function getMonthTotals(yearMonth) {
  const transactions = getTransactions();
  let income = 0;
  let expenses = 0;
  const categoryExpenses = {};

  transactions.forEach(tx => {
    if (tx.date.startsWith(yearMonth)) {
      if (tx.type === 'income') {
        income += tx.amount;
      } else {
        expenses += tx.amount;
        categoryExpenses[tx.category] = (categoryExpenses[tx.category] || 0) + tx.amount;
      }
    }
  });

  return { income, expenses, categoryExpenses };
}

function formatAmount(amt) {
  // Simple format indicator since currency formatting is handled in storage.js
  return `₹${Math.abs(amt).toLocaleString()}`;
}
