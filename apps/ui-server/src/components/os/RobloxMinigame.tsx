import { useState, useEffect, useCallback, useRef } from 'react';
import { soundEngine } from '../../utils/SoundEngine';

export default function RobloxMinigame() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Use a fixed internal resolution for game logic to keep physics consistent
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 600;
  const GROUND_Y = GAME_HEIGHT - 60;
  const PLAYER_SIZE = 40;
  const GRAVITY = 0.6;
  const JUMP_STRENGTH = -12;
  const OBSTACLE_SPEED = 5;

  const [playerY, setPlayerY] = useState(GROUND_Y - PLAYER_SIZE);
  const [velocity, setVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<{x: number, width: number, height: number, passed: boolean}[]>([]);
  
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startGame = () => {
    setIsPlaying(true);
    setIsGameOver(false);
    setScore(0);
    setPlayerY(GROUND_Y - PLAYER_SIZE);
    setVelocity(0);
    setObstacles([
      { x: GAME_WIDTH, width: 40, height: 60, passed: false }
    ]);
  };

  const jump = useCallback(() => {
    if (!isPlaying) {
      startGame();
      return;
    }
    // Only jump if on the ground or falling slightly (double jump disabled)
    if (playerY >= GROUND_Y - PLAYER_SIZE - 5) {
      setVelocity(JUMP_STRENGTH);
    }
  }, [isPlaying, isGameOver, playerY]);

  // Handle keyboard jump
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  const updateGame = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    
    if (isPlaying && !isGameOver) {
      // Update player physics
      setPlayerY(prevY => {
        let newY = prevY + velocity;
        if (newY >= GROUND_Y - PLAYER_SIZE) {
          newY = GROUND_Y - PLAYER_SIZE;
        }
        return newY;
      });
      
      setVelocity(prevV => {
        if (playerY >= GROUND_Y - PLAYER_SIZE && prevV > 0) return 0;
        return prevV + GRAVITY;
      });

      // Update obstacles
      setObstacles(prev => {
        let newObs = prev.map(ob => ({ ...ob, x: ob.x - OBSTACLE_SPEED }));
        
        let hit = false;
        newObs.forEach(ob => {
          const pLeft = 100; // fixed player X
          const pRight = pLeft + PLAYER_SIZE;
          const pTop = playerY;
          const pBottom = playerY + PLAYER_SIZE;
          
          const oLeft = ob.x;
          const oRight = ob.x + ob.width;
          const oTop = GROUND_Y - ob.height;
          const oBottom = GROUND_Y;
          
          // Improved collision with slight leniency (hitbox reduction)
          const margin = 5;
          if (pRight - margin > oLeft && pLeft + margin < oRight && pBottom - margin > oTop && pTop + margin < oBottom) {
            hit = true;
          }
          
          if (!ob.passed && pLeft > oRight) {
            ob.passed = true;
            setScore(s => {
              const newScore = s + 1;
              if (newScore > highScore) setHighScore(newScore);
              return newScore;
            });
          }
        });
        
        if (hit) {
          setIsGameOver(true);
          setIsPlaying(false);
          soundEngine.playError();
        }
        
        newObs = newObs.filter(ob => ob.x + ob.width > 0);
        
        if (newObs.length === 0 || newObs[newObs.length - 1].x < GAME_WIDTH - 250 - (Math.random() * 200)) {
          newObs.push({
            x: GAME_WIDTH,
            width: 40 + Math.random() * 30,
            height: 40 + Math.random() * 60,
            passed: false
          });
        }
        return newObs;
      });
    }

    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(updateGame);
  }, [isPlaying, isGameOver, playerY, velocity, highScore]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateGame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [updateGame]);

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#ecf0f1',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Game Container with fixed aspect ratio, scales to fit window using CSS transform or just percentage-based internal rendering. 
          For simplicity, we render internal elements via percentages or a scaled wrapper. */}
      <div 
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '1200px',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#3498db', // Sky
          cursor: 'pointer',
          backgroundImage: 'linear-gradient(to bottom, #5dade2 0%, #3498db 100%)'
        }}
        onClick={jump}
      >
        {/* Clouds background */}
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '100px', height: '40px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '20px' }}></div>
        <div style={{ position: 'absolute', top: '25%', left: '60%', width: '150px', height: '50px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '25px' }}></div>
        <div style={{ position: 'absolute', top: '15%', left: '85%', width: '80px', height: '30px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '15px' }}></div>

        {/* Ground */}
        <div style={{ 
          position: 'absolute', 
          bottom: 0, 
          width: '100%', 
          height: `calc(100% - ${(GROUND_Y / GAME_HEIGHT) * 100}%)`, 
          background: '#2ecc71', 
          borderTop: '6px solid #27ae60',
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(0,0,0,0.05) 20px, rgba(0,0,0,0.05) 40px)'
        }} />
        
        {/* Scaling Layer for game objects */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `scaleY(1)`, // We map Y directly via percentages to handle resize smoothly
        }}>
          {/* Player (Noob) */}
          <div style={{
            position: 'absolute',
            left: `100px`, // Fixed X in pixels or percentages.
            top: `${(playerY / GAME_HEIGHT) * 100}%`,
            width: `${PLAYER_SIZE}px`,
            height: `${PLAYER_SIZE}px`,
            backgroundColor: '#f1c40f', // Noob yellow head
            borderRadius: '8px',
            boxShadow: 'inset -4px -4px 0px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'none' // handled by rAF
          }}>
            {/* Simple face */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
              <div style={{ width: 6, height: 6, background: '#2c3e50', borderRadius: '50%' }} />
              <div style={{ width: 6, height: 6, background: '#2c3e50', borderRadius: '50%' }} />
            </div>
            <div style={{ width: 14, height: 6, background: '#2c3e50', borderRadius: '0 0 10px 10px', marginTop: '2px' }} />
          </div>
          
          {/* Obstacles (Lava) */}
          {obstacles.map((ob, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `calc(${(ob.x / GAME_WIDTH) * 100}% )`, // Map internal X to percentage width
              top: `${((GROUND_Y - ob.height) / GAME_HEIGHT) * 100}%`,
              width: `${(ob.width / GAME_WIDTH) * 100}%`,
              height: `${(ob.height / GAME_HEIGHT) * 100}%`,
              backgroundColor: '#e74c3c', // Lava red
              borderRadius: '4px 4px 0 0',
              boxShadow: 'inset -2px -2px 0px rgba(0,0,0,0.2), 0 0 15px rgba(231, 76, 60, 0.6)',
              border: '2px solid #c0392b',
              borderBottom: 'none'
            }}>
               <div style={{ width: '100%', height: '5px', backgroundColor: '#f1c40f', opacity: 0.8 }} /> {/* Lava glow */}
            </div>
          ))}
        </div>
        
        {/* UI */}
        <div style={{ 
          position: 'absolute', 
          top: 20, 
          left: 20, 
          color: 'white', 
          fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif', 
          fontSize: '24px',
          fontWeight: 'bold',
          textShadow: '2px 2px 0 #2c3e50, -1px -1px 0 #2c3e50, 1px -1px 0 #2c3e50, -1px 1px 0 #2c3e50, 1px 1px 0 #2c3e50' 
        }}>
          SCORE: {score} <br/>
          HIGH SCORE: {highScore}
        </div>
        
        {!isPlaying && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: '30px 50px',
              borderRadius: '16px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              transform: isGameOver ? 'scale(1)' : 'scale(1.05)',
              transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              {isGameOver ? (
                <>
                  <h2 style={{ fontSize: '48px', margin: '0 0 10px', color: '#e74c3c', fontFamily: 'Impact, sans-serif' }}>OOF!</h2>
                  <p style={{ fontSize: '18px', color: '#34495e', margin: '0 0 20px' }}>You touched the lava.</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); startGame(); }}
                    style={{
                      backgroundColor: '#2ecc71',
                      color: 'white',
                      border: 'none',
                      padding: '12px 30px',
                      fontSize: '20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 0 #27ae60'
                    }}
                  >
                    PLAY AGAIN
                  </button>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: '40px', margin: '0 0 10px', color: '#3498db', fontFamily: 'Impact, sans-serif' }}>ROBLOX OBBY</h2>
                  <p style={{ fontSize: '18px', color: '#34495e', margin: '0 0 20px' }}>Click or Press Space to jump over the lava!</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); startGame(); }}
                    style={{
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      padding: '12px 30px',
                      fontSize: '20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 0 #2980b9'
                    }}
                  >
                    START GAME
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
