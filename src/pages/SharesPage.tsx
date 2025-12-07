import { useEffect, useState, useRef, useCallback } from "react";
import { priceHubConnection } from "../signalr/priceHub";
import { type ShareCardShortModel } from "../models/ShareCardShortModel";

const TICKERS = ["SBER", "GAZP", "LKOH", "ROSN", "NVTK", "GMKN", "PLZL", "TATN", "MGNT", "VTBR", "ALRS", "MOEX", "SNGS"];

export default function SharesPage() {
  const [shares, setShares] = useState<ShareCardShortModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connected" | "reconnecting">("disconnected");
  const [priceChanges, setPriceChanges] = useState<Record<string, number>>({});
  
  const isConnectionSetup = useRef(false);
  const isMounted = useRef(true);
  const hasSubscribed = useRef(false);

  // Загрузка данных акций
  useEffect(() => {
    loadShares();
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Настройка SignalR соединения
  useEffect(() => {
    if (isConnectionSetup.current) return;
    
    isConnectionSetup.current = true;
    setupSignalRConnection();

    return () => {
      if (priceHubConnection.state === "Connected") {
        console.log("Компонент размонтируется, отписываемся...");
        unsubscribeAll();
        priceHubConnection.stop();
      }
    };
  }, []);

  // Подписка на обновления после загрузки акций (один раз)
  useEffect(() => {
    if (shares.length > 0 && connectionStatus === "connected" && !hasSubscribed.current) {
      subscribeToShares();
      hasSubscribed.current = true;
    }
  }, [shares, connectionStatus]);

  const loadShares = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("http://localhost:8080/api/v1/ShareCard/short");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const allShares: ShareCardShortModel[] = await response.json();
      
      const filteredShares = allShares.filter(share => 
        TICKERS.includes(share.ticker.toUpperCase())
      );
      
      setShares(filteredShares);
      
    } catch (err) {
      console.error("Ошибка при загрузке акций:", err);
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const setupSignalRConnection = async () => {
    try {
      // Обработчик обновления цен
      const handlePriceUpdate = (stockPrice: { 
        ticker: string; 
        price: number; 
        changePrice: number; 
        timestamp: string;
      }) => {
        console.log("Получено обновление цены:", stockPrice);
        
        const { ticker, price, changePrice } = stockPrice;
        
        if (ticker) {
          // Сохраняем изменение
          setPriceChanges(prev => ({
            ...prev,
            [ticker]: changePrice
          }));
          
          // Убираем подсветку через 5 секунд
          setTimeout(() => {
            setPriceChanges(prev => {
              const newChanges = { ...prev };
              delete newChanges[ticker];
              return newChanges;
            });
          }, 5000);
          
          // Обновляем цену в таблице
          setShares(prevShares => 
            prevShares.map(share => {
              // Важно: данные приходят с ticker вида "SNGS", а не "SNGS_TQBR"
              // Нужно сравнить только тикер, без борды
              if (ticker.toUpperCase() === share.ticker.toUpperCase()) {
                return {
                  ...share,
                  currentPrice: price
                };
              }
              return share;
            })
          );
        }
      };

      priceHubConnection.on("PriceUpdate", handlePriceUpdate);

      // Обработчики состояния соединения
      priceHubConnection.onclose((err) => {
        if (isMounted.current) {
          setConnectionStatus("disconnected");
          hasSubscribed.current = false; // Сброс флага при отключении
        }
        console.log("Соединение с SignalR закрыто", err?.message);
      });

      priceHubConnection.onreconnecting((err) => {
        if (isMounted.current) {
          setConnectionStatus("reconnecting");
        }
        console.log("Переподключение к SignalR...", err);
      });

      priceHubConnection.onreconnected((connId) => {
        if (isMounted.current) {
          setConnectionStatus("connected");
          hasSubscribed.current = false; // Нужно подписаться заново
        }
        console.log("Соединение с SignalR восстановлено", connId);
        
        // Подписываемся заново после переподключения
        if (shares.length > 0) {
          setTimeout(() => {
            subscribeToShares();
          }, 1000);
        }
      });

      // Подключаемся
      await priceHubConnection.start();
      if (isMounted.current) {
        setConnectionStatus("connected");
      }
      console.log("Соединение с SignalR установлено");

    } catch (err) {
      console.error("Ошибка подключения к SignalR:", err);
      if (isMounted.current) {
        setConnectionStatus("disconnected");
      }
    }
  };

  const subscribeToShares = useCallback(async () => {
    try {
      if (priceHubConnection.state === "Connected" && shares.length > 0) {
        // Формируем список групп для подписки
        const subscriptionKeys = shares.map(share => 
          `${share.ticker}_${share.board}`.toUpperCase()
        );
        
        console.log("Подписываемся на обновления:", subscriptionKeys);
        
        // Вызываем метод Subscribe на сервере
        await priceHubConnection.invoke("Subscribe", subscriptionKeys);
        console.log("Подписка выполнена успешно");
        hasSubscribed.current = true;
      }
    } catch (err) {
      console.error("Ошибка при подписке на обновления:", err);
      hasSubscribed.current = false;
    }
  }, [shares]);

  const unsubscribeAll = async () => {
    try {
      if (shares.length > 0 && priceHubConnection.state === "Connected") {
        const subscriptionKeys = shares.map(share => 
          `${share.ticker}_${share.board}`.toUpperCase()
        );
        
        await priceHubConnection.invoke("Unsubscribe", subscriptionKeys);
        console.log("Отписаны от всех обновлений");
        hasSubscribed.current = false;
      }
    } catch (err) {
      console.error("Ошибка при отписке:", err);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected": return "green";
      case "reconnecting": return "orange";
      case "disconnected": return "red";
      default: return "gray";
    }
  };

  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) return "-";
    return price.toFixed(2);
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Загрузка данных...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Ошибка при загрузке данных</h2>
        <p>{error}</p>
        <button onClick={loadShares} style={{ padding: "10px 20px", marginTop: "10px" }}>
          Повторить попытку
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Акции российского рынка</h1>
      
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span>Статус подключения: </span>
          <div style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: getStatusColor(),
            display: "inline-block"
          }} />
          <span>
            {connectionStatus === "connected" ? "Подключено" : 
             connectionStatus === "reconnecting" ? "Переподключение..." : 
             "Отключено"}
          </span>
        </div>
        <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
          <button 
            onClick={loadShares} 
            style={{ padding: "5px 10px" }}
          >
            Обновить данные
          </button>
          <button 
            onClick={async () => {
              if (connectionStatus === "connected") {
                await unsubscribeAll();
                await priceHubConnection.stop();
              } else {
                await priceHubConnection.start();
              }
            }}
            style={{ padding: "5px 10px" }}
          >
            {connectionStatus === "connected" ? "Отключить" : "Подключить"} SignalR
          </button>
        </div>
      </div>

      <table border={1} width="100%" cellPadding={8} style={{ marginTop: 10, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#f2f2f2" }}>
            <th>Тикер</th>
            <th>Название</th>
            <th>Биржа</th>
            <th>Цена</th>
          </tr>
        </thead>
        <tbody>
          {shares.map(s => {
            const change = priceChanges[s.ticker.toUpperCase()];
            
            return (
              <tr key={s.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ fontWeight: "bold" }}>{s.ticker}</td>
                <td>{s.name}</td>
                <td>{s.board}</td>
                <td style={{ 
                  fontWeight: "bold",
                  color: s.currentPrice && s.currentPrice > 0 ? "#2e7d32" : "#000",
                  backgroundColor: change !== undefined ? 
                    (change > 0 ? "#e8f5e8" : "#ffebee") : 
                    "transparent",
                  transition: "background-color 0.5s ease"
                }}>
                  {formatPrice(s.currentPrice)} {s.currency}
                  {change !== undefined && (
                    <span style={{ 
                      fontSize: "0.8em",
                      marginLeft: "5px",
                      color: change > 0 ? "#2e7d32" : "#c62828"
                    }}>
                      ({change > 0 ? "+" : ""}{change.toFixed(2)})
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div style={{ marginTop: "20px", fontSize: "12px", color: "#666" }}>
        <p>Всего отображается: {shares.length} акций из {TICKERS.length} запрошенных тикеров</p>
        <p>Обновление цен происходит каждые 10 секунд через SignalR</p>
        <p>Статус подписки: {hasSubscribed.current ? "Подписан" : "Не подписан"}</p>
      </div>
    </div>
  );
}