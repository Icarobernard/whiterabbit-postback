// Hotmart webhook payload parser
// Normalises a raw Hotmart postback into our standard PostbackLog fields

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseHotmart(payload: any) {
  const purchase = payload?.data?.purchase ?? {}
  const buyer = payload?.data?.buyer ?? {}
  const product = payload?.data?.product ?? {}

  return {
    event: payload?.event ?? 'UNKNOWN',
    buyerName: buyer?.name ?? null,
    buyerEmail: buyer?.email ?? null,
    productName: product?.name ?? null,
    amount: purchase?.price?.value ?? purchase?.full_price?.value ?? null,
    currency: purchase?.price?.currency_value ?? purchase?.full_price?.currency_value ?? 'BRL',
    status: purchase?.status ?? null,
    transactionId: purchase?.transaction ?? null,
  }
}
