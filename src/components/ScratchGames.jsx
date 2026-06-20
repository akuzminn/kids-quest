import React, { useState, useEffect } from 'react';
import { CheckCircle2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fireConfetti, useShake } from './GameEffects';

export function ScratchBlocksTask({ level, config, disabled, completed, onComplete, sound }) {
  const target = config.targetBlocks || ['event', 'move', 'win'];
  const palette = config.palette || [
    { id: 'event', emoji: '🏁', title: 'коли старт' },
    { id: 'move', emoji: '➡️', title: 'рух' },
    { id: 'touch', emoji: '⭐', title: 'торкнутись' },
    { id: 'win', emoji: '🏆', title: 'перемога' }
  ];
  
  const [program, setProgram] = useState([]);
  const [result, setResult] = useState(null);
  const { isShaking, shake, shakeAnimation } = useShake();

  function run() {
    const ok = target.length === program.length && target.every((id, i) => program[i] === id);
    setResult(ok);
    sound(ok ? 'success' : 'fail');
    if (ok) fireConfetti();
    else shake();
  }

  function addBlock(id) {
    if (disabled || completed) return;
    setProgram(p => [...p, id]);
    sound('click');
  }

  return (
    <motion.div animate={shakeAnimation} className="scratchBlocksGame">
      <div className="scratchStage">
        <div className="stageBg">
          {(config.stageItems || ['🐱', '🍎']).map((i, idx) => <span key={idx} className="stageSprite">{i}</span>)}
        </div>
        <div className="stageControls">
          <button onClick={run} disabled={!program.length} className="runStageBtn"><Play size={20} /></button>
        </div>
      </div>
      <div className="scratchWorkspace">
        <div className="taskInstruction" style={{ background: '#fff', padding: '16px', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <strong>📝 Завдання:</strong> Збери програму у правильній послідовності.
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: 'bold' }}>
              Почни з {palette.find((item) => item.id === target[0])?.title || 'події старту'}
            </span>
            <span style={{ color: '#94a3b8' }}>…</span>
            <span style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: 'bold' }}>
              Заверши блоком {palette.find((item) => item.id === target[target.length - 1])?.title || 'перемоги'}
            </span>
          </div>
        </div>
        <div className="blockPalette">
          {palette.map((b) => (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={b.id} 
              onClick={() => addBlock(b.id)} 
              disabled={disabled || completed}
            >
              <span>{b.emoji}</span> <strong>{b.title}</strong>
            </motion.button>
          ))}
        </div>
        
        <div className="scratchProgram">
          <AnimatePresence>
            {program.map((id, i) => {
              const b = palette.find(x => x.id === id);
              return (
                <motion.div 
                  initial={{ opacity: 0, y: -20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  layout
                  key={`${id}-${i}`} 
                  className="scratchBlock"
                  onClick={() => setProgram(p => p.filter((_, idx) => idx !== i))}
                >
                  <div className="blockNotch"></div>
                  <span>{b?.emoji}</span> {b?.title}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {program.length === 0 && <span className="emptyProgramHint">Перетягни сюди блоки</span>}
        </div>
        
        {result !== null && (
          <div className={result ? 'feedback ok' : 'feedback bad'}>
            {result ? 'Програма працює ідеально!' : 'Щось не так. Перевір послідовність блоків.'}
          </div>
        )}
        
        <button className="primaryBtn big" disabled={!result || disabled || completed} onClick={() => onComplete(level, config.points || 15)}>
          <CheckCircle2 size={20} /> Завдання виконано
        </button>
      </div>
    </motion.div>
  );
}

export function ScratchSceneTask({ level, config, disabled, completed, onComplete, sound }) {
  const required = config.required || ['hero', 'goal'];
  const items = config.items || [
    { id: 'hero', emoji: '🐱', title: 'герой' },
    { id: 'goal', emoji: '🏁', title: 'фініш' },
    { id: 'enemy', emoji: '👾', title: 'ворог' },
    { id: 'score', emoji: '⭐', title: 'рахунок' }
  ];
  
  const [selected, setSelected] = useState([]);
  const ok = required.every((id) => selected.includes(id));
  
  const [isPlaying, setIsPlaying] = useState(false);

  function toggle(id) {
    if (disabled || completed) return;
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
    sound('click');
  }
  
  function playScene() {
    setIsPlaying(true);
    sound(ok ? 'success' : 'fail');
    if (ok) fireConfetti();
    setTimeout(() => setIsPlaying(false), 2000);
  }

  return (
    <div className="scratchSceneGame">
      <div className="taskInstruction" style={{ background: '#fff', padding: '16px', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <strong>📝 Як пройти:</strong> Знайди всі елементи з позначкою <strong>«потрібно»</strong> та додай їх на сцену. Потім натисни зелену кнопку ▶️ Play на сцені.
      </div>
      <div className="scratchStage big">
        <div className="stageBg">
          <AnimatePresence>
            {items.filter((i) => selected.includes(i.id)).map((i, idx) => (
              <motion.span 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1, 
                  x: isPlaying && i.id === 'hero' ? [0, 50, 0] : 0,
                  rotate: isPlaying && i.id === 'hero' ? [0, 15, -15, 0] : 0 
                }}
                exit={{ scale: 0, opacity: 0 }}
                key={i.id}
                className="stageSprite"
                style={{ 
                  left: i.id === 'hero' ? '20%' : i.id === 'goal' ? '70%' : i.id === 'enemy' ? '45%' : '80%',
                  top: i.id === 'score' ? '10%' : '50%'
                }}
              >
                {i.emoji}
                {isPlaying && i.id === 'hero' && ok && <div className="speechBubble">Мяу!</div>}
              </motion.span>
            ))}
          </AnimatePresence>
          {!selected.length ? <em>Порожня сцена</em> : null}
        </div>
        <div className="stageControls">
          <button onClick={playScene} className="runStageBtn"><Play size={20} /></button>
        </div>
      </div>
      
      <div className="sceneItems">
        {items.map((i) => (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            key={i.id} 
            className={selected.includes(i.id) ? 'part active' : 'part'} 
            onClick={() => toggle(i.id)} 
            disabled={disabled || completed}
          >
            <span>{i.emoji}</span>
            <strong>{i.title}</strong>
            <small>{required.includes(i.id) ? 'потрібно' : 'бонус'}</small>
          </motion.button>
        ))}
      </div>
      
      <div className={ok ? 'feedback ok' : 'feedback neutral'}>
        {ok ? 'Сцена готова!' : 'Додай потрібні елементи сцени.'}
      </div>
      
      <button className="primaryBtn big" disabled={!ok || disabled || completed} onClick={() => onComplete(level, config.points || 12)}>
        <CheckCircle2 size={20} /> Сцену зібрано
      </button>
    </div>
  );
}
