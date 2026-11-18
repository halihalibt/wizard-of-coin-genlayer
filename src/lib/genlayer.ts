import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

export const CONTRACT_ADDRESS =
  "0x09903c4f4160b7a55FaE88951a682019038B2593" as `0x${string}`;
export const CHAIN_ID = 61999;
export const RPC_URL = "https://studio.genlayer.com/api";
export const EXPLORER_URL = "https://explorer-studio.genlayer.com";
export const CONTRACT_URL = `${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`;

export type WalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>;
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: WalletProvider & { providers?: WalletProvider[] };
    okxwallet?: WalletProvider;
  }
}

export type WizardResult = {
  attempt?: number;
  outcome?: "given" | "kept" | string;
  give_coin?: boolean;
  reply?: string;
  request?: string;
};

export type GameSnapshot = {
  lastResult: WizardResult | null;
  winnersCount: number;
};

export function getInjectedWallet(): WalletProvider | null {
  if (typeof window === "undefined") return null;
  return window.okxwallet ?? window.ethereum ?? null;
}

export async function ensureStudionet(provider: WalletProvider): Promise<void> {
  const targetHex = "0xf22f";
  const current = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
  if (current === targetHex || Number.parseInt(current, 16) === CHAIN_ID) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetHex }],
    });
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: targetHex,
        chainName: "GenLayer Studionet",
        nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
        rpcUrls: [RPC_URL],
        blockExplorerUrls: [EXPLORER_URL],
      }],
    });
  }

  const switched = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
  if (switched !== targetHex && Number.parseInt(switched, 16) !== CHAIN_ID) {
    throw new Error("钱包未切换到 GenLayer Studionet（Chain ID 61999）。");
  }
}

function makeReadClient() {
  return createClient({ chain: studionet });
}

function makeWriteClient(address: string, provider: WalletProvider) {
  return createClient({
    chain: studionet,
    account: address as `0x${string}`,
    provider: provider as never,
  });
}

function normalizeLastResult(value: unknown): WizardResult | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const candidate = parsed as Record<string, unknown>;
  if (typeof candidate.reply !== "string" && typeof candidate.give_coin !== "boolean") return null;
  return {
    attempt: Number(candidate.attempt ?? 0),
    outcome: typeof candidate.outcome === "string" ? candidate.outcome : undefined,
    give_coin: candidate.give_coin === true,
    reply: typeof candidate.reply === "string" ? candidate.reply : "",
    request: typeof candidate.request === "string" ? candidate.request : "",
  };
}

export async function readGameSnapshot(): Promise<GameSnapshot> {
  const client = makeReadClient();
  const [lastRaw, winnersRaw] = await Promise.all([
    client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_last_result",
      args: [],
    }),
    client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_winners_count",
      args: [],
    }),
  ]);
  const winnersCount = Number(winnersRaw ?? 0);
  return {
    lastResult: normalizeLastResult(lastRaw),
    winnersCount: Number.isFinite(winnersCount) ? winnersCount : 0,
  };
}

export async function submitWizardMessage(
  address: string,
  provider: WalletProvider,
  message: string,
  onSubmitted?: (hash: `0x${string}`) => void,
): Promise<{ hash: `0x${string}`; result: WizardResult | null; winnersCount: number }> {
  const client = makeWriteClient(address, provider);
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "test_prompt",
    args: [message],
    value: 0n,
  }) as `0x${string}`;
  onSubmitted?.(hash);

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    interval: 3000,
    retries: 80,
    fullTransaction: false,
  });

  const execution = String((receipt as { txExecutionResultName?: unknown }).txExecutionResultName ?? "");
  if (execution && !["FINISHED_WITH_RETURN", "SUCCESS"].includes(execution)) {
    throw new Error(`交易已完成，但合约执行未成功（${execution}）。请查看交易详情。`);
  }

  const snapshot = await readGameSnapshot();
  return { hash, result: snapshot.lastResult, winnersCount: snapshot.winnersCount };
}
