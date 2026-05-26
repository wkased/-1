export type StampStyle = 'style1' | 'style2' | 'style3';
export type Language = 'zh' | 'en';

export interface ExtractedColor {
  hex: string;
  weight: number;
}

export interface StampConfig {
  title: string;
  subtitle: string;
  faceValue: string;
  country: string;
  code: string;
  year: string;
  lang: Language;
  style: StampStyle;
  backgroundColor: string;
  perforationRadius: number;
  perforationGap: number;
  innerBorderWidth: number;
  innerBorderPadding: number;
  imageScale: number;
  imageXOffset: number;
  imageYOffset: number;
  
  // Custom layout offsets and sizing parameters for all main elements
  titleXOffset?: number;
  titleYOffset?: number;
  titleScale?: number;
  
  faceValueXOffset?: number;
  faceValueYOffset?: number;
  faceValueScale?: number;
  
  countryXOffset?: number;
  countryYOffset?: number;
  countryScale?: number;
  
  codeXOffset?: number;
  codeYOffset?: number;
  codeScale?: number;
}

export interface PoetryData {
  words: string[];
  phrases: string[];
}

export const POETRY_PRESETS: Record<Language, PoetryData> = {
  zh: {
    words: [
      '浮光',
      '苍山',
      '晨曦',
      '归客',
      '寻幽',
      '岁月',
      '幽兰',
      '孤鹜',
      '远黛',
      '晚照'
    ],
    phrases: [
      '愿岁并谢与长友',
      '浮光跃金静影沉璧',
      '山风微凉落日弥漫',
      '岁月如歌微风不燥',
      '青山不改绿水长流',
      '孤舟蓑笠独钓寒江',
      '暮色苍茫看劲松',
      '晚霞温柔人间浪漫',
      '行到水穷坐看云起',
      '纸短情长见字如面'
    ]
  },
  en: {
    words: [
      'Solitude',
      'Ethereal',
      'Serenity',
      'Ephemeral',
      'Wanderlust',
      'Luminary',
      'Nostalgia',
      'Resonance',
      'Halcyon',
      'Aurora'
    ],
    phrases: [
      'Where the quiet waves whisper secrets.',
      'A solitary light in the vast evening.',
      'Time flows like a silent golden stream.',
      'In the warmth of a fading autumn glow.',
      'Dreams painted upon the azure sky.',
      'The gentle breeze of a peaceful dawn.',
      'Standing still amidst the cosmic dance.',
      'A poetic journey through silent wildwoods.',
      'Finding solace in the quietude of stars.',
      'Whispers of wind over emerald hills.'
    ]
  }
};
