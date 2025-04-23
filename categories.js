import { openDB } from './db.js';

let db;

document.addEventListener('DOMContentLoaded', async () => {
  db = await openDB();

  const list = document.getElementById('category-list');
  const modal = document.getElementById('category-modal');
  const form = document.getElementById('category-form');
  const btnAdd = document.getElementById('add-category-btn');
  const btnCancel = document.getElementById('cancel-category');

  btnAdd.addEventListener('click', () => {
    form.reset();
    document.getElementById('category-id').value = '';
    modal.style.display = 'block';
  });

  btnCancel.addEventListener('click', () => modal.style.display = 'none');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('category-id').value;
    const name = document.getElementById('category-name').value;
    const color = document.getElementById('category-color').value;

    const tx = db.transaction('categories', 'readwrite');
    const store = tx.objectStore('categories');

    if (id) {
      store.put({ id: Number(id), name, color });
    } else {
      store.add({ name, color });
    }

    modal.style.display = 'none';
    await loadCategories();
  });

  list.addEventListener('click', async (e) => {
    const id = Number(e.target.dataset.id);
    const action = e.target.dataset.action;

    if (action === 'edit') {
      const tx = db.transaction('categories', 'readonly');
      const store = tx.objectStore('categories');
      const req = store.get(id);

      req.onsuccess = () => {
        const cat = req.result;
        document.getElementById('category-id').value = cat.id;
        document.getElementById('category-name').value = cat.name;
        document.getElementById('category-color').value = cat.color;
        modal.style.display = 'block';
      };
    }

    if (action === 'delete') {
      const tx = db.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');
      store.delete(id);
      await loadCategories();
    }
  });

  async function loadCategories() {
    list.innerHTML = '';
    const tx = db.transaction('categories', 'readonly');
    const store = tx.objectStore('categories');
    const req = store.getAll();

    req.onsuccess = () => {
      req.result.forEach(cat => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span style="background:${cat.color}; padding: 0 10px;">⬤</span> ${cat.name}
          <button data-id="${cat.id}" data-action="edit">✏️</button>
          <button data-id="${cat.id}" data-action="delete">🗑️</button>
        `;
        list.appendChild(li);
      });
    };
  }

  loadCategories();
});
