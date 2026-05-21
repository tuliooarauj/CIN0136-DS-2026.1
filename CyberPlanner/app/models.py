from pydantic import BaseModel
from typing import List
import sqlite3

class Mensagem(BaseModel):
    role: str
    text: str

class ChatInput(BaseModel):
    pergunta: str
    historico: List[Mensagem] = []
    modo: str = "gestor"
    modovisualizacao: str = "dia"
    
class UserAuth(BaseModel):
    username: str
    password: str

def inicializar_banco():
    conexao = sqlite3.connect("cyberplanner.db")
    cursor = conexao.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)
    conexao.commit()
    conexao.close()

def cadastrar_usuario(username, password):
    try:
        conexao = sqlite3.connect("cyberplanner.db")
        cursor = conexao.cursor()
        cursor.execute("INSERT INTO usuarios (username, password) VALUES (?, ?)", (username, password))
        conexao.commit()
        conexao.close()
        return True
    except sqlite3.IntegrityError:
        return False

def verificar_usuario(username, password):
    conexao = sqlite3.connect("cyberplanner.db")
    cursor = conexao.cursor()
    cursor.execute("SELECT id FROM usuarios WHERE username = ? AND password = ?", (username, password))
    usuario = cursor.fetchone()
    conexao.close()
    if usuario:
        return usuario[0]
    return None