import React, { useState, useEffect } from "react";
import * as Tone from "tone";

const noteMap = {
  1: "C3", 2: "D3", 3: "E3", 4: "F3", 5: "G3",
  6: "A3", 7: "B3", 8: "C4", 9: "D4", 10: "E4",
  11: "F4", 12: "G4"
};

const SongClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const updateClock = () => {
      setTime(new Date());
    };
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Tone.start();
    const referenceSynth = new Tone.Synth({ oscillator: { type: "sine" } }).toDestination();
    const hourSynth = new Tone.Synth({ oscillator: { type: "sine" } }).toDestination();

    referenceSynth.triggerAttack("C3");
    hourSynth.triggerAttack(noteMap[time.getHours() % 12 || 12]);

    return () => {
      referenceSynth.triggerRelease();
      hourSynth.triggerRelease();
    };
  }, [time]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>SongClock</h1>
      <h2>{time.toLocaleTimeString()}</h2>
      <p>Reference Note: C3 (Sine Wave)</p>
      <p>Hour Note: {noteMap[time.getHours() % 12 || 12]} (Sine Wave)</p>
      {/* Placeholder for sheet music representation */}
    </div>
  );
};

export default SongClock;

