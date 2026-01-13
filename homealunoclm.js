window.Router.register('homealunoclm', async () => {
    const db = window.db;
    const { doc, getDoc, collection, query, where, onSnapshot, getDocs } = window.fsMethods;
    const azulPadrao = "#003058";

    // 1. GARANTIR QUE AS VARIÁVEIS EXISTAM NO OBJETO WINDOW
    if (typeof window.countEscrita === 'undefined') window.countEscrita = null;
    if (typeof window.countOral === 'undefined') window.countOral = null;
    if (typeof window.countGramatica === 'undefined') window.countGramatica = null;
    if (typeof window.countAuditiva === 'undefined') window.countAuditiva = null;
    if (typeof window.avisoCount === 'undefined') window.avisoCount = null;
    if (typeof window.msgCount === 'undefined') window.msgCount = null;
    if (typeof window.feedbackCount === 'undefined') window.feedbackCount = null;
    
    const carregarDadosHomeAluno = async () => {
        try {
            const auth = window.authMethods.getAuth();
            const user = auth.currentUser;
            if (!user) return;

            // Busca dados do aluno
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));
            if (!userDoc.exists()) return;
            const dadosUsuario = userDoc.data();
            const turmaAluno = dadosUsuario.turma;
            
            // LÓGICA PARA PEGAR PRIMEIRO E SEGUNDO NOME
            const nomes = (dadosUsuario.nome || "").split(" ");
            const nomeExibicao = nomes.slice(0, 2).join(" ");
            
            const elBoasVindas = document.getElementById('boas-vindas-aluno');
            if (elBoasVindas) {
                elBoasVindas.innerHTML = `Olá, ${nomeExibicao}!<br><small style="font-size: 1rem; color: #64748b; font-weight: 400;">Bons estudos hoje!</small>`;
            }

            // --- LÓGICA DE PERSISTÊNCIA DO ALERTA (PISCAR ATÉ CLICAR) ---
            const verificarAlertaPersistent = (cardId, totalAtual) => {
                const storageKey = `visto_${cardId}_${user.uid}`;
                const ultimoVisto = parseInt(localStorage.getItem(storageKey) || "0");
                const cardEl = document.getElementById(cardId);
                
                if (cardEl) {
                    // Se o total atual for maior que o que ele viu, pisca.
                    if (totalAtual > ultimoVisto) {
                        cardEl.classList.add('blink-alerta');
                    } else {
                        cardEl.classList.remove('blink-alerta');
                    }
                }
            };

            // --- LÓGICA DO CALENDÁRIO ---
            const buscarEventoMaisProximo = () => {
                const key = `eventos_cal_${user.uid}`;
                const eventos = JSON.parse(localStorage.getItem(key) || '[]');
                const hoje = new Date().setHours(0,0,0,0);
                const futuros = eventos
                    .filter(e => new Date(e.data + 'T00:00:00') >= hoje)
                    .sort((a, b) => new Date(a.data + 'T00:00:00') - new Date(b.data + 'T00:00:00'));

                const elTitulo = document.getElementById('prox-evento-titulo');
                const elData = document.getElementById('prox-evento-data');

                if (futuros.length > 0 && elTitulo) {
                    const prox = futuros[0];
                    const [ano, mes, dia] = prox.data.split('-');
                    elTitulo.innerText = prox.titulo;
                    elData.innerText = `${dia}/${mes}/${ano}`;
                } else if (elTitulo) {
                    elTitulo.innerText = "Nenhum evento";
                    elData.innerText = "Agende no calendário";
                }
            };
            buscarEventoMaisProximo();

            // --- MONITORAMENTO DE ATIVIDADES (COM CHECAGEM CRUZADA PARA ESCRITA) ---
            const monitorarEscritaSincronizada = () => {
    const qAtv = query(
        collection(db, "atividades_enviadas"), 
        where("tipo", "==", "escrita"),
        where("turmasSelecionadas", "array-contains", turmaAluno)
    );
    
    onSnapshot(qAtv, async (snapAtv) => {
        const qResolvidas = query(collection(db, "redacoes"), where("alunoId", "==", user.uid));
        const resolvidasSnap = await getDocs(qResolvidas);
        
        const idsFeitos = new Set();
        resolvidasSnap.forEach(d => idsFeitos.add(d.data().atividadeId));

        let pendentes = 0;
        snapAtv.forEach(docAtv => {
            if (!idsFeitos.has(docAtv.id)) pendentes++;
        });

        const el = document.getElementById('count-escrita');
        if (el) el.innerText = pendentes;
        window.countEscrita = pendentes;
        verificarAlertaPersistent('card-escrita', pendentes);
    });
};
            monitorarEscritaSincronizada();

            const monitorarPendentes = (tipo, elId, cardId, globalVar) => {
                const q = query(collection(db, "atividades_enviadas"), where("turma", "==", turmaAluno), where("tipo", "==", tipo));
                onSnapshot(q, (snap) => {
                    const total = snap.size;
                    const el = document.getElementById(elId);
                    if (el) el.innerText = total;
                    window[globalVar] = total;
                    verificarAlertaPersistent(cardId, total);
                });
            };

            monitorarPendentes("oral", "count-oral", "card-oral", "countOral");
            monitorarPendentes("gramatica", "count-gramatica", "card-gramatica", "countGramatica");
            monitorarPendentes("auditiva", "count-auditiva", "card-auditiva", "countAuditiva");

            // --- MONITORAMENTO DE FEEDBACKS E RESOLVIDAS ---
            onSnapshot(query(collection(db, "redacoes"), where("alunoId", "==", user.uid)), (snap) => {
                const elCountFeedback = document.getElementById('card-feedback-count');
                const elCountResolvidas = document.getElementById('card-resolvidas-count');
                
                const feedbacksValidos = snap.docs.filter(d => {
                    const data = d.data();
                    return data.status === 'corrigida' || data.feedbackProfessor || data.feedbackGeral;
                }).length;

                const totalResolvidas = snap.size;

                if (elCountFeedback) elCountFeedback.innerText = feedbacksValidos;
                if (elCountResolvidas) elCountResolvidas.innerText = totalResolvidas;

                window.feedbackCount = feedbacksValidos;
                verificarAlertaPersistent('card-feedback', feedbacksValidos);
            });

            // --- MONITORAMENTO DE AVISOS ---
            onSnapshot(collection(db, "avisos"), (snap) => {
                const total = snap.size; 
                const el = document.getElementById('card-avisos-count');
                if (el) el.innerText = total;
                window.avisoCount = total;
                verificarAlertaPersistent('card-avisos', total);
            });

            // --- MONITORAMENTO DE MENSAGENS RECEBIDAS ---
            onSnapshot(query(collection(db, "mensagens_diretas"), where("destinatarioId", "==", user.uid)), (snap) => {
                const total = snap.size;
                const el = document.getElementById('card-msg-count');
                if (el) el.innerText = total;
                window.msgCount = total;
                verificarAlertaPersistent('card-msg', total);
            });

            // --- MONITORAMENTO DE MENSAGENS ENVIADAS ---
            onSnapshot(query(collection(db, "mensagens_diretas"), where("remetenteId", "==", user.uid)), (snap) => {
                const totalEnviadas = snap.size;
                const elEnviadas = document.getElementById('card-enviadas-count');
                if (elEnviadas) elEnviadas.innerText = totalEnviadas;
            });

        } catch (e) { console.error(e); }
    };

    // FUNÇÕES DE CLIQUE
    window.acaoAtividadeTipo = (cardId, tipo) => {
        const total = document.getElementById(`count-${tipo}`)?.innerText || "0";
        const user = window.authMethods.getAuth().currentUser;
        localStorage.setItem(`visto_${cardId}_${user.uid}`, total);
        document.getElementById(cardId)?.classList.remove('blink-alerta');
        window.location.hash = `#atividadesclm?tipo=${tipo}`; 
    };
    window.acaoEscrita = () => {
        const total = document.getElementById('count-escrita')?.innerText || "0";
        const user = window.authMethods.getAuth().currentUser;
        localStorage.setItem(`visto_card-escrita_${user.uid}`, total);
        document.getElementById('card-escrita')?.classList.remove('blink-alerta');
        window.location.hash = '#escritaalunoclm';
    };
    window.acaoAvisos = () => {
        const total = document.getElementById('card-avisos-count')?.innerText || "0";
        const user = window.authMethods.getAuth().currentUser;
        localStorage.setItem(`visto_card-avisos_${user.uid}`, total);
        document.getElementById('card-avisos')?.classList.remove('blink-alerta');
        window.location.hash = '#avisosclm';
    };
    window.acaoMensagens = () => {
        const total = document.getElementById('card-msg-count')?.innerText || "0";
        const user = window.authMethods.getAuth().currentUser;
        localStorage.setItem(`visto_card-msg_${user.uid}`, total);
        document.getElementById('card-msg')?.classList.remove('blink-alerta');
        window.location.hash = '#mensagensclm';
    };
    window.acaoFeedbacks = () => {
        const total = document.getElementById('card-feedback-count')?.innerText || "0";
        const user = window.authMethods.getAuth().currentUser;
        localStorage.setItem(`visto_card-feedback_${user.uid}`, total);
        document.getElementById('card-feedback')?.classList.remove('blink-alerta');
        window.location.hash = '#feedbackdoalunoclm';
    };

    setTimeout(carregarDadosHomeAluno, 200);

    return `
        <style>
            .grid-aluno { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; width: 100%; }
            .card-aluno {
                min-height: 120px; display: flex; flex-direction: column; justify-content: center; 
                background: #fff; padding: 20px; border-radius: 12px; border-top: 5px solid ${azulPadrao};
                box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: 0.3s; position: relative;
            }
            .card-aluno h3 { color: #64748b; font-size: 0.8rem; text-transform: uppercase; margin-bottom: 5px; font-weight: 700; }
            .card-aluno .count { font-size: 2.5rem; font-weight: 800; color: ${azulPadrao}; }
            .clickable { cursor: pointer; }
            .clickable:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
            .blink-alerta { 
                animation: pulse-verde-fix 1s infinite !important; 
                border-top-color: #22c55e !important; 
                box-shadow: 0 0 15px rgba(34, 197, 94, 0.4) !important;
            }
            @keyframes pulse-verde-fix {
                0% { background-color: #ffffff; }
                50% { background-color: #dcfce7; }
                100% { background-color: #ffffff; }
            }
        </style>

        <div class="header-prof">
            <h1 id="boas-vindas-aluno" style="text-transform: uppercase;">Carregando...</h1>
        </div>
        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eef2f6;">
        
        <div class="grid-aluno">
            <div class="card-aluno clickable" id="card-escrita" onclick="window.acaoEscrita()">
                <h3>Escritas recebidas</h3><div id="count-escrita" class="count">0</div>
            </div>
            <div class="card-aluno clickable" id="card-oral" onclick="window.acaoAtividadeTipo('card-oral', 'oral')">
                <h3>Orais recebidas</h3><div id="count-oral" class="count">0</div>
            </div>
            <div class="card-aluno clickable" id="card-gramatica" onclick="window.acaoAtividadeTipo('card-gramatica', 'gramatica')">
                <h3>Gramáticas recebidas</h3><div id="count-gramatica" class="count">0</div>
            </div>
            <div class="card-aluno clickable" id="card-auditiva" onclick="window.acaoAtividadeTipo('card-auditiva', 'auditiva')">
                <h3>Auditivas recebidas</h3><div id="count-auditiva" class="count">0</div>
            </div>

            <div class="card-aluno">
                <h3>Atividades Resolvidas</h3><div id="card-resolvidas-count" class="count">0</div>
            </div>
            <div class="card-aluno clickable" id="card-feedback" onclick="window.acaoFeedbacks()">
                <h3>Feedbacks Recebidos</h3><div id="card-feedback-count" class="count">0</div>
            </div>
            
            <div class="card-aluno clickable" id="card-enviadas" onclick="window.location.hash = '#mensagensclm'">
                <h3>Mensagens Enviadas</h3><div id="card-enviadas-count" class="count">0</div>
            </div>
            
            <div class="card-aluno clickable" id="card-msg" onclick="window.acaoMensagens()">
                <h3>Mensagens Recebidas</h3><div id="card-msg-count" class="count">0</div>
            </div>

            <div class="card-aluno clickable" id="card-avisos" onclick="window.acaoAvisos()">
                <h3>Avisos Recebidos</h3><div id="card-avisos-count" class="count">0</div>
            </div>
            <div class="card-aluno clickable" id="card-eventos" onclick="window.location.hash = '#calendarioclm'">
                <h3>Próximo Evento</h3>
                <div id="prox-evento-titulo" class="count" style="font-size: 1.2rem; margin: 5px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Nenhum</div>
                <div id="prox-evento-data" style="font-size: 0.85rem; color: #64748b; font-weight: 600;">--/--/--</div>
            </div>
        </div>
    `;
});