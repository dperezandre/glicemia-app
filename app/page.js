'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [activeTab, setActiveTab]       = useState('form')
  const [formData, setFormData]         = useState({ data: '', horario: '', glicemia: '', insulina: '', observacoes: '' })
  const [records, setRecords]           = useState([])
  const [loading, setLoading]           = useState(false)
  const [syncingSheet, setSyncingSheet] = useState(false)
  const [message, setMessage]           = useState({ type: '', text: '' })
  const [debugInfo, setDebugInfo]       = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyabYjafAP2CW1Byin-m8VZU2vMj5SM6bXekQyb_f6xoozBfcTpxIie2PrlkvzTAoZU/exec'
  // ─── Ao montar: tenta carregar da planilha, fallback localStorage ─────────
  useEffect(() => { loadFromSheet() }, [])

  const loadFromSheet = async () => {
    setSyncingSheet(true)
    try {
      const res  = await fetch(SHEET_URL + '?action=read', { method: 'GET' })
      const json = await res.json()

      if (json.success && Array.isArray(json.records)) {
        const normalized = json.records.map(record => ({
          ...record,
          data: formatDate(record.data),
          horario: formatTime(record.horario)
        }))
        const sorted = sortByDateTime(normalized)
        setRecords(sorted)
        saveLocal(sorted)
        return
      }
      loadLocal()
    } catch (_) {
      loadLocal()
    } finally {
      setSyncingSheet(false)
    }
  }

  const loadLocal = () => {
    try {
      const stored = localStorage.getItem('glicemia_records')
      if (stored) {
        const recs = JSON.parse(stored).map(record => ({
          ...record,
          data: formatDate(record.data),
          horario: formatTime(record.horario)
        }))
        setRecords(sortByDateTime(recs))
      }
    } catch (_) {}
  }

  const saveLocal = (recs) => {
    try { localStorage.setItem('glicemia_records', JSON.stringify(recs)) } catch (_) {}
  }

  // ─── Ordenação por timestamp real (MAIS RECENTE PRIMEIRO) ────────────────
  const toTs = (data, horario) => {
    const [d, m, a] = data.split('/')
    const [h, min]  = horario.split(':')
    return new Date(a, m - 1, d, h, min).getTime()
  }

  const formatDate = (value) => {
    const dateText = String(value ?? '').trim()
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateText)) return dateText

    const date = new Date(dateText)
    if (Number.isNaN(date.getTime())) return dateText

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo'
    }).format(date)
  }

  const formatTime = (value) => {
    const timeText = String(value ?? '').trim()
    const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})/)
    if (timeMatch) return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`

    const date = new Date(timeText)
    if (Number.isNaN(date.getTime())) return timeText

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).format(date)
  }

  const sortByDateTime = (arr) => {
    return [...arr].sort((a, b) => {
      const tsA = toTs(a.data, a.horario)
      const tsB = toTs(b.data, b.horario)
      return tsB - tsA // MAIS RECENTE PRIMEIRO (descendente)
    })
  }

  // ─── Máscaras ─────────────────────────────────────────────────────────────
  const handleDataChange = (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 8)
    if (v.length >= 5) v = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4)
    else if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2)
    setFormData(p => ({ ...p, data: v }))
  }

  const handleHorarioChange = (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (v.length >= 3) v = v.slice(0,2) + ':' + v.slice(2)
    setFormData(p => ({ ...p, horario: v }))
  }

  // ─── Validações ───────────────────────────────────────────────────────────
  const isValidDate = (s) => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return false
    const [, d, m] = s.match(/^(\d{2})\/(\d{2})\/\d{4}$/)
    const di = +d, mi = +m
    if (mi < 1 || mi > 12) return false
    if (di < 1 || di > 31) return false
    if (mi === 2 && di > 29) return false
    if ([4,6,9,11].includes(mi) && di > 30) return false
    return true
  }

  const isValidTime = (s) => {
    if (!/^\d{2}:\d{2}$/.test(s)) return false
    const [, h, m] = s.match(/^(\d{2}):(\d{2})$/)
    return +h <= 23 && +m <= 59
  }

  const validate = () => {
    const { data, horario, glicemia, insulina } = formData
    if (!data.trim())    return 'Data é obrigatória'
    if (!horario.trim()) return 'Horário é obrigatório'
    if (!glicemia.trim() && !insulina.trim()) return 'Preencha Glicemia OU Insulina'
    if (!isValidDate(data))   return 'Data inválida (ex: 25/07/2026)'
    if (!isValidTime(horario)) return 'Horário inválido (ex: 14:30)'
    if (records.some(r => r.data === data && r.horario === horario))
      return 'Já existe um registro nesta data e horário'
    if (glicemia.trim()) {
      const g = parseFloat(glicemia)
      if (isNaN(g) || g < 0 || g > 500) return 'Glicemia deve ser entre 0 e 500'
    }
    if (insulina.trim() && isNaN(parseFloat(insulina))) return 'Insulina deve ser um número'
    return null
  }

  // ─── Salvar ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setMessage({ type: 'error', text: err }); return }

    setLoading(true)
    setMessage({ type: '', text: '' })
    setDebugInfo('Salvando...')

    // MELHORIA: Concatena "Dose de Insulina: " antes do valor se insulina preenchida
    const insulinaFormatted = formData.insulina.trim() 
      ? `Dose de Insulina: ${formData.insulina}`
      : '-'

    const payload = {
      action:      'add',
      data:        formData.data,
      horario:     formData.horario,
      glicemia:    formData.glicemia || null,
      insulina:    insulinaFormatted,  // Agora com prefixo
      observacoes: formData.observacoes
    }

    // Salva local primeiro (UI instantânea)
    const newRec  = { ...payload, id: Date.now(), synced: false }
    const merged  = sortByDateTime([newRec, ...records])
    setRecords(merged)
    saveLocal(merged)

    // Envia para planilha
    try {
      await fetch(SHEET_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      })
      // Depois do POST, re-lê da planilha para garantir ordem real
      await loadFromSheet()
      setMessage({ type: 'success', text: '✓ Salvo e sincronizado com a planilha!' })
      setDebugInfo('✓ Planilha atualizada e reordenada')
    } catch (_) {
      setMessage({ type: 'warning', text: '⚠️ Salvo localmente. Planilha pode estar lenta.' })
      setDebugInfo('⚠️ Salvo só no dispositivo')
    }

    setFormData({ data: '', horario: '', glicemia: '', insulina: '', observacoes: '' })
    setTimeout(() => { setMessage({ type: '', text: '' }); setDebugInfo('') }, 4000)
    setLoading(false)
  }

  // ─── Deletar ─────────────────────────────────────────────────────────────
  const handleDelete = async (id, recData) => {
    setLoading(true)
    const updated = records.filter(r => r.id !== id)
    setRecords(updated)
    saveLocal(updated)

    try {
      await fetch(SHEET_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'delete', data: recData.data, horario: recData.horario })
      })
      // Re-lê planilha para confirmar deleção
      await loadFromSheet()
      setMessage({ type: 'success', text: '✓ Registro deletado da planilha!' })
    } catch (_) {
      setMessage({ type: 'warning', text: '✓ Deletado localmente. Sincronize depois.' })
    }

    setDeleteConfirm(null)
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    setLoading(false)
  }

  // ─── Cores / labels ───────────────────────────────────────────────────────
  const glicemiaColor = (v) => {
    if (!v) return '#999'
    const n = parseFloat(v)
    if (n < 80)  return '#3498DB'
    if (n > 150) return '#E74C3C'
    return '#27AE60'
  }

  const glicemiaLabel = (v) => {
    if (!v) return 'Não medido'
    const n = parseFloat(v)
    if (n < 80)  return 'Baixo'
    if (n > 150) return 'Alto'
    return 'Médio'
  }

  // ─── Resumo ───────────────────────────────────────────────────────────────
  const summary = (() => {
    const comG  = records.filter(r => r.glicemia !== null && r.glicemia !== '')
    const total = records.length
    const med   = comG.length
    if (med === 0) return { total, med, normal: 0, alta: 0, baixa: 0, semG: total, normalPct: 0, altaPct: 0, baixaPct: 0 }
    const normal = comG.filter(r => { const n = +r.glicemia; return n >= 80 && n <= 150 }).length
    const alta   = comG.filter(r => +r.glicemia > 150).length
    const baixa  = comG.filter(r => +r.glicemia < 80).length
    const pct    = (n) => Math.round((n / med) * 100)
    return { total, med, normal, alta, baixa, semG: total - med, normalPct: pct(normal), altaPct: pct(alta), baixaPct: pct(baixa) }
  })()

  // ─── UI helpers ───────────────────────────────────────────────────────────
  const TAB  = { padding: '12px 24px', fontSize: '15px', fontWeight: 500, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }
  const INPUT = { width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #DDD', borderRadius: '6px', boxSizing: 'border-box', color: '#333' }
  const BTN  = (bg, dis) => ({ padding: '12px 32px', fontSize: '16px', fontWeight: 600, background: bg, color: 'white', border: 'none', borderRadius: '6px', cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.6 : 1 })

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5' }}>
      {/* Header */}
      <header style={{ background: '#1F4E78', color: 'white', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '28px', fontWeight: 600 }}>📊 Monitor de Glicemia</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>Registre e acompanhe seus níveis de glicose</p>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #DDD', overflowX: 'auto' }}>
          {[['form','Novo Registro'],['dashboard',`Histórico (${records.length})`],['resumo','Resumo']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              ...TAB,
              background: activeTab === id ? '#1F4E78' : 'transparent',
              color:      activeTab === id ? 'white'   : '#333',
              borderBottom: activeTab === id ? '3px solid #1F4E78' : 'none'
            }}>{label}</button>
          ))}
        </div>

        {/* ── FORM ── */}
        {activeTab === 'form' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Data (DD/MM/YYYY) *</label>
                  <input style={INPUT} placeholder="Preencha: 25/07/2026" value={formData.data}
                    onChange={handleDataChange} maxLength="10" disabled={loading} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Horário (HH:MM) *</label>
                  <input style={INPUT} placeholder="Preencha: 14:30" value={formData.horario}
                    onChange={handleHorarioChange} maxLength="5" disabled={loading} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Glicemia (mg/dL)</label>
                  <input style={INPUT} name="glicemia" placeholder="Preencha: 150 (opcional)"
                    value={formData.glicemia} onChange={e => setFormData(p => ({...p, glicemia: e.target.value}))} disabled={loading} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Dose de Insulina (UI)</label>
                  <input style={INPUT} name="insulina" placeholder="Preencha: 7 (opcional)"
                    value={formData.insulina} onChange={e => setFormData(p => ({...p, insulina: e.target.value}))} disabled={loading} />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Observações</label>
                <textarea style={{ ...INPUT, minHeight: '90px', fontFamily: 'inherit', resize: 'vertical' }}
                  placeholder="Preencha com observações (opcional)..." value={formData.observacoes}
                  onChange={e => setFormData(p => ({...p, observacoes: e.target.value}))} disabled={loading} />
              </div>

              {message.text && (
                <div style={{
                  padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', fontWeight: 500,
                  background: message.type === 'success' ? '#D4EDDA' : message.type === 'warning' ? '#FFF3CD' : '#F8D7DA',
                  color: message.type === 'success' ? '#155724' : message.type === 'warning' ? '#856404' : '#721C24',
                  border: `1px solid ${message.type === 'success' ? '#C3E6CB' : message.type === 'warning' ? '#FFE69C' : '#F5C6CB'}`
                }}>{message.text}</div>
              )}

              {debugInfo && (
                <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', background: '#E3F2FD', color: '#0D47A1', border: '1px solid #BBDEFB', fontFamily: 'monospace' }}>
                  {debugInfo}
                </div>
              )}

              <button type="submit" disabled={loading} style={BTN('#1F4E78', loading)}>
                {loading ? 'Salvando...' : '💾 Salvar Registro'}
              </button>
            </form>

            <div style={{ marginTop: '16px', padding: '12px 16px', background: '#E8F5E9', borderRadius: '6px', border: '1px solid #A5D6A7', fontSize: '13px', color: '#2E7D32' }}>
              * Campos obrigatórios: Data e Horário | Preencha Glicemia <strong>ou</strong> Insulina (ou ambos)
            </div>
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        {activeTab === 'dashboard' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>Histórico (mais recentes primeiro)</h2>
              <button onClick={loadFromSheet} disabled={syncingSheet} style={BTN('#3498DB', syncingSheet)}>
                {syncingSheet ? '⏳ Atualizando...' : '🔄 Atualizar da Planilha'}
              </button>
            </div>

            {message.text && (
              <div style={{ padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', fontWeight: 500,
                background: message.type === 'success' ? '#D4EDDA' : message.type === 'warning' ? '#FFF3CD' : '#F8D7DA',
                color: message.type === 'success' ? '#155724' : message.type === 'warning' ? '#856404' : '#721C24',
                border: `1px solid ${message.type === 'success' ? '#C3E6CB' : message.type === 'warning' ? '#FFE69C' : '#F5C6CB'}`
              }}>{message.text}</div>
            )}

            {records.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>Nenhum registro encontrado</p>
                <p style={{ fontSize: '14px' }}>Adicione um registro ou clique "Atualizar da Planilha"</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #1F4E78' }}>
                      {['Data','Horário','Glicemia','Insulina','Observações','Status','Ação'].map(h => (
                        <th key={h} style={{ padding: '12px', textAlign: h === 'Ação' ? 'center' : 'left', fontWeight: 600, color: '#1F4E78', fontSize: '14px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec, i) => {
                      // MELHORIA: Formatar data e horário para exibição
                      const dataFormatada = formatDate(rec.data)
                      const horarioFormatado = formatTime(rec.horario)

                      return (
                        <tr key={rec.id} style={{ borderBottom: '1px solid #DDD', background: i % 2 === 0 ? '#F9F9F9' : 'white' }}>
                          <td style={{ padding: '12px', fontSize: '14px' }}>{dataFormatada}</td>
                          <td style={{ padding: '12px', fontSize: '14px' }}>{horarioFormatado}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ background: glicemiaColor(rec.glicemia), color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 500 }}>
                              {rec.glicemia ? `${rec.glicemia} (${glicemiaLabel(rec.glicemia)})` : '—'}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px' }}>
                            {rec.insulina === '-' ? '—' : rec.insulina}
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>{rec.observacoes || '—'}</td>
                          <td style={{ padding: '12px', fontSize: '12px', fontWeight: 500, color: rec.synced ? '#27AE60' : '#F39C12' }}>
                            {rec.synced ? '✓ Sincronizado' : '⏳ Local'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {deleteConfirm === rec.id ? (
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button onClick={() => handleDelete(rec.id, { data: rec.data, horario: rec.horario })} disabled={loading}
                                  style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, background: '#E74C3C', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                                  Sim
                                </button>
                                <button onClick={() => setDeleteConfirm(null)}
                                  style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, background: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(rec.id)} disabled={loading}
                                style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 600, background: '#E74C3C', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                                🗑️ Deletar
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── RESUMO ── */}
        {activeTab === 'resumo' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>📊 Resumo (dados da planilha)</h2>
              <button onClick={loadFromSheet} disabled={syncingSheet} style={BTN('#3498DB', syncingSheet)}>
                {syncingSheet ? '⏳ Atualizando...' : '🔄 Atualizar da Planilha'}
              </button>
            </div>

            {records.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                <p>Nenhum registro. Adicione dados ou clique "Atualizar da Planilha".</p>
              </div>
            ) : (
              <div>
                {/* Cards totais */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                  {[
                    { label: 'Total de Registros', val: summary.total,  color: '#3498DB', bg: '#E3F2FD', border: '#3498DB' },
                    { label: 'Com Glicemia',        val: summary.med,    color: '#27AE60', bg: '#E8F5E9', border: '#27AE60' },
                    { label: 'Apenas Insulina',     val: summary.semG,   color: '#999',    bg: '#F5F5F5', border: '#999' }
                  ].map(c => (
                    <div key={c.label} style={{ background: c.bg, border: `2px solid ${c.border}`, borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: c.color, fontWeight: 500 }}>{c.label}</p>
                      <p style={{ margin: 0, fontSize: '32px', fontWeight: 600, color: c.color }}>{c.val}</p>
                    </div>
                  ))}
                </div>

                {/* Distribuição */}
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#333' }}>Distribuição por status</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  {[
                    { label: 'Médio', range: '80–150 mg/dL', val: summary.normal, pct: summary.normalPct, color: '#27AE60', bg: '#E8F8F5', border: '#A9DFBF', dot: '#27AE60' },
                    { label: 'Alto',  range: '>150 mg/dL',   val: summary.alta,   pct: summary.altaPct,   color: '#E74C3C', bg: '#FADBD8', border: '#F5B7B1', dot: '#E74C3C' },
                    { label: 'Baixo', range: '<80 mg/dL',    val: summary.baixa,  pct: summary.baixaPct,  color: '#3498DB', bg: '#E3F2FD', border: '#90CAF9', dot: '#3498DB' }
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: s.dot }} />
                        <span style={{ fontWeight: 600, color: s.color, fontSize: '15px' }}>{s.label}</span>
                      </div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '26px', fontWeight: 600, color: s.color }}>{s.val}</p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#666' }}>{s.pct}% das medições</p>
                      <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#999' }}>({s.range})</p>
                      <div style={{ background: 'white', borderRadius: '4px', overflow: 'hidden', height: '7px' }}>
                        <div style={{ width: `${s.pct}%`, height: '100%', background: s.dot, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* MELHORIA: Tabela formatada com data/hora DD/MM/YYYY HH:MM */}
                <div style={{ marginTop: '28px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#333' }}>Histórico detalhado</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #1F4E78', background: '#F0F0F0' }}>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#1F4E78' }}>Data</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#1F4E78' }}>Horário</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#1F4E78' }}>Glicemia</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#1F4E78' }}>Insulina</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#1F4E78' }}>Observações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((rec, idx) => (
                          <tr key={rec.id} style={{ borderBottom: '1px solid #EEE', background: idx % 2 === 0 ? '#F9F9F9' : 'white' }}>
                            <td style={{ padding: '10px' }}>{formatDate(rec.data)}</td>
                            <td style={{ padding: '10px' }}>{formatTime(rec.horario)}</td>
                            <td style={{ padding: '10px' }}>
                              {rec.glicemia ? (
                                <span style={{ 
                                  background: glicemiaColor(rec.glicemia), 
                                  color: 'white', 
                                  padding: '2px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '12px', 
                                  fontWeight: 500 
                                }}>
                                  {rec.glicemia}
                                </span>
                              ) : '—'}
                            </td>
                            <td style={{ padding: '10px' }}>{rec.insulina === '-' ? '—' : rec.insulina}</td>
                            <td style={{ padding: '10px', color: '#666' }}>{rec.observacoes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ marginTop: '24px', padding: '14px 16px', background: '#E3F2FD', border: '1px solid #BBDEFB', borderRadius: '8px', fontSize: '13px', color: '#0D47A1' }}>
                  <strong>ℹ️</strong> Os dados acima refletem a planilha em tempo real. Use "Atualizar da Planilha" para sincronizar.
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px', marginTop: '40px', borderTop: '1px solid #DDD' }}>
        Desenvolvido com ❤️ | Sincronizado com Google Sheets
      </footer>
    </div>
  )
}
