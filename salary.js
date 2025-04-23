import { openDB, logAction } from './db.js';

let db;

document.addEventListener('DOMContentLoaded', async () => {
  db = await openDB();

  const list = document.getElementById('salary-list');
  const modal = document.getElementById('salary-modal');
  const form = document.getElementById('salary-form');
  const btnAdd = document.getElementById('add-salary-btn');
  const cancelBtn = document.getElementById('cancel-modal');

  btnAdd.addEventListener('click', () => {
    form.reset();
    document.getElementById('salary-id').value = '';
    modal.style.display = 'block';
  });

  cancelBtn.addEventListener('click', () => modal.style.display = 'none');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('salary-id').value;
    const amount = parseFloat(document.getElementById('salary-amount').value);
    const date = document.getElementById('salary-date').value;

    if (!amount || !date) {
      alert("Preencha todos os campos corretamente.");
      return;
    }

    const tx = db.transaction('salary', 'readwrite');
    const store = tx.objectStore('salary');

    const record = { amount, date };

    if (id) {
      record.id = Number(id);
      store.put(record);
      logAction("salário", "editado", `R$ ${amount} (${date})`);
    } else {
      store.add(record);
      logAction("salário", "adicionado", `R$ ${amount} (${date})`);
    }

    tx.oncomplete = () => {
      modal.style.display = 'none';
      loadSalaries();
    };

    tx.onerror = () => {
      alert("Erro ao salvar salário. Verifique os dados.");
    };
  });

  list.addEventListener('click', async (e) => {
    const id = Number(e.target.dataset.id);
    const action = e.target.dataset.action;

    if (action === 'edit') {
      const tx = db.transaction('salary', 'readonly');
      const store = tx.objectStore('salary');
      const req = store.get(id);

      req.onsuccess = () => {
        const item = req.result;
        document.getElementById('salary-id').value = item.id;
        document.getElementById('salary-amount').value = item.amount;
        document.getElementById('salary-date').value = item.date;
        modal.style.display = 'block';
      };
    }

    if (action === 'delete') {
      const tx = db.transaction('salary', 'readwrite');
      const store = tx.objectStore('salary');
      store.delete(id);
      logAction("salário", "removido", `ID ${id}`);
      await loadSalaries();
    }
  });

  async function loadSalaries() {
    list.innerHTML = '';
    const tx = db.transaction('salary', 'readonly');
    const store = tx.objectStore('salary');
    const req = store.getAll();

    req.onsuccess = () => {
      req.result.forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = `
          <strong>R$ ${s.amount.toFixed(2)}</strong> - ${s.date}
          <button data-id="${s.id}" data-action="edit">✏️</button>
          <button data-id="${s.id}" data-action="delete">🗑️</button>
        `;
        list.appendChild(li);
      });
    };
  }

  loadSalaries();
});
