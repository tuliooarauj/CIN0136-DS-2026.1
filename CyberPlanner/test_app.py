from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app
from app.models import Mensagem, ChatInput

# Cria um "navegador fantasma" para testar a API internamente
client = TestClient(app)

# Verifica se as variáveis guardam os dados certos
def test_criacao_de_mensagem():
    msg = Mensagem(role="user", text="Estudar Python")
    assert msg.role == "user"
    assert msg.text == "Estudar Python"

def test_chatinput_valores_padrao():
    entrada = ChatInput(pergunta="Organize meu dia")
    assert entrada.pergunta == "Organize meu dia"
    assert entrada.modo == "gestor"
    assert entrada.historico == []

#  Verifica se o site não está fora do ar 
def test_rota_principal_carrega_html():
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]

#  Simula a IA sem gastar API Key e sem usar internet 
@patch("main.obter_resposta_ia")
def test_rota_chat_com_mock(mock_ia):
    # Enganamos o código dizendo que a IA respondeu isso:
    mock_ia.return_value = "Sua rotina foi organizada com sucesso!"

    # Disparamos a mensagem como se fôssemos o arquivo index.js do frontend
    dados_enviados = {"pergunta": "Organize minha tarde", "historico": [], "modo": "gestor", "visualizacao": "dia"}
    response = client.post("/chat", json=dados_enviados)

    # Garantimos que o servidor não deu erro (200) e que devolveu a resposta falsa da IA
    assert response.status_code == 200
    assert response.json() == {
        "resposta": "Sua rotina foi organizada com sucesso!",
    }