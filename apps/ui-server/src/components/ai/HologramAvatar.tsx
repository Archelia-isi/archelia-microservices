import { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
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
    // Shader Wireframe elegante (Stile Scansione Olografica Sci-Fi)
    // Questo evita l'effetto "blob luminoso" e rende il manichino molto più tecnologico.
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        const holoMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color(0x00d2ff),
          transparent: true,
          opacity: 0.25,
          wireframe: true,
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

      {/* Testi rimossi come richiesto */}
    </group>
  );
}

useGLTF.preload('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Xbot.glb');
