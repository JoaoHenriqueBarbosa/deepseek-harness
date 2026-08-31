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

# AGENTS.md, Web Packages

These rules supplement the package conventions in [packages/AGENTS.md](../AGENTS.md).

- **Reject redirects on credential-bearing provider requests.** Configure the HTTP client to fail before following any redirect response. Regression coverage must prove that the redirect target is not contacted and that every credentialed provider opts into the policy. The configured endpoint necessarily receives the initial request; this prevents automatic forwarding of credentials or request data to another origin, not compromise of the configured endpoint.
