import {
  UsuarioRepository,
  GastoRepository,
  LimiteCategoriaRepository,
  type Usuario,
  type Gasto,
} from '@/lib/db/repositories';
import type { Category } from '@/lib/types/finance';

/**
 * Resultado de verificação de limites
 */
export interface AlertaLimite {
  tipo: 'geral' | 'categoria';
  categoria?: string;
  percentual: number;
  valorGasto: number;
  valorLimite: number;
  atingiu80: boolean;
  atingiu100: boolean;
}

/**
 * Status financeiro do mês para educação financeira
 */
export interface StatusFinanceiroMes {
  totalGasto: number;
  limiteGeral: number;
  percentualUsado: number;
  saldoRestante: number;
  principaisCategories: Array<{
    categoria: string;
    valor: number;
    percentual: number;
  }>;
  alertas: string[];
}

/**
 * Serviço de regras de negócio para finanças
 */
export class FinanceService {
  /**
   * Identifica ou cria usuário pelo telefone
   */
  static getOrCreateUsuario(telefone: string): Usuario {
    return UsuarioRepository.findOrCreateByTelefone(telefone);
  }

  /**
   * Adiciona um novo gasto e verifica limites
   */
  static adicionarGasto(
    telefone: string,
    valor: number,
    categoria: Category,
    formaPagamento: string,
    descricao?: string
  ): { gasto: Gasto; alertas: AlertaLimite[] } {
    // Identificar/criar usuário
    const usuario = this.getOrCreateUsuario(telefone);

    // Criar gasto
    const gasto = GastoRepository.create({
      usuario_id: usuario.id,
      valor,
      categoria,
      forma_pagamento: formaPagamento as any,
      descricao,
    });

    // Verificar alertas de limite
    const alertas = this.verificarLimites(usuario.id, categoria);

    return { gasto, alertas };
  }

  /**
   * Verifica se limites foram atingidos (80% ou 100%)
   */
  static verificarLimites(usuarioId: number, categoriaGasto?: string): AlertaLimite[] {
    const alertas: AlertaLimite[] = [];
    const usuario = UsuarioRepository.findById(usuarioId);

    if (!usuario) return alertas;

    // Verificar limite geral
    if (usuario.limite_mensal_geral > 0) {
      const totalGasto = GastoRepository.getTotalMesAtual(usuarioId);
      const percentual = (totalGasto / usuario.limite_mensal_geral) * 100;

      if (percentual >= 80) {
        alertas.push({
          tipo: 'geral',
          percentual,
          valorGasto: totalGasto,
          valorLimite: usuario.limite_mensal_geral,
          atingiu80: percentual >= 80 && percentual < 100,
          atingiu100: percentual >= 100,
        });
      }
    }

    // Verificar limite da categoria específica
    if (categoriaGasto) {
      const limiteCategoria = LimiteCategoriaRepository.findByCategoria(usuarioId, categoriaGasto);
      
      if (limiteCategoria) {
        const totalCategoria = GastoRepository.getTotalCategoria(usuarioId, categoriaGasto);
        const percentual = (totalCategoria / limiteCategoria.valor_limite_mensal) * 100;

        if (percentual >= 80) {
          alertas.push({
            tipo: 'categoria',
            categoria: categoriaGasto,
            percentual,
            valorGasto: totalCategoria,
            valorLimite: limiteCategoria.valor_limite_mensal,
            atingiu80: percentual >= 80 && percentual < 100,
            atingiu100: percentual >= 100,
          });
        }
      }
    }

    return alertas;
  }

  /**
   * Define limite mensal geral
   */
  static definirLimiteGeral(telefone: string, valor: number): Usuario {
    const usuario = this.getOrCreateUsuario(telefone);
    UsuarioRepository.updateLimiteMensalGeral(usuario.id, valor);
    return UsuarioRepository.findById(usuario.id)!;
  }

  /**
   * Define limite para uma categoria específica
   */
  static definirLimiteCategoria(telefone: string, categoria: string, valor: number) {
    const usuario = this.getOrCreateUsuario(telefone);
    return LimiteCategoriaRepository.setLimite(usuario.id, categoria, valor);
  }

  /**
   * Gera relatório mensal completo
   */
  static gerarRelatorioMensal(telefone: string) {
    const usuario = this.getOrCreateUsuario(telefone);
    
    const gastos = GastoRepository.findCurrentMonthByUsuario(usuario.id);
    const totalMes = GastoRepository.getTotalMesAtual(usuario.id);
    const porCategoria = GastoRepository.getTotalPorCategoria(usuario.id);
    const porFormaPagamento = GastoRepository.getTotalPorFormaPagamento(usuario.id);
    const limites = LimiteCategoriaRepository.findAllByUsuario(usuario.id);

    return {
      usuario,
      gastos,
      totalMes,
      porCategoria,
      porFormaPagamento,
      limiteGeral: usuario.limite_mensal_geral,
      limitesCategoria: limites,
    };
  }

  /**
   * Consulta quanto foi gasto em uma categoria específica
   */
  static consultarGastoCategoria(telefone: string, categoria: string) {
    const usuario = this.getOrCreateUsuario(telefone);
    const total = GastoRepository.getTotalCategoria(usuario.id, categoria);
    const limite = LimiteCategoriaRepository.findByCategoria(usuario.id, categoria);
    
    return {
      categoria,
      total,
      limite: limite?.valor_limite_mensal || null,
      percentual: limite ? (total / limite.valor_limite_mensal) * 100 : null,
    };
  }

  /**
   * Exclui um gasto
   */
  static excluirGasto(telefone: string, gastoId: number): { sucesso: boolean; gasto?: Gasto } {
    const usuario = this.getOrCreateUsuario(telefone);
    const gasto = GastoRepository.findById(gastoId, usuario.id);
    
    if (!gasto) {
      return { sucesso: false };
    }

    const deletado = GastoRepository.delete(gastoId, usuario.id);
    return { sucesso: deletado, gasto };
  }

  /**
   * Calcula status financeiro do mês para educação financeira
   */
  static calcularStatusMes(telefone: string): StatusFinanceiroMes {
    const usuario = this.getOrCreateUsuario(telefone);
    const totalGasto = GastoRepository.getTotalMesAtual(usuario.id);
    const porCategoria = GastoRepository.getTotalPorCategoria(usuario.id);
    
    // Calcular percentual usado e saldo restante
    const limiteGeral = usuario.limite_mensal_geral || 0;
    const percentualUsado = limiteGeral > 0 ? (totalGasto / limiteGeral) * 100 : 0;
    const saldoRestante = limiteGeral - totalGasto;

    // Ordenar categorias por valor (maiores gastos primeiro)
    const principaisCategories = Object.entries(porCategoria)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        percentual: totalGasto > 0 ? (valor / totalGasto) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 3); // Top 3 categorias

    // Gerar alertas
    const alertas: string[] = [];
    
    if (limiteGeral > 0) {
      if (percentualUsado >= 100) {
        alertas.push('🚨 Você excedeu seu limite mensal!');
      } else if (percentualUsado >= 80) {
        alertas.push('⚠️ Atenção: você já usou mais de 80% do seu limite mensal!');
      }
    }

    // Verificar limites por categoria
    const limitesCategoria = LimiteCategoriaRepository.findAllByUsuario(usuario.id);
    limitesCategoria.forEach(limite => {
      const totalCategoria = GastoRepository.getTotalCategoria(usuario.id, limite.categoria);
      const percentualCategoria = (totalCategoria / limite.valor_limite_mensal) * 100;
      
      if (percentualCategoria >= 100) {
        alertas.push(`🚨 Limite da categoria "${limite.categoria}" excedido!`);
      } else if (percentualCategoria >= 80) {
        alertas.push(`⚠️ Categoria "${limite.categoria}" próxima do limite (${percentualCategoria.toFixed(0)}%)!`);
      }
    });

    return {
      totalGasto,
      limiteGeral,
      percentualUsado,
      saldoRestante,
      principaisCategories,
      alertas,
    };
  }

  /**
   * Gera dica de economia baseada nas categorias que mais consomem
   */
  static gerarDicaEconomia(principaisCategories: StatusFinanceiroMes['principaisCategories']): string {
    if (principaisCategories.length === 0) {
      return '💡 Comece a registrar seus gastos para receber dicas personalizadas!';
    }

    const categoriaTop = principaisCategories[0].categoria;
    
    const dicas: Record<string, string[]> = {
      'alimentacao': [
        '🍽️ Planeje suas refeições semanalmente para evitar desperdício e compras por impulso.',
        '🥗 Cozinhar em casa pode economizar até 60% comparado a comer fora.',
        '🛒 Faça uma lista de compras e evite ir ao mercado com fome.',
        '📦 Compre alimentos em maior quantidade quando estiverem em promoção.',
      ],
      'transporte': [
        '🚗 Considere usar transporte público ou compartilhado para economizar com combustível.',
        '🚴 Para distâncias curtas, caminhar ou usar bicicleta economiza e faz bem à saúde.',
        '⛽ Mantenha o carro bem calibrado e faça manutenções preventivas para economizar combustível.',
        '🚕 Avalie se vale a pena ter um carro próprio ou usar aplicativos de transporte.',
      ],
      'lazer': [
        '🎬 Procure por eventos gratuitos ou com desconto na sua cidade.',
        '📚 Bibliotecas públicas oferecem livros, filmes e até cursos gratuitamente.',
        '🏞️ Aproveite parques e espaços públicos para atividades de lazer.',
        '🎮 Compartilhe assinaturas de streaming com amigos ou familiares.',
      ],
      'saude': [
        '💊 Compare preços de medicamentos em diferentes farmácias e considere genéricos.',
        '🏃 Prevenir é mais barato que remediar: invista em hábitos saudáveis.',
        '🩺 Use o sistema público de saúde quando possível.',
        '💰 Considere um plano de saúde com coparticipação se usar pouco.',
      ],
      'vestuario': [
        '👕 Compre roupas fora de estação quando estão em promoção.',
        '♻️ Considere brechós e bazares para peças de qualidade por menos.',
        '🧵 Aprenda consertos básicos para prolongar a vida das suas roupas.',
        '🛍️ Evite compras por impulso: espere 24h antes de comprar algo não essencial.',
      ],
      'educacao': [
        '📖 Busque cursos gratuitos online em plataformas como Coursera, edX e YouTube.',
        '📚 Compartilhe livros com amigos ou use bibliotecas.',
        '🎓 Verifique se sua empresa oferece auxílio educação.',
        '💻 Muitas instituições oferecem bolsas parciais ou integrais.',
      ],
      'moradia': [
        '💡 Troque lâmpadas por LED para economizar até 80% na conta de luz.',
        '🚿 Reduza o tempo no chuveiro e conserte vazamentos rapidamente.',
        '❄️ Use ar-condicionado com moderação e mantenha filtros limpos.',
        '📱 Renegocie contratos de internet, TV e telefone anualmente.',
      ],
      'outros': [
        '📊 Categorize melhor seus gastos para identificar onde economizar.',
        '💰 Estabeleça um limite mensal e acompanhe seus gastos regularmente.',
        '🎯 Defina metas financeiras claras e trabalhe para alcançá-las.',
        '📝 Revise seus gastos semanalmente para manter o controle.',
      ],
    };

    const dicasCategoria = dicas[categoriaTop] || dicas['outros'];
    const dicaAleatoria = dicasCategoria[Math.floor(Math.random() * dicasCategoria.length)];
    
    return dicaAleatoria;
  }
}
