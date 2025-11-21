// Tipos para o sistema de finanças

export type PaymentMethod = 'cartao' | 'dinheiro' | 'pix' | 'debito' | 'credito';

export type Category = 
  | 'alimentacao'
  | 'transporte'
  | 'saude'
  | 'educacao'
  | 'lazer'
  | 'moradia'
  | 'vestuario'
  | 'outros';

export type CommandType = 
  | 'adicionar'
  | 'excluir'
  | 'relatorio'
  | 'limite'
  | 'desconhecido';

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: Category;
  paymentMethod: PaymentMethod;
  description: string;
  date: Date;
}

export interface UserLimit {
  userId: string;
  monthlyLimit: number;
  currentMonth: string; // formato: YYYY-MM
}

export interface ParsedCommand {
  type: CommandType;
  amount?: number;
  category?: Category;
  paymentMethod?: PaymentMethod;
  expenseId?: string;
  description?: string;
}

export interface WhatsAppMessage {
  from: string; // número do usuário
  text: string; // texto da mensagem
  timestamp?: number;
}

export interface WhatsAppResponse {
  success: boolean;
  message: string;
  data?: any;
}
