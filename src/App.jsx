import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

const noteMap = {
  1: "C3", 2: "D3", 3: "E3", 4: "F3", 5: "G3",
  6: "A3", 7: "B3", 8: "C4", 9: "D4", 10: "E4",
  11: "F4", 12: "G4"
};

const SongClock = () => {
  const [time, setTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(true); // State for starting/stopping
  const hourRef = useRef(time.getHours());
  const referenceSynthRef = useRef(null);
  const hourSynthRef = useRef(null);

  useEffect(() => {
    const updateClock = () => {
      setTime(new Date());
    };
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Start audio context and create synths once
    Tone.start();

    if (!referenceSynthRef.current) {
      referenceSynthRef.current = new Tone.Synth({ oscillator: { type: "sine" } }).toDestination();
      if (isPlaying) referenceSynthRef.current.triggerAttack("C3");
    }

    if (!hourSynthRef.current) {
      hourSynthRef.current = new Tone.Synth({ oscillator: { type: "triangle" } }).toDestination();
      if (isPlaying) hourSynthRef.current.triggerAttack(noteMap[time.getHours() % 12 || 12]);
      hourRef.current = time.getHours();
    } else if (hourRef.current !== time.getHours() && isPlaying) {
      hourSynthRef.current.triggerRelease();
      hourSynthRef.current = new Tone.Synth({ oscillator: { type: "sine" } }).toDestination();
      hourSynthRef.current.triggerAttack(noteMap[time.getHours() % 12 || 12]);
      hourRef.current = time.getHours();
    }

    return () => {
      // Cleanup not done on every second, only on unmount
      return () => {
        referenceSynthRef.current?.triggerRelease();
        hourSynthRef.current?.triggerRelease();
      };
    };
  }, [time, isPlaying]);

  const toggleSound = () => {
    setIsPlaying((prev) => !prev); // Toggle play state
    if (!isPlaying) {
      // Restart sound when play is toggled on
      referenceSynthRef.current.triggerAttack("C3");
      hourSynthRef.current.triggerAttack(noteMap[time.getHours() % 12 || 12]);
    } else {
      referenceSynthRef.current.triggerRelease();
      hourSynthRef.current.triggerRelease();
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>SongClock</h1>
      <h2>{time.toLocaleTimeString()}</h2>
      <p>Reference Note: C3 (Sine Wave)</p>
      <p>Hour Note: {noteMap[time.getHours() % 12 || 12]} (Sine Wave)</p>
      <button onClick={toggleSound}>
        {isPlaying ? "Stop Sounds" : "Start Sounds"}
      </button>
    </div>
  );
};

export default SongClock;

