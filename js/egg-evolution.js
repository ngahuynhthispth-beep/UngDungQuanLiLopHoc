// js/egg-evolution.js - Evolution system with crisp SVG visual assets
const EggEvolution = {
  HATCH_THRESHOLD: 100, // Đạt từ 100 sao trở lên thì trứng sẽ nở!

  STAGES: [
    { 
      level: 0, 
      minStars: 0, 
      maxStars: 35, 
      name: 'Trứng Thần Kỳ', 
      title: 'Đang ấp trứng (0-35 ⭐)', 
      isHatched: false,
      desc: 'Quả trứng thần đang được ủ ấm trong tổ rơm, ngủ ngoan tích lũy năng lượng' 
    },
    { 
      level: 1, 
      minStars: 36, 
      maxStars: 70, 
      name: 'Trứng Thức Giấc', 
      title: 'Trứng cựa quậy (36-70 ⭐)', 
      isHatched: false,
      desc: 'Trứng ấm lên rực rỡ, thỉnh thoảng lắc lư và tỏa ánh sáng tình bạn ấm áp' 
    },
    { 
      level: 2, 
      minStars: 71, 
      maxStars: 99, 
      name: 'Trứng Nứt Vỏ', 
      title: 'Sắp nở rồi! (71-99 ⭐)', 
      isHatched: false,
      desc: 'Vỏ nứt tia vàng rực rỡ, bé rồng bên trong cựa mình chuẩn bị chào đời!' 
    },
    { 
      level: 3, 
      minStars: 100, 
      maxStars: 150, 
      name: 'Rồng Con Tí Hon', 
      title: '🎉 ĐÃ NỞ! Cấp 1 - Tí Hon (100-150 ⭐)', 
      isHatched: true,
      desc: 'Trứng đã nở thành công! Rồng con chào đời vẫy cánh tí hon, cười tít mắt' 
    },
    { 
      level: 4, 
      minStars: 151, 
      maxStars: 220, 
      name: 'Rồng Thần Phép Thuật', 
      title: 'Cấp 2 - Dũng Mãnh (151-220 ⭐)', 
      isHatched: true,
      desc: 'Rồng con lớn nhanh, mọc thêm sừng vàng và đôi cánh thần kỳ rực sáng' 
    },
    { 
      level: 5, 
      minStars: 221, 
      maxStars: 999, 
      name: 'Thần Thú Hoàng Gia', 
      title: 'Cấp 3 - Tối Thượng (>220 ⭐)', 
      isHatched: true,
      desc: 'Đạt cấp độ tối thượng hoàng gia! Đội vương miện ngọc, tỏa hào quang chiến thắng' 
    }
  ],

  getStage(stars) {
    const s = Math.max(0, Number(stars) || 0);
    for (let i = this.STAGES.length - 1; i >= 0; i--) {
      if (s >= this.STAGES[i].minStars) {
        return this.STAGES[i];
      }
    }
    return this.STAGES[0];
  },

  getNextMilestone(stars) {
    const s = Math.max(0, Number(stars) || 0);
    const current = this.getStage(s);
    const nextIdx = this.STAGES.findIndex(stage => stage.level === current.level) + 1;

    // Tính số sao còn thiếu để NỞ TRỨNG (mốc 100 sao)
    const neededToHatch = s < 100 ? (100 - s) : 0;

    if (nextIdx < this.STAGES.length) {
      const nextStage = this.STAGES[nextIdx];
      const range = nextStage.minStars - current.minStars;
      const progressInStage = Math.min(100, Math.max(0, Math.round(((s - current.minStars) / range) * 100)));

      return {
        currentStage: current,
        nextStage,
        needed: nextStage.minStars - s,
        progress: progressInStage,
        neededToHatch,
        isHatched: s >= 100
      };
    }

    return {
      currentStage: current,
      nextStage: null,
      needed: 0,
      progress: 100,
      neededToHatch: 0,
      isHatched: true
    };
  },


  // Generate scalable SVG based on stage and status
  renderPetSVG(stars, status = 'active', customColor = null) {
    const stage = this.getStage(stars);
    const isSleeping = status === 'sleeping';
    const primaryColor = customColor || '#FF758C';

    if (isSleeping) {
      return `
        <svg viewBox="0 0 120 120" class="pet-svg sleeping-anim" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sleepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#A18CD1" />
              <stop offset="100%" stop-color="#FBC2EB" />
            </linearGradient>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <!-- Gối ngủ mây -->
          <ellipse cx="60" cy="98" rx="42" ry="14" fill="#E2E8F0" opacity="0.8"/>
          <!-- Thân rồng cuộn tròn ngủ -->
          <ellipse cx="60" cy="65" rx="36" ry="32" fill="url(#sleepGrad)" filter="url(#softGlow)"/>
          <circle cx="75" cy="52" r="18" fill="#B39DDB"/>
          <!-- Tai rồng -->
          <path d="M 82 38 Q 92 30 88 45 Z" fill="#9575CD"/>
          <!-- Mắt nhắm ngủ ^ ^ -->
          <path d="M 68 53 Q 73 57 78 53" stroke="#4A148C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M 83 52 Q 88 56 93 52" stroke="#4A148C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <!-- Má hồng -->
          <ellipse cx="71" cy="58" rx="3.5" ry="2" fill="#FF8A80" opacity="0.7"/>
          <ellipse cx="89" cy="57" rx="3.5" ry="2" fill="#FF8A80" opacity="0.7"/>
          <!-- Zzz icon -->
          <g class="zzz-flight" fill="#7C4DFF" font-family="Arial" font-weight="bold">
            <text x="88" y="32" font-size="12">Z</text>
            <text x="98" y="22" font-size="10">z</text>
            <text x="105" y="14" font-size="8">z</text>
          </g>
        </svg>
      `;
    }

    // Giai đoạn 0: Trứng Thần Kỳ nguyên vẹn (0 - 20 sao)
    if (stage.level === 0) {
      return `
        <svg viewBox="0 0 120 120" class="pet-svg egg-wobble" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="eggGrad0" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFD1FF" />
              <stop offset="100%" stop-color="#FAD0C4" />
            </linearGradient>
            <filter id="eggShadow0">
              <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#FFA07A" flood-opacity="0.3"/>
            </filter>
          </defs>
          <!-- Ổ rơm ấm áp -->
          <ellipse cx="60" cy="104" rx="32" ry="9" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.5"/>
          <path d="M 36 102 Q 60 108 84 102" stroke="#D97706" stroke-width="2" fill="none"/>
          <!-- Vỏ trứng -->
          <path d="M 60 18 C 36 18, 26 50, 26 74 C 26 94, 40 102, 60 102 C 80 102, 94 94, 94 74 C 94 50, 84 18, 60 18 Z" 
                fill="url(#eggGrad0)" filter="url(#eggShadow0)"/>
          <!-- Đốm hoa văn trứng -->
          <circle cx="48" cy="48" r="6" fill="#FF9A9E" opacity="0.7"/>
          <circle cx="72" cy="62" r="8" fill="#FBC2EB" opacity="0.8"/>
          <circle cx="45" cy="78" r="5" fill="#A18CD1" opacity="0.6"/>
          <!-- Ánh bóng lóa mắt -->
          <path d="M 46 30 C 40 40, 36 54, 38 66" stroke="#FFFFFF" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.85"/>
        </svg>
      `;
    }

    // Giai đoạn 1: Trứng Thức Giấc (21 - 45 sao)
    if (stage.level === 1) {
      return `
        <svg viewBox="0 0 120 120" class="pet-svg egg-pulse" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="eggGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFECD2" />
              <stop offset="100%" stop-color="#FCB69F" />
            </linearGradient>
            <radialGradient id="eggAura1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FDE047" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#FDE047" stop-opacity="0"/>
            </radialGradient>
            <filter id="eggGlow1">
              <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#F59E0B" flood-opacity="0.4"/>
            </filter>
          </defs>
          <!-- Hào quang ấm áp -->
          <circle cx="60" cy="62" r="50" fill="url(#eggAura1)"/>
          <!-- Ổ rơm ấm áp -->
          <ellipse cx="60" cy="104" rx="34" ry="10" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.5"/>
          <!-- Trái tim tình bạn bay lượn -->
          <path d="M 28 42 C 28 38 34 34 37 38 C 40 34 46 38 46 42 C 46 48 37 54 37 54 C 37 54 28 48 28 42 Z" fill="#FF4757" opacity="0.8" transform="scale(0.55) translate(22, 10)"/>
          <path d="M 88 34 C 88 30 94 26 97 30 C 100 26 106 30 106 34 C 106 40 97 46 97 46 C 97 46 88 40 88 34 Z" fill="#FF6B81" opacity="0.85" transform="scale(0.5) translate(92, 16)"/>
          <!-- Vỏ trứng lắc lư -->
          <path d="M 60 16 C 36 16, 26 48, 26 72 C 26 92, 40 100, 60 100 C 80 100, 94 92, 94 72 C 94 48, 84 16, 60 16 Z" 
                fill="url(#eggGrad1)" filter="url(#eggGlow1)"/>
          <!-- Đốm hoa văn ngôi sao nhỏ -->
          <circle cx="50" cy="46" r="6.5" fill="#FF6B6B" opacity="0.75"/>
          <circle cx="70" cy="58" r="8" fill="#FFA502" opacity="0.8"/>
          <circle cx="48" cy="74" r="5" fill="#FF4757" opacity="0.7"/>
          <!-- Ánh sáng bóng -->
          <path d="M 46 28 C 40 38, 36 50, 38 62" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.9"/>
          <!-- Tia rung rinh -->
          <path d="M 22 68 Q 16 64 22 60" stroke="#F59E0B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M 98 68 Q 104 64 98 60" stroke="#F59E0B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </svg>
      `;
    }

    // Giai đoạn 2: Trứng Nứt Vỏ (46 - 70 sao - Sắp nở rồi!)
    if (stage.level === 2) {
      return `
        <svg viewBox="0 0 120 120" class="pet-svg egg-pulse" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="eggGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFE259" />
              <stop offset="100%" stop-color="#FFA751" />
            </linearGradient>
            <filter id="glowGold2">
              <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#FFD700" flood-opacity="0.8"/>
            </filter>
          </defs>
          <!-- Bóng đất -->
          <ellipse cx="60" cy="104" rx="32" ry="9" fill="#CBD5E1" opacity="0.7"/>
          <!-- Vỏ trứng nứt rực rỡ -->
          <path d="M 60 16 C 35 16, 25 48, 25 74 C 25 94, 40 102, 60 102 C 80 102, 95 94, 95 74 C 95 48, 85 16, 60 16 Z" 
                fill="url(#eggGrad2)" filter="url(#glowGold2)"/>
          <!-- Vết nứt vỏ sáng lóa sắc nét -->
          <path d="M 60 22 L 52 36 L 66 45 L 48 60 L 68 70 L 56 86" 
                stroke="#FFFFFF" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M 66 45 L 80 52 L 72 66" 
                stroke="#FFF275" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Tia sáng phát ra từ vết nứt -->
          <circle cx="56" cy="38" r="3.5" fill="#FFFFFF"/>
          <circle cx="50" cy="62" r="3" fill="#FFFFFF"/>
          <circle cx="74" cy="56" r="3" fill="#FFFFFF"/>
          <!-- Mắt lén nhìn tò mò từ bên trong vết nứt -->
          <ellipse cx="58" cy="50" rx="3.5" ry="4.5" fill="#1E293B"/>
          <circle cx="59.5" cy="49" r="1.5" fill="#FFFFFF"/>
          <!-- Nhãn báo sắp nở -->
          <rect x="36" y="98" width="48" height="16" rx="8" fill="#EF4444"/>
          <text x="60" y="110" font-size="9" font-weight="bold" fill="#FFFFFF" text-anchor="middle">SẮP NỞ!</text>
        </svg>
      `;
    }

    // Giai đoạn 3: Rồng Con Tí Hon (71 - 100 sao - ĐÃ NỞ THÀNH CÔNG!)
    if (stage.level === 3) {
      return `
        <svg viewBox="0 0 120 120" class="pet-svg baby-bounce" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dragonBaby" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4E65FF" />
              <stop offset="100%" stop-color="#92EFFD" />
            </linearGradient>
            <filter id="hatchCelebration">
              <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#3B82F6" flood-opacity="0.4"/>
            </filter>
          </defs>
          <!-- Hoa giấy chúc mừng -->
          <circle cx="24" cy="24" r="3" fill="#FF4757"/>
          <circle cx="96" cy="22" r="3" fill="#FFA502"/>
          <circle cx="18" cy="48" r="2.5" fill="#2ED573"/>
          <circle cx="102" cy="46" r="2.5" fill="#1E90FF"/>
          <!-- Đáy nửa vỏ trứng rồng nở -->
          <path d="M 32 80 Q 28 100 60 102 Q 92 100 88 80 L 80 84 L 72 78 L 64 85 L 56 79 L 48 85 L 40 79 Z" fill="#FFF275" stroke="#FFA751" stroke-width="2"/>
          <!-- Cánh tí hon vẫy rộn ràng -->
          <path d="M 28 55 Q 12 45 22 35 Q 26 48 35 52 Z" fill="#FF6584"/>
          <path d="M 92 55 Q 108 45 98 35 Q 94 48 85 52 Z" fill="#FF6584"/>
          <!-- Thân rồng con -->
          <ellipse cx="60" cy="62" rx="26" ry="24" fill="url(#dragonBaby)" filter="url(#hatchCelebration)"/>
          <!-- Sừng rồng tí hon màu vàng -->
          <polygon points="46,38 52,24 56,38" fill="#FFD166"/>
          <polygon points="74,38 68,24 64,38" fill="#FFD166"/>
          <!-- Mắt to long lanh siêu đáng yêu -->
          <ellipse cx="50" cy="55" rx="6.5" ry="8" fill="#1A202C"/>
          <ellipse cx="70" cy="55" rx="6.5" ry="8" fill="#1A202C"/>
          <circle cx="52" cy="52" r="3" fill="#FFFFFF"/>
          <circle cx="48" cy="58" r="1.5" fill="#FFFFFF"/>
          <circle cx="72" cy="52" r="3" fill="#FFFFFF"/>
          <circle cx="68" cy="58" r="1.5" fill="#FFFFFF"/>
          <!-- Má hồng -->
          <ellipse cx="42" cy="64" rx="4" ry="2.5" fill="#FF6584" opacity="0.8"/>
          <ellipse cx="78" cy="64" rx="4" ry="2.5" fill="#FF6584" opacity="0.8"/>
          <!-- Miệng cười tươi hớn hở -->
          <path d="M 55 65 Q 60 70 65 65" stroke="#1A202C" stroke-width="2.2" fill="#FF4757" stroke-linecap="round"/>
        </svg>
      `;
    }

    // Giai đoạn 4: Rồng Thần Phép Thuật (101 - 140 sao)
    if (stage.level === 4) {
      return `
        <svg viewBox="0 0 120 120" class="pet-svg magic-hover" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dragonStage4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FF0844" />
              <stop offset="100%" stop-color="#FFB199" />
            </linearGradient>
            <radialGradient id="aura4" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FFD700" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#FFD700" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <!-- Hào quang phép thuật -->
          <circle cx="60" cy="60" r="54" fill="url(#aura4)"/>
          <!-- Cánh lớn lấp lánh tung bay -->
          <path d="M 24 50 Q 0 30 18 20 Q 30 38 34 50 Z" fill="#9B51E0"/>
          <path d="M 96 50 Q 120 30 102 20 Q 90 38 86 50 Z" fill="#9B51E0"/>
          <!-- Thân rồng -->
          <ellipse cx="60" cy="64" rx="28" ry="26" fill="url(#dragonStage4)"/>
          <!-- Bụng vàng -->
          <ellipse cx="60" cy="68" rx="16" ry="17" fill="#FFEAA7"/>
          <!-- Sừng vàng oai vệ -->
          <path d="M 44 42 Q 34 20 42 16 Q 48 24 50 40 Z" fill="#FFD700"/>
          <path d="M 76 42 Q 86 20 78 16 Q 72 24 70 40 Z" fill="#FFD700"/>
          <!-- Ngôi sao phép thuật trên trán -->
          <polygon points="60,34 62,39 67,40 63,43 64,48 60,45 56,48 57,43 53,40 58,39" fill="#FFD700"/>
          <!-- Mắt to vui tươi -->
          <ellipse cx="48" cy="56" rx="6" ry="7.5" fill="#2C3E50"/>
          <ellipse cx="72" cy="56" rx="6" ry="7.5" fill="#2C3E50"/>
          <circle cx="50" cy="53" r="2.8" fill="#FFFFFF"/>
          <circle cx="74" cy="53" r="2.8" fill="#FFFFFF"/>
          <!-- Má hồng đáng yêu -->
          <ellipse cx="41" cy="64" rx="4.5" ry="3" fill="#FF4757" opacity="0.7"/>
          <ellipse cx="79" cy="64" rx="4.5" ry="3" fill="#FF4757" opacity="0.7"/>
          <!-- Miệng cười rạng rỡ -->
          <path d="M 55 65 Q 60 72 65 65" stroke="#2C3E50" stroke-width="2.2" fill="#E74C3C" stroke-linecap="round"/>
        </svg>
      `;
    }

    // Giai đoạn 5: Thần Thú Hoàng Gia (> 140 sao - Tối Thượng)
    return `
      <svg viewBox="0 0 120 120" class="pet-svg royal-glow" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="royalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#F37335" />
            <stop offset="50%" stop-color="#FDC830" />
            <stop offset="100%" stop-color="#00C9FF" />
          </linearGradient>
          <filter id="ultraGlow">
            <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#FFD700" flood-opacity="0.8"/>
          </filter>
        </defs>
        <!-- Hào quang ngôi sao xoay -->
        <g opacity="0.75">
          <circle cx="60" cy="60" r="52" stroke="#FFD700" stroke-width="2" stroke-dasharray="6,4" fill="none"/>
        </g>
        <!-- Cánh thiên thần vàng -->
        <path d="M 22 55 Q -2 30 14 12 Q 32 30 32 55 Z" fill="#FFEAA7" filter="url(#ultraGlow)"/>
        <path d="M 98 55 Q 122 30 106 12 Q 88 30 88 55 Z" fill="#FFEAA7" filter="url(#ultraGlow)"/>
        <!-- Thân thần thú -->
        <ellipse cx="60" cy="65" rx="30" ry="28" fill="url(#royalGrad)"/>
        <!-- Vương miện hoàng gia lộng lẫy -->
        <polygon points="46,32 44,18 53,24 60,15 67,24 76,18 74,32" fill="#FFD700" stroke="#E67E22" stroke-width="1.5" filter="url(#ultraGlow)"/>
        <circle cx="44" cy="18" r="2" fill="#E74C3C"/>
        <circle cx="60" cy="15" r="2.5" fill="#3498DB"/>
        <circle cx="76" cy="18" r="2" fill="#2ECC71"/>
        <!-- Mắt lấp lánh chiến thắng -->
        <ellipse cx="48" cy="58" rx="6.5" ry="8" fill="#1E272E"/>
        <ellipse cx="72" cy="58" rx="6.5" ry="8" fill="#1E272E"/>
        <circle cx="50" cy="55" r="3" fill="#FFFFFF"/>
        <circle cx="74" cy="55" r="3" fill="#FFFFFF"/>
        <polygon points="52,60 53,62 55,62 53.5,63.5 54,65 52,64 50,65 50.5,63.5 49,62 51,62" fill="#FFD700"/>
        <polygon points="70,60 71,62 73,62 71.5,63.5 72,65 70,64 68,65 68.5,63.5 67,62 69,62" fill="#FFD700"/>
        <!-- Miệng cười vĩ đại -->
        <path d="M 54 67 Q 60 74 66 67" stroke="#1E272E" stroke-width="2.5" fill="#FF4757" stroke-linecap="round"/>
      </svg>
    `;
  }
};

if (typeof window !== 'undefined') {
  window.EggEvolution = EggEvolution;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EggEvolution;
}

