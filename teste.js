// REQUERIMENTOS INICIAIS
const nodemailer = require('nodemailer');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const { google } = require('googleapis');
const { Client } = require('whatsapp-web.js');
const emAtendimentoHumano = new Set();
// Adicione o 'path' para lidar com caminhos de arquivo de forma mais robusta
const path = require('path');


// CARREGA AS VARIAVEIS DE AMBIENTE
require('dotenv').config();


// --- VERIFICAÇÃO INICIAL DAS VARIÁVEIS DE AMBIENTE ---
console.log('--- Verificação de Variáveis de Ambiente ---');
console.log('NODEMAILER_USER:', process.env.NODEMAILER_USER);
console.log('TELEGRAM_BOT_TOKEN (primeiros 5 chars):', process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.substring(0, 5) + '...' : 'Não carregado');
console.log('GOOGLE_KEY_FILE_PATH:', process.env.GOOGLE_KEY_FILE_PATH);
console.log('GOOGLE_SHEET_ID:', process.env.GOOGLE_SHEET_ID);
console.log('--- Fim da Verificação ---');

// CONFIG GOOGLE SHEETS
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE_LEADS = 'Leads!A1:G'; // Nota: A função adicionarNaPlanilha usa 'Leads!A1:G'
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY_SHEETS; // Você pode remover isso se não estiver usando para chamadas diretas da API Key


// AUTENTICAÇÃO DO GOOGLE SHEETS
let auth; // Use let para que possamos atribuir dentro de um try/catch se necessário
let sheets; // Use let para que possamos atribuir dentro de um try/catch se necessário
const spreadsheetId = process.env.GOOGLE_SHEET_ID;
const range = 'Leads!A1:G'; // Mantendo consistente com a função adicionarNaPlanilha

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

  // Teste de conexão: Tente listar as planilhas (opcional, mas bom para depuração)
  // const metadata = await sheets.spreadsheets.get({ spreadsheetId: spreadsheetId });
  // console.log('Metadata da planilha carregada:', metadata.data.properties.title);


} catch (error) {
  console.error('❌ ERRO CRÍTICO na inicialização do Google Sheets:', error.message);
  console.error('Verifique GOOGLE_KEY_FILE_PATH e permissões do arquivo JSON.');
  // Você pode optar por sair do processo aqui se a funcionalidade de planilhas for essencial
  // process.exit(1);
}

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