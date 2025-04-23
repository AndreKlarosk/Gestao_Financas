import { openDB } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
  const db = await openDB();

  // Calcular saldo
  const salaryTx = db.transaction('salary', 'readonly');
  const salaryStore = salaryTx.objectStore('salary');
  const salaryReq = salaryStore.getAll();

  salaryReq.onsuccess = () => {
    const salaries = salaryReq.result;
    const totalSalary = salaries.reduce((sum, s) => sum + s.amount, 0);

    const expensesTx = db.transaction('expenses', 'readonly');
    const expensesStore = expensesTx.objectStore('expenses');
    const expensesReq = expensesStore.getAll();

    expensesReq.onsuccess = () => {
      const expenses = expensesReq.result;
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const balance = totalSalary - totalExpenses;

      document.getElementById('balance').textContent = `R$ ${balance.toFixed(2)}`;

      // Gráfico resumo
      const ctx = document.getElementById('chart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Receita', 'Despesa'],
          datasets: [{
            label: 'Resumo',
            data: [totalSalary, totalExpenses],
            backgroundColor: ['#4caf50', '#f44336']
          }]
        }
      });
    };
  };

  // Próximos vencimentos
  const remindersTx = db.transaction('reminders', 'readonly');
  const remindersStore = remindersTx.objectStore('reminders');
  const remindersReq = remindersStore.getAll();

  remindersReq.onsuccess = () => {
    const reminders = remindersReq.result;
    const now = new Date();
    const upcoming = reminders.filter(r => {
      const dueDate = new Date(r.dueDate);
      const diff = (dueDate - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    });

    const list = document.getElementById('reminders-list');
    upcoming.forEach(r => {
      const li = document.createElement('li');
      li.textContent = `${r.title} - vence em ${new Date(r.dueDate).toLocaleDateString()}`;
      list.appendChild(li);
    });
  };
});
function showInsights(insights) {
  const ul = document.getElementById("ai-insights");
  ul.innerHTML = '';
  insights.forEach(msg => {
    const li = document.createElement("li");
    li.textContent = msg;
    li.style.marginBottom = "0.5rem";
    ul.appendChild(li);
  });
}

async function runFinanceAI() {
  const db = await openDB();
  const txS = db.transaction('salary', 'readonly');
  const txE = db.transaction('expenses', 'readonly');

  const salaries = await new Promise(res => txS.objectStore('salary').getAll().onsuccess = e => res(e.target.result));
  const expenses = await new Promise(res => txE.objectStore('expenses').getAll().onsuccess = e => res(e.target.result));

  const insights = [];

  const totalSalary = salaries.reduce((s, x) => s + x.amount, 0);
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);

  if (totalExpenses > totalSalary) {
    insights.push("⚠️ Suas despesas superaram sua receita. Considere cortar alguns gastos.");
  }

  // Agrupa por categoria
  const byCategory = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  for (const [cat, val] of Object.entries(byCategory)) {
    if (val > totalSalary * 0.3) {
      insights.push(`📊 Você gastou muito com "${cat}" (mais de 30% da receita).`);
    }
  }

  // Simples detecção de tendência
  const months = {};
  expenses.forEach(e => {
    const m = e.date?.slice(0, 7);
    if (!m) return;
    months[m] = months[m] || 0;
    months[m] += e.amount;
  });

  const keys = Object.keys(months).sort();
  if (keys.length >= 2) {
    const [penultimo, ultimo] = keys.slice(-2);
    if (months[ultimo] > months[penultimo] * 1.2) {
      insights.push("📈 Seus gastos aumentaram mais de 20% em relação ao mês passado.");
    }
  }

  showInsights(insights);
}

runFinanceAI();
async function loadGoalsProgress() {
  const db = await openDB();
  const month = new Date().toISOString().slice(0, 7);

  const tx = db.transaction(['goals', 'expenses'], 'readonly');
  const goalsStore = tx.objectStore('goals');
  const expensesStore = tx.objectStore('expenses');

  const [goals, expenses] = await Promise.all([
    new Promise(res => goalsStore.getAll().onsuccess = e => res(e.target.result.filter(g => g.month === month))),
    new Promise(res => expensesStore.getAll().onsuccess = e => res(e.target.result))
  ]);

  const list = document.getElementById('goals-progress-list');
  list.innerHTML = '';

  goals.forEach(g => {
    const total = expenses
      .filter(e => e.category === g.category && e.date.startsWith(month))
      .reduce((sum, e) => sum + e.amount, 0);
    
    const percent = ((total / g.limit) * 100).toFixed(0);
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${g.category}</strong>: R$ ${total.toFixed(2)} / R$ ${g.limit.toFixed(2)} 
      <span style="color:${percent >= 100 ? 'red' : percent >= 80 ? 'orange' : 'green'}"> (${percent}%)</span>
    `;
    list.appendChild(li);
  });
}

loadGoalsProgress();
