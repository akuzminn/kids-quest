let audioContext = null;

function ctx() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext ||= new AudioContextClass();
    return audioContext;
  } catch {
    return null;
  }
}

function tone(frequency, start, duration, type = 'sine', volume = 0.08) {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, c.currentTime + start);
  gain.gain.setValueAtTime(volume, c.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + duration);
}

export function playSound(type, enabled = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    if (type === 'click') {
      tone(440, 0, 0.07, 'triangle', 0.05);
    } else if (type === 'success') {
      [523, 659, 784].forEach((n, i) => tone(n, i * 0.08, 0.18, 'sine', 0.08));
    } else if (type === 'win') {
      [392, 523, 659, 784, 1046].forEach((n, i) => tone(n, i * 0.09, 0.22, 'sine', 0.08));
    } else if (type === 'fail') {
      tone(180, 0, 0.18, 'sawtooth', 0.07);
      tone(100, 0.14, 0.25, 'sawtooth', 0.07);
    } else if (type === 'powerup') {
      [330, 440, 660, 880].forEach((n, i) => tone(n, i * 0.06, 0.16, 'triangle', 0.06));
    } else if (type === 'level') {
      [262, 392].forEach((n, i) => tone(n, i * 0.1, 0.18, 'square', 0.045));
    }
  } catch {
    // Browser may block sound until first user action.
  }
}
