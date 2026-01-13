window.Router.register('gramaticaprofessorclm', async () => {
    const db = window.db;
    const { collection, getDocs, addDoc, serverTimestamp } = window.fsMethods;

    // --- LÓGICA DE NAVEGAÇÃO ---
    window.switchQuestaoGram = (num) => {
        document.querySelectorAll('.g-btn-pill').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.g-content-box').forEach(c => c.style.display = 'none');
        document.getElementById(`btn-gram-${num}`).classList.add('active');
        document.getElementById(`content-gram-${num}`).style.display = 'block';
    };

    window.handleGrammarImage = (input, qNum) => {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = e => {
                const img = document.getElementById(`img-prev-gram-${qNum}`);
                img.src = e.target.result;
                img.style.display = 'block';
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window.switchMainTabGram = (tab) => {
        document.querySelectorAll('.main-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane-gram').forEach(pane => pane.style.display = 'none');
        
        document.getElementById(`tab-btn-${tab}`).classList.add('active');
        document.getElementById(`pane-${tab}`).style.display = 'block';
    };

    // --- LÓGICA DE ENVIO ---
    window.enviarAtividadeGramatica = async () => {
        const container = document.querySelector('.gramatica-container');
        const turmaBtn = container.querySelector('.btn-turma-pill.active');
        const prazo = document.getElementById('prazo-gram').value;
        const titulo = document.getElementById('titulo-gram').value;

        if (!turmaBtn || !prazo || !titulo.trim()) return alert("Preencha o título, a turma e o prazo!");

        try {
            let questoes = [];
            for(let i=1; i<=10; i++) {
                const enunc = document.getElementById(`enunc-gram-${i}`).value;
                if(enunc.trim() !== "") {
                    questoes.push({
                        enunciado: enunc,
                        opcoes: {
                            A: document.getElementById(`opt-a-${i}`).value,
                            B: document.getElementById(`opt-b-${i}`).value,
                            C: document.getElementById(`opt-c-${i}`).value
                        },
                        correta: document.getElementById(`correct-${i}`).value,
                        imagem: document.getElementById(`img-prev-gram-${i}`).src || null
                    });
                }
            }
            if(questoes.length === 0) return alert("Adicione pelo menos uma questão!");
            
            await addDoc(collection(db, "atividades_enviadas"), {
                tipo: 'gramatica',
                titulo: titulo,
                turma: turmaBtn.dataset.nome,
                prazo: prazo,
                questoes: questoes,
                dataEnvio: serverTimestamp()
            });
            alert("Sucesso! Atividade de Gramática publicada.");
        } catch (e) { alert("Erro ao salvar."); }
    };

    // --- CARREGAR TURMAS ---
    setTimeout(async () => {
        const div = document.getElementById('turma-pills-gram');
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
        .gramatica-container { width: 100%; font-family: 'Inter', sans-serif; }
        .header-prof h1 { font-size: 28px; font-weight: 800; color: #003058; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 5px; }
        .card-gram { background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); padding: 25px; border: 1px solid #eef2f6; margin-top: 20px; }
        .label-sutil { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; }
        .pills-container { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
        .btn-turma-pill { width: 38px; height: 38px; border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; cursor: pointer; font-size: 11px; font-weight: 700; color: #64748b; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .btn-turma-pill.active { background: #003058; color: white; border-color: #003058; }
        .input-premium { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: #f8fafc; margin-bottom: 15px; box-sizing: border-box; }
        .nav-questoes-gram { display: flex; gap: 5px; margin-bottom: 20px; flex-wrap: wrap; }
        .g-btn-pill { width: 38px; height: 38px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; font-weight: 700; color: #64748b; transition: 0.2s; }
        .g-btn-pill.active { background: #003058; color: #fff; border-color: #003058; }
        .options-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px; }
        .btn-publish-gram { background: #003058; color: #fff; border: none; padding: 15px; width: 100%; border-radius: 10px; font-weight: 700; cursor: pointer; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .btn-img-sutil { background: none; border: 1px dashed #cbd5e1; padding: 8px; border-radius: 8px; color: #64748b; cursor: pointer; font-size: 12px; margin-bottom: 15px; display: inline-block; }
        .main-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
        .main-tab-btn { padding: 8px 16px; border: none; background: none; cursor: pointer; font-weight: 700; color: #64748b; border-radius: 8px; font-size: 14px; transition: 0.3s; }
        .main-tab-btn.active { background: #003058 !important; color: white !important; }
    </style>

    <div class="gramatica-container">
        <div class="header-prof"><h1>GRAMÁTICA</h1></div>

        <div class="main-tabs">
            <button id="tab-btn-criar" class="main-tab-btn active" onclick="window.switchMainTabGram('criar')">CRIAR ATIVIDADE</button>
            <button id="tab-btn-enviadas" class="main-tab-btn" onclick="window.switchMainTabGram('enviadas')">ATIVIDADES ENVIADAS</button>
            <button id="tab-btn-recebidas" class="main-tab-btn" onclick="window.switchMainTabGram('recebidas')">ATIVIDADES RECEBIDAS</button>
        </div>

        <div id="pane-criar" class="tab-pane-gram">
            <div class="card-gram">
                <div style="display: flex; gap: 30px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
                    <div>
                        <label class="label-sutil">Turma:</label>
                        <div id="turma-pills-gram" class="pills-container" style="margin-bottom:0; gap: 5px;"></div>
                    </div>
                    <div>
                        <label class="label-sutil">Navegar Questões:</label>
                        <div class="nav-questoes-gram" style="margin-bottom:0; gap: 5px;">
                            ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                                <button id="btn-gram-${n}" class="g-btn-pill ${n===1?'active':''}" onclick="window.switchQuestaoGram(${n})">${n}</button>
                            `).join('')}
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <label class="label-sutil">Prazo Limite:</label>
                        <input type="datetime-local" id="prazo-gram" class="input-premium" style="margin-bottom:0; padding: 8px;">
                    </div>
                </div>

                <hr style="border:0; border-top: 1px solid #eef2f6; margin-bottom: 20px;">

                <div style="margin-bottom: 20px;">
                    <label class="label-sutil">Título da Atividade:</label>
                    <input type="text" id="titulo-gram" class="input-premium" placeholder="Ex: Exercícios de Verbos - Aula 01" style="margin-bottom:0;">
                </div>

                <div id="questoes-gram-container">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                        <div id="content-gram-${n}" class="g-content-box" style="${n===1?'':'display:none;'}">
                            <label class="label-sutil">Questão ${n} - Enunciado:</label>
                            <textarea id="enunc-gram-${n}" class="input-premium" style="min-height: 45px; height: 45px; resize: none;" placeholder="Ex: Escolha a forma correta do verbo..."></textarea>
                            
                            <div style="display: flex; gap: 15px; align-items: flex-end; margin-bottom: 15px;">
                                <div style="flex: 1;">
                                    <label class="label-sutil">Ilustração (Opcional):</label>
                                    <div class="btn-img-sutil" onclick="document.getElementById('file-gram-${n}').click()" style="margin-bottom:0; width: 100%; text-align: center; box-sizing: border-box;">
                                        <i class="fa-solid fa-image"></i> Anexar Imagem
                                        <input type="file" id="file-gram-${n}" style="display:none" accept="image/*" onchange="window.handleGrammarImage(this, ${n})">
                                    </div>
                                </div>
                                <div style="flex: 1;">
                                    <label class="label-sutil">Resposta Correta:</label>
                                    <select id="correct-${n}" class="input-premium" style="margin-bottom:0;">
                                        <option value="A">Alternativa A</option>
                                        <option value="B">Alternativa B</option>
                                        <option value="C">Alternativa C</option>
                                    </select>
                                </div>
                            </div>

                            <img id="img-prev-gram-${n}" style="display:none; max-width: 150px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">

                            <div class="options-grid">
                                <div><label class="label-sutil">Opção A</label><input type="text" id="opt-a-${n}" class="input-premium" placeholder="Alternativa A"></div>
                                <div><label class="label-sutil">Opção B</label><input type="text" id="opt-b-${n}" class="input-premium" placeholder="Alternativa B"></div>
                                <div><label class="label-sutil">Opção C</label><input type="text" id="opt-c-${n}" class="input-premium" placeholder="Alternativa C"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <button class="btn-publish-gram" onclick="window.enviarAtividadeGramatica()">
                    <i class="fa-solid fa-cloud-arrow-up"></i> Publicar Atividade de Gramática
                </button>
            </div>
        </div>

        <div id="pane-enviadas" class="tab-pane-gram" style="display:none;">
            <div class="card-gram"><p>Histórico de atividades enviadas aparecerá aqui.</p></div>
        </div>
        <div id="pane-recebidas" class="tab-pane-gram" style="display:none;">
            <div class="card-gram"><p>Respostas dos alunos aparecerão aqui.</p></div>
        </div>
    </div> `;
});