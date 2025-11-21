import type { 
  ParsedCommand, 
  CommandType, 
  Category, 
  PaymentMethod 
} from '@/lib/types/finance';

/**
 * Parser inteligente para interpretar comandos em português natural
 */
export class MessageParser {
  
  /**
   * Analisa a mensagem e retorna o comando estruturado
   */
  static parse(message: string): ParsedCommand {
    const normalizedMessage = message.toLowerCase().trim();

    // Detectar tipo de comando
    const commandType = this.detectCommandType(normalizedMessage);

    switch (commandType) {
      case 'adicionar':
        return this.parseAddExpense(normalizedMessage);
      case 'excluir':
        return this.parseDeleteExpense(normalizedMessage);
      case 'relatorio':
        return { type: 'relatorio' };
      case 'limite':
        return this.parseSetLimit(normalizedMessage);
      default:
        return { type: 'desconhecido' };
    }
  }

  /**
   * Detecta o tipo de comando baseado em palavras-chave
   */
  private static detectCommandType(message: string): CommandType {
    if (
      message.includes('adicionar') ||
      message.includes('registrar') ||
      message.includes('gastar') ||
      message.includes('gasto')
    ) {
      return 'adicionar';
    }

    if (
      message.includes('excluir') ||
      message.includes('deletar') ||
      message.includes('remover') ||
      message.includes('apagar')
    ) {
      return 'excluir';
    }

    if (
      message.includes('relatório') ||
      message.includes('relatorio') ||
      message.includes('mostrar') ||
      message.includes('listar') ||
      message.includes('resumo')
    ) {
      return 'relatorio';
    }

    if (
      message.includes('limite') ||
      message.includes('definir limite') ||
      message.includes('orçamento') ||
      message.includes('orcamento')
    ) {
      return 'limite';
    }

    return 'desconhecido';
  }

  /**
   * Extrai valor monetário da mensagem
   */
  private static extractAmount(message: string): number | undefined {
    // Padrões: R$ 50, R$50, 50 reais, 50,00, 50.00
    const patterns = [
      /r\$\s*(\d+(?:[.,]\d{2})?)/i,
      /(\d+(?:[.,]\d{2})?)\s*reais/i,
      /(\d+(?:[.,]\d{2})?)/,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const value = match[1].replace(',', '.');
        return parseFloat(value);
      }
    }

    return undefined;
  }

  /**
   * Extrai categoria da mensagem
   */
  private static extractCategory(message: string): Category {
    const categoryMap: Record<string, Category> = {
      'alimentação': 'alimentacao',
      'alimentacao': 'alimentacao',
      'comida': 'alimentacao',
      'restaurante': 'alimentacao',
      'mercado': 'alimentacao',
      'supermercado': 'alimentacao',
      
      'transporte': 'transporte',
      'uber': 'transporte',
      'taxi': 'transporte',
      'ônibus': 'transporte',
      'onibus': 'transporte',
      'gasolina': 'transporte',
      'combustível': 'transporte',
      'combustivel': 'transporte',
      
      'saúde': 'saude',
      'saude': 'saude',
      'médico': 'saude',
      'medico': 'saude',
      'farmácia': 'saude',
      'farmacia': 'saude',
      'remédio': 'saude',
      'remedio': 'saude',
      
      'educação': 'educacao',
      'educacao': 'educacao',
      'curso': 'educacao',
      'livro': 'educacao',
      'escola': 'educacao',
      
      'lazer': 'lazer',
      'cinema': 'lazer',
      'diversão': 'lazer',
      'diversao': 'lazer',
      'entretenimento': 'lazer',
      
      'moradia': 'moradia',
      'aluguel': 'moradia',
      'condomínio': 'moradia',
      'condominio': 'moradia',
      'luz': 'moradia',
      'água': 'moradia',
      'agua': 'moradia',
      
      'vestuário': 'vestuario',
      'vestuario': 'vestuario',
      'roupa': 'vestuario',
      'calçado': 'vestuario',
      'calcado': 'vestuario',
    };

    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (message.includes(keyword)) {
        return category;
      }
    }

    return 'outros';
  }

  /**
   * Extrai forma de pagamento da mensagem
   */
  private static extractPaymentMethod(message: string): PaymentMethod {
    if (message.includes('cartão') || message.includes('cartao') || message.includes('crédito') || message.includes('credito')) {
      return 'credito';
    }
    if (message.includes('débito') || message.includes('debito')) {
      return 'debito';
    }
    if (message.includes('pix')) {
      return 'pix';
    }
    if (message.includes('dinheiro') || message.includes('espécie') || message.includes('especie')) {
      return 'dinheiro';
    }
    
    return 'credito'; // padrão
  }

  /**
   * Parse comando de adicionar gasto
   */
  private static parseAddExpense(message: string): ParsedCommand {
    const amount = this.extractAmount(message);
    const category = this.extractCategory(message);
    const paymentMethod = this.extractPaymentMethod(message);

    return {
      type: 'adicionar',
      amount,
      category,
      paymentMethod,
      description: message,
    };
  }

  /**
   * Parse comando de excluir gasto
   */
  private static parseDeleteExpense(message: string): ParsedCommand {
    // Extrair ID do gasto: "excluir gasto 123" ou "deletar 123"
    const match = message.match(/(?:gasto\s+)?(\d+)/);
    const expenseId = match ? match[1] : undefined;

    return {
      type: 'excluir',
      expenseId,
    };
  }

  /**
   * Parse comando de definir limite
   */
  private static parseSetLimit(message: string): ParsedCommand {
    const amount = this.extractAmount(message);

    return {
      type: 'limite',
      amount,
    };
  }
}
