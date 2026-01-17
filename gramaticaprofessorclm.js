window.Router.register('gramaticaprofessorclm', async () => {
    const db = window.db;
    const { collection, getDocs, addDoc, serverTimestamp, query, where, doc, deleteDoc, updateDoc, getDoc } = window.fsMethods;

    // --- VARIÁVEIS DE ESTADO ---
    let enviadasCache = [];
    let recebidasCache = []; 
    let idEditandoGram = null; 
    let timeoutAutoSave = null;

    // --- SISTEMA DE ALERTAS ---
    window.showAlertGram = (titulo, mensagem, tipo = 'info') => {
        const modal = document.getElementById('modal-alert-gram');
        const titleEl = document.getElementById('alert-title-gram');
        const msgEl = document.getElementById('alert-msg-gram');
        const iconEl = document.getElementById('alert-icon-gram');
        titleEl.innerText = titulo;
        msgEl.innerHTML = mensagem;
        iconEl.innerHTML = tipo === 'error' ? '<i class="fa-solid fa-circle-xmark" style="color:#ef4444; font-size:40px;"></i>' : '<i class="fa-solid fa-circle-check" style="color:#003058; font-size:40px;"></i>';
        modal.style.display = 'flex';
    };

    window.closeAlertGram = () => { document.getElementById('modal-alert-gram').style.display = 'none'; };

    window.showConfirmGram = (titulo, mensagem, onConfirm) => {
        const modal = document.getElementById('modal-confirm-gram');
        document.getElementById('confirm-title-gram').innerText = titulo;
        document.getElementById('confirm-msg-gram').innerText = mensagem;
        modal.style.display = 'flex';
        window.pendingConfirmAction = () => { onConfirm(); modal.style.display = 'none'; };
    };

    // --- AUTO SAVE ---
    window.triggerAutoSave = () => {
        if (!idEditandoGram) return;
        clearTimeout(timeoutAutoSave);
        const statusElement = document.getElementById('save-status');
        if(statusElement) statusElement.innerText = "Alterações pendentes...";
        timeoutAutoSave = setTimeout(async () => {
            await window.enviarAtividadeGramatica(true);
            if(statusElement) { statusElement.innerText = "Salvo!"; setTimeout(() => { statusElement.innerText = ""; }, 2000); }
        }, 2000);
    };

    // --- NAVEGAÇÃO ---
    window.switchMainTabGram = (tab) => {
        document.querySelectorAll('.main-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane-gram').forEach(pane => pane.style.display = 'none');
        document.getElementById(`tab-btn-${tab}`).classList.add('active');
        document.getElementById(`pane-${tab}`).style.display = 'block';

        if(tab === 'enviadas') { window.carregarAtividadesEnviadasGram(); }
        if(tab === 'recebidas') { window.carregarRecebidasGram(); }
        if(tab !== 'criar') {
            idEditandoGram = null;
            const btnPub = document.querySelector('.btn-publish-gram');
            if(btnPub) btnPub.innerText = "PUBLICAR ATIVIDADE AGORA";
        }
    };

    window.switchQuestaoGram = (target) => {
        document.querySelectorAll('.g-btn-pill').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.g-content-box').forEach(c => c.style.display = 'none');
        document.getElementById(`btn-gram-${target}`).classList.add('active');
        document.getElementById(`content-gram-${target}`).style.display = 'block';
    };

    // --- IMAGENS (REDIMENSIONAMENTO) ---
    const redimensionarImagem = (base64) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const max = 800;
                let w = img.width, h = img.height;
                if (w > h) { if (w > max) { h *= max / w; w = max; } }
                else { if (h > max) { w *= max / h; h = max; } }
                canvas.width = w; canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        });
    };

    window.handleGrammarImage = async (input, qNum) => {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const resized = await redimensionarImagem(e.target.result);
                document.getElementById(`img-prev-gram-${qNum}`).src = resized;
                document.getElementById(`img-wrapper-gram-${qNum}`).style.display = 'block';
                input.value = "";
                window.triggerAutoSave();
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window.removerFotoGram = (qNum, shouldSave = true) => {
        document.getElementById(`img-wrapper-gram-${qNum}`).style.display = 'none';
        document.getElementById(`img-prev-gram-${qNum}`).src = "";
        if(shouldSave) window.triggerAutoSave();
    };

    // --- CARREGAMENTO DE LISTAS (SEM PAGINAÇÃO) ---
    window.carregarAtividadesEnviadasGram = async () => {
        const container = document.getElementById('lista-enviadas-content');
        container.innerHTML = '<p style="padding:15px; color:#64748b;">Buscando atividades...</p>';
        try {
            const q = query(collection(db, "atividades_enviadas"), where("tipo", "==", "gramatica"));
            const snap = await getDocs(q);
            enviadasCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            enviadasCache.sort((a,b) => (b.dataEnvio?.seconds || 0) - (a.dataEnvio?.seconds || 0));
            
            if (enviadasCache.length === 0) {
                container.innerHTML = '<p style="padding:20px; text-align:center; color:#94a3b8;">Vazio.</p>';
                return;
            }

            container.innerHTML = enviadasCache.map(data => `
                <div class="card-premium-list" style="margin-bottom:7px; padding:10px; border-left:4px solid #003058; background:#fff; border-radius:8px; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="flex:1">
                        <span style="font-size:9px; padding:2px 6px; background:#003058; color:white; border-radius:4px; font-weight:700;">${data.semestre}</span>
                        <h3 style="margin:0 0 0 6px; color:#003058; font-size:13px; display:inline-block;">${data.titulo}</h3>
                        <div style="font-size:10px; color:#94a3b8;">Prazo: ${data.prazo}</div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button onclick="window.visualizarAtividadeGram('${data.id}')" style="background:#e0f2fe; color:#0369a1; border:none; border-radius:6px; padding:6px 10px; cursor:pointer;"><i class="fa-solid fa-eye"></i></button>
                        <button onclick="window.prepararEdicaoGramatica('${data.id}')" style="background:#f1f5f9; color:#003058; border:none; border-radius:6px; padding:6px 10px; cursor:pointer;"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button onclick="window.excluirAtividadeGram('${data.id}')" style="background:#fee2e2; color:#ef4444; border:none; border-radius:6px; padding:6px 10px; cursor:pointer;"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
            `).join('');
        } catch (e) { container.innerHTML = '<p>Erro ao carregar.</p>'; }
    };

    window.carregarRecebidasGram = async () => {
        const container = document.getElementById('lista-recebidas-content');
        container.innerHTML = '<p style="padding:15px; color:#64748b;">Buscando entregas...</p>';
        try {
            const q = query(collection(db, "respostas_alunos"));
            const snap = await getDocs(q);
            const promessas = snap.docs.map(async (d) => {
                const data = d.data();
                const alunoDoc = await getDoc(doc(db, "usuarios", data.alunoId));
                return { id: d.id, nomeAluno: alunoDoc.exists() ? alunoDoc.data().nome : "Aluno", ...data };
            });
            recebidasCache = await Promise.all(promessas);
            recebidasCache.sort((a,b) => (b.dataEntrega?.seconds || 0) - (a.dataEntrega?.seconds || 0));
            
            if (recebidasCache.length === 0) {
                container.innerHTML = '<p style="padding:20px; text-align:center; color:#94a3b8;">Nenhuma resposta.</p>';
                return;
            }

            container.innerHTML = recebidasCache.map(data => `
                <div class="card-premium-list" style="margin-bottom:7px; padding:10px; border-left:4px solid #003058; background:#fff; border-radius:8px; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div>
                        <span style="font-size:9px; padding:2px 6px; background:#003058; color:white; border-radius:4px; font-weight:700;">NOTA: ${data.nota}</span>
                        <h3 style="margin:0 0 0 6px; color:#003058; font-size:13px; display:inline-block;">${data.nomeAluno}</h3>
                        <div style="font-size:10px; color:#94a3b8;">Atividade: ${data.titulo}</div>
                    </div>
                </div>
            `).join('');
        } catch (e) { container.innerHTML = '<p>Erro ao carregar.</p>'; }
    };

    // --- VISUALIZAÇÃO ---
    window.visualizarAtividadeGram = (id) => {
        const item = enviadasCache.find(atv => atv.id === id);
        if(!item) return;
        const modal = document.getElementById('modal-preview-gram');
        const content = document.getElementById('modal-preview-content');
        
        let questHtml = item.questoes.map((q, i) => `
            <div style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <p style="font-weight:700; color:#003058; font-size:13px;">${i+1}. ${q.enunciado}</p>
                ${q.imagem ? `<img src="${q.imagem}" style="width:120px; height:120px; object-fit:cover; border-radius:8px; margin-bottom:10px; display:block;">` : ''}
                <div style="font-size:12px;">
                    <div style="${q.correta === 'A' ? 'color:#003058; font-weight:700' : ''}">A) ${q.opcoes.A}</div>
                    <div style="${q.correta === 'B' ? 'color:#003058; font-weight:700' : ''}">B) ${q.opcoes.B}</div>
                    <div style="${q.correta === 'C' ? 'color:#003058; font-weight:700' : ''}">C) ${q.opcoes.C}</div>
                </div>
            </div>
        `).join('');

        content.innerHTML = `
            <h2 style="font-size:18px; color:#003058;">${item.titulo}</h2>
            ${item.textoContexto ? `<div style="background:#f8fafc; padding:10px; border-radius:8px; margin:10px 0; font-size:12px; border-left:4px solid #003058;"><strong>${item.tituloTextoContexto || 'Texto Base'}:</strong><br>${item.textoContexto}</div>` : ''}
            ${item.fotoTextoContexto ? `<img src="${item.fotoTextoContexto}" style="width:120px; height:120px; object-fit:cover; border-radius:8px; margin-bottom:15px;">` : ''}
            <div style="max-height:40vh; overflow-y:auto;">${questHtml}</div>
        `;
        modal.style.display = 'flex';
    };
    window.closePreviewGram = () => { document.getElementById('modal-preview-gram').style.display = 'none'; };

    // --- EDIÇÃO ---
    window.prepararEdicaoGramatica = (id) => {
        const item = enviadasCache.find(atv => atv.id === id);
        if(!item) return;
        idEditandoGram = id;
        window.switchMainTabGram('criar');
        document.getElementById('titulo-gram').value = item.titulo || "";
        document.getElementById('prazo-gram').value = item.prazo || "";
        document.getElementById('titulo-contexto-gram').value = item.tituloTextoContexto || "";
        document.getElementById('texto-contexto-gram').value = item.textoContexto || "";
        
        if(item.fotoTextoContexto) {
            document.getElementById('img-prev-gram-texto').src = item.fotoTextoContexto;
            document.getElementById('img-wrapper-gram-texto').style.display = 'block';
        } else {
            window.removerFotoGram('texto', false);
        }

        document.querySelectorAll('#turma-pills-gram .btn-turma-pill').forEach(btn => {
            btn.classList.remove('active');
            if(btn.dataset.nome === item.semestre) btn.classList.add('active');
        });

        for(let i=1; i<=10; i++) {
            document.getElementById(`enunc-gram-${i}`).value = "";
            document.getElementById(`opt-a-${i}`).value = "";
            document.getElementById(`opt-b-${i}`).value = "";
            document.getElementById(`opt-c-${i}`).value = "";
            window.removerFotoGram(i, false);
        }

        item.questoes.forEach((q, idx) => {
            const n = idx + 1;
            document.getElementById(`enunc-gram-${n}`).value = q.enunciado;
            document.getElementById(`opt-a-${n}`).value = q.opcoes.A;
            document.getElementById(`opt-b-${n}`).value = q.opcoes.B;
            document.getElementById(`opt-c-${n}`).value = q.opcoes.C;
            document.getElementById(`correct-${n}`).value = q.correta;
            if(q.imagem) {
                document.getElementById(`img-prev-gram-${n}`).src = q.imagem;
                document.getElementById(`img-wrapper-gram-${n}`).style.display = 'block';
            }
        });
        document.querySelector('.btn-publish-gram').innerText = "ATUALIZAR ATIVIDADE AGORA";
    };

    // --- SALVAMENTO ---
    window.enviarAtividadeGramatica = async (isAutoSave = false) => {
        const semestreBtn = document.querySelector('.btn-turma-pill.active');
        const titulo = document.getElementById('titulo-gram').value;
        const prazo = document.getElementById('prazo-gram').value;

        if(!isAutoSave && (!semestreBtn || !titulo || !prazo)) return window.showAlertGram("Atenção", "Preencha Semestre, Título e Prazo!", "error");

        try {
            let questoes = [];
            for(let i=1; i<=10; i++) {
                const enunc = document.getElementById(`enunc-gram-${i}`).value;
                if(enunc.trim()) {
                    questoes.push({
                        enunciado: enunc,
                        opcoes: { A: document.getElementById(`opt-a-${i}`).value, B: document.getElementById(`opt-b-${i}`).value, C: document.getElementById(`opt-c-${i}`).value },
                        correta: document.getElementById(`correct-${i}`).value,
                        imagem: document.getElementById(`img-wrapper-gram-${i}`).style.display === 'block' ? document.getElementById(`img-prev-gram-${i}`).src : null
                    });
                }
            }

            const dados = {
                tipo: 'gramatica',
                titulo,
                tituloTextoContexto: document.getElementById('titulo-contexto-gram').value,
                textoContexto: document.getElementById('texto-contexto-gram').value,
                fotoTextoContexto: document.getElementById('img-wrapper-gram-texto').style.display === 'block' ? document.getElementById('img-prev-gram-texto').src : null,
                semestre: semestreBtn ? semestreBtn.dataset.nome : "",
                turma: semestreBtn ? semestreBtn.dataset.senha : "",
                prazo,
                questoes,
                dataEnvio: serverTimestamp()
            };

            if(idEditandoGram) {
                await updateDoc(doc(db, "atividades_enviadas", idEditandoGram), dados);
                if(!isAutoSave) {
                    window.showAlertGram("Sucesso", "Atividade Atualizada!");
                    window.switchMainTabGram('enviadas');
                }
            } else if(!isAutoSave) {
                const ref = await addDoc(collection(db, "atividades_enviadas"), dados);
                idEditandoGram = ref.id;
                window.showAlertGram("Sucesso", "Atividade Publicada!");
                window.switchMainTabGram('enviadas');
            }
        } catch(e) { console.error(e); }
    };

    window.excluirAtividadeGram = (id) => {
        window.showConfirmGram("Excluir?", "Apagar permanentemente?", async () => {
            await deleteDoc(doc(db, "atividades_enviadas", id));
            window.carregarAtividadesEnviadasGram();
        });
    };

    // --- CARREGAR SEMESTRES ÚNICOS E ORDENADOS ---
    setTimeout(async () => {
        const div = document.getElementById('turma-pills-gram');
        const snap = await getDocs(collection(db, "turmas"));
        
        const semestresMap = new Map();
        snap.forEach(d => {
            const t = d.data();
            if(!semestresMap.has(t.semestre)) semestresMap.set(t.semestre, t.senha);
        });

        const listaUnica = Array.from(semestresMap, ([semestre, senha]) => ({ semestre, senha }));

        listaUnica.sort((a, b) => {
            const getVal = (s) => {
                if(s.toLowerCase().includes('inter')) return 999;
                return parseInt(s) || 0;
            };
            return getVal(a.semestre) - getVal(b.semestre);
        });

        div.innerHTML = listaUnica.map(t => `
            <button class="btn-turma-pill" data-nome="${t.semestre}" data-senha="${t.senha}" 
                onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('active')); this.classList.add('active'); window.triggerAutoSave();">
                ${t.semestre}
            </button>`).join('');
        if(div.firstChild) div.firstChild.classList.add('active');
    }, 500);

    return `
    <style>
        .gramatica-container { width:100%; font-family:'Inter',sans-serif; padding:15px; box-sizing:border-box; }
        .card-gram { background:#fff; border-radius:12px; padding:18px; box-shadow:0 4px 12px rgba(0,0,0,0.05); border:1px solid #eef2f6; }
        .input-premium { width:100%; padding:9px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; background:#f8fafc; margin-bottom:10px; font-family:inherit; }
        .label-sutil { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:3px; }
        .g-btn-pill { min-width:32px; height:32px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; cursor:pointer; font-weight:700; font-size:11px; color:#64748b; }
        .g-btn-pill.active { background:#003058; color:#fff; border-color:#003058; }
        .btn-texto-apoio { background:#f1f5f9; color:#003058; border:1px dashed #003058; padding:0 10px; width:auto; }
        .btn-turma-pill { padding:6px 12px; border:1px solid #e2e8f0; background:#fff; border-radius:20px; cursor:pointer; font-size:11px; font-weight:700; margin-right:5px; white-space:nowrap; }
        .btn-turma-pill.active { background:#003058; color:#fff; }
        .main-tab-btn { padding:7px 15px; border:none; background:none; cursor:pointer; font-weight:700; color:#64748b; }
        .main-tab-btn.active { color:#003058; border-bottom:3px solid #003058; }
        .btn-publish-gram { background:#003058; color:#fff; border:none; padding:12px; width:100%; border-radius:10px; font-weight:700; cursor:pointer; margin-top:10px; }
        .img-fixed-size { width:120px; height:120px; object-fit:cover; border-radius:8px; border:1px solid #eee; margin-top:10px; display:block; }
        .img-wrapper { position:relative; width:120px; height:120px; margin-top:5px; }
        .btn-del-img { position:absolute; top:-5px; right:-5px; background:#ef4444; color:#fff; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; z-index:10; display:flex; align-items:center; justify-content:center; }
        .modal-gram { position:fixed; inset:0; background:rgba(0,48,88,0.4); backdrop-filter:blur(4px); display:none; justify-content:center; align-items:center; z-index:9999; padding:20px; }
        .modal-gram-content { background:#fff; width:100%; max-width:450px; border-radius:20px; padding:25px; position:relative; }
    </style>

    <div class="gramatica-container">
        <div id="modal-alert-gram" class="modal-gram"><div class="modal-gram-content"><div id="alert-icon-gram" style="margin-bottom:10px;"></div><h3 id="alert-title-gram"></h3><div id="alert-msg-gram"></div><button class="btn-publish-gram" onclick="window.closeAlertGram()">OK</button></div></div>
        <div id="modal-preview-gram" class="modal-gram" onclick="if(event.target===this)window.closePreviewGram()"><div class="modal-gram-content" style="text-align:left;"><button onclick="window.closePreviewGram()" style="float:right; border:none; background:none; cursor:pointer;">✕</button><div id="modal-preview-content"></div></div></div>
        <div id="modal-confirm-gram" class="modal-gram"><div class="modal-gram-content"><h3>Confirmar?</h3><p id="confirm-msg-gram"></p><div style="display:flex; gap:10px;"><button class="btn-publish-gram" style="background:#ef4444" onclick="window.pendingConfirmAction()">SIM</button><button class="btn-publish-gram" style="background:#f1f5f9; color:#64748b" onclick="this.closest('.modal-gram').style.display='none'">NÃO</button></div></div></div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h1 style="color:#003058; font-weight:800; margin:0;">GRAMÁTICA</h1>
            <div id="save-status" style="font-size:10px; color:#003058; font-weight:700;"></div>
        </div>

        <div class="main-tabs" style="display:flex; gap:10px; border-bottom:2px solid #e2e8f0; margin:15px 0;">
            <button id="tab-btn-criar" class="main-tab-btn active" onclick="window.switchMainTabGram('criar')">CRIAR</button>
            <button id="tab-btn-enviadas" class="main-tab-btn" onclick="window.switchMainTabGram('enviadas')">ENVIADAS</button>
            <button id="tab-btn-recebidas" class="main-tab-btn" onclick="window.switchMainTabGram('recebidas')">RECEBIDAS</button>
        </div>

        <div id="pane-criar" class="tab-pane-gram" style="display:block;">
            <div class="card-gram">
                <label class="label-sutil">Semestre:</label>
                <div id="turma-pills-gram" style="display:flex; overflow-x:auto; margin-bottom:10px; padding-bottom:5px;"></div>
                <div style="display:flex; gap:10px;">
                    <input type="text" id="titulo-gram" class="input-premium" placeholder="Título da Atividade" style="flex:1" oninput="window.triggerAutoSave()">
                    <input type="date" id="prazo-gram" class="input-premium" style="width:130px" onchange="window.triggerAutoSave()">
                </div>
                <div style="margin:10px 0;">
                    <div style="display:flex; gap:5px; overflow-x:auto; padding-bottom:5px;">
                        <button id="btn-gram-texto" class="g-btn-pill btn-texto-apoio active" onclick="window.switchQuestaoGram('texto')">TEXTO</button>
                        ${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button id="btn-gram-${n}" class="g-btn-pill" onclick="window.switchQuestaoGram(${n})">${n}</button>`).join('')}
                    </div>
                </div>
                <div style="background:#fbfcfd; padding:15px; border-radius:12px; border:1px solid #f1f5f9; min-height:200px;">
                    <div id="content-gram-texto" class="g-content-box">
                        <input type="text" id="titulo-contexto-gram" class="input-premium" placeholder="Título do Texto" oninput="window.triggerAutoSave()">
                        <textarea id="texto-contexto-gram" class="input-premium" style="height:100px; resize:none;" placeholder="Texto base..." oninput="window.triggerAutoSave()"></textarea>
                        <button class="btn-turma-pill" onclick="document.getElementById('file-gram-texto').click()">FOTO</button>
                        <input type="file" id="file-gram-texto" accept="image/*" style="display:none" onchange="window.handleGrammarImage(this, 'texto')">
                        <div id="img-wrapper-gram-texto" class="img-wrapper" style="display:none;"><button class="btn-del-img" onclick="window.removerFotoGram('texto')">✕</button><img id="img-prev-gram-texto" class="img-fixed-size"></div>
                    </div>
                    ${[1,2,3,4,5,6,7,8,9,10].map(n=>`
                        <div id="content-gram-${n}" class="g-content-box" style="display:none;">
                            <textarea id="enunc-gram-${n}" class="input-premium" placeholder="Questão ${n}..." oninput="window.triggerAutoSave()"></textarea>
                            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
                                <input type="text" id="opt-a-${n}" class="input-premium" placeholder="A" oninput="window.triggerAutoSave()">
                                <input type="text" id="opt-b-${n}" class="input-premium" placeholder="B" oninput="window.triggerAutoSave()">
                                <input type="text" id="opt-c-${n}" class="input-premium" placeholder="C" oninput="window.triggerAutoSave()">
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <select id="correct-${n}" class="input-premium" style="width:60px; margin:0;" onchange="window.triggerAutoSave()"><option value="A">A</option><option value="B">B</option><option value="C">C</option></select>
                                <button class="btn-turma-pill" onclick="document.getElementById('file-gram-${n}').click()">FOTO</button>
                                <input type="file" id="file-gram-${n}" accept="image/*" style="display:none" onchange="window.handleGrammarImage(this, ${n})">
                            </div>
                            <div id="img-wrapper-gram-${n}" class="img-wrapper" style="display:none;"><button class="btn-del-img" onclick="window.removerFotoGram(${n})">✕</button><img id="img-prev-gram-${n}" class="img-fixed-size"></div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-publish-gram" onclick="window.enviarAtividadeGramatica(false)">PUBLICAR ATIVIDADE AGORA</button>
            </div>
        </div>
        <div id="pane-enviadas" class="tab-pane-gram"><div id="lista-enviadas-content"></div></div>
        <div id="pane-recebidas" class="tab-pane-gram"><div id="lista-recebidas-content"></div></div>
    </div>`;
});
