import { supabase } from './supabase.js'
import safeStorage from './safeStorage.js'

export async function migrateGuestData(userId) {
  const errors = []

  // Savings goals + dated deposit entries
  try {
    const savings = JSON.parse(safeStorage.getItem('remlo_guest_savings') || '[]')
    const savingsEntries = JSON.parse(safeStorage.getItem('remlo_guest_savings_entries') || '[]')
    if (savings.length > 0) {
      let ok = true
      const goalIdMap = {}

      // Insert one at a time to capture each new row's id, so guest-mode
      // entries (which reference the old local goal id) can be remapped.
      for (const g of savings) {
        const { data, error } = await supabase
          .from('savings_goals')
          .insert({ user_id: userId, name: g.name, target_amount: g.target, current_amount: g.saved })
          .select('id')
          .single()
        if (error) { errors.push(error.message); ok = false; continue }
        goalIdMap[g.id] = data.id
      }

      const mappedEntries = savingsEntries
        .filter((e) => goalIdMap[e.goalId])
        .map((e) => ({
          user_id: userId,
          goal_id: goalIdMap[e.goalId],
          date: e.date,
          amount: e.amount,
          note: e.note || null,
        }))
      if (mappedEntries.length > 0) {
        const { error } = await supabase.from('savings_entries').insert(mappedEntries)
        if (error) { errors.push(error.message); ok = false }
      }

      if (ok) {
        safeStorage.removeItem('remlo_guest_savings')
        safeStorage.removeItem('remlo_guest_savings_entries')
      }
    }
  } catch (e) { errors.push(e.message) }

  // Budget
  try {
    const budget = JSON.parse(safeStorage.getItem('remlo_guest_budget') || 'null')
    if (budget) {
      const { error } = await supabase.from('budgets').upsert(
        { user_id: userId, income: budget.income, expenses: budget.expenses },
        { onConflict: 'user_id' }
      )
      if (error) errors.push(error.message)
      else safeStorage.removeItem('remlo_guest_budget')
    }
  } catch (e) { errors.push(e.message) }

  // Salary logs
  try {
    const salary = JSON.parse(safeStorage.getItem('remlo_guest_salary') || '[]')
    if (salary.length > 0) {
      const { error } = await supabase.from('salary_logs').insert(
        salary.map((p) => ({
          user_id: userId,
          date: p.date,
          amount: p.amount,
          employer: p.employer,
          notes: p.note || null,
        }))
      )
      if (error) errors.push(error.message)
      else safeStorage.removeItem('remlo_guest_salary')
    }
  } catch (e) { errors.push(e.message) }

  // Loans
  try {
    const loans = JSON.parse(safeStorage.getItem('remlo_guest_loans') || '[]')
    if (loans.length > 0) {
      const { error } = await supabase.from('loans').insert(
        loans.map((l) => ({
          user_id: userId,
          lender: l.lender,
          total_amount: l.principal,
          interest_rate: l.rate,
          monthly_payment: l.monthlyPayment,
          start_date: l.startDate,
        }))
      )
      if (error) errors.push(error.message)
      else safeStorage.removeItem('remlo_guest_loans')
    }
  } catch (e) { errors.push(e.message) }

  safeStorage.removeItem('remlo_guest')
  return errors
}
