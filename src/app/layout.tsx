import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WhiteRabbit — Postback Receiver',
  description: 'Receba e monitore webhooks de vendas do Hotmart e Kiwify em tempo real.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
