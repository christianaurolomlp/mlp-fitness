// Adaptador SQLite que imita la interfaz de pg para desarrollo local
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../../local.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Convierte $1, $2... a ? para SQLite
const toSQLite = (sql) => sql.replace(/\$\d+/g, '?');

// SQLite no acepta booleanos JS — convierte a 0/1
const normalizeParams = (params) =>
  params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p));

const query = async (sql, params = []) => {
  const converted = toSQLite(sql);
  params = normalizeParams(params);
  const needsRows = /^\s*(SELECT|WITH|RETURNING)/i.test(converted) || /RETURNING/i.test(converted);
  try {
    const stmt = db.prepare(converted);
    if (needsRows) {
      const rows = stmt.all(...params);
      return { rows };
    } else {
      const info = stmt.run(...params);
      return { rows: [], rowCount: info.changes };
    }
  } catch (err) {
    throw new Error(`SQLite error: ${err.message}\nSQL: ${converted}`);
  }
};

// Simula pool.connect() con soporte de transacciones
const connect = async () => {
  return {
    query,
    release: () => {},
  };
};

module.exports = { query, connect };
