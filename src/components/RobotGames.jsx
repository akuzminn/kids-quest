import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fireConfetti, useShake } from './GameEffects';

// Helpers
export function posKey(pos = []) { return `${pos[0]}-${pos[1]}`; }
export function turn(dir, cmd) { const dirs = ['N', 'E', 'S', 'W']; const i = dirs.indexOf(dir); return dirs[(i + (cmd === 'right' ? 1 : 3) + 4) % 4]; }
export function vector(dir) { if (dir === 'N') return [-1, 0]; if (dir === 'S') return [1, 0]; if (dir === 'W') return [0, -1]; return [0, 1]; }

export function simulateRobot(config, commands) {
  const grid = config.grid || {}; const rows = Number(grid.rows || 5); const cols = Number(grid.cols || 6);
  let pos = [...(grid.start || [0, 0])]; let dir = grid.dir || 'E';
  const obstacles = new Set((grid.obstacles || []).map(posKey));
  const itemMap = new Map((grid.items || []).map((i) => [posKey(i.pos), i.id || posKey(i.pos)]));
  const repairMap = new Map((grid.repairs || []).map((i) => [posKey(i.pos), i.id || posKey(i.pos)]));
  const collected = new Set(); const repaired = new Set();
  const steps = [{ pos: [...pos], dir, action: 'start' }];
  for (const command of commands) {
    if (command === 'left' || command === 'right') { dir = turn(dir, command); steps.push({ pos: [...pos], dir, action: command }); continue; }
    if (command === 'forward') {
      const [dr, dc] = vector(dir); const next = [pos[0] + dr, pos[1] + dc];
      if (next[0] < 0 || next[0] >= rows || next[1] < 0 || next[1] >= cols) return { success: false, steps, message: 'Робот виїхав за межі поля.' };
      if (obstacles.has(posKey(next))) return { success: false, steps: [...steps, { pos: next, dir, action: 'crash' }], message: 'Бум! На шляху перешкода.' };
      pos = next; steps.push({ pos: [...pos], dir, action: command }); continue;
    }
    if (command === 'pickup') {
      const key = posKey(pos);
      if (!itemMap.has(key)) return { success: false, steps, message: 'Тут немає вантажу для захвату.' };
      collected.add(itemMap.get(key)); steps.push({ pos: [...pos], dir, action: command, collectedId: itemMap.get(key) }); continue;
    }
    if (command === 'repair') {
      const key = posKey(pos);
      if (!repairMap.has(key)) return { success: false, steps, message: 'Тут немає об’єкта для ремонту.' };
      repaired.add(repairMap.get(key)); steps.push({ pos: [...pos], dir, action: command, repairedId: repairMap.get(key) });
    }
  }
  const missingItems = [...itemMap.values()].filter((id) => !collected.has(id));
  const missingRepairs = [...repairMap.values()].filter((id) => !repaired.has(id));
  if (missingItems.length) return { success: false, steps, message: 'Робот не забрав потрібний вантаж.' };
  if (missingRepairs.length) return { success: false, steps, message: 'Не всі поломки відремонтовані.' };
  if (posKey(pos) !== posKey(grid.goal)) return { success: false, steps, message: 'Тепер треба фінішувати на прапорці.' };
  return { success: true, steps, message: 'Супер! Маршрут працює.' };
}

export function RobotRouteTask({ level, config, disabled, completed, onComplete, sound }) {
  const grid = config.grid || {};
  const rows = Number(grid.rows || 5); const cols = Number(grid.cols || 6);
  const [commands, setCommands] = useState([]);
  const [result, setResult] = useState(null);
  const [playbackStep, setPlaybackStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { isShaking, shake, shakeAnimation } = useShake();

  const maxCommands = Math.max(Number(config.maxCommands || 12), 36);
  const palette = config.commands || [
    { id: 'forward', emoji: '⬆️', title: 'вперед' },
    { id: 'left', emoji: '↩️', title: 'ліворуч' },
    { id: 'right', emoji: '↪️', title: 'праворуч' },
    { id: 'pickup', emoji: '🦾', title: 'взяти' },
    { id: 'repair', emoji: '🔧', title: 'ремонт' }
  ];

  function add(id) {
    if (disabled || completed || commands.length >= maxCommands || isPlaying) return;
    setCommands((p) => [...p, id]); setResult(null); sound('click');
  }

  function run() {
    if (isPlaying) return;
    const next = simulateRobot(config, commands);
    setResult(next);
    setIsPlaying(true);
    setPlaybackStep(0);
    sound('click');
  }

  useEffect(() => {
    if (isPlaying && result && playbackStep < result.steps.length) {
      const step = result.steps[playbackStep];
      const timer = setTimeout(() => {
        sound(step.action === 'crash' ? 'fail' : step.action !== 'start' ? 'click' : null);
        if (step.action === 'crash') shake();
        setPlaybackStep(p => p + 1);
      }, 500); // 500ms per step
      return () => clearTimeout(timer);
    } else if (isPlaying && playbackStep >= result?.steps.length) {
      setIsPlaying(false);
      sound(result.success ? 'success' : 'fail');
      if (result.success) fireConfetti();
    }
  }, [isPlaying, playbackStep, result, sound, shake]);

  const currentStep = result && isPlaying ? result.steps[Math.min(playbackStep, result.steps.length - 1)] 
    : result && !isPlaying ? result.steps[result.steps.length - 1]
    : { pos: grid.start || [0, 0], dir: grid.dir || 'E' };

  // Calculate pixel positions based on grid (approximate visually)
  // Let's rely on standard layout and just animate the robot piece.
  // Actually, to make framer-motion work well within a standard CSS grid, 
  // we can render the robot in the DOM grid and use `layout` prop.

  return (
    <div className="robotRouteGame">
      <div className="missionIntro">
        <div className="robotPortrait">
          <span>{config.robotIcon || '🤖'}</span>
          <strong>{config.robotName || 'Robo'}</strong>
          <small>{config.kit || 'WeDo 2.0 / Spike Prime'}</small>
        </div>
        <div>
          <h3>{config.storyTitle || 'Місія робота'}</h3>
          <p>{config.story || 'Склади маршрут, запусти симуляцію, потім повтори на реальному полі.'}</p>
          <div className="objectiveChips">
            {(config.objectives || ['дійти до фінішу']).map((o) => <span key={o}>🎯 {o}</span>)}
          </div>
        </div>
      </div>

      <div className="robotArenaWrap">
        <motion.div animate={shakeAnimation} className="robotGrid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, position: 'relative' }}>
          {Array.from({ length: rows * cols }).map((_, i) => {
            const pos = [Math.floor(i / cols), i % cols];
            const key = posKey(pos);
            const obstacle = (grid.obstacles || []).some((p) => posKey(p) === key);
            
            // If playing, check if item collected by current step
            let item = (grid.items || []).find((x) => posKey(x.pos) === key);
            let repair = (grid.repairs || []).find((x) => posKey(x.pos) === key);
            
            if (result && playbackStep > 0) {
              const pastSteps = result.steps.slice(0, playbackStep + 1);
              if (item && pastSteps.some(s => s.collectedId === item.id || (s.collectedId && s.pos[0]===item.pos[0] && s.pos[1]===item.pos[1]))) {
                item = null; // Hide collected
              }
              if (repair && pastSteps.some(s => s.repairedId === repair.id || (s.repairedId && s.pos[0]===repair.pos[0] && s.pos[1]===repair.pos[1]))) {
                repair = null; // Hide repaired
              }
            }

            const isGoal = posKey(grid.goal || []) === key;
            const isRobot = posKey(currentStep.pos) === key;

            return (
              <div key={key} className={`gridCell ${obstacle ? 'wall' : ''} ${isGoal ? 'goal' : ''}`}>
                {obstacle ? '🪨' : item ? item.emoji || '📦' : repair ? repair.emoji || '🔧' : isGoal ? '🏁' : ''}
                {isRobot && (
                  <motion.span 
                    layoutId="robotAvatar"
                    className={`robotBot dir-${currentStep.dir}`}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    style={{ position: 'absolute', zIndex: 10, fontSize: '32px' }}
                  >
                    🤖
                  </motion.span>
                )}
              </div>
            );
          })}
        </motion.div>

        <div className="commandPanel">
          <h3>Команди <small>{commands.length}/{maxCommands}</small></h3>
          <div className="commandPalette">
            {palette.map((c) => (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={c.id} 
                onClick={() => add(c.id)} 
                disabled={disabled || completed || isPlaying}
              >
                {c.emoji}<span>{c.title}</span>
              </motion.button>
            ))}
          </div>
          
          <div className="programLine">
            <AnimatePresence>
              {commands.map((cmd, i) => (
                <motion.button 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  key={`${cmd}-${i}`} 
                  onClick={() => !isPlaying && setCommands((p) => p.filter((_, idx) => idx !== i))}
                  disabled={isPlaying}
                >
                  {palette.find((x) => x.id === cmd)?.emoji || cmd}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
          
          <div className="actionRow">
            <button className="secondaryBtn" onClick={() => { setCommands([]); setResult(null); }} disabled={disabled || completed || isPlaying}>
              <RefreshCw size={17} /> Очистити
            </button>
            <button className="primaryBtn" onClick={run} disabled={disabled || completed || !commands.length || isPlaying}>
              <Play size={17} /> Запуск
            </button>
          </div>
          
          {!isPlaying && result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={result.success ? 'feedback ok' : 'feedback bad'}>
              {result.message}
            </motion.div>
          )}
          
          <button className="primaryBtn big" disabled={!result?.success || disabled || completed || isPlaying} onClick={() => onComplete(level, config.points || 15)}>
            <CheckCircle2 size={20} /> Місію виконано
          </button>
        </div>
      </div>
    </div>
  );
}

export function RobotAssemblyTask({ level, config, disabled, completed, onComplete, sound }) {
  const requiredParts = config.requiredParts || ['hub', 'motor'];
  const requiredProgram = config.requiredProgram || ['start', 'motor_on', 'wait', 'motor_off'];
  
  const parts = config.parts || [
    { id: 'hub', emoji: '🧠', title: 'SmartHub' },
    { id: 'motor', emoji: '⚙️', title: 'Мотор' },
    { id: 'sensor', emoji: '📡', title: 'Датчик' },
    { id: 'light', emoji: '💡', title: 'Світло' },
    { id: 'wheel', emoji: '🛞', title: 'Колесо' }
  ];
  
  const blocks = config.blocks || [
    { id: 'start', emoji: '▶️', title: 'старт' },
    { id: 'motor_on', emoji: '⚙️', title: 'мотор' },
    { id: 'wait', emoji: '⏳', title: 'чекати датчик' },
    { id: 'light_on', emoji: '💡', title: 'світло' },
    { id: 'motor_off', emoji: '🛑', title: 'стоп' }
  ];
  
  const [selectedParts, setSelectedParts] = useState([]);
  const [program, setProgram] = useState([]);
  const [logs, setLogs] = useState(['Обери деталі та склади програму.']);
  const [success, setSuccess] = useState(false);
  const { isShaking, shake, shakeAnimation } = useShake();

  function togglePart(id) {
    if (disabled || completed) return;
    setSelectedParts((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
    sound('click');
  }

  function addBlock(id) {
    if (disabled || completed) return;
    setProgram((p) => [...p, id]);
    sound('click');
  }

  function run() {
    const missing = requiredParts.filter((id) => !selectedParts.includes(id));
    if (missing.length) {
      shake();
      setLogs([`🚨 Не вистачає деталей: ${missing.join(', ')}`]);
      sound('fail');
      return;
    }
    const ok = requiredProgram.every((id, idx) => program[idx] === id);
    if (!ok) {
      shake();
      setLogs(['⚠️ Блоки стоять не в тому порядку.', `Підказка: ${requiredProgram.join(' → ')}`]);
      sound('fail');
      return;
    }
    setLogs(['🟢 SmartHub підключено', '⚙️ Мотор запущено', '📡 Датчик спрацював', '🎉 Робот працює правильно!']);
    setSuccess(true);
    sound('success');
    fireConfetti();
  }

  return (
    <motion.div animate={shakeAnimation} className="assemblyGame">
      <div className="labBench">
        <h3>{config.project || 'Робот-помічник'}</h3>
        <div className="partsGrid">
          {parts.map((p) => (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={p.id} 
              className={selectedParts.includes(p.id) ? 'part active' : 'part'} 
              onClick={() => togglePart(p.id)} 
              disabled={disabled || completed}
            >
              <span>{p.emoji}</span>
              <strong>{p.title}</strong>
              <small>{requiredParts.includes(p.id) ? 'потрібно' : 'бонус'}</small>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="programBench">
        <h3>Програма</h3>
        <div className="commandPalette">
          {blocks.map((b) => (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={b.id} 
              onClick={() => addBlock(b.id)} 
              disabled={disabled || completed}
            >
              {b.emoji}<span>{b.title}</span>
            </motion.button>
          ))}
        </div>

        <div className="programLine">
          <AnimatePresence>
            {program.map((id, i) => (
              <motion.button 
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                key={`${id}-${i}`} 
                onClick={() => setProgram((p) => p.filter((_, idx) => idx !== i))}
              >
                {blocks.find((b) => b.id === id)?.emoji || id}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <button className="primaryBtn" onClick={run} disabled={disabled || completed || !program.length}>
          <Play size={17} /> Тест робота
        </button>

        <div className="consoleLog">
          <AnimatePresence>
            {logs.map((l, i) => (
              <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i}>{l}</motion.p>
            ))}
          </AnimatePresence>
        </div>

        <button className="primaryBtn big" disabled={!success || disabled || completed} onClick={() => onComplete(level, config.points || 18)}>
          <CheckCircle2 size={20} /> Робот готовий
        </button>
      </div>
    </motion.div>
  );
}
