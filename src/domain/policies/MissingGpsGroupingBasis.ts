export const missingGpsGroupingBases = ['month', 'week', 'day'] as const

export type MissingGpsGroupingBasis = typeof missingGpsGroupingBases[number]

export const defaultMissingGpsGroupingBasis: MissingGpsGroupingBasis = 'month'
