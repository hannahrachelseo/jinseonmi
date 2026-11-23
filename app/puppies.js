// 1년 계획 탭의 강아지 친구들 (Hannah's ToDo 전용 오리지널 캐릭터)
export const PUPS = {
  jin:  { name: '몽실', breed: '푸들',     fur: '#C99A6E', ear: '#A9774B', scarf: '#7DB6DD', ink: '#2F6E96', ribbon: '#E8F4FC', ribbonOn: '#BFE0F5' },
  seon: { name: '보리', breed: '시바',     fur: '#F2C58F', ear: '#E0A060', scarf: '#8CC56E', ink: '#3F7A25', ribbon: '#EEF8E6', ribbonOn: '#CDEBB8' },
  mi:   { name: '솜이', breed: '비숑',     fur: '#FFF9F2', ear: '#F3E3D3', scarf: '#F28BA6', ink: '#B23E63', ribbon: '#FFEEF2', ribbonOn: '#FFC9D6' },
  il:   { name: '콩떡', breed: '슈나우저', fur: '#B9B4B8', ear: '#8E888D', scarf: '#A98BDB', ink: '#6A48A8', ribbon: '#F3EDFC', ribbonOn: '#DCCBF4' },
  etc:  { name: '호두', breed: '비글',     fur: '#FBEBD8', ear: '#C9874E', scarf: '#F2B544', ink: '#8A5A12', ribbon: '#FFF6E0', ribbonOn: '#FBE0A6' },
};
export function pupSvg(k, size, happy = false) {
  const c = PUPS[k] || PUPS.etc;
  let back = '', ears = '', front = '';
  if (k === 'jin') {
    back = `<circle cx="42" cy="22" r="9" fill="${c.fur}"/><circle cx="52" cy="19" r="10" fill="${c.fur}"/><circle cx="61" cy="23" r="8" fill="${c.fur}"/>`;
    ears = `<circle cx="22" cy="48" r="13" fill="${c.ear}"/><circle cx="78" cy="48" r="13" fill="${c.ear}"/><circle cx="18" cy="60" r="10" fill="${c.ear}"/><circle cx="82" cy="60" r="10" fill="${c.ear}"/>`;
  } else if (k === 'seon') {
    ears = `<path d="M26 40L30 14 46 30z" fill="${c.ear}"/><path d="M74 40L70 14 54 30z" fill="${c.ear}"/><path d="M30 34l2-12 9 9z" fill="#FFE3C6"/><path d="M70 34l-2-12-9 9z" fill="#FFE3C6"/>`;
    front = `<path d="M30 62q20 26 40 0q-4 18-20 20q-16-2-20-20z" fill="#FFF4E6"/>`;
  } else if (k === 'mi') {
    back = `<circle cx="34" cy="26" r="9" fill="${c.fur}" stroke="${c.ear}" stroke-width="2"/><circle cx="50" cy="21" r="10" fill="${c.fur}" stroke="${c.ear}" stroke-width="2"/><circle cx="66" cy="26" r="9" fill="${c.fur}" stroke="${c.ear}" stroke-width="2"/>`;
    ears = `<circle cx="24" cy="44" r="12" fill="${c.fur}" stroke="${c.ear}" stroke-width="2"/><circle cx="76" cy="44" r="12" fill="${c.fur}" stroke="${c.ear}" stroke-width="2"/>`;
    front = `<path d="M64 24l-8-6v12zM64 24l8-6v12z" fill="#F28BA6"/><circle cx="64" cy="24" r="3" fill="#E36F92"/>`;
  } else if (k === 'il') {
    ears = `<path d="M24 34q-6 14 6 22l10-18z" fill="${c.ear}"/><path d="M76 34q6 14-6 22L60 38z" fill="${c.ear}"/>`;
    front = `<path d="M34 70q16 18 32 0q0 16-16 18q-16-2-16-18z" fill="#EDEAEC"/><path d="M34 46h12M54 46h12" stroke="#6E686C" stroke-width="4" stroke-linecap="round"/>`;
  } else {
    ears = `<ellipse cx="22" cy="56" rx="10" ry="18" fill="${c.ear}"/><ellipse cx="78" cy="56" rx="10" ry="18" fill="${c.ear}"/>`;
    front = `<ellipse cx="62" cy="40" rx="12" ry="10" fill="#F0CDA7"/>`;
  }
  const head = `<ellipse cx="50" cy="56" rx="30" ry="27" fill="${c.fur}"${k === 'mi' ? ` stroke="${c.ear}" stroke-width="2"` : ''}/>`;
  const eyes = happy
    ? '<path d="M37 55q4-5 8 0M55 55q4-5 8 0" stroke="#4A3328" stroke-width="3" fill="none" stroke-linecap="round"/>'
    : '<ellipse cx="41" cy="55" rx="3.8" ry="4.6" fill="#4A3328"/><ellipse cx="59" cy="55" rx="3.8" ry="4.6" fill="#4A3328"/><circle cx="42.3" cy="53.3" r="1.5" fill="#fff"/><circle cx="60.3" cy="53.3" r="1.5" fill="#fff"/>';
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${c.name}"><ellipse cx="50" cy="94" rx="22" ry="4" fill="#4A3328" opacity=".1"/>${back}${ears}${head}${front}${eyes}<ellipse cx="50" cy="65" rx="5" ry="3.6" fill="#4A3328"/><path d="M45 69q5 5 10 0" stroke="#4A3328" stroke-width="2.4" fill="none" stroke-linecap="round"/>${happy ? '<path d="M48 72q2 7 4 0" fill="#FF8FA8"/>' : ''}<ellipse cx="31" cy="66" rx="5.5" ry="3.4" fill="#FF9DB4" opacity=".7"/><ellipse cx="69" cy="66" rx="5.5" ry="3.4" fill="#FF9DB4" opacity=".7"/><path d="M32 82q18 8 36 0l-2 6q-16 6-32 0z" fill="${c.scarf}"/><circle cx="50" cy="87" r="3.5" fill="#FFD66B"/></svg>`;
}
