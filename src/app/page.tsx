'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Wallet, TrendingUp, CreditCard, Settings, Filter } from 'lucide-react';

interface Gasto {
  id: number;
  usuario_id: number;
  data: string;
  descricao: string;
  valor: number;
  categoria: string;
  forma_pagamento: string;
}

interface LimiteCategoria {
  id: number;
  usuario_id: number;
  categoria: string;
  valor_limite_mensal: number;
}

interface ResumoData {
  usuario: {
    id: number;
    telefone: string;
    limite_mensal_geral: number;
  };
  resumo: {
    total_mes: number;
    por_categoria: Record<string, number>;
    por_forma_pagamento: Record<string, number>;
  };
  limites_categoria: LimiteCategoria[];
}

const CATEGORIAS = [
  'alimentacao',
  'transporte',
  'saude',
  'educacao',
  'lazer',
  'moradia',
  'vestuario',
  'outros',
];

const FORMAS_PAGAMENTO = ['cartao', 'dinheiro', 'pix', 'debito', 'credito'];

export default function DashboardPage() {
  const [resumo, setResumo] = useState<ResumoData | null>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [limiteGeral, setLimiteGeral] = useState('');
  const [categoriaLimite, setCategoriaLimite] = useState('');
  const [valorLimiteCategoria, setValorLimiteCategoria] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroFormaPagamento, setFiltroFormaPagamento] = useState<string>('todas');

  const telefone = '5511999999999'; // Telefone padrão para demo

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Buscar resumo
      const resumoRes = await fetch(`/api/dashboard/resumo?telefone=${telefone}`);
      const resumoData = await resumoRes.json();
      
      if (resumoData.success) {
        setResumo(resumoData.data);
        setLimiteGeral(resumoData.data.usuario.limite_mensal_geral.toString());
      }

      // Buscar gastos
      const gastosRes = await fetch(`/api/dashboard/gastos?telefone=${telefone}&limit=50`);
      const gastosData = await gastosRes.json();
      
      if (gastosData.success) {
        setGastos(gastosData.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const atualizarLimiteGeral = async () => {
    try {
      const valor = parseFloat(limiteGeral);
      if (isNaN(valor) || valor < 0) {
        alert('Valor inválido');
        return;
      }

      const res = await fetch('/api/dashboard/limite-geral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone,
          limite_mensal_geral: valor,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Limite mensal atualizado com sucesso!');
        carregarDados();
      } else {
        alert('Erro ao atualizar limite');
      }
    } catch (error) {
      console.error('Erro ao atualizar limite geral:', error);
      alert('Erro ao atualizar limite');
    }
  };

  const atualizarLimiteCategoria = async () => {
    try {
      const valor = parseFloat(valorLimiteCategoria);
      if (!categoriaLimite || isNaN(valor) || valor < 0) {
        alert('Categoria ou valor inválido');
        return;
      }

      const res = await fetch('/api/dashboard/limite-categoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone,
          categoria: categoriaLimite,
          valor_limite: valor,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        alert(`Limite da categoria ${categoriaLimite} atualizado!`);
        setCategoriaLimite('');
        setValorLimiteCategoria('');
        carregarDados();
      } else {
        alert('Erro ao atualizar limite de categoria');
      }
    } catch (error) {
      console.error('Erro ao atualizar limite de categoria:', error);
      alert('Erro ao atualizar limite de categoria');
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatarCategoria = (categoria: string) => {
    return categoria.charAt(0).toUpperCase() + categoria.slice(1);
  };

  const gastosFiltrados = gastos.filter((gasto) => {
    const matchCategoria = filtroCategoria === 'todas' || gasto.categoria === filtroCategoria;
    const matchFormaPagamento = filtroFormaPagamento === 'todas' || gasto.forma_pagamento === filtroFormaPagamento;
    return matchCategoria && matchFormaPagamento;
  });

  const calcularPercentualLimite = () => {
    if (!resumo || resumo.usuario.limite_mensal_geral === 0) return 0;
    return (resumo.resumo.total_mes / resumo.usuario.limite_mensal_geral) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Painel Financeiro
            </h1>
            <p className="text-gray-600 mt-1">
              Controle seus gastos e limites mensais
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Settings className="w-4 h-4 mr-2" />
                Configurar Limites
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Configurar Limites</DialogTitle>
                <DialogDescription>
                  Defina seus limites mensais gerais e por categoria
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Limite Geral */}
                <div className="space-y-2">
                  <Label htmlFor="limite-geral" className="text-base font-semibold">
                    Limite Mensal Geral
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="limite-geral"
                      type="number"
                      placeholder="0.00"
                      value={limiteGeral}
                      onChange={(e) => setLimiteGeral(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={atualizarLimiteGeral} className="bg-green-600 hover:bg-green-700">
                      Salvar
                    </Button>
                  </div>
                </div>

                {/* Limite por Categoria */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Limite por Categoria
                  </Label>
                  <div className="space-y-2">
                    <Select value={categoriaLimite} onValueChange={setCategoriaLimite}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {formatarCategoria(cat)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={valorLimiteCategoria}
                        onChange={(e) => setValorLimiteCategoria(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={atualizarLimiteCategoria} className="bg-green-600 hover:bg-green-700">
                        Salvar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Limites Atuais */}
                {resumo && resumo.limites_categoria.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Limites Configurados</Label>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {resumo.limites_categoria.map((limite) => (
                        <div
                          key={limite.id}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                        >
                          <span className="font-medium">{formatarCategoria(limite.categoria)}</span>
                          <span className="text-gray-600">{formatarMoeda(limite.valor_limite_mensal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total do Mês */}
          <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total do Mês</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {resumo ? formatarMoeda(resumo.resumo.total_mes) : 'R$ 0,00'}
                </p>
                {resumo && resumo.usuario.limite_mensal_geral > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">
                        {formatarMoeda(resumo.usuario.limite_mensal_geral)} limite
                      </span>
                      <span
                        className={`font-semibold ${
                          calcularPercentualLimite() > 100
                            ? 'text-red-600'
                            : calcularPercentualLimite() > 80
                            ? 'text-orange-600'
                            : 'text-green-600'
                        }`}
                      >
                        {calcularPercentualLimite().toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          calcularPercentualLimite() > 100
                            ? 'bg-red-600'
                            : calcularPercentualLimite() > 80
                            ? 'bg-orange-600'
                            : 'bg-green-600'
                        }`}
                        style={{ width: `${Math.min(calcularPercentualLimite(), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Wallet className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Card>

          {/* Por Categoria */}
          <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 font-medium">Por Categoria</p>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {resumo && Object.entries(resumo.resumo.por_categoria).length > 0 ? (
                Object.entries(resumo.resumo.por_categoria)
                  .sort(([, a], [, b]) => b - a)
                  .map(([categoria, valor]) => (
                    <div key={categoria} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 font-medium">
                        {formatarCategoria(categoria)}
                      </span>
                      <span className="text-gray-900 font-semibold">
                        {formatarMoeda(valor)}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-gray-500 text-sm">Nenhum gasto registrado</p>
              )}
            </div>
          </Card>

          {/* Por Forma de Pagamento */}
          <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 font-medium">Por Pagamento</p>
              <div className="p-3 bg-green-100 rounded-full">
                <CreditCard className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {resumo && Object.entries(resumo.resumo.por_forma_pagamento).length > 0 ? (
                Object.entries(resumo.resumo.por_forma_pagamento)
                  .sort(([, a], [, b]) => b - a)
                  .map(([forma, valor]) => (
                    <div key={forma} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 font-medium capitalize">
                        {forma}
                      </span>
                      <span className="text-gray-900 font-semibold">
                        {formatarMoeda(valor)}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-gray-500 text-sm">Nenhum gasto registrado</p>
              )}
            </div>
          </Card>
        </div>

        {/* Tabela de Gastos */}
        <Card className="p-6 bg-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Últimos Gastos ({gastosFiltrados.length})
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas Categorias</SelectItem>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {formatarCategoria(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroFormaPagamento} onValueChange={setFiltroFormaPagamento}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas Formas</SelectItem>
                  {FORMAS_PAGAMENTO.map((forma) => (
                    <SelectItem key={forma} value={forma}>
                      {forma.charAt(0).toUpperCase() + forma.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gastosFiltrados.length > 0 ? (
                  gastosFiltrados.map((gasto) => (
                    <TableRow key={gasto.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">#{gasto.id}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatarData(gasto.data)}
                      </TableCell>
                      <TableCell>{gasto.descricao || '-'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {formatarCategoria(gasto.categoria)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                          {gasto.forma_pagamento}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-900">
                        {formatarMoeda(gasto.valor)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhum gasto encontrado com os filtros selecionados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
