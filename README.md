# Esnek Kanatlı HALE Sinifi Insansiz Hava Araclari icin Aktif Gust Load Alleviation (GLA) Sistemi ve Dijital Ikiz Platformu

**Proje Kodu:** USI-R1B40-0212-23

---

Site Linki: https://frontend-one-roan-50.vercel.app/

---
<img width="1352" height="632" alt="image" src="https://github.com/user-attachments/assets/ab3a8737-dcf8-4a6d-9abe-a15ff2467d91" />

<img width="1045" height="436" alt="image" src="https://github.com/user-attachments/assets/26f03ff3-622d-4f8d-a40b-81b4651dd7f9" />

<img width="1045" height="421" alt="image" src="https://github.com/user-attachments/assets/428c482e-43a4-4678-be2d-b27ec955665c" />

<img width="1287" height="285" alt="image" src="https://github.com/user-attachments/assets/a6295800-8fad-4e19-8224-ab6799c0e275" />

---

## Icerik

1. [Giris ve Motivasyon](#1-giris-ve-motivasyon)
2. [Sistem Mimarisi](#2-sistem-mimarisi)
3. [Yapisal ve Aeroelastik Modelleme](#3-yapisal-ve-aeroelastik-modelleme)
4. [Atmosferik Ruzgar Modelleri](#4-atmosferik-ruzgar-modelleri)
5. [Kontrol Sistemi Tasarimi](#5-kontrol-sistemi-tasarimi)
6. [Simülasyon ve Performans Degerlendirme](#6-simulasyon-ve-performans-degerlendirme)
7. [Aeroelastik Kararlilik (Flutter) Analizi](#7-aeroelastik-kararlilik-flutter-analizi)
8. [Yorulma (Fatigue) Analizi](#8-yorulma-fatigue-analizi)
9. [Monte Carlo Dayaniklilik Analizi](#9-monte-carlo-dayaniklilik-analizi)
10. [Dijital Ikiz ve Web Platformu](#10-dijital-ikiz-ve-web-platformu)
11. [Proje Dizin Yapisi](#11-proje-dizin-yapisi)
12. [Kurulum ve Calistirma](#12-kurulum-ve-calistirma)
13. [Uretilen Ciktilar](#13-uretilen-ciktilar)

---

## 1. Giris ve Motivasyon

Yuksek irtifa, uzun havada kalis sureli (HALE - High Altitude Long Endurance) insansiz hava araclari, gorev profilleri geregi yuksek aciklik oranina (aspect ratio) sahip esnek kompozit kanatlarla donatilmistir. Bu yapisal esneklik, atmosferik turbulans ve ani ruzgar (discrete gust) kosullarinda asiri kanat kok egilme momentlerine, uc deplasmanina ve potansiyel olarak cirpinma (flutter) kaynakli dinamik kararlilik kayiplarina yol acar.

Bu projenin amaci, kontrol yuzeylerinin (flap / kanatcik) otonom ve aktif kullanimi ile ruzgar kaynakli pik yukleri gercek zamanli olarak sonumleyen, yuksek sadakatli (high-fidelity) bir Gust Load Alleviation (GLA) sistemi gelistirmek ve bu sistemi WebSocket tabanli bir Dijital Ikiz platformu uzerinden uctan uca gorsellestirebilmektir.

---

## 2. Sistem Mimarisi

Proje uc ana katmandan olusur:

```
  Katman 1: Fiziksel Model          Katman 2: Kontrol              Katman 3: Dijital Ikiz
  ========================          ===================            =======================
  Sonlu Eleman Kanat Modeli    -->  LQR / LQG / H-inf       -->   FastAPI + WebSocket
  Theodorsen Aerodinamigi           Feedforward Kontrolcu          React + Three.js (WebGL)
  Modal Indirgeme (4 mod)           Aktuator Doygunlugu            60 Hz Canli Telemetri
  Durum-Uzay Matrisleri             Servo Gecikme Modeli           3B Kanat Deformasyonu
                                                                   Ucus Simulatoru (HUD)
```

---

## 3. Yapisal ve Aeroelastik Modelleme

**Kaynak dosya:** `aeroelastic_model.py`

### 3.1 Yapisal Model

Kanat, ankastre (cantilever) kiris olarak modellenip Sonlu Elemanlar Yontemi (FEM) ile ayriklasitirilmistir:

| Parametre | Deger | Aciklama |
|-----------|-------|----------|
| Eleman sayisi | 10 | Kanat boyunca sonlu eleman bolumu |
| Aciklik (span) | 1.5 m | Kanat uzunlugu |
| Veter (chord) | 0.25 m | Kanat genisligi |
| EI (egilme rijitligi) | 20.0 N.m^2 | Egilme direnci |
| GJ (burulma rijitligi) | 15.0 N.m^2 | Burulma direnci |
| Cizgisel kutle | 0.35 kg/m | Birim uzunluk basi kutle |
| Atalet momenti | 0.0015 kg.m^2/m | Birim uzunluk basi donme ataleti |
| Yapisal sonumleme | 0.01 | Rayleigh sonumleme katsayisi |

Her eleman icin 4x4 boyutlu Euler-Bernoulli kiris rijitlik matrisi `[K_e]` ve tutarli (consistent) kutle matrisi `[M_e]` olusturulur, ardından global `[M]`, `[C]`, `[K]` matrisleri montaj (assembly) ile elde edilir. Sinir kosullari ankastre ucta (kok dugumu) sifir deplasman ve sifir egim olarak uygulanir.

### 3.2 Aerodinamik Model

Strip Theory ve Theodorsen'in kararsiz aerodinamik (unsteady aerodynamics) teorisi kullanilarak her bir kanat seridi uzerine etkiyen aerodinamik yukler hesaplanir:
- Dinamik basinc: `q_inf = 0.5 * rho * V_inf^2`
- Tasima kuvveti: `L_aero = q_inf * c * a0 * L_e` (her eleman icin)
- Aerodinamik sonumleme: `c_aero = q_inf * c * a0 * L_e / V_inf`
- Kontrol yuzeyi (flap) etkisi: `b1 = q_inf * c * eta_flap * c_flap/c * L_e`
- Ruzgar (gust) etki vektoru: `b_g = q_inf * c * a0 * L_e / V_inf`

Burada `a0 = 2*pi` (ince profil tasima egimi), `rho = 1.225 kg/m^3`, `V_inf = 20 m/s`.

### 3.3 Roger RFA ve Aerodinamik Gecikme

Kararsiz aerodinamik etkileri zaman alaninda yakalamak icin Roger'in Rasyonel Fonksiyon Yaklasimi (Rational Function Approximation) kapsaminda 2 adet gecikme durumu (lag state) sisteme eklenir. Gecikme kutupleri `beta = [0.05, 0.3]` olarak secilmis ve yari-veter normalizasyonu `b = c/2` ile olceklenmistir.

### 3.4 Modal Indirgeme ve Durum-Uzay Formülasyonu

`compute_modes()` fonksiyonu genellestirilmis ozdeger problemini `[K]{phi} = omega^2 [M]{phi}` cozerek dogal frekanslar ve mod sekilleri elde eder. Ilk 4 mod secilerek modal koordinatlara gecilir:

```
Modal kutle:      M_mod = phi^T * M * phi
Modal rijitlik:   K_mod = phi^T * K * phi
Modal sonumleme:  C_mod = phi^T * C * phi
Modal aero:       Q_mod = phi^T * Q_aero * phi
```

Nihai durum-uzay sistemi `n_states = 2*n_modes + n_lag = 10` durumlu olarak asagidaki formda insaa edilir:

```
x_dot = A*x + Bu*u + Bg*w_g
y     = C*x + D*u
```

Cikislar:
- y[0]: Kok egilme momenti (root bending moment) [N.m]
- y[1]: Kanat ucu deplasmani (tip displacement) [m]

**Kaynak dosya:** `modal_reduction.py`

Ek olarak, Dengeli Budama (Balanced Truncation) algoritmasi ile sistem boyutu daha da kucultulebilinir. Hankel Tekil Degerleri (HSV) hesaplanarak en az etkili durumlar budanir. `verify_reduction()` fonksiyonu, budanmis sistemin tam sistemle uyumunu dogrulamak icin zaman alani karsilastirmasi yapar.

---

## 4. Atmosferik Ruzgar Modelleri

**Kaynak dosya:** `gust_models.py`

Uc farkli ruzgar modeli entegre edilmistir:

### 4.1 FAA 1-Cosine Discrete Gust (CS-25 / FAR-25)
```
w(t) = 0.5 * Uds * (1 - cos(pi * V * t / L_g))    ,  0 <= t <= 2*L_g/V
w(t) = 0                                            ,  t > 2*L_g/V
```
Varsayilan parametreler: `Uds = 10 m/s` (tasarim gust hizi), `L_g = 8 m` (gust dalga boyu), `V = 20 m/s`.

Ek olarak `gust_penetration_series()` fonksiyonu, ruzgarin kanat boyunca farkli zamanlarda ulasmasi (gust penetration delay) etkisini modelleyerek her bir serit icin gecikme hesabi yapar.

### 4.2 Dryden Surekli Turbulans Modeli (MIL-HDBK-1797)
Frekans alaninda, beyaz gurultu uzerine Dryden transfer fonksiyonunun uygulanmasiyla uretilir:
```
H_dryden(s) = sigma * sqrt(2*L / (pi*V)) * (1 + sqrt(3)*L/V * s) / (1 + L/V * s)^2
```
Varsayilan parametreler: `sigma = 1.0 m/s` (turbulans yogunlugu), `L = 100 m` (turbulans olcegi), tohum (seed) = 42 ile tekrarlanabilirlik.

### 4.3 Von Karman Surekli Turbulans Modeli
Dryden modeline kiyasla yuksek frekansta -5/3 ustel dusus gerceklestirmesiyle daha gercekci bir PSD saglar:
```
H_vk(s) = sigma * sqrt(2*L / (pi*V)) / (1 + (1.339 * L*s/V)^2)^(5/6)
```

Her uc model icin Guc Spektral Yogunlugu (PSD) analizi `compute_psd()` ve analitik Von Karman PSD (`von_karman_psd_analytic()`) ile dogrulanir.

---

## 5. Kontrol Sistemi Tasarimi

**Kaynak dosya:** `controller.py`

### 5.1 LQR (Linear Quadratic Regulator)
Maliyet fonksiyonu `J = integral(x^T Q x + u^T R u) dt` minimize edilerek surekli zamanda Cebirsel Riccati Denklemi (CARE) cozulur:
```
A^T P + P A - P B R^(-1) B^T P + Q = 0
K = R^(-1) B^T P
```

Durum agirlik matrisi `Q` tasariminda:
- Kok momenti agirlandirmasi: `Q[0,0] *= 500` (kok momentine yuksek oncelik)
- Uc deplasmani agirlandirmasi: `Q[1,1] *= 50`
- Hiz durumlari: `Q_rate_weight = 1.0`
- Kontrol cabasini olcekleme: `R = 0.1 * I`

### 5.2 LQG (Linear Quadratic Gaussian)
LQR kazancina ek olarak, olcum gurultulu ortamlarda durum tahmini icin Kalman Filtresi entegre eder:
```
P_kf * A^T + A * P_kf - P_kf * C^T * V^(-1) * C * P_kf + B_g * B_g^T * W = 0
L = P_kf * C^T * V^(-1)
```
Surecsel gurultu kovaryans: `W = 1e-3 * I`, sensor gurultu kovaryans: `V = 1e-4 * I`.

### 5.3 H-infinity Kontrolcu
Model belirsizliklerine karsi dayaniklilik (robustness) saglar. Hamilton matrisi olusturularak gamma parametresi icin ikiye bolme (bisection) ile en kucuk gamma aranir:
```
S = [ A,                (1/gamma^2)*B1*B1^T - B2*R^(-1)*B2^T ]
    [ -Q,               -A^T                                  ]
```
Gamma adaylari: `[100, 50, 20, 10, 5, 3, 2]` sirasi ile denenir, karali cozum bulunan ilk gamma secilir.

### 5.4 Feedforward (Ileri Beslemeli) Kontrolcu
Ruzgar olcum veya tahmin sensoru ile gelecekteki ruzgar siddetini ongorup kontrol komutunu onceden uretir:
```
u_ff = -K_ff * w_predicted(t + lead_time)
```
Varsayilan parametreler: `K_ff = 0.3`, `lead_time = 0.05 s`.

### 5.5 Aktuator Modeli
Gercekci bir kontrol dongusu icin birinci dereceden servo dinamigi ve fiziksel sinirlamalar:
- Transfer fonksiyonu: `G(s) = 1 / (tau*s + 1)`, `tau = 0.05 s`
- Doygunluk (saturation): `+/- 25 derece` (0.436 rad)
- Opsiyonel iletim gecikmesi: `delay` parametresi, buffer ile modelleme

---

## 6. Simulasyon ve Performans Degerlendirme

**Kaynak dosyalar:** `simulation.py`, `run.py`

### 6.1 Zaman Alani Simülasyonu
Acik dongu (kontrolsuz) ve kapali dongu (kontrollu) yanitlar `scipy.integrate.solve_ivp` ile RK45 yontemi kullanilarak yuksek hassasiyetle cozulur (`rtol=1e-8`, `atol=1e-10`):

```
Acik dongu:   x_dot = A*x + Bg*w_g
Kapali dongu: x_dot = A*x + Bu*u + Bg*w_g,   u = -K*x (doygunlukla sinirli)
```

Simulasyon parametreleri: `T = 5 s`, `dt = 0.005 s` (200 Hz ornekleme).

### 6.2 Performans Metrikleri
`compute_metrics()` fonksiyonu asagidaki nicel degerlendirmeleri hesaplar:

| Metrik | Formul |
|--------|--------|
| Pik moment azalimi (%) | `(peak_open - peak_closed) / peak_open * 100` |
| Pik deplasman azalimi (%) | `(disp_open - disp_closed) / disp_open * 100` |
| RMS moment azalimi (%) | `(rms_open - rms_closed) / rms_open * 100` |
| RMS ivme azalimi (%) | Sonlu fark ile ivme tahmini uzerinden |
| Titresim enerjisi azalimi (%) | Trapez kurali ile enerji entegrasyonu |
| Agirlik tasarrufu potansiyeli (%) | Moment azaliminin %30'u olarak tahmin |
| Maksimum kontrol sapma acisi (derece) | Doygunluk siniri kontrolu |

### 6.3 Kontrolcu Karsilastirmasi
`run.py` bes ayri senaryo calistirir ve tablolastirir:
1. LQR + 1-Cosine Gust
2. LQG (Kalman Filtreli) + 1-Cosine Gust
3. LQR + Feedforward + 1-Cosine Gust
4. H-infinity + 1-Cosine Gust
5. LQR + Dryden Surekli Turbulans

---

## 7. Aeroelastik Kararlilik (Flutter) Analizi

**Kaynak dosya:** `flutter_analysis.py`

### 7.1 V-g Diyagrami
Hiz araligi `V = [5, 40] m/s` boyunca her bir hizda yeni bir aeroelastik model olusturulur ve durum-uzay matrisinin ozdegerleri hesaplanir:
```
sigma = -Re(lambda)
omega = |Im(lambda)|
zeta  = sigma / sqrt(sigma^2 + omega^2)
```
Sonumleme oraninin (zeta) negatife dustugu ilk hiz, cirpinma baslangic hizi (flutter onset velocity) olarak raporlanir.

### 7.2 Flutter Marjin Karsilastirmasi
`compute_flutter_margin()` fonksiyonu, acik ve kapali dongu sistem matrislerinin ozdeger sonumlemelerini mukayese ederek kontrolcunun flutter sonumleme marjinini yuzdesel olarak hesaplar.

---

## 8. Yorulma (Fatigue) Analizi

**Kaynak dosya:** `fatigue_analysis.py`

### 8.1 Rainflow Cycle Counting
Kok egilme momenti zaman serisinden yorulma dongu sayimi yapilir:
1. Seri ortalamadan arindirilir
2. Yerel maksimum ve minimumlar (extrema) cikarilir
3. Yagmur damlasi sayma algoritmasi ile yarim ve tam donguler belirlenir
4. Her dongunun genlik araligi (range) ve ortalama degeri (mean) elde edilir

### 8.2 Kumülatif Hasar Hesabi
Miner kurali benzeri bir yaklasimla esdeger hasar hesaplanir:
```
D = sum(S_i^m)
```
Burada `m = 3.0` (aluminyum icin tipik S-N egrisi uslu), `S_i` her dongunun genlik araligi. Acik ve kapali dongu hasar degerlerinin orani, yorulma omru artis potansiyelini verir.

Sinyal on isleme olarak 2. derece Butterworth yuksek geciren filtre (fc = 0.5 Hz, fs = 200 Hz) uygulanir.

---

## 9. Monte Carlo Dayaniklilik Analizi

**Kaynak dosya:** `simulation.py` icindeki `monte_carlo_analysis()`

Kanat rijitligi ve kutle dagilimlari gibi parametrelerdeki imalat belirsizliklerine karsi sistemin ne kadar dayanikli oldugu test edilir:
- 50+ rassal senaryo
- Durum matrisi A'ya `%10` standard sapmali Gauss perturbasyonu
- Her senaryo icin tam GLA simulasyonu ve metrik hesabi
- Istatistik ciktilar: ortalama, standart sapma, en kotu ve en iyi durumlar

---

## 10. Dijital Ikiz ve Web Platformu

### 10.1 Arka Plan Sunucusu

**Kaynak dosya:** `webapp/server.py`

FastAPI tabanli asenkron sunucu, aeroelastik motoru gercek zamanli calistirarak WebSocket uzerinden veri yayinlar:

- `GLASimEngine` sinifi: Durum-uzay modelini baslatir, 60 Hz'de adim atar, 300 noktaya kadar gecmis takibi tutar
- WebSocket `/ws`: Cift yonlu iletisim (veri yayini + kullanici komutlari)
- REST API uclari: `POST /api/gla/{active}`, `POST /api/gust`, `POST /api/reset`
- Kanat deplasman profili: Her adimda 11 dugum noktasinin (x, z) koordinatlari hesaplanarak 3B gorsellige aktarilir

### 10.2 On Plan Arayuzu

**Dizin:** `webapp/frontend/` (Vite + React)

**Teknoloji yigini:**
- React 19 + React Router 7
- Three.js 0.184 + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- Recharts 3.8 (2B grafik kutuphanesi)
- Lucide React (ikon seti)
- WebSocket ile 60 Hz canli veri akisi

**Sayfalar:**

| Sayfa | Dosya | Islev |
|-------|-------|-------|
| Genel Bakis | `Overview.jsx` | Proje vitrini, metodoloji, hizli erisim butonlari |
| Model Ciktilari | `Outputs.jsx` | run.py uretimi statik grafikler + muhendislik yorumlari |
| 2B Telemetri | `Telemetry.jsx` | Canli KPI paneli + 3 ayri Recharts grafigi (moment, deplasman, flap) |
| 3B Aeroelastik | `Aeroelastic.jsx` | FEM agi uzerinde renk kodlu stres isi haritasi + kanat bukulmesi |
| Ucus Simulatoru | `Simulator.jsx` | 3B UAV modeli, HUD, parcacik turbulans, flap animasyonu, iz efekti |
| Dokumantasyon | `Documentation.jsx` | Teknik arka plan, sonuclar, kullanim rehberi |

**Ozel bilesenler:**
- `PageInfo.jsx`: Her sayfanin sag alt kosesinde "i" (bilgi) butonu, tiklandiginda acilan modal pencerede sayfaya ozel detayli kullanim rehberi
- `useTelemetry.js`: WebSocket baglantisi, otomatik yeniden baglanma, komut gonderme (GLA toggle, gust ayari, reset)

---

## 11. Proje Dizin Yapisi

```
gla_project/
|
|-- aeroelastic_model.py      FEM kanat modeli (WingParams dataclass, AeroelasticModel sinifi)
|                              Yapisal + aerodinamik matris montaji, mod analizi, durum-uzay insa
|
|-- controller.py              LQR, LQG (Kalman Filtreli), H-infinity kontrolcu sentezi
|                              SaturatingActuator sinifi (servo dinamigi + doygunluk)
|                              FeedforwardController sinifi (ongorulu ruzgar kontrolu)
|                              Kararlilik marjin hesabi (kazanc/faz marjinlari)
|
|-- gust_models.py             FAA 1-Cosine discrete gust, Dryden ve Von Karman turbulans
|                              uretecleri, gust penetrasyon gecikmesi, PSD hesabi
|
|-- simulation.py              Zaman alani ODE cozucu (RK45), acik/kapali dongu kiyaslama
|                              SimulationResult veri sinifi, metrik hesaplama, Monte Carlo
|
|-- flutter_analysis.py        V-g diyagrami: hiz taramasi ile sonumleme/frekans izleme
|                              Flutter marjin karsilastirmasi (acik vs kapali dongu)
|
|-- fatigue_analysis.py        Rainflow Cycle Counting algoritmasi
|                              Kumulatif hasar hesabi (Miner kurali, m=3)
|
|-- modal_reduction.py         Hankel Tekil Degerleri (HSV), Dengeli Budama (Balanced Truncation)
|                              Modal gerinim enerjisi secimi, indirgeme dogrulama
|
|-- visualization.py           13 farkli grafik uretici (matplotlib):
|                              gust profilleri, PSD, mod sekilleri, zaman kiyaslamalari,
|                              Bode diyagrami, V-g diyagrami, radar grafigi, Monte Carlo
|
|-- run.py                     Ana orkestrasyon betigi: 7 fazli analiz isletici
|                              Tum kontrolculeri kiyaslar, grafikleri uretir, .npz kaydeder
|
|-- figures/                   Uretilen 13 adet yuksek cozunurluklu grafik (150 DPI PNG)
|-- data/                      simulation_results.npz (NumPy arsivi)
|
|-- webapp/
|   |-- server.py              FastAPI + WebSocket sunucusu (GLASimEngine motoru)
|   |                          REST endpointleri: /api/gla, /api/gust, /api/reset
|   |
|   |-- frontend/
|       |-- src/
|       |   |-- App.jsx            Router ve navigasyon (6 sekme)
|       |   |-- index.css          Tasarim sistemi (CSS degiskenleri, siber tema)
|       |   |-- hooks/
|       |   |   |-- useTelemetry.js   WebSocket hook (otomatik yeniden baglanma)
|       |   |-- components/
|       |   |   |-- PageInfo.jsx      Bilgilendirme butonu ve modal pencere
|       |   |-- pages/
|       |       |-- Overview.jsx      Proje vitrini
|       |       |-- Outputs.jsx       Statik analiz grafikleri
|       |       |-- Telemetry.jsx     Canli 2B telemetri konsolu
|       |       |-- Aeroelastic.jsx   3B kanat gorsellemesi (Three.js)
|       |       |-- Simulator.jsx     3B ucus simulatoru (Three.js)
|       |       |-- Documentation.jsx Teknik dokumantasyon
|       |-- package.json
|       |-- vite.config.js
```

---

## 12. Kurulum ve Calistirma

### On Kosullar
- Python 3.8+
- Node.js 18+

### Adim 1: Python Bagimliliklari

```bash
pip install numpy scipy matplotlib fastapi uvicorn websockets
```

### Adim 2: Cevrimdisi Analiz ve Grafik Uretimi

Proje kokunde asagidaki komutu calistirarak 7 fazli tam analiz suresini baslatabilirsiniz:

```bash
python run.py
```

Bu komut sirasiyla:
1. Aeroelastik modeli kurar (10 eleman, 4 mod, 10 durum)
2. Mod analizini calistirip mod sekillerini cikartirir
3. 1-Cosine, Dryden ve Von Karman ruzgar profillerini uretir
4. LQR, LQG, H-infinity ve Feedforward kontrolculerini sentezler
5. Bes farkli senaryo icin GLA simulasyonu yapar
6. V-g flutter analizi, yorulma ve Monte Carlo testlerini isletir
7. Performans tablosunu yazdirir, figures/ ve data/ klasorlerine kaydeder

### Adim 3: Dijital Ikiz Sunucusunu Baslatma

```bash
python webapp/server.py
```

Sunucu `http://localhost:8000` adresinde baslar ve WebSocket baglantisi `/ws` uzerinden hizmet verir.

### Adim 4: Web Arayuzunu Baslatma

Yeni bir terminal penceresi acin:

```bash
cd webapp/frontend
npm install
npm run dev
```

Terminalde gosterilen adrese (ornegin `http://localhost:5173`) tarayicinizdan giderek Dijital Ikiz platformuna erisebilirsiniz.

---

## 13. Uretilen Ciktilar

### Grafik Ciktilari (`figures/` dizini)

| Dosya | Icerik |
|-------|--------|
| `modal_analysis.png` | Ilk 4 mod sekli (bending/torsion) ve dogal frekanslar |
| `gust_profiles.png` | 1-Cosine, Dryden ve Von Karman ruzgar zaman serileri |
| `gust_psd.png` | Dryden turbulans Guc Spektral Yogunlugu (PSD) |
| `comparison_lqr.png` | LQR kontrolcu ile acik/kapali dongu kiyaslama |
| `comparison_lqg.png` | LQG kontrolcu ile acik/kapali dongu kiyaslama |
| `comparison_ff.png` | LQR + Feedforward ile acik/kapali dongu kiyaslama |
| `comparison_hinf.png` | H-infinity kontrolcu ile acik/kapali dongu kiyaslama |
| `comparison_turbulence.png` | Dryden surekli turbulans altinda LQR performansi |
| `control_bode.png` | Kontrolcu Bode diyagrami (buyukluk + faz) |
| `vg_diagram.png` | V-g / V-omega aeroelastik kararlilik diyagrami |
| `metrics_radar.png` | LQR performans radar grafigi (5 metrik) |
| `metrics_radar_lqg.png` | LQG performans radar grafigi |
| `metrics_radar_ff.png` | Feedforward performans radar grafigi |

### Veri Ciktisi (`data/` dizini)

`simulation_results.npz` dosyasi asagidaki NumPy dizilerini icerir: zaman vektoru, ruzgar profilleri, acik/kapali dongu yanitlari (LQR, LQG, H-inf), kontrol sinyalleri, dogal frekanslar, performans metrikleri, V-g sonuclari ve yorulma verileri.
