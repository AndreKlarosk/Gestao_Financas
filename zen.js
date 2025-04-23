import { openDB } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
  const db = await openDB();
  const month = new Date().toISOString().slice(0, 7);

  // Saldo
  const [salarios, despesas] = await Promise.all([
    new Promise(res => db.transaction('salary').objectStore('salary').getAll().onsuccess = e => res(e.target.result)),
    new Promise(res => db.transaction('expenses').objectStore('expenses').getAll().onsuccess = e => res(e.target.result))
  ]);
  const totalSalario = salarios.reduce((s, x) => s + x.amount, 0);
  const totalDespesas = despesas.reduce((s, x) => s + x.amount, 0);
  document.getElementById('saldo').textContent = `💰 Saldo Atual: R$ ${(totalSalario - totalDespesas).toFixed(2)}`;

  // Metas
  const [goals, expenses] = await Promise.all([
    new Promise(res => db.transaction('goals').objectStore('goals').getAll().onsuccess = e => res(e.target.result.filter(g => g.month === month))),
    new Promise(res => db.transaction('expenses').objectStore('expenses').getAll().onsuccess = e => res(e.target.result))
  ]);

  const ulMetas = document.getElementById('zen-metas');
  goals.forEach(g => {
    const spent = expenses.filter(e => e.category === g.category && e.date.startsWith(month)).reduce((sum, e) => sum + e.amount, 0);
    const pct = ((spent / g.limit) * 100).toFixed(0);
    const li = document.createElement('li');
    li.textContent = `${g.category}: R$ ${spent.toFixed(2)} / ${g.limit.toFixed(2)} (${pct}%)`;
    ulMetas.appendChild(li);
  });

  // Dicas do Assistente
  const dicas = [];

  if (totalDespesas > totalSalario) {
    dicas.push("⚠️ Suas despesas superaram sua receita.");
  }

  const byCategory = {};
  despesas.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  for (const [cat, val] of Object.entries(byCategory)) {
    if (val > totalSalario * 0.3) {
      dicas.push(`📊 Gastos altos com "${cat}"`);
    }
  }

  const zenDicas = document.getElementById('zen-dicas');
  dicas.forEach(d => {
    const li = document.createElement('li');
    li.textContent = d;
    zenDicas.appendChild(li);
  });
});
