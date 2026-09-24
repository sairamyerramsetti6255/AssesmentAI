import type { PublicQuestion } from './api.ts'

export const CLIENT_VOICE_INTRO_ID = 'client-voice-intro'

export const CLIENT_VOICE_INTRO_TEXT =
  'Tell us about yourself and your business. Speak about what you do, the problems you want to solve, and what you hope to improve.'

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
