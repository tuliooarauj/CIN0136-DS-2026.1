// URL base da API — altera aqui se mudares a porta ou o host
const API_URL = "http://localhost:8000/chat";

// Histórico da conversa mantido no frontend
const historico = [];

// Base de dados em memória separada por dia da semana
let rotinaGlobal = {
    Seg: [], Ter: [], Qua: [], Qui: [], Sex: [], Sáb: [], Dom: []
};
let diaSelecionado = "Seg";
let modoVisualizacao = "dia"; // "dia" ou "mes"

function escapeHtml(text) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

function addRow(role, htmlContent, isTyping = false) {
    const chatBox = document.getElementById("chat-box");
    const isUser = role === "user";

    const row = document.createElement("div");
    row.className = "message-row" + (isUser ? " user" : "");
    if (isTyping) row.id = "typing-row";

    const avatar = document.createElement("div");
    avatar.className = "avatar " + (isUser ? "usr" : "ai");
    avatar.textContent = isUser ? "Eu" : "CP";

    const bubble = document.createElement("div");
    bubble.className = "bubble " + (isUser ? "user-msg" : "ai-msg");
    bubble.innerHTML = htmlContent;

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;
    return row;
}

// Analisador Inteligente Estrito (Só retorna os dias se realmente encontrar no texto)
function descobrirDiasAlvo(texto) {
    const textoMinusculo = texto.toLowerCase();
    let diasAlvo = [];

    // 1º Passo: Procura por dias específicos explicitamente declarados
    if (textoMinusculo.includes("segunda") || textoMinusculo.includes("seg-")) diasAlvo.push("Seg");
    if (textoMinusculo.includes("terça") || textoMinusculo.includes("ter-")) diasAlvo.push("Ter");
    if (textoMinusculo.includes("quarta") || textoMinusculo.includes("qua-")) diasAlvo.push("Qua");
    if (textoMinusculo.includes("quinta") || textoMinusculo.includes("qui-")) diasAlvo.push("Qui");
    if (textoMinusculo.includes("sexta") || textoMinusculo.includes("sex-")) diasAlvo.push("Sex");
    if (textoMinusculo.includes("sábado") || textoMinusculo.includes("sabado") || textoMinusculo.includes("sáb-")) diasAlvo.push("Sáb");
    if (textoMinusculo.includes("domingo") || textoMinusculo.includes("dom-")) diasAlvo.push("Dom");

    // O SEGREDO ESTÁ AQUI: 
    // Só tenta adivinhar por palavras genéricas se NÃO achou dias específicos!
    // Isso evita que a IA bagunce tudo se disser "Rotina para a semana e fim de semana. Dias: Seg a Sex."
    if (diasAlvo.length === 0) {
        if (textoMinusculo.includes("fim de semana") || textoMinusculo.includes("final de semana")) {
            return ["Sáb", "Dom"];
        }
        if (textoMinusculo.includes("dias úteis") || textoMinusculo.includes("semana inteira") || textoMinusculo.includes("meio da semana")) {
            return ["Seg", "Ter", "Qua", "Qui", "Sex"];
        }
        if (textoMinusculo.includes("todos os dias")) {
            return ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
        }
    }

    return diasAlvo;
}
// Leitor de Contexto: Associa a tabela ao título/texto que veio logo antes dela
function extrairDadosTabela(textoIA) {
    const linhas = textoIA.split("\n");
    const regexHorario = /(\d{2}[:h]\d{2})/g;
    
    let novasRotinas = {}; // Guarda separadinho o que é de cada dia
    let contextoDias = [diaSelecionado]; // Fallback: se não falar nada, vai para o dia atual
    let bufferDeTexto = ""; // Acumula os títulos como "### Sábado e Domingo"

    linhas.forEach(linha => {
        const isTableRow = linha.includes("|") && !linha.includes("---");
        
        if (!linha.includes("|") && linha.trim() !== "") {
            // Não é tabela. Então é um texto de contexto. Guarda-o!
            bufferDeTexto += " " + linha;
        } else if (isTableRow) {
            // Começou uma tabela! Vamos ver a quem pertence...
            if (bufferDeTexto.trim() !== "") {
                const diasDetectados = descobrirDiasAlvo(bufferDeTexto);
                if (diasDetectados.length > 0) {
                    contextoDias = diasDetectados; // Atualiza o "alvo" para esta tabela
                }
                bufferDeTexto = ""; // Limpa a memória para a próxima tabela não herdar os dias errados
            }

            // Lê a linha da tabela e coloca nos dias certos
            const colunas = linha.split("|").map(c => c.trim()).filter(c => c !== "");
            if (colunas.length >= 2) {
                const temHorario = colunas[0].match(regexHorario);
                if (temHorario && !colunas[0].toLowerCase().includes("horário")) {
                    
                    const tarefa = {
                        horario: colunas[0],
                        atividade: colunas[1],
                        duracao: colunas[2] || ""
                    };
                    
                    contextoDias.forEach(dia => {
                        if (!novasRotinas[dia]) novasRotinas[dia] = [];
                        novasRotinas[dia].push(tarefa);
                    });
                }
            }
        }
    });

    // Terminou de ler tudo? Pega no que encontrou e atualiza o calendário oficial
    const diasAtualizados = Object.keys(novasRotinas);
    if (diasAtualizados.length > 0) {
        diasAtualizados.forEach(dia => {
            rotinaGlobal[dia] = novasRotinas[dia];
        });
        
        // Foca automaticamente no primeiro dia que foi atualizado
        diaSelecionado = diasAtualizados[0];
        atualizarEstiloAbasSemana();
        renderizarCalendario();
    }
}

function atualizarEstiloAbasSemana() {
    const botoes = document.querySelectorAll('.days-tabs .tab-btn');
    const diasSiglas = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    
    botoes.forEach((btn, index) => {
        if (diasSiglas[index] === diaSelecionado) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

async function enviarMensagem() {
    const inputField = document.getElementById("user-input");
    const sendBtn   = document.getElementById("send-btn");
    const pergunta  = inputField.value.trim();
    if (!pergunta) return;

    addRow("user", escapeHtml(pergunta));
    historico.push({ role: "user", text: pergunta });
    inputField.value = "";
    sendBtn.disabled = true;

    addRow("model", '<div class="typing-dots"><span></span><span></span><span></span></div>', true);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pergunta: pergunta,
                historico: historico.slice(0, -1),
                modo: "gestor"
            })
        });

        const data = await response.json();

        const typingRow = document.getElementById("typing-row");
        if (typingRow) typingRow.remove();

        if (!response.ok) {
            addRow("model", `<span class="error-msg">Erro ${response.status}: ${escapeHtml(data.detail || "Erro desconhecido")}</span>`);
            historico.pop();
        } else {
            const respostaHtml = marked.parse(data.resposta);
            addRow("model", respostaHtml);
            historico.push({ role: "model", text: data.resposta });
            
            // Tenta ler e atualizar o calendário lateral com as tabelas recebidas
            extrairDadosTabela(data.resposta);
        }

    } catch (err) {
        const typingRow = document.getElementById("typing-row");
        if (typingRow) typingRow.remove();
        addRow("model", '<span class="error-msg">Não foi possível ligar ao servidor.</span>');
        historico.pop();
    }

    sendBtn.disabled = false;
    inputField.focus();
}

// ── CONTROLADORES DO CALENDÁRIO LATERAL ──

function toggleCalendar() {
    const appLayout = document.querySelector('.app-layout');
    appLayout.classList.toggle('calendar-active');
    
    if (appLayout.classList.contains('calendar-active')) {
        renderizarCalendario();
    }
}

function alternarVisualizacao(modo) {
    modoVisualizacao = modo;
    
    document.getElementById('view-day-btn').classList.toggle('active', modo === 'dia');
    document.getElementById('view-month-btn').classList.toggle('active', modo === 'mes');
    
    const tabsContainer = document.getElementById('days-tabs-container');
    tabsContainer.style.display = (modo === 'dia') ? 'flex' : 'none';
    
    // Adiciona a classe 'month-mode' que aciona a animação de ocultar o chat e expandir o calendário
    const appLayout = document.querySelector('.app-layout');
    if (modo === 'mes') {
        appLayout.classList.add('month-mode');
    } else {
        appLayout.classList.remove('month-mode');
    }
    
    renderizarCalendario();
}

function mudarDia(dia, event) {
    diaSelecionado = dia;
    
    const botoes = document.querySelectorAll('.days-tabs .tab-btn');
    botoes.forEach(btn => btn.classList.remove('active'));
    
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        atualizarEstiloAbasSemana();
    }
    
    renderizarCalendario();
}

// Clicar no dia do mês volta para o chat e seleciona a aba correta
function abrirDiaPeloMes(dia) {
    mudarDia(dia); // Atualiza a aba selecionada (ex: "Ter")
    alternarVisualizacao('dia'); // Volta o modo, o que traz o chat de volta ao ecrã
}

function renderizarCalendario() {
    const container = document.getElementById('calendar-content-area');
    if (!container) return;

    if (modoVisualizacao === "dia") {
        renderizarLinhaDoTempo(container);
    } else {
        renderizarGradeMensal(container);
    }
}

function renderizarLinhaDoTempo(container) {
    const eventos = rotinaGlobal[diaSelecionado];
    
    if (!eventos || eventos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma atividade mapeada para este dia (${diaSelecionado}).</p>
                <span>Define a tua rotina no chat para o CyberPlanner a organizar aqui.</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="calendar-timeline">
            ${eventos.map(evento => {
                const atividadeMarkdown = marked.parseInline(evento.atividade);
                return `
                    <div class="timeline-item">
                        <div class="time-tag">${evento.horario}</div>
                        <div class="timeline-card">
                            <div class="card-bar"></div>
                            <div class="card-content">
                                <h4>${atividadeMarkdown}</h4>
                                ${evento.duracao ? `<span>⏱️ ${evento.duracao}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderizarGradeMensal(container) {
    const diasNoMes = 31; 
    const diasSemanaSiglas = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    
    const mapearDiaSemana = (numeroDia) => {
        const resto = numeroDia % 7;
        if (resto === 1) return "Seg";
        if (resto === 2) return "Ter";
        if (resto === 3) return "Qua";
        if (resto === 4) return "Qui";
        if (resto === 5) return "Sex";
        if (resto === 6) return "Sáb";
        return "Dom";
    };

    let htmlGridHeaders = diasSemanaSiglas.map(d => `<div class="month-grid-header">${d}</div>`).join('');
    let htmlDias = `<div class="month-day-cell empty" style="opacity: 0; pointer-events: none;"></div>`;

    for (let i = 1; i <= diasNoMes; i++) {
        const diaSemanaCorrespondente = mapearDiaSemana(i);
        const tarefasDoDia = rotinaGlobal[diaSemanaCorrespondente] || [];
        const temCompromisso = tarefasDoDia.length > 0;

        let previasHtml = "";
        if (temCompromisso) {
            previasHtml = tarefasDoDia.slice(0, 3).map(t => {
                return `<div class="month-event-pill" title="${t.horario} - ${t.atividade}">${t.atividade}</div>`;
            }).join('');
        }

        // OnClick chama 'abrirDiaPeloMes' para fazer a transição de volta
        htmlDias += `
            <div class="month-day-cell ${temCompromisso ? 'has-event' : ''}" onclick="abrirDiaPeloMes('${diaSemanaCorrespondente}')">
                <span class="day-number">${i}</span>
                <div class="month-events-container">
                    ${previasHtml}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="month-view-container">
            <div class="month-grid-days-labels">${htmlGridHeaders}</div>
            <div class="month-grid-cells">${htmlDias}</div>
        </div>
    `;
}

// Captura do Enter para enviar a mensagem
document.getElementById("user-input").addEventListener("keypress", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviarMensagem();
    }
});