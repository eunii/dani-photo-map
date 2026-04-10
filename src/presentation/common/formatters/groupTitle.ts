import { stripLeadingDateFromAutoGroupDisplayTitle } from '@domain/services/PhotoNamingService'

export function stripLeadingDateFromGroupTitle(displayTitle: string): string {
  return stripLeadingDateFromAutoGroupDisplayTitle(displayTitle)
}
