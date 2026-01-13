window.Router.register('mensagens', async () => {
    let todasAsMensagens = [];
    let paginaAtual = 1;
    const mensagensPorPagina = 5; 
    let filtroAtual = 'recebidas';

    const azulPadrao = "#003058";

    // --- FUNÇÕES DE INTERFACE ---

    window.mostrarFeedback = (mensagem, tipo = 'sucesso') => {
        const existente = document.getElementById('feedback-sistema');
        if (existente) existente.remove();

        const corPill = tipo === 'sucesso' ? '#22c55e' : '#dc2626';
        const icone = tipo === 'sucesso' ? 'fa-circle-check' : 'fa-circle-exclamation';

        const html = `
            <div id="feedback-sistema" style="position:fixed; top:20px; right:20px; z-index:10000; animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;">
                <div style="background:white; padding:15px 25px; border-radius:15px; box-shadow:0 15px 30px rgba(0,0,0,0.15); display:flex; align-items:center; gap:15px; border-left: 6px solid ${corPill};">
                    <i class="fa-solid ${icone}" style="color:${corPill}; font-size:1.5rem;"></i>
                    <div>
                        <p style="margin:0; font-size:0.95rem; font-weight:700; color:${azulPadrao};">${mensagem}</p>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        setTimeout(() => {
            const el = document.getElementById('feedback-sistema');
            if (el) {
                el.style.animation = 'slideOut 0.4s forwards';
                setTimeout(() => el.remove(), 400);
            }
        }, 3000);
    };

    window.abrirLeituraMensagem = async (titulo, conteudo, interlocutor, data, remetenteId, mensagemId, statusLida) => {
        const chatWindow = document.getElementById('chat-window');
        const controles = document.getElementById('paginacao-controles');

        if (filtroAtual === 'recebidas' && !statusLida) {
            try {
                await window.fsMethods.updateDoc(window.fsMethods.doc(window.db, "mensagens_diretas", mensagemId), {
                    lida: true
                });
                const msgLocal = todasAsMensagens.find(m => m.id === mensagemId);
                if (msgLocal) msgLocal.lida = true;
            } catch (e) {
                console.error("Erro ao atualizar status:", e);
            }
        }

        const exibirBotaoResposta = filtroAtual === 'recebidas';
        const exibirBotaoExcluir = filtroAtual === 'recebidas' || filtroAtual === 'enviadas';

        if (controles) controles.style.visibility = 'hidden';
        chatWindow.style.padding = "0"; 

        const layoutMensagemAberta = `
            <div id="mensagem-expandida" style="display:flex; flex-direction:column; height:100%; animation: fadeIn 0.2s ease; background: white; border-radius: 20px; overflow: hidden;">
                
                <div style="padding: 20px 25px; border-bottom: 1px solid #f1f5f9; background: white; flex-shrink: 0;">
                    <div style="display:flex; justify-content:space-between; align-items: center; margin-bottom: 5px;">
                        <span style="font-size:0.65rem; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Assunto</span>
                        <span style="font-size:0.65rem; color:#94a3b8; font-weight:700; text-transform:uppercase;">${data}</span>
                    </div>
                    <h2 style="margin:0 0 12px 0; font-size:1.2rem; color:${azulPadrao}; text-transform:uppercase; font-weight:800; letter-spacing:-0.5px;">${titulo}</h2>
                    <div style="display:flex; align-items:center; background: #f8fafc; padding: 10px 15px; border-radius: 10px; border: 1px solid #f1f5f9;">
                        <span style="font-size:0.8rem; color:#64748b; font-weight:600; margin-right:8px;">De:</span>
                        <span style="font-size:0.8rem; color:${azulPadrao}; font-weight:800;">${interlocutor}</span>
                    </div>
                </div>

                <div class="no-scrollbar" style="flex:1; overflow-y:auto; padding:25px; color:#334155;">
                    <div style="font-size:0.95rem; line-height:1.6; margin-bottom: 20px; min-height: 40px;">${conteudo}</div>
                    
                    <div id="area-resposta" style="display:none; border-top: 1px dashed #cbd5e1; padding-top: 20px; margin-top:10px;">
                        <textarea id="texto-resposta" placeholder="Escreva sua resposta..." style="width:100%; border-radius:12px; border:1px solid #cbd5e1; padding:15px; height:100px; resize:none; font-family:inherit; margin-bottom: 12px; outline:none; font-size:0.9rem;"></textarea>
                        <button onclick="window.enviarResposta('${remetenteId}', '${interlocutor}', '${titulo}')" style="width:100%; padding:15px; background:${azulPadrao}; color:white; border:none; border-radius:12px; font-weight:800; font-size:0.8rem; text-transform:uppercase; cursor:pointer; letter-spacing: 1px;">Enviar Resposta Agora</button>
                    </div>
                </div>

                <div id="footer-acoes" style="padding:15px 25px; border-top: 1px solid #f1f5f9; display:flex; gap:10px; background:#f8fafc; flex-shrink: 0;">
                    ${exibirBotaoExcluir ? `
                        <button onclick="window.excluirMensagem('${mensagemId}')" style="flex:1; padding:12px; background:#fee2e2; color:#dc2626; border:none; border-radius:10px; cursor:pointer; font-weight:800; font-size:0.7rem; text-transform:uppercase;">Excluir</button>
                    ` : ''}
                    
                    <button onclick="window.fecharLeitura()" style="flex:1; padding:12px; background:white; color:#64748b; border:1px solid #e2e8f0; border-radius:10px; cursor:pointer; font-weight:800; font-size:0.7rem; text-transform:uppercase;">Fechar</button>
                    
                    ${exibirBotaoResposta ? `
                        <button id="btn-abrir-resposta" onclick="window.mostrarCaixaResposta()" style="flex:1; padding:12px; background:${azulPadrao}; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:800; font-size:0.7rem; text-transform:uppercase;">Responder</button>
                    ` : ''}
                </div>
            </div>
        `;
        chatWindow.innerHTML = layoutMensagemAberta;
    };

    window.mostrarCaixaResposta = () => {
        const area = document.getElementById('area-resposta');
        const btnResponder = document.getElementById('btn-abrir-resposta');
        area.style.display = 'block';
        if(btnResponder) btnResponder.style.display = 'none';
        document.getElementById('texto-resposta').focus();
    };

    window.fecharLeitura = () => {
        const chatWindow = document.getElementById('chat-window');
        const controles = document.getElementById('paginacao-controles');
        if(chatWindow) chatWindow.style.padding = "20px";
        if (controles) controles.style.visibility = 'visible';
        window.renderizarPagina();
    };

    window.atualizarListaAlunosNovo = async (turmaSenha) => {
        const selectAluno = document.getElementById('novo-destinatario');
        if (!turmaSenha) {
            selectAluno.innerHTML = '<option value="">Selecione uma turma primeiro...</option>';
            selectAluno.disabled = true;
            return;
        }
        selectAluno.disabled = false;
        selectAluno.innerHTML = '<option value="">Buscando alunos...</option>';
        try {
            const q = window.fsMethods.query(
                window.fsMethods.collection(window.db, "usuarios"),
                window.fsMethods.where("turma", "==", turmaSenha),
                window.fsMethods.where("status", "==", "aprovado")
            );
            const snap = await window.fsMethods.getDocs(q);
            const auth = window.authMethods.getAuth();
            const alunos = snap.docs
                .filter(d => d.id !== auth.currentUser.uid)
                .map(d => `<option value="${d.id}" data-nome="${d.data().nome}">${d.data().nome}</option>`)
                .join('');
            selectAluno.innerHTML = alunos ? '<option value="">Selecione o aluno...</option>' + alunos : '<option value="">Nenhum colega nesta turma</option>';
        } catch (e) { 
            selectAluno.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    };

    window.abrirModalNovoMensagem = async () => {
        try {
            const snapTurmas = await window.fsMethods.getDocs(
                window.fsMethods.query(window.fsMethods.collection(window.db, "turmas"), window.fsMethods.orderBy("nomeCustomizado", "asc"))
            );
            let opcoesTurmas = snapTurmas.docs.map(doc => {
                const d = doc.data();
                return `<option value="${d.senha}">${d.nomeCustomizado}</option>`;
            }).join('');
            const modalNovoHTML = `
              <div id="modal-novo" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.75); display:flex; justify-content:center; align-items:center; z-index:9999; padding:20px; backdrop-filter: blur(6px);">
                <div style="background:white; border-radius:20px; max-width:500px; width:100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow:hidden;">
                  <div style="padding:20px; background:${azulPadrao}; color:white; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:1rem; text-transform:uppercase; font-weight:800;">Nova Mensagem</h3>
                    <button onclick="document.getElementById('modal-novo').remove()" style="background:none; border:none; color:white; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
                  </div>
                  <div style="padding:25px; display:flex; flex-direction:column; gap:15px;">
                    <div>
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:5px;">Turma:</label>
                        <select onchange="window.atualizarListaAlunosNovo(this.value)" style="width:100%; padding:12px; border-radius:10px; border:1px solid #e2e8f0; background:white;">
                            <option value="">Selecione a turma...</option>
                            ${opcoesTurmas}
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:5px;">Para:</label>
                        <select id="novo-destinatario" disabled style="width:100%; padding:12px; border-radius:10px; border:1px solid #e2e8f0; background:white;">
                            <option value="">Aguardando turma...</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:5px;">Assunto:</label>
                        <input type="text" id="novo-assunto" placeholder="Título" style="width:100%; padding:12px; border-radius:10px; border:1px solid #e2e8f0;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:5px;">Mensagem:</label>
                        <textarea id="novo-conteudo" style="width:100%; padding:12px; border-radius:10px; border:1px solid #e2e8f0; min-height:120px; resize:none; font-family:inherit;"></textarea>
                    </div>
                    <button onclick="window.processarEnvioNovaMensagem()" style="width:100%; padding:15px; background:${azulPadrao}; color:white; border:none; border-radius:12px; font-weight:800; text-transform:uppercase; cursor:pointer;">Enviar Mensagem</button>
                  </div>
                </div>
              </div>`;
            document.body.insertAdjacentHTML('beforeend', modalNovoHTML);
        } catch (e) { window.mostrarFeedback("Erro ao carregar lista de turmas.", "erro"); }
    };

    window.processarEnvioNovaMensagem = async () => {
        const select = document.getElementById('novo-destinatario');
        const destId = select.value;
        const destNome = select.options[select.selectedIndex]?.getAttribute('data-nome');
        const assunto = document.getElementById('novo-assunto').value;
        const conteudo = document.getElementById('novo-conteudo').value;
        if(!destId || !assunto || !conteudo) return window.mostrarFeedback("Preencha todos os campos.", "erro");
        try {
            const auth = window.authMethods.getAuth();
            await window.fsMethods.addDoc(window.fsMethods.collection(window.db, "mensagens_diretas"), {
                titulo: assunto,
                conteudo: conteudo,
                remetente: auth.currentUser.displayName || "Aluno",
                remetenteTipo: "aluno",
                remetenteId: auth.currentUser.uid,
                destinatarioId: destId,
                destinatarioNome: destNome, 
                dataEnvio: new Date(),
                tipo: "direta_privada",
                lida: false
            });
            window.mostrarFeedback("Mensagem enviada com sucesso!");
            document.getElementById('modal-novo').remove();
            window.carregarChatAluno();
        } catch (e) { window.mostrarFeedback("Erro ao enviar mensagem.", "erro"); }
    };

    window.enviarResposta = async (destId, destNome, assuntoOriginal) => {
        const conteudo = document.getElementById('texto-resposta').value;
        if(!conteudo) return window.mostrarFeedback("Digite sua resposta.", "erro");
        try {
            const auth = window.authMethods.getAuth();
            await window.fsMethods.addDoc(window.fsMethods.collection(window.db, "mensagens_diretas"), {
                titulo: "Re: " + assuntoOriginal,
                conteudo: conteudo,
                remetente: auth.currentUser.displayName || "Usuário",
                remetenteId: auth.currentUser.uid,
                destinatarioId: destId,
                destinatarioNome: destNome,
                dataEnvio: new Date(),
                tipo: "direta_privada",
                lida: false
            });
            window.mostrarFeedback("Resposta enviada com sucesso!");
            window.fecharLeitura();
            window.carregarChatAluno();
        } catch (e) { window.mostrarFeedback("Erro ao responder.", "erro"); }
    };

    window.renderizarPagina = () => {
        const chatWindow = document.getElementById('chat-window');
        const controles = document.getElementById('paginacao-controles');
        if (!chatWindow) return;

        chatWindow.style.padding = "20px";

        const auth = window.authMethods.getAuth();
        const mensagensFiltradas = todasAsMensagens.filter(msg => 
            filtroAtual === 'recebidas' ? msg.remetenteId !== auth.currentUser.uid : msg.remetenteId === auth.currentUser.uid
        );

        const totalPaginas = Math.ceil(mensagensFiltradas.length / mensagensPorPagina);
        const mensagensExibidas = mensagensFiltradas.slice((paginaAtual - 1) * mensagensPorPagina, paginaAtual * mensagensPorPagina);

        chatWindow.innerHTML = mensagensExibidas.length ? mensagensExibidas.map(msg => {
            const dataObj = msg.dataEnvio?.toDate() || new Date();
            const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const nomeExibicao = filtroAtual === 'recebidas'
                ? (msg.remetenteTipo === "professor" ? `Professor ${msg.remetente}` : msg.remetente)
                : (msg.destinatarioNome || "Aluno");

            let classeCor = msg.lida === true ? 'status-lida' : 'status-nova';

            return `
                <div class="card-mensagem-aluno ${filtroAtual === 'recebidas' ? classeCor : 'status-lida'}" onclick="window.abrirLeituraMensagem('${(msg.titulo || '').replace(/'/g, "\\'")}', \`${(msg.conteudo || '').replace(/`/g, "\\`").replace(/\n/g, "<br>")}\`, '${nomeExibicao}', '${dataFormatada}', '${msg.remetenteId}', '${msg.id}', ${msg.lida})">
                    <div class="conteudo-card">
                        <div class="meta-card">
                            <span class="pill-tipo">${filtroAtual === 'recebidas' ? 'RECEBIDA' : 'ENVIADA'}</span>
                            <span class="data-card">${(filtroAtual === 'recebidas' && !msg.lida) ? '<i class="fa-solid fa-circle" style="font-size:0.4rem; color:#22c55e; margin-right:5px;"></i>' : ''}${dataFormatada}</span>
                        </div>
                        <h4 class="titulo-card">${msg.titulo || 'MENSAGEM'}</h4>
                        <p class="subtitulo-card">${filtroAtual === 'recebidas' ? 'De: ' : 'Para: '}${nomeExibicao}</p>
                    </div>
                </div>`;
        }).join('') : `<p style="text-align:center; padding:40px; color:#94a3b8;">Nenhuma mensagem.</p>`;

        controles.innerHTML = totalPaginas > 1 ? `
            <div style="display:flex; align-items:center; justify-content:center; gap:20px; padding:10px;">
                <button onclick="window.mudarPaginaMensagem(-1)" ${paginaAtual === 1 ? 'disabled style="opacity:0.3;"' : ''} class="btn-pag"><i class="fa-solid fa-circle-chevron-left"></i></button>
                <span style="font-size:0.75rem; font-weight:800; color:${azulPadrao}; text-transform:uppercase;">${paginaAtual} / ${totalPaginas}</span>
                <button onclick="window.mudarPaginaMensagem(1)" ${paginaAtual === totalPaginas ? 'disabled style="opacity:0.3;"' : ''} class="btn-pag"><i class="fa-solid fa-circle-chevron-right"></i></button>
            </div>` : '';
    };

    window.carregarChatAluno = async () => {
        const chatWindow = document.getElementById('chat-window');
        if (!chatWindow) return;
        chatWindow.innerHTML = `<div style="text-align:center; padding:50px;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem; color:${azulPadrao};"></i></div>`;
        try {
            const auth = window.authMethods.getAuth();
            const alunoDoc = await window.fsMethods.getDoc(window.fsMethods.doc(window.db, "usuarios", auth.currentUser.uid));
            const codigoTurma = String(alunoDoc.data().turma || "");
            const qMsgs = window.fsMethods.query(window.fsMethods.collection(window.db, "mensagens_diretas"), window.fsMethods.orderBy("dataEnvio", "desc"));
            const snapMsgs = await window.fsMethods.getDocs(qMsgs);
            todasAsMensagens = snapMsgs.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(msg => {
                const destId = String(msg.destinatarioId || "");
                const remId = String(msg.remetenteId || "");
                const meuId = auth.currentUser.uid;
                return destId === meuId || destId === codigoTurma || destId === "Geral" || remId === meuId;
            });
            window.renderizarPagina();
        } catch (e) { chatWindow.innerHTML = "Erro ao carregar mensagens."; }
    };

    window.mudarPaginaMensagem = (dir) => { paginaAtual += dir; window.renderizarPagina(); };
    window.setFiltroMensagem = (tipo) => {
        filtroAtual = tipo;
        paginaAtual = 1;
        window.renderizarPagina();
        document.querySelectorAll('.pill-filtro').forEach(p => p.classList.toggle('pill-active', p.dataset.tipo === tipo));
    };

    // --- LOGICA DE EXCLUSÃO COM MODAL MODERNO ---
    window.excluirMensagem = (mensagemId) => {
        const modalConfirmHtml = `
            <div id="modal-confirm-excluir" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.7); backdrop-filter:blur(8px); z-index:20000; display:flex; justify-content:center; align-items:center; animation: fadeIn 0.2s ease;">
                <div style="background:white; padding:35px; border-radius:30px; width:90%; max-width:400px; text-align:center; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
                    <div style="background:#fee2e2; width:70px; height:70px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto;">
                        <i class="fa-solid fa-trash-can" style="color:#dc2626; font-size:1.8rem;"></i>
                    </div>
                    <h3 style="color:${azulPadrao}; font-weight:900; margin-bottom:10px; text-transform:uppercase; font-size:1.1rem;">Excluir Mensagem?</h3>
                    <p style="color:#64748b; font-size:0.9rem; line-height:1.5; margin-bottom:25px;">Essa ação removerá a mensagem permanentemente da sua lista. Você tem certeza?</p>
                    <div style="display:flex; gap:12px;">
                        <button onclick="document.getElementById('modal-confirm-excluir').remove()" style="flex:1; padding:14px; border:none; border-radius:15px; font-weight:800; cursor:pointer; background:#f1f5f9; color:#64748b; text-transform:uppercase; font-size:0.75rem;">Cancelar</button>
                        <button onclick="window.confirmarExclusaoFinal('${mensagemId}')" style="flex:1; padding:14px; border:none; border-radius:15px; font-weight:800; cursor:pointer; background:#dc2626; color:white; text-transform:uppercase; font-size:0.75rem;">Sim, Excluir</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalConfirmHtml);
    };

    window.confirmarExclusaoFinal = async (mensagemId) => {
        document.getElementById('modal-confirm-excluir')?.remove();
        try {
            await window.fsMethods.deleteDoc(window.fsMethods.doc(window.db, "mensagens_diretas", mensagemId));
            window.mostrarFeedback("Mensagem excluída com sucesso!");
            window.fecharLeitura();
            window.carregarChatAluno();
        } catch (e) { window.mostrarFeedback("Erro ao excluir mensagem.", "erro"); }
    };

    setTimeout(window.carregarChatAluno, 200);

    return `
    <style>
        /* Ocultar barra de rolagem para Chrome, Safari e Opera */
        #chat-window::-webkit-scrollbar,
        .sidebar-canais::-webkit-scrollbar,
        #mensagem-expandida div::-webkit-scrollbar,
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }

        /* Ocultar barra de rolagem para IE, Edge e Firefox */
        #chat-window,
        .sidebar-canais,
        #mensagem-expandida div,
        .no-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }

        @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { to { transform: translateX(120%); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .UPPERCASE-TITLE { font-size: 1.8rem; color: ${azulPadrao}; font-weight: 800; margin-bottom: 5px; text-transform: uppercase; letter-spacing: -1px; }
        
        .container-mensagens { display: grid; grid-template-columns: 280px 1fr; gap: 20px; width: 100%; height: 522px; }
        
        .sidebar-canais { background: #f8fafc; border-radius: 20px; padding: 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 10px; height: 100%; overflow-y: auto; }
        
        .chat-principal { background: white; border-radius: 20px; border: 1px solid #f1f5f9; box-shadow: 0 10px 25px rgba(0,0,0,0.04); display: flex; flex-direction: column; overflow: hidden; height: 100%; position: relative; }
        
        #chat-window { flex: 1; overflow-y: auto; padding-bottom: 10px; }

        #paginacao-controles { background: white; border-top: 1px solid #f1f5f9; flex-shrink: 0; }

        .btn-escrever { background: ${azulPadrao}; color: white; padding: 15px; border-radius: 12px; border: none; font-weight: 800; text-transform: uppercase; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; transition: 0.3s; }
        .btn-escrever:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }

        .pill-filtro { display: flex; align-items: center; gap: 12px; padding: 12px 15px; border-radius: 12px; cursor: pointer; transition: 0.2s; color: #64748b; font-weight: 600; }
        .pill-active { background: white; border-color: #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); color: ${azulPadrao}; font-weight: 800; }

        .card-mensagem-aluno { border-radius: 12px; padding: 11px 18px; cursor: pointer; transition: 0.2s; border: 1px solid #f1f5f9; border-left: 6px solid ${azulPadrao}; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 10px; }
        .status-nova { background: #f0fdf4 !important; } 
        .status-lida { background: white !important; }

        .btn-pag { background:none; border:none; color:${azulPadrao}; font-size: 1.5rem; cursor:pointer; }
        .pill-tipo { font-size: 0.6rem; font-weight: 900; background: rgba(0,48,88,0.05); color: ${azulPadrao}; padding: 3px 8px; border-radius: 6px; }
        .data-card { font-size: 0.7rem; color: #94a3b8; font-weight: 700; }
        .titulo-card { margin: 0; font-size: 0.95rem; color: ${azulPadrao}; text-transform: uppercase; font-weight: 800; }
        .subtitulo-card { margin: 2px 0 0 0; font-size: 0.8rem; color: #64748b; font-weight: 600; }
    </style>

    <div class="cabecalho-secao">
        <h1 class="UPPERCASE-TITLE">Mensagens</h1>
        <p style="color: #64748b; margin-bottom: 20px;">Mensagens privadas e avisos da turma.</p>
    </div>

    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 25px;">

    <div class="container-mensagens">
        <div class="sidebar-canais">
            <button class="btn-escrever" onclick="window.abrirModalNovoMensagem()">
                <i class="fa-solid fa-pen-to-square"></i> Escrever
            </button>
            <div class="pill-filtro pill-active" data-tipo="recebidas" onclick="window.setFiltroMensagem('recebidas')"><i class="fa-solid fa-inbox"></i> Recebidas</div>
            <div class="pill-filtro" data-tipo="enviadas" onclick="window.setFiltroMensagem('enviadas')"><i class="fa-solid fa-paper-plane"></i> Enviadas</div>
        </div>

        <div class="chat-principal">
            <div id="chat-window"></div>
            <div id="paginacao-controles"></div>
        </div>
    </div>
    `;
});