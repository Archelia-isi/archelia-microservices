import { useRef, useEffect } from 'react';
import { useFBX, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

export function HologramAvatar({ animationState = 'idle' }: { animationState?: 'idle' | 'thinking' | 'talking' | 'dance' | 'workout' }) {
  const group = useRef<THREE.Group>(null);
  
  // Carichiamo il modello principale
  const fbx = useFBX('/character.fbx');
  
  // Carichiamo le animazioni aggiuntive (alcune con skin, altre senza)
  const animIdle = useFBX('/Idle.fbx');
  const animBreathing = useFBX('/Breathing Idle.fbx');
  const animStretching = useFBX('/Arm Stretching.fbx');
  const animTalking = useFBX('/Catwalk Idle To Twist R.fbx');
  const animBreakdance = useFBX('/Breakdance Footwork To Idle.fbx');
  const animCapoeira = useFBX('/Capoeira.fbx');
  const animRumba = useFBX('/Rumba Dancing.fbx');
  const animKettlebell = useFBX('/Kettlebell Swing.fbx');

  // Raggruppiamo tutte le animazioni
  const animations = useRef<THREE.AnimationClip[]>([]);
  
  useEffect(() => {
    // Estraiamo le clip e diamo loro un nome logico
    const extractAnim = (sourceFbx: THREE.Group, name: string) => {
      if (sourceFbx.animations.length > 0) {
        const clip = sourceFbx.animations[0].clone();
        clip.name = name;
        animations.current.push(clip);
      }
    };
    
    // Svuotiamo l'array in caso di re-render
    animations.current = [];
    
    extractAnim(animBreathing, 'idle_breathing');
    extractAnim(animIdle, 'idle_simple');
    extractAnim(animStretching, 'thinking');
    extractAnim(animTalking, 'talking');
    extractAnim(animBreakdance, 'dance_breakdance');
    extractAnim(animCapoeira, 'dance_capoeira');
    extractAnim(animRumba, 'dance_rumba');
    extractAnim(animKettlebell, 'workout');
    
  }, [animIdle, animBreathing, animStretching, animTalking, animBreakdance, animCapoeira, animRumba, animKettlebell]);

  const { actions, mixer } = useAnimations(animations.current, group);
  const currentAction = useRef<string>('idle_breathing');

  useEffect(() => {
    // Il modello ora mantiene i materiali e i colori originali del file FBX
  }, [fbx]);

  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return;

    let nextActionName = 'idle_breathing';
    
    if (animationState === 'thinking') {
      nextActionName = 'thinking';
    } else if (animationState === 'talking') {
      nextActionName = 'talking';
    } else if (animationState === 'dance') {
      // Scegli un ballo a caso
      const dances = ['dance_breakdance', 'dance_capoeira', 'dance_rumba'];
      nextActionName = dances[Math.floor(Math.random() * dances.length)];
    } else if (animationState === 'workout') {
      nextActionName = 'workout';
    } else {
      nextActionName = 'idle_breathing';
    }

    const nextAction = actions[nextActionName];
    const prevAction = actions[currentAction.current];

    if (nextAction && prevAction && currentAction.current !== nextActionName) {
      nextAction.reset().fadeIn(0.5).play();
      prevAction.fadeOut(0.5);
      currentAction.current = nextActionName;
    } else if (nextAction && !prevAction) {
      nextAction.play();
      currentAction.current = nextActionName;
    }
  }, [animationState, actions]);

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
