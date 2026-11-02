import { describe, expect, it } from 'vitest';
import { timeAgo, timeLeft } from './format';
import { getMediaType } from './media';

describe('timeAgo', () => {
  const now = 10 * 24 * 60 * 60 * 1000;
  it('formata minutos, horas e dias', () => {
    expect(timeAgo(null, now)).toBe('—');
    expect(timeAgo(now - 30 * 1000, now)).toBe('agora');
    expect(timeAgo(now - 5 * 60 * 1000, now)).toBe('5 min');
    expect(timeAgo(now - 60 * 60 * 1000, now)).toBe('1 hora');
    expect(timeAgo(now - 3 * 60 * 60 * 1000, now)).toBe('3 horas');
    expect(timeAgo(now - 2 * 24 * 60 * 60 * 1000, now)).toBe('2 dias');
  });
});

describe('timeLeft', () => {
  it('devolve null quando já terminou', () => {
    expect(timeLeft(1000, 2000)).toBeNull();
  });
  it('mostra dias ou horas restantes', () => {
    expect(timeLeft(3 * 86400000 + 1000, 0)).toBe('3d restantes');
    expect(timeLeft(5 * 3600000 + 1000, 0)).toBe('5h restantes');
  });
});

describe('getMediaType', () => {
  it('prefere o tipo declarado na entrada', () => {
    expect(getMediaType('https://x/a.bin', 'photo')).toBe('image');
    expect(getMediaType('https://x/a.jpg', 'video')).toBe('video');
  });

  it('lê a extensão de URLs do Firebase Storage (path codificado + query string)', () => {
    const url = 'https://firebasestorage.googleapis.com/v0/b/app.appspot.com/o/entries%2Fc1%2Fu1%2F123.mp4?alt=media&token=abc';
    expect(getMediaType(url)).toBe('video');
    expect(getMediaType('https://x/foto.JPG?x=1')).toBe('image');
    expect(getMediaType('https://x/som.mp3')).toBe('audio');
  });

  it('devolve unknown quando não consegue determinar', () => {
    expect(getMediaType('')).toBe('unknown');
    expect(getMediaType('https://x/ficheiro')).toBe('unknown');
  });
});
