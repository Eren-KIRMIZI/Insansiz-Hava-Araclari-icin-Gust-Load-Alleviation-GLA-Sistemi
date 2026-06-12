import React, { useMemo } from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import PageInfo from '../components/PageInfo';

function Telemetry() {
  const { data, glaActive, toggleGla, setGust, resetSim } = useTelemetry();

  const chartData = useMemo(() => {
    if (!data?.history) return [];
    return data.history.t.map((t, i) => ({
      t: t.toFixed(2),
      momentOpen: data.history.moment_open[i],
      momentClosed: data.history.moment_closed[i],
      disp: data.history.disp[i],
      control: data.history.control[i]
    }));
  }, [data]);

  const currentMoment = data?.moment_closed || 0;
  const openMoment = data?.moment_open || 0.001;
  const reduction = ((openMoment - currentMoment) / openMoment) * 100;
  const disp = data?.tip_disp || 0;
  const control = data?.control_deg || 0;
  const gust = data?.gust || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 120px)' }}>
      
      {/* Top Panel: KPIs & Controls */}
      <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', flex: 1 }}>
          <KpiCard label="MOMENT AZALIMI" value={`${reduction.toFixed(1)}%`} color={reduction > 0 ? "var(--accent-cyan)" : "var(--accent-red)"} />
          <KpiCard label="UÇ DEPLASMANI" value={`${disp.toFixed(3)} m`} color="var(--text-primary)" />
          <KpiCard label="GUST HIZI" value={`${gust.toFixed(1)} m/s`} color="var(--accent-yellow)" />
          <KpiCard label="FLAP AÇISI" value={`${control.toFixed(1)}°`} color="var(--accent-green)" />
        </div>

        {/* Controls */}
        <div className="cyber-panel" style={{ flex: 2, padding: '16px', display: 'flex', gap: '24px', alignItems: 'center' }}>
          
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>SİSTEM MODU</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className={`cyber-button ${glaActive ? 'active' : ''}`} 
                style={{ flex: 2, padding: '8px' }}
                onClick={() => toggleGla(true)}
              >
                GLA AKTİF
              </button>
              <button 
                className={`cyber-button ${!glaActive ? 'active' : ''}`} 
                style={{ flex: 2, padding: '8px' }}
                onClick={() => toggleGla(false)}
              >
                PASİF
              </button>
              <button 
                className="cyber-button" 
                style={{ flex: 1, padding: '8px' }}
                onClick={resetSim}
              >
                ↺
              </button>
            </div>
          </div>

          <div style={{ flex: 1.5 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>GUST PROFİLİ & ŞİDDETİ</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button className="cyber-button active" style={{ flex: 1, padding: '6px' }} onClick={() => setGust(10.0)}>1-COS</button>
              <button className="cyber-button" style={{ flex: 1, padding: '6px' }}>DRYDEN</button>
              <button className="cyber-button" style={{ flex: 1, padding: '6px' }} onClick={() => setGust(0.0)}>KAPALI</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="range" min="0" max="2" step="0.1" defaultValue="1" onChange={(e) => setGust(e.target.value * 10.0)} />
            </div>
          </div>

          <div style={{ flex: 1 }}>
             <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px' }}>LQR KAZANÇ AĞIRLIĞI (Q/R)</div>
             <input type="range" min="0.1" max="10" step="0.1" defaultValue="1" style={{ marginBottom: '8px' }} />
             <input type="range" min="0.1" max="10" step="0.1" defaultValue="1" />
          </div>

        </div>
      </div>

      {/* Main Charts Area */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        <ChartPanel 
          title="KÖK EĞİLME MOMENTİ [kN·m]" 
          data={chartData} 
          keys={['momentOpen', 'momentClosed']} 
          colors={['var(--text-muted)', 'var(--accent-cyan)']} 
          labels={['Açık Döngü', 'Kapalı Döngü (GLA)']}
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 0.8 }}>
          <ChartPanel 
            title="KANAT UCU DEPLASMANI [m]" 
            data={chartData} 
            keys={['disp']} 
            colors={['var(--accent-green)']} 
            labels={['Deplasman']}
          />
          <ChartPanel 
            title="KONTROL YÜZEYİ (FLAP) AÇISI [°]" 
            data={chartData} 
            keys={['control']} 
            colors={['var(--accent-yellow)']} 
            labels={['Flap Açısı']}
          />
        </div>
      </div>
      <PageInfo title="2B Telemetri Sayfası Kullanımı">
        <p>Sistemin beyni olan bu sayfada rüzgar şiddetini, kontrolcünün tepkisini ve uçaktaki rahatlamayı <strong>canlı (gerçek zamanlı)</strong> olarak izleyebilirsiniz.</p>
        <p><strong>Düğmeler Ne İşe Yarar?</strong></p>
        <ul>
          <li><strong>GLA AKTİF / PASİF:</strong> Sistemin kalbidir. <em>PASİF</em> yaparsanız uçak rüzgardan maksimum hasar alır (grafikteki sarı çizgiyi ve kök eğilme momentini izleyin). <em>AKTİF</em> yaparsanız milisaniyeler içinde kanatçıklar hareket eder ve yük azalır (mavi çizgi).</li>
          <li><strong>GUST PROFİLİ & ŞİDDETİ:</strong> Rüzgarın tipini (tekil vurma: 1-COS, sürekli türbülans: DRYDEN) ve şiddetini kaydırıcı (slider) ile değiştirebilirsiniz. Şiddeti arttırdığınızda grafiklerin nasıl fırladığını gözlemleyin.</li>
          <li><strong>↺ Butonu:</strong> Simülasyonu sıfırlar ve baştan başlatır.</li>
          <li><strong>Grafikler:</strong> Soldaki büyük grafik <em>Kök Eğilme Momenti</em> (kanadın kırılma noktasıdır), sağdakiler ise kanadın ucu ne kadar büküldüğünü ve flapların (kanatçık) ne kadar açıldığını gösterir.</li>
        </ul>
      </PageInfo>
    </div>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div className="cyber-panel" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: color, fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  );
}

function ChartPanel({ title, data, keys, colors, labels }) {
  return (
    <div className="cyber-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="cyber-panel-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px' }}>
        <span>{title}</span>
        <div>
          {keys.map((k, i) => (
             <span key={k} style={{ color: colors[i], marginLeft: '16px', fontSize: '10px' }}>● {labels[i]}</span>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: '16px 16px 0 0', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--border-color)" />
            <XAxis dataKey="t" tick={{fontSize: 10, fill: 'var(--text-muted)'}} tickLine={false} axisLine={{stroke: 'var(--border-color)'}} minTickGap={20} />
            <YAxis tick={{fontSize: 10, fill: 'var(--text-muted)'}} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={50} />
            <Tooltip contentStyle={{backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-light)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#fff'}} itemStyle={{color: '#fff'}} />
            {keys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={colors[i]} strokeWidth={2} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Telemetry;
