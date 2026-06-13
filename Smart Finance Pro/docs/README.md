# Smart Finance Pro

Smart Finance Pro is a production-grade, portfolio-ready Personal Finance Management Web Application built entirely using **HTML5, CSS3, and Vanilla JavaScript (ES6 Modules)**. It operates fully client-side, persisting state through browser `LocalStorage`, and does not rely on any external backend framework.

With its sleek glassmorphic layout, cohesive light/dark styles, automated recurring systems, and print-ready PDF financial reports, Smart Finance Pro replicates a professional SaaS tool designed to empower users with financial health analysis.

---

## Key Features

### 📈 Executive Dashboard
- **Financial KPIs**: Instantly shows available Balance, Monthly Income, Monthly Expenses, and Monthly Savings Rate.
- **Financial Health Score**: Employs a circular radial indicator evaluating monthly stability out of 100 points.
- **KPI Sub-footers**: Adapts color layouts dynamically depending on budget consumption limits.
- **Overview Feeds**: Showcases recent logs, active goals progress, and upcoming payments in the next 30 days.

### 💸 Transaction Management
- **Full CRUD Operations**: Create, view, edit, and delete transactions.
- **Modular Filtering**: Isolates records by text search query, specific category, or relative dates (This Month, Last 30 Days, Last 3 Months).
- **Flexible Sorting**: Allows sorting data tables chronologically (Date) or quantitatively (Amount) in both ascending and descending order.

### 📊 Category Budgets
- **Monthly Spending Limits**: Sets caps on Food, Bills, Shopping, Travel, Entertainment, Healthcare, Education, Investments, or Other.
- **Automated Threshold Triggers**: Notifies users with warning toasts at 80% and danger notifications when spending exceeds 100% of limits.
- **Progress BARS**: Visually shifts card outlines and bar fills between Safe (Green), Warning (Yellow), and Breached (Red) states.

### 🎯 Savings Milestones
- **Goal Deadlines**: Creates target pools with dates.
- **Smart Estimation Engine**: Calculates progress ratios and estimates how many days it will take to complete the goal based on historical net savings averages.

### 🔄 Automation & Subscriptions
- **Recurring Schedules**: Registers utilities, rent, gym plans, and Netflix fees.
- **Auto-Billing Handler**: Automatically posts expense entries on their due dates on load and flags a billing toast.

### 🧮 Loan EMI Solver
- **Interactive Calculators**: Computes monthly installments, total interest, and total payable amounts.
- **Visual Splits**: Dynamic doughnut charts separating principal vs interest, alongside a detailed 12-month amortization table.

### 📅 Financial Calendar
- **Timeline Overview**: Dynamic 42-cell monthly grid populated with calendar labels representing income dates, expenses, recurring dues, and goal deadlines.
- **Proximity Sidebar**: Focuses on immediate due bills.

### 🏆 Achievements System
- **Milestones**: Gamifies financial progress by automatically scanning and unlocking badges (e.g. "Saved ₹10,000", "First Goal Milestone Complete", "Disciplined Budgeter") with full-screen animated unlock modal popups.

### 📝 Monthly Statements (PDF Export)
- **Executive Summaries**: Compiles monthly net performance metrics, top spending tables, and advisory details.
- **Print-ready Exports**: Leverages `html2pdf.js` to convert printable templates into executive PDF documents.

### ⚙️ Settings & Recovery
- **Multi-Currency**: Supports INR (₹), USD ($), and EUR (€) formatting.
- **Preferences Theme**: Instant toggle for dark/light themes.
- **Security Backups**: Downloads current profile configuration as JSON and imports backups with schema validations.

---

## Technology Stack

* **Structure**: HTML5
* **Styling**: CSS3 (Vanilla CSS variables, Flexbox, Grid, backdrop filters)
* **Logic**: Vanilla JavaScript (ES6 Modules)
* **Libraries (CDN)**:
  * **Chart.js (v4.x)**: Handles analytical dashboard charts and calculators.
  * **html2pdf.js (v0.10.1)**: Generates high-fidelity PDF documents.
  * **Lucide Icons**: Renders SVG outline vector indicators.

---

## Folder Structure

```text
SmartFinancePro/
│
├── index.html                   - Main SPA Structure
│
├── css/
│   ├── style.css                - Base System CSS Styles
│   └── dashboard.css            - Components & Pages Layout
│
├── js/
│   ├── app.js                   - Application Coordinator
│   ├── storage.js               - Storage & State Engine
│   ├── analytics.js             - Canvas Visualizations
│   ├── budget.js                - Monthly Budget Handlers
│   ├── goals.js                 - Savings Calculations
│   ├── emi.js                   - Installment Formulas
│   ├── insights.js              - Data Trend Engines
│   └── settings.js              - Themes & JSON Backups
│
├── data/
│   └── sampleData.js            - Initial Generator Mock Data
│
└── docs/
    ├── README.md                - User Documentation
    └── SYSTEM_DESIGN.md         - System Architecture Document
```

---

## Getting Started & Setup Instructions

Since SmartFinancePro is a pure client-side application with zero build requirements, setting it up is simple:

1. **Download / Clone the directory**: Save the folder containing all assets locally.
2. **Launch a local server**:
   - For ES6 modules to load correctly, the browser security model requires the files to be served via `http://` rather than `file://`.
   - Run a simple static server from the project folder:
     ```bash
     # Using Python (built-in on most OS)
     python -m http.server 8000
     
     # Or using Node (if installed)
     npx serve
     ```
3. **Open the browser**: Navigate to `http://localhost:8000`. The application will initialize, load default currency settings, and pre-populate your profile with 3 months of mock data!

---

## Future Enhancements
- **Dynamic Currency API**: Integrate a public exchange rate API to convert base balances relative to active currencies.
- **OCR Receipt Scanning**: Implement client-side OCR libraries to parse values from receipts and automatically populate the transaction modal.
- **Multiple Profiles**: Allow switching between personal, business, or family finance profile stores in LocalStorage.
