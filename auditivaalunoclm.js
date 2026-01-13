window.Router.register('auditivaalunoclm', async () => {
    // IMPORTAÇÕES DINÂMICAS
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
    const { getFirestore, doc, getDoc, addDoc, collection } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

    const azulPadrao = "#003058";
    const cinzaTexto = "#64748b";
    
    let questaoAtual = 1;
    const totalQuestoes = 10;
    let playsRestantes = 2;
    let respostas = {}; 

    const atividadeInfo = {
        titulo: "EXAME DE COMPREENSÃO AUDITIVA - NÍVEL B1",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 
    };

    // --- MODAIS MODERNOS ---
    window.finalizarAtividadeSucesso = () => {
        const modalHtml = `
            <div id="modal-sucesso" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.7); z-index:20000; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(5px); animation: fadeIn 0.3s forwards;">
                <div style="background:white; padding:35px; border-radius:24px; text-align:center; max-width:380px; width:90%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
                    <div style="width:70px; height:70px; background:#f0fdf4; color:#22c55e; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto; font-size:2.5rem;">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>
                    <h2 style="color:${azulPadrao}; font-weight:800; margin-bottom:8px;">Sucesso!</h2>
                    <p style="color:${cinzaTexto}; font-weight:500;">Atividade finalizada com sucesso!</p>
                    <button onclick="location.reload()" style="margin-top:25px; width:100%; background:${azulPadrao}; color:white; border:none; padding:15px; border-radius:12px; font-weight:700; cursor:pointer; transition:0.2s;">Concluir</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    window.solicitarLiberacaoModerna = () => {
        const modalHtml = `
            <div id="modal-suporte" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.7); z-index:20000; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(5px); animation: fadeIn 0.3s forwards;">
                <div style="background:white; padding:30px; border-radius:24px; width:90%; max-width:450px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
                    <h3 style="color:${azulPadrao}; font-weight:800; margin-bottom:12px;">Suporte Técnico</h3>
                    <p style="color:${cinzaTexto}; font-size:0.95rem; margin-bottom:15px;">Descreva o problema técnico para o professor:</p>
                    <textarea id="texto-suporte-moderno" placeholder="Digite aqui..." style="width:100%; height:120px; border-radius:12px; border:2px solid #f1f5f9; padding:12px; outline:none; font-family:inherit; resize:none; focus:border-color:${azulPadrao}; transition:0.2s;"></textarea>
                    <div style="display:flex; gap:12px; margin-top:20px;">
                        <button onclick="document.getElementById('modal-suporte').remove()" style="flex:1; padding:12px; border:none; background:#f1f5f9; color:${cinzaTexto}; border-radius:10px; cursor:pointer; font-weight:700;">Cancelar</button>
                        <button onclick="window.confirmarEnvioSuporte()" style="flex:2; padding:12px; border:none; background:${azulPadrao}; color:white; border-radius:10px; cursor:pointer; font-weight:700;">Enviar Problema</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    window.confirmarEnvioSuporte = async () => {
        const justificativa = document.getElementById('texto-suporte-moderno').value;
        if (!justificativa) return;
        try {
            const user = getAuth().currentUser;
            await addDoc(collection(getFirestore(), "mensagens_diretas"), {
                titulo: "SUPORTE ÁUDIO: " + atividadeInfo.titulo,
                conteudo: `Solicitação de reset de áudio. Justificativa: ${justificativa}`,
                remetente: user?.displayName || "Aluno",
                remetenteId: user?.uid,
                destinatarioId: "ID_DO_PROFESSOR",
                dataEnvio: new Date(),
                tipo: "suporte_tecnico",
                lida: false
            });
            document.getElementById('modal-suporte').remove();
            alert("Solicitação enviada!");
        } catch (e) { alert("Erro ao enviar."); }
    };

    window.tocarAudio = () => {
        const audioTag = document.getElementById('audio-player-principal');
        const btnPlay = document.getElementById('btn-play-audio');
        const contador = document.getElementById('contador-plays');

        if (playsRestantes > 0) {
            audioTag.play();
            playsRestantes--;
            contador.innerText = `Plays restantes: ${playsRestantes}`;
            
            if (playsRestantes === 0) {
                btnPlay.disabled = true;
                btnPlay.style.opacity = "0.5";
                btnPlay.style.cursor = "not-allowed";
                btnPlay.innerHTML = '<i class="fa-solid fa-lock"></i>';
            }
        }
    };

    window.navegar = (direcao) => {
        const novaQuestao = questaoAtual + direcao;
        if (novaQuestao >= 1 && novaQuestao <= totalQuestoes) {
            questaoAtual = novaQuestao;
            window.renderizarQuestao();
        } else if (novaQuestao > totalQuestoes) {
            window.finalizarAtividadeSucesso();
        }
    };

    window.selecionarQuestao = (n) => {
        questaoAtual = n;
        window.renderizarQuestao();
    };

    window.renderizarQuestao = () => {
        const container = document.getElementById('area-questao');
        const progresso = (questaoAtual / totalQuestoes) * 100;
        
        document.getElementById('progress-inner').style.width = `${progresso}%`;
        
        container.innerHTML = `
            <div style="animation: fadeIn 0.4s forwards; display: flex; flex-direction: column;">
                <div style="margin-bottom: 20px;">
                    <span style="color:${cinzaTexto}; font-weight:800; font-size:0.75rem; text-transform:uppercase; letter-spacing: 1px;">Questão ${questaoAtual} de ${totalQuestoes}</span>
                    <h2 style="color:${azulPadrao}; margin-top:8px; font-size:clamp(1.1rem, 4vw, 1.4rem); line-height: 1.4; font-weight: 800;">De acordo com o áudio, qual foi o motivo do atraso do personagem?</h2>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:12px;">
                    ${['A', 'B', 'C'].map(alt => `
                        <label class="opcao-container ${respostas[questaoAtual] === alt ? 'selecionada' : ''}">
                            <input type="radio" name="questao" value="${alt}" 
                                ${respostas[questaoAtual] === alt ? 'checked' : ''} 
                                onclick="window.salvarResposta('${alt}')">
                            <span class="letra">${alt}</span>
                            <span class="texto-opcao">Esta é uma descrição harmônica da alternativa ${alt} para o aluno.</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.getElementById('btn-ant').style.opacity = questaoAtual === 1 ? '0.3' : '1';
        document.getElementById('btn-ant').style.pointerEvents = questaoAtual === 1 ? 'none' : 'auto';
        document.getElementById('btn-prox').innerHTML = questaoAtual === totalQuestoes ? 'FINALIZAR <i class="fa-solid fa-check-double"></i>' : 'PRÓXIMA <i class="fa-solid fa-arrow-right"></i>';
        
        document.querySelectorAll('.idx-item').forEach((el, i) => {
            el.classList.toggle('idx-active', (i + 1) === questaoAtual);
            if((i+1) === questaoAtual) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
    };

    window.salvarResposta = (alt) => {
        respostas[questaoAtual] = alt;
        window.renderizarQuestao();
    };

    setTimeout(window.renderizarQuestao, 100);

    return `
    <style>
        .area-atividade-protegida { user-select: none; -webkit-user-select: none; }
        .container-master-listening { 
            max-width: 900px; margin: 0 auto; padding: 15px; 
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            display: flex; flex-direction: column; min-height: 100vh;
        }

        .audio-card {
            background: #ffffff; border-radius: 20px; padding: 20px;
            border: 1px solid #e2e8f0; display: flex; align-items: center;
            gap: 15px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .btn-play-circle {
            width: 55px; height: 55px; min-width: 55px; border-radius: 50%;
            background: ${azulPadrao}; color: white; border: none;
            cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center;
        }

        .opcao-container {
            display: flex; align-items: center; gap: 15px; padding: 16px;
            border: 2px solid #f1f5f9; border-radius: 16px; cursor: pointer;
            transition: all 0.2s ease; background: white;
        }
        .opcao-container.selecionada { border-color: ${azulPadrao}; background: #f0f7ff; }
        .opcao-container input { display: none; }
        .letra { width: 32px; height: 32px; min-width: 32px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: ${azulPadrao}; }
        .selecionada .letra { background: ${azulPadrao}; color: white; }

        /* AJUSTE DO GAP (REDUÇÃO DE 50%) */
        .nav-footer {
            margin-top: 10px; /* Reduzido de 20px para 10px */
            padding: 10px 0;
            display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px;
        }

        .questoes-index {
            display: flex; gap: 6px; overflow-x: auto; padding: 5px;
            max-width: 200px; scrollbar-width: none;
        }
        .questoes-index::-webkit-scrollbar { display: none; }

        .idx-item {
            min-width: 32px; height: 32px; border-radius: 50%;
            background: white; border: 1px solid #e2e8f0;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.75rem; font-weight: 700; color: ${cinzaTexto}; cursor: pointer;
        }
        .idx-active { background: ${azulPadrao}; color: white; border-color: ${azulPadrao}; }

        .btn-nav { padding: 12px 20px; border-radius: 14px; border: none; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
        .btn-ant { background: #f1f5f9; color: ${cinzaTexto}; justify-self: start; }
        .btn-prox { background: ${azulPadrao}; color: white; justify-self: end; }

        .progress-bar { height: 8px; width: 100%; background: #e2e8f0; border-radius: 10px; margin-bottom: 25px; overflow: hidden; }
        .progress-inner { height: 100%; background: linear-gradient(90deg, #22c55e, #4ade80); width: 0%; transition: width 0.5s ease; }

        @keyframes fadeIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
    </style>

    <div class="container-master-listening area-atividade-protegida" oncontextmenu="return false">
        <header style="margin-bottom: 20px;">
            <h1 style="color:${azulPadrao}; font-weight:900; margin:0; font-size:1.4rem;">${atividadeInfo.titulo}</h1>
        </header>

        <div class="progress-bar"><div class="progress-inner" id="progress-inner"></div></div>

        <div class="audio-card" style="margin-bottom: 10px;"> <button id="btn-play-audio" class="btn-play-circle" onclick="window.tocarAudio()">
                <i class="fa-solid fa-play"></i>
            </button>
            <div style="flex-grow:1;">
                <span id="contador-plays" style="display:block; font-weight:800; color:${azulPadrao}; font-size:0.9rem;">Plays restantes: 2</span>
                <audio id="audio-player-principal" src="${atividadeInfo.audioUrl}"></audio>
            </div>
            <button onclick="window.solicitarLiberacaoModerna()" style="background:#fff1f2; border: 1px solid #fecdd3; padding:8px 12px; border-radius:10px; color:#e11d48; font-size:0.65rem; font-weight:800; cursor:pointer;">
                <i class="fa-solid fa-life-ring"></i> Suporte
            </button>
        </div>

        <div id="area-questao" style="background:white; border-radius:24px; padding:25px; border:1px solid #e2e8f0; min-height:300px;">
            </div>

        <div class="nav-footer">
            <button id="btn-ant" class="btn-nav btn-ant" onclick="window.navegar(-1)">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            
            <div class="questoes-index">
                ${Array.from({length: 10}, (_, i) => `
                    <div class="idx-item" onclick="window.selecionarQuestao(${i+1})">${i+1}</div>
                `).join('')}
            </div>

            <button id="btn-prox" class="btn-nav btn-prox" onclick="window.navegar(1)">
                PRÓXIMA <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    </div>
    `;
});