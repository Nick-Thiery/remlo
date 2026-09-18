// Starter categories shown until a budget is saved. Their ids are fixed so
// spending logged against a preset before the first save still matches it on
// the next load (or after a language change). budget_entries.category_id is a
// UUID column, so the ids are valid UUIDs.
export const PRESET_CATEGORIES = [
  { id: 'b0d9e7a1-5e7f-4c1a-9a01-000000000001', nameKey: 'budget.presetRent',      amount: 400 },
  { id: 'b0d9e7a1-5e7f-4c1a-9a01-000000000002', nameKey: 'budget.presetGroceries', amount: 200 },
  { id: 'b0d9e7a1-5e7f-4c1a-9a01-000000000003', nameKey: 'budget.presetTransport', amount: 80 },
  { id: 'b0d9e7a1-5e7f-4c1a-9a01-000000000004', nameKey: 'budget.presetPhone',     amount: 20 },
]

export function presetExpenses(t) {
  return PRESET_CATEGORIES.map(({ id, nameKey, amount }) => ({ id, name: t(nameKey), amount }))
}
