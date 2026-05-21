document.addEventListener("DOMContentLoaded", () => {
    // Se o utilizador já tiver um ID guardado, vai direto para o dashboard
    if (localStorage.getItem("cyberplanner_user_id")) {
        window.location.href = "/";
    }

    document.getElementById("btn-entrar").addEventListener("click", autenticar);
    document.getElementById("btn-cadastrar").addEventListener("click", registar);
});

async function autenticar() {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const erroTxt = document.getElementById("mensagem-erro");

    if (!user || !pass) {
        mostrarErro("Preenche todos os campos.");
        return;
    }

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: user, password: pass })
        });

        const data = await response.json();

        if (response.ok) {
            // CONTEXTO DE ESTADO: Guardamos as informações no browser
            localStorage.setItem("cyberplanner_user_id", data.user_id);
            localStorage.setItem("cyberplanner_username", data.username);
            
            // Redireciona para a página principal (dashboard)
            window.location.href = "/";
        } else {
            mostrarErro(data.detail || "Erro ao fazer login.");
        }
    } catch (error) {
        mostrarErro("Erro ao conectar ao servidor.");
    }
}

async function registar() {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    if (!user || !pass) {
        mostrarErro("Preenche os campos para fazer o cadastro.");
        return;
    }

    try {
        const response = await fetch("/cadastro", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: user, password: pass })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Cadastro realizado com sucesso! Agora clica em Entrar.");
            document.getElementById("mensagem-erro").style.display = "none";
        } else {
            mostrarErro(data.detail || "Erro ao fazer cadastro.");
        }
    } catch (error) {
        mostrarErro("Erro ao conectar ao servidor.");
    }
}

function mostrarErro(mensagem) {
    const erroTxt = document.getElementById("mensagem-erro");
    erroTxt.innerText = "⚠️ " + mensagem;
    erroTxt.style.display = "block";
}