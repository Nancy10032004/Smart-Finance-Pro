/**
 * Smart Finance Pro - EMI Calculator Engine
 */

/**
 * Calculates EMI details and generates an amortization schedule.
 * @param {number} principal - Loan amount (P)
 * @param {number} annualRate - Annual Interest Rate in percentage (R)
 * @param {number} tenureMonths - Loan Tenure in months (N)
 */
export function calculateEMI(principal, annualRate, tenureMonths) {
  const P = parseFloat(principal);
  const R = parseFloat(annualRate);
  const N = parseInt(tenureMonths);

  if (isNaN(P) || isNaN(R) || isNaN(N) || P <= 0 || R < 0 || N <= 0) {
    return {
      monthlyEMI: 0,
      totalInterest: 0,
      totalPayment: 0,
      principalPercent: 0,
      interestPercent: 0,
      schedule: []
    };
  }

  // Monthly Interest Rate
  const r = R / (12 * 100);

  let emi = 0;
  if (r === 0) {
    emi = P / N;
  } else {
    // Standard formula: P * r * (1+r)^N / ((1+r)^N - 1)
    emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
  }

  const totalPayment = emi * N;
  const totalInterest = totalPayment - P;

  const principalPercent = (P / totalPayment) * 100;
  const interestPercent = (totalInterest / totalPayment) * 100;

  // Generate Amortization Schedule
  const schedule = [];
  let balance = P;
  
  for (let month = 1; month <= N; month++) {
    const interestPaid = balance * r;
    const principalPaid = emi - interestPaid;
    balance = Math.max(0, balance - principalPaid);

    schedule.push({
      month,
      emi,
      principalPaid,
      interestPaid,
      remainingBalance: balance
    });
  }

  return {
    monthlyEMI: emi,
    totalInterest,
    totalPayment,
    principalPercent,
    interestPercent,
    schedule
  };
}
