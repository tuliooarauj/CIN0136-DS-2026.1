import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Carrega as variáveis do ficheiro .env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.example')) 

client = genai.Client()

PERSONALIDADES = {
    "gestor": (
        "Você é o CyberPlanner, um gestor de rotina inteligente e organizado. "
        "Seu objetivo é criar rotinas realistas e produtivas para o usuário. "
        "Regras importantes:\n"
        "1. Nunca permita conflitos de horários.\n"
        "2. Reserve tempo para refeições, descanso e transporte.\n"
        "3. Sempre que gerar ou atualizar uma rotina, apresente uma tabela Markdown "
        "com colunas: Horário | Atividade | Duração.\n"
        "4. Seja direto e motivador. Lembre o usuário de pausas e autocuidado.\n"
        "5. Se o usuário informar novos compromissos, ajuste a rotina sem conflitos."
    )
}

FORMA_VISUALIZACAO = {
    "dia" : ("Cyberplanner quero que você me organize me cornograma apenas do meu dia baseado no que eu mandei para você"),
    "semana" : ("Cyberplanner quero que monte o cronograma do meu dia e replique esse cornograma para o resto de minha semana, caso eu queira mudar algo mude no dia especificado"),
    "mes" : ("Cyberplanner quero que monte o cronograma do meu dia e replique esse cornograma para o resto do meu mes, caso eu queira mudar algo mude no dia especificado ")
}

def obter_resposta_ia(pergunta: str, historico: list, modo: str,visualizacao: str):
    instrucao = PERSONALIDADES.get(modo, PERSONALIDADES["gestor"])

    instrucao += FORMA_VISUALIZACAO[visualizacao]
    
    # Prepara o histórico para o formato do Gemini
    contents = []
    for msg in historico:
        contents.append(
            types.Content(role=msg.role, parts=[types.Part(text=msg.text)])
        )
    
    # Adiciona a pergunta atual
    contents.append(
        types.Content(role="user", parts=[types.Part(text=pergunta)])
    )

    # Chama a API
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=contents,
        config=types.GenerateContentConfig(system_instruction=instrucao)
    )
    
    return response.text