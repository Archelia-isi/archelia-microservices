import { useRef, useEffect } from 'react';
import { useGLTF, useAnimations, Text } from '@react-three/drei';
import * as THREE from 'three';

export function HologramAvatar(props: any) {
  const group = useRef<THREE.Group>(null);
  
  // Il server di Ready Player Me purtroppo sta bloccando le richieste o è down,
  // quindi il browser va in crash (schermo bianco/Scansione Ologramma).
  // Ripristiniamo temporaneamente il manichino Xbot che è ospitato su un server GitHub
  // ultra-stabile. Con i nuovi shader fotorealistici, sembrerà comunque un ologramma sci-fi pazzesco!
  const avatarUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Xbot.glb';
  const { scene, animations } = useGLTF(avatarUrl);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // Shader Avanzato Fotorealistico Sci-Fi (Bordi Luminosi e Trasparenza)
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        const holoMaterial = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0x88ccff),
          emissive: new THREE.Color(0x00d2ff),
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0.8,
          transmission: 0.5,
          roughness: 0.1,
          metalness: 0.8,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });

        mesh.material = holoMaterial;
      }
    });
  }, [scene]);

  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const firstAction = Object.values(actions)[0];
      if (firstAction) {
        firstAction.play();
      }
    }
  }, [actions]);

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} scale={1.9} position={[0, -2.4, 0]} />
      
      {/* Piedistallo Sci-Fi */}
      <mesh position={[0, -2.45, 0]}>
        <cylinderGeometry args={[1.5, 1.8, 0.1, 32]} />
        <meshStandardMaterial 
          color={0x001133} 
          emissive={0x00aaff} 
          emissiveIntensity={1.5}
          wireframe={true} 
        />
      </mesh>
      
      {/* Disco luminoso interno al piedistallo */}
      <mesh position={[0, -2.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 1.4, 32]} />
        <meshBasicMaterial color={0x00d2ff} transparent opacity={0.6} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Pannelli Dati Fluttuanti (Come nella reference) */}
      <group position={[-1.2, 0.5, 0]}>
        <Text fontSize={0.1} color="#00d2ff" anchorX="left" position={[0, 0, 0]}>
          PROJECT AURA - STAGE 4
        </Text>
        <Text fontSize={0.05} color="#88ccff" anchorX="left" position={[0, -0.15, 0]}>
          SYSTEM STATUS: STABLE
        </Text>
        <Text fontSize={0.03} color="#00d2ff" anchorX="left" position={[0, -0.3, 0]} maxWidth={1}>
          Neural link active. 
          Quantum processing at 99.8%. 
          Waiting for command...
        </Text>
      </group>
      
      <group position={[1.5, 0.8, -0.5]}>
        <Text fontSize={0.08} color="#00d2ff" anchorX="right" position={[0, 0, 0]}>
          DIAGNOSTICS
        </Text>
        <Text fontSize={0.04} color="#88ccff" anchorX="right" position={[0, -0.15, 0]}>
          CORE: OPTIMAL
          TEMP: 24C
          MEM: ALLOCATED
        </Text>
      </group>
    </group>
  );
}

useGLTF.preload('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Xbot.glb');
