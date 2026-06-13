-- Run this if 002_advanced_game_levels.sql failed with:
-- violates check constraint "game_levels_type_check"

alter table public.game_levels drop constraint if exists game_levels_type_check;
alter table public.game_levels add constraint game_levels_type_check
  check (type in ('choice', 'sort', 'build', 'game'));
