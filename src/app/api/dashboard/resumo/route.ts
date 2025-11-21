import { NextResponse } from 'next/server';
import { UsuarioRepository, GastoRepository, LimiteCategoriaRepository } from '@/lib/db/repositories';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const telefone = searchParams.get('telefone') || '5511999999999'; // Telefone padrão para demo

    // Buscar ou criar usuário
    const usuario = UsuarioRepository.findOrCreateByTelefone(telefone);

    // Calcular totais
    const totalMes = GastoRepository.getTotalMesAtual(usuario.id);
    const porCategoria = GastoRepository.getTotalPorCategoria(usuario.id);
    const porFormaPagamento = GastoRepository.getTotalPorFormaPagamento(usuario.id);

    // Buscar limites
    const limitesCategoria = LimiteCategoriaRepository.findAllByUsuario(usuario.id);

    return NextResponse.json({
      success: true,
      data: {
        usuario: {
          id: usuario.id,
          telefone: usuario.telefone,
          limite_mensal_geral: usuario.limite_mensal_geral,
        },
        resumo: {
          total_mes: totalMes,
          por_categoria: porCategoria,
          por_forma_pagamento: porFormaPagamento,
        },
        limites_categoria: limitesCategoria,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar resumo' },
      { status: 500 }
    );
  }
}
