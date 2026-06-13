import { fallbackGames } from './fallbackGames';
import { DEFAULT_TEAMS, makeRoomCode, normalizeRoomCode } from './helpers';
import { isSupabaseConfigured, requireSupabase, supabase } from './supabase';

export async function fetchGames() {
  if (!isSupabaseConfigured) return fallbackGames;

  const { data, error } = await supabase
    .from('games')
    .select('*, course:courses(title, slug, emoji)')
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const { data: levels, error: levelsError } = await supabase.from('game_levels').select('game_id');
  if (levelsError) throw levelsError;

  const counts = (levels || []).reduce((acc, level) => {
    acc[level.game_id] = (acc[level.game_id] || 0) + 1;
    return acc;
  }, {});
  return (data || []).map((game) => ({ ...game, level_count: counts[game.id] || 0 }));
}

export async function fetchLevels(gameId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('game_levels')
    .select('*')
    .eq('game_id', gameId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createRoom({ gameId, teacherName, levelLimit }) {
  const client = requireSupabase();
  let room = null;
  let lastError = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = makeRoomCode();
    const { data, error } = await client
      .from('rooms')
      .insert({
        code,
        game_id: gameId,
        teacher_name: teacherName?.trim() || 'Викладач',
        status: 'waiting',
        current_level: 0,
        level_limit: Number(levelLimit || 10),
      })
      .select('*')
      .single();
    if (!error) {
      room = data;
      break;
    }
    lastError = error;
  }

  if (!room) throw lastError || new Error('Не вдалося створити кімнату.');

  const { error: teamsError } = await client
    .from('teams')
    .insert(DEFAULT_TEAMS.map((team) => ({ ...team, room_id: room.id })));
  if (teamsError) throw teamsError;

  await client.from('events').insert({ room_id: room.id, type: 'room_created', payload_json: { teacher: room.teacher_name } });
  return room;
}

export async function getRoomByCode(code) {
  const client = requireSupabase();
  const safeCode = normalizeRoomCode(code);
  const { data, error } = await client
    .from('rooms')
    .select('*, game:games(*, course:courses(title, slug, emoji))')
    .eq('code', safeCode)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Кімнату не знайдено. Перевір код.');
  return data;
}

export async function fetchTeamsByRoomCode(code) {
  const client = requireSupabase();
  const room = await getRoomByCode(code);
  const { data, error } = await client.from('teams').select('*').eq('room_id', room.id).order('created_at', { ascending: true });
  if (error) throw error;
  return { room, teams: data || [] };
}

export async function joinRoom({ code, name, avatar, teamId }) {
  const client = requireSupabase();
  const room = await getRoomByCode(code);
  const { data: player, error } = await client
    .from('players')
    .insert({
      room_id: room.id,
      name: name?.trim() || 'Гравець',
      avatar: avatar || '🤖',
      team_id: teamId || null,
      current_level: room.current_level || 0,
      status: 'online',
    })
    .select('*, team:teams(name, emoji)')
    .single();
  if (error) throw error;

  await client.from('events').insert({
    room_id: room.id,
    player_id: player.id,
    type: 'player_joined',
    payload_json: { name: player.name, avatar: player.avatar },
  });
  return { room, player };
}

function timerEnd(minutes = 7) {
  return new Date(Date.now() + Number(minutes || 7) * 60 * 1000).toISOString();
}

export async function getRoomBundle(roomId) {
  const client = requireSupabase();
  const { data: room, error: roomError } = await client
    .from('rooms')
    .select('*, game:games(*, course:courses(title, slug, emoji))')
    .eq('id', roomId)
    .single();
  if (roomError) throw roomError;

  const [levelsRes, playersRes, teamsRes, eventsRes] = await Promise.all([
    client.from('game_levels').select('*').eq('game_id', room.game_id).order('order_index', { ascending: true }),
    client.from('players').select('*, team:teams(name, emoji)').eq('room_id', roomId).order('joined_at', { ascending: true }),
    client.from('teams').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
    client.from('events').select('*').eq('room_id', roomId).order('created_at', { ascending: false }).limit(30),
  ]);
  for (const res of [levelsRes, playersRes, teamsRes, eventsRes]) if (res.error) throw res.error;

  const allLevels = levelsRes.data || [];
  const limit = Number(room.level_limit || allLevels.length || 0);
  return {
    room,
    levels: allLevels.slice(0, limit),
    players: playersRes.data || [],
    teams: teamsRes.data || [],
    events: eventsRes.data || [],
  };
}

export async function startRoom(room, levels) {
  const client = requireSupabase();
  const firstLevel = levels[0];
  const { data, error } = await client
    .from('rooms')
    .update({
      status: 'running',
      current_level: firstLevel?.order_index || 1,
      started_at: new Date().toISOString(),
      timer_ends_at: timerEnd(firstLevel?.time_minutes || 7),
    })
    .eq('id', room.id)
    .select('*')
    .single();
  if (error) throw error;
  await client.from('events').insert({ room_id: room.id, type: 'room_started', payload_json: {} });
  return data;
}

export async function goToLevel(room, levels, nextLevelNumber) {
  const client = requireSupabase();
  const nextLevel = levels.find((l) => Number(l.order_index) === Number(nextLevelNumber)) || levels[Number(nextLevelNumber) - 1];
  if (!nextLevel) {
    const { data, error } = await client
      .from('rooms')
      .update({ status: 'finished', ended_at: new Date().toISOString(), timer_ends_at: null })
      .eq('id', room.id)
      .select('*')
      .single();
    if (error) throw error;
    await client.from('events').insert({ room_id: room.id, type: 'room_finished', payload_json: {} });
    return data;
  }

  const { data, error } = await client
    .from('rooms')
    .update({ current_level: nextLevel.order_index, status: 'running', timer_ends_at: timerEnd(nextLevel.time_minutes || 7) })
    .eq('id', room.id)
    .select('*')
    .single();
  if (error) throw error;
  await client.from('events').insert({ room_id: room.id, type: 'level_changed', payload_json: { level: nextLevel.order_index, title: nextLevel.title } });
  return data;
}

export async function resetRoom(room) {
  const client = requireSupabase();
  const playersRes = await client.from('players').update({ score: 0, current_level: 0, status: 'online' }).eq('room_id', room.id);
  if (playersRes.error) throw playersRes.error;
  const teamsRes = await client.from('teams').update({ score: 0 }).eq('room_id', room.id);
  if (teamsRes.error) throw teamsRes.error;
  const roomRes = await client
    .from('rooms')
    .update({ status: 'waiting', current_level: 0, timer_ends_at: null, started_at: null, ended_at: null })
    .eq('id', room.id)
    .select('*')
    .single();
  if (roomRes.error) throw roomRes.error;
  await client.from('events').insert({ room_id: room.id, type: 'room_reset', payload_json: {} });
  return roomRes.data;
}

export async function completeLevel({ room, player, level, points }) {
  const client = requireSupabase();
  const existingRes = await client
    .from('events')
    .select('id, payload_json')
    .eq('room_id', room.id)
    .eq('player_id', player.id)
    .eq('type', 'level_completed')
    .limit(200);
  if (existingRes.error) throw existingRes.error;
  const alreadyCompleted = (existingRes.data || []).some((event) => Number(event.payload_json?.level) === Number(level.order_index));
  if (alreadyCompleted) return { alreadyCompleted: true };

  const safePoints = Number(points || level.config_json?.points || 10);
  const newScore = Number(player.score || 0) + safePoints;
  const playerRes = await client
    .from('players')
    .update({ score: newScore, current_level: Math.max(Number(player.current_level || 0), Number(level.order_index)) })
    .eq('id', player.id)
    .select('*, team:teams(name, emoji)')
    .single();
  if (playerRes.error) throw playerRes.error;

  if (player.team_id) {
    const teamRes = await client.from('teams').select('score').eq('id', player.team_id).single();
    if (!teamRes.error) {
      await client.from('teams').update({ score: Number(teamRes.data?.score || 0) + safePoints }).eq('id', player.team_id);
    }
  }

  await client.from('events').insert({
    room_id: room.id,
    player_id: player.id,
    type: 'level_completed',
    payload_json: { name: player.name, avatar: player.avatar, level: level.order_index, title: level.title, points: safePoints },
  });

  return { alreadyCompleted: false, player: playerRes.data };
}

export function subscribeToRoom(roomId, callback) {
  if (!isSupabaseConfigured || !supabase) return () => {};
  const channel = supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `room_id=eq.${roomId}` }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `room_id=eq.${roomId}` }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
