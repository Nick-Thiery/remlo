// Reducing-balance loan maths shared by the Loans page. Rates are % per month.

export function calcRemaining(principal, monthlyRatePct, monthlyPayment, paymentsMade) {
  if (paymentsMade === 0) return principal
  const r = monthlyRatePct / 100
  if (r === 0) return Math.max(principal - monthlyPayment * paymentsMade, 0)
  const balance =
    principal * Math.pow(1 + r, paymentsMade) -
    monthlyPayment * ((Math.pow(1 + r, paymentsMade) - 1) / r)
  return Math.max(balance, 0)
}

export function totalPayoffMonths(principal, monthlyRatePct, monthlyPayment) {
  const r = monthlyRatePct / 100
  if (monthlyPayment <= 0) return Infinity
  if (r === 0) return Math.ceil(principal / monthlyPayment)
  if (monthlyPayment <= principal * r) return Infinity
  return Math.ceil(-Math.log(1 - (r * principal) / monthlyPayment) / Math.log(1 + r))
}

// Interest actually paid: every payment is full except the last, which only
// clears the balance left after the one before it plus that month's interest.
export function totalInterest(principal, monthlyRatePct, monthlyPayment) {
  const months = totalPayoffMonths(principal, monthlyRatePct, monthlyPayment)
  if (months === Infinity) return null
  const beforeLast = calcRemaining(principal, monthlyRatePct, monthlyPayment, months - 1)
  const lastPayment = beforeLast * (1 + monthlyRatePct / 100)
  return Math.max(monthlyPayment * (months - 1) + lastPayment - principal, 0)
}
