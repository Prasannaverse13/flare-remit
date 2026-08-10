/**
 * Server-side durable transfer store.
 *
 * This is intentionally dependency-free for the hackathon bundle. It writes
 * an atomic JSON snapshot under .data/, so a dev server restart does not erase
 * transfer history. Replace the adapter internals with Postgres/SQLite before
 * production deployment; the API is already shaped like a repository.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Transfer } from './store';

type PersistedTransfer = Transfer;
const filePath = path.join(process.cwd(), '.data', 'transfers.json');
const globalForStore = globalThis as typeof globalThis & { __flareTransferWrite?: Promise<void> };

async function readAll(): Promise<Record<string, PersistedTransfer>> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as Record<string, PersistedTransfer>;
  } catch {
    return {};
  }
}

async function writeAll(transfers: Record<string, PersistedTransfer>) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(transfers, null, 2), 'utf8');
  await fs.rename(tmp, filePath);
}

export async function persistTransfer(transfer: Transfer) {
  const current = await readAll();
  current[transfer.id] = transfer;
  globalForStore.__flareTransferWrite = (globalForStore.__flareTransferWrite ?? Promise.resolve())
    .then(() => writeAll(current));
  await globalForStore.__flareTransferWrite;
  return transfer;
}

export async function getPersistedTransfer(id: string) {
  return (await readAll())[id];
}

export async function updatePersistedTransfer(id: string, patch: Partial<Transfer>) {
  const current = await readAll();
  const transfer = current[id];
  if (!transfer) return undefined;
  const next = { ...transfer, ...patch, updatedAt: Date.now() };
  await persistTransfer(next);
  return next;
}

export async function listPersistedTransfers() {
  return Object.values(await readAll());
}
