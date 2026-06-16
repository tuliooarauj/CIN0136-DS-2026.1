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

const calendar = document.getElementById("calendar");
const monthYear = document.getElementById("monthYear");

let eventos = [];
let currentDate = new Date();

async function carregarEventos() {

    try {

        const userId = localStorage.getItem(
            "cyberplanner_user_id"
        );

        if (!userId) {
            console.log("Usuário não encontrado");
            return;
        }

        const resposta = await fetch(
            `/eventos/${userId}`
        );

        eventos = await resposta.json();

        console.log(
            "Eventos carregados:",
            eventos
        );
    } catch (erro) {

        console.error(
            "Erro ao carregar eventos",
            erro
        );

        eventos = [];
    }
}

async function renderCalendar() {

    await carregarEventos();

    calendar.innerHTML = "";
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstWeekDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const monthNames = [
        "Janeiro","Fevereiro","Março","Abril",
        "Maio","Junho","Julho","Agosto",
        "Setembro","Outubro","Novembro","Dezembro"
    ];

    monthYear.innerText =
        `${monthNames[month]} ${year}`;

    for(let i=0; i<firstWeekDay; i++) {
        const empty = document.createElement("div");
        calendar.appendChild(empty);
    }

    for(let day=1; day<=totalDays; day++) {

        const cell = document.createElement("div");
        cell.classList.add("day");

        const today = new Date();

        if(
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ){
            cell.classList.add("today");
        }

        const eventosDia =
            eventosDoDia(day, month, year);

        let htmlEventos = "";

        eventosDia.forEach(evento => {

            htmlEventos += `
                <div class="event">
                    ${evento.titulo}
                </div>
                 `;
        });

        cell.innerHTML = `
            <div class="day-number">
             ${day}
            </div>

            ${htmlEventos}
        `;

        calendar.appendChild(cell);
    }
}

document
.getElementById("prevMonth")
.addEventListener("click", () => {
    currentDate.setMonth(
        currentDate.getMonth() - 1
    );
    renderCalendar();
});

document
.getElementById("nextMonth")
.addEventListener("click", () => {
    currentDate.setMonth(
        currentDate.getMonth() + 1
    );
    renderCalendar();
});

window.addEventListener("load", async () => {
    await renderCalendar();
});

function eventosDoDia(dia, mes, ano) {

    const dataAtual =
        new Date(ano, mes, dia);

    const diasSemana = [
        "Dom",
        "Seg",
        "Ter",
        "Qua",
        "Qui",
        "Sex",
        "Sáb"
    ];

    const diaAtual =
        diasSemana[dataAtual.getDay()];

    return eventos.filter(evento => {

        const textoEvento =
            `${evento.titulo} ${evento.descricao}`;

        const diasAlvo =
            descobrirDiasAlvo(textoEvento);

        return diasAlvo.includes(
            diaAtual
        );

    });

}