import { getDb } from './database';
import type { Category, PaymentMethod } from '@/lib/types/finance';

/**
 * Modelo de dados para Usuario
 */
export interface Usuario {
  id: number;
  telefone: string;
  data_criacao: string;
  limite_mensal_geral: number;
}

/**
 * Modelo de dados para Gasto
 */
export interface Gasto {
  id: number;
  usuario_id: number;
  data: string;
  descricao: string;
  valor: number;
  categoria: string;
  forma_pagamento: string;
}

/**
 * Modelo de dados para LimiteCategoria
 */
export interface LimiteCategoria {
  id: number;
  usuario_id: number;
  categoria: string;
  valor_limite_mensal: number;
}

/**
 * Repository para operações com Usuario
 */
export class UsuarioRepository {
  /**
   * Busca ou cria um usuário pelo telefone
   */
  static findOrCreateByTelefone(telefone: string): Usuario {
    const db = getDb();
    
    // Tentar buscar usuário existente
    let usuario = db.findUsuarioByTelefone(telefone);
    
    // Se não existir, criar novo
    if (!usuario) {
      usuario = db.createUsuario(telefone);
    }
    
    return usuario;
  }

  /**
   * Atualiza o limite mensal geral do usuário
   */
  static updateLimiteMensalGeral(usuarioId: number, limite: number): void {
    const db = getDb();
    db.updateUsuarioLimite(usuarioId, limite);
  }

  /**
   * Busca usuário por ID
   */
  static findById(id: number): Usuario | undefined {
    const db = getDb();
    return db.findUsuarioById(id);
  }
}

/**
 * Repository para operações com Gasto
 */
export class GastoRepository {
  /**
   * Cria um novo gasto
   */
  static create(data: {
    usuario_id: number;
    valor: number;
    categoria: Category;
    forma_pagamento: PaymentMethod;
    descricao?: string;
  }): Gasto {
    const db = getDb();
    return db.createGasto({
      usuario_id: data.usuario_id,
      valor: data.valor,
      categoria: data.categoria,
      forma_pagamento: data.forma_pagamento,
      descricao: data.descricao || '',
    });
  }

  /**
   * Deleta um gasto
   */
  static delete(id: number, usuarioId: number): boolean {
    const db = getDb();
    return db.deleteGasto(id, usuarioId);
  }

  /**
   * Busca um gasto por ID
   */
  static findById(id: number, usuarioId: number): Gasto | undefined {
    const db = getDb();
    return db.findGastoById(id, usuarioId);
  }

  /**
   * Busca gastos do mês atual de um usuário
   */
  static findCurrentMonthByUsuario(usuarioId: number): Gasto[] {
    const db = getDb();
    return db.findGastosByUsuarioCurrentMonth(usuarioId);
  }

  /**
   * Calcula total gasto no mês por usuário
   */
  static getTotalMesAtual(usuarioId: number): number {
    const gastos = this.findCurrentMonthByUsuario(usuarioId);
    return gastos.reduce((total, gasto) => total + gasto.valor, 0);
  }

  /**
   * Agrupa gastos por categoria no mês atual
   */
  static getTotalPorCategoria(usuarioId: number): Record<string, number> {
    const gastos = this.findCurrentMonthByUsuario(usuarioId);
    const porCategoria: Record<string, number> = {};

    gastos.forEach(gasto => {
      porCategoria[gasto.categoria] = (porCategoria[gasto.categoria] || 0) + gasto.valor;
    });

    return porCategoria;
  }

  /**
   * Agrupa gastos por forma de pagamento no mês atual
   */
  static getTotalPorFormaPagamento(usuarioId: number): Record<string, number> {
    const gastos = this.findCurrentMonthByUsuario(usuarioId);
    const porForma: Record<string, number> = {};

    gastos.forEach(gasto => {
      porForma[gasto.forma_pagamento] = (porForma[gasto.forma_pagamento] || 0) + gasto.valor;
    });

    return porForma;
  }

  /**
   * Busca total gasto em uma categoria específica no mês atual
   */
  static getTotalCategoria(usuarioId: number, categoria: string): number {
    const gastos = this.findCurrentMonthByUsuario(usuarioId);
    return gastos
      .filter(g => g.categoria === categoria)
      .reduce((total, gasto) => total + gasto.valor, 0);
  }
}

/**
 * Repository para operações com LimiteCategoria
 */
export class LimiteCategoriaRepository {
  /**
   * Define ou atualiza limite de uma categoria
   */
  static setLimite(usuarioId: number, categoria: string, valorLimite: number): LimiteCategoria {
    const db = getDb();
    return db.upsertLimiteCategoria(usuarioId, categoria, valorLimite);
  }

  /**
   * Busca limite de uma categoria
   */
  static findByCategoria(usuarioId: number, categoria: string): LimiteCategoria | undefined {
    const db = getDb();
    return db.findLimiteCategoriaByCategoria(usuarioId, categoria);
  }

  /**
   * Busca todos os limites de um usuário
   */
  static findAllByUsuario(usuarioId: number): LimiteCategoria[] {
    const db = getDb();
    return db.findLimitesCategoriaByUsuario(usuarioId);
  }
}
