import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();
export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
});
export function isOpenAIConfigured() {
    const key = process.env.OPENAI_API_KEY;
    return Boolean(key && key !== 'your-openai-api-key' && !key.startsWith('sk-placeholder'));
}
