// ATENÇÃO: Substitua "ID_DA_SUA_PASTA_AQUI" pelo ID da sua pasta do Google Drive.
const DOCS_FOLDER_ID = "1iFQ09iqCxFc3bvSaFARp6dXRW1cxNKi_";

/**
 * A função doGet() é o ponto de entrada para o aplicativo da web.
 * Ela carrega e serve o arquivo HTML que contém a interface do usuário.
 *
 * @returns {HtmlOutput} O objeto HtmlOutput para renderizar a página.
 */
function doGet() {
  const htmlTemplate = HtmlService.createTemplateFromFile('index');
  
  return htmlTemplate.evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle("Inscrições - Vagas Remanescentes 2025-2");
}

/**
 * Salva um arquivo no Google Drive e retorna sua URL.
 * @param {object} fileData - Objeto contendo os dados do arquivo {base64Data, mimeType, fileName}.
 * @returns {string} A URL do arquivo salvo no Drive.
 */
function saveFileToDrive(fileData) {
  try {
    const folder = DriveApp.getFolderById(DOCS_FOLDER_ID);
    
    // Decodifica o arquivo Base64
    const decoded = Utilities.base64Decode(fileData.base64Data, Utilities.Charset.UTF_8);
    const blob = Utilities.newBlob(decoded, fileData.mimeType, fileData.fileName);

    // Cria um nome único para o arquivo para evitar conflitos
    const uniqueFileName = `${new Date().getTime()}_${fileData.fileName}`;
    const file = folder.createFile(blob.setName(uniqueFileName));
    
    // Retorna a URL do arquivo para ser salva na planilha
    return file.getUrl();

  } catch (e) {
    Logger.log("Erro ao salvar arquivo no Drive: " + e.message);
    throw new Error("Não foi possível salvar o arquivo no Drive. Verifique se o ID da pasta está correto e se ela está compartilhada como 'Editor'.");
  }
}

/**
 * Função do lado do servidor para verificar se o CPF já está na planilha.
 * Assume que a planilha se chama "Inscricoes" e que os CPFs estão na coluna A.
 *
 * @param {string} cpf - O CPF a ser verificado.
 * @returns {boolean} True se o CPF for encontrado, false caso contrário.
 */
function checkCpfInSheet(cpf) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inscricoes");
    if (!sheet) {
      Logger.log("A planilha 'Inscricoes' não foi encontrada.");
      return false;
    }
    const dataRange = sheet.getRange("A:A");
    const values = dataRange.getValues();
    const allCpfs = values.map(row => row[0].toString().replace(/\D/g, ''));
    return allCpfs.includes(cpf.replace(/\D/g, ''));
  } catch (e) {
    Logger.log("Erro na função checkCpfInSheet: " + e.message);
    return false;
  }
}

/**
 * Função do lado do servidor para consultar um endereço a partir do CEP, com sistema de fallback.
 * Tenta buscar no ViaCEP e, se falhar, tenta na BrasilAPI.
 *
 * @param {string} cep - O CEP a ser pesquisado, sem máscara.
 * @returns {object} Um objeto com os dados do endereço ou um objeto de erro.
 */
function getAddressByCEP(cep) {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    return { erro: "CEP inválido. Deve conter 8 dígitos." };
  }

  // --- TENTATIVA 1: ViaCEP (API Principal) ---
  try {
    const viaCepUrl = `https://viacep.com.br/ws/${cleanCep}/json/`;
    const params = { 'muteHttpExceptions': true };
    const viaCepResponse = UrlFetchApp.fetch(viaCepUrl, params);

    if (viaCepResponse.getResponseCode() === 200) {
      const data = JSON.parse(viaCepResponse.getContentText());
      if (!data.erro) {
        Logger.log("Endereço encontrado via ViaCEP.");
        return {
          endereco: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf
        };
      }
    }
    Logger.log("Falha ao buscar no ViaCEP. Tentando API de fallback.");
  } catch (e) {
    Logger.log("Erro na API ViaCEP: " + e.message + ". Tentando API de fallback.");
  }

  // --- TENTATIVA 2: BrasilAPI (API de Fallback) ---
  try {
    const brasilApiUrl = `https://brasilapi.com.br/api/cep/v1/${cleanCep}`;
    const params = { 'muteHttpExceptions': true };
    const brasilApiResponse = UrlFetchApp.fetch(brasilApiUrl, params);

    if (brasilApiResponse.getResponseCode() === 200) {
      const data = JSON.parse(brasilApiResponse.getContentText());
      Logger.log("Endereço encontrado via BrasilAPI.");
      return {
        endereco: data.street,
        bairro: data.neighborhood,
        cidade: data.city,
        estado: data.state
      };
    }
    Logger.log("Falha ao buscar no BrasilAPI.");
  } catch (e) {
    Logger.log("Erro na API BrasilAPI: " + e.message);
  }
  
  // --- Se ambas as tentativas falharem ---
  return { erro: "Serviço de busca de CEP indisponível. Por favor, preencha o endereço manualmente." };
}


/**
 * Função do lado do servidor para processar e salvar todos os dados do formulário na planilha.
 *
 * @param {object} formData - Objeto com todos os dados do formulário, incluindo o arquivo.
 * @returns {string} Uma mensagem de sucesso.
 * @throws {Error} Lança um erro se a planilha não for encontrada ou se houver falha ao salvar.
 */
function processForm(formData) {
  try {
    let fileUrl = ''; // Inicia a URL do arquivo como vazia

    // Verifica se há um arquivo para salvar
    if (formData.documentacaoNomeSocial && formData.documentacaoNomeSocial.fileName) {
      fileUrl = saveFileToDrive(formData.documentacaoNomeSocial);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inscricoes");
    if (!sheet) {
      throw new Error("A planilha 'Inscricoes' não foi encontrada. Verifique o nome da planilha.");
    }

    const newRow = [
      formData.cpf,
      formData.dataNascimento,
      formData.nome,
      formData.nomeSocial,
      fileUrl, // Salva a URL do arquivo do Drive na planilha
      formData.rg,
      formData.ufRg,
      formData.orgaoEmissor,
      formData.celular,
      formData.email,
      formData.candidatoDeficiencia,
      formData.tipoDeficiencia,
      formData.candidatoTEA,
      formData.concluiuEnsinoMedio,
      formData.cursandoEnsinoMedio,
      formData.cep,
      formData.endereco,
      formData.bairro,
      formData.cidade,
      formData.estado,
      formData.numero,
      formData.complemento,
      formData.primeiraOpcaoCurso,
      formData.segundaOpcaoCurso,
      formData.aceiteEdital,
      formData.aceiteCronograma,
      formData.autorizacaoLgpd,
      formData.autorizacaoComunicacao,
      new Date()
    ];

    sheet.appendRow(newRow);

    return "Inscrição realizada com sucesso!";

  } catch (e) {
    Logger.log("Erro ao processar o formulário: " + e.message);
    throw new Error("Ocorreu um erro ao salvar sua inscrição. Detalhe: " + e.message);
  }
}
