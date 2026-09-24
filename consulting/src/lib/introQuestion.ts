import type { PublicQuestion } from './api.ts'

export const CLIENT_VOICE_INTRO_ID = 'client-voice-intro'

export const CLIENT_VOICE_INTRO_TEXT =
  'Tell us about you and your business: what you do, the problems to solve, and what you want to improve.'

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
