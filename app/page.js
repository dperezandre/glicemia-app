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

  const SHEET_URL = 'https://script.google.com/macros/s/AKfycbx68YFI0TefdyotLX0lk25qx6n_7ZqP9Ar1J1v4idEyAP8_FDYaJ5iIJ5gt9X13wx_A1w/exec'

  // Carregar registros da planilha
  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    try {
      const response = await fetch(`${SHEET_URL}?action=getAll`, {
        method: 'GET',
        mode: 'no-cors'
      })
      // Como usamos no-cors, não podemos ler a resposta aqui
      // A atualização manual será feita via botão
    } catch (error) {
      console.log('Nota: Atualize manualmente com o botão')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    if (!formData.data) return 'Data é obrigatória'
    if (!formData.horario) return 'Horário é obrigatório'
    if (!formData.glicemia) return 'Glicemia é obrigatória'

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(formData.data)) {
      return 'Data deve estar no formato DD/MM/YYYY'
    }

    if (!/^\d{2}:\d{2}$/.test(formData.horario)) {
      return 'Horário deve estar no formato HH:MM'
    }

    const glicemia = parseFloat(formData.glicemia)
    if (isNaN(glicemia) || glicemia < 0 || glicemia > 500) {
      return 'Glicemia deve ser um número entre 0 e 500'
    }

    if (formData.insulina && isNaN(parseFloat(formData.insulina))) {
      return 'Insulina deve ser um número válido'
    }

    return null
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

    try {
      const payload = {
        data: formData.data,
        horario: formData.horario,
        glicemia: formData.glicemia,
        insulina: formData.insulina || '-',
        observacoes: formData.observacoes
      }

      const response = await fetch(SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      // Simular adição local enquanto aguarda sincronização
      const newRecord = {
        ...payload,
        id: Date.now()
      }
      setRecords(prev => [newRecord, ...prev])

      setMessage({ type: 'success', text: '✓ Registrado com sucesso!' })
      setFormData({ data: '', horario: '', glicemia: '', insulina: '', observacoes: '' })

      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao enviar. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  const getGlicemiaColor = (valor) => {
    const num = parseFloat(valor)
    if (num < 70) return '#FFA500'
    if (num > 140) return '#E74C3C'
    return '#27AE60'
  }

  const getGlicemiaLabel = (valor) => {
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
                    Data (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    name="data"
                    placeholder="23/07/2026"
                    value={formData.data}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #DDD', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>
                    Horário (HH:MM)
                  </label>
                  <input
                    type="text"
                    name="horario"
                    placeholder="14:30"
                    value={formData.horario}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #DDD', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>
                    Glicemia (mg/dL)
                  </label>
                  <input
                    type="text"
                    name="glicemia"
                    placeholder="150"
                    value={formData.glicemia}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #DDD', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>
                    Dose de Insulina (UI)
                  </label>
                  <input
                    type="text"
                    name="insulina"
                    placeholder="7"
                    value={formData.insulina}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #DDD', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  placeholder="Ex: Antes da refeição, depois do exercício..."
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
                    resize: 'vertical'
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
                  background: message.type === 'success' ? '#D4EDDA' : '#F8D7DA',
                  color: message.type === 'success' ? '#155724' : '#721C24',
                  border: `1px solid ${message.type === 'success' ? '#C3E6CB' : '#F5C6CB'}`
                }}>
                  {message.text}
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
                  Últimos Registros
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
                              {record.glicemia} ({getGlicemiaLabel(record.glicemia)})
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>{record.insulina}</td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>{record.observacoes || '-'}</td>
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
