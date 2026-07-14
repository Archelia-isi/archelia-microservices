import { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

export function HologramAvatar(props: any) {
  const group = useRef<THREE.Group>(null);
  
  // Usiamo un URL remoto stabile di un manichino (Xbot) da trasformare in ologramma
  const avatarUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Xbot.glb';
  const { scene, animations } = useGLTF(avatarUrl);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // Applica l'effetto olografico azzurro/celestino a tutti i mesh
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        // Creiamo un materiale custom stile Ologramma
        const holoMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x00d2ff), // Celestino neon
          emissive: new THREE.Color(0x0055ff),
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.7,
          wireframe: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });

        mesh.material = holoMaterial;
      }
    });
  }, [scene]);

  // Se l'avatar ha animazioni (es. idle), la facciamo partire
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
      <primitive object={scene} scale={1.8} position={[0, -2.5, 0]} />
    </group>
  );
}

useGLTF.preload('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Xbot.glb');
