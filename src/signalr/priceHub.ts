import * as signalR from "@microsoft/signalr";

export const priceHubConnection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:8080/stockPriceHub", { withCredentials: true })
  .configureLogging(signalR.LogLevel.Debug) // самое подробное логирование
  .withAutomaticReconnect([2000, 5000, 10000, 20000])
  .build();

// Логи состояния соединения
priceHubConnection.onclose((err) => {
  console.error("❌ Hub CLOSED:", err?.message, err?.stack);
});
priceHubConnection.onreconnecting((err) => {
  console.warn("🔄 Hub RECONNECTING:", err);
});
priceHubConnection.onreconnected((connId) => {
  console.log("✅ Hub RECONNECTED. ConnId:", connId);
});