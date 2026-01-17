window.Router.register('oralalunoclm', async () => {
    const db = window.db;
    const { collection, getDocs, addDoc, serverTimestamp, query, where, doc, getDoc } = window.fsMethods;
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));

    // --- ESTADOS ---
    let atividadesDisponiveis = [];
    let mediaRecorder;
    let audioChunks = [];
    let tempoGravacao = 0;
    let intervaloTimer;
    let questaoAtualIdx = 0;
    let respostasGravadas = {}; // { questaoIdx: blob }

    // --- ALERTAS ---
    window.showAlertAluno = (titulo, mensagem, tipo = 'info') => {
        const modal = document.getElementById('modal-alert-aluno');
        document.getElementById('alert-title-aluno').innerText = titulo;
        document.getElementById('alert-msg-aluno').innerHTML = mensagem;
        modal.style.display = 'flex';
    };

    // --- NAVEGAÇÃO ---
    window.switchTabAluno = (tab) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.pane-aluno').forEach(p => p.style.display = 'none');
        document.getElementById(`btn-tab-${tab}`).classList.add('active');
        document.getElementById(`pane-${tab}`).style.display = 'block';
        if(tab === 'disponiveis') window.carregarAtividadesAluno();
    };

    // --- LÓGICA DE GRAVAÇÃO ---
    window.iniciarGravacao = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                respostasGravadas[questaoAtualIdx] = audioBlob;
                window.atualizarInterfaceGravacao('parado');
            };

            mediaRecorder.start();
            tempoGravacao = 0;
            window.atualizarInterfaceGravacao('gravando');
            intervaloTimer = setInterval(() => {
                tempoGravacao++;
                document.getElementById('timer-oral').innerText = `00:${tempoGravacao.toString().padStart(2, '0')}`;
                if(tempoGravacao >= 60) window.pararGravacao();
            }, 1000);
        } catch (err) {
            window.showAlertAluno("Erro", "Permita o acesso ao microfone para continuar.");
        }
    };

    window.pararGravacao = () => {
        if(mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(t => t.stop());
            clearInterval(intervaloTimer);
        }
    };

    window.atualizarInterfaceGravacao = (status) => {
        const btnStart = document.getElementById('btn-start-rec');
        const btnStop = document.getElementById('btn-stop-rec');
        const statusIcon = document.getElementById('rec-status-icon');

        if(status === 'gravando') {
            btnStart.style.display = 'none';
            btnStop.style.display = 'flex';
            statusIcon.classList.add('recording-pulse');
        } else {
            btnStart.style.display = 'flex';
            btnStop.style.display = 'none';
            statusIcon.classList.remove('recording-pulse');
            document.getElementById('audio-preview').src = URL.createObjectURL(respostasGravadas[questaoAtualIdx]);
            document.getElementById('audio-preview').style.display = 'block';
        }
    };

    // --- CARREGAR DADOS ---
    window.carregarAtividadesAluno = async () => {
        const container = document.getElementById('lista-disponiveis');
        container.innerHTML = '<p>Buscando atividades...</p>';
        try {
            // Busca atividades do semestre do aluno
            const q = query(collection(db, "atividades_enviadas"), 
                      where("tipo", "==", "oral"), 
                      where("turma", "==", usuarioLogado.semestre));
            const snap = await getDocs(q);
            atividadesDisponiveis = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if(atividadesDisponiveis.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">Nenhuma atividade pendente.</p>';
                return;
            }

            container.innerHTML = atividadesDisponiveis.map(atv => `
                <div class="card-aluno-atv">
                    <div>
                        <h4 style="margin:0; color:#003058;">${atv.titulo}</h4>
                        <small style="color:#ef4444;">Prazo: ${atv.prazo}</small>
                    </div>
                    <button class="btn-responder" onclick="window.abrirTarefa('${atv.id}')">RESPONDER</button>
                </div>
            `).join('');
        } catch(e) { console.error(e); }
    };

    window.abrirTarefa = (id) => {
        const atv = atividadesDisponiveis.find(a => a.id === id);
        window.atividadeAtiva = atv;
        questaoAtualIdx = 0;
        respostasGravadas = {};
        document.getElementById('modal-responder-oral').style.display = 'flex';
        window.renderQuestaoOral();
    };

    window.renderQuestaoOral = () => {
        const atv = window.atividadeAtiva;
        const q = atv.questoes[questaoAtualIdx];
        document.getElementById('questao-enunciado').innerText = q.enunciado;
        document.getElementById('progresso-texto').innerText = `Pergunta ${questaoAtualIdx + 1} de ${atv.questoes.length}`;
        document.getElementById('audio-preview').style.display = 'none';
        document.getElementById('timer-oral').innerText = "00:00";
        
        // Botões de navegação
        document.getElementById('btn-prev-q').style.visibility = questaoAtualIdx === 0 ? 'hidden' : 'visible';
        const btnNext = document.getElementById('btn-next-q');
        btnNext.innerText = questaoAtualIdx === atv.questoes.length - 1 ? "FINALIZAR TUDO" : "PRÓXIMA";
    };

    window.proximaQuestao = async () => {
        if(!respostasGravadas[questaoAtualIdx]) {
            return window.showAlertAluno("Atenção", "Grave sua resposta antes de continuar!");
        }

        if(questaoAtualIdx < window.atividadeAtiva.questoes.length - 1) {
            questaoAtualIdx++;
            window.renderQuestaoOral();
        } else {
            window.enviarTarefaCompleta();
        }
    };

    window.enviarTarefaCompleta = async () => {
        // Aqui você faria o upload dos Blobs para o Storage e salvaria os links no Firestore
        // Para este exemplo, simularemos o sucesso:
        window.showAlertAluno("Sucesso!", "Suas respostas foram enviadas com sucesso!");
        document.getElementById('modal-responder-oral').style.display = 'none';
        window.switchTabAluno('enviadas');
    };

    return `
    <style>
        .aluno-oral-body { font-family:'Inter', sans-serif; padding:15px; background:#f8fafc; min-height:100vh; }
        .tab-nav { display:flex; background:#fff; border-radius:12px; padding:5px; margin-bottom:20px; box-shadow:0 2px 8px rgba(0,0,0,0.05); }
        .tab-btn { flex:1; padding:10px; border:none; background:none; font-weight:700; color:#94a3b8; cursor:pointer; font-size:12px; border-radius:8px; }
        .tab-btn.active { background:#003058; color:#fff; }
        
        .card-aluno-atv { background:#fff; padding:15px; border-radius:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border:1px solid #eef2f6; }
        .btn-responder { background:#003058; color:#white; border:none; padding:8px 15px; border-radius:8px; font-weight:700; color:#fff; cursor:pointer; }
        
        .modal-fullscreen { position:fixed; inset:0; background:#fff; z-index:10000; display:none; flex-direction:column; }
        .header-modal { padding:20px; border-bottom:1px solid #eee; display:flex; align-items:center; justify-content:space-between; }
        .content-modal { flex:1; padding:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
        
        .rec-circle { width:80px; height:80px; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center; cursor:pointer; border:none; transition:0.3s; }
        .recording-pulse { background:#fee2e2; color:#ef4444; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        
        #audio-preview { width:100%; max-width:300px; margin-top:20px; }
        .nav-footer { padding:20px; display:flex; gap:10px; }
        .btn-nav { flex:1; padding:15px; border-radius:12px; border:none; font-weight:700; cursor:pointer; }
    </style>

    <div class="aluno-oral-body">
        <h2 style="color:#003058; font-weight:800; margin-bottom:15px;">Minhas Atividades</h2>
        
        <div class="tab-nav">
            <button id="btn-tab-disponiveis" class="tab-btn active" onclick="window.switchTabAluno('disponiveis')">RECEBIDAS</button>
            <button id="btn-tab-enviadas" class="tab-btn" onclick="window.switchTabAluno('enviadas')">ENVIADAS</button>
            <button id="btn-tab-corrigidas" class="tab-btn" onclick="window.switchTabAluno('corrigidas')">CORRIGIDAS</button>
        </div>

        <div id="pane-disponiveis" class="pane-aluno">
            <div id="lista-disponiveis"></div>
        </div>

        <div id="pane-enviadas" class="pane-aluno" style="display:none;">
            <p style="text-align:center; color:#94a3b8; margin-top:40px;">Você ainda não enviou gravações.</p>
        </div>

        <div id="pane-corrigidas" class="pane-aluno" style="display:none;">
            <p style="text-align:center; color:#94a3b8; margin-top:40px;">Nada corrigido no momento.</p>
        </div>
    </div>

    <div id="modal-responder-oral" class="modal-fullscreen">
        <div class="header-modal">
            <span id="progresso-texto" style="font-weight:700; color:#64748b; font-size:14px;"></span>
            <button onclick="document.getElementById('modal-responder-oral').style.display='none'" style="background:none; border:none; font-size:20px;">&times;</button>
        </div>
        
        <div class="content-modal">
            <div style="background:#f0f7ff; color:#003058; padding:20px; border-radius:15px; width:100%; box-sizing:border-box; margin-bottom:30px;">
                <h3 id="questao-enunciado" style="margin:0; font-size:18px;"></h3>
            </div>

            <div id="rec-status-icon" class="rec-circle">
                <i class="fa-solid fa-microphone" style="font-size:30px;"></i>
            </div>
            
            <h2 id="timer-oral" style="color:#003058; margin:15px 0;">00:00</h2>
            <p style="color:#94a3b8; font-size:12px;">Máximo: 01:00 minuto</p>

            <button id="btn-start-rec" class="btn-responder" style="padding:15px 40px; border-radius:30px;" onclick="window.iniciarGravacao()">GRAVAR RESPOSTA</button>
            <button id="btn-stop-rec" class="btn-responder" style="padding:15px 40px; border-radius:30px; background:#ef4444; display:none;" onclick="window.pararGravacao()">PARAR E SALVAR</button>

            <audio id="audio-preview" controls></audio>
        </div>

        <div class="nav-footer">
            <button id="btn-prev-q" class="btn-nav" style="background:#f1f5f9; color:#64748b;" onclick="questaoAtualIdx--; window.renderQuestaoOral();">VOLTAR</button>
            <button id="btn-next-q" class="btn-nav" style="background:#003058; color:#fff;" onclick="window.proximaQuestao()">PRÓXIMA</button>
        </div>
    </div>

    <div id="modal-alert-aluno" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:none; align-items:center; justify-content:center; z-index:11000; padding:20px;">
        <div style="background:#fff; padding:25px; border-radius:20px; width:100%; max-width:300px; text-align:center;">
            <h3 id="alert-title-aluno"></h3>
            <p id="alert-msg-aluno" style="color:#64748b; font-size:14px;"></p>
            <button class="btn-responder" style="width:100%" onclick="this.closest('#modal-alert-aluno').style.display='none'">OK</button>
        </div>
    </div>
    `;
});
