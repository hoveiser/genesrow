// Best-effort live reads from StudioNet. Browser calls to the RPC/explorer may be
// blocked by CORS, so every function degrades gracefully and the UI falls back to
// the committed verified evidence. Nothing here mutates state or moves funds.

import { CONTRACT_ADDRESS, EXPLORER, RPC } from "./contract";

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await withTimeout(
    fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
    8000,
  );
  const json = (await res.json()) as { result?: unknown; error?: unknown };
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

export interface LiveStatus {
  ok: boolean;
  balanceWei?: string;
  balanceGen?: string;
  error?: string;
}

export async function readContractBalance(): Promise<LiveStatus> {
  try {
    const r = (await rpc("eth_getBalance", [CONTRACT_ADDRESS, "latest"])) as string;
    const wei = BigInt(r);
    const whole = wei / 10n ** 18n;
    return {
      ok: true,
      balanceWei: wei.toString(),
      balanceGen: whole.toString(),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface ExplorerTx {
  ok: boolean;
  status?: string;
  error?: string;
}

// The StudioNet explorer JSON API. Often CORS-blocked from a browser; callers
// should fall back to the explorer <a> link on failure.
export async function readTxStatus(hash: string): Promise<ExplorerTx> {
  try {
    const res = await withTimeout(
      fetch(`${EXPLORER}/api/transactions/${hash}`),
      8000,
    );
    const j = (await res.json()) as { status?: string };
    return { ok: true, status: j.status };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
