window.Router.register('auditivaprofessorclm', async () => {
    const db = window.db;
    const { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where, orderBy } = window.fsMethods;

    let editandoId = null;

    // --- NAVEGAÇÃO ENTRE AS ABAS PRINCIPAIS ---
    window.switchMainTabAud = (tab) => {
        document.querySelectorAll('.main-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane-aud').forEach(pane => pane.style.display = 'none');
        
        const btnAtivo = document.getElementById(`tab-btn-${tab}`);
        if(btnAtivo) btnAtivo.classList.add('active');
        document.getElementById(`pane-${tab}`).style.display = 'block';

        if (tab === 'lista') window.carregarAtividadesEnviadas();
        if (tab === 'recebidas') window.carregarTurmasRecebidas();
    };

    // --- NAVEGAÇÃO ENTRE QUESTÕES (1-10) ---
    window.switchQuestaoAud = (num) => {
        document.querySelectorAll('.a-btn-pill').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.a-content-box').forEach(c => c.style.display = 'none');
        document.getElementById(`btn-aud-${num}`).classList.add('active');
        document.getElementById(`content-aud-${num}`).style.display = 'block';
    };

    window.handleAudioAuditiva = (input, qNum) => {
        if (input.files && input.files[0]) {
            const audioPrev = document.getElementById(`audio-prev-${qNum}`);
            audioPrev.src = URL.createObjectURL(input.files[0]);
            audioPrev.style.display = 'block';
        }
    };

    // --- ABA: ATIVIDADES RECEBIDAS (Lógica de Turmas) ---
    window.carregarTurmasRecebidas = async () => {
        const grid = document.getElementById('grid-turmas-recebidas');
        grid.innerHTML = '<p style="color:#64748b;">Carregando turmas...</p>';
        try {
            const snap = await getDocs(collection(db, "turmas"));
            grid.innerHTML = '';
            snap.forEach(docTurma => {
                const t = docTurma.data();
                const nome = t.nomeCustomizado || t.nome;
                const card = document.createElement('div');
                card.className = 'card-premium';
                card.style.cursor = 'pointer';
                card.style.textAlign = 'center';
                card.innerHTML = `
                    <i class="fa-solid fa-users" style="font-size: 24px; color: #003058; margin-bottom: 10px;"></i>
                    <h3 style="margin:0; font-size: 14px; color: #003058;">${nome}</h3>
                    <small style="color: #64748b;">Ver Respostas</small>
                `;
                card.onclick = () => window.verRespostasTurma(nome);
                grid.appendChild(card);
            });
        } catch (e) { console.error(e); }
    };

    window.verRespostasTurma = (nomeTurma) => {
        alert(`Abrindo atividades recebidas da turma: ${nomeTurma}`);
        // Aqui você pode implementar a lógica para abrir a lista de alunos/atividades dessa turma específica
    };

    // --- FUNÇÃO DE PUBLICAR / ATUALIZAR ---
    window.enviarAtividadeAuditiva = async () => {
        const container = document.querySelector('.auditiva-container');
        const turmaBtn = container.querySelector('.btn-turma-pill.active');
        const prazo = document.getElementById('prazo-aud').value;
        const titulo = document.getElementById('titulo-aud').value;

        if (!turmaBtn || !prazo || !titulo.trim()) return alert("Preencha o título, selecione a turma e o prazo!");

        try {
            let questoes = [];
            for(let i=1; i<=10; i++) {
                const enunc = document.getElementById(`enunc-aud-${i}`).value;
                if(enunc.trim() !== "") {
                    questoes.push({
                        enunciado: enunc,
                        opcoes: {
                            A: document.getElementById(`opt-aud-a-${i}`).value,
                            B: document.getElementById(`opt-aud-b-${i}`).value,
                            C: document.getElementById(`opt-aud-c-${i}`).value
                        },
                        correta: document.getElementById(`correct-aud-${i}`).value,
                        midia: document.getElementById(`audio-prev-${i}`).src || null
                    });
                }
            }
            if(questoes.length === 0) return alert("Adicione pelo menos uma questão!");
            
            const dados = {
                tipo: 'auditiva',
                titulo: titulo,
                turma: turmaBtn.dataset.nome,
                prazo: prazo,
                questoes: questoes,
                dataUltimaModificacao: serverTimestamp()
            };

            if(editandoId) {
                await updateDoc(doc(db, "atividades_enviadas", editandoId), dados);
                alert("Atividade atualizada com sucesso!");
                editandoId = null;
            } else {
                dados.dataEnvio = serverTimestamp();
                await addDoc(collection(db, "atividades_enviadas"), dados);
                alert("Sucesso! Atividade Auditiva publicada.");
            }
            window.location.reload(); 
        } catch (e) { alert("Erro ao salvar."); console.error(e); }
    };

    // --- ABA: ATIVIDADES ENVIADAS (HISTÓRICO) ---
    window.carregarAtividadesEnviadas = async () => {
        const listaDiv = document.getElementById('lista-atividades-content');
        listaDiv.innerHTML = '<p style="padding:20px; color:#64748b;">Carregando atividades...</p>';
        try {
            const q = query(collection(db, "atividades_enviadas"), where("tipo", "==", "auditiva"), orderBy("dataEnvio", "desc"));
            const snap = await getDocs(q);
            listaDiv.innerHTML = '';

            if(snap.empty) {
                listaDiv.innerHTML = '<p style="padding:20px; color:#64748b;">Nenhuma atividade enviada ainda.</p>';
                return;
            }

            snap.forEach(res => {
                const ativ = res.data();
                const card = document.createElement('div');
                card.className = 'card-premium';
                card.style.marginBottom = '15px';
                card.style.setProperty('border-left', '6px solid #003058', 'important');
                card.style.display = 'block';
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0; color:#003058; font-size:16px;">${ativ.titulo || 'SEM TÍTULO'} - ${ativ.turma}</h3>
                            <small style="color:#64748b">Prazo: ${ativ.prazo.replace('T', ' ')} | ${ativ.questoes.length} Questões</small>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="btn-acao-aud edit" onclick="window.editarAtivAud('${res.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-acao-aud delete" onclick="window.excluirAtivAud('${res.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>`;
                listaDiv.appendChild(card);
            });
        } catch (e) { console.error(e); }
    };

    window.editarAtivAud = async (id) => {
        const snap = await getDocs(query(collection(db, "atividades_enviadas"))); 
        const docAtiv = snap.docs.find(d => d.id === id).data();
        editandoId = id;
        window.switchMainTabAud('criar');
        document.getElementById('prazo-aud').value = docAtiv.prazo;
        document.getElementById('titulo-aud').value = docAtiv.titulo || "";
        document.querySelector('.btn-publish').innerHTML = '<i class="fa-solid fa-save"></i> SALVAR ALTERAÇÕES';
        docAtiv.questoes.forEach((q, i) => {
            const n = i + 1;
            document.getElementById(`enunc-aud-${n}`).value = q.enunciado;
            document.getElementById(`opt-aud-a-${n}`).value = q.opcoes.A;
            document.getElementById(`opt-aud-b-${n}`).value = q.opcoes.B;
            document.getElementById(`opt-aud-c-${n}`).value = q.opcoes.C;
            document.getElementById(`correct-aud-${n}`).value = q.correta;
            if(q.midia) {
                const aud = document.getElementById(`audio-prev-${n}`);
                aud.src = q.midia; aud.style.display = 'block';
            }
        });
    };

    window.excluirAtivAud = async (id) => {
        if(confirm("Tem certeza que deseja excluir esta atividade?")) {
            await deleteDoc(doc(db, "atividades_enviadas", id));
            window.carregarAtividadesEnviadas();
        }
    };

    setTimeout(async () => {
        const div = document.getElementById('turma-pills-aud');
        const snap = await getDocs(collection(db, "turmas"));
        div.innerHTML = '';
        snap.forEach(doc => {
            const n = doc.data().nomeCustomizado || doc.data().nome;
            const btn = document.createElement('button');
            btn.className = 'btn-turma-pill';
            btn.innerText = n;
            btn.dataset.nome = n;
            btn.onclick = function() {
                div.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            };
            div.appendChild(btn);
        });
        if(div.firstChild) div.firstChild.classList.add('active');
    }, 100);

    return `
    <style>
        .auditiva-container { width: 100%; font-family: 'Inter', sans-serif; }
        .header-prof h1 { font-size: 28px; font-weight: 800; color: #003058; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 20px;}
        .main-tabs { display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
        .main-tab-btn { padding: 8px 16px; border: none; background: none; cursor: pointer; font-weight: 700; color: #64748b; border-radius: 8px; transition: 0.3s; font-size: 14px; }
        .main-tab-btn.active { background: #003058 !important; color: white !important; border-radius: 8px; }
        .card-premium { background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); padding: 25px; border: 1px solid #eef2f6; width: 100%; box-sizing: border-box; }
        .label-sutil { display: block; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
        .input-premium { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: #f8fafc; margin-bottom: 15px; box-sizing: border-box; }
        .input-fino { padding: 6px 12px !important; margin-bottom: 8px !important; font-size: 13px !important; border-radius: 6px !important; }
        .pills-container { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px; }
        .btn-turma-pill { width: 38px; height: 38px; border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; cursor: pointer; font-size: 11px; font-weight: 700; color: #64748b; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .btn-turma-pill.active { background: #003058; color: white; border-color: #003058; }
        .a-btn-pill { width: 38px; height: 38px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; font-weight: 700; color: #64748b; }
        .a-btn-pill.active { background: #003058; color: #fff; border-color: #003058; }
        .audio-upload-zone { border: 1px dashed #cbd5e1; padding: 5px; border-radius: 8px; text-align: center; cursor: pointer; background: #f8fafc; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 38px; margin-bottom: 10px; box-sizing: border-box; }
        .btn-publish { background: #003058; color: #fff; border: none; padding: 15px; width: 100%; border-radius: 10px; font-weight: 700; cursor: pointer; margin-top: 10px; }
        .btn-acao-aud { width: 35px; height: 35px; border-radius: 8px; border: none; cursor: pointer; color: white; transition: 0.2s; }
        .btn-acao-aud.edit { background: #003058; }
        .btn-acao-aud.delete { background: #ef4444; }
    </style>

    <div class="auditiva-container">
        <div class="header-prof"><h1>AUDITIVA</h1></div>
        
        <div class="main-tabs">
            <button id="tab-btn-criar" class="main-tab-btn active" onclick="window.switchMainTabAud('criar')">
                <i class="fa-solid fa-plus-circle"></i> Criar Atividades
            </button>
            <button id="tab-btn-lista" class="main-tab-btn" onclick="window.switchMainTabAud('lista')">
                <i class="fa-solid fa-paper-plane"></i> Atividades Enviadas
            </button>
            <button id="tab-btn-recebidas" class="main-tab-btn" onclick="window.switchMainTabAud('recebidas')">
                <i class="fa-solid fa-inbox"></i> Atividades Recebidas
            </button>
        </div>

        <div id="pane-criar" class="tab-pane-aud">
            <div class="card-premium">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px; flex-wrap: wrap; gap: 20px;">
                    <div style="display: flex; gap: 20px; align-items: end; flex-wrap: wrap;">
                        <div>
                            <label class="label-sutil">Turma:</label>
                            <div id="turma-pills-aud" class="pills-container" style="margin-bottom:0; gap: 5px;"></div>
                        </div>
                        <div>
                            <label class="label-sutil">Questões:</label>
                            <div class="pills-container" style="margin-bottom:0; gap: 5px; flex-wrap: nowrap;">
                                ${[1,2,3,4,5,6,7,8,9,10].map(n => `<button id="btn-aud-${n}" class="a-btn-pill ${n===1?'active':''}" onclick="window.switchQuestaoAud(${n})">${n}</button>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="label-sutil">Prazo Limite:</label>
                        <input type="datetime-local" id="prazo-aud" class="input-premium input-fino" style="width: 190px; margin-bottom:0;">
                    </div>
                </div>
                <hr style="border:0; border-top: 1px solid #eef2f6; margin-bottom: 20px;">
                <div style="margin-bottom: 20px;">
                    <label class="label-sutil">Título da Atividade:</label>
                    <input type="text" id="titulo-aud" class="input-premium" style="margin-bottom:0;" placeholder="Exemplo: Prática de Auditiva - Capítulo 1">
                </div>
                <div id="questoes-aud-container">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                        <div id="content-aud-${n}" class="a-content-box" style="${n===1?'':'display:none;'}">
                            <label class="label-sutil">QUESTÃO ${n} - ENUNCIADO</label>
                            <textarea id="enunc-aud-${n}" class="input-premium input-fino" style="min-height: 45px; height: 45px;" placeholder="Digite o enunciado..."></textarea>
                            <div class="options-stack" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                                ${['A','B','C'].map(opt => `
                                    <div>
                                        <label class="label-sutil">Opção ${opt}</label>
                                        <input type="text" id="opt-aud-${opt.toLowerCase()}-${n}" class="input-premium input-fino">
                                    </div>`).join('')}
                            </div>
                            <div style="display: flex; gap: 15px; align-items: flex-end; margin-top: 5px;">
                                <div style="flex: 1;"><label class="label-sutil">Áudio da Questão:</label>
                                    <div class="audio-upload-zone" onclick="document.getElementById('file-aud-${n}').click()">
                                        <span style="font-size: 11px; color: #64748b;"><i class="fa-solid fa-microphone-lines"></i> Carregar Áudio</span>
                                        <input type="file" id="file-aud-${n}" style="display:none" accept="audio/*" onchange="window.handleAudioAuditiva(this, ${n})">
                                    </div>
                                </div>
                                <div style="flex: 1;"><label class="label-sutil">Resposta Correta:</label>
                                    <select id="correct-aud-${n}" class="input-premium input-fino" style="height: 38px; margin-bottom: 10px !important;">
                                        <option value="A">Alternativa A</option><option value="B">Alternativa B</option><option value="C">Alternativa C</option>
                                    </select>
                                </div>
                            </div>
                            <audio id="audio-prev-${n}" controls style="display:none; width:100%; margin-top:5px; margin-bottom:15px;"></audio>
                        </div>`).join('')}
                </div>
                <button class="btn-publish" onclick="window.enviarAtividadeAuditiva()">
                    <i class="fa-solid fa-cloud-arrow-up"></i> PUBLICAR ATIVIDADE
                </button>
            </div>
        </div>

        <div id="pane-lista" class="tab-pane-aud" style="display:none;">
            <div id="lista-atividades-content"></div>
        </div>

        <div id="pane-recebidas" class="tab-pane-aud" style="display:none;">
            <div id="grid-turmas-recebidas" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                </div>
        </div>
    </div>`;
});