# Análise do Sistema de Gerenciamento de Investimentos

## Estrutura Atual

### Dados no Supabase (tabela `profiles`)
- `id`: ID do usuário
- `name`: Nome do usuário
- `email`: Email do usuário
- `balance`: Saldo atual
- `initial_balance`: Saldo inicial (base para cálculos)
- `monthly_profit`: Lucro mensal em porcentagem (%)
- `accumulated_profit`: Lucro acumulado em porcentagem (%)
- `updated_at`: Data de atualização

### Lógica Atual de Cálculo
1. **Saldo (balance)** = initial_balance × (1 + monthly_profit / 100)
2. **Lucro Mensal** = Porcentagem aplicada sobre o saldo inicial
3. **Lucro Acumulado** = Campo separado que armazena porcentagem acumulada

## Problema Identificado

O sistema atualmente mostra apenas **porcentagens** (monthly_profit e accumulated_profit), mas não mostra:
- **Valor absoluto do rendimento** (ex: R$ 1.000,00 de lucro)
- **Rentabilidade clara** do mês

## Exemplo do Cliente
- Saldo inicial: R$ 10.000,00
- Rentabilidade: 10%
- Rendimento esperado: R$ 1.000,00
- Saldo final: R$ 11.000,00

## Solução Proposta

### 1. Substituir "Lucro Acumulado (%)" por "Lucro do Mês (R$)"
- Calcular: `lucro_mes_reais = initial_balance × (monthly_profit / 100)`
- Exibir em formato monetário (R$)

### 2. Adicionar campo de "Rendimento Total (R$)"
- Calcular: `rendimento_total = balance - initial_balance`
- Mostra quanto a pessoa ganhou em reais desde o início

### 3. Manter "Lucro Mensal (%)" como está
- Continua mostrando a porcentagem de rentabilidade

## Alterações Necessárias

### Arquivo: `UserCard.jsx`
- Substituir o terceiro campo "Lucro Acumulado (%)" por "Lucro do Mês (R$)"
- Adicionar cálculo: `const lucroMesReais = (user.initial_balance || user.balance) * ((user.monthly_profit || 0) / 100)`
- Formatar como moeda brasileira

### Arquivo: `BulkEditModal.jsx`
- Verificar se há referências a accumulated_profit
- Ajustar interface se necessário

### Arquivo: `userService.js`
- Manter a lógica de cálculo do balance
- Remover ou depreciar accumulated_profit se não for mais usado

## Campos Finais no Card do Usuário

1. **Saldo** (R$) - Saldo atual total
2. **Lucro Mensal (%)** - Porcentagem de rentabilidade
3. **Lucro do Mês (R$)** - Valor em reais do rendimento mensal

## Cálculos
```javascript
// Saldo inicial (base)
const initialBalance = user.initial_balance || user.balance || 1000

// Lucro mensal em porcentagem
const monthlyProfitPercent = user.monthly_profit || 0

// Lucro do mês em reais
const lucroMesReais = initialBalance * (monthlyProfitPercent / 100)

// Saldo atual
const balance = initialBalance * (1 + monthlyProfitPercent / 100)
// OU
const balance = initialBalance + lucroMesReais
```
