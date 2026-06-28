import type { BeanFinderResultType } from '../types';

export const BEAN_FINDER_RESULT_TYPES: Record<string, BeanFinderResultType & { flavorNotes: string[]; beanStyle: string[]; brewHint: string }> = {
  "淺焙的新手": {
    "name": "淺焙的新手",
    "roastLabel": "淺焙",
    "level": "無",
    "description": "喜歡淺烘焙咖啡的你，我們推薦有水果風味、口感清爽的咖啡",
    "image": "//8a0bd1ef4ff427239cb1020b8b684110.cdn.bubble.io/f1715559137888x156385696373428930/11.png",
    "flavorNotes": [
      "花香",
      "柑橘",
      "莓果",
      "茶感"
    ],
    "beanStyle": [
      "衣索比亞水洗",
      "哥斯大黎加蜜處理",
      "淺焙單品",
      "風味標示清楚的豆子"
    ],
    "brewHint": "建議從淺焙手沖開始，能更完整感受到酸甜與花果香。"
  },
  "淺中焙的新手": {
    "name": "淺中焙的新手",
    "roastLabel": "淺中焙",
    "level": "無",
    "description": "喜歡淺中烘焙咖啡的你，我們推薦有香氣足、水果風味、口感偏清爽的咖啡",
    "image": "//8a0bd1ef4ff427239cb1020b8b684110.cdn.bubble.io/f1715559145415x469341591522085570/12.png",
    "flavorNotes": [
      "花香",
      "柑橘",
      "水果",
      "香氣"
    ],
    "beanStyle": [
      "淺中焙配方豆",
      "水洗豆",
      "蜜處理",
      "清爽日常款"
    ],
    "brewHint": "淺中焙最能表現香氣與清爽感，手沖與濾掛都很適合。"
  },
  "中焙的新手": {
    "name": "中焙的新手",
    "roastLabel": "中焙",
    "level": "無",
    "description": "喜歡中烘焙咖啡的你，我們推薦有焦糖、奶油風味、口感圓潤的咖啡",
    "image": "//8a0bd1ef4ff427239cb1020b8b684110.cdn.bubble.io/f1715559148842x108491149764495580/13.png",
    "flavorNotes": [
      "堅果",
      "焦糖",
      "柔和果酸",
      "乾淨尾韻"
    ],
    "beanStyle": [
      "哥倫比亞",
      "巴西",
      "中焙配方豆",
      "每天都能喝的日常款"
    ],
    "brewHint": "中焙濾掛或手沖都很適合，日常喝起來穩定順口。"
  },
  "中深焙的新手": {
    "name": "中深焙的新手",
    "roastLabel": "中深焙",
    "level": "無",
    "description": "喜歡中深烘焙咖啡的你，我們推薦有堅果風味、巧克力、口感偏醇厚的咖啡",
    "image": "//8a0bd1ef4ff427239cb1020b8b684110.cdn.bubble.io/f1715559150651x828039966927687700/14.png",
    "flavorNotes": [
      "黑糖",
      "牛奶巧克力",
      "太妃糖",
      "堅果奶油感"
    ],
    "beanStyle": [
      "中深焙",
      "奶咖配方豆",
      "低酸甜感豆",
      "喝起來柔和的選項"
    ],
    "brewHint": "中深焙最能表現甜感與圓潤口感，手沖會更清楚。"
  },
  "深焙的新手": {
    "name": "深焙的新手",
    "roastLabel": "深焙",
    "level": "無",
    "description": "喜歡深烘焙咖啡的你，我們推薦有巧克力、口感醇厚的咖啡",
    "image": "//8a0bd1ef4ff427239cb1020b8b684110.cdn.bubble.io/f1715559153687x627319168035329400/15.png",
    "flavorNotes": [
      "可可",
      "煙燻",
      "香料",
      "黑糖"
    ],
    "beanStyle": [
      "深焙",
      "義式配方",
      "高 body 豆子",
      "適合做奶咖的濃厚豆"
    ],
    "brewHint": "深焙或義式濃縮最適合，搭配牛奶也能保有存在感。"
  },
  "淺焙的專家": {
    "name": "淺焙的專家",
    "roastLabel": "淺焙",
    "level": "專家",
    "description": "喜歡淺烘焙咖啡的你，我們推薦有水果風味、口感清爽的咖啡",
    "image": "//8a0bd1ef4ff427239cb1020b8b684110.cdn.bubble.io/f1715559156027x178873273189443600/11.png",
    "flavorNotes": [
      "花香",
      "柑橘",
      "莓果",
      "茶感"
    ],
    "beanStyle": [
      "衣索比亞水洗",
      "哥斯大黎加蜜處理",
      "淺焙單品",
      "風味標示清楚的豆子"
    ],
    "brewHint": "建議從淺焙手沖開始，能更完整感受到酸甜與花果香。"
  },
  "淺中焙的專家": {
    "name": "淺中焙的專家",
    "roastLabel": "淺中焙",
    "level": "專家",
    "description": "喜歡淺中烘焙咖啡的你，我們推薦有香氣足、水果風味、口感偏清爽的咖啡",
    "image": "//8a0bd1ef4ff427239cb1020b8b684110.cdn.bubble.io/f1715559158773x435862155380670100/12.png",
    "flavorNotes": [
      "花香",
      "柑橘",
      "水果",
      "香氣"
    ],
    "beanStyle": [
      "淺中焙配方豆",
      "水洗豆",
      "蜜處理",
      "清爽日常款"
    ],
    "brewHint": "淺中焙最能表現香氣與清爽感，手沖與濾掛都很適合。"
  },
  "中焙的專家": {
    "name": "中焙的專家",
    "roastLabel": "中焙",
    "level": "專家",
    "description": "喜歡中烘焙咖啡的你，我們推薦有焦糖、奶油風味、口感圓潤的咖啡",
    "image": "//8a0bd1ef4ff427239cb1020b8b684110.cdn.bubble.io/f1715559161186x930533709433477600/13.png",
    "flavorNotes": [
      "堅果",
      "焦糖",
      "柔和果酸",
      "乾淨尾韻"
    ],
    "beanStyle": [
      "哥倫比亞",
      "巴西",
      "中焙配方豆",
      "每天都能喝的日常款"
    ],
    "brewHint": "中焙濾掛或手沖都很適合，日常喝起來穩定順口。"
  },
  "中深焙的專家": {
    "name": "中深焙的專家",
    "roastLabel": "中深焙",
    "level": "專家",
    "description": "喜歡中深烘焙咖啡的你，我們推薦有堅果風味、巧克力、口感偏醇厚的咖啡",
    "image": "//8a0bd1ef4ff427239cb1020b8b684110.cdn.bubble.io/f1715559163615x310159321690510100/14.png",
    "flavorNotes": [
      "黑糖",
      "牛奶巧克力",
      "太妃糖",
      "堅果奶油感"
    ],
    "beanStyle": [
      "中深焙",
      "奶咖配方豆",
      "低酸甜感豆",
      "喝起來柔和的選項"
    ],
    "brewHint": "中深焙最能表現甜感與圓潤口感，手沖會更清楚。"
  },
  "深焙的專家": {
    "name": "深焙的專家",
    "roastLabel": "深焙",
    "level": "專家",
    "description": "喜歡深烘焙咖啡的你，我們推薦有巧克力、口感醇厚的咖啡",
    "image": "//8a0bd1ef4ff427239cb1020b8b684110.cdn.bubble.io/f1715559165828x835642808429320800/15.png",
    "flavorNotes": [
      "可可",
      "煙燻",
      "香料",
      "黑糖"
    ],
    "beanStyle": [
      "深焙",
      "義式配方",
      "高 body 豆子",
      "適合做奶咖的濃厚豆"
    ],
    "brewHint": "深焙或義式濃縮最適合，搭配牛奶也能保有存在感。"
  }
};
