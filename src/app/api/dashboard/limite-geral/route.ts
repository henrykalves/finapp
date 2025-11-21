import { NextResponse } from 'next/server';
import { UsuarioRepository } from '@/lib/db/repositories';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telefone = '5511999999999', limite_mensal_geral } = body;

    if (typeof limite_mensal_geral !== 'number' || limite_mensal_geral < 0) {
      return NextResponse.json(
        { success: false, message: 'Limite mensal inválido' },
        { status: 400 }
      );
    }

    // Buscar ou criar usuário
    const usuario = UsuarioRepository.findOrCreateByTelefone(telefone);

    // Atualizar limite
    UsuarioRepository.updateLimiteMensalGeral(usuario.id, limite_mensal_geral);

    return NextResponse.json({
      success: true,
      message: 'Limite mensal atualizado com sucesso',
      data: {
        usuario_id: usuario.id,
        limite_mensal_geral,
      },
    });
  } catch (error) {
    console.error('Erro ao atualizar limite geral:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao atualizar limite' },
      { status: 500 }
    );
  }
}
