import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Edit, Check, X, DollarSign, TrendingUp, Calculator } from 'lucide-react'
import { updateUserLocal } from '@/lib/userService'
import { toast } from 'sonner'

export function UserCard({ user, onUserUpdate, isSelected, onSelectionChange }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState({
    monthly_profit: '',
    accumulated_profit: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`
  }

  const startEdit = () => {
    setIsEditing(true)
    setEditValues({
      monthly_profit: '',
      accumulated_profit: ''
    })
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditValues({
      monthly_profit: '',
      accumulated_profit: ''
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
      
      if (editValues.accumulated_profit !== '') {
        updates.accumulated_profit = parseFloat(editValues.accumulated_profit)
      }

      if (Object.keys(updates).length === 0) {
        toast.error('Preencha pelo menos um campo para atualizar')
        return
      }

      // Calcular novo saldo baseado no lucro mensal
      if (updates.monthly_profit !== undefined) {
        const baseBalance = user.balance || 1000
        updates.balance = baseBalance * (1 + updates.monthly_profit / 100)
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
        monthly_profit: '',
        accumulated_profit: ''
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
              {formatCurrency(user.balance)}
            </p>
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                Calculado automaticamente baseado no lucro mensal
              </p>
            )}
          </div>

          {/* Lucro Mensal */}
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

          {/* Lucro Acumulado */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Lucro Acumulado (%)</span>
            </div>
            {isEditing ? (
              <div className="space-y-1">
                <Input
                  type="text"
                  placeholder="Porcentagem (ex: 15.2)"
                  value={editValues.accumulated_profit}
                  onChange={(e) => handleInputChange('accumulated_profit', e.target.value)}
                  className="h-8"
                />
                <p className="text-xs text-muted-foreground">
                  Atual: {formatPercentage(user.accumulated_profit)}
                </p>
              </div>
            ) : (
              <p className="text-lg font-semibold text-orange-600">
                {formatPercentage(user.accumulated_profit)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

