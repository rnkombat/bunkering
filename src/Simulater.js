import React, { useState } from 'react';
import './Simulater.css';

const Simulater = () => {
  // 状態の定義
  const [ports, setPorts] = useState([
    { id: 1, fuelPrice: 100, name: '港1' },
    { id: 2, fuelPrice: 120, name: '港2' },
    { id: 3, fuelPrice: 90, name: '港3' }
  ]);
  const [distances, setDistances] = useState([
    { from: 1, to: 2, consumption: 50 },
    { from: 2, to: 3, consumption: 60 }
  ]);
  const [result, setResult] = useState(null);
  const [tankCapacity, setTankCapacity] = useState(100);
  const [initialFuel, setInitialFuel] = useState(0);

  // 港を追加する関数
  const addPort = () => {
    const newPortId = ports.length > 0 ? Math.max(...ports.map(p => p.id)) + 1 : 1;
    setPorts([...ports, {
      id: newPortId,
      fuelPrice: 100,
      name: `港${newPortId}`
    }]);

    // 新しい港と隣接する港との距離を追加
    if (ports.length > 0) {
      const lastPort = ports[ports.length - 1];
      setDistances([...distances, {
        from: lastPort.id,
        to: newPortId,
        consumption: 50
      }]);
    }
  };

  // 港を削除する関数
  const removePort = (portId) => {
    setPorts(ports.filter(port => port.id !== portId));
    setDistances(distances.filter(d => d.from !== portId && d.to !== portId));
  };

  // 港の情報を更新する関数
  const updatePort = (id, field, value) => {
    setPorts(ports.map(port => 
      port.id === id ? { ...port, [field]: field === 'fuelPrice' ? parseFloat(value) : value } : port
    ));
  };

  // 距離の情報を更新する関数
  const updateDistance = (fromId, toId, value) => {
    setDistances(distances.map(dist => 
      (dist.from === fromId && dist.to === toId) || (dist.from === toId && dist.to === fromId)
        ? { ...dist, consumption: parseFloat(value) }
        : dist
    ));
  };

  // C++コードを参考にした最小燃料費計算アルゴリズム
  const calculateMinCost = () => {
    // ポートが少なくとも2つ必要
    if (ports.length < 2) {
      alert('少なくとも2つの港が必要です');
      return;
    }

    // ポートを順序通りに並べる（IDではなく、追加された順）
    const sortedPorts = [...ports].sort((a, b) => {
      const aIdx = ports.findIndex(p => p.id === a.id);
      const bIdx = ports.findIndex(p => p.id === b.id);
      return aIdx - bIdx;
    });

    const N = sortedPorts.length;
    
    // 各給油所の価格
    const S = sortedPorts.map(port => port.fuelPrice);
    
    // 各区間の燃料消費量
    const V = [];
    
    // 各区間の燃料消費量を距離データから構築
    for (let i = 0; i < N - 1; i++) {
      const fromPort = sortedPorts[i];
      const toPort = sortedPorts[i + 1];
      
      const distObj = distances.find(d => 
        (d.from === fromPort.id && d.to === toPort.id) || 
        (d.from === toPort.id && d.to === fromPort.id)
      );
      
      if (!distObj) {
        alert(`${fromPort.name}から${toPort.name}への距離情報がありません`);
        return;
      }
      
      V.push(distObj.consumption);
    }
    
    // 累積燃料消費量を計算
    const cumV = [0];
    for (let i = 0; i < V.length; i++) {
      cumV.push(cumV[i] + V[i]);
    }
    
    // dp[i] = 地点iまでの最小燃料コスト
    const dp = Array(N).fill(Number.MAX_SAFE_INTEGER);
    // prev[i] = 地点iに到達する直前に給油した地点
    const prev = Array(N).fill(-1);
    // amount[i] = 地点prev[i]で給油した量
    const amount = Array(N).fill(0);
    
    // 初期状態: 出発地点のコストは0
    dp[0] = 0;
    
    for (let i = 0; i < N - 1; i++) {
      if (dp[i] === Number.MAX_SAFE_INTEGER) continue;  // この地点に到達できない
      
      const current_price = S[i];
      let remainingFuel = initialFuel;
      
      // 地点iが最初の地点(i=0)の場合、初期燃料を考慮
      if (i === 0) {
        remainingFuel = initialFuel;
      } else {
        remainingFuel = 0; // i=0以外の地点では、新たに給油するので残燃料は0
      }
      
      // 地点iから到達可能な全ての地点jについて考える
      for (let j = i + 1; j < N; j++) {
        const fuel_needed = cumV[j] - cumV[i];  // iからjまでの燃料消費量
        
        if (fuel_needed > tankCapacity) continue;  // タンク容量を超える場合はスキップ
        
        // 初期燃料がある場合の考慮
        let actualFuelNeeded = fuel_needed;
        if (i === 0 && remainingFuel > 0) {
          // 初期燃料で一部または全てをカバーできる場合
          actualFuelNeeded = Math.max(0, fuel_needed - remainingFuel);
        }
        
        // 地点jへの最小コストを更新できるか
        const cost = dp[i] + current_price * actualFuelNeeded;
        if (cost < dp[j]) {
          dp[j] = cost;
          prev[j] = i;
          amount[j] = actualFuelNeeded;
        }
      }
    }
    
    if (dp[N - 1] === Number.MAX_SAFE_INTEGER) {
      alert('目的地に到達できません。タンク容量を増やすか、港間距離を調整してください。');
      return;
    }
    
    // 最適経路を復元
    const route = [];
    const fuelAmounts = [];
    let pos = N - 1;
    
    while (pos > 0) {
      route.push(prev[pos]);
      fuelAmounts.push(amount[pos]);
      pos = prev[pos];
    }
    
    route.reverse();
    fuelAmounts.reverse();
    
    // 詳細情報の作成
    const details = [];
    let totalFuel = 0;
    let totalCost = 0;
    
    for (let i = 0; i < route.length; i++) {
      const stationIndex = route[i];
      const station = sortedPorts[stationIndex];
      const fuelAmount = fuelAmounts[i];
      
      // 燃料量が0より大きい場合のみ給油情報を追加
      if (fuelAmount > 0) {
        const cost = station.fuelPrice * fuelAmount;
        
        details.push({
          station: station,
          fuelAmount: fuelAmount,
          fuelPrice: station.fuelPrice,
          cost: cost
        });
        
        totalFuel += fuelAmount;
        totalCost += cost;
      }
    }
    
    // ルート情報の作成
    const routeInfo = [];
    for (let i = 0; i < route.length; i++) {
      routeInfo.push(sortedPorts[route[i]]);
    }
    // 最後の港も追加
    routeInfo.push(sortedPorts[N - 1]);
    
    // 結果を設定
    setResult({
      totalCost: totalCost,
      totalFuel: totalFuel,
      route: routeInfo,
      details: details
    });
  };

  return (
    <div className="simulator-container">
      <h1>港間移動の最小燃料費計算</h1>
      
      <div className="settings-section">
        <h2>基本設定</h2>
        <div className="input-group">
          <label>燃料タンク容量:</label>
          <input 
            type="number" 
            value={tankCapacity} 
            onChange={(e) => setTankCapacity(parseFloat(e.target.value))} 
            min="1"
          />
        </div>
        <div className="input-group">
          <label>初期燃料量:</label>
          <input 
            type="number" 
            value={initialFuel} 
            onChange={(e) => setInitialFuel(parseFloat(e.target.value))} 
            min="0"
            max={tankCapacity}
          />
        </div>
      </div>
      
      <div className="ports-section">
        <h2>港の情報</h2>
        <table className="ports-table">
          <thead>
            <tr>
              <th>港名</th>
              <th>給油料金(1単位あたり)</th>
              <th>アクション</th>
            </tr>
          </thead>
          <tbody>
            {ports.map((port, index) => (
              <tr key={port.id}>
                <td>
                  <input 
                    type="text" 
                    value={port.name} 
                    onChange={(e) => updatePort(port.id, 'name', e.target.value)} 
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    value={port.fuelPrice} 
                    onChange={(e) => updatePort(port.id, 'fuelPrice', e.target.value)} 
                    min="1"
                  />
                </td>
                <td>
                  {ports.length > 2 && <button onClick={() => removePort(port.id)}>削除</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addPort}>港を追加</button>
      </div>
      
      <div className="distances-section">
        <h2>港間の燃料消費量</h2>
        <table className="distances-table">
          <thead>
            <tr>
              <th>出発港</th>
              <th>到着港</th>
              <th>消費燃料</th>
            </tr>
          </thead>
          <tbody>
            {distances.map((dist, index) => {
              const fromPort = ports.find(p => p.id === dist.from);
              const toPort = ports.find(p => p.id === dist.to);
              
              if (!fromPort || !toPort) return null;
              
              return (
                <tr key={index}>
                  <td>{fromPort.name}</td>
                  <td>{toPort.name}</td>
                  <td>
                    <input 
                      type="number" 
                      value={dist.consumption} 
                      onChange={(e) => updateDistance(dist.from, dist.to, e.target.value)} 
                      min="1"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="actions-section">
        <button onClick={calculateMinCost} className="calculate-button">計算実行</button>
      </div>
      
      {result && (
        <div className="result-section">
          <h2>計算結果</h2>
          <p className="total-cost">合計燃料コスト: {result.totalCost.toFixed(2)}</p>
          <p>総給油量: {result.totalFuel.toFixed(2)}</p>
          
          <h3>最適ルート:</h3>
          <div className="route-path">
            {result.route.map((port, index) => (
              <span key={index}>
                {port.name}
                {index < result.route.length - 1 ? ' → ' : ''}
              </span>
            ))}
          </div>
          
          <h3>給油詳細:</h3>
          <ul className="route-details">
            {result.details.map((detail, index) => (
              <li key={index}>
                <strong>{detail.station.name}</strong>での給油:
                <ul>
                  <li>給油量: <strong>{detail.fuelAmount.toFixed(2)}</strong>単位</li>
                  <li>燃料単価: {detail.fuelPrice.toFixed(2)}</li>
                  <li>給油コスト: {detail.cost.toFixed(2)}</li>
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Simulater;