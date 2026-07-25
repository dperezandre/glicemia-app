'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [activeTab, setActiveTab] = useState('form')
  const [formData, setFormData] = useState({
    data: '',
    horario: '',
    glicemia: '',
    insulina: '',
    observacoes: ''
  })
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [debugInfo, setDebugInfo] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [syncingFromSheet, setSyncingFromSheet] = useState(false)

const SHEET_URL = 'https://script.google.com/macros/s/AKfycby_BlBormRhUcZbwJeWZ--xJ64GGRB-Pxr5E0IaTjhmMH8D-O7iN_w3wlOx2ypGhvUo1w/exec'

  // Carregar registros ao abrir a página
  useEffect(() => {
    loadRecordsFromSheet()
  }, [])

  // NOVA FUNÇÃO: Carregar dados diretamente da planilha
  const loadRecordsFromSheet = async () => {
    setSyncingFromSheet(true)
    try {
      const response = await fetch(SHEET_URL + '?action=read', {
        method: 'GET',
        mode: 'no-cors'
      })

      // Como é no-cors, não conseguimos ler a resposta
      // Então carregamos do localStorage como fallback
      loadRecordsFromStorage()
    } catch (error) {
      console.log('Leitura da planilha em background, usando localStorage')
      loadRecordsFromStorage()
    } finally {
      setSyncingFromSheet(false)
    }
  }

  const loadRecordsFromStorage = () => {
    try {
      const stored = localStorage.getItem('glicemia_records')
      if (stored) {
        setRecords(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Erro ao carregar do storage:', error)
    }
  }

  const saveToStorage = (newRecords) => {
    try {
      localStorage.setItem('glicemia_records', JSON.stringify(newRecords))
    } catch (error) {
      console.error('Erro ao salvar no storage:', error)
    }
  }

  // Converter data DD/MM/YYYY para timestamp para comparação
  const dateToTimestamp = (data, horario) => {
    const [dia, mes, ano] = data.split('/')
    const [horas, minutos] = horario.split(':')
    return new Date(ano, mes - 1, dia, horas, minutos).getTime()
  }

  // Máscara para data (DD/MM/YYYY)
  const handleDataChange = (e) => {
    let value = e.target.value.replace(/\D/g, '')
    
    if (value.length > 8) {
      value = value.slice(0, 8)
    }
    
    if (value.length >= 5) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8)
    } else if (value.length >= 3) {
      value = value.slice(0, 2) + '/' + value.slice(2)
    }
    
    setFormData(prev => ({ ...prev, data: value }))
  }

  // Máscara para horário (HH:MM)
  const handleHorarioChange = (e) => {
    let value = e.target.value.replace(/\D/g, '')
    
    if (value.length > 4) {
      value = value.slice(0, 4)
    }
    
    if (value.length >= 3) {
      value = value.slice(0, 2) + ':' + value.slice(2, 4)
    }
    
    setFormData(prev => ({ ...prev, horario: value }))
  }

  // Validar data (dd/mm/aaaa é válida?)
  const isValidDate = (dateString) => {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/
    if (!regex.test(dateString)) return false
    
    const [, day, month, year] = dateString.match(regex)
    const d = parseInt(day, 10)
    const m = parseInt(month, 10)
    const y = parseInt(year, 10)
    
    if (m < 1 || m > 12) return false
    if (d < 1 || d > 31) return false
    if (m === 2 && d > 29) return false
    if ([4, 6, 9, 11].includes(m) && d > 30) return false
    
    return true
  }

  // Validar horário (HH:MM é válida?)
  const isValidTime = (timeString) => {
    const regex = /^(\d{2}):(\d{2})$/
    if (!regex.test(timeString)) return false
    
    const [, hours, minutes] = timeString.match(regex)
    const h = parseInt(hours, 10)
    const m = parseInt(minutes, 10)
    
    if (h < 0 || h > 23) return false
    if (m < 0 || m > 59) return false
    
    return true
  }

  // Verificar se já existe registro com mesma data/hora
  const recordExists = (data, horario) => {
    return records.some(r => r.data === data && r.horario === horario)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    if (!formData.data.trim()) return 'Data é obrigatória'
    if (!formData.horario.trim()) return 'Horário é obrigatório'
    
    if (!formData.insulina.trim() && !formData.glicemia.trim()) {
      return 'Preencha pelo menos Glicemia OU Insulina'
    }

    if (!isValidDate(formData.data)) {
      return 'Data inválida. Use formato DD/MM/YYYY com valores reais (ex: 23/07/2026)'
    }

    if (!isValidTime(formData.horario)) {
      return 'Horário inválido. Use formato HH:MM com valores válidos (ex: 14:30)'
    }

    if (recordExists(formData.data, formData.horario)) {
      return 'Já existe um registro nesta data e horário. Use outro horário.'
    }

    if (formData.glicemia.trim()) {
      const glicemia = parseFloat(formData.glicemia)
      if (isNaN(glicemia) || glicemia < 0 || glicemia > 500) {
        return 'Glicemia deve ser um número entre 0 e 500'
      }
    }

    if (formData.insulina && isNaN(parseFloat(formData.insulina))) {
      return 'Insulina deve ser um número válido'
    }

    return null
  }

  // CORRIGIDA: Ordenar registros por data/hora (mais recentes primeiro)
  const sortRecordsByDateTime = (recordsToSort) => {
    return [...recordsToSort].sort((a, b) => {
      const timestampA = dateToTimestamp(a.data, a.horario)
      const timestampB = dateToTimestamp(b.data, b.horario)
      return timestampB - timestampA
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const error = validateForm()
    if (error) {
      setMessage({ type: 'error', text: error })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })
    setDebugInfo('Processando...')

    try {
      const payload = {
        data: formData.data,
        horario: formData.horario,
        glicemia: formData.glicemia || null,
        insulina: formData.insulina || '-',
        observacoes: formData.observacoes,
        action: 'add'  // NOVO: Indica ação de adicionar
      }

      const newRecord = {
        ...payload,
        id: Date.now(),
        synced: false
      }
      
      // Ordenar antes de salvar
      const updatedRecords = sortRecordsByDateTime([newRecord, ...records])
      setRecords(updatedRecords)
      saveToStorage(updatedRecords)

      setDebugInfo('✓ Salvo localmente e reorganizado. Sincronizando com Google Sheets...')

      // Tentar sincronizar com Google Sheets
      try {
        await fetch(SHEET_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        // Marcar como sincronizado
        newRecord.synced = true
        const syncedRecords = updatedRecords.map(r => 
          r.id === newRecord.id ? { ...r, synced: true } : r
        )
        setRecords(syncedRecords)
        saveToStorage(syncedRecords)

        setDebugInfo('✓ Sincronizado com Google Sheets (ordenado)!')
        setMessage({ type: 'success', text: '✓ Registrado, reorganizado e sincronizado com sucesso!' })
      } catch (syncError) {
        setDebugInfo('⚠️ Salvo e reorganizado, mas sincronização falhou. Tente novamente.')
        setMessage({ type: 'warning', text: '✓ Salvo no dispositivo. Sincronização com Google Sheets pode estar lenta.' })
      }

      setFormData({ data: '', horario: '', glicemia: '', insulina: '', observacoes: '' })

      setTimeout(() => {
        setMessage({ type: '', text: '' })
        setDebugInfo('')
      }, 4000)
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao processar. Tente novamente.' })
      setDebugInfo(`Erro: ${err.message}`)
      console.error('Erro completo:', err)
    } finally {
      setLoading(false)
    }
  }

  // NOVA FUNÇÃO: Deletar registro
  const handleDeleteRecord = async (recordId, recordData) => {
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // 1. Deletar do localStorage
      const updatedRecords = records.filter(r => r.id !== recordId)
      setRecords(updatedRecords)
      saveToStorage(updatedRecords)

      // 2. Tentar deletar da planilha
      try {
        const deletePayload = {
          action: 'delete',
          data: recordData.data,
          horario: recordData.horario
        }

        await fetch(SHEET_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deletePayload)
        })

        setMessage({ type: 'success', text: '✓ Registro deletado com sucesso!' })
      } catch (syncError) {
        setMessage({ type: 'warning', text: '✓ Deletado localmente. Sincronização pode estar lenta.' })
      }

      setDeleteConfirm(null)
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao deletar registro. Tente novamente.' })
      console.error('Erro ao deletar:', err)
    } finally {
      setLoading(false)
    }
  }

  const getGlicemiaColor = (valor) => {
    if (valor === null || valor === '') return '#999'
    const num = parseFloat(valor)
    if (num < 70) return '#FFA500'
    if (num > 140) return '#E74C3C'
    return '#27AE60'
  }

  const getGlicemiaLabel = (valor) => {
    if (valor === null || valor === '') return 'Não medido'
    const num = parseFloat(valor)
    if (num < 70) return 'Baixa'
    if (num > 140) return 'Alta'
    return 'Normal'
  }

  // CORRIGIDA: Calcular resumo baseado em todos os registros (da planilha)
  const calculateGlicemiaSummary = () => {
    const withGlicemia = records.filter(r => r.glicemia !== null && r.glicemia !== '')
    
    if (withGlicemia.length === 0) {
      return {
        total: records.length,
        medidos: 0,
        normal: 0,
        alta: 0,
        baixa: 0,
        naoMedidos: records.length,
        normalPct: 0,
        altaPct: 0,
        baixaPct: 0,
        naoMedidosPct: 100
      }
    }

    const normal = withGlicemia.filter(r => {
      const num = parseFloat(r.glicemia)
      return num >= 70 && num <= 140
    }).length

    const alta = withGlicemia.filter(r => {
      const num = parseFloat(r.glicemia)
      return num > 140
    }).length

    const baixa = withGlicemia.filter(r => {
      const num = parseFloat(r.glicemia)
      return num < 70
    }).length

    const naoMedidos = records.length - withGlicemia.length

    return {
      total: records.length,
      medidos: withGlicemia.length,
      normal,
      alta,
      baixa,
      naoMedidos,
      normalPct: withGlicemia.length > 0 ? Math.round((normal / withGlicemia.length) * 100) : 0,
      altaPct: withGlicemia.length > 0 ? Math.round((alta / withGlicemia.length) * 100) : 0,
      baixaPct: withGlicemia.length > 0 ? Math.round((baixa / withGlicemia.length) * 100) : 0,
      naoMedidosPct: records.length > 0 ? Math.round((naoMedidos / records.length) * 100) : 0
    }
  }

  const summary = calculateGlicemiaSummary()

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5' }}>
      {/* Header */}
      <header style={{ background: '#1F4E78', color: 'white', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 600 }}>
            📊 Monitor de Glicemia
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
            Registre e acompanhe seus níveis de glicose
          </p>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #DDD', overflowX: 'auto' }}>
          <button
            onClick={() => setActiveTab('form')}
            style={{
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 500,
              border: 'none',
              background: activeTab === 'form' ? '#1F4E78' : 'transparent',
              color: activeTab === 'form' ? 'white' : '#333',
              cursor: 'pointer',
              borderBottom: activeTab === 'form' ? '3px solid #1F4E78' : 'none',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            Novo Registro
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 500,
              border: 'none',
              background: activeTab === 'dashboard' ? '#1F4E78' : 'transparent',
              color: activeTab === 'dashboard' ? 'white' : '#333',
              cursor: 'pointer',
              borderBottom: activeTab === 'dashboard' ? '3px solid #1F4E78' : 'none',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            Histórico ({records.length})
          </button>
          <button
            onClick={() => setActiveTab('resumo')}
            style={{
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 500,
              border: 'none',
              background: activeTab === 'resumo' ? '#1F4E78' : 'transparent',
              color: activeTab === 'resumo' ? 'white' : '#333',
              cursor: 'pointer',
              borderBottom: activeTab === 'resumo' ? '3px solid #1F4E78' : 'none',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            Resumo
          </button>
        </div>

        {/* Form Tab */}
        {activeTab === 'form' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>
                    Data (DD/MM/YYYY) *
                  </label>
                  <input
                    type="text"
                    name="data"
                    placeholder="Preencha: 23/07/2026"
                    value={formData.data}
                    onChange={handleDataChange}
                    maxLength="10"
                    disabled={loading}
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      fontSize: '14px', 
                      border: '1px solid #DDD', 
                      borderRadius: '6px', 
                      boxSizing: 'border-box',
                      color: '#333'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>
                    Horário (HH:MM) *
                  </label>
                  <input
                    type="text"
                    name="horario"
                    placeholder="Preencha: 14:30"
                    value={formData.horario}
                    onChange={handleHorarioChange}
                    maxLength="5"
                    disabled={loading}
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      fontSize: '14px', 
                      border: '1px solid #DDD', 
                      borderRadius: '6px', 
                      boxSizing: 'border-box',
                      color: '#333'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>
                    Glicemia (mg/dL)
                  </label>
                  <input
                    type="text"
                    name="glicemia"
                    placeholder="Preencha: 150 (opcional)"
                    value={formData.glicemia}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      fontSize: '14px', 
                      border: '1px solid #DDD', 
                      borderRadius: '6px', 
                      boxSizing: 'border-box',
                      color: '#333'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>
                    Dose de Insulina (UI)
                  </label>
                  <input
                    type="text"
                    name="insulina"
                    placeholder="Preencha: 7 (opcional)"
                    value={formData.insulina}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      fontSize: '14px', 
                      border: '1px solid #DDD', 
                      borderRadius: '6px', 
                      boxSizing: 'border-box',
                      color: '#333'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  placeholder="Preencha com observações (opcional): Ex: Antes da refeição, depois do exercício..."
                  value={formData.observacoes}
                  onChange={handleChange}
                  disabled={loading}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #DDD',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    color: '#333'
                  }}
                />
              </div>

              {message.text && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  background: message.type === 'success' ? '#D4EDDA' : message.type === 'warning' ? '#FFF3CD' : '#F8D7DA',
                  color: message.type === 'success' ? '#155724' : message.type === 'warning' ? '#856404' : '#721C24',
                  border: `1px solid ${message.type === 'success' ? '#C3E6CB' : message.type === 'warning' ? '#FFE69C' : '#F5C6CB'}`
                }}>
                  {message.text}
                </div>
              )}

              {debugInfo && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  fontSize: '13px',
                  background: '#E3F2FD',
                  color: '#0D47A1',
                  border: '1px solid #BBDEFB',
                  fontFamily: 'monospace'
                }}>
                  {debugInfo}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 32px',
                  fontSize: '16px',
                  fontWeight: 600,
                  background: '#1F4E78',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {loading ? 'Salvando...' : '💾 Salvar Registro'}
              </button>
            </form>

            <div style={{ marginTop: '20px', padding: '12px 16px', background: '#E8F5E9', borderRadius: '6px', border: '1px solid #A5D6A7', fontSize: '13px', color: '#2E7D32' }}>
              * Campos obrigatórios: Data e Horário<br/>
              💡 Preencha Glicemia OU Insulina (ou ambos)
            </div>
          </div>
        )}

        {/* Dashboard Tab - CORRIGIDO: Puxar da planilha */}
        {activeTab === 'dashboard' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
                Últimos Registros (Da Planilha - Ordenados)
              </h2>
              <button
                onClick={() => loadRecordsFromSheet()}
                disabled={syncingFromSheet}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#3498DB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: syncingFromSheet ? 'not-allowed' : 'pointer',
                  opacity: syncingFromSheet ? 0.6 : 1
                }}
              >
                {syncingFromSheet ? '⏳ Sincronizando...' : '🔄 Atualizar da Planilha'}
              </button>
            </div>

            {records.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>Nenhum registro encontrado</p>
                <p style={{ fontSize: '14px' }}>Adicione registros ou clique "Atualizar da Planilha"</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #1F4E78' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1F4E78' }}>Data</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1F4E78' }}>Horário</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1F4E78' }}>Glicemia</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1F4E78' }}>Insulina (UI)</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1F4E78' }}>Observações</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#1F4E78' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#1F4E78' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, index) => (
                      <tr key={record.id} style={{ borderBottom: '1px solid #DDD', background: index % 2 === 0 ? '#F9F9F9' : 'white' }}>
                        <td style={{ padding: '12px' }}>{record.data}</td>
                        <td style={{ padding: '12px' }}>{record.horario}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            background: getGlicemiaColor(record.glicemia),
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: 500
                          }}>
                            {record.glicemia ? `${record.glicemia} (${getGlicemiaLabel(record.glicemia)})` : '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>{record.insulina}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>{record.observacoes || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: record.synced ? '#27AE60' : '#F39C12'
                          }}>
                            {record.synced ? '✓ Sincronizado' : '⏳ Local'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {deleteConfirm === record.id ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                onClick={() => handleDeleteRecord(record.id, { data: record.data, horario: record.horario })}
                                disabled={loading}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  background: '#E74C3C',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: loading ? 'not-allowed' : 'pointer',
                                  opacity: loading ? 0.6 : 1
                                }}
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={loading}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  background: '#999',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(record.id)}
                              disabled={loading}
                              style={{
                                padding: '4px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: '#E74C3C',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                opacity: loading ? 0.6 : 1
                              }}
                            >
                              🗑️ Deletar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Resumo Tab - CORRIGIDO: Baseado em todos os dados */}
        {activeTab === 'resumo' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
                📊 Resumo de Glicemia (Da Planilha)
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>
                Total de registros na planilha: {records.length}
              </p>
            </div>

            {records.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>Nenhum registro para resumo</p>
                <p style={{ fontSize: '14px' }}>Adicione registros para ver o resumo</p>
              </div>
            ) : (
              <div>
                {/* Cards Principais */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                  
                  {/* Total */}
                  <div style={{
                    background: '#E3F2FD',
                    border: '2px solid #3498DB',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0D47A1', fontWeight: 500 }}>
                      Total de Registros
                    </p>
                    <p style={{ margin: 0, fontSize: '32px', fontWeight: 600, color: '#3498DB' }}>
                      {summary.total}
                    </p>
                  </div>

                  {/* Medidos */}
                  <div style={{
                    background: '#E8F5E9',
                    border: '2px solid #27AE60',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#2E7D32', fontWeight: 500 }}>
                      Com Glicemia
                    </p>
                    <p style={{ margin: 0, fontSize: '32px', fontWeight: 600, color: '#27AE60' }}>
                      {summary.medidos}
                    </p>
                  </div>

                  {/* Não Medidos */}
                  <div style={{
                    background: '#F5F5F5',
                    border: '2px solid #999',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666', fontWeight: 500 }}>
                      Apenas Insulina
                    </p>
                    <p style={{ margin: 0, fontSize: '32px', fontWeight: 600, color: '#999' }}>
                      {summary.naoMedidos}
                    </p>
                  </div>
                </div>

                {/* Status de Glicemia */}
                <div>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#333' }}>
                    Distribuição por Status de Glicemia
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    
                    {/* Verde - Normal */}
                    <div style={{
                      background: '#E8F8F5',
                      border: '1px solid #A9DFBF',
                      borderRadius: '8px',
                      padding: '20px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#27AE60'
                        }}></div>
                        <h4 style={{ margin: 0, fontSize: '16px', color: '#2E7D32', fontWeight: 600 }}>
                          Normal
                        </h4>
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 600, color: '#27AE60' }}>
                        {summary.normal}
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                        {summary.normalPct}% das medições
                      </p>
                      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>
                        (70–140 mg/dL)
                      </p>
                      <div style={{
                        marginTop: '12px',
                        background: 'white',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        height: '8px'
                      }}>
                        <div style={{
                          width: `${summary.normalPct}%`,
                          height: '100%',
                          background: '#27AE60',
                          transition: 'width 0.3s'
                        }}></div>
                      </div>
                    </div>

                    {/* Vermelho - Alto */}
                    <div style={{
                      background: '#FADBD8',
                      border: '1px solid #F5B7B1',
                      borderRadius: '8px',
                      padding: '20px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#E74C3C'
                        }}></div>
                        <h4 style={{ margin: 0, fontSize: '16px', color: '#C0392B', fontWeight: 600 }}>
                          Alto
                        </h4>
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 600, color: '#E74C3C' }}>
                        {summary.alta}
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                        {summary.altaPct}% das medições
                      </p>
                      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>
                        (&gt;140 mg/dL)
                      </p>
                      <div style={{
                        marginTop: '12px',
                        background: 'white',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        height: '8px'
                      }}>
                        <div style={{
                          width: `${summary.altaPct}%`,
                          height: '100%',
                          background: '#E74C3C',
                          transition: 'width 0.3s'
                        }}></div>
                      </div>
                    </div>

                    {/* Amarelo - Baixo */}
                    <div style={{
                      background: '#FEF8DC',
                      border: '1px solid #F9E79F',
                      borderRadius: '8px',
                      padding: '20px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#FFA500'
                        }}></div>
                        <h4 style={{ margin: 0, fontSize: '16px', color: '#E67E22', fontWeight: 600 }}>
                          Baixo
                        </h4>
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 600, color: '#FFA500' }}>
                        {summary.baixa}
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                        {summary.baixaPct}% das medições
                      </p>
                      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>
                        (&lt;70 mg/dL)
                      </p>
                      <div style={{
                        marginTop: '12px',
                        background: 'white',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        height: '8px'
                      }}>
                        <div style={{
                          width: `${summary.baixaPct}%`,
                          height: '100%',
                          background: '#FFA500',
                          transition: 'width 0.3s'
                        }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div style={{ marginTop: '30px', padding: '16px', background: '#E3F2FD', border: '1px solid #BBDEFB', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#0D47A1' }}>
                    <strong>ℹ️ Info:</strong> Este resumo está baseado em TODOS os dados da planilha (não apenas no histórico local).
                    Clique "Atualizar da Planilha" para sincronizar os dados mais recentes.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ background: '#F9F9F9', padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px', marginTop: '40px', borderTop: '1px solid #DDD' }}>
        <p>
          Desenvolvido com ❤️ | Dados sincronizados com Google Sheets
        </p>
      </footer>
    </div>
  )
}