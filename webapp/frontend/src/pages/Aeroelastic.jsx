import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useTelemetry } from '../hooks/useTelemetry';
import PageInfo from '../components/PageInfo';

// Interpolate color from Cyan (#00e5ff) to Red (#ff1744) based on stress
function getStressColor(stress) {
  const c1 = new THREE.Color('#00e5ff');
  const c2 = new THREE.Color('#ffea00');
  const c3 = new THREE.Color('#ff1744');
  
  if (stress < 0.5) return c1.lerp(c2, stress * 2);
  return c2.lerp(c3, (stress - 0.5) * 2);
}

function WingModel({ data }) {
  const points = useMemo(() => {
    if (!data?.disp_profile) {
      return [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.5, 0, 0)];
    }
    return data.disp_profile.map(p => new THREE.Vector3(p.x, 0, p.z * 5)); // Exaggerate Z for visual effect
  }, [data]);

  const segments = useMemo(() => {
    const segs = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const center = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const length = dir.length();
      
      // Calculate fake "stress" based on how close it is to root and local bending
      const stress = Math.max(0, 1 - (i / (points.length - 1)) - (data?.gla_active ? 0.3 : 0));
      
      segs.push({
        position: center,
        rotation: new THREE.Euler(0, -Math.atan2(dir.z, dir.x), 0),
        length: length,
        color: getStressColor(stress)
      });
    }
    return segs;
  }, [points, data?.gla_active]);

  return (
    <group position={[-0.75, 1, 0]}>
      {/* Root Support */}
      <mesh position={[-0.15, 0, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.6]} />
        <meshStandardMaterial color="#1f2530" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Wing Elements (Finite Element blocks) */}
      {segments.map((seg, i) => (
        <mesh key={i} position={seg.position} rotation={seg.rotation}>
          <boxGeometry args={[seg.length + 0.01, 0.05, 0.25]} />
          <meshStandardMaterial color={seg.color} metalness={0.5} roughness={0.2} />
        </mesh>
      ))}

      {/* Grid Nodes */}
      {points.map((p, i) => (
        <mesh key={`node-${i}`} position={p}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Aeroelastic() {
  const { data } = useTelemetry();

  return (
    <div className="cyber-panel" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div className="cyber-panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>3B AEROELASTİK İZLEYİCİ</span>
        <span style={{ color: 'var(--accent-cyan)' }}>CANLI STRES VE DEPLASMAN VİZÜALİZASYONU</span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        
        <Canvas camera={{ position: [2, 3, 3], fov: 35 }}>
          <color attach="background" args={['#05080f']} />
          <ambientLight intensity={0.2} />
          <directionalLight position={[10, 10, 5]} intensity={2} />
          <pointLight position={[-2, 2, 2]} intensity={1} color="#00e5ff" />
          
          <Grid infiniteGrid fadeDistance={20} sectionColor="#1f2530" cellColor="#0d1117" />
          <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={10} blur={2} far={4} />

          <WingModel data={data} />
          
          <OrbitControls enableDamping={true} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI/2 - 0.1} />
          
          <EffectComposer>
            <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={0.5} />
          </EffectComposer>
        </Canvas>
        
        {/* HUD overlay */}
        <div style={{ position: 'absolute', top: 30, left: 30, pointerEvents: 'none', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)' }}>
          <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>MODEL ÖZELLİKLERİ</div>
          <div style={{ color: 'var(--text-secondary)' }}>KÖK: ANKASTRE (CANTILEVER)</div>
          <div style={{ color: 'var(--text-secondary)' }}>AĞ (MESH): 10 ELEMAN</div>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>DEPLASMAN ÖLÇEĞİ: 5:1 (Görsel)</div>
          
          <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>STRES ISI HARİTASI</div>
          <div style={{ display: 'flex', width: '200px', height: '10px', background: 'linear-gradient(to right, #00e5ff, #ffea00, #ff1744)', marginBottom: '4px', borderRadius: '2px' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
            <span>DÜŞÜK</span>
            <span>KRİTİK</span>
          </div>
        </div>
      </div>
      <PageInfo title="3B Aeroelastik İzleyici Kullanımı">
        <p>Telemetri sayfasındaki hesaplamaların, uçağın kanadı üzerinde <strong>fiziksel (3 Boyutlu)</strong> olarak nasıl göründüğünü buradan izleyebilirsiniz.</p>
        <p><strong>Nasıl Okunmalı?</strong></p>
        <ul>
          <li><strong>Renkler (Isı Haritası):</strong> Kanat üzerindeki renkler stresi (gerilimi) ifade eder. Mavi renk kanadın rahat olduğunu, Sarı/Kırmızı renkler ise kanadın kırılma sınırına yaklaştığını gösterir.</li>
          <li><strong>Kanat Hareketi:</strong> Rüzgar vurdukça kanadın yukarı aşağı büküldüğünü (bending) görebilirsiniz. Uç kısımlardaki hareket daha fazladır.</li>
          <li><em>İpucu:</em> Fare ile tıklayıp sürükleyerek kanada farklı açılardan bakabilir, tekerlek ile yakınlaşıp uzaklaşabilirsiniz. Rüzgar etkisini net görmek için Telemetri sekmesinden gust şiddetini artırıp bu sekmeye tekrar dönebilirsiniz.</li>
        </ul>
      </PageInfo>
    </div>
  );
}

export default Aeroelastic;
