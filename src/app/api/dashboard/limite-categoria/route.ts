import { NextResponse } from 'next/server';
import { UsuarioRepository, LimiteCategoriaRepository } from '@/lib/db/repositories';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telefone = '5511999999999', categoria, valor_limite } = body;

    if (!categoria || typeof valor_limite !== 'number' || valor_limite < 0) {
      return NextResponse.json(
        { success: false, message: 'Categoria ou valor inválido' },
        { status: 400 }
      );
    }

    // Buscar ou criar usuário
    const usuario = UsuarioRepository.findOrCreateByTelefone(telefone);

    // Atualizar ou criar limite de categoria
    const limite = LimiteCategoriaRepository.setLimite(usuario.id, categoria, valor_limite);

    return NextResponse.json({
      success: true,
      message: `Limite da categoria ${categoria} atualizado com sucesso`,
      data: limite,
    });
  } catch (error) {
    console.error('Erro ao atualizar limite de categoria:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao atualizar limite de categoria' },
      { status: 500 }
    );
  }
}
