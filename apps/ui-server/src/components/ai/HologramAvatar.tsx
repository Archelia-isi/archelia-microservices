import { useRef, useEffect } from 'react';
import { useFBX, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

export function HologramAvatar(props: any) {
  const group = useRef<THREE.Group>(null);
  
  // Carichiamo il modello realistico FBX dalla cartella public
  const avatarUrl = '/character.fbx';
  const fbx = useFBX(avatarUrl);
  const { actions } = useAnimations(fbx.animations, group);

  useEffect(() => {
    // Shader Wireframe elegante (Stile Scansione Olografica Sci-Fi)
    // Questo evita l'effetto "blob luminoso" e rende la donna molto più tecnologica.
    fbx.traverse((child) => {
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
  }, [fbx]);

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
      {/* I modelli FBX di Mixamo sono solitamente molto grandi, usiamo uno scale ridotto */}
      <primitive object={fbx} scale={0.015} position={[0, -2.4, 0]} />
      
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
    </group>
  );
}
