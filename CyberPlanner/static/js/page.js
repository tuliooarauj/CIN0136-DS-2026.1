if (!localStorage.getItem("cyberplanner_user_id")) {
    window.location.href = "/login";
}
const API_URL = "http://localhost:8000/chat";

// --- CONTROLE DE MÚLTIPLAS CONVERSAS EM MEMÓRIA (PRESERVADO) ---
const bancoConversas = {}; 
let conversaAtivaId = "chat_inicial";

// Agora cada conversa possui suas rotinas semanais E seus eventos de dias específicos do mês
bancoConversas[conversaAtivaId] = {
    titulo: "✨ Conversa Atual",
    historicoLocal: [], 
    rotinaLocal: { Seg: [], Ter: [], Qua: [], Qui: [], Sex: [], Sáb: [], Dom: [] },
    eventosMensaisLocal: {} // Guarda compromissos por número do dia (ex: "25": [...])
};

let historico = bancoConversas[conversaAtivaId].historicoLocal;
let rotinaGlobal = bancoConversas[conversaAtivaId].rotinaLocal;
let eventosMensaisEspecificos = bancoConversas[conversaAtivaId].eventosMensaisLocal;

// Inicializa a seleção com o dia numérico atual do sistema
let diaSelecionadoNum = new Date().getDate(); 
let diaSelecionadoSemana = "Seg";
let modoVisualizacao = "dia"; 

function escapeHtml(text) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

function addRow(role, htmlContent, isTyping = false) {
    const chatBox = document.getElementById("chat-box");
    if (!chatBox) return null;
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

function descobrirDiasAlvo(texto) {
    const textoMinusculo = texto.toLowerCase();
    let diasAlvo = [];

    if (textoMinusculo.includes("segunda") || textoMinusculo.includes("seg-")) diasAlvo.push("Seg");
    if (textoMinusculo.includes("terça") || textoMinusculo.includes("ter-")) diasAlvo.push("Ter");
    if (textoMinusculo.includes("quarta") || textoMinusculo.includes("qua-")) diasAlvo.push("Qua");
    if (textoMinusculo.includes("quinta") || textoMinusculo.includes("qui-")) diasAlvo.push("Qui");
    if (textoMinusculo.includes("sexta") || textoMinusculo.includes("sex-")) diasAlvo.push("Sex");
    if (textoMinusculo.includes("sábado") || textoMinusculo.includes("sabado") || textoMinusculo.includes("sáb-")) diasAlvo.push("Sáb");
    if (textoMinusculo.includes("domingo") || textoMinusculo.includes("dom-")) diasAlvo.push("Dom");

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

function extrairDadosTabela(textoIA) {
    const linhas = textoIA.split("\n");
    const regexHorario = /(\d{2}[:h]\d{2})/g;
    
    // Verifica se a IA usou a marcação exclusiva de data isolada (ex: "Dia: 25")
    let diaDoMesEspecifico = null;
    const matchDia = textoIA.match(/Dia\s*:\s*(\d{1,2})/i);
    if (matchDia) {
        diaDoMesEspecifico = parseInt(matchDia[1]);
    }

    let novasRotinasSemanais = {};
    let tarefasColetadas = [];
    let contextoDiasSemana = [diaSelecionadoSemana]; 
    let bufferDeTexto = ""; 

    linhas.forEach(linha => {
        const isTableRow = linha.includes("|") && !linha.includes("---");
        
        if (!linha.includes("|") && linha.trim() !== "") {
            bufferDeTexto += " " + linha;
        } else if (isTableRow) {
            if (bufferDeTexto.trim() !== "") {
                const diasDetectados = descobrirDiasAlvo(bufferDeTexto);
                if (diasDetectados.length > 0) {
                    contextoDiasSemana = diasDetectados; 
                }
                bufferDeTexto = ""; 
            }

            const colunas = linha.split("|").map(c => c.trim()).filter(c => c !== "");
            if (colunas.length >= 2) {
                const temHorario = colunas[0].match(regexHorario);
                if (temHorario && !colunas[0].toLowerCase().includes("horário")) {
                    const tarefa = {
                        horario: colunas[0],
                        atividade: colunas[1],
                        duracao: colunas[2] || ""
                    };
                    tarefasColetadas.push(tarefa);

                    if (!diaDoMesEspecifico) {
                        contextoDiasSemana.forEach(dia => {
                            if (!novasRotinasSemanais[dia]) novasRotinasSemanais[dia] = [];
                            novasRotinasSemanais[dia].push(tarefa);
                        });
                    }
                }
            }
        }
    });

    // Se for uma data isolada, aplica estritamente à gaveta do dia numérico
    if (diaDoMesEspecifico && tarefasColetadas.length > 0) {
        eventosMensaisEspecificos[diaDoMesEspecifico] = tarefasColetadas;
        diaSelecionadoNum = diaDoMesEspecifico;
    } else {
        // Se for rotina semanal padrão, atualiza os dias da semana correspondentes
        const diasAtualizados = Object.keys(novasRotinasSemanais);
        if (diasAtualizados.length > 0) {
            diasAtualizados.forEach(dia => {
                rotinaGlobal[dia] = novasRotinasSemanais[dia];
            });
            diaSelecionadoSemana = diasAtualizados[0];
            atualizarEstiloAbasSemana();
        }
    }
    
    renderizarCalendario();
}

function atualizarEstiloAbasSemana() {
    const botoes = document.querySelectorAll('.days-tabs .tab-btn');
    const diasSiglas = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    
    botoes.forEach((btn, index) => {
        if (diasSiglas[index] === diaSelecionadoSemana) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

async function enviarMensagem() {
    const inputField = document.getElementById("user-input");
    const sendBtn   = document.getElementById("send-btn");
    if (!inputField || !sendBtn) return;
    
    const perguntaOriginal = inputField.value.trim();
    if (!perguntaOriginal) return;

    addRow("user", escapeHtml(perguntaOriginal));
    historico.push({ role: "user", text: perguntaOriginal });
    inputField.value = "";
    sendBtn.disabled = true;
    
    const userId = localStorage.getItem("cyberplanner_user_id");
    
    fetch("/chat/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: parseInt(userId),
            role: "user",
            text: perguntaOriginal
        })
    }).catch(err => console.error("Erro ao salvar pergunta no banco:", err));

    addRow("model", '<div class="typing-dots"><span></span><span></span><span></span></div>', true);

    // Contexto de calendário injetado para orientar o Gemini
    const dataHoje = new Date();
    const contextoDataStr = `[Contexto: Hoje é ${dataHoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. O usuário está focado no Dia ${diaSelecionadoNum}]. `;
    const perguntaComContexto = contextoDataStr + perguntaOriginal;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pergunta: perguntaComContexto,
                historico: historico.slice(0, -1),
                modo: "gestor",
                visualizacao: modoVisualizacao
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
            
            fetch("/chat/salvar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: parseInt(userId),
                    role: "model",
                    text: data.resposta
                })
            }).catch(err => console.error("Erro ao salvar resposta no banco:", err));
            
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
    
    const appLayout = document.querySelector('.app-layout');
    if (modo === 'mes') {
        appLayout.classList.add('month-mode');
    } else {
        appLayout.classList.remove('month-mode');
    }
    renderizarCalendario();
}

function mudarDia(diaSigla, event) {
    diaSelecionadoSemana = diaSigla;
    
    // Mapeia de forma aproximada qual dia numérico corresponde ao clique na aba semanal
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const hoje = new Date();
    let diferenca = diasSemana.indexOf(diaSigla) - hoje.getDay();
    let dataAlvo = new Date(hoje);
    dataAlvo.setDate(hoje.getDate() + diferenca);
    diaSelecionadoNum = dataAlvo.getDate();

    const botoes = document.querySelectorAll('.days-tabs .tab-btn');
    botoes.forEach(btn => btn.classList.remove('active'));
    
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        atualizarEstiloAbasSemana();
    }
    renderizarCalendario();
}

function abrirDiaPeloMes(numeroDia, diaSemanaSigla) {
    diaSelecionadoNum = parseInt(numeroDia);
    diaSelecionadoSemana = diaSemanaSigla;
    atualizarEstiloAbasSemana();
    alternarVisualizacao('dia'); 
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
    // Mescla a rotina padrão daquele dia da semana com algum evento isolado agendado para aquela data numérica
    let eventosFixos = rotinaGlobal[diaSelecionadoSemana] || [];
    let eventosIsolados = eventosMensaisEspecificos[diaSelecionadoNum] || [];
    
    let eventosMesclados = [...eventosFixos, ...eventosIsolados];
    eventosMesclados.sort((a, b) => a.horario.localeCompare(b.horario));

    if (eventosMesclados.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma atividade mapeada para o Dia ${diaSelecionadoNum} (${diaSelecionadoSemana}).</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="calendar-timeline">
            ${eventosMesclados.map(evento => {
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
        const diaSemanaSigla = mapearDiaSemana(i);
        
        const tarefasFixas = rotinaGlobal[diaSemanaSigla] || [];
        const tarefasIsoladas = eventosMensaisEspecificos[i] || [];
        const todasDoDia = [...tarefasFixas, ...tarefasIsoladas];
        const temCompromisso = todasDoDia.length > 0;

        let previasHtml = "";
        if (temCompromisso) {
            previasHtml = todasDoDia.slice(0, 2).map(t => {
                return `<div class="month-event-pill" title="${t.horario} - ${t.atividade}">${t.atividade}</div>`;
            }).join('');
        }

        htmlDias += `
            <div class="month-day-cell ${temCompromisso ? 'has-event' : ''}" onclick="abrirDiaPeloMes(${i}, '${diaSemanaSigla}')">
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

function renderizarListaLateralCompleta() {
    const listaContainer = document.getElementById("lista-conversas");
    if (!listaContainer) return;
    listaContainer.innerHTML = "";

    Object.keys(bancoConversas).forEach(id => {
        const item = document.createElement("div");
        item.className = "conversa-item" + (id === conversaAtivaId ? " active" : "");
        item.textContent = bancoConversas[id].titulo;
        item.onclick = () => alternarEntreConversasSalvas(id);
        listaContainer.appendChild(item);
    });
}

function alternarEntreConversasSalvas(idAlvo) {
    if (!bancoConversas[idAlvo]) return;
    conversaAtivaId = idAlvo;

    historico = bancoConversas[conversaAtivaId].historicoLocal;
    rotinaGlobal = bancoConversas[conversaAtivaId].rotinaLocal;
    eventosMensaisEspecificos = bancoConversas[conversaAtivaId].eventosMensaisLocal;

    const chatBox = document.getElementById("chat-box");
    if (chatBox) {
        chatBox.innerHTML = "";
        if (historico.length === 0) {
            chatBox.innerHTML = `
                <div class="message-row">
                    <div class="avatar ai">CP</div>
                    <div class="bubble ai-msg">Olá! Sou o <strong>CyberPlanner</strong>. Como posso organizar sua rotina ou agendar novos eventos hoje?</div>
                </div>
            `;
        } else {
            historico.forEach(msg => {
                let conteudoHtml = msg.role === "model" ? marked.parse(msg.text) : escapeHtml(msg.text);
                addRow(msg.role === "user" ? "user" : "model", conteudoHtml);
            });
        }
    }
    renderizarListaLateralCompleta();
    renderizarCalendario();
}

function limparChatEmTela() {
    const novoChatId = "chat_" + Date.now();
    const numeroProximo = Object.keys(bancoConversas).length + 1;

    bancoConversas[novoChatId] = {
        titulo: `✨ Nova conversa (${numeroProximo})`,
        historicoLocal: [],
        rotinaLocal: { Seg: [], Ter: [], Qua: [], Qui: [], Sex: [], Sáb: [], Dom: [] },
        eventosMensaisLocal: {}
    };

    alternarEntreConversasSalvas(novoChatId);
}

async function carregarHistoricoDoBanco(userId) {
    try {
        const response = await fetch(`/chat/historico/${userId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.historico && data.historico.length > 0) {
                bancoConversas[conversaAtivaId].historicoLocal = [];
                bancoConversas[conversaAtivaId].rotinaLocal = { Seg: [], Ter: [], Qua: [], Qui: [], Sex: [], Sáb: [], Dom: [] };
                bancoConversas[conversaAtivaId].eventosMensaisLocal = {};
                
                historico = bancoConversas[conversaAtivaId].historicoLocal;
                rotinaGlobal = bancoConversas[conversaAtivaId].rotinaLocal;
                eventosMensaisEspecificos = bancoConversas[conversaAtivaId].eventosMensaisLocal;

                data.historico.forEach((msg) => {
                    historico.push({ role: msg.role, text: msg.text });
                    if (msg.role === "model") {
                        extrairDadosTabela(msg.text);
                    }
                });
                alternarEntreConversasSalvas(conversaAtivaId);
            }
        }
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const userId = localStorage.getItem("cyberplanner_user_id");
    if (userId) {
        carregarHistoricoDoBanco(userId);
    }
    
    const inputElement = document.getElementById("user-input");
    if (inputElement) {
        inputElement.addEventListener("keypress", function(e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviarMensagem();
            }
        });
    }
    atualizarEstiloAbasSemana();
    renderizarListaLateralCompleta();
});