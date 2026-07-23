# 🚀 Guia de Deploy - Monitor de Glicemia

## Passo 1: Preparar o GitHub

### 1.1 Criar repositório no GitHub

1. Vá para https://github.com/new
2. Preencha:
   - **Repository name**: `glicemia-app`
   - **Description**: Monitor de Glicemia - Sincronizado com Google Sheets
   - Selecione **Public**
   - **NÃO** inicialize com README (já temos)
3. Clique em **Create repository**

### 1.2 Fazer upload do código

Se você está no terminal/bash:

```bash
cd /home/claude/glicemia-app
git init
git add .
git commit -m "Initial commit: Glicemia monitoring app"
git branch -M main
git remote add origin https://github.com/SEU_USERNAME/glicemia-app.git
git push -u origin main
```

**Substitua `SEU_USERNAME` pelo seu nome de usuário do GitHub**

---

## Passo 2: Deploy na Vercel

### 2.1 Conectar Vercel com GitHub

1. Vá para https://vercel.com
2. Clique em **Sign Up** (ou **Sign In** se já tem conta)
3. Escolha **Continue with GitHub**
4. Autorize Vercel acessar suas repos

### 2.2 Importar Projeto

1. Clique em **New Project**
2. Clique em **Import Git Repository**
3. Cole a URL do seu repositório:
   ```
   https://github.com/SEU_USERNAME/glicemia-app
   ```
4. Clique em **Import**

### 2.3 Configurar Projeto

Na tela de configuração:

- **Framework Preset**: Deixe em `Next.js`
- **Build Command**: `next build` (padrão)
- **Install Command**: `npm install` (padrão)
- **Output Directory**: `.next` (padrão)

Clique em **Deploy** e aguarde (leva ~2 minutos)

---

## Passo 3: Seu Link!

Após o deploy ser concluído, você verá:

```
✓ Production
   https://glicemia-app-abc123.vercel.app
```

**Esse é seu link! Você pode compartilhar esse link com qualquer pessoa.**

---

## Atualizar o Código

Sempre que fizer mudanças:

```bash
git add .
git commit -m "Descrição da mudança"
git push
```

**Vercel fará deploy automaticamente!**

---

## Guia Rápido

| Ação | Comando |
|------|---------|
| Inicializar Git | `git init` |
| Adicionar arquivos | `git add .` |
| Fazer commit | `git commit -m "mensagem"` |
| Fazer push | `git push` |
| Ver histórico | `git log` |

---

## Troubleshooting

### ❌ Erro "Build failed"

- Verifique se o `package.json` está correto
- Limpe o cache: Delete `.next` e `node_modules`
- Refaça commit e push

### ❌ Link não funciona

- Aguarde o deploy terminar (verifique o dashboard Vercel)
- Limpe o cache do navegador (Ctrl+Shift+Delete)

### ❌ Google Sheets não sincroniza

- Verifique o URL do Apps Script em `app/page.js`
- Teste a API no navegador: abra o console (F12) e veja mensagens de erro

---

## Link Final

Após concluir todos os passos, você terá um link como:

```
https://seu-app.vercel.app
```

**Compartilhe esse link onde quiser! A aplicação funcionará em qualquer lugar com internet.**

---

## Suporte

Para problemas:
- Docs Vercel: https://vercel.com/docs
- Docs Next.js: https://nextjs.org/docs
- Issues GitHub: https://github.com/seu-username/glicemia-app/issues

**Boa sorte! 🎉**
