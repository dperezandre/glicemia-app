# Monitor de Glicemia

Aplicação web para registrar e acompanhar níveis de glicemia com integração ao Google Sheets.

## Recursos

- ✅ Formulário com campos: Data, Horário, Glicemia, Dose de Insulina e Observações
- ✅ Dashboard com lista de registros
- ✅ Sincronização automática com Google Sheets
- ✅ Validação de dados
- ✅ Interface intuitiva e responsiva

## Campos do Formulário

- **Data** (obrigatório): DD/MM/YYYY
- **Horário** (obrigatório): HH:MM
- **Glicemia** (obrigatório): 0-500 mg/dL
- **Dose de Insulina**: UI (opcional)
- **Observações**: Campo livre (opcional)

## Como usar

1. Preencha os dados no formulário
2. Clique em "Salvar Registro"
3. Verifique o histórico na aba "Histórico"
4. Os dados são sincronizados automaticamente com sua planilha Google Sheets

## Hospedagem

Hospedado na Vercel (https://vercel.com)

Para fazer deploy:
1. Faça fork do repositório
2. Conecte com Vercel
3. Deploy automático em cada push

## Tecnologia

- Next.js 14
- React 18
- Google Apps Script API
- Vercel Hosting
