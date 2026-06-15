import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RobotRouteTask, RobotAssemblyTask } from './components/RobotGames';
import { ScratchBlocksTask, ScratchSceneTask } from './components/ScratchGames';
import { DesktopDragTask, BrowserHuntTask, AITrainerGameTask, EmailActionTask, ChatActionTask, ChoiceTask, PasswordBuilderTask, TypingGameTask, HardwareSortTask, QuizBattleTask } from './components/CyberGames';

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
        <svg style={{position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none'}} preserveAspectRatio="none">
          <line x1="20%" y1="25%" x2="80%" y2="40%" stroke="rgba(255,255,255,0.2)" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 10" />
          <line x1="80%" y1="40%" x2="30%" y2="80%" stroke="rgba(255,255,255,0.2)" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 10" />
          <line x1="80%" y1="40%" x2="75%" y2="80%" stroke="rgba(255,255,255,0.2)" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 10" />
        </svg>
        <div className="mapNode node1">🤖<span>RoboLab</span></div>
        <div className="mapNode node2">🧠<span>AI Lab</span></div>
        <div className="mapNode node3">🐱<span>Scratch Arcade</span></div>
        <div className="mapNode node4">🛡️<span>Cyber City</span></div>
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
      {room.status === 'waiting' ? <WaitingScreen game={room.game} /> : room.status === 'finished' ? <FinishedScreen player={player} /> : currentLevel ? <GameTask key={currentLevel.id} level={currentLevel} disabled={busy || completedCurrent} completed={completedCurrent} onComplete={handleComplete} sound={sound} /> : <WaitingScreen game={room.game} />}
    </section>
  );
}

function GameTask({ level, disabled, completed, onComplete, sound }) {
  const config = level.config_json || {};
  const mode = inferLevelMode(level, config);
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
        : level.type === 'sort' ? <DesktopDragTask {...taskProps} />
        : <ChoiceTask {...taskProps} />}
      {completed ? <SuccessBox text="Рівень зараховано! Чекай наступну місію від викладача." /> : null}
    </section>
  );
}

function inferLevelMode(level, config) {
  if (config.mode) return config.mode;
  if (config.target) return 'typingGame';
  if (config.chips || config.parts) return 'passwordBuilder';
  if (config.samples || config.labels) return 'aiTrainerGame';
  if (config.files || config.folders || config.categories) return 'desktopDrag';
  if (config.results || config.url || config.query) return 'browserHunt';
  if (config.subject || config.from || config.attachment) return 'emailAction';
  if (config.messages || config.chatTitle) return 'chatAction';
  if (config.targetBlocks || config.palette) return 'scratchBlocks';
  if ((config.items || []).some((item) => item.type === 'hardware' || item.type === 'software')) return 'hardwareSort';
  if (config.required || config.items) return 'scratchScene';
  return level.type;
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
createRoot(document.getElementById('root')).render(<App />);
