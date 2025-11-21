import type { Expense, UserLimit } from '@/lib/types/finance';

/**
 * Sistema de armazenamento em memória para gastos e limites
 * Em produção, isso seria substituído por um banco de dados
 */
class FinanceStorage {
  private expenses: Map<string, Expense[]> = new Map();
  private limits: Map<string, UserLimit> = new Map();
  private expenseCounter = 1;

  /**
   * Adiciona um novo gasto
   */
  addExpense(expense: Omit<Expense, 'id'>): Expense {
    const newExpense: Expense = {
      ...expense,
      id: String(this.expenseCounter++),
    };

    const userExpenses = this.expenses.get(expense.userId) || [];
    userExpenses.push(newExpense);
    this.expenses.set(expense.userId, userExpenses);

    return newExpense;
  }

  /**
   * Remove um gasto pelo ID
   */
  deleteExpense(userId: string, expenseId: string): boolean {
    const userExpenses = this.expenses.get(userId) || [];
    const initialLength = userExpenses.length;
    
    const filtered = userExpenses.filter(exp => exp.id !== expenseId);
    this.expenses.set(userId, filtered);

    return filtered.length < initialLength;
  }

  /**
   * Busca um gasto pelo ID
   */
  getExpense(userId: string, expenseId: string): Expense | undefined {
    const userExpenses = this.expenses.get(userId) || [];
    return userExpenses.find(exp => exp.id === expenseId);
  }

  /**
   * Retorna todos os gastos de um usuário
   */
  getUserExpenses(userId: string): Expense[] {
    return this.expenses.get(userId) || [];
  }

  /**
   * Retorna gastos do mês atual
   */
  getCurrentMonthExpenses(userId: string): Expense[] {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const userExpenses = this.getUserExpenses(userId);
    return userExpenses.filter(expense => {
      const expenseMonth = `${expense.date.getFullYear()}-${String(expense.date.getMonth() + 1).padStart(2, '0')}`;
      return expenseMonth === currentMonth;
    });
  }

  /**
   * Define limite mensal para um usuário
   */
  setMonthlyLimit(userId: string, amount: number): UserLimit {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const limit: UserLimit = {
      userId,
      monthlyLimit: amount,
      currentMonth,
    };

    this.limits.set(userId, limit);
    return limit;
  }

  /**
   * Retorna o limite mensal de um usuário
   */
  getMonthlyLimit(userId: string): UserLimit | undefined {
    return this.limits.get(userId);
  }

  /**
   * Calcula total gasto no mês
   */
  getMonthlyTotal(userId: string): number {
    const monthExpenses = this.getCurrentMonthExpenses(userId);
    return monthExpenses.reduce((total, expense) => total + expense.amount, 0);
  }

  /**
   * Agrupa gastos por categoria
   */
  getExpensesByCategory(userId: string): Record<string, number> {
    const monthExpenses = this.getCurrentMonthExpenses(userId);
    const byCategory: Record<string, number> = {};

    monthExpenses.forEach(expense => {
      byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount;
    });

    return byCategory;
  }

  /**
   * Agrupa gastos por forma de pagamento
   */
  getExpensesByPaymentMethod(userId: string): Record<string, number> {
    const monthExpenses = this.getCurrentMonthExpenses(userId);
    const byPayment: Record<string, number> = {};

    monthExpenses.forEach(expense => {
      byPayment[expense.paymentMethod] = (byPayment[expense.paymentMethod] || 0) + expense.amount;
    });

    return byPayment;
  }
}

// Singleton instance
export const financeStorage = new FinanceStorage();
