# CIN0136-DS-2026.1
> Repositório para armazenamento dos arquivos do Software desenvolvido na disciplina CIN0136 - Desenvolvimento de Software no semestre 2026.1.

## 📅 API Gestor de Rotina com Gemini
Esta aplicação usa **FastAPI** para se conectar ao modelo **Gemini 2.5 Flash** da Google para atuar como um gestor de horários inteligente, organizando rotinas e evitando conflitos através de uma interface de chat.

## 📦 Bibliotecas Necessárias
Para rodar este projeto, você precisará instalar as seguintes dependências do Python:

| Biblioteca | Descrição |
| :--- | :--- |
| `fastapi` | Framework para construção da API. |
| `uvicorn` | Servidor ASGI para rodar a aplicação. |
| `google-genai` | SDK oficial para integração com os modelos Gemini. |
| `python-dotenv` | Gerenciamento de variáveis de ambiente (API Key). |
| `pydantic` | Validação de dados e criação de modelos (ChatInput). |

### Comando para Instalação:
Execute o comando abaixo no seu terminal para instalar tudo de uma vez:

```bash
pip pip install -r requirements.txt
```
### Como executar a aplicação
Para inicio da aplicação, rode esse comando no terminal
```bash 
uvicorn app:main --reload
```
Após executar, abra o arquivo `index.html` 

## Inicio
Ao abrir a página html você pode interagir pelo chat, informando sua rotina, preferências e limitações para gerar a sua rotina.

### OBS
> Se você tiver uma chave de API do Gemini e quiser utiliza-la só incorporar sua chave no arquivo `.env.example` e apagar o arquivo `.env`
