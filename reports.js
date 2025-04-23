import { openDB } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
  const db = await openDB();

  const salaryTx = db.transaction('salary', 'readonly');
  const salaryStore = salaryTx.objectStore('salary');
  const salaryReq = salaryStore.getAll();

  salaryReq.onsuccess = () => {
    const salaries = salaryReq.result;

    const expensesTx = db.transaction('expenses', 'readonly');
    const expensesStore = expensesTx.objectStore('expenses');
    const expensesReq = expensesStore.getAll();

    expensesReq.onsuccess = () => {
      const expenses = expensesReq.result;

      const months = {};
      salaries.forEach(s => {
        const m = s.date.slice(0, 7); // YYYY-MM
        months[m] = months[m] || { receita: 0, despesa: 0 };
        months[m].receita += s.amount;
      });

      expenses.forEach(e => {
        const m = e.date.slice(0, 7);
        months[m] = months[m] || { receita: 0, despesa: 0 };
        months[m].despesa += e.amount;
      });

      const sortedKeys = Object.keys(months).sort();
      const receitas = sortedKeys.map(k => months[k].receita);
      const despesas = sortedKeys.map(k => months[k].despesa);

      const ctx = document.getElementById('monthly-chart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: sortedKeys,
          datasets: [
            {
              label: 'Receita',
              data: receitas,
              borderColor: '#4caf50',
              backgroundColor: '#c8e6c9',
              tension: 0.2
            },
            {
              label: 'Despesa',
              data: despesas,
              borderColor: '#f44336',
              backgroundColor: '#ffcdd2',
              tension: 0.2
            }
          ]
        }
      });

      document.getElementById('export-btn').addEventListener('click', () => {
        const csv = ['Mes,Receita,Despesa'];
        sortedKeys.forEach(m => {
          csv.push(`${m},${months[m].receita},${months[m].despesa}`);
        });

        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'relatorio_financeapp.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
    };
  };
});
