from pydantic import BaseModel
from typing import List

class Mensagem(BaseModel):
    role: str
    text: str

class ChatInput(BaseModel):
    pergunta: str
    historico: List[Mensagem] = []
    modo: str = "gestor"
    modovisualizacao: str = "dia"