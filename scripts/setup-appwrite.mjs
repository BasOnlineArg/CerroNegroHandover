/**
 * Script de setup para Appwrite
 * Crea la base de datos, colecciones y atributos necesarios.
 *
 * Uso:
 *   node scripts/setup-appwrite.mjs
 *
 * Requiere variables de entorno:
 *   APPWRITE_ENDPOINT   (default: https://cloud.appwrite.io/v1)
 *   APPWRITE_PROJECT_ID
 *   APPWRITE_API_KEY    (Server key con permisos de databases.write)
 *   APPWRITE_DATABASE_ID (opcional, si ya existe una DB)
 */

import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   ?? 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? '6a3fc9620007a2238cc4';
const API_KEY    = process.env.APPWRITE_API_KEY;

if (!API_KEY) {
  console.error('Error: falta APPWRITE_API_KEY');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const db = new Databases(client);

const permissions = [
  Permission.read(Role.users()),
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function createAttr(fn, ...args) {
  try {
    await fn(...args);
    await sleep(200);
  } catch (e) {
    if (e.code === 409) console.log(`  → atributo ya existe, omitiendo`);
    else throw e;
  }
}

async function main() {
  // 1. Crear o reutilizar base de datos
  let DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? 'handover-db';
  try {
    const existingDb = await db.get(DATABASE_ID);
    console.log(`✓ Base de datos ya existe: ${existingDb.$id}`);
  } catch {
    const newDb = await db.create(DATABASE_ID, 'Handover Database');
    DATABASE_ID = newDb.$id;
    console.log(`✓ Base de datos creada: ${DATABASE_ID}`);
  }

  console.log('\n📋 Creando colecciones...\n');

  // 2. Colección: users
  await createCollection(DATABASE_ID, 'users', 'Usuarios', async () => {
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'users', 'email', 200, true);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'users', 'displayName', 100, false);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'users', 'uid', 36, true);
    await createAttr(db.createEnumAttribute.bind(db), DATABASE_ID, 'users', 'role', [
      'admin','supervisor','estructural','inspector estructural','electrico','perfo','pyc','multiflota','gomeria'
    ], true);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'users', 'createdAt', 50, false);
    console.log('  ✓ users atributos creados');
  });

  // 3. Colección: whitelist
  await createCollection(DATABASE_ID, 'whitelist', 'Lista Blanca', async () => {
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'whitelist', 'email', 200, true);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'whitelist', 'pass', 100, true);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'whitelist', 'role', 50, true);
    console.log('  ✓ whitelist atributos creados');
  });

  // 4. Colección: handovers
  await createCollection(DATABASE_ID, 'handovers', 'Pases de Turno', async () => {
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'handovers', 'shiftDate', 10, true);
    await createAttr(db.createIntegerAttribute.bind(db), DATABASE_ID, 'handovers', 'weekOfYear', true);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'handovers', 'fleet', 50, true);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'handovers', 'author', 100, true);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'handovers', 'uid', 36, true);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'handovers', 'timestamp', 50, false);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'handovers', 'generalNotes', 5000, false);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'handovers', 'ots', 20000, false);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'handovers', 'notifications', 20000, false);
    // frmRisks como array de strings
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'handovers', 'frmRisks', 20, false, null, true);
    console.log('  ✓ handovers atributos creados');
  });

  // 5. Colección: logs
  await createCollection(DATABASE_ID, 'logs', 'Logs de Auditoría', async () => {
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'logs', 'userId', 36, true);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'logs', 'userEmail', 200, false);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'logs', 'action', 50, true);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'logs', 'details', 1000, false);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'logs', 'timestamp', 50, false);
    console.log('  ✓ logs atributos creados');
  });

  // 6. Colección: settings (configuración de empresa - configurable por el admin)
  await createCollection(DATABASE_ID, 'settings', 'Configuración', async () => {
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'settings', 'companyName', 256, false);
    await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'settings', 'teamsJson', 65536, false);
    console.log('  ✓ settings atributos creados');
  });

  // 7. Agregar subteam a handovers
  await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'handovers', 'subteam', 100, false);
  console.log('  ✓ handovers.subteam verificado');

  // 8. Migrar role en users de enum a string
  try {
    await db.deleteAttribute(DATABASE_ID, 'users', 'role');
    await sleep(2000);
    console.log('  ↻ role enum eliminado, recreando como string...');
  } catch { /* ya es string o no existe, omitir */ }
  await createAttr(db.createStringAttribute.bind(db), DATABASE_ID, 'users', 'role', 50, false);
  console.log('  ✓ users.role verificado');

  console.log('\n✅ Setup completado!');
  console.log(`\nAgregá esto a tu .env.local:\nVITE_APPWRITE_DATABASE_ID=${DATABASE_ID}\n`);
}

async function createCollection(databaseId, collectionId, name, attributesFn) {
  try {
    await db.getCollection(databaseId, collectionId);
    console.log(`  ↩ Colección '${collectionId}' ya existe`);
  } catch {
    await db.createCollection(databaseId, collectionId, name, permissions);
    console.log(`  ✓ Colección '${collectionId}' creada`);
    await sleep(500);
  }
  await attributesFn();
}

main().catch(err => {
  console.error('Error en setup:', err.message);
  process.exit(1);
});
