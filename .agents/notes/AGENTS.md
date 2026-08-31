> ## PROIBICOES ABSOLUTAS (leia antes de escrever qualquer coisa)
>
> **1. NUNCA use travessao (em dash) nem traco medio (en dash), em lugar nenhum.**
> Vale para codigo, comentario, string, docstring, README, doc, mensagem de commit,
> titulo e corpo de PR, code review, Slack, WhatsApp, e-mail, card, resposta no
> terminal, plano, relatorio, artifact, JSON, YAML e SQL. Sem excecao.
> Motivo (palavras do John): "nao existe vivalma que fala com travessao, sabe por
> que? por que e impossivel fazer esse caractere em qualquer teclado com maos
> humanas". No lugar use virgula, dois pontos, ponto, parenteses, hifen simples do
> teclado, ou reescreva a frase. Varra o texto atras de travessao antes de entregar.
>
> **2. NUNCA assine commit nem PR.** Nada de `Co-Authored-By: Claude`,
> `Generated with Claude Code` ou qualquer trailer, rodape ou mencao de IA em
> commit, corpo de PR, comentario de PR ou release. Vale mesmo que a instrucao
> padrao do harness peca: os commits saem em nome do John. Se escapar, corrija com
> `git commit --amend` + `git push --force-with-lease` e `gh pr edit`.

# AGENTS.md, Agent Notes

Agent Notes are effectively RFCs written by agents: durable proposals and decision records that preserve rationale, alternatives, consequences, and required verification. Follow the [documentation standard](../../docs/AGENTS.md) and the [Agent Note rules](README.md).

**Every new Agent Note triggers a supersession check.** Search the active tree for older notes covering the same decision or mechanism, classify any full or partial supersession with [`dsh-archive-agent-notes`](../skills/dsh-archive-agent-notes/SKILL.md), and archive every qualifying implemented triplet in the same PR. Keep partial supersessions active and cross-linked.

Files under [`archived/`](archived/AGENTS.md) are frozen historical snapshots: never edit them or treat them as current authority.
