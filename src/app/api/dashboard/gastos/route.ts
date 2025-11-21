import { NextResponse } from 'next/server';
import { UsuarioRepository } from '@/lib/db/repositories';
import { getDb } from '@/lib/db/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const telefone = searchParams.get('telefone') || '5511999999999'; // Telefone padrão para demo
    const limit = parseInt(searchParams.get('limit') || '50');

    // Buscar ou criar usuário
    const usuario = UsuarioRepository.findOrCreateByTelefone(telefone);

    // Buscar gastos do mês atual
    const db = getDb();
    const gastos = db.findGastosByUsuarioCurrentMonth(usuario.id);

    // Ordenar por data (mais recentes primeiro) e limitar
    const gastosOrdenados = gastos
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: gastosOrdenados,
    });
  } catch (error) {
    console.error('Erro ao buscar gastos:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar gastos' },
      { status: 500 }
    );
  }
}
