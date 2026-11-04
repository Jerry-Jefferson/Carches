// Short display form of a Mongo ObjectId: the last six characters.

import { EMPTY_VALUE } from '@/utils/format/locale'

export const shortId = (id) => (id ? `#${String(id).slice(-6).toUpperCase()}` : EMPTY_VALUE)
