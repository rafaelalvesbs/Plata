window.Router.register('mensagensclm', async () => {
    // IMPORTAÇÕES DINÂMICAS
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
    const { getFirestore, doc, getDoc, addDoc, collection, query, where, getDocs, updateDoc, deleteDoc, orderBy } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

    const firebaseConfig = {
        apiKey: "AIzaSyDhbzne_klt9ba1B_I04JXykvpslX2aD0k",
        authDomain: "plata4form.firebaseapp.com",
        projectId: "plata4form",
        storageBucket: "plata4form.firebasestorage.app",
        messagingSenderId: "833502821958",
        appId: "1:833502821958:web:2d8899b12ca4bd97b01447"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    let todasAsMensagens = [];
    let filtroAtual = 'recebidas'; 
    let paginaAtual = 1;
    const mensagensPorPagina = 5; 
    const azulPadrao = "#003058";

    // --- FUNÇÃO DE FEEDBACK ---
    window.mostrarFeedback = (mensagem, tipo = 'sucesso') => {
        const existente = document.getElementById('feedback-sistema');
        if (existente) existente.remove();
        const corPill = tipo === 'sucesso' ? '#22c55e' : '#dc2626';
        const html = `
            <div id="feedback-sistema" style="position:fixed; top:20px; right:20px; z-index:10005; animation: slideIn 0.4s forwards;">
                <div style="background:white; padding:15px 25px; border-radius:15px; box-shadow:0 15px 30px rgba(0,0,0,0.15); display:flex; align-items:center; gap:15px; border-left: 6px solid ${corPill};">
                    <i class="fa-solid ${tipo === 'sucesso' ? 'fa-circle-check' : 'fa-circle-exclamation'}" style="color:${corPill};"></i>
                    <p style="margin:0; font-size:0.95rem; font-weight:700; color:${azulPadrao};">${mensagem}</p>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        setTimeout(() => { document.getElementById('feedback-sistema')?.remove(); }, 3000);
    };

    // --- LOGICA DE EXPANSÃO ---
    window.expandirMensagem = async (id, titulo, conteudo, interlocutor, data, remetenteId, lida) => {
        const container = document.getElementById('chat-principal-container');
        
        if (filtroAtual === 'recebidas' && !lida) {
            try {
                await updateDoc(doc(db, "mensagens_diretas", id), { lida: true });
                const msg = todasAsMensagens.find(m => m.id === id);
                if (msg) msg.lida = true;
            } catch (e) { console.error(e); }
        }

        container.innerHTML = `
            <div class="mensagem-expandida-view">
                <div class="header-expandida">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <span style="font-size:0.65rem; font-weight:800; color:#94a3b8; text-transform:uppercase;">Assunto</span>
                            <h2 style="margin:2px 0 10px 0; color:${azulPadrao}; font-size:1.3rem; text-transform:uppercase; font-weight:900;">${titulo}</h2>
                        </div>
                        <span style="color:#94a3b8; font-size:0.75rem; font-weight:700;">${data}</span>
                    </div>
                    <div style="background:#f8fafc; padding:12px 18px; border-radius:12px; border:1px solid #f1f5f9;">
                        <span style="color:#64748b; font-size:0.8rem; font-weight:600;">${filtroAtual === 'recebidas' ? 'De:' : 'Para:'}</span>
                        <span style="font-weight:800; color:${azulPadrao}; font-size:0.85rem; margin-left:5px;">${interlocutor}</span>
                    </div>
                </div>

                <div class="conteudo-scroll">
                    <div id="corpo-texto-msg">
                        ${conteudo.replace(/\n/g, '<br>')}
                    </div>

                    <div id="container-resposta-interna" style="display:none; margin-top:25px; padding-top:20px; border-top:2px dashed #e2e8f0;">
                        <textarea id="texto-resposta-interna" placeholder="Escreva sua resposta..." style="width:100%; min-height:120px; border-radius:12px; border:1px solid #cbd5e1; padding:15px; font-family:inherit; resize:none; font-size:0.95rem;"></textarea>
                        <button onclick="window.enviarRespostaExpandida('${remetenteId}', '${interlocutor}', '${titulo}')" style="width:100%; background:${azulPadrao}; color:white; border:none; padding:15px; border-radius:12px; font-weight:800; margin-top:10px; cursor:pointer; text-transform:uppercase;">Enviar Resposta Agora</button>
                    </div>
                </div>

                <div class="footer-expandida">
                    <div style="display:flex; gap:10px; width:100%; justify-content: space-between;">
                        <button onclick="window.confirmarExclusaoDireta('${id}')" style="background:#fee2e2; color:#dc2626; border:none; padding:12px; flex:1; border-radius:12px; font-weight:800; cursor:pointer; font-size:0.7rem; text-transform:uppercase;">Excluir</button>
                        <button onclick="window.renderizarPagina()" style="background:#f1f5f9; color:#64748b; border:none; padding:12px; flex:1; border-radius:12px; font-weight:800; cursor:pointer; font-size:0.7rem; text-transform:uppercase;">Fechar</button>
                        
                        <button id="btn-abrir-resposta" 
                            onclick="window.mostrarAreaResposta()" 
                            style="display: ${filtroAtual === 'recebidas' ? 'block' : 'none'}; background:${azulPadrao}; color:white; border:none; padding:12px; flex:1; border-radius:12px; font-weight:800; cursor:pointer; font-size:0.7rem; text-transform:uppercase;">
                            Responder
                        </button>
                    </div>
                </div>
            </div>
        `;
    };

    window.mostrarAreaResposta = () => {
        const area = document.getElementById('container-resposta-interna');
        area.style.display = 'block';
        document.getElementById('btn-abrir-resposta').style.display = 'none';
        const texto = document.getElementById('texto-resposta-interna');
        texto.focus();
        texto.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    // --- MODAL DE EXCLUSÃO MODERNO ---
    window.confirmarExclusaoDireta = (id) => {
        const modalHtml = `
            <div id="modal-confirm-exclusao" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.7); backdrop-filter:blur(8px); z-index:20000; display:flex; justify-content:center; align-items:center; animation: fadeIn 0.2s forwards;">
                <div style="background:white; padding:35px; border-radius:30px; width:90%; max-width:400px; text-align:center; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
                    <div style="background:#fee2e2; width:70px; height:70px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto;">
                        <i class="fa-solid fa-trash-can" style="color:#dc2626; font-size:1.8rem;"></i>
                    </div>
                    <h3 style="color:${azulPadrao}; font-weight:900; margin-bottom:10px; text-transform:uppercase;">Excluir Mensagem?</h3>
                    <p style="color:#64748b; font-size:0.95rem; line-height:1.5; margin-bottom:25px;">Esta ação não pode ser desfeita. A mensagem será removida permanentemente.</p>
                    <div style="display:flex; gap:12px;">
                        <button onclick="document.getElementById('modal-confirm-exclusao').remove()" style="flex:1; padding:14px; border:none; border-radius:15px; font-weight:800; cursor:pointer; background:#f1f5f9; color:#64748b; text-transform:uppercase; font-size:0.75rem;">Cancelar</button>
                        <button onclick="window.executarExclusao('${id}')" style="flex:1; padding:14px; border:none; border-radius:15px; font-weight:800; cursor:pointer; background:#dc2626; color:white; text-transform:uppercase; font-size:0.75rem;">Sim, Excluir</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    window.executarExclusao = async (id) => {
        document.getElementById('modal-confirm-exclusao')?.remove();
        try {
            await deleteDoc(doc(db, "mensagens_diretas", id));
            window.mostrarFeedback("Mensagem excluída!");
            window.carregarChatAluno();
        } catch (e) { window.mostrarFeedback("Erro ao excluir", "erro"); }
    };

    window.enviarRespostaExpandida = async (destId, destNome, assunto) => {
        const texto = document.getElementById('texto-resposta-interna').value;
        if(!texto) return window.mostrarFeedback("Digite algo", "erro");
        try {
            const user = auth.currentUser;
            await addDoc(collection(db, "mensagens_diretas"), {
                titulo: "Re: " + assunto,
                conteudo: texto,
                remetente: user.displayName || "Aluno",
                remetenteId: user.uid,
                destinatarioId: destId,
                destinatarioNome: destNome.replace(/^Prof\.\s+|Professor\s+/,''),
                dataEnvio: new Date(),
                tipo: "direta_privada",
                lida: false
            });
            window.mostrarFeedback("Resposta enviada!");
            window.renderizarPagina(); 
        } catch (e) { window.mostrarFeedback("Erro ao enviar", "erro"); }
    };

    // --- NOVA MENSAGEM ---
    window.abrirModalNovoMensagem = async () => {
        const user = auth.currentUser;
        const alunoDoc = await getDoc(doc(db, "usuarios", user.uid));
        const minhaTurma = String(alunoDoc.data().turma || "");
        const snapAlunos = await getDocs(query(collection(db, "usuarios"), where("turma", "==", minhaTurma)));
        const snapProf = await getDocs(query(collection(db, "usuarios"), where("tipo", "==", "professor"), where("status", "==", "aprovado")));
        
        let contatosHTML = [...snapProf.docs, ...snapAlunos.docs]
            .filter(d => d.id !== user.uid)
            .map(d => `<option value="${d.id}" data-nome="${d.data().nome}" data-tipo="${d.data().tipo}">${d.data().tipo === 'professor' ? 'Prof. ' : ''}${d.data().nome}</option>`).join('');

        document.body.insertAdjacentHTML('beforeend', `
            <div id="modal-novo" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.8); z-index:10000; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
                <div style="background:white; padding:30px; border-radius:24px; width:90%; max-width:500px; animation:fadeIn 0.3s forwards;">
                    <h3 style="color:${azulPadrao}; font-weight:800; text-transform:uppercase; margin-bottom:20px;">Nova Mensagem</h3>
                    <select id="novo-dest" style="width:100%; padding:12px; border-radius:10px; margin-bottom:15px; border:1px solid #e2e8f0;"><option value="">Para quem?</option>${contatosHTML}</select>
                    <input type="text" id="novo-ass" placeholder="Assunto" style="width:100%; padding:12px; border-radius:10px; margin-bottom:15px; border:1px solid #e2e8f0;">
                    <textarea id="novo-cont" placeholder="Sua mensagem..." style="width:100%; min-height:120px; border-radius:10px; padding:12px; border:1px solid #e2e8f0; resize:none; font-family:inherit;"></textarea>
                    <div style="display:flex; gap:10px; margin-top:20px;">
                        <button onclick="document.getElementById('modal-novo').remove()" style="flex:1; padding:15px; border:none; border-radius:12px; font-weight:700; cursor:pointer; background:#f1f5f9; color:#64748b;">CANCELAR</button>
                        <button onclick="window.enviarNovaMensagem()" style="flex:1; padding:15px; border:none; border-radius:12px; font-weight:800; cursor:pointer; background:${azulPadrao}; color:white;">ENVIAR</button>
                    </div>
                </div>
            </div>
        `);
    };

    window.enviarNovaMensagem = async () => {
        const select = document.getElementById('novo-dest');
        const destId = select.value;
        const destNome = select.options[select.selectedIndex]?.dataset.nome;
        const ass = document.getElementById('novo-ass').value;
        const cont = document.getElementById('novo-cont').value;

        if(!destId || !ass || !cont) return window.mostrarFeedback("Preencha tudo", "erro");

        try {
            const user = auth.currentUser;
            await addDoc(collection(db, "mensagens_diretas"), {
                titulo: ass, conteudo: cont,
                remetente: user.displayName || "Aluno", remetenteId: user.uid,
                destinatarioId: destId, destinatarioNome: destNome,
                destinatarioTipo: select.options[select.selectedIndex].dataset.tipo,
                dataEnvio: new Date(), tipo: "direta_privada", lida: false
            });
            document.getElementById('modal-novo').remove();
            window.mostrarFeedback("Mensagem enviada com sucesso!");
            window.carregarChatAluno();
        } catch (e) { window.mostrarFeedback("Erro ao enviar", "erro"); }
    };

    // --- RENDERIZAÇÃO DA LISTA ---
    window.renderizarPagina = () => {
        const container = document.getElementById('chat-principal-container');
        if (!container) return;

        const user = auth.currentUser;
        const filtradas = todasAsMensagens.filter(m => filtroAtual === 'recebidas' ? m.remetenteId !== user.uid : m.remetenteId === user.uid);
        const totalPaginas = Math.ceil(filtradas.length / mensagensPorPagina);
        const exibidas = filtradas.slice((paginaAtual - 1) * mensagensPorPagina, paginaAtual * mensagensPorPagina);

        let html = `<div style="padding:20px; display:flex; flex-direction:column; gap:6px; animation: fadeIn 0.3s forwards;">`;
        
        if (exibidas.length === 0) {
            html += `<p style="text-align:center; color:#94a3b8; padding:40px;">Nenhuma mensagem encontrada.</p>`;
        } else {
            exibidas.forEach(msg => {
                const data = msg.dataEnvio?.toDate().toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
                const interlocutor = filtroAtual === 'recebidas' ? (msg.remetenteTipo === 'professor' ? 'Prof. ' + msg.remetenteNome : msg.remetenteNome || msg.remetente) : msg.destinatarioNome;
                const classeLida = (filtroAtual === 'recebidas' && !msg.lida) ? 'status-nova' : 'status-lida';
                
                html += `
                    <div class="card-mensagem-aluno ${classeLida}" onclick="window.expandirMensagem('${msg.id}', '${msg.titulo.replace(/'/g, "\\'")}', \`${msg.conteudo.replace(/`/g, "\\`")}\`, '${interlocutor}', '${data}', '${msg.remetenteId}', ${msg.lida})">
                        <div class="meta-card">
                            <span class="pill-tipo">${filtroAtual.toUpperCase()}</span>
                            <span class="data-card">${(filtroAtual==='recebidas'&&!msg.lida) ? '<i class="fa-solid fa-circle" style="color:#22c55e; font-size:0.4rem; margin-right:5px;"></i>' : ''}${data}</span>
                        </div>
                        <h4 class="titulo-card">${msg.titulo || 'SEM ASSUNTO'}</h4>
                        <p class="subtitulo-card">${filtroAtual === 'recebidas' ? 'De: ' : 'Para: '}${interlocutor}</p>
                    </div>`;
            });
        }

        html += `</div>`;

        if (totalPaginas > 1) {
            html += `
                <div style="display:flex; justify-content:center; align-items:center; gap:20px; padding:15px; border-top:1px solid #f1f5f9; background:white; position:absolute; bottom:0; width:100%; left:0;">
                    <button onclick="window.mudarPaginaMsg(-1)" ${paginaAtual===1 ? 'disabled style="opacity:0.3"' : ''} class="btn-pag"><i class="fa-solid fa-chevron-left"></i></button>
                    <span style="font-weight:800; font-size:0.8rem; color:${azulPadrao}">${paginaAtual} / ${totalPaginas}</span>
                    <button onclick="window.mudarPaginaMsg(1)" ${paginaAtual===totalPaginas ? 'disabled style="opacity:0.3"' : ''} class="btn-pag"><i class="fa-solid fa-chevron-right"></i></button>
                </div>`;
        }

        container.innerHTML = html;
    };

    window.carregarChatAluno = async () => {
        const container = document.getElementById('chat-principal-container');
        if (!container) return;
        container.innerHTML = `<div style="text-align:center; padding:50px;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem; color:${azulPadrao};"></i></div>`;
        try {
            const user = auth.currentUser;
            const snap = await getDocs(query(collection(db, "mensagens_diretas"), orderBy("dataEnvio", "desc")));
            todasAsMensagens = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(m => m.destinatarioId === user.uid || m.remetenteId === user.uid);
            window.renderizarPagina();
        } catch (e) { container.innerHTML = "Erro ao carregar."; }
    };

    window.mudarPaginaMsg = (d) => { paginaAtual += d; window.renderizarPagina(); };
    window.setFiltroMensagem = (t) => {
        filtroAtual = t; paginaAtual = 1; window.renderizarPagina();
        document.querySelectorAll('.pill-filtro').forEach(p => p.classList.toggle('pill-active', p.dataset.tipo === t));
    };

    setTimeout(window.carregarChatAluno, 200);

    return `
    <style>
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .container-mensagens { 
            display: grid; 
            grid-template-columns: 280px 1fr; 
            gap: 20px; 
            width: 100%; 
            max-width: 100%;
            margin-top: 20px; 
            height: 580px; 
            overflow-x: hidden; 
        }

        .sidebar-canais { 
            background: #f8fafc; 
            border-radius: 24px; 
            padding: 20px; 
            border: 1px solid #e2e8f0; 
            height: 100%; 
            width: 280px;
            box-sizing: border-box;
        }
        
        .chat-principal { 
            background: white; 
            border-radius: 24px; 
            border: 1px solid #f1f5f9; 
            height: 100%; 
            position: relative; 
            overflow: hidden; 
            box-sizing: border-box;
        }

        .mensagem-expandida-view {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: white; z-index: 10; display: flex; flex-direction: column; animation: fadeIn 0.3s ease-out;
        }

        .header-expandida { padding: 25px 30px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0; }
        
        .conteudo-scroll { 
            flex-grow: 1; 
            overflow-y: auto; 
            padding: 30px; 
            color: #334155; 
            line-height: 1.8; 
            scrollbar-width: thin;
        }
        
        .footer-expandida { padding: 20px 30px; border-top: 1px solid #f1f5f9; background: #f8fafc; flex-shrink: 0; }

        .btn-escrever { background: ${azulPadrao}; color: white; padding: 16px; border-radius: 14px; border: none; font-weight: 800; cursor: pointer; width: 100%; margin-bottom: 15px; }
        .pill-filtro { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 14px; cursor: pointer; color: #64748b; font-weight: 700; margin-bottom: 8px; font-size: 0.85rem; }
        .pill-active { background: white; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); color: ${azulPadrao}; border: 1px solid #f1f5f9; }

        .card-mensagem-aluno { border-radius: 16px; padding: 17px 18px; cursor: pointer; border: 1px solid #f1f5f9; transition: 0.2s; border-left: 6px solid ${azulPadrao}; margin-bottom:2.5px; overflow: hidden; }
        .status-nova { background: #f0fdf4; }
        .titulo-card { margin: 3px 0; font-size: 0.9rem; color: ${azulPadrao}; font-weight: 800; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .subtitulo-card { margin: 0; font-size: 0.75rem; color: #64748b; font-weight: 600; }
        .btn-pag { background: none; border: none; color: ${azulPadrao}; font-size: 1.1rem; cursor: pointer; }
    </style>

    <div class="header-prof-msg">
        <h1 style="text-transform:uppercase; color:${azulPadrao}; font-weight:900; font-size:1.8rem; margin:0;">Mensagens</h1>
        <p style="color:#64748b; font-weight:500; margin:0;">Central de comunicações privadas.</p>
    </div>

    <hr class="divisor" style="border-color: #e2e8f0; margin: 20px 0;">

    <div class="container-mensagens">
        <div class="sidebar-canais">
            <button class="btn-escrever" onclick="window.abrirModalNovoMensagem()"><i class="fa-solid fa-pen-to-square"></i> Escrever</button>
            <div class="pill-filtro pill-active" data-tipo="recebidas" onclick="window.setFiltroMensagem('recebidas')"><i class="fa-solid fa-inbox"></i> Recebidas</div>
            <div class="pill-filtro" data-tipo="enviadas" onclick="window.setFiltroMensagem('enviadas')"><i class="fa-solid fa-paper-plane"></i> Enviadas</div>
        </div>
        <div class="chat-principal" id="chat-principal-container"></div>
    </div>
    `;
});