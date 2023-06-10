import { EventEmitter as P } from "events";
import {
  getAccountsFromNamespaces as R,
  getSdkError as T,
  isValidArray as v,
} from "@walletconnect/utils";
import { UniversalProvider as S } from "@walletconnect/universal-provider";
const j = "wc",
  q = "ethereum_provider",
  N = `${j}@2:${q}:`,
  $ = "https://rpc.walletconnect.com/v1/",
  p = ["eth_sendTransaction", "personal_sign"],
  D = [
    "eth_accounts",
    "eth_requestAccounts",
    "eth_call",
    "eth_getBalance",
    "eth_sendRawTransaction",
    "eth_sign",
    "eth_signTransaction",
    "eth_signTypedData",
    "eth_signTypedData_v3",
    "eth_signTypedData_v4",
    "wallet_switchEthereumChain",
    "wallet_addEthereumChain",
    "wallet_getPermissions",
    "wallet_requestPermissions",
    "wallet_registerOnboarding",
    "wallet_watchAsset",
    "wallet_scanQRCode",
  ],
  u = ["chainChanged", "accountsChanged"],
  U = ["message", "disconnect", "connect"];
var Q = Object.defineProperty,
  L = Object.defineProperties,
  H = Object.getOwnPropertyDescriptors,
  _ = Object.getOwnPropertySymbols,
  G = Object.prototype.hasOwnProperty,
  K = Object.prototype.propertyIsEnumerable,
  y = (a, t, s) =>
    t in a
      ? Q(a, t, { enumerable: !0, configurable: !0, writable: !0, value: s })
      : (a[t] = s),
  I = (a, t) => {
    for (var s in t || (t = {})) G.call(t, s) && y(a, s, t[s]);
    if (_) for (var s of _(t)) K.call(t, s) && y(a, s, t[s]);
    return a;
  },
  M = (a, t) => L(a, H(t));
function C(a) {
  return Number(a[0].split(":")[1]);
}
function w(a) {
  return `0x${a.toString(16)}`;
}
function V(a) {
  const {
    chains: t,
    optionalChains: s,
    methods: i,
    optionalMethods: e,
    events: n,
    optionalEvents: h,
    rpcMap: c,
  } = a;
  if (!v(t)) throw new Error("Invalid chains");
  const o = t,
    r = i || p,
    f = n || u,
    O = { [C(o)]: c[C(o)] },
    E = { chains: o, methods: r, events: f, rpcMap: O },
    l = n?.filter((g) => !u.includes(g)),
    d = i?.filter((g) => !p.includes(g));
  if (!s && !h && !e && !(l != null && l.length) && !(d != null && d.length))
    return { required: E };
  const b = (l?.length && d?.length) || !s,
    A = {
      chains: [...new Set(b ? o.concat(s || []) : s)],
      methods: [...new Set(r.concat(e || []))],
      events: [...new Set(f.concat(h || []))],
      rpcMap: c,
    };
  return { required: E, optional: A };
}
class m {
  constructor() {
    (this.events = new P()),
      (this.namespace = "eip155"),
      (this.accounts = []),
      (this.chainId = 1),
      (this.STORAGE_KEY = N),
      (this.on = (t, s) => (this.events.on(t, s), this)),
      (this.once = (t, s) => (this.events.once(t, s), this)),
      (this.removeListener = (t, s) => (
        this.events.removeListener(t, s), this
      )),
      (this.off = (t, s) => (this.events.off(t, s), this)),
      (this.parseAccount = (t) =>
        this.isCompatibleChainId(t) ? this.parseAccountId(t).address : t),
      (this.signer = {}),
      (this.rpc = {});
  }
  static async init(t) {
    const s = new m();
    return await s.initialize(t), s;
  }
  async request(t) {
    return await this.signer.request(t, this.formatChainId(this.chainId));
  }
  sendAsync(t, s) {
    this.signer.sendAsync(t, s, this.formatChainId(this.chainId));
  }
  get connected() {
    return this.signer.client ? this.signer.client.core.relayer.connected : !1;
  }
  get connecting() {
    return this.signer.client ? this.signer.client.core.relayer.connecting : !1;
  }
  async enable() {
    return (
      this.session || (await this.connect()),
      await this.request({ method: "eth_requestAccounts" })
    );
  }
  async connect(t) {
    if (!this.signer.client)
      throw new Error("Provider not initialized. Call init() first");
    this.loadConnectOpts(t);
    const { required: s, optional: i } = V(this.rpc);
    try {
      const e = await new Promise(async (h, c) => {
        var o;
        this.rpc.showQrModal &&
          ((o = this.modal) == null ||
            o.subscribeModal((r) => {
              !r.open &&
                !this.signer.session &&
                (this.signer.abortPairingAttempt(),
                c(new Error("Connection request reset. Please try again.")));
            })),
          await this.signer
            .connect(
              M(
                I(
                  { namespaces: { [this.namespace]: s } },
                  i && { optionalNamespaces: { [this.namespace]: i } }
                ),
                { pairingTopic: t?.pairingTopic }
              )
            )
            .then((r) => {
              h(r);
            })
            .catch((r) => {
              c(new Error(r.message));
            });
      });
      if (!e) return;
      this.setChainIds(this.rpc.chains);
      const n = R(e.namespaces, [this.namespace]);
      this.setAccounts(n),
        this.events.emit("connect", { chainId: w(this.chainId) });
    } catch (e) {
      throw (this.signer.logger.error(e), e);
    } finally {
      this.modal && this.modal.closeModal();
    }
  }
  async disconnect() {
    this.session && (await this.signer.disconnect()), this.reset();
  }
  get isWalletConnect() {
    return !0;
  }
  get session() {
    return this.signer.session;
  }
  registerEventListeners() {
    this.signer.on("session_event", (t) => {
      const { params: s } = t,
        { event: i } = s;
      i.name === "accountsChanged"
        ? ((this.accounts = this.parseAccounts(i.data)),
          this.events.emit("accountsChanged", this.accounts))
        : i.name === "chainChanged"
        ? this.setChainId(this.formatChainId(i.data))
        : this.events.emit(i.name, i.data),
        this.events.emit("session_event", t);
    }),
      this.signer.on("chainChanged", (t) => {
        const s = parseInt(t);
        (this.chainId = s),
          this.events.emit("chainChanged", w(this.chainId)),
          this.persist();
      }),
      this.signer.on("session_update", (t) => {
        this.events.emit("session_update", t);
      }),
      this.signer.on("session_delete", (t) => {
        this.reset(),
          this.events.emit("session_delete", t),
          this.events.emit(
            "disconnect",
            M(I({}, T("USER_DISCONNECTED")), {
              data: t.topic,
              name: "USER_DISCONNECTED",
            })
          );
      }),
      this.signer.on("display_uri", (t) => {
        var s, i;
        this.rpc.showQrModal &&
          ((s = this.modal) == null || s.closeModal(),
          (i = this.modal) == null || i.openModal({ uri: t })),
          this.events.emit("display_uri", t);
      });
  }
  setHttpProvider(t) {
    this.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: t.toString(16) }],
    });
  }
  isCompatibleChainId(t) {
    return typeof t == "string" ? t.startsWith(`${this.namespace}:`) : !1;
  }
  formatChainId(t) {
    return `${this.namespace}:${t}`;
  }
  parseChainId(t) {
    return Number(t.split(":")[1]);
  }
  setChainIds(t) {
    const s = t
      .filter((i) => this.isCompatibleChainId(i))
      .map((i) => this.parseChainId(i));
    s.length &&
      ((this.chainId = s[0]),
      this.events.emit("chainChanged", w(this.chainId)),
      this.persist());
  }
  setChainId(t) {
    if (this.isCompatibleChainId(t)) {
      const s = this.parseChainId(t);
      (this.chainId = s), this.setHttpProvider(s);
    }
  }
  parseAccountId(t) {
    const [s, i, e] = t.split(":");
    return { chainId: `${s}:${i}`, address: e };
  }
  setAccounts(t) {
    (this.accounts = t
      .filter(
        (s) =>
          this.parseChainId(this.parseAccountId(s).chainId) === this.chainId
      )
      .map((s) => this.parseAccountId(s).address)),
      this.events.emit("accountsChanged", this.accounts);
  }
  getRpcConfig(t) {
    var s, i;
    return {
      chains: ((s = t.chains) == null
        ? void 0
        : s.map((e) => this.formatChainId(e))) || [`${this.namespace}:1`],
      optionalChains: t.optionalChains
        ? t.optionalChains.map((e) => this.formatChainId(e))
        : void 0,
      methods: t?.methods || p,
      events: t?.events || u,
      optionalMethods: t?.optionalMethods || [],
      optionalEvents: t?.optionalEvents || [],
      rpcMap:
        t?.rpcMap ||
        this.buildRpcMap(t.chains.concat(t.optionalChains || []), t.projectId),
      showQrModal: !!(t != null && t.showQrModal),
      qrModalOptions: (i = t?.qrModalOptions) != null ? i : void 0,
      projectId: t.projectId,
      metadata: t.metadata,
    };
  }
  buildRpcMap(t, s) {
    const i = {};
    return (
      t.forEach((e) => {
        i[e] = this.getRpcUrl(e, s);
      }),
      i
    );
  }
  async initialize(t) {
    if (
      ((this.rpc = this.getRpcConfig(t)),
      (this.chainId = C(this.rpc.chains)),
      (this.signer = await S.init({
        projectId: this.rpc.projectId,
        metadata: this.rpc.metadata,
        disableProviderPing: t.disableProviderPing,
      })),
      this.registerEventListeners(),
      await this.loadPersistedSession(),
      this.rpc.showQrModal)
    ) {
      let s;
      try {
        const { WalletConnectModal: i } = await import("@walletconnect/modal");
        s = i;
      } catch {
        throw new Error(
          "To use QR modal, please install @walletconnect/modal package"
        );
      }
      if (s)
        try {
          this.modal = new s(
            I(
              {
                walletConnectVersion: 2,
                projectId: this.rpc.projectId,
                standaloneChains: this.rpc.chains,
              },
              this.rpc.qrModalOptions
            )
          );
        } catch (i) {
          throw (
            (this.signer.logger.error(i),
            new Error("Could not generate WalletConnectModal Instance"))
          );
        }
    }
  }
  loadConnectOpts(t) {
    if (!t) return;
    const { chains: s, optionalChains: i, rpcMap: e } = t;
    s &&
      v(s) &&
      ((this.rpc.chains = s.map((n) => this.formatChainId(n))),
      s.forEach((n) => {
        this.rpc.rpcMap[n] = e?.[n] || this.getRpcUrl(n);
      })),
      i &&
        v(i) &&
        ((this.rpc.optionalChains = []),
        (this.rpc.optionalChains = i?.map((n) => this.formatChainId(n))),
        i.forEach((n) => {
          this.rpc.rpcMap[n] = e?.[n] || this.getRpcUrl(n);
        }));
  }
  getRpcUrl(t, s) {
    var i;
    return (
      ((i = this.rpc.rpcMap) == null ? void 0 : i[t]) ||
      `${$}?chainId=eip155:${t}&projectId=${s || this.rpc.projectId}`
    );
  }
  async loadPersistedSession() {
    if (!this.session) return;
    const t = await this.signer.client.core.storage.getItem(
      `${this.STORAGE_KEY}/chainId`
    );
    this.setChainIds(
      t
        ? [this.formatChainId(t)]
        : this.session.namespaces[this.namespace].accounts
    ),
      this.setAccounts(this.session.namespaces[this.namespace].accounts);
  }
  reset() {
    (this.chainId = 1), (this.accounts = []);
  }
  persist() {
    this.session &&
      this.signer.client.core.storage.setItem(
        `${this.STORAGE_KEY}/chainId`,
        this.chainId
      );
  }
  parseAccounts(t) {
    return typeof t == "string" || t instanceof String
      ? [this.parseAccount(t)]
      : t.map((s) => this.parseAccount(s));
  }
}
const W = m;
export {
  W as EthereumProvider,
  U as OPTIONAL_EVENTS,
  D as OPTIONAL_METHODS,
  u as REQUIRED_EVENTS,
  p as REQUIRED_METHODS,
  m as default,
};
//# sourceMappingURL=index.es.js.map
