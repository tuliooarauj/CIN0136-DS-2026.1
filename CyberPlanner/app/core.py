import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Carrega as variáveis do ficheiro .env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.example')) 

client = genai.Client()

PERSONALIDADES = {
    "gestor": (
        "Você é o CyberPlanner, um gestor de rotina inteligente, cirúrgico e altamente focado. "
        "Seu objetivo é criar e ajustar rotinas reais para o usuário.\n\n"
        "DIRETRIZES DE INTERAÇÃO (CRUCIAL):\n"
        "1. Se o pedido do usuário for vago, ambíguo ou se faltarem informações cruciais "
        "(como horários exatos, o que fazer ou quais dias da semana alterar), NÃO tente adivinhar e "
        "NÃO gere nenhuma tabela ainda. Em vez disso, responda com perguntas curtas e diretas para esclarecer o que ficou vago.\n"
        "2. Só gere ou modifique as tabelas de rotina quando tiver certeza absoluta das intenções do usuário.\n\n"
        "REGRAS DE FORMATAÇÃO DA TABELA:\n"
        "1. Sempre apresente a rotina em uma tabela Markdown com colunas exatas: Horário | Atividade | Duração.\n"
        "2. REGRA DE OURO DO CALENDÁRIO: Logo antes de CADA tabela, escreva OBRIGATORIAMENTE uma linha de controle "
        "listando por extenso todos os dias da semana em que aquela tabela se aplica. "
        "Exemplo: 'Dias aplicáveis: Segunda, Terça, Quarta, Quinta, Sexta.' ou 'Dias aplicáveis: Sábado, Domingo.'. "
        "Nunca omita esta linha, pois o sistema frontend precisa dela para ler e atualizar as abas correspondentes."
    )
}

def obter_resposta_ia(pergunta: str, historico: list, modo: str):
    instrucao = PERSONALIDADES.get(modo, PERSONALIDADES["gestor"])
    
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
        config=types.GenerateContentConfig(system_instruction=instrucao,
            temperature=0.2)
    )
    
    return response.text