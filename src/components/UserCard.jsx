import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Edit, Check, X, DollarSign, TrendingUp, Wallet, KeyRound } from 'lucide-react'
import { updateUserLocal } from '@/lib/userService'
import { toast } from 'sonner'

export function UserCard({ user, onUserUpdate, isSelected, onSelectionChange }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState({
    monthly_profit: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const formatPercentage = (value) => {
    // CORREÇÃO: Alterado para exibir 5 casas decimais para maior precisão
    return `${(value || 0).toFixed(5)}%`
  }

  // Calcular lucro do mês em reais
  const calculateMonthlyProfitInReais = () => {
    // CORREÇÃO: Usar operador de coalescência nula (??) em vez de || para preservar o valor 0
    const initialBalance = user.initial_balance ?? 1000
    const currentBalance = user.balance ?? 1000
    // CORREÇÃO: O lucro deve ser a diferença exata entre o saldo atual e o saldo inicial.
    return currentBalance - initialBalance
  }

  const startEdit = () => {
    setIsEditing(true)
    setEditValues({
      monthly_profit: ''
    })
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditValues({
      monthly_profit: ''
    })
  }

  const handleInputChange = (field, value) => {
    // Validação simples para números
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setEditValues(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const saveEdit = async () => {
    setIsUpdating(true)
    
    try {
      const updates = {}
      
      if (editValues.monthly_profit !== '') {
        updates.monthly_profit = parseFloat(editValues.monthly_profit)
      }

      if (Object.keys(updates).length === 0) {
        toast.error('Preencha o campo de lucro mensal para atualizar')
        return
      }

      // Calcular novo saldo baseado no lucro mensal
      if (updates.monthly_profit !== undefined) {
        // CORREÇÃO: Usar operador de coalescência nula (??) em vez de || para preservar o valor 0
        const baseBalance = user.balance ?? 1000
        // A lógica de cálculo de saldo foi movida para userService.js para ser centralizada
        // mas o cálculo de saldo é feito dentro do updateUserLocal, então aqui não é necessário
      }

      const { data, error } = await updateUserLocal(user.id, updates)
      
      if (error) {
        toast.error('Erro ao atualizar usuário: ' + error)
        return
      }

      toast.success('Usuário atualizado com sucesso!')
      onUserUpdate(data)
      setIsEditing(false)
      setEditValues({
        monthly_profit: ''
      })
    } catch (error) {
      toast.error('Erro inesperado ao atualizar usuário')
      console.error('Erro ao salvar:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card className={isSelected ? 'ring-2 ring-blue-500' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
            />
            <div>
              <CardTitle className="text-lg">{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={isUpdating}
                  className="h-8 w-8 p-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={isUpdating}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={startEdit}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Saldo */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Saldo</span>
            </div>
            <p className="text-lg font-semibold text-green-600">
              {/* CORREÇÃO: Aplicado toFixed(2) apenas na exibição */}
              {formatCurrency(user.balance.toFixed(2))}
            </p>
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                Calculado automaticamente baseado no lucro mensal
              </p>
            )}
          </div>

          {/* Lucro Mensal (%) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Lucro Mensal (%)</span>
            </div>
            {isEditing ? (
              <div className="space-y-1">
                <Input
                  type="text"
                  placeholder="Porcentagem (ex: 5.5)"
                  value={editValues.monthly_profit}
                  onChange={(e) => handleInputChange('monthly_profit', e.target.value)}
                  className="h-8"
                />
                <p className="text-xs text-muted-foreground">
                  Atual: {formatPercentage(user.monthly_profit)}
                </p>
              </div>
            ) : (
              <p className="text-lg font-semibold text-purple-600">
                {formatPercentage(user.monthly_profit)}
              </p>
            )}
          </div>

          {/* Lucro do Mês (R$) - NOVO CAMPO */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Lucro do Mês (R$)</span>
            </div>
            <p className="text-lg font-semibold text-blue-600">
              {/* CORREÇÃO: Aplicado toFixed(2) apenas na exibição */}
              {formatCurrency(calculateMonthlyProfitInReais().toFixed(2))}
            </p>
            <p className="text-xs text-muted-foreground">
              Rendimento em reais
            </p>
          </div>
          
          {/* CHAVE PIX */}
          {user.pix_key && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-pink-600" />
                <span className="text-sm font-medium">CHAVE PIX</span>
              </div>
              <p className="text-lg font-semibold text-pink-600 break-all">
                {user.pix_key}
              </p>
              <p className="text-xs text-muted-foreground">
                Para pagamentos
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
