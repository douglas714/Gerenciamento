import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from 'sonner'

export function BulkEditModal({ isOpen, onClose, selectedUsers, onSave }) {
  const [values, setValues] = useState({
    monthly_profit: '',
    accumulated_profit: ''
  })

  const handleInputChange = (field, value) => {
    // Validação simples para números
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setValues(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleSave = () => {
    const updates = {}
    
    if (values.monthly_profit !== '') {
      updates.monthly_profit = parseFloat(values.monthly_profit)
    }
    
    if (values.accumulated_profit !== '') {
      updates.accumulated_profit = parseFloat(values.accumulated_profit)
    }

    if (Object.keys(updates).length === 0) {
      toast.error('Preencha pelo menos um campo para atualizar')
      return
    }

    onSave(updates)
    setValues({
      monthly_profit: '',
      accumulated_profit: ''
    })
    onClose()
  }

  const handleCancel = () => {
    setValues({
      monthly_profit: '',
      accumulated_profit: ''
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edição em Massa</DialogTitle>
          <DialogDescription>
            Aplicar valores para {selectedUsers.length} usuário(s) selecionado(s).
            Deixe em branco os campos que não deseja alterar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="monthly_profit" className="text-right">
              Lucro Mensal (%)
            </Label>
            <Input
              id="monthly_profit"
              type="text"
              placeholder="Ex: 5.5"
              value={values.monthly_profit}
              onChange={(e) => handleInputChange('monthly_profit', e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accumulated_profit" className="text-right">
              Lucro Acumulado (%)
            </Label>
            <Input
              id="accumulated_profit"
              type="text"
              placeholder="Ex: 15.2"
              value={values.accumulated_profit}
              onChange={(e) => handleInputChange('accumulated_profit', e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Aplicar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

