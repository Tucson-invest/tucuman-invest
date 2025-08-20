import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

function pureGenerateRecommendations(data) {
  const recs = [];
  for (const [index, values] of Object.entries(data || {})) {
    if (!Array.isArray(values) || values.length < 2) continue;
    const change = Number(values[values.length - 1]) - Number(values[0]);
    const trend = change > 0 ? "📈 Tendencia al alza" : "📉 Tendencia a la baja";
    recs.push({ ticker: index, trend, change });
  }
  return recs;
}

export default function InvestmentApp() {
  const [history, setHistory] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const mockHistory = {
    MERVAL: [1100, 1120, 1150, 1130, 1165, 1180, 1195],
    DOWJONES: [38500, 38620, 38450, 38700, 38900, 39100, 39050],
    SP500: [5050, 5070, 5090, 5080, 5105, 5120, 5115],
  };

  const generateRecommendations = (data) => {
    const recs = pureGenerateRecommendations(data);
    setRecommendations(recs);
    return recs;
  };

  const fetchStockHistory = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      if (demoMode) {
        setHistory(mockHistory);
        generateRecommendations(mockHistory);
        return;
      }

      const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY || "";
      const tickers = {
        MERVAL: "^MERV",
        DOWJONES: "^DJI",
        SP500: "^GSPC",
      };

      let newHistory = {};
      for (const [name, symbol] of Object.entries(tickers)) {
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        const series = data["Time Series (Daily)"];
        if (series) {
          const prices = Object.values(series)
            .slice(0, 7)
            .map((d) => parseFloat(d["4. close"]))
            .reverse();
          newHistory[name] = prices;
        } else {
          newHistory[name] = mockHistory[name];
        }
      }

      setHistory(newHistory);
      generateRecommendations(newHistory);
    } catch (error) {
      console.error("Error cargando historial:", error);
      setErrorMsg("No se pudieron obtener datos en vivo. Se muestran datos de ejemplo.");
      setHistory(mockHistory);
      generateRecommendations(mockHistory);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockHistory();
  }, [demoMode]);

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold col-span-2">
        📊 App de Inversiones – MERVAL, Dow Jones y S&P 500
      </motion.h1>

      <Card className="rounded-2xl shadow-md col-span-2">
        <CardContent>
          <h2 className="text-xl font-semibold mb-3">⚙️ Ajustes</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDemoMode((v) => !v)}
            >{demoMode ? "❌ Desactivar DEMO" : "🧪 Activar DEMO"}</Button>
          </div>
          {errorMsg && <p className="text-red-600 mt-2">{errorMsg}</p>}
        </CardContent>
      </Card>

      {Object.entries(history).map(([ticker, values]) => (
        <Card key={ticker} className="rounded-2xl shadow-md">
          <CardContent>
            <h2 className="text-xl font-semibold mb-2">{ticker}</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={(Array.isArray(values) ? values : []).map((p, i) => ({ day: i + 1, price: p }))}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="price" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ))}

      <Card className="rounded-2xl shadow-md col-span-2">
        <CardContent>
          <h2 className="text-xl font-semibold mb-4">📌 Recomendaciones automáticas</h2>
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <ul>
              {recommendations.map((r) => (
                <li key={r.ticker} className="mb-2">
                  <strong>{r.ticker}:</strong> {r.trend} (Cambio: {r.change})
                </li>
              ))}
            </ul>
          )}
          <Button onClick={fetchStockHistory} className="mt-4">🔄 Actualizar datos</Button>
        </CardContent>
      </Card>
    </div>
  );
}