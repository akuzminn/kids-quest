import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, CheckCircle2, Copy, Gamepad2, Keyboard, Lightbulb, Play, RefreshCw, RotateCcw, Sparkles, Users, Volume2, VolumeX } from 'lucide-react';
import {
  completeLevel,
  createRoom,
  fetchGames,
  fetchLevels,
  fetchTeamsByRoomCode,
  getRoomBundle,
  goToLevel,
  joinRoom,
  resetRoom,
  startRoom,
  subscribeToRoom,
} from './lib/api';
import { AVATARS, clamp, formatTimeLeft, getErrorMessage, normalizeRoomCode, shuffle } from './lib/helpers';
import { isSupabaseConfigured } from './lib/supabase';
import { playSound } from './lib/sound';
import './styles.css';

function App() {
  const [screen, setScreen] = useState('home');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [createdRoom, setCreatedRoom] = useState(null);
  const [studentSession, setStudentSession] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('kqh_sound') !== 'off');

  const sound = (type) => playSound(type, soundEnabled);
  const notify = (message, icon = '🎉') => {
    setToast({ message, icon });
    sound('success');
    window.setTimeout(() => setToast(null), 3600);
  };

  useEffect(() => localStorage.setItem('kqh_sound', soundEnabled ? 'on' : 'off'), [soundEnabled]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('role') === 'student' && params.get('room')) setScreen('join');
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchGames()
      .then((items) => mounted && setGames(items))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  function goHome() {
    setCreatedRoom(null);
    setStudentSession(null);
    setScreen('home');
  }

  return (
    <main>
      <Header onHome={goHome} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled((v) => !v)} />
      {error ? <Toast type="error" message={error} onClose={() => setError('')} /> : null}
      {toast ? <Toast type="success" message={toast.message} icon={toast.icon} onClose={() => setToast(null)} /> : null}
      {!isSupabaseConfigured ? <SetupBanner /> : null}

      {screen === 'home' && <HomeScreen games={games} loading={loading} onCreate={() => { sound('click'); setScreen('create'); }} onJoin={() => { sound('click'); setScreen('join'); }} />}
      {screen === 'create' && <CreateRoomScreen games={games} onBack={() => setScreen('home')} onCreated={(room) => { setCreatedRoom(room); notify('Кімнату створено!'); setScreen('teacher'); }} onError={setError} sound={sound} />}
      {screen === 'join' && <JoinRoomScreen onBack={() => setScreen('home')} onJoined={(session) => { setStudentSession(session); notify('Ти у грі!', '🚀'); setScreen('student'); }} onError={setError} sound={sound} />}
      {screen === 'teacher' && createdRoom && <TeacherView roomId={createdRoom.id} onExit={goHome} onError={setError} sound={sound} notify={notify} />}
      {screen === 'student' && studentSession && <StudentView session={studentSession} onExit={goHome} onError={setError} sound={sound} notify={notify} />}
    </main>
  );
}

function Header({ onHome, soundEnabled, onToggleSound }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onHome}>
        <span className="brandIcon">🎮</span>
        <span><strong>Kids Quest Hub</strong><small>RoboCity classroom platform</small></span>
      </button>
      <div className="topActions">
        <div className="pill">кімнати · рівні · тести · звуки · realtime</div>
        <button className="iconBtn" onClick={onToggleSound} title="Звук">{soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}</button>
      </div>
    </header>
  );
}

function SetupBanner() {
  return <section className="setupBanner"><AlertTriangle size={20} /><div><strong>Supabase ще не підключено.</strong><span> Інтерфейс відкриється, але кімнати й синхронізація запрацюють після .env.local.</span></div></section>;
}

function HomeScreen({ games, loading, onCreate, onJoin }) {
  return (
    <section className="heroGrid">
      <div className="heroCard glass">
        <div className="kicker">Платформа для занять 6–9 років</div>
        <h1>Ігрові місії для роботів, Scratch, комп’ютера та ШІ</h1>
        <p>Викладач створює кімнату, діти заходять по коду, проходять рівні, складають блоки, ремонтують роботів, чистять робочий стіл, ловлять фішинг і отримують бали команд.</p>
        <div className="actionRow">
          <button className="primaryBtn" onClick={onCreate} disabled={!isSupabaseConfigured}><Play size={18} /> Створити гру</button>
          <button className="secondaryBtn" onClick={onJoin} disabled={!isSupabaseConfigured}><Users size={18} /> Увійти дитині</button>
        </div>
      </div>
      <div className="mapCard">
        <div className="mapNode node1">🤖<span>RoboLab</span></div>
        <div className="mapNode node2">🧠<span>AI Lab</span></div>
        <div className="mapNode node3">🐱<span>Scratch Arcade</span></div>
        <div className="mapNode node4">🛡️<span>Cyber City</span></div>
        <div className="mapLine line1" /><div className="mapLine line2" /><div className="mapLine line3" />
      </div>
      <section className="wideSection">
        <div className="sectionTitle"><h2>Ігри в комплекті</h2><span>{loading ? 'Завантаження…' : `${games.length} гри`}</span></div>
        <div className="gameGrid">{games.map((game) => <GameCard key={game.id} game={game} />)}</div>
      </section>
    </section>
  );
}

function GameCard({ game, selected, onClick }) {
  return (
    <button className={`gameCard ${selected ? 'selected' : ''}`} onClick={onClick} type="button">
      <span className="gameEmoji">{game.cover_emoji || '🎮'}</span>
      <strong>{game.title}</strong>
      <small>{game.course?.emoji} {game.course?.title || 'Курс'}</small>
      <p>{game.description}</p>
      <span className="duration">≈ {game.duration_minutes || 60} хв · {game.level_count || 45} рівнів</span>
    </button>
  );
}

function CreateRoomScreen({ games, onBack, onCreated, onError, sound }) {
  const [selectedGameId, setSelectedGameId] = useState(games[0]?.id || '');
  const [teacherName, setTeacherName] = useState('Андрій');
  const [busy, setBusy] = useState(false);
  const [availableLevels, setAvailableLevels] = useState([]);
  const [levelLimit, setLevelLimit] = useState(15);
  const selectedGame = games.find((game) => game.id === selectedGameId);
  const maxLevels = availableLevels.length || selectedGame?.level_count || 45;
  const presets = [5, 10, 15, 20, 30, 45].filter((v) => v <= maxLevels);

  useEffect(() => { if (!selectedGameId && games[0]?.id) setSelectedGameId(games[0].id); }, [games, selectedGameId]);
  useEffect(() => {
    let mounted = true;
    if (!selectedGameId || !isSupabaseConfigured) return undefined;
    fetchLevels(selectedGameId).then((levels) => {
      if (!mounted) return;
      setAvailableLevels(levels);
      setLevelLimit((current) => clamp(current || 15, 1, levels.length || 45));
    }).catch((err) => onError(getErrorMessage(err)));
    return () => { mounted = false; };
  }, [selectedGameId, onError]);

  async function handleCreate() {
    if (!selectedGameId) return onError('Обери гру.');
    setBusy(true); sound('powerup');
    try { onCreated(await createRoom({ gameId: selectedGameId, teacherName, levelLimit: clamp(levelLimit, 1, maxLevels) })); }
    catch (err) { onError(getErrorMessage(err)); }
    finally { setBusy(false); }
  }

  return (
    <section className="panel">
      <div className="sectionTitle"><div><button className="linkBtn" onClick={onBack}>← Назад</button><h1>Створити кімнату</h1></div><Sparkles /></div>
      <label className="field"><span>Ім’я викладача</span><input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Викладач" /></label>
      <h2>Обери гру</h2>
      <div className="gameGrid compact">{games.map((game) => <GameCard key={game.id} game={game} selected={selectedGameId === game.id} onClick={() => { sound('click'); setSelectedGameId(game.id); }} />)}</div>
      <section className="levelSettings">
        <div><h2>Скільки рівнів запустити?</h2><p>Для швидкого тесту 5–10, для повноцінного заняття 15–30, для великої гри — усі рівні.</p></div>
        <div className="levelLimitBox"><strong>{levelLimit}</strong><span>з {maxLevels}</span></div>
        <input type="range" min="1" max={maxLevels} value={levelLimit} onChange={(e) => setLevelLimit(Number(e.target.value))} />
        <div className="presetRow">{presets.map((v) => <button key={v} type="button" className={levelLimit === v ? 'preset active' : 'preset'} onClick={() => setLevelLimit(v)}>{v} рівнів</button>)}<button type="button" className={levelLimit === maxLevels ? 'preset active' : 'preset'} onClick={() => setLevelLimit(maxLevels)}>Усі</button></div>
      </section>
      <button className="primaryBtn big" onClick={handleCreate} disabled={busy || !isSupabaseConfigured}>{busy ? 'Створюю…' : 'Створити кімнату'}</button>
    </section>
  );
}

function JoinRoomScreen({ onBack, onJoined, onError, sound }) {
  const params = new URLSearchParams(window.location.search);
  const [code, setCode] = useState(params.get('room') || '');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [room, setRoom] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleFindRoom() {
    setBusy(true); sound('click');
    try { const result = await fetchTeamsByRoomCode(code); setRoom(result.room); setTeams(result.teams); setTeamId(result.teams[0]?.id || ''); }
    catch (err) { onError(getErrorMessage(err)); }
    finally { setBusy(false); }
  }
  async function handleJoin() {
    if (!room) return onError('Спочатку знайди кімнату.');
    setBusy(true); sound('powerup');
    try { onJoined(await joinRoom({ code: room.code, name, avatar, teamId })); }
    catch (err) { onError(getErrorMessage(err)); }
    finally { setBusy(false); }
  }

  return (
    <section className="panel narrow">
      <button className="linkBtn" onClick={onBack}>← Назад</button><h1>Увійти дитині</h1>
      <label className="field"><span>Код кімнати</span><input className="codeInput" value={code} onChange={(e) => setCode(normalizeRoomCode(e.target.value))} placeholder="ABCD-234" /></label>
      <button className="secondaryBtn full" onClick={handleFindRoom} disabled={busy || !isSupabaseConfigured}>{busy ? 'Шукаю…' : 'Знайти кімнату'}</button>
      {room ? <div className="joinBox">
        <div className="roomFound"><span>{room.game?.cover_emoji}</span><div><strong>{room.game?.title}</strong><small>Кімната {room.code}</small></div></div>
        <label className="field"><span>Ім’я</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Наприклад: Марко" /></label>
        <div className="field"><span>Аватар</span><div className="avatarGrid">{AVATARS.map((item) => <button key={item} className={avatar === item ? 'avatar active' : 'avatar'} onClick={() => { sound('click'); setAvatar(item); }} type="button">{item}</button>)}</div></div>
        <div className="field"><span>Команда</span><div className="teamGrid">{teams.map((team) => <button key={team.id} className={teamId === team.id ? 'team active' : 'team'} onClick={() => { sound('click'); setTeamId(team.id); }} type="button">{team.emoji} {team.name}</button>)}</div></div>
        <button className="primaryBtn big" onClick={handleJoin} disabled={busy}>Увійти в гру</button>
      </div> : null}
    </section>
  );
}

function TeacherView({ roomId, onExit, onError, sound, notify }) {
  const [bundle, setBundle] = useState(null);
  const [busy, setBusy] = useState(false);
  const [timeLabel, setTimeLabel] = useState('—');
  const load = async () => { try { setBundle(await getRoomBundle(roomId)); } catch (err) { onError(getErrorMessage(err)); } };
  useEffect(() => { load(); const unsub = subscribeToRoom(roomId, load); return unsub; }, [roomId]);
  useEffect(() => { const t = window.setInterval(() => setTimeLabel(formatTimeLeft(bundle?.room?.timer_ends_at)), 500); return () => window.clearInterval(t); }, [bundle?.room?.timer_ends_at]);
  if (!bundle) return <LoadingPanel text="Завантажую кімнату…" />;
  const { room, levels, players, teams, events } = bundle;
  const currentLevel = levels.find((l) => Number(l.order_index) === Number(room.current_level));
  const completedNow = currentLevel ? players.filter((p) => Number(p.current_level || 0) >= Number(currentLevel.order_index)).length : 0;
  const joinLink = `${window.location.origin}${window.location.pathname}?role=student&room=${room.code}`;
  async function runAction(action) { setBusy(true); try { await action(); await load(); } catch (err) { onError(getErrorMessage(err)); } finally { setBusy(false); } }
  function copyJoinLink() { navigator.clipboard?.writeText(joinLink); notify('Лінк скопійовано', '📋'); }
  function handleReset() { const pin = window.prompt('PIN викладача для скидання прогресу:'); const expected = import.meta.env.VITE_TEACHER_PIN || '1234'; if (pin !== expected) return onError('Неправильний PIN.'); runAction(() => resetRoom(room)); }

  return (
    <section className="teacherLayout">
      <aside className="controlPanel glass">
        <button className="linkBtn" onClick={onExit}>← Вийти</button>
        <div className="roomCodeBox"><span>Код кімнати</span><strong>{room.code}</strong><button className="miniBtn" onClick={copyJoinLink}><Copy size={15} /> Лінк</button></div>
        <div className="statusBox"><span>Статус</span><strong>{room.status === 'waiting' ? 'Очікування' : room.status === 'running' ? 'Гра триває' : 'Завершено'}</strong></div>
        <div className="timerBox"><span>Таймер рівня</span><strong>{timeLabel}</strong></div>
        <div className="actionStack">{room.status === 'waiting' ? <button className="primaryBtn" disabled={busy || !players.length} onClick={() => { sound('level'); runAction(() => startRoom(room, levels)); }}><Play size={18} /> Почати</button> : <button className="primaryBtn" disabled={busy || room.status === 'finished'} onClick={() => { sound('level'); runAction(() => goToLevel(room, levels, Number(room.current_level) + 1)); }}>Наступний рівень →</button>}<button className="dangerBtn" disabled={busy} onClick={handleReset}><RotateCcw size={16} /> Скинути</button></div>
      </aside>
      <div className="teacherMain">
        <div className="sectionTitle"><div><div className="kicker">{room.game?.course?.emoji} {room.game?.course?.title}</div><h1>{room.game?.cover_emoji} {room.game?.title}</h1></div><div className="counter">{players.length} учнів</div></div>
        <div className="dashboardGrid"><Scoreboard teams={teams} players={players} /><CurrentMission room={room} level={currentLevel} total={levels.length} completed={completedNow} players={players.length} /></div>
        <section className="cardBlock"><h2>Учні</h2><div className="playerGrid">{players.map((p) => <div key={p.id} className="playerCard"><span className="playerAvatar">{p.avatar}</span><strong>{p.name}</strong><small>{p.team?.emoji} {p.team?.name || 'Без команди'}</small><b>{p.score} балів</b>{room.current_level > 0 && Number(p.current_level || 0) >= Number(room.current_level || 0) ? <span className="doneBadge">готово</span> : null}</div>)}</div></section>
        <section className="cardBlock"><h2>Події</h2><div className="eventList">{events.map((e) => <div key={e.id} className="eventItem"><span>{eventIcon(e.type)}</span><p>{eventText(e)}</p><small>{new Date(e.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</small></div>)}</div></section>
      </div>
    </section>
  );
}

function StudentView({ session, onExit, onError, sound, notify }) {
  const [bundle, setBundle] = useState(null);
  const [player, setPlayer] = useState(session.player);
  const [busy, setBusy] = useState(false);
  const load = async () => { try { const data = await getRoomBundle(session.room.id); setBundle(data); const fresh = data.players.find((p) => p.id === session.player.id); if (fresh) setPlayer(fresh); } catch (err) { onError(getErrorMessage(err)); } };
  useEffect(() => { load(); const unsub = subscribeToRoom(session.room.id, load); return unsub; }, [session.room.id]);
  if (!bundle) return <LoadingPanel text="Підключаюся до гри…" />;
  const { room, levels } = bundle;
  const currentLevel = levels.find((l) => Number(l.order_index) === Number(room.current_level));
  const completedCurrent = currentLevel && Number(player.current_level || 0) >= Number(currentLevel.order_index || 0);
  async function handleComplete(level, points) { setBusy(true); try { const result = await completeLevel({ room, player, level, points }); if (result.alreadyCompleted) onError('Цей рівень уже зараховано.'); else { sound('win'); notify(`+${points || level.config_json?.points || 10} балів`, '⭐'); } await load(); } catch (err) { onError(getErrorMessage(err)); } finally { setBusy(false); } }

  return (
    <section className="studentLayout">
      <div className="studentTop"><button className="linkBtn" onClick={onExit}>← Вийти</button><div className="studentBadge"><span>{player.avatar}</span><div><strong>{player.name}</strong><small>{player.team?.emoji} {player.team?.name || 'Команда'} · {player.score} балів</small></div></div></div>
      {room.status === 'waiting' ? <WaitingScreen game={room.game} /> : room.status === 'finished' ? <FinishedScreen player={player} /> : currentLevel ? <GameTask level={currentLevel} disabled={busy || completedCurrent} completed={completedCurrent} onComplete={handleComplete} sound={sound} /> : <WaitingScreen game={room.game} />}
    </section>
  );
}

function GameTask({ level, disabled, completed, onComplete, sound }) {
  const config = level.config_json || {};
  const mode = config.mode || level.type;
  const taskProps = { level, config, disabled, completed, onComplete, sound };
  return (
    <section className={`gameTask mode-${mode || 'default'}`}>
      <div className="levelHeader"><span className="gameEmoji">{config.hero || levelIcon(mode)}</span><div><span className="levelPill">Рівень {level.order_index}</span><h1>{level.title}</h1><p>{config.instruction || 'Виконай місію.'}</p></div></div>
      <StudentHint mode={mode} config={config} />
      {mode === 'robotRoute' ? <RobotRouteTask {...taskProps} />
        : mode === 'robotAssembly' ? <RobotAssemblyTask {...taskProps} />
        : mode === 'desktopDrag' ? <DesktopDragTask {...taskProps} />
        : mode === 'browserHunt' ? <BrowserHuntTask {...taskProps} />
        : mode === 'emailAction' ? <EmailActionTask {...taskProps} />
        : mode === 'chatAction' ? <ChatActionTask {...taskProps} />
        : mode === 'aiTrainerGame' ? <AITrainerGameTask {...taskProps} />
        : mode === 'passwordBuilder' ? <PasswordBuilderTask {...taskProps} />
        : (mode === 'typingGame' || mode === 'keyboardTrainer') ? <TypingGameTask {...taskProps} />
        : mode === 'hardwareSort' ? <HardwareSortTask {...taskProps} />
        : mode === 'quizBattle' ? <QuizBattleTask {...taskProps} />
        : mode === 'scratchBlocks' ? <ScratchBlocksTask {...taskProps} />
        : mode === 'scratchScene' ? <ScratchSceneTask {...taskProps} />
        : level.type === 'sort' ? <SortTask {...taskProps} />
        : <ChoiceTask {...taskProps} />}
      {completed ? <SuccessBox text="Рівень зараховано! Чекай наступну місію від викладача." /> : null}
    </section>
  );
}

function RobotRouteTask({ level, config, disabled, completed, onComplete, sound }) {
  const grid = config.grid || {};
  const rows = Number(grid.rows || 5); const cols = Number(grid.cols || 6);
  const [commands, setCommands] = useState([]); const [result, setResult] = useState(null);
  const maxCommands = Number(config.maxCommands || 12);
  const palette = config.commands || [{ id: 'forward', emoji: '⬆️', title: 'вперед' }, { id: 'left', emoji: '↩️', title: 'ліворуч' }, { id: 'right', emoji: '↪️', title: 'праворуч' }, { id: 'pickup', emoji: '🦾', title: 'взяти' }, { id: 'repair', emoji: '🔧', title: 'ремонт' }];
  const final = (result?.steps || [{ pos: grid.start || [0, 0], dir: grid.dir || 'E' }]).at(-1);
  const currentPos = final?.pos || grid.start || [0, 0];
  function add(id) { if (disabled || completed || commands.length >= maxCommands) return; setCommands((p) => [...p, id]); setResult(null); sound('click'); }
  function run() { const next = simulateRobot(config, commands); setResult(next); sound(next.success ? 'success' : 'fail'); }
  return <div className="robotRouteGame"><div className="missionIntro"><div className="robotPortrait"><span>{config.robotIcon || '🤖'}</span><strong>{config.robotName || 'Robo'}</strong><small>{config.kit || 'WeDo 2.0 / Spike Prime'}</small></div><div><h3>{config.storyTitle || 'Місія робота'}</h3><p>{config.story || 'Склади маршрут, запусти симуляцію, потім повтори на реальному полі.'}</p><div className="objectiveChips">{(config.objectives || ['дійти до фінішу']).map((o) => <span key={o}>🎯 {o}</span>)}</div></div></div><div className="robotArenaWrap"><div className="robotGrid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>{Array.from({ length: rows * cols }).map((_, i) => { const pos = [Math.floor(i / cols), i % cols]; const key = posKey(pos); const obstacle = (grid.obstacles || []).some((p) => posKey(p) === key); const item = (grid.items || []).find((x) => posKey(x.pos) === key); const repair = (grid.repairs || []).find((x) => posKey(x.pos) === key); const isGoal = posKey(grid.goal || []) === key; const isRobot = posKey(currentPos) === key; return <div key={key} className={`gridCell ${obstacle ? 'wall' : ''} ${isGoal ? 'goal' : ''}`}>{isRobot ? <span className={`robotBot dir-${final?.dir || grid.dir || 'E'}`}>🤖</span> : obstacle ? '🪨' : item ? item.emoji || '📦' : repair ? repair.emoji || '🔧' : isGoal ? '🏁' : ''}</div>; })}</div><div className="commandPanel"><h3>Команди <small>{commands.length}/{maxCommands}</small></h3><div className="commandPalette">{palette.map((c) => <button key={c.id} onClick={() => add(c.id)} disabled={disabled || completed}>{c.emoji}<span>{c.title}</span></button>)}</div><div className="programLine">{commands.map((cmd, i) => <button key={`${cmd}-${i}`} onClick={() => setCommands((p) => p.filter((_, idx) => idx !== i))}>{palette.find((x) => x.id === cmd)?.emoji || cmd}</button>)}</div><div className="actionRow"><button className="secondaryBtn" onClick={() => { setCommands([]); setResult(null); }} disabled={disabled || completed}><RefreshCw size={17} /> Очистити</button><button className="primaryBtn" onClick={run} disabled={disabled || completed || !commands.length}><Play size={17} /> Запуск</button></div>{result ? <div className={result.success ? 'feedback ok' : 'feedback bad'}>{result.message}</div> : null}<button className="primaryBtn big" disabled={!result?.success || disabled || completed} onClick={() => onComplete(level, config.points || 15)}><CheckCircle2 size={20} /> Місію виконано</button></div></div></div>;
}

function RobotAssemblyTask({ level, config, disabled, completed, onComplete, sound }) {
  const requiredParts = config.requiredParts || ['hub', 'motor'];
  const requiredProgram = config.requiredProgram || ['start', 'motor_on', 'wait', 'motor_off'];
  const parts = config.parts || [{ id: 'hub', emoji: '🧠', title: 'SmartHub' }, { id: 'motor', emoji: '⚙️', title: 'Мотор' }, { id: 'sensor', emoji: '📡', title: 'Датчик' }, { id: 'light', emoji: '💡', title: 'Світло' }, { id: 'wheel', emoji: '🛞', title: 'Колесо' }];
  const blocks = config.blocks || [{ id: 'start', emoji: '▶️', title: 'старт' }, { id: 'motor_on', emoji: '⚙️', title: 'мотор' }, { id: 'wait', emoji: '⏳', title: 'чекати датчик' }, { id: 'light_on', emoji: '💡', title: 'світло' }, { id: 'motor_off', emoji: '🛑', title: 'стоп' }];
  const [selectedParts, setSelectedParts] = useState([]); const [program, setProgram] = useState([]); const [logs, setLogs] = useState(['Обери деталі та склади програму.']); const [success, setSuccess] = useState(false);
  function togglePart(id) { if (disabled || completed) return; setSelectedParts((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]); sound('click'); }
  function addBlock(id) { if (disabled || completed) return; setProgram((p) => [...p, id]); sound('click'); }
  function run() { const missing = requiredParts.filter((id) => !selectedParts.includes(id)); if (missing.length) { setLogs([`🚨 Не вистачає деталей: ${missing.join(', ')}`]); sound('fail'); return; } const ok = requiredProgram.every((id, idx) => program[idx] === id); if (!ok) { setLogs(['⚠️ Блоки стоять не в тому порядку.', `Підказка: ${requiredProgram.join(' → ')}`]); sound('fail'); return; } setLogs(['🟢 SmartHub підключено', '⚙️ Мотор запущено', '📡 Датчик спрацював', '🎉 Робот працює правильно!']); setSuccess(true); sound('success'); }
  return <div className="assemblyGame"><div className="labBench"><h3>{config.project || 'Робот-помічник'}</h3><div className="partsGrid">{parts.map((p) => <button key={p.id} className={selectedParts.includes(p.id) ? 'part active' : 'part'} onClick={() => togglePart(p.id)} disabled={disabled || completed}><span>{p.emoji}</span><strong>{p.title}</strong><small>{requiredParts.includes(p.id) ? 'потрібно' : 'бонус'}</small></button>)}</div></div><div className="programBench"><h3>Програма</h3><div className="commandPalette">{blocks.map((b) => <button key={b.id} onClick={() => addBlock(b.id)} disabled={disabled || completed}>{b.emoji}<span>{b.title}</span></button>)}</div><div className="programLine">{program.map((id, i) => <button key={`${id}-${i}`} onClick={() => setProgram((p) => p.filter((_, idx) => idx !== i))}>{blocks.find((b) => b.id === id)?.emoji || id}</button>)}</div><button className="primaryBtn" onClick={run} disabled={disabled || completed || !program.length}><Play size={17} /> Тест робота</button><div className="consoleLog">{logs.map((l, i) => <p key={i}>{l}</p>)}</div><button className="primaryBtn big" disabled={!success || disabled || completed} onClick={() => onComplete(level, config.points || 18)}><CheckCircle2 size={20} /> Робот готовий</button></div></div>;
}

function DesktopDragTask(props) { return <SortTask {...props} visual="desktop" />; }
function AITrainerGameTask(props) { return <SortTask {...props} visual="ai" />; }

function SortTask({ level, config, disabled, completed, onComplete, sound, visual }) {
  const categories = config.categories || config.folders || [];
  const cards = config.cards || config.files || config.samples || [];
  const [answers, setAnswers] = useState({}); const [selected, setSelected] = useState(null);
  const correct = cards.filter((c) => answers[c.id] === (c.category || c.target || c.label)).length;
  const done = cards.length > 0 && correct === cards.length;
  function place(cardId, categoryId) { if (disabled || completed) return; setAnswers((p) => ({ ...p, [cardId]: categoryId })); setSelected(null); sound?.('click'); }
  function drop(e, categoryId) { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) place(id, categoryId); }
  return <div className={`sortGame ${visual || config.mode || ''}`}><div className="simHeader"><span>{visual === 'ai' || config.mode?.includes('ai') ? '🤖' : '🖥️'}</span><div><strong>{config.windowTitle || config.labTitle || 'Міні-симулятор'}</strong><small>{config.labText || 'Перетягни картки у правильні зони.'}</small></div></div><div className="sortBoard"><div className="fileDock">{cards.map((card) => <button key={card.id} draggable={!disabled && !completed} onDragStart={(e) => e.dataTransfer.setData('text/plain', card.id)} onClick={() => setSelected(card.id)} className={`fileToken ${selected === card.id ? 'active' : ''} ${answers[card.id] ? 'placed' : ''}`} disabled={disabled || completed}><span>{card.emoji}</span><strong>{card.title}</strong><small>{answers[card.id] ? 'переміщено' : 'перетягни / натисни'}</small></button>)}</div><div className="folderGrid">{categories.map((cat) => <button key={cat.id} className="folderDrop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(e, cat.id)} onClick={() => selected && place(selected, cat.id)} disabled={disabled || completed}><span>{cat.emoji}</span><strong>{cat.title}</strong><small>{cards.filter((c) => answers[c.id] === cat.id).length} карт.</small></button>)}</div></div><div className={done ? 'feedback ok' : 'feedback neutral'}>Правильно: {correct}/{cards.length}</div><button className="primaryBtn big" disabled={!done || disabled || completed} onClick={() => onComplete(level, correct * Number(config.pointsPerCard || config.pointsPerFile || 4))}><CheckCircle2 size={20} /> Готово</button></div>;
}

function BrowserHuntTask(props) { const { config } = props; return <div className="browserHuntGame"><div className="browserMock"><div className="browserTop"><span>←</span><span>→</span><span>{config.lockIcon || '🔒'}</span><strong>{config.url || 'kids-search.local'}</strong></div><div className="searchBox">🔎 {config.query || config.search || 'пошук'}</div><div className="searchResults">{(config.results || []).map((r, i) => <div key={i} className={r.danger || r.type === 'ad' ? 'dangerResult' : ''}><strong>{r.emoji || '🌐'} {r.title || r}</strong>{r.url ? <small>{r.url}</small> : null}{r.note ? <p>{r.note}</p> : null}</div>)}</div></div><ChoiceTask {...props} /></div>; }
function EmailActionTask(props) { const { config } = props; return <div className="emailActionGame"><div className="mailClientMock"><aside><strong>📬 Пошта</strong><span>Вхідні</span><span>Важливі</span><span>Спам</span></aside><section><div className="mailSubject">{config.subject || 'Нове повідомлення'}</div><div className="mailFrom">Від: {config.from || 'unknown@mail.test'}</div><p>{config.message || 'Хтось просить натиснути посилання.'}</p>{config.attachment ? <div className="attachmentPill">📎 {config.attachment}</div> : null}</section></div><ChoiceTask {...props} /></div>; }
function ChatActionTask(props) { const { config } = props; return <div className="chatActionGame"><div className="phoneMock"><div className="phoneTop">💬 {config.chatTitle || 'Чат'}</div><div className="phoneMessages">{(config.messages || []).map((msg, i) => <div key={i} className={i % 2 ? 'bubble dangerBubble' : 'bubble'}>{msg}</div>)}</div></div><ChoiceTask {...props} /></div>; }

function ChoiceTask({ level, config, disabled, completed, onComplete, sound }) {
  const [selected, setSelected] = useState(null); const [feedback, setFeedback] = useState(null);
  const cards = config.cards || config.options || [];
  function pick(card) { if (disabled || completed) return; setSelected(card.id || card.title); const ok = Boolean(card.isCorrect || card.correct); setFeedback(ok ? 'Так! Правильна дія.' : 'Не зовсім. Спробуй інший варіант.'); sound(ok ? 'success' : 'fail'); }
  const picked = cards.find((c) => (c.id || c.title) === selected); const ok = Boolean(picked?.isCorrect || picked?.correct);
  return <div className="choiceGame"><div className="choiceGrid">{cards.map((card) => <button key={card.id || card.title} className={`choiceCard ${selected === (card.id || card.title) ? (card.isCorrect || card.correct ? 'correct' : 'wrong') : ''}`} onClick={() => pick(card)} disabled={disabled || completed}><span>{card.emoji || '✨'}</span><strong>{card.title}</strong>{card.note ? <small>{card.note}</small> : null}</button>)}</div>{feedback ? <div className={ok ? 'feedback ok' : 'feedback bad'}>{feedback}</div> : null}<button className="primaryBtn big" disabled={!ok || disabled || completed} onClick={() => onComplete(level, config.points || 10)}><CheckCircle2 size={20} /> Відповідь прийнято</button></div>;
}

function StudentHint({ mode, config }) {
  const [open, setOpen] = useState(false);
  const hint = config.studentHint || config.hint || getStudentHint(mode, config);
  if (!hint) return null;
  return (
    <div className="studentHintBox">
      <button type="button" className="hintToggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Lightbulb size={18} /> {open ? 'Сховати підказку' : 'Потрібна підказка?'}
      </button>
      {open ? <p>{hint}</p> : null}
    </div>
  );
}

function getStudentHint(mode, config) {
  const hints = {
    robotRoute: 'Спершу проведи шлях очима: де треба повернути, де взяти предмет або зробити ремонт, і тільки потім натискай “Запуск”.',
    robotAssembly: 'Подивись на деталі з позначкою “потрібно”, а програму збирай як маленьку історію: старт, дія, очікування, стоп.',
    desktopDrag: 'Знайди слово-підказку в назві картки: файл, фото, програма або папка часто самі підказують, куди їх покласти.',
    browserHunt: 'Перевір адресу, замочок, дивні обіцянки й рекламу. Безпечний варіант зазвичай виглядає спокійно і зрозуміло.',
    emailAction: 'Не поспішай натискати. Подивись, хто написав, що просить зробити і чи немає підозрілого файла або посилання.',
    chatAction: 'Якщо повідомлення просить пароль, адресу, код або перейти за дивним посиланням, це майже напевно пастка.',
    aiTrainerGame: 'Порівняй приклад із назвами зон: що це за дані, що має навчитися робити ШІ, і де тут правильна пара.',
    passwordBuilder: 'Сильний пароль любить різні символи: велику літеру, цифру, знак і довжину. Не бери слово, яке заборонене в завданні.',
    typingGame: 'Друкуй повільно, але точно. Дивись на наступний підсвічений символ і виправляй помилки одразу.',
    keyboardTrainer: 'Тримай очі на рядку завдання: наступна клавіша підсвічена, а точність важливіша за швидкість.',
    hardwareSort: 'Запитай себе: це можна потримати в руках як пристрій, чи це програма всередині комп’ютера?',
    quizBattle: 'Перед відповіддю відкинь два найсмішніші або найнебезпечніші варіанти. Часто правильний лишається сам.',
    scratchBlocks: 'Починай зі стартової події, потім додай дію персонажа, умову або рахунок, і лише після цього фініш.',
    scratchScene: 'Для сцени гри майже завжди потрібні герой, ціль або фініш, і щось для рахунку чи правила перемоги.',
  };
  if ((config.categories || config.folders)?.length) return hints.desktopDrag;
  return hints[mode] || 'Розбий завдання на маленькі кроки й перевір кожен крок перед кнопкою “Готово”.';
}

function PasswordBuilderTask({ level, config, disabled, completed, onComplete, sound }) {
  const [parts, setParts] = useState([]); const pool = config.parts || ['Robot', '42', '!', 'cat', '123', 'name'];
  const password = parts.join(''); const checks = [(password.length >= Number(config.minLength || 8)), /[A-ZА-Я]/.test(password), /\d/.test(password), /[^A-Za-zА-Яа-я0-9]/.test(password)]; const ok = checks.filter(Boolean).length >= Number(config.need || 3) && !(config.banned || []).some((b) => password.toLowerCase().includes(String(b).toLowerCase()));
  return <div className="passwordGame"><div className="passwordScreen"><span>🔐</span><strong>{password || 'Збери пароль'}</strong></div><div className="partsGrid small">{pool.map((p) => <button key={p} onClick={() => { setParts((prev) => [...prev, p]); sound('click'); }} disabled={disabled || completed}>{p}</button>)}</div><div className="checkList"><span className={checks[0] ? 'okText' : ''}>8+ символів</span><span className={checks[1] ? 'okText' : ''}>велика літера</span><span className={checks[2] ? 'okText' : ''}>цифра</span><span className={checks[3] ? 'okText' : ''}>символ</span></div><button className="secondaryBtn" onClick={() => setParts([])} disabled={disabled || completed}>Очистити</button><button className="primaryBtn big" disabled={!ok || disabled || completed} onClick={() => onComplete(level, config.points || 12)}><CheckCircle2 size={20} /> Пароль сильний</button></div>;
}

function TypingGameTask({ level, config, disabled, completed, onComplete, sound }) {
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

function HardwareSortTask({ level, config, disabled, completed, onComplete, sound }) {
  const items = config.items || []; const [index, setIndex] = useState(0); const [score, setScore] = useState(0); const [done, setDone] = useState(false); const item = items[index];
  function answer(type) { if (!item || disabled || completed) return; const ok = item.type === type; sound(ok ? 'success' : 'fail'); const nextScore = score + (ok ? 1 : 0); setScore(nextScore); if (index + 1 >= items.length) setDone(true); else setIndex(index + 1); }
  return <div className="hardwareGame"><div className="hardwareCard"><span>{item?.emoji || '🏁'}</span><strong>{item?.title || 'Фініш'}</strong><small>{done ? `Рахунок: ${score}/${items.length}` : `Картка ${index + 1}/${items.length}`}</small></div><div className="actionRow centered"><button className="secondaryBtn" onClick={() => answer('hardware')} disabled={done || disabled || completed}>🔩 Пристрій</button><button className="secondaryBtn" onClick={() => answer('software')} disabled={done || disabled || completed}>💾 Програма</button></div>{done ? <button className="primaryBtn big" onClick={() => onComplete(level, Math.max(5, score * Number(config.pointsPerItem || 3)))} disabled={disabled || completed}><CheckCircle2 size={20} /> Тест завершено</button> : null}</div>;
}

function QuizBattleTask({ level, config, disabled, completed, onComplete, sound }) {
  const questions = config.questions || []; const [idx, setIdx] = useState(0); const [score, setScore] = useState(0); const [answered, setAnswered] = useState(false); const q = questions[idx]; const finished = idx >= questions.length;
  function choose(option) { if (answered || disabled || completed) return; const ok = option.correct || option.isCorrect; if (ok) setScore((s) => s + 1); setAnswered(ok ? 'ok' : 'bad'); sound(ok ? 'success' : 'fail'); }
  function next() { setAnswered(false); setIdx((i) => i + 1); sound('click'); }
  if (finished) { const min = Number(config.minCorrect || Math.ceil(questions.length * 0.6)); const ok = score >= min; return <div className="quizGame"><div className="quizResult"><span>{ok ? '🏆' : '🔁'}</span><strong>{score}/{questions.length}</strong><p>{ok ? 'Тест пройдено!' : 'Треба ще потренуватись.'}</p></div><button className="primaryBtn big" disabled={!ok || disabled || completed} onClick={() => onComplete(level, score * Number(config.pointsPerQuestion || 4))}><CheckCircle2 size={20} /> Зарахувати тест</button><button className="secondaryBtn" onClick={() => { setIdx(0); setScore(0); setAnswered(false); }}>Ще раз</button></div>; }
  return <div className="quizGame"><div className="quizQuestion"><span>❓ {idx + 1}/{questions.length}</span><h3>{q.text}</h3></div><div className="choiceGrid">{(q.options || []).map((o, i) => <button key={i} className="choiceCard" onClick={() => choose(o)} disabled={answered || disabled || completed}><span>{o.emoji || '✨'}</span><strong>{o.title}</strong></button>)}</div>{answered ? <div className={answered === 'ok' ? 'feedback ok' : 'feedback bad'}>{answered === 'ok' ? 'Правильно!' : 'Ой, тут пастка.'}</div> : null}{answered ? <button className="primaryBtn" onClick={next}>Далі →</button> : null}</div>;
}

function ScratchBlocksTask({ level, config, disabled, completed, onComplete, sound }) {
  const target = config.targetBlocks || ['event', 'move', 'win']; const palette = config.palette || [{ id: 'event', emoji: '🏁', title: 'коли старт' }, { id: 'move', emoji: '➡️', title: 'рух' }, { id: 'touch', emoji: '⭐', title: 'торкнутись' }, { id: 'win', emoji: '🏆', title: 'перемога' }];
  const [program, setProgram] = useState([]); const [result, setResult] = useState(null);
  function run() { const ok = target.length === program.length && target.every((id, i) => program[i] === id); setResult(ok); sound(ok ? 'success' : 'fail'); }
  return <div className="scratchBlocksGame"><div className="scratchStage"><div className="stageBg">{(config.stageItems || ['🐱', '⭐', '🏁']).map((x, i) => <span key={i}>{x}</span>)}</div><p>{result === true ? 'Котик дійшов до цілі!' : result === false ? 'Порядок блоків треба змінити.' : 'Склади код і запусти.'}</p></div><div className="blockWorkbench"><div className="blockPalette">{palette.map((b) => <button key={b.id} onClick={() => { setProgram((p) => [...p, b.id]); sound('click'); }} disabled={disabled || completed}>{b.emoji} {b.title}</button>)}</div><div className="scratchProgram">{program.map((id, i) => <button key={`${id}-${i}`} onClick={() => setProgram((p) => p.filter((_, idx) => idx !== i))}>{palette.find((b) => b.id === id)?.emoji || id}</button>)}</div><div className="actionRow"><button className="secondaryBtn" onClick={() => { setProgram([]); setResult(null); }}>Очистити</button><button className="primaryBtn" onClick={run} disabled={!program.length || disabled || completed}><Play size={17} /> Запуск</button></div><button className="primaryBtn big" disabled={result !== true || disabled || completed} onClick={() => onComplete(level, config.points || 15)}><CheckCircle2 size={20} /> Повторити в Scratch</button></div></div>;
}

function ScratchSceneTask({ level, config, disabled, completed, onComplete, sound }) {
  const required = config.required || ['hero', 'goal']; const items = config.items || [{ id: 'hero', emoji: '🐱', title: 'герой' }, { id: 'goal', emoji: '🏁', title: 'фініш' }, { id: 'enemy', emoji: '👾', title: 'ворог' }, { id: 'score', emoji: '⭐', title: 'рахунок' }]; const [selected, setSelected] = useState([]);
  const ok = required.every((id) => selected.includes(id));
  function toggle(id) { if (disabled || completed) return; setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]); sound('click'); }
  return <div className="scratchSceneGame"><div className="scratchStage big">{items.filter((i) => selected.includes(i.id)).map((i) => <span key={i.id}>{i.emoji}</span>)}{!selected.length ? <em>Порожня сцена</em> : null}</div><div className="sceneItems">{items.map((i) => <button key={i.id} className={selected.includes(i.id) ? 'part active' : 'part'} onClick={() => toggle(i.id)} disabled={disabled || completed}><span>{i.emoji}</span><strong>{i.title}</strong><small>{required.includes(i.id) ? 'потрібно' : 'бонус'}</small></button>)}</div><div className={ok ? 'feedback ok' : 'feedback neutral'}>{ok ? 'Сцена готова!' : 'Додай потрібні елементи сцени.'}</div><button className="primaryBtn big" disabled={!ok || disabled || completed} onClick={() => onComplete(level, config.points || 12)}><CheckCircle2 size={20} /> Сцену зібрано</button></div>;
}

function Scoreboard({ teams, players }) { const sorted = [...teams].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)); return <section className="cardBlock scoreboard"><h2>Команди</h2>{sorted.map((team) => <div className="scoreRow" key={team.id}><span>{team.emoji}</span><strong>{team.name}</strong><small>{players.filter((p) => p.team_id === team.id).length} уч.</small><b>{team.score}</b></div>)}</section>; }
function CurrentMission({ room, level, total, completed, players }) { if (room.status === 'waiting') return <section className="cardBlock missionBlock"><h2>Поточна місія</h2><div className="emptyState">Очікуємо учнів. Коли всі зайдуть — натисни “Почати”.</div></section>; if (room.status === 'finished') return <section className="cardBlock missionBlock"><h2>Гру завершено</h2><div className="bigEmoji">🏆</div><p>Можна обговорити результат і видати бейджі.</p></section>; const config = level?.config_json || {}; return <section className="cardBlock missionBlock"><span className="levelPill">Рівень {room.current_level}/{total}</span><h2>{level?.title}</h2><p>{config.instruction}</p>{level?.teacher_hint ? <div className="teacherHint">💡 {level.teacher_hint}</div> : null}<div className="progressLine"><span>{completed}/{players} готово</span><div><i style={{ width: `${players ? (completed / players) * 100 : 0}%` }} /></div></div></section>; }
function WaitingScreen({ game }) { return <section className="waitingScreen"><div className="bigEmoji">{game?.cover_emoji || '🎮'}</div><h1>{game?.title}</h1><p>Очікуємо, коли викладач запустить перший рівень.</p></section>; }
function FinishedScreen({ player }) { return <section className="waitingScreen finished"><div className="confetti">🎉</div><div className="bigEmoji">🏆</div><h1>Гру завершено!</h1><p>{player.name}, твій результат: <strong>{player.score} балів</strong>.</p></section>; }
function LoadingPanel({ text }) { return <section className="panel"><div className="loader" /><p>{text}</p></section>; }
function Toast({ type, message, icon = '⚠️', onClose }) { return <div className={`toast ${type}`}><span>{icon}</span><p>{message}</p><button onClick={onClose}>×</button></div>; }
function SuccessBox({ text }) { return <div className="successBox"><CheckCircle2 size={20} /> {text}</div>; }
function eventIcon(type) { return { player_joined: '👋', room_started: '▶️', level_changed: '➡️', level_completed: '⭐', room_finished: '🏆', room_reset: '🔄', room_created: '🎮' }[type] || '•'; }
function eventText(e) { const p = e.payload_json || {}; if (e.type === 'player_joined') return `${p.avatar || ''} ${p.name || 'Гравець'} приєднався`; if (e.type === 'level_completed') return `${p.avatar || ''} ${p.name || 'Гравець'} виконав рівень ${p.level} і отримав ${p.points} балів`; if (e.type === 'level_changed') return `Перехід на рівень ${p.level}: ${p.title || ''}`; if (e.type === 'room_started') return 'Гру запущено'; if (e.type === 'room_finished') return 'Гру завершено'; if (e.type === 'room_reset') return 'Прогрес скинуто'; return 'Подія гри'; }
function levelIcon(mode) { return { robotRoute: '🤖', robotAssembly: '🧩', desktopDrag: '🖥️', browserHunt: '🌐', emailAction: '📬', chatAction: '💬', aiTrainerGame: '🧠', passwordBuilder: '🔐', typingGame: '⌨️', keyboardTrainer: '⌨️', hardwareSort: '🔩', quizBattle: '❓', scratchBlocks: '🐱', scratchScene: '🎬' }[mode] || '🎮'; }
function posKey(pos = []) { return `${pos[0]}-${pos[1]}`; }
function turn(dir, cmd) { const dirs = ['N', 'E', 'S', 'W']; const i = dirs.indexOf(dir); return dirs[(i + (cmd === 'right' ? 1 : 3) + 4) % 4]; }
function vector(dir) { if (dir === 'N') return [-1, 0]; if (dir === 'S') return [1, 0]; if (dir === 'W') return [0, -1]; return [0, 1]; }
function simulateRobot(config, commands) { const grid = config.grid || {}; const rows = Number(grid.rows || 5); const cols = Number(grid.cols || 6); let pos = [...(grid.start || [0, 0])]; let dir = grid.dir || 'E'; const obstacles = new Set((grid.obstacles || []).map(posKey)); const itemMap = new Map((grid.items || []).map((i) => [posKey(i.pos), i.id || posKey(i.pos)])); const repairMap = new Map((grid.repairs || []).map((i) => [posKey(i.pos), i.id || posKey(i.pos)])); const collected = new Set(); const repaired = new Set(); const steps = [{ pos: [...pos], dir, action: 'start' }]; for (const command of commands) { if (command === 'left' || command === 'right') { dir = turn(dir, command); steps.push({ pos: [...pos], dir, action: command }); continue; } if (command === 'forward') { const [dr, dc] = vector(dir); const next = [pos[0] + dr, pos[1] + dc]; if (next[0] < 0 || next[0] >= rows || next[1] < 0 || next[1] >= cols) return { success: false, steps, message: 'Робот виїхав за межі поля.' }; if (obstacles.has(posKey(next))) return { success: false, steps: [...steps, { pos: next, dir, action: 'crash' }], message: 'Бум! На шляху перешкода.' }; pos = next; steps.push({ pos: [...pos], dir, action: command }); continue; } if (command === 'pickup') { const key = posKey(pos); if (!itemMap.has(key)) return { success: false, steps, message: 'Тут немає вантажу для захвату.' }; collected.add(itemMap.get(key)); steps.push({ pos: [...pos], dir, action: command }); continue; } if (command === 'repair') { const key = posKey(pos); if (!repairMap.has(key)) return { success: false, steps, message: 'Тут немає об’єкта для ремонту.' }; repaired.add(repairMap.get(key)); steps.push({ pos: [...pos], dir, action: command }); } } const missingItems = [...itemMap.values()].filter((id) => !collected.has(id)); const missingRepairs = [...repairMap.values()].filter((id) => !repaired.has(id)); if (missingItems.length) return { success: false, steps, message: 'Робот не забрав потрібний вантаж.' }; if (missingRepairs.length) return { success: false, steps, message: 'Не всі поломки відремонтовані.' }; if (posKey(pos) !== posKey(grid.goal)) return { success: false, steps, message: 'Тепер треба фінішувати на прапорці.' }; return { success: true, steps, message: 'Супер! Маршрут працює.' }; }

createRoot(document.getElementById('root')).render(<App />);
