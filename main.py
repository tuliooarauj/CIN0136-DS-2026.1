import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 1. Carrega sua API Key do arquivo .env
load_dotenv()

# 2. Inicia o cliente novo da Google (ele pega a chave automaticamente do .env)
client = genai.Client()

app = FastAPI()

class ChatInput(BaseModel):
    pergunta: str
    modo: str = "gestor"

PERSONALIDADES = {
    "gestor":"Você é um gestor, organizador de horários, não permita que haja conflitos de horários e faça de modo que maximize a rotina do usuário."
}

@app.post("/chat")
async def chat_proxy(dados: ChatInput):
    instrucao = PERSONALIDADES.get(dados.modo, PERSONALIDADES["gestor"])
    
    try:
        # Usando o modelo mais atualizado agora que temos uma chave com a cota zerada!
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=dados.pergunta,
            config=types.GenerateContentConfig(
                system_instruction=instrucao,
            )
        )
        return {"resposta": response.text, "modo_usado": dados.modo}
        
    except Exception as e:
        # Se der erro, mostraremos na tela para facilitar a vida
        raise HTTPException(status_code=500, detail=str(e))