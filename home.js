window.Router.register('home', async () => {
  // IMPORTAÇÕES DENTRO DO ESCOPO PARA NÃO ATRAPALHAR A ROTA
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
  const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
  const { getFirestore, doc, getDoc, collection, query, where, onSnapshot, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

  // CONFIGURAÇÃO PRIVADA DA ROTA
  const firebaseConfig = {
    apiKey: "AIzaSyDhbzne_klt9ba1B_I04JXykvpslX2aD0k",
    authDomain: "plata4form.firebaseapp.com",
    projectId: "plata4form",
    storageBucket: "plata4form.firebasestorage.app",
    messagingSenderId: "833502821958",
    appId: "1:833502821958:web:2d8899b12ca4bd97b01447"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  let indiceSolicitacao = 0;
  let snapshotSolicitacoesLocal = null;
  
  // Controle de estado persistente para os alertas
  if (window.msgCountHome === undefined) window.msgCountHome = null;
  if (window.countEscrita === undefined) window.countEscrita = null;
  if (window.countOral === undefined) window.countOral = null;
  if (window.countGramatica === undefined) window.countGramatica = null;
  if (window.countAuditiva === undefined) window.countAuditiva = null;
  
  const buscarDadosHome = async () => {
    try {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const elTituloNome = document.getElementById('titulo-nome-usuario');
          const docRef = doc(db, "usuarios", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (elTituloNome) {
            const nomeCompleto = docSnap.exists() ? docSnap.data().nome : (user.displayName || 'Usuário');
            
            // Lógica para pegar apenas o primeiro e segundo nome
            const partesNome = nomeCompleto.trim().split(/\s+/);
            const nomeExibicao = partesNome.length > 1 
              ? `${partesNome[0]} ${partesNome[1]}` 
              : partesNome[0];

            // Adicionado sinal de exclamação após o nome
            elTituloNome.innerText = `Olá, ${nomeExibicao}!`;
          }

          // --- FUNÇÃO DE PERSISTÊNCIA (PISCAR ATÉ CLICAR) ---
          const verificarAlertaPersistent = (cardId, totalAtual) => {
            const storageKey = `visto_prof_${cardId}_${user.uid}`;
            const ultimoVisto = parseInt(localStorage.getItem(storageKey) || "0");
            const cardEl = document.getElementById(cardId);
            
            if (cardEl) {
              if (totalAtual > ultimoVisto) {
                cardEl.classList.add('blink-verde-ativo');
              } else {
                cardEl.classList.remove('blink-verde-ativo');
              }
            }
          };

          // --- LÓGICA DO PRÓXIMO EVENTO ---
          const atualizarCardProximoEvento = () => {
            const containerEvento = document.getElementById('nome-prox-evento');
            const containerData = document.getElementById('data-prox-evento');
            if (!containerEvento) return;

            const eventos = JSON.parse(localStorage.getItem('eventos_calendario') || '[]');
            const hoje = new Date().setHours(0,0,0,0);

            const proximos = eventos
              .filter(e => new Date(e.data + 'T00:00:00') >= hoje)
              .sort((a, b) => new Date(a.data + 'T00:00:00') - new Date(b.data + 'T00:00:00'));

            if (proximos.length > 0) {
              const prox = proximos[0];
              const [ano, mes, dia] = prox.data.split('-');
              containerEvento.innerText = prox.titulo;
              containerData.innerText = `${dia}/${mes}/${ano}`;
            } else {
              containerEvento.innerText = "Nenhum evento";
              containerData.innerText = "Agende no calendário";
            }
          };
          atualizarCardProximoEvento();

          // --- MONITORAMENTO EM TEMPO REAL ---
          const monitorarContagem = (colecao, elementoId, queryConstraints = []) => {
            const q = query(collection(db, colecao), ...queryConstraints);
            onSnapshot(q, (snap) => {
              const el = document.getElementById(elementoId);
              if (el) el.innerText = snap.size;
            });
          };

          monitorarContagem("usuarios", "contagem-alunos", [where("perfil", "==", "Aluno"), where("status", "==", "aprovado")]);
          monitorarContagem("turmas", "contagem-turmas");
          monitorarContagem("atividades_enviadas", "contagem-provas");
          monitorarContagem("redacoes", "contagem-feedbacks", [where("status", "==", "corrigida")]);

          const monitorarAtividadeTipo = (tipoAtiv, elId, cardId, globalVar) => {
            const q = query(collection(db, "atividades"), where("tipo", "==", tipoAtiv));
            onSnapshot(q, (snap) => {
              const el = document.getElementById(elId);
              const total = snap.size;
              if (el) el.innerText = total;
              window[globalVar] = total;
              verificarAlertaPersistent(cardId, total);
            });
          };

          monitorarAtividadeTipo("escrita", "contagem-escrita", "card-escrita", "countEscrita");
          monitorarAtividadeTipo("oral", "contagem-oral", "card-oral", "countOral");
          monitorarAtividadeTipo("gramatica", "contagem-gramatica", "card-gramatica", "countGramatica");
          monitorarAtividadeTipo("auditiva", "contagem-auditiva", "card-auditiva", "countAuditiva");

          onSnapshot(query(collection(db, "mensagens_diretas"), where("destinatarioId", "==", user.uid)), (snap) => {
            const el = document.getElementById('contagem-msg-recebidas');
            const total = snap.size;
            if (el) el.innerText = total;
            window.msgCountHome = total;
            verificarAlertaPersistent('card-msg-recebidas', total);
          });

          monitorarContagem("mensagens_diretas", "contagem-msg-enviadas", [where("remetenteId", "==", user.uid)]);

          onSnapshot(query(collection(db, "usuarios"), where("status", "==", "pendente"), where("perfil", "==", "Aluno")), (snap) => {
            snapshotSolicitacoesLocal = snap; 
            const containerPaiSoli = document.getElementById('wrapper-solicitacoes');
            if (containerPaiSoli) containerPaiSoli.style.display = snap.empty ? 'none' : 'block';
            renderizarSolicitacoesHome();
          });

          const snapMsg = await getDocs(collection(db, "mensagens"));
          const containerPaiMsg = document.getElementById('wrapper-mensagens');
          if (containerPaiMsg) {
            containerPaiMsg.style.display = snapMsg.empty ? 'none' : 'block';
            renderizarMensagensHome(snapMsg);
          }
        }
      });
    } catch (erro) { console.error("Erro no Firestore:", erro); }
  };

  window.acessarAtividade = (cardId, rota) => {
    const user = auth.currentUser;
    if (user) {
      const contagemElemento = document.querySelector(`#${cardId} strong`);
      const valorAtual = contagemElemento ? contagemElemento.innerText : "0";
      localStorage.setItem(`visto_prof_${cardId}_${user.uid}`, valorAtual);
    }
    const card = document.getElementById(cardId);
    if (card) card.classList.remove('blink-verde-ativo');
    window.location.hash = rota;
  };

  window.navegarSolicitacoes = (direcao) => {
    if (!snapshotSolicitacoesLocal) return;
    indiceSolicitacao = Math.max(0, Math.min(indiceSolicitacao + direcao, snapshotSolicitacoesLocal.size - 1));
    renderizarSolicitacoesHome();
  };

  const renderizarSolicitacoesHome = () => {
    const container = document.getElementById('lista-solicitacoes-home');
    if (!container || !snapshotSolicitacoesLocal || snapshotSolicitacoesLocal.empty) return;
    const docs = snapshotSolicitacoesLocal.docs;
    const u = docs[indiceSolicitacao].data();
    container.innerHTML = `
      <div class="item-acao">
        <div><strong>${u.nome}</strong><br><small>Turma: ${u.turma || 'Pendente'}</small></div>
        <button class="btn-acao btn-eval" onclick="window.location.hash='#alunos'">Gerenciar</button>
      </div>
      ${docs.length > 1 ? `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;"><span style="font-size:0.6rem;">${indiceSolicitacao + 1}/${docs.length}</span><div style="display:flex; gap:5px;"><button onclick="navegarSolicitacoes(-1)" class="btn-acao btn-read"><i class="fa-solid fa-chevron-left"></i></button><button onclick="navegarSolicitacoes(1)" class="btn-acao btn-read"><i class="fa-solid fa-chevron-right"></i></button></div></div>` : ''}`;
  };

  const renderizarMensagensHome = (snap) => {
    const container = document.getElementById('lista-mensagens-home');
    if (!container) return;
    container.innerHTML = snap.docs.slice(0, 2).map(doc => {
      const m = doc.data();
      return `<div class="item-acao"><div><strong>${m.assunto || 'Mensagem'}</strong><br><small>${m.remetente || 'Aluno'}</small></div><button class="btn-acao btn-read" onclick="window.location.hash='#mensagens'">Ler</button></div>`;
    }).join('');
  };

  setTimeout(() => { buscarDadosHome(); }, 100);

  return `
    <style>
      .header-prof { width: 100%; margin-bottom: 25px; }
      
      .stats-grid { 
        display: grid; 
        grid-template-columns: repeat(4, 1fr); 
        gap: 20px; 
        margin-bottom: 20px; 
      }

      .stat-card { 
        background: #fff; 
        padding: 20px; 
        border-radius: 18px; 
        box-shadow: 0 4px 20px rgba(0,0,0,0.05); 
        display: flex; 
        flex-direction: column; 
        
        /* FIXO: Altura e largura travadas */
        height: 140px; 
        width: 100%;
        max-width: 280px; 
        
        box-sizing: border-box; 
        border-top: 6px solid #003058; 
        transition: 0.3s; 
        position: relative;
        overflow: hidden; /* Garante que o conteúdo não quebre o tamanho fixo */
      }

      .stat-card.clickable { cursor: pointer; }
      .stat-card.clickable:hover { transform: translateY(-3px); }
      .blink-verde-ativo { animation: pulse-green 1s infinite !important; border-top-color: #22c55e !important; box-shadow: 0 0 15px rgba(34, 197, 94, 0.4) !important; }
      @keyframes pulse-green { 0% { background: #ffffff; } 50% { background: #dcfce7; } 100% { background: #ffffff; } }
      .stat-card span { font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
      .stat-card strong { font-size: 1.8rem; color: #003058; margin-top: 5px; font-weight: 800; }
      .stat-card .event-date { font-size: 0.85rem; color: #004b87; font-weight: 600; margin-top: 5px; }
      
      .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
      .card-dash { background: #fff; padding: 20px; border-radius: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
      .card-dash h3 { color: #003058; font-size: 0.95rem; margin-bottom: 15px; border-bottom: 2px solid #f4f7f6; padding-bottom: 8px; text-transform: uppercase; font-weight: 800; margin-top:0; }
      .item-acao { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
      .btn-acao { border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 0.7rem; font-weight: 700; }
      .btn-eval { background: #e0f2fe; color: #003058; }
      .btn-read { background: #e0f2fe; color: #0369a1; }

      @media (max-width: 1024px) { 
        .stats-grid { grid-template-columns: repeat(2, 1fr); } 
      }
      @media (max-width: 600px) { 
        .stats-grid { grid-template-columns: 1fr; }
        .stat-card { max-width: 100%; }
      }
    </style>

    <div class="header-prof">
      <h1 id="titulo-nome-usuario" style="text-transform: uppercase; font-weight: 800; color: #003058; margin:0;">CARREGANDO...</h1>
      <p style="color: #64748b; font-weight: 500; font-size: 1.1rem; margin: 5px 0;">Bom trabalho hoje!</p>
    </div>

    <hr style="border:0; border-top:2px solid #f1f5f9; margin: 20px 0 30px 0;">

    <div class="stats-grid">
      <div class="stat-card"><span>Alunos Ativos</span><strong id="contagem-alunos">...</strong></div>
      <div class="stat-card"><span>Total de Turmas</span><strong id="contagem-turmas">...</strong></div>
      <div class="stat-card"><span>Atividades Criadas</span><strong id="contagem-provas">...</strong></div>
      <div class="stat-card"><span>Feedbacks Enviados</span><strong id="contagem-feedbacks">...</strong></div>
    </div>

    <div class="stats-grid">
      <div class="stat-card clickable" id="card-escrita" onclick="window.acessarAtividade('card-escrita', '#escrita')">
        <span>Escritas recebidas</span><strong id="contagem-escrita">...</strong>
      </div>
      <div class="stat-card clickable" id="card-oral" onclick="window.acessarAtividade('card-oral', '#oral')">
        <span>Orais recebidas</span><strong id="contagem-oral">...</strong>
      </div>
      <div class="stat-card clickable" id="card-gramatica" onclick="window.acessarAtividade('card-gramatica', '#gramatica')">
        <span>Gramáticas recebidas</span><strong id="contagem-gramatica">...</strong>
      </div>
      <div class="stat-card clickable" id="card-auditiva" onclick="window.acessarAtividade('card-auditiva', '#auditivas')">
        <span>Auditivas recebidas</span><strong id="contagem-auditiva">...</strong>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card clickable" id="card-msg-recebidas" onclick="window.acessarAtividade('card-msg-recebidas', '#mensagens')">
        <span>Mensagens Recebidas</span><strong id="contagem-msg-recebidas">...</strong>
      </div>
      <div class="stat-card"><span>Mensagens Enviadas</span><strong id="contagem-msg-enviadas">...</strong></div>
    
      <div class="stat-card clickable" onclick="window.location.hash='#calendario'">
        <span>Próximo Evento</span>
        <strong id="nome-prox-evento" style="font-size: 1.1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;">...</strong>
        <div id="data-prox-evento" class="event-date">...</div>
      </div>
      <div style="visibility: hidden;" class="stat-card"></div>
    </div>

    <div class="dashboard-grid">
      <div class="card-dash" id="wrapper-solicitacoes" style="display:none;">
        <h3><i class="fa-solid fa-user-plus"></i> Solicitações Pendentes</h3>
        <div id="lista-solicitacoes-home"></div>
      </div>
      <div class="card-dash" id="wrapper-mensagens" style="display:none;">
        <h3><i class="fa-solid fa-bullhorn"></i> Avisos Recentes</h3>
        <div id="lista-mensagens-home"></div>
      </div>
    </div>
  `;
});