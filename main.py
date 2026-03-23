import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 1. Carrega a API Key do arquivo .env
load_dotenv()

# 2. Inicia o cliente novo da Google (ele pega a chave automaticamente do .env)
client = genai.Client()

app = FastAPI()

# --- CONFIGURAÇÃO DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite que qualquer HTML acesse a API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ---------------------------------------------------------

class ChatInput(BaseModel):
    pergunta: str
    modo: str = "gestor"

PERSONALIDADES = {
    "gestor":"Você é um gestor, organizador de horários, não permita que haja conflitos de horários e faça de modo que maximize a rotina do usuário." +
    "no final gere uma tabela para o usuário ver os horários direitinho."
}

@app.post("/chat")
async def chat_proxy(dados: ChatInput):
    instrucao = PERSONALIDADES.get(dados.modo, PERSONALIDADES["gestor"])
    
    try:
        # Usando o modelo mais atualizado do Gemini
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=dados.pergunta,
            config=types.GenerateContentConfig(
                system_instruction=instrucao,
            )
        )
        return {"resposta": response.text, "modo_usado": dados.modo}
        
    except Exception as e:
        # Caso ocorra erro, mostre na tela
        raise HTTPException(status_code=500, detail=str(e))