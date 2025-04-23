import { openDB, addRecord } from './db.js';

const defaultUser = {
  username: 'andre.leao',
  password: '3231'
};

document.addEventListener('DOMContentLoaded', async () => {
  // ⚠️ Remova após primeira execução se necessário:
  // indexedDB.deleteDatabase('FinanceApp');

  const db = await openDB();

  if (!db.objectStoreNames.contains('users')) {
    console.error('Store "users" não foi criado corretamente.');
    return;
  }

  // Garante usuário padrão
  const txCheck = db.transaction('users', 'readonly');
  const storeCheck = txCheck.objectStore('users');
  const getUsers = storeCheck.getAll();

  getUsers.onsuccess = async () => {
    if (!getUsers.result.some(u => u.username === defaultUser.username)) {
      await addRecord('users', defaultUser);
    }
  };

  // Submete login
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const req = store.getAll();

    req.onsuccess = () => {
      const users = req.result;
      const validUser = users.find(u => u.username === username && u.password === password);

      if (validUser) {
        console.log("Login bem-sucedido, redirecionando...");
        window.location.href = 'dashboard.html';
      } else {
        document.getElementById('login-error').style.display = 'block';
      }
    };
  });
});
