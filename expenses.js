import { openDB, logAction } from './db.js';

let db;

document.addEventListener('DOMContentLoaded', async () => {
  db = await openDB();

  const list = document.getElementById('expense-list');
  const modal = document.getElementById('expense-modal');
  const form = document.getElementById('expense-form');
  const btnAdd = document.getElementById('add-expense-btn');
  const btnCancel = document.getElementById('cancel-expense');
  const filterSelect = document.getElementById('category-filter');

  const catTx = db.transaction('categories', 'readonly');
  const catStore = catTx.objectStore('categories');
  const catReq = catStore.getAll();

  catReq.onsuccess = () => {
    const select = document.getElementById('expense-category');
    const filter = document.getElementById('category-filter');
    catReq.result.forEach(cat => {
      const option = new Option(cat.name, cat.name);
      select.appendChild(option.cloneNode(true));
      filter.appendChild(option.cloneNode(true));
    });
  };

  btnAdd.addEventListener('click', () => {
    form.reset();
    document.getElementById('expense-id').value = '';
    modal.style.display = 'block';
  });

  btnCancel.addEventListener('click', () => modal.style.display = 'none');
  filterSelect.addEventListener('change', () => loadExpenses());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('expense-id').value;
    const desc = document.getElementById('expense-desc').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const date = document.getElementById('expense-date').value;
    const category = document.getElementById('expense-category').value;
    const recurrence = document.getElementById('expense-recurrence').value;
    const status = 'pendente';

    const tx = db.transaction('expenses', 'readwrite');
    const store = tx.objectStore('expenses');

    if (id) {
      store.put({ id: Number(id), desc, amount, date, category, recurrence, status });
      logAction("despesa", "editada", `${desc} - R$ ${amount}`);
    } else {
      store.add({ desc, amount, date, category, recurrence, status });
      logAction("despesa", "adicionada", `${desc} - R$ ${amount}`);
    }

    modal.style.display = 'none';
    await loadExpenses();
  });

  list.addEventListener('click', async (e) => {
    const id = Number(e.target.dataset.id);
    const action = e.target.dataset.action;

    if (action === 'edit') {
      const tx = db.transaction('expenses', 'readonly');
      const store = tx.objectStore('expenses');
      const req = store.get(id);

      req.onsuccess = () => {
        const exp = req.result;
        document.getElementById('expense-id').value = exp.id;
        document.getElementById('expense-desc').value = exp.desc;
        document.getElementById('expense-amount').value = exp.amount;
        document.getElementById('expense-date').value = exp.date;
        document.getElementById('expense-category').value = exp.category;
        document.getElementById('expense-recurrence').value = exp.recurrence || 'nenhuma';
        modal.style.display = 'block';
      };
    }

    if (action === 'delete') {
      const tx = db.transaction('expenses', 'readwrite');
      const store = tx.objectStore('expenses');
      store.delete(id);
      logAction("despesa", "removida", `ID ${id}`);
      await loadExpenses();
    }
  });

  async function loadExpenses() {
    list.innerHTML = '';
    const filter = filterSelect.value;
    const tx = db.transaction('expenses', 'readonly');
    const store = tx.objectStore('expenses');
    const req = store.getAll();

    req.onsuccess = () => {
      const results = filter ? req.result.filter(e => e.category === filter) : req.result;
      results.forEach(exp => {
        const li = document.createElement('li');
        li.innerHTML = `
          <strong>${exp.desc}</strong> - R$ ${exp.amount.toFixed(2)} - ${exp.date} - ${exp.category} 
          ${exp.recurrence !== 'nenhuma' ? ` 🔁 ${exp.recurrence}` : ''}
          <button data-id="${exp.id}" data-action="edit">✏️</button>
          <button data-id="${exp.id}" data-action="delete">🗑️</button>
        `;
        list.appendChild(li);
      });
    };
  }

  async function processRecurringExpenses() {
    const tx = db.transaction('expenses', 'readwrite');
    const store = tx.objectStore('expenses');
    const req = store.getAll();

    req.onsuccess = () => {
      const now = new Date();
      const thisMonth = now.toISOString().slice(0, 7);

      req.result.forEach(exp => {
        if (exp.recurrence && exp.recurrence !== "nenhuma") {
          const lastDate = new Date(exp.date);
          const lastMonth = exp.date.slice(0, 7);

          if (lastMonth !== thisMonth) {
            const alreadyExists = req.result.some(e =>
              e.desc === exp.desc &&
              e.recurrence === exp.recurrence &&
              e.date.slice(0, 7) === thisMonth
            );

            if (!alreadyExists) {
              let nextDate = new Date(lastDate);
              if (exp.recurrence === "mensal") nextDate.setMonth(nextDate.getMonth() + 1);
              if (exp.recurrence === "semanal") nextDate.setDate(nextDate.getDate() + 7);

              store.add({
                ...exp,
                id: undefined,
                date: nextDate.toISOString().slice(0, 10),
                status: "pendente"
              });

              logAction("despesa", "recorrente gerada", `${exp.desc} para ${nextDate.toLocaleDateString()}`);
            }
          }
        }
      });
    };
  }

  await processRecurringExpenses();
  await loadExpenses();
});
