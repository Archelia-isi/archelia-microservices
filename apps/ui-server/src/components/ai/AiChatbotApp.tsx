import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

import { HologramAvatar } from './HologramAvatar';
import { Send, Bot, User } from 'lucide-react';
import './AiChatbotApp.css';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.error("Hologram Error:", error); }
  render() {
    if (this.state.hasError) return <div style={{color: '#00d2ff', display: 'flex', alignItems:'center', justifyContent:'center', height:'100%'}}>Scansione Ologramma in corso... (Rete lenta)</div>;
    return this.props.children;
  }
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function AiChatbotApp() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Ciao! Sono l\'ologramma IA di Archelia. Come posso aiutarti oggi?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [animationState, setAnimationState] = useState<'idle' | 'thinking' | 'talking' | 'dance' | 'workout'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);
    setAnimationState('thinking'); // Inizia a pensare

    // Easter egg check
    const lowerInput = userMessage.toLowerCase();
    let isEasterEgg = false;
    let nextAnim: 'talking' | 'dance' | 'workout' = 'talking';
    
    if (lowerInput.includes('balla') || lowerInput.includes('dance') || lowerInput.includes('breakdance') || lowerInput.includes('rumba')) {
      isEasterEgg = true;
      nextAnim = 'dance';
    } else if (lowerInput.includes('allena') || lowerInput.includes('workout') || lowerInput.includes('palestra')) {
      isEasterEgg = true;
      nextAnim = 'workout';
    }

    try {
      const backendUrl = import.meta.env.VITE_AI_CHATBOT_URL || '';
      
      const response = await fetch(`${backendUrl}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages
            .filter((m, index) => !(index === 0 && m.role === 'model'))
            .map(m => ({
              role: m.role,
              parts: [{ text: m.text }]
            }))
        })
      });

      if (!response.ok) {
        throw new Error(`Server disconnesso o in errore (Status: ${response.status})`);
      }

      if (!response.body) throw new Error("Nessuno stream ricevuto");

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '');
            if (dataStr === '[DONE]') {
              setIsLoading(false);
              // Se è un easter egg, continua a ballare/allenarsi per un po', altrimenti torna idle
              if (isEasterEgg) {
                setTimeout(() => setAnimationState('idle'), 8000);
              } else {
                setAnimationState('idle');
              }
              break;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                if (isFirstChunk) {
                  setAnimationState(nextAnim); // Passa da thinking a talking (o dance/workout)
                  isFirstChunk = false;
                }
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].text += data.text;
                  return newMsgs;
                });
              } else if (data.error) {
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].text = `[Errore]: ${data.error}`;
                  return newMsgs;
                });
                setAnimationState('idle');
              }
            } catch (err) {
              console.error("Errore parse SSE JSON:", err);
            }
          }
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Errore chiamata bot:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'Scusa, i miei circuiti sono offline al momento. Riprova più tardi.' }]);
      setIsLoading(false);
      setAnimationState('idle');
    }
  };

  return (
    <div className="ai-chatbot-panel">
      {/* SEZIONE 3D: L'ologramma in alto */}
      <div className="ai-hologram-viewport">
        <ErrorBoundary>
          <Canvas camera={{ position: [0, 0, 7.0], fov: 50 }}>
            <ambientLight intensity={1.5} />
            <directionalLight position={[0, 5, 10]} intensity={2.0} color="#ffffff" />
            <pointLight position={[10, 10, 10]} color="#00d2ff" intensity={0.5} />
            <spotLight position={[-10, 10, -10]} color="#0055ff" intensity={1} />
            <Environment preset="city" />
            
            <React.Suspense fallback={null}>
              <HologramAvatar animationState={animationState} />
            </React.Suspense>
            
            <OrbitControls 
              enableZoom={false} 
              enablePan={false}
              minPolarAngle={Math.PI / 2.5}
              maxPolarAngle={Math.PI / 2.1}
              target={[0, 0, 0]}
            />
          </Canvas>
        </ErrorBoundary>
        <div className="hologram-base-glow"></div>
      </div>

      {/* SEZIONE CHAT: I messaggi in basso */}
      <div className="ai-chat-interface">
        <div className="ai-chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              <div className="chat-avatar">
                {msg.role === 'model' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className="chat-bubble">
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="chat-message model loading">
              <div className="chat-avatar"><Bot size={18} /></div>
              <div className="chat-bubble typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSubmit} className="ai-chat-input-area">
          <input 
            type="text" 
            placeholder="Chiedi informazioni..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
