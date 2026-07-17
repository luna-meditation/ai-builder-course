interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  close(): void;
  colorScheme: "light" | "dark";
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp };
}
