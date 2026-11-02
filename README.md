# VotaSnap — Painel de administração

Painel web (React + Vite + Tailwind + Firebase) para gerir desafios, vencedores,
moderação e utilizadores da app VotaSnap. Também serve as páginas públicas
usadas pela app e pela Play Store:

| Rota | Pública | Descrição |
|---|---|---|
| `/policy`, `/privacidade` | ✅ | Política de privacidade |
| `/eliminar-conta` | ✅ | Instruções de eliminação de conta |
| `/entry/:challengeId/:entryId`, `/challenge/:challengeId` | ✅ | Abre a app por deep link (`votasnap://`) |
| `/login` | ✅ | Login do painel |
| `/dashboard`, `/cc`, `/cl`, `/wc`, `/mc`, `/ul` | 🔒 admin | Painel |
| `/mock` | 🔒 admin, só em dev | Gera dados fake (ver abaixo) |

## Requisitos

- Node.js ≥ 20.19
- Projecto Firebase com Auth (Email/Password e/ou Google), Realtime Database e Storage

## Configuração

```bash
cp .env.example .env   # preencher com a config web do Firebase
npm install
npm run dev            # http://localhost:3000
```

As variáveis mantêm o prefixo `REACT_APP_` (herdado do CRA) para não ser preciso
alterar o que já está configurado na Vercel.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção em `build/` |
| `npm run preview` | Serve o build localmente |
| `npm run lint` | ESLint |
| `npm test` | Testes (Vitest) |
| `npm run set-admin -- <email> [--remove]` | Dá/retira o papel de admin a uma conta |

## Acesso de administrador

O painel só abre para contas com o custom claim `admin: true`.

1. Cria a conta em Firebase Console → Authentication (ou entra uma vez com Google).
2. Descarrega uma chave de service account (Definições do projecto → Contas de serviço)
   para a raiz do projecto como `serviceAccount.json` (já está no `.gitignore`).
3. Corre:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npm run set-admin -- admin@votasnap.com
   ```
   No PowerShell: `$env:GOOGLE_APPLICATION_CREDENTIALS="./serviceAccount.json"; npm run set-admin -- admin@votasnap.com`
4. Recarrega o painel.

## Regras do Firebase

O login no frontend **não chega** — quem protege os dados são as regras do
Firebase. Os ficheiros em [`firebase/`](firebase/) são fragmentos **aditivos**:

- **Realtime Database** — juntar à raiz das regras existentes:
  ```json
  ".read": "auth != null && auth.token.admin === true",
  ".write": "auth != null && auth.token.admin === true"
  ```
- **Storage** — juntar o bloco de [`firebase/storage.rules.admin`](firebase/storage.rules.admin).

Como as permissões no RTDB e no Storage são cumulativas, isto dá acesso aos
admins sem retirar nada à app móvel. Confirma também que as regras actuais
**não** permitem escritas sem autenticação em `challenges`, `users`, `reports`,
`entries` e `votes`.

## Arquitectura

```
src/
  auth/        AuthProvider (sessão + claim admin), RequireAdmin, LoginPage
  data/        AdminDataProvider (listeners únicos), metrics (funções puras), actions (escritas)
  layout/      AdminLayout (sidebar desktop + drawer mobile)
  components/  Páginas + ui/ (Modal, ConfirmDialog, Avatar, ...)
  utils/       format, media, runAction (toasts de erro), provinces
  config/      Flags e constantes (Snaps, Mock)
```

- **Uma subscrição por nó** (`users`, `challenges`, `entries`, `votes`,
  `snaps_history`, `reports`), partilhada por todas as páginas e montada só
  depois do login.
- **Escritas seguras**: contadores com `increment()`, operações multi-nó com um
  único `update()` multi-path, mudanças de estado dos desafios (confirmar
  vencedor, desempate, reverter, encerrar) com `runTransaction` e guarda de
  estado, para evitar pagamentos duplicados com cliques ou admins simultâneos.
- As páginas são carregadas sob demanda; as páginas públicas não descarregam o
  SDK do Firebase.

### Snaps

`PARTICIPATION_SNAPS` e `WINNER_SNAPS` em [`src/config/index.js`](src/config/index.js)
têm de coincidir com as Cloud Functions. Ao reverter um desafio é gravado
`revertCount`/`revertedAt` — a Cloud Function que processa o fim do desafio deve
usá-los para não voltar a pagar a participação.

## Mock Data

`/mock` cria utilizadores (`isFake: true`) e entradas **na base de dados real**.
Só aparece em `npm run dev`, ou em produção com `REACT_APP_ENABLE_MOCK=true`
(não recomendado). Os utilizadores fake podem ser filtrados em Utilizadores → "Fake".

## Deploy (Vercel)

O [`vercel.json`](vercel.json) define o build (`npm run build` → `build/`) e o
rewrite SPA para `index.html`. As variáveis `REACT_APP_*` ficam nas Environment
Variables do projecto na Vercel.
