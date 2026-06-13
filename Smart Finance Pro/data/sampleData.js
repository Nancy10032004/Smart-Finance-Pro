/**
 * Smart Finance Pro - Sample Data Generator
 * Generates 3 months of realistic transaction history relative to the current date.
 */

export function generateSampleData() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Helper to construct ISO dates relative to current date
  const getDateOffset = (monthsAgo, day) => {
    const d = new Date(year, month - monthsAgo, day);
    // Format as YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const sampleTransactions = [
    // --- MONTH 2 AGO (approx. 2 months prior) ---
    {
      id: "tx-m2-01",
      type: "income",
      category: "Salary",
      amount: 95000,
      date: getDateOffset(2, 1),
      description: "Monthly Tech Salary"
    },
    {
      id: "tx-m2-02",
      type: "income",
      category: "Freelancing",
      amount: 18000,
      date: getDateOffset(2, 5),
      description: "UI Design Project Payment"
    },
    {
      id: "tx-m2-03",
      type: "expense",
      category: "Bills",
      amount: 15000,
      date: getDateOffset(2, 2),
      description: "Apartment Rent Payment"
    },
    {
      id: "tx-m2-04",
      type: "expense",
      category: "Food",
      amount: 4500,
      date: getDateOffset(2, 4),
      description: "Weekly Grocery Restock"
    },
    {
      id: "tx-m2-05",
      type: "expense",
      category: "Bills",
      amount: 1200,
      date: getDateOffset(2, 5),
      description: "High-speed Internet Bill"
    },
    {
      id: "tx-m2-06",
      type: "expense",
      category: "Shopping",
      amount: 6800,
      date: getDateOffset(2, 8),
      description: "Running Shoes & Activewear"
    },
    {
      id: "tx-m2-07",
      type: "expense",
      category: "Entertainment",
      amount: 1999,
      date: getDateOffset(2, 12),
      description: "Concert Ticket"
    },
    {
      id: "tx-m2-08",
      type: "expense",
      category: "Food",
      amount: 2500,
      date: getDateOffset(2, 15),
      description: "Fine Dining Weekend"
    },
    {
      id: "tx-m2-09",
      type: "expense",
      category: "Healthcare",
      amount: 1500,
      date: getDateOffset(2, 18),
      description: "Dental Clean-up"
    },
    {
      id: "tx-m2-10",
      type: "expense",
      category: "Bills",
      amount: 3200,
      date: getDateOffset(2, 20),
      description: "Electricity Bill"
    },
    {
      id: "tx-m2-11",
      type: "expense",
      category: "Travel",
      amount: 5400,
      date: getDateOffset(2, 22),
      description: "Weekend Fuel & Tolls"
    },
    {
      id: "tx-m2-12",
      type: "expense",
      category: "Investment",
      amount: 15000,
      date: getDateOffset(2, 25),
      description: "Mutual Fund SIP"
    },
    {
      id: "tx-m2-13",
      type: "expense",
      category: "Education",
      amount: 4000,
      date: getDateOffset(2, 27),
      description: "Online Course Subscription"
    },

    // --- MONTH 1 AGO (approx. 1 month prior) ---
    {
      id: "tx-m1-01",
      type: "income",
      category: "Salary",
      amount: 95000,
      date: getDateOffset(1, 1),
      description: "Monthly Tech Salary"
    },
    {
      id: "tx-m1-02",
      type: "income",
      category: "Freelancing",
      amount: 22500,
      date: getDateOffset(1, 7),
      description: "Mobile App Consulting"
    },
    {
      id: "tx-m1-03",
      type: "expense",
      category: "Bills",
      amount: 15000,
      date: getDateOffset(1, 2),
      description: "Apartment Rent Payment"
    },
    {
      id: "tx-m1-04",
      type: "expense",
      category: "Food",
      amount: 5100,
      date: getDateOffset(1, 4),
      description: "Weekly Grocery & Veggies"
    },
    {
      id: "tx-m1-05",
      type: "expense",
      category: "Bills",
      amount: 1200,
      date: getDateOffset(1, 5),
      description: "High-speed Internet Bill"
    },
    {
      id: "tx-m1-06",
      type: "expense",
      category: "Travel",
      amount: 2800,
      date: getDateOffset(1, 9),
      description: "Weekly Commute Fuel"
    },
    {
      id: "tx-m1-07",
      type: "expense",
      category: "Shopping",
      amount: 12000,
      date: getDateOffset(1, 12),
      description: "Widescreen Monitor for Desk"
    },
    {
      id: "tx-m1-08",
      type: "expense",
      category: "Food",
      amount: 3400,
      date: getDateOffset(1, 14),
      description: "Dineout with Team"
    },
    {
      id: "tx-m1-09",
      type: "expense",
      category: "Bills",
      amount: 2900,
      date: getDateOffset(1, 20),
      description: "Electricity Bill"
    },
    {
      id: "tx-m1-10",
      type: "expense",
      category: "Investment",
      amount: 20000,
      date: getDateOffset(1, 25),
      description: "Mutual Fund SIP + Stocks"
    },
    {
      id: "tx-m1-11",
      type: "expense",
      category: "Entertainment",
      amount: 1500,
      date: getDateOffset(1, 28),
      description: "Movie tickets & Snacks"
    },

    // --- CURRENT MONTH (June 2026, or current relative) ---
    {
      id: "tx-c-01",
      type: "income",
      category: "Salary",
      amount: 95000,
      date: getDateOffset(0, 1),
      description: "Monthly Tech Salary"
    },
    {
      id: "tx-c-02",
      type: "expense",
      category: "Bills",
      amount: 15000,
      date: getDateOffset(0, 2),
      description: "Apartment Rent Payment"
    },
    {
      id: "tx-c-03",
      type: "expense",
      category: "Food",
      amount: 4800,
      date: getDateOffset(0, 3),
      description: "Grocery Supermarket"
    },
    {
      id: "tx-c-04",
      type: "expense",
      category: "Bills",
      amount: 1200,
      date: getDateOffset(0, 5),
      description: "High-speed Internet Bill"
    },
    {
      id: "tx-c-05",
      type: "expense",
      category: "Healthcare",
      amount: 2200,
      date: getDateOffset(0, 6),
      description: "Pharmacy Medicine Prescriptions"
    },
    {
      id: "tx-c-06",
      type: "expense",
      category: "Shopping",
      amount: 3500,
      date: getDateOffset(0, 7),
      description: "Summer Casual Wear"
    },
    {
      id: "tx-c-07",
      type: "expense",
      category: "Entertainment",
      amount: 899,
      date: getDateOffset(0, 8),
      description: "Streaming Service Subscription"
    }
  ];

  const sampleBudgets = {
    "Food": 15000,
    "Bills": 25000,
    "Shopping": 10000,
    "Travel": 8000,
    "Entertainment": 6000,
    "Healthcare": 5000,
    "Education": 8000,
    "Investment": 25000,
    "Other": 5000
  };

  const sampleGoals = [
    {
      id: "goal-01",
      name: "Emergency Fund",
      target: 150000,
      current: 85000,
      deadline: getDateOffset(-6, 30) // 6 months in future
    },
    {
      id: "goal-02",
      name: "Travel Fund (Japan)",
      target: 200000,
      current: 45000,
      deadline: getDateOffset(-10, 15) // 10 months in future
    },
    {
      id: "goal-03",
      name: "New Macbook Pro",
      target: 120000,
      current: 120000, // Completed Goal
      deadline: getDateOffset(1, 15) // 1 month ago
    }
  ];

  const sampleRecurring = [
    {
      id: "rec-01",
      name: "Apartment Rent",
      amount: 15000,
      category: "Bills",
      frequency: "monthly",
      dayOfMonth: 2,
      lastBilledDate: getDateOffset(0, 2)
    },
    {
      id: "rec-02",
      name: "High-speed Internet",
      amount: 1200,
      category: "Bills",
      frequency: "monthly",
      dayOfMonth: 5,
      lastBilledDate: getDateOffset(0, 5)
    },
    {
      id: "rec-03",
      name: "Gym Membership",
      amount: 2000,
      category: "Entertainment",
      frequency: "monthly",
      dayOfMonth: 10,
      lastBilledDate: getDateOffset(1, 10) // Unbilled this month (due on 10th)
    },
    {
      id: "rec-04",
      name: "Netflix & Spotify",
      amount: 899,
      category: "Entertainment",
      frequency: "monthly",
      dayOfMonth: 8,
      lastBilledDate: getDateOffset(0, 8)
    }
  ];

  const sampleAchievements = [
    {
      id: "ach-1",
      name: "Saved ₹10,000",
      description: "Accumulate more than ₹10,000 in savings",
      unlocked: true,
      unlockedDate: getDateOffset(2, 25)
    },
    {
      id: "ach-2",
      name: "Saved ₹50,000",
      description: "Accumulate more than ₹50,000 in savings",
      unlocked: true,
      unlockedDate: getDateOffset(1, 25)
    },
    {
      id: "ach-3",
      name: "First Milestone Achieved",
      description: "Completed your first savings goal",
      unlocked: true,
      unlockedDate: getDateOffset(1, 15) // Completed Macbook Pro goal
    },
    {
      id: "ach-4",
      name: "Disciplined Budgeter",
      description: "Stayed fully within monthly budgets",
      unlocked: true,
      unlockedDate: getDateOffset(1, 30)
    },
    {
      id: "ach-5",
      name: "Financial Fortitude",
      description: "Maintained a positive balance for 3 months",
      unlocked: true,
      unlockedDate: getDateOffset(0, 1)
    },
    {
      id: "ach-6",
      name: "Power Transactor",
      description: "Added 100 transactions to the application",
      unlocked: false,
      unlockedDate: null
    }
  ];

  return {
    transactions: sampleTransactions,
    budgets: sampleBudgets,
    goals: sampleGoals,
    recurring: sampleRecurring,
    achievements: sampleAchievements,
    settings: {
      theme: "dark",
      currency: "INR"
    }
  };
}
