window.Router.register('gramaticaalunoclm', async () => {
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

    // --- SEGURANÇA TOTAL ---
    const bloquearAcoes = (e) => { e.preventDefault(); return false; };
    document.addEventListener('copy', bloquearAcoes);
    document.addEventListener('paste', bloquearAcoes);
    document.addEventListener('contextmenu', bloquearAcoes);
    document.addEventListener('selectstart', bloquearAcoes);
    document.addEventListener('dragstart', bloquearAcoes);
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 'p')) e.preventDefault();
    });

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
                    window.switchTabAluno('recebidas');
                }
            }
        } catch (e) { console.error("Erro ao carregar perfil:", e); }
    };

    window.switchTabAluno = async (tab) => {
        document.querySelectorAll('.tab-btn-aluno').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-tab-${tab}`).classList.add('active');
        document.getElementById('pane-recebidas').style.display = tab === 'recebidas' ? 'block' : 'none';
        document.getElementById('pane-enviadas').style.display = tab === 'enviadas' ? 'block' : 'none';
        if (tab === 'recebidas') carregarRecebidas();
        else carregarEnviadas();
    };

    const carregarRecebidas = async () => {
        const container = document.getElementById('lista-recebidas');
        container.innerHTML = '<div class="loading-simple">Buscando...</div>';
        try {
            const qAtv = query(collection(db, "atividades_enviadas"), where("semestre", "==", dadosTurmaAluno.semestre), where("tipo", "==", "gramatica"));
            const snapAtv = await getDocs(qAtv);
            const qResp = query(collection(db, "respostas_alunos"), where("alunoId", "==", dadosTurmaAluno.alunoId));
            const snapResp = await getDocs(qResp);
            const respondidasIds = snapResp.docs.map(d => d.data().atividadeId);
            atividadesRecebidas = snapAtv.docs.map(d => ({ id: d.id, ...d.data() })).filter(atv => !respondidasIds.includes(atv.id));
            container.innerHTML = atividadesRecebidas.length ? atividadesRecebidas.map(atv => `
                <div class="card-premium-list" onclick="window.confirmarInicioAtividade('${atv.id}')">
                    <div style="flex:1">
                        <h3 class="atv-titulo-list">${atv.titulo || 'Atividade'}</h3>
                        <div class="atv-sub-list">Semestre: ${atv.semestre}</div>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color:#cbd5e1"></i>
                </div>`).join('') : '<div class="empty-state">Nenhuma pendente.</div>';
        } catch (e) { container.innerHTML = '<div class="empty-state">Erro.</div>'; }
    };

    const carregarEnviadas = async () => {
        const container = document.getElementById('lista-enviadas');
        container.innerHTML = '<div class="loading-simple">Carregando...</div>';
        const q = query(collection(db, "respostas_alunos"), where("alunoId", "==", dadosTurmaAluno.alunoId));
        const snap = await getDocs(q);
        atividadesEnviadas = [];
        for(let docSnap of snap.docs) {
            const data = docSnap.data();
            const refOrig = await getDoc(doc(db, "atividades_enviadas", data.atividadeId));
            atividadesEnviadas.push({ ...data, idResp: docSnap.id, dadosOriginais: refOrig.exists() ? refOrig.data() : null });
        }
        container.innerHTML = atividadesEnviadas.length ? atividadesEnviadas.map(atv => `
            <div class="card-premium-list enviada">
                <div style="flex:1">
                    <h3 class="atv-titulo-list">${atv.titulo || 'Atividade'}</h3>
                    <div class="atv-sub-list"><span><i class="fa-regular fa-circle-check"></i> Concluída</span></div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="btn-olho-revisao" onclick="window.revisarAtividade('${atv.idResp}')"><i class="fa-solid fa-eye"></i></button>
                    <div class="nota-badge-circular">${atv.nota}</div>
                </div>
            </div>`).join('') : '<div class="empty-state">Sem histórico.</div>';
    };

    const formatarTempo = (segundosTotal) => {
        const mins = Math.floor(segundosTotal / 60);
        const segs = segundosTotal % 60;
        return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
    };

    const iniciarCronometroVisual = () => {
        if (intervaloCronometro) clearInterval(intervaloCronometro);
        const display = document.getElementById('tempo-cronometro');
        intervaloCronometro = setInterval(() => {
            const decorrido = Math.floor((Date.now() - tempoInicio) / 1000);
            if(display) display.innerText = formatarTempo(decorrido);
        }, 1000);
    };

    window.confirmarInicioAtividade = (id) => {
        atividadeSelecionada = atividadesRecebidas.find(a => a.id === id);
        document.getElementById('modal-aviso-cronometro').style.display = 'flex';
    };

    window.começarDeVez = () => {
        document.getElementById('modal-aviso-cronometro').style.display = 'none';
        respostasAluno = {}; modoVisualizacao = false; tempoInicio = Date.now();
        document.getElementById('main-view-aluno').style.display = 'none';
        document.getElementById('view-resolver').style.display = 'block';
        document.getElementById('header-atv-titulo').innerText = atividadeSelecionada.titulo;
        iniciarCronometroVisual();
        window.irParaQuestao(0);
    };

    window.mostrarTextoAtividade = () => {
        const modal = document.getElementById('modal-texto-aluno');
        document.getElementById('m-texto-titulo').innerText = atividadeSelecionada.tituloTextoContexto || "Texto Base";
        document.getElementById('m-texto-body').innerText = atividadeSelecionada.textoContexto || "";
        const imgC = document.getElementById('m-texto-img');
        if(atividadeSelecionada.fotoTextoContexto) {
            imgC.innerHTML = `<img src="${atividadeSelecionada.fotoTextoContexto}" class="img-texto-pequena-central">`;
            imgC.style.display = 'block';
        } else imgC.style.display = 'none';
        modal.style.display = 'flex';
    };

    window.fecharTextoAtividade = () => document.getElementById('modal-texto-aluno').style.display = 'none';

    window.irParaQuestao = (idx) => {
        questaoAtualIndex = idx;
        const q = atividadeSelecionada.questoes[idx];
        let navHtml = `<button onclick="window.mostrarTextoAtividade()" class="g-btn-pill btn-olho-texto-nav"><i class="fa-solid fa-eye"></i></button>`;
        navHtml += atividadeSelecionada.questoes.map((_, i) => `
            <button onclick="window.irParaQuestao(${i})" class="g-btn-pill ${i === idx ? 'active' : ''} ${respostasAluno[i] ? 'respondida' : ''}">${i + 1}</button>
        `).join('');
        document.getElementById('nav-questoes').innerHTML = navHtml;

        const midiaHtml = q.imagem ? `<div class="col-foto-questao"><img src="${q.imagem}" class="img-questao-render"></div>` : '';

        document.getElementById('render-pergunta').innerHTML = `
            <div class="box-enunciado-render">
                <div class="texto-enunciado-render">${q.enunciado}</div>
            </div>
            <div class="container-questao-corpo ${q.imagem ? 'layout-com-foto' : 'layout-sem-foto'}">
                <div class="col-opcoes-questao">
                    <div class="opcoes-lista">
                        ${['A', 'B', 'C'].map(letra => {
                            let extra = '';
                            if (modoVisualizacao) {
                                if (letra === q.correta) extra = 'correta-view';
                                if (respostasAluno[idx] === letra && letra !== q.correta) extra = 'errada-view';
                            } else if (respostasAluno[idx] === letra) extra = 'selected';
                            return `
                                <div class="opcao-card ${extra}" onclick="${modoVisualizacao ? '' : `window.setResp(${idx}, '${letra}')`}">
                                    <div class="letra-indicador">${letra}</div>
                                    <div class="texto-opcao">${q.opcoes[letra]}</div>
                                </div>`;
                        }).join('')}
                    </div>
                </div>
                ${midiaHtml}
            </div>
            
            <div class="container-navegacao-setas">
                <button class="btn-seta-nav" onclick="window.questaoAnterior()" ${idx === 0 ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <button class="btn-seta-nav" onclick="window.proximaQuestao()" ${idx === atividadeSelecionada.questoes.length - 1 ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>

            <div class="container-acoes-rodape">
                <div style="flex:1"></div>
                ${!modoVisualizacao && idx === atividadeSelecionada.questoes.length - 1 ? `
                    <button class="btn-acao-enviar" onclick="window.finalizarAtividade()">ENVIAR ATIVIDADE</button>
                ` : ''}
            </div>`;
    };

    window.questaoAnterior = () => { if(questaoAtualIndex > 0) window.irParaQuestao(questaoAtualIndex - 1); };
    window.proximaQuestao = () => { if(questaoAtualIndex < atividadeSelecionada.questoes.length - 1) window.irParaQuestao(questaoAtualIndex + 1); };

    window.revisarAtividade = (idResp) => {
        const atv = atividadesEnviadas.find(a => a.idResp === idResp);
        if(!atv || !atv.dadosOriginais) return;
        atividadeSelecionada = atv.dadosOriginais; respostasAluno = atv.respostas; modoVisualizacao = true;
        document.getElementById('main-view-aluno').style.display = 'none';
        document.getElementById('view-resolver').style.display = 'block';
        document.getElementById('header-atv-titulo').innerText = "Revisão";
        document.getElementById('cronometro-container').style.display = 'none';
        window.irParaQuestao(0);
    };

    window.setResp = (idx, letra) => { respostasAluno[idx] = letra; window.irParaQuestao(idx); };

    window.finalizarAtividade = async () => {
        if (intervaloCronometro) clearInterval(intervaloCronometro);
        const tempoFinal = Math.floor((Date.now() - tempoInicio) / 1000);
        let acertos = 0;
        atividadeSelecionada.questoes.forEach((q, i) => { if(respostasAluno[i] === q.correta) acertos++; });
        const nota = ((acertos / atividadeSelecionada.questoes.length) * 10).toFixed(1);
        await addDoc(collection(db, "respostas_alunos"), {
            atividadeId: atividadeSelecionada.id, titulo: atividadeSelecionada.titulo,
            alunoId: dadosTurmaAluno.alunoId, respostas: respostasAluno, nota: nota,
            tempoGasto: tempoFinal, semestre: dadosTurmaAluno.semestre, dataEntrega: serverTimestamp()
        });
        location.reload();
    };

    setTimeout(buscarDadosContexto, 300);

    return `
    <style>
        .gram-aluno-wrapper { padding: 12px; font-family: 'Inter', sans-serif; background: transparent; }
        .card-premium-list { background:#fff; padding:12px; border-radius:10px; margin-bottom:8px; display:flex; align-items:center; border-left:4px solid #003058; box-shadow:0 1px 3px rgba(0,0,0,0.1); cursor:pointer; }
        .card-premium-list.enviada { border-left-color: #10b981; }
        .atv-titulo-list { margin:0; font-size:13px; color:#003058; font-weight:700; }
        .atv-sub-list { font-size:10px; color:#94a3b8; margin-top:3px; }
        
        .header-resolver-top { display:flex; justify-content:space-between; align-items:center; background:#003058; padding:10px; border-radius:10px; margin-bottom:10px; color:#fff; }
        .header-resolver-titulo { font-size:13px; font-weight:700; }
        .cronometro-box { font-size:12px; background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:6px; }
        
        .box-enunciado-render { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:15px; margin-bottom:12px; }
        .texto-enunciado-render { color:#1e293b; font-weight:600; font-size:14px; line-height:1.5; white-space:pre-wrap; }
        
        .container-questao-corpo.layout-com-foto { display:flex; gap:12px; }
        .col-opcoes-questao { flex:1.2; width:100%; }
        .col-foto-questao { flex:0.8; }
        .img-questao-render { width:100%; max-height:220px; border-radius:8px; object-fit:contain; border:1px solid #e2e8f0; background:#fff; }
        
        .opcoes-lista { display:flex; flex-direction:column; gap:8px; }
        .opcao-card { display:flex; align-items:center; padding:12px; background:#fff; border:2px solid #f1f5f9; border-radius:10px; cursor:pointer; font-size:13px; }
        .opcao-card.selected { border-color:#003058; background:#f0f7ff; }
        .opcao-card.correta-view { border-color:#10b981; background:#ecfdf5; }
        .opcao-card.errada-view { border-color:#ef4444; background:#fef2f2; }
        .letra-indicador { font-weight:900; background:#f1f5f9; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-right:10px; font-size:11px; color:#003058; border:1px solid #e2e8f0; flex-shrink:0; }

        .nav-questoes-container { display:flex; gap:6px; margin-bottom:12px; overflow-x:auto; padding-bottom:5px; align-items: center; }
        .g-btn-pill { min-width:34px; height:34px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; font-weight:700; cursor:pointer; }
        .g-btn-pill.active { background:#003058; color:#fff; }
        .g-btn-pill.respondida:not(.active) { background:#e2e8f0; }
        .btn-olho-texto-nav { background: #f1f5f9; color: #003058; border-color: #cbd5e1; font-size: 14px; }

        .container-navegacao-setas { display: flex; justify-content: center; align-items: center; gap: 40px; margin-top: 20px; }
        .btn-seta-nav { background: #fff; border: 1px solid #e2e8f0; width: 45px; height: 45px; border-radius: 50%; color: #003058; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.2s; }
        .btn-seta-nav:disabled { opacity: 0.3; cursor: not-allowed; }
        .btn-seta-nav:not(:disabled):hover { background: #f8fafc; transform: translateY(-2px); }

        .container-acoes-rodape { display:flex; gap:10px; margin-top:10px; justify-content: flex-end; }
        .btn-acao-enviar { width: 25%; background:#003058; color:#fff; border:none; height:44px; border-radius:10px; font-weight:700; cursor:pointer; }

        .modal-aluno { position:fixed; inset:0; background:rgba(0,48,88,0.4); backdrop-filter: blur(6px); display:none; align-items:center; justify-content:center; padding:20px; z-index:9999; }
        .modal-content-aluno { background:#fff; width:100%; max-width:380px; border-radius:24px; padding:30px; text-align:center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .modal-icon-alert { width:60px; height:60px; background:#f0f7ff; color:#003058; border-radius:50%; display:flex; align-items:center; justify-content:center; margin: 0 auto 15px; font-size:24px; }
        
        .tab-btn-aluno { padding:10px 15px; border:none; background:none; font-weight:700; color:#94a3b8; cursor:pointer; }
        .tab-btn-aluno.active { color:#003058; border-bottom:3px solid #003058; }
        .nota-badge-circular { width:30px; height:30px; border-radius:50%; background:#003058; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:900; }
        .btn-olho-revisao { background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 8px; color: #64748b; cursor: pointer; }

        .img-texto-pequena-central { display: block; margin: 0 auto 15px; max-width: 150px; border-radius: 8px; border: 1px solid #e2e8f0; }

        @media (max-width: 600px) { .container-questao-corpo.layout-com-foto { flex-direction: column-reverse; } .img-questao-render { max-height: 180px; } .btn-acao-enviar { width: 50%; } }
    </style>

    <div class="gram-aluno-wrapper">
        <div id="modal-aviso-cronometro" class="modal-aluno">
            <div class="modal-content-aluno">
                <div class="modal-icon-alert"><i class="fa-solid fa-stopwatch"></i></div>
                <h2 style="color:#003058; font-size:20px; margin-bottom:10px; font-weight:800;">Tudo pronto?</h2>
                <p style="color:#64748b; font-size:14px; margin-bottom:25px; line-height:1.5;">Ao iniciar, seu tempo de resolução começará a ser contado.</p>
                <button class="btn-acao-enviar" style="width:100%; height:50px; font-size:14px;" onclick="window.começarDeVez()">INICIAR ATIVIDADE</button>
                <button onclick="document.getElementById('modal-aviso-cronometro').style.display='none'" style="background:none; border:none; color:#94a3b8; margin-top:15px; font-weight:600; cursor:pointer;">Agora não</button>
            </div>
        </div>

        <div id="modal-texto-aluno" class="modal-aluno" onclick="if(event.target===this) window.fecharTextoAtividade()">
            <div class="modal-content-aluno" style="max-height:85vh; overflow-y:auto; text-align:left; max-width:500px;">
                <h3 id="m-texto-titulo" style="color:#003058; margin-bottom:15px; text-align: center;"></h3>
                <div id="m-texto-img"></div>
                <div id="m-texto-body" style="font-size:14px; line-height:1.6; color:#475569; white-space:pre-wrap;"></div>
                <button class="btn-acao-enviar" style="width:100%; margin-top:20px; background:#f1f5f9; color:#003058; border: 1px solid #cbd5e1;" onclick="window.fecharTextoAtividade()">VOLTAR À QUESTÃO</button>
            </div>
        </div>

        <div id="main-view-aluno">
            <h1 style="color:#003058; font-size:24px; font-weight:900; margin-bottom: 2px;">Gramática</h1>
            <p style="color:#94a3b8; font-size:14px; margin-bottom: 20px; font-weight: 500;">Pratique seus conhecimentos gramaticais</p>
            
            <div style="display:flex; border-bottom:1px solid #e2e8f0; margin-bottom:15px;">
                <button id="btn-tab-recebidas" class="tab-btn-aluno" onclick="window.switchTabAluno('recebidas')">Recebidas</button>
                <button id="btn-tab-enviadas" class="tab-btn-aluno" onclick="window.switchTabAluno('enviadas')">Enviadas</button>
            </div>
            <div id="pane-recebidas"><div id="lista-recebidas"></div></div>
            <div id="pane-enviadas" style="display:none;"><div id="lista-enviadas"></div></div>
        </div>

        <div id="view-resolver" style="display:none;">
            <div class="header-resolver-top">
                <div id="header-atv-titulo" class="header-resolver-titulo"></div>
                <div class="cronometro-box" id="cronometro-container"><span id="tempo-cronometro">00:00</span></div>
            </div>
            <div id="nav-questoes" class="nav-questoes-container"></div>
            <div id="render-pergunta"></div>
        </div>
    </div>`;
});
