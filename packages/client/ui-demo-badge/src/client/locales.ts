/** `demoBadge` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'game.aria': '小恐龙游戏：空格或上箭头跳跃，下箭头下蹲',
  'game.start': '按空格开始',
  'game.over': '游戏结束 — 按空格重来',
  'game.high': '最高',
} satisfies Record<string, string>

/** The demoBadge namespace key union. */
export type DemoBadgeKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'game.aria': 'Dinosaur game: Space or Up to jump, Down to duck',
  'game.start': 'Press Space to start',
  'game.over': 'Game over — Space to retry',
  'game.high': 'HI',
} satisfies Record<DemoBadgeKey, string>
