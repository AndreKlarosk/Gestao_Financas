import { openDB } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
  const db = await openDB();

  // Tema
  const toggleBtn = document.getElementById('toggle-theme');
  toggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  // Senha
  const passForm = document.getElementById('password-form');
  const passMsg = document.getElementById('pass-msg');

  passForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPass = document.getElementById('old-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-pass').value;

    if (newPass !== confirmPass) {
      passMsg.textContent = "Senhas não coincidem.";
      passMsg.style.display = 'block';
      return;
    }

    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const req = store.getAll();

    req.onsuccess = () => {
      const user = req.result.find(u => u.username === 'andre.leao' && u.password === oldPass);
      if (!user) {
        passMsg.textContent = "Senha atual incorreta.";
        passMsg.style.display = 'block';
        return;
      }

      user.password = newPass;
      store.put(user);
      passMsg.style.color = 'green';
      passMsg.textContent = "Senha alterada com sucesso.";
      passMsg.style.display = 'block';
    };
  });

  // Backup
  document.getElementById('export-db').addEventListener('click', async () => {
    const backup = {};
    const stores = ['users', 'salary', 'expenses', 'categories', 'reminders', 'reports'];

    for (const name of stores) {
      const tx = db.transaction(name, 'readonly');
      const store = tx.objectStore(name);
      const req = store.getAll();

      backup[name] = await new Promise(resolve => {
        req.onsuccess = () => resolve(req.result);
      });
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financeapp-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Restore
  document.getElementById('import-db').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const data = JSON.parse(text);
    const stores = Object.keys(data);

    for (const name of stores) {
      const tx = db.transaction(name, 'readwrite');
      const store = tx.objectStore(name);
      for (const record of data[name]) {
        store.put(record);
      }
    }

    alert("Backup restaurado com sucesso!");
  });

  // Reset
  document.getElementById('reset-db').addEventListener('click', () => {
    if (confirm("Tem certeza que deseja apagar todos os dados? Essa ação é irreversível!")) {
      indexedDB.deleteDatabase('FinanceApp');
      alert("Todos os dados foram apagados. Recarregue a página.");
      location.reload();
    }
  });

  // Tema persistente
  const theme = localStorage.getItem('theme');
  if (theme) document.documentElement.setAttribute('data-theme', theme);
});
