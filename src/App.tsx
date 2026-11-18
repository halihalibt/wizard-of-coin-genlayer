import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WizardScene from "./components/WizardScene";
import {
  CONTRACT_URL,
  createGuestAccount,
  fundGuest,
  readDialogue,
  type FixedHash,
  type GuestAccount,
  EXPLORER_URL,
  getInjectedWallet,
  readGameSnapshot,
  submitWizardMessage,
  type GameSnapshot,
  type WalletProvider,
  type WizardResult,
  ensureStudionet,
} from "./lib/genlayer";

type Phase = "idle" | "connecting" | "submitting" | "error";

type Dialogue = {
  hash: FixedHash;
  message: string;
  state: "pending" | "failed" | "unknown" | "complete";
  result?: WizardResult;
};
const historyKey = "wizard-of-coin-dialogues";
function readHistory(): Dialogue[] {
  try {
    const entries = JSON.parse(localStorage.getItem(historyKey) ?? "[]");
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function parseError(error: unknown) {
  const value = error as { shortMessage?: string; message?: string; code?: number };
  if (value?.code === 4001) return "你取消了钱包签名。";
  return value?.shortMessage || value?.message || "发生未知错误，请稍后重试。";
}

function BrandMark() {
  return (
    <svg viewBox="0 0 52 58" className="brand-mark" aria-hidden="true">
      <path d="M8 26 23 4q3-4 6 1l15 23q-18 9-36-2Z" fill="#7766db" stroke="#302a47" strokeWidth="3" strokeLinejoin="round" />
      <path d="M8 25q18 8 36 0l3 8q-21 10-42 0Z" fill="#f0c06c" stroke="#302a47" strokeWidth="3" />
      <path d="m25 11 2.4 5 5.5.8-4 3.9.9 5.5-4.8-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8Z" fill="#fff0ad" />
      <path d="M13 34q13 12 26 0l-3 15q-10 9-20 0Z" fill="#fff2df" stroke="#302a47" strokeWidth="3" />
      <circle cx="22" cy="43" r="2" fill="#302a47" /><circle cx="31" cy="43" r="2" fill="#302a47" />
      <path d="M23 49q4 3 7 0" fill="none" stroke="#302a47" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ResultCard({ result }: { result: WizardResult }) {
  const given = result.give_coin === true;
  return (
    <div className={`result-card ${given ? "result-given" : "result-kept"}`}>
      <div className="result-icon">{given ? "✦" : "◈"}</div>
      <div className="result-copy">
        <div className="result-eyebrow">{given ? "THE COIN HAS MOVED" : "THE WIZARD'S DECISION"}</div>
        <strong>{given ? "成功拿到金币" : "金币还在女巫手里"}</strong>
        <p>{result.reply || (given ? "女巫似乎改变了主意。" : "女巫守住了自己的金币。")}</p>
        {result.attempt ? <span className="result-attempt">第 {result.attempt} 次挑战</span> : null}
      </div>
    </div>
  );
}

export default function App() {
  const [account, setAccount] = useState("");
  const [walletProvider, setWalletProvider] = useState<WalletProvider | null>(null);
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [snapshot, setSnapshot] = useState<GameSnapshot>({ lastResult: null, winnersCount: 0 });
  const [guest, setGuest] = useState<GuestAccount | null>(null);
  const [useGuest, setUseGuest] = useState(false);
  const [history, setHistory] = useState(readHistory);
  const [winsOnly, setWinsOnly] = useState(false);
  const pendingCount = history.filter((entry) => entry.state === "pending").length;
  const hasPending = pendingCount > 0;
  const historyRef = useRef(history);
  const shownHistory = history.filter((entry) => !winsOnly || entry.result?.give_coin === true);
  const signer = useGuest ? guest?.address : account;
  const [notice, setNotice] = useState("");
  const [statsLoading, setStatsLoading] = useState(true);

  const busy = phase === "connecting" || phase === "submitting";
  const canSubmit = Boolean(signer && (useGuest || walletProvider) && message.trim().length > 0 && message.length <= 1000 && !busy);

  const refresh = useCallback(async () => {
    setStatsLoading(true);
    try {
      const next = await readGameSnapshot();
      setSnapshot(next);
    } catch (error) {
      setNotice(`暂时无法读取合约状态：${parseError(error)}`);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!walletProvider?.on) return;
    const onAccountsChanged = (accounts: string[]) => {
      setAccount(accounts?.[0] ?? "");
      if (!accounts?.length) setWalletProvider(null);
    };
    const onChainChanged = () => {
      setNotice("检测到钱包网络变化。提交挑战前会再次检查 Studionet 网络。");
    };
    walletProvider.on("accountsChanged", onAccountsChanged);
    walletProvider.on("chainChanged", onChainChanged);
    return () => {
      walletProvider.removeListener?.("accountsChanged", onAccountsChanged);
      walletProvider.removeListener?.("chainChanged", onChainChanged);
    };
  }, [walletProvider]);

  const connectWallet = useCallback(async () => {
    const provider = getInjectedWallet();
    if (!provider) {
      setNotice("未检测到钱包插件。请安装 MetaMask 或 OKX Wallet 后刷新页面。");
      return;
    }
    setPhase("connecting");
    setNotice("");
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      if (!accounts?.[0]) throw new Error("钱包没有返回账户地址。");
      await ensureStudionet(provider);
      setUseGuest(false);
      setWalletProvider(provider);
      setAccount(accounts[0]);
      setPhase("idle");
      setNotice("钱包已连接到 GenLayer Studionet。");
    } catch (error) {
      setPhase("error");
      setNotice(parseError(error));
    }
  }, []);

  useEffect(() => {
    historyRef.current = history;
    try {
      localStorage.setItem(historyKey, JSON.stringify(history));
    } catch {
      // Keep the current page usable if browser storage is unavailable.
    }
  }, [history]);

  useEffect(() => {
    if (!hasPending) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const lastChecked = new Map<FixedHash, number>();

    async function poll() {
      const batch = historyRef.current
        .filter((entry) => entry.state === "pending")
        .sort((a, b) => (lastChecked.get(a.hash) ?? 0) - (lastChecked.get(b.hash) ?? 0))
        .slice(0, 4);
      const changed = new Map<FixedHash, Dialogue>();
      await Promise.all(batch.map(async (entry) => {
        lastChecked.set(entry.hash, Date.now());
        const check = await readDialogue(entry.hash).catch(() => null);
        if (!check || check.state === "pending") return;
        lastChecked.delete(entry.hash);
        changed.set(entry.hash, { ...entry, ...check });
      }));
      if (stopped) return;
      if (changed.size) {
        setHistory((entries) => entries.map((entry) => changed.get(entry.hash) ?? entry));
        void refresh();
      }
      timer = setTimeout(() => void poll(), 4000);
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [hasPending, refresh]);

  async function enableGuest() {
    setPhase("connecting");
    setNotice("正在领取 Studionet 测试 GEN…");
    const temporary = guest ?? createGuestAccount();
    setGuest(temporary);
    setUseGuest(true);
    try {
      await fundGuest(temporary);
      setPhase("idle");
      setNotice("临时钱包已就绪。");
    } catch (error) {
      setPhase("error");
      setNotice(parseError(error));
    }
  }

  async function submit() {
    if (!canSubmit) return;
    const cleanMessage = message.trim();
    setPhase("submitting");
    setNotice(useGuest ? "临时钱包正在签名并提交…" : "请在钱包中确认交易。");
    try {
      let hash: FixedHash;
      if (useGuest && guest) {
        await fundGuest(guest);
        hash = await submitWizardMessage(guest, cleanMessage);
      } else if (walletProvider) {
        await ensureStudionet(walletProvider);
        hash = await submitWizardMessage({ address: account, provider: walletProvider }, cleanMessage);
      } else {
        return;
      }
      const entry = { hash, message: cleanMessage, state: "pending" } as const;
      setHistory((previous) => [entry, ...previous.filter((turn) => turn.hash !== hash)]);
      setMessage("");
      setPhase("idle");
      setNotice("交易已提交。可以继续发送，链上结果确认后会自动显示。");
    } catch (error) {
      setPhase("error");
      setNotice(parseError(error));
    }
  }

  const phaseLabel = useMemo(() => {
    if (phase === "connecting") return "连接钱包中…";
    if (phase === "submitting") return "正在提交…";
    if (phase === "error") return "需要处理";
    return "准备就绪";
  }, [phase]);

  return (
    <main className="page-shell">
      <div className="ambient ambient-lilac" />
      <div className="ambient ambient-mint" />
      <div className="ambient ambient-peach" />

      <header className="topbar">
        <div className="brand">
          <BrandMark />
          <div>
            <h1>Wizard of Coin</h1>
            <p>说服 AI 巫师把金币交给你。</p>
          </div>
        </div>
        <div className="top-actions">
          <a className="network-pill" href="https://docs.genlayer.com/developers/networks" target="_blank" rel="noreferrer">
            <span className="live-dot" />
            GENLAYER · STUDIONET
            <span className="network-id">61999</span>
          </a>
          {account && !useGuest ? (
            <button className="wallet-button connected" onClick={() => setNotice("当前连接：" + account)}>
              <span className="wallet-dot" />{shortAddress(account)}
            </button>
          ) : (
            <button className="wallet-button" onClick={() => void connectWallet()} disabled={busy}>
              {phase === "connecting" ? "连接中…" : "连接钱包"}
            </button>
          )}
          <button className="wallet-button" onClick={() => void enableGuest()} disabled={busy}>
            {useGuest ? "临时钱包 · 领取测试 GEN" : "创建临时钱包"}
          </button>
        </div>
      </header>

      <section className="intro-grid">
        <div className="intro-main">
          <div className="eyebrow"><span className="eyebrow-star">✧</span> A SMALL GAME OF PERSUASION</div>
          <h2>一枚金币，一位固执的巫师。<br /><span>你能说服他吗？</span></h2>
          <p className="intro-description">每一次对话都会提交给 GenLayer 共识网络。女巫会认真读完你的理由，但金币可没那么容易到手。</p>
          <div className="reward-strip">
            <div className="reward-tile reward-muted">
              <div className="reward-medal"><span>✦</span></div>
              <div><small>挑战参考值</small><strong>50 GLP</strong><em>展示用 · 暂不可领取</em></div>
            </div>
            <div className="reward-tile reward-prize">
              <div className="reward-medal coin-medal"><span>✧</span></div>
              <div><small>金币悬赏参考值</small><strong>1,000 GLP</strong><em>展示用 · 暂无代币发放</em></div>
            </div>
          </div>
        </div>

        <aside className="how-card">
          <div className="how-heading">
            <span>如何游玩</span>
            <a href={CONTRACT_URL} target="_blank" rel="noreferrer">查看合约 ↗</a>
          </div>
          <div className="how-step"><span className="step-icon">✎</span><p>说服 AI 巫师把金币交给你。</p></div>
          <div className="how-step"><span className="step-icon">▣</span><p>使用临时钱包或连接浏览器钱包，提交挑战。</p></div>
          <div className="how-step"><span className="step-icon">⚖</span><p>由 GenLayer 共识验证巫师的决定。</p></div>
          <div className="how-note">每次提交最多 1,000 个字符。女巫会记住挑战结果，链上记录可公开查询。</div>
          <div className="how-footer"><span className="how-footer-dot" />真实合约交互 · 非本地模拟</div>
        </aside>
      </section>

      <section className="game-card">
        <div className="game-visual">
          <WizardScene />
          <div className="visual-footer">
            <span className="visual-label">THE WIZARD'S REALM</span>
            <span className="visual-stats">
              <span><b>{statsLoading ? "—" : snapshot.lastResult?.attempt ?? 0}</b> 次挑战</span>
              <i />
              <span><b>{statsLoading ? "—" : snapshot.winnersCount}</b> 次给出金币</span>
            </span>
          </div>
        </div>

        <div className="game-console">
          <div className="console-top">
            <div>
              <span className="console-kicker">YOUR TURN</span>
              <h3>给女巫写一封信</h3>
            </div>
            <div className={`phase-badge phase-${phase}`}><span />{phaseLabel}</div>
          </div>

          <label className="message-label" htmlFor="wizard-message">你的请求</label>
          <textarea
            id="wizard-message"
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, 1000))}
            placeholder="巫师，把金币给我吧，因为……"
            maxLength={1000}
            disabled={busy}
          />
          <div className="input-meta">
            <span>真诚一点，或者试试你的智慧。</span>
            <span className={message.length > 900 ? "count-warning" : ""}>{message.length.toLocaleString("en-US")}/1,000</span>
          </div>

          <button
            className="submit-button"
            onClick={() => void submit()}
            disabled={!canSubmit}
          >
            {busy ? <span className="button-spinner" /> : <span className="button-sparkle">✧</span>}
            {phase === "submitting" ? "正在提交…" : "发送消息"}
            {!busy ? <span className="button-sparkle trailing">✧</span> : null}
          </button>

          {!signer ? (
            <div className="connect-hint">
              <span>◈</span> 创建临时钱包即可试玩，也可连接 MetaMask 或 OKX Wallet。
            </div>
          ) : (
            <div className="wallet-line">
              <span className="wallet-dot" />{shortAddress(signer)} {useGuest ? "临时钱包" : "已连接"}
              <button onClick={() => void refresh()} disabled={statsLoading}>刷新链上结果</button>
            </div>
          )}

          {useGuest ? <p className="guest-note">临时钱包私钥只在当前页面内存中，刷新或关闭后失效。仅用于测试 GEN。</p> : null}

          {notice ? <div className={`notice notice-${phase === "error" ? "error" : "info"}`}>{notice}</div> : null}

          {pendingCount > 0 ? <p className="guest-note" role="status">{pendingCount} 笔交易等待最终确认，可以继续发送。</p> : null}
        </div>
      </section>

      <section className="dialogue-history" aria-labelledby="history-title">
        <div className="history-heading">
          <h3 id="history-title">对话记录</h3>
          <label><input type="checkbox" checked={winsOnly} onChange={(event) => setWinsOnly(event.target.checked)} /> 只看成功话术</label>
        </div>
        {shownHistory.length === 0 ? <p>{winsOnly ? "还没有已确认的成功话术。" : "暂无对话。记录保存在当前浏览器。"}</p> : null}
        {shownHistory.map((entry) => (
          <article className="history-entry" key={entry.hash}>
            <p><strong>{entry.result?.give_coin ? "成功话术" : "你的话术"}</strong> · {entry.message}</p>
            {entry.result ? <ResultCard result={entry.result} /> : (
              <p>{entry.state === "pending" ? "等待最终确认" : entry.state === "failed" ? "交易未成功执行" : "回执缺少可核对的答复"}</p>
            )}
            <a className="tx-link" href={`${EXPLORER_URL}/tx/${entry.hash}`} target="_blank" rel="noreferrer">
              <span>查看链上交易</span><code>{shortAddress(entry.hash)}</code><b>↗</b>
            </a>
          </article>
        ))}
      </section>

      <footer className="site-footer">
        <div className="footer-brand"><BrandMark /><span>Wizard of Coin</span></div>
        <span>Built for GenLayer · Stable Studionet</span>
        <div className="footer-links">
          <a href={CONTRACT_URL} target="_blank" rel="noreferrer">合约</a>
          <a href={`${EXPLORER_URL}/tx/0x437174db51141deb2d52ff952dd3539e8b0271c21c7c142fbbfb3ff7b618f851`} target="_blank" rel="noreferrer">部署交易</a>
          <a href="https://github.com/halihalibt/wizard-of-coin-genlayer" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </footer>
    </main>
  );
}
