import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Trail } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useTelemetry } from '../hooks/useTelemetry';
import PageInfo from '../components/PageInfo';

function ParticleTurbulence({ speed = 1, density = 200 }) {
  const particlesRef = useRef();
  
  const [positions, scales] = useMemo(() => {
    const p = new Float32Array(density * 3);
    const s = new Float32Array(density);
    for (let i = 0; i < density; i++) {
      p[i * 3] = (Math.random() - 0.5) * 40;
      p[i * 3 + 1] = (Math.random() - 0.5) * 10;
      p[i * 3 + 2] = (Math.random() - 0.5) * 40;
      s[i] = Math.random();
    }
    return [p, s];
  }, [density]);

  useFrame((state, delta) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array;
      for (let i = 0; i < density; i++) {
        positions[i * 3 + 2] += speed * delta * 50; // Move particles towards camera
        if (positions[i * 3 + 2] > 20) {
          positions[i * 3 + 2] = -40; // Reset to back
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-scale" count={scales.length} array={scales} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#00e5ff" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function UAV({ data }) {
  const group = useRef();
  const leftWingRef = useRef();
  const rightWingRef = useRef();
  const flapLeftRef = useRef();
  const flapRightRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Base vibration due to engines/flight
    group.current.position.y = Math.sin(t * 10) * 0.02;
    group.current.rotation.z = Math.sin(t * 2) * 0.05;

    if (data) {
      const disp = data.tip_disp || 0;
      const angle = disp * 0.5; // Exaggerated visual bending
      
      // Wing bending
      if (leftWingRef.current) leftWingRef.current.rotation.z = angle;
      if (rightWingRef.current) rightWingRef.current.rotation.z = -angle;

      // Flap movements
      const control = data.control_deg || 0;
      const flapAngle = control * Math.PI / 180;
      if (flapLeftRef.current) flapLeftRef.current.rotation.x = flapAngle;
      if (flapRightRef.current) flapRightRef.current.rotation.x = flapAngle;
      
      // Gust reaction (pitching slightly)
      const gust = data.gust || 0;
      group.current.rotation.x = -gust * 0.01;
    }
  });

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#111827', metalness: 0.8, roughness: 0.2 });
  const wingMaterial = new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.5, roughness: 0.4 });
  const flapMaterial = new THREE.MeshStandardMaterial({ color: '#ffea00', emissive: '#ffea00', emissiveIntensity: 0.2 });

  return (
    <group ref={group}>
      {/* Fuselage */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.3, 3, 16, 16]} />
        <primitive object={bodyMaterial} attach="material" />
      </mesh>
      
      {/* Cockpit / Canopy */}
      <mesh position={[0, 0.4, -1]}>
        <sphereGeometry args={[0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>

      {/* Left Wing Group */}
      <group position={[-0.3, 0.1, 0]} ref={leftWingRef}>
        <mesh position={[-2, 0, 0]}>
          <boxGeometry args={[4, 0.08, 0.8]} />
          <primitive object={wingMaterial} attach="material" />
        </mesh>
        {/* Left Flap */}
        <mesh position={[-2.5, 0, 0.45]} ref={flapLeftRef}>
          <boxGeometry args={[1.5, 0.06, 0.2]} />
          <primitive object={flapMaterial} attach="material" />
        </mesh>
        {/* Trail effect */}
        <Trail width={0.5} color={'#00e5ff'} length={10} decay={1} local={false}>
           <mesh position={[-3.8, 0, 0.4]}><sphereGeometry args={[0.01]}/></mesh>
        </Trail>
      </group>

      {/* Right Wing Group */}
      <group position={[0.3, 0.1, 0]} ref={rightWingRef}>
        <mesh position={[2, 0, 0]}>
          <boxGeometry args={[4, 0.08, 0.8]} />
          <primitive object={wingMaterial} attach="material" />
        </mesh>
        {/* Right Flap */}
        <mesh position={[2.5, 0, 0.45]} ref={flapRightRef}>
          <boxGeometry args={[1.5, 0.06, 0.2]} />
          <primitive object={flapMaterial} attach="material" />
        </mesh>
        {/* Trail effect */}
        <Trail width={0.5} color={'#00e5ff'} length={10} decay={1} local={false}>
           <mesh position={[3.8, 0, 0.4]}><sphereGeometry args={[0.01]}/></mesh>
        </Trail>
      </group>
      
      {/* V-Tail */}
      <mesh position={[-0.3, 0.5, 1.5]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[1, 0.05, 0.5]} />
        <primitive object={wingMaterial} attach="material" />
      </mesh>
      <mesh position={[0.3, 0.5, 1.5]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[1, 0.05, 0.5]} />
        <primitive object={wingMaterial} attach="material" />
      </mesh>
      
      {/* Engine glow */}
      <mesh position={[0, 0, 1.6]}>
        <cylinderGeometry args={[0.2, 0.25, 0.1, 16]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function Simulator() {
  const { data, glaActive } = useTelemetry();

  return (
    <div className="cyber-panel" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div className="cyber-panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>UÇUŞ SİMÜLATÖRÜ HUD</span>
        <span style={glaActive ? { color: 'var(--accent-cyan)' } : { color: 'var(--accent-red)' }}>
          SİSTEM DURUMU: {glaActive ? 'GLA ACTIVE' : 'GLA INACTIVE'}
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        
        <Canvas camera={{ position: [0, 2, -6], fov: 50 }}>
          <color attach="background" args={['#020408']} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 20, -10]} intensity={2} color="#ffffff" />
          <pointLight position={[0, -2, -5]} intensity={1} color="#00e5ff" />
          
          <Stars radius={100} depth={50} count={5000} factor={2} saturation={0} fade speed={1} />
          
          <ParticleTurbulence speed={data?.gust ? 1 + data.gust * 0.1 : 1} density={500} />
          
          <UAV data={data} />
          
          <OrbitControls enableDamping={true} maxPolarAngle={Math.PI / 1.5} minDistance={3} maxDistance={15} />
          
          <EffectComposer>
            <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
          </EffectComposer>
        </Canvas>
        
        {/* Advanced HUD overlay */}
        <div style={{ position: 'absolute', top: 30, left: 30, pointerEvents: 'none', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', textShadow: '0 0 5px var(--accent-cyan)' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>HALE-UAV TELEMETRY</div>
          <div style={{ fontSize: '14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', width: '200px' }}>
            <span>ALTITUDE:</span> <span>12,000 FT</span>
          </div>
          <div style={{ fontSize: '14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', width: '200px' }}>
            <span>AIRSPEED:</span> <span>20 M/S</span>
          </div>
          <div style={{ fontSize: '14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', width: '200px' }}>
            <span>MACH:</span> <span>0.06</span>
          </div>
          <div style={{ marginTop: '24px', opacity: 0.8 }}>
            <div style={{ marginBottom: '4px' }}>PITCH: {(data?.gust || 0 * -0.1).toFixed(2)}°</div>
            <div>ROLL: 0.0°</div>
          </div>
        </div>
        
        <div style={{ position: 'absolute', bottom: 30, right: 30, pointerEvents: 'none', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>GUST PROFILI (RÜZGAR)</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: data?.gust > 0 ? 'var(--accent-red)' : 'var(--accent-cyan)', textShadow: data?.gust > 0 ? '0 0 10px var(--accent-red)' : '0 0 10px var(--accent-cyan)' }}>
            {data?.gust ? data.gust.toFixed(2) : '0.00'} <span style={{fontSize: '18px'}}>M/S</span>
          </div>
        </div>
        
        {/* Crosshair */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', opacity: 0.3 }}>
          <div style={{ width: '40px', height: '1px', background: 'var(--accent-cyan)', position: 'absolute', left: '-50px', top: '0' }}></div>
          <div style={{ width: '40px', height: '1px', background: 'var(--accent-cyan)', position: 'absolute', right: '-50px', top: '0' }}></div>
          <div style={{ width: '1px', height: '40px', background: 'var(--accent-cyan)', position: 'absolute', left: '0', top: '-50px' }}></div>
          <div style={{ width: '1px', height: '40px', background: 'var(--accent-cyan)', position: 'absolute', left: '0', bottom: '-50px' }}></div>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-red)', position: 'absolute', left: '-2px', top: '-2px' }}></div>
        </div>
      </div>
      <PageInfo title="Uçuş Simülatörü Kullanımı">
        <p>Bu ekran, oluşturduğumuz Dijital İkiz sisteminin <strong>gerçek dünya uçuş senaryosunda</strong> nasıl çalıştığını gösterir.</p>
        <p><strong>Nasıl İzlenmeli?</strong></p>
        <ul>
          <li><strong>Uçak ve Çevre:</strong> Uçağın etrafından geçen parçacıklar, anlık rüzgar (türbülans) akışını temsil eder.</li>
          <li><strong>Kanatçıklar (Flaplar):</strong> Uçağın arka tarafındaki sarı renkli kanatçıklara dikkat edin. Telemetri açıkken (GLA ACTIVE), rüzgar şiddetlendiğinde bu kanatçıklar aşağı yukarı çok hızlı hareket ederek rüzgarın uçağı savurmasını engeller.</li>
          <li><strong>Telemetri ile Etkileşim:</strong> Diğer sekmeye dönerek rüzgar şiddetini artırdığınızda buradaki uçağın nasıl sallanmaya başladığını ve rüzgar parçacıklarının nasıl hızlandığını görebilirsiniz.</li>
          <li><em>İpucu:</em> Fare ile tıklayıp sürükleyerek uçağın çevresinde kamerayı döndürebilirsiniz.</li>
        </ul>
      </PageInfo>
    </div>
  );
}

export default Simulator;
