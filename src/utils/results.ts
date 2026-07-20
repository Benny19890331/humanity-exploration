import { PersonalityResult } from '../types';

export function getPersonalityType(answers: number[]): PersonalityResult {
  const counts = answers.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const maxCount = Math.max(...Object.values(counts));
  const dominantType = Object.entries(counts).find(([_, count]) => count === maxCount)?.[0];

  const isLarge = maxCount > 7;
  
  if (maxCount < 7) {
    return {
      type: '八爪',
      imageUrl: 'https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?auto=format&fit=crop&q=80&w=1000',
      description: `綠佳利CFC代表人物就是蕭妤安老師。
八爪則是謀略家，像軍師一般善於整合各種資源與意見。他們打獵前，會分析場地是否合法、天氣如何、還有誰參與，確認所有條件都符合才行動。他們的步調不快，但行動總是精準可靠。八爪型的人非常注重結果，常常在心中計畫最佳時機再行動，因此需要學會放下對結果的執著，輕鬆面對一切。`
    };
  }

  const types: Record<string, PersonalityResult> = {
    '1': {
      type: isLarge ? '大老虎' : '老虎',
      imageUrl: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&q=80&w=1000',
      description: `老虎象徵著權力與目標導向，天生領袖。他們就像獵場上的獵人，拿著獵槍對空掃射，心中只有一個念頭：打到獵物就成功了！老虎型的人行動快速且效率高，他們目標明確，能吸引許多沒有方向的人跟隨，帶領團隊一步步邁向夢想。不過，老虎因為主觀意識強，常常需要學習聆聽，這是他們重要的成長課題。`
    },
    '2': {
      type: isLarge ? '大海豚' : '海豚',
      imageUrl: 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?auto=format&fit=crop&q=80&w=1000',
      description: `海豚是社交達人，天生自帶親和力，魅力無法擋！想像一下，他們雖然上台前很緊張，但一站上舞台，就能把氣氛炒到最熱，吸引所有人目光。他們就像去打獵時，原本應該專注於獵物，卻因為看到路邊美麗的蝴蝶而跑去玩，十分容易分心。但正因如此，海豚型的人特別有感染力，讓大家都很開心。不過，因為情緒容易受到他人影響，他們需要學會情緒管理，專注當下。`
    },
    '3': {
      type: isLarge ? '大企鵝' : '企鵝',
      imageUrl: 'https://images.unsplash.com/photo-1551986782-d0169b3f8fa7?auto=format&fit=crop&q=80&w=1000',
      description: `企鵝是耐心與堅持的代表，他們孵蛋時，在冰天雪地中一站就是數月，一動也不動！企鵝型的人步調雖然慢，但他們堅韌不拔，認定要完成的事就絕不放棄。剛開始接觸綠加利時，他們可能會先花時間適應，但一旦下定決心，就會成為團隊中最穩定的力量。企鵝性格愛好和平，討厭衝突，往往默默配合，但這也讓他們需要學會表達自己的想法，讓別人更了解他們的心聲。`
    },
    '4': {
      type: isLarge ? '大蜜蜂' : '蜜蜂',
      imageUrl: 'https://images.unsplash.com/photo-1576363389816-f8c26958ea0e?auto=format&fit=crop&q=80&w=1000',
      description: `綠佳利CFC代表人物就是侯閔議老師。蜜蜂是分析型人才，熱愛數據與程序。他們的邏輯清晰，總是精確地計劃每一步。例如，打獵時，他們會先測量風速，再精確瞄準，但往往因為分析過久，獵物早已跑掉了！蜜蜂型的人適合建構系統與流程，但也因過於重視數據，缺乏想像力，可能錯失一些機會。因此，蜜蜂需要學會突破自我設限，接納更多創新的想法。`
    }
  };

  return types[dominantType as string];
}