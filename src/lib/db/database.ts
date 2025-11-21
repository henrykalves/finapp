import fs from 'fs';
import path from 'path';

/**
 * Configuração do banco de dados baseado em arquivo JSON
 * Simples, sem dependências nativas, ideal para desenvolvimento
 */

interface DatabaseSchema {
  usuarios: Array<{
    id: number;
    telefone: string;
    data_criacao: string;
    limite_mensal_geral: number;
  }>;
  gastos: Array<{
    id: number;
    usuario_id: number;
    data: string;
    descricao: string;
    valor: number;
    categoria: string;
    forma_pagamento: string;
  }>;
  limites_categoria: Array<{
    id: number;
    usuario_id: number;
    categoria: string;
    valor_limite_mensal: number;
  }>;
  counters: {
    usuario: number;
    gasto: number;
    limite_categoria: number;
  };
}

class DatabaseConnection {
  private dbPath: string;
  private data: DatabaseSchema;

  constructor() {
    // Caminho do banco de dados
    this.dbPath = path.join(process.cwd(), 'finapp-data.json');
    
    // Inicializar banco
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Erro ao carregar banco de dados:', error);
    }

    // Estrutura inicial
    return {
      usuarios: [],
      gastos: [],
      limites_categoria: [],
      counters: {
        usuario: 1,
        gasto: 1,
        limite_categoria: 1,
      },
    };
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Erro ao salvar banco de dados:', error);
    }
  }

  // Métodos para Usuario
  findUsuarioByTelefone(telefone: string) {
    return this.data.usuarios.find(u => u.telefone === telefone);
  }

  createUsuario(telefone: string) {
    const usuario = {
      id: this.data.counters.usuario++,
      telefone,
      data_criacao: new Date().toISOString(),
      limite_mensal_geral: 0,
    };
    this.data.usuarios.push(usuario);
    this.saveData();
    return usuario;
  }

  updateUsuarioLimite(id: number, limite: number) {
    const usuario = this.data.usuarios.find(u => u.id === id);
    if (usuario) {
      usuario.limite_mensal_geral = limite;
      this.saveData();
    }
  }

  findUsuarioById(id: number) {
    return this.data.usuarios.find(u => u.id === id);
  }

  // Métodos para Gasto
  createGasto(data: {
    usuario_id: number;
    valor: number;
    categoria: string;
    forma_pagamento: string;
    descricao: string;
  }) {
    const gasto = {
      id: this.data.counters.gasto++,
      usuario_id: data.usuario_id,
      data: new Date().toISOString(),
      descricao: data.descricao,
      valor: data.valor,
      categoria: data.categoria,
      forma_pagamento: data.forma_pagamento,
    };
    this.data.gastos.push(gasto);
    this.saveData();
    return gasto;
  }

  deleteGasto(id: number, usuarioId: number): boolean {
    const initialLength = this.data.gastos.length;
    this.data.gastos = this.data.gastos.filter(g => !(g.id === id && g.usuario_id === usuarioId));
    const deleted = this.data.gastos.length < initialLength;
    if (deleted) {
      this.saveData();
    }
    return deleted;
  }

  findGastoById(id: number, usuarioId: number) {
    return this.data.gastos.find(g => g.id === id && g.usuario_id === usuarioId);
  }

  findGastosByUsuarioCurrentMonth(usuarioId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return this.data.gastos.filter(g => {
      if (g.usuario_id !== usuarioId) return false;
      const gastoDate = new Date(g.data);
      return gastoDate >= startOfMonth && gastoDate <= endOfMonth;
    });
  }

  // Métodos para LimiteCategoria
  findLimiteCategoriaByCategoria(usuarioId: number, categoria: string) {
    return this.data.limites_categoria.find(
      l => l.usuario_id === usuarioId && l.categoria === categoria
    );
  }

  upsertLimiteCategoria(usuarioId: number, categoria: string, valorLimite: number) {
    const existing = this.findLimiteCategoriaByCategoria(usuarioId, categoria);
    
    if (existing) {
      existing.valor_limite_mensal = valorLimite;
    } else {
      this.data.limites_categoria.push({
        id: this.data.counters.limite_categoria++,
        usuario_id: usuarioId,
        categoria,
        valor_limite_mensal: valorLimite,
      });
    }
    
    this.saveData();
    return this.findLimiteCategoriaByCategoria(usuarioId, categoria)!;
  }

  findLimitesCategoriaByUsuario(usuarioId: number) {
    return this.data.limites_categoria.filter(l => l.usuario_id === usuarioId);
  }
}

// Singleton instance
let dbInstance: DatabaseConnection | null = null;

export function getDb(): DatabaseConnection {
  if (!dbInstance) {
    dbInstance = new DatabaseConnection();
  }
  return dbInstance;
}

export function closeDb() {
  dbInstance = null;
}
