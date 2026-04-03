import type { GroupDetail } from '@shared/types/preload'

interface RankedSuggestion {
  title: string
  distanceKm: number
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function calculateDistanceKm(
  left: NonNullable<GroupDetail['representativeGps']>,
  right: NonNullable<GroupDetail['representativeGps']>
): number {
  const earthRadiusKm = 6371
  const deltaLatitude = toRadians(right.latitude - left.latitude)
  const deltaLongitude = toRadians(right.longitude - left.longitude)
  const leftLatitude = toRadians(left.latitude)
  const rightLatitude = toRadians(right.latitude)
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(deltaLongitude / 2) ** 2

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function buildGroupTitleSuggestions(
  currentGroup: GroupDetail | undefined,
  groups: GroupDetail[],
  maxDistanceKm = 3,
  maxSuggestions = 3
): string[] {
  if (!currentGroup?.representativeGps) {
    return []
  }

  const rankedSuggestions: RankedSuggestion[] = groups
    .filter(
      (group) =>
        group.id !== currentGroup.id &&
        Boolean(group.representativeGps) &&
        group.title.trim().length > 0
    )
    .map((group) => ({
      title: group.title,
      distanceKm: calculateDistanceKm(
        currentGroup.representativeGps!,
        group.representativeGps!
      )
    }))
    .filter((suggestion) => suggestion.distanceKm <= maxDistanceKm)
    .sort((left, right) => left.distanceKm - right.distanceKm)

  return Array.from(new Set(rankedSuggestions.map((suggestion) => suggestion.title))).slice(
    0,
    maxSuggestions
  )
}
