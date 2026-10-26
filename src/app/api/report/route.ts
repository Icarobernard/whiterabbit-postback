import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/report
 *
 * Returns paginated postback logs + summary stats for the authenticated user.
 *
 * Query params:
 *   - platform: "hotmart" | "kiwify"
 *   - from: ISO date string
 *   - to: ISO date string
 *   - configId: string
 *   - page: number (default 1)
 *   - limit: number (default 20, max 100)
 *   - tokenValid: "true" | "false"
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const sp = request.nextUrl.searchParams

  const platform = sp.get('platform') ?? undefined
  const from = sp.get('from') ? new Date(sp.get('from')!) : undefined
  const to = sp.get('to') ? new Date(sp.get('to')!) : undefined
  const configId = sp.get('configId') ?? undefined
  const tokenValidParam = sp.get('tokenValid')
  const tokenValid =
    tokenValidParam === 'true' ? true : tokenValidParam === 'false' ? false : undefined
  const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20')))
  const skip = (page - 1) * limit

  const where = {
    userId,
    ...(platform ? { platform } : {}),
    ...(configId ? { webhookConfigId: configId } : {}),
    ...(tokenValid !== undefined ? { tokenValid } : {}),
    ...(from || to
      ? {
          receivedAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  }

  const [logs, total, stats] = await Promise.all([
    prisma.postbackLog.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      skip,
      take: limit,
      include: {
        config: { select: { label: true, isTest: true } },
      },
    }),
    prisma.postbackLog.count({ where }),
    prisma.postbackLog.aggregate({
      where: { ...where, tokenValid: true },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ])

  // Count by event type
  const byEvent = await prisma.postbackLog.groupBy({
    by: ['event'],
    where,
    _count: { id: true },
  })

  // Count by platform
  const byPlatform = await prisma.postbackLog.groupBy({
    by: ['platform'],
    where,
    _count: { id: true },
    _sum: { amount: true },
  })

  return NextResponse.json({
    data: logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    summary: {
      totalRevenue: stats._sum.amount ?? 0,
      totalLogs: stats._count.id,
      byEvent: byEvent.map((e) => ({ event: e.event, count: e._count.id })),
      byPlatform: byPlatform.map((p) => ({
        platform: p.platform,
        count: p._count.id,
        revenue: p._sum.amount ?? 0,
      })),
    },
  })
}
