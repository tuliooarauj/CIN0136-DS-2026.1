from fastapi import FastAPI, HTTPException, Request
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
    return templates.TemplateResponse("index.html", {"request": request})

# Rota que o seu JavaScript (frontend) vai chamar
@app.post("/chat")
async def chat_proxy(dados: ChatInput):
    try:
        # O main.py não sabe como o Gemini funciona, ele apenas chama o core.py
        resposta = obter_resposta_ia(dados.pergunta, dados.historico, dados.modo)
        
        return {
            "resposta": resposta,
            "modo_usado": dados.modo
        }
    except Exception as e:
        # Se der erro no Gemini ou na lógica, o main.py avisa o frontend
        raise HTTPException(status_code=500, detail=str(e))