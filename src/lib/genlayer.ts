import { abi, createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
export type FixedHash = `0x${string}` & { readonly length: 66 };

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

export type GuestAccount = ReturnType<typeof createAccount>;
export function createGuestAccount() {
  return createAccount(generatePrivateKey());
}

export async function fundGuest(account: GuestAccount) {
  const client = makeReadClient();
  const balance = () => client.getBalance({ address: account.address });
  if (await balance() === 0n) {
    await client.request({
      method: "sim_fundAccount",
      params: [account.address, 1_000_000_000_000_000_000],
    } as never);
  }
  if (await balance() === 0n) throw new Error("水龙头尚未到账，请稍后重试。");
}

export async function submitWizardMessage(
  sender: GuestAccount | { address: string; provider: WalletProvider },
  message: string,
): Promise<FixedHash> {
  const client = "provider" in sender
    ? makeWriteClient(sender.address, sender.provider)
    : createClient({ chain: studionet, account: sender });
  return await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "test_prompt",
    args: [message],
    value: 0n,
    leaderOnly: false,
  }) as FixedHash;
}

type LeaderReceipt = {
  mode?: string;
  error?: unknown;
  execution_result?: string;
  eq_outputs?: Record<string, { status?: string; payload?: { raw?: number[] } }>;
};

export async function readDialogue(hash: FixedHash): Promise<
  { state: "pending" | "failed" | "unknown" } | { state: "complete"; result: WizardResult }
> {
  const client = makeReadClient();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const tx = await client.getTransaction({ hash }).catch(() => null) as {
      statusName?: string;
      txExecutionResultName?: string;
      consensus_data?: { leader_receipt?: LeaderReceipt | LeaderReceipt[] };
    } | null;
    if (["CANCELED", "UNDETERMINED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"].includes(tx?.statusName ?? "")) {
      return { state: "failed" };
    }
    if (tx?.statusName === "FINALIZED") {
      const receipts = [tx.consensus_data?.leader_receipt ?? []].flat();
      const leader = [...receipts].reverse().find((receipt) => receipt.mode === "leader") ?? receipts[0];
      const execution = tx.txExecutionResultName || leader?.execution_result;
      if (leader?.error || (execution && !["SUCCESS", "FINISHED_WITH_RETURN"].includes(execution))) {
        return { state: "failed" };
      }
      const output = leader?.eq_outputs?.[0];
      if (output?.status === "return" && Array.isArray(output.payload?.raw)) {
        try {
          const verdict = abi.calldata.decode(Uint8Array.from(output.payload.raw));
          const won = verdict instanceof Map ? verdict.get("give_coin") : undefined;
          if (typeof won === "boolean") {
            const reply = verdict instanceof Map ? verdict.get("reply") : undefined;
            return { state: "complete", result: { give_coin: won, reply: typeof reply === "string" ? reply : "" } };
          }
        } catch {
          return { state: "unknown" };
        }
      }
      return { state: "unknown" };
    }
    if (attempt < 19) await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  return { state: "pending" };
}
