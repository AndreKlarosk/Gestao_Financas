import { openDB } from './db.js';

let db;

document.addEventListener('DOMContentLoaded', async () => {
  db = await openDB();

  const list = document.getElementById('reminder-list');
  const modal = document.getElementById('reminder-modal');
  const form = document.getElementById('reminder-form');
  const btnAdd = document.getElementById('add-reminder-btn');
  const btnCancel = document.getElementById('cancel-reminder');

  // Permissão de notificação
  if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
  }

  btnAdd.addEventListener('click', () => {
    form.reset();
    document.getElementById('reminder-id').value = '';
    modal.style.display = 'block';
  });

  btnCancel.addEventListener('click', () => modal.style.display = 'none');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('reminder-id').value;
    const title = document.getElementById('reminder-title').value;
    const dueDate = document.getElementById('reminder-date').value;

    const tx = db.transaction('reminders', 'readwrite');
    const store = tx.objectStore('reminders');

    if (id) {
      store.put({ id: Number(id), title, dueDate });
    } else {
      store.add({ title, dueDate });
    }

    modal.style.display = 'none';
    await loadReminders();
  });

  list.addEventListener('click', async (e) => {
    const id = Number(e.target.dataset.id);
    const action = e.target.dataset.action;

    if (action === 'edit') {
      const tx = db.transaction('reminders', 'readonly');
      const store = tx.objectStore('reminders');
      const req = store.get(id);

      req.onsuccess = () => {
        const rem = req.result;
        document.getElementById('reminder-id').value = rem.id;
        document.getElementById('reminder-title').value = rem.title;
        document.getElementById('reminder-date').value = rem.dueDate;
        modal.style.display = 'block';
      };
    }

    if (action === 'delete') {
      const tx = db.transaction('reminders', 'readwrite');
      const store = tx.objectStore('reminders');
      store.delete(id);
      await loadReminders();
    }
  });

  async function loadReminders() {
    list.innerHTML = '';
    const tx = db.transaction('reminders', 'readonly');
    const store = tx.objectStore('reminders');
    const req = store.getAll();

    req.onsuccess = () => {
      const now = new Date();
      req.result.forEach(rem => {
        const due = new Date(rem.dueDate);
        const diffDays = (due - now) / (1000 * 60 * 60 * 24);

        const li = document.createElement('li');
        li.innerHTML = `
          ${rem.title} - ${new Date(rem.dueDate).toLocaleDateString()}
          ${diffDays < 3 ? '<strong style="color:red">⚠️</strong>' : ''}
          <button data-id="${rem.id}" data-action="edit">✏️</button>
          <button data-id="${rem.id}" data-action="delete">🗑️</button>
        `;
        list.appendChild(li);

        // Notificação nativa
        if (diffDays >= 0 && diffDays <= 1 && Notification.permission === 'granted') {
          new Notification("Lembrete FinanceApp", {
            body: `Vencimento em breve: ${rem.title}`,
            icon: '/assets/icons/bell.svg' // opcional
          });
        }
      });
    };
  }

  loadReminders();
});
