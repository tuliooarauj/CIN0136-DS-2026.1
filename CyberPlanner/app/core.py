import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Carrega as variáveis do ficheiro .env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env')) 

client = genai.Client()

PERSONALIDADES = {
    "gestor": (
        "Você é o CyberPlanner, um gestor de rotina inteligente, cirúrgico e altamente focado. "
        "Seu objetivo é criar e ajustar rotinas reais para o usuário.\n\n"
        "DIRETRIZES DE INTERAÇÃO (CRUCIAL):\n"
        "1. Se o pedido do usuário for vago, ambíguo ou se faltarem informações cruciais "
        "(como horários exatos, o que fazer ou quais dias do calendário alterar), NÃO tente adivinhar e "
        "NÃO gere nenhuma tabela ainda. Em vez disso, responda com perguntas curtas e diretas para esclarecer o que ficou vago.\n"
        "2. Só gere ou modifique as tabelas de rotina quando tiver certeza absoluta das intenções do usuário.\n\n"
        "REGRAS DE FORMATAÇÃO DA TABELA (SISTEMA DE GAVETAS):\n"
        "1. Sempre apresente a rotina em uma tabela Markdown com colunas exatas: Horário | Atividade | Duração.\n\n"
        "2. CASO 1 - ROTINA SEMANAL FIXA: Se o usuário estiver definindo uma rotina que se repete toda semana, "
        "escreva OBRIGATORIAMENTE logo antes da tabela a linha de controle por extenso. "
        "Exemplo: 'Dias aplicáveis: Segunda, Sexta.'.\n\n"
        "3. CASO 2 - EVENTO EM DIA ESPECÍFICO DO MÊS: Se o usuário pedir para marcar algo em uma data/dia fixo do mês corrente "
        "(ex: 'sexta feira dia 25', 'dia 12'), você NÃO deve usar a linha de controle semanal. "
        "Em vez disso, escreva OBRIGATORIAMENTE na linha imediatamente anterior à tabela o marcador 'Dia: X' (onde X é o número do dia). "
        "Exemplo: 'Dia: 25'."        
    )
}

FORMA_VISUALIZACAO = {
    "dia": " Cyberplanner, quero que você organize o meu cronograma focado apenas no meu dia, baseado no que eu mandei para você.",
    "semana": " Cyberplanner, quero que monte o cronograma do meu dia e distribua esse planejamento ao longo da minha semana. Caso eu queira mudar algo, adapte o dia especificado."
}

def obter_resposta_ia(pergunta: str, historico: list, modo: str, visualizacao: str):
    # Procura a personalidade (ex: "gestor")
    instrucao = PERSONALIDADES.get(modo, PERSONALIDADES["gestor"])

    # Junta a instrução da personalidade com a regra da visualização atual
    # Usamos o .get() com fallback para "dia" por segurança, caso venha algo malformado
    regra_visualizacao = FORMA_VISUALIZACAO.get(visualizacao, FORMA_VISUALIZACAO["dia"])
    instrucao += regra_visualizacao

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
        config=types.GenerateContentConfig(system_instruction=instrucao, temperature=0.2)
    )
    
    return response.text