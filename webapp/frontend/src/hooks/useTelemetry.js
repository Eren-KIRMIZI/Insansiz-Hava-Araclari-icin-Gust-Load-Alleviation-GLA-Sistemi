import { useState, useEffect, useRef } from 'react';

export function useTelemetry(url = 'ws://127.0.0.1:8000/ws') {
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState(null);
  const [glaActive, setGlaActive] = useState(true);
  const wsRef = useRef(null);

  useEffect(() => {
    let ws;
    let reconnectTimer;

    const connect = () => {
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setData(parsed);
          setGlaActive(parsed.gla_active);
        } catch (e) {
          console.error("Error parsing telemetry data", e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer = setTimeout(connect, 1000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error", err);
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [url]);

  const sendCommand = (payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const toggleGla = (active) => {
    sendCommand({ gla: active });
  };

  const setGust = (amp, length = 8.0) => {
    sendCommand({ gust_amp: amp, gust_len: length });
  };

  const resetSim = () => {
    sendCommand({ reset: true });
  };

  return {
    connected,
    data,
    glaActive,
    toggleGla,
    setGust,
    resetSim
  };
}
