// modules/materialdidatico.js

window.Router.register('materialdidatico', async () => {
    const db = window.db;
    const { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, deleteDoc } = window.fsMethods;

    const carregarTurmasDinamicas = async () => {
        const selector = document.getElementById('mat-turma-selector');
        if (!selector) return;
        try {
            const snap = await getDocs(collection(db, "turmas"));
            selector.innerHTML = '<option value="">Selecione a Turma</option>';
            snap.forEach(d => {
                const t = d.data();
                const nome = t.nomeCustomizado || t.nome;
                selector.innerHTML += `<option value="${nome}">${nome}</option>`;
            });
        } catch (e) { console.error(e); }
    };

    window.switchTabMaterial = (tabName, element) => {
        document.querySelectorAll('.tab-content-mat').forEach(t => t.style.display = 'none');
        document.querySelectorAll('.tab-btn-mat').forEach(b => {
            b.style.background = 'none';
            b.style.color = '#64748b';
        });
        
        document.getElementById(`tab-mat-${tabName}`).style.display = 'block';
        
        // Estilo pílula ativa conforme imagem
        element.style.background = '#003058';
        element.style.color = '#fff';

        if (tabName === 'postados') window.listarMateriaisDidaticos();
    };

    window.listarMateriaisDidaticos = async () => {
        const container = document.getElementById('lista-materiais-container');
        if (!container) return;
        container.innerHTML = '<p style="text-align:center;">Carregando...</p>';
        try {
            const q = query(collection(db, "materiais"), orderBy("dataCriacao", "desc"));
            const snap = await getDocs(q);
            if (snap.empty) {
                container.innerHTML = '<p style="text-align:center; padding:20px;">Nenhum material.</p>';
                return;
            }
            let html = '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:15px;">';
            snap.forEach(docSnap => {
                const d = docSnap.data();
                html += `
                    <div style="background:#fff; border:1px solid #eef2f6; padding:15px; border-radius:16px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="background:rgba(0,48,88,0.05); color:#003058; width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
                                <i class="fa-solid fa-file-lines"></i>
                            </div>
                            <div>
                                <strong style="display:block; font-size:14px; color:#003058;">${d.titulo}</strong>
                                <span style="background:#eef2f6; color:#64748b; font-size:10px; padding:2px 8px; border-radius:4px; font-weight:bold;">${d.turma}</span>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <a href="${d.link}" target="_blank" style="color:#003058; font-size:16px;"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                            <button onclick="window.removerMaterialDidatico('${docSnap.id}')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:16px;"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>`;
            });
            container.innerHTML = html + '</div>';
        } catch (e) { console.error(e); }
    };

    window.salvarMaterialDidatico = async () => {
        const titulo = document.getElementById('mat-titulo').value;
        const turma = document.getElementById('mat-turma-selector').value;
        const link = document.getElementById('mat-link').value;
        if (!titulo || !turma || !link) return alert("Preencha todos os campos.");
        try {
            await addDoc(collection(db, "materiais"), { titulo, turma, link, dataCriacao: serverTimestamp() });
            alert("Publicado!");
            // Simula clique na aba para atualizar visual
            const btn = document.querySelector('.tab-btn-mat:nth-child(2)');
            window.switchTabMaterial('postados', btn);
        } catch (e) { alert("Erro ao salvar."); }
    };

    window.removerMaterialDidatico = async (id) => {
        if (confirm("Excluir?")) {
            await deleteDoc(doc(db, "materiais", id));
            window.listarMateriaisDidaticos();
        }
    };

    setTimeout(carregarTurmasDinamicas, 200);

    return `
    <style>
        .header-mat h1 { text-transform: uppercase; font-weight: 800; color: #003058; font-size: 28px; margin-bottom: 5px; }
        .header-mat p { color: #64748b; font-size: 15px; margin-bottom: 25px; }
        
        .pill-nav { display: flex; gap: 10px; margin-bottom: 30px; }
        .tab-btn-mat { 
            padding: 10px 25px; border-radius: 8px; border: none; cursor: pointer; 
            font-weight: bold; font-size: 14px; transition: 0.3s; color: #64748b; background: none;
        }
        
        .mat-card { 
            background: #fff; border-radius: 20px; padding: 30px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #f0f4f8; 
            width: 100%; box-sizing: border-box;
        }

        .mat-form-group { margin-bottom: 20px; }
        .mat-form-group label { 
            display: block; text-transform: uppercase; font-size: 11px; 
            font-weight: 800; color: #94a3b8; margin-bottom: 8px; 
        }
        .mat-form-group input, .mat-form-group select { 
            width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; 
            background: #f8fafc; color: #334155; font-size: 14px; outline: none; box-sizing: border-box;
        }

        .btn-postar-mat { 
            background: #003058; color: #fff; border: none; padding: 15px; 
            border-radius: 12px; font-weight: 800; cursor: pointer; width: 100%; 
            margin-top: 10px; transition: 0.3s;
        }
        .btn-postar-mat:hover { opacity: 0.9; }
    </style>

    <div style="width:100%;">
        <div class="header-mat">
            <h1>Material Didático</h1>
            <p>Poste links de materiais para seus alunos.</p>
        </div>

        <div class="pill-nav">
            <button class="tab-btn-mat" style="background:#003058; color:#fff;" onclick="window.switchTabMaterial('postar', this)">Postar</button>
            <button class="tab-btn-mat" onclick="window.switchTabMaterial('postados', this)">Ver Todos</button>
        </div>

        <div id="tab-mat-postar" class="tab-content-mat">
            <div class="mat-card">
                <div class="mat-form-group">
                    <label>Título do Material</label>
                    <input type="text" id="mat-titulo" placeholder="Ex: Apostila de Revisão">
                </div>
                <div class="mat-form-group">
                    <label>Selecione a Turma</label>
                    <select id="mat-turma-selector"></select>
                </div>
                <div class="mat-form-group">
                    <label>Link do Material (Drive, Dropbox, etc)</label>
                    <input type="text" id="mat-link" placeholder="https://drive.google.com/...">
                </div>
                <button class="btn-postar-mat" onclick="window.salvarMaterialDidatico()">Publicar Material</button>
            </div>
        </div>

        <div id="tab-mat-postados" class="tab-content-mat" style="display: none;">
            <div id="lista-materiais-container"></div>
        </div>
    </div>
    `;
});