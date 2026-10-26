import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const testSchema = z.object({
  configId: z.string(),
  platform: z.enum(['hotmart', 'kiwify']),
})

// Sample Hotmart payload
const HOTMART_SAMPLE = {
  id: 'test-' + Date.now(),
  creation_date: Date.now(),
  event: 'PURCHASE_APPROVED',
  version: '2.0.0',
  data: {
    product: {
      id: 1,
      ucode: 'test-product-ucode',
      name: 'Produto Teste WhiteRabbit',
    },
    buyer: {
      email: 'comprador@exemplo.com',
      name: 'João Comprador Teste',
      first_name: 'João',
      last_name: 'Comprador',
    },
    commissions: [
      { value: 150, source: 'PRODUCER', currency_value: 'BRL' },
    ],
    purchase: {
      approved_date: Date.now(),
      full_price: { value: 197, currency_value: 'BRL' },
      price: { value: 197, currency_value: 'BRL' },
      status: 'APPROVED',
      transaction: 'HP_TEST_' + Date.now(),
      payment: { installments_number: 1, type: 'CREDIT_CARD' },
    },
  },
}

// Sample Kiwify payload
const KIWIFY_SAMPLE = {
  order_id: 'kiwify-test-' + Date.now(),
  order_ref: 'TEST01',
  order_status: 'paid',
  payment_method: 'credit_card',
  installments: 1,
  created_at: new Date().toISOString(),
  Product: {
    product_id: 'test-product-id',
    product_name: 'Produto Teste WhiteRabbit',
  },
  Customer: {
    full_name: 'Maria Compradora Teste',
    email: 'compradora@exemplo.com',
    mobile: '+5511999999999',
    CPF: '00000000000',
    ip: '127.0.0.1',
  },
  Commissions: {
    charge_amount: '19700',
    product_base_price: '19700',
    kiwify_fee: '1576',
    my_commission: '18124',
    funds_status: 'available',
  },
}

/**
 * POST /api/test-webhook
 *
 * Fires a simulated postback to the app's own /api/postback/[platform] endpoint.
 * Used by the dashboard config page "Test" button.
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = testSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { configId, platform } = parsed.data

  // Verify ownership
  const config = await prisma.webhookConfig.findUnique({ where: { id: configId } })
  if (!config || config.userId !== session.user.id) {
    return NextResponse.json({ error: 'Config not found' }, { status: 404 })
  }

  const samplePayload = platform === 'hotmart' ? HOTMART_SAMPLE : KIWIFY_SAMPLE

  // Build the internal URL
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const url = new URL(`/api/postback/${platform}`, baseUrl)
  url.searchParams.set('configId', configId)

  // Add token if configured
  if (config.secret) {
    if (platform === 'hotmart') {
      url.searchParams.set('hottok', config.secret)
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (platform === 'kiwify' && config.secret) {
    headers['x-kiwify-token'] = config.secret
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(samplePayload),
    })

    const result = await response.json()
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      result,
      payload: samplePayload,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to send test webhook', detail: String(err) },
      { status: 500 }
    )
  }
}
