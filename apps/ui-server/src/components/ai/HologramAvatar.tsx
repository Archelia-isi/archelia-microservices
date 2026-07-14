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
    // Il modello ora mantiene i materiali e i colori originali del file FBX,
    // senza alcun effetto luminoso o alterazione di opacità.
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
      <primitive object={fbx} scale={0.033} position={[0, -2.4, 0]} />
      
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
