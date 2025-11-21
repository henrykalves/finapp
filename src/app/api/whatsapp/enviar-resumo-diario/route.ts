import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '@/lib/services/finance-service';
import { generateResumoEducacaoFinanceira } from '@/lib/utils/message-formatter';

/**
 * POST /api/whatsapp/enviar-resumo-diario
 * 
 * Endpoint para enviar resumo diário de educação financeira para um usuário.
 * Pode ser chamado manualmente ou conectado a um agendador externo (cron job).
 * 
 * Body esperado:
 * {
 *   "telefone": "5511999999999"  // Telefone do usuário (obrigatório)
 * }
 * 
 * Ou para enviar para todos os usuários:
 * {
 *   "todos": true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telefone, todos } = body;

    // Validação básica
    if (!telefone && !todos) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parâmetro "telefone" ou "todos" é obrigatório',
        },
        { status: 400 }
      );
    }

    // Se for para enviar para todos os usuários
    if (todos) {
      // TODO: Implementar lógica para buscar todos os usuários e enviar
      // Por enquanto, retorna erro informativo
      return NextResponse.json(
        {
          success: false,
          error: 'Funcionalidade "todos" ainda não implementada. Use "telefone" para enviar individualmente.',
        },
        { status: 501 }
      );
    }

    // Gerar resumo para o usuário específico
    const resumo = gerarResumoEducacaoFinanceira(telefone);

    return NextResponse.json({
      success: true,
      message: 'Resumo gerado com sucesso',
      data: {
        telefone,
        resumo,
      },
    });

  } catch (error) {
    console.error('Erro ao gerar resumo diário:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao processar requisição',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/whatsapp/enviar-resumo-diario
 * 
 * Endpoint para testar o serviço via navegador ou curl GET.
 * Requer parâmetro "telefone" na query string.
 * 
 * Exemplo: /api/whatsapp/enviar-resumo-diario?telefone=5511999999999
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telefone = searchParams.get('telefone');

    if (!telefone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parâmetro "telefone" é obrigatório na query string',
          exemplo: '/api/whatsapp/enviar-resumo-diario?telefone=5511999999999',
        },
        { status: 400 }
      );
    }

    // Gerar resumo para o usuário
    const resumo = gerarResumoEducacaoFinanceira(telefone);

    return NextResponse.json({
      success: true,
      message: 'Resumo gerado com sucesso',
      data: {
        telefone,
        resumo,
      },
    });

  } catch (error) {
    console.error('Erro ao gerar resumo diário:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao processar requisição',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

/**
 * Função reutilizável para gerar resumo de educação financeira
 * 
 * @param telefone - Número de telefone do usuário
 * @returns Mensagem formatada com resumo e dica de economia
 */
export function gerarResumoEducacaoFinanceira(telefone: string): string {
  // Calcular status financeiro do mês
  const status = FinanceService.calcularStatusMes(telefone);
  
  // Gerar dica de economia baseada nas principais categorias
  const dica = FinanceService.gerarDicaEconomia(status.principaisCategories);
  
  // Formatar mensagem completa
  const mensagem = generateResumoEducacaoFinanceira(status, dica);
  
  return mensagem;
}
