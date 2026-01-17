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
    document.addEventListener('dragstart', bloquearAcoes);

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
        } catch (e) { console.error("Erro ao carregar perfil:", e); }
    };

    window.confirmarAcaoAud = (mensagem, callback) => {
        const modal = document.getElementById('modal-confirma-aud');
        document.getElementById('msg-confirma-aud').innerText = mensagem;
        modal.style.display = 'flex';
        window.cbAud = () => {
            modal.style.display = 'none';
            callback();
        };
    };

    window.voltarParaListaAud = () => {
        if (modoVisualizacao) {
            executarSaidaAud();
        } else {
            window.confirmarAcaoAud("Deseja realmente sair? Seu progresso nesta tentativa será perdido.", executarSaidaAud);
        }
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
        if (tab === 'recebidas') carregarRecebidasAud();
        else carregarEnviadasAud();
    };

    const renderizarPaginacaoAud = (totalItens, paginaAtual, tab) => {
        const totalPaginas = Math.ceil(totalItens / itensPorPagina);
        if (totalPaginas <= 1) return '';
        return `
            <div class="pagination-container-aud">
                <button class="btn-pag-aud" ${paginaAtual === 1 ? 'disabled' : ''} onclick="window.mudarPaginaAud('${tab}', ${paginaAtual - 1})"><i class="fa-solid fa-angle-left"></i></button>
                <span class="pag-info-aud">${paginaAtual} / ${totalPaginas}</span>
                <button class="btn-pag-aud" ${paginaAtual === totalPaginas ? 'disabled' : ''} onclick="window.mudarPaginaAud('${tab}', ${paginaAtual + 1})"><i class="fa-solid fa-angle-right"></i></button>
            </div>`;
    };

    window.mudarPaginaAud = (tab, novaPagina) => {
        if (tab === 'recebidas') { paginaAtualRecebidas = novaPagina; exibirCardsRecebidasAud(); } 
        else { paginaAtualEnviadas = novaPagina; exibirCardsEnviadasAud(); }
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
        const itensExibidos = atividadesRecebidas.slice(inicio, inicio + itensPorPagina);
        const agora = Date.now();

        container.innerHTML = itensExibidos.length ? itensExibidos.map(atv => {
            const dataLimite = atv.dataLimite ? new Date(atv.dataLimite).getTime() : null;
            const expiraFmt = atv.dataLimite ? new Date(atv.dataLimite).toLocaleDateString('pt-BR') : 'Sem prazo';
            const expirada = dataLimite && agora > dataLimite;

            return `
            <div class="card-aud-list ${expirada ? 'expirada' : ''}" onclick="${expirada ? '' : `window.prepararInicioAud('${atv.id}')`}">
                <div style="flex:1">
                    <h3 class="titulo-aud-card">${atv.titulo || 'Atividade Auditiva'}</h3>
                    <div class="sub-aud-card">
                        <span><i class="fa-solid fa-calendar-day"></i> Semestre: ${atv.semestre}</span> | 
                        <span style="color: ${expirada ? '#ef4444' : '#64748b'}">
                            <i class="fa-solid fa-clock"></i> Prazo: ${expiraFmt} ${expirada ? '(Expirado)' : ''}
                        </span>
                    </div>
                </div>
                <i class="fa-solid ${expirada ? 'fa-lock' : 'fa-chevron-right'}" style="color:#003058"></i>
            </div>`;
        }).join('') + renderizarPaginacaoAud(atividadesRecebidas.length, paginaAtualRecebidas, 'recebidas') 
        : '<div class="empty-aud">Nenhuma atividade pendente.</div>';
    };

    const carregarEnviadasAud = async () => {
        const container = document.getElementById('lista-aud-enviadas');
        container.innerHTML = '<div class="loader-aud"><div class="spinner-aud"></div></div>';
        try {
            const q = query(collection(db, "respostas_alunos"), where("alunoId", "==", dadosTurmaAluno.alunoId));
            const snap = await getDocs(q);
            atividadesEnviadas = [];
            for(let docSnap of snap.docs) {
                const data = docSnap.data();
                const refOrig = await getDoc(doc(db, "atividades_enviadas", data.atividadeId));
                if(refOrig.exists() && refOrig.data().tipo === 'auditiva') {
                    atividadesEnviadas.push({ ...data, idResp: docSnap.id, dadosOriginais: refOrig.data() });
                }
            }
            exibirCardsEnviadasAud();
        } catch (e) { container.innerHTML = '<div class="empty-aud">Erro ao carregar histórico.</div>'; }
    };

    const exibirCardsEnviadasAud = () => {
        const container = document.getElementById('lista-aud-enviadas');
        const inicio = (paginaAtualEnviadas - 1) * itensPorPagina;
        const itensExibidos = atividadesEnviadas.slice(inicio, inicio + itensPorPagina);
        container.innerHTML = itensExibidos.length ? itensExibidos.map(atv => {
            const dataFmt = atv.dataEntrega ? new Date(atv.dataEntrega.seconds * 1000).toLocaleDateString('pt-BR') : '---';
            const prazoOrig = atv.dadosOriginais?.dataLimite ? new Date(atv.dadosOriginais.dataLimite).toLocaleDateString('pt-BR') : '---';
            
            return `
            <div class="card-aud-list enviada">
                <div style="flex:1">
                    <h3 class="titulo-aud-card">${atv.titulo || 'Atividade'}</h3>
                    <div class="sub-aud-card">
                        <span><i class="fa-regular fa-calendar-check"></i> Entregue: ${dataFmt}</span> | 
                        <span><i class="fa-solid fa-hourglass-half"></i> Prazo era: ${prazoOrig}</span>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="btn-revisar-aud" onclick="window.revisarAud('${atv.idResp}')"><i class="fa-solid fa-eye"></i></button>
                    <div class="nota-badge-aud">${atv.nota}</div>
                </div>
            </div>`;
        }).join('') + renderizarPaginacaoAud(atividadesEnviadas.length, paginaAtualEnviadas, 'enviadas')
        : '<div class="empty-aud">Sem histórico de atividades.</div>';
    };

    window.fmtTempoAud = (segundos) => {
        const mins = Math.floor(segundos / 60);
        const segs = segundos % 60;
        return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
    };

    window.prepararInicioAud = (id) => {
        const atv = atividadesRecebidas.find(a => a.id === id);
        if (!atv) return;

        // Trava de segurança adicional de prazo
        const agora = Date.now();
        const dataLimite = atv.dataLimite ? new Date(atv.dataLimite).getTime() : null;
        if (dataLimite && agora > dataLimite) {
            alert("Esta atividade já expirou e não pode mais ser realizada.");
            return;
        }

        atividadeSelecionada = atv;
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
        
        const navHtml = atividadeSelecionada.questoes.map((_, i) => `
            <button onclick="window.irParaQuestaoAud(${i})" class="pill-aud ${i === idx ? 'active' : ''} ${respostasAluno[i] ? 'done' : ''}">${i + 1}</button>
        `).join('');
        document.getElementById('nav-aud-pills').innerHTML = navHtml;

        const midiaHtml = q.imagem ? `<div class="img-aud-box"><img src="${q.imagem}"></div>` : '';

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
                        return `
                        <div class="opt-aud-card ${cl}" onclick="${modoVisualizacao ? '' : `window.setResAud(${idx},'${l}')`}">
                            <div class="letra-aud">${l}</div>
                            <div class="txt-aud">${q.opcoes[l]}</div>
                        </div>`;
                    }).join('')}
                </div>
                ${midiaHtml}
            </div>
            
            <div class="footer-nav-aud">
                <button class="btn-seta-aud" onclick="window.irParaQuestaoAud(${idx-1})" ${idx===0?'disabled':''}><i class="fa-solid fa-chevron-left"></i></button>
                <button class="btn-seta-aud" onclick="window.irParaQuestaoAud(${idx+1})" ${idx===atividadeSelecionada.questoes.length-1?'disabled':''}><i class="fa-solid fa-chevron-right"></i></button>
            </div>

            <div style="display:flex; justify-content:flex-end; margin-top:15px;">
                ${!modoVisualizacao && idx === atividadeSelecionada.questoes.length - 1 ? `
                    <button class="btn-enviar-aud" onclick="window.finalizarAud()">ENVIAR ATIVIDADE</button>
                ` : ''}
            </div>
        `;
    };

    window.setResAud = (idx, l) => { respostasAluno[idx] = l; window.irParaQuestaoAud(idx); };

    window.finalizarAud = () => {
        window.confirmarAcaoAud("Deseja finalizar e enviar suas respostas?", enviarDadosFinaisAud);
    };

    const enviarDadosFinaisAud = async () => {
        if (intervaloCronometro) clearInterval(intervaloCronometro);
        const tempoFinal = Math.floor((Date.now() - tempoInicio) / 1000);
        let acertos = 0;
        atividadeSelecionada.questoes.forEach((q, i) => { if(respostasAluno[i] === q.correta) acertos++; });
        const notaFinal = ((acertos / atividadeSelecionada.questoes.length) * 10).toFixed(1);

        await addDoc(collection(db, "respostas_alunos"), {
            atividadeId: atividadeSelecionada.id, titulo: atividadeSelecionada.titulo,
            alunoId: dadosTurmaAluno.alunoId, respostas: respostasAluno, nota: notaFinal,
            tempoGasto: tempoFinal, semestre: dadosTurmaAluno.semestre, dataEntrega: serverTimestamp(),
            tipoAtividade: 'auditiva'
        });

        document.getElementById('nota-final-valor').innerText = notaFinal;
        document.getElementById('modal-nota-aud').style.display = 'flex';
    };

    window.revisarAud = (id) => {
        const atv = atividadesEnviadas.find(a => a.idResp === id);
        if(!atv || !atv.dadosOriginais) return;
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
        .aud-wrapper { padding: 12px; font-family: 'Inter', sans-serif; }
        .card-aud-list { background:#fff; padding:15px; border-radius:12px; margin-bottom:10px; display:flex; align-items:center; border-left:5px solid #003058; box-shadow:0 2px 5px rgba(0,0,0,0.05); cursor:pointer; transition: 0.2s; }
        .card-aud-list.expirada { border-left-color: #cbd5e1; opacity: 0.6; cursor: not-allowed; }
        .titulo-aud-card { margin:0; font-size:14px; color:#003058; font-weight:700; }
        .sub-aud-card { font-size:11px; color:#64748b; margin-top:5px; }
        
        .loader-aud { display: flex; justify-content: center; padding: 40px; }
        .spinner-aud { width: 40px; height: 40px; border: 4px solid #f1f5f9; border-top: 4px solid #003058; border-radius: 50%; animation: spinAud 0.8s linear infinite; }
        @keyframes spinAud { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .pagination-container-aud { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 15px; }
        .btn-pag-aud { background: #fff; border: 1px solid #cbd5e1; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: #003058; display: flex; align-items: center; justify-content: center; }
        .btn-pag-aud:disabled { opacity: 0.5; cursor: not-allowed; }
        .pag-info-aud { font-size: 13px; color: #003058; font-weight: 700; }

        .header-aud-top { display:flex; align-items:center; background:#003058; padding:10px 15px; border-radius:12px; margin-bottom:12px; color:#fff; gap:15px; }
        .cronometro-aud-badge { font-size:12px; background:rgba(255,255,255,0.2); padding:5px 10px; border-radius:8px; font-weight:700; }

        .nav-aud-pills { display:flex; gap:6px; margin-bottom:15px; overflow-x:auto; padding-bottom:5px; align-items: center; }
        .pill-aud { min-width:34px; height:34px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; font-weight:700; cursor:pointer; }
        .pill-aud.active { background:#003058; color:#fff; }
        .pill-aud.done:not(.active) { background:#e2e8f0; }

        .audio-container-aud { background:#f8fafc; padding:10px; border-radius:10px; margin-bottom:15px; border:1px solid #e2e8f0; }
        .enunciado-aud-box { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:15px; margin-bottom:12px; font-weight:600; font-size:14px; color:#1e293b; }

        .corpo-aud-flex { display:flex; gap:12px; }
        .opcoes-aud-lista { flex:1.2; display:flex; flex-direction:column; gap:8px; }
        .opt-aud-card { display:flex; align-items:center; padding:12px; background:#fff; border:2px solid #f1f5f9; border-radius:10px; cursor:pointer; font-size:13px; }
        .opt-aud-card.selected { border-color:#003058; background:#f0f7ff; }
        .opt-aud-card.correta { border-color:#003058; background:#f0f7ff; }
        .opt-aud-card.errada { border-color:#ef4444; background:#fef2f2; }
        .letra-aud { font-weight:900; background:#f1f5f9; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-right:10px; font-size:11px; color:#003058; border:1px solid #e2e8f0; flex-shrink:0; }

        .img-aud-box { flex:0.8; }
        .img-aud-box img { width:100%; max-height:220px; border-radius:8px; object-fit:contain; border:1px solid #e2e8f0; background:#fff; }

        .footer-nav-aud { display: flex; justify-content: center; align-items: center; gap: 40px; margin-top: 15px; }
        .btn-seta-aud { background: #fff; border: 1px solid #e2e8f0; width: 45px; height: 45px; border-radius: 50%; color: #003058; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .btn-seta-aud:disabled { opacity: 0.3; cursor: not-allowed; }

        .btn-enviar-aud { background:#003058; color:#fff; border:none; height:46px; border-radius:12px; font-weight:700; cursor:pointer; padding: 0 25px; }

        .modal-aud { position:fixed; inset:0; background:rgba(0,48,88,0.4); backdrop-filter: blur(6px); display:none; align-items:center; justify-content:center; padding:20px; z-index:9999; }
        .modal-content-aud { background:#fff; width:100%; max-width:380px; border-radius:24px; padding:30px; text-align:center; }
        
        .tab-btn-aud { padding:10px 15px; border:none; background:none; font-weight:700; color:#94a3b8; cursor:pointer; }
        .tab-btn-aud.active { color:#003058; border-bottom:3px solid #003058; }
        
        .nota-badge-aud { width:32px; height:32px; border-radius:50%; background:#003058; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:900; }
        .btn-revisar-aud { background: #f1f5f9; border: none; width: 34px; height: 34px; border-radius: 10px; color: #003058; cursor: pointer; }

        .nota-final-circle { width:80px; height:80px; border-radius:50%; background:#003058; color:#fff; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:900; margin: 0 auto 20px auto; border: 4px solid #e2e8f0; }

        @media (max-width: 600px) { .corpo-aud-flex { flex-direction: column-reverse; } .btn-enviar-aud { width: 100%; } }
    </style>

    <div class="aud-wrapper">
        <div id="modal-confirma-aud" class="modal-aud">
            <div class="modal-content-aud">
                <div style="font-size:35px; color:#003058; margin-bottom:15px;"><i class="fa-solid fa-circle-question"></i></div>
                <h2 style="color:#003058; font-size:18px; margin-bottom:10px; font-weight:800;">Confirmação</h2>
                <p id="msg-confirma-aud" style="color:#64748b; font-size:14px; margin-bottom:25px; line-height:1.5;"></p>
                <div style="display:flex; gap:10px;">
                    <button onclick="document.getElementById('modal-confirma-aud').style.display='none'" style="flex:1; background:#f1f5f9; color:#64748b; border:none; height:46px; border-radius:12px; font-weight:700; cursor:pointer;">CANCELAR</button>
                    <button onclick="window.cbAud()" style="flex:1; background:#003058; color:#fff; border:none; height:46px; border-radius:12px; font-weight:700; cursor:pointer;">CONFIRMAR</button>
                </div>
            </div>
        </div>

        <div id="modal-aviso-aud" class="modal-aud">
            <div class="modal-content-aud">
                <div style="font-size:35px; color:#003058; margin-bottom:15px;"><i class="fa-solid fa-stopwatch"></i></div>
                <h2 style="color:#003058; font-size:20px; margin-bottom:10px; font-weight:800;">Tudo pronto?</h2>
                <p style="color:#64748b; font-size:14px; margin-bottom:25px; line-height:1.5;">Ao iniciar, seu tempo de resolução será contabilizado para o professor.</p>
                <button class="btn-enviar-aud" style="width:100%;" onclick="window.iniciarAudDeVez()">INICIAR ATIVIDADE</button>
                <button onclick="document.getElementById('modal-aviso-aud').style.display='none'" style="background:none; border:none; color:#94a3b8; margin-top:15px; font-weight:600; cursor:pointer;">Agora não</button>
            </div>
        </div>

        <div id="modal-nota-aud" class="modal-aud">
            <div class="modal-content-aud">
                <div style="font-size:35px; color:#003058; margin-bottom:10px;"><i class="fa-solid fa-circle-check"></i></div>
                <h2 style="color:#003058; font-size:20px; margin-bottom:5px; font-weight:800;">Atividade Enviada!</h2>
                <p style="color:#64748b; font-size:14px; margin-bottom:20px;">Sua nota nesta atividade foi:</p>
                <div class="nota-final-circle" id="nota-final-valor">0.0</div>
                <button class="btn-enviar-aud" style="width:100%;" onclick="location.reload()">VER MINHAS ATIVIDADES</button>
            </div>
        </div>

        <div id="main-view-aud">
            <h1 style="color:#003058; font-size:24px; font-weight:900; margin-bottom: 2px;">Auditiva</h1>
            <p style="color:#94a3b8; font-size:14px; margin-bottom: 20px;">Melhore sua compreensão oral</p>
            <div style="display:flex; border-bottom:1px solid #e2e8f0; margin-bottom:15px;">
                <button id="btn-aud-tab-recebidas" class="tab-btn-aud" onclick="window.switchTabAudAluno('recebidas')">Recebidas</button>
                <button id="btn-aud-tab-enviadas" class="tab-btn-aud" onclick="window.switchTabAudAluno('enviadas')">Enviadas</button>
            </div>
            <div id="pane-aud-recebidas"><div id="lista-aud-recebidas"></div></div>
            <div id="pane-aud-enviadas" style="display:none;"><div id="lista-aud-enviadas"></div></div>
        </div>

        <div id="view-resolver-aud" style="display:none;">
            <div class="header-aud-top">
                <button class="btn-revisar-aud" style="background:rgba(255,255,255,0.15); color:#fff;" onclick="window.voltarParaListaAud()"><i class="fa-solid fa-arrow-left"></i></button>
                <div id="titulo-aud-header" style="flex:1; font-weight:700; font-size:14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
                <div class="cronometro-aud-badge" id="cronometro-aud-top"><span id="tempo-aud-box">00:00</span></div>
            </div>
            <div id="nav-aud-pills" class="nav-aud-pills"></div>
            <div id="render-aud-body"></div>
        </div>
    </div>`;
});
