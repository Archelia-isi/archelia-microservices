import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

import { HologramAvatar } from './HologramAvatar';
import { Send, Bot, User, Volume2, VolumeX, PhoneCall, PhoneOff } from 'lucide-react';
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
  const backendUrl = import.meta.env.VITE_AI_CHATBOT_URL || '';
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Ciao! Sono Alrys, l\'ologramma IA di Archelia. Come posso aiutarti oggi?' }
  ]);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [animationState, setAnimationState] = useState<'idle' | 'thinking' | 'talking' | 'dance' | 'workout'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const isLiveModeRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isBotSpeakingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTranscriptRef = useRef('');

  // Code per riproduzione audio Cloud
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingAudioRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
    isBotSpeakingRef.current = false;
  };

  // --- Funzioni Vocali ---
  const speakSentence = async (text: string) => {
    if (isMuted) return;

    try {
      const response = await fetch(`${backendUrl}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) throw new Error('Errore TTS Backend');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioQueueRef.current.push(url);
      
      playNextAudio();
    } catch (err) {
      console.error('TTS Fetch Error:', err);
    }
  };

  const playNextAudio = () => {
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingAudioRef.current = true;
    const url = audioQueueRef.current.shift()!;
    const audio = new Audio(url);
    currentAudioRef.current = audio;

    audio.onplay = () => {
      isBotSpeakingRef.current = true;
      if (recognitionRef.current && isLiveModeRef.current) {
        try { recognitionRef.current.abort(); } catch(e) {}
      }
    };

    audio.onended = () => {
      isBotSpeakingRef.current = false;
      isPlayingAudioRef.current = false;
      
      // Riaccendiamo il mic solo se non ci sono altri audio in coda
      if (isLiveModeRef.current && recognitionRef.current && audioQueueRef.current.length === 0) {
        try { recognitionRef.current.start(); } catch(e) {}
      }
      playNextAudio();
    };

    audio.play().catch(e => {
       console.error("Audio play error", e);
       isPlayingAudioRef.current = false;
       playNextAudio();
    });
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      stopAudio();
    }
  };

  const toggleLiveMode = () => {
    if (!isMuted) {
      stopAudio(); // Fermo audio precedente
    }
    if (isLiveMode) {
      setIsLiveMode(false);
      isLiveModeRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Il tuo browser non supporta la modalità vocale. Usa Chrome o Safari.");
      return;
    }

    setIsLiveMode(true);
    isLiveModeRef.current = true;
    setIsMuted(false);

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    
    recognition.onstart = () => {};
    
    recognition.onresult = (event: any) => {
      // Se sta parlando, ignora l'audio (anti-eco)
      if (isBotSpeakingRef.current) return;
      
      // E se l'IA stava rispondendo dal server, abortisce la stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
        setAnimationState('idle');
      }

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const fullTranscript = finalTranscript + interimTranscript;
      currentTranscriptRef.current = fullTranscript;
      setInput(fullTranscript);

      // Reset silence timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      
      silenceTimerRef.current = setTimeout(() => {
        if (currentTranscriptRef.current.trim().length > 0) {
          submitMessage(currentTranscriptRef.current.trim());
          currentTranscriptRef.current = '';
          setInput('');
        }
      }, 1500); // 1.5 secondi di silenzio = invio
    };

    recognition.onend = () => {
      // In continuous mode, it stops on timeout. Restart if still in live mode AND non sta parlando
      if (isLiveModeRef.current && !isBotSpeakingRef.current) {
        try { recognition.start(); } catch(e) {}
      }
    };
    
    recognition.start();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    setInput('');
    submitMessage(msg);
  };

  const submitMessage = async (userMessage: string) => {
    if (isLoading) return;

    // Pulisce i prodotti raccomandati precedenti quando l'utente fa una nuova domanda
    setRecommendedProducts([]);

    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);
    setAnimationState('thinking'); 

    // Setup abort controller per l'interruzione
    abortControllerRef.current = new AbortController();

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
      const response = await fetch(`${backendUrl}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
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
      let sentenceBuffer = '';
      currentTranscriptRef.current = '';

      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        sseBuffer += chunk;

        const parts = sseBuffer.split('\n\n');
        // L'ultimo elemento potrebbe essere un chunk incompleto
        sseBuffer = parts.pop() || '';

        for (const line of parts) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6); // remove 'data: '
            if (dataStr === '[DONE]') {
              setIsLoading(false);
              
              if (sentenceBuffer.trim().length > 0) {
                speakSentence(sentenceBuffer.replace(/[*#_]/g, ''));
                sentenceBuffer = '';
              }

              if (isEasterEgg) {
                setTimeout(() => setAnimationState('idle'), 8000);
              } else {
                setAnimationState('idle');
              }
              break;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'products' && data.items) {
                console.log("[AI-CHATBOT-UI] Ricevuti prodotti da mostrare:", data.items);
                setRecommendedProducts(data.items);
              } else if (data.text || data.type === 'text') {
                if (isFirstChunk) {
                  setAnimationState(nextAnim); 
                  isFirstChunk = false;
                }

                const textPiece = data.text || '';
                sentenceBuffer += textPiece;
                currentTranscriptRef.current += textPiece;
                
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const last = newMsgs[newMsgs.length - 1];
                  last.text = currentTranscriptRef.current;
                  return newMsgs;
                });

                const sentences = sentenceBuffer.match(/[^.!?]+[.!?]+/g);
                if (sentences) {
                  for (const sentence of sentences) {
                    speakSentence(sentence.replace(/[*#_]/g, '').trim());
                  }
                  sentenceBuffer = sentenceBuffer.replace(/[^.!?]+[.!?]+/g, '');
                }
              } else if (data.error) {
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].text = `[Errore]: ${data.error}`;
                  return newMsgs;
                });
                setAnimationState('idle');
              }
            } catch (err) {
              console.error("Errore parse SSE JSON (Ignorato):", err, dataStr);
            }
          }
        }
      }
      setIsLoading(false);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generazione interrotta dall\'utente.');
      } else {
        console.error("Errore chiamata bot:", error);
        setMessages(prev => [...prev, { role: 'model', text: 'Scusa, i miei circuiti sono offline al momento. Riprova più tardi.' }]);
      }
      setIsLoading(false);
      setAnimationState('idle');
    } finally {
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
    }
  };

  return (
    <div className="ai-chatbot-panel">
      {/* POPUP PRODOTTI CONSIGLIATI SPUNTATO A SINISTRA */}
      {recommendedProducts.length > 0 && (
        <div className="recommended-products-popup">
          <h4>Consigliati per te</h4>
          <div className="recommended-products-scroll">
            {recommendedProducts.map((p, i) => (
              <div key={i} className="recommended-product-card">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="recommended-product-img" />
                ) : (
                  <div className="recommended-product-noimg">Nessuna foto</div>
                )}
                <div className="recommended-product-info">
                  <div className="recommended-product-title">{p.title}</div>
                  <div className="recommended-product-price">€{p.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            
            <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.8} minPolarAngle={Math.PI / 2.2} />
          </Canvas>
        </ErrorBoundary>
        <div className="hologram-base-glow"></div>
      </div>

      {/* SEZIONE CHAT: I messaggi in basso */}
      <div className="ai-chat-interface">
        
        {/* Header Chat per controlli globali */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 10px', marginBottom: '-5px' }}>
          <button 
            type="button" 
            style={{ background: 'transparent', border: 'none', color: isMuted ? '#666' : '#00d2ff', cursor: 'pointer' }}
            onClick={toggleMute} 
            title="Attiva/Disattiva Voce IA"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

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
          <button 
            type="button" 
            className={`live-mode-btn ${isLiveMode ? 'active' : ''}`}
            onClick={toggleLiveMode}
            title={isLiveMode ? "Disattiva Modalità Conversazione" : "Avvia Modalità Conversazione"}
          >
            {isLiveMode ? <PhoneOff size={18} /> : <PhoneCall size={18} />}
          </button>
          
          <input 
            type="text" 
            placeholder={isLiveMode ? "Alrys ti sta ascoltando..." : "Scrivi o attiva la cornetta..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || isLiveMode}
            style={isLiveMode ? { borderColor: '#ff3366', backgroundColor: 'rgba(255, 51, 102, 0.05)' } : {}}
          />
          <button type="submit" disabled={isLoading || !input.trim() || isLiveMode}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
