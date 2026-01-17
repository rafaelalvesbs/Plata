window.Router.register('auditivaalunoclm', async () => {
    const db = window.db;
    const { collection, getDocs, query, where, addDoc, serverTimestamp, getDoc, doc } = window.fsMethods;
    const auth = window.authMethods.getAuth();

    let atividadesRecebidas = [];
    let atividadesEnviadas = [];
    let atividadeSelecionada = null;
    let respostasAluno = {};
    let dadosTurmaAluno = null;
    let modoVisualizacao = false;
    let tempoInicio = null;
    let intervaloCronometro = null;
    let questaoAtualIndex = 0;

    let paginaAtualRecebidas = 1;
    let paginaAtualEnviadas = 1;
    const itensPorPagina = 6;

    // Bloqueios de segurança
    const bloquearAcoes = (e) => { e.preventDefault(); return false; };
    document.addEventListener('copy', bloquearAcoes);
    document.addEventListener('paste', bloquearAcoes);
    document.addEventListener('contextmenu', bloquearAcoes);
    document.addEventListener('selectstart', bloquearAcoes);

    const buscarDadosContexto = async () => {
        const userRef = auth.currentUser;
        if (!userRef) return;
        try {
            const alunoDoc = await getDoc(doc(db, "usuarios", userRef.uid));
            if (alunoDoc.exists()) {
                const dadosUser = alunoDoc.data();
                const qTurma = query(collection(db, "turmas"), where("senha", "==", dadosUser.turma));
                const snapTurma = await getDocs(qTurma);
                if (!snapTurma.empty) {
                    const dadosT = snapTurma.docs[0].data();
                    dadosTurmaAluno = { alunoId: userRef.uid, semestre: dadosT.semestre };
                    window.switchTabAudAluno('recebidas');
                }
            }
        } catch (e) { console.error("Erro:", e); }
    };

    window.confirmarAcaoAud = (mensagem, callback) => {
        const modal = document.getElementById('modal-confirma-aud');
        document.getElementById('msg-confirma-aud').innerText = mensagem;
        modal.style.display = 'flex';
        window.cbAud = () => { modal.style.display = 'none'; callback(); };
    };

    window.voltarParaListaAud = () => {
        if (modoVisualizacao) executarSaidaAud();
        else window.confirmarAcaoAud("Deseja sair? Seu progresso será perdido.", executarSaidaAud);
    };

    const executarSaidaAud = () => {
        if (intervaloCronometro) clearInterval(intervaloCronometro);
        document.getElementById('view-resolver-aud').style.display = 'none';
        document.getElementById('main-view-aud').style.display = 'block';
        if (modoVisualizacao) carregarEnviadasAud(); else carregarRecebidasAud();
    };

    window.switchTabAudAluno = async (tab) => {
        document.querySelectorAll('.tab-btn-aud').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-aud-tab-${tab}`).classList.add('active');
        document.getElementById('pane-aud-recebidas').style.display = tab === 'recebidas' ? 'block' : 'none';
        document.getElementById('pane-aud-enviadas').style.display = tab === 'enviadas' ? 'block' : 'none';
        if (tab === 'recebidas') carregarRecebidasAud(); else carregarEnviadasAud();
    };

    const carregarRecebidasAud = async () => {
        const container = document.getElementById('lista-aud-recebidas');
        container.innerHTML = '<div class="loader-aud"><div class="spinner-aud"></div></div>';
        try {
            const qAtv = query(collection(db, "atividades_enviadas"), where("semestre", "==", dadosTurmaAluno.semestre), where("tipo", "==", "auditiva"));
            const snapAtv = await getDocs(qAtv);
            const qResp = query(collection(db, "respostas_alunos"), where("alunoId", "==", dadosTurmaAluno.alunoId));
            const snapResp = await getDocs(qResp);
            const respondidasIds = snapResp.docs.map(d => d.data().atividadeId);
            atividadesRecebidas = snapAtv.docs.map(d => ({ id: d.id, ...d.data() })).filter(atv => !respondidasIds.includes(atv.id));
            exibirCardsRecebidasAud();
        } catch (e) { container.innerHTML = '<div class="empty-aud">Erro ao carregar.</div>'; }
    };

    const exibirCardsRecebidasAud = () => {
        const container = document.getElementById('lista-aud-recebidas');
        const inicio = (paginaAtualRecebidas - 1) * itensPorPagina;
        const itens = atividadesRecebidas.slice(inicio, inicio + itensPorPagina);
        container.innerHTML = itens.length ? itens.map(atv => `
            <div class="card-aud-list" onclick="window.prepararInicioAud('${atv.id}')">
                <div style="flex:1">
                    <h3 class="titulo-aud-card">${atv.titulo}</h3>
                    <div class="sub-aud-card"><span><i class="fa-solid fa-calendar"></i> Semestre: ${atv.semestre}</span></div>
                </div>
                <i class="fa-solid fa-chevron-right" style="color:#003058"></i>
            </div>`).join('') : '<div class="empty-aud">Nenhuma atividade pendente.</div>';
    };

    const carregarEnviadasAud = async () => {
        const container = document.getElementById('lista-aud-enviadas');
        container.innerHTML = '<div class="loader-aud"><div class="spinner-aud"></div></div>';
        try {
            const q = query(collection(db, "respostas_alunos"), where("alunoId", "==", dadosTurmaAluno.alunoId));
            const snap = await getDocs(q);
            atividadesEnviadas = [];
            for(let d of snap.docs) {
                const data = d.data();
                if(data.tipoAtividade === 'auditiva' || !data.tipoAtividade){ // Filtro básico se houver campo tipo
                   const ref = await getDoc(doc(db, "atividades_enviadas", data.atividadeId));
                   if(ref.exists() && ref.data().tipo === 'auditiva') {
                       atividadesEnviadas.push({ ...data, idResp: d.id, dadosOriginais: ref.data() });
                   }
                }
            }
            exibirCardsEnviadasAud();
        } catch (e) { container.innerHTML = '<div class="empty-aud">Erro ao carregar histórico.</div>'; }
    };

    const exibirCardsEnviadasAud = () => {
        const container = document.getElementById('lista-aud-enviadas');
        const itens = atividadesEnviadas.slice((paginaAtualEnviadas-1)*itensPorPagina, paginaAtualEnviadas*itensPorPagina);
        container.innerHTML = itens.length ? itens.map(atv => `
            <div class="card-aud-list enviada">
                <div style="flex:1">
                    <h3 class="titulo-aud-card">${atv.titulo}</h3>
                    <div class="sub-aud-card"><span>Nota: ${atv.nota}</span> | <span><i class="fa-regular fa-clock"></i> ${window.fmtTempoAud(atv.tempoGasto)}</span></div>
                </div>
                <button class="btn-revisar-aud" onclick="window.revisarAud('${atv.idResp}')"><i class="fa-solid fa-eye"></i></button>
            </div>`).join('') : '<div class="empty-aud">Sem histórico.</div>';
    };

    window.fmtTempoAud = (s) => {
        const m = Math.floor(s/60); const seg = s%60;
        return `${m.toString().padStart(2,'0')}:${seg.toString().padStart(2,'0')}`;
    };

    window.prepararInicioAud = (id) => {
        atividadeSelecionada = atividadesRecebidas.find(a => a.id === id);
        document.getElementById('modal-aviso-aud').style.display = 'flex';
    };

    window.iniciarAudDeVez = () => {
        document.getElementById('modal-aviso-aud').style.display = 'none';
        respostasAluno = {}; modoVisualizacao = false; tempoInicio = Date.now();
        document.getElementById('main-view-aud').style.display = 'none';
        document.getElementById('view-resolver-aud').style.display = 'block';
        document.getElementById('titulo-aud-header').innerText = atividadeSelecionada.titulo;
        
        if (intervaloCronometro) clearInterval(intervaloCronometro);
        intervaloCronometro = setInterval(() => {
            const dec = Math.floor((Date.now() - tempoInicio) / 1000);
            document.getElementById('tempo-aud-box').innerText = window.fmtTempoAud(dec);
        }, 1000);

        window.irParaQuestaoAud(0);
    };

    window.irParaQuestaoAud = (idx) => {
        questaoAtualIndex = idx;
        const q = atividadeSelecionada.questoes[idx];
        
        // Navegação de pílulas (Igual gramática)
        const navHtml = atividadeSelecionada.questoes.map((_, i) => `
            <button onclick="window.irParaQuestaoAud(${i})" class="pill-aud ${i === idx ? 'active' : ''} ${respostasAluno[i] ? 'done' : ''}">${i + 1}</button>
        `).join('');
        document.getElementById('nav-aud-pills').innerHTML = navHtml;

        document.getElementById('render-aud-body').innerHTML = `
            <div class="audio-container-aud">
                <audio controls src="${atividadeSelecionada.audioBase64}" style="width:100%"></audio>
            </div>
            <div class="enunciado-aud-box">${q.enunciado}</div>
            <div class="corpo-aud-flex">
                <div class="opcoes-aud-lista">
                    ${['A', 'B', 'C'].map(l => {
                        let cl = '';
                        if(modoVisualizacao){
                            if(l === q.correta) cl = 'correta';
                            if(respostasAluno[idx] === l && l !== q.correta) cl = 'errada';
                        } else if(respostasAluno[idx] === l) cl = 'selected';
                        return `<div class="opt-aud-card ${cl}" onclick="${modoVisualizacao ? '' : `window.setResAud(${idx},'${l}')`}">
                            <div class="letra-aud">${l}</div><div class="txt-aud">${q.opcoes[l]}</div>
                        </div>`;
                    }).join('')}
                </div>
                ${q.imagem ? `<div class="img-aud-box"><img src="${q.imagem}"></div>` : ''}
            </div>
            <div class="footer-nav-aud">
                <button class="btn-seta-aud" onclick="window.irParaQuestaoAud(${idx-1})" ${idx===0?'disabled':''}><i class="fa-solid fa-chevron-left"></i></button>
                <button class="btn-seta-aud" onclick="window.irParaQuestaoAud(${idx+1})" ${idx===atividadeSelecionada.questoes.length-1?'disabled':''}><i class="fa-solid fa-chevron-right"></i></button>
            </div>
            ${!modoVisualizacao && idx === atividadeSelecionada.questoes.length - 1 ? `
                <button class="btn-enviar-aud" onclick="window.finalizarAud()">ENVIAR RESPOSTAS</button>
            ` : ''}
        `;
    };

    window.setResAud = (idx, l) => { respostasAluno[idx] = l; window.irParaQuestaoAud(idx); };

    window.finalizarAud = () => {
        window.confirmarAcaoAud("Deseja enviar a atividade agora?", async () => {
            clearInterval(intervaloCronometro);
            const tempo = Math.floor((Date.now() - tempoInicio) / 1000);
            let acertos = 0;
            atividadeSelecionada.questoes.forEach((q, i) => { if(respostasAluno[i] === q.correta) acertos++; });
            const nota = ((acertos / atividadeSelecionada.questoes.length) * 10).toFixed(1);
            
            await addDoc(collection(db, "respostas_alunos"), {
                atividadeId: atividadeSelecionada.id, titulo: atividadeSelecionada.titulo,
                alunoId: dadosTurmaAluno.alunoId, respostas: respostasAluno, nota: nota,
                tempoGasto: tempo, semestre: dadosTurmaAluno.semestre, dataEntrega: serverTimestamp(),
                tipoAtividade: 'auditiva'
            });
            location.reload();
        });
    };

    window.revisarAud = (id) => {
        const atv = atividadesEnviadas.find(a => a.idResp === id);
        atividadeSelecionada = atv.dadosOriginais; respostasAluno = atv.respostas; modoVisualizacao = true;
        document.getElementById('main-view-aud').style.display = 'none';
        document.getElementById('view-resolver-aud').style.display = 'block';
        document.getElementById('titulo-aud-header').innerText = "Revisão";
        document.getElementById('cronometro-aud-top').style.display = 'none';
        window.irParaQuestaoAud(0);
    };

    setTimeout(buscarDadosContexto, 300);

    return `
    <style>
        .aud-wrapper { padding: 15px; font-family: 'Inter', sans-serif; }
        .tab-btn-aud { padding: 10px 15px; border: none; background: none; font-weight: 700; color: #94a3b8; cursor: pointer; }
        .tab-btn-aud.active { color: #003058; border-bottom: 3px solid #003058; }
        
        .card-aud-list { background:#fff; padding:15px; border-radius:12px; margin-bottom:10px; display:flex; align-items:center; border-left:5px solid #003058; box-shadow:0 2px 5px rgba(0,0,0,0.05); cursor:pointer; }
        .titulo-aud-card { margin:0; font-size:14px; color:#003058; font-weight:700; }
        .sub-aud-card { font-size:11px; color:#64748b; margin-top:4px; }

        .header-aud-top { display:flex; align-items:center; background:#003058; padding:10px 15px; border-radius:12px; margin-bottom:12px; color:#fff; gap:15px; }
        .cronometro-aud-badge { font-size:12px; background:rgba(255,255,255,0.2); padding:5px 10px; border-radius:8px; font-weight:700; }

        .nav-aud-pills { display:flex; gap:6px; margin-bottom:15px; overflow-x:auto; padding-bottom:5px; }
        .pill-aud { min-width:34px; height:34px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; font-weight:700; cursor:pointer; }
        .pill-aud.active { background:#003058; color:#fff; }
        .pill-aud.done:not(.active) { background:#e2e8f0; }

        .audio-container-aud { background:#f8fafc; padding:10px; border-radius:10px; margin-bottom:15px; border:1px solid #e2e8f0; }
        .enunciado-aud-box { background:#fff; padding:15px; border-radius:10px; border:1px solid #e2e8f0; font-weight:600; font-size:14px; margin-bottom:15px; }

        .corpo-aud-flex { display:flex; gap:15px; }
        .opcoes-aud-lista { flex:1; display:flex; flex-direction:column; gap:8px; }
        .opt-aud-card { display:flex; align-items:center; padding:12px; background:#fff; border:2px solid #f1f5f9; border-radius:10px; cursor:pointer; font-size:13px; }
        .opt-aud-card.selected { border-color:#003058; background:#f0f7ff; }
        .opt-aud-card.correta { border-color:#003058; background:#f0f7ff; }
        .opt-aud-card.errada { border-color:#ef4444; background:#fef2f2; }
        .letra-aud { font-weight:900; background:#f1f5f9; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-right:10px; font-size:11px; color:#003058; border:1px solid #e2e8f0; flex-shrink:0; }

        .img-aud-box { flex:0.7; }
        .img-aud-box img { width:100%; border-radius:10px; border:1px solid #e2e8f0; }

        .footer-nav-aud { display:flex; justify-content:center; gap:20px; margin: 20px 0; }
        .btn-seta-aud { width:45px; height:45px; border-radius:50%; border:1px solid #e2e8f0; background:#fff; color:#003058; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center; }
        .btn-enviar-aud { width:100%; background:#003058; color:#fff; border:none; height:46px; border-radius:12px; font-weight:700; cursor:pointer; margin-top:10px; }

        .modal-aud { position:fixed; inset:0; background:rgba(0,48,88,0.4); backdrop-filter:blur(6px); display:none; align-items:center; justify-content:center; z-index:10000; padding:20px; }
        .modal-aud-content { background:#fff; width:100%; max-width:350px; border-radius:24px; padding:30px; text-align:center; }

        @media (max-width:600px) { .corpo-aud-flex { flex-direction:column-reverse; } }
    </style>

    <div class="aud-wrapper">
        <div id="modal-aviso-aud" class="modal-aud">
            <div class="modal-aud-content">
                <i class="fa-solid fa-stopwatch" style="font-size:40px; color:#003058; margin-bottom:15px;"></i>
                <h2 style="color:#003058; font-size:18px; font-weight:800;">Tudo pronto?</h2>
                <p style="color:#64748b; font-size:14px; line-height:1.5; margin-bottom:20px;">Seu tempo de resolução será gravado.</p>
                <button class="btn-enviar-aud" onclick="window.iniciarAudDeVez()">INICIAR ATIVIDADE</button>
                <button onclick="document.getElementById('modal-aviso-aud').style.display='none'" style="background:none; border:none; color:#94a3b8; margin-top:15px; cursor:pointer;">Agora não</button>
            </div>
        </div>

        <div id="modal-confirma-aud" class="modal-aud">
            <div class="modal-aud-content">
                <h2 style="color:#003058; font-size:18px; font-weight:800;">Confirmação</h2>
                <p id="msg-confirma-aud" style="color:#64748b; font-size:14px; margin:15px 0;"></p>
                <div style="display:flex; gap:10px;">
                    <button onclick="document.getElementById('modal-confirma-aud').style.display='none'" style="flex:1; padding:12px; border-radius:10px; border:none; background:#f1f5f9;">Não</button>
                    <button onclick="window.cbAud()" style="flex:1; padding:12px; border-radius:10px; border:none; background:#003058; color:#fff;">Sim</button>
                </div>
            </div>
        </div>

        <div id="main-view-aud">
            <h1 style="color:#003058; font-size:24px; font-weight:900; margin-bottom:2px;">Auditiva</h1>
            <p style="color:#94a3b8; font-size:14px; margin-bottom:20px;">Melhore sua compreensão oral</p>
            <div style="display:flex; border-bottom:1px solid #e2e8f0; margin-bottom:15px;">
                <button id="btn-aud-tab-recebidas" class="tab-btn-aud active" onclick="window.switchTabAudAluno('recebidas')">Recebidas</button>
                <button id="btn-aud-tab-enviadas" class="tab-btn-aud" onclick="window.switchTabAudAluno('enviadas')">Enviadas</button>
            </div>
            <div id="pane-aud-recebidas"><div id="lista-aud-recebidas"></div></div>
            <div id="pane-aud-enviadas" style="display:none;"><div id="lista-aud-enviadas"></div></div>
        </div>

        <div id="view-resolver-aud" style="display:none;">
            <div class="header-aud-top">
                <button onclick="window.voltarParaListaAud()" style="background:rgba(255,255,255,0.2); border:none; color:#fff; width:32px; height:32px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-arrow-left"></i></button>
                <div id="titulo-aud-header" style="flex:1; font-weight:700; font-size:14px;"></div>
                <div id="cronometro-aud-top" class="cronometro-aud-badge"><i class="fa-regular fa-clock"></i> <span id="tempo-aud-box">00:00</span></div>
            </div>
            <div id="nav-aud-pills" class="nav-aud-pills"></div>
            <div id="render-aud-body"></div>
        </div>
    </div>`;
});
