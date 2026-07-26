/**
 * デザイントークン。仕様の正は docs/design/design-system.md「デザイントークン」。
 *
 * 値は tokens.css だけが持ち、ここは名前への参照だけを持つ。両方に値を書くと
 * 必ず片方が古くなる。過不足が無いことは tokens.test.ts が両方向で突き合わせる。
 */
export const tokens = {
  color: {
    washi: 'var(--color-washi)',
    ink: 'var(--color-ink)',
    inkSoft: 'var(--color-ink-soft)',
    shu: 'var(--color-shu)',
    kin: 'var(--color-kin)',
  },

  font: {
    display: 'var(--font-display)',
    body: 'var(--font-body)',
  },

  line: {
    relationColor: 'var(--stroke-color-relation)',
    relationWidth: 'var(--stroke-width-relation)',
    biologicalDash: 'var(--dash-biological)',
    adoptedDash: 'var(--dash-adopted)',
    marriageGap: 'var(--marriage-gap)',
  },

  space: {
    1: 'var(--space-1)',
    2: 'var(--space-2)',
    3: 'var(--space-3)',
    4: 'var(--space-4)',
    5: 'var(--space-5)',
    6: 'var(--space-6)',
  },
} as const
