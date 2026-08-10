/**
 * Transfer store. Tracks each in-flight remittance end-to-end so the
 * status page, recipient view, and admin/compare widget can all pull
 * from the same source. In production this would be a DB; for the demo
 * we keep it in-process.
 */
import { create } from 'zustand';

export type TransferStep =
  | 'created'
  | 'payment_submitted'
  | 'payment_received'
  | 'awaiting_executor'
  | 'reserved'
  | 'minting'
  | 'proof_submitted'
  | 'minted'
  | 'transferred'
  | 'redeemed'
  | 'settled'
  | 'manual_review'
  | 'refunded'
  | 'failed';

export interface Transfer {
  id: string;
  senderName: string;
  recipientName: string;
  recipientXrplAddress: string;     // e.g. rXXXXXXXX...
  recipientFlareAddress: string;    // 0x... — optional, set if recipient is a Coston2 user
  amountInr: number;
  amountFxrp: string;               // human string, e.g. "53.7"
  xrpUsdAtQuote: number;
  feeInr: number;
  upiOrderId: string;
  upiRef: string;
  mintTxHash?: string;
  collateralReservationId?: string;
  mintingRequestId?: string;
  proofTxHash?: string;
  pipelineError?: string;
  retryCount?: number;
  idempotencyKey?: string;
  manualReviewReason?: string;
  paymentVerifiedAt?: number;
  transferTxHash?: string;
  redeemTxHash?: string;
  step: TransferStep;
  createdAt: number;
  updatedAt: number;
}

interface TransferStore {
  transfers: Record<string, Transfer>;
  add: (t: Transfer) => void;
  update: (id: string, patch: Partial<Transfer>) => void;
  get: (id: string) => Transfer | undefined;
}

export const useTransferStore = create<TransferStore>((set, get) => ({
  transfers: {},
  add: (t) => set((s) => ({ transfers: { ...s.transfers, [t.id]: t } })),
  update: (id, patch) =>
    set((s) => {
      const cur = s.transfers[id];
      if (!cur) return s;
      return {
        transfers: {
          ...s.transfers,
          [id]: { ...cur, ...patch, updatedAt: Date.now() },
        },
      };
    }),
  get: (id) => get().transfers[id],
}));
