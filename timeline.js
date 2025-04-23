import { openDB } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
  const db = await openDB();
  const list = document.getElementById('log-list');

  const tx = db.transaction('logs', 'readonly');
  const store = tx.objectStore('logs');
  const req = store.getAll();

  req.onsuccess = () => {
    const logs = req.result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    logs.forEach(log => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>[${log.type.toUpperCase()}]</strong> ${log.action} - ${log.text} 
        <small style="color:#aaa">(${new Date(log.timestamp).toLocaleString()})</small>
      `;
      list.appendChild(li);
    });
  };

  document.getElementById('clear-logs').addEventListener('click', () => {
    if (confirm("Tem certeza que deseja apagar todo o histórico?")) {
      const tx = db.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      store.clear();
      list.innerHTML = '';
    }
  });
});
