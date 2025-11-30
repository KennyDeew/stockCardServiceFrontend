import { useEffect, useState } from "react";
import { type ShareCardShortModel } from "../models/ShareCardShortModel";

export default function SharesPage() {
  const [shares, setShares] = useState<ShareCardShortModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Загружаем акции с сервера
  async function loadShares() {
    const response = await fetch("http://localhost:8080/api/v1/ShareCard/short");
    const data = await response.json();
    setShares(data);
    setLoading(false);
  }

  useEffect(() => {
    loadShares();

    // обновлять цены каждые X секунд
    const timer = setInterval(loadShares, 3000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <p>Загрузка...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Список акций</h2>

      <table border={1} cellPadding={8} style={{ width: "100%", marginTop: 20 }}>
        <thead>
          <tr>
            <th>Тикер</th>
            <th>Название</th>
            <th>Режим торгов</th>
            <th>Валюта</th>
            <th>Текущая цена</th>
          </tr>
        </thead>
        <tbody>
          {shares.map((s) => (
            <tr key={s.id}>
              <td>{s.ticker}</td>
              <td>{s.name}</td>
              <td>{s.board}</td>
              <td>{s.currency}</td>
              <td>{s.currentPrice.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}