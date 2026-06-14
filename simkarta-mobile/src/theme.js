// Markaziy tema - barcha ranglar shu yerda
export const LIGHT = {
  primary:      '#1b8a5a',
  primaryDark:  '#0d6942',
  primaryLight: '#22a870',
  headerGrad:   ['#1b8a5a', '#0d6942'],

  bg:           '#f0f4f2',
  surface:      '#ffffff',
  surfaceAlt:   '#f7f9f8',

  text:         '#111827',
  textSub:      '#6b7280',
  textMuted:    '#9ca3af',

  border:       '#e5e7eb',
  borderFocus:  '#1b8a5a',

  error:        '#dc2626',
  errorBg:      '#fef2f2',
  success:      '#16a34a',
  successBg:    '#f0fdf4',
  warning:      '#d97706',
  warningBg:    '#fffbeb',

  tabBg:        '#ffffff',
  tabBorder:    '#f0f0f0',

  skeletonBase: '#e5e7eb',
  skeletonHi:   '#f3f4f6',

  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const DARK = {
  primary:      '#22a870',
  primaryDark:  '#1b8a5a',
  primaryLight: '#2dc888',
  headerGrad:   ['#0d3d25', '#081f13'],

  bg:           '#080f0b',
  surface:      '#131f17',
  surfaceAlt:   '#1a2b20',

  text:         '#f1f5f2',
  textSub:      '#8eada0',
  textMuted:    '#586b60',

  border:       '#243329',
  borderFocus:  '#22a870',

  error:        '#f87171',
  errorBg:      '#3d1a1a',
  success:      '#4ade80',
  successBg:    '#1a3d26',
  warning:      '#fbbf24',
  warningBg:    '#3d2d0a',

  tabBg:        '#131f17',
  tabBorder:    '#243329',

  skeletonBase: '#1a2b20',
  skeletonHi:   '#243329',

  card: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  cardLg: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

// Operator ranglari — har ikkala rejimda bir xil
export const OP = {
  beeline:  { color: '#FFCC00', text: '#1a1a1a', label: 'Beeline' },
  ucell:    { color: '#8B2FC9', text: '#ffffff', label: 'Ucell' },
  uzmobile: { color: '#0066CC', text: '#ffffff', label: 'Uzmobile' },
  mobiuz:   { color: '#E32119', text: '#ffffff', label: 'Mobiuz' },
  oq:       { color: '#2d2d2d', text: '#ffffff', label: 'OQ' },
};

export const OPERATORS = [
  { key: 'beeline',  ...OP.beeline  },
  { key: 'ucell',    ...OP.ucell    },
  { key: 'uzmobile', ...OP.uzmobile },
  { key: 'mobiuz',   ...OP.mobiuz   },
  { key: 'oq',       ...OP.oq       },
];

// Eskiroq import'lar uchun mos holat (bir xil foydalanish imkoniyati)
export const colors = {
  primary:       LIGHT.primary,
  primaryDark:   LIGHT.primaryDark,
  background:    LIGHT.bg,
  white:         LIGHT.surface,
  text:          LIGHT.text,
  textSecondary: LIGHT.textSub,
  border:        LIGHT.border,
  error:         LIGHT.error,
  success:       LIGHT.success,
};
