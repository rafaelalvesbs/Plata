window.Router.register('avisos', async () => {
    let paginaAtual = 0;
    const avisosPorPagina = 2;
    let todosOsAvisos = [];
    const azulPadrao = "#003058";
    const verdeSucesso = "#10b981";

    // --- FUNÇÃO PARA ALERTA BONITO (TOAST) ---
    const mostrarToast = (mensagem, sucesso = true) => {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 15px 25px; 
            background: ${sucesso ? verdeSucesso : '#334155'}; color: white; 
            border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); 
            z-index: 10001; font-size: 0.9rem; font-weight: 700;
            animation: slideInTop 0.5s ease forwards;
        `;
        toast.innerText = mensagem;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.5s ease forwards';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };

    // --- LÓGICA DE DADOS ---
    const carregarDadosFirebase = async () => {
        try {
            const snapTurmas = await window.fsMethods.getDocs(window.fsMethods.collection(window.db, "turmas"));
            const select = document.getElementById('select-turma');
            if (select) {
                const opcoes = snapTurmas.docs.map(doc => `<option value="${doc.data().nomeCustomizado}">${doc.data().nomeCustomizado}</option>`).join('');
                select.innerHTML = '<option value="Todas as turmas">Para todas as turmas</option>' + opcoes;
            }

            const qAvisos = window.fsMethods.query(window.fsMethods.collection(window.db, "avisos"), window.fsMethods.orderBy("dataCriacao", "desc"));
            const snapAvisos = await window.fsMethods.getDocs(qAvisos);
            todosOsAvisos = snapAvisos.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderizarPaginaAvisos();
        } catch (e) {
            console.error("Erro ao carregar dados:", e);
        }
    };

    const renderizarPaginaAvisos = () => {
        const listaDiv = document.getElementById('render-avisos');
        const controlesDiv = document.getElementById('controles-paginacao');
        if (!listaDiv) return;

        if (todosOsAvisos.length === 0) {
            listaDiv.innerHTML = '<p style="font-size:0.8rem; color:#64748b; text-align:center;">Nenhum aviso postado.</p>';
            controlesDiv.innerHTML = '';
            return;
        }

        const inicio = paginaAtual * avisosPorPagina;
        const fim = inicio + avisosPorPagina;
        const avisosExibidos = todosOsAvisos.slice(inicio, fim);

        listaDiv.innerHTML = avisosExibidos.map(av => {
            const tituloEscapado = av.titulo.replace(/'/g, "\\'");
            const conteudoEscapado = av.conteudo.replace(/'/g, "\\'");

            return `
                <div class="card-fixo-mural" style="border-left: 5px solid ${azulPadrao};">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-shrink: 0;">
                    <span style="background: #e0e7ff; color: ${azulPadrao}; padding: 3px 10px; border-radius: 6px; font-size: 0.6rem; font-weight: 800; text-transform: uppercase;">
                      ${av.turma || 'Geral'}
                    </span>
                    <div style="display: flex; gap: 8px;">
                      <button class="btn-acao-card" onclick="window.prepararEdicao('${av.id}', '${tituloEscapado}', '${conteudoEscapado}', '${av.turma}')">
                        EDITAR
                      </button>
                      <button class="btn-acao-card" onclick="window.confirmarExclusao('${av.id}')">
                        EXCLUIR
                      </button>
                    </div>
                  </div>
                  
                  <h4 class="titulo-card">${av.titulo}</h4>
                  
                  <div style="height: 1px; background-color: #f1f5f9; margin: 15px -15px; flex-shrink: 0;"></div>
                  
                  <div class="corpo-card-scroll">
                    ${av.conteudo}
                  </div>
                  <button onclick="window.verAvisoCompleto('${tituloEscapado}', '${conteudoEscapado}')" class="btn-expandir">
                    LER AVISO COMPLETO
                  </button>
                </div>`;
        }).join('');

        if (todosOsAvisos.length > avisosPorPagina) {
            controlesDiv.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 15px;">
                  <button onclick="window.mudarPagina(-1)" ${paginaAtual === 0 ? 'disabled class="pag-btn-off"' : 'class="pag-btn-on"'}>
                    &#8592;
                  </button>
                  <span style="font-size: 0.75rem; font-weight: 800; color: ${azulPadrao};">
                    ${paginaAtual + 1} / ${Math.ceil(todosOsAvisos.length / avisosPorPagina)}
                  </span>
                  <button onclick="window.mudarPagina(1)" ${fim >= todosOsAvisos.length ? 'disabled class="pag-btn-off"' : 'class="pag-btn-on"'}>
                    &#8594;
                  </button>
                </div>
            `;
        }
    };

    window.mudarPagina = (direcao) => {
        paginaAtual += direcao;
        renderizarPaginaAvisos();
    };

    window.confirmarExclusao = (id) => {
        const modalHTML = `
            <div id="modal-confirm" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,48,88,0.4); display:flex; justify-content:center; align-items:center; z-index:10000; backdrop-filter: blur(4px);">
                <div style="background:white; padding:30px; border-radius:15px; width:320px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                    <h3 style="color:${azulPadrao}; margin-top:0; font-weight: 900; font-size: 1.1rem;">REMOVER AVISO?</h3>
                    <p style="color:#64748b; font-size:0.85rem; margin-bottom: 25px;">O aviso será removido do mural de todos os alunos selecionados.</p>
                    <div style="display:flex; gap:10px;">
                        <button onclick="document.getElementById('modal-confirm').remove()" style="flex:1; padding:12px; border:1px solid #e2e8f0; background:white; border-radius:8px; cursor:pointer; font-weight:700; color: #64748b;">CANCELAR</button>
                        <button id="btn-delete-confirm" style="flex:1; padding:12px; border:none; background:${azulPadrao}; color:white; border-radius:8px; cursor:pointer; font-weight:700;">CONFIRMAR</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('btn-delete-confirm').onclick = async () => {
            document.getElementById('modal-confirm').remove();
            await window.excluirAviso(id);
        };
    };

    window.postarNovoAviso = async () => {
        const titulo = document.getElementById('input-titulo').value;
        const texto = document.getElementById('input-texto').innerHTML;
        const turma = document.getElementById('select-turma').value;

        if (!titulo || texto.trim() === "" || texto === "<br>") {
            mostrarToast("Preencha todos os campos!", false);
            return;
        }

        try {
            await window.fsMethods.addDoc(window.fsMethods.collection(window.db, "avisos"), {
                titulo, 
                conteudo: texto, 
                turma: turma, 
                dataCriacao: window.fsMethods.serverTimestamp()
            });
            mostrarToast("Aviso publicado com sucesso!");
            
            // Chama a notificação
            window.notificarAlunos(turma, titulo, texto); 

            document.getElementById('input-titulo').value = '';
            document.getElementById('input-texto').innerHTML = '';
            paginaAtual = 0;
            carregarDadosFirebase();
        } catch (e) {
            console.error(e);
            mostrarToast("Erro ao conectar com servidor.", false);
        }
    };

    window.excluirAviso = async (id) => {
        try {
            await window.fsMethods.deleteDoc(window.fsMethods.doc(window.db, "avisos", id));
            mostrarToast("Aviso removido!");
            carregarDadosFirebase(); 
        } catch (e) {
            mostrarToast("Erro ao excluir.", false);
        }
    };

    window.prepararEdicao = (id, titulo, conteudo, turma) => {
        document.getElementById('input-titulo').value = titulo;
        document.getElementById('input-texto').innerHTML = conteudo;
        document.getElementById('select-turma').value = turma;
        const btn = document.getElementById('btn-acao-aviso');
        btn.innerText = "ATUALIZAR COMUNICADO";
        btn.onclick = () => window.atualizarAviso(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.atualizarAviso = async (id) => {
        const titulo = document.getElementById('input-titulo').value;
        const texto = document.getElementById('input-texto').innerHTML;
        const turma = document.getElementById('select-turma').value;
        try {
            await window.fsMethods.updateDoc(window.fsMethods.doc(window.db, "avisos", id), {
                titulo, conteudo: texto, turma
            });
            mostrarToast("Aviso atualizado!");
            document.getElementById('input-titulo').value = '';
            document.getElementById('input-texto').innerHTML = '';
            const btn = document.getElementById('btn-acao-aviso');
            btn.innerText = "POSTAR NO MURAL E NOTIFICAR ALUNOS";
            btn.onclick = window.postarNovoAviso;
            carregarDadosFirebase(); 
        } catch (e) {
            mostrarToast("Erro ao atualizar.", false);
        }
    };

    window.verAvisoCompleto = (titulo, conteudo) => {
        const modalHTML = `
          <div id="modal-aviso" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:9999; padding:20px; backdrop-filter: blur(4px);">
            <div style="background:white; padding:30px; border-radius:15px; max-width:600px; width:100%; max-height:80vh; overflow-y:auto; box-shadow:0 20px 25px rgba(0,0,0,0.2);">
              <h2 style="color:${azulPadrao}; margin-top:0; font-size:1.4rem; font-weight:800;">${titulo}</h2>
              <hr style="border:0; border-top:1px solid #f1f5f9; margin:15px 0;">
              <div style="color:#475569; line-height:1.6; font-size:1rem;">${conteudo}</div>
              <button onclick="document.getElementById('modal-aviso').remove()" style="margin-top:25px; width:100%; padding:14px; background:${azulPadrao}; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:700; text-transform:uppercase;">FECHAR</button>
            </div>
          </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    window.notificarAlunos = async (turmaNome, titulo, conteudo) => {
        try {
            let q;
            // CORREÇÃO: Se for para todas as turmas, remove o filtro de turma da query de usuários
            if (turmaNome === "Todas as turmas") {
                q = window.fsMethods.query(
                    window.fsMethods.collection(window.db, "usuarios"), 
                    window.fsMethods.where("status", "==", "aprovado")
                );
            } else {
                q = window.fsMethods.query(
                    window.fsMethods.collection(window.db, "usuarios"), 
                    window.fsMethods.where("turma", "==", turmaNome), 
                    window.fsMethods.where("status", "==", "aprovado")
                );
            }
            
            const snap = await window.fsMethods.getDocs(q);
            
            if (snap.empty) {
                console.log("Nenhum aluno encontrado para notificar.");
                return;
            }

            snap.forEach(doc => {
                const dados = doc.data();
                if (dados.email) {
                    emailjs.send("SEU_SERVICE_ID", "SEU_TEMPLATE_ID", {
                        to_email: dados.email,
                        to_name: dados.nome || "Aluno",
                        subject: "Novo Aviso: " + titulo,
                        message: conteudo.replace(/<[^>]*>?/gm, ''), // Remove tags HTML para o email
                        class_name: turmaNome
                    });
                }
            });
        } catch (e) { 
            console.error("Erro ao notificar:", e); 
        }
    };

    setTimeout(() => {
        carregarDadosFirebase();
        const editor = document.getElementById('input-texto');
        if (editor) {
            editor.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
            });
        }
    }, 100);

    return `
    <style>
        @keyframes slideInTop { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }

        .avisos-container { display: grid; grid-template-columns: 450px 1fr; gap: 25px; align-items: start; width: 100%; }
        .card-editor { background: #fff; padding: 25px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); width: 450px; border: 1px solid #f1f5f9; }
        
        .card-fixo-mural { 
            background: #fff; border: 1px solid #f1f5f9; border-radius: 12px; 
            padding: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); 
            display: flex; flex-direction: column; 
            width: 100%; height: 215px; overflow: hidden;
            transition: transform 0.2s;
            position: relative;
        }

        .corpo-card-scroll {
            color: #64748b; font-size: 0.8rem; line-height: 1.5; 
            overflow-y: auto; flex-grow: 1; margin-bottom: 10px;
        }

        .corpo-card-scroll::-webkit-scrollbar { width: 4px; }
        .corpo-card-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

        .titulo-card {
            margin: 0; font-size: 0.9rem; color: ${azulPadrao}; 
            font-weight: 800; white-space: nowrap; overflow: hidden; 
            text-overflow: ellipsis; flex-shrink: 0;
        }

        .btn-acao-card {
            background: #f1f5f9; border: none; color: ${azulPadrao}; 
            padding: 4px 8px; border-radius: 5px; font-size: 0.65rem; 
            font-weight: 800; cursor: pointer; transition: 0.2s;
        }
        .btn-acao-card:hover { background: ${azulPadrao}; color: white; }

        .btn-expandir {
            background: none; border: none; color: #3b82f6; 
            font-size: 0.7rem; font-weight: 800; cursor: pointer; 
            padding: 0; text-align: left; width: fit-content;
        }

        .input-aviso { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 0.9rem; margin-bottom: 15px; outline: none; }
        
        .pag-btn-on { background: ${azulPadrao}; border: none; color: white; width: 35px; height: 35px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        .pag-btn-off { background: #e2e8f0; border: none; color: #94a3b8; width: 35px; height: 35px; border-radius: 8px; cursor: default; }
    </style>

    <div class="header-prof">
        <h1 style="font-size: 1.6rem; margin-bottom: 5px; text-transform: uppercase; font-weight: 900; color: ${azulPadrao};">Painel de Avisos</h1>
        <p style="font-size: 0.85rem; color: #64748b;">Comunicação direta com suas turmas.</p>
    </div>
    <hr style="border:0; border-top:2px solid #f1f5f9; margin: 15px 0 25px 0;">
    
    <div class="avisos-container">
        <div class="card-editor">
            <h3 style="font-size: 0.9rem; color: ${azulPadrao}; margin-bottom: 20px; text-transform: uppercase; font-weight: 900;">Novo Comunicado</h3>
            
            <label style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 5px;">Título do Assunto</label>
            <input type="text" id="input-titulo" class="input-aviso" placeholder="Ex: Entrega de Notas" maxlength="86">
            
            <label style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 5px;">Mensagem</label>
            <div id="input-texto" contenteditable="true" style="height: 180px; overflow-y: auto; padding: 15px; border: 1px solid #e2e8f0; border-radius: 10px; background: white; font-size: 0.9rem; margin-bottom: 15px; outline: none; color: #334155;"></div>

            <label style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 5px;">Enviar para</label>
            <select id="select-turma" class="input-aviso"></select>
            
            <button id="btn-acao-aviso" class="btn-postar" style="width:100%; padding: 15px; background:${azulPadrao}; color:white; border:none; border-radius:10px; font-weight:800; cursor:pointer; text-transform:uppercase; font-size:0.75rem;" onclick="window.postarNovoAviso()">PUBLICAR NO MURAL</button>
        </div>

        <div style="width: 100%;">
            <h3 style="color: ${azulPadrao}; font-size: 0.85rem; margin-bottom: 15px; text-transform: uppercase; font-weight: 900;">Avisos Recentes</h3>
            <div id="render-avisos" style="display: flex; flex-direction: column; gap: 12px;"></div>
            <div id="controles-paginacao"></div>
        </div>
    </div>`;
});