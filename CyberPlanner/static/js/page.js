if (!localStorage.getItem("cyberplanner_user_id")) {
    // Se não houver dados de login salvos, expulsa o utilizador para a página de login
    window.location.href = "/login";
}
const API_URL = "http://localhost:8000/chat";

// --- CONTROLE DE MÚLTIPLAS CONVERSAS EM MEMÓRIA (ESTILO GEMINI) ---
const bancoConversas = {}; 
let conversaAtivaId = "chat_inicial";

// Inicializa a primeira conversa padrão do sistema (fallback temporário)
bancoConversas[conversaAtivaId] = {
    titulo: "✨ Conversa Atual",
    historicoLocal: [], 
    rotinaLocal: { Seg: [], Ter: [], Qua: [], Qui: [], Sex: [], Sáb: [], Dom: [] }
};

// Referências dinâmicas globais
let historico = bancoConversas[conversaAtivaId].historicoLocal;
let rotinaGlobal = bancoConversas[conversaAtivaId].rotinaLocal;

let diaSelecionado = "Seg";
let modoVisualizacao = "dia"; // "dia" ou "mes"

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

// Analisador Inteligente de Dias
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

// Leitor de Contexto da Tabela
function extrairDadosTabela(textoIA) {
    const linhas = textoIA.split("\n");
    const regexHorario = /(\d{2}[:h]\d{2})/g;
    
    let novasRotinas = {};
    let contextoDias = [diaSelecionado]; 
    let bufferDeTexto = ""; 

    linhas.forEach(linha => {
        const isTableRow = linha.includes("|") && !linha.includes("---");
        
        if (!linha.includes("|") && linha.trim() !== "") {
            bufferDeTexto += " " + linha;
        } else if (isTableRow) {
            if (bufferDeTexto.trim() !== "") {
                const diasDetectados = descobrirDiasAlvo(bufferDeTexto);
                if (diasDetectados.length > 0) {
                    contextoDias = diasDetectados; 
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
                    
                    contextoDias.forEach(dia => {
                        if (!novasRotinas[dia]) novasRotinas[dia] = [];
                        novasRotinas[dia].push(tarefa);
                    });
                }
            }
        }
    });

    const diasAtualizados = Object.keys(novasRotinas);
    if (diasAtualizados.length > 0) {
        diasAtualizados.forEach(dia => {
            rotinaGlobal[dia] = novasRotinas[dia];
        });
        
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
    if (!inputField || !sendBtn) return;
    
    const pergunta  = inputField.value.trim();
    if (!pergunta) return;

    const idConversaAtual = conversaAtivaId;

    if (bancoConversas[idConversaAtual].titulo === "✨ Conversa Atual" || bancoConversas[idConversaAtual].titulo.startsWith("✨ Nova conversa")) {
        bancoConversas[idConversaAtual].titulo = `💬 ${pergunta.substring(0, 22)}${pergunta.length > 22 ? '...' : ''}`;
        renderizarListaLateralCompleta();
    }

    addRow("user", escapeHtml(pergunta));
    historico.push({ role: "user", text: pergunta });
    inputField.value = "";
    sendBtn.disabled = true;
    
    const userId = localStorage.getItem("cyberplanner_user_id");
    
    // Tenta salvar enviando o chat_id (se o banco aceitar, ótimo. Se ignorar, nossa trava do loader resolve)
    fetch("/chat/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: parseInt(userId),
            chat_id: idConversaAtual, 
            role: "user",
            text: pergunta
        })
    }).catch(err => console.error("Erro ao salvar pergunta no banco:", err));

    addRow("model", '<div class="typing-dots"><span></span><span></span><span></span></div>', true);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pergunta: pergunta,
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
                    chat_id: idConversaAtual,
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

function abrirDiaPeloMes(dia) {
    mudarDia(dia); 
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

// ── RECONSTRUTOR E DIVISOR INTELIGENTE DE CHATS DO BANCO ──
async function carregarHistoricoDoBanco(userId) {
    try {
        const response = await fetch(`/chat/historico/${userId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.historico && data.historico.length > 0) {
                
                // Reseta a lista local em memória
                for (let key in bancoConversas) delete bancoConversas[key];

                let idChatAtual = null;
                let contadorChats = 0;

                data.historico.forEach((msg) => {
                    const texto = msg.text.toLowerCase().trim();
                    
                    // 🧠 CRITÉRIO DE QUEBRA: Cria um chat se vier um ID explícito do banco OU 
                    // se for um registro antigo linear onde o usuário dá saudações/gatilhos clássicos.
                    const ehNovoGatilho = texto.startsWith("olá") || 
                                          texto.startsWith("oi") || 
                                          texto.startsWith("bom dia") || 
                                          texto.includes("nova sessão") || 
                                          texto.includes("limpar rotina") ||
                                          texto.includes("criar novo chat");

                    // Força quebra de chat se a mensagem anterior foi da IA e a atual do usuário for um gatilho/início
                    if (msg.role === "user" && (idChatAtual === null || ehNovoGatilho)) {
                        contadorChats++;
                        idChatAtual = msg.chat_id || "chat_recuperado_" + contadorChats;
                        
                        bancoConversas[idChatAtual] = {
                            titulo: `💬 ${msg.text.substring(0, 20)}${msg.text.length > 20 ? '...' : ''}`,
                            historicoLocal: [],
                            rotinaLocal: { Seg: [], Ter: [], Qua: [], Qui: [], Sex: [], Sáb: [], Dom: [] }
                        };
                    }

                    // Fallback para não quebrar a aplicação caso a primeira mensagem venha sem classificação
                    if (!idChatAtual) {
                        contadorChats++;
                        idChatAtual = "chat_recuperado_" + contadorChats;
                        bancoConversas[idChatAtual] = {
                            titulo: "💬 Conversa Antiga",
                            historicoLocal: [],
                            rotinaLocal: { Seg: [], Ter: [], Qua: [], Qui: [], Sex: [], Sáb: [], Dom: [] }
                        };
                    }

                    // Aloca a mensagem na gaveta correta dela
                    bancoConversas[idChatAtual].historicoLocal.push({ role: msg.role, text: msg.text });
                });

                // Deixa focado por padrão no último chat do histórico (o mais recente)
                const chavesCarregadas = Object.keys(bancoConversas);
                if (chavesCarregadas.length > 0) {
                    conversaAtivaId = chavesCarregadas[chavesCarregadas.length - 1];
                }

                // Reconstrói as tabelas de cada chat no calendário correspondente de cada gaveta
                chavesCarregadas.forEach(id => {
                    rotinaGlobal = bancoConversas[id].rotinaLocal;
                    bancoConversas[id].historicoLocal.forEach(msg => {
                        if (msg.role === "model") {
                            extrairDadosTabela(msg.text);
                        }
                    });
                });

                // Carrega visualmente o chat ativo
                alternarEntreConversasSalvas(conversaAtivaId);
            }
        }
    } catch (error) {
        console.error("Erro ao carregar histórico do banco:", error);
    }
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

document.addEventListener("DOMContentLoaded", () => {
    const userId = localStorage.getItem("cyberplanner_user_id");
    if (userId) {
        carregarHistoricoDoBanco(userId);
    }
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            fazerLogout();
        });
    }
    renderizarListaLateralCompleta();
});

function fazerLogout() {
    localStorage.removeItem("cyberplanner_user_id");
    localStorage.removeItem("cyberplanner_username");
    window.location.href = "/login";
}

function renderizarListaLateralCompleta() {
    const listaContainer = document.getElementById("lista-conversas");
    if (!listaContainer) return;
    
    listaContainer.innerHTML = ""; 

    Object.keys(bancoConversas).forEach(id => {
        const conversa = bancoConversas[id];
        const isActive = (id === conversaAtivaId) ? "active" : "";

        const item = document.createElement("div");
        item.className = `conversa-item ${isActive}`;
        item.innerHTML = conversa.titulo;
        item.onclick = () => alternarEntreConversasSalvas(id);
        
        listaContainer.appendChild(item);
    });
}

function alternarEntreConversasSalvas(idConvs) {
    if (!bancoConversas[idConvs]) return;

    conversaAtivaId = idConvs;
    
    // Vincula os ponteiros globais à estrutura interna do chat selecionado
    historico = bancoConversas[idConvs].historicoLocal;
    rotinaGlobal = bancoConversas[idConvs].rotinaLocal;

    const chatBox = document.getElementById("chat-box");
    if (!chatBox) return;
    chatBox.innerHTML = "";

    if (historico.length === 0) {
        chatBox.innerHTML = `
            <div class="message-row">
                <div class="avatar ai">CP</div>
                <div class="bubble ai-msg">Olá! Sou o <strong>CyberPlanner</strong>, seu gestor de rotina inteligente. Me conte seus compromissos, horários e preferências — vou organizar tudo sem conflitos e gerar sua tabela de rotina.</div>
            </div>
        `;
    } else {
        historico.forEach(msg => {
            let conteudoHtml = msg.role === "model" ? marked.parse(msg.text) : escapeHtml(msg.text);
            addRow(msg.role === "user" ? "user" : "model", conteudoHtml);
        });
    }

    renderizarListaLateralCompleta();
    renderizarCalendario();
}

// Executado ao clicar no botão "📝" da interface lateral
function limparChatEmTela() {
    // Cria um ID exclusivo temporal à prova de repetições
    const novoChatId = "chat_" + Date.now();
    const numeroProximo = Object.keys(bancoConversas).length + 1;

    bancoConversas[novoChatId] = {
        titulo: `✨ Nova conversa (${numeroProximo})`,
        historicoLocal: [],
        rotinaLocal: { Seg: [], Ter: [], Qua: [], Qui: [], Sex: [], Sáb: [], Dom: [] }
    };

    alternarEntreConversasSalvas(novoChatId);
}

// Configuração do gatilho para a tecla Enter no input principal
document.addEventListener("DOMContentLoaded", () => {
    const inputElement = document.getElementById("user-input");
    if (inputElement) {
        inputElement.addEventListener("keypress", function(e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviarMensagem();
            }
        });
    }
});