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
    .setTitle("Formulário Completo");
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
    // Abre a planilha "Inscricoes". Se não existir, crie uma com esse nome.
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inscricoes");
    if (!sheet) {
      Logger.log("A planilha 'Inscricoes' não foi encontrada.");
      return false;
    }

    // Obtém todos os CPFs da primeira coluna.
    const dataRange = sheet.getRange("A:A");
    const values = dataRange.getValues();
    
    // Converte os valores para uma lista simples para facilitar a busca.
    const allCpfs = values.map(row => row[0].toString().replace(/\D/g, ''));
    
    // Verifica se o CPF limpo está na lista.
    return allCpfs.includes(cpf.replace(/\D/g, ''));
    
  } catch (e) {
    Logger.log("Erro na função checkCpfInSheet: " + e.message);
    return false; // Retorna false em caso de erro para não bloquear o usuário.
  }
}

/**
 * Função do lado do servidor para consultar um endereço a partir do CEP.
 * Acessa a API pública do ViaCEP.
 *
 * @param {string} cep - O CEP a ser pesquisado, sem máscara.
 * @returns {object} Um objeto com os dados do endereço ou um objeto de erro.
 */
function getAddressByCEP(cep) {
  try {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      return { erro: "CEP inválido. Deve conter 8 dígitos." };
    }

    const url = `https://viacep.com.br/ws/${cleanCep}/json/`;
    const response = UrlFetchApp.fetch(url);
    const json = response.getContentText();
    const data = JSON.parse(json);

    if (data.erro) {
      return { erro: "CEP não encontrado." };
    }
    
    return {
      endereco: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf
    };
  } catch (e) {
    Logger.log("Erro ao buscar CEP: " + e.message);
    return { erro: "Erro ao consultar o CEP." };
  }
}

/**
 * Função do lado do servidor para processar todos os dados do formulário.
 *
 * @param {object} formData - Objeto com todos os dados do formulário.
 * @returns {string} Uma mensagem de sucesso.
 */
function processForm(formData) {
  // AQUI VOCÊ PODE ADICIONAR O SEU CÓDIGO PARA SALVAR OS DADOS.
  Logger.log("Dados do formulário recebidos:");
  Logger.log(JSON.stringify(formData, null, 2));

  return "Dados enviados com sucesso!";
}
