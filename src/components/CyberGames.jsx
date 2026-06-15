import { Keyboard } from 'lucide-react';
import { clamp } from '../lib/helpers';
import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { fireConfetti, ComboCounter, useShake } from './GameEffects';

// --- AITrainerGameTask (Swipe Mechanic) ---
export function AITrainerGameTask({ level, config, disabled, completed, onComplete, sound }) {
  const categories = config.categories || config.folders || [{ id: 'cat', title: 'Кіт' }, { id: 'dog', title: 'Собака' }];
  const cards = config.cards || config.samples || [];
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [done, setDone] = useState(false);
  const controls = useAnimation();
  const { isShaking, shake, shakeAnimation } = useShake();

  const handleDragEnd = async (e, info) => {
    if (disabled || completed || done) return;
    const card = cards[currentIdx];
    const threshold = 100;
    if (info.offset.x > threshold) {
      // Swiped Right
      processAnswer(categories[1]?.id);
    } else if (info.offset.x < -threshold) {
      // Swiped Left
      processAnswer(categories[0]?.id);
    } else {
      controls.start({ x: 0, y: 0 }); // snap back
    }
  };

  const processAnswer = (selectedCatId) => {
    const card = cards[currentIdx];
    const isCorrect = (card.category || card.target || card.label) === selectedCatId;
    if (isCorrect) {
      setCorrect(c => c + 1);
      setCombo(c => c + 1);
      sound('success');
    } else {
      setCombo(0);
      shake();
      sound('fail');
    }
    
    if (currentIdx + 1 >= cards.length) {
      setDone(true);
      if (isCorrect || correct > 0) fireConfetti();
    } else {
      setCurrentIdx(i => i + 1);
    }
  };

  const card = cards[currentIdx];

  return (
    <div className="aiTrainerGame">
      <div className="simHeader">
        <span>🤖</span>
        <div>
          <strong>Швидке навчання ШІ</strong>
          <small>Свайпай картку вліво або вправо, або натискай кнопки.</small>
        </div>
      </div>
      
      <ComboCounter count={combo} />
      
      <div className="swipeArena">
        <div className="swipeZone leftZone">
          <span>👈</span> {categories[0]?.title}
        </div>
        
        <div className="cardStack">
          {done ? (
            <div className="feedback ok">
              Навчання завершено! Точність: {correct}/{cards.length}
            </div>
          ) : (
            <AnimatePresence>
              <motion.div
                key={card?.id || currentIdx}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                animate={controls}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.2 } }}
                className="aiCard"
                whileTap={{ cursor: 'grabbing' }}
              >
                <span>{card?.emoji}</span>
                <strong>{card?.title}</strong>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
        
        <div className="swipeZone rightZone">
          {categories[1]?.title} <span>👉</span>
        </div>
      </div>

      {!done && (
        <div className="actionRow centered">
          <button className="secondaryBtn" onClick={() => processAnswer(categories[0]?.id)}>← {categories[0]?.title}</button>
          <button className="secondaryBtn" onClick={() => processAnswer(categories[1]?.id)}>{categories[1]?.title} →</button>
        </div>
      )}

      <button className="primaryBtn big" disabled={!done || disabled || completed} onClick={() => onComplete(level, correct * Number(config.pointsPerCard || 4))}>
        <CheckCircle2 size={20} /> Готово
      </button>
    </div>
  );
}

// --- BrowserHuntTask (Pop-ups & Chaos) ---
export function BrowserHuntTask({ level, config, disabled, completed, onComplete, sound }) {
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const cards = config.results || config.options || [];
  const { isShaking, shake, shakeAnimation } = useShake();
  
  // Popups state
  const [popups, setPopups] = useState([]);
  
  useEffect(() => {
    if (disabled || completed || feedback) return;
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setPopups(p => [...p, { id: Date.now(), x: Math.random() * 60 + 10, y: Math.random() * 60 + 10 }]);
        sound('click');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [disabled, completed, feedback, sound]);

  function pick(card) {
    if (disabled || completed || popups.length > 0) {
      if (popups.length > 0) shake();
      return;
    }
    setSelected(card.id || card.title);
    
    // In BrowserHuntTask, correct items usually don't have 'danger', while bad ones have 'danger: true'.
    // If it's a ChoiceTask config (has 'isCorrect' or 'correct'), use that instead.
    const ok = card.hasOwnProperty('isCorrect') ? card.isCorrect : card.hasOwnProperty('correct') ? card.correct : !card.danger;
    
    setFeedback(ok ? 'Так! Правильна дія.' : 'Не зовсім. Спробуй інший варіант.');
    sound(ok ? 'success' : 'fail');
    if (ok) fireConfetti();
    else shake();
  }
  
  const picked = cards.find((c) => (c.id || c.title) === selected); 
  const ok = picked ? (picked.hasOwnProperty('isCorrect') ? picked.isCorrect : picked.hasOwnProperty('correct') ? picked.correct : !picked.danger) : false;

  return (
    <motion.div animate={shakeAnimation} className="browserHuntGame" style={{ position: 'relative' }}>
      <AnimatePresence>
        {popups.map(p => (
          <motion.div 
            key={p.id}
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="annoyingPopup"
            style={{ left: `${p.x}%`, top: `${p.y}%`, position: 'absolute', zIndex: 100 }}
          >
            <div className="popupHeader">
              <span>⚠️ ВІРУС!</span>
              <button onClick={() => setPopups(curr => curr.filter(x => x.id !== p.id))}><X size={14}/></button>
            </div>
            <div className="popupBody">
              Ви виграли мільйон! Натисніть тут!
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="browserMock">
        <div className="browserTop">
          <span>←</span><span>→</span><span>{config.lockIcon || '🔒'}</span>
          <strong>{config.url || 'kids-search.local'}</strong>
        </div>
        <div className="searchBox">🔎 {config.query || config.search || 'пошук'}</div>
        <div className="searchResults">
          {cards.map((r, i) => (
            <motion.div 
              whileHover={{ scale: 1.02 }}
              key={i} 
              className={`searchResultItem ${r.danger || r.type === 'ad' ? 'dangerResult' : ''} ${selected === (r.id || r.title) ? (ok ? 'correct' : 'wrong') : ''}`}
              onClick={() => pick(r)}
            >
              <strong>{r.emoji || '🌐'} {r.title || r}</strong>
              {r.url && <small>{r.url}</small>}
              {r.note && <p>{r.note}</p>}
            </motion.div>
          ))}
        </div>
      </div>
      
      {feedback && <div className={ok ? 'feedback ok' : 'feedback bad'}>{feedback}</div>}
      {popups.length > 0 && !feedback && <div className="feedback bad">Закрий усі спливаючі вікна, щоб клікнути на результат!</div>}
      
      <button className="primaryBtn big" disabled={!ok || disabled || completed} onClick={() => onComplete(level, config.points || 10)}>
        <CheckCircle2 size={20} /> Завдання виконано
      </button>
    </motion.div>
  );
}

// --- DesktopDragTask (OS Simulation) ---
export function DesktopDragTask({ level, config, disabled, completed, onComplete, sound }) {
  const categories = config.categories || config.folders || [];
  const cards = config.cards || config.files || [];
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const { isShaking, shake, shakeAnimation } = useShake();

  const correct = cards.filter((c) => answers[c.id] === (c.category || c.target || c.label)).length;
  const done = cards.length > 0 && correct === cards.length;

  function place(cardId, categoryId) {
    if (disabled || completed) return;
    setAnswers((p) => ({ ...p, [cardId]: categoryId }));
    setSelected(null);
    sound('click');
    
    // Check if it's the last correct one
    const newCorrect = cards.filter((c) => (c.id === cardId ? categoryId : answers[c.id]) === (c.category || c.target || c.label)).length;
    if (newCorrect === cards.length) {
      fireConfetti();
      sound('success');
    }
  }

  function drop(e, categoryId) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) place(id, categoryId);
  }

  return (
    <div className="sortGame desktopOSMode">
      <div className="osTaskbar">
        <div className="osStartBtn">START</div>
        <div className="osTime">12:00 PM</div>
      </div>
      
      <div className="sortBoard osDesktop">
        <div className="fileDock">
          {cards.map((card) => (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={card.id} 
              draggable={!disabled && !completed} 
              onDragStart={(e) => e.dataTransfer.setData('text/plain', card.id)} 
              onClick={() => setSelected(card.id)} 
              className={`fileToken ${selected === card.id ? 'active' : ''} ${answers[card.id] ? 'placed' : ''}`} 
              disabled={disabled || completed || answers[card.id]}
            >
              <span className="fileIcon">{card.emoji}</span>
              <strong>{card.title}</strong>
            </motion.button>
          ))}
        </div>
        <div className="folderGrid">
          {categories.map((cat) => (
            <div 
              key={cat.id} 
              className="folderDrop osFolder" 
              onDragOver={(e) => e.preventDefault()} 
              onDrop={(e) => drop(e, cat.id)} 
              onClick={() => selected && place(selected, cat.id)}
            >
              <span>{cat.emoji}</span>
              <strong>{cat.title}</strong>
              <small>{cards.filter((c) => answers[c.id] === cat.id).length} файл.</small>
            </div>
          ))}
        </div>
      </div>
      
      <div className={done ? 'feedback ok' : 'feedback neutral'}>Розсортовано правильно: {correct}/{cards.length}</div>
      <button className="primaryBtn big" disabled={!done || disabled || completed} onClick={() => onComplete(level, correct * Number(config.pointsPerCard || 4))}>
        <CheckCircle2 size={20} /> Робочий стіл очищено
      </button>
    </div>
  );
}

// Reuse ChoiceTask for emails/chats
export function ChoiceTask({ level, config, disabled, completed, onComplete, sound }) {
  const [selected, setSelected] = useState(null); 
  const [feedback, setFeedback] = useState(null);
  const cards = config.cards || config.options || [];
  const { isShaking, shake, shakeAnimation } = useShake();

  function pick(card) {
    if (disabled || completed) return;
    setSelected(card.id || card.title);
    const ok = Boolean(card.isCorrect || card.correct);
    setFeedback(ok ? 'Так! Правильна дія.' : 'Не зовсім. Спробуй інший варіант.');
    sound(ok ? 'success' : 'fail');
    if (ok) fireConfetti();
    else shake();
  }
  
  const picked = cards.find((c) => (c.id || c.title) === selected); 
  const ok = Boolean(picked?.isCorrect || picked?.correct);
  
  return (
    <motion.div animate={shakeAnimation} className="choiceGame">
      <div className="choiceGrid">
        {cards.map((card) => (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            key={card.id || card.title} 
            className={`choiceCard ${selected === (card.id || card.title) ? (card.isCorrect || card.correct ? 'correct' : 'wrong') : ''}`} 
            onClick={() => pick(card)} 
            disabled={disabled || completed}
          >
            <span>{card.emoji || '✨'}</span>
            <strong>{card.title}</strong>
            {card.note && <small>{card.note}</small>}
          </motion.button>
        ))}
      </div>
      {feedback && <div className={ok ? 'feedback ok' : 'feedback bad'}>{feedback}</div>}
      <button className="primaryBtn big" disabled={!ok || disabled || completed} onClick={() => onComplete(level, config.points || 10)}>
        <CheckCircle2 size={20} /> Відповідь прийнято
      </button>
    </motion.div>
  );
}

export function EmailActionTask(props) {
  const { config } = props;
  return (
    <div className="emailActionGame">
      <div className="mailClientMock">
        <aside>
          <strong>📬 Пошта</strong>
          <span>Вхідні</span><span>Важливі</span><span>Спам</span>
        </aside>
        <section>
          <div className="mailSubject">{config.subject || 'Нове повідомлення'}</div>
          <div className="mailFrom">Від: {config.from || 'unknown@mail.test'}</div>
          <p>{config.message || 'Хтось просить натиснути посилання.'}</p>
          {config.attachment && <div className="attachmentPill">📎 {config.attachment}</div>}
        </section>
      </div>
      <ChoiceTask {...props} />
    </div>
  );
}

export function ChatActionTask(props) {
  const { config } = props;
  return (
    <div className="chatActionGame">
      <div className="phoneMock">
        <div className="phoneTop">💬 {config.chatTitle || 'Чат'}</div>
        <div className="phoneMessages">
          {(config.messages || []).map((msg, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.2 }}
              key={i} className={i % 2 ? 'bubble dangerBubble' : 'bubble'}
            >
              {msg}
            </motion.div>
          ))}
        </div>
      </div>
      <ChoiceTask {...props} />
    </div>
  );
}


export function PasswordBuilderTask({ level, config, disabled, completed, onComplete, sound }) {
  const [parts, setParts] = useState([]); const pool = config.parts || (config.chips || []).map((chip) => chip.text) || ['Robot', '42', '!', 'cat', '123', 'name'];
  const password = parts.join(''); const checks = [(password.length >= Number(config.minLength || 8)), /[A-ZА-Я]/.test(password), /\d/.test(password), /[^A-Za-zА-Яа-я0-9]/.test(password)]; const ok = checks.filter(Boolean).length >= Number(config.need || 3) && !(config.banned || []).some((b) => password.toLowerCase().includes(String(b).toLowerCase()));
  return <div className="passwordGame"><div className="passwordScreen"><span>🔐</span><strong>{password || 'Збери пароль'}</strong></div><div className="partsGrid small">{pool.map((p) => <button key={p} onClick={() => { setParts((prev) => [...prev, p]); sound('click'); }} disabled={disabled || completed}>{p}</button>)}</div><div className="checkList"><span className={checks[0] ? 'okText' : ''}>8+ символів</span><span className={checks[1] ? 'okText' : ''}>велика літера</span><span className={checks[2] ? 'okText' : ''}>цифра</span><span className={checks[3] ? 'okText' : ''}>символ</span></div><button className="secondaryBtn" onClick={() => setParts([])} disabled={disabled || completed}>Очистити</button><button className="primaryBtn big" disabled={!ok || disabled || completed} onClick={() => onComplete(level, config.points || 12)}><CheckCircle2 size={20} /> Пароль сильний</button></div>;
}

export function TypingGameTask({ level, config, disabled, completed, onComplete, sound }) {
  const [input, setInput] = useState('');
  const target = config.target || 'РОБОТ';
  const normalizedInput = input.trimEnd();
  const ok = normalizedInput === target;
  const typed = normalizedInput.split('');
  const mistakes = typed.filter((char, index) => char !== target[index]).length;
  const nextChar = target[typed.length] || 'фініш';
  const progress = clamp((typed.length / target.length) * 100, 0, 100);
  const accuracy = typed.length ? Math.max(0, Math.round(((typed.length - mistakes) / typed.length) * 100)) : 100;
  function handleChange(e) {
    setInput(e.target.value);
    sound(e.target.value.endsWith(target[e.target.value.length - 1] || '') ? 'click' : 'fail');
  }
  return <div className="typingGame keyboardTrainer"><div className="typingTarget"><span><Keyboard size={42} /></span><strong>{target}</strong><small>Клавіатурний тренажер: набери точно так само</small></div><div className="keyboardProgress"><div><i style={{ width: `${progress}%` }} /></div><span>{typed.length}/{target.length} символів · точність {accuracy}%</span></div><div className="typingPreview" aria-label="Прогрес набору">{target.split('').map((char, index) => <span key={`${char}-${index}`} className={typed[index] == null ? (index === typed.length ? 'next' : '') : typed[index] === char ? 'typedOk' : 'typedBad'}>{char === ' ' ? '␠' : char}</span>)}</div><div className="nextKey"><span>Наступна клавіша</span><strong>{nextChar === ' ' ? 'пробіл' : nextChar}</strong></div><input autoFocus value={input} onChange={handleChange} disabled={disabled || completed} placeholder="Пиши тут…" autoCapitalize="none" autoComplete="off" spellCheck="false" /><div className={ok ? 'feedback ok' : mistakes ? 'feedback bad' : 'feedback neutral'}>{ok ? 'Чудово! Усе набрано правильно.' : mistakes ? 'Є помилка в підсвіченому місці. Видали її й спробуй ще раз.' : 'Рухайся спокійно: точність важливіша за швидкість.'}</div><button className="primaryBtn big" disabled={!ok || disabled || completed} onClick={() => onComplete(level, config.points || 10)}><CheckCircle2 size={20} /> Готово</button></div>;
}

export function HardwareSortTask({ level, config, disabled, completed, onComplete, sound }) {
  const items = config.items || []; const [index, setIndex] = useState(0); const [score, setScore] = useState(0); const [done, setDone] = useState(false); const item = items[index];
  function answer(type) { if (!item || disabled || completed) return; const ok = item.type === type; sound(ok ? 'success' : 'fail'); const nextScore = score + (ok ? 1 : 0); setScore(nextScore); if (index + 1 >= items.length) setDone(true); else setIndex(index + 1); }
  return <div className="hardwareGame"><div className="hardwareCard"><span>{item?.emoji || '🏁'}</span><strong>{item?.title || 'Фініш'}</strong><small>{done ? `Рахунок: ${score}/${items.length}` : `Картка ${index + 1}/${items.length}`}</small></div><div className="actionRow centered"><button className="secondaryBtn" onClick={() => answer('hardware')} disabled={done || disabled || completed}>🔩 Пристрій</button><button className="secondaryBtn" onClick={() => answer('software')} disabled={done || disabled || completed}>💾 Програма</button></div>{done ? <button className="primaryBtn big" onClick={() => onComplete(level, Math.max(5, score * Number(config.pointsPerItem || 3)))} disabled={disabled || completed}><CheckCircle2 size={20} /> Тест завершено</button> : null}</div>;
}

export function QuizBattleTask({ level, config, disabled, completed, onComplete, sound }) {
  const questions = config.questions || []; const [idx, setIdx] = useState(0); const [score, setScore] = useState(0); const [answered, setAnswered] = useState(false); const q = questions[idx]; const finished = idx >= questions.length;
  function choose(option) { if (answered || disabled || completed) return; const ok = option.correct || option.isCorrect; if (ok) setScore((s) => s + 1); setAnswered(ok ? 'ok' : 'bad'); sound(ok ? 'success' : 'fail'); }
  function next() { setAnswered(false); setIdx((i) => i + 1); sound('click'); }
  if (finished) { const min = Number(config.minCorrect || Math.ceil(questions.length * 0.6)); const ok = score >= min; return <div className="quizGame"><div className="quizResult"><span>{ok ? '🏆' : '🔁'}</span><strong>{score}/{questions.length}</strong><p>{ok ? 'Тест пройдено!' : 'Треба ще потренуватись.'}</p></div><button className="primaryBtn big" disabled={!ok || disabled || completed} onClick={() => onComplete(level, score * Number(config.pointsPerQuestion || 4))}><CheckCircle2 size={20} /> Зарахувати тест</button><button className="secondaryBtn" onClick={() => { setIdx(0); setScore(0); setAnswered(false); }}>Ще раз</button></div>; }
  return <div className="quizGame"><div className="quizQuestion"><span>❓ {idx + 1}/{questions.length}</span><h3>{q.text}</h3></div><div className="choiceGrid">{(q.options || []).map((o, i) => <button key={i} className="choiceCard" onClick={() => choose(o)} disabled={answered || disabled || completed}><span>{o.emoji || '✨'}</span><strong>{o.title}</strong></button>)}</div>{answered ? <div className={answered === 'ok' ? 'feedback ok' : 'feedback bad'}>{answered === 'ok' ? 'Правильно!' : 'Ой, тут пастка.'}</div> : null}{answered ? <button className="primaryBtn" onClick={next}>Далі →</button> : null}</div>;
}
