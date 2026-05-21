import os  
from fastapi import FastAPI, HTTPException, Request, status 
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# Importamos o que criamos nos outros arquivos
from app.models import ChatInput
from app.core import obter_resposta_ia

app = FastAPI()

# --- CONFIGURAÇÃO DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ARQUIVOS ESTÁTICOS E HTML ---
# Isso faz o link com as pastas que você criou
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Rota para abrir o site no navegador
@app.get("/")
async def abrir_site(request: Request):
    return templates.TemplateResponse(request=request, name="index.html", context={"request": request})
    
# Rota que o seu JavaScript (frontend) vai chamar
@app.post("/chat")
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