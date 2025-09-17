// petits helpers pour (dé)sérialiser numeric PG et calculer les totaux
export type ItemInput = {
  description: string
  quantity: number
  unitPrice: number
  sortOrder?: number
}

export function toCents(n: number): number {
  return Math.round(n * 100)
}
export function fromCents(c: number): number {
  return Math.round(c) / 100
}
export function parseNumeric(s: string | number | null | undefined): number {
  if (s == null) return 0
  if (typeof s === 'number') return s
  return parseFloat(s)
}

export function computeTotals(
  items: ItemInput[],
  taxRatePct = 0
): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0)
  const tax = subtotal * (taxRatePct / 100)
  const total = subtotal + tax
  return { subtotal, tax, total }
}
