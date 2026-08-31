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

# AGENTS.md, Schedule packages

These rules supplement the repository and package instructions for `packages/schedule/*`.

- The owning Session's versioned `schedule/change` stream is the only durable Schedule state. Folds validate every durable JSON boundary and derive active records; timers, idle waiters, and tool values remain disposable projections.
- A normal Session folds its complete log. A fork derives active Schedule state only from events at or after the Session's exact `inheritedEventCount`; it never inherits an active parent reminder.
- Every Schedule management operation that reads or decides from the fold first awaits `ctx.sessions.flush(session)`. Create and an actual delete await a second barrier after append; a failed barrier returns the stable uncertainty result instead of inferring durability from the live log.
- Runtime owners attach only to future live root Agents while the plugin is loaded. They do not scan persisted Sessions, adopt already-published roots, wake cold Sessions, register global tools, or delete durable records during teardown.
- Due handling rechecks the wall clock and exact live owner, claims the idle maintenance phase through the public Agent seam, constructs the complete escaped framing before `followup()`, appends dispatch only after synchronous enqueue returns, releases maintenance, and then awaits durability. A synchronous framing/enqueue failure appends no dispatch; a later model failure does not roll one back.
- Rule math and durable transition logic stay pure and deterministic. Production uses the platform wall clock and segmented timers; tests supply explicit samples or fake timers without adding a production clock service.
