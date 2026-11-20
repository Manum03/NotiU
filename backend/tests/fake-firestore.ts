// Firestore falsa en memoria, SOLO para pruebas: implementa lo mínimo que usa NotiU
// (colecciones, subcolecciones, where ==/!=/<=/in/array-contains, orderBy, limit, count,
// batch y transacciones).
type Data = Record<string, any>;
const store = new Map<string, Data>();
let autoId = 0;
const clone = <T>(v: T): T => structuredClone(v);

const getField = (d: Data, f: string) => f.split(".").reduce((o: any, k) => (o == null ? undefined : o[k]), d);
const cmp = (a: any, b: any) => {
  const va = a instanceof Date ? a.getTime() : a;
  const vb = b instanceof Date ? b.getTime() : b;
  return va < vb ? -1 : va > vb ? 1 : 0;
};

class Snap {
  constructor(public ref: DocRef, private d: Data | undefined) {}
  get id() { return this.ref.id; }
  get exists() { return this.d !== undefined; }
  data() { return this.d ? clone(this.d) : undefined; }
  get(f: string) { return this.d ? getField(this.d, f) : undefined; }
}

class DocRef {
  constructor(public path: string) {}
  get id() { return this.path.split("/").pop()!; }
  collection(name: string) { return new Query(`${this.path}/${name}`); }
  async get() { return new Snap(this, store.has(this.path) ? clone(store.get(this.path)!) : undefined); }
  async set(data: Data, opts?: { merge?: boolean }) {
    const clean = JSON.parse(JSON.stringify(data, (_k, v) => (v instanceof Date ? { __d: v.toISOString() } : v)), (_k, v) => (v && v.__d ? new Date(v.__d) : v));
    store.set(this.path, opts?.merge ? { ...(store.get(this.path) ?? {}), ...clean } : clean);
  }
  async update(data: Data) {
    if (!store.has(this.path)) throw new Error("NOT_FOUND " + this.path);
    store.set(this.path, { ...store.get(this.path)!, ...clone(data) });
  }
  async delete() { store.delete(this.path); }
}

class Query {
  constructor(public path: string, private filters: [string, string, any][] = [], private order?: [string, string], private lim?: number) {}
  doc(id?: string) { return new DocRef(`${this.path}/${id ?? `auto${++autoId}`}`); }
  where(f: string, op: string, v: any) { return new Query(this.path, [...this.filters, [f, op, v]], this.order, this.lim); }
  orderBy(f: string, dir = "asc") { return new Query(this.path, this.filters, [f, dir], this.lim); }
  limit(n: number) { return new Query(this.path, this.filters, this.order, n); }
  private run() {
    const depth = this.path.split("/").length + 1;
    let docs = [...store.entries()]
      .filter(([p]) => p.startsWith(this.path + "/") && p.split("/").length === depth)
      .filter(([, d]) =>
        this.filters.every(([f, op, v]) => {
          const x = getField(d, f);
          if (op === "==") return x instanceof Date ? cmp(x, v) === 0 : x === v;
          // Como Firestore: != no devuelve documentos sin el campo
          if (op === "!=") return x !== undefined && (x instanceof Date ? cmp(x, v) !== 0 : x !== v);
          if (op === "array-contains") return Array.isArray(x) && x.includes(v);
          if (op === "<=") return x !== undefined && x !== null && cmp(x, v) <= 0;
          if (op === "in") return (v as any[]).includes(x);
          throw new Error("op " + op);
        }),
      );
    if (this.order) {
      const [f, dir] = this.order;
      docs = docs.filter(([, d]) => getField(d, f) !== undefined).sort(([, a], [, b]) => cmp(getField(a, f), getField(b, f)) * (dir === "desc" ? -1 : 1));
    }
    if (this.lim !== undefined) docs = docs.slice(0, this.lim);
    return docs.map(([p, d]) => new Snap(new DocRef(p), clone(d)));
  }
  async get() { const docs = this.run(); return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn: any) => docs.forEach(fn) }; }
  count() { return { get: async () => ({ data: () => ({ count: this.run().length }) }) }; }
}

export const fakeDb = {
  settings() {},
  collection: (name: string) => new Query(name),
  // Transacción mínima: lee y escribe de inmediato (las pruebas no tienen concurrencia real)
  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const tx = {
      get: (r: DocRef) => r.get(),
      set: (r: DocRef, d: Data, o?: any) => { void r.set(d, o); return tx; },
      update: (r: DocRef, d: Data) => { void r.update(d); return tx; },
      delete: (r: DocRef) => { void r.delete(); return tx; },
    };
    return fn(tx);
  },
  batch() {
    const ops: (() => Promise<void>)[] = [];
    return {
      set: (r: DocRef, d: Data, o?: any) => ops.push(() => r.set(d, o)),
      update: (r: DocRef, d: Data) => ops.push(() => r.update(d)),
      delete: (r: DocRef) => ops.push(() => r.delete()),
      commit: async () => { for (const op of ops) await op(); },
    };
  },
};
export const fakeStore = store;
