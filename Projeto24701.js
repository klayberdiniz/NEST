// REQUERIMENTOS INICIAIS
const nodemailer = require('nodemailer');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const { google } = require('googleapis');
const { Client } = require('whatsapp-web.js');
const emAtendimentoHumano = new Set();

// CARREGA AS VARIAVEIS DE AMBIENTE
require('dotenv').config();

// CONFIG GOOGLE SHEETS
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE_LEADS = 'Leads!A1:G';


// AUTENTICAÇÃO DO GOOGLE SHEETS
let auth; 
let sheets; 
const spreadsheetId = process.env.GOOGLE_SHEET_ID;
const range = 'Leads!A1:G'; 

try {
  // Construindo o caminho do arquivo de chave de forma mais robusta
  const keyFilePath = process.env.GOOGLE_KEY_FILE_PATH;
  if (!keyFilePath) {
    throw new Error('GOOGLE_KEY_FILE_PATH não definido no .env');
  }

  // Verificar se o arquivo existe antes de tentar carregar
  // Isso requer 'fs'
  const fs = require('fs');
  if (!fs.existsSync(keyFilePath)) {
      throw new Error(`Arquivo da chave do Google não encontrado em: ${keyFilePath}`);
  }


  auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  console.log('✅ Autenticação do Google Sheets configurada.');

  sheets = google.sheets({ version: 'v4', auth });
  console.log('✅ Cliente do Google Sheets inicializado.');


} catch (error) {
  console.error('❌ ERRO CRÍTICO na inicialização do Google Sheets:', error.message);
  console.error('Verifique GOOGLE_KEY_FILE_PATH e permissões do arquivo JSON.');

}

// --- INÍCIO: Função para buscar dados do Google Sheets ---
/**
 * Busca dados de uma planilha Google Sheets.
 * @param {string} spreadsheetId O ID da planilha.
 * @param {string} range O intervalo a ser lido (ex: 'Sheet1!A1:B10').
 * @param {import('whatsapp-web.js').Message} msg O objeto da mensagem original para responder em caso de erro.
 * @returns {Promise<Array<Array<string>> | null>} Uma promessa que resolve com os dados da planilha ou null em caso de erro.
 */
async function fetchSheetData(spreadsheetId, range, msg) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${process.env.GOOGLE_API_KEY_SHEETS}`;
    try {
        const response = await axios.get(url);
        if (response.data && response.data.values) {
            return response.data.values;
        } else {
            console.error('Nenhum dado encontrado na planilha ou formato inesperado:', response.data);
            if (msg) await client.sendMessage(msg.from, "Desculpe, não consegui encontrar os dados solicitados (formato inesperado). Tente mais tarde.");
            return null;
        }
    } catch (error) {
        console.error('Erro ao buscar dados do Google Sheets:', error.response ? error.response.data : error.message);
        if (msg) await client.sendMessage(msg.from, "Ocorreu um erro ao buscar os dados da planilha. Por favor, tente novamente mais tarde.");
        return null;
    }
}
// --- FIM: Função para buscar dados do Google Sheets ---


// --- VERIFICAÇÃO PÓS-INICIALIZAÇÃO ---
if (sheets) {
    console.log('Variável "sheets" está definida.');
} else {
    console.error('Variável "sheets" NÃO está definida após a inicialização. Verifique os erros acima.');
}

// TRANSPORTE DE EMAIL
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS
    }
});

// ENVIAR ALERTA POR EMAIL
const enviarAlertaEmail = async (nome, mensagemAdicional = "") => {
    try {
        const info = await transporter.sendMail({
            from: '"Bot WhatsApp" <ferreira24701@gmail.com>',
            to: process.env.NODEMAILER_USER,
            subject: '🚨 Cliente Interessado!',
            text: `O contato ${nome} Cliente interessado na automação! ${mensagemAdicional}`,
            html: `<p><strong>${nome}</strong> escreveu um assunto urgente no WhatsApp.</p>${mensagemAdicional ? `<p>${mensagemAdicional}</p>` : ''}`
        });
        console.log('✅ E-mail de alerta enviado. ID:', info.messageId);
    } catch (error) {
        console.error('❌ Erro ao enviar e-mail:', error);
    }
};

// ENVIAR ALERTA NO TELEGRAM
const enviarAlertaTelegram = async (mensagem) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        await axios.post(url, {
            chat_id: chatId,
            text: mensagem
        });
        console.log('✅ Alerta enviado para o Telegram');
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem para o Telegram:', error.response?.data || error.message);
    }
};

// CLIENT WHATSAPP
const client = new Client();

/// ANIMAÇÃO ASCII
const frames = [`
                    ███    ██ ███████ ███████ ████████ 
                    ████   ██ ██      ██         ██    
                    ██ ██  ██ █████   ███████    ██    
                    ██  ██ ██ ██           ██    ██    
                    ██   ████ ███████ ███████    ██   

                                   (((_
                    *_*_*_*        (°v°)     *_*_*_*


`,`
                    ███    ██ ███████ ███████ ████████ 
                    ████   ██ ██      ██         ██    
                    ██ ██  ██ █████   ███████    ██    
                    ██  ██ ██ ██           ██    ██    
                    ██   ████ ███████ ███████    ██   

                                   (((_
                    *_*_*_*        (^v^)     *_*_*_*


`
];

let frameIndex = 0;
let animationInterval;

function startAnimation() {
  animationInterval = setInterval(() => {
    process.stdout.write('\x1Bc'); // limpa console
    console.log(frames[frameIndex]);
    frameIndex = (frameIndex + 1) % frames.length;
  }, 300);
}

function stopAnimation() {
  clearInterval(animationInterval);
}

startAnimation();

client.on('qr', qr => {
    stopAnimation();
    qrcode.generate(qr, { small: true });
});


client.on('ready', () => {
    console.log('Whatsapp conectado com sucesso! Vamos Trabalhar! 🚀');
});

client.initialize();

const delay = ms => new Promise(res => setTimeout(res, ms));

// ESTADOS DE USUÁRIOS
const userNextAction = {};
const userData = {};

// INÍCIO DO FLUXO
client.on('message', async msg => {
    
    if (!msg.from.endsWith('@c.us')) return; // Ignora mensagens de grupos e outros tipos
    if (msg.type !== 'chat') return; // Ignora mensagens que não sejam de texto
    if (msg._data?.isNewMsg === false) return; // Ignora mensagens já processadas
    if (msg.body.trim() === '') return; // Ignora mensagens vazias


    const chat = await msg.getChat();
    const contact = await msg.getContact();
    const userName = contact.pushname || "Usuário";
    const messageText = msg.body.trim().toLowerCase();
    
    if (messageText === "Menu" || messageText === "menu" ) {
        console.log("Comando * recebido de", msg.from);
        if (emAtendimentoHumano.has(msg.from)) {
            emAtendimentoHumano.delete(msg.from);
            userNextAction[msg.from];
            delete userData[msg.from];

            console.log("✅ Usuário removido do atendimento humano:", msg.from);
            await client.sendMessage(msg.from, `✅ Atendimento humano encerrado. Você pode continuar a conversa normalmente.`);
            
        } else {
            console.log("ℹ️ Usuário não estava em atendimento humano:", msg.from);
            await client.sendMessage(msg.from, `ℹ️ Você não está em atendimento humano no momento.`);
        }
        return;
    }

    if (emAtendimentoHumano.has(msg.from)) {
        console.log(`🛑 Usuário em atendimento humano (${msg.from}) enviou: "${msg.body}".`);
        return;
    }

    
// Se o usuário não estiver em nenhum fluxo, mostrar o menu com qualquer mensagem recebida
    if (!userNextAction[msg.from]) {
        await delay(2000);
        await chat.sendStateTyping();
        await delay(1500);

        const menuText = `Olá, ${userName.split(" ")[0]}! 👋
Sou seu assistente virtual. Como posso ajudar?

*Escolha uma opção digitando o número:*
1️⃣ Quero comprar agora a automação!
2️⃣ Saber mais sobre a automação!
3️⃣ Já sou usuário, falar com Suporte Técnico!`;

        await client.sendMessage(msg.from, menuText);
        userNextAction[msg.from] = "ESCOLHER_OPCAO_MENU";
        return;
    }


    // Fluxo das respostas

    if (userNextAction[msg.from] === "ESCOLHER_OPCAO_MENU") {
        const choice = msg.body.trim();

        if (choice === '1') {
            await chat.sendStateTyping();
            await delay(1000);
            await client.sendMessage(msg.from, `Certo ${userName.split(" ")[0]}! 😃`);
            await delay(1000);
            await client.sendMessage(msg.from, `Me diga o nome da empresa que você deseja automatizar. 👇`);

            userNextAction[msg.from] = 'COLETAR_EMPRESA';
            userData[msg.from] = {
                nome: userName,
                telefone: msg.from.replace('@c.us', ''),
                qualificacao: '10'
            };
            return;
        }
//precisa de incrementação de possibilidades no choice 2, falar mais sobre a automação e perguntar se o cliente quer enviar uma dúvida especifica ou retornar ao menu anterior

        if (choice === '2') {
            await chat.sendStateTyping();
            await delay(2000);
            await client.sendMessage(msg.from, `🤖 *Automação Inteligente para WhatsApp!*`);
            await chat.sendStateTyping();
            await delay(4000);
            await client.sendMessage(msg.from, `🔍 Nossa *automação* ajuda você a *atender clientes automaticamente* no WhatsApp, retornando uma lista de produtos, serviços e muito mais — *conforme a sua necessidade*!`);

            await chat.sendStateTyping();
            await delay(4000);
            await client.sendMessage(msg.from, `💡 *Como funciona?*\nVocê me diz o que deseja automatizar, define o fluxo de conversas com seus clientes e *nós criamos um robô de atendimento totalmente personalizado* 🤖✨`);

            await chat.sendStateTyping();
            await delay(4000);
            await client.sendMessage(msg.from, `🚀 Com isso, você poderá:\n✅ *Atender mais clientes simultaneamente*\n✅ *Aumentar suas vendas*\n✅ *Melhorar o atendimento e a experiência do cliente*`);

            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, `💬 Tem mais!\n Vou te mostrar uma consulta de produtos como exemplo!`);

            await chat.sendStateTyping();
            await delay(3000);
            await client.sendMessage(msg.from, `💬 Posso seguir?
                 1️⃣ Sim
                 2️⃣ Não, quero voltar ao MENU`);
            userNextAction[msg.from] = 'ESCOLHER_OPCAO_MENU_2'; 
            return;            
        }
          

        if (choice === '3') {
            await client.sendMessage(msg.from, `🔧 Certo! Encaminhando você para o suporte técnico. Aguarde um momento...`);
            await enviarAlertaEmail(userName, "O cliente solicitou suporte técnico.");
            await enviarAlertaTelegram(`🛠️ ${userName} solicitou suporte técnico.`);
                emAtendimentoHumano.add(msg.from); // bloqueia o cliente para atendimento humano
                delete userNextAction[msg.from];   // remove qualquer ação pendente
                console.log(`🛠️ Usuário ${msg.from} encaminhado para suporte técnico.`);
            await chat.sendStateTyping();
            await delay(4000);
            await client.sendMessage(msg.from, `👨‍💻 Você está agora em atendimento humano. Um de nossos atendentes irá te responder em breve!`);
            await chat.sendStateTyping();
            await delay(2000);
            await client.sendMessage(msg.from, `👨‍💻 ou digite "MENU" para voltar!`);
            
        return;
        }
// CORREÇÃO = FLUXO DEVE PARAR NO CASO DE ESCOLHA DA OPÇÃO 3 
        await client.sendMessage(msg.from, `❌ Opção inválida. Por favor, digite 1, 2 ou 3.`);
        return;
    }
     
    if (userNextAction[msg.from] === 'ESCOLHER_OPCAO_MENU_2') {
        const choicePosConsulta = msg.body.trim();

        if (choicePosConsulta === '1') {
            await chat.sendStateTyping();
            await client.sendMessage(msg.from, "Por favor, digite o nome do produto qualquer que você gostaria de consultar, por exemplo medicamentos:");
            userNextAction[msg.from] = 'consultar_produto'; 
            return;
            // Volta para a ação de consultar produto
        } 
        if (choicePosConsulta === '2') {
            await chat.sendStateTyping();
            await delay(1000);

            const menuText = `Olá, ${userName.split(" ")[0]}! 👋
Sou seu assistente virtual. Como posso ajudar?

*Escolha uma opção digitando o número:*
1️⃣ Quero comprar agora a automação!
2️⃣ Saber mais sobre a automação!
3️⃣ Já sou usuário, falar com Suporte Técnico!`;

            await client.sendMessage(msg.from, menuText);
            userNextAction[msg.from] = "ESCOLHER_OPCAO_MENU"; // Volta para o menu principal
            return;
        } 
        if (choicePosConsulta === '3') {
            await chat.sendStateTyping();
            await delay(1000);
            await client.sendMessage(msg.from, "Para qual empresa você deseja essa automação? 👇");
            userNextAction[msg.from] = 'COLETAR_EMPRESA';
            userData[msg.from] = {
                nome: userName,
                telefone: msg.from.replace('@c.us', ''),
                qualificacao: '10'
            };
            return;
        }
                
        else {
            await chat.sendStateTyping();
            await delay(1000);
            await client.sendMessage(msg.from, "Opção inválida. Por favor, digite 1 para consultar outro produto, 2 para voltar ao menu principal ou 3 para fazer seu cadastro.");
            // Mantém a ação 'pos_consulta_produto' para o usuário tentar novamente
        }
        
    
    }

    // CONSULTAR PRODUTO
    if (userNextAction[msg.from] === 'consultar_produto' && msg.body) {
        const nomeProdutoPesquisado = msg.body.trim().toLowerCase(); // Obtém o nome do produto digitado pelo usuário e converte para lowercase para comparação

        await chat.sendStateTyping();
        await delay(3000);
        await client.sendMessage(msg.from, `Buscando informações sobre "${nomeProdutoPesquisado}"... 🔎`);

        const sheetData = await fetchSheetData(process.env.GOOGLE_SHEET_ID, process.env.RANGE_LISTA_PRODUTOS, msg);

        if (sheetData && sheetData.length > 0) {
            const produtosEncontrados = sheetData.filter(row => (row[0] || '').toLowerCase().includes(nomeProdutoPesquisado));

            if (produtosEncontrados.length > 0) {
                let responseText = "*Resultados da Busca:*\n\n";
                produtosEncontrados.forEach(produto => {
                    const nome = produto[0] || 'Produto';
                    const preco = produto[1] ? `: ${produto[1]}` : '';
                    responseText += `*${nome}*${preco}\n`;
                });
                await delay(1000);
                await chat.sendStateTyping();
                await delay(3000);
                await client.sendMessage(msg.from, responseText.trim());
            } else {
                await client.sendMessage(msg.from, `Nenhum produto encontrado com o termo "${nomeProdutoPesquisado}". 😔`);
            }
        } else if (sheetData) {
            await client.sendMessage(msg.from, "A Lista de Produtos está vazia no momento. 🤔");
        }

        // Envia a nova ação após a busca
        await delay(5000);
        await client.sendMessage(msg.from, `\nEssa busca foi feita em uma planilha do google automaticamente, você poderá alterar essa planilha que o robô estará sempre atualizado com seu estoque!! 
            \n1️⃣ Consultar outro produto
            \n2️⃣ Voltar ao menu principal 
            \n3️⃣ Fazer meu cadastro`);
        userNextAction[msg.from] = 'ESCOLHER_OPCAO_MENU_2'; // Define a próxima ação esperada
        return;
    }

    // ETAPA: COLETAR DADOS DO USUÁRIO
    if (userNextAction[msg.from] === 'COLETAR_EMPRESA') {
        userData[msg.from].empresa = msg.body.trim();
        userNextAction[msg.from] = 'COLETAR_RAMO';
        await chat.sendStateTyping();
        await delay(2000);
        await client.sendMessage(msg.from, `Legal! Agora me diga o ramo da empresa. (por exemplo: Autopeças, Importados, Medicamentos, Cosméticos) 🏢`);
        return;
    }

    if (userNextAction[msg.from] === 'COLETAR_RAMO') {
        userData[msg.from].ramo = msg.body.trim();
        userNextAction[msg.from] = 'COLETAR_EMAIL';
        await chat.sendStateTyping();
        await delay(2000);
        await client.sendMessage(msg.from, `Qual o seu melhor e-mail para contato? 📧`);
        return;
    }

    if (userNextAction[msg.from] === 'COLETAR_EMAIL') {
        userData[msg.from].email = msg.body.trim();

        await chat.sendStateTyping();
        await delay(1000);
        await client.sendMessage(msg.from, `Salvando suas informações... 💾`);

        await adicionarNaPlanilha(userData[msg.from]);

        await client.sendMessage(msg.from, `✅ Cadastro feito com sucesso!\nLogo entraremos em contato para iniciarmos o seu projeto. 🚀`);

        await enviarAlertaEmail(userData[msg.from].nome, `Novo cliente cadastrado: ${JSON.stringify(userData[msg.from], null, 2)}`);
        await enviarAlertaTelegram(`📩 Novo lead:\n\nNome: ${userData[msg.from].nome}\nEmpresa: ${userData[msg.from].empresa}\nRamo: ${userData[msg.from].ramo}\nTelefone: ${userData[msg.from].telefone}\nEmail: ${userData[msg.from].email}`);

        delete userNextAction[msg.from];
        delete userData[msg.from];
        return;
    }

    
});


// SALVAR NO GOOGLE SHEETS POR ARQUIVO JSON (ARQUIVAMENTO DE DADOS)
async function adicionarNaPlanilha(dados) {
  // Adiciona uma verificação extra antes de tentar usar 'sheets'
  if (!sheets) {
      console.error('❌ Erro: "sheets" não foi inicializado corretamente. Não é possível adicionar à planilha.');
      return; // Sai da função para evitar o ReferenceError
  }
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          dados.nome,
          dados.telefone,
          dados.email,
          dados.empresa,
          dados.ramo,
          dados.qualificacao,
          new Date().toLocaleString()
        ]]
      }
    });
    console.log('✅ Novo cadastro Realizado!');
  } catch (error) {
    console.error('❌ Erro ao salvar no Google Sheets:', error);
    // Registre mais detalhes se o erro for da API do Google
    if (error.code) { // Códigos de erro da API do Google
        console.error('Código do Erro da API do Google:', error.code);
        console.error('Mensagem Detalhada da API do Google:', error.errors);
    }
  }
}

// ENCERRAR ATENDIMENTO HUMANO
async function encerrarAtendimento(numero) {
    if (emAtendimentoHumano.has(numero)) {
        emAtendimentoHumano.delete(numero);
        delete userNextAction[numero];
        delete userData[numero];

        console.log("✅ Atendimento encerrado para:", numero);
        await client.sendMessage(numero, `✅ Atendimento humano encerrado. Você pode continuar a conversa normalmente.`);
    } else {
        console.log("ℹ️ O número não estava em atendimento humano:", numero);
        await client.sendMessage(numero, `ℹ️ Você não está em atendimento humano no momento.`);
    }
}

process.stdin.resume(); // Mantém o script ativo