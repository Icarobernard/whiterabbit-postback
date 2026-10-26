'use client'

import { useState, useEffect, useCallback } from 'react'

interface PostbackLog {
  id: string
  platform: string
  event: string
  buyerName: string | null
  buyerEmail: string | null
  productName: string | null
  amount: number | null
  currency: string | null
  status: string | null
  transactionId: string | null
  tokenValid: boolean
  receivedAt: string
  rawPayload: string
  config: { label: string; isTest: boolean }
}

interface ReportData {
  data: PostbackLog[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  summary: {
    totalRevenue: number
    totalLogs: number
    byEvent: Array<{ event: string; count: number }>
    byPlatform: Array<{ platform: string; count: number; revenue: number }>
  }
}

function formatCurrency(val: number | null, currency = 'BRL') {
  if (val === null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val)
}

function formatDate(str: string) {
  return new Date(str).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className={`platform-pill platform-${platform}`}>
      {platform === 'hotmart' ? '🔥' : '🥝'} {platform}
    </span>
  )
}

function EventBadge({ event }: { event: string }) {
  const approved = ['PURCHASE_APPROVED', 'compra_aprovada', 'paid']
  const refunded = ['PURCHASE_REFUNDED', 'reembolso', 'refunded']
  const waiting = ['PURCHASE_DELAYED', 'aguardando_pagamento', 'waiting_payment']

  let cls = 'badge-muted'
  if (approved.some(e => event.includes(e) || e.includes(event))) cls = 'badge-success'
  else if (refunded.some(e => event.includes(e) || e.includes(event))) cls = 'badge-danger'
  else if (waiting.some(e => event.includes(e) || e.includes(event))) cls = 'badge-warning'

  return <span className={`badge ${cls}`}>{event}</span>
}

export default function DashboardPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<PostbackLog | null>(null)

  // Filters
  const [platform, setPlatform] = useState('')
  const [page, setPage] = useState(1)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (platform) params.set('platform', platform)
    params.set('page', String(page))
    params.set('limit', '20')

    const res = await fetch(`/api/report?${params}`)
    if (res.ok) {
      const data = await res.json()
      setReport(data)
    }
    setLoading(false)
  }, [platform, page])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const summary = report?.summary

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">📊 Postbacks Recebidos</h1>
        <button onClick={fetchReport} className="btn btn-secondary btn-sm" id="btn-refresh">
          ↻ Atualizar
        </button>
      </div>

      <div className="dashboard-content">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total de Logs</div>
            <div className="stat-value purple">{summary?.totalLogs ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Receita Total</div>
            <div className="stat-value green">
              {formatCurrency(summary?.totalRevenue ?? 0)}
            </div>
          </div>
          {summary?.byPlatform.map((p) => (
            <div key={p.platform} className="stat-card">
              <div className="stat-label">
                {p.platform === 'hotmart' ? '🔥' : '🥝'} {p.platform}
              </div>
              <div className="stat-value">{p.count}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {formatCurrency(p.revenue)}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={platform}
            onChange={(e) => { setPlatform(e.target.value); setPage(1) }}
            id="filter-platform"
          >
            <option value="">Todas as plataformas</option>
            <option value="hotmart">🔥 Hotmart</option>
            <option value="kiwify">🥝 Kiwify</option>
          </select>

          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {report?.pagination.total ?? 0} registros
          </span>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          {loading ? (
            <div className="empty-state">
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Carregando...</div>
            </div>
          ) : report?.data.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">Nenhum postback ainda</div>
              <p>Configure um webhook e envie uma venda de teste.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Plataforma</th>
                  <th>Evento</th>
                  <th>Comprador</th>
                  <th>Produto</th>
                  <th>Valor</th>
                  <th>Token</th>
                  <th>Recebido em</th>
                </tr>
              </thead>
              <tbody>
                {report?.data.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    title="Clique para ver o payload completo"
                  >
                    <td><PlatformBadge platform={log.platform} /></td>
                    <td><EventBadge event={log.event} /></td>
                    <td className="primary">
                      <div>{log.buyerName ?? '—'}</div>
                      {log.buyerEmail && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.buyerEmail}</div>
                      )}
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.productName ?? '—'}
                      </div>
                      {log.config?.isTest && <span className="badge badge-warning" style={{ marginTop: 2 }}>TESTE</span>}
                    </td>
                    <td className="primary">{formatCurrency(log.amount, log.currency ?? 'BRL')}</td>
                    <td>
                      <span className={`token-dot ${log.tokenValid ? 'valid' : 'invalid'}`} />
                      {' '}
                      <span style={{ fontSize: 11, color: log.tokenValid ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {log.tokenValid ? 'ok' : 'inválido'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(log.receivedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {report && report.pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, report.pagination.totalPages) }, (_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  className={`page-btn ${page === pageNum ? 'active' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              className="page-btn"
              onClick={() => setPage(p => Math.min(report.pagination.totalPages, p + 1))}
              disabled={page === report.pagination.totalPages}
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Payload Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Payload Completo</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <PlatformBadge platform={selectedLog.platform} />
                  <EventBadge event={selectedLog.event} />
                  {selectedLog.transactionId && (
                    <span className="chip">#{selectedLog.transactionId}</span>
                  )}
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedLog(null)}>×</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Comprador</div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                {selectedLog.buyerName} · {selectedLog.buyerEmail}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Valor</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-success)' }}>
                {formatCurrency(selectedLog.amount, selectedLog.currency ?? 'BRL')}
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Raw Payload (JSON)</div>
            <div className="code-block">
              {JSON.stringify(JSON.parse(selectedLog.rawPayload || '{}'), null, 2)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
