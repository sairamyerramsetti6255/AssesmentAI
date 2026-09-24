import type { PublicQuestion } from './api.ts'

export const CLIENT_VOICE_INTRO_ID = 'client-voice-intro'

export const CLIENT_VOICE_INTRO_TEXT =
  'Tell us about your business and day-to-day activities, and the technical and growth challenges you want to solve. Speak for up to about a minute — we will not ask again for what you cover here.'

export function createIntroQuestion(): PublicQuestion {
  return {
    id: CLIENT_VOICE_INTRO_ID,
    text: CLIENT_VOICE_INTRO_TEXT,
    type: 'text',
    options: null,
    sort_order: 0,
    is_mandatory: true,
  }
}
