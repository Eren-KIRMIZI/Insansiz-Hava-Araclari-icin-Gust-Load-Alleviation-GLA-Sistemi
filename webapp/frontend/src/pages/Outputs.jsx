import React from 'react';
import PageInfo from '../components/PageInfo';

function Outputs() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '100px' }}>
      <div style={{ marginBottom: '40px', marginTop: '20px' }}>
        <h1 style={{ fontSize: '40px', fontWeight: '700', marginBottom: '16px' }}>
          Model Çıktıları ve Yüksek Doğruluklu Analizler
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '800px', lineHeight: '1.6' }}>
          Bu sayfadaki veriler, projenin ana simülasyon motoru (`run.py`) tarafından çevrimdışı (offline) olarak tam aeroelastik 
          denklemlerle (10 durumlu State-Space) çözülmüş yüksek doğruluklu (high-fidelity) sonuçları göstermektedir. 
          Gerçek zamanlı Telemetri sekmesi, akıcılığı sağlamak adına daha basitleştirilmiş bir döngüde çalıştığından anlık verilerde farklılıklar gözlemlenebilir.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }}>
        
        <OutputCard 
          title="Ani Gust (1-Cosine) Altında LQR Kontrolcü Performansı"
          image="/figures/comparison_lqr.png"
          description="Açık döngü (sarı kesikli çizgi) ve LQR kontrollü kapalı döngü (camgöbeği çizgi) durumlarının 1-Cosine gust girdisi altındaki zaman yanıtı. Kök eğilme momentinde %23.6 oranında kalıcı bir azalma sağlanarak yapısal bütünlük korunmuş ve yorulma ömrü uzatılmıştır. Kanat ucu deplasmanı ve ivme grafikleri de sistemin gust etkisini nasıl sönümlediğini kanıtlamaktadır."
        />

        <OutputCard 
          title="Sürekli Türbülans (Dryden) Analizi"
          image="/figures/comparison_turbulence.png"
          description="Discrete gust yerine sürekli değişen rüzgar koşullarını simüle eden Dryden Türbülans Modeli altındaki yanıt. LQR kontrolcüsü, rastgele rüzgar dalgalanmaları altında bile RMS momentini %53.1 gibi çok yüksek bir oranda sönümleyerek literatürdeki >%50 hedefini fazlasıyla karşılamıştır."
        />

        <OutputCard 
          title="Kontrolcü Performans Kıyaslaması (Radar Diyagramı)"
          image="/figures/metrics_radar.png"
          description="Farklı performans kriterlerinde (Moment Azalımı, Deplasman Azalımı, İvme, Titreşim Enerjisi vb.) LQR kontrolcüsünün etkinliğini gösteren radar grafiği. Bu çok boyutlu analiz, kontrolcünün sadece bir boyutta değil, tüm sistem dinamiklerinde dengeli ve optimize bir yük hafifletme (GLA) sağladığını doğrular."
        />

        <OutputCard 
          title="V-g Aeroelastik Kararlılık (Flutter) Diyagramı"
          image="/figures/vg_diagram.png"
          description="Kanadın çırpınma (flutter) hızını belirleyen V-g diyagramı. Operasyon hızı 20 m/s olmasına rağmen, açık çevrimde sistemin 12.4 m/s hızında flutter'a girdiği (damping değerinin negatife geçtiği) tespit edilmiştir. Kapalı döngü aktif kontrol algoritması, bu sönümleme değerini %112.5 oranında iyileştirerek sistemi operasyon hızında da kararlı tutmayı başarmaktadır."
        />

      </div>
      <PageInfo title="Model Çıktıları Kullanımı">
        <p>Bu sayfada projemizin asıl başarısını gösteren <strong>yüksek doğruluklu bilimsel grafikler</strong> yer alır. Arka planda çalıştırılan saatler süren simülasyonların sonuçlarıdır.</p>
        <p><strong>Nasıl Okunmalı?</strong></p>
        <ul>
          <li><strong>Grafikler:</strong> Soldaki grafikler, kanadın rüzgardan nasıl etkilendiğini (sarı çizgi) ve bizim kontrol sistemimizle bu etkinin nasıl azaltıldığını (mavi çizgi) gösterir.</li>
          <li><strong>Mühendislik Yorumu:</strong> Sağdaki kutularda teknik jüri veya akademisyenler için detaylı açıklamalar bulunmaktadır.</li>
          <li><em>Not: Bu sayfada etkileşimli (tıklanabilir) bir araç yoktur, sadece rapor mahiyetindedir.</em></li>
        </ul>
      </PageInfo>
    </div>
  );
}

function OutputCard({ title, image, description }) {
  return (
    <div className="cyber-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="cyber-panel-header">{title}</div>
      <div style={{ display: 'flex', backgroundColor: '#020408' }}>
        <div style={{ flex: 2, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={image} alt={title} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
        </div>
        <div style={{ flex: 1, padding: '32px', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--text-primary)' }}>Mühendislik Yorumu</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.7' }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Outputs;
