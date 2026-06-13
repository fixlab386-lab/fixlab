import { escapeHtml } from '../../lib/printDocument'
import type { Prodotto } from '../features/prodotti/types'

export function buildProductPrintHtml(prodotto: Prodotto, modello: string): string {
  const prezzo = prodotto.prezzi.find(p => p.listinoId === 'privati')?.valore
  const giacenza = prodotto.magazzino?.giacenza ?? 0
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(modello)}</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;font-size:12px;margin:24px;color:#222}
h1{font-size:16px;margin:0 0 12px}
table{border-collapse:collapse;width:100%}
td{padding:4px 8px;border-bottom:1px solid #ddd;vertical-align:top}
td:first-child{font-weight:600;width:140px;color:#555}
</style></head><body>
<h1>${escapeHtml(modello)} — ${escapeHtml(prodotto.descrizione)}</h1>
<table>
<tr><td>Codice</td><td>${escapeHtml(prodotto.codProdotto)}</td></tr>
<tr><td>Tipologia</td><td>${escapeHtml(prodotto.tipologia)}</td></tr>
<tr><td>Categoria</td><td>${escapeHtml(prodotto.categoria)}${prodotto.sottocategoria ? ` » ${escapeHtml(prodotto.sottocategoria)}` : ''}</td></tr>
<tr><td>U.M.</td><td>${escapeHtml(prodotto.um)}</td></tr>
<tr><td>Prezzo listino Privati</td><td>${prezzo != null ? `€ ${prezzo.toFixed(2)}` : '—'}</td></tr>
<tr><td>Giacenza</td><td>${giacenza}</td></tr>
<tr><td>Produttore</td><td>${escapeHtml(prodotto.dettagli.produttore || '—')}</td></tr>
<tr><td>Fornitore</td><td>${escapeHtml(prodotto.dettagli.fornitore || '—')}</td></tr>
<tr><td>Cod. barre</td><td>${escapeHtml(prodotto.dettagli.codBarre || '—')}</td></tr>
</table>
</body></html>`
}
