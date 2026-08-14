export const SOUND_LEVELS = [
  { level: 0, min: 0,   max: 26,  file: 'audio/sound_01.mp3', name: 'SUB-BASS HUM',     label: 'LOW FREQ HUM' },
  { level: 1, min: 26,  max: 51,  file: 'audio/sound_02.mp3', name: 'LOW ENGINE',       label: 'ENGINE RUMBLE' },
  { level: 2, min: 51,  max: 77,  file: 'audio/sound_03.mp3', name: 'HYDRAULIC PRESS',  label: 'HYDRAULIC PUMP' },
  { level: 3, min: 77,  max: 102, file: 'audio/sound_04.mp3', name: 'PULSATING RHYTHM', label: 'PULSE BEAT' },
  { level: 4, min: 102, max: 128, file: 'audio/sound_05.mp3', name: 'CONVEYOR BELT',    label: 'BELT FRICTION' },
  { level: 5, min: 128, max: 154, file: 'audio/sound_06.mp3', name: 'TURBINE SPIN',     label: 'TURBINE ENGINE' },
  { level: 6, min: 154, max: 179, file: 'audio/sound_07.mp3', name: 'HIGH RESONANCE',   label: 'RESONANCE WAVE' },
  { level: 7, min: 179, max: 205, file: 'audio/sound_08.mp3', name: 'METALLIC CLANG',   label: 'METAL RESONANCE' },
  { level: 8, min: 205, max: 230, file: 'audio/sound_09.mp3', name: 'STEAM VENT',       label: 'STEAM PRESSURE' },
  { level: 9, min: 230, max: 256, file: 'audio/sound_10.mp3', name: 'CIRCUIT BUZZ',     label: 'HIGH FREQ BUZZ' }
];

export function mapGrayToSound(gray) {
  const clamped = Math.max(0, Math.min(255, Math.round(gray)));
  let levelIndex = Math.floor((clamped / 256) * 10);
  if (levelIndex < 0) levelIndex = 0;
  if (levelIndex > 9) levelIndex = 9;
  return SOUND_LEVELS[levelIndex];
}

export function pickRandomSound(excludeLevels) {
  const excludes = excludeLevels || [];
  const pool = [];
  let i;
  for (i = 0; i < SOUND_LEVELS.length; i++) {
    if (excludes.indexOf(SOUND_LEVELS[i].level) === -1) {
      pool.push(SOUND_LEVELS[i]);
    }
  }
  if (pool.length === 0) return SOUND_LEVELS[0];
  return pool[Math.floor(Math.random() * pool.length)];
}
