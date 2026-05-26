if (!localStorage.getItem("cyberplanner_user_id")) {
    window.location.href = "/login";
}
const API_URL = "http://localhost:8000/chat";

// Estrutura única e simplificada (Sem múltiplos chats)
let historico = [];
let rotinaGlobal = { Seg: [], Ter: [], Qua: [], Qui: [], Sex: [], Sáb: [], Dom: [] };

// Controle focado exclusivamente no dia da semana ativo
let diaSelecionadoSemana = "Seg";

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

    let novasRotinasSemanais = {};
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

                    contextoDiasSemana.forEach(dia => {
                        if (!novasRotinasSemanais[dia]) novasRotinasSemanais[dia] = [];
                        novasRotinasSemanais[dia].push(tarefa);
                    });
                }
            }
        }
    });

    const diasAtualizados = Object.keys(novasRotinasSemanais);
    if (diasAtualizados.length > 0) {
        diasAtualizados.forEach(dia => {
            rotinaGlobal[dia] = novasRotinasSemanais[dia];
        });
        diaSelecionadoSemana = diasAtualizados[0];
        atualizarEstiloAbasSemana();
    }
    
    renderizarRotinaSemanal();
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

    const contextoDataStr = `[Contexto: O usuário está visualizando e editando a rotina de: ${diaSelecionadoSemana}]. `;
    const perguntaComContexto = contextoDataStr + perguntaOriginal;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pergunta: perguntaComContexto,
                historico: historico.slice(0, -1),
                modo: "gestor",
                visualizacao: "semana" 
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
        renderizarRotinaSemanal();
    }
}

function mudarDia(diaSigla, event) {
    diaSelecionadoSemana = diaSigla;

    const botoes = document.querySelectorAll('.days-tabs .tab-btn');
    botoes.forEach(btn => btn.classList.remove('active'));
    
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        atualizarEstiloAbasSemana();
    }
    renderizarRotinaSemanal();
}

function renderizarRotinaSemanal() {
    const container = document.getElementById('calendar-content-area');
    if (!container) return;

    let codingFixos = rotinaGlobal[diaSelecionadoSemana] || [];
    codingFixos.sort((a, b) => a.horario.localeCompare(b.horario));

    if (codingFixos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma atividade mapeada para ${diaSelecionadoSemana}.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="calendar-timeline">
            ${codingFixos.map(evento => {
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

async function carregarHistoricoDoBanco(userId) {
    try {
        const response = await fetch(`/chat/historico/${userId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.historico && data.historico.length > 0) {
                // Limpa os estados locais antes de repopular
                historico = [];
                rotinaGlobal = { Seg: [], Ter: [], Qua: [], Qui: [], Sex: [], Sáb: [], Dom: [] };

                const chatBox = document.getElementById("chat-box");
                if (chatBox) chatBox.innerHTML = "";

                data.historico.forEach((msg) => {
                    historico.push({ role: msg.role, text: msg.text });
                    
                    let conteudoHtml = msg.role === "model" ? marked.parse(msg.text) : escapeHtml(msg.text);
                    addRow(msg.role === "user" ? "user" : "model", conteudoHtml);

                    if (msg.role === "model") {
                        extrairDadosTabela(msg.text);
                    }
                });
            } else {
                // Caso não possua histórico no banco, exibe a mensagem de boas-vindas padrão
                const chatBox = document.getElementById("chat-box");
                if (chatBox) {
                    chatBox.innerHTML = `
                        <div class="message-row">
                            <div class="avatar ai">CP</div>
                            <div class="bubble ai-msg">Olá! Sou o <strong>CyberPlanner</strong>. Como posso organizar sua rotina semanal hoje?</div>
                        </div>
                    `;
                }
            }
        }
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
    }
    renderizarRotinaSemanal();
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

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", function() {
            // Limpa os dados do usuário salvos no navegador
            localStorage.removeItem("cyberplanner_user_id");
            localStorage.removeItem("cyberplanner_username");
            
            // Redireciona de volta para a tela de login
            window.location.href = "/login";
        });
    }
});