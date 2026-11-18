import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import type { TranscriptSegment } from '../../src/shared/types.ts';
import { isConfiguredSecret } from '../config.ts';

function getAiClient(apiVersion?: 'v1' | 'v1beta'): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!isConfiguredSecret(apiKey)) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please configure your Gemini API key in Settings > Secrets (or .env) to run AI transcription and viral moment detection.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (/API_KEY_INVALID|PERMISSION_DENIED|403|401/i.test(msg)) {
    return new Error(
      'Gemini API authentication failed. Please check your GEMINI_API_KEY in the Settings > Secrets panel.',
    );
  }
  if (/RESOURCE_EXHAUSTED|429/i.test(msg)) {
    return new Error(
      'Gemini API rate limit or quota exceeded (429). Please retry shortly or check your quota in Settings > Secrets.',
    );
  }
  return new Error(`AI processing failed: ${msg}`);
}

export interface ViralClipCandidate {
  title: string;
  hookText: string;
  viralScore: number;
  hookDelayLabel: string;
  startSec: number;
  endSec: number;
}

export interface AiAnalysisResult {
  transcript: TranscriptSegment[];
  clips: ViralClipCandidate[];
}

export async function transcribeAudioWithGemini(
  audioMp3Path: string,
  durationSec: number,
): Promise<string> {
  const audioBuffer = fs.readFileSync(audioMp3Path);
  const base64Audio = audioBuffer.toString('base64');
  const audioPart = {
    inlineData: {
      mimeType: 'audio/mp3',
      data: base64Audio,
    },
  };
  const promptPart = {
    text: `Transcribe the spoken audio accurately with timestamps in [MM:SS] format at the start of each sentence or phrase. Total audio duration is ${durationSec.toFixed(
      1,
    )} seconds. If there is no clear speech, briefly describe any spoken words or audio cues.`,
  };

  try {
    const aiBeta = getAiClient('v1beta');
    const response = await aiBeta.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: { parts: [audioPart, promptPart] },
    });
    return (response.text ?? '').trim();
  } catch (primaryErr) {
    const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    if (/404|NOT_FOUND|not supported/i.test(msg)) {
      try {
        const aiDefault = getAiClient();
        const fallbackResp = await aiDefault.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: { parts: [audioPart, promptPart] },
        });
        return (fallbackResp.text ?? '').trim();
      } catch (fallbackErr) {
        throw formatGeminiError(fallbackErr);
      }
    }
    throw formatGeminiError(primaryErr);
  }
}

export async function analyzeTranscriptAndDetectClips(opts: {
  rawTranscript: string;
  durationSec: number;
  sceneTimestamps: number[];
  videoTitle: string;
}): Promise<AiAnalysisResult> {
  const ai = getAiClient();
  const maxDur = Math.max(6, opts.durationSec);
  const desiredClipCount = maxDur < 18 ? 1 : maxDur < 45 ? 2 : 3;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are ClipForge AI's viral short-form video editor.
Analyze the following video transcript and metadata to:
1. Produce clean, sentence-level timestamped transcript segments covering [0, ${maxDur.toFixed(1)}] seconds without exceeding ${maxDur.toFixed(1)}s.
2. Select ${desiredClipCount} distinct, self-contained, high-engagement viral Short clip ranges from [0, ${maxDur.toFixed(1)}].
   - Each clip MUST be between ${Math.min(7, maxDur * 0.4).toFixed(1)}s and ${Math.min(58, maxDur).toFixed(1)}s long.
   - Start on a strong hook / complete sentence and end on a complete sentence.
   - Give each clip a punchy short title (max 45 chars), the exact opening hook sentence (max 80 chars), a realistic viralScore (78-98), and a hookDelayLabel like "Hook: 0.6s".

Video title: "${opts.videoTitle}"
Total duration: ${maxDur.toFixed(2)} seconds
Detected visual scene change timestamps (seconds): ${JSON.stringify(opts.sceneTimestamps.slice(0, 20))}

Raw transcript:
${opts.rawTranscript || '(No spoken dialogue detected; create visual highlight segments aligned to scene timestamps.)'}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  startSec: { type: Type.NUMBER },
                  endSec: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                },
                required: ['startSec', 'endSec', 'text'],
              },
            },
            clips: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  hookText: { type: Type.STRING },
                  viralScore: { type: Type.INTEGER },
                  hookDelayLabel: { type: Type.STRING },
                  startSec: { type: Type.NUMBER },
                  endSec: { type: Type.NUMBER },
                },
                required: ['title', 'hookText', 'viralScore', 'hookDelayLabel', 'startSec', 'endSec'],
              },
            },
          },
          required: ['transcript', 'clips'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      transcript?: Array<{ startSec: number; endSec: number; text: string; speaker?: string }>;
      clips?: ViralClipCandidate[];
    };

    const transcript: TranscriptSegment[] = (parsed.transcript ?? [])
      .map((seg, idx) => ({
        id: `seg_${idx + 1}`,
        startSec: Math.max(0, Math.min(maxDur - 0.3, Number(seg.startSec) || 0)),
        endSec: Math.max(0.4, Math.min(maxDur, Number(seg.endSec) || 0)),
        text: (seg.text || '').trim(),
        speaker: seg.speaker || 'Speaker 1',
      }))
      .filter((s) => s.text.length > 0 && s.endSec > s.startSec)
      .sort((a, b) => a.startSec - b.startSec);

    const rawClips = Array.isArray(parsed.clips) ? parsed.clips : [];
    const clips: ViralClipCandidate[] = rawClips
      .slice(0, 4)
      .map((c, idx) => {
        const minLen = Math.min(5, maxDur);
        const start = Math.max(0, Math.min(maxDur - minLen, Number(c.startSec) || 0));
        const end = Math.max(start + minLen, Math.min(maxDur, Number(c.endSec) || maxDur));
        return {
          title: (c.title || `Viral Moment #${idx + 1}`).slice(0, 64),
          hookText: (c.hookText || 'Watch what happens next').slice(0, 120),
          viralScore: Math.max(70, Math.min(99, Math.round(Number(c.viralScore) || 88))),
          hookDelayLabel: c.hookDelayLabel || 'Hook: 0.7s',
          startSec: Number(start.toFixed(2)),
          endSec: Number(end.toFixed(2)),
        };
      });

    if (clips.length === 0) {
      clips.push({
        title: opts.videoTitle.slice(0, 48) || 'Key Highlight Short',
        hookText: transcript[0]?.text ?? 'Highlight moment',
        viralScore: 89,
        hookDelayLabel: 'Hook: 0.8s',
        startSec: 0,
        endSec: Number(Math.min(maxDur, 20).toFixed(2)),
      });
    }

    return { transcript, clips };
  } catch (err) {
    throw formatGeminiError(err);
  }
}

export async function generateSampleNarrationWav(
  scriptText: string,
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr',
  outWavPath: string,
): Promise<boolean> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!isConfiguredSecret(apiKey)) {
    return false;
  }

  try {
    const ai = getAiClient('v1beta');
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: scriptText,
              speechMetadata: {
                style: 'Energetic, authoritative podcast founder speaking clearly into a studio mic',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return false;
    fs.writeFileSync(outWavPath, Buffer.from(base64Audio, 'base64'));
    return true;
  } catch (err) {
    console.warn('[TTS Sample Warning]', err instanceof Error ? err.message : err);
    return false;
  }
}
