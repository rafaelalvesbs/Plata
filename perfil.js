Router.register('perfil', async () => {
  return `
    <div class="header-prof">
      <h1>Meu Perfil</h1>
      <p>Gerencie suas informações pessoais e configurações de conta.</p>
    </div>
    
    <hr class="divisor">
    
    <div class="dashboard-grid" style="display: grid; grid-template-columns: 300px 1fr; gap: 25px;">
      
      <div class="card" style="text-align: center;">
        <div style="width: 120px; height: 120px; background: #e2e8f0; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; border: 4px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <i class="fa-solid fa-user-tie" style="font-size: 3.5rem; color: #003058;"></i>
        </div>
        <h3 style="border:none; padding:0; margin-bottom: 5px;">Prof. Nome Sobrenome</h3>
        <p style="color: #718096; font-size: 0.85rem; margin-bottom: 20px;">ID: #83350282</p>
        <button class="btn-perfil-top" style="width: 100%; justify-content: center; background: #f8fafc;">
          Alterar Foto
        </button>
      </div>

      <div class="card">
        <h3><i class="fa-solid fa-address-card"></i> Informações Pessoais</h3>
        
        <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
          <div class="form-group">
            <label>Nome Completo</label>
            <input type="text" value="Seu Nome Completo" style="width: 100%;">
          </div>
          <div class="form-group">
            <label>E-mail</label>
            <input type="email" value="professor@escola.com" style="width: 100%;">
          </div>
          <div class="form-group">
            <label>Disciplina Principal</label>
            <select style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd;">
              <option>Matemática</option>
              <option>Português</option>
              <option>História</option>
            </select>
          </div>
          <div class="form-group">
            <label>Nova Senha</label>
            <input type="password" placeholder="********" style="width: 100%;">
          </div>
        </div>

        <div style="margin-top: 30px; display: flex; gap: 15px; justify-content: flex-end;">
          <button class="btn-padrao btn-cancelar">Descartar</button>
          <button class="btn-padrao btn-salvar">Salvar Alterações</button>
        </div>
      </div>

    </div>
  `;
});