export interface PaystackPopSetupOptions {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref?: string;
  metadata?: Record<string, any>;
  callback: (response: { reference: string }) => void;
  onClose: () => void;
}

export interface PaystackPopHandler {
  openIframe: () => void;
}

export interface PaystackPopStatic {
  setup: (options: PaystackPopSetupOptions) => PaystackPopHandler;
}

declare global {
  interface Window {
    PaystackPop: PaystackPopStatic;
  }
}