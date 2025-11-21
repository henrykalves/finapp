import { NextRequest, NextResponse } from 'next/server';
import type { WhatsAppMessage, WhatsAppResponse } from '@/lib/types/finance';
import { MessageParser } from '@/lib/parser/message-parser';
import { FinanceService } from '@/lib/services/finance-service';
import {
  generateAddExpenseMessage,
  generateDeleteExpenseMessage,
  generateMonthlyReport,
  generateSetLimitMessage,
  generateErrorMessage,
} from '@/lib/utils/message-formatter';

/**
 * Formata mensagens de alerta de limite
 */
function formatarAlertasLimite(alertas: any[]): string {
  if (alertas.length === 0) return '';

  let mensagem = '\n\n';

  alertas.forEach(alerta => {
    if (alerta.atingiu100) {
      if (alerta.tipo === 'geral') {
        mensagem += `🚨 ATENÇÃO: Você excedeu seu limite mensal geral!\n`;
        mensagem += `   Gasto: R$ ${alerta.valorGasto.toFixed(2)} / Limite: R$ ${alerta.valorLimite.toFixed(2)}\n`;
      } else {
        mensagem += `🚨 ATENÇÃO: Você excedeu o limite da categoria "${alerta.categoria}"!\n`;
        mensagem += `   Gasto: R$ ${alerta.valorGasto.toFixed(2)} / Limite: R$ ${alerta.valorLimite.toFixed(2)}\n`;
      }
    } else if (alerta.atingiu80) {
      if (alerta.tipo === 'geral') {
        mensagem += `⚠️ ALERTA: Você já utilizou ${alerta.percentual.toFixed(1)}% do seu limite mensal geral!\n`;
        mensagem += `   Gasto: R$ ${alerta.valorGasto.toFixed(2)} / Limite: R$ ${alerta.valorLimite.toFixed(2)}\n`;
      } else {
        mensagem += `⚠️ ALERTA: Você já utilizou ${alerta.percentual.toFixed(1)}% do limite da categoria "${alerta.categoria}"!\n`;
        mensagem += `   Gasto: R$ ${alerta.valorGasto.toFixed(2)} / Limite: R$ ${alerta.valorLimite.toFixed(2)}\n`;
      }
    }
  });

  return mensagem;
}

/**
 * POST /api/whatsapp/webhook
 * 
 * Webhook para receber mensagens do WhatsApp Business API
 * e processar comandos de gerenciamento financeiro
 */
export async function POST(request: NextRequest) {
  try {
    // Parse do body da requisição
    const body = await request.json() as WhatsAppMessage;

    // Validação básica
    if (!body.from || !body.text) {
      return NextResponse.json<WhatsAppResponse>(
        {
          success: false,
          message: 'Requisição inválida. É necessário fornecer "from" e "text".',
        },
        { status: 400 }
      );
    }

    const telefone = body.from;
    const messageText = body.text;

    // Parse da mensagem
    const command = MessageParser.parse(messageText);

    // Processar comando
    let responseMessage: string;

    switch (command.type) {
      case 'adicionar': {
        // Validar dados necessários
        if (!command.amount) {
          responseMessage = generateErrorMessage('Não foi possível identificar o valor do gasto.');
          break;
        }

        // Adicionar gasto usando o serviço
        const resultado = FinanceService.adicionarGasto(
          telefone,
          command.amount,
          command.category || 'outros',
          command.paymentMethod || 'credito',
          command.description || ''
        );

        // Converter Gasto do DB para formato Expense
        const expense = {
          id: String(resultado.gasto.id),
          userId: telefone,
          amount: resultado.gasto.valor,
          category: resultado.gasto.categoria as any,
          paymentMethod: resultado.gasto.forma_pagamento as any,
          description: resultado.gasto.descricao,
          date: new Date(resultado.gasto.data),
        };

        responseMessage = generateAddExpenseMessage(expense);

        // Adicionar alertas de limite
        const alertas = formatarAlertasLimite(resultado.alertas);
        responseMessage += alertas;

        break;
      }

      case 'excluir': {
        // Validar ID
        if (!command.expenseId) {
          responseMessage = generateErrorMessage('Não foi possível identificar o ID do gasto a excluir.');
          break;
        }

        // Excluir gasto
        const resultado = FinanceService.excluirGasto(telefone, parseInt(command.expenseId));

        if (!resultado.sucesso || !resultado.gasto) {
          responseMessage = `❌ Gasto com ID ${command.expenseId} não encontrado.`;
          break;
        }

        // Converter para formato Expense
        const expense = {
          id: String(resultado.gasto.id),
          userId: telefone,
          amount: resultado.gasto.valor,
          category: resultado.gasto.categoria as any,
          paymentMethod: resultado.gasto.forma_pagamento as any,
          description: resultado.gasto.descricao,
          date: new Date(resultado.gasto.data),
        };

        responseMessage = generateDeleteExpenseMessage(expense);
        break;
      }

      case 'relatorio': {
        // Verificar se é consulta de categoria específica
        const textoLower = messageText.toLowerCase();
        let categoriaConsulta: string | null = null;

        // Detectar consultas tipo "quanto gastei em alimentação?"
        const categorias = ['alimentacao', 'transporte', 'saude', 'educacao', 'lazer', 'moradia', 'vestuario'];
        for (const cat of categorias) {
          if (textoLower.includes(cat) || textoLower.includes(cat.replace('cao', 'ção'))) {
            categoriaConsulta = cat;
            break;
          }
        }

        if (categoriaConsulta) {
          // Relatório de categoria específica
          const resultado = FinanceService.consultarGastoCategoria(telefone, categoriaConsulta);
          
          responseMessage = `📊 *Gastos em ${categoriaConsulta}*\n\n`;
          responseMessage += `💰 Total gasto: R$ ${resultado.total.toFixed(2)}\n`;
          
          if (resultado.limite) {
            responseMessage += `🎯 Limite definido: R$ ${resultado.limite.toFixed(2)}\n`;
            responseMessage += `📈 Utilizado: ${resultado.percentual?.toFixed(1)}%\n`;
            
            if (resultado.percentual && resultado.percentual >= 100) {
              responseMessage += `\n🚨 Limite excedido!`;
            } else if (resultado.percentual && resultado.percentual >= 80) {
              responseMessage += `\n⚠️ Atenção: próximo do limite!`;
            }
          } else {
            responseMessage += `\nℹ️ Nenhum limite definido para esta categoria.`;
          }
        } else {
          // Relatório mensal completo
          const relatorio = FinanceService.gerarRelatorioMensal(telefone);

          // Converter gastos para formato Expense
          const expenses = relatorio.gastos.map(g => ({
            id: String(g.id),
            userId: telefone,
            amount: g.valor,
            category: g.categoria as any,
            paymentMethod: g.forma_pagamento as any,
            description: g.descricao,
            date: new Date(g.data),
          }));

          // Montar limite para o formatter
          const limit = relatorio.limiteGeral > 0 ? {
            userId: telefone,
            monthlyLimit: relatorio.limiteGeral,
            currentMonth: new Date().toISOString().slice(0, 7),
          } : undefined;

          responseMessage = generateMonthlyReport(
            expenses,
            relatorio.porCategoria,
            relatorio.porFormaPagamento,
            relatorio.totalMes,
            limit
          );

          // Adicionar informações de limites por categoria
          if (relatorio.limitesCategoria.length > 0) {
            responseMessage += '\n\n📋 *Limites por Categoria:*\n';
            relatorio.limitesCategoria.forEach(lim => {
              const gasto = relatorio.porCategoria[lim.categoria] || 0;
              const percentual = (gasto / lim.valor_limite_mensal) * 100;
              responseMessage += `\n${lim.categoria}: R$ ${gasto.toFixed(2)} / R$ ${lim.valor_limite_mensal.toFixed(2)} (${percentual.toFixed(1)}%)`;
            });
          }
        }

        break;
      }

      case 'limite': {
        // Validar valor
        if (!command.amount) {
          responseMessage = generateErrorMessage('Não foi possível identificar o valor do limite.');
          break;
        }

        // Verificar se é limite de categoria específica
        if (command.category && command.category !== 'outros') {
          // Definir limite de categoria
          const limite = FinanceService.definirLimiteCategoria(
            telefone,
            command.category,
            command.amount
          );

          responseMessage = `✅ Limite definido com sucesso!\n\n`;
          responseMessage += `📁 Categoria: ${limite.categoria}\n`;
          responseMessage += `💰 Limite mensal: R$ ${limite.valor_limite_mensal.toFixed(2)}`;
        } else {
          // Definir limite geral
          const usuario = FinanceService.definirLimiteGeral(telefone, command.amount);

          const limit = {
            userId: telefone,
            monthlyLimit: usuario.limite_mensal_geral,
            currentMonth: new Date().toISOString().slice(0, 7),
          };

          responseMessage = generateSetLimitMessage(limit);
        }

        break;
      }

      case 'desconhecido':
      default: {
        responseMessage = generateErrorMessage('Não consegui entender seu comando.');
        break;
      }
    }

    // Retornar resposta
    return NextResponse.json<WhatsAppResponse>(
      {
        success: true,
        message: responseMessage,
        data: {
          command: command.type,
          userId: telefone,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    
    return NextResponse.json<WhatsAppResponse>(
      {
        success: false,
        message: 'Erro interno ao processar mensagem.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/whatsapp/webhook
 * 
 * Endpoint de verificação para WhatsApp Business API
 * (usado durante a configuração do webhook)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Token de verificação (deve ser configurado nas variáveis de ambiente)
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'finapp_webhook_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso!');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json(
    { error: 'Token de verificação inválido' },
    { status: 403 }
  );
}
