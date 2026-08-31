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

# AGENTS.md, GitHub Actions

Run jobs on Windows runners (`windows-*` labels) under native `pwsh`. The pull-request `windows` job is the deliberate exception: it runs Windows Node under Wine on hosted Linux and blocks `all checks passed`; `windows-native` runs automatically on `windows-2025` (or the self-hosted `[self-hosted, dsh-win-ci, windows]` pool under `DSH_CI_FAILOVER_WINDOWS=selfhosted`) but reports independently. `ci.yml` is pull-request-only; the master `serial-windows` standby, the Linux `serial-linux-selfhosted` standby, the `wine-apt-cache` seeder, and the two manual runner benchmarks live in `ci-master.yml` (master-push + `workflow_dispatch`). Because `ci-master.yml` does not listen to `pull_request`, those master-only jobs never appear in PR check panels (a job a workflow defines for a given event is listed and shows `skipped` when its `if` is false); keeping them in a separate workflow is what stops PR check circles from showing gray segments. The master `serial-windows` standby continuously validates the self-hosted failover target, see the [failover runbook](../.agents/notes/implemented/process/2026-07-26-ci-failover-runbook.md).
