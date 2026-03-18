/// <reference types="vite/client" />

declare module "*.less" {
  const classes: { [key: string]: string };
  export default classes;
}

interface PyWebViewAPI {
  open_external_link: (url: string) => void;
}

// Electron API types
interface ElectronAPI {
  getCdpUrl: () => Promise<string>;
  createBrowser: (options: any) => Promise<{ id: string; success: boolean }>;
  getBrowserList: () => Promise<Array<{ id: string; title: string; visible: boolean }>>;
  platform: string;
  isPackaged: boolean;
}

// Webview element type for Electron
interface ElectronWebViewElement extends HTMLElement {
  src: string;
  partition?: string;
  getWebContentsId(): number;
  loadURL(url: string): void;
  goBack(): void;
  goForward(): void;
  reload(): void;
  stop(): void;
  canGoBack(): boolean;
  canGoForward(): boolean;
}

declare global {
  interface Window {
    pywebview?: {
      api: PyWebViewAPI;
    };
    electron?: ElectronAPI;
    electronAPI?: ElectronAPI;
    copawDesktop?: {
      version: string;
      electronMode: boolean;
      platform: string;
    };
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.WebViewHTMLAttributes<HTMLWebViewElement>, HTMLWebViewElement> & {
        partition?: string;
        ref?: React.Ref<ElectronWebViewElement>;
      };
    }
  }
}

export {};


