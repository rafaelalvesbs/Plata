Router.register('correcao', async () => {
  return `
    <div class="header-prof">
      <h1>Corrigir Provas</h1>
      <p>Gerencie as entregas e realize a correção das avaliações.</p>
    </div>
    
    <hr class="divisor">
    
    <div class="dashboard-grid" style="display: grid; grid-template-columns: 1fr; gap: 25px;">
      
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3><i class="fa-solid fa-pen-clip"></i> Aguardando Correção</h3>
          <span style="background: #ebf8ff; color: #3182ce; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700;">3 Provas Pendentes</span>
        </div>

        <div class="table-responsive">
          <table class="turma-table">
            <thead>
              <tr>
                <th>Prova</th>
                <th>Turma</th>
                <th>Entregas</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Avaliação Mensal - Bio</strong></td>
                <td>9º Ano A</td>
                <td>28 / 30</td>
                <td><span style="color: #e67e22; font-weight: 700;">Em andamento</span></td>
                <td>
                  <button class="btn-perfil-top" style="padding: 4px 10px; font-size: 0.7rem;">Continuar</button>
                </td>
              </tr>
              <tr>
                <td><strong>Simulado Geral</strong></td>
                <td>8º Ano B</td>
                <td>30 / 30</td>
                <td><span style="color: #27ae60; font-weight: 700;">Concluído</span></td>
                <td>
                  <button class="btn-perfil-top" style="padding: 4px 10px; font-size: 0.7rem;">Revisar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="background: #f8fafc; border: 1px dashed #cbd5e0;">
        <div style="text-align: center; padding: 20px;">
          <i class="fa-solid fa-file-signature" style="font-size: 2.5rem; color: #a0aec0; margin-bottom: 15px;"></i>
          <h4>Nenhum aluno selecionado</h4>
          <p style="color: #718096; font-size: 0.9rem;">Selecione uma prova acima para começar a atribuir notas e feedbacks.</p>
        </div>
      </div>

    </div>
  `;
});