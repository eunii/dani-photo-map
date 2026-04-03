export interface PhotoGroup {
  id: string
  title: string
  photoIds: string[]
  representativePhotoId?: string
  companions: string[]
  notes?: string
}
