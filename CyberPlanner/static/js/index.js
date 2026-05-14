// URL base da API — altere aqui se mudar a porta ou o host
const API_URL = "http://localhost:8000/chat";

 // Histórico da conversa mantido no frontend
const historico = [];

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

 async function enviarMensagem() {
    const inputField = document.getElementById("user-input");
    const sendBtn   = document.getElementById("send-btn");
    const pergunta  = inputField.value.trim();
    if (!pergunta) return;

     // Exibe a mensagem do usuário (escapada para evitar XSS)
    addRow("user", escapeHtml(pergunta));
    historico.push({ role: "user", text: pergunta });
    inputField.value = "";
    sendBtn.disabled = true;

     // Indicador de digitação
    addRow("model", '<div class="typing-dots"><span></span><span></span><span></span></div>', true);

     try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pergunta: pergunta,
                historico: historico.slice(0, -1), // envia histórico anterior (sem a pergunta atual)
                modo: "gestor"
            })
        });

         const data = await response.json();

         // Remove o indicador de digitação
        const typingRow = document.getElementById("typing-row");
        if (typingRow) typingRow.remove();

         if (!response.ok) {
            addRow("model", `<span class="error-msg">Erro ${response.status}: ${escapeHtml(data.detail || "Erro desconhecido")}</span>`);
            historico.pop();
        } else {
            const respostaHtml = marked.parse(data.resposta);
            addRow("model", respostaHtml);
            historico.push({ role: "model", text: data.resposta });
        }

     } catch (err) {
        const typingRow = document.getElementById("typing-row");
        if (typingRow) typingRow.remove();
        addRow("model", '<span class="error-msg">Não foi possível conectar ao servidor. Verifique se o Uvicorn está rodando com <code>uvicorn main:app --reload</code></span>');
        historico.pop();
    }

     sendBtn.disabled = false;
    inputField.focus();
}

 document.getElementById("user-input").addEventListener("keypress", function(e) {
    if (e.key === "Enter" && !e.shiftKey) enviarMensagem();
});