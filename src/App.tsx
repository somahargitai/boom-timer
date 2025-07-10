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
  const audioContextRef = useRef<AudioContext | null>(null);

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

  // More aggressive audio unlock for iPad
  const unlockAudio = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      // Force resume AudioContext multiple times (iOS can be stubborn)
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
        // Wait and try again if still suspended
        if (audioContextRef.current.state === "suspended") {
          await new Promise((resolve) => setTimeout(resolve, 100));
          await audioContextRef.current.resume();
        }
      }

      // Play multiple unlock sounds with different approaches
      const unlockPromises = [];

      // Method 1: Silent oscillator
      for (let i = 0; i < 3; i++) {
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        gainNode.gain.value = i === 0 ? 0 : 0.001; // First silent, others barely audible
        oscillator.frequency.value = 440 + i * 100;

        const startTime = audioContextRef.current.currentTime + i * 0.01;
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.01);

        unlockPromises.push(
          new Promise((resolve) => {
            oscillator.onended = resolve;
          })
        );
      }

      // Method 2: Buffer source with tiny sound
      const buffer = audioContextRef.current.createBuffer(
        1,
        1,
        audioContextRef.current.sampleRate
      );
      const source = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();

      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      gainNode.gain.value = 0.001;
      source.start();

      await Promise.all(unlockPromises);

      // Final check and force resume again
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      setAudioUnlocked(true);
      console.log("Audio unlocked successfully for iPad");
    } catch (error) {
      console.error("Audio unlock failed:", error);
      // Still set as unlocked to try playing sounds
      setAudioUnlocked(true);
    }
  };

  // Test audio with audible sound for iPad users
  const testAudio = async () => {
    await unlockAudio();

    try {
      const context = await getAudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.2;

      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);

      setAudioTested(true);
      console.log("Audio test completed");
    } catch (error) {
      console.warn("Audio test failed:", error);
    }
  };

  const getAudioContext = async () => {
    if (
      !audioContextRef.current ||
      audioContextRef.current.state === "closed"
    ) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    // Always try to resume before playing (iPad requirement)
    if (audioContextRef.current.state === "suspended") {
      try {
        await audioContextRef.current.resume();
      } catch (error) {
        console.warn("Could not resume audio context:", error);
      }
    }

    return audioContextRef.current;
  };

  const playTickSound = async () => {
    if (!audioUnlocked) return;

    try {
      const context = await getAudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = 1000;
      oscillator.type = "square";
      gainNode.gain.value = 0.05;

      oscillator.start();
      oscillator.stop(context.currentTime + 0.1);
    } catch (error) {
      console.warn("Tick sound failed:", error);
    }
  };

  const playFinalAlarm = async () => {
    if (!audioUnlocked) return;

    try {
      const context = await getAudioContext();

      // Create massive explosion sound with distortion and deep bass
      const createMassiveExplosion = () => {
        const bufferSize = context.sampleRate * 4; // 4 seconds for longer explosion
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          const time = i / context.sampleRate;

          // MASSIVE initial blast with heavy distortion
          const blastDecay = Math.exp(-time * 2);
          const heavyNoise = (Math.random() * 2 - 1) * blastDecay * 0.8;

          // DEEP sub-bass rumble (20-40Hz) - feel it in your chest
          const subBassFreq = 25 + 15 * Math.sin(time * 0.5); // Wobbling sub-bass
          const subBass =
            Math.sin(2 * Math.PI * subBassFreq * time) *
            Math.exp(-time * 0.5) *
            0.7;

          // Low frequency thunder roll (40-80Hz)
          const thunderFreq = 60 * (1 - time * 0.2);
          const thunder =
            Math.sin(2 * Math.PI * thunderFreq * time) *
            Math.exp(-time * 0.8) *
            0.6;

          // Mid-range destruction (100-300Hz)
          const destructionFreq = 200 * (1 - time * 0.6);
          const destruction =
            Math.sin(2 * Math.PI * destructionFreq * time) *
            Math.exp(-time * 1.5) *
            0.5;

          // High frequency debris and crackling (500-2000Hz)
          const debrisFreq = 1000 * (1 - time * 0.9);
          const debris =
            Math.sin(2 * Math.PI * debrisFreq * time) *
            Math.exp(-time * 3) *
            0.4;

          // Combine all layers
          let sample = heavyNoise + subBass + thunder + destruction + debris;

          // AGGRESSIVE DISTORTION - clip and overdrive
          sample *= 1.8; // Overdrive
          if (sample > 0.7) sample = 0.7 + (sample - 0.7) * 0.1; // Soft clipping
          if (sample < -0.7) sample = -0.7 + (sample + 0.7) * 0.1;

          // Add some digital-style distortion for extra aggression
          if (Math.abs(sample) > 0.3) {
            sample = sample > 0 ? sample * 1.2 : sample * 1.2;
          }

          data[i] = sample;

          // Overall envelope - longer decay for massive explosion
          data[i] *= Math.exp(-time * 0.8);
        }

        return buffer;
      };

      // Play the massive explosion with additional processing
      const explosionBuffer = createMassiveExplosion();
      const source = context.createBufferSource();
      const gainNode = context.createGain();

      // Add some filter sweep for extra drama
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(8000, context.currentTime);
      filter.frequency.exponentialRampToValueAtTime(
        200,
        context.currentTime + 2
      );

      source.buffer = explosionBuffer;
      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(context.destination);

      // LOUD volume for maximum impact
      gainNode.gain.value = 0.6;

      // Start the massive explosion
      source.start();
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
