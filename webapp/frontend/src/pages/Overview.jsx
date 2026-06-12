import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageInfo from '../components/PageInfo';

function Overview() {
  const navigate = useNavigate();

  return (
    <div className="overview-page" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '100px' }}>
      
      <div style={{ marginBottom: '80px', marginTop: '40px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '12px', letterSpacing: '2px', marginBottom: '24px' }}>
          USI-R1B40-0212-23 • TÜBİTAK PROJESİ
        </div>
        
        <h1 style={{ fontSize: '56px', fontWeight: '800', lineHeight: '1.1', marginBottom: '32px', letterSpacing: '-1px' }}>
          İnsansız Hava Araçları için<br />
          <span style={{ color: 'var(--accent-cyan)' }}>Aktif Gust Load Alleviation</span><br />
          Sayısal İkiz Platformu
        </h1>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '700px', lineHeight: '1.6', marginBottom: '40px' }}>
          HALE sınıfı esnek kompozit kanatlarda gust kaynaklı pik yüklerin aktif olarak 
          bastırılması için aeroelastik durum-uzay modelinin, LQR/LQG geri besleme 
          kontrolcüsünün ve rüzgar tüneli doğrulama akışının uçtan uca dijital ikizi. 60 Hz canlı 
          telemetri, 3B kanat deformasyonu ve global uçuş simülatörü tek konsolda.
        </p>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            style={{ background: 'var(--accent-cyan)', color: '#000', padding: '14px 28px', fontSize: '13px', fontWeight: '700' }}
            onClick={() => navigate('/telemetry')}
          >
            TELEMETRİ KONSOLUNU AÇ ↗
          </button>
          <button 
            className="cyber-button"
            style={{ padding: '14px 28px' }}
            onClick={() => navigate('/aeroelastic')}
          >
            3B AEROELASTİK ↗
          </button>
          <button 
            className="cyber-button"
            style={{ padding: '14px 28px' }}
            onClick={() => navigate('/simulator')}
          >
            UÇUŞ SİMÜLATÖRÜ ↗
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px', background: 'var(--border-color)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', marginBottom: '80px', padding: '1px 0' }}>
        {[
          { v: '%50+', l: 'HEDEF KÖK MOMENT AZALIMI' },
          { v: '60 Hz', l: 'TELEMETRİ AKIŞ HIZI' },
          { v: '4+4', l: 'MODAL DURUM-UZAY BOYUTU' },
          { v: '±25°', l: 'AKTÜATÖR DOYGUNLUK SINIRI' }
        ].map((item, i) => (
          <div key={i} style={{ background: 'var(--bg-color)', padding: '32px 24px' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>{item.v}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>{item.l}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '80px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '2px', marginBottom: '16px' }}>KONSOL MODÜLLERİ</div>
        <h2 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '32px' }}>Üç katmanlı dijital ikiz mimarisi</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {[
            { n: '01', t: '2B Telemetri Konsolu', d: 'Kanat kök momenti, uç deplasmanı, FFT spektrumu ve kontrolör kazançları üzerinde tam mühendislik kontrolü.' },
            { n: '02', t: '3B Aeroelastik İzleyici', d: 'Sonlu eleman kanat ağı üzerinde bending + torsion deformasyonu, stres ısı haritası ve 1-cosine gust profili.' },
            { n: '03', t: 'Uçuş Simülatörü', d: 'Gerçek zamanlı türbülans içinde uçan HALE İHA, HUD, otomatik flap deflektörleri, kanat sallanması.' }
          ].map((mod, i) => (
            <div key={i} className="cyber-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                <span>[ICON]</span>
                <span style={{ color: 'var(--text-muted)' }}>MOD · {mod.n}</span>
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>{mod.t}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', flex: 1 }}>{mod.d}</p>
              <div style={{ marginTop: '24px', textAlign: 'right', color: 'var(--text-muted)' }}>↗</div>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ marginBottom: '80px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '2px', marginBottom: '16px' }}>METODOLOJİ</div>
        <h2 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '32px' }}>Pasif dayanım artırımından aktif yük bastırmaya</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { f: 'Faz 1', t: 'Aeroelastik Model', d: 'Sonlu elemanlar + strip theory + Theodorsen/Roger RFA. 4 modlu durum-uzay sistemi (8 durum).' },
            { f: 'Faz 2', t: 'Kontrol Tasarımı', d: 'LQR / LQG / H∞ karşılaştırması. Aktüatör doygunluğu (±25°) ve 15 ms gecikme dahil.' },
            { f: 'Faz 3', t: 'Deneysel Kurulum', d: 'Ölçekli kanat (λL=1/8), discrete gust jeneratörü, strain gauge + ivmeölçer enstrümantasyonu.' },
            { f: 'Faz 4', t: 'Doğrulama', d: 'Sweep sinüs sistem tanımlama, FFT korelasyon, Monte Carlo, rainflow yorulma karşılaştırması.' }
          ].map((faz, i) => (
            <div key={i} className="cyber-panel" style={{ padding: '24px' }}>
              <div style={{ color: 'var(--accent-yellow)', fontFamily: 'var(--font-mono)', fontSize: '11px', marginBottom: '16px' }}>{faz.f}</div>
              <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>{faz.t}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>{faz.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '80px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '2px', marginBottom: '16px' }}>REHBER</div>
        <h2 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '32px' }}>Platform Nasıl Kullanılır?</h2>
        
        <div className="cyber-panel" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '8px', fontSize: '16px' }}>1. MODEL ÇIKTILARI (Statik Doğrulama)</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>Bu sekme, akademik doğrulama için üretilen yüksek çözünürlüklü asıl grafiklerinizi ve mühendislik yorumlarını içerir. Jürinize veya proje yöneticilerinize sonuçları gösterirken bu sayfayı referans almalısınız.</p>
            </div>
            <div>
              <h4 style={{ color: 'var(--accent-yellow)', marginBottom: '8px', fontSize: '16px' }}>2. 2B TELEMETRİ (Gerçek Zamanlı Konsol)</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>Sistemin kalbidir. Açık Döngü ve Kapalı Döngü kıyaslamasını canlı izleyin. <strong>"GLA AKTİF/PASİF"</strong> butonuna basarak kontrolcüyü devreden çıkarıp, momentteki dramatik artışı gözlemleyebilirsiniz. Ayrıca Gust şiddetini ve kontrol ağırlıklarını kaydırıcı (slider) ile anlık değiştirebilirsiniz.</p>
            </div>
            <div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '16px' }}>3. 3B AEROELASTİK ve UÇUŞ SİMÜLATÖRÜ</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>Bu sekmelerde, telemetriden akan canlı verinin kanadı ve uçağı nasıl deforme ettiği 3 boyutlu olarak vizüalize edilir. Rüzgar şiddetini arttırıp (Telemetri sayfasından) bu sayfalara dönerek fiziksel etkileri görebilirsiniz.</p>
            </div>
          </div>
        </div>
      </div>

      <PageInfo title="Genel Bakış Sayfası Kullanımı">
        <p>Bu sayfa projenizin vitrinidir. Hiç teknik bilgisi olmayan birisi bile bu sayfaya bakarak projenin ne yaptığını anlayabilir.</p>
        <p><strong>Nasıl Kullanılır?</strong></p>
        <ul>
          <li><strong>Proje Özeti:</strong> Üst kısımdaki yazılar projenizin amacını anlatır (İHA'lar için rüzgar yükü hafifletme).</li>
          <li><strong>Hızlı Erişim Butonları:</strong> "TELEMETRİ KONSOLUNU AÇ", "3B AEROELASTİK" gibi butonlara tıklayarak doğrudan o sayfalara gidebilirsiniz.</li>
          <li><strong>Metodoloji ve Rehber:</strong> Aşağı doğru kaydırdığınızda projenin hangi aşamalardan geçtiğini ve diğer sekmelerin kısaca ne işe yaradığını okuyabilirsiniz.</li>
        </ul>
        <p>Jüriye sunum yaparken projeye giriş cümlesi olarak bu sayfayı açık tutmanız önerilir.</p>
      </PageInfo>

    </div>
  );
}

export default Overview;
