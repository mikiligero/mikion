// Backfill del directorio de personas (tabla `people`).
//
// Las propiedades de tipo "person" guardaban sus personas en `options` por
// propiedad (cada BD su lista). Este script las unifica en un directorio común
// por ámbito (equipo/privado) del workspace:
//   1. Reúne todas las personas de las propiedades "person".
//   2. Las deduplica por (ámbito, nombre en minúsculas) → un id canónico.
//   3. Inserta los canónicos en `people` (reusa los ya existentes → idempotente).
//   4. Reescribe `options` de cada propiedad y los `values` de cada fila para
//      que apunten al id canónico (misma persona = mismo id entre BBDD).
//
// Uso: DATABASE_URL=postgres://… node scripts/backfill-people.mjs
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}
const sql = postgres(url, { max: 1 });

const norm = (s) => (s ?? "").trim().toLowerCase();

try {
  // ws+scope → Map(nameLower → {id,name,color})  (canónicos del directorio)
  const dir = new Map();
  const keyOf = (ws, scope) => `${ws}::${scope}`;

  // Carga personas ya existentes en el directorio (para idempotencia).
  for (const p of await sql`select id, workspace_id, scope, name, color from people`) {
    const k = keyOf(p.workspace_id, p.scope);
    if (!dir.has(k)) dir.set(k, new Map());
    dir.get(k).set(norm(p.name), { id: p.id, name: p.name, color: p.color });
  }

  const dbs = await sql`
    select db.id, db.schema, d.workspace_id, d.section
    from databases db join docs d on db.doc_id = d.id`;

  const toInsert = []; // personas nuevas a crear en `people`
  let dbsTouched = 0;
  let rowsTouched = 0;

  for (const dbrow of dbs) {
    const ws = dbrow.workspace_id;
    const scope = dbrow.section; // 'team' | 'private'
    const k = keyOf(ws, scope);
    if (!dir.has(k)) dir.set(k, new Map());
    const canon = dir.get(k);

    const schema = dbrow.schema;
    const personProps = (schema.properties ?? []).filter((p) => p.type === "person");
    if (!personProps.length) continue;

    // idMap: id antiguo de opción → id canónico (dentro de este ámbito).
    const idMap = new Map();

    for (const prop of personProps) {
      for (const opt of prop.options ?? []) {
        const n = norm(opt.name);
        if (!n) continue;
        let c = canon.get(n);
        if (!c) {
          c = { id: opt.id, name: opt.name.trim(), color: opt.color ?? "gray" };
          canon.set(n, c);
          toInsert.push({ id: c.id, workspace_id: ws, scope, name: c.name, color: c.color });
        }
        idMap.set(opt.id, c.id);
      }
    }

    // Reescribe options de cada propiedad person → canónicas y deduplicadas.
    let schemaChanged = false;
    for (const prop of personProps) {
      const seen = new Set();
      const next = [];
      for (const opt of prop.options ?? []) {
        const cid = idMap.get(opt.id);
        if (!cid || seen.has(cid)) continue;
        seen.add(cid);
        const c = [...canon.values()].find((x) => x.id === cid);
        next.push({ id: cid, name: c.name, color: c.color });
      }
      const before = JSON.stringify(prop.options ?? []);
      if (JSON.stringify(next) !== before) {
        prop.options = next;
        schemaChanged = true;
      }
    }
    if (schemaChanged) {
      await sql`update databases set schema = ${sql.json(schema)} where id = ${dbrow.id}`;
      dbsTouched++;
    }

    // Reescribe values de cada fila para las propiedades person.
    const rs = await sql`select id, values from rows where database_id = ${dbrow.id}`;
    for (const r of rs) {
      const values = r.values;
      if (!values) continue;
      let changed = false;
      for (const prop of personProps) {
        const v = values[prop.id];
        if (!Array.isArray(v)) continue;
        const mapped = [];
        const seen = new Set();
        for (const id of v) {
          const cid = idMap.get(id) ?? id;
          if (seen.has(cid)) continue;
          seen.add(cid);
          mapped.push(cid);
        }
        if (JSON.stringify(mapped) !== JSON.stringify(v)) {
          values[prop.id] = mapped;
          changed = true;
        }
      }
      if (changed) {
        await sql`update rows set values = ${sql.json(values)} where id = ${r.id}`;
        rowsTouched++;
      }
    }
  }

  if (toInsert.length) {
    await sql`insert into people ${sql(toInsert, "id", "workspace_id", "scope", "name", "color")}`;
  }

  console.log(
    `OK · personas nuevas en directorio: ${toInsert.length} · BBDD actualizadas: ${dbsTouched} · filas actualizadas: ${rowsTouched}`
  );
} catch (e) {
  console.error("Error en backfill:", e);
  process.exit(1);
} finally {
  await sql.end();
}
