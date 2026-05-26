/**
 * Extracts the top distinct colors from an image using canvas-based bucketization.
 */
export function extractColors(img: HTMLImageElement, numColors: number = 3): string[] {
  const canvas = document.createElement('canvas');
  canvas.width = 50;
  canvas.height = 50;
  const ctx = canvas.getContext('2d');
  if (!ctx) return ['#94a3b8', '#0f172a', '#475569'];

  ctx.drawImage(img, 0, 0, 50, 50);
  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, 50, 50);
  } catch (e) {
    // Fallback if image has cross-origin restriction
    return ['#dc2626', '#16a34a', '#2563eb'];
  }

  const data = imgData.data;
  const buckets: Record<string, number> = {};

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Ignore transparent or very dark/bright helper pixels in transparent zones
    if (a < 100) continue;

    // Quantize RGB space to reduce noise and find general clusters
    const step = 20;
    const br = Math.round(r / step) * step;
    const bg = Math.round(g / step) * step;
    const bb = Math.round(b / step) * step;

    const key = `${br},${bg},${bb}`;
    buckets[key] = (buckets[key] || 0) + 1;
  }

  const sorted = Object.entries(buckets)
    .map(([key, count]) => {
      const [r, g, b] = key.split(',').map(Number);
      return { r, g, b, count };
    })
    .sort((a, b) => b.count - a.count);

  const results: { r: number; g: number; b: number }[] = [];

  for (const item of sorted) {
    if (results.length >= numColors) break;

    // Guarantee colors are distinct enough to avoid recommended color duplicates
    let isDifferent = true;
    for (const chosen of results) {
      const dist = Math.sqrt(
        Math.pow(item.r - chosen.r, 2) +
        Math.pow(item.g - chosen.g, 2) +
        Math.pow(item.b - chosen.b, 2)
      );
      if (dist < 50) {
        isDifferent = false;
        break;
      }
    }

    if (isDifferent) {
      results.push({ r: item.r, g: item.g, b: item.b });
    }
  }

  // Fill up if we don't have enough colors
  for (const item of sorted) {
    if (results.length >= numColors) break;
    if (!results.some((r) => r.r === item.r && r.g === item.g && r.b === item.b)) {
      results.push({ r: item.r, g: item.g, b: item.b });
    }
  }

  const componentToHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, c)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
  };

  // Convert to beautiful color strings
  const hexColors = results.map((c) => rgbToHex(c.r, c.g, c.b));

  // Default color list fallback
  const defaults = ['#af2d2d', '#2d7aaf', '#2daf4a'];
  while (hexColors.length < numColors) {
    hexColors.push(defaults[hexColors.length] || '#475569');
  }

  return hexColors;
}

export interface PredictionLabel {
  original: string;
  zh: string;
  en: string;
  poemZh: string;
  poemEn: string;
}

const KEYWORD_MAP: { regex: RegExp; zh: string; en: string; poemZh: string; poemEn: string }[] = [
  { regex: /cat|kitten|tabby|persian|siamese/i, zh: '狸奴', en: 'Cat', poemZh: '竹阴闲看狸奴戏', poemEn: 'Watching cats play under quiet bamboo shade.' },
  { regex: /tiger|panthera tigris/i, zh: '山君', en: 'Tiger', poemZh: '虎啸春风百兽低', poemEn: 'The tiger roars as mountain winds sweep.' },
  { regex: /lion/i, zh: '瑞猊', en: 'Lion', poemZh: '金猊香冷画堂开', poemEn: 'The fierce lion brings auspicious blessings' },
  { regex: /dog|puppy|retriever|collie|terrier|husky|pug/i, zh: '灵犬', en: 'Dog', poemZh: '柴门犬吠雪夜归', poemEn: 'A loyal companion guarding the snowy doorway.' },
  { regex: /deer|elk|stag/i, zh: '瑞鹿', en: 'Deer', poemZh: '呦呦鹿鸣食野之苹', poemEn: 'Spotted deer grazing in the quiet mountain mist.' },
  { regex: /horse|stallion|colt/i, zh: '天马', en: 'Horse', poemZh: '天马行空扫暮色', poemEn: 'The heavenly stallion gallops through valleys.' },
  { regex: /bear|panda/i, zh: '大熊', en: 'Bear', poemZh: '林深石暗藏大熊', poemEn: 'A silent forest giant wandering green valleys.' },
  { regex: /fox/i, zh: '雅狐', en: 'Fox', poemZh: '素狐听泉鸣幽寂', poemEn: 'The mystical white fox listens to mountain rivers.' },
  { regex: /wolf/i, zh: '孤狼', en: 'Wolf', poemZh: '啸月霜峰一孤狼', poemEn: 'A wild wolf calling under the glowing moon.' },
  { regex: /rabbit|hare/i, zh: '玉兔', en: 'Rabbit', poemZh: '月中玉兔捣仙药', poemEn: 'The graceful rabbit of celestial realms.' },
  { regex: /squirrel/i, zh: '松鼠', en: 'Squirrel', poemZh: '轻捷松鼠跳苍枝', poemEn: 'Nimble steps harvesting autumn pinecones.' },
  { regex: /elephant/i, zh: '瑞象', en: 'Elephant', poemZh: '太平有象江山稳', poemEn: 'Grand symbol of peace and prosperity.' },
  { regex: /leopard|cheetah|jaguar/i, zh: '幽豹', en: 'Leopard', poemZh: '林荫金斑隐幽豹', poemEn: 'Golden spots camouflage the sleek forest leopard.' },
  { regex: /camel/i, zh: '驼行', en: 'Camel', poemZh: '大漠驼铃渡落日', poemEn: 'Camel bells crossing the grand desert route.' },
  { regex: /eagle|falc|hawk/i, zh: '飞鹰', en: 'Eagle', poemZh: '大鹏一日同风起', poemEn: 'The sovereign eagle soaring above white clouds.' },
  { regex: /owl/i, zh: '林枭', en: 'Owl', poemZh: '碧夜霜月惊林枭', poemEn: 'Silent protector watching over midnight woods.' },
  { regex: /bird|robin|bluebird|finch|sparrow|cardinal|macaw|parrot|canary|bunting/i, zh: '幽禽', en: 'Bird', poemZh: '幽禽啭林春正好', poemEn: 'A melody of spring bird songs echoing through trees.' },
  { regex: /butterfly/i, zh: '蝴蝶', en: 'Butterfly', poemZh: '庄生晓梦迷蝴蝶', poemEn: 'Graceful wings dancing through sunset colors.' },
  { regex: /bee|wasp/i, zh: '金蜂', en: 'Bee', poemZh: '酿得百花成蜜后', poemEn: 'A golden busy bee amongst seasonal blossoms.' },
  { regex: /dragonfly/i, zh: '晴蜓', en: 'Dragonfly', poemZh: '早有蜻蜓立上头', poemEn: 'Symmetrical wings resting on the pool lotus.' },
  { regex: /fish|goldfish|koi|salmon|trout/i, zh: '锦鲤', en: 'Fish', poemZh: '穿波锦鲤跃龙门', poemEn: 'Vibrant koi swimming through crystal waters.' },
  { regex: /frog|toad/i, zh: '青蛙', en: 'Frog', poemZh: '稻花香里听流蛙', poemEn: 'The summer sound of fields sing in unison.' },
  { regex: /crab|lobster/i, zh: '横蟹', en: 'Crab', poemZh: '秋风袅袅蟹脚肥', poemEn: 'Cool wind signals a fertile riverside season.' },
  { regex: /turtle|tortoise/i, zh: '灵鳌', en: 'Turtle', poemZh: '万载灵龟寿比松', poemEn: 'Wisdom gliding peacefully in historical tides.' },
  { regex: /snake|serpent/i, zh: '灵蛇', en: 'Snake', poemZh: '幽谷伏草隐灵蛇', poemEn: 'The emerald spirit glides in sacred tall grass.' },
  { regex: /flower|rose|orchid|daisy|tulip|daffodil|sunflower|lotus|lily|peony|carnation/i, zh: '雅卉', en: 'Flower', poemZh: '一枝红艳露凝香', poemEn: 'Perfect blossoms capturing the essence of mornings.' },
  { regex: /tree|pine|oak|willow|conifer|forest|wood/i, zh: '古树', en: 'Forest', poemZh: '苍松挺秀立奇峰', poemEn: 'Proud needles growing against the blue horizon.' },
  { regex: /leaf|leaves|foliage/i, zh: '霜叶', en: 'Leaf', poemZh: '霜叶红于二月花', poemEn: 'Foliage shining brighter than spring orchards.' },
  { regex: /mushroom|fungus|bolete|agaric/i, zh: '仙蕈', en: 'Mushroom', poemZh: '云深日暖生仙蕈', poemEn: 'Deep mountain cloud moss nurtures exquisite mushrooms.' },
  { regex: /mountain|hill|peak|alp|cliff|valley/i, zh: '青峦', en: 'Mountain', poemZh: '黛山千叠云万重', poemEn: 'Soft peaks ascending into the heavenly mist.' },
  { regex: /water|river|lake|sea|ocean|wave|stream|waterfall/i, zh: '碧川', en: 'Water', poemZh: '半江瑟瑟半江红', poemEn: 'Ancient pristine waters reflecting skies.' },
  { regex: /boat|ship|canoe|yacht/i, zh: '一叶舟', en: 'Boat', poemZh: '孤舟蓑笠独钓寒', poemEn: 'A lone boat drift silently on the autumn lake.' },
  { regex: /building|house|home|temple|pagoda|tower|castle|palace/i, zh: '画阁', en: 'Pavilion', poemZh: '斜阳古道照亭台', poemEn: 'Sacred tiles and towers on old silk routes.' },
  { regex: /sky|sun|moon|star|cloud/i, zh: '彩云', en: 'Cloud', poemZh: '卧看满天星斗落', poemEn: 'Drifting clouds glowing under sunset starlight.' },
  { regex: /cup|can|bottle|vase|pottery|porcelain/i, zh: '雅器', en: 'Porcelain', poemZh: '一盏清茶伴残书', poemEn: 'An delicate vase with fresh plum tea.' },
  { regex: /book|paper|document/i, zh: '书卷', en: 'Scroll', poemZh: '万卷书成对青灯', poemEn: 'A beautiful scroll read beside quiet lanterns.' }
];

export function translateAndFormatLabel(labelsString: string): PredictionLabel {
  const parts = labelsString.split(',').map(s => s.trim());
  const mainEng = parts[0] || 'Subject';

  // Substring Match in dictionary
  for (const item of KEYWORD_MAP) {
    if (item.regex.test(labelsString)) {
      return {
        original: mainEng,
        zh: item.zh,
        en: item.en,
        poemZh: item.poemZh,
        poemEn: item.poemEn
      };
    }
  }

  // Generative fallback translations derived word-by-word if no direct regex hits
  // Let's create a beautiful generic fallback mapping
  const titlePart = mainEng.charAt(0).toUpperCase() + mainEng.slice(1);
  return {
    original: mainEng,
    zh: '造物',
    en: titlePart,
    poemZh: '万物静观皆自得',
    poemEn: 'Every living creature finds its serenity.'
  };
}

/**
 * Chroma key cutout fallback tool.
 */
export function removeBackgroundChroma(
  originalData: ImageData,
  keyR: number,
  keyG: number,
  keyB: number,
  tolerance: number
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(originalData.data);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.sqrt(
      Math.pow(r - keyR, 2) +
      Math.pow(g - keyG, 2) +
      Math.pow(b - keyB, 2)
    );

    if (dist < tolerance) {
      data[i + 3] = 0; // Transparent
    }
  }
  return data;
}
