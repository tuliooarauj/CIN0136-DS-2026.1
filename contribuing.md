# Guia de Contribuição - CYBERPLANNER

Seja bem-vindo ao projeto! Para manter a organização entre as equipes, siga estas diretrizes:

## 🌿 Fluxo de Trabalho (Git Flow)

1. Nunca faça commits diretamente na branch `main`.
2. Crie uma branch para sua tarefa: `feature/nome-da-task` ou `fix/nome-do-bug`.
3. Ao finalizar, abra um **Pull Request** e aguarde a revisão de pelo menos um membro.

## 📝 Padrão de Commits

Usamos o padrão de Commits Semânticos:

* `feat:` para novas funcionalidades.
* `fix:` para correção de erros.
* `docs:` para mudanças em documentação.
* `style:` para mudanças visuais (CSS/Layout) que não afetam a lógica.

## 💻 Ambiente de Desenvolvimento

* Certifique-se de usar o arquivo `.env` para sua chave da API do Gemini.
* Rode `pip install -r requirements.txt` antes de começar.

## 🔍 Revisão de Código

Ao revisar um Pull Request, verifique:

* Se o código está comentado onde é complexo.
* Se a aplicação roda sem erros após as mudanças.