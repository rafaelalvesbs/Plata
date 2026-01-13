window.Router.register('alunos', async () => {


  // 2. CARREGAR SOLICITAÇÕES (PENDENTES)
  window.carregarSolicitacoes = async () => {
    const container = document.getElementById('lista-solicitacoes');
    if (!container) return;
    
    container.innerHTML = "<p style='padding:20px;'>Buscando solicitações no banco...</p>";
    
    try {
        const q = window.fsMethods.query(
            window.fsMethods.collection(window.db, "usuarios"),
            window.fsMethods.where("status", "==", "pendente"),
            window.fsMethods.where("perfil", "==", "Aluno")
        );
        
        const snap = await window.fsMethods.getDocs(q);
        
        if (snap.empty) {
            container.innerHTML = "<div style='text-align:center; padding:40px; color:#64748b;'>Nenhuma solicitação pendente.</div>";
            return;
        }

        let html = `<div class="lista-vertical">`;
        snap.forEach(docSnap => {
            const aluno = docSnap.data();
            const idDoc = docSnap.id;
            
            const dataObj = aluno.data && aluno.data.seconds ? new Date(aluno.data.seconds * 1000) : new Date();
            const dataF = dataObj.toLocaleDateString('pt-BR');

            html += `
                <div class="card-item-horizontal">
                  <div class="info-linha">
                    <div style="flex: 1.5;">
                        <strong style="color: #1e293b; display:block;">${aluno.nome}</strong>
                        <span style="font-size: 0.75rem; color: #64748b;">${aluno.email}</span>
                    </div>
                    <div style="flex: 1; color: #004b87; font-weight: 600; font-size: 0.85rem;">
                        Turma: ${aluno.turma || aluno.codigoInstitucional || 'N/A'}
                    </div>
                    <div style="flex: 1; color: #94a3b8; font-size: 0.75rem; text-align:right;">
                        <i class="fa-regular fa-calendar"></i> ${dataF}
                    </div>
                  </div>
                  <div class="card-acoes">
                    <button class="btn-aprovar-blue" onclick="aprovarAluno('${idDoc}')">
                      <i class="fa-solid fa-check"></i> Aprovar
                    </button>
                    <button class="btn-excluir-icon" onclick="excluirRegistroAluno('${idDoc}')">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>`;
        });
        container.innerHTML = html + `</div>`;
    } catch (e) {
        console.error(e);
        container.innerHTML = "<p style='padding:20px; color:red;'>Erro ao carregar solicitações.</p>";
    }
  };

  // 3. FUNÇÃO PARA APROVAR
  window.aprovarAluno = async (id) => {
    if (!confirm("Deseja realmente aprovar este aluno?")) return;
    try {
        const userRef = window.fsMethods.doc(window.db, "usuarios", id);
        await window.fsMethods.updateDoc(userRef, {
            status: 'aprovado',
            dataAprovacao: new Date()
        });
        alert("Aluno aprovado!");
        carregarSolicitacoes();
    } catch (e) {
        alert("Erro ao aprovar.");
    }
  };

  // 5. CARREGAR HISTÓRICO DE ALUNOS ATIVOS (APROVADOS)
  window.carregarAlunosAtivos = async () => {
    const container = document.getElementById('lista-alunos-ativos');
    if (!container) return;

    container.innerHTML = "<p style='padding:20px;'>Carregando lista de ativos...</p>";

    try {
        // 1. Busca as turmas que existem atualmente
        const snapTurmas = await window.fsMethods.getDocs(window.fsMethods.collection(window.db, "turmas"));
        const senhasExistentes = snapTurmas.docs.map(doc => doc.data().senha);

        // 2. Busca os alunos aprovados
        const qAlunos = window.fsMethods.query(
            window.fsMethods.collection(window.db, "usuarios"),
            window.fsMethods.where("status", "==", "aprovado"),
            window.fsMethods.where("perfil", "==", "Aluno")
        );
        const snapAlunos = await window.fsMethods.getDocs(qAlunos);
        
        // 3. FILTRO: Só mantém o aluno se a turma dele estiver na lista de turmas existentes
        const alunosComTurmaValida = snapAlunos.docs.filter(doc => 
            senhasExistentes.includes(doc.data().turma)
        );

        if (alunosComTurmaValida.length === 0) {
            container.innerHTML = "<div style='text-align:center; padding:40px; color:#64748b;'>Nenhum aluno ativo vinculado a uma turma existente.</div>";
            return;
        }

        let html = `<div class="lista-vertical">`;
        alunosComTurmaValida.forEach(docSnap => {
            const aluno = docSnap.data();
            const dataAceito = aluno.dataAprovacao && aluno.dataAprovacao.seconds 
                ? new Date(aluno.dataAprovacao.seconds * 1000).toLocaleDateString('pt-BR') 
                : "---";
            
            html += `
                <div class="card-item-horizontal" style="border-left: 4px solid #003058;">
                  <div class="info-linha">
                    <div style="flex: 1.5; font-weight: 700; color: #1e293b;">${aluno.nome}</div>
                    <div style="flex: 1.2; color: #64748b; font-size: 0.85rem;">${aluno.email}</div>
                    <div style="flex: 1; color: #004b87; font-weight: 600;">Turma: ${aluno.turma}</div>
                    <div style="flex: 0.8; color: #003058; font-size: 0.75rem; font-weight: 600;">Aceito em: ${dataAceito}</div>
                  </div>
                  <div class="card-acoes">
                    <button class="btn-excluir-icon" title="Excluir Aluno permanentemente" onclick="window.excluirRegistroAluno('${docSnap.id}')">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>`;
        });
        container.innerHTML = html + `</div>`;
    } catch (e) {
        container.innerHTML = "<p style='padding:20px; color:red;'>Erro ao carregar histórico.</p>";
    }
  };

  setTimeout(() => carregarSolicitacoes(), 50);

  return `
    <style>
      .tabs-nav { display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
      .tab-btn { padding: 8px 16px; border: none; background: none; cursor: pointer; font-weight: 700; color: #64748b; border-radius: 8px; transition: 0.3s; }
      .tab-active { background: #003058 !important; color: white !important; }
      .lista-vertical { display: flex; flex-direction: column; gap: 8px; padding: 10px; }
      .card-item-horizontal { 
        background-color: #ffffff; padding: 10px 20px; border-radius: 8px; border: 1px solid #e2e8f0; 
        display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
      }
      .info-linha { display: flex; align-items: center; flex: 1; gap: 20px; }
      .card-acoes { display: flex; align-items: center; gap: 15px; margin-left: 20px; }
      .btn-aprovar-blue { background: #003058; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 0.75rem; display: flex; align-items: center; gap: 5px; }
      .btn-excluir-icon { background: none; color: #dc2626; border: none; padding: 5px; cursor: pointer; font-size: 1rem; opacity: 0.6; }
      .btn-excluir-icon:hover { opacity: 1; }
      @media (max-width: 850px) {
        .info-linha { flex-wrap: wrap; gap: 10px; }
        .card-item-horizontal { flex-direction: column; align-items: stretch; gap: 10px; }
      }
    </style>

    <div class="header-prof">
      <h1>Alunos</h1>
      <p style="color: #64748b;">Gerencie as solicitações dos seus estudantes.</p>
    </div>
    <hr class="divisor" style="margin: 15px 0;">

    <div id="lista-solicitacoes"></div>
  `;
});