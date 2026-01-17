window.Router.register('escritaalunoclm', async () => {
    const db = window.db;
    const fs = window.fsMethods;
    const auth = window.authMethods.getAuth();

    // Bloqueio de interface (Anti-Plágio)
    document.addEventListener('copy', (e) => e.preventDefault());
    document.addEventListener('paste', (e) => e.preventDefault());
    document.addEventListener('cut', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    let propostaAtiva = null;
    let paginaAtualEnviadas = 1; 
    const itensPorPaginaEnviadas = 6; 
    let paginaRecebidas = 1; 
    const itensPorPaginaRecebidas = 6; 

    const obterUsuario = () => {
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged(user => {
                unsubscribe();
                resolve(user);
            });
        });
    };

    const user = await obterUsuario();
    if (!user) return `<div style="padding:20px;text-align:center;">Sessão expirada. Refaça o login.</div>`;

    // --- FUNÇÃO PARA ALERTAS MODERNOS ---
    window.mostrarAviso = (titulo, mensagem, tipo = 'sucesso', callback = null) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:Inter,sans-serif;padding:20px;box-sizing:border-box;';
        
        const corPrimaria = tipo === 'pergunta' ? '#e67e22' : (tipo === 'erro' ? '#dc2626' : '#003058');
        const icone = tipo === 'pergunta' ? 'fa-circle-question' : (tipo === 'erro' ? 'fa-circle-xmark' : 'fa-circle-check');

        overlay.innerHTML = `
            <div style="background:white;padding:30px;border-radius:20px;max-width:400px;width:100%;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);animation: zoomIn 0.3s ease;">
                <i class="fa-solid ${icone}" style="font-size:3rem;color:${corPrimaria};margin-bottom:15px;"></i>
                <h3 style="margin:0 0 10px 0;color:#003058;">${titulo}</h3>
                <p style="color:#64748b;font-size:14px;margin-bottom:20px;line-height:1.5;">${mensagem}</p>
                <div style="display:flex;gap:10px;justify-content:center;">
                    ${tipo === 'pergunta' ? `<button id="btn-cancel" style="padding:10px 20px;border-radius:8px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-weight:600;">Cancelar</button>` : ''}
                    <button id="btn-confirm" style="padding:10px 20px;border-radius:8px;border:none;background:#003058;color:white;cursor:pointer;font-weight:600;">${tipo === 'pergunta' ? 'Confirmar' : 'Entendido'}</button>
                </div>
            </div>
            <style>
                @keyframes zoomIn { from { opacity:0; transform:scale(0.9); } to { opacity:1; transform:scale(1); } }
            </style>
        `;

        document.body.appendChild(overlay);
        const fechar = () => overlay.remove();
        overlay.querySelector('#btn-confirm').onclick = () => {
            fechar();
            if (callback) callback();
        };
        if (tipo === 'pergunta') {
            overlay.querySelector('#btn-cancel').onclick = fechar;
        }
    };

    // --- LÓGICA DE NAVEGAÇÃO ---
    window.switchTabEscrita = (tab) => {
        const tabs = ['recebidas', 'escrever', 'enviadas'];
        
        if (tab === 'escrever' && !propostaAtiva) {
            // Tenta recuperar do rascunho se não houver proposta ativa (abertura direta)
            const rascunho = localStorage.getItem(`rascunho_redacao_${user.uid}`);
            document.getElementById('texto-redacao').value = rascunho || "";
            document.getElementById('tema-dinamico').innerText = "Selecione uma atividade para começar...";
            document.getElementById('prazo-dinamico').innerText = "--/--/--";
            document.getElementById('container-img-apoio').style.display = 'none';
            document.getElementById('contador-palavras').innerText = rascunho ? rascunho.trim().split(/\s+/).length : "0";
        }

        tabs.forEach(t => {
            const content = document.getElementById(`tab-${t}`);
            const btn = document.getElementById(`btn-tab-${t}`);
            if (content) content.style.display = (t === tab) ? 'block' : 'none';
            if (btn) {
                btn.classList.toggle('pill-active', t === tab);
                btn.classList.toggle('pill-inactive', t !== tab);
            }
        });
        if (tab === 'enviadas') carregarEnviadas();
        if (tab === 'recebidas') carregarPropostasDisponiveis();
    };

    // --- BUSCAR PROPOSTAS (RECEBIDAS) ---
    async function carregarPropostasDisponiveis() {
        const container = document.getElementById('lista-propostas-recebidas');
        if (!container) return;
        container.innerHTML = '<p style="padding:20px;color:#64748b;">Buscando atividades...</p>';
        try {
            const alunoSnap = await fs.getDoc(fs.doc(db, "usuarios", user.uid));
            const turmaAluno = alunoSnap.exists() ? alunoSnap.data().turma : null;
            if (!turmaAluno) return container.innerHTML = '<p style="padding:20px;">Turma não identificada.</p>';

            const qEnviadas = fs.query(fs.collection(db, "redacoes"), fs.where("alunoId", "==", user.uid));
            const enviadasSnap = await fs.getDocs(qEnviadas);
            const idsFeitos = new Set();
            enviadasSnap.forEach(doc => idsFeitos.add(doc.data().atividadeId));

            const qAtv = fs.query(fs.collection(db, "atividades_enviadas"), fs.where("turma", "==", turmaAluno), fs.where("tipo", "==", "escrita"));
            const snap = await fs.getDocs(qAtv);
            
            let todasPropostas = [];
            snap.forEach(docSnap => {
                const data = { id: docSnap.id, ...docSnap.data() };
                if (!idsFeitos.has(data.id)) todasPropostas.push(data);
            });

            if (todasPropostas.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">Nenhuma proposta pendente.</div>';
                return;
            }

            const totalPaginas = Math.ceil(todasPropostas.length / itensPorPaginaRecebidas);
            const inicio = (paginaRecebidas - 1) * itensPorPaginaRecebidas;
            const propostasPagina = todasPropostas.slice(inicio, inicio + itensPorPaginaRecebidas);

            container.innerHTML = "";
            propostasPagina.forEach(data => {
                const prazoF = data.prazo ? new Date(data.prazo).toLocaleDateString('pt-BR') : 'Sem prazo';
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas os dias
                const dataPrazo = data.prazo ? new Date(data.prazo) : null;
                const prazoVencido = dataPrazo && hoje > dataPrazo;
                const card = document.createElement('div');
                card.className = 'card-aluno-atv';
                card.style.marginBottom = "10px";
                card.innerHTML = `
                    <div style="min-width: 0; flex: 1;">
                        <strong style="color: #003058; display: block; font-size: 14px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${data.titulo || "Sem Título"}</strong>
                        <p style="font-size: 11px; color: ${prazoVencido ? '#dc2626' : '#64748b'}; margin-top: 4px; margin-bottom: 0;">
                            <i class="fa-regular fa-calendar"></i> Prazo: ${prazoF} ${prazoVencido ? '<strong>(VENCIDO)</strong>' : ''}
                        </p>
                    </div>
                    <button class="btn-acao-card" style="margin-left: auto;">ESCREVER</button>
                `;
                if (prazoVencido) {
                card.style.opacity = '0.6';
                card.style.cursor = 'not-allowed';
                card.querySelector('.btn-acao-card').innerText = 'PRAZO ENCERRADO';
                card.querySelector('.btn-acao-card').style.background = '#94a3b8';
    
                card.onclick = (e) => {
                e.stopPropagation();
                window.mostrarAviso("Prazo Encerrado", "Esta atividade expirou e não pode mais ser iniciada.", "erro");
                };
                } else {
                card.onclick = () => abrirEditorComProposta(data);
            }
                container.appendChild(card);
            });

            if (totalPaginas > 1) {
                const nav = document.createElement('div');
                nav.style.cssText = "display:flex; justify-content:center; align-items:center; gap:20px; margin-top:15px; padding:10px; width:100%;";
                nav.innerHTML = `
                    <button id="prev-rec" style="background:none; border:none; color:#003058; cursor:pointer; font-size:1.5rem; opacity:${paginaRecebidas === 1 ? '0.2' : '1'}">
                        <i class="fa-solid fa-circle-arrow-left"></i>
                    </button>
                    <span style="font-weight:800; color:#003058; font-size:14px;">${paginaRecebidas} de ${totalPaginas}</span>
                    <button id="next-rec" style="background:none; border:none; color:#003058; cursor:pointer; font-size:1.5rem; opacity:${paginaRecebidas === totalPaginas ? '0.2' : '1'}">
                        <i class="fa-solid fa-circle-arrow-right"></i>
                    </button>
                `;
                container.appendChild(nav);
                nav.querySelector('#prev-rec').onclick = (e) => { e.stopPropagation(); if (paginaRecebidas > 1) { paginaRecebidas--; carregarPropostasDisponiveis(); } };
                nav.querySelector('#next-rec').onclick = (e) => { e.stopPropagation(); if (paginaRecebidas < totalPaginas) { paginaRecebidas++; carregarPropostasDisponiveis(); } };
            }
        } catch (e) { container.innerHTML = '<p style="padding:20px;">Erro ao carregar.</p>'; }
    }

    // --- ABRIR EDITOR ---
    function abrirEditorComProposta(proposta) {
        propostaAtiva = proposta;
        window.switchTabEscrita('escrever');
        
        // Verifica se há rascunho salvo para ESTA atividade específica ou carrega o texto original
        const rascunhoSalvo = localStorage.getItem(`rascunho_${proposta.id || proposta.idOriginal}_${user.uid}`);
        
        document.getElementById('texto-redacao').value = rascunhoSalvo || proposta.textoOriginal || "";
        document.getElementById('tema-dinamico').innerText = proposta.conteudo || proposta.titulo || "Redação";
        
        const prazoElement = document.getElementById('prazo-dinamico');
        if (proposta.prazo) {
            prazoElement.innerText = new Date(proposta.prazo).toLocaleDateString('pt-BR');
        } else {
            prazoElement.innerText = '--/--/--';
        }
        
        const imgCont = document.getElementById('container-img-apoio');
        const imgTag = document.getElementById('img-apoio-dinamica');
        
        if (proposta.imagemApoio && proposta.imagemApoio !== "") { 
            imgTag.src = proposta.imagemApoio; 
            imgCont.style.display = 'block'; 
        } else { 
            imgCont.style.display = 'none'; 
            imgTag.src = "";
        }
        
        window.scrollTo(0, 0);
        inicializarLogicaEditor();
    }

    function inicializarLogicaEditor() {
        const textarea = document.getElementById('texto-redacao');
        const wordCountSpan = document.getElementById('contador-palavras');
        const saveIndicator = document.getElementById('salvamento-status');

        if (textarea) {
            textarea.oninput = () => {
    // Força a quebra de linha visual para o cálculo de limite
    const larguraMaximaMobile = 45; 
    let conteudo = textarea.value;
    let linhasFinais = [];
    let blocosDeTexto = conteudo.split('\n');

    blocosDeTexto.forEach(bloco => {
        if (bloco.length > larguraMaximaMobile) {
            // Quebra strings longas sem espaços em sublinhas
            for (let i = 0; i < bloco.length; i += larguraMaximaMobile) {
                linhasFinais.push(bloco.substring(i, i + larguraMaximaMobile));
            }
        } else {
            linhasFinais.push(bloco);
        }
    });

    // Aplica a trava de 25 linhas totais (reais + automáticas)
    if (linhasFinais.length > 25) {
        textarea.value = linhasFinais.slice(0, 25).join('\n');
    }

    // Atualiza contador de palavras
    const textoLimpo = textarea.value.trim();
    wordCountSpan.innerText = textoLimpo ? textoLimpo.split(/\s+/).length : 0;

    // Salvamento LocalStorage
    if (propostaAtiva) {
        const idKey = propostaAtiva.idOriginal || propostaAtiva.id;
        localStorage.setItem(`rascunho_${idKey}_${user.uid}`, textarea.value);
        
        if (saveIndicator) {
            saveIndicator.innerText = "Alterações salvas automaticamente";
            saveIndicator.style.opacity = "1";
            clearTimeout(window.saveTimeout);
            window.saveTimeout = setTimeout(() => { saveIndicator.style.opacity = "0"; }, 2000);
        }
    }
};
            
            const textoInicial = textarea.value.trim();
            wordCountSpan.innerText = textoInicial ? textoInicial.split(/\s+/).length : 0;
        }
    }

    // --- ENVIAR REDAÇÃO ---
    window.enviarRedacaoFinal = async () => {
        const textarea = document.getElementById('texto-redacao');
        const texto = textarea.value;
        if (!texto.trim()) return window.mostrarAviso("Atenção", "A folha está vazia!", "pergunta");
        
        try {
            const alunoSnap = await fs.getDoc(fs.doc(db, "usuarios", user.uid));
            const dadosAluno = alunoSnap.data();
            
            const payload = {
                texto,
                alunoId: user.uid,
                alunoNome: dadosAluno.nome || "Estudante",
                turma: propostaAtiva?.turma || dadosAluno.turma || "Sem Turma",
                atividadeId: propostaAtiva?.atividadeId || propostaAtiva?.id,
                tituloAtividade: propostaAtiva?.tituloAtividade || propostaAtiva?.titulo || "Redação",
                data: new Date().toLocaleDateString('pt-BR') + " " + new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
                timestamp: new Date(),
                status: 'pendente'
            };

            const idReferencia = propostaAtiva?.idOriginal || propostaAtiva?.id;

            if (propostaAtiva?.idOriginal) {
                const checkDoc = await fs.getDoc(fs.doc(db, "redacoes", propostaAtiva.idOriginal));
                if (checkDoc.exists() && checkDoc.data().status !== 'pendente') {
                    return window.mostrarAviso("Acesso Negado", "Sua redação já foi corrigida pelo professor e não pode mais ser alterada.", "erro", () => {
                        window.switchTabEscrita('enviadas');
                    });
                }
                await fs.updateDoc(fs.doc(db, "redacoes", propostaAtiva.idOriginal), payload);
                window.mostrarAviso("Atualizado!", "Sua redação foi atualizada.", "sucesso");
            } else {
                await fs.addDoc(fs.collection(db, "redacoes"), payload);
                window.mostrarAviso("Enviado!", "Sua redação foi entregue.", "sucesso");
            }
            
            // Limpa o rascunho do localStorage após enviar com sucesso
            localStorage.removeItem(`rascunho_${idReferencia}_${user.uid}`);
            
            textarea.value = "";
            propostaAtiva = null;
            await carregarEnviadas();
            window.switchTabEscrita('enviadas');
        } catch (e) { 
            console.error(e);
            window.mostrarAviso("Proibido escrever redação por sí!", "Você só pode escrever aqui as redações que o professor enviou.", "erro"); 
        }
    };

    // --- CARREGAR ENVIADAS ---
    async function carregarEnviadas() {
        const container = document.getElementById('lista-redacoes-enviadas');
        if (!container) return;
        container.innerHTML = '<p style="padding:20px;color:#64748b;">Carregando...</p>';
        
        try {
            const q = fs.query(fs.collection(db, "redacoes"), fs.where("alunoId", "==", user.uid), fs.orderBy("timestamp", "desc"));
            const snap = await fs.getDocs(q);
            
            if(snap.empty) {
                container.innerHTML = '<p style="padding:20px;color:#94a3b8;">Nenhuma enviada.</p>';
                return;
            }

            const todas = [];
            snap.forEach(d => todas.push({ id: d.id, ...d.data() }));

            const totalPaginas = Math.ceil(todas.length / itensPorPaginaEnviadas);
            const inicio = (paginaAtualEnviadas - 1) * itensPorPaginaEnviadas;
            const redaçõesPagina = todas.slice(inicio, inicio + itensPorPaginaEnviadas);

            container.innerHTML = "";
            redaçõesPagina.forEach(red => {
                const podeEditar = red.status === 'pendente';
                const statusBadge = red.status === 'corrigida' ? 
                    '<span style="color:#003058; font-size:10px; font-weight:800;">[ FINALIZADA / CORRIGIDA ]</span>' : 
                    (red.status === 'em_correcao' ? '<span style="color:#e67e22; font-size:10px; font-weight:800;">[ EM AVALIAÇÃO ]</span>' : '');

                const card = document.createElement('div');
                card.className = 'card-aluno-atv';
                card.style.marginBottom = "10px";
                card.style.opacity = podeEditar ? '1' : '0.9';
                
                card.innerHTML = `
                    <div style="flex:1; min-width: 200px;">
                        <strong style="color:#003058;">${red.tituloAtividade}</strong>
                        <p style="font-size:11px; color:#64748b; margin-top:4px;">Enviado em: ${red.data} ${statusBadge}</p>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${podeEditar ? `<button class="btn-acao-card btn-editar" style="background:#003058;">EDITAR</button>` : `<i class="fa-solid fa-lock" style="color:#94a3b8; font-size:1.2rem;" title="Bloqueado pelo Professor"></i>`}
                    </div>
                `;

                if(podeEditar) {
                    card.querySelector('.btn-editar').onclick = async () => {
                        const realTimeDoc = await fs.getDoc(fs.doc(db, "redacoes", red.id));
                        if (realTimeDoc.exists() && realTimeDoc.data().status !== 'pendente') {
                            window.mostrarAviso("Ação Bloqueada", "A correção desta redação já foi finalizada.", "erro");
                            carregarEnviadas(); 
                            return;
                        }

                        let prazoOriginal = null;
                        if (red.atividadeId) {
                            const atvSnap = await fs.getDoc(fs.doc(db, "atividades_enviadas", red.atividadeId));
                            if (atvSnap.exists()) {
                                prazoOriginal = atvSnap.data().prazo;
                            }
                        }

                        abrirEditorComProposta({
                            idOriginal: red.id,
                            atividadeId: red.atividadeId,
                            tituloAtividade: red.tituloAtividade,
                            textoOriginal: red.texto,
                            prazo: prazoOriginal,
                            conteudo: red.tituloAtividade,
                            imagemApoio: null
                        });
                    };
                }
                container.appendChild(card);
            });

            if (totalPaginas > 1) {
                const nav = document.createElement('div');
                nav.style.cssText = "display:flex; justify-content:center; align-items:center; gap:20px; margin-top:10px; padding:10px;";
                nav.innerHTML = `
                    <button id="prev-pag" style="background:none; border:none; color:#003058; cursor:pointer; font-size:1.5rem; opacity:${paginaAtualEnviadas === 1 ? '0.2' : '1'}"><i class="fa-solid fa-circle-arrow-left"></i></button>
                    <span style="font-weight:800; color:#003058;">${paginaAtualEnviadas} de ${totalPaginas}</span>
                    <button id="next-pag" style="background:none; border:none; color:#003058; cursor:pointer; font-size:1.5rem; opacity:${paginaAtualEnviadas === totalPaginas ? '0.2' : '1'}"><i class="fa-solid fa-circle-arrow-right"></i></button>
                `;
                container.appendChild(nav);
                nav.querySelector('#prev-pag').onclick = () => { if (paginaAtualEnviadas > 1) { paginaAtualEnviadas--; carregarEnviadas(); } };
                nav.querySelector('#next-pag').onclick = () => { if (paginaAtualEnviadas < totalPaginas) { paginaAtualEnviadas++; carregarEnviadas(); } };
            }
        } catch (e) { container.innerHTML = '<p style="padding:20px;">Erro ao carregar lista.</p>'; }
    }

    setTimeout(carregarPropostasDisponiveis, 300);

    setTimeout(() => {
        const checkDOM = setInterval(() => {
            if (document.getElementById('lista-propostas-recebidas')) {
                carregarPropostasDisponiveis();
                clearInterval(checkDOM);
            }
        }, 100);
    }, 200);

    return `
    <style>
    /* 1. ESTRUTURA GERAL */
    .container-escrita { width: 100%; box-sizing: border-box; font-family: 'Inter', sans-serif; padding: 15px; margin: 0; }
    .header-prof h1 { text-transform: uppercase; color: #003058; font-weight: 900; margin: 0; font-size: clamp(1.5rem, 6vw, 2rem); }
    
    /* 2. ABAS (PILLS) */
    .pill-tab-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-bottom: 25px; width: 100%;}
    .pill-tab { padding: 10px 2px; border-radius: 8px; border: none; font-weight: 700; font-size: 9px; cursor: pointer; transition: 0.3s; text-align: center; width: 100%; }
    .pill-active { background: #003058; color: white; box-shadow: 0 4px 12px rgba(0,48,88,0.2); }
    .pill-inactive { background: #e2e8f0; color: #64748b; }

    #tab-escrever, #tab-recebidas, #tab-enviadas { width: 100%; max-width: none; margin: 0; animation: fadeIn 0.4s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

    /* 3. TEMA E PROPOSTA (CARD DE TOPO) */
    #tema-dinamico { flex:1; font-size:14px; color:#475569; white-space:pre-wrap; overflow-wrap: break-word; line-height: 1.5; }
    .layout-proposta-flex { display: flex; flex-direction: column; gap: 15px; margin-top: 10px; }
    #container-img-apoio { width: 100%; display: none; }
    #img-apoio-dinamica { width: 100%; max-height: 300px; object-fit: contain; border-radius: 8px; }

    /* 4. A FOLHA DE REDAÇÃO - PADRÃO (DESKTOP) */
    .folha-caderno { 
        background: #fff; 
        border-radius: 4px; 
        box-shadow: 0 10px 30px rgba(0,0,0,0.15); 
        border: 1px solid #c1c5cb; 
        width: 100%; 
        max-width: 800px; 
        margin: 0 auto; 
        position: relative;
        overflow: hidden;
        height: 835px; 
        display: flex;
        flex-direction: column;
    } 

    .linha-pautada { position: relative; flex: 1; background-color: #fff; overflow: hidden; }

    .scroll-content {
        position: relative;
        width: 100%;
        height: 100%; 
        background-image: linear-gradient(#e5e7eb 1px, transparent 1px); 
        background-size: 100% 32px; 
        padding-left: 55px;
        box-sizing: border-box;
    }

    /* 5. NÚMEROS DAS LINHAS */
    .margem-numerica { 
        position: absolute; 
        left: 0; 
        top: 0; 
        width: 45px; 
        height: 100%;
        background: #fff;
        z-index: 2;
        border-right: 1px solid #fca5a5;
        display: flex;
        flex-direction: column;
    }

    .margem-numerica div {
        height: 32px !important;
        line-height: 32px !important;
        text-align: center;
        color: #94a3b8;
        font-size: 11px;
    }

    .margem-vermelha { position: absolute; left: 55px; top: 0; bottom: 0; width: 1px; background: #fca5a5; opacity: 0.5; z-index: 1; }

    /* 6. ÁREA DE TEXTO */
    #texto-redacao { 
        width: 100%; 
        height: 100%;
        background: transparent; 
        border: none; 
        outline: none; 
        resize: none; 
        font-family: 'Kalam', cursive; 
        font-size: 19px; 
        color: #2c3e50; 
        padding: 0 15px; 
        line-height: 32px; 
        display: block; 
        box-sizing: border-box; 
        overflow-y: auto;
        overflow-x: auto;
        white-space: pre;
        word-wrap: normal;
    }

    /* ESTILIZAÇÃO DA BARRA DE ROLAGEM HORIZONTAL */
    #texto-redacao::-webkit-scrollbar {
        height: 8px;
    }
    #texto-redacao::-webkit-scrollbar-track {
        background: #f1f1f1;
    }
    #texto-redacao::-webkit-scrollbar-thumb {
        background: #003058;
        border-radius: 4px;
    }
    #texto-redacao::-webkit-scrollbar-thumb:hover {
        background: #004075;
    }

    /* 7. BOTÕES (AÇÃO E ENVIAR FINAL) */
    .btn-enviar-final {
        width: 100%; 
        margin: 20px auto; 
        display: block; 
        background: #003058; 
        color: white; 
        padding: 18px; 
        border: none; 
        border-radius: 12px; 
        font-weight: 800; 
        cursor: pointer;
        transition: 0.3s;
    }

    /* Botão Editar/Ação dentro dos Cards das Listas */
    .btn-acao-card {
        background: #003058;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
        transition: 0.3s;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .btn-enviar-final:hover, .btn-acao-card:hover { background: #004075; transform: translateY(-1px); }
    .btn-enviar-final:active, .btn-acao-card:active { transform: translateY(0); }

    /* 8. CARDS DE LISTAGEM (REDAÇÕES RECEBIDAS/ENVIADAS) */
    .card-aluno-atv { 
        background: white; 
        padding: 16px; 
        border-radius: 16px; 
        border: 1px solid #edf2f7; 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        gap: 15px; 
        margin-bottom: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }

    /* ============================================================
       9. RESPONSIVIDADE
       ============================================================ */
    
    /* MOBILE */
    @media (max-width: 600px) {
        .folha-caderno { 
            height: 835px !important; 
            border-radius: 0;
            border-left: none;
            border-right: none;
            overflow-x: auto !important;
            overflow-y: hidden !important;
        }

        .linha-pautada {
            height: 800px !important;
            width: 100% !important;
            display: block !important;
        }

        .scroll-content {
            width: 300% !important;
            min-width: 300% !important;
            height: 800px !important;
            min-height: 800px !important;
            background-size: 100% 32px !important;
            padding-left: 55px;
        }

        #texto-redacao {
            width: 100% !important;
            height: 800px !important;
            font-size: 18px !important;
            white-space: pre-wrap !important;
            white-space: pre-wrap !important;
            overflow-wrap: break-word !important;
            line-height: 32px !important;
            overflow-y: hidden !important;
            overflow-x: hidden !important;
            display: block !important;
            padding-right: 20px !important;
            -webkit-overflow-scrolling: touch;
        }

        .margem-numerica {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 45px !important;
            height: 800px !important;
            background: #fff !important;
            z-index: 10 !important; /* Isso garante que os números fiquem por cima */
            border-right: 1px solid #fca5a5 !important;
            display: flex !important;
            flex-direction: column !important;
        }

        .margem-numerica div {
            height: 32px !important;
            line-height: 32px !important;
            text-align: center !important;
            color: #94a3b8 !important;
            font-size: 11px !important;
            width: 45px !important;
        }

        .card-aluno-atv { 
            flex-direction: column; 
            align-items: flex-start;
        }
        
        .btn-acao-card {
            width: 100%;
            padding: 14px;
        }
    }

    /* DESKTOP */
    @media (min-width: 768px) {
        .layout-proposta-flex { flex-direction: row; align-items: flex-start; }
        #container-img-apoio { flex: 0 0 180px; order: 2; display: block; }
        #tema-dinamico { order: 1; }
        
        .btn-enviar-final {
            max-width: 800px;
        }

        /* Garante que o card de proposta selecionada tenha o mesmo max-width do editor */
        .card-topo-proposta {
            max-width: 800px;
            margin: 0 auto 20px auto !important;
        }
    }
</style>

<div class="container-escrita">
    <div class="header-prof">
        <h1>ESCRITA</h1>
        <p style="color:#64748b;">Pratique suas redações</p>
    </div>
    
    <hr style="border:0; border-top:1px solid #e2e8f0; margin:20px 0;">
    
    <div class="pill-tab-container">
        <button id="btn-tab-recebidas" class="pill-tab pill-active" onclick="window.switchTabEscrita('recebidas')">REDAÇÕES RECEBIDAS</button>
        <button id="btn-tab-escrever" class="pill-tab pill-inactive" onclick="window.switchTabEscrita('escrever')">ESCREVER AGORA</button>
        <button id="btn-tab-enviadas" class="pill-tab pill-inactive" onclick="window.switchTabEscrita('enviadas')">MINHAS REDAÇÕES</button>
    </div>

    <div id="tab-recebidas">
        <div id="lista-propostas-recebidas">
            </div>
    </div>

    <div id="tab-escrever" style="display:none;">
        <div class="card-aluno-atv card-topo-proposta" style="display:block; border-left: 6px solid #003058; width: 100%; box-sizing: border-box;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h2 style="color:#003058; font-size:1.2rem; margin:0;">PROPOSTA SELECIONADA:</h2>
                <span style="font-size:11px; font-weight:800; color:#e67e22;">PRAZO: <span id="prazo-dinamico">--/--/--</span></span>
            </div>
            <div class="layout-proposta-flex">
                <div id="container-img-apoio">
                    <img id="img-apoio-dinamica" src="" style="width:100%; border-radius:8px;">
                </div>
                <p id="tema-dinamico">Selecione uma atividade para começar...</p>
            </div>
        </div>

        <div class="folha-caderno">
            <div style="background:#f1f5f9; padding:8px 20px; font-size:11px; font-weight:800; color:#64748b; display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #c1c5cb; position: relative; z-index: 10; height: 35px; box-sizing: border-box;">
                <div>PALAVRAS: <span id="contador-palavras">0</span> | LIMITE: 25 LINHAS</div>
                <div id="salvamento-status" style="font-size:10px; color:#003058; font-weight:700; opacity:0; transition:0.3s;">Alterações salvas automaticamente</div>
            </div>

            <div class="linha-pautada">
                <div class="scroll-content">
                    <div class="margem-numerica">
                        <div>01</div><div>02</div><div>03</div><div>04</div><div>05</div>
                        <div>06</div><div>07</div><div>08</div><div>09</div><div>10</div>
                        <div>11</div><div>12</div><div>13</div><div>14</div><div>15</div>
                        <div>16</div><div>17</div><div>18</div><div>19</div><div>20</div>
                        <div>21</div><div>22</div><div>23</div><div>24</div><div>25</div>
                    </div>
                    
                    <div class="margem-vermelha"></div>
                    
                    <textarea id="texto-redacao" spellcheck="false" placeholder="Inicie sua escrita aqui..."></textarea>
                </div>
            </div>
        </div>

        <button class="btn-enviar-final" onclick="window.enviarRedacaoFinal()">ENVIAR REDAÇÃO</button>
    </div>

    <div id="tab-enviadas" style="display:none;">
        <div id="lista-redacoes-enviadas"></div>
    </div>
</div>`;
});
