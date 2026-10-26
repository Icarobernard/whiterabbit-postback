import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  platform: z.enum(['hotmart', 'kiwify']),
  label: z.string().min(1).max(100),
  secret: z.string().optional(),
  isTest: z.boolean().optional().default(false),
})

/**
 * GET /api/webhooks — list all webhook configs for the current user
 * POST /api/webhooks — create a new webhook config
 */

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const configs = await prisma.webhookConfig.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { postbacks: true } },
    },
  })

  return NextResponse.json(configs)
}

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

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const config = await prisma.webhookConfig.create({
    data: {
      userId: session.user.id,
      platform: parsed.data.platform,
      label: parsed.data.label,
      secret: parsed.data.secret ?? null,
      isTest: parsed.data.isTest,
    },
  })

  return NextResponse.json(config, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const config = await prisma.webhookConfig.findUnique({ where: { id } })
  if (!config || config.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.webhookConfig.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
