import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseHotmart } from '@/lib/parsers/hotmart'
import { parseKiwify } from '@/lib/parsers/kiwify'

/**
 * POST /api/postback/[platform]?configId=xxx
 *
 * Receives a webhook postback from Hotmart or Kiwify.
 * Validates the token against the stored WebhookConfig secret.
 * Stores the raw payload + normalised fields in PostbackLog.
 *
 * Hotmart sends `hottok` as a query parameter.
 * Kiwify sends an optional `x-kiwify-token` header.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params
  const searchParams = request.nextUrl.searchParams
  const configId = searchParams.get('configId')

  if (!configId) {
    return NextResponse.json({ error: 'configId is required' }, { status: 400 })
  }

  if (platform !== 'hotmart' && platform !== 'kiwify') {
    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
  }

  // Load webhook config
  const config = await prisma.webhookConfig.findUnique({
    where: { id: configId },
  })

  if (!config) {
    return NextResponse.json({ error: 'Config not found' }, { status: 404 })
  }

  // Token validation
  let tokenValid = true
  if (config.secret) {
    if (platform === 'hotmart') {
      const hottok = searchParams.get('hottok')
      tokenValid = hottok === config.secret
    } else if (platform === 'kiwify') {
      const kiwifyToken = request.headers.get('x-kiwify-token')
      tokenValid = kiwifyToken === config.secret
    }
  }

  // Parse payload
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Normalise payload by platform
  const parsed = platform === 'hotmart' ? parseHotmart(body) : parseKiwify(body)

  // Store in DB
  await prisma.postbackLog.create({
    data: {
      userId: config.userId,
      webhookConfigId: config.id,
      platform,
      event: parsed.event,
      rawPayload: JSON.stringify(body),
      buyerName: parsed.buyerName,
      buyerEmail: parsed.buyerEmail,
      productName: parsed.productName,
      amount: parsed.amount,
      currency: parsed.currency,
      status: parsed.status,
      transactionId: parsed.transactionId,
      tokenValid,
    },
  })

  return NextResponse.json({ received: true, tokenValid }, { status: 200 })
}
