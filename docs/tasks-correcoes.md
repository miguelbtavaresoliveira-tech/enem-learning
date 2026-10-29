# Tasks de correção — Simulado ENEM

Auditoria feita em 2026-10-28 sobre a branch `miguelbtavaresoliveira-tech/siren` (base `e619b69`).

Legenda de prioridade: **P0** quebra o fluxo principal · **P1** resultado errado / regressão visível · **P2** qualidade / robustez.

---

## Diagnóstico 1 — Por que o simulado puxa questões "que não existem"

### O que mudou

| Versão | Onde busca as questões | Arquivo |
|---|---|---|
| Antiga (funcionava) | `POST /api/simulado/questions` → lê `enem-api/public/<ano>/...` do disco | `enem-api/app/simulado/page.tsx:95` → `enem-api/app/api/simulado/questions/route.ts` |
| Atual (Vite) | `https://api.enem.dev/v1` (API pública remota) | `frontend/enem-simulador/src/simulado/api.ts:3` e `src/EnemApp.tsx:52` |

O módulo de simulado foi portado para o app Vite (commit `78f7c1e`) e passou a usar a URL fixa `https://api.enem.dev/v1`. **A pasta `enem-api/public` não é mais lida pelo frontend.** O `vite.config.ts` não tem proxy para o backend local e não existe variável de ambiente para a URL da API.

### Integridade dos dados em `enem-api/public` (verificada por script)

- 15 provas (2009–2023), 2.758 questões listadas nos `details.json` dos exames.
- **0 questões listadas sem arquivo** e 0 pastas órfãs: os dados locais estão íntegros.
- Lacunas de numeração são normais (ex.: 2009 tem 179 questões, a Q101 não existe nem na API remota, que responde 404).
- 8 questões com alternativas incompletas (ver T-09).

Conclusão: o problema **não está nos dados**. Está em como o frontend busca e mostra as questões.

### Causas do sintoma "questão que não existe / não carrega"

1. **Rate limit da API remota.** `api.enem.dev` responde `X-Ratelimit-Limit: 10` a cada 10 s. O simulado faz 1 requisição por ano selecionado (até 15) e depois 3 por navegação (prefetch). Com mais de 10 requisições em 10 s a API devolve 429; depois de 4 tentativas o erro é engolido (`ExamScreen.tsx:184 catch { /* skip */ }`).
2. **Referência sem questão.** A questão continua em `session.questionRefs` (conta no "Questão X de N" e no cartão-resposta), mas nunca entra em `loadedQuestions`. A tela fica em "Carregando questão…" para sempre, sem botão de tentar de novo.
3. **Título mostrado como enunciado.** `ExamScreen.tsx:423` mostra `question.title`, que nos dados é só `"Questão 137 - ENEM 2019"`. O cabeçalho diz "Questão 3 de 20" e o corpo diz "Questão 137": parece outra questão, que "não existe" no simulado.
4. **Markdown exibido cru.** `context` vem em Markdown (987 questões têm `![](url)` de imagem, além de `**negrito**`). `ExamScreen.tsx:416` e `SummaryScreen.tsx:156` mostram o texto puro. Questões que são só imagem aparecem como `![](https://enem.dev/...)` + a mesma imagem de novo via `files` (duplicada). O `EnemApp.tsx` já usa `react-markdown`, o simulado não.

---

## Diagnóstico 2 — Por que o prompt de estudo sai errado

`SummaryScreen.tsx:56`:

```ts
`Errei a questão ${w.index} do ENEM ${w.year} (...). O enunciado é: "${w.title.slice(0, 300)}". ...`
```

- `w.title` = `"Questão 10 - ENEM 2020"`, então **o prompt não tem enunciado, contexto nem texto das alternativas**. A IA recebe só "letra C, marquei B" e não tem como explicar nada.
- `SimuladoResult.wrongAnswers` (`types.ts:97`) guarda só `title`, então nem o histórico tem material para gerar um prompt depois.
- "Copiar todos para IA" só concatena esses prompts vazios. **Não pede plano de estudo**, não agrupa por conteúdo e não prioriza.
- Questões deixadas em branco não entram em `wrongAnswers` (`SummaryScreen.tsx:386`), então somem do plano.
- Regressão: a versão Next.js (`enem-api/app/simulado/results/page.tsx:542`, `buildReviewPrompt`) montava o prompt certo, com contexto, enunciado, alternativa marcada x correta e um pedido de tópicos e ordem de estudo. O redesign (commit `0400ea2`) trocou por esta versão simplificada.

---

## Tasks

### T-01 · P0 · Frontend deve ler as questões da `enem-api` local (pasta `public`)
**Arquivos:** `frontend/enem-simulador/src/simulado/api.ts`, `src/EnemApp.tsx`, `vite.config.ts`
- [ ] Trocar a constante `BASE` por `import.meta.env.VITE_ENEM_API_URL ?? '/v1'`.
- [ ] Em `vite.config.ts`, adicionar `server.proxy` de `/v1` e `/api` para `http://localhost:3000` (Next da `enem-api`, que o `npm run dev` da raiz já sobe).
- [ ] Criar `frontend/enem-simulador/.env.example` com `VITE_ENEM_API_URL=`.
- [ ] Aplicar o mesmo em `EnemApp.tsx:52` (modo "prova").
- **Aceite:** com a internet desligada e `npm run dev` na raiz, o simulado carrega questões.

### T-02 · P0 · Usar um endpoint em lote em vez de N requisições
**Arquivos:** `enem-api/app/api/simulado/questions/route.ts`, `frontend/.../simulado/api.ts`, `ExamScreen.tsx`
- Já existe `POST /api/simulado/questions`, que sorteia e devolve as questões completas numa chamada só e sem rate limit.
- [ ] Fazer o `buildQuestionRefs` + `fetchQuestion` chamarem esse endpoint (uma requisição por simulado).
- [ ] Corrigir o endpoint antes (ver T-03).
- [ ] Remover o prefetch por questão.
- **Aceite:** um simulado de 90 questões em 15 anos faz 1 requisição e nenhuma questão fica em "Carregando…".

### T-03 · P0 · Corrigir duplicidade de idioma no endpoint `/api/simulado/questions`
**Arquivo:** `enem-api/app/api/simulado/questions/route.ts:69-89`
- O `details.json` do exame lista as questões 1–5 duas vezes (inglês e espanhol). O endpoint adiciona as duas como candidatas com o mesmo `id` (`2020-1`), então podem vir duas vezes no mesmo simulado e colidir nas respostas.
- [ ] Filtrar para um idioma (`!q.language || q.language === languageEscolhido`), como o frontend faz em `api.ts:74`.
- [ ] Incluir o idioma no `id` (`2020-1-ingles`) ou deixar o usuário escolher Inglês/Espanhol no Setup.
- [ ] Devolver `language` no objeto (o tipo `SimuladoQuestion` não tem esse campo).
- [ ] Adicionar os headers CORS para `/api/:path*` em `next.config.mjs`, caso o frontend rode sem proxy.

### T-04 · P0 · Nunca deixar referência sem questão
**Arquivo:** `ExamScreen.tsx:170-186`
- [ ] Se a questão não carregar, remover a referência da sessão ou trocá-la por outra do pool, em vez de `catch { /* skip */ }`.
- [ ] Mostrar o erro com um botão "Tentar novamente" no lugar do "Carregando questão…" infinito.
- [ ] Só iniciar o simulado quando houver questões carregadas (com T-02 isso resolve sozinho).

### T-05 · P1 · Não mostrar `title` como enunciado
**Arquivos:** `ExamScreen.tsx:422-424`, `SummaryScreen.tsx:162`, `SummaryScreen.tsx:329`
- [ ] Remover o bloco que mostra `question.title` no corpo da questão. O enunciado real é `context` + `alternativesIntroduction`.
- [ ] Na lista de erradas do resultado, mostrar um trecho do `alternativesIntroduction` ou do `context` (sem markdown), não o título.
- [ ] Mostrar "ENEM 2019 · Q137" como metadado pequeno, se quiser manter a referência oficial.

### T-06 · P1 · Renderizar Markdown do enunciado e não duplicar imagens
**Arquivos:** `ExamScreen.tsx:409-421`, `SummaryScreen.tsx:154-161`
- [ ] Renderizar `context` com `react-markdown` (já é dependência; reaproveitar o `mdComponents` de `EnemApp.tsx`).
- [ ] Não renderizar `files` separadamente quando a URL já aparece em `context` (hoje a imagem aparece duas vezes).
- [ ] Renderizar `alt.text` também como markdown (algumas alternativas têm fórmulas/imagem).

### T-07 · P1 · Gerar o prompt correto de plano de estudo
**Arquivos:** `SummaryScreen.tsx:56-58, 232-236`, `types.ts:97`
- [ ] Ampliar `wrongAnswers` para guardar: `context` (sem as imagens markdown, cortado em ~600 caracteres), `alternativesIntroduction`, texto da alternativa marcada e da correta, e `hasImage: boolean`.
- [ ] Incluir também as questões **em branco** (como `selected: null`).
- [ ] Reescrever `makePrompt` / `copyAllPrompt` com base no `buildReviewPrompt` antigo (`enem-api/app/simulado/results/page.tsx:542`) e pedir explicitamente:
  1. explicação de cada erro (por que a correta está certa e a marcada errada);
  2. identificação do **conteúdo/assunto** de cada questão;
  3. agrupamento dos conteúdos por área com prioridade (mais erros = maior prioridade);
  4. **plano de estudo** com cronograma (ex.: 2 semanas), materiais e exercícios sugeridos.
- [ ] Avisar no prompt quando a questão depende de imagem ("a questão contém figura: <url>").
- [ ] Mostrar o prompt numa `<textarea>` só-leitura além do botão copiar (fallback quando o clipboard falha, e para o usuário revisar).
- **Aceite:** colar o prompt num chat de IA sem contexto prévio gera explicação e plano sem a IA pedir o enunciado.

Modelo sugerido:

```
Sou estudante e fiz um simulado do ENEM. Errei/deixei em branco as questões abaixo.

Para CADA questão:
1. Diga qual conteúdo/assunto do ENEM ela cobra.
2. Explique por que a alternativa correta está certa e por que a minha está errada.

Depois, monte um PLANO DE ESTUDO:
- Liste os conteúdos agrupados por área, do mais urgente ao menos urgente.
- Distribua em um cronograma de 14 dias (1–2h por dia), com o que estudar e que tipo de exercício fazer.
- Termine com 3 dicas de estratégia de prova para essas áreas.

=== Questão 1 — ENEM 2020, Q10 — Linguagens ===
Texto-base: <context sem imagens, cortado>
Comando: <alternativesIntroduction>
Alternativas:
A) ...
B) ...
...
Minha resposta: B
Resposta correta: C
```

### T-08 · P1 · (Opcional) Gerar o plano automaticamente com IA gratuita
**Arquivos novos:** `enem-api/app/api/study-plan/route.ts`, botão em `SummaryScreen.tsx`
- O `docs/implementacao-ia.md` está **vazio**. Documentar lá a decisão tomada.
- [ ] Criar `POST /api/study-plan` na `enem-api` que recebe o prompt da T-07 e chama um provedor com plano gratuito. A chave fica em `enem-api/.env` (`AI_API_KEY`), **nunca no frontend Vite** (tudo que é `VITE_*` vai para o bundle público).
- [ ] Opções gratuitas (confirmar limites atuais no site de cada uma):
  - **Google Gemini API** (Google AI Studio): tem cota gratuita, modelos Flash, bom em português.
  - **Groq**: plano gratuito com modelos abertos (Llama etc.), resposta rápida.
  - **OpenRouter**: tem modelos marcados como `:free`.
- [ ] Rate limit próprio na rota (reaproveitar `lib/api/rate-limit.ts`) para não esgotar a cota.
- [ ] Na UI: botão "Gerar plano com IA" mostra a resposta em markdown, com botão "Copiar plano". Se a IA falhar, mantém o "Copiar prompt" (T-07) como alternativa.
- [ ] Adicionar `AI_API_KEY=` ao `enem-api/.env.example`.

### T-09 · P2 · Tratar as 8 questões com alternativas incompletas
Questões com menos de 5 alternativas ou alternativas sem texto e sem imagem:

| Ano | Questão | Problema |
|---|---|---|
| 2011 | 180 | 4 alternativas |
| 2013 | 64 | 4 alternativas |
| 2016 | 47 | 4 alternativas |
| 2021 | 105 | 4 alternativas |
| 2021 | 175 | 4 alternativas |
| 2022 | 144 | 4 alternativas |
| 2022 | 166 | 4 alternativas |
| 2023 | 132 | A, B, C e D sem texto e sem imagem |

- [ ] Excluir essas questões do sorteio (lista de bloqueio no endpoint ou validação: 5 alternativas, cada uma com `text` ou `file`) ou corrigir os JSONs.

### T-10 · P1 · Resultado salvo duas vezes no histórico (dev)
**Arquivo:** `SummaryScreen.tsx:221-226`
- `main.tsx` usa `<StrictMode>`, que em desenvolvimento roda o `useEffect` duas vezes. O resultado entra duplicado em `simulado:results`.
- [ ] Salvar o resultado no `handleFinish` (`SimuladoApp.tsx:22`) em vez de no efeito, ou deduplicar por `id` em `saveResult`.

### T-11 · P1 · Teclado permite trocar a resposta depois do gabarito
**Arquivo:** `ExamScreen.tsx:214-224`
- O clique já é bloqueado depois de revelar (`!revealed && onAnswer`), mas o atalho A–E chama `answer()` direto.
- [ ] Ignorar as teclas A–E quando `revealed[currentId]` for verdadeiro.

### T-12 · P2 · Cronômetro e finalização
**Arquivo:** `ExamScreen.tsx:134-137, 236-238`
- [ ] O cronômetro começa durante o "Preparando questões…". Iniciar só quando `phase === 'exam'`.
- [ ] O efeito sem dependências chama `handleFinish` a cada render depois do tempo acabar. Usar uma ref/flag para finalizar uma vez só.
- [ ] "Sair da sessão" descarta tudo sem confirmar, e a sessão salva (`saveSession`) nunca é retomada (`loadSession` não é usado). Retomar ou remover.

### T-13 · P2 · Contagem e "vistas"
**Arquivo:** `SummaryScreen.tsx:222, 396`
- [ ] `markSeen` marca **todas** as referências, inclusive as não carregadas ou não respondidas. Marcar só as respondidas.
- [ ] `totalQuestions = Object.keys(answers).length` ignora as em branco: acertar 5 de 5 respondidas num simulado de 20 aparece como 100%. Usar o total de questões carregadas e mostrar "em branco" separado.

### T-14 · P2 · Histórico sem estilo (variáveis CSS inexistentes)
**Arquivo:** `HistoryScreen.tsx`
- Usa `var(--sys-bg)`, `var(--card-bg)`, `var(--separator)`, `var(--label)`, `var(--secondary-label)`, `var(--red)` e `var(--orange)`. **Nenhuma está definida** em `index.css`/`App.css` (restos do tema Apple HIG). A tela fica sem fundo nem bordas, com cores padrão.
- [ ] Migrar para os tokens `C` de `ui.tsx` (como as outras telas).
- [ ] Mostrar as questões erradas e o botão de prompt também no histórico (depende da T-07).
- [ ] Trocar `window.confirm` por um modal próprio (opcional).

### T-15 · P2 · Imagens dependem do domínio remoto
- Mesmo nos JSONs locais, `files`, `context` e `alternatives[].file` apontam para `https://enem.dev/<ano>/questions/...`, mas as imagens existem em `enem-api/public/<ano>/questions/...`.
- [ ] No endpoint, reescrever `https://enem.dev/` para a URL da própria API (ou `/`) para funcionar offline/self-hosted.

### T-16 · P2 · Heurística de dificuldade
**Arquivos:** `api.ts:37-43`, `route.ts:21-27`
- "Fácil/Média/Difícil" é só o terço da posição da questão no caderno, que não tem relação com a dificuldade TRI. A opção pode enganar o aluno.
- [ ] Renomear para "Início/Meio/Fim do caderno" ou remover até existir um dado real de dificuldade.

### T-17 · P2 · Off-by-one na paginação da API v1
**Arquivo:** `enem-api/app/v1/exams/[year]/questions/route.ts`
- `question.index <= offset + limit` devolve `limit + 1` questões quando a numeração é contínua.
- [ ] Usar `< offset + limit` (ou paginar pela posição no array, não pelo `index`).

### T-18 · P2 · Ambiente e qualidade
- [ ] Sem `node_modules` não é possível rodar `tsc`. Documentar `npm run install:all` no README da raiz.
- [ ] Há `package-lock.json` **e** `pnpm-lock.yaml` nos três pacotes. Escolher um gerenciador e remover o outro lock.
- [ ] Duas implementações do simulado coexistem (`enem-api/app/simulado/*` em Next.js e `frontend/enem-simulador/src/simulado/*` em Vite). Decidir qual fica e apagar a outra para evitar divergência (foi assim que o prompt regrediu).
- [ ] `AVAILABLE_YEARS` está fixo em `types.ts:34`. Buscar de `/v1/exams`.
- [ ] Adicionar testes mínimos: montagem do prompt (T-07), seleção sem duplicatas (T-03) e `buildResult` (T-13).

---

## Layout e design (D-xx)

> Baseado nos mockups HTML em `docs/tela-inicio.md`, `docs/configuracao-simulado.md` e `docs/tela-questao.md` (Tailwind + tokens MD3 + Material Symbols). Só documentação — não implementado ainda.

### D-01 · P1 · Base global
**Arquivos:** `frontend/enem-simulador/index.html`, `src/index.css`
- `index.html` tem `lang="en"` e título `enem-simulador`. Mockup pede `lang="pt-BR"` e título "ENEM Estudos".
- Nenhuma fonte Inter nem Material Symbols é carregada. Mockup usa ambas via Google Fonts / CDN.
- Emojis (🎯 ✅ 📋 🕐 🏛 🔬 📖 📐) substituem ícones Material Symbols em todo o app.
- Os tokens de design (escala tipográfica `body-enunciado 16/28`, `headline-*`, `label-*`, espaçamentos `space-*`, raios `lg=4px`/`xl=8px`) estão espalhados como `inline styles`. Deveriam ser variáveis CSS ou tokens no `@theme` do Tailwind v4 em `index.css`.
- **Aceite:** `index.html` com `lang="pt-BR"`, Inter + Material Symbols carregados, tokens centralizados, todos os emojis substituídos por `<span class="material-symbols-…">`.

### D-02 · P1 · Shell global (header + footer)
**Arquivos:** `src/App.tsx`, cada `*Screen.tsx`
- Cada tela tem o próprio `TopNav` sem consistência. Não há footer global.
- Mockup pede header fixo com logo "ENEM Estudos", nav (Início, Provas Anteriores, Simulados, Redação, Desempenho), item ativo sublinhado, chip "Meta", ícone de ajuda e avatar.
- Footer padrão presente em todas as telas.
- **Aceite:** componente `AppShell` com `<Header>` e `<Footer>` envolvendo o conteúdo de cada rota; `TopNav` individuais removidos.

### D-03 · P2 · Tela Inicial
**Arquivo:** `src/App.tsx`
- Não tem: hero com badge "Ambiente de Preparação Acadêmica", card de índice TRI, faixa "Recomendação de Foco Diário" com Pomodoro, tiles (Padrão INEP, Calibragem, Sem Distrações).
- Cards de Prova Completa e Simulado Personalizado existem, mas sem a barra de progresso nem o badge "Recomendado" + 2 métricas.
- **Aceite:** layout idêntico ao mockup `tela-inicio.md`, responsivo.

### D-04 · P1 · Configuração do Simulado
**Arquivos:** `src/simulado/SetupScreen.tsx`, `src/simulado/ui.tsx`
- Sub-header "← Início · Configuração de Simulado · Histórico de Simulados" ausente.
- Contador "N selecionadas" ausente.
- "Anos de Prova": segmentado Todos/Últimos 3/Últimos 5 está embaixo das disciplinas; mockup quer no **topo direito**. Chips são arredondados; mockup quer raio 4 px, cor ativo `#EFF6FF`/`#1D4ED8`.
- Volume de Questões e Dificuldade estão empilhados; mockup quer **lado a lado** (grid 2 colunas), botões `h-11` em grid de 7, texto "~N min estimados" (3 min/item).
- "Diretrizes da Sessão": switch atual é redondo azul iOS; mockup quer **retangular 38×20, verde `#15803D`**. Badge "3 min / item" no cronômetro ausente.
- CTA "Começar Simulado →" + nota com ícone cadeado ausente.
- **Aceite:** layout e componentes idênticos ao mockup `configuracao-simulado.md`.

### D-05 · P1 · Tela da Questão
**Arquivo:** `src/simulado/ExamScreen.tsx`
- Sub-header sticky com barra de 2 px, "Questão X de N · Y% concluído" e chip do cronômetro com ícone `schedule` está ausente (existe uma `TopNav` simples).
- Linha de metadados: chip de disciplina + "ENEM ano" à esquerda; ID e selo à direita — não diferenciados.
- Enunciado não está num `<article>` com `border` + `p-6 md:p-8`.
- Comando (`alternativesIntroduction`) não usa `headline-sm`.
- Estado selecionado das alternativas não mostra "Sua escolha" conforme o mockup.
- Rodapé de navegação é uma barra fixa; mockup quer **dentro do fluxo da página**.
- **"Marcar para revisão"** não existe — deve ser adicionado e refletido no cartão-resposta.
- **Aceite:** layout de `tela-questao.md`, rodapé no fluxo, botão de revisão funcional.

### D-06 · P2 · Resultado e Histórico
**Arquivos:** `src/simulado/SummaryScreen.tsx`, `src/simulado/HistoryScreen.tsx`
- Sem mockup formal. `HistoryScreen` usa variáveis CSS inexistentes (ver T-14).
- Alinhar ao shell global (D-02) e tokens do D-01.
- **Aceite:** mesmos tokens, sem variáveis CSS indefinidas, shell aplicado.

### D-07 · P2 · Responsivo
**Arquivos:** globais
- Sem gutter de 16 px no mobile em várias telas. Algumas telas causam rolagem horizontal em viewport < 640 px. Nav não colapsa abaixo de `lg`.
- **Aceite:** zero rolagem horizontal em 375 px, gutter `margin-mobile` aplicado, nav colapsada em mobile.

---

## Ordem sugerida

1. T-01 → T-03 → T-02 → T-04 (as questões voltam a vir do `public` e sempre carregam)
2. T-05 → T-06 (o enunciado aparece corretamente)
3. T-07 (prompt de plano de estudo) → T-08 (IA gratuita, opcional)
4. T-10, T-11, T-13 (resultado correto)
5. Restante (P2)
