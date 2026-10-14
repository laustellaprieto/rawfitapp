/** Prueba que los datos de la versión anterior (sin uid) se actualizan bien. Ejecutar: npx tsx tests/upgrade.test.ts */
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import Dexie from 'dexie';

async function main() {
  const v1 = new Dexie('rawfit-kit');
  v1.version(1).stores({
    perfil: 'id', habitos: '++id, orden', registros: '[habitoId+fecha], habitoId, fecha', mediciones: '++id, fecha',
    checkins: '++id, fecha', fotos: '++id, checkinId', sesiones: '++id, fecha', ejerciciosPropios: '++id', logros: 'id, fecha',
  });
  await v1.table('perfil').put({ id: 'main', nombre: 'Leo', onboardingCompleto: true, fechaInicio: '2026-09-01', objetivo: '' });
  const h1 = await v1.table('habitos').add({ nombre: 'Agua', emoji: '💧', orden: 0, activo: true });
  await v1.table('registros').bulkPut([{ habitoId: h1, fecha: '2026-10-01' }, { habitoId: h1, fecha: '2026-10-02' }]);
  const c1 = await v1.table('checkins').add({ fecha: '2026-10-01' });
  await v1.table('fotos').add({ checkinId: c1, pose: 'frente', imagen: new Blob(['x']) });
  await v1.table('logros').put({ id: '2026-10-01:1', hito: 1, inicioRacha: '2026-10-01', fecha: '2026-10-01' });
  v1.close();

  const { db } = await import('../src/lib/db');
  await db.open();
  assert.equal(db.verno, 3);
  assert.equal(await db.comidas.count(), 0, 'v3 agrega el diario de comidas vacío');
  const h = (await db.habitos.toArray())[0];
  assert.ok(h.uid);
  const regs = await db.registros.toArray();
  assert.equal(regs.length, 2);
  assert.ok(regs.every((r) => r.habitoUid === h.uid && r.uid === `${h.uid}|${r.fecha}`));
  const f = (await db.fotos.toArray())[0];
  assert.equal(f.checkinUid, (await db.checkins.get(c1 as number))!.uid);
  assert.equal((await db.logros.toArray())[0].uid, '2026-10-01:1');
  assert.equal((await db.perfil.get('main'))!.uid, 'perfil');
  assert.equal((await db.perfil.get('main'))!.nombre, 'Leo');
  console.log('✓ los datos de la versión anterior se conservan y reciben uid');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
