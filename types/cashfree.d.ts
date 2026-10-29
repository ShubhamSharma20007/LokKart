declare module "@cashfreepayments/cashfree-js" {
  type CashfreeMode = "sandbox" | "production";

  interface CashfreeCheckoutOptions {
    paymentSessionId: string;
    returnUrl?: string;
    redirectTarget?: "_self" | "_blank" | "_modal";
  }

  interface CashfreeCheckoutResult {
    error?: {
      message?: string;
      code?: string;
    };
    paymentDetails?: {
      paymentMessage?: string;
    };
    redirect?: boolean;
  }

  interface CashfreeInstance {
    checkout(options: CashfreeCheckoutOptions): Promise<CashfreeCheckoutResult>;
  }

  export function load(config: { mode: CashfreeMode }): Promise<CashfreeInstance>;
}
