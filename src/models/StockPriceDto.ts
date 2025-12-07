export interface StockPriceDto {
  //Тикер актива
  Ticker: string;
  //Цена актива
  Price: number;
  //Изменение цены актива
  ChangePrice: number;
  //Дата
  Timestamp: string;
}