import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Users, RefreshCw, Edit3, Database, Loader2, TrendingUp, RotateCcw, Search } from 'lucide-react'
import { UserCard } from '@/components/UserCard'
import { BulkEditModal } from '@/components/BulkEditModal'
import { getUsers, updateMultipleUsersLocal, syncWithSupabase, reinvestUsers, renewUsers } from '@/lib/userService'
import { toast, Toaster } from 'sonner'
import './App.css'

function App() {
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Carregar usuários ao inicializar
  useEffect(() => {
    loadUsers()
  }, [])

  // Filtrar usuários baseado no termo de pesquisa
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await getUsers()
      if (error) {
        toast.error('Erro ao carregar usuários: ' + error)
        return
      }
      setUsers(data || [])
    } catch (error) {
      toast.error('Erro inesperado ao carregar usuários')
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Gerenciar seleção de usuários
  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId])
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId))
    }
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user.id))
    } else {
      setSelectedUsers([])
    }
  }

  const isAllSelected = selectedUsers.length === filteredUsers.length && filteredUsers.length > 0
  const isPartiallySelected = selectedUsers.length > 0 && selectedUsers.length < filteredUsers.length

  // Atualizar usuário individual
  const handleUserUpdate = (updatedUser) => {
    setUsers(prev => prev.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ))
  }

  // Edição em massa (apenas local)
  const handleBulkEdit = async (updates) => {
    if (selectedUsers.length === 0) {
      toast.error("Selecione pelo menos um usuário")
      return
    }

    try {
      const { data, error, skippedUsers } = await updateMultipleUsersLocal(selectedUsers, updates)
      
      if (error) {
        toast.error("Erro ao atualizar usuários: " + error)
        return
      }

      // Atualizar usuários na interface
      data.forEach(updatedUser => {
        handleUserUpdate(updatedUser)
      })

      // Mensagem de sucesso com informações sobre usuários ignorados
      let message = `${data.length} usuários atualizados localmente!`
      if (skippedUsers && skippedUsers.length > 0) {
        message += ` (${skippedUsers.length} usuários com saldo zerado foram ignorados)`
      }
      
      toast.success(message)
      setSelectedUsers([])
    } catch (error) {
      toast.error("Erro inesperado ao atualizar usuários em massa")
      console.error("Erro na edição em massa:", error)
    }
  }

  // Sincronizar com Supabase
  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const { data, error, partialSuccess } = await syncWithSupabase()
      
      if (error && !partialSuccess) {
        toast.error("Erro ao sincronizar com Supabase: " + error)
        return
      }

      if (partialSuccess) {
        toast.warning(`Sincronização parcial: ${data.length} usuários sincronizados`)
      } else {
        toast.success(`${data.length} usuários sincronizados com sucesso!`)
      }

      setLastSync(new Date())
      // Recarregar dados do Supabase
      await loadUsers()
    } catch (error) {
      toast.error("Erro inesperado ao sincronizar")
      console.error("Erro na sincronização:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  // Reinvestir usuários selecionados
  const handleReinvest = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Selecione pelo menos um usuário para reinvestir")
      return
    }

    try {
      const { data, error, skippedUsers } = await reinvestUsers(selectedUsers)
      
      if (error) {
        toast.error("Erro ao reinvestir usuários: " + error)
        return
      }

      // Atualizar usuários na interface
      data.forEach(updatedUser => {
        handleUserUpdate(updatedUser)
      })

      // Mensagem de sucesso com informações sobre usuários ignorados
      let message = `${data.length} usuários reinvestidos com sucesso!`
      if (skippedUsers && skippedUsers.length > 0) {
        message += ` (${skippedUsers.length} usuários com saldo zerado foram ignorados)`
      }
      
      toast.success(message)
      setSelectedUsers([])
    } catch (error) {
      toast.error("Erro inesperado ao reinvestir usuários")
      console.error("Erro no reinvestimento:", error)
    }
  }

  // Renovar usuários selecionados
  const handleRenew = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Selecione pelo menos um usuário para renovar")
      return
    }

    try {
      const { data, error, skippedUsers } = await renewUsers(selectedUsers)
      
      if (error) {
        toast.error("Erro ao renovar usuários: " + error)
        return
      }

      // Atualizar usuários na interface
      data.forEach(updatedUser => {
        handleUserUpdate(updatedUser)
      })

      // Mensagem de sucesso com informações sobre usuários ignorados
      let message = `${data.length} usuários renovados com sucesso!`
      if (skippedUsers && skippedUsers.length > 0) {
        message += ` (${skippedUsers.length} usuários com saldo zerado foram ignorados)`
      }
      
      toast.success(message)
      setSelectedUsers([])
    } catch (error) {
      toast.error("Erro inesperado ao renovar usuários")
      console.error("Erro na renovação:", error)
    }
  }

  const selectedUsersData = users.filter(user => selectedUsers.includes(user.id))

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando usuários...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciador de Usuários Supabase</h1>
          <p className="text-gray-600">Gerencie usuários com edição individual, em massa e sincronização</p>
        </div>

        {/* Campo de pesquisa */}
        <div className="max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Pesquisar usuários por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Controles principais */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span className="font-medium">
              {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} 
              {searchTerm && ` (de ${users.length} total)`}
            </span>
            {lastSync && (
              <Badge variant="outline" className="text-xs">
                Última sync: {lastSync.toLocaleTimeString()}
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={loadUsers} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Recarregar
            </Button>
            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Sincronizar Supabase
            </Button>
          </div>
        </div>

        {/* Controles de seleção em massa */}
        {filteredUsers.length > 0 && (
          <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 p-2 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartiallySelected
                      }}
                      className="w-5 h-5 border-2 border-blue-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <div>
                      <CardTitle className="text-base font-semibold text-gray-900">
                        {selectedUsers.length > 0 
                          ? `${selectedUsers.length} usuário(s) selecionado(s)`
                          : 'Selecionar todos os usuários'
                        }
                      </CardTitle>
                      {selectedUsers.length > 0 && (
                        <CardDescription className="text-sm text-gray-600">
                          Clique em "Editar em Massa" para aplicar valores a todos os selecionados
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedUsers.length > 0 && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowBulkEdit(true)}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                      size="lg"
                    >
                      <Edit3 className="h-4 w-4" />
                      Editar em Massa
                    </Button>
                    <Button 
                      onClick={handleReinvest}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Reinvestir
                    </Button>
                    <Button 
                      onClick={handleRenew}
                      className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
                      size="lg"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Renovar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Lista de usuários */}
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-gray-400 mb-4" />
              {searchTerm ? (
                <>
                  <p className="text-lg font-medium text-gray-500">Nenhum usuário encontrado para "{searchTerm}".</p>
                  <p className="text-sm text-gray-400">Tente ajustar o termo de pesquisa.</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium text-gray-500">Nenhum usuário encontrado.</p>
                  <p className="text-sm text-gray-400">Os usuários aparecerão aqui quando estiverem disponíveis.</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onUserUpdate={handleUserUpdate}
                isSelected={selectedUsers.includes(user.id)}
                onSelectionChange={(checked) => handleSelectUser(user.id, checked)}
              />
            ))}
          </div>
        )}

        {/* Modal de edição em massa */}
        <BulkEditModal
          isOpen={showBulkEdit}
          onClose={() => setShowBulkEdit(false)}
          selectedUsers={selectedUsersData}
          onSave={handleBulkEdit}
        />
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}

export default App
