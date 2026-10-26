// Kiwify webhook payload parser
// Normalises a raw Kiwify postback into our standard PostbackLog fields

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseKiwify(payload: any) {
  const customer = payload?.Customer ?? {}
  const product = payload?.Product ?? {}
  const commissions = payload?.Commissions ?? {}

  // Kiwify stores amount in cents as string
  const rawAmount = commissions?.charge_amount ?? null
  const amount = rawAmount ? parseFloat(rawAmount) / 100 : null

  // Map Kiwify order_status to a readable event name
  const statusToEvent: Record<string, string> = {
    paid: 'compra_aprovada',
    waiting_payment: 'aguardando_pagamento',
    refunded: 'reembolso',
    chargedback: 'chargeback',
    abandoned: 'abandono',
  }
  const rawStatus = payload?.order_status ?? 'unknown'
  const event = statusToEvent[rawStatus] ?? rawStatus

  return {
    event,
    buyerName: customer?.full_name ?? null,
    buyerEmail: customer?.email ?? null,
    productName: product?.product_name ?? null,
    amount,
    currency: 'BRL',
    status: rawStatus,
    transactionId: payload?.order_id ?? null,
  }
}
