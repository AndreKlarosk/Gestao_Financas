import { openDB, logAction } from './db.js';

let db;

document.addEventListener('DOMContentLoaded', async () => {
  db = await openDB();

  const list = document.getElementById('goal-list');
  const modal = document.getElementById('goal-modal');
  const form = document.getElementById('goal-form');
  const btnAdd = document.getElementById('add-goal-btn');
  const btnCancel = document.getElementById('cancel-goal');

  const catTx = db.transaction('categories', 'readonly');
  const catStore = catTx.objectStore('categories');
  const catReq = catStore.getAll();

  catReq.onsuccess = () => {
    const select = document.getElementById('goal-category');
    catReq.result.forEach(cat => {
      const option = new Option(cat.name, cat.name);
      select.appendChild(option);
    });
  };

  btnAdd.addEventListener('click', () => {
    form.reset();
    document.getElementById('goal-id').value = '';
    modal.style.display = 'block';
  });

  btnCancel.addEventListener('click', () => modal.style.display = 'none');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('goal-id').value;
    const category = document.getElementById('goal-category').value;
    const limit = parseFloat(document.getElementById('goal-limit').value);
    const month = new Date().toISOString().slice(0, 7);

    const tx = db.transaction('goals', 'readwrite');
    const store = tx.objectStore('goals');

    if (id) {
      store.put({ id: Number(id), category, limit, month });
      logAction("meta", "editada", `${category} - R$ ${limit}`);
    } else {
      store.add({ category, limit, month });
      logAction("meta", "adicionada", `${category} - R$ ${limit}`);
    }

    modal.style.display = 'none';
    await loadGoals();
  });

  list.addEventListener('click', async (e) => {
    const id = Number(e.target.dataset.id);
    const action = e.target.dataset.action;

    if (action === 'edit') {
      const tx = db.transaction('goals', 'readonly');
      const store = tx.objectStore('goals');
      const req = store.get(id);

      req.onsuccess = () => {
        const goal = req.result;
        document.getElementById('goal-id').value = goal.id;
        document.getElementById('goal-category').value = goal.category;
        document.getElementById('goal-limit').value = goal.limit;
        modal.style.display = 'block';
      };
    }

    if (action === 'delete') {
      const tx = db.transaction('goals', 'readwrite');
      const store = tx.objectStore('goals');
      store.delete(id);
      logAction("meta", "removida", `ID ${id}`);
      await loadGoals();
    }
  });

  async function loadGoals() {
    list.innerHTML = '';
    const month = new Date().toISOString().slice(0, 7);
    const tx = db.transaction(['goals', 'expenses'], 'readonly');
    const goalStore = tx.objectStore('goals');
    const expenseStore = tx.objectStore('expenses');

    const [goals, expenses] = await Promise.all([
      new Promise(res => goalStore.getAll().onsuccess = e => res(e.target.result.filter(g => g.month === month))),
      new Promise(res => expenseStore.getAll().onsuccess = e => res(e.target.result))
    ]);

    goals.forEach(g => {
      const spent = expenses.filter(e => e.category === g.category && e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0);
      const percent = ((spent / g.limit) * 100).toFixed(0);
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${g.category}</strong>: R$ ${spent.toFixed(2)} / ${g.limit.toFixed(2)} 
        (${percent}%) <span style="color:${percent >= 100 ? 'red' : percent >= 80 ? 'orange' : 'green'}">●</span>
        <button data-id="${g.id}" data-action="edit">✏️</button>
        <button data-id="${g.id}" data-action="delete">🗑️</button>
      `;
      list.appendChild(li);
    });
  }

  loadGoals();
});
