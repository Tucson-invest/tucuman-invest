import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

function safeResolveApiKey() {
  const fromProcess =
    typeof process !== "undefined" &&
    process?.env?.REACT_APP_ALPHA_VANTAGE_KEY
      ? process.env.REACT_APP_ALPHA_VANTAGE_KEY
      : "";

  const fromVite =
    typeof import.meta !== "undefined" &&
    import.meta?.env?.VITE_ALPHA_VANTAGE_KEY
      ? import.meta.env.VITE_ALPHA_VANTAGE_KEY
      : "";

  const fromLocal =
    typeof window !== "undefined"
      ? window.localStorage.getItem("ALPHA_VANTAGE_KEY") || ""
      : "";

  return fromProcess || fromVite || fromLocal || "";
}

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
  const [apiKey, setApiKey] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [testResults, setTestResults] = useState([]);

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

  const runSelfTests = () => {
    const baseCases = [
      {
        name: "Alza simple",
        input: { TEST: [1, 2, 3] },
        expect: (recs) => recs[0]?.trend.includes("alza"),
      },
      {
        name: "Baja simple",
        input: { TEST: [3, 2, 1] },
        expect: (recs) => recs[0]?.trend.includes("baja"),
      },
      {
        name: "Plano cuenta como baja (regla actual)",
        input: { TEST: [2, 2, 2] },
        expect: (recs) => recs[0]?.trend.includes("baja"),
      },
    ];

    const extraCases = [
      {
        name: "Ignora entradas no-array",
        input: { BAD: "no-array" },
        expect: (recs) => recs.length === 0,
      },
      {
        name: "Ignora series de longitud 1",
        input: { SHORT: [5] },
        expect: (recs) => recs.length === 0,
      },
      {
        name: "Mixto múltiples tickers",
        input: { A: [1, 3, 2], B: [2, 5] },
        expect: (recs) => recs.every((r) => r.trend.includes("alza")),
      },
      {
        name: "Coerción numérica segura",
        input: { N: ["1", "2", 3] },
        expect: (recs) => recs[0] && recs[0].change === 2,
      },
    ];

    const results = [...baseCases, ...extraCases].map((c) => {
      const recs = pureGenerateRecommendations(c.input);
      return { name: c.name, pass: Boolean(c.expect(recs)) };
    });

    setTestResults(results);
  };

  const fetchStockHistory = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      if (demoMode || !apiKey) {
        setHistory(mockHistory);
        generateRecommendations(mockHistory);
        return;
      }

      const tickers = {
        MERVAL: "^MERV",
        DOWJONES: "^DJI",
        SP500: "^GSPC",
      };

      let newHistory = {};
      for (const [name, symbol] of Object.entries(tickers)) {
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
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
    const initial = safeResolveApiKey();
    if (initial) setApiKey(initial);
    runSelfTests();
  }, []);

  useEffect(() => {
    fetchStockHistory();
  }, [apiKey, demoMode]);

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold col-span-2">
        📊 App de Inversiones – MERVAL, Dow Jones y S&P 500
      </motion.h1>

      <Card className="rounded-2xl shadow-md col-span-2">
        <CardContent>
          <h2 className="text-xl font-semibold mb-3">⚙️ Ajustes</h2>
          <div className="flex flex-col md:flex-row gap-2 items-start md:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">API Key (Alpha Vantage)</label>
              <input
                className="w-full border rounded p-2 mt-1"
                placeholder="Pegá tu API key aquí"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("ALPHA_VANTAGE_KEY", apiKey || "");
                  }
                  fetchStockHistory();
                }}
              >💾 Guardar & Actualizar</Button>
              <Button
                variant="outline"
                onClick={() => setDemoMode((v) => !v)}
              >{demoMode ? "❌ Desactivar DEMO" : "🧪 Activar DEMO"}</Button>
            </div>
          </div>
          {errorMsg && <p className="text-red-600 mt-2">{errorMsg}</p>}
          {!apiKey && !demoMode && (
            <p className="text-amber-600 mt-2">No hay API key cargada. Activa el modo DEMO o ingresa tu clave.</p>
          )}
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

      <Card className="rounded-2xl shadow-md col-span-2">
        <CardContent>
          <h2 className="text-xl font-semibold mb-2">🧪 Pruebas internas</h2>
          <ul className="list-disc ml-6">
            {testResults.map((t) => (
              <li key={t.name} className={t.pass ? "text-green-700" : "text-red-700"}>
                {t.pass ? "✅" : "❌"} {t.name}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
