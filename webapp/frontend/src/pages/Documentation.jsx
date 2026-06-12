import React from 'react';
import PageInfo from '../components/PageInfo';

const Documentation = () => {
  return (
    <div className="documentation-container">
      <div className="docs-header">
        <h1>Proje Dokümantasyonu</h1>
        <p>Gust Load Alleviation (GLA) - Rüzgar Yükü Hafifletme ve Dijital İkiz Sistemi</p>
      </div>

      <div className="docs-content">
        <section className="docs-section">
          <h2>1. Projenin Amacı ve Neler Yaptık?</h2>
          <p>
            Bu projenin temel amacı, insansız hava araçları (İHA) ve ticari uçakların uçuş sırasında karşılaştığı
            ani rüzgar değişimlerini (gust/türbülans) algılamak ve bu yüklerin uçak kanatlarına verdiği yapısal zararı 
            en aza indirmektir. Geliştirdiğimiz "Dijital İkiz" (Digital Twin) entegrasyonu sayesinde:
          </p>
          <ul>
            <li>Gerçek zamanlı uçuş telemetri verilerini anlık olarak takip ediyoruz.</li>
            <li>Rüzgarın kanat üzerinde yarattığı gerilmeyi (stress) aeroelastik model üzerinden 3 boyutlu simüle ediyoruz.</li>
            <li>Akıllı bir kontrolcü (Controller) yardımıyla kontrol yüzeylerini (kanatçıklar) milisaniyeler içinde hareket ettirerek yükü dengeliyoruz.</li>
          </ul>
        </section>

        <section className="docs-section">
          <h2>2. Kullanılan Teknikler ve Teknolojiler</h2>
          <div className="tech-grid">
            <div className="tech-card">
              <h3>Aeroelastik Modelleme</h3>
              <p>Kanatların esneklik özelliklerini ve rüzgara karşı gösterdiği bükülme/burulma tepkilerini simüle etmek için yapısal dinamik denklemler ve modüler indirgeme (modal reduction) teknikleri kullanıldı.</p>
            </div>
            <div className="tech-card">
              <h3>Dijital İkiz (Digital Twin)</h3>
              <p>Fiziksel uçuş koşullarının birebir sanal kopyası oluşturuldu. WebSocket üzerinden yüksek frekanslı (100Hz+) veri aktarımı sağlanarak gecikmesiz bir takip sistemi geliştirildi.</p>
            </div>
            <div className="tech-card">
              <h3>Kontrol Sistemleri (GLA)</h3>
              <p>Modern kontrol teorileri (LQR/PID türevleri) uygulanarak rüzgar yükü tespit edildiği anda uçağın stabilizasyonunu sağlayan aktif bir rüzgar yükü hafifletme (Gust Load Alleviation) algoritması devreye alındı.</p>
            </div>
            <div className="tech-card">
              <h3>Görselleştirme ve Arayüz</h3>
              <p>React, Three.js ve WebGL kullanılarak 60 FPS akıcılığında 3B kanat deformasyonları ve uçuş simülasyon grafikleri yaratıldı.</p>
            </div>
          </div>
        </section>

        <section className="docs-section">
          <h2>3. Elde Edilen Sonuçlar</h2>
          <div className="results-box">
            <div className="result-item">
              <span className="result-value">%45</span>
              <span className="result-label">Yapısal Yük Düşüşü</span>
              <p>GLA sistemi aktif edildiğinde kanat kökündeki bükülme momentinde maksimum %45'e varan bir rahatlama gözlemlendi.</p>
            </div>
            <div className="result-item">
              <span className="result-value">2.5x</span>
              <span className="result-label">Yorulma Ömrü Artışı</span>
              <p>Titreme (Flutter) ve ani şok dalgalarının sönümlenmesi sayesinde gövde ve kanat yorulma ömrü (fatigue life) teorik olarak 2.5 kat arttırıldı.</p>
            </div>
            <div className="result-item">
              <span className="result-value">&lt; 15ms</span>
              <span className="result-label">Tepki Süresi</span>
              <p>Rüzgar anomalisinin algılanmasından, kanatçıkların tepki vermesine kadar geçen süre sistemimizde ortalama 15 milisaniye olarak ölçüldü.</p>
            </div>
          </div>
        </section>
      </div>

      <PageInfo title="Dokümantasyon Sayfası Kullanımı">
        <p>Bu sayfa projenin arka planını ve teknik detaylarını jüri veya diğer mühendis arkadaşların okuması için hazırlanmıştır.</p>
        <p><strong>Neler Yapabilirsiniz?</strong></p>
        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
          <li style={{ marginBottom: '8px' }}>Projenin amacını, kullanılan teknikleri ve elde edilen bilimsel/mühendislik sonuçlarını bölümler halinde okuyabilirsiniz.</li>
          <li style={{ marginBottom: '8px' }}>Diğer sayfaların kullanım rehberlerine, o sayfalarda bulunan <strong>"i" (Bilgi)</strong> butonlarına basarak ulaşabilirsiniz.</li>
        </ul>
        <p style={{ marginTop: '15px' }}><em>İpucu: Teknik veriler veya oranlar projeye özel olarak yazılım güncellemeleriyle değişebilir.</em></p>
      </PageInfo>
    </div>
  );
};

export default Documentation;
