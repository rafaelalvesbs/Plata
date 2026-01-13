window.Router.register('calendarioclm', async () => {
    let dataAtual = new Date();
    let paginaEvento = 0;
    const ITENS_POR_PAGINA = 4; // Mantido em 4 para caber na altura fixa
    const azulPadrao = "#003058";

    // Identificador único do aluno
    const getStorageKey = () => {
        const user = window.authMethods.getAuth().currentUser;
        return user ? `eventos_cal_${user.uid}` : 'eventos_cal_anonimo';
    };

    // --- LÓGICA DE DADOS ---
    const salvarEvento = (data, titulo) => {
        const key = getStorageKey();
        const eventos = JSON.parse(localStorage.getItem(key) || '[]');
        const hoje = new Date().setHours(0,0,0,0);
        const eventosAtivos = eventos.filter(e => new Date(e.data + 'T00:00:00') >= hoje);
        
        eventosAtivos.push({ data, titulo, id: Date.now() });
        localStorage.setItem(key, JSON.stringify(eventosAtivos));
        atualizarCalendarioCompleto();
    };

    // --- MODAL DE AGENDAMENTO / EDIÇÃO ---
    window.abrirAgendador = (dataSugestao = '', idEdicao = null) => {
        const data = dataSugestao || new Date().toISOString().split('T')[0];
        let tituloAtual = "";
        
        if (idEdicao) {
            const key = getStorageKey();
            const eventos = JSON.parse(localStorage.getItem(key) || '[]');
            const ev = eventos.find(e => e.id === idEdicao);
            if (ev) tituloAtual = ev.titulo;
        }

        const modalAddHTML = `
          <div id="modal-agendar-cal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,48,88,0.4); display:flex; justify-content:center; align-items:center; z-index:10000; padding:20px; backdrop-filter: blur(6px); animation: fadeInCal 0.2s ease;">
            <div style="background:white; padding:30px; border-radius:20px; max-width:400px; width:100%; box-shadow:0 20px 40px rgba(0,0,0,0.2); transform: scale(0.9); animation: scaleUpCal 0.2s forwards;">
              <div style="background:#e0f2fe; color:#0077cc; width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto; font-size:1.5rem;">
                <i class="fa-solid fa-calendar-plus"></i>
              </div>
              <h3 style="color:${azulPadrao}; margin:0 0 10px 0; font-size:1.2rem; font-weight:800; text-align:center;">${idEdicao ? 'Editar Compromisso' : 'Novo Compromisso'}</h3>
              <p style="color:#64748b; font-size:0.9rem; text-align:center; margin-bottom:20px;">Para o dia: ${data.split('-').reverse().join('/')}</p>
              
              <input type="text" id="input-titulo-cal" value="${tituloAtual}" placeholder="Ex: Estudar Gramática..." style="width:100%; padding:14px; border-radius:12px; border:2px solid #e2e8f0; margin-bottom:25px; outline:none; font-family:inherit; font-size:1rem; box-sizing:border-box;">
              
              <div style="display:flex; gap:12px;">
                <button onclick="document.getElementById('modal-agendar-cal').remove()" style="flex:1; padding:12px; background:#f1f5f9; color:#64748b; border:none; border-radius:12px; cursor:pointer; font-weight:700;">Cancelar</button>
                <button onclick="window.confirmarSalvamentoCal('${data}', ${idEdicao})" style="flex:1; padding:12px; background:${azulPadrao}; color:white; border:none; border-radius:12px; cursor:pointer; font-weight:700; box-shadow:0 4px 12px rgba(0,48,88,0.2);">Confirmar</button>
              </div>
            </div>
          </div>
          <style>
            #input-titulo-cal:focus { border-color: #004aad; }
            @keyframes fadeInCal { from { opacity: 0; } to { opacity: 1; } }
            @keyframes scaleUpCal { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          </style>`;
        document.body.insertAdjacentHTML('beforeend', modalAddHTML);
        setTimeout(() => document.getElementById('input-titulo-cal').focus(), 100);
    };

    window.confirmarSalvamentoCal = (data, idEdicao) => {
        const titulo = document.getElementById('input-titulo-cal').value.trim();
        if (!titulo) return;
        const key = getStorageKey();
        const eventos = JSON.parse(localStorage.getItem(key) || '[]');
        if (idEdicao) {
            const ev = eventos.find(e => e.id === idEdicao);
            if (ev) ev.titulo = titulo;
            localStorage.setItem(key, JSON.stringify(eventos));
        } else {
            salvarEvento(data, titulo);
        }
        document.getElementById('modal-agendar-cal').remove();
        atualizarCalendarioCompleto();
    };

    // --- MODAL DE EXCLUSÃO ---
    window.excluirEvento = (id) => {
        const modalConfirmHTML = `
          <div id="modal-confirm-cal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,48,88,0.4); display:flex; justify-content:center; align-items:center; z-index:10000; padding:20px; backdrop-filter: blur(6px); animation: fadeInCal 0.2s ease;">
            <div style="background:white; padding:30px; border-radius:20px; max-width:400px; width:100%; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.2); transform: scale(0.9); animation: scaleUpCal 0.2s forwards;">
              <div style="background:#fee2e2; color:#ef4444; width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto; font-size:1.5rem;">
                <i class="fa-solid fa-calendar-xmark"></i>
              </div>
              <h3 style="color:${azulPadrao}; margin:0 0 10px 0; font-size:1.2rem; font-weight:800;">Remover?</h3>
              <p style="color:#64748b; font-size:0.9rem; line-height:1.5; margin-bottom:25px;">Este compromisso será removido da sua agenda.</p>
              <div style="display:flex; gap:12px;">
                <button onclick="document.getElementById('modal-confirm-cal').remove()" style="flex:1; padding:12px; background:#f1f5f9; color:#64748b; border:none; border-radius:12px; cursor:pointer; font-weight:700;">Cancelar</button>
                <button onclick="window.executarExclusaoCal(${id})" style="flex:1; padding:12px; background:${azulPadrao}; color:white; border:none; border-radius:12px; cursor:pointer; font-weight:700;">Remover</button>
              </div>
            </div>
          </div>`;
        document.body.insertAdjacentHTML('beforeend', modalConfirmHTML);
    };

    window.executarExclusaoCal = (id) => {
        const key = getStorageKey();
        const eventos = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify(eventos.filter(e => e.id !== id)));
        document.getElementById('modal-confirm-cal').remove();
        atualizarCalendarioCompleto();
    };

    window.navegarMes = (direcao) => {
        dataAtual.setMonth(dataAtual.getMonth() + direcao);
        atualizarCalendarioCompleto();
    };

    window.mudarPaginaEvento = (direcao) => {
        paginaEvento += direcao;
        renderizarListaEventos();
    };

    const renderizarListaEventos = () => {
        const container = document.getElementById('lista-eventos-dinamica');
        const paginacao = document.getElementById('paginacao-eventos');
        const indicador = document.getElementById('indicador-paginas');
        if (!container || !paginacao) return;

        const key = getStorageKey();
        const eventos = JSON.parse(localStorage.getItem(key) || '[]');
        const hoje = new Date().setHours(0,0,0,0);
        const futuros = eventos
            .filter(e => new Date(e.data + 'T00:00:00') >= hoje)
            .sort((a, b) => new Date(a.data + 'T00:00:00') - new Date(b.data + 'T00:00:00'));
        
        const totalPaginas = Math.ceil(futuros.length / ITENS_POR_PAGINA);
        if (paginaEvento >= totalPaginas && totalPaginas > 0) paginaEvento = totalPaginas - 1;
        if (paginaEvento < 0) paginaEvento = 0;

        paginacao.style.display = futuros.length > ITENS_POR_PAGINA ? 'flex' : 'none';
        if (indicador) indicador.innerText = `${paginaEvento + 1} / ${totalPaginas}`;
        
        const exibidos = futuros.slice(paginaEvento * ITENS_POR_PAGINA, (paginaEvento * ITENS_POR_PAGINA) + ITENS_POR_PAGINA);
        
        if (exibidos.length === 0) {
            container.innerHTML = '<p style="font-size:0.8rem; color:#64748b; text-align:center; padding: 20px;">Nenhum evento agendado.</p>';
            return;
        }
        
        container.innerHTML = exibidos.map(ev => {
            const [ano, mes, dia] = ev.data.split('-');
            const d = new Date(ano, mes - 1, dia);
            const mesNome = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            return `
                <div style="border-left: 4px solid #004aad; padding: 12px; background: #f8fafc; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.02); height: 65px; box-sizing: border-box;">
                    <div style="overflow: hidden;">
                        <p style="font-weight: 700; font-size: 0.85rem; color: ${azulPadrao}; margin:0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ev.titulo}</p>
                        <p style="font-size: 0.7rem; color: #64748b; margin:0; text-transform: uppercase; font-weight:600;">${dia} ${mesNome}</p>
                    </div>
                    <div style="display: flex; gap: 12px; flex-shrink: 0;">
                        <i class="fa-solid fa-pen" onclick="window.abrirAgendador('${ev.data}', ${ev.id})" style="cursor:pointer; color: #94a3b8; font-size:0.8rem;"></i>
                        <i class="fa-solid fa-trash" onclick="window.excluirEvento(${ev.id})" style="cursor:pointer; color: #ef4444; font-size:0.8rem;"></i>
                    </div>
                </div>`;
        }).join('');
    };

    const montarCelula = (ano, mes, dia, eventos, hoje) => {
        const dataISO = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const dataComp = new Date(ano, mes, dia).getTime();
        const temEvento = eventos.some(e => e.data === dataISO);
        const isToday = dataComp === hoje;
        const isPast = dataComp < hoje;

        const estilo = `
            padding: 15px; 
            font-weight: 700; 
            cursor: ${isPast ? 'default' : 'pointer'};
            position: relative;
            font-size: 0.9rem;
            transition: 0.2s;
            ${isToday ? `background: #004aad; color: white; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,74,173,0.3);` : `color: ${azulPadrao};`}
            ${isPast ? 'opacity: 0.2; font-weight: 400;' : ''}
        `;

        return `
            <td style="${estilo}" onclick="${isPast ? '' : `window.abrirAgendador('${dataISO}')`}">
                ${dia}
                ${temEvento && !isToday ? `<div style="width:5px; height:5px; background:#004aad; border-radius:50%; position:absolute; bottom:8px; left:50%; transform:translateX(-50%);"></div>` : ''}
            </td>
        `;
    };

    const renderizarDias = () => {
        const elGrid = document.getElementById('corpo-calendario');
        if (!elGrid) return;
        const ano = dataAtual.getFullYear();
        const mes = dataAtual.getMonth();
        const primeiroDiaMes = new Date(ano, mes, 1).getDay();
        const diasNoMes = new Date(ano, mes + 1, 0).getDate();
        const key = getStorageKey();
        const eventos = JSON.parse(localStorage.getItem(key) || '[]');
        const hojeSemHora = new Date().setHours(0,0,0,0);

        let html = '<tr>';
        let diaContador = 1;
        for (let i = 0; i < 7; i++) {
            if (i < primeiroDiaMes) { html += `<td style="padding: 15px;"></td>`; }
            else { html += montarCelula(ano, mes, diaContador, eventos, hojeSemHora); diaContador++; }
        }
        html += '</tr>';
        while (diaContador <= diasNoMes) {
            html += '<tr>';
            for (let i = 0; i < 7; i++) {
                if (diaContador <= diasNoMes) { html += montarCelula(ano, mes, diaContador, eventos, hojeSemHora); diaContador++; }
                else { html += `<td></td>`; }
            }
            html += '</tr>';
        }
        elGrid.innerHTML = html;
    };

    const atualizarCalendarioCompleto = () => {
        const nomeMesAno = dataAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const elTitulo = document.getElementById('titulo-mes-ano');
        if (elTitulo) elTitulo.innerText = nomeMesAno;
        renderizarDias();
        renderizarListaEventos();
    };

    setTimeout(atualizarCalendarioCompleto, 200);

    return `
    <style>
      .cal-main-container { width: 100%; box-sizing: border-box; font-family: 'Inter', sans-serif; }
      .cal-header-responsive { margin-bottom: 20px; }
      .cal-header-responsive h1 { font-size: clamp(1.3rem, 4vw, 1.8rem); color: ${azulPadrao}; font-weight: 800; margin: 0; }
      .cal-header-responsive p { font-size: 0.85rem; color: #64748b; margin-top: 5px; }

      .cal-layout-grid { 
        display: grid; 
        grid-template-columns: 1fr 350px; 
        gap: 20px; 
        width: 100%; 
      }

      .cal-card-unified { 
        background: white; 
        border-radius: 20px; 
        padding: clamp(15px, 3vw, 25px); 
        border: 1px solid #f1f5f9; 
        box-shadow: 0 10px 25px rgba(0,0,0,0.03); 
        box-sizing: border-box;
      }

      .cal-table-responsive { width: 100%; border-collapse: separate; border-spacing: 0 2px; text-align: center; }
      .cal-table-responsive th { padding: 8px; color: #94a3b8; font-size: 0.7rem; text-transform: uppercase; font-weight: 800; }
      #corpo-calendario td { padding: clamp(8px, 2vw, 15px) !important; }

      @media (max-width: 1000px) {
        .cal-layout-grid { grid-template-columns: 1fr; }
        .side-panel-eventos { width: 100% !important; height: auto !important; min-height: 400px; }
      }

      @media (max-width: 480px) {
        .cal-table-responsive th { font-size: 0.6rem; padding: 4px; }
        #corpo-calendario td { font-size: 0.8rem; }
      }
    </style>

    <div class="cal-main-container">
        <div class="cal-header-responsive">
            <h1>CALENDÁRIO</h1>
            <p>Agende seus compromissos e organize sua rotina.</p>
        </div>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0 25px 0;">

        <div class="cal-layout-grid">
            <div class="cal-card-unified">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 id="titulo-mes-ano" style="color: ${azulPadrao}; text-transform: capitalize; margin:0; font-size: 1.2rem; font-weight: 800;">Carregando...</h2>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.navegarMes(-1)" style="width: 38px; height: 38px; background: #f1f5f9; color: ${azulPadrao}; border:none; cursor:pointer; border-radius:10px;"><i class="fa-solid fa-chevron-left"></i></button>
                        <button onclick="window.navegarMes(1)" style="width: 38px; height: 38px; background: #f1f5f9; color: ${azulPadrao}; border:none; cursor:pointer; border-radius:10px;"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                </div>
                <table class="cal-table-responsive">
                    <thead>
                        <tr><th>Dom</th><th>Seg</th><th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th></tr>
                    </thead>
                    <tbody id="corpo-calendario"></tbody>
                </table>
            </div>

            <div class="cal-card-unified side-panel-eventos" style="display: flex; flex-direction: column; height: 480px;">
                <h3 style="color: ${azulPadrao}; font-size: 0.9rem; margin: 0 0 20px 0; font-weight: 800; text-transform: uppercase; display: flex; align-items: center; border-bottom: 2px solid #f8fafc; padding-bottom: 12px;">
                    <div style="width: 6px; height: 16px; background: #004aad; border-radius: 3px; margin-right: 10px;"></div>
                    Meus Eventos
                </h3>
                <div id="lista-eventos-dinamica" style="flex: 1; overflow-y: auto;"></div>
                <div id="paginacao-eventos" style="display: none; justify-content: space-between; align-items: center; margin-top: 15px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
                    <button onclick="window.mudarPaginaEvento(-1)" style="width:32px; height:32px; border-radius:50%; border:1px solid #e2e8f0; background:white; color:${azulPadrao}; cursor:pointer;"><i class="fa-solid fa-chevron-left"></i></button>
                    <span id="indicador-paginas" style="font-size: 0.7rem; font-weight: 800; color: #64748b;">1 / 1</span>
                    <button onclick="window.mudarPaginaEvento(1)" style="width:32px; height:32px; border-radius:50%; border:1px solid #e2e8f0; background:white; color:${azulPadrao}; cursor:pointer;"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
        </div>
    </div>
    `;
});
