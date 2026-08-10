/**
 * Noop shim for optional Coinbase x402 packages that wagmi 2.x's
 * @base-org/account pulls in transitively. We don't enable the
 * Coinbase Wallet connector by default, so the import can be a stub.
 */
export default {};
export const createX402Client = () => null;
export const decodePaymentRequired = () => null;
