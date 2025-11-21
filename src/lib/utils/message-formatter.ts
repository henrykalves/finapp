import type { Expense, UserLimit } from '@/lib/types/finance';
import type { StatusFinanceiroMes } from '@/lib/services/finance-service';

/**
 * Formata valor monetário para exibição
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata data para exibição
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Traduz categoria para português
 */
export function translateCategory(category: string): string {
  const translations: Record<string, string> = {
    'alimentacao': 'Alimentação',
    'transporte': 'Transporte',
    'saude': 'Saúde',
    'educacao': 'Educação',
    'lazer': 'Lazer',
    'moradia': 'Moradia',
    'vestuario': 'Vestuário',
    'outros': 'Outros',
  };

  return translations[category] || category;
}

/**
 * Traduz forma de pagamento para português
 */
export function translatePaymentMethod(method: string): string {
  const translations: Record<string, string> = {
    'credito': 'Cartão de Crédito',
    'debito': 'Cartão de Débito',
    'pix': 'PIX',
    'dinheiro': 'Dinheiro',
    'cartao': 'Cartão',
  };

  return translations[method] || method;
}

/**
 * Gera mensagem de confirmação de gasto adicionado
 */
export function generateAddExpenseMessage(expense: Expense): string {
  return `✅ Gasto registrado com sucesso!\n\n📝 ID: ${expense.id}\n💰 Valor: ${formatCurrency(expense.amount)}\n🏷️ Categoria: ${translateCategory(expense.category)}\n💳 Pagamento: ${translatePaymentMethod(expense.paymentMethod)}\n📅 Data: ${formatDate(expense.date)}`;
}

/**
 * Gera mensagem de confirmação de exclusão
 */
export function generateDeleteExpenseMessage(expense: Expense): string {
  return `🗑️ Gasto excluído com sucesso!\n\n📝 ID: ${expense.id}\n💰 Valor: ${formatCurrency(expense.amount)}\n🏷️ Categoria: ${translateCategory(expense.category)}`;
}

/**
 * Gera relatório mensal de gastos
 */
export function generateMonthlyReport(
  expenses: Expense[],
  byCategory: Record<string, number>,
  byPayment: Record<string, number>,
  total: number,
  limit?: UserLimit
): string {
  let report = `📊 RELATÓRIO MENSAL DE GASTOS\n\n`;

  // Total gasto
  report += `💰 Total gasto: ${formatCurrency(total)}\n`;

  // Limite mensal
  if (limit) {
    const remaining = limit.monthlyLimit - total;
    const percentage = (total / limit.monthlyLimit) * 100;
    
    report += `🎯 Limite mensal: ${formatCurrency(limit.monthlyLimit)}\n`;
    report += `📈 Utilizado: ${percentage.toFixed(1)}%\n`;
    
    if (remaining > 0) {
      report += `✅ Disponível: ${formatCurrency(remaining)}\n`;
    } else {
      report += `⚠️ LIMITE EXCEDIDO em ${formatCurrency(Math.abs(remaining))}!\n`;
    }
  }

  // Gastos por categoria
  report += `\n📂 POR CATEGORIA:\n`;
  const sortedCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a);
  
  if (sortedCategories.length === 0) {
    report += `Nenhum gasto registrado ainda.\n`;
  } else {
    sortedCategories.forEach(([category, amount]) => {
      const percentage = (amount / total) * 100;
      report += `• ${translateCategory(category)}: ${formatCurrency(amount)} (${percentage.toFixed(1)}%)\n`;
    });
  }

  // Gastos por forma de pagamento
  report += `\n💳 POR FORMA DE PAGAMENTO:\n`;
  const sortedPayments = Object.entries(byPayment)
    .sort(([, a], [, b]) => b - a);
  
  sortedPayments.forEach(([method, amount]) => {
    const percentage = (amount / total) * 100;
    report += `• ${translatePaymentMethod(method)}: ${formatCurrency(amount)} (${percentage.toFixed(1)}%)\n`;
  });

  // Últimos gastos
  report += `\n📋 ÚLTIMOS GASTOS:\n`;
  const recentExpenses = expenses
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  if (recentExpenses.length === 0) {
    report += `Nenhum gasto registrado ainda.\n`;
  } else {
    recentExpenses.forEach(expense => {
      report += `• [${expense.id}] ${formatCurrency(expense.amount)} - ${translateCategory(expense.category)} (${formatDate(expense.date)})\n`;
    });
  }

  return report;
}

/**
 * Gera mensagem de confirmação de limite definido
 */
export function generateSetLimitMessage(limit: UserLimit): string {
  return `🎯 Limite mensal definido com sucesso!\n\n💰 Valor: ${formatCurrency(limit.monthlyLimit)}\n📅 Mês: ${limit.currentMonth}\n\nVocê receberá alertas quando se aproximar do limite.`;
}

/**
 * Gera mensagem de erro
 */
export function generateErrorMessage(error: string): string {
  return `❌ Erro: ${error}\n\n💡 Exemplos de comandos:\n• "Adicionar gasto de R$ 50 em alimentação no cartão"\n• "Excluir gasto 123"\n• "Mostrar relatório de gastos do mês"\n• "Definir limite mensal de R$ 2000"`;
}

/**
 * Gera mensagem de resumo diário com educação financeira
 */
export function generateResumoEducacaoFinanceira(
  status: StatusFinanceiroMes,
  dica: string
): string {
  let mensagem = `📊 RESUMO FINANCEIRO DO MÊS\n\n`;

  // Status geral
  mensagem += `💰 Total gasto: ${formatCurrency(status.totalGasto)}\n`;
  
  if (status.limiteGeral > 0) {
    mensagem += `🎯 Limite mensal: ${formatCurrency(status.limiteGeral)}\n`;
    mensagem += `📈 Utilizado: ${status.percentualUsado.toFixed(1)}%\n`;
    
    if (status.saldoRestante > 0) {
      mensagem += `✅ Saldo disponível: ${formatCurrency(status.saldoRestante)}\n`;
    } else {
      mensagem += `🚨 Limite excedido em: ${formatCurrency(Math.abs(status.saldoRestante))}\n`;
    }
  } else {
    mensagem += `⚠️ Você ainda não definiu um limite mensal.\n`;
  }

  // Principais categorias
  if (status.principaisCategories.length > 0) {
    mensagem += `\n📂 PRINCIPAIS GASTOS:\n`;
    status.principaisCategories.forEach((cat, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      mensagem += `${emoji} ${translateCategory(cat.categoria)}: ${formatCurrency(cat.valor)} (${cat.percentual.toFixed(1)}%)\n`;
    });
  }

  // Alertas
  if (status.alertas.length > 0) {
    mensagem += `\n⚠️ ALERTAS:\n`;
    status.alertas.forEach(alerta => {
      mensagem += `${alerta}\n`;
    });
  }

  // Dica de economia
  mensagem += `\n💡 DICA DE ECONOMIA:\n${dica}\n`;

  // Motivação
  if (status.limiteGeral > 0 && status.percentualUsado < 80) {
    mensagem += `\n✨ Parabéns! Você está no controle das suas finanças! Continue assim! 💪`;
  } else if (status.percentualUsado >= 80 && status.percentualUsado < 100) {
    mensagem += `\n⚠️ Atenção! Você está próximo do seu limite. Revise seus gastos! 🎯`;
  } else if (status.percentualUsado >= 100) {
    mensagem += `\n🚨 Cuidado! Você excedeu seu limite. Hora de ajustar seus gastos! 💪`;
  }

  return mensagem;
}
