'use client'

import { useState, useEffect } from 'react'

interface WebhookConfig {
  id: string
  platform: string
  label: string
  secret: string | null
  isTest: boolean
  createdAt: string
  _count: { postbacks: number }
}

function getWebhookUrl(configId: string, platform: string) {
  const base =
    typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
  return `${base}/api/postback/${platform}?configId=${configId}`
}

export default function ConfigPage() {
  const [configs, setConfigs] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; msg: string }>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState<string | null>(null)

  // Form state
  const [formPlatform, setFormPlatform] = useState<'hotmart' | 'kiwify'>('hotmart')
  const [formLabel, setFormLabel] = useState('')
  const [formSecret, setFormSecret] = useState('')
  const [formIsTest, setFormIsTest] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  async function loadConfigs() {
    setLoading(true)
    const res = await fetch('/api/webhooks')
    if (res.ok) {
      setConfigs(await res.json())
    }
    setLoading(false)
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  async function handleCreateConfig(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    const res = await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: formPlatform,
        label: formLabel,
        secret: formSecret || undefined,
        isTest: formIsTest,
      }),
    })

    setFormLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setFormError(data.error?.message ?? 'Erro ao criar configuração.')
      return
    }

    setFormLabel('')
    setFormSecret('')
    setFormIsTest(false)
    setShowForm(false)
    await loadConfigs()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta configuração e todos os postbacks associados?')) return
    setDeleting(id)
    await fetch(`/api/webhooks?id=${id}`, { method: 'DELETE' })
    setDeleting(null)
    await loadConfigs()
  }

  async function handleTest(config: WebhookConfig) {
    setTestLoading(config.id)
    const res = await fetch('/api/test-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configId: config.id, platform: config.platform }),
    })
    const data = await res.json()
    setTestResult((prev) => ({
      ...prev,
      [config.id]: {
        success: data.success,
        msg: data.success
          ? `✅ Postback de teste enviado com sucesso! tokenValid: ${data.result?.tokenValid}`
          : `❌ Erro: ${data.error ?? 'Falha no envio'}`,
      },
    }))
    setTestLoading(null)
  }

  async function copyUrl(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">⚙️ Configurações de Webhook</h1>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowForm(!showForm)}
          id="btn-add-config"
        >
          {showForm ? '✕ Cancelar' : '+ Novo Webhook'}
        </button>
      </div>

      <div className="dashboard-content">
        {/* Create form */}
        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ marginBottom: 20 }}>Novo Webhook</div>

            {formError && (
              <div className="alert alert-error">{formError}</div>
            )}

            <form onSubmit={handleCreateConfig}>
              <div className="form-group">
                <label className="form-label" htmlFor="cfg-platform">Plataforma</label>
                <select
                  id="cfg-platform"
                  className="form-select"
                  value={formPlatform}
                  onChange={(e) => setFormPlatform(e.target.value as 'hotmart' | 'kiwify')}
                >
                  <option value="hotmart">🔥 Hotmart</option>
                  <option value="kiwify">🥝 Kiwify</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cfg-label">Nome / Label</label>
                <input
                  id="cfg-label"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Curso de Python - Produção"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cfg-secret">
                  Secret / Token
                  {formPlatform === 'hotmart' && ' (hottok)'}
                  {formPlatform === 'kiwify' && ' (x-kiwify-token)'}
                  <span className="form-hint" style={{ marginLeft: 8 }}>— Opcional</span>
                </label>
                <input
                  id="cfg-secret"
                  type="text"
                  className="form-input"
                  placeholder="Deixe vazio para não validar o token"
                  value={formSecret}
                  onChange={(e) => setFormSecret(e.target.value)}
                />
                <span className="form-hint">
                  {formPlatform === 'hotmart'
                    ? 'Configure o mesmo hottok no painel da Hotmart em Ferramentas → Webhooks'
                    : 'Configure o mesmo token no painel da Kiwify em Integrações → Webhooks'}
                </span>
              </div>

              <div className="toggle-group">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={formIsTest}
                    onChange={(e) => setFormIsTest(e.target.checked)}
                    id="cfg-istest"
                  />
                  <span className="toggle-slider" />
                </label>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Ambiente de Teste (sandbox)
                </span>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? <span className="spinner" /> : null}
                  {formLoading ? 'Criando...' : 'Criar webhook'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Configs list */}
        {loading ? (
          <div className="empty-state">
            <div style={{ color: 'var(--text-muted)' }}>Carregando...</div>
          </div>
        ) : configs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔗</div>
            <div className="empty-state-title">Nenhum webhook configurado</div>
            <p>Clique em &quot;Novo Webhook&quot; para começar.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {configs.map((config) => {
              const webhookUrl = getWebhookUrl(config.id, config.platform)
              const result = testResult[config.id]

              return (
                <div key={config.id} className="webhook-card">
                  <div className="webhook-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div className="webhook-card-title">{config.label}</div>
                      <span className={`platform-pill platform-${config.platform}`}>
                        {config.platform === 'hotmart' ? '🔥' : '🥝'} {config.platform}
                      </span>
                      {config.isTest && (
                        <span className="badge badge-warning">TESTE</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleTest(config)}
                        disabled={testLoading === config.id}
                        id={`btn-test-${config.id}`}
                      >
                        {testLoading === config.id ? <span className="spinner" /> : '▶'}
                        {testLoading === config.id ? 'Testando...' : 'Testar'}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(config.id)}
                        disabled={deleting === config.id}
                        id={`btn-delete-${config.id}`}
                      >
                        {deleting === config.id ? <span className="spinner" /> : '🗑'}
                      </button>
                    </div>
                  </div>

                  {/* Test result */}
                  {result && (
                    <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`}>
                      {result.msg}
                    </div>
                  )}

                  {/* Webhook URL */}
                  <div>
                    <div className="form-label" style={{ marginBottom: 6 }}>URL do Webhook</div>
                    <div className="url-box">
                      <span className="url-text" title={webhookUrl}>{webhookUrl}</span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => copyUrl(webhookUrl, config.id)}
                        id={`btn-copy-${config.id}`}
                      >
                        {copiedId === config.id ? '✓ Copiado' : '📋 Copiar'}
                      </button>
                    </div>
                  </div>

                  {/* Secret info */}
                  {config.secret && (
                    <div className="form-hint">
                      🔐 Token configurado:{' '}
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                        {config.secret.slice(0, 4)}{'•'.repeat(Math.max(0, config.secret.length - 4))}
                      </span>
                    </div>
                  )}

                  <div className="webhook-card-meta">
                    {config._count.postbacks} postback(s) recebido(s) ·{' '}
                    Criado em {new Date(config.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Instructions */}
        <div className="card" style={{ marginTop: 32 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>📖 Como usar</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <p><strong style={{ color: 'var(--text-primary)' }}>1.</strong> Crie um webhook acima e copie a URL gerada.</p>
            <p><strong style={{ color: 'var(--text-primary)' }}>2.</strong> Cole a URL no painel da Hotmart (Ferramentas → Webhooks) ou Kiwify (Integrações → Webhooks).</p>
            <p><strong style={{ color: 'var(--text-primary)' }}>3.</strong> Configure o mesmo token secret nos dois lados (plataforma + aqui).</p>
            <p><strong style={{ color: 'var(--text-primary)' }}>4.</strong> Clique em <strong>Testar</strong> para enviar um postback simulado e verificar se está funcionando.</p>
            <p><strong style={{ color: 'var(--text-primary)' }}>5.</strong> Veja os logs na aba <strong>Postbacks</strong>.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
