import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  Filter,
  PlusCircle,
  Trash2,
  Wallet,
} from 'lucide-react'
import './App.css'

type EntryStatus = 'received' | 'pending' | 'paid' | 'to_receive'
type EntryType = 'income' | 'expense'

type Income = {
  id: string
  type: 'income'
  description: string
  amount: number
  date: string
  month: number
  year: number
  category: string
  status: 'received' | 'pending' | 'to_receive'
  notes?: string
}

type Expense = {
  id: string
  type: 'expense'
  description: string
  totalAmount: number
  installmentAmount: number
  installments: number
  currentInstallment: number
  month: number
  year: number
  startMonth: number
  startYear: number
  dueDate: string
  category: string
  status: 'paid' | 'pending'
  parentDebtId: string
  notes?: string
}

type FinancialEntry = Income | Expense

type AppData = {
  entries: FinancialEntry[]
  categories: {
    income: string[]
    expense: string[]
  }
  settings: {
    appName: string
  }
}

const STORAGE_KEY = 'finance-control-dashboard'
const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const incomeCategories = ['Salário', 'Extra', 'Comissão', 'Investimento', 'Outros']
const expenseCategories = ['Cartão de crédito', 'Moradia', 'Alimentação', 'Transporte', 'Assinaturas', 'Empréstimos', 'Lazer', 'Outros']

const current = new Date()

const defaultData: AppData = {
  entries: [],
  categories: {
    income: incomeCategories,
    expense: expenseCategories,
  },
  settings: {
    appName: 'Finance Control Dashboard',
  },
}

const toBRL = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

const getInstallmentDate = (year: number, month: number, add: number) => {
  const date = new Date(year, month + add, 1)
  return { year: date.getFullYear(), month: date.getMonth() }
}

const generateExpenseInstallments = (payload: {
  description: string
  totalAmount: number
  installments: number
  dueDate: string
  startMonth: number
  startYear: number
  category: string
  notes?: string
}): Expense[] => {
  const parentDebtId = crypto.randomUUID()
  const installmentAmount = Number((payload.totalAmount / payload.installments).toFixed(2))

  return Array.from({ length: payload.installments }, (_, index) => {
    const installmentDate = getInstallmentDate(payload.startYear, payload.startMonth, index)
    const dueDate = new Date(payload.dueDate)
    dueDate.setMonth(dueDate.getMonth() + index)

    return {
      id: crypto.randomUUID(),
      type: 'expense' as const,
      description: payload.description,
      totalAmount: payload.totalAmount,
      installmentAmount,
      installments: payload.installments,
      currentInstallment: index + 1,
      month: installmentDate.month,
      year: installmentDate.year,
      startMonth: payload.startMonth,
      startYear: payload.startYear,
      dueDate: dueDate.toISOString().split('T')[0],
      category: payload.category,
      status: 'pending',
      parentDebtId,
      notes: payload.notes,
    }
  })
}

function App() {
  const [data, setData] = useState<AppData>(defaultData)
  const [selectedMonth, setSelectedMonth] = useState(current.getMonth())
  const [selectedYear, setSelectedYear] = useState(current.getFullYear())
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [mode, setMode] = useState<'income' | 'expense' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setData(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const filtered = useMemo(() => {
    return data.entries
      .filter((entry) => entry.month === selectedMonth && entry.year === selectedYear)
      .filter((entry) => categoryFilter === 'all' || entry.category === categoryFilter)
      .filter((entry) => entry.description.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.date?.localeCompare?.(b.date ?? '') || a.dueDate.localeCompare(b.dueDate))
  }, [categoryFilter, data.entries, search, selectedMonth, selectedYear])

  const monthMetrics = useMemo(() => {
    const monthEntries = data.entries.filter((entry) => entry.month === selectedMonth && entry.year === selectedYear)

    const incomePlanned = monthEntries.filter((e): e is Income => e.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const incomeReceived = monthEntries
      .filter((e): e is Income => e.type === 'income' && e.status === 'received')
      .reduce((sum, item) => sum + item.amount, 0)

    const expensePlanned = monthEntries.filter((e): e is Expense => e.type === 'expense').reduce((sum, item) => sum + item.installmentAmount, 0)
    const expensePaid = monthEntries
      .filter((e): e is Expense => e.type === 'expense' && e.status === 'paid')
      .reduce((sum, item) => sum + item.installmentAmount, 0)

    const futureCommitment = data.entries
      .filter((e): e is Expense => e.type === 'expense' && (e.year > selectedYear || (e.year === selectedYear && e.month > selectedMonth)))
      .reduce((sum, item) => sum + item.installmentAmount, 0)

    const byCategory = monthEntries
      .filter((e): e is Expense => e.type === 'expense')
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + item.installmentAmount
        return acc
      }, {})

    return {
      incomePlanned,
      incomeReceived,
      expensePlanned,
      expensePaid,
      futureCommitment,
      balancePlanned: incomePlanned - expensePlanned,
      balanceReal: incomeReceived - expensePaid,
      pending: incomePlanned - incomeReceived + (expensePlanned - expensePaid),
      byCategory,
    }
  }, [data.entries, selectedMonth, selectedYear])

  const years = useMemo(() => {
    const allYears = new Set<number>([selectedYear, current.getFullYear(), current.getFullYear() + 1])
    data.entries.forEach((entry) => allYears.add(entry.year))
    return [...allYears].sort((a, b) => a - b)
  }, [data.entries, selectedYear])

  const chartData = useMemo(() => {
    return months.map((label, monthIndex) => {
      const incomes = data.entries
        .filter((e): e is Income => e.type === 'income' && e.month === monthIndex && e.year === selectedYear)
        .reduce((sum, e) => sum + e.amount, 0)
      const expenses = data.entries
        .filter((e): e is Expense => e.type === 'expense' && e.month === monthIndex && e.year === selectedYear)
        .reduce((sum, e) => sum + e.installmentAmount, 0)

      return {
        month: label.slice(0, 3),
        ganhos: incomes,
        gastos: expenses,
        saldo: incomes - expenses,
      }
    })
  }, [data.entries, selectedYear])

  const topExpenses = useMemo(() => {
    return filtered
      .filter((e): e is Expense => e.type === 'expense')
      .sort((a, b) => b.installmentAmount - a.installmentAmount)
      .slice(0, 5)
  }, [filtered])

  const saveIncome = (form: FormData) => {
    const amount = Number(form.get('amount'))
    const description = String(form.get('description') || '').trim()
    const category = String(form.get('category') || '')
    const date = String(form.get('date') || '')

    if (!description || !category || !date || amount <= 0) {
      alert('Preencha todos os campos obrigatórios do ganho com valor maior que zero.')
      return
    }

    const month = Number(form.get('month'))
    const year = Number(form.get('year'))

    const newIncome: Income = {
      id: editingId ?? crypto.randomUUID(),
      type: 'income',
      description,
      amount,
      date,
      month,
      year,
      category,
      status: (form.get('status') as Income['status']) || 'pending',
      notes: String(form.get('notes') || ''),
    }

    setData((prev) => ({
      ...prev,
      entries: editingId ? prev.entries.map((e) => (e.id === editingId ? newIncome : e)) : [...prev.entries, newIncome],
    }))
    setMode(null)
    setEditingId(null)
  }

  const saveExpense = (form: FormData) => {
    const totalAmount = Number(form.get('totalAmount'))
    const installments = Number(form.get('installments'))
    const description = String(form.get('description') || '').trim()
    const category = String(form.get('category') || '')
    const dueDate = String(form.get('dueDate') || '')

    if (!description || !category || !dueDate || totalAmount <= 0 || installments < 1) {
      alert('Preencha os campos da despesa e use parcelas >= 1.')
      return
    }

    const startMonth = Number(form.get('startMonth'))
    const startYear = Number(form.get('startYear'))
    const notes = String(form.get('notes') || '')

    if (editingId) {
      const currentExpense = data.entries.find((e) => e.id === editingId && e.type === 'expense') as Expense | undefined
      if (!currentExpense) return
      const updated: Expense = {
        ...currentExpense,
        description,
        category,
        dueDate,
        status: (form.get('status') as Expense['status']) || 'pending',
        notes,
      }
      setData((prev) => ({ ...prev, entries: prev.entries.map((e) => (e.id === editingId ? updated : e)) }))
    } else {
      const installmentsData = generateExpenseInstallments({ description, totalAmount, installments, dueDate, startMonth, startYear, category, notes })
      setData((prev) => ({ ...prev, entries: [...prev.entries, ...installmentsData] }))
    }

    setMode(null)
    setEditingId(null)
  }

  const removeEntry = (id: string) => {
    const entry = data.entries.find((item) => item.id === id)
    if (!entry) return

    if (entry.type === 'expense' && entry.installments > 1 && confirm('Excluir todas as parcelas dessa despesa?')) {
      setData((prev) => ({ ...prev, entries: prev.entries.filter((e) => !(e.type === 'expense' && e.parentDebtId === entry.parentDebtId)) }))
      return
    }

    setData((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== id) }))
  }

  const toggleStatus = (entry: FinancialEntry) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((item) => {
        if (item.id !== entry.id) return item
        if (item.type === 'income') {
          return { ...item, status: item.status === 'received' ? 'pending' : 'received' }
        }
        return { ...item, status: item.status === 'paid' ? 'pending' : 'paid' }
      }),
    }))
  }

  const exportCsv = () => {
    const header = ['id', 'type', 'description', 'category', 'month', 'year', 'amount', 'installment', 'date', 'status']
    const rows = data.entries.map((entry) =>
      [
        entry.id,
        entry.type,
        entry.description,
        entry.category,
        entry.month + 1,
        entry.year,
        entry.type === 'income' ? entry.amount : entry.installmentAmount,
        entry.type === 'expense' ? `${entry.currentInstallment}/${entry.installments}` : '-',
        entry.type === 'income' ? entry.date : entry.dueDate,
        entry.status,
      ].join(','),
    )

    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `finance-control-${selectedYear}-${selectedMonth + 1}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const clearData = () => {
    if (confirm('Tem certeza que deseja limpar todos os dados?')) {
      setData(defaultData)
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const categories = [...data.categories.income, ...data.categories.expense]
  const indicatorClass =
    monthMetrics.balancePlanned > 0 ? 'text-emerald-600' : monthMetrics.balancePlanned < 0 ? 'text-rose-600' : 'text-amber-600'

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-8">
        <header className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{data.settings.appName}</h1>
              <p className="text-sm text-slate-500">Gestão financeira pessoal com parcelamento automático e visão mensal.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setMode('income')} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">+ Ganho</button>
              <button onClick={() => setMode('expense')} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">+ Despesa</button>
              <button onClick={exportCsv} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><Download className="mr-1 inline h-4" />Exportar CSV</button>
              <button onClick={clearData} className="rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-700"><Trash2 className="mr-1 inline h-4" />Limpar</button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card title="Ganhos do mês" value={toBRL(monthMetrics.incomePlanned)} icon={<Wallet className="h-4" />} color="text-emerald-600" />
          <Card title="Gastos do mês" value={toBRL(monthMetrics.expensePlanned)} icon={<AlertCircle className="h-4" />} color="text-rose-600" />
          <Card title="Saldo do mês" value={toBRL(monthMetrics.balancePlanned)} icon={<CheckCircle2 className="h-4" />} color={indicatorClass} />
          <Card title="Parcelas futuras" value={toBRL(monthMetrics.futureCommitment)} icon={<Calendar className="h-4" />} color="text-blue-600" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">Navegação mensal</h2>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-2">
              {months.map((month, index) => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(index)}
                  className={`rounded-lg px-2 py-2 text-xs md:text-sm ${selectedMonth === index ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}
                >
                  {month}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium">Ano</label>
              <select className="mt-1 w-full rounded-lg border p-2" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </aside>

          <main className="space-y-6">
            <section className="grid gap-4 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-2">
              <div className="h-64">
                <h3 className="mb-2 text-sm font-semibold">Ganhos x Gastos por mês</h3>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => toBRL(v)} />
                    <Bar dataKey="ganhos" fill="#16a34a" radius={6} />
                    <Bar dataKey="gastos" fill="#dc2626" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-64">
                <h3 className="mb-2 text-sm font-semibold">Evolução do saldo</h3>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => toBRL(v)} />
                    <Line type="monotone" dataKey="saldo" stroke="#2563eb" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="mb-2 font-semibold">Resumo mensal</h3>
              <div className="grid gap-2 text-sm md:grid-cols-3">
                <Summary label="Ganhos previstos" value={toBRL(monthMetrics.incomePlanned)} />
                <Summary label="Ganhos recebidos" value={toBRL(monthMetrics.incomeReceived)} />
                <Summary label="Gastos previstos" value={toBRL(monthMetrics.expensePlanned)} />
                <Summary label="Gastos pagos" value={toBRL(monthMetrics.expensePaid)} />
                <Summary label="Saldo previsto" value={toBRL(monthMetrics.balancePlanned)} />
                <Summary label="Saldo real" value={toBRL(monthMetrics.balanceReal)} />
                <Summary label="Pendente" value={toBRL(monthMetrics.pending)} />
              </div>
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="font-semibold">Lançamentos de {months[selectedMonth]} / {selectedYear}</h3>
                <div className="flex flex-wrap gap-2">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar descrição" className="rounded-lg border px-3 py-1.5 text-sm" />
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border px-3 py-1.5 text-sm">
                    <option value="all">Todas categorias</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2">Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th>Parcela</th><th>Data</th><th>Status</th><th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-none">
                        <td className="py-2">{entry.description}</td>
                        <td>{entry.category}</td>
                        <td>{entry.type === 'income' ? 'Ganho' : 'Despesa'}</td>
                        <td className={entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>{toBRL(entry.type === 'income' ? entry.amount : entry.installmentAmount)}</td>
                        <td>{entry.type === 'expense' ? `${entry.currentInstallment}/${entry.installments}` : '-'}</td>
                        <td>{entry.type === 'income' ? entry.date : entry.dueDate}</td>
                        <td>{entry.status === 'paid' ? 'Pago' : entry.status === 'received' ? 'Recebido' : 'Pendente'}</td>
                        <td>
                          <button onClick={() => { setEditingId(entry.id); setMode(entry.type) }} className="mr-1 rounded bg-slate-100 px-2 py-1">Editar</button>
                          <button onClick={() => toggleStatus(entry)} className="mr-1 rounded bg-blue-100 px-2 py-1">Alternar</button>
                          <button onClick={() => removeEntry(entry.id)} className="rounded bg-rose-100 px-2 py-1">Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-4 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-semibold">Top despesas do mês</h3>
                <ul className="space-y-2 text-sm">
                  {topExpenses.map((expense) => (
                    <li key={expense.id} className="flex justify-between rounded bg-slate-50 p-2">
                      <span>{expense.description}</span>
                      <strong>{toBRL(expense.installmentAmount)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Gastos por categoria</h3>
                <ul className="space-y-2 text-sm">
                  {Object.entries(monthMetrics.byCategory).map(([category, value]) => (
                    <li key={category} className="flex justify-between rounded bg-slate-50 p-2"><span>{category}</span><strong>{toBRL(value)}</strong></li>
                  ))}
                </ul>
              </div>
            </section>
          </main>
        </section>
      </div>

      {mode && (
        <EntryModal
          mode={mode}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onClose={() => {
            setMode(null)
            setEditingId(null)
          }}
          onSave={(form) => (mode === 'income' ? saveIncome(form) : saveExpense(form))}
          categories={mode === 'income' ? data.categories.income : data.categories.expense}
          editingEntry={editingId ? data.entries.find((e) => e.id === editingId) : undefined}
        />
      )}
    </div>
  )
}

function Card({ title, value, color, icon }: { title: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between text-slate-500">
        <p className="text-xs md:text-sm">{title}</p>
        {icon}
      </div>
      <p className={`text-lg font-bold md:text-xl ${color}`}>{value}</p>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}

function EntryModal({
  mode,
  onClose,
  onSave,
  categories,
  selectedMonth,
  selectedYear,
  editingEntry,
}: {
  mode: 'income' | 'expense'
  onClose: () => void
  onSave: (form: FormData) => void
  categories: string[]
  selectedMonth: number
  selectedYear: number
  editingEntry?: FinancialEntry
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(new FormData(e.currentTarget))
        }}
      >
        <h3 className="mb-4 text-lg font-semibold">{editingEntry ? 'Editar lançamento' : `Novo ${mode === 'income' ? 'ganho' : 'despesa'}`}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field name="description" label="Descrição" defaultValue={editingEntry?.description} required />
          {mode === 'income' ? (
            <Field name="amount" label="Valor" type="number" step="0.01" min={0.01} defaultValue={editingEntry?.type === 'income' ? editingEntry.amount : ''} required />
          ) : (
            <Field name="totalAmount" label="Valor total" type="number" step="0.01" min={0.01} defaultValue={editingEntry?.type === 'expense' ? editingEntry.totalAmount : ''} required />
          )}

          <div>
            <label className="text-sm">Categoria</label>
            <select name="category" className="mt-1 w-full rounded-lg border p-2" defaultValue={editingEntry?.category} required>
              <option value="">Selecione</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>

          {mode === 'income' ? (
            <Field name="date" label="Data" type="date" defaultValue={editingEntry?.type === 'income' ? editingEntry.date : ''} required />
          ) : (
            <Field name="dueDate" label="Data de compra/vencimento" type="date" defaultValue={editingEntry?.type === 'expense' ? editingEntry.dueDate : ''} required />
          )}

          <div>
            <label className="text-sm">Mês</label>
            <select name={mode === 'income' ? 'month' : 'startMonth'} className="mt-1 w-full rounded-lg border p-2" defaultValue={editingEntry?.month ?? selectedMonth}>
              {months.map((month, index) => <option key={month} value={index}>{month}</option>)}
            </select>
          </div>
          <Field name={mode === 'income' ? 'year' : 'startYear'} label="Ano" type="number" defaultValue={editingEntry?.year ?? selectedYear} required />

          {mode === 'expense' && (
            <Field
              name="installments"
              label="Parcelas"
              type="number"
              min={1}
              defaultValue={editingEntry?.type === 'expense' ? editingEntry.installments : 1}
              required
              disabled={Boolean(editingEntry)}
            />
          )}

          <div>
            <label className="text-sm">Status</label>
            <select name="status" className="mt-1 w-full rounded-lg border p-2" defaultValue={editingEntry?.status || 'pending'}>
              {mode === 'income' ? (
                <>
                  <option value="pending">A receber</option>
                  <option value="received">Recebido</option>
                </>
              ) : (
                <>
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                </>
              )}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm">Observação</label>
            <textarea name="notes" className="mt-1 w-full rounded-lg border p-2" defaultValue={editingEntry?.notes} rows={3} />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2">Cancelar</button>
          <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-white">Salvar</button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="text-sm">{label}</label>
      <input {...props} className="mt-1 w-full rounded-lg border p-2" />
    </div>
  )
}

export default App
