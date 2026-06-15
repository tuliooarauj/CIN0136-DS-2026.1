from pydantic import BaseModel, Field
import os
import psycopg2
from typing import List
import bcrypt

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
    """Retorna a conexão, o formato de placeholder e o tipo de ID sequencial adequado"""
    if DATABASE_URL and DATABASE_URL.startswith("postgres"):
        # Postgres usa %s e SERIAL
        return psycopg2.connect(DATABASE_URL), "%s", "SERIAL"
    else:
        # SQLite usa ? e INTEGER PRIMARY KEY AUTOINCREMENT
        import sqlite3
        return sqlite3.connect('cyberplanner.db'), "?", "INTEGER PRIMARY KEY AUTOINCREMENT"

def inicializar_banco():
    conexao, _, id_tipo = obter_conexao()
    cursor = conexao.cursor()
    
    # Criação da tabela de Usuários adaptada para o tipo correto de ID
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS usuarios (
            id {id_tipo},
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );
    """)
    conexao.commit()
    cursor.close()
    conexao.close()
    
    criar_tabela_historico()

def criar_tabela_historico():
    conexao, _, id_tipo = obter_conexao()
    cursor = conexao.cursor()
    
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS historico_chat (
            id {id_tipo},
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
    conexao, p, _ = obter_conexao()
    cursor = conexao.cursor()
    try:
        # Transforma a string da senha em bytes e gera o Hash seguro
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password_bytes, salt).decode('utf-8')

        # Salva o HASH criptografado no banco de dados, nunca a senha limpa!
        cursor.execute(f"INSERT INTO usuarios (username, password) VALUES ({p}, {p})", (username, hashed_password))
        conexao.commit()
        return True
    except Exception: 
        return False
    finally:
        cursor.close()
        conexao.close()

def verificar_usuario(username, password):
    conexao, p, _ = obter_conexao()
    cursor = conexao.cursor()
    
    # Primeiro busca o hash da senha usando o username
    cursor.execute(f"SELECT id, password FROM usuarios WHERE username = {p}", (username,))
    usuario = cursor.fetchone()
    cursor.close()
    conexao.close()
    
    if usuario:
        user_id, hashed_password_no_banco = usuario[0], usuario[1]
        
        # Compara a senha digitada pelo usuário com o Hash salvo no banco
        senha_correta = bcrypt.checkpw(
            password.encode('utf-8'), 
            hashed_password_no_banco.encode('utf-8')
        )
        
        if senha_correta:
            return user_id
            
    return None

def salvar_mensagem_banco(user_id: int, role: str, text: str):
    conexao, p, _ = obter_conexao()
    cursor = conexao.cursor()
    cursor.execute(
        f"INSERT INTO historico_chat (user_id, role, text) VALUES ({p}, {p}, {p})",
        (user_id, role, text)
    )
    conexao.commit()
    cursor.close()
    conexao.close()

def buscar_historico_usuario(user_id: int):
    conexao, p, _ = obter_conexao()
    cursor = conexao.cursor()
    cursor.execute(
        f"SELECT role, text FROM historico_chat WHERE user_id = {p} ORDER BY data_envio ASC",
        (user_id,)
    )
    linhas = cursor.fetchall()
    cursor.close()
    conexao.close()
    return [{"role": row[0], "text": row[1]} for row in linhas]