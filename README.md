# 🎓 ENEM Learning — Simulador e Plataforma de Estudos

Bem-vindo(a) ao **ENEM Learning**! 🚀

Este projeto foi desenvolvido para ajudar estudantes a se prepararem para o Exame Nacional do Ensino Médio (**ENEM**). Aqui você encontra um **simulador interativo** com questões oficiais de edições anteriores, gabarito instantâneo, temporizador de prova e filtros por área de conhecimento, além de uma **API completa** para consulta de provas e questões.

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado no seu computador:

1. **[Node.js](https://nodejs.org/)** (versão 18 ou superior recomendada)
2. **[Git](https://git-scm.com/)** para clonar o repositório

> 💡 Se você acabou de instalar o Node.js, abra o terminal e confirme digitando:
> ```bash
> node -v
> npm -v
> ```

---

## ⚡ Guia Rápido: Como Rodar o Projeto

Criamos scripts automatizados para que você comece a estudar em apenas **dois passos**!

### 1. Clonar o repositório

Abra o terminal (Prompt de Comando, PowerShell ou Terminal do VS Code) e execute:

```bash
git clone https://github.com/miguelbtavaresoliveira-tech/enem-learning.git
cd enem-learning
```

---

### 2. Passo 1: Instalar tudo o que o projeto precisa

Execute o comando abaixo na pasta raiz do projeto:

```bash
npm run install:all
```

> 🎯 **O que esse comando faz?**
> Ele instala automaticamente todas as bibliotecas necessárias para o **frontend** (simulador), para o **backend** (API) e as ferramentas do projeto, sem você precisar entrar pasta por pasta!

---

### 3. Passo 2: Iniciar o Frontend e o Backend juntos

Com as dependências instaladas, basta executar:

```bash
npm run dev
```

> 🚀 **O que acontece agora?**
> - O terminal iniciará o **Frontend** e o **Backend** ao mesmo tempo.
> - Cada linha de log terá uma cor e um identificador claro: `[FRONTEND]` em ciano e `[BACKEND]` em magenta.
> - O simulador estará acessível no seu navegador no endereço:
>   👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🛠️ Comandos Disponíveis

Você pode executar esses comandos na raiz do projeto:

| Comando | O que ele faz? |
| :--- | :--- |
| `npm run install:all` | **Instala todas as dependências** do projeto completo (raiz, front e back) |
| `npm run dev` | **Inicia o Frontend e o Backend** simultaneamente |
| `npm run dev:front` | Inicia **apenas o Frontend** (Simulador) |
| `npm run dev:back` | Inicia **apenas o Backend** (API ENEM) |

> 📌 **Dica para focar apenas nos estudos:**
> O simulador já vem configurado para buscar as questões da API pública oficial do ENEM. Por isso, se você quiser apenas praticar questões e não precisar alterar o backend, pode rodar diretamente:
> ```bash
> npm run dev:front
> ```
> e acessar [http://localhost:5173](http://localhost:5173)!

*(Se você preferir utilizar `pnpm`, os mesmos comandos funcionam substituindo `npm run` por `pnpm run`).*

---

## 📂 Estrutura do Repositório

```text
enem-learning/
├── package.json               # Scripts centrais de automação (instalação e execução)
├── README.md                  # Este guia didático
│
├── frontend/
│   └── enem-simulador/        # Simulador interativo do ENEM
│       ├── src/
│       │   ├── EnemApp.tsx    # Interface do simulador com questões, timer e gabarito
│       │   ├── index.css      # Estilos globais e Tailwind CSS v4
│       │   └── main.tsx       # Ponto de entrada React
│       └── vite.config.ts     # Configuração do Vite + Tailwind
│
└── enem-api/                  # Backend em Next.js para gerenciamento e dados das provas
    ├── app/                   # Rotas e endpoints da API (/v1/exams, /v1/questions)
    ├── prisma/                # Esquema de banco de dados (PostgreSQL / Prisma)
    └── docs/                  # Documentação dos endpoints
```

---

## 🎯 Dicas de Estudo com o Simulador

- ⏱️ **Treine com o Cronômetro**: Use o temporizador no topo da tela para monitorar seu tempo médio por questão (no ENEM real, você tem cerca de 3 minutos por questão!).
- 📚 **Filtre por Disciplina**: Pratique separadamente Linguagens, Ciências Humanas, Ciências da Natureza ou Matemática para focar nas suas maiores dificuldades.
- 🔍 **Imagens em Alta Resolução**: Se uma questão tiver gráfico, charge ou tabela, clique sobre a imagem para abri-la em tamanho original e analisar cada detalhe.
- 🚩 **Marque Questões para Revisão**: Utilize a bandeirinha para sinalizar questões em que você ficou com dúvida e volte a elas antes de finalizar.

---

## ❓ Dúvidas e Soluções Frequentes (FAQ)

### 1. Mensagem de porta ocupada (Port 5173 is in use)
Se a porta `5173` já estiver em uso por outro programa, o Vite abrirá automaticamente na porta seguinte (ex: `http://localhost:5174`). Basta observar a URL informada no terminal.

### 2. Mensagem "Muitas requisições seguidas"
A API pública de questões possui um limite de requisições por segundo para evitar sobrecarga. O simulador já possui um mecanismo inteligente de espera e nova tentativa automática, mas caso ocorra, basta aguardar 2 a 3 segundos antes de passar para a próxima página.

---

## 🤝 Contribuindo

Contribuições são super bem-vindas! Se você tiver ideias de melhorias para a interface, novas estatísticas de estudo ou correções, sinta-se à vontade para abrir uma *Issue* ou enviar um *Pull Request*.

Bons estudos e rumo à nota 1000! 🎯
