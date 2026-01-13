window.Router.register('materialdidaticoclm', async () => {
    return `
    <style>
        /* Container ocupando 100% da largura */
        .material-container {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        /* Título em UPPERCASE conforme padrão solicitado */
        .header-prof h1 {
            text-transform: uppercase;
            font-size: 1.5rem;
            color: #003058;
            font-weight: 800;
            margin-bottom: 5px;
        }

        .header-prof p {
            color: #64748b;
            font-size: 0.95rem;
        }

        /* Card com Sombras Suaves (Soft Shadows) */
        .card-material {
            background: #ffffff;
            border-radius: 16px;
            padding: 25px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
            border: 1px solid #f1f5f9;
            width: 100%;
        }

        /* Tabs em Estilo Pílula (Pill Style) */
        .tabs-pills {
            display: flex;
            gap: 10px;
            margin-bottom: 25px;
            overflow-x: auto;
            padding-bottom: 5px;
        }

        .pill {
            padding: 8px 20px;
            border-radius: 50px;
            background: #f1f5f9;
            color: #64748b;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: 0.3s;
            border: none;
            white-space: nowrap;
        }

        .pill:hover {
            background: #e2e8f0;
        }

        .pill.active {
            background: #004aad;
            color: white;
        }

        /* Grid de Materiais */
        .grid-materiais {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 15px;
        }

        /* Itens da Lista */
        .item-material {
            border: 1px solid #e2e8f0;
            padding: 18px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            gap: 15px;
            transition: all 0.3s ease;
            cursor: pointer;
            background: #fff;
        }

        .item-material:hover {
            border-color: #004aad;
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(0, 74, 173, 0.1);
        }

        .icon-box {
            padding: 12px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .divisor {
            border: 0;
            height: 1px;
            background: #e2e8f0;
            margin: 10px 0 25px 0;
        }

        .search-wrapper {
            position: relative;
            flex: 1;
            max-width: 300px;
        }

        .search-wrapper i {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
        }

        .search-wrapper input {
            width: 100%;
            padding: 10px 10px 10px 38px;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            outline: none;
            font-size: 0.9rem;
        }
    </style>

    <div class="material-container">
        <div class="header-prof">
            <h1>Material Didático 📚</h1>
            <p>Acesse apostilas, PDFs e conteúdos complementares das suas aulas.</p>
        </div>

        <hr class="divisor">

        <div class="card-material">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                <div class="tabs-pills" style="margin-bottom: 0;">
                    <button class="pill active">Todos</button>
                    <button class="pill">Apostilas</button>
                    <button class="pill">Exercícios</button>
                    <button class="pill">Vídeos</button>
                </div>

                <div class="search-wrapper">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input type="text" placeholder="Buscar material...">
                </div>
            </div>

            <div class="grid-materiais">
                <div class="item-material">
                    <div class="icon-box" style="background: rgba(231, 76, 60, 0.1); color: #e74c3c;">
                        <i class="fa-solid fa-file-pdf fa-xl"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="color: #003058; margin-bottom: 2px; font-size: 0.9rem;">Apostila de Introdução - Vol 1</h4>
                        <p style="font-size: 0.7rem; color: #64748b;">PDF • 2.4 MB • 01/01/2026</p>
                    </div>
                    <i class="fa-solid fa-download" style="color: #004aad;"></i>
                </div>

                <div class="item-material">
                    <div class="icon-box" style="background: rgba(52, 152, 219, 0.1); color: #3498db;">
                        <i class="fa-solid fa-video fa-xl"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="color: #003058; margin-bottom: 2px; font-size: 0.9rem;">Videoaula: Revisão Geral</h4>
                        <p style="font-size: 0.7rem; color: #64748b;">Link • YouTube</p>
                    </div>
                    <i class="fa-solid fa-arrow-up-right-from-square" style="color: #004aad;"></i>
                </div>

                <div class="item-material">
                    <div class="icon-box" style="background: rgba(46, 204, 113, 0.1); color: #2ecc71;">
                        <i class="fa-solid fa-pen-to-square fa-xl"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="color: #003058; margin-bottom: 2px; font-size: 0.9rem;">Lista de Exercícios Fixação</h4>
                        <p style="font-size: 0.7rem; color: #64748b;">DOCX • 1.1 MB • 03/01/2026</p>
                    </div>
                    <i class="fa-solid fa-download" style="color: #004aad;"></i>
                </div>
            </div>
        </div>

        <div class="card-material" style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px;">
            <p style="text-align: center; color: #64748b; font-size: 0.85rem; font-weight: 500;">
                <i class="fa-solid fa-circle-info" style="margin-right: 5px;"></i> 
                Dica: Você pode baixar os materiais para estudar offline em qualquer dispositivo.
            </p>
        </div>
    </div>
    `;
});