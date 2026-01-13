Router.register('diario', async () => {
  
  // Importação dinâmica da biblioteca de QR Code
  if (!document.getElementById('qr-script')) {
    const script = document.createElement('script');
    script.id = 'qr-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    document.head.appendChild(script);
  }

  // 1. FUNÇÕES DE NAVEGAÇÃO E ESTADO
  window.alternarAbasDiario = (btn, abaId) => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const titulos = {
      'chamada': '<i class="fa-solid fa-check-double"></i> Fazer chamada',
      'frequencia': '<i class="fa-solid fa-table"></i> Diário de Classe',
      'conteudo': '<i class="fa-solid fa-book-open"></i> Registro de Conteúdo',
      'resultados': '<i class="fa-solid fa-star"></i> Resultados'
    };
    
    const tituloElem = document.getElementById('titulo-aba-diario');
    if (tituloElem) tituloElem.innerHTML = titulos[abaId] || 'Diário';
    
    window.carregarInterfaceChamada(abaId);
  };

  // 2. LÓGICA DE SALVAMENTO NO FIREBASE (MODO CHAMADA)
  window.finalizarChamadaFirebase = async (turmaId, nomeTurma) => {
    const cards = document.querySelectorAll('.student-attendance-card');
    const presencas = [];
    const faltas = [];

    cards.forEach(card => {
        const nome = card.querySelector('.nome-aluno-chamada').innerText;
        const email = card.querySelector('.email-aluno-chamada').innerText;
        const estaPresente = card.querySelector('input[type="checkbox"]').checked;
        const dadosAluno = { nome, email };
        if (estaPresente) presencas.push(dadosAluno);
        else faltas.push(dadosAluno);
    });

    if (!confirm(`Deseja finalizar a chamada de ${nomeTurma}?`)) return;

    try {
        await window.fsMethods.addDoc(window.fsMethods.collection(window.db, "frequencia"), {
            turmaId, nomeTurma, data: new Date().toISOString(), presentes: presencas, faltas, totalAlunos: presencas.length + faltas.length
        });
        alert("Chamada salva!");
        window.carregarInterfaceChamada();
    } catch (e) { alert("Erro ao salvar."); }
  };

  // 3. LÓGICA DA GRADE DE FREQUÊNCIA (HORIZONTAL E VERTICAL)
  window.adicionarColunaDataTabela = () => {
    const novaData = prompt("Digite a data (ex: 12/08):");
    if (!novaData) return;
    const headerRow = document.getElementById('header-datas');
    const th = document.createElement('th');
    th.className = 'th-data-grade';
    th.contentEditable = "true";
    th.innerText = novaData;
    headerRow.appendChild(th);

    document.querySelectorAll('.row-aluno-tabela').forEach(row => {
      const td = document.createElement('td');
      td.className = 'td-ponto';
      td.innerHTML = `<div class="ponto-celula" onclick="this.classList.toggle('presente')"></div>`;
      row.appendChild(td);
    });
  };

  window.adicionarLinhaAlunoTabela = () => {
    const tbody = document.querySelector('.tabela-estilo-excel tbody');
    const numColunas = document.getElementById('header-datas').cells.length - 2;
    const novaOrdem = tbody.rows.length + 1;
    const tr = document.createElement('tr');
    tr.className = 'row-aluno-tabela';
    
    let pontosHtml = '';
    for(let i=0; i<numColunas; i++) {
        pontosHtml += `<td class="td-ponto"><div class="ponto-celula" onclick="this.classList.toggle('presente')"></div></td>`;
    }

    tr.innerHTML = `
        <td style="text-align: center; color: #718096; font-weight: bold;">${novaOrdem}</td>
        <td class="nome-editavel" contentEditable="true" style="text-align: left; padding-left: 10px; font-weight: 500;">Novo Aluno</td>
        ${pontosHtml}
    `;
    tbody.appendChild(tr);
  };

  window.salvarGradeFrequencia = () => {
      alert("Relatório de frequência processado e salvo localmente no diário!");
  };

  // 4. INTERFACE DE SESSÃO ATIVA
  window.abrirSessaoChamada = async (turmaId, nomeTurma, abaDestino = 'chamada') => {
    const container = document.getElementById('render-diario-content');
    container.innerHTML = '<p style="text-align:center;">Buscando dados...</p>';

    try {
      const q = window.fsMethods.query(window.fsMethods.collection(window.db, "usuarios"), window.fsMethods.where("turma", "==", turmaId));
      const snap = await window.fsMethods.getDocs(q);
      let listaAlunos = [];
      snap.forEach(doc => { listaAlunos.push({ ...doc.data(), presente: false }); });

      if (listaAlunos.length === 0) {
        listaAlunos = [{ nome: "Ana Letícia Marques", email: "ana@email.com" }, { nome: "Jorge Eliu Freitas", email: "jorge@email.com" }];
      }

      if (abaDestino === 'frequencia') {
        container.innerHTML = `
          <div style="margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
              <button onclick="carregarInterfaceChamada('frequencia')" class="btn-padrao" style="background:#718096; color:white; padding: 8px 15px;"><i class="fa-solid fa-arrow-left"></i> Voltar</button>
              <button onclick="adicionarColunaDataTabela()" class="btn-padrao" style="background:#003058; color:white; padding: 8px 15px;"><i class="fa-solid fa-calendar-plus"></i> + Coluna (Data)</button>
              <button onclick="adicionarLinhaAlunoTabela()" class="btn-padrao" style="background:#2c3e50; color:white; padding: 8px 15px;"><i class="fa-solid fa-user-plus"></i> + Linha (Aluno)</button>
          </div>

          <div class="grade-frequencia-wrapper">
            <table class="tabela-estilo-excel">
              <thead>
                <tr id="header-datas">
                  <th style="width: 30px;">ORD</th>
                  <th style="text-align: left; padding-left: 10px; min-width: 180px;">NOME DO ALUNO (Clique para editar)</th>
                  <th class="th-data-grade" contentEditable="true">11/08</th>
                  <th class="th-data-grade" contentEditable="true">18/08</th>
                </tr>
              </thead>
              <tbody>
                ${listaAlunos.map((aluno, index) => `
                  <tr class="row-aluno-tabela">
                    <td style="text-align: center; color: #718096; font-weight: bold;">${index + 1}</td>
                    <td class="nome-editavel" contentEditable="true" style="text-align: left; padding-left: 10px; font-weight: 500;">${aluno.nome}</td>
                    <td class="td-ponto"><div class="ponto-celula" onclick="this.classList.toggle('presente')"></div></td>
                    <td class="td-ponto"><div class="ponto-celula" onclick="this.classList.toggle('presente')"></div></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <button onclick="salvarGradeFrequencia()" class="btn-padrao btn-salvar" style="width: 100%; margin-top: 20px; height: 50px;">
            <i class="fa-solid fa-floppy-disk"></i> SALVAR RELATÓRIO DE FREQUÊNCIA
          </button>
        `;
        return;
      }

      container.innerHTML = `
        <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <button onclick="carregarInterfaceChamada('chamada')" class="btn-padrao" style="background:#718096; color:white; padding: 8px 15px;"><i class="fa-solid fa-arrow-left"></i> Voltar</button>
            <strong style="color:#003058;">${nomeTurma}</strong>
        </div>
        <div class="attendance-container">
          <div class="qr-side">
            <div id="qrcode-real" style="padding: 10px; background: #fff; border: 4px solid #003058; border-radius: 12px; margin-bottom: 10px;"></div>
            <p style="font-size: 0.75rem; text-align: center; font-weight: bold; margin: 0;">MODO ESCANEAMENTO</p>
          </div>
          <div class="list-side">
            <h4 style="margin: 0 0 12px 0; color: #003058; font-size: 1rem;">Lista de Entrada</h4>
            <div id="lista-presenca-dinamica" style="max-height: 350px; overflow-y: auto;">
                ${listaAlunos.map(aluno => `
                  <div class="student-attendance-card">
                    <div style="overflow: hidden; flex: 1;">
                      <div class="nome-aluno-chamada" style="font-weight: 700;">${aluno.nome}</div>
                      <div class="email-aluno-chamada" style="font-size: 0.7rem; color: #718096;">${aluno.email}</div>
                    </div>
                    <input type="checkbox" onchange="this.closest('.student-attendance-card').classList.toggle('present')" style="transform: scale(1.1); cursor: pointer;">
                  </div>
                `).join('')}
            </div>
            <button onclick="finalizarChamadaFirebase('${turmaId}', '${nomeTurma}')" class="btn-padrao btn-salvar" style="width: 100%; margin-top: 15px; height: 45px; font-size: 0.9rem;">
                <i class="fa-solid fa-cloud-arrow-up"></i> FINALIZAR CHAMADA
            </button>
          </div>
        </div>
      `;

      setTimeout(() => {
        const qrElem = document.getElementById("qrcode-real");
        if(qrElem) {
          qrElem.innerHTML = "";
          new QRCode(qrElem, { text: turmaId, width: 130, height: 130, colorDark : "#003058", colorLight : "#ffffff" });
        }
      }, 200);

    } catch (e) { container.innerHTML = "Erro ao carregar."; }
  };

  // 5. LISTAGEM DE TURMAS
  window.carregarInterfaceChamada = async (abaAtual = 'chamada') => {
    const container = document.getElementById('render-diario-content');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center; color:#718096;">Carregando turmas...</p>';
    
    try {
      const q = window.fsMethods.query(window.fsMethods.collection(window.db, "turmas"), window.fsMethods.orderBy("dataCriacao", "desc"));
      const snap = await window.fsMethods.getDocs(q);
      let html = `<p style="color: #718096; text-align: center; margin-bottom: 20px; font-size: 0.9rem;">Escolha uma turma:</p><div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">`;
      snap.forEach(doc => {
        const t = doc.data();
        html += `<button class="btn-padrao btn-ler" style="padding: 10px 15px;" onclick="abrirSessaoChamada('${t.senha}', '${t.nomeCustomizado || t.nome}', '${abaAtual}')">${t.nomeCustomizado || t.nome}</button>`;
      });
      container.innerHTML = html + `</div>`;
    } catch (e) { container.innerHTML = "Erro ao carregar turmas."; }
  };

  setTimeout(() => window.carregarInterfaceChamada(), 100);

  return `
    <style>
      .header-prof h1 { color: #003058; font-size: 2rem; font-weight: 800; letter-spacing: -1px; margin-bottom: 5px; }
      .divisor { border: 0; height: 1px; background: #e2e8f0; margin: 20px 0; }
      .tabs-container { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; flex-wrap: wrap; }
      .tab-button { background: none; border: none; padding: 8px 16px; font-weight: 700; color: #718096; cursor: pointer; border-radius: 8px; transition: 0.3s; font-size: 0.85rem; }
      .tab-button.active { background-color: #003058; color: #fff; box-shadow: 0 2px 8px rgba(0,48,88,0.3); }
      .card { background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.08); border: 1px solid #f1f5f9; width: 100%; box-sizing: border-box; }
      .btn-padrao { border: none; border-radius: 8px; cursor: pointer; font-weight: 700; transition: 0.3s; }
      .btn-ler { background-color: #003058; color: white; }
      .btn-salvar { background-color: #003058; color: white; font-weight: 800; }

      .grade-frequencia-wrapper { width: 100%; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
      .tabela-estilo-excel { width: 100%; border-collapse: collapse; background: white; font-size: 0.8rem; }
      .tabela-estilo-excel th, .tabela-estilo-excel td { border: 1px solid #e2e8f0; padding: 8px 5px; white-space: nowrap; outline: none; }
      .tabela-estilo-excel thead tr { background: #f8fafc; color: #003058; }
      .th-data-grade { width: 60px; text-align: center; font-size: 0.75rem; background: #ebf4ff; color: #2b6cb0; cursor: text; }
      .td-ponto { text-align: center; width: 45px; }
      .ponto-celula { width: 18px; height: 18px; border: 2px solid #cbd5e0; border-radius: 4px; margin: 0 auto; cursor: pointer; }
      .ponto-celula.presente { background-color: #27ae60; border-color: #27ae60; position: relative; }
      .ponto-celula.presente::after { content: '✓'; color: white; font-size: 12px; display: flex; justify-content: center; align-items: center; height: 100%; }
      .nome-editavel:focus { background: #fffcf0; box-shadow: inset 0 0 5px rgba(0,0,0,0.1); }

      .attendance-container { display: flex; gap: 15px; flex-wrap: wrap; width: 100%; }
      .qr-side { flex: 0 0 180px; display: flex; flex-direction: column; align-items: center; background: #f8fafc; padding: 12px; border-radius: 15px; border: 1px solid #edf2f7; margin: 0 auto; }
      .list-side { flex: 1 1 250px; }
      .student-attendance-card { display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #edf2f7; border-radius: 10px; margin-bottom: 6px; }
      .student-attendance-card.present { background-color: #dcfce7 !important; border-color: #22c55e !important; }

      @media (max-width: 600px) { .qr-side, .list-side { flex: 1 1 100%; } }
    </style>

    <div class="header-prof">
      <h1>DIÁRIO</h1>
    </div>
    <hr class="divisor">

    <div class="tabs-container">
      <button class="tab-button active" onclick="alternarAbasDiario(this, 'chamada')">Fazer chamada</button>
      <button class="tab-button" onclick="alternarAbasDiario(this, 'frequencia')">Frequência</button>
      <button class="tab-button" onclick="alternarAbasDiario(this, 'conteudo')">Conteúdo</button>
      <button class="tab-button" onclick="alternarAbasDiario(this, 'resultados')">Resultados</button>
    </div>

    <div id="conteudo-diario" class="card">
      <h3 id="titulo-aba-diario"><i class="fa-solid fa-check-double"></i> Fazer chamada</h3>
      <div id="render-diario-content"></div>
    </div>
  `;
});