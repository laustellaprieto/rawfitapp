/**
 * Imitación mínima de la API de Supabase (auth, rest, rpc y storage) sobre un Postgres local,
 * para probar la app de punta a punta con las MISMAS reglas de seguridad de supabase/schema.sql.
 * Solo para pruebas locales. Uso: PGPORT=54329 npx tsx tests/supabase-falso.ts
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const pool = new pg.Pool({ host: '/tmp', port: Number(process.env.PGPORT ?? 54329), user: 'postgres', database: process.env.PGDATABASE ?? 'rf' });
const PUERTO = Number(process.env.PUERTO ?? 54321);
const contrasenas = new Map<string, string>();
const archivos = new Map<string, { tipo: string; datos: Buffer }>();
const firmados = new Map<string, string>();

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub: string, email: string) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, email, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' })}.firma`;
const subDe = (req: IncomingMessage) => {
  const t = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  try {
    const p = JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());
    return p.role === 'authenticated' ? (p.sub as string) : null;
  } catch {
    return null;
  }
};

async function cuerpo(req: IncomingMessage): Promise<Buffer> {
  const partes: Buffer[] = [];
  for await (const c of req) partes.push(c as Buffer);
  return Buffer.concat(partes);
}

function enviar(res: ServerResponse, estado: number, data?: unknown, headers: Record<string, string> = {}) {
  res.writeHead(estado, { 'content-type': 'application/json', ...headers });
  res.end(data === undefined ? '' : JSON.stringify(data));
}

/** Ejecuta SQL como la persona de la sesión (o anónimo), con RLS activo. */
async function comoUsuario<T>(sub: string | null, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query(`set local role ${sub ? 'authenticated' : 'anon'}`);
    await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [sub ?? '']);
    const r = await fn(c);
    await c.query('commit');
    return r;
  } catch (e) {
    await c.query('rollback');
    throw e;
  } finally {
    c.release();
  }
}

const ident = (s: string) => {
  if (!/^[a-z_]+$/.test(s)) throw new Error('identificador inválido ' + s);
  return `"${s}"`;
};

function filtros(params: URLSearchParams, valores: unknown[]): string {
  const where: string[] = [];
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
    const m = /^(eq|neq|gt|gte|lt|lte|is)\.(.*)$/.exec(v);
    if (!m) throw new Error('filtro no soportado ' + v);
    const op = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', is: 'is' }[m[1]]!;
    if (m[1] === 'is') where.push(`${ident(k)} is ${m[2] === 'null' ? 'null' : m[2] === 'true' ? 'true' : 'false'}`);
    else {
      valores.push(m[2]);
      where.push(`${ident(k)} ${op} $${valores.length}`);
    }
  }
  return where.length ? ` where ${where.join(' and ')}` : '';
}

async function rest(req: IncomingMessage, res: ServerResponse, url: URL, tabla: string) {
  const sub = subDe(req);
  const p = url.searchParams;
  if (tabla.startsWith('rpc/')) {
    const fn = tabla.slice(4);
    const args = JSON.parse((await cuerpo(req)).toString() || '{}');
    const valores = Object.values(args);
    const lista = Object.keys(args).map((k, i) => `${ident(k)} => $${i + 1}`).join(', ');
    const r = await comoUsuario(sub, (c) => c.query(`select public.${ident(fn)}(${lista}) as r`, valores));
    return enviar(res, 200, r.rows[0]?.r ?? null);
  }
  const t = ident(tabla);
  const valores: unknown[] = [];
  if (req.method === 'GET' || req.method === 'HEAD') {
    const cols = (p.get('select') ?? '*').split(',').map((c) => (c.trim() === '*' ? '*' : ident(c.trim()))).join(', ');
    let sql = `select ${cols} from public.${t}${filtros(p, valores)}`;
    if (p.get('order')) sql += ' order by ' + p.get('order')!.split(',').map((o) => { const [c, d] = o.split('.'); return `${ident(c)} ${d === 'desc' ? 'desc' : 'asc'}`; }).join(', ');
    const todas = await comoUsuario(sub, (c) => c.query(sql, valores));
    let filas = todas.rows;
    const off = Number(p.get('offset') ?? 0);
    if (p.get('limit')) filas = filas.slice(off, off + Number(p.get('limit')));
    const total = todas.rows.length;
    const headers = { 'content-range': `${off}-${off + Math.max(filas.length - 1, 0)}/${total}` };
    if ((req.headers.accept ?? '').includes('vnd.pgrst.object')) {
      if (filas.length > 1) return enviar(res, 406, { message: 'más de una fila' });
      if (!filas.length) return enviar(res, 406, { code: 'PGRST116', message: 'sin filas', details: 'The result contains 0 rows' });
      return enviar(res, 200, filas[0], headers);
    }
    return req.method === 'HEAD' ? enviar(res, 200, undefined, headers) : enviar(res, 200, filas, headers);
  }
  const datos = JSON.parse((await cuerpo(req)).toString() || '[]');
  if (req.method === 'POST') {
    const filas = Array.isArray(datos) ? datos : [datos];
    const cols = Object.keys(filas[0]);
    const conflicto = p.get('on_conflict');
    await comoUsuario(sub, async (c) => {
      for (const f of filas) {
        const vals = cols.map((k) => (typeof f[k] === 'object' && f[k] !== null ? JSON.stringify(f[k]) : f[k]));
        let sql = `insert into public.${t} (${cols.map(ident).join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})`;
        if (conflicto) sql += ` on conflict (${conflicto.split(',').map(ident).join(', ')}) do update set ${cols.filter((k) => !conflicto.split(',').includes(k)).map((k) => `${ident(k)} = excluded.${ident(k)}`).join(', ')}`;
        await c.query(sql, vals);
      }
    });
    return enviar(res, 201);
  }
  if (req.method === 'PATCH') {
    const cols = Object.keys(datos);
    cols.forEach((k) => valores.push(datos[k]));
    const sql = `update public.${t} set ${cols.map((k, i) => `${ident(k)} = $${i + 1}`).join(', ')}${filtros(p, valores)}`;
    await comoUsuario(sub, (c) => c.query(sql, valores));
    return enviar(res, 204);
  }
  enviar(res, 405, { message: 'método no soportado' });
}

async function storage(req: IncomingMessage, res: ServerResponse, ruta: string) {
  const sub = subDe(req);
  let m: RegExpExecArray | null;
  if (req.method === 'POST' && (m = /^object\/list\/([^/]+)$/.exec(ruta))) {
    const { prefix } = JSON.parse((await cuerpo(req)).toString());
    const r = await comoUsuario(sub, (c) => c.query(`select name from storage.objects where bucket_id = $1 and name like $2`, [m![1], `${prefix}/%`]));
    return enviar(res, 200, r.rows.map((x) => ({ name: x.name.slice(prefix.length + 1), id: x.name })));
  }
  if (req.method === 'POST' && (m = /^object\/sign\/([^/]+)\/(.+)$/.exec(ruta))) {
    const [bucket, nombre] = [m[1], decodeURIComponent(m[2])];
    const r = await comoUsuario(sub, (c) => c.query(`select 1 from storage.objects where bucket_id = $1 and name = $2`, [bucket, nombre]));
    if (!r.rowCount) return enviar(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
    const token = randomUUID();
    firmados.set(token, `${bucket}/${nombre}`);
    return enviar(res, 200, { signedURL: `/object/sign/${bucket}/${nombre}?token=${token}` });
  }
  if (req.method === 'GET' && (m = /^object\/sign\/([^/]+)\/(.+)$/.exec(ruta.split('?')[0]))) {
    const token = new URL('http://x/' + ruta).searchParams.get('token') ?? '';
    const a = archivos.get(firmados.get(token) ?? '');
    if (!a) return enviar(res, 404, { message: 'no existe' });
    res.writeHead(200, { 'content-type': a.tipo });
    return res.end(a.datos);
  }
  if (req.method === 'DELETE' && (m = /^object\/([^/]+)$/.exec(ruta))) {
    const { prefixes } = JSON.parse((await cuerpo(req)).toString());
    const r = await comoUsuario(sub, (c) => c.query(`delete from storage.objects where bucket_id = $1 and name = any($2) returning name`, [m![1], prefixes]));
    r.rows.forEach((x) => archivos.delete(`${m![1]}/${x.name}`));
    return enviar(res, 200, r.rows);
  }
  if ((req.method === 'POST' || req.method === 'PUT') && (m = /^object\/([^/]+)\/(.+)$/.exec(ruta))) {
    const [bucket, nombre] = [m[1], decodeURIComponent(m[2])];
    const datos = await cuerpo(req);
    const upsert = req.headers['x-upsert'] === 'true';
    await comoUsuario(sub, async (c) => {
      const ya = await c.query(`select 1 from storage.objects where bucket_id = $1 and name = $2`, [bucket, nombre]);
      if (ya.rowCount && !upsert) throw Object.assign(new Error('The resource already exists'), { status: 409 });
      if (!ya.rowCount) await c.query(`insert into storage.objects (bucket_id, name) values ($1, $2)`, [bucket, nombre]);
      else await c.query(`update storage.objects set name = name where bucket_id = $1 and name = $2`, [bucket, nombre]);
    });
    archivos.set(`${bucket}/${nombre}`, desempaquetar(String(req.headers['content-type'] ?? 'application/octet-stream'), datos));
    return enviar(res, 200, { Key: `${bucket}/${nombre}` });
  }
  if (req.method === 'GET' && (m = /^object\/(?:authenticated\/)?([^/]+)\/(.+)$/.exec(ruta))) {
    const [bucket, nombre] = [m[1], decodeURIComponent(m[2])];
    const r = await comoUsuario(sub, (c) => c.query(`select 1 from storage.objects where bucket_id = $1 and name = $2`, [bucket, nombre]));
    const a = archivos.get(`${bucket}/${nombre}`);
    if (!r.rowCount || !a) return enviar(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
    res.writeHead(200, { 'content-type': a.tipo });
    return res.end(a.datos);
  }
  enviar(res, 404, { message: 'ruta de storage no soportada ' + ruta });
}

/** supabase-js sube los Blob como multipart/form-data: se guarda solo el archivo (como hace Supabase). */
function desempaquetar(tipo: string, datos: Buffer): { tipo: string; datos: Buffer } {
  const limite = /boundary=(.+)$/.exec(tipo)?.[1];
  if (!tipo.startsWith('multipart/form-data') || !limite) return { tipo, datos };
  const sep = Buffer.from(`--${limite}`);
  for (let i = datos.indexOf(sep); i >= 0; ) {
    const sig = datos.indexOf(sep, i + sep.length);
    if (sig < 0) break;
    const parte = datos.subarray(i + sep.length + 2, sig - 2); // sin \r\n
    const fin = parte.indexOf('\r\n\r\n');
    const cab = parte.subarray(0, fin).toString();
    if (/filename=/.test(cab) || /name="(?:file|)"/.test(cab)) {
      return { tipo: /content-type:\s*([^\r\n]+)/i.exec(cab)?.[1] ?? 'application/octet-stream', datos: Buffer.from(parte.subarray(fin + 4)) };
    }
    i = sig;
  }
  return { tipo, datos };
}

async function auth(req: IncomingMessage, res: ServerResponse, url: URL, ruta: string) {
  const sesion = (u: { id: string; email: string; nombre?: string }) => ({
    access_token: jwt(u.id, u.email),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `${u.id}.${randomUUID()}`,
    user: { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: { nombre: u.nombre ?? '' }, app_metadata: {}, created_at: new Date().toISOString() },
  });
  const b = req.method === 'POST' ? JSON.parse((await cuerpo(req)).toString() || '{}') : {};
  if (ruta === 'signup') {
    const ya = await pool.query('select 1 from auth.users where email = $1', [b.email]);
    if (ya.rowCount) return enviar(res, 422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
    const id = randomUUID();
    await pool.query('insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)', [id, b.email, JSON.stringify(b.data ?? {})]);
    contrasenas.set(b.email, b.password);
    return enviar(res, 200, sesion({ id, email: b.email, nombre: b.data?.nombre }));
  }
  if (ruta === 'token') {
    if (url.searchParams.get('grant_type') === 'refresh_token') {
      const id = String(b.refresh_token).split('.')[0];
      const u = await pool.query('select id, email from auth.users where id = $1', [id]);
      if (!u.rowCount) return enviar(res, 400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token' });
      return enviar(res, 200, sesion(u.rows[0]));
    }
    const u = await pool.query('select id, email from auth.users where email = $1', [b.email]);
    if (!u.rowCount || contrasenas.get(b.email) !== b.password) return enviar(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' });
    return enviar(res, 200, sesion(u.rows[0]));
  }
  if (ruta === 'user') {
    const sub = subDe(req);
    const u = await pool.query('select id, email from auth.users where id::text = $1', [sub ?? '']);
    if (!u.rowCount) return enviar(res, 401, { msg: 'invalid token' });
    return enviar(res, 200, sesion(u.rows[0]).user);
  }
  if (ruta === 'logout') return enviar(res, 204);
  if (ruta === 'recover') return enviar(res, 200, {});
  enviar(res, 404, { msg: 'ruta de auth no soportada ' + ruta });
}

createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', req.headers.origin ?? '*');
  res.setHeader('access-control-allow-headers', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS');
  res.setHeader('access-control-expose-headers', 'content-range');
  if (req.method === 'OPTIONS') return enviar(res, 204);
  const url = new URL(req.url!, 'http://localhost');
  try {
    if (url.pathname.startsWith('/rest/v1/')) return await rest(req, res, url, url.pathname.slice(9));
    if (url.pathname.startsWith('/storage/v1/')) return await storage(req, res, url.pathname.slice(12) + url.search);
    if (url.pathname.startsWith('/auth/v1/')) return await auth(req, res, url, url.pathname.slice(9));
    enviar(res, 404, { message: 'no encontrado' });
  } catch (e) {
    const err = e as Error & { status?: number; code?: string };
    if (process.env.DEBUG) console.error(req.method, req.url, err.message);
    enviar(res, err.status ?? (err.code === '42501' ? 403 : 400), { message: err.message, code: err.code, error: err.message, statusCode: String(err.status ?? 400) });
  }
}).listen(PUERTO, () => console.log(`Supabase falso en http://localhost:${PUERTO}`));
