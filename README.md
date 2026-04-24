# Finance Control Dashboard

Aplicativo web completo para gerenciamento financeiro pessoal com controle mensal de ganhos, despesas e parcelamentos automáticos.

## Tecnologias

- React + TypeScript
- Vite
- Tailwind CSS
- Recharts
- LocalStorage
- Estrutura de dados preparada para futura integração com Supabase

## Funcionalidades implementadas

- Dashboard com cards de ganhos, gastos, saldo e parcelas futuras comprometidas.
- Indicador visual de saldo (verde, vermelho e amarelo).
- Gráfico de barras (ganhos x gastos por mês).
- Gráfico de linha (evolução do saldo mensal).
- Top despesas do mês.
- Agrupamento de gastos por categoria.
- Navegação por mês e ano (incluindo anos futuros para parcelamentos).
- Cadastro de ganhos com validações.
- Cadastro de despesas com parcelamento automático e geração de parcelas em meses/anos seguintes.
- Tabela mensal com edição, exclusão, alternância de status e identificação de parcela atual.
- Resumo mensal completo (previsto, realizado e pendente).
- Filtros por categoria, mês, ano, busca por descrição.
- Exportação para CSV.
- Botão para limpar todos os dados com confirmação.
- Persistência em LocalStorage.
- Interface responsiva para desktop/tablet/celular.

## Estrutura de dados

- `Income` para ganhos
- `Expense` para despesas parceladas (cada parcela vira um lançamento)
- `AppData` com entradas, categorias e configurações

## Como rodar

```bash
npm install
npm run dev
```

## Observações

- Importação CSV foi deixada preparada na estrutura, com exportação já funcional.
- A persistência atual é local (LocalStorage). A organização do código permite evoluir para Supabase futuramente.
