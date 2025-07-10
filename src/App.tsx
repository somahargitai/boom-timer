import { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTime, setSelectedTime] = useState(60);
  const [prevTimeLeft, setPrevTimeLeft] = useState(60);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [audioTested, setAudioTested] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const tickAudioPoolRef = useRef<HTMLAudioElement[]>([]);
  const explosionAudioRef = useRef<HTMLAudioElement | null>(null);
  const tickAudioIndexRef = useRef(0);
  const tickDataURLRef = useRef<string>("");

  const timePresets = [
    { label: "5s", seconds: 5 },
    { label: "30s", seconds: 30 },
    { label: "1m", seconds: 60 },
    { label: "2m", seconds: 120 },
    { label: "3m", seconds: 180 },
    { label: "4m", seconds: 240 },
    { label: "5m", seconds: 300 },
  ];

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setPrevTimeLeft((prev) => prev);
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playFinalAlarm();
            return 0;
          }
          // Play tick sound for last 10 seconds
          if (prev <= 10) {
            console.log("Timer at", prev, "seconds - calling playTickSound()");
            playTickSound();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  useEffect(() => {
    setPrevTimeLeft(timeLeft);
  }, [timeLeft]);

  // Create audio data URLs for iPad compatibility
  const createAudioDataURL = (frequency: number, duration: number, volume: number = 0.1) => {
    const sampleRate = 8000; // Lower sample rate for smaller data
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2); // WAV header + data
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, buffer.byteLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    // Audio data
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * frequency * t) * volume * Math.exp(-t * 2);
      view.setInt16(44 + i * 2, sample * 32767, true);
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  // Create explosion sound with multiple frequency layers
  const createExplosionSound = () => {
    const sampleRate = 8000;
    const duration = 2.0; // 2 seconds
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV header (same as before)
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, buffer.byteLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    // Generate explosion audio data
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      
      // Multiple frequency layers for realistic explosion
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 3) * 0.6; // White noise
      const lowRumble = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 1) * 0.4; // Low rumble
      const midCrack = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 2) * 0.3; // Mid crack
      const highDebris = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 4) * 0.2; // High debris
      
      let sample = noise + lowRumble + midCrack + highDebris;
      
      // Apply envelope and distortion
      sample *= Math.exp(-t * 1.5); // Overall decay
      sample = Math.tanh(sample * 2); // Saturation distortion
      
      view.setInt16(44 + i * 2, sample * 32767 * 0.8, true);
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  // Initialize audio elements
  useEffect(() => {
    // Create tick sound data URL and store reference
    const tickDataURL = createAudioDataURL(1000, 0.1, 0.3);
    tickDataURLRef.current = tickDataURL;
    
    // Create tick sound pool (5 audio elements for iPad compatibility)
    tickAudioPoolRef.current = [];
    for (let i = 0; i < 5; i++) {
      const audio = new Audio(tickDataURL);
      audio.preload = 'auto';
      // Force load immediately
      audio.load();
      tickAudioPoolRef.current.push(audio);
    }
    
    // Create complex explosion sound
    const explosionDataURL = createExplosionSound();
    explosionAudioRef.current = new Audio(explosionDataURL);
    explosionAudioRef.current.preload = 'auto';
    explosionAudioRef.current.load();
    
    return () => {
      tickAudioPoolRef.current.forEach(audio => {
        URL.revokeObjectURL(audio.src);
      });
      if (explosionAudioRef.current) {
        URL.revokeObjectURL(explosionAudioRef.current.src);
      }
      if (tickDataURLRef.current) {
        URL.revokeObjectURL(tickDataURLRef.current);
      }
    };
  }, []);

  // Simple HTML5 Audio unlock for iPad
  const unlockAudio = async () => {
    try {
      // Try to play a silent audio element to unlock audio
      if (tickAudioPoolRef.current.length > 0) {
        const audio = tickAudioPoolRef.current[0];
        audio.volume = 0;
        const playPromise = audio.play();
        if (playPromise) {
          await playPromise;
          audio.pause();
          audio.currentTime = 0;
        }
      }
      
      setAudioUnlocked(true);
      console.log("HTML5 Audio unlocked for iPad");
    } catch (error) {
      console.error("Audio unlock failed:", error);
      setAudioUnlocked(true);
    }
  };

  // Test audio with audible sound for iPad users
  const testAudio = async () => {
    await unlockAudio();

    try {
      if (tickAudioPoolRef.current.length > 0) {
        const audio = tickAudioPoolRef.current[0];
        audio.volume = 0.3;
        audio.currentTime = 0;
        await audio.play();
      }
      
      setAudioTested(true);
      console.log("Audio test completed with HTML5 Audio");
    } catch (error) {
      console.warn("Audio test failed:", error);
    }
  };

  const playTickSound = async () => {
    if (!audioUnlocked) {
      console.log("Tick sound blocked: audioUnlocked =", audioUnlocked);
      return;
    }

    console.log("Timer requesting tick sound");

    // Try both approaches for maximum iPad compatibility
    try {
      // Approach 1: Fresh audio element (most reliable for iPad)
      if (tickDataURLRef.current) {
        const freshAudio = new Audio(tickDataURLRef.current);
        freshAudio.volume = 0.3;
        
        const playPromise = freshAudio.play();
        if (playPromise) {
          await playPromise;
          console.log("Fresh audio tick played successfully");
          return; // Success, exit early
        }
      }
    } catch (error) {
      console.warn("Fresh audio approach failed:", error);
    }

    // Approach 2: Pool fallback
    try {
      if (tickAudioPoolRef.current.length > 0) {
        const currentIndex = tickAudioIndexRef.current % tickAudioPoolRef.current.length;
        const audio = tickAudioPoolRef.current[currentIndex];
        
        console.log("Fallback to pool, index:", currentIndex, "readyState:", audio.readyState);
        
        // Reset audio to beginning and set volume
        audio.currentTime = 0;
        audio.volume = 0.3;
        
        // Play the audio
        const playPromise = audio.play();
        if (playPromise) {
          await playPromise;
          console.log("Pool audio tick played successfully");
        }
        
        // Move to next audio element for next play
        tickAudioIndexRef.current = (tickAudioIndexRef.current + 1) % tickAudioPoolRef.current.length;
      }
    } catch (error) {
      console.error("Both tick sound approaches failed:", error);
    }
  };

  const playFinalAlarm = async () => {
    if (!audioUnlocked || !explosionAudioRef.current) return;

    try {
      explosionAudioRef.current.volume = 0.8;
      explosionAudioRef.current.currentTime = 0;
      await explosionAudioRef.current.play();
    } catch (error) {
      console.warn("Explosion sound failed:", error);
    }
  };

  const startStop = async () => {
    if (!audioUnlocked) {
      await unlockAudio();
    }
    setIsRunning(!isRunning);
  };

  const reset = () => {
    setIsRunning(false);
    setTimeLeft(selectedTime);
    setPrevTimeLeft(selectedTime);
  };

  const selectTime = async (seconds: number) => {
    if (!audioUnlocked) {
      await unlockAudio();
    }
    setSelectedTime(seconds);
    setTimeLeft(seconds);
    setPrevTimeLeft(seconds);
    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getDigits = (time: string) => {
    return time.split("").filter((char) => char !== ":");
  };

  const shouldFlip = (index: number) => {
    const currentDigits = getDigits(formatTime(timeLeft));
    const prevDigits = getDigits(formatTime(prevTimeLeft));
    return currentDigits[index] !== prevDigits[index];
  };

  return (
    <div className="stopwatch-container">
      {!audioUnlocked && <div className="audio-notice">🔊</div>}

      {audioUnlocked && !audioTested && (
        <div className="audio-test-notice">
          <button className="audio-test-btn" onClick={testAudio}>
            🔊 Test Audio (Recommended for iPad)
          </button>
        </div>
      )}

      <div className="time-presets">
        {timePresets.map((preset) => (
          <button
            key={preset.seconds}
            className={`preset-btn ${
              selectedTime === preset.seconds ? "active" : ""
            }`}
            onClick={() => selectTime(preset.seconds)}
            disabled={isRunning}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="stopwatch">
        <div className="display">
          {getDigits(formatTime(timeLeft)).map((digit, index) => (
            <div
              key={index}
              className={`digit-panel ${shouldFlip(index) ? "flip" : ""}`}
            >
              <div className="digit">{digit}</div>
            </div>
          ))}
          <div className="colon">:</div>
        </div>
      </div>

      <div className="controls">
        <button
          className={`control-btn ${isRunning ? "stop" : "start"}`}
          onClick={startStop}
        >
          {isRunning ? "Stop" : "Start"}
        </button>
        <button className="control-btn reset" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default App;
