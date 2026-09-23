/**
 * Worker bodies, kept as source strings and instantiated from blob URLs.
 *
 * Why classic blob workers rather than Vite's `new Worker(new URL(...))`:
 * Pyodide and sql.js both ship UMD bundles that need `importScripts`, which is
 * unavailable in module workers. A blob worker also guarantees the learner's
 * code never touches the page — no DOM, no localStorage, no cookies — and can
 * be killed outright when it loops forever.
 */

export const PYODIDE_VERSION = '0.29.5';
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
export const SQLJS_VERSION = '1.14.2';
export const SQLJS_BASE = `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/`;

/* ------------------------------------------------------------------ */
/* Python — Pyodide                                                    */
/* ------------------------------------------------------------------ */

export const PYTHON_WORKER = String.raw`
let ready = null;

function init(indexURL) {
  if (!ready) {
    ready = (async () => {
      importScripts(indexURL + 'pyodide.js');
      const pyodide = await loadPyodide({ indexURL });
      return pyodide;
    })();
  }
  return ready;
}

self.onmessage = async (e) => {
  const { code, tests, indexURL } = e.data;
  let output = '';

  let pyodide;
  try {
    pyodide = await init(indexURL);
  } catch (err) {
    self.postMessage({ type: 'result', runtimeUnavailable: true, error: String(err && err.message || err), output: '', tests: [] });
    return;
  }
  self.postMessage({ type: 'ready' });

  const collect = (s) => { output += s + '\n'; };
  try { pyodide.setStdout({ batched: collect }); pyodide.setStderr({ batched: collect }); } catch (_) {}

  // A fresh namespace per run: previous definitions must never leak in and
  // make a broken solution look like it passes.
  let ns;
  try {
    ns = pyodide.globals.get('dict')();
  } catch (err) {
    self.postMessage({ type: 'result', error: String(err), output, tests: [] });
    return;
  }

  try {
    await pyodide.runPythonAsync(code, { globals: ns });
  } catch (err) {
    self.postMessage({ type: 'result', error: formatPyError(err), output, tests: [] });
    try { ns.destroy(); } catch (_) {}
    return;
  }

  const results = [];
  for (const t of tests) {
    try {
      const src = '__sg_out = str(eval(' + JSON.stringify(t.call) + '))';
      await pyodide.runPythonAsync(src, { globals: ns });
      const actual = String(ns.get('__sg_out'));
      results.push({
        name: t.name, call: t.call, expected: t.expected, hidden: !!t.hidden,
        actual, passed: actual.trim() === String(t.expected).trim(),
      });
    } catch (err) {
      results.push({
        name: t.name, call: t.call, expected: t.expected, hidden: !!t.hidden,
        actual: '', passed: false, error: formatPyError(err),
      });
    }
  }

  try { ns.destroy(); } catch (_) {}
  self.postMessage({ type: 'result', output, tests: results });
};

function formatPyError(err) {
  const msg = String(err && err.message ? err.message : err);
  // Pyodide prepends its own JS frames; the Python traceback is what matters.
  const i = msg.indexOf('Traceback (most recent call last)');
  return i >= 0 ? msg.slice(i).trim() : msg.trim();
}
`;

/* ------------------------------------------------------------------ */
/* JavaScript / TypeScript                                             */
/* ------------------------------------------------------------------ */

export const JS_WORKER = String.raw`
self.onmessage = (e) => {
  const { code, tests } = e.data;
  let output = '';

  const write = (...args) => {
    output += args.map((a) => {
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch (_) { return String(a); }
    }).join(' ') + '\n';
  };
  self.console = { log: write, info: write, warn: write, error: write, debug: write };

  self.postMessage({ type: 'ready' });

  let evalIn;
  try {
    // The learner's declarations live in this function scope; the returned
    // closure can then eval a test expression against them.
    const factory = new Function('"use strict";\n' + code + '\nreturn function (__sgExpr) { return eval(__sgExpr); };');
    evalIn = factory();
  } catch (err) {
    self.postMessage({ type: 'result', error: String(err && err.stack || err), output, tests: [] });
    return;
  }

  const results = [];
  for (const t of tests) {
    try {
      const value = evalIn(t.call);
      const actual = typeof value === 'string' ? value : stringify(value);
      results.push({
        name: t.name, call: t.call, expected: t.expected, hidden: !!t.hidden,
        actual, passed: actual.trim() === String(t.expected).trim(),
      });
    } catch (err) {
      results.push({
        name: t.name, call: t.call, expected: t.expected, hidden: !!t.hidden,
        actual: '', passed: false, error: String(err && err.message || err),
      });
    }
  }

  self.postMessage({ type: 'result', output, tests: results });
};

function stringify(v) {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch (_) { return String(v); }
}
`;

/* ------------------------------------------------------------------ */
/* SQL — sql.js                                                        */
/* ------------------------------------------------------------------ */

/**
 * The learner's query is materialised into a table named `resultat`, and each
 * test then interrogates THAT table. This is what makes the assertions test the
 * learner's answer rather than the fixture data.
 *
 * `CREATE TABLE … AS SELECT` produces a rowid table whose rowids follow the
 * order the rows were produced, so tests that care about ordering use
 * `ORDER BY rowid`.
 */
export const SQL_WORKER = String.raw`
let ready = null;

function init(base) {
  if (!ready) {
    ready = (async () => {
      importScripts(base + 'sql-wasm.js');
      return await initSqlJs({ locateFile: (f) => base + f });
    })();
  }
  return ready;
}

self.onmessage = async (e) => {
  const { code, tests, setupSql, base } = e.data;
  let output = '';

  let SQL;
  try {
    SQL = await init(base);
  } catch (err) {
    self.postMessage({ type: 'result', runtimeUnavailable: true, error: String(err && err.message || err), output: '', tests: [] });
    return;
  }
  self.postMessage({ type: 'ready' });

  const db = new SQL.Database();
  try {
    if (setupSql) db.run(setupSql);
  } catch (err) {
    self.postMessage({ type: 'result', error: 'Le jeu de donnees n a pas pu etre cree : ' + String(err.message || err), output, tests: [] });
    db.close();
    return;
  }

  const query = String(code || '').trim().replace(/;\s*$/, '');
  if (!query) {
    self.postMessage({ type: 'result', error: 'Aucune requete a executer.', output, tests: [] });
    db.close();
    return;
  }

  // Show the learner what their query returns, before any assertion.
  try {
    const preview = db.exec(query);
    if (preview.length > 0) {
      const { columns, values } = preview[0];
      output += columns.join(' | ') + '\n';
      output += columns.map((c) => '-'.repeat(Math.max(3, c.length))).join('-+-') + '\n';
      for (const row of values.slice(0, 50)) {
        output += row.map((v) => (v === null ? 'NULL' : String(v))).join(' | ') + '\n';
      }
      output += '\n' + values.length + ' ligne(s).';
    } else {
      output += 'La requete n a retourne aucune ligne.';
    }
  } catch (err) {
    self.postMessage({ type: 'result', error: String(err.message || err), output, tests: [] });
    db.close();
    return;
  }

  try {
    db.run('CREATE TABLE resultat AS ' + query + ';');
  } catch (err) {
    self.postMessage({ type: 'result', error: 'Impossible d analyser le resultat : ' + String(err.message || err), output, tests: [] });
    db.close();
    return;
  }

  const results = [];
  for (const t of tests) {
    try {
      const res = db.exec(t.call);
      let actual = '';
      if (res.length && res[0].values.length) {
        const v = res[0].values[0][0];
        actual = v === null ? 'NULL' : String(v);
      }
      results.push({
        name: t.name, call: t.call, expected: t.expected, hidden: !!t.hidden,
        actual, passed: actual.trim() === String(t.expected).trim(),
      });
    } catch (err) {
      results.push({
        name: t.name, call: t.call, expected: t.expected, hidden: !!t.hidden,
        actual: '', passed: false, error: String(err.message || err),
      });
    }
  }

  db.close();
  self.postMessage({ type: 'result', output, tests: results });
};
`;
