// Who lives on the islands, what the shop sells, and which rare visitors each item attracts.

const NAMES = ['橘子', '煤球', '雪糕', '灰灰', '西裝', '三花', '可可', '年糕', '芝麻', '布丁', '豆花', '奶茶',
  '湯圓', '麻糬', '包子', '花捲', '飯糰', '小米', '栗子', '豆豆', '毛毛', '胖虎', '阿福', '招財',
  '咪咪', '球球', '牛奶', '黑糖', '柚子', '優格', '饅頭', '虎斑', '皮蛋', '大福', '果凍', '跳跳'];
const TRAITS = ['愛曬太陽', '怕吵', '貪吃', '好奇心很重', '喜歡被摸下巴', '走路很慢', '會自己開門', '只吃新鮮的',
  '喜歡待在高處', '愛鑽紙箱', '睡覺會打呼', '看到鳥就發呆'];

export const ITEMS = [
  { id: 'box', name: '紙箱', price: 10, color: '#C89A63', note: '沒有貓能拒絕' },
  { id: 'cushion', name: '軟墊', price: 20, color: '#F2A7B8', note: '坐下去會陷進去' },
  { id: 'yarn', name: '毛線球', price: 30, color: '#B9A6D9', note: '一碰就滾' },
  { id: 'post', name: '貓抓柱', price: 40, color: '#CDB283', note: '劍麻纏了三層' },
  { id: 'dish', name: '小魚乾盤', price: 60, color: '#8FC9C9', note: '永遠是滿的' },
  { id: 'lamp', name: '暖燈', price: 80, color: '#F4D27A', note: '晚上會發光' },
  { id: 'bed', name: '甜甜圈貓窩', price: 120, color: '#A9C4E8', note: '邊緣剛好靠下巴' },
  { id: 'can', name: '金罐頭', price: 200, color: '#E9C46A', note: '傳說中的罐頭' },
];

// One rare visitor per item. `night` visitors only come after dark.
export const VISITORS = [
  { id: 'v-cow', name: '奶牛', item: 'box', coat: { body: '#F4F1EC', head: '#2E2B33', patch: '#2E2B33' }, trait: '每個紙箱都要進去檢查一下' },
  { id: 'v-siam', name: '暹羅先生', item: 'cushion', coat: { body: '#EFE3CF', head: '#5A4334', patch: '#5A4334' }, trait: '只坐軟的東西' },
  { id: 'v-peach', name: '蜜桃', item: 'yarn', coat: { body: '#F2B8A0', head: '#F2B8A0', patch: '#E09A80' }, trait: '玩到忘記吃飯' },
  { id: 'v-ash', name: '煙灰', item: 'post', coat: { body: '#5C5A6A', head: '#5C5A6A', patch: '#3F3D4A' }, trait: '爪子永遠磨得很利' },
  { id: 'v-cocoa', name: '可可亞', item: 'dish', coat: { body: '#6B4E3D', head: '#6B4E3D' }, trait: '聞到魚乾就會出現' },
  { id: 'v-blue', name: '藍調', item: 'lamp', night: true, coat: { body: '#7E8FA6', head: '#7E8FA6' }, trait: '只在夜裡出現' },
  { id: 'v-snow', name: '雪球', item: 'bed', coat: { body: '#FFFFFF', head: '#FFFFFF' }, trait: '很挑窩，挑中了就不走' },
  { id: 'v-gold', name: '金幣', item: 'can', coat: { body: '#E9C46A', head: '#E9C46A', patch: '#C99A3B' }, trait: '據說摸到它會走運' },
];

// Residents get a stable name and trait from their spawn order.
export function resident(index, islandName, coat) {
  return {
    id: `r-${index}`,
    name: NAMES[index % NAMES.length],
    trait: TRAITS[(index * 5) % TRAITS.length],
    home: islandName,
    coat,
  };
}
