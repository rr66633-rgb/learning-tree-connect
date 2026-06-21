import sharp from 'sharp';
import { generateImage } from './_core/imageGeneration';
import { storagePut } from './storage';
import path from 'path';
import fs from 'fs';

interface PosterInput {
  title: string;
  date?: string;
  time?: string;
  location?: string;
  ageGroup?: string;
  template?: string;
  language: 'ar' | 'en';
}

// Template descriptions for AI background generation (NO TEXT in the image)
const templateBackgrounds: Record<string, string> = {
  trip: "colorful school bus on a road with trees and sunshine, cartoon style, no text, no letters, no words",
  national_day: "Saudi Arabia national day celebration background with green abstract shapes and golden decorations, no text, no letters, no words",
  founding_day: "Saudi heritage traditional patterns background with warm earth tones, no text, no letters, no words",
  ramadan: "beautiful crescent moon with stars and lanterns on dark blue sky, Islamic geometric patterns, no text, no letters, no words",
  eid: "colorful balloons and confetti celebration background, festive decorations, no text, no letters, no words",
  graduation: "graduation caps flying in the air with confetti and stars, celebration background, no text, no letters, no words",
  sports_day: "sports field with colorful equipment balls and ribbons, energetic background, no text, no letters, no words",
  science_day: "science lab equipment beakers test tubes and atoms, colorful educational background, no text, no letters, no words",
  family_day: "beautiful garden with flowers and butterflies, warm family-friendly background, no text, no letters, no words",
  water_fun: "water splashes and pool toys, summer fun blue background, no text, no letters, no words",
  open_house: "welcoming school entrance with colorful decorations and balloons, no text, no letters, no words",
  parent_workshop: "professional workshop setting with books and coffee, warm tones, no text, no letters, no words",
  summer_program: "bright summer sunshine with palm trees and beach elements, vibrant colors, no text, no letters, no words",
  registration: "happy cartoon children in a colorful classroom environment, no text, no letters, no words",
};

// Brand colors
const COLORS = {
  primary: '#0F4C5C',      // Dark blue
  secondary: '#10B981',    // Emerald green
  accent: '#F59E0B',       // Golden
  white: '#FFFFFF',
  darkOverlay: 'rgba(15, 76, 92, 0.85)',
  lightOverlay: 'rgba(255, 255, 255, 0.9)',
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createTextOverlaySvg(input: PosterInput, width: number, height: number): string {
  const isArabic = input.language === 'ar';
  const direction = isArabic ? 'rtl' : 'ltr';
  const fontFamily = isArabic ? 'Noto Sans Arabic, Arial, sans-serif' : 'Arial, sans-serif';
  const titleText = escapeXml(input.title);
  
  // Calculate font sizes based on title length
  const titleFontSize = titleText.length > 20 ? 52 : titleText.length > 12 ? 60 : 72;
  
  // Build info lines (no emojis - they don't render in SVG)
  const infoLines: string[] = [];
  if (input.date) infoLines.push(isArabic ? `التاريخ: ${input.date}` : `Date: ${input.date}`);
  if (input.time) infoLines.push(isArabic ? `الوقت: ${input.time}` : `Time: ${input.time}`);
  if (input.location) infoLines.push(isArabic ? `المكان: ${input.location}` : `Location: ${input.location}`);
  if (input.ageGroup) infoLines.push(isArabic ? `الفئة العمرية: ${input.ageGroup}` : `Age: ${input.ageGroup}`);

  const infoSvg = infoLines.map((line, i) => {
    const y = height - 280 + (i * 50);
    return `<text x="${width / 2}" y="${y}" text-anchor="middle" font-family="${fontFamily}" font-size="30" fill="${COLORS.white}" direction="${direction}">${escapeXml(line)}</text>`;
  }).join('\n    ');

  // Logo text position
  const logoX = isArabic ? width - 60 : 60;
  const logoAnchor = isArabic ? 'end' : 'start';
  
  // Adjust info section position to not get cut off
  const infoStartY = height - 240;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Noto Sans Arabic';
        src: url('data:font/ttf;base64,') format('truetype');
      }
    </style>
    <linearGradient id="topGrad" x1="0%" y1="0%" x2="0%" y2="40%">
      <stop offset="0%" style="stop-color:rgba(15,76,92,0.9);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(15,76,92,0);stop-opacity:1" />
    </linearGradient>
    <linearGradient id="bottomGrad" x1="0%" y1="60%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(15,76,92,0);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(15,76,92,0.95);stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.5)"/>
    </filter>
  </defs>
  
  <!-- Top gradient overlay -->
  <rect width="${width}" height="${height}" fill="url(#topGrad)" />
  
  <!-- Bottom gradient overlay -->
  <rect width="${width}" height="${height}" fill="url(#bottomGrad)" />
  
  <!-- Brand banner at top -->
  <rect x="0" y="0" width="${width}" height="80" fill="rgba(15,76,92,0.8)" />
  <text x="${logoX}" y="52" text-anchor="${logoAnchor}" font-family="Arial, sans-serif" font-size="24" fill="${COLORS.secondary}" font-weight="bold">🌳 Learning Tree</text>
  
  <!-- Title area - centered -->
  <rect x="40" y="${height/2 - 80}" width="${width - 80}" height="140" rx="16" fill="rgba(15,76,92,0.85)" />
  <text x="${width / 2}" y="${height/2}" text-anchor="middle" font-family="${fontFamily}" font-size="${titleFontSize}" fill="${COLORS.white}" font-weight="bold" direction="${direction}" filter="url(#shadow)">${titleText}</text>
  
  <!-- Decorative line under title -->
  <rect x="${width/2 - 60}" y="${height/2 + 20}" width="120" height="4" rx="2" fill="${COLORS.accent}" />
  
  <!-- Info section at bottom -->
  <rect x="60" y="${height - 310}" width="${width - 120}" height="${infoLines.length * 50 + 50}" rx="12" fill="rgba(0,0,0,0.6)" />
  ${infoSvg}
  
  <!-- Bottom brand bar -->
  <rect x="0" y="${height - 50}" width="${width}" height="50" fill="${COLORS.secondary}" />
  <text x="${width / 2}" y="${height - 20}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="${COLORS.white}" font-weight="bold">شجرة التعلم | Learning Tree</text>
</svg>`;
}

export async function generatePoster(input: PosterInput): Promise<{ posterUrl: string }> {
  const WIDTH = 1080;
  const HEIGHT = 1350; // Instagram portrait ratio
  
  // Step 1: Generate AI background without any text
  const templateDesc = input.template ? (templateBackgrounds[input.template] || "colorful kindergarten celebration background, no text") : "colorful kindergarten event background with decorations, no text, no letters, no words";
  
  const bgPrompt = `Create a beautiful, vibrant background illustration for a kindergarten/nursery poster. Theme: ${templateDesc}. Style: Modern, colorful, child-friendly cartoon illustration. Colors should include emerald green, sky blue, golden yellow. IMPORTANT: Do NOT include any text, letters, numbers, or words in the image. The image should be purely decorative/illustrative background only. Aspect ratio: portrait 4:5.`;

  const result = await generateImage({ prompt: bgPrompt });
  const bgImageUrl = result.url!;
  if (!bgImageUrl) throw new Error('Image generation returned no URL');
  
  // Step 2: Download the AI-generated background
  let bgBuffer: Buffer;
  const localUrl = `http://localhost:${process.env.PORT || 3000}${bgImageUrl}`;
  const forgeBase = process.env.BUILT_IN_FORGE_API_URL?.replace('/v1', '') || '';
  const fullUrl = bgImageUrl.startsWith('/') ? (forgeBase ? `${forgeBase}${bgImageUrl}` : localUrl) : bgImageUrl;
  
  let bgResponse = await fetch(fullUrl);
  if (!bgResponse.ok && fullUrl !== localUrl) {
    // Fallback to local URL
    bgResponse = await fetch(localUrl);
  }
  if (!bgResponse.ok) {
    throw new Error('Failed to download AI background image');
  }
  bgBuffer = Buffer.from(await bgResponse.arrayBuffer());
  
  // Step 3: Resize background to poster dimensions
  const resizedBg = await sharp(bgBuffer)
    .resize(WIDTH, HEIGHT, { fit: 'cover' })
    .png()
    .toBuffer();
  
  // Step 4: Create SVG text overlay
  const svgOverlay = createTextOverlaySvg(input, WIDTH, HEIGHT);
  const svgBuffer = Buffer.from(svgOverlay);
  
  // Step 5: Composite text overlay on top of background
  const finalPoster = await sharp(resizedBg)
    .composite([{
      input: svgBuffer,
      top: 0,
      left: 0,
    }])
    .png({ quality: 90 })
    .toBuffer();
  
  // Step 6: Upload to storage
  const fileName = `posters/poster_${Date.now()}.png`;
  const { url: posterUrl } = await storagePut(fileName, finalPoster, 'image/png');
  
  return { posterUrl };
}
