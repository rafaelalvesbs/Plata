window.Router.register('banco', async () => {
  const db = window.db;
  const { collection, getDocs, addDoc, serverTimestamp, query, where, orderBy, deleteDoc, doc, writeBatch } = window.fsMethods;

  // --- ESTADO E PAGINAÇÃO ---
  let questoesCarregadas = [];
  let paginaAtual = 1;
  const itensPorPagina = 4; // Alterado para 4 conforme solicitado

  // --- FUNÇÕES DE CONTROLE ---
  window.switchTabBanco = (tabId) => {
    document.querySelectorAll('.tab-banco-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-banco-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).style.display = 'block';
    document.getElementById('btn-' + tabId).classList.add('active');
    
    if(tabId === 'lista') window.carregarAssuntosBanco();
  };

  window.enviarParaBanco = async () => {
    const assunto = document.getElementById('assunto-nome').value;
    const enunciado = document.getElementById('pergunta-texto').value;
    
    if(!assunto || !enunciado) return alert("Preencha o assunto e a questão!");

    try {
      await addDoc(collection(db, "banco_questoes"), {
        assunto: assunto,
        pergunta: enunciado,
        dataCriacao: serverTimestamp()
      });
      alert("Questão salva com sucesso!");
      document.getElementById('assunto-nome').value = '';
      document.getElementById('pergunta-texto').value = '';
      if(questoesCarregadas.length > 0) window.carregarAssuntosBanco();
    } catch (e) { alert("Erro ao salvar."); }
  };

  window.carregarAssuntosBanco = async () => {
    const seletor = document.getElementById('filtro-assunto');
    try {
      const snap = await getDocs(collection(db, "banco_questoes"));
      const assuntos = [...new Set(snap.docs.map(d => d.data().assunto))];
      
      let options = '<option value="todos">Todos os Assuntos</option>';
      assuntos.forEach(a => options += `<option value="${a}">${a}</option>`);
      seletor.innerHTML = options;
      
      window.filtrarBanco();
    } catch (e) { console.error(e); }
  };

  window.filtrarBanco = async () => {
    const filtro = document.getElementById('filtro-assunto').value;
    const container = document.getElementById('lista-questoes-banco');
    container.innerHTML = '<p>Buscando...</p>';
    
    try {
      let q = query(collection(db, "banco_questoes"), orderBy("dataCriacao", "desc"));
      if(filtro !== 'todos') {
        q = query(collection(db, "banco_questoes"), where("assunto", "==", filtro));
      }
      
      const snap = await getDocs(q);
      questoesCarregadas = [];
      snap.forEach(doc => questoesCarregadas.push({ id: doc.id, ...doc.data() }));
      
      paginaAtual = 1;
      window.renderizarPaginaBanco();
    } catch (e) { container.innerHTML = 'Erro ao filtrar.'; }
  };

  window.excluirQuestaoBanco = async (id) => {
    if (!confirm("Excluir esta questão do banco?")) return;
    try {
      await deleteDoc(doc(db, "banco_questoes", id));
      alert("Questão removida!");
      window.carregarAssuntosBanco();
    } catch (e) { alert("Erro ao excluir."); }
  };

  window.excluirTodoBanco = async () => {
    if (!confirm("ATENÇÃO: Isso excluirá TODO o banco de questões. Continuar?")) return;
    try {
      const snap = await getDocs(collection(db, "banco_questoes"));
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(doc(db, "banco_questoes", d.id)));
      await batch.commit();
      alert("Banco limpo!");
      window.carregarAssuntosBanco();
    } catch (e) { alert("Erro ao limpar."); }
  };

  window.editarQuestaoBanco = (id) => {
    const item = questoesCarregadas.find(q => q.id === id);
    if(!item) return;
    window.switchTabBanco('envio');
    document.getElementById('assunto-nome').value = item.assunto;
    document.getElementById('pergunta-texto').value = item.pergunta;
  };

  window.renderizarPaginaBanco = () => {
    const container = document.getElementById('lista-questoes-banco');
    if (questoesCarregadas.length === 0) {
      container.innerHTML = '<p style="text-align:center; padding:20px;">Nenhuma questão encontrada.</p>';
      return;
    }

    const inicio = (paginaAtual - 1) * itensPorPagina;
    const itensPagina = questoesCarregadas.slice(inicio, inicio + itensPorPagina);

    let html = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
        <button onclick="window.excluirTodoBanco()" style="background:#003058; color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:10px;">
          <i class="fa-solid fa-trash-can"></i> Limpar Banco
        </button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px;">`;

    itensPagina.forEach(d => {
      html += `
        <div class="card q-card-item" style="display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 12px;">
          <div style="display: flex; align-items: center; gap: 15px; flex: 1; overflow: hidden;">
            <strong style="color:#003058; font-size: 9px; min-width: 80px; text-transform: uppercase; white-space: nowrap;">${d.assunto}</strong>
            <div style="font-size: 12px; color: #444; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 5px;">${d.pergunta}</div>
          </div>
          <div style="display: flex; gap: 5px;">
            <button onclick="alert('${d.pergunta}')" style="background:#003058; color:white; border:none; padding:4px 8px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:10px;">Ver</button>
            <button onclick="window.editarQuestaoBanco('${d.id}')" style="background:#003058; color:white; border:none; padding:4px 8px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:10px;">Editar</button>
            <button onclick="window.excluirQuestaoBanco('${d.id}')" style="background:transparent; color:#e74c3c; border:1px solid #e74c3c; padding:3px 7px; border-radius:5px; cursor:pointer; font-size:10px;"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
    });

    const totalPaginas = Math.ceil(questoesCarregadas.length / itensPorPagina);
    html += `
      </div>
      <div style="margin-top: 10px; display: flex; justify-content: center; gap: 8px; align-items: center;">
        <button class="btn-pag-banco" onclick="window.mudarPaginaBanco(${paginaAtual - 1})" ${paginaAtual === 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size: 11px; font-weight: bold; color: #64748b;">Página ${paginaAtual} de ${totalPaginas}</span>
        <button class="btn-pag-banco" onclick="window.mudarPaginaBanco(${paginaAtual + 1})" ${paginaAtual === totalPaginas ? 'disabled' : ''}>Próximo</button>
      </div>`;

    container.innerHTML = html;
  };

  window.mudarPaginaBanco = (novaPagina) => {
    paginaAtual = novaPagina;
    window.renderizarPaginaBanco();
  };

  return `
    <style>
      .banco-nav { display: flex; gap: 10px; margin-top: 40px; margin-bottom: 20px; }
      .tab-banco-btn { padding: 10px 20px; border: none; background: #e2e8f0; border-radius: 8px; cursor: pointer; font-weight: bold; color: #64748b; }
      .tab-banco-btn.active { background: #003058; color: white; }
      .form-banco { display: flex; flex-direction: column; gap: 12px; }
      .input-banco { padding: 10px; border-radius: 8px; border: 1px solid #ddd; width: 100%; }
      .btn-banco { background: #003058;; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold; }
      .q-card-item { background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 5px solid #003058; }
      .btn-pag-banco { background: #fff; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 5px; cursor: pointer; font-size: 10px; font-weight: bold; }
      .btn-pag-banco:disabled { opacity: 0.4; cursor: not-allowed; }
    </style>

    <div class="header-prof">
      <h1>Banco de Questões</h1>
      <p>Gerencie e organize suas atividades por assunto.</p>
    </div>

    <div class="banco-nav">
      <button id="btn-envio" class="tab-banco-btn active" onclick="window.switchTabBanco('envio')">Enviar Questão</button>
      <button id="btn-lista" class="tab-banco-btn" onclick="window.switchTabBanco('lista')">Banco de Questões</button>
    </div>

    <div id="tab-envio" class="tab-banco-content card">
      <div class="form-banco">
        <h3>Nova Questão</h3>
        <input type="text" id="assunto-nome" class="input-banco" placeholder="Nome do Assunto (Ex: Verbos Irregulares)">
        <textarea id="pergunta-texto" class="input-banco" style="height:120px;" placeholder="Digite o enunciado..."></textarea>
        <button class="btn-banco" onclick="window.enviarParaBanco()">Salvar no Banco</button>
      </div>
    </div>

    <div id="tab-lista" class="tab-banco-content" style="display:none;">
      <div class="card" style="margin-bottom:12px; padding: 12px;">
        <h3 style="font-size: 15px;"><i class="fa-solid fa-filter"></i> Filtrar Assunto</h3>
        <select id="filtro-assunto" class="input-banco" onchange="window.filtrarBanco()" style="margin-top:5px; padding: 6px; font-size: 13px;"></select>
      </div>
      <div id="lista-questoes-banco"></div>
    </div>
  `;
});