window.Router.register('oralprofessorclm', async () => {
    const db = window.db;
    const { collection, getDocs, addDoc, serverTimestamp } = window.fsMethods;

    // --- LÓGICA DE NAVEGAÇÃO DE QUESTÕES ---
    window.switchQuestaoOral = (num) => {
        document.querySelectorAll('.o-btn-pill').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.o-content-box').forEach(c => c.style.display = 'none');
        
        document.getElementById(`btn-oral-${num}`).classList.add('active');
        document.getElementById(`content-oral-${num}`).style.display = 'block';
    };

    // --- LÓGICA DE ENVIO ---
    window.enviarAtividadeOral = async () => {
        const container = document.querySelector('.oral-container');
        const turmaBtn = container.querySelector('.btn-turma-pill.active');
        const prazo = document.getElementById('prazo-oral').value;
        const tituloAtv = document.getElementById('titulo-oral').value;

        if (!turmaBtn || !prazo || !tituloAtv.trim()) {
            return alert("Por favor, preencha o título, selecione a turma e o prazo!");
        }

        try {
            let questoes = [];
            for(let i=1; i<=10; i++) {
                const enunciado = document.getElementById(`enunciado-oral-${i}`).value;
                if(enunciado.trim() !== "") {
                    questoes.push({ enunciado: enunciado });
                }
            }

            if(questoes.length === 0) return alert("Adicione pelo menos uma frase para prática!");

            await addDoc(collection(db, "atividades_enviadas"), {
                tipo: 'oral',
                titulo: tituloAtv,
                turma: turmaBtn.dataset.nome,
                prazo: prazo,
                questoes: questoes,
                dataEnvio: serverTimestamp()
            });

            alert("Atividade de Speaking publicada com sucesso!");
            window.location.reload();
        } catch (e) { alert("Erro ao salvar atividade."); }
    };

    // --- CARREGAR TURMAS ---
    setTimeout(async () => {
        const div = document.getElementById('turma-pills-oral');
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
        .oral-container { width: 100%; font-family: 'Inter', sans-serif; }
        .header-prof h1 { font-size: 28px; font-weight: 800; color: #003058; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 5px; }
        
        .card-oral { 
            background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); 
            padding: 25px; border: 1px solid #eef2f6; margin-top: 20px; 
        }

        .label-sutil { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; }
        
        .pills-container { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
        .btn-turma-pill { 
            width: 38px; height: 38px; border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; 
            cursor: pointer; font-size: 11px; font-weight: 700; color: #64748b; display: flex; 
            align-items: center; justify-content: center; transition: 0.2s; 
        }
        .btn-turma-pill.active { background: #003058; color: white; border-color: #003058; }

        .input-premium { 
            width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; 
            font-size: 14px; background: #f8fafc; margin-bottom: 15px; box-sizing: border-box;
        }

        .nav-questoes-oral { display: flex; gap: 5px; margin-bottom: 20px; flex-wrap: wrap; }
        .o-btn-pill { 
            width: 38px; height: 38px; border-radius: 10px; border: 1px solid #e2e8f0;
            background: #fff; cursor: pointer; font-weight: 700; color: #64748b; transition: 0.2s;
        }
        .o-btn-pill.active { background: #003058; color: #fff; border-color: #003058; }

        .btn-publish-oral { 
            background: #003058; color: #fff; border: none; padding: 15px; width: 100%;
            border-radius: 10px; font-weight: 700; cursor: pointer; margin-top: 10px;
            display: flex; align-items: center; justify-content: center; gap: 10px;
        }
    </style>

    <div class="oral-container">
        <div class="header-prof">
            <h1>ORAL</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: -5px;">Crie atividades para monitoramento de fala e feedback de pronúncia.</p>
        </div>

        <div class="card-oral">
            <div style="display: flex; gap: 30px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
                <div>
                    <label class="label-sutil">Turma:</label>
                    <div id="turma-pills-oral" class="pills-container" style="margin-bottom:0; gap: 5px;"></div>
                </div>
                <div>
                    <label class="label-sutil">Navegar Questões:</label>
                    <div class="nav-questoes-oral" style="margin-bottom:0; gap: 5px;">
                        ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                            <button id="btn-oral-${n}" class="o-btn-pill ${n===1?'active':''}" onclick="window.switchQuestaoOral(${n})">${n}</button>
                        `).join('')}
                    </div>
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <label class="label-sutil">Prazo Limite:</label>
                    <input type="datetime-local" id="prazo-oral" class="input-premium" style="margin-bottom:0; padding: 8px;">
                </div>
            </div>

            <hr style="border:0; border-top: 1px solid #eef2f6; margin-bottom: 20px;">

            <div style="margin-bottom: 20px;">
                <label class="label-sutil">Título da Atividade:</label>
                <input type="text" id="titulo-oral" class="input-premium" placeholder="Ex: Prática de Pronúncia - Unidade 1" style="margin-bottom:0;">
            </div>

            <div id="questoes-oral-container">
                ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                    <div id="content-oral-${n}" class="o-content-box" style="${n===1?'':'display:none;'}">
                        <label class="label-sutil">Pergunta ${n}:</label>
                        <textarea id="enunciado-oral-${n}" class="input-premium" style="min-height: 80px; resize: none;" 
                            placeholder="Ex: Where are you from? / ¿De dónde eres?"></textarea>
                    </div>
                `).join('')}
            </div>

            <button class="btn-publish-oral" onclick="window.enviarAtividadeOral()">
                <i class="fa-solid fa-microphone-lines"></i> Publicar Atividade Oral
            </button>
        </div>
    </div>
    `;
});