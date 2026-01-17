window.Router.register('oralprofessorclm', async () => {
    const db = window.db;
    const { collection, getDocs, addDoc, serverTimestamp, query, where, doc, deleteDoc, updateDoc, getDoc } = window.fsMethods;

    // --- VARIÁVEIS DE ESTADO ---
    let enviadasCache = [];
    let recebidasCache = []; 
    let idEditandoOral = null; 
    let timeoutAutoSave = null;

    // --- SISTEMA DE ALERTAS ---
    window.showAlertOral = (titulo, mensagem, tipo = 'info') => {
        const modal = document.getElementById('modal-alert-oral');
        const titleEl = document.getElementById('alert-title-oral');
        const msgEl = document.getElementById('alert-msg-oral');
        const iconEl = document.getElementById('alert-icon-oral');
        titleEl.innerText = titulo;
        msgEl.innerHTML = mensagem;
        iconEl.innerHTML = tipo === 'error' ? '<i class="fa-solid fa-circle-xmark" style="color:#ef4444; font-size:40px;"></i>' : '<i class="fa-solid fa-circle-check" style="color:#003058; font-size:40px;"></i>';
        modal.style.display = 'flex';
    };

    window.closeAlertOral = () => { document.getElementById('modal-alert-oral').style.display = 'none'; };

    window.showConfirmOral = (titulo, mensagem, onConfirm) => {
        const modal = document.getElementById('modal-confirm-oral');
        document.getElementById('confirm-title-oral').innerText = titulo;
        document.getElementById('confirm-msg-oral').innerText = mensagem;
        modal.style.display = 'flex';
        window.pendingConfirmActionOral = () => { onConfirm(); modal.style.display = 'none'; };
    };

    // --- FUNÇÃO DE VISUALIZAÇÃO ---
    window.visualizarAtividadeOral = (id) => {
        const item = enviadasCache.find(atv => atv.id === id);
        if(!item) return;
        
        const modal = document.getElementById('modal-view-oral');
        const content = document.getElementById('view-content-oral');
        
        document.getElementById('view-title-oral').innerText = item.titulo;
        
        content.innerHTML = item.questoes.map((q, idx) => `
            <div style="margin-bottom:12px; padding:10px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
                <div style="font-size:10px; font-weight:800; color:#003058; margin-bottom:4px;">QUESTÃO ${idx + 1}</div>
                <div style="font-size:13px; color:#334155;">${q.enunciado}</div>
            </div>
        `).join('');
        
        modal.style.display = 'flex';
    };

    // --- AUTO SAVE ---
    window.triggerAutoSaveOral = () => {
        if (!idEditandoOral) return;
        clearTimeout(timeoutAutoSave);
        const statusElement = document.getElementById('save-status-oral');
        if(statusElement) statusElement.innerText = "Alterações pendentes...";
        timeoutAutoSave = setTimeout(async () => {
            await window.enviarAtividadeOral(true);
            if(statusElement) { statusElement.innerText = "Salvo!"; setTimeout(() => { statusElement.innerText = ""; }, 2000); }
        }, 2000);
    };

    // --- NAVEGAÇÃO ---
    window.switchMainTabOral = (tab) => {
        document.querySelectorAll('.main-tab-btn-oral').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane-oral').forEach(pane => pane.style.display = 'none');
        document.getElementById(`tab-btn-oral-${tab}`).classList.add('active');
        document.getElementById(`pane-oral-${tab}`).style.display = 'block';

        if(tab === 'enviadas') window.carregarAtividadesEnviadasOral();
        if(tab === 'recebidas') window.carregarRecebidasOral();
        if(tab !== 'criar') {
            idEditandoOral = null;
            const btnPub = document.querySelector('.btn-publish-oral');
            if(btnPub) btnPub.innerText = "PUBLICAR ATIVIDADE ORAL";
        }
    };

    window.switchQuestaoOral = (num) => {
        document.querySelectorAll('.o-btn-pill').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.o-content-box').forEach(c => c.style.display = 'none');
        document.getElementById(`btn-oral-${num}`).classList.add('active');
        document.getElementById(`content-oral-${num}`).style.display = 'block';
    };

    // --- CARREGAMENTO DE LISTAS ---
    window.carregarAtividadesEnviadasOral = async () => {
        const container = document.getElementById('lista-enviadas-oral-content');
        container.innerHTML = '<p style="padding:15px; color:#64748b;">Buscando atividades...</p>';
        try {
            const q = query(collection(db, "atividades_enviadas"), where("tipo", "==", "oral"));
            const snap = await getDocs(q);
            enviadasCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            enviadasCache.sort((a,b) => (b.dataEnvio?.seconds || 0) - (a.dataEnvio?.seconds || 0));
            
            if (enviadasCache.length === 0) {
                container.innerHTML = '<p style="padding:20px; text-align:center; color:#94a3b8;">Nenhuma atividade oral criada.</p>';
                return;
            }

            container.innerHTML = enviadasCache.map(data => `
                <div class="card-premium-list" style="margin-bottom:7px; padding:10px; border-left:4px solid #003058; background:#fff; border-radius:8px; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="flex:1">
                        <span style="font-size:9px; padding:2px 6px; background:#003058; color:white; border-radius:4px; font-weight:700;">Semestre ${data.turma}</span>
                        <h3 style="margin:0 0 0 6px; color:#003058; font-size:13px; display:inline-block;">${data.titulo}</h3>
                        <div style="font-size:10px; color:#94a3b8;">Prazo: ${data.prazo}</div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button onclick="window.visualizarAtividadeOral('${data.id}')" title="Visualizar" style="background:#e0f2fe; color:#0369a1; border:none; border-radius:6px; padding:6px 10px; cursor:pointer;"><i class="fa-solid fa-eye"></i></button>
                        <button onclick="window.prepararEdicaoOral('${data.id}')" title="Editar" style="background:#f1f5f9; color:#003058; border:none; border-radius:6px; padding:6px 10px; cursor:pointer;"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="window.excluirAtividadeOral('${data.id}')" title="Excluir" style="background:#fee2e2; color:#ef4444; border:none; border-radius:6px; padding:6px 10px; cursor:pointer;"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
            `).join('');
        } catch (e) { container.innerHTML = '<p>Erro ao carregar.</p>'; }
    };

    window.carregarRecebidasOral = async () => {
        const container = document.getElementById('lista-recebidas-oral-content');
        container.innerHTML = '<p style="padding:15px; color:#64748b;">Buscando áudios dos alunos...</p>';
        try {
            const q = query(collection(db, "respostas_alunos"), where("tipo", "==", "oral"));
            const snap = await getDocs(q);
            const promessas = snap.docs.map(async (d) => {
                const data = d.data();
                const alunoDoc = await getDoc(doc(db, "usuarios", data.alunoId));
                return { id: d.id, nomeAluno: alunoDoc.exists() ? alunoDoc.data().nome : "Aluno", ...data };
            });
            recebidasCache = await Promise.all(promessas);
            recebidasCache.sort((a,b) => (b.dataEntrega?.seconds || 0) - (a.dataEntrega?.seconds || 0));
            
            if (recebidasCache.length === 0) {
                container.innerHTML = '<p style="padding:20px; text-align:center; color:#94a3b8;">Nenhum áudio entregue ainda.</p>';
                return;
            }

            container.innerHTML = recebidasCache.map(data => `
                <div class="card-premium-list" style="margin-bottom:7px; padding:10px; border-left:4px solid #10b981; background:#fff; border-radius:8px; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div>
                        <h3 style="margin:0; color:#003058; font-size:13px;">${data.nomeAluno}</h3>
                        <div style="font-size:10px; color:#94a3b8;">Atividade: ${data.titulo}</div>
                    </div>
                    <button style="background:#e0f2fe; color:#0369a1; border:none; border-radius:6px; padding:6px 10px; cursor:pointer;"><i class="fa-solid fa-microphone"></i> Ouvir</button>
                </div>
            `).join('');
        } catch (e) { container.innerHTML = '<p>Erro ao carregar.</p>'; }
    };

    // --- SALVAMENTO E VALIDAÇÃO ---
    window.enviarAtividadeOral = async (isAutoSave = false) => {
        const turmaBtn = document.querySelector('#turma-pills-oral .btn-turma-pill.active');
        const titulo = document.getElementById('titulo-oral').value;
        const prazoValue = document.getElementById('prazo-oral').value;

        if(!isAutoSave && (!turmaBtn || !titulo || !prazoValue)) {
            return window.showAlertOral("Atenção", "Preencha o Semestre, Título e Prazo!", "error");
        }

        if (prazoValue) {
            const dataPrazo = new Date(prazoValue + "T00:00:00");
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            if (dataPrazo < hoje) {
                return window.showAlertOral("Data Inválida", "O prazo não pode ser uma data que já passou!", "error");
            }
        }

        try {
            let questoes = [];
            for(let i=1; i<=10; i++) {
                const enunc = document.getElementById(`enunciado-oral-${i}`).value;
                if(enunc.trim()) questoes.push({ enunciado: enunc });
            }

            if(!isAutoSave && questoes.length === 0) return window.showAlertOral("Atenção", "Adicione pelo menos uma pergunta!", "error");

            const dados = {
                tipo: 'oral',
                titulo,
                turma: turmaBtn ? turmaBtn.dataset.nome : "",
                prazo: prazoValue,
                questoes,
                dataEnvio: serverTimestamp()
            };

            if(idEditandoOral) {
                await updateDoc(doc(db, "atividades_enviadas", idEditandoOral), dados);
                if(!isAutoSave) {
                    window.showAlertOral("Sucesso", "Atividade Oral Atualizada!");
                    window.switchMainTabOral('enviadas');
                }
            } else if(!isAutoSave) {
                const ref = await addDoc(collection(db, "atividades_enviadas"), dados);
                idEditandoOral = ref.id;
                window.showAlertOral("Sucesso", "Atividade Oral Publicada!");
                window.switchMainTabOral('enviadas');
            }
        } catch(e) { console.error(e); }
    };

    window.prepararEdicaoOral = (id) => {
        const item = enviadasCache.find(atv => atv.id === id);
        if(!item) return;
        idEditandoOral = id;
        window.switchMainTabOral('criar');
        document.getElementById('titulo-oral').value = item.titulo || "";
        document.getElementById('prazo-oral').value = item.prazo || "";
        
        document.querySelectorAll('#turma-pills-oral .btn-turma-pill').forEach(btn => {
            btn.classList.remove('active');
            if(btn.dataset.nome === item.turma) btn.classList.add('active');
        });

        for(let i=1; i<=10; i++) document.getElementById(`enunciado-oral-${i}`).value = "";
        item.questoes.forEach((q, idx) => {
            document.getElementById(`enunciado-oral-${idx + 1}`).value = q.enunciado;
        });
        document.querySelector('.btn-publish-oral').innerText = "ATUALIZAR ATIVIDADE ORAL";
    };

    window.excluirAtividadeOral = (id) => {
        window.showConfirmOral("Excluir?", "Apagar permanentemente esta atividade oral?", async () => {
            await deleteDoc(doc(db, "atividades_enviadas", id));
            window.carregarAtividadesEnviadasOral();
        });
    };

    // --- CARREGAR SEMESTRES REAIS ---
    setTimeout(async () => {
        const div = document.getElementById('turma-pills-oral');
        const snap = await getDocs(collection(db, "turmas"));
        
        const semestresMap = new Map();
        snap.forEach(d => {
            const t = d.data();
            if(t.semestre && !semestresMap.has(t.semestre)) {
                semestresMap.set(t.semestre, t.semestre); 
            }
        });

        const listaUnica = Array.from(semestresMap.keys());
        listaUnica.sort((a, b) => {
            const getVal = (s) => {
                const str = String(s).toLowerCase();
                if(str.includes('inter')) return 999;
                return parseInt(str) || 0;
            };
            return getVal(a) - getVal(b);
        });

        div.innerHTML = listaUnica.map(semestre => `
            <button class="btn-turma-pill" data-nome="${semestre}" 
                onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('active')); this.classList.add('active'); window.triggerAutoSaveOral();">
                ${semestre}
            </button>`).join('');

        if(div.firstChild) div.firstChild.classList.add('active');
    }, 500);

    return `
    <style>
        .oral-container { width:100%; font-family:'Inter',sans-serif; padding:15px; box-sizing:border-box; }
        .card-oral { background:#fff; border-radius:12px; padding:18px; box-shadow:0 4px 12px rgba(0,0,0,0.05); border:1px solid #eef2f6; }
        .input-premium { width:100%; padding:9px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; background:#f8fafc; margin-bottom:10px; font-family:inherit; }
        .label-sutil { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:3px; }
        .o-btn-pill { min-width:32px; height:32px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; cursor:pointer; font-weight:700; font-size:11px; color:#64748b; }
        .o-btn-pill.active { background:#003058; color:#fff; border-color:#003058; }
        .btn-turma-pill { padding:6px 12px; border:1px solid #e2e8f0; background:#fff; border-radius:20px; cursor:pointer; font-size:11px; font-weight:700; margin-right:5px; white-space:nowrap; transition:0.2s; }
        .btn-turma-pill.active { background:#003058; color:#fff; border-color:#003058; }
        .main-tab-btn-oral { padding:7px 15px; border:none; background:none; cursor:pointer; font-weight:700; color:#64748b; border-bottom:3px solid transparent; }
        .main-tab-btn-oral.active { color:#003058; border-bottom:3px solid #003058; }
        .btn-publish-oral { background:#003058; color:#fff; border:none; padding:12px; width:100%; border-radius:10px; font-weight:700; cursor:pointer; margin-top:10px; display:flex; align-items:center; justify-content:center; gap:8px; }
        .modal-oral { position:fixed; inset:0; background:rgba(0,48,88,0.4); backdrop-filter:blur(4px); display:none; justify-content:center; align-items:center; z-index:9999; padding:20px; }
        .modal-oral-content { background:#fff; width:100%; max-width:400px; border-radius:20px; padding:25px; text-align:center; position:relative; }
    </style>

    <div class="oral-container">
        <div id="modal-alert-oral" class="modal-oral"><div class="modal-oral-content"><div id="alert-icon-oral" style="margin-bottom:10px;"></div><h3 id="alert-title-oral"></h3><div id="alert-msg-oral"></div><button class="btn-publish-oral" onclick="window.closeAlertOral()">OK</button></div></div>
        <div id="modal-confirm-oral" class="modal-oral"><div class="modal-oral-content"><h3 id="confirm-title-oral">Confirmar?</h3><p id="confirm-msg-oral"></p><div style="display:flex; gap:10px;"><button class="btn-publish-oral" style="background:#ef4444" onclick="window.pendingConfirmActionOral()">SIM</button><button class="btn-publish-oral" style="background:#f1f5f9; color:#64748b" onclick="this.closest('.modal-oral').style.display='none'">NÃO</button></div></div></div>
        
        <div id="modal-view-oral" class="modal-oral">
            <div class="modal-oral-content" style="max-width:500px; text-align:left;">
                <h3 id="view-title-oral" style="color:#003058; margin-top:0;"></h3>
                <div id="view-content-oral" style="max-height:400px; overflow-y:auto; margin-bottom:20px;"></div>
                <button class="btn-publish-oral" onclick="this.closest('.modal-oral').style.display='none'">FECHAR VISUALIZAÇÃO</button>
            </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h1 style="color:#003058; font-weight:800; margin:0; font-size:24px;">ORAL</h1>
            <div id="save-status-oral" style="font-size:10px; color:#003058; font-weight:700;"></div>
        </div>

        <div class="main-tabs" style="display:flex; gap:10px; border-bottom:2px solid #e2e8f0; margin:15px 0;">
            <button id="tab-btn-oral-criar" class="main-tab-btn-oral active" onclick="window.switchMainTabOral('criar')">CRIAR</button>
            <button id="tab-btn-oral-enviadas" class="main-tab-btn-oral" onclick="window.switchMainTabOral('enviadas')">ENVIADAS</button>
            <button id="tab-btn-oral-recebidas" class="main-tab-btn-oral" onclick="window.switchMainTabOral('recebidas')">RECEBIDAS</button>
        </div>

        <div id="pane-oral-criar" class="tab-pane-oral" style="display:block;">
            <div class="card-oral">
                <div style="display:grid; grid-template-columns: 1fr 130px; gap:10px; margin-bottom:15px;">
                    <div>
                        <label class="label-sutil">Título da Atividade:</label>
                        <input type="text" id="titulo-oral" class="input-premium" placeholder="Ex: Unit 1 - Speaking" oninput="window.triggerAutoSaveOral()">
                    </div>
                    <div>
                        <label class="label-sutil">Prazo (Até o dia):</label>
                        <input type="date" id="prazo-oral" class="input-premium" onchange="window.triggerAutoSaveOral()">
                    </div>
                </div>

                <label class="label-sutil">Semestre Destino:</label>
                <div id="turma-pills-oral" style="display:flex; overflow-x:auto; margin-bottom:20px; padding-bottom:5px;"></div>

                <label class="label-sutil">Navegar Questões:</label>
                <div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:15px;">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<button id="btn-oral-${n}" class="o-btn-pill ${n===1?'active':''}" onclick="window.switchQuestaoOral(${n})">${n}</button>`).join('')}
                </div>

                <div style="background:#fbfcfd; padding:15px; border-radius:12px; border:1px solid #f1f5f9; min-height:120px;">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                        <div id="content-oral-${n}" class="o-content-box" style="${n===1?'':'display:none;'}">
                            <label class="label-sutil">Enunciado / Pergunta ${n}:</label>
                            <textarea id="enunciado-oral-${n}" class="input-premium" style="height:80px; resize:none;" placeholder="Digite o que o aluno deve falar ou responder no áudio..." oninput="window.triggerAutoSaveOral()"></textarea>
                        </div>
                    `).join('')}
                </div>

                <button class="btn-publish-oral" onclick="window.enviarAtividadeOral(false)">
                    <i class="fa-solid fa-microphone-lines"></i> PUBLICAR ATIVIDADE ORAL
                </button>
            </div>
        </div>

        <div id="pane-oral-enviadas" class="tab-pane-oral" style="display:none;"><div id="lista-enviadas-oral-content"></div></div>
        <div id="pane-oral-recebidas" class="tab-pane-oral" style="display:none;"><div id="lista-recebidas-oral-content"></div></div>
    </div>
    `;
});
