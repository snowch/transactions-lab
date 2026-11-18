import { PGlite } from '@electric-sql/pglite';
import wasmUrl from './engine/pglite.wasm?url';
import initdbUrl from './engine/initdb.wasm?url';
import dataUrl from './engine/pglite.data?url';
import seed from './seed.sql?raw';

let db;
self.onmessage = async ({data}) => {
  try {
    if (data.type === 'init') {
      const [wasmModule, initdbWasmModule, fsBundle] = await Promise.all([
        fetch(wasmUrl).then(r => r.arrayBuffer()).then(WebAssembly.compile),
        fetch(initdbUrl).then(r => r.arrayBuffer()).then(WebAssembly.compile),
        fetch(dataUrl).then(r => r.blob()),
      ]);
      db = await PGlite.create({wasmModule, initdbWasmModule, fsBundle});
      await db.exec(seed);
      const result = await db.query('SELECT version() AS version');
      self.postMessage({type: 'ready', version: result.rows[0].version});
    } else if (data.type === 'exec') {
      const results = await db.exec(data.sql);
      // PostgreSQL executes the whole cell. Only the display is limited to 100 rows.
      self.postMessage({type: 'result', results: results.map(r => ({...r, rows: r.rows.slice(0, 100), totalRows: r.rows.length}))});
    }
  } catch (error) {
    let rolledBack = false;
    if (data.type === 'exec' && db?.isInTransaction()) {
      try { await db.exec('ROLLBACK'); rolledBack = true; } catch {}
    }
    self.postMessage({type: 'error', message: error.message, rolledBack});
  }
};
