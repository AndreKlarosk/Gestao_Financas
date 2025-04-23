const DB_NAME = 'FinanceApp';
const DB_VERSION = 1;
let db;

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject('Erro ao abrir IndexedDB');
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;

      const stores = ['users', 'salary', 'expenses', 'categories', 'reminders', 'reports', 'goals'];
      stores.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });

          if (storeName === 'users') {
            store.createIndex('username', 'username', { unique: true });
          }
        }
      });
    };
  });
}

export function addRecord(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.add(data);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Erro ao adicionar registro');
  });
}
export function logAction(type, action, text) {
  const timestamp = new Date().toISOString();
  const tx = db.transaction('logs', 'readwrite');
  const store = tx.objectStore('logs');
  store.add({ type, action, text, timestamp });
}
