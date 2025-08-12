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
 * Função do lado do servidor para processar e salvar todos os dados do formulário na planilha.
 *
 * @param {object} formData - Objeto com todos os dados do formulário.
 * @returns {string} Uma mensagem de sucesso.
 * @throws {Error} Lança um erro se a planilha não for encontrada ou se houver falha ao salvar.
 */
function processForm(formData) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inscricoes");
    if (!sheet) {
      // Se a planilha não existir, lança um erro que será enviado ao front-end.
      throw new Error("A planilha 'Inscricoes' não foi encontrada. Verifique o nome da planilha.");
    }

    // A ordem dos dados aqui DEVE corresponder exatamente à ordem das colunas na sua planilha
    const newRow = [
      formData.cpf,
      formData.dataNascimento,
      formData.nome,
      formData.nomeSocial,
      formData.documentacaoNomeSocial, // Salva o nome do arquivo, não o arquivo em si
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
      new Date() // Adiciona a data e hora exatas da inscrição na última coluna
    ];

    // Adiciona a nova linha de dados ao final da planilha
    sheet.appendRow(newRow);

    return "Inscrição realizada com sucesso!";

  } catch (e) {
    Logger.log("Erro ao processar o formulário: " + e.message);
    // Retorna uma mensagem de erro detalhada para o front-end
    throw new Error("Ocorreu um erro ao salvar sua inscrição. Tente novamente. Detalhe: " + e.message);
  }
}
