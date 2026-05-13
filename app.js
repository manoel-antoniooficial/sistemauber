// Tenta recuperar dados locais com proteção contra corrupção
let savedData = JSON.parse(localStorage.getItem('uberProData')) || {};
let state = {
    corridas: savedData.corridas || [],
    custoKm: savedData.custoKm || 0.40
};

// Utiliza a API nativa do navegador para formatação de moeda perfeita (incluindo milhares e negativos)
const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}; 

// --- SISTEMA DE ACESSO E TOKENS ---
function verificarLogin() {
    let token = localStorage.getItem('crc_session_token');
    if(token) {
        document.getElementById('login-modal').style.display = 'none';
    } else {
        document.getElementById('login-modal').style.display = 'flex';
    }
}

function validarToken() {
    let input = document.getElementById('token-input').value.trim();
    
    if (TOKENS_VALIDOS.includes(input)) {
        localStorage.setItem('crc_session_token', input);
        document.getElementById('login-modal').style.display = 'none';
        atualizarDashboard();
    } else {
        alert("Token inválido! Verifique o código e tente novamente.");
    }
}

// --- SISTEMA DE CONFIGURAÇÕES ---
function abrirConfiguracoes() {
    document.getElementById('config-custo-km').value = state.custoKm;
    document.getElementById('settings-modal').style.display = 'flex';
}

function fecharConfiguracoes() {
    document.getElementById('settings-modal').style.display = 'none';
}

function salvarConfiguracoes() {
    let novoCusto = parseFloat(document.getElementById('config-custo-km').value);
    if(!isNaN(novoCusto) && novoCusto >= 0) {
        state.custoKm = novoCusto;
        localStorage.setItem('uberProData', JSON.stringify(state));
        fecharConfiguracoes();
        atualizarDashboard();
    } else {
        alert("Por favor, insira um valor válido para o Custo do KM.");
    }
}

// --- ATUALIZAÇÃO DO PAINEL ---
function atualizarDashboard() { 
    let faturamento = 0, km = 0, tempo = 0;
    
    let filtroData = document.getElementById('filtro-data')?.value;
    let corridasFiltradas = state.corridas;

    if (filtroData) {
        // Suporta tanto o formato antigo (ISO) quanto o novo formato corrigido (Data Local)
        corridasFiltradas = state.corridas.filter(c => (c.dataLocal === filtroData) || (c.data && c.data.startsWith(filtroData)));
    }

    let viagens = corridasFiltradas.length;

    corridasFiltradas.forEach(c => {
        faturamento += c.valor;
        km += c.km;
        tempo += c.tempo;
    });

    let gastosTotais = km * state.custoKm; 
    let lucroLiquido = faturamento - gastosTotais; 

    // Divisão Financeira Saudável
    let reserva = lucroLiquido > 0 ? lucroLiquido * 0.125 : 0;
    let manutencao = lucroLiquido > 0 ? lucroLiquido * 0.125 : 0;
    let proLabore = lucroLiquido > 0 ? lucroLiquido * 0.375 : 0;
    let giroLiquido = lucroLiquido > 0 ? lucroLiquido - (reserva + manutencao + proLabore) : 0;

    // Atualiza Performance
    document.getElementById('lucro').innerText = formatMoney(lucroLiquido); 
    document.getElementById('lucro-hora').innerText = formatMoney(tempo > 0 ? lucroLiquido / tempo : 0);
    document.getElementById('lucro-km').innerText = formatMoney(km > 0 ? lucroLiquido / km : 0);

    // Atualiza Gestão Financeira
    document.getElementById('pro-labore').innerText = formatMoney(proLabore);
    document.getElementById('reserva').innerText = formatMoney(reserva);
    document.getElementById('manutencao').innerText = formatMoney(manutencao);
    document.getElementById('giro').innerText = formatMoney(giroLiquido);

    // Atualiza Faturamento
    document.getElementById('faturamento').innerText = formatMoney(faturamento);
    document.getElementById('viagens').innerText = viagens;
    document.getElementById('fat-hora').innerText = formatMoney(tempo > 0 ? faturamento / tempo : 0);
    document.getElementById('fat-viagem').innerText = formatMoney(viagens > 0 ? faturamento / viagens : 0);

    // Atualiza Custos e Operação
    document.getElementById('custo-total').innerText = formatMoney(gastosTotais);
    document.getElementById('tempo-total').innerText = tempo.toFixed(1) + "h";
    document.getElementById('km-total').innerText = km.toFixed(1) + " km";
    document.getElementById('custo-hora').innerText = formatMoney(tempo > 0 ? gastosTotais / tempo : 0);
    document.getElementById('custo-km').innerText = formatMoney(km > 0 ? gastosTotais / km : 0);

    renderizarHistorico(corridasFiltradas);
}

function renderizarHistorico(lista) {
    let divHistorico = document.getElementById('historico-lista');
    if(!divHistorico) return;
    divHistorico.innerHTML = '';
    // Inverte para os mais recentes primeiro
    lista.slice().reverse().forEach(c => {
        let dataFormatada = new Date(c.dataISO || c.data).toLocaleDateString('pt-BR');
        divHistorico.innerHTML += `
            <div class="historico-item">
                <div>
                    <strong>${dataFormatada}</strong> <br>
                    <span>Ganho: ${formatMoney(c.valor)} | KM: ${c.km} | Tempo: ${c.tempo}h</span>
                </div>
                <button type="button" class="btn-excluir" onclick="excluirCorrida(${c.id})" title="Excluir">❌</button>
            </div>`;
    });
}

function adicionarCorrida() { 
    let valor = parseFloat(document.getElementById('valor-corrida').value); 
    let km = parseFloat(document.getElementById('km-corrida').value); 
    let tempo = parseFloat(document.getElementById('tempo-corrida').value); 

    // Validação para evitar entradas zeradas ou negativas que quebram a matemática
    if(!isNaN(valor) && !isNaN(km) && !isNaN(tempo) && valor > 0 && km > 0 && tempo > 0) { 
        let agora = new Date();
        // Criar formato YYYY-MM-DD usando o fuso horário local do motorista
        let ano = agora.getFullYear();
        let mes = String(agora.getMonth() + 1).padStart(2, '0');
        let dia = String(agora.getDate()).padStart(2, '0');
        
        let novaCorrida = { 
            id: Date.now(), 
            dataISO: agora.toISOString(), // Data exata temporal
            dataLocal: `${ano}-${mes}-${dia}`, // Usado para a filtragem perfeita diária
            data: agora.toISOString(), // Mantido para não quebrar leitura antiga
            valor: valor, 
            km: km, 
            tempo: tempo 
        };
        state.corridas.push(novaCorrida);
        
        // Salva os dados permanentemente no navegador
        localStorage.setItem('uberProData', JSON.stringify(state));
        
        atualizarDashboard(); 
        document.getElementById('valor-corrida').value = ''; 
        document.getElementById('km-corrida').value = ''; 
        document.getElementById('tempo-corrida').value = ''; 
    } else { 
        alert("Por favor, preencha os campos com valores numéricos válidos e maiores que zero."); 
    } 
} 

function excluirCorrida(id) {
    if(confirm("Deseja realmente excluir este registro?")) {
        state.corridas = state.corridas.filter(c => c.id !== id);
        localStorage.setItem('uberProData', JSON.stringify(state));
        atualizarDashboard();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    verificarLogin();
    atualizarDashboard();
});
