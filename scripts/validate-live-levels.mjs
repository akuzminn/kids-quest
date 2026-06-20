import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadLocalEnv() {
  if (!fs.existsSync('.env.local')) return;
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const separator = line.indexOf('=');
    if (separator < 1 || line.trimStart().startsWith('#')) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnv();
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
assert(url && key, 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');

const supportedModes = new Set([
  'robotRoute', 'robotAssembly', 'desktopDrag', 'browserHunt', 'emailAction',
  'chatAction', 'aiTrainerGame', 'passwordBuilder', 'typingGame', 'keyboardTrainer',
  'hardwareSort', 'quizBattle', 'scratchBlocks', 'scratchScene',
]);

function hasCorrectChoice(cards = []) {
  return cards.length > 0 && cards.some((card) => card.correct || card.isCorrect);
}

function routeIsSolvable(config) {
  const grid = config.grid || {};
  const rows = Number(grid.rows || 5);
  const columns = Number(grid.cols || 6);
  const start = grid.start || [0, 0];
  const goal = grid.goal;
  if (!goal) return false;

  const directions = ['N', 'E', 'S', 'W'];
  const vectors = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
  const positionKey = (row, column) => `${row},${column}`;
  const obstacles = new Set((grid.obstacles || []).map(([row, column]) => positionKey(row, column)));
  const itemIndex = new Map((grid.items || []).map((item, index) => [positionKey(...item.pos), index]));
  const repairIndex = new Map((grid.repairs || []).map((item, index) => [positionKey(...item.pos), index]));
  const allItems = (1 << itemIndex.size) - 1;
  const allRepairs = (1 << repairIndex.size) - 1;
  const queue = [{ row: start[0], column: start[1], direction: grid.dir || 'E', items: 0, repairs: 0, depth: 0 }];
  const visited = new Set();

  while (queue.length) {
    const state = queue.shift();
    const stateKey = `${state.row},${state.column},${state.direction},${state.items},${state.repairs}`;
    if (visited.has(stateKey)) continue;
    visited.add(stateKey);
    if (state.row === goal[0] && state.column === goal[1] && state.items === allItems && state.repairs === allRepairs) return true;
    if (state.depth >= 36) continue;

    const directionIndex = directions.indexOf(state.direction);
    queue.push({ ...state, direction: directions[(directionIndex + 3) % 4], depth: state.depth + 1 });
    queue.push({ ...state, direction: directions[(directionIndex + 1) % 4], depth: state.depth + 1 });

    const [rowDelta, columnDelta] = vectors[state.direction];
    const nextRow = state.row + rowDelta;
    const nextColumn = state.column + columnDelta;
    if (nextRow >= 0 && nextRow < rows && nextColumn >= 0 && nextColumn < columns && !obstacles.has(positionKey(nextRow, nextColumn))) {
      queue.push({ ...state, row: nextRow, column: nextColumn, depth: state.depth + 1 });
    }

    const item = itemIndex.get(positionKey(state.row, state.column));
    if (item != null) queue.push({ ...state, items: state.items | (1 << item), depth: state.depth + 1 });
    const repair = repairIndex.get(positionKey(state.row, state.column));
    if (repair != null) queue.push({ ...state, repairs: state.repairs | (1 << repair), depth: state.depth + 1 });
  }
  return false;
}

function passwordIsSolvable(config) {
  const pool = config.parts || (config.chips || []).map((chip) => chip.text) || [];
  const isValid = (password) => {
    const checks = [
      password.length >= Number(config.minLength || 8),
      /[A-ZА-Я]/.test(password),
      /\d/.test(password),
      /[^A-Za-zА-Яа-я0-9]/.test(password),
    ];
    return checks.filter(Boolean).length >= Number(config.need || 3)
      && !(config.banned || []).some((part) => password.toLowerCase().includes(String(part).toLowerCase()));
  };
  let candidates = [''];
  for (let depth = 0; depth < 6; depth += 1) {
    candidates = candidates.flatMap((candidate) => pool.map((part) => candidate + part));
    if (candidates.some(isValid)) return true;
  }
  return false;
}

function validateLevel(level) {
  const config = level.config_json || {};
  const mode = config.mode || level.type;
  assert(supportedModes.has(mode), `unsupported mode ${mode}`);
  assert(level.teacher_hint, 'missing teacher hint');

  if (mode === 'robotRoute') assert(routeIsSolvable(config), 'route has no solution within 36 commands');
  if (mode === 'robotAssembly') {
    const partIds = new Set((config.parts || []).map((item) => item.id));
    const blockIds = new Set((config.blocks || []).map((item) => item.id));
    assert((config.requiredParts || []).every((id) => partIds.has(id)), 'required robot part is unavailable');
    assert((config.requiredProgram || []).every((id) => blockIds.has(id)), 'required program block is unavailable');
  }
  if (mode === 'desktopDrag' || mode === 'aiTrainerGame') {
    const categories = config.categories || config.folders || [];
    const cards = config.cards || config.files || config.samples || [];
    const categoryIds = new Set(categories.map((item) => item.id));
    assert(cards.length > 0 && cards.every((card) => categoryIds.has(card.category || card.target || card.label)), 'card has no matching category');
  }
  if (mode === 'browserHunt') {
    const cards = config.results || config.options || [];
    assert(cards.some((card) => card.correct || card.isCorrect || !card.danger), 'no safe browser choice');
  }
  if (mode === 'emailAction' || mode === 'chatAction') assert(hasCorrectChoice(config.cards || config.options), 'no correct choice');
  if (mode === 'passwordBuilder') assert(passwordIsSolvable(config), 'password requirements cannot be met');
  if (mode === 'typingGame' || mode === 'keyboardTrainer') assert(String(config.target || '').length > 0, 'missing typing target');
  if (mode === 'hardwareSort') assert((config.items || []).every((item) => ['hardware', 'software'].includes(item.type)), 'invalid hardware category');
  if (mode === 'quizBattle') {
    const questions = config.questions || [];
    assert(questions.length > 0 && questions.every((question) => hasCorrectChoice(question.options)), 'quiz question has no correct answer');
    assert(Number(config.minCorrect || 1) <= questions.length, 'quiz pass threshold is impossible');
  }
  if (mode === 'scratchBlocks') {
    const palette = new Set((config.palette || []).map((item) => item.id));
    assert((config.targetBlocks || []).every((id) => palette.has(id)), 'target Scratch block is unavailable');
  }
  if (mode === 'scratchScene') {
    const items = new Set((config.items || []).map((item) => item.id));
    assert((config.required || []).every((id) => items.has(id)), 'required scene item is unavailable');
  }
  return mode;
}

const client = createClient(url, key);
const [gamesResult, levelsResult] = await Promise.all([
  client.from('games').select('id,title'),
  client.from('game_levels').select('game_id,order_index,title,type,teacher_hint,config_json').order('order_index'),
]);
if (gamesResult.error) throw gamesResult.error;
if (levelsResult.error) throw levelsResult.error;

const games = gamesResult.data || [];
const levels = levelsResult.data || [];
const modes = {};
for (const level of levels) {
  try {
    const mode = validateLevel(level);
    modes[mode] = (modes[mode] || 0) + 1;
  } catch (error) {
    throw new Error(`Level ${level.game_id}/${level.order_index} (${level.title}): ${error.message}`);
  }
}

assert.equal(games.length, 3, 'expected 3 games');
assert.equal(levels.length, 135, 'expected 135 levels');
assert(games.every((game) => levels.filter((level) => level.game_id === game.id).length === 45), 'every game must have 45 levels');
console.log(JSON.stringify({ ok: true, games: games.length, levels: levels.length, modes }, null, 2));
