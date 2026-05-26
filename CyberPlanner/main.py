import os  
from fastapi import FastAPI, HTTPException, Request, status 
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# Atualize seus imports do app.models
from app.models import (
    ChatInput, UserAuth, inicializar_banco, cadastrar_usuario, verificar_usuario,
    criar_tabela_historico, salvar_mensagem_banco, buscar_historico_usuario, SalvarMensagemInput
)
from app.core import obter_resposta_ia

app = FastAPI()

inicializar_banco()
criar_tabela_historico()

# --- CONFIGURAÇÃO DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/")
async def abrir_site(request: Request):
    return templates.TemplateResponse(request=request, name="page.html", context={"request": request})

@app.get("/login")
async def abrir_login(request: Request):
    return templates.TemplateResponse(request=request, name="login.html", context={"request": request})

# 🔐 ROTA DE CADASTRO
@app.post("/cadastro")
async def rota_cadastro(dados: UserAuth):
    if not dados.username.strip() or not dados.password.strip():
        raise HTTPException(status_code=400, detail="Usuário e senha não podem estar vazios.")
    sucesso = cadastrar_usuario(dados.username.strip(), dados.password)
    if not sucesso:
        raise HTTPException(status_code=400, detail="Este nome de usuário já está em uso.")
    return {"mensagem": "Usuário criado com sucesso!"}

# 🔑 ROTA DE LOGIN
@app.post("/login")
async def rota_login(dados: UserAuth):
    usuario_id = verificar_usuario(dados.username.strip(), dados.password)
    if not usuario_id:
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos.")
    return {
        "mensagem": "Login realizado!",
        "user_id": usuario_id,
        "username": dados.username.strip()
    }

@app.get("/chat/historico/{user_id}")
async def obter_historico(user_id: int, sessao_id: str):
    mensagens = buscar_historico_usuario(user_id,sessao_id)
    return {"historico": mensagens}

@app.post("/chat/salvar")
async def salvar_mensagem(dados: SalvarMensagemInput):
    salvar_mensagem_banco(dados.user_id, dados.sessao_id, dados.role, dados.text)
    return {"mensagem": "Mensagem salva com sucesso!"}
# Rota do Chat
@app.post("/chat")
async def chat_proxy(dados: ChatInput):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.strip() == "" or api_key == "SUA_CHAVE_AQUI":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chave de API do Gemini não configurada. Por favor, adicione sua GEMINI_API_KEY no arquivo .env."
        )
        
    try:
        
        visualizacao_segura = getattr(dados, "visualizacao", "dia")
        
        resposta = obter_resposta_ia(
            pergunta=dados.pergunta, 
            historico=dados.historico, 
            modo=dados.modo, 
            visualizacao=visualizacao_segura
        )
        return {"resposta": resposta}
        
    except Exception as e:
        erro_msg = str(e)
        if "API key not valid" in erro_msg or "400" in erro_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A chave de API fornecida no arquivo .env é inválida ou expirou."
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno na comunicação com a API: {erro_msg}"
        )