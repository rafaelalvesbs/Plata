window.Router.register('feedbackdoalunoclm', async () => {
    const db = window.db;
    const { collection, query, where, onSnapshot, doc } = window.fsMethods;

    let todosFeedbacks = [];
    let paginaAtual = 1;
    const itensPorPagina = 4;
    const azulPadrao = "#003058";

    // --- MODAL DE LEITURA COMPLETA (POP-UP) ---
    window.abrirModalFeedbackCompleto = (id) => {
        const item = todosFeedbacks.find(f => f.id === id);
        if (!item) return;

        const data = item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString('pt-BR') : '---';
        const tipo = item.tipoAtividade || item.tipo || 'ATIVIDADE';
        const conteudo = item.feedbackProfessor || item.feedbackGeral || 'Sem comentários adicionais.';

        const modalHTML = `
            <div id="modal-feedback-view" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.7); display:flex; justify-content:center; align-items:center; z-index:10000; padding:15px; backdrop-filter: blur(8px); animation: fadeInFB 0.3s ease; box-sizing: border-box;">
                <div style="background:white; border-radius:24px; max-width:600px; width:100%; max-height:90vh; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); display:flex; flex-direction:column; animation: slideUpFB 0.3s ease;">
                    
                    <div style="padding:25px; background:${azulPadrao}; color:white; position:relative;">
                        <span style="font-size:0.65rem; text-transform:uppercase; font-weight:800; opacity:0.8; letter-spacing:1px; display:block; margin-bottom:5px;">Detalhes do Feedback</span>
                        <h2 style="margin:0; font-size:1.1rem; text-transform: uppercase; line-height:1.2; padding-right:40px;">${item.tituloAtividade || 'Sem Título'}</h2>
                        <button onclick="document.getElementById('modal-feedback-view').remove()" style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.1); border:none; color:white; width:35px; height:35px; border-radius:10px; cursor:pointer; font-size:1.1rem; display:flex; align-items:center; justify-content:center; transition:0.2s;"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div style="padding:12px 25px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 10px;">
                         <span style="background:#e0e7ff; color:${azulPadrao}; font-size:9px; font-weight:800; padding:4px 10px; border-radius:6px; text-transform: uppercase;">${tipo}</span>
                         <p style="margin:0; font-size:0.7rem; color:#64748b; font-weight:600;"><i class="fa-regular fa-calendar-check" style="margin-right:5px;"></i> ${data}</p>
                    </div>

                    <div style="padding:25px; overflow-y:auto; color:#334155; line-height:1.6; font-size:0.95rem; flex-grow:1; background-image: radial-gradient(#e2e8f0 1px, transparent 1px); background-size: 20px 20px;">
                        <div style="background:white; padding:15px; border-radius:15px; border:1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                            ${conteudo.replace(/\n/g, '<br>')}
                        </div>
                    </div>

                    <div style="padding:15px 25px; background:white; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end;">
                        <button onclick="document.getElementById('modal-feedback-view').remove()" style="padding:12px 25px; background:${azulPadrao}; color:white; border:none; border-radius:12px; cursor:pointer; font-weight:800; font-size:0.7rem; text-transform:uppercase; letter-spacing:1px; width: 100%; max-width: 150px;">Entendido</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    window.mudarPaginaFeedback = (direcao) => {
        const totalPaginas = Math.ceil(todosFeedbacks.length / itensPorPagina);
        if (direcao === 'proxima' && paginaAtual < totalPaginas) paginaAtual++;
        else if (direcao === 'anterior' && paginaAtual > 1) paginaAtual--;
        renderizarListaFeedbacks();
    };

    const carregarFeedbacks = () => {
        const uid = window.authMethods.getAuth().currentUser?.uid;
        if (!uid) return;
        
        const q = query(collection(db, "redacoes"), where("alunoId", "==", uid));

        onSnapshot(q, (snapshot) => {
            todosFeedbacks = [];
            snapshot.forEach(docSnap => {
                const dados = docSnap.data();
                if (dados.feedbackProfessor || dados.feedbackGeral || dados.status === 'corrigida') {
                    todosFeedbacks.push({ id: docSnap.id, ...dados });
                }
            });
            
            todosFeedbacks.sort((a, b) => {
                const timeA = a.dataCorrecao?.seconds || a.timestamp?.seconds || 0;
                const timeB = b.dataCorrecao?.seconds || b.timestamp?.seconds || 0;
                return timeB - timeA;
            });

            const totalPaginas = Math.ceil(todosFeedbacks.length / itensPorPagina);
            if (paginaAtual > totalPaginas && totalPaginas > 0) paginaAtual = totalPaginas;

            renderizarListaFeedbacks();
        });
    };

    const renderizarListaFeedbacks = () => {
        const container = document.getElementById('lista-feedbacks-container');
        if (!container) return;
        container.innerHTML = "";

        if (todosFeedbacks.length === 0) {
            container.innerHTML = `
                <div style="padding:40px 20px; text-align:center; background:white; border-radius:24px; color:#94a3b8; border: 2px dashed #e2e8f0;">
                    <i class="fa-solid fa-box-open" style="font-size:2.5rem; margin-bottom:15px; opacity:0.5;"></i>
                    <p style="font-weight:600; margin:0; font-size:0.9rem;">Nenhum feedback disponível.</p>
                </div>`;
            return;
        }

        const totalPaginas = Math.ceil(todosFeedbacks.length / itensPorPagina);
        const feedbacksExibidos = todosFeedbacks.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

        feedbacksExibidos.forEach(item => {
            const data = item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString('pt-BR') : '---';
            const tipoExibido = item.tipoAtividade || item.tipo || 'ATIVIDADE';

            const card = document.createElement('div');
            card.className = "card-feedback-item";
            card.style.cssText = `background:#fff; border-radius:16px; padding:20px; margin-bottom:15px; display:flex; gap:15px; justify-content:space-between; align-items:center; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); border:1px solid #f1f5f9; border-left:6px solid ${azulPadrao}; min-height:100px; width:100%; box-sizing:border-box; animation: fadeInFB 0.3s ease;`;

            card.innerHTML = `
                <div style="flex:1; overflow:hidden;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px; flex-wrap: wrap;">
                        <span style="background:#eef2f7; color:${azulPadrao}; font-size:9px; font-weight:800; padding:2px 8px; border-radius:4px; text-transform: uppercase; white-space: nowrap;">${tipoExibido}</span>
                        <h3 style="margin:0; color:${azulPadrao}; font-size:13px; font-weight:800; text-transform: uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width: 150px;">${item.tituloAtividade || 'SEM TÍTULO'}</h3>
                    </div>
                    <div style="font-size:10px; color:#94a3b8; margin-bottom:8px; font-weight:600;"><i class="fa-regular fa-clock"></i> Corrigido em: ${data}</div>
                    <p style="font-size:12px; color:#64748b; margin:0; line-height:1.4; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;">
                        ${item.feedbackProfessor || item.feedbackGeral || 'Sem comentários adicionais.'}
                    </p>
                </div>
                <div class="btn-container-mobile">
                    <button onclick="window.abrirModalFeedbackCompleto('${item.id}')" style="background:${azulPadrao}; color:white; border:none; padding:10px 18px; border-radius:10px; font-size:9px; font-weight:800; cursor:pointer; text-transform: uppercase; letter-spacing:0.5px; transition:0.2s; white-space: nowrap;">Ver Comentários</button>
                </div>`;
            container.appendChild(card);
        });

        if (totalPaginas > 1) {
            const paginacao = document.createElement('div');
            paginacao.style.cssText = `display:flex; justify-content:center; align-items:center; gap:20px; margin-top:10px; padding:10px;`;
            paginacao.innerHTML = `
                <button onclick="window.mudarPaginaFeedback('anterior')" ${paginaAtual === 1 ? 'disabled style="opacity:0.3"' : ''} style="background:none; border:none; color:${azulPadrao}; cursor:pointer; font-size:1.5rem;"><i class="fa-solid fa-circle-chevron-left"></i></button>
                <span style="font-weight:800; color:${azulPadrao}; font-size:0.9rem;">${paginaAtual} / ${totalPaginas}</span>
                <button onclick="window.mudarPaginaFeedback('proxima')" ${paginaAtual === totalPaginas ? 'disabled style="opacity:0.3"' : ''} style="background:none; border:none; color:${azulPadrao}; cursor:pointer; font-size:1.5rem;"><i class="fa-solid fa-circle-chevron-right"></i></button>`;
            container.appendChild(paginacao);
        }
    };

    setTimeout(carregarFeedbacks, 150);

    return `
        <style>
            @keyframes fadeInFB { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUpFB { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            
            @media (max-width: 600px) {
                .card-feedback-item {
                    flex-direction: column !important;
                    align-items: flex-start !important;
                    gap: 15px !important;
                }
                .btn-container-mobile {
                    width: 100%;
                }
                .btn-container-mobile button {
                    width: 100%;
                    padding: 12px !important;
                }
                .header-prof h1 {
                    font-size: 1.5rem !important;
                }
            }
        </style>
        <div class="escrita-container" style="width:100%; box-sizing:border-box; animation: fadeInFB 0.4s ease; padding: 10px;">
            <div class="header-prof">
                <h1 style="text-transform:uppercase; color:${azulPadrao}; font-weight:800; font-size:1.8rem; margin:0;">Feedbacks</h1>
                <p style="color:#64748b; margin:5px 0 0 0; font-size: 0.9rem;">Acompanhe os feedbacks que o professor lhe deu.</p>
            </div>
            <hr class="divisor" style="border:none; border-top:1px solid #e2e8f0; margin:20px 0;">
            <div id="lista-feedbacks-container" style="width:100%;">
                <div style="text-align:center; padding:60px; color:#94a3b8;">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem; margin-bottom:15px; color:${azulPadrao}"></i>
                    <p style="font-weight:600; text-transform:uppercase; font-size:0.7rem; letter-spacing:1px;">Buscando correções...</p>
                </div>
            </div>
        </div>`;
});
