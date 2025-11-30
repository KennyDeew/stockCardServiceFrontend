export interface ShareCardShortModel {
  id: string;
  ticker: string;
  name: string;
  board: string;
  description?: string;
  currency: string;
  currentPrice: number;
}