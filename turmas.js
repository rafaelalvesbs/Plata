window.Router.register('turmas', async () => {
  
  // 1. NAVEGAÇÃO
  window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    document.getElementById('btn-' + tabId).classList.add('tab-active');
    document.getElementById('content-' + tabId).style.display = 'block';
    
    if(tabId === 'lista') carregarListaTurmas();
  };

  // 2. BUSCAR ALUNOS DA TURMA (AGORA COM BOTÃO EXCLUIR ALUNO)
  window.verAlunos = async (senhaTurma, identificacaoTurma) => {
    const container = document.getElementById('lista-turmas-unificada');
    container.innerHTML = `
      <div style="padding:10px;">
        <button onclick="carregarListaTurmas()" style="background:#f1f5f9; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; font-weight:600; color:#475569; margin-bottom:10px;">
          <i class="fa-solid fa-chevron-left"></i> Voltar
        </button>
        <h3 style="color:#003058; margin-bottom: 10px; font-size:1.1rem;"><i class="fa-solid fa-graduation-cap"></i> Alunos: ${identificacaoTurma}</h3>
        <div id="lista-alunos-turma">Carregando alunos...</div>
      </div>`;

    try {
      const q = window.fsMethods.query(
        window.fsMethods.collection(window.db, "usuarios"), 
        window.fsMethods.where("turma", "==", senhaTurma),
        window.fsMethods.where("status", "==", "aprovado")
      );
      const snap = await window.fsMethods.getDocs(q);
      const listaAlunos = document.getElementById('lista-alunos-turma');

      if (snap.empty) {
        listaAlunos.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b; background:#f8fafc; border-radius:12px;">Nenhum aluno matriculado ou aprovado.</div>`;
        return;
      }

      let html = `<table class="tabela-estilizada"><thead><tr><th>Nome</th><th>E-mail</th><th style="text-align:center;">Ação</th></tr></thead><tbody>`;
      snap.forEach(doc => {
        const aluno = doc.data();
        html += `
          <tr>
            <td style="padding:8px;"><i class="fa-solid fa-user" style="color:#94a3b8; margin-right:8px;"></i>${aluno.nome}</td>
            <td style="padding:8px;">${aluno.email}</td>
            <td style="padding:8px; text-align:center; display: flex; justify-content: center; gap: 15px;">
  <button onclick="window.location.hash='#mensagens'" title="Enviar Mensagem" style="background:none; border:none; color:#004b87; cursor:pointer; font-size:1.1rem;">
    <i class="fa-solid fa-envelope"></i>
  </button>

  <button onclick="excluirAluno('${doc.id}', '${aluno.nome}', '${senhaTurma}', '${identificacaoTurma}')" title="Remover Aluno" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.1rem;">
    <i class="fa-solid fa-user-minus"></i>
  </button>
</td>
            </td>
          </tr>`;
      });
      listaAlunos.innerHTML = html + `</tbody></table>`;
    } catch (e) { 
      console.error(e);
      alert("Erro ao carregar alunos."); 
    }
  };

  // FUNÇÃO PARA EXCLUIR ALUNO
  window.excluirAluno = async (idAluno, nomeAluno, senhaTurma, identificacaoTurma) => {
    if (!confirm(`Deseja remover o aluno "${nomeAluno}" desta turma?`)) return;
    try {
      // 1. Localiza o aluno exato no banco de dados
const referenciaAluno = window.fsMethods.doc(window.db, "usuarios", idAluno);

// 2. Manda o Firebase deletar permanentemente
await window.fsMethods.deleteDoc(referenciaAluno);
      alert("Aluno removido com sucesso!");
      verAlunos(senhaTurma, identificacaoTurma); // Atualiza a lista de alunos
    } catch (e) {
      alert("Erro ao remover aluno.");
    }
  };

  // 3. EXCLUIR TURMA
  window.excluirTurma = async (idDocumento, identificacaoTurma, event) => {
    if (event) event.stopPropagation(); 
    if (!confirm(`Deseja excluir a turma "${identificacaoTurma}"?`)) return;
    try {
      await window.fsMethods.deleteDoc(window.fsMethods.doc(window.db, "turmas", idDocumento));
      alert("Turma removida!");
      carregarListaTurmas(); 
    } catch (e) { alert("Erro ao excluir."); }
  };

  // 4. CARREGAR LISTA
  window.carregarListaTurmas = async () => {
    const container = document.getElementById('lista-turmas-unificada');
    container.innerHTML = "<p style='padding:10px;'>Carregando...</p>";
    try {
      const q = window.fsMethods.query(window.fsMethods.collection(window.db, "turmas"), window.fsMethods.orderBy("dataCriacao", "desc"));
      const snap = await window.fsMethods.getDocs(q);
      if (snap.empty) { container.innerHTML = "<p style='padding:10px;'>Nenhuma turma.</p>"; return; }

      let html = `<div class="lista-turmas-vertical">`;
      snap.forEach(doc => {
        const t = doc.data();
        const identificacao = t.nomeCustomizado || t.nome;
        html += `
          <div class="card-turma-item">
            <div class="card-info-linha">
              <div class="info-item" style="flex:0.5; font-weight:800; color:#1e293b; font-size:0.85rem;">${t.nomeCustomizado}</div>
              <div class="info-item" style="flex:1; font-weight:600; color:#004b87; font-size:0.85rem;">${t.curso}</div>
              <div class="info-item" style="flex:0.8; color:#64748b; font-size:0.8rem;">${t.semestre}</div>
              <div class="info-item" style="flex:1.2; color:#64748b; font-size:0.8rem;">
              <i class="fa-regular fa-clock"></i> ${t.periodo} — ${t.horario || 'N/A'}</div>
              <div class="info-item" style="flex:0.7;">
              <code class="codigo-turma-box" onclick="mostrarSenhaTurma('${identificacao}', '${t.senha}')" style="font-size:0.75rem; cursor:pointer; border:1px dashed #003058;" title="Clique para ver detalhes"> ${t.senha}</code></div>
            </div>
            <div class="card-acoes">
              <button class="btn-ver-turma-green" onclick="verAlunos('${t.senha}', '${identificacao}')" style="padding:5px 10px; font-size:0.75rem;"><i class="fa-solid fa-eye"></i> Ver</button>
              <button class="btn-excluir-red-icon" onclick="excluirTurma('${doc.id}', '${identificacao}', event)" style="font-size:1rem;"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </div>`;
      });
      container.innerHTML = html + `</div>`;
    } catch (e) { container.innerHTML = "Erro ao carregar."; }
  };

  // 5. SENHA
  window.gerarSenha = () => {
    const input = document.getElementById('senhaTurma');
    const btn = document.querySelector('.btn-gen-key');
    const pass = Math.random().toString(36).substring(2, 8).toUpperCase();
    input.value = pass;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-lock"></i>';
  };

  window.atualizarHorarios = () => {
  const turno = document.getElementById('periodoTurma').value;
  const selectHorario = document.getElementById('horarioTurma');
  
  const opcoes = {
    "Manhã": ["7:30 às 8:45", "9:00 às 10:15", "10:15 às 11:30"],
    "Tarde": ["13:00 às 14:15", "14:15 às 15:00", "15:45 às 17:00"],
    "Noite": ["18:30 às 21:00"]
  };

  selectHorario.innerHTML = '<option value="">Selecione...</option>';
  
  if (turno && opcoes[turno]) {
    opcoes[turno].forEach(h => {
      selectHorario.innerHTML += `<option value="${h}">${h}</option>`;
    });
    selectHorario.disabled = false;
  } else {
    selectHorario.disabled = true; selectHorario.innerHTML = '<option value="">Selecione o turno primeiro...</option>';
  }
};

  // 6. SALVAR TURMA COM LIMITE DE 9
  window.salvarTurmaNoFirebase = async (e) => {
    e.preventDefault();

    // VALIDAÇÃO: Verifica se todos os campos estão preenchidos
    const campos = {
      nome: document.getElementById('nomeCustomizado').value,
      curso: document.getElementById('nomeTurma').value,
      turno: document.getElementById('periodoTurma').value,
      horario: document.getElementById('horarioTurma').value,
      semestre: document.getElementById('serieTurma').value,
      codigo: document.getElementById('senhaTurma').value,
      dias: document.querySelectorAll('#diasGrupo input:checked').length
    };

    if (Object.values(campos).some(v => !v || v === "" || v === 0) || campos.codigo.includes("Gere o código")) {
      alert("⚠️ Atenção: Preencha todos os campos e gere o código antes de salvar!");
      return; // Aqui a função para e não salva nada
    }

    try {
      const qLimpar = window.fsMethods.query(window.fsMethods.collection(window.db, "turmas"));
      const snapLimpar = await window.fsMethods.getDocs(qLimpar);
      
      if (snapLimpar.size >= 9) {
        alert("Limite atingido! Você só pode cadastrar no máximo 9 turmas.");
        return;
      }

      const dados = {
        nomeCustomizado: document.getElementById('nomeCustomizado').value,
        curso: document.getElementById('nomeTurma').value, // Mudei para 'curso' para ficar mais claro
        periodo: document.getElementById('periodoTurma').value,
        horario: document.getElementById('horarioTurma').value,
        senha: document.getElementById('senhaTurma').value,
        semestre: document.getElementById('serieTurma').value, // Nome mais intuitivo
        dias: Array.from(document.querySelectorAll('#diasGrupo input:checked')).map(cb => cb.value).join(', '),
        dataCriacao: window.fsMethods.serverTimestamp()
      };

      await window.fsMethods.addDoc(window.fsMethods.collection(window.db, "turmas"), dados);
      alert("Turma criada com sucesso!");
      e.target.reset();
      document.querySelector('.btn-gen-key').disabled = false;
      document.querySelector('.btn-gen-key').innerHTML = '<i class="fa-solid fa-key"></i>';
      switchTab('lista');
    } catch (err) { 
      console.error(err);
      alert("Erro ao salvar."); 
    }
  };

  window.mostrarSenhaTurma = (identificacao, senha) => {
    document.getElementById('modalTitulo').innerText = identificacao;
    document.getElementById('modalCodigo').innerText = senha;
    document.getElementById('modalSenha').style.display = 'flex';
  };

  window.fecharModal = () => {
    document.getElementById('modalSenha').style.display = 'none';
  };

  window.copiarSenhaModal = () => {
    const senha = document.getElementById('modalCodigo').innerText;
    const btn = document.getElementById('btnCopiarModal');
    navigator.clipboard.writeText(senha).then(() => {
      const textoOriginal = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
      btn.style.background = "#10b981";
      setTimeout(() => {
        btn.innerHTML = textoOriginal;
        btn.style.background = "#003058";
      }, 2000);
    });
  };

  setTimeout(() => switchTab('cadastro'), 50);

  return `
    <style>
      .header-prof { margin-top: -10px; }
      .header-prof h1 { font-size: 1.8rem; margin-bottom: 2px; }
      .header-prof p { font-size: 0.85rem; }
      .divisor { margin: 10px 0; }

      .tabs-nav { display: flex; gap: 10px; margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
      .tab-btn { padding: 8px 16px; border: none; background: none; cursor: pointer; font-weight: 700; color: #64748b; border-radius: 8px; transition: 0.3s; }
      .tab-active { background: #003058 !important; color: white !important; }
      
      .form-grid-turmas { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .form-group { display: flex; flex-direction: column; margin-bottom: 8px; }
      .form-group.full { grid-column: span 2; }
      .form-group label { font-size: 0.75rem; font-weight: 700; color: #475569; margin-bottom: 3px; }
      .form-group input, .form-group select { padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; width: 100%; box-sizing: border-box; }
      
      #senhaTurma { background: #e0f2fe !important; font-weight: bold; padding-right: 40px; }
      .pass-wrapper { position: relative; width: 100%; display: flex; align-items: center; }
      .btn-gen-key { position: absolute; right: 4px; background: #003058; color: white; border: none; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

      .checkbox-group { display: flex; flex-wrap: wrap; gap: 6px; }
      .check-item { display: flex; align-items: center; gap: 5px; background: #f8fafc; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.75rem; cursor: pointer; }

      .card { padding: 15px !important; margin-bottom: 0 !important; }
      .card-turma-item { background: white; padding: 8px 15px; border-radius: 10px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
      .card-info-linha { display: flex; align-items: center; flex: 1; gap: 10px; }
      .codigo-turma-box { background: #f1f5f9; padding: 4px 8px; border-radius: 5px; font-family: monospace; font-weight: bold; }
      
      .btn-ver-turma-green { background: #003058; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; transition: 0.2s; }
      .btn-ver-turma-green:hover { background: #003058; }
      .btn-excluir-red-icon { background: none; color: #ef4444; border: none; cursor: pointer; margin-left: 10px; }

      .tabela-estilizada { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; font-size: 0.85rem; }
      .tabela-estilizada th { background: #003058; color: white; padding: 8px; text-align: left; }
    </style>

    <div class="header-prof">
      <h1>Turmas</h1>
      <p style="color: #64748b;">Organize seus grupos (Máximo 9 turmas).</p>
    </div>
    <hr class="divisor">

    <div class="tabs-nav">
      <button id="btn-cadastro" class="tab-btn tab-active" onclick="switchTab('cadastro')">Cadastro</button>
      <button id="btn-lista" class="tab-btn" onclick="switchTab('lista')">Turmas ativas</button>
    </div>

    <div id="content-cadastro" class="tab-content">
      <div class="card" style="margin-top: 20px;">
        <form onsubmit="salvarTurmaNoFirebase(event)">
          <div class="form-grid-turmas">
            <div class="form-group full">
              <label>Nome da turma:</label>
              <input type="text" id="nomeCustomizado" placeholder="Ex: F1/1" required oninput="this.value = this.value.toUpperCase()">

            </div>
            <div class="form-group">
              <label>Curso:</label>
              <select id="nomeTurma" required>
                <option value="">Selecione...</option>
                <option value="Inglês">Inglês</option>
                <option value="Espanhol">Espanhol</option>
                <option value="Libras">Libras</option>
              </select>
            </div>
            <div class="form-group">
  <label>Turno:</label>
  <select id="periodoTurma" required onchange="window.atualizarHorarios()">
    <option value="">Selecione...</option>
    <option>Manhã</option>
    <option>Tarde</option>
    <option>Noite</option>
  </select>
</div>

<div class="form-group">
  <label>Horário:</label>
  <select id="horarioTurma" required disabled>
    <option value="">Selecione o turno primeiro...</option>
  </select>
</div>
            <div class="form-group">
              <label>Código da turma:</label>
              <div class="pass-wrapper">
                <input type="text" id="senhaTurma" placeholder="Gere o código da turma aqui ----> " readonly required>
                <button type="button" class="btn-gen-key" onclick="gerarSenha()"><i class="fa-solid fa-key"></i></button>
              </div>
            </div>
            <div class="form-group">
              <label>Semestre:</label>
              <select id="serieTurma" required>
                <option value="">Selecione...</option>
                <option>1º Semestre</option>
                <option>2º Semestre</option>
                <option>3º Semestre</option>
                <option>4º Semestre</option>
                <option>5º Semestre</option>
                <option>6º Semestre</option>
                <option>7º Semestre</option>
                <option>Intermediário</option>
              </select>
            </div>
            <div class="form-group full">
              <label>Dias de aula:</label>
              <div class="checkbox-group" id="diasGrupo">
                <label class="check-item"><input type="checkbox" value="Seg"> Seg</label>
                <label class="check-item"><input type="checkbox" value="Ter"> Ter</label>
                <label class="check-item"><input type="checkbox" value="Qua"> Qua</label>
                <label class="check-item"><input type="checkbox" value="Qui"> Qui</label>
              </div>
            </div>
          </div>
          <button type="submit" id="btnSalvar" class="btn-padrao" style="background:#003058; color:white; width:100%; margin-top:10px; padding:12px;">Finalizar cadastro</button>
        </form>
      </div>
    </div>

    <div id="content-lista" class="tab-content" style="display:none;">
      <div id="lista-turmas-unificada"></div>
    </div><div id="modalSenha" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center; backdrop-filter: blur(2px);">
      <div style="background:white; width:90%; max-width:400px; padding:25px; border-radius:20px; box-shadow: 0 20px 25px rgba(0,0,0,0.1); text-align:center;">
        <div style="background:#f8fafc; border-radius:15px; padding:15px; margin-bottom:20px;">
            <h3 id="modalTitulo" style="color:#003058; margin:0; font-size:1.1rem; text-transform:UPPERCASE; font-weight:800;"></h3>
            <p style="font-size:0.8rem; color:#64748b; margin-top:5px;">Código de acesso dos alunos</p>
        </div>
        <div id="modalCodigo" style="font-family:monospace; font-size:2.5rem; font-weight:900; color:#003058; margin:20px 0; letter-spacing:8px;"></div>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button onclick="copiarSenhaModal()" id="btnCopiarModal" style="width:100%; background:#003058; color:white; border:none; padding:12px; border-radius:50px; font-weight:700; cursor:pointer;">
            <i class="fa-solid fa-copy"></i> Copiar Código
          </button>
          <button onclick="fecharModal()" style="width:100%; background:#f1f5f9; color:#64748b; border:none; padding:10px; border-radius:50px; font-weight:600; cursor:pointer;">Fechar</button>
        </div>
      </div>
    </div>
  `;
});