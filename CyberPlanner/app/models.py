from pydantic import BaseModel, Field
from typing import List
import sqlite3

class Mensagem(BaseModel):
    role: str
    text: str

class ChatInput(BaseModel):
    pergunta: str = Field(..., max_length=600, description="Texto de entrada do usuário")
    historico: List[Mensagem] = []
    modo: str = "gestor"
    modovisualizacao: str = "dia"
    
class UserAuth(BaseModel):
    username: str = Field(
        ..., 
        pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", 
        description="O usuário deve ser um e-mail válido"
    )
    password: str = Field(..., min_length=6, description="A senha deve ter no mínimo 6 caracteres")
    
class SalvarMensagemInput(BaseModel):
    user_id: int
    role: str
    text: str

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

def criar_tabela_historico():
    conexao = sqlite3.connect("cyberplanner.db")
    cursor = conexao.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS historico_chat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            text TEXT NOT NULL,
            data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES usuarios(id)
        )
    """)
    conexao.commit()
    conexao.close()

def salvar_mensagem_banco(user_id: int, role: str, text: str):
    conexao = sqlite3.connect("cyberplanner.db")
    cursor = conexao.cursor()
    cursor.execute(
        "INSERT INTO historico_chat (user_id, role, text) VALUES (?, ?, ?)",
        (user_id, role, text)
    )
    conexao.commit()
    conexao.close()

def buscar_historico_usuario(user_id: int):
    conexao = sqlite3.connect("cyberplanner.db")
    cursor = conexao.cursor()
    cursor.execute(
        "SELECT role, text FROM historico_chat WHERE user_id = ? ORDER BY data_envio ASC",
        (user_id,)
    )
    linhas = cursor.fetchall()
    conexao.close()
    return [{"role": row[0], "text": row[1]} for row in linhas]
