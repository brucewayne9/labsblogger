import fs from 'fs';
import path from 'path';
import { callClaude } from './utils/anthropic.js';
import { OUTLINE_PROMPT } from './utils/prompts.js';

// Load brand voice configuration
function loadBrandVoice() {
  const brandVoicePath = path.join(process.cwd(), 'config', 'brand-voice.json');
  return JSON.parse(fs.readFileSync(brandVoicePath, 'utf8'));
}

// Generate outline from brief (simplified for web app - no CLI interaction)
export async function generateOutline(brief, brandVoiceOverride = null) {
  const brandVoice = brandVoiceOverride || loadBrandVoice();

  console.log('[OutlineGenerator] Generating article outline...');

  const prompt = OUTLINE_PROMPT(brief, brandVoice);
  const result = await callClaude(prompt, {
    maxTokens: 2000,
    temperature: 0.8,
  });

  if (!result.success) {
    console.error('[OutlineGenerator] Error:', result.error);
    throw new Error(result.error || 'Failed to generate outline');
  }

  let outline;
  try {
    // Remove markdown code blocks if present
    let jsonContent = result.content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
    }
    outline = JSON.parse(jsonContent);
    console.log('[OutlineGenerator] Successfully generated outline');
    return outline;
  } catch (error) {
    console.error('[OutlineGenerator] Parse error:', error.message);
    console.error('[OutlineGenerator] Raw response:', result.content.substring(0, 200) + '...');
    throw new Error('Could not parse outline from AI response');
  }
}
