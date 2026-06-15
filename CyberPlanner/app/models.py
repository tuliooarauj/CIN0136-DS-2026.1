from pydantic import BaseModel, Field
import os
import psycopg2
from typing import List

# Busca a URL do banco do Render. Se não achar, roda em modo SQLite local.
DATABASE_URL = os.getenv("DATABASE_URL")

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

def obter_conexao():
    """Retorna a conexão correta e o formato de placeholder adequado para o banco ativo"""
    if DATABASE_URL and DATABASE_URL.startswith("postgres"):
        return psycopg2.connect(DATABASE_URL), "%s"
    else:
        import sqlite3
        return sqlite3.connect('cyberplanner.db'), "?"

def inicializar_banco():
    conexao, _ = obter_conexao()
    cursor = conexao.cursor()
    
    # Tabela de Usuários (Compatível com Postgres e SQLite)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );
    """)
    conexao.commit()
    cursor.close()
    conexao.close()
    
    criar_tabela_historico()

def criar_tabela_historico():
    conexao, _ = obter_conexao()
    cursor = conexao.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS historico_chat (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            text TEXT NOT NULL,
            data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES usuarios(id)
        );
    """)
    conexao.commit()
    cursor.close()
    conexao.close()

def cadastrar_usuario(username, password):
    conexao, p = obter_conexao()
    cursor = conexao.cursor()
    try:
        # Usando a variável 'p' para definir se será ? ou %s dinamicamente
        cursor.execute(f"INSERT INTO usuarios (username, password) VALUES ({p}, {p})", (username, password))
        conexao.commit()
        return True
    except Exception: # Captura erros de duplicidade (IntegrityError)
        return False
    finally:
        cursor.close()
        conexao.close()

def verificar_usuario(username, password):
    conexao, p = obter_conexao()
    cursor = conexao.cursor()
    cursor.execute(f"SELECT id FROM usuarios WHERE username = {p} AND password = {p}", (username, password))
    usuario = cursor.fetchone()
    cursor.close()
    conexao.close()
    if usuario:
        return usuario[0]
    return None

def salvar_mensagem_banco(user_id: int, role: str, text: str):
    conexao, p = obter_conexao()
    cursor = conexao.cursor()
    cursor.execute(
        f"INSERT INTO historico_chat (user_id, role, text) VALUES ({p}, {p}, {p})",
        (user_id, role, text)
    )
    conexao.commit()
    cursor.close()
    conexao.close()

def buscar_historico_usuario(user_id: int):
    conexao, p = obter_conexao()
    cursor = conexao.cursor()
    cursor.execute(
        f"SELECT role, text FROM historico_chat WHERE user_id = {p} ORDER BY data_envio ASC",
        (user_id,)
    )
    linhas = cursor.fetchall()
    cursor.close()
    conexao.close()
    return [{"role": row[0], "text": row[1]} for row in linhas]