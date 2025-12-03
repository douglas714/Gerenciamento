import { supabase } from './supabase'

// Armazenamento local dos dados dos usuários
let localUsersData = []

/**
 * Buscar todos os usuários da tabela profiles
 * @returns {Promise<{data: Array, error: any}>}
 */
export const getUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Erro ao buscar usuários:', error)
      return { data: null, error }
    }

    // Armazenar dados localmente e garantir que initial_balance esteja definido
    localUsersData = data.map(user => ({
      ...user,
      initial_balance: user.initial_balance || user.balance || 1000
    }))
    
    return { data: localUsersData, error: null }
  } catch (error) {
    console.error('Erro inesperado ao buscar usuários:', error)
    return { data: null, error }
  }
}

/**
 * Atualizar dados de um usuário específico (apenas local)
 * @param {string} userId - ID do usuário
 * @param {Object} updates - Objeto com os novos valores
 * @returns {Promise<{data: any, error: any}>}
 */
export const updateUserLocal = async (userId, updates) => {
  try {
    const userIndex = localUsersData.findIndex(user => user.id === userId)
    
    if (userIndex === -1) {
      return { data: null, error: 'Usuário não encontrado' }
    }

    // Atualizar dados localmente
    const currentUser = localUsersData[userIndex]
    const updatedUser = {
      ...currentUser,
      ...updates,
      updated_at: new Date().toISOString()
    }

    // Se estiver atualizando o lucro mensal, somar com o valor anterior
    if (updates.monthly_profit !== undefined) {
      const currentMonthlyProfit = currentUser.monthly_profit || 0
      const newMonthlyProfit = parseFloat(updates.monthly_profit) || 0
      updatedUser.monthly_profit = currentMonthlyProfit + newMonthlyProfit
      
      // Calcular novo saldo baseado no initial_balance e na porcentagem total
      const initialBalance = currentUser.initial_balance || currentUser.balance || 1000
      // CORREÇÃO APLICADA AQUI: toFixed(2) para garantir 2 casas decimais e parseFloat para manter como número
      updatedUser.balance = parseFloat((initialBalance * (1 + updatedUser.monthly_profit / 100)).toFixed(2))
    }
    
    localUsersData[userIndex] = updatedUser

    return { data: updatedUser, error: null }
  } catch (error) {
    console.error('Erro inesperado ao atualizar usuário:', error)
    return { data: null, error }
  }
}

/**
 * Atualizar dados de múltiplos usuários em massa (apenas local)
 * @param {Array} userIds - Array de IDs dos usuários
 * @param {Object} updates - Objeto com os novos valores a serem aplicados
 * @returns {Promise<{data: Array, error: any}>}
 */
export const updateMultipleUsersLocal = async (userIds, updates) => {
  try {
    const results = []
    const errors = []
    const skippedUsers = []

    for (const userId of userIds) {
      try {
        const userIndex = localUsersData.findIndex(user => user.id === userId)
        
        if (userIndex === -1) {
          errors.push({ userId, error: 'Usuário não encontrado' })
          continue
        }

        const currentUser = localUsersData[userIndex]
        
        // Ignorar usuários com saldo zerado
        if (currentUser.balance === 0 || currentUser.balance === null) {
          skippedUsers.push({ userId, name: currentUser.name, reason: 'Saldo zerado' })
          continue
        }

        const updatedUser = {
          ...currentUser,
          updated_at: new Date().toISOString()
        }

        // Aplicar atualizações apenas se os valores foram fornecidos
        if (updates.monthly_profit !== undefined) {
          const currentMonthlyProfit = currentUser.monthly_profit || 0
          const newMonthlyProfit = parseFloat(updates.monthly_profit) || 0
          updatedUser.monthly_profit = currentMonthlyProfit + newMonthlyProfit
          
          // Calcular novo saldo baseado no initial_balance e na porcentagem total
          const initialBalance = currentUser.initial_balance || currentUser.balance || 1000
          // CORREÇÃO APLICADA AQUI: toFixed(2) para garantir 2 casas decimais e parseFloat para manter como número
          updatedUser.balance = parseFloat((initialBalance * (1 + updatedUser.monthly_profit / 100)).toFixed(2))
        }
        
        // Campo accumulated_profit removido - não é mais utilizado
        
        localUsersData[userIndex] = updatedUser
        results.push(updatedUser)
      } catch (error) {
        errors.push({ userId, error })
      }
    }

    // Log dos usuários ignorados para debug
    if (skippedUsers.length > 0) {
      console.log(`${skippedUsers.length} usuários ignorados por terem saldo zerado:`, skippedUsers)
    }

    if (errors.length > 0) {
      console.error("Erros ao atualizar usuários em massa:", errors)
      return { 
        data: results, 
        error: `Erro ao atualizar ${errors.length} de ${userIds.length} usuários`,
        partialSuccess: results.length > 0,
        skippedUsers
      }
    }

    return { data: results, error: null, skippedUsers }
  } catch (error) {
    console.error("Erro inesperado ao atualizar usuários em massa:", error)
    return { data: null, error }
  }
}

/**
 * Sincronizar dados locais com o Supabase
 * @returns {Promise<{data: Array, error: any}>}
 */
export const syncWithSupabase = async () => {
  try {
    const results = []
    const errors = []

    // Atualizar cada usuário individualmente no Supabase
    for (const user of localUsersData) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            monthly_profit: user.monthly_profit,
            accumulated_profit: user.accumulated_profit,
            balance: user.balance,
            initial_balance: user.initial_balance || user.balance,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()

        if (error) {
          console.error(`Erro ao sincronizar usuário ${user.id}:`, error)
          errors.push({ userId: user.id, error })
        } else {
          results.push(data[0])
        }
      } catch (error) {
        console.error(`Erro inesperado ao sincronizar usuário ${user.id}:`, error)
        errors.push({ userId: user.id, error })
      }
    }

    if (errors.length > 0) {
      console.error("Erros ao sincronizar usuários:", errors)
      return { 
        data: results, 
        error: `Erro ao sincronizar ${errors.length} de ${localUsersData.length} usuários`,
        partialSuccess: results.length > 0
      }
    }

    return { data: results, error: null }
  } catch (error) {
    console.error('Erro inesperado ao sincronizar usuários:', error)
    return { data: null, error }
  }
}

/**
 * Reinvestir usuários selecionados - move o saldo atual para initial_balance e zera a porcentagem
 * @param {Array} userIds - Array de IDs dos usuários
 * @returns {Promise<{data: Array, error: any}>}
 */
export const reinvestUsers = async (userIds) => {
  try {
    const results = []
    const errors = []
    const skippedUsers = []

    for (const userId of userIds) {
      try {
        const userIndex = localUsersData.findIndex(user => user.id === userId)
        
        if (userIndex === -1) {
          errors.push({ userId, error: 'Usuário não encontrado' })
          continue
        }

        const currentUser = localUsersData[userIndex]
        
        // Ignorar usuários com saldo zerado
        if (currentUser.balance === 0 || currentUser.balance === null) {
          skippedUsers.push({ userId, name: currentUser.name, reason: 'Saldo zerado' })
          continue
        }

        // Reinvestir: mover saldo atual para initial_balance e zerar porcentagem
        const updatedUser = {
          ...currentUser,
          initial_balance: currentUser.balance, // Novo saldo inicial é o saldo atual
          monthly_profit: 0, // Zerar porcentagem mensal
          updated_at: new Date().toISOString()
        }
        
        localUsersData[userIndex] = updatedUser
        results.push(updatedUser)
      } catch (error) {
        errors.push({ userId, error })
      }
    }

    if (skippedUsers.length > 0) {
      console.log(`${skippedUsers.length} usuários ignorados por terem saldo zerado:`, skippedUsers)
    }

    if (errors.length > 0) {
      console.error("Erros ao reinvestir usuários:", errors)
      return { 
        data: results, 
        error: `Erro ao reinvestir ${errors.length} de ${userIds.length} usuários`,
        partialSuccess: results.length > 0,
        skippedUsers
      }
    }

    return { data: results, error: null, skippedUsers }
  } catch (error) {
    console.error("Erro inesperado ao reinvestir usuários:", error)
    return { data: null, error }
  }
}

/**
 * Renovar usuários selecionados - zera apenas a porcentagem, mantém o initial_balance
 * @param {Array} userIds - Array de IDs dos usuários
 * @returns {Promise<{data: Array, error: any}>}
 */
export const renewUsers = async (userIds) => {
  try {
    const results = []
    const errors = []
    const skippedUsers = []

    for (const userId of userIds) {
      try {
        const userIndex = localUsersData.findIndex(user => user.id === userId)
        
        if (userIndex === -1) {
          errors.push({ userId, error: 'Usuário não encontrado' })
          continue
        }

        const currentUser = localUsersData[userIndex]
        
        // Ignorar usuários com saldo zerado
        if (currentUser.balance === 0 || currentUser.balance === null) {
          skippedUsers.push({ userId, name: currentUser.name, reason: 'Saldo zerado' })
          continue
        }

        // Renovar: zerar porcentagem mas manter initial_balance
        const updatedUser = {
          ...currentUser,
          monthly_profit: 0, // Zerar porcentagem mensal
          balance: currentUser.initial_balance, // Voltar ao saldo inicial
          updated_at: new Date().toISOString()
        }
        
        localUsersData[userIndex] = updatedUser
        results.push(updatedUser)
      } catch (error) {
        errors.push({ userId, error })
      }
    }

    if (skippedUsers.length > 0) {
      console.log(`${skippedUsers.length} usuários ignorados por terem saldo zerado:`, skippedUsers)
    }

    if (errors.length > 0) {
      console.error("Erros ao renovar usuários:", errors)
      return { 
        data: results, 
        error: `Erro ao renovar ${errors.length} de ${userIds.length} usuários`,
        partialSuccess: results.length > 0,
        skippedUsers
      }
    }

    return { data: results, error: null, skippedUsers }
  } catch (error) {
    console.error("Erro inesperado ao renovar usuários:", error)
    return { data: null, error }
  }
}

/**
 * Obter todos os dados locais dos usuários
 * @returns {Array} Array com todos os dados dos usuários
 */
export const getLocalUsersData = () => {
  return localUsersData
}
