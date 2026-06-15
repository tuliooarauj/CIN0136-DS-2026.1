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

    return eventos.filter(evento => {

        const data = new Date(
            evento.data_inicio
        );

        return (
            data.getDate() === dia &&
            data.getMonth() === mes &&
            data.getFullYear() === ano
        );

    });
}