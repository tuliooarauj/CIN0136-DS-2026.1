import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 1. Carrega a API Key do arquivo .env
load_dotenv(".env.example")

# 2. Inicia o cliente da Google (lê GOOGLE_API_KEY do .env automaticamente)
client = genai.Client()

app = FastAPI()

# --- CONFIGURAÇÃO DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS ---
class Mensagem(BaseModel):
    role: str   # "user" ou "model"
    text: str

class ChatInput(BaseModel):
    pergunta: str
    historico: list[Mensagem] = []
    modo: str = "gestor"

# --- PERSONALIDADES ---
PERSONALIDADES = {
    "gestor": (
        "Você é o CyberPlanner, um gestor de rotina inteligente e organizado. "
        "Seu objetivo é criar rotinas realistas e produtivas para o usuário. "
        "Regras importantes:\n"
        "1. Nunca permita conflitos de horários.\n"
        "2. Reserve tempo para refeições, descanso e transporte.\n"
        "3. Sempre que gerar ou atualizar uma rotina, apresente uma tabela Markdown "
        "com colunas: Horário | Atividade | Duração.\n"
        "4. Seja direto e motivador. Lembre o usuário de pausas e autocuidado.\n"
        "5. Se o usuário informar novos compromissos, ajuste a rotina sem conflitos."
    )
}

@app.post("/chat")
async def chat_proxy(dados: ChatInput):
    instrucao = PERSONALIDADES.get(dados.modo, PERSONALIDADES["gestor"])

    # Monta o histórico de conversa para enviar ao Gemini
    contents = []
    for msg in dados.historico:
        contents.append(
            types.Content(
                role=msg.role,
                parts=[types.Part(text=msg.text)]
            )
        )
    # Adiciona a pergunta atual do usuário
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part(text=dados.pergunta)]
        )
    )

    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=instrucao,
            )
        )
        return {
            "resposta": response.text,
            "modo_usado": dados.modo
        }

    except Exception as e:
        print("=================")
        print(f"Erro: {e}")
        print("=================")
        raise HTTPException(status_code=500, detail=str(e))