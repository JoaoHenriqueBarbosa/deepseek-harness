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

# AGENTS.md, Experimental packages

These rules supplement the [package rules](../AGENTS.md). The [experimental Agent Teams package decision](../../.agents/notes/implemented/architecture/2026-08-18-experimental-agent-teams-packages.md) owns the rationale.

- A package belongs here only when its complete public contract is experimental or internal-only. An experimental option inside a release package stays with its owning product role.
- Every package here uses the `@deepseek-ai/dsh-experimental-*` npm prefix, sets `private: true`, and omits `publishConfig`; the workspace constraints gate enforces these declarations and the dsh release family excludes this directory.
- Release packages and apps must not name packages here in `dependencies`, `optionalDependencies`, or `peerDependencies`. Experimental packages may depend on release packages and each other. Tests may use experimental packages through `devDependencies`; examples may load them explicitly.
- Experimental status does not relax engineering, security, documentation, lifecycle, testing, invariant, or snapshot requirements.
- Promotion moves a package to its product-role group and removes `experimental-` from its npm name. Update every import and configuration row atomically, then review its public contract, limitations, test evidence, release payload, runtime dependents, and named stable owner.
