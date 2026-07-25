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

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwvn2VPRYx-pyI-edOlT6Xxl5SM7vU27laGJfykOC-pNYCXtt6T9jOsj37qVVlyovIZcQ/exec'

  // Carregar registros do localStorage
  useEffect(() => {
    loadRecordsFromStorage()
  }, [])

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
    
    // NOVA LÓGICA: Glicemia é obrigatória APENAS se insulina estiver vazia
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

    // Se glicemia foi preenchida, validar
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

  // NOVA FUNÇÃO: Ordenar registros por data/hora (mais recentes primeiro)
  const sortRecordsByDateTime = (recordsToSort) => {
    return [...recordsToSort].sort((a, b) => {
      const timestampA = dateToTimestamp(a.data, a.horario)
      const timestampB = dateToTimestamp(b.data, b.horario)
      // Mais recentes primeiro (descending)
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
        glicemia: formData.glicemia || null,  // MUDANÇA: null em vez de valor vazio
        insulina: formData.insulina || '-',
        observacoes: formData.observacoes
      }

      // Salvar localmente PRIMEIRO
      const newRecord = {
        ...payload,
        id: Date.now(),
        synced: false
      }
      
      // MUDANÇA: Ordenar registros após adicionar novo
      const updatedRecords = sortRecordsByDateTime([newRecord, ...records])
      setRecords(updatedRecords)
      saveToStorage(updatedRecords)

      setDebugInfo('✓ Salvo localmente e reorganizado. Sincronizando com Google Sheets...')

      // Tentar sincronizar com Google Sheets
      try {
        const response = await fetch(SHEET_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        // Atualizar status de sincronização
        newRecord.synced = true
        const syncedRecords = updatedRecords.map(r => 
          r.id === newRecord.id ? { ...r, synced: true } : r
        )
        setRecords(syncedRecords)
        saveToStorage(syncedRecords)

        setDebugInfo('✓ Sincronizado com Google Sheets!')
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
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #DDD' }}>
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
              transition: 'all 0.2s'
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
              transition: 'all 0.2s'
            }}
          >
            Histórico ({records.length})
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
              💡 Novo: Preencha Glicemia OU Insulina (ou ambos)
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            {records.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>Nenhum registro ainda</p>
                <p style={{ fontSize: '14px' }}>Vá para "Novo Registro" para adicionar seu primeiro registro</p>
              </div>
            ) : (
              <div>
                <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', color: '#333' }}>
                  Últimos Registros (Ordenados por Data/Hora - Mais Recentes Primeiro)
                </h2>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
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